import os

with open('Pz_api_ag/src/config.ts', 'r') as f:
    content = f.read()

content = content.replace('msTransaccionalUrl', 'msSubastasUrl')
content = content.replace('MS_TRANSACCIONAL_URL', 'MS_SUBASTAS_URL')
content = content.replace('  msSubastasUrl: string | null;', '  msSubastasUrl: string | null;\n  msBilleteraUrl: string | null;')
content = content.replace('  const msSubastasUrl = env.MS_SUBASTAS_URL || null;', '  const msSubastasUrl = env.MS_SUBASTAS_URL || null;\n  const msBilleteraUrl = env.MS_BILLETERA_URL || null;')
content = content.replace("      throw new ConfigError('Falta MS_SUBASTAS_URL (obligatoria si USE_MOCKS=false).');", "      throw new ConfigError('Falta MS_SUBASTAS_URL (obligatoria si USE_MOCKS=false).');\n    }\n    if (!msBilleteraUrl) {\n      throw new ConfigError('Falta MS_BILLETERA_URL (obligatoria si USE_MOCKS=false).');")
content = content.replace('    msSubastasUrl,', '    msSubastasUrl,\n    msBilleteraUrl,')
with open('Pz_api_ag/src/config.ts', 'w') as f:
    f.write(content)

with open('Pz_api_ag/src/app.ts', 'r') as f:
    content = f.read()

content = content.replace('msTransaccionalUrl', 'msSubastasUrl')
content = content.replace('MS_TRANSACCIONAL_URL', 'MS_SUBASTAS_URL')
content = content.replace('Faltan MS_SUBASTAS_URL y MS_CATALOGO_URL', 'Faltan URLs de microservicios')
content = content.replace("const transaccional = new HttpClient('MS transaccional', config.msSubastasUrl);", "const subastas = new HttpClient('MS subastas', config.msSubastasUrl);\n  const billetera = new HttpClient('MS billetera', config.msBilleteraUrl!);")
content = content.replace('userClient: new HttpUserClient(transaccional),', 'userClient: new HttpUserClient(billetera),')
content = content.replace('walletClient: new HttpWalletClient(transaccional),', 'walletClient: new HttpWalletClient(billetera),')
content = content.replace('auctionClient: new HttpAuctionClient(transaccional),', 'auctionClient: new HttpAuctionClient(subastas),')
content = content.replace('    if (!config.msSubastasUrl || !config.msCatalogoUrl) {', '    if (!config.msSubastasUrl || !config.msBilleteraUrl || !config.msCatalogoUrl) {')
content = content.replace('      console.log(`[gateway] escuchando en http://localhost:${config.port}/graphql con MS transaccional ${config.msSubastasUrl} y MS catálogo ${config.msCatalogoUrl}`);', '      console.log(`[gateway] escuchando en http://localhost:${config.port}/graphql con MS subastas ${config.msSubastasUrl}, MS billetera ${config.msBilleteraUrl} y MS catálogo ${config.msCatalogoUrl}`);')

with open('Pz_api_ag/src/app.ts', 'w') as f:
    f.write(content)

with open('Pz_api_ag/src/main.ts', 'r') as f:
    content = f.read()

content = content.replace('msTransaccionalUrl', 'msSubastasUrl')
content = content.replace("`MS transaccional ${config.msSubastasUrl} y MS catálogo ${config.msCatalogoUrl}`", "`MS subastas ${config.msSubastasUrl}, billetera ${config.msBilleteraUrl} y catálogo ${config.msCatalogoUrl}`")

with open('Pz_api_ag/src/main.ts', 'w') as f:
    f.write(content)
