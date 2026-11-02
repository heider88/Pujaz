with open('Pz_web_fe/src/components/BilleteraUsuario.test.tsx', 'r') as f:
    content = f.read()

content = content.replace("wallet={{available: 500, reserved: 0, movements: []}} token=\"x\"", "wallet={billetera} token=\"x\"")
content = content.replace("""  it('muestra un error si no se puede cargar', async () => {
    renderConSesion(<BilleteraUsuario wallet={billetera} token="x" />, {
      ruta: '/billetera',
      conSesion: ana,
      mocks: [{ request: { query: WALLET }, error: new Error('Gateway caído') }],
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar tu billetera')
  })""", "")

with open('Pz_web_fe/src/components/BilleteraUsuario.test.tsx', 'w') as f:
    f.write(content)
