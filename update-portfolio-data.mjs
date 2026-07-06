import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.join(rootDir, 'portfolio-data.js');
const indexFile = path.join(rootDir, 'index.html');

const domainSpecs = [
  { name: 'AI创作', slug: 'domain-0', dir: 'AI创作' },
  { name: 'UI设计', slug: 'domain-1', dir: 'UI设计' },
  { name: '产品设计', slug: 'domain-2', dir: '产品设计' },
  { name: '包装设计', slug: 'domain-3', dir: '包装设计', rootProjectName: '包装设计合集' }
];

const imageExts = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.avif']);
const videoExts = new Set(['.mp4', '.mov', '.webm', '.m4v']);

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function encodePathSegments(relPath) {
  return toPosix(relPath)
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
}

function readExistingData() {
  if (!fs.existsSync(dataFile)) return [];
  const source = fs.readFileSync(dataFile, 'utf8');
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(source, context);
  return Array.isArray(context.window.PORTFOLIO_DATA) ? context.window.PORTFOLIO_DATA : [];
}

function buildExistingMaps(existingData) {
  const projectByRel = new Map();
  const thumbByRel = new Map();

  existingData.forEach(domain => {
    (domain.projects || []).forEach(project => {
      if (project?.rel) projectByRel.set(project.rel, project);
      (project.files || []).forEach(file => {
        if (!file?.rel) return;
        thumbByRel.set(file.rel, {
          thumb: file.thumb || null,
          encodedThumb: file.encodedThumb || null
        });
      });
    });
  });

  return { projectByRel, thumbByRel };
}

function compareNames(a, b) {
  return a.localeCompare(b, 'zh-CN-u-co-pinyin-nu');
}

function sortByExistingOrder(items, existingOrder) {
  const rank = new Map(existingOrder.map((value, index) => [value, index]));
  return items.slice().sort((a, b) => {
    const aRank = rank.has(a) ? rank.get(a) : Number.MAX_SAFE_INTEGER;
    const bRank = rank.has(b) ? rank.get(b) : Number.MAX_SAFE_INTEGER;
    if (aRank !== bRank) return aRank - bRank;
    return compareNames(a, b);
  });
}

function detectType(ext) {
  if (imageExts.has(ext)) return 'image';
  if (videoExts.has(ext)) return 'video';
  return 'file';
}

function preferredCover(files) {
  const rules = [
    /^11\.(png|jpe?g|webp|avif)$/i,
    /^(首页|首图)\.(png|jpe?g|webp|avif)$/i,
    /^2-02\.(png|jpe?g|webp|avif)$/i,
    /产品ai场景渲染2/i,
    /产品渲染图/i,
    /九宫图/i,
    /咖啡/i,
    /IP场景/i,
    /场景设定/i,
    /_01\./i,
    /page-?0001/i
  ];

  for (const rule of rules) {
    const found = files.find(file => file.type === 'image' && rule.test(file.name));
    if (found) return found;
  }

  return files.find(file => file.type === 'image')
    || files.find(file => file.type === 'video')
    || files[0]
    || null;
}

function nextProjectSlug(domainIndex, usedSlugs) {
  let projectIndex = 0;
  while (usedSlugs.has(`project-${domainIndex}-${projectIndex}`)) projectIndex += 1;
  return `project-${domainIndex}-${projectIndex}`;
}

function scanProjectFiles(projectDirRel, thumbByRel, existingProject) {
  const projectDirAbs = path.join(rootDir, projectDirRel);
  const dirEntries = fs.readdirSync(projectDirAbs, { withFileTypes: true });
  const existingFileOrder = (existingProject?.files || []).map(file => file.rel);

  const fileRels = dirEntries
    .filter(entry => entry.isFile())
    .map(entry => toPosix(path.join(projectDirRel, entry.name)));

  const sortedFileRels = sortByExistingOrder(fileRels, existingFileOrder);

  return sortedFileRels.map(fileRel => {
    const absolutePath = path.join(rootDir, fileRel);
    const stats = fs.statSync(absolutePath);
    const ext = path.extname(fileRel).toLowerCase();
    const existingThumb = thumbByRel.get(fileRel) || { thumb: null, encodedThumb: null };

    return {
      name: path.basename(fileRel),
      rel: fileRel,
      ext,
      size: stats.size,
      type: detectType(ext),
      url: encodePathSegments(fileRel),
      thumb: existingThumb.thumb,
      encodedThumb: existingThumb.encodedThumb
    };
  });
}

