#!/usr/bin/env node
/**
 * Fetches the 4 latest Instagram posts via Instagram Graph API (Business accounts).
 *
 * Required env var (stored as GitHub Secret):
 *   INSTAGRAM_ACCESS_TOKEN  – Long-lived Page Access Token (never expires)
 *                             Permissions needed: instagram_basic, pages_show_list,
 *                             pages_read_engagement
 *
 * Local usage:
 *   INSTAGRAM_ACCESS_TOKEN=<token> node scripts/fetch-instagram.js
 *
 * To get a non-expiring token:
 *   1. Generate a short-lived User Token in Graph API Explorer (graph.facebook.com/v21.0/explorer)
 *   2. Exchange for long-lived token (60d):
 *      GET https://graph.facebook.com/v21.0/oauth/access_token
 *        ?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=SHORT_TOKEN
 *   3. Get Page Access Token (never expires):
 *      GET https://graph.facebook.com/v21.0/me/accounts?access_token=LONG_LIVED_TOKEN
 *      → copy the access_token from the response for your Facebook Page
 *   4. Store that Page Access Token as the GitHub Secret INSTAGRAM_ACCESS_TOKEN
 */

const https = require("https");
const http  = require("http");
const fs    = require("fs");
const path  = require("path");

const TOKEN     = process.env.INSTAGRAM_ACCESS_TOKEN;
const ROOT      = path.join(__dirname, "..");
const IMAGE_DIR = path.join(ROOT, "assets/images/instagram");
const JSON_PATH = path.join(ROOT, "_data/instagram.json");

if (!TOKEN) {
  console.error("Missing env var: INSTAGRAM_ACCESS_TOKEN");
  process.exit(1);
}

const FIELDS = "id,media_type,media_url,thumbnail_url,permalink,caption,timestamp";
const LIMIT  = 4;

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", chunk => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error("Invalid JSON: " + data)); }
      });
    }).on("error", reject);
  });
}

function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    const file   = fs.createWriteStream(destPath);
    const client = url.startsWith("https") ? https : http;

    const req = client.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(destPath);
        return downloadImage(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    });

    req.on("error", err => { fs.unlink(destPath, () => {}); reject(err); });
  });
}

async function findIgBusinessAccountId() {
  // Try Page Access Token first: "me" is the Page itself
  const pageRes = await fetchJSON(
    `https://graph.facebook.com/v21.0/me?fields=instagram_business_account,name&access_token=${TOKEN}`
  );
  if (!pageRes.error && pageRes.instagram_business_account) {
    console.log(`Instagram Business Account: ${pageRes.instagram_business_account.id} (Page: "${pageRes.name}")`);
    return { igUserId: pageRes.instagram_business_account.id, pageToken: TOKEN };
  }

  // Fall back to User Access Token: fetch all managed Pages
  const pagesRes = await fetchJSON(
    `https://graph.facebook.com/v21.0/me/accounts?access_token=${TOKEN}`
  );
  if (pagesRes.error) {
    throw new Error("Could not find Instagram account. Error: " + pagesRes.error.message);
  }

  for (const page of (pagesRes.data || [])) {
    const pageToken = page.access_token || TOKEN;
    const igRes = await fetchJSON(
      `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${pageToken}`
    );
    if (igRes.instagram_business_account) {
      console.log(`Instagram Business Account: ${igRes.instagram_business_account.id} (Page: "${page.name}")`);
      return { igUserId: igRes.instagram_business_account.id, pageToken };
    }
  }

  throw new Error(
    "No Instagram Business Account found. Make sure the Instagram account is linked to the Facebook Page."
  );
}

(async () => {
  // 1. Find Instagram Business Account ID via the connected Facebook Page
  const { igUserId, pageToken } = await findIgBusinessAccountId();

  // 2. Load previous post IDs for stale-image cleanup
  let previousIds = [];
  if (fs.existsSync(JSON_PATH)) {
    try {
      previousIds = JSON.parse(fs.readFileSync(JSON_PATH, "utf8")).map(p => p.id);
    } catch (_) {}
  }

  // 3. Fetch latest posts from Instagram Graph API
  const apiUrl = `https://graph.facebook.com/v21.0/${igUserId}/media?fields=${FIELDS}&limit=${LIMIT}&access_token=${pageToken}`;
  const json   = await fetchJSON(apiUrl);

  if (json.error) {
    console.error("Instagram API error:", json.error.message);
    process.exit(1);
  }

  // 4. Ensure image directory exists
  fs.mkdirSync(IMAGE_DIR, { recursive: true });

  // 5. Download images and build post objects
  const posts = [];
  for (const post of (json.data || [])) {
    const cdnUrl    = post.thumbnail_url || post.media_url;
    const localFile = `${post.id}.jpg`;
    const localPath = path.join(IMAGE_DIR, localFile);
    const webPath   = `/assets/images/instagram/${localFile}`;

    if (cdnUrl) {
      if (fs.existsSync(localPath)) {
        console.log(`  [cached]  ${localFile}`);
      } else {
        await downloadImage(cdnUrl, localPath);
        console.log(`  [saved]   ${localFile}`);
      }
    }

    posts.push({
      id:         post.id,
      media_type: post.media_type,
      image:      cdnUrl ? webPath : "",
      permalink:  post.permalink,
      caption:    (post.caption || "").split("\n")[0].slice(0, 120),
      timestamp:  post.timestamp,
      is_video:   post.media_type === "VIDEO",
    });
  }

  // 6. Delete images of posts no longer in the top 4
  const currentIds = posts.map(p => p.id);
  for (const oldId of previousIds) {
    if (!currentIds.includes(oldId)) {
      const stale = path.join(IMAGE_DIR, `${oldId}.jpg`);
      if (fs.existsSync(stale)) {
        fs.unlinkSync(stale);
        console.log(`  [deleted] ${oldId}.jpg (no longer in top 4)`);
      }
    }
  }

  // 7. Write JSON
  fs.writeFileSync(JSON_PATH, JSON.stringify(posts, null, 2));
  console.log(`\nSaved ${posts.length} posts to _data/instagram.json`);
  posts.forEach(p => console.log(`  [${p.media_type}] ${p.permalink}`));
})();
