with open('Pz_web_fe/src/components/PerfilUsuario.tsx', 'r') as f:
    content = f.read()

content = content.replace("export function PerfilUsuario() {\n  const { usuario } = useSesion()\n  // RutaPrivada (en la página) garantiza que hay usuario.\n  return usuario ? <Perfil usuario={usuario} /> : null\n}", "export function PerfilUsuario({ usuario, token }: { usuario: any, token: string }) {\n  return <Perfil usuario={usuario} token={token} />\n}")
content = content.replace("function Perfil({ usuario }: { usuario: Usuario }) {", "function Perfil({ usuario, token }: { usuario: Usuario, token: string }) {")

with open('Pz_web_fe/src/components/PerfilUsuario.tsx', 'w') as f:
    f.write(content)
