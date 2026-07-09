const data = window.PORTFOLIO_DATA || [];
const root = document.getElementById('portfolio-root');
const dialog = document.getElementById('projectDialog');
const dialogTitle = document.getElementById('dialogTitle');
const dialogDomain = document.getElementById('dialogDomain');
const dialogMeta = document.getElementById('dialogMeta');
const dialogMedia = document.getElementById('dialogMedia');
const dialogShell = document.querySelector('.dialog-shell');
const closeButton = document.querySelector('.dialog-close');
const mediaLightbox = document.getElementById('mediaLightbox');
const mediaLightboxStage = document.getElementById('mediaLightboxStage');
const mediaLightboxClose = document.getElementById('mediaLightboxClose');

const typeLabel = { image: '图片', video: '视频', pdf: 'PDF', deck: 'PPT', file: '文件' };
const domainWords = {
  'AI创作': 'AI CREATION',
  'UI设计': 'UI DESIGN',
  '产品设计': 'PRODUCT DESIGN',
  '包装设计': 'PACKAGE DESIGN'
};

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.addEventListener('load', () => {
  if (!location.hash || location.hash === '#top') window.scrollTo(0, 0);
});

let activeProject = null;
let activeDomain = null;
let activeItems = [];
let activeSections = [];
let activeIndex = 0;
let activeViewMode = 'slide';
let galleryObserver = null;
let cleanupFactionInteraction = null;
const touchModeQuery = window.matchMedia('(hover: none), (pointer: coarse), (max-width: 820px)');

