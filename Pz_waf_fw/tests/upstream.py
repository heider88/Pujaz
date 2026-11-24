"""Upstream de prueba; no implementa lógica de Pujaz."""
import base64
import hashlib
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread


class Handler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def do_GET(self):
        if self.headers.get('Upgrade', '').lower() == 'websocket':
            accept = base64.b64encode(hashlib.sha1((self.headers['Sec-WebSocket-Key'] +
                '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').encode()).digest()).decode()
            self.send_response(101)
            self.send_header('Upgrade', 'websocket')
            self.send_header('Connection', 'Upgrade')
            self.send_header('Sec-WebSocket-Accept', accept)
            self.send_header('Sec-WebSocket-Protocol', 'graphql-transport-ws')
            self.end_headers()
            head = self.rfile.read(2)
            if len(head) != 2:
                return
            size = head[1] & 127
            if size > 125 or not head[1] & 128:
                return
            mask = self.rfile.read(4)
            payload = self.rfile.read(size)
            decoded = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
            if json.loads(decoded).get('type') == 'connection_init':
                reply = b'{"type":"connection_ack"}'
                self.wfile.write(bytes([129, len(reply)]) + reply)
                self.wfile.flush()
            self.close_connection = True
            return
        body = json.dumps({'data': {'__typename': 'Query'}, 'headers': dict(self.headers)}).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


Thread(target=ThreadingHTTPServer(('0.0.0.0', 3000), Handler).serve_forever, daemon=True).start()
ThreadingHTTPServer(('0.0.0.0', 4000), Handler).serve_forever()
