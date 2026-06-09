#!/usr/bin/env node
/**
 * Production dosyalarını apps/web köküne kopyalar (nginx document root).
 * Build öncesi index.template.html → index.html geri yüklenir.
 */
import { cpSync, mkdirSync, rmSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
if (!existsSync(join(dist, "index.html"))) {
  console.error("dist/ bulunamadı. Önce: npm run build");
  process.exit(1);
}

cpSync(join(dist, "index.html"), join(root, "index.html"));
cpSync(join(dist, "cleanledger.svg"), join(root, "cleanledger.svg"));

const assetsDir = join(root, "assets");
if (existsSync(assetsDir)) rmSync(assetsDir, { recursive: true });
mkdirSync(assetsDir, { recursive: true });
cpSync(join(dist, "assets"), assetsDir, { recursive: true });

const assetFiles = readdirSync(assetsDir).sort();
console.log("Canlıya kopyalandı → apps/web/ (index.html + assets/)");
console.log("Asset dosyaları:", assetFiles.join(", "));
