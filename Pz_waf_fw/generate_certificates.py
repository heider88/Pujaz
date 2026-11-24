"""CA y certificado locales. Solo biblioteca estándar y OpenSSL; no instala confianza."""
import argparse
import ipaddress
import os
from pathlib import Path
import shutil
import subprocess
import tempfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=Path(__file__).parent / 'certs')
    parser.add_argument('--san', action='append', default=[], help='DNS o IP adicional (repetible)')
    args = parser.parse_args()
    openssl = shutil.which('openssl')
    if not openssl:
        git_openssl = Path(os.environ.get('ProgramFiles', 'C:/Program Files')) / 'Git/usr/bin/openssl.exe'
        if git_openssl.is_file():
            openssl = str(git_openssl)
    if not openssl:
        parser.error('Instala OpenSSL o agrégalo al PATH.')
    out = args.output.resolve()
    if out.exists() and any(out.iterdir()):
        parser.error('El destino no está vacío. Usa otro --output para renovar sin sobrescribir claves.')
    names = ['localhost', '127.0.0.1', '::1', '10.0.2.2', *args.san]
    sans = []
    for name in dict.fromkeys(names):
        try:
            ipaddress.ip_address(name)
            sans.append('IP:' + name)
        except ValueError:
            import re
            if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9.-]*', name):
                parser.error('SAN DNS inválido: ' + name)
            sans.append('DNS:' + name)
    out.mkdir(parents=True, exist_ok=True)
    def run(*cmd):
        subprocess.run([openssl, *cmd], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    with tempfile.TemporaryDirectory() as temp:
        config = Path(temp) / 'openssl.cnf'
        config.write_text('[req]\ndistinguished_name=dn\nprompt=no\n[dn]\nCN=Pujaz local\n', encoding='ascii')
        run('req', '-x509', '-newkey', 'rsa:3072', '-nodes', '-sha256', '-days', '365',
            '-config', str(config), '-subj', '/CN=Pujaz Local Development CA',
            '-addext', 'basicConstraints=critical,CA:TRUE,pathlen:0',
            '-addext', 'keyUsage=critical,keyCertSign,cRLSign',
            '-keyout', str(out / 'ca.key'), '-out', str(out / 'ca.crt'))
        csr = Path(temp) / 'server.csr'
        run('req', '-new', '-newkey', 'rsa:2048', '-nodes', '-config', str(config),
            '-keyout', str(out / 'server.key'), '-out', str(csr))
        ext = Path(temp) / 'extensions.cnf'
        ext.write_text('basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\n'
                       'extendedKeyUsage=serverAuth\nsubjectAltName=' + ','.join(sans) + '\n', encoding='ascii')
        run('x509', '-req', '-in', str(csr), '-CA', str(out / 'ca.crt'), '-CAkey', str(out / 'ca.key'),
            '-CAcreateserial', '-days', '90', '-sha256', '-extfile', str(ext), '-out', str(out / 'server.crt'))
        run('verify', '-CAfile', str(out / 'ca.crt'), str(out / 'server.crt'))
    for key in ('ca.key', 'server.key'):
        (out / key).chmod(0o600)
    print('Certificado local verificado (90 días):', out)
    print('Instala únicamente ca.crt como CA confiable en los clientes de desarrollo; nunca distribuyas las claves.')


if __name__ == '__main__':
    main()
