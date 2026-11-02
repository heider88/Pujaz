with open('Pz_web_fe/src/components/PerfilUsuario.test.tsx', 'r') as f:
    content = f.read()

content = content.replace("usuario={{name: \"Test\", email: \"a@a.com\"}}", "usuario={ana}")

with open('Pz_web_fe/src/components/PerfilUsuario.test.tsx', 'w') as f:
    f.write(content)
