import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';

// Define paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.resolve(__dirname, '..');
const LOCALES_DIR = path.join(FRONTEND_DIR, 'src', 'i18n', 'locales');
const CONTENT_DIR = path.join(FRONTEND_DIR, 'src', 'i18n', 'content');

// Define supported languages, baseline is the first element
const SUPPORTED_LANGS = ['ru', 'en'];
const BASELINE_LANG = SUPPORTED_LANGS[0];
const TARGET_LANGS = SUPPORTED_LANGS.slice(1);

let hasErrors = false;

// Utility to get all nested keys as a flat array of dot-separated paths
function getFlattenedKeys(obj: any, prefix = ''): string[] {
  return Object.keys(obj).reduce((acc: string[], key: string) => {
    const pre = prefix.length ? prefix + '.' : '';
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(acc, getFlattenedKeys(obj[key], pre + key));
    } else {
      acc.push(pre + key);
    }
    return acc;
  }, []);
}

function compareObjects(baselineObj: any, targetObj: any, baselineName: string, targetName: string) {
  const baselineKeys = getFlattenedKeys(baselineObj);
  const targetKeys = getFlattenedKeys(targetObj);

  const missingInTarget = baselineKeys.filter((key) => !targetKeys.includes(key));
  const missingInBaseline = targetKeys.filter((key) => !baselineKeys.includes(key));

  if (missingInTarget.length > 0) {
    console.error(`❌ [${targetName}] Missing keys compared to [${baselineName}]:\n  - ` + missingInTarget.join('\n  - '));
    hasErrors = true;
  }

  if (missingInBaseline.length > 0) {
    console.warn(`⚠️ [${targetName}] Extra keys found that are not in [${baselineName}]:\n  - ` + missingInBaseline.join('\n  - '));
  }
}

// 1. Check Locale Namespaces
console.log('--- Checking UI Locales ---');
const baselineNamespaces = fs.readdirSync(path.join(LOCALES_DIR, BASELINE_LANG))
  .filter(file => file.endsWith('.json'));

for (const nsFile of baselineNamespaces) {
  const baselinePath = path.join(LOCALES_DIR, BASELINE_LANG, nsFile);
  const baselineData = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));

  for (const lang of TARGET_LANGS) {
    const targetPath = path.join(LOCALES_DIR, lang, nsFile);
    if (!fs.existsSync(targetPath)) {
      console.error(`❌ [${lang}] Missing entire namespace file: ${nsFile}`);
      hasErrors = true;
      continue;
    }

    const targetData = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
    compareObjects(baselineData, targetData, `${BASELINE_LANG}/${nsFile}`, `${lang}/${nsFile}`);
  }
}

// 2. Check Content Dictionaries
console.log('\n--- Checking Content Dictionaries ---');
const contentFolders = fs.readdirSync(CONTENT_DIR, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

for (const folder of contentFolders) {
  const baselinePath = path.join(CONTENT_DIR, folder, `${BASELINE_LANG}.json`);
  if (!fs.existsSync(baselinePath)) continue;

  const baselineData = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));

  for (const lang of TARGET_LANGS) {
    const targetPath = path.join(CONTENT_DIR, folder, `${lang}.json`);
    if (!fs.existsSync(targetPath)) {
      console.error(`❌ [${lang}] Missing content file: ${folder}/${lang}.json`);
      hasErrors = true;
      continue;
    }

    const targetData = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
    compareObjects(baselineData, targetData, `${folder}/${BASELINE_LANG}.json`, `${folder}/${lang}.json`);
  }
}

if (hasErrors) {
  console.error('\n💥 i18n parity check failed.');
  process.exit(1);
} else {
  console.log('\n✅ All translations are perfectly synchronized!');
}