function isTouchMode() {
  return touchModeQuery.matches;
}

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}
function allProjects() {
  return data.flatMap(domain => domain.projects.map(project => ({ domain, project })));
}
function heroEntriesFor(domainIndex, domain) {
  const entries = domain.projects.map(project => ({ domain, project }));
  if (domainIndex !== 0) return entries;
  ['project-2-2', 'project-2-0'].forEach(slug => {
    const found = findProject(slug);
    if (found && !entries.some(entry => entry.project.slug === slug)) entries.push(found);
  });
  return entries;
}
function findProject(slug) {
  for (const domain of data) {
    const project = domain.projects.find(item => item.slug === slug);
    if (project) return { domain, project };
  }
  return null;
}
function projectItems(project) {
  if (!project) return [];
  if (project.pdfPages && project.pdfPages.length) return project.pdfPages;
  return project.files || [];
}
function visibleItemsForProject(project) {
  const items = projectItems(project).slice();
  if (project?.slug === 'project-0-1') return items.filter(item => item.type === 'video');
  if (project?.slug === 'project-1-0') return items.filter(item => !/首页/i.test(String(item?.name || '')));
  if (project?.slug === 'project-1-1') return items.filter(item => !/^首页-66\.(png|jpe?g|webp|avif)$/i.test(String(item?.name || '')));
  if (project?.slug === 'project-2-0') return items.filter(item => !/^(1|2-02)\.(png|jpe?g|webp|avif)$/i.test(String(item?.name || '')));
  if (project?.slug === 'project-3-0') return items.filter(item => !/^11\.png$/i.test(String(item?.name || '')));
  return items;
}
function viewerItems(project) {
  const items = visibleItemsForProject(project).slice().sort((a, b) => {
    if (project?.slug === 'project-0-2') {
      const sourceItems = visibleItemsForProject(project);
      const labelOrder = new Map();
      sourceItems.forEach(item => {
        const label = factionLabelFor(item);
        if (label && !labelOrder.has(label)) labelOrder.set(label, labelOrder.size);
      });
      const kindScore = item => {
        const name = String(item?.name || '');
        if (item?.type === 'video' || /技能展示/i.test(name)) return 0;
        if (/角色设定/i.test(name)) return 1;
        if (/场景设定|角场景设定/i.test(name)) return 2;
        if (/三视图/i.test(name)) return 3;
        return 4;
      };
      const groupDiff = (labelOrder.get(factionLabelFor(a)) ?? Number.MAX_SAFE_INTEGER) - (labelOrder.get(factionLabelFor(b)) ?? Number.MAX_SAFE_INTEGER);
      if (groupDiff !== 0) return groupDiff;
      const kindDiff = kindScore(a) - kindScore(b);
      if (kindDiff !== 0) return kindDiff;
      return String(a?.name || '').localeCompare(String(b?.name || ''), 'zh-CN-u-co-pinyin-nu');
    }
    if (project?.slug === 'project-0-3') {
      const score = item => {
        const name = String(item?.name || '');
        if (item.type === 'video') return 0;
        if (/角色设定/i.test(name)) return 1;
        if (/三视图/i.test(name)) return 2;
        return 3;
      };
      return score(a) - score(b);
    }
    if (project?.slug === 'project-2-2') {
      const order = [
        '首图.png',
        '设计定义.png',
        '人机分析.png',
        'CMF.png',
        '渲染图.png',
        '三视图.png',
        '手板制作 .png'
      ];
      const score = item => {
        const index = order.indexOf(String(item?.name || ''));
        return index === -1 ? order.length : index;
      };
      return score(a) - score(b);
    }
    if (project?.slug === 'project-2-0') {
      const getOrder = item => {
        const name = String(item?.name || '');
        const match = name.match(/_(\d+)\./);
        return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
      };
      const orderDiff = getOrder(a) - getOrder(b);
      if (orderDiff !== 0) return orderDiff;
      return String(a?.name || '').localeCompare(String(b?.name || ''), 'zh-CN-u-co-pinyin-nu');
    }
    const priority = { video: 0, image: 1, pdf: 2, deck: 3, file: 4 };
    return (priority[a.type] ?? 9) - (priority[b.type] ?? 9);
  });
  const processBoard = productCreativeProcessBoard(project, items);
  if (!processBoard) return items;
  const boardRels = new Set(processBoard.processItems.map(item => item.rel));
  return [...items.filter(item => !boardRels.has(item.rel)), processBoard];
}
function productCreativeProcessItems(project, items = projectItems(project)) {
  if (project?.slug !== 'project-0-0') return [];
  return items.filter(item => item.type === 'image' && /^制作过程(?: \(\d+\))?\.png$/i.test(item.name));
}
function productCreativeProcessBoard(project, items = projectItems(project)) {
  const processItems = productCreativeProcessItems(project, items);
  if (processItems.length < 3) return null;
  return {
    type: 'process-board',
    name: '制作过程',
    processItems
  };
}
function projectCounts(project) {
  return visibleItemsForProject(project).reduce((acc, file) => {
    acc[file.type] = (acc[file.type] || 0) + 1;
    return acc;
  }, {});
}
function countDomain(domain) {
  return domain.projects.flatMap(project => visibleItemsForProject(project)).reduce((acc, file) => {
    acc[file.type] = (acc[file.type] || 0) + 1;
    return acc;
  }, {});
}
function metaFor(project) {
  const entries = Object.entries(projectCounts(project));
  return entries.length ? entries.map(([type, count]) => `${typeLabel[type] || type} ${count}`).join(' / ') : '暂无素材';
}
function imageAsset(name, url) {
  return { name, url, type: 'image', encodedThumb: null };
}
function lightboxAttrs(item) {
  if (!item || !item.url || !['image', 'video'].includes(item.type)) return '';
  return ` data-lightbox-src="${escapeHTML(item.url)}" data-lightbox-type="${escapeHTML(item.type)}" data-lightbox-name="${escapeHTML(item.name || '')}"`;
}
function preferredCardItem(project) {
  const items = projectItems(project);
  if (!project || !items.length) return null;
  if (project.slug === 'project-0-0') return items.find(file => file.type === 'video' && /产品创意广告/i.test(file.name)) || null;
  if (project.slug === 'project-0-2') return items.find(file => file.type === 'video' && /沧澜阁—技能展示/i.test(file.name)) || null;
  if (project.slug === 'project-1-0') return items.find(file => file.type === 'image' && /首页/i.test(file.name)) || imageAsset('首页.png', 'UI%E8%AE%BE%E8%AE%A1/LILT%20app%E8%AE%BE%E8%AE%A1/%E9%A6%96%E9%A1%B5.png');
  if (project.slug === 'project-1-1') return items.find(file => file.type === 'image' && /^首页-66\.(png|jpe?g|webp|avif)$/i.test(file.name)) || imageAsset('首页-66.png', 'UI%E8%AE%BE%E8%AE%A1/%E6%B8%94%E5%BA%B7%E5%AE%9Dui%E8%AE%BE%E8%AE%A1/%E9%A6%96%E9%A1%B5-66.png');
  if (project.slug === 'project-2-0') return items.find(file => file.type === 'image' && /^2-02\.(png|jpe?g|webp|avif)$/i.test(file.name)) || imageAsset('2-02.webp', '%E4%BA%A7%E5%93%81%E8%AE%BE%E8%AE%A1/LILT%E9%9C%B2%E8%90%A5%E6%88%B7%E5%A4%96%E5%AE%A0%E7%89%A9%E6%99%BA%E8%83%BD%E7%94%A8%E5%93%81/2-02.webp');
  if (project.slug === 'project-2-1') return items.find(file => file.type === 'image' && /产品ai场景渲染2/i.test(file.name)) || null;
  if (project.slug === 'project-3-0') return items.find(file => file.type === 'image' && /^11\.png$/i.test(file.name)) || null;
  return null;
}
function preferredHeroItem(project) {
  const items = projectItems(project);
  if (!project || !items.length) return null;
  if (project.slug === 'project-0-2') return items.find(file => file.type === 'image' && /沧澜阁—场景设定/i.test(file.name)) || null;
  return preferredCardItem(project);
}
function galleryModeFor(project) {
  const items = viewerItems(project);
  if (['project-0-2', 'project-0-3', 'project-1-1'].includes(project?.slug)) return items.length > 1;
  return items.length > 1 && items.every(item => item.type === 'image');
}
function ratioGalleryModeFor(project) {
  return ['project-1-0', 'project-2-0', 'project-2-2'].includes(project?.slug);
}
function galleryItemMarkup(item, index) {
  if (item.type === 'video') {
    return `<video class="gallery-image gallery-video" src="${item.url}" controls muted loop playsinline preload="metadata"${lightboxAttrs(item)}></video>`;
  }
  return `<img class="gallery-image" src="${item.url || item.encodedThumb}" alt="${escapeHTML(item.name)}" loading="${index < 2 ? 'eager' : 'lazy'}"${lightboxAttrs(item)}>`;
}
function factionModeFor(project) {
  return project?.slug === 'project-0-2' && !isTouchMode();
}
function factionLabelFor(item) {
  return String(item?.name || '').split('—')[0].replace(/\.(png|jpe?g|webp|mp4)$/i, '').trim();
}
function factionKindFor(item) {
  const name = String(item?.name || '');
  if (item?.type === 'video' || /技能展示/i.test(name)) return 'video';
  if (/角色设定/i.test(name)) return 'character';
  if (/场景设定/i.test(name)) return 'scene';
  if (/三视图/i.test(name)) return 'turnaround';
  return 'extra';
}
function factionSectionsFor(project) {
  const groups = new Map();
  viewerItems(project).forEach(item => {
    const label = factionLabelFor(item) || '未命名门派';
    if (!groups.has(label)) {
      groups.set(label, { name: label, items: [], character: null, video: null, scene: null, turnaround: null, extras: [] });
    }
    const group = groups.get(label);
    const kind = factionKindFor(item);
    group.items.push(item);
    if (kind === 'character' && !group.character) group.character = item;
    else if (kind === 'video' && !group.video) group.video = item;
    else if (kind === 'scene' && !group.scene) group.scene = item;
    else if (kind === 'turnaround' && !group.turnaround) group.turnaround = item;
    else group.extras.push(item);
  });
  return [...groups.values()];
}
function setDialogMeta(index = 0) {
  if (!activeProject || !activeItems.length) {
    dialogMeta.textContent = '';
    return;
  }
  dialogMeta.textContent = `${metaFor(activeProject)} / ${String(index + 1).padStart(2, '0')} / ${String(activeItems.length).padStart(2, '0')}`;
}
function setFactionMeta(index = 0) {
  if (!activeProject || !activeSections.length) {
    dialogMeta.textContent = '';
    return;
  }
  dialogMeta.textContent = `${metaFor(activeProject)} / 门派 ${String(index + 1).padStart(2, '0')} / ${String(activeSections.length).padStart(2, '0')}`;
}
function coverFor(project) {
  const items = projectItems(project);
  const preferred = preferredCardItem(project);
  if (preferred) return preferred;
  const named = items.find(file => file.type === 'image' && /产品渲染图|图片1|九宫图|page-?0001|_01\./i.test(file.name));
  return project.cover || named || items.find(file => file.type === 'image') || items.find(file => file.type === 'video') || items[0] || null;
}
function thumbFor(project) {
  const preferred = preferredHeroItem(project);
  if (preferred && preferred.type === 'image') return preferred.encodedThumb || preferred.url;
  const cover = coverFor(project);
  if (cover && cover.type === 'image') return cover.encodedThumb || cover.url;
  const image = projectItems(project).find(file => file.type === 'image');
  return image ? image.encodedThumb || image.url : '';
}
function lightPreviewFor(project) {
  const items = projectItems(project);
  const preferred = preferredHeroItem(project);
  if (preferred?.type === 'image') return preferred;
  const cover = coverFor(project);
  if (cover?.type === 'image') return cover;
  return items.find(file => file.type === 'image') || null;
}
function heroThumbMarkup(project) {
  const thumb = thumbFor(project);
  const thumbStyle = thumb ? ` style="--thumb:url(&quot;${escapeHTML(thumb)}&quot;)"` : '';
  return `<span class="hero-thumb"${thumbStyle}></span>`;
}
function previewMediaFor(project) {
  const image = lightPreviewFor(project);
  if (image) return { type: 'image', src: image.encodedThumb || image.url };
  return null;
}
function ambientMediaFor(project, media) {
  const image = projectItems(project).find(file => file.type === 'image');
  if (image) return { type: 'image', src: image.encodedThumb || image.url };
  if (media) return media;
  return null;
}
function paletteFor(domainName = '', projectName = '') {
  const source = `${domainName}${projectName}`;
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) hash = (hash + source.charCodeAt(index) * (index + 3)) % 997;
  const palettes = [
    ['rgba(0,255,255,.28)', 'rgba(255,0,110,.18)'],
    ['rgba(0,255,65,.22)', 'rgba(255,176,0,.20)'],
    ['rgba(64,145,255,.24)', 'rgba(0,255,255,.18)'],
    ['rgba(255,79,0,.20)', 'rgba(255,0,110,.16)']
  ];
  return palettes[hash % palettes.length];
}
function firstImageProject() {
  return allProjects().find(item => projectItems(item.project).some(file => file.type === 'image'));
}
function setProfileImage() {
  const profileImage = document.getElementById('profileImage');
  if (profileImage && profileImage.getAttribute('src')) return;
  const profileProject = firstImageProject();
  if (!profileImage || !profileProject) return;
  const image = projectItems(profileProject.project).find(file => file.type === 'image');
  if (image) profileImage.src = image.encodedThumb || image.url;
}
function bindProfileReveal() {
  const profile = document.querySelector('.profile-resume-section');
  if (!profile) return;
  const blocks = [profile.querySelector('.profile-media'), profile.querySelector('.profile-copy'), profile.querySelector('.resume-detail')].filter(Boolean);
  blocks.forEach(block => block.classList.add('reveal-block'));
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      profile.classList.add('is-visible');
      observer.disconnect();
    });
  }, { threshold: 0.22 });
  observer.observe(profile);
}
function updateHeroTime() {
  const time = document.getElementById('heroTime');
  if (!time) return;
  time.textContent = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date()).toUpperCase();
}
function scrambleText(element, text) {
  const chars = 'PORTFILIO1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const target = text || '';
  let frame = 0;
  clearInterval(element._scrambleTimer);
  element._scrambleTimer = setInterval(() => {
    frame += 1;
    element.textContent = target.split('').map((char, index) => {
      if (char === ' ') return ' ';
      return index < frame / 1.8 ? char : chars[Math.floor(Math.random() * chars.length)];
    }).join('');
    if (frame >= Math.max(7, target.length * 1.5)) {
      clearInterval(element._scrambleTimer);
      element.textContent = target;
    }
  }, 22);
}
function bindCockpitMotion(hero) {
  if (!hero || hero.dataset.motionReady) return;
  hero.dataset.motionReady = 'true';
  let frame = 0;
  const resetMotion = () => {
    cancelAnimationFrame(frame);
    hero.style.setProperty('--tilt-x', '0deg');
    hero.style.setProperty('--tilt-y', '0deg');
    hero.style.setProperty('--shift-x', '0px');
    hero.style.setProperty('--shift-y', '0px');
  };
  function setMotion(clientX, clientY) {
    if (isTouchMode()) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const rect = hero.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width - .5) * 2;
      const y = ((clientY - rect.top) / rect.height - .5) * 2;
      hero.style.setProperty('--tilt-x', `${(x * 1.6).toFixed(2)}deg`);
      hero.style.setProperty('--tilt-y', `${(-y * 1.1).toFixed(2)}deg`);
      hero.style.setProperty('--shift-x', `${(x * 10).toFixed(2)}px`);
      hero.style.setProperty('--shift-y', `${(y * 7).toFixed(2)}px`);
    });
  }
  hero.addEventListener('pointermove', event => setMotion(event.clientX, event.clientY));
  hero.addEventListener('pointerleave', resetMotion);
  const syncMotionMode = () => {
    if (isTouchMode()) resetMotion();
  };
  if (touchModeQuery.addEventListener) touchModeQuery.addEventListener('change', syncMotionMode);
  else if (touchModeQuery.addListener) touchModeQuery.addListener(syncMotionMode);
}

