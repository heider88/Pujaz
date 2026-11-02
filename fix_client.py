with open('Pz_web_fe/src/api/client.ts', 'r') as f:
    content = f.read()

content = content.replace("import { getToken } from './auth'", "")
content = content.replace("""  const authLink = new SetContextLink((prevContext) => {
    const token = getToken()
    return {
      headers: {
        ...prevContext.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  })""", "")

content = content.replace("authLink.concat(httpLink)", "httpLink")

with open('Pz_web_fe/src/api/client.ts', 'w') as f:
    f.write(content)
