with open('Pz_web_fe/src/test/render.tsx', 'r') as f:
    content = f.read()

content = content.replace("<SessionProvider>{children}</SessionProvider>", "<SessionProvider usuarioInicial={conSesion ?? null}>{children}</SessionProvider>")

with open('Pz_web_fe/src/test/render.tsx', 'w') as f:
    f.write(content)
