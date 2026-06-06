import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = dirname(fileURLToPath(import.meta.url));
const publicDir = join(root, "..", "public");
mkdirSync(publicDir, { recursive: true });

const apiUrl = process.env.RENDER_API_URL?.replace(/\/$/, "");

let lines = [];

if (apiUrl) {
  lines.push(`/api/*  ${apiUrl}/api/:splat  200`);
} else {
  console.warn(
    "RENDER_API_URL is not set — skipping API proxy redirect. " +
      "Set it in Netlify env vars before deploying."
  );
}

lines.push("/*  /index.html  200");

writeFileSync(join(publicDir, "_redirects"), `${lines.join("\n")}\n`);
console.log("Wrote public/_redirects");
