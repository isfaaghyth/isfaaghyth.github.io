const CLIENT_ID = process.env.OAUTH_CLIENT_ID
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET
const ORIGIN = process.env.ORIGIN || "https://isfa.dev"

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
  const siteUrl = params.site_id || ORIGIN
  const scope = params.scope || "repo,user"
  const redirectUri = event.rawUrl.replace(/\/auth(\?.*)?$/, "/callback")

  const authUrl = new URL("https://github.com/login/oauth/authorize")
  authUrl.searchParams.set("client_id", CLIENT_ID)
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("scope", scope)
  authUrl.searchParams.set("state", siteUrl)

  return {
    statusCode: 302,
    headers: { Location: authUrl.toString() },
  }
}

async function handleCallback(event) {
  const params = event.queryStringParameters || {}
  const { code, state } = params

  if (!code) {
    return { statusCode: 400, body: "Missing authorization code" }
  }

  try {
    const redirectUri = event.rawUrl.replace(/\/callback(\?.*)?$/, "/callback")

    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
      }),
    })

    const data = await response.json()

    if (data.error) {
      return { statusCode: 400, body: JSON.stringify(data) }
    }

    const origin = state || ORIGIN
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: renderPage(data.access_token, origin),
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    }
  }
}

function renderPage(token, origin) {
  return `<!doctype html>
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
