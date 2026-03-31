/**
 * Offline i18n helper:
 * Export all source keys from src/i18n/messages.ts to a JSON template file
 * for translators (or machine translation workflow) to fill.
 *
 * Usage:
 *   npx tsx scripts/generate-i18n-template.ts --locale ja
 *   npx tsx scripts/generate-i18n-template.ts --locale es
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { messages } from "../src/i18n/messages";

const localeArgIdx = process.argv.indexOf("--locale");
const locale = localeArgIdx >= 0 ? process.argv[localeArgIdx + 1] : "ja";

if (!locale || !(locale in messages)) {
  console.error("Invalid locale. Expected one of:", Object.keys(messages));
  process.exit(1);
}

const source = messages.en;
const target = messages[locale as keyof typeof messages] as Record<string, string>;

const template: Record<string, string> = {};
for (const k of Object.keys(source)) {
  template[k] = target[k] || source[k] || "";
}

const outDir = join(process.cwd(), "locales");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `${locale}.json`);

writeFileSync(outPath, JSON.stringify(template, null, 2), "utf-8");
console.log(`Generated ${outPath}`);

