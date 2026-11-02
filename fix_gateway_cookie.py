with open('Pz_api_ag/src/server.ts', 'r') as f:
    content = f.read()

replacement = """    context: async ({ request }: { request?: Request }): Promise<GatewayContext> => {
      let token = request ? readBearerToken(request.headers.get('authorization')) : null;
      if (!token && request) {
        const cookie = request.headers.get('cookie');
        if (cookie) {
          const match = cookie.match(/pujaz_token=([^;]+)/);
          if (match) token = match[1];
        }
      }
      return {
        userId: token ? await getUserId(token) : null,
      };
    },"""

content = content.replace("    context: async ({ request }: { request?: Request }): Promise<GatewayContext> => ({\n      userId: request ? await getUserId(readBearerToken(request.headers.get('authorization'))) : null,\n    }),", replacement)

with open('Pz_api_ag/src/server.ts', 'w') as f:
    f.write(content)
