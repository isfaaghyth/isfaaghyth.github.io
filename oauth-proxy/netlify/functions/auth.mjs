import { AuthorizationCode } from "simple-oauth2"

const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID
const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET
const ORIGIN = process.env.ORIGIN || "https://isfa.dev"
const SITE_URL = process.env.SITE_URL

const client = new AuthorizationCode({
  client: {
    id: OAUTH_CLIENT_ID,
    secret: OAUTH_CLIENT_SECRET,
  },
  auth: {
    tokenHost: "https://github.com",
    tokenPath: "/login/oauth/access_token",
    authorizePath: "/login/oauth/authorize",
  },
})

export default async function handler(event) {
  const path = event.path.replace(/\/\.netlify\/functions\/[^/]+/, "")
  const [section] = path.split("/").filter(Boolean)

  if (section === "callback") {
    return handleCallback(event)
  }
  return handleAuth(event)
}

async function handleAuth(event) {
  const params = event.queryStringParameters || {}
  const provider = params.provider || "github"
  const siteUrl = params.site_id || SITE_URL || ORIGIN

  const url = client.authorizeURL({
    redirect_uri: `${process.env.URL}/callback`,
    scope: "repo,user",
    state: siteUrl,
  })

  return {
    statusCode: 302,
    headers: { Location: url },
  }
}

async function handleCallback(event) {
  const params = event.queryStringParameters || {}
  const { code, state } = params

  if (!code) {
    return { statusCode: 400, body: "Missing authorization code" }
  }

  try {
    const token = await client.getToken({
      code,
      redirect_uri: `${process.env.URL}/callback`,
    })

    const origin = state || ORIGIN
    const content = renderPage(token.token.access_token, origin)
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: content,
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    }
  }
}

function renderPage(token, origin) {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Authorizing...</title>
  </head>
  <body>
    <script>
      window.opener.postMessage(
        ${JSON.stringify({
          token,
          provider: "github",
          backendName: "github",
        })},
        "${origin.replace(/\/$/, "")}"
      )
      window.close()
    </script>
    <p>Authorization successful. You can close this window.</p>
  </body>
</html>`
}
