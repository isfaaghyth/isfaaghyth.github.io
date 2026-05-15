const CLIENT_ID = process.env.OAUTH_CLIENT_ID
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET
const ORIGIN = process.env.ORIGIN || "https://isfa.dev"

function getBaseUrl(event) {
  const host = event.headers?.host || process.env.URL?.replace(/^https?:\/\//, "")
  const proto = event.headers?.["x-forwarded-proto"] || "https"
  return `${proto}://${host}`
}

export default async function handler(event) {
  const path = event.rawPath || event.path || ""
  const [section] = path.replace(/\/\.netlify\/functions\/[^/]+/, "").split("/").filter(Boolean)

  if (section === "callback") {
    return handleCallback(event)
  }
  return handleAuth(event)
}

async function handleAuth(event) {
  const params = event.queryStringParameters || {}
  const siteUrl = params.site_id || ORIGIN
  const scope = params.scope || "repo,user"
  const redirectUri = `${getBaseUrl(event)}/callback`

  const authUrl = new URL("https://github.com/login/oauth/authorize")
  authUrl.searchParams.set("client_id", CLIENT_ID)
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("scope", scope)
  authUrl.searchParams.set("state", siteUrl)

  return Response.redirect(authUrl.toString(), 302)
}

async function handleCallback(event) {
  const params = event.queryStringParameters || {}
  const { code, state } = params

  if (!code) {
    return new Response("Missing authorization code", { status: 400 })
  }

  try {
    const redirectUri = `${getBaseUrl(event)}/callback`

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
      return new Response(JSON.stringify(data), { status: 400, headers: { "Content-Type": "application/json" } })
    }

    let origin = state || ORIGIN
    try {
      origin = decodeURIComponent(origin)
    } catch (_) {}
    return new Response(renderPage(data.access_token, origin), {
      status: 200,
      headers: { "Content-Type": "text/html" },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}

function renderPage(token, origin) {
  const originClean = origin.replace(/\/$/, "")
  const data = JSON.stringify({ token, provider: "github" })
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Authorizing...</title>
  </head>
  <body>
    <script>
      var data = ${data};
      var origin = "${originClean}";
      try {
        if (window.opener) {
          window.opener.postMessage(data, origin);
        }
      } catch (e) {}
      if (window.opener && !window.opener.closed) {
        setTimeout(function() {
          try { window.opener.postMessage(data, origin); } catch (e) {}
          try { window.close(); } catch (e) {}
        }, 500);
      } else {
        window.location.href = origin + "/admin/#access_token=" + encodeURIComponent(data.token) + "&provider=github";
      }
    </script>
    <p>Authorization successful. <a href="${originClean}/admin/#access_token=${encodeURIComponent(token)}&provider=github">Click here if you are not redirected.</a></p>
  </body>
</html>`
}
