#!/usr/bin/env node
/**
 * Fetches the 4 latest Instagram posts, downloads their images locally,
 * removes images of posts that are no longer in the top 4, and writes
 * _data/instagram.json with local image paths.
 *
 * Required env vars (stored as GitHub Secrets):
 *   INSTAGRAM_ACCESS_TOKEN  – long-lived Instagram Graph API token
 *
 * Local usage:
 *   INSTAGRAM_ACCESS_TOKEN=<token> node scripts/fetch-instagram.js
 */

const https  = require("https");
const http   = require("http");
const fs     = require("fs");
const path   = require("path");

const TOKEN      = process.env.INSTAGRAM_ACCESS_TOKEN;
const ROOT       = path.join(__dirname, "..");
const IMAGE_DIR  = path.join(ROOT, "assets/images/instagram");
const JSON_PATH  = path.join(ROOT, "_data/instagram.json");

if (!TOKEN) {
  console.error("Missing env var: INSTAGRAM_ACCESS_TOKEN");
  process.exit(1);
}

const FIELDS = "id,media_type,media_url,thumbnail_url,permalink,caption,timestamp";
const LIMIT  = 4;

// ── helpers ──────────────────────────────────────────────────────────────────

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error("Invalid JSON: " + data)); }
      });
    }).on("error", reject);
  });
}

function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    const file    = fs.createWriteStream(destPath);
    const client  = url.startsWith("https") ? https : http;

    const request = client.get(url, (res) => {
      // Follow a single redirect (Instagram CDN sometimes redirects)
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

    request.on("error", (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

// ── main ─────────────────────────────────────────────────────────────────────

(async () => {
  // 1. Refresh long-lived token (valid 60 days; refresh keeps it alive)
  const refreshUrl = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${TOKEN}`;
  const refreshed  = await fetchJSON(refreshUrl);
  if (refreshed.error) {
    console.warn("Token refresh failed (continuing):", refreshed.error.message);
  } else {
    console.log(`Token refreshed – expires in ~${Math.round(refreshed.expires_in / 86400)} days`);
  }

  // 2. Load previous post IDs so we can clean up stale images
  let previousIds = [];
  if (fs.existsSync(JSON_PATH)) {
    try {
      const prev = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
      previousIds = prev.map((p) => p.id);
    } catch (_) {}
  }

  // 3. Fetch latest 4 posts from Instagram Graph API
  const apiUrl = `https://graph.instagram.com/me/media?fields=${FIELDS}&limit=${LIMIT}&access_token=${TOKEN}`;
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

  // 6. Delete images of posts that are no longer in the top 4
  const currentIds = posts.map((p) => p.id);
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
  posts.forEach((p) => console.log(`  [${p.media_type}] ${p.permalink}`));
})();
