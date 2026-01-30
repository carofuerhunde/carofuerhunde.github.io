const { createHandler } = require("netlify-cms-oauth-provider-node");

exports.handler = createHandler({
  provider: "github",
  base_url: process.env.URL || process.env.DEPLOY_PRIME_URL,
  auth_endpoint: "auth",
  callback_endpoint: "auth-callback",
  client_id: process.env.GITHUB_CLIENT_ID,
  client_secret: process.env.GITHUB_CLIENT_SECRET,
});
