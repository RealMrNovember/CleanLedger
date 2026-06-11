import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { collectMessageKeys, en } from "./index";

const UI_ROOTS = [
  join(process.cwd(), "../../apps/web/src"),
  join(process.cwd(), "../../apps/desktop/src"),
];

const ALLOWLIST = new Set([
  "CleanLedger",
  "Cicibyte",
  "WhatsApp",
  "Ctrl+K",
  "Ctrl",
  "POS",
  "VIP",
  "PDF",
  "TL",
  "Windows",
  "SQLite",
  "JSON",
  "API",
  "URL",
  "RGB",
  "HEX",
  "ESC",
  "CP857",
  "www.cicibyte.com",
  "+90",
]);

/** Common Turkish UI words that should not appear hardcoded in TSX after i18n pass */
const TURKISH_UI_PATTERN =
  /\b(Müşteri|Sipariş|Kaydet|Yükleniyor|Ayarlar|Giriş|Henüz|Adisyon|Öde|Teslim|Cari|Fiş|Ürün|Kupon|Rapor|Senkron|Parola|Şifre|E-posta)\b/;

function walkTsx(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "dist") continue;
      walkTsx(p, out);
    } else if (name.endsWith(".tsx")) {
      out.push(p);
    }
  }
  return out;
}

function stripCommentsAndStrings(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/`[^`]*`/g, '""')
    .replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, '""')
    .replace(/'[^'\\]*(?:\\.[^'\\]*)*'/g, "''");
}

describe("i18n coverage", () => {
  it("has a substantial message catalog", () => {
    const keys = collectMessageKeys(en);
    expect(keys.length).toBeGreaterThan(200);
  });

  it("minimizes hardcoded Turkish UI strings in web/desktop TSX", () => {
    const offenders: string[] = [];
    for (const root of UI_ROOTS) {
      for (const file of walkTsx(root)) {
        const raw = readFileSync(file, "utf8");
        if (!raw.includes("tsx")) continue;
        const body = stripCommentsAndStrings(raw);
        const matches = body.match(new RegExp(TURKISH_UI_PATTERN.source, "g"));
        if (!matches) continue;
        const unique = [...new Set(matches)].filter((m) => !ALLOWLIST.has(m));
        if (unique.length > 0) {
          offenders.push(`${file.replace(root + "/", "")}: ${unique.join(", ")}`);
        }
      }
    }
    expect(
      offenders,
      `Hardcoded Turkish UI strings found:\n${offenders.slice(0, 30).join("\n")}`
    ).toEqual([]);
  });
});