function buildPortfolioData() {
  const existingData = readExistingData();
  const { projectByRel, thumbByRel } = buildExistingMaps(existingData);

  return domainSpecs.map((domainSpec, domainIndex) => {
    const domainDirAbs = path.join(rootDir, domainSpec.dir);
    const domainEntries = fs.readdirSync(domainDirAbs, { withFileTypes: true });
    const existingDomain = existingData.find(item => item.slug === domainSpec.slug);
    const existingProjectOrder = (existingDomain?.projects || []).map(project => project.rel);
    const usedSlugs = new Set((existingDomain?.projects || []).map(project => project.slug));

    const projectRels = domainEntries
      .filter(entry => entry.isDirectory())
      .map(entry => toPosix(path.join(domainSpec.dir, entry.name)));
    const rootFiles = domainEntries.filter(entry => entry.isFile());
    if (!projectRels.length && rootFiles.length) projectRels.push(domainSpec.dir);

    const sortedProjectRels = sortByExistingOrder(projectRels, existingProjectOrder);

    const projects = sortedProjectRels.map(projectRel => {
      const existingProject = projectByRel.get(projectRel);
      const files = scanProjectFiles(projectRel, thumbByRel, existingProject);
      const preferred = preferredCover(files);
      const existingCover = files.find(file => file.rel === existingProject?.cover?.rel) || null;
      const forcePreferredCover = projectRel === '包装设计' && preferred && /^11\.(png|jpe?g|webp|avif)$/i.test(preferred.name);
      const cover = forcePreferredCover
        ? preferred
        : (existingCover || preferred || null);
      const slug = existingProject?.slug || nextProjectSlug(domainIndex, usedSlugs);

      usedSlugs.add(slug);

      return {
        name: projectRel === domainSpec.dir && domainSpec.rootProjectName
          ? domainSpec.rootProjectName
          : path.basename(projectRel),
        rel: projectRel,
        files,
        slug,
        cover,
        counts: {
          image: files.filter(file => file.type === 'image').length,
          video: files.filter(file => file.type === 'video').length
        }
      };
    });

    return {
      domain: domainSpec.name,
      slug: domainSpec.slug,
      projects
    };
  });
}

function writePortfolioData(data) {
  const payload = `window.PORTFOLIO_DATA = ${JSON.stringify(data, null, 2)};\n`;
  fs.writeFileSync(dataFile, payload, 'utf8');
}

function bumpDataVersion() {
  if (!fs.existsSync(indexFile)) return;
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z$/, 'Z')
    .replace('T', '-');
  const source = fs.readFileSync(indexFile, 'utf8');
  const updated = source.replace(
    /portfolio-data\.js\?v=[^"]+/,
    `portfolio-data.js?v=${stamp}`
  );
  fs.writeFileSync(indexFile, updated, 'utf8');
}

function printSummary(data) {
  const projectCount = data.reduce((sum, domain) => sum + domain.projects.length, 0);
  const fileCount = data.reduce(
    (sum, domain) => sum + domain.projects.reduce((projectSum, project) => projectSum + project.files.length, 0),
    0
  );

  console.log(`Updated portfolio-data.js`);
  console.log(`Domains: ${data.length}`);
  console.log(`Projects: ${projectCount}`);
  console.log(`Files: ${fileCount}`);
  data.forEach(domain => {
    console.log(`- ${domain.domain}: ${domain.projects.length} projects`);
  });
}

function main() {
  const data = buildPortfolioData();
  writePortfolioData(data);
  bumpDataVersion();
  printSummary(data);
}

main();
