"""Pruebas de transporte contra compose.tls.yml; sin dependencias Python externas."""
import base64
import hashlib
import http.client
import json
import os
from pathlib import Path
import socket
import ssl
import unittest

CA = Path(__file__).resolve().parents[1] / 'certs/ca.crt'
PORTS = tuple(int(port) for port in os.getenv('TLS_TEST_PORTS', '18080,18081').split(','))


class SecureChannel(unittest.TestCase):
    def context(self):
        return ssl.create_default_context(cafile=str(CA))

    def test_https_both_entries_and_forwarded_headers(self):
        for port in PORTS:
            with self.subTest(port=port):
                conn = http.client.HTTPSConnection('localhost', port, context=self.context(), timeout=5)
                conn.request('GET', '/graphql?query={__typename}', headers={
                    'Authorization': 'Bearer transport-test', 'X-Forwarded-Proto': 'http'})
                response = conn.getresponse()
                self.assertEqual(response.status, 200)
                body = json.loads(response.read())
                self.assertEqual(body['data']['__typename'], 'Query')
                self.assertEqual(body['headers']['X-Forwarded-Proto'], 'https')
                self.assertEqual(body['headers']['Authorization'], 'Bearer transport-test')
                conn.close()

    def test_tls12_and_tls13(self):
        for port in PORTS:
            for version in (ssl.TLSVersion.TLSv1_2, ssl.TLSVersion.TLSv1_3):
                with self.subTest(port=port, version=version):
                    ctx = self.context()
                    ctx.minimum_version = ctx.maximum_version = version
                    with socket.create_connection(('localhost', port), timeout=5) as sock:
                        with ctx.wrap_socket(sock, server_hostname='localhost') as secured:
                            self.assertEqual(secured.version(), 'TLSv1.2' if version == ssl.TLSVersion.TLSv1_2 else 'TLSv1.3')

    def test_untrusted_ca_and_wrong_hostname_rejected(self):
        for port in PORTS:
            for ctx, host in ((ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT), 'localhost'),
                              (self.context(), 'invalid.example')):
                with self.subTest(port=port, hostname=host):
                    with socket.create_connection(('localhost', port), timeout=5) as sock:
                        with self.assertRaises(ssl.SSLCertVerificationError):
                            ctx.wrap_socket(sock, server_hostname=host)

    def test_legacy_tls_rejected(self):
        for port in PORTS:
            for version in (ssl.TLSVersion.TLSv1, ssl.TLSVersion.TLSv1_1):
                with self.subTest(port=port, version=version):
                    ctx = self.context()
                    ctx.minimum_version = ctx.maximum_version = version
                    # Solo el cliente adversarial de prueba permite TLS antiguo.
                    ctx.set_ciphers('ALL:@SECLEVEL=0')
                    with socket.create_connection(('localhost', port), timeout=5) as sock:
                        with self.assertRaisesRegex(ssl.SSLError, 'PROTOCOL_VERSION'):
                            ctx.wrap_socket(sock, server_hostname='localhost')

    def test_plain_http_cannot_reach_application(self):
        for port in PORTS:
            conn = http.client.HTTPConnection('localhost', port, timeout=5)
            conn.request('GET', '/graphql')
            response = conn.getresponse()
            self.assertEqual(response.status, 400)
            self.assertNotIn(b'__typename', response.read())
            conn.close()

    def test_websocket_handshake_and_frame(self):
        for port in PORTS:
            with self.subTest(port=port):
                key = base64.b64encode(os.urandom(16)).decode()
                with socket.create_connection(('localhost', port), timeout=5) as raw:
                    with self.context().wrap_socket(raw, server_hostname='localhost') as sock:
                        sock.sendall((f'GET /graphql HTTP/1.1\r\nHost: localhost:{port}\r\n'
                            'Upgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Version: 13\r\n'
                            f'Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Protocol: graphql-transport-ws\r\n\r\n').encode())
                        stream = sock.makefile('rb')
                        self.assertIn(b'101', stream.readline())
                        headers = {}
                        while (line := stream.readline()) != b'\r\n':
                            self.assertTrue(line, 'Respuesta WebSocket incompleta')
                            name, value = line.decode().split(':', 1)
                            headers[name.lower()] = value.strip()
                        expected = base64.b64encode(hashlib.sha1((key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').encode()).digest()).decode()
                        self.assertEqual(headers['sec-websocket-accept'], expected)
                        self.assertEqual(headers['sec-websocket-protocol'], 'graphql-transport-ws')
                        payload = b'{"type":"connection_init"}'
                        mask = os.urandom(4)
                        sock.sendall(bytes([129, 128 | len(payload)]) + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(payload)))
                        head = stream.read(2)
                        self.assertEqual(head[0], 129)
                        self.assertEqual(json.loads(stream.read(head[1]))['type'], 'connection_ack')
                        stream.close()


if __name__ == '__main__':
    unittest.main(verbosity=2)
