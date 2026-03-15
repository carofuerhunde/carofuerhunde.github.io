const fs = require("fs");
const path = require("path");

const token = process.env.IG_ACCESS_TOKEN;
const igUserId = process.env.IG_USER_ID;

if (!token || !igUserId) {
  console.error("Missing IG_ACCESS_TOKEN or IG_USER_ID");
  process.exit(1);
}

const fields = [
  "id",
  "caption",
  "media_type",
  "media_url",
  "permalink",
  "thumbnail_url",
  "timestamp"
].join(",");

const url =
  `https://graph.facebook.com/v19.0/${encodeURIComponent(igUserId)}/media` +
  `?fields=${encodeURIComponent(fields)}` +
  `&limit=4` +
  `&access_token=${encodeURIComponent(token)}`;

async function main() {
  const response = await fetch(url);
  const json = await response.json();

  if (!response.ok) {
    console.error("Instagram API error:");
    console.error(JSON.stringify(json, null, 2));
    process.exit(1);
  }

  const outputDir = path.join(process.cwd(), "_data");
  const outputFile = path.join(outputDir, "instagram.json");

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(json, null, 2), "utf8");

  console.log(`Saved ${outputFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});