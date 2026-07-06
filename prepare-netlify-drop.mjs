import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(rootDir, 'netlify-drop-build');

const topLevelFiles = [
  'index.html',
  'styles.css',
  'app.js',
  'portfolio-data.js'
];

function isContentDir(name) {
  return name === 'assets'
    || name.startsWith('AI')
    || name.startsWith('UI')
    || /[^\u0000-\u007f]/.test(name);
}

function getIncludePaths() {
  const topLevelDirs = fs.readdirSync(rootDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && isContentDir(entry.name))
    .map(entry => entry.name);

  return [...topLevelFiles, ...topLevelDirs];
}

function ensureCleanDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function copyEntry(relPath) {
  const from = path.join(rootDir, relPath);
  const to = path.join(outDir, relPath);

  if (!fs.existsSync(from)) {
    throw new Error(`Missing required path: ${relPath}`);
  }

  const stats = fs.statSync(from);
  if (stats.isDirectory()) {
    fs.cpSync(from, to, { recursive: true });
    return;
  }

  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function summarize(dir) {
  let files = 0;
  let bytes = 0;

  function walk(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
        continue;
      }
      const stats = fs.statSync(entryPath);
      files += 1;
      bytes += stats.size;
    }
  }

  walk(dir);
  return { files, bytes };
}

function formatMB(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function main() {
  ensureCleanDir(outDir);
  getIncludePaths().forEach(copyEntry);

  const { files, bytes } = summarize(outDir);
  console.log(`Prepared Netlify bundle: ${outDir}`);
  console.log(`Files: ${files}`);
  console.log(`Size: ${formatMB(bytes)}`);
}

main();