function renderHeroIndex() {
  const list = document.getElementById('heroProjectList');
  const imageLayer = document.getElementById('heroHoverImage');
  const videoLayer = document.getElementById('heroHoverVideo');
  const ambientImage = document.getElementById('heroAmbientImage');
  const ambientVideo = document.getElementById('heroAmbientVideo');
  const hero = document.querySelector('.portfolio-hero');
  const indexWrap = document.querySelector('.hero-index');
  if (!list || !imageLayer || !videoLayer || !ambientImage || !ambientVideo || !hero || !indexWrap || !data.length) return;

  let activeDomainIndex = 0;
  let lastButton = null;
  let lastRow = null;
  let clickedProjectSlug = null;
  let heroMediaFrame = 0;
  let heroMediaTimer = 0;
  bindCockpitMotion(hero);
  const tabs = document.createElement('div');
  tabs.className = 'hero-domain-tabs';
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', '首页作品分区');
  indexWrap.insertBefore(tabs, list);

  const caption = document.createElement('div');
  caption.className = 'hero-preview-caption';
  caption.innerHTML = '<span>LIUHAI</span><strong>PORTFILIO</strong><em>AI创作 / UI设计 / 产品设计 / 包装设计</em>';
  hero.appendChild(caption);

  function clearPreview() {
    cancelAnimationFrame(heroMediaFrame);
    clearTimeout(heroMediaTimer);
    hero.classList.remove('has-active', 'media-video', 'media-image', 'media-png');
    hero.classList.remove('is-interacting');
    hero.removeAttribute('data-preview-key');
    imageLayer.style.backgroundImage = '';
    imageLayer.style.opacity = '0';
    videoLayer.style.opacity = '0';
    videoLayer.pause();
    videoLayer.removeAttribute('src');
    ambientImage.style.opacity = '0';
    ambientImage.style.backgroundImage = '';
    ambientVideo.style.opacity = '0';
    ambientVideo.pause();
    ambientVideo.removeAttribute('src');
    caption.innerHTML = '<span>LIUHAI</span><strong>PORTFILIO</strong><em>AI创作 / UI设计 / 产品设计 / 包装设计</em>';
    if (lastButton) lastButton.classList.remove('is-active');
    if (lastRow) lastRow.classList.remove('is-featured');
    lastButton = null;
    lastRow = null;
    clickedProjectSlug = null;
  }
  function showMedia(project, domain, media) {
    if (!project || !media) return;
    const previewKey = `${project.slug}:${media.type}:${media.src}`;
    if (hero.dataset.previewKey === previewKey) return;
    hero.dataset.previewKey = previewKey;
    const ambient = ambientMediaFor(project, media);
    const [ambientA, ambientB] = paletteFor(domain.domain, project.name);
    hero.classList.add('has-active');
    hero.classList.toggle('media-video', media.type === 'video');
    hero.classList.toggle('media-image', media.type === 'image');
    hero.classList.toggle('media-png', media.type === 'image' && /\.png(?:$|[?#])/i.test(media.src));
    hero.style.setProperty('--ambient-a', ambientA);
    hero.style.setProperty('--ambient-b', ambientB);
    caption.innerHTML = `<span>${escapeHTML(domain.domain)}</span><strong>${escapeHTML(project.name)}</strong><em>${escapeHTML(metaFor(project))}</em>`;
    imageLayer.style.opacity = media.type === 'image' ? '1' : '0';
    videoLayer.style.opacity = media.type === 'video' ? '1' : '0';
    if (media.type === 'video') {
      imageLayer.style.backgroundImage = '';
      if (videoLayer.getAttribute('src') !== media.src) videoLayer.src = media.src;
      videoLayer.play().catch(() => {});
    } else {
      videoLayer.pause();
      imageLayer.style.backgroundImage = `url("${media.src}")`;
    }
    if (ambient && ambient.type === 'video') {
      ambientImage.style.opacity = '0';
      ambientImage.style.backgroundImage = '';
      ambientVideo.style.opacity = '1';
      if (ambientVideo.getAttribute('src') !== ambient.src) ambientVideo.src = ambient.src;
      ambientVideo.play().catch(() => {});
    } else if (ambient) {
      ambientVideo.style.opacity = '0';
      ambientVideo.pause();
      ambientImage.style.opacity = '1';
      ambientImage.style.backgroundImage = `url("${ambient.src}")`;
    }
  }
  function queueMedia(project, domain, button) {
    cancelAnimationFrame(heroMediaFrame);
    clearTimeout(heroMediaTimer);
    heroMediaTimer = setTimeout(() => {
      if (lastButton !== button) return;
      heroMediaFrame = requestAnimationFrame(() => showMedia(project, domain, previewMediaFor(project)));
    }, 40);
  }
  function warmHeroMedia(projects) {
    if (!('requestIdleCallback' in window)) return;
    requestIdleCallback(() => {
      projects.forEach(({ project }) => {
        const media = previewMediaFor(project);
        if (!media || media.type !== 'image') return;
        const image = new Image();
        image.decoding = 'async';
        image.src = media.src;
      });
    }, { timeout: 1200 });
  }
  function activate(button, project, domain, options = {}) {
    if (!button) return;
    const isSame = lastButton === button;
    const row = button.closest('.hero-project-row');
    if (lastButton && lastButton !== button) lastButton.classList.remove('is-active');
    if (lastRow && lastRow !== row) lastRow.classList.remove('is-featured');
    lastButton = button;
    lastRow = row;
    hero.classList.add('is-interacting');
    button.classList.add('is-active');
    if (row) row.classList.add('is-featured');
    if (isSame && options.force !== true) return;
    queueMedia(project, domain, button);
  }
  function renderDomain(domainIndex) {
    activeDomainIndex = (domainIndex + data.length) % data.length;
    const domain = data[activeDomainIndex];
    const heroEntries = heroEntriesFor(activeDomainIndex, domain);
    clickedProjectSlug = null;
    hero.dataset.domain = domain.domain;
    tabs.innerHTML = data.map((entry, index) => `<button class="hero-domain-tab ${index === activeDomainIndex ? 'active' : ''}" type="button" role="tab" aria-selected="${index === activeDomainIndex}" data-domain-index="${index}"><span>${String(index + 1).padStart(2, '0')}</span>${escapeHTML(entry.domain)}</button>`).join('');
    const center = (heroEntries.length - 1) / 2;
    list.innerHTML = heroEntries.map((entry, index) => {
      const project = entry.project;
      const sourceDomain = entry.domain;
      const number = String(index + 1).padStart(2, '0');
      const spread = index - center;
      const distance = Math.abs(spread);
      const spreadStep = heroEntries.length > 4 ? 106 : 128;
      const z = Math.round(48 - distance * 6 + index);
      const tone = /咖啡/.test(project.name) || ['project-2-2', 'project-2-0'].includes(project.slug) ? 'dark' : 'light';
      return `<li class="hero-project-row" style="--i:${index}; --card-z:${z}; --card-rotate:${spread * 10}deg; --card-x:${spread * spreadStep}px; --card-y:${distance * 34}px;"><button class="hero-project-link" type="button" data-project="${project.slug}" data-tone="${tone}">${heroThumbMarkup(project)}<span class="hero-data hero-number hover-text" data-text="${number}">${number}</span><span class="hero-data hero-name hover-text" data-text="${escapeHTML(project.name)}">${escapeHTML(project.name)}</span><span class="hero-data hero-domain hover-text" data-text="${escapeHTML(sourceDomain.domain)}">${escapeHTML(sourceDomain.domain)}</span></button></li>`;
    }).join('');
    tabs.querySelectorAll('.hero-domain-tab').forEach(button => {
      button.addEventListener('click', () => renderDomain(Number(button.dataset.domainIndex)));
    });
    list.querySelectorAll('.hero-project-link').forEach(button => {
      const entry = heroEntries.find(item => item.project.slug === button.dataset.project);
      if (!entry) return;
      if (!isTouchMode()) button.addEventListener('pointerenter', () => activate(button, entry.project, entry.domain));
      button.addEventListener('focus', () => activate(button, entry.project, entry.domain));
      button.addEventListener('click', event => {
        event.preventDefault();
        const tappedSelectedCard = isTouchMode() && lastButton === button && button.classList.contains('is-active');
        activate(button, entry.project, entry.domain, { force: isTouchMode() });
        if (isTouchMode() && !tappedSelectedCard) return;
        openProject(entry.project.slug);
      });
    });
    warmHeroMedia(heroEntries);
    clearPreview();
  }

  list.addEventListener('pointerleave', event => {
    if (isTouchMode()) return;
    if (event.relatedTarget && list.contains(event.relatedTarget)) return;
    clearPreview();
  });
  list.addEventListener('focusout', () => {
    requestAnimationFrame(() => {
      if (!list.contains(document.activeElement)) clearPreview();
    });
  });
  document.addEventListener('pointerdown', event => {
    if (!isTouchMode() || dialog.open) return;
    if (event.target.closest('.hero-project-link') || event.target.closest('.hero-domain-tab')) return;
    if (!hero.contains(event.target)) return;
    clearPreview();
  });

  document.addEventListener('keydown', event => {
    if (dialog.open) return;
    if (event.key === 'ArrowLeft') renderDomain(activeDomainIndex - 1);
    if (event.key === 'ArrowRight') renderDomain(activeDomainIndex + 1);
  });
  updateHeroTime();
  setInterval(updateHeroTime, 30000);
  renderDomain(0);
}

function coverMarkup(project) {
  const items = projectItems(project);
  const cover = preferredCardItem(project) || items.find(file => file.type === 'video') || coverFor(project);
  const poster = thumbFor(project);
  if (!cover) return '<div class="doc-cover">EMPTY</div>';
  if (cover.type === 'video') {
    const still = lightPreviewFor(project);
    if (still) return `<img class="project-cover-poster" src="${still.encodedThumb || still.url}" alt="${escapeHTML(project.name)}" loading="lazy" decoding="async" data-video-cover="true">`;
    return poster
      ? `<img class="project-cover-poster" src="${poster}" alt="${escapeHTML(project.name)}" loading="lazy" decoding="async" data-video-cover="true">`
      : '<div class="doc-cover">VIDEO</div>';
  }
  if (cover.type === 'image') return `<img src="${cover.encodedThumb || cover.url}" alt="${escapeHTML(project.name)}" loading="lazy" decoding="async">`;
  return `<div class="doc-cover">${typeLabel[cover.type] || 'FILE'}</div>`;
}
function render() {
  if (!root) return;
  root.innerHTML = data.map((domain, domainIndex) => {
    const stats = Object.entries(countDomain(domain)).map(([type, count]) => `<span>${typeLabel[type] || type} ${count}</span>`).join('');
    const cards = domain.projects.map((project, projectIndex) => {
      const counts = Object.entries(projectCounts(project)).map(([type, count]) => `<span>${typeLabel[type] || type} ${count}</span>`).join('');
      const rotate = ((projectIndex % 5) - 2) * 1.7;
      const offset = (projectIndex % 3) * 22;
      return `<article class="project-card" tabindex="0" role="button" data-project="${project.slug}" style="--card-index:${projectIndex}; --card-rotate:${rotate}deg; --card-offset:${offset}px;" aria-label="打开 ${escapeHTML(project.name)}"><div class="project-cover">${coverMarkup(project)}</div><div class="project-body"><h3>${escapeHTML(project.name)}</h3><div class="project-meta">${counts}</div></div></article>`;
    }).join('');
    const isAICreation = domain.slug === 'domain-0';
    const headMarkup = isAICreation
      ? `<div class="domain-head domain-head-centered domain-head-hero"><div class="domain-title-wrap"><h2>${escapeHTML(domain.domain)}</h2></div></div>`
      : `<div class="domain-head domain-head-centered"><div class="domain-title-wrap"><div class="domain-kicker">${String(domainIndex + 1).padStart(2, '0')}</div><h2>${escapeHTML(domain.domain)}</h2></div></div>`;
    return `<section class="domain" id="${domain.slug}"><div class="domain-word">${domainWords[domain.domain] || domain.domain}</div>${headMarkup}<div class="project-grid">${cards}</div></section>`;
  }).join('');
  bindCards();
}
function itemMarkup(item) {
  if (item.type === 'process-board') {
    return `<div class="slide-media process-board">${item.processItems.map((entry, index) => `<figure class="process-board-item"><button class="process-board-hit" type="button" aria-label="放大查看 ${escapeHTML(entry.name)}" data-lightbox-src="${escapeHTML(entry.url)}" data-lightbox-type="image" data-lightbox-name="${escapeHTML(entry.name)}"><img class="process-board-image" src="${entry.url || entry.encodedThumb}" alt="${escapeHTML(entry.name)}" loading="${index === 0 ? 'eager' : 'lazy'}"></button><figcaption>${escapeHTML(entry.name.replace(/\.[^.]+$/, ''))}</figcaption></figure>`).join('')}</div>`;
  }
  if (item.type === 'video') return `<video class="slide-media slide-video" src="${item.url}" controls autoplay playsinline${lightboxAttrs(item)}></video>`;
  if (item.type === 'image') return `<img class="slide-media slide-image" src="${item.url || item.encodedThumb}" alt="${escapeHTML(item.name)}"${lightboxAttrs(item)}>`;
  return `<div class="slide-file"><strong>${typeLabel[item.type] || '文件'}</strong><a href="${item.url}" target="_blank" rel="noreferrer">打开原文件</a></div>`;
}
function pauseMedia(rootNode = dialogMedia) {
  if (!rootNode) return;
  rootNode.querySelectorAll('video').forEach(video => video.pause());
}
function cleanupDialogView() {
  pauseMedia(dialogMedia);
  if (galleryObserver) {
    galleryObserver.disconnect();
    galleryObserver = null;
  }
  if (cleanupFactionInteraction) {
    cleanupFactionInteraction();
    cleanupFactionInteraction = null;
  }
  dialogShell?.classList.remove('gallery-shell');
  dialogShell?.classList.remove('faction-shell');
  dialogMedia?.classList.remove('dialog-media-gallery');
  dialogMedia?.classList.remove('dialog-media-faction');
  dialogMedia?.classList.remove('is-ratio-gallery');
}
function renderSlide() {
  const item = activeItems[activeIndex];
  if (!item) return;
  cleanupDialogView();
  activeViewMode = 'slide';
  setDialogMeta(activeIndex);
  const stageWord = escapeHTML(activeProject?.name || activeDomain?.domain || 'GALLERY');
  dialogMedia.innerHTML = `<div class="viewer-stage-word" aria-hidden="true">${stageWord}</div><div class="slide-viewer"><button class="slide-btn prev" type="button" aria-label="上一张">‹</button><figure class="slide-figure">${itemMarkup(item)}<figcaption><span>${escapeHTML(item.name)}</span><span>${String(activeIndex + 1).padStart(2, '0')} / ${String(activeItems.length).padStart(2, '0')}</span></figcaption></figure><button class="slide-btn next" type="button" aria-label="下一张">›</button></div><div class="slide-strip">${activeItems.map((entry, index) => `<button class="strip-item ${index === activeIndex ? 'active' : ''}" type="button" data-index="${index}">${String(index + 1).padStart(2, '0')}</button>`).join('')}</div>`;
  dialogMedia.querySelector('.prev').addEventListener('click', () => showSlide(activeIndex - 1));
  dialogMedia.querySelector('.next').addEventListener('click', () => showSlide(activeIndex + 1));
  dialogMedia.querySelectorAll('.strip-item').forEach(btn => btn.addEventListener('click', () => showSlide(Number(btn.dataset.index))));
  const video = dialogMedia.querySelector('.slide-video');
  if (video) video.play().catch(() => {});
}
function renderGallery() {
  if (!activeItems.length) return;
  cleanupDialogView();
  activeViewMode = 'gallery';
  dialogShell?.classList.add('gallery-shell');
  dialogMedia?.classList.add('dialog-media-gallery');
  if (ratioGalleryModeFor(activeProject)) dialogMedia?.classList.add('is-ratio-gallery');
  const stageWord = escapeHTML(activeProject?.name || activeDomain?.domain || 'GALLERY');
  dialogMedia.innerHTML = `
    <div class="viewer-stage-word viewer-stage-word-gallery" aria-hidden="true">${stageWord}</div>
    <div class="gallery-side gallery-side-left" aria-hidden="true"><span id="galleryCurrent">(01)</span></div>
    <div class="gallery-side gallery-side-right" aria-hidden="true">GALLERY</div>
    <div class="gallery-flow">
      ${activeItems.map((item, index) => `
        <figure class="gallery-panel ${/\.png(?:$|[?#])/i.test(item.url || '') ? 'is-png' : ''}" data-index="${index}">
          <div class="gallery-frame">
            ${galleryItemMarkup(item, index)}
          </div>
          <figcaption class="gallery-caption">
            <span>${escapeHTML(item.name)}</span>
            <span>${String(index + 1).padStart(2, '0')}</span>
          </figcaption>
        </figure>
      `).join('')}
    </div>
  `;
  const panels = [...dialogMedia.querySelectorAll('.gallery-panel')];
  const current = document.getElementById('galleryCurrent');
  const syncGallery = index => {
    activeIndex = index;
    setDialogMeta(index);
    if (current) current.textContent = `(${String(index + 1).padStart(2, '0')})`;
    panels.forEach(panel => panel.classList.toggle('is-current', Number(panel.dataset.index) === index));
    panels.forEach((panel, panelIndex) => {
      const video = panel.querySelector('.gallery-video');
      if (!video) return;
      if (panelIndex === index) video.play().catch(() => {});
      else video.pause();
    });
  };
  syncGallery(0);
  galleryObserver = new IntersectionObserver(entries => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible) syncGallery(Number(visible.target.dataset.index));
  }, {
    root: dialogShell,
    threshold: [0.35, 0.6, 0.85]
  });
  panels.forEach(panel => galleryObserver.observe(panel));
}
function factionMediaMarkup(item, title, extraClass = '') {
  if (!item) return '';
  const classes = ['faction-card', extraClass];
  if (/\.png(?:$|[?#])/i.test(item.url || '')) classes.push('is-png');
  if (item.type === 'video') classes.push('is-video');
  const media = item.type === 'video'
    ? `<video class="faction-media faction-video" src="${item.url}" controls muted loop playsinline preload="metadata"${lightboxAttrs(item)}></video>`
    : `<img class="faction-media faction-image" src="${item.url || item.encodedThumb}" alt="${escapeHTML(item.name)}" loading="lazy"${lightboxAttrs(item)}>`;
  return `<figure class="${classes.filter(Boolean).join(' ')}"><div class="faction-card-label">${escapeHTML(title)}</div>${media}<figcaption>${escapeHTML(item.name)}</figcaption></figure>`;
}
function closeMediaLightbox() {
  if (!mediaLightbox || mediaLightbox.hidden) return;
  mediaLightbox.hidden = true;
  if (mediaLightboxStage) {
    mediaLightboxStage.querySelectorAll('video').forEach(video => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    });
    mediaLightboxStage.innerHTML = '';
  }
}
function openMediaLightbox({ src, type, name }) {
  if (!mediaLightbox || !mediaLightboxStage || !src || !type) return;
  const safeName = escapeHTML(name || '');
  mediaLightboxStage.innerHTML = type === 'video'
    ? `<video class="media-lightbox-media is-video" src="${escapeHTML(src)}" controls autoplay playsinline></video>${safeName ? `<div class="media-lightbox-caption">${safeName}</div>` : ''}`
    : `<img class="media-lightbox-media is-image" src="${escapeHTML(src)}" alt="${safeName}">${safeName ? `<div class="media-lightbox-caption">${safeName}</div>` : ''}`;
  mediaLightbox.hidden = false;
  mediaLightboxStage.querySelector('video')?.play().catch(() => {});
}
function renderFactionFlow() {
  if (!activeSections.length) return;
  cleanupDialogView();
  activeViewMode = 'faction';
  dialogShell?.classList.add('faction-shell');
  dialogMedia?.classList.add('dialog-media-faction');
  const stageWord = escapeHTML(activeProject?.name || activeDomain?.domain || 'FACTION');
  dialogMedia.innerHTML = `
    <div class="viewer-stage-word viewer-stage-word-gallery" aria-hidden="true">${stageWord}</div>
    <div class="gallery-side gallery-side-left" aria-hidden="true"><span id="factionCurrent">(01)</span></div>
    <div class="gallery-side gallery-side-right" aria-hidden="true">FACTION</div>
    <div class="faction-flow">
      ${activeSections.map((section, index) => {
        const cards = [
          { item: section.video, title: '技能展示' },
          { item: section.character, title: '角色设定' },
          { item: section.scene, title: '场景设定' },
          { item: section.turnaround, title: '角色三视图' },
          ...section.extras.map(item => ({ item, title: section.name }))
        ].filter(entry => entry.item);
        return `
          <section class="faction-panel" data-index="${index}">
            <div class="faction-sheet">
              <header class="faction-head">
                <div class="faction-eyebrow">${String(index + 1).padStart(2, '0')} / ${String(activeSections.length).padStart(2, '0')}</div>
                <h3>${escapeHTML(section.name)}</h3>
                <p>${section.items.map(item => typeLabel[item.type] || item.type).join(' / ')}</p>
              </header>
              <div class="faction-layout faction-layout-balanced">
                ${cards.map(entry => factionMediaMarkup(entry.item, entry.title)).join('')}
              </div>
            </div>
          </section>
        `;
      }).join('')}
    </div>
  `;
  const panels = [...dialogMedia.querySelectorAll('.faction-panel')];
  const current = document.getElementById('factionCurrent');
  const syncFaction = index => {
    activeIndex = index;
    setFactionMeta(index);
    if (current) current.textContent = `(${String(index + 1).padStart(2, '0')})`;
    panels.forEach(panel => {
      const isCurrent = Number(panel.dataset.index) === index;
      panel.classList.toggle('is-current', isCurrent);
      panel.querySelectorAll('video').forEach(video => {
        if (isCurrent) video.play().catch(() => {});
        else video.pause();
      });
    });
  };
  syncFaction(0);
  galleryObserver = new IntersectionObserver(entries => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible) syncFaction(Number(visible.target.dataset.index));
  }, {
    root: dialogShell,
    threshold: [0.3, 0.55, 0.8]
  });
  panels.forEach(panel => galleryObserver.observe(panel));
  let interactionLocked = false;
  const jumpFaction = direction => {
    if (interactionLocked) return;
    const nextIndex = Math.max(0, Math.min(panels.length - 1, activeIndex + direction));
    if (nextIndex === activeIndex) return;
    interactionLocked = true;
    panels[nextIndex]?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    setTimeout(() => { interactionLocked = false; }, 460);
  };
  const disposers = [];
  const onWheel = event => {
    if (activeViewMode !== 'faction' || isTouchMode()) return;
    if (Math.abs(event.deltaY) < 6) return;
    event.preventDefault();
    jumpFaction(event.deltaY > 0 ? 1 : -1);
  };
  dialogShell.addEventListener('wheel', onWheel, { passive: false });
  disposers.push(() => dialogShell.removeEventListener('wheel', onWheel));

  let touchStartX = 0;
  let touchStartY = 0;
  const onTouchStart = event => {
    if (activeViewMode !== 'faction' || event.touches.length !== 1) return;
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
  };
  const onTouchEnd = event => {
    if (activeViewMode !== 'faction' || !touchStartY || event.target.closest('video')) return;
    if (!event.changedTouches.length) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    touchStartX = 0;
    touchStartY = 0;
    if (Math.abs(deltaY) < 52 || Math.abs(deltaY) < Math.abs(deltaX) * 1.15) return;
    jumpFaction(deltaY < 0 ? 1 : -1);
  };
  dialogShell.addEventListener('touchstart', onTouchStart, { passive: true });
  dialogShell.addEventListener('touchend', onTouchEnd, { passive: true });
  disposers.push(() => dialogShell.removeEventListener('touchstart', onTouchStart));
  disposers.push(() => dialogShell.removeEventListener('touchend', onTouchEnd));
  cleanupFactionInteraction = () => disposers.forEach(dispose => dispose());
}
function showSlide(index) {
  if (activeViewMode !== 'slide' || !activeItems.length) return;
  activeIndex = (index + activeItems.length) % activeItems.length;
  renderSlide();
}
function openProject(slug) {
  const found = findProject(slug);
  if (!found) return;
  activeDomain = found.domain;
  activeProject = found.project;
  activeItems = viewerItems(activeProject);
  activeSections = factionSectionsFor(activeProject);
  activeIndex = 0;
  dialog.dataset.domain = activeDomain.domain;
  dialog.dataset.project = activeProject.name;
  dialog.dataset.domainSlug = activeDomain.slug;
  dialog.dataset.projectSlug = activeProject.slug;
  dialogDomain.textContent = activeDomain.domain;
  dialogTitle.textContent = activeProject.name;
  dialogShell.scrollTop = 0;
  if (factionModeFor(activeProject)) renderFactionFlow();
  else if (galleryModeFor(activeProject)) renderGallery();
  else renderSlide();
  if (!dialog.open) dialog.showModal();
  const video = dialogMedia.querySelector('.slide-video');
  if (video) video.play().catch(() => {});
}
function bindCards() {
  document.querySelectorAll('.project-card').forEach(card => {
    const video = card.querySelector('video');
    if (video?.dataset.coverAutoplay === 'true') video.play().catch(() => {});
    card.addEventListener('mouseenter', () => {
      if (!video) return;
      video.play().catch(() => {});
    });
    card.addEventListener('mouseleave', () => {
      if (!video) return;
      video.pause();
      video.currentTime = 0;
    });
    card.addEventListener('click', event => {
      if (event.target.closest('.open-project') || event.currentTarget === card) openProject(card.dataset.project);
    });
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openProject(card.dataset.project);
      }
    });
  });
}

