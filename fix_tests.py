with open('Pz_web_fe/src/test/render.tsx', 'r') as f:
    content = f.read()

content = content.replace("<SessionProvider>{children}</SessionProvider>", "<SessionProvider usuarioInicial={null}>{children}</SessionProvider>")

with open('Pz_web_fe/src/test/render.tsx', 'w') as f:
    f.write(content)

with open('Pz_web_fe/src/components/BilleteraUsuario.test.tsx', 'r') as f:
    content = f.read()

content = content.replace('<BilleteraUsuario />', '<BilleteraUsuario wallet={{available: 500, reserved: 0, movements: []}} token="x" />')

with open('Pz_web_fe/src/components/BilleteraUsuario.test.tsx', 'w') as f:
    f.write(content)

with open('Pz_web_fe/src/components/PerfilUsuario.test.tsx', 'r') as f:
    content = f.read()

content = content.replace('<PerfilUsuario />', '<PerfilUsuario usuario={{name: "Test", email: "a@a.com"}} token="x" />')
content = content.replace('<PerfilUsuario />', '<PerfilUsuario usuario={{name: "Test", email: "a@a.com"}} token="x" />')

with open('Pz_web_fe/src/components/PerfilUsuario.test.tsx', 'w') as f:
    f.write(content)
