const fs = require("fs");
const path = require("path");

const srcPath = path.resolve(__dirname, "../../baron_web/.env");
const destPath = path.resolve(__dirname, "../.env.local");

if (!fs.existsSync(srcPath)) {
  console.error("❌ Source .env not found at:", srcPath);
  process.exit(1);
}

const content = fs.readFileSync(srcPath, "utf-8");
const lines = content.split("\n");

const envMap = {};
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const match = trimmed.match(/^([\w.-]+)\s*=\s*(.*)$/);
  if (match) {
    const key = match[1].trim();
    let val = match[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    envMap[key] = val;
  }
}

const tursoUrl = envMap["TURSO_DATABASE_URL"] || envMap["VITE_TURSO_DATABASE_URL"];
const tursoToken = envMap["TURSO_AUTH_TOKEN"] || envMap["VITE_TURSO_AUTH_TOKEN"];
const blobToken = envMap["BLOB_READ_WRITE_TOKEN"];

console.log("🔗 TURSO_DATABASE_URL:", tursoUrl ? tursoUrl : "NOT FOUND");
console.log("🔑 TURSO_AUTH_TOKEN:", tursoToken ? "PRESENT (" + tursoToken.length + " chars)" : "NOT FOUND");
console.log("📦 BLOB_READ_WRITE_TOKEN:", blobToken ? "PRESENT" : "NOT FOUND");

let out = "# Baron Online - Connected to Baron Web Turso Database\n";
if (tursoUrl) out += `TURSO_DATABASE_URL="${tursoUrl}"\n`;
if (tursoToken) out += `TURSO_AUTH_TOKEN="${tursoToken}"\n`;
if (blobToken) out += `BLOB_READ_WRITE_TOKEN="${blobToken}"\n`;

fs.writeFileSync(destPath, out, "utf-8");
console.log("✅ .env.local created successfully in balon_online!");