closeButton.addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
dialogMedia.addEventListener('click', event => {
  const media = event.target.closest('[data-lightbox-src]')
    || event.target.closest('.gallery-panel')?.querySelector('[data-lightbox-src]')
    || event.target.closest('.faction-card')?.querySelector('[data-lightbox-src]');
  if (!media) return;
  openMediaLightbox({
    src: media.dataset.lightboxSrc,
    type: media.dataset.lightboxType,
    name: media.dataset.lightboxName
  });
});
mediaLightboxClose?.addEventListener('click', closeMediaLightbox);
mediaLightbox?.addEventListener('click', event => {
  if (event.target === mediaLightbox) closeMediaLightbox();
});
dialog.addEventListener('close', () => {
  closeMediaLightbox();
  cleanupDialogView();
  dialogShell.scrollTop = 0;
  dialog.querySelectorAll('video').forEach(video => video.pause());
  activeSections = [];
});
document.addEventListener('keydown', event => {
  if (mediaLightbox && !mediaLightbox.hidden && event.key === 'Escape') {
    event.preventDefault();
    closeMediaLightbox();
    return;
  }
  if (!dialog.open || activeViewMode !== 'slide') return;
  if (event.key === 'ArrowLeft') showSlide(activeIndex - 1);
  if (event.key === 'ArrowRight') showSlide(activeIndex + 1);
});

setProfileImage();
bindProfileReveal();
renderHeroIndex();
render();
