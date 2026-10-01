const STORAGE_KEY = 'zroute-command-center-v3';
const LEGACY_STORAGE_KEY = 'zroute-command-center-v2';

const numberedBuildings = (name, count, icon) => Array.from({ length: count }, (_, index) => ({
  name: `${name} ${index + 1}`, description: name, icon
}));

// This order and grouping mirrors the supplied in-game construction directory.
// Numbered entries are separate building slots, so each keeps its own level.
const constructionGroups = [
  { name: 'HQ', buildings: [{ name: 'HQ', description: 'Headquarters', icon: '⌂' }] },
  { name: 'Economy', buildings: [
    ...numberedBuildings('Farm', 5, '♨'),
    ...numberedBuildings('Metal Smelting Plant', 5, '◆'),
    ...numberedBuildings('Trainin Ground', 5, '⚒'),
    ...numberedBuildings('Oil Extraction Well', 5, '◉'),
    { name: 'Motel', description: 'Motel', icon: '▤' },
    { name: 'Alloy Processing Plant', description: 'Alloy Processing Plant', icon: '◇' },
    { name: 'Gear Metal Factory', description: 'Gear Metal Factory', icon: '⚙' },
    { name: 'Monument', description: 'Monument', icon: '▲' },
    { name: 'Decoration Center', description: 'Decoration Center', icon: '✦' },
    { name: 'Oil Tank', description: 'Oil Tank', icon: '●' },
    { name: 'Barn', description: 'Barn', icon: '▰' },
    { name: 'Metal Warehouse', description: 'Metal Warehouse', icon: '▣' }
  ] },
  { name: 'Military', buildings: [
    { name: 'Wingman Lab', description: 'Wingman Lab', icon: '⌬' },
    { name: 'Scout Drone', description: 'Scout Drone', icon: '⌁' },
    { name: 'Soldier Training Camp', description: 'Soldier Training Camp', icon: '⚔' },
    { name: 'Hospital', description: 'Hospital', icon: '✚' },
    { name: 'Drill Ground', description: 'Drill Ground', icon: '◎' },
    { name: 'Radar', description: 'Radar', icon: '◉' },
    { name: 'Alliance Center', description: 'Alliance Center', icon: '◇' },
    { name: 'Special Ops Squad', description: 'Special Ops Squad', icon: '★' },
    { name: 'Shop', description: 'Shop', icon: '▥' },
    { name: 'Arena', description: 'Arena', icon: '⬡' },
    { name: 'Warrior Training Center', description: 'Warrior Training Center', icon: '⚔' },
    { name: 'Assault Training Center', description: 'Assault Training Center', icon: '➶' },
    { name: 'Tactical Training Center', description: 'Tactical Training Center', icon: '⌖' },
    { name: 'Research Center Alpha', description: 'Research Center Alpha', icon: 'α' },
    { name: 'Research Center Beta', description: 'Research Center Beta', icon: 'β' },
    { name: 'Gear Craft Center', description: 'Gear Craft Center', icon: '⚙' }
  ] }
];

const buildings = constructionGroups.flatMap(group => group.buildings);

// Research nodes, costs, and timers will be added to these categories as their
// verified in-game trees become available.
const researchTrees = [
  'Develop', 'Economy', 'Hero', 'Soldier', 'Full Development',
  'Prosperous Economy', 'Squad 1', 'Squad 2', 'Squad 4',
  'Alliance Competition', 'Convoy', 'Super Soldiers', 'Squad 3',
  'Offense Strategy', 'Defense Strategy'
].map(name => ({ name, id: name.toLowerCase().replace(/\s+/g, '-') }));

const allianceBranches = {
  Growth: ['Alliance Member Limit', 'Alliance Help', 'Construction Support', 'Research Support'],
  Territory: ['Territory Expansion', 'Resource Protection', 'Alliance Gathering', 'Rally Capacity'],
  Combat: ['Rally Attack', 'Rally Defense', 'March Speed', 'Wounded Capacity']
};

const hero = (name, rarity, heroClass, type, promoted = false) => ({
  id: `${name.toLowerCase().replace(/\s/g, '-')}-${rarity.toLowerCase()}`,
  name, rarity, heroClass, type, promoted
});

// Roster supplied from the current in-game hero directory. Aria's SSR and promoted
// UR versions use separate IDs so both progression records remain independent.
const heroes = [
  hero('Jamal', 'SR', 'Warrior', 'FL'), hero('Hank', 'SR', 'Warrior', 'FL'),
  hero('Rachel', 'SSR', 'Warrior', 'BL'), hero('Logan', 'SSR', 'Warrior', 'BL'),
  hero('Toxina', 'SSR', 'Warrior', 'FL'), hero('Zara', 'SSR', 'Warrior', 'FL'),
  hero('Nora', 'SSR', 'Warrior', 'BL'), hero('Aria', 'SSR', 'Warrior', 'BL'),
  hero('Carter', 'UR', 'Warrior', 'S'), hero('Aria', 'UR', 'Warrior', 'BL', true),
  hero('Dirk', 'UR', 'Warrior', 'FL'), hero('Monroe', 'UR', 'Warrior', 'BL'),
  hero('Arnold', 'UR', 'Warrior', 'FL'), hero('Lucian', 'UR', 'Warrior', 'BL'),
  hero('Lee Yu', 'SSR', 'Assault', 'BL'), hero('Celeste', 'SSR', 'Assault', 'BL'),
  hero('Jack', 'SSR', 'Assault', 'FL'), hero('Vince', 'UR', 'Assault', 'FL'),
  hero('Yana', 'UR', 'Assault', 'BL'), hero('Victor', 'UR', 'Assault', 'BL'),
  hero('Nicole', 'UR', 'Assault', 'BL'), hero('Vera', 'UR', 'Assault', 'FL'),
  hero('Jackson', 'SR', 'Tactical', 'BL'), hero('Kim Mina', 'SSR', 'Tactical', 'BL'),
  hero('Conan', 'SSR', 'Tactical', 'FL'), hero('Taylor', 'SSR', 'Tactical', 'BL'),
  hero('Silas', 'UR', 'Tactical', 'BL'), hero('Bekka', 'UR', 'Tactical', 'FL'),
  hero('Leah', 'UR', 'Tactical', 'BL'), hero('Katya', 'UR', 'Tactical', 'BL'),
  hero('Virgilio', 'UR', 'Tactical', 'FL')
];
const equipmentSlots = ['Rifle', 'Scope', 'Helmet', 'Bullet Proof Vest'];
const equipmentQualities = ['None', 'R / Green', 'SR / Blue', 'SSR / Purple', 'UR / Gold'];
const starShardCosts = [5, 10, 20, 60, 100];
const typeNames = { FL: 'Frontline', BL: 'Backline', S: 'Support' };
const survivorRarities = ['Other', 'SSR', 'Mythic'];
const resourceNames = ['food', 'metal', 'oil', 'shards', 'tokens'];
const emptyResources = () => Object.fromEntries(resourceNames.map(name => [name, 0]));

const defaults = {
  profile: { name: '' },
  buildings: Object.fromEntries(buildings.map(({ name }) => [name, 1])),
  research: {},
  alliance: Object.fromEntries(Object.values(allianceBranches).flat().map(name => [name, 0])),
  ownedHeroes: [],
  heroProgress: {},
  survivors: [],
  upgradeRecords: [],
  targets: {}
};

let state = loadState();
const $ = selector => document.querySelector(selector);
const app = $('#app');

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY) || '{}');
    const savedBuildings = { ...saved.buildings };
    if (savedBuildings.HQ === undefined && savedBuildings.Headquarters !== undefined) savedBuildings.HQ = savedBuildings.Headquarters;
    const savedOwnedHeroes = Array.isArray(saved.ownedHeroes) ? saved.ownedHeroes : [];
    const ownedHeroes = savedOwnedHeroes.map(value => heroes.find(item => item.id === value)?.id || heroes.find(item => item.name === value)?.id).filter(Boolean);
    return {
      profile: { ...defaults.profile, ...saved.profile },
      buildings: Object.fromEntries(Object.keys(defaults.buildings).map(name => [name, savedBuildings[name] ?? defaults.buildings[name]])),
      research: { ...defaults.research, ...saved.research },
      alliance: { ...defaults.alliance, ...saved.alliance },
      ownedHeroes: [...new Set(ownedHeroes)],
      heroProgress: saved.heroProgress && typeof saved.heroProgress === 'object' ? saved.heroProgress : {},
      survivors: Array.isArray(saved.survivors) ? saved.survivors : [],
      upgradeRecords: Array.isArray(saved.upgradeRecords) ? saved.upgradeRecords : [],
      targets: saved.targets && typeof saved.targets === 'object' ? saved.targets : {}
    };
  } catch { return structuredClone(defaults); }
}

function save(message = 'Progress saved') {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const toast = $('#toast');
  toast.textContent = message; toast.classList.add('show');
  clearTimeout(save.timer); save.timer = setTimeout(() => toast.classList.remove('show'), 1500);
}

function setProfile() {
  const name = state.profile.name.trim() || 'Commander';
  $('#profileName').textContent = name.toUpperCase();
  $('#profileAvatar').textContent = name[0].toUpperCase();
}

function pageHeader(eyebrow, title) { $('#pageEyebrow').textContent = eyebrow; $('#pageTitle').textContent = title; }
function levelControl(group, name, level, max = 30) {
  return `<div class="level-stepper" data-group="${group}" data-name="${name}">
    <button data-change="-1" aria-label="Decrease ${name}">−</button><label>LEVEL <input type="number" min="0" max="${max}" value="${level}" aria-label="${name} level"></label><button data-change="1" aria-label="Increase ${name}">+</button>
  </div>`;
}

function heroCap() { return Math.max(5, 150 - (30 - Math.min(30, state.buildings.HQ)) * 5); }
function heroProgress(hero) {
  const progress = state.heroProgress[hero.id] || {};
  return { level: 1, starSteps: 0, equipment: {}, ...progress };
}
function shardsUsed(steps) {
  return Array.from({ length: steps }, (_, index) => starShardCosts[Math.floor(index / 5)]).reduce((sum, cost) => sum + cost, 0);
}

function targetKey(category, item) { return `${category}:${item}`; }
function targetFor(category, item, fallback) { return Number(state.targets[targetKey(category, item)] ?? fallback); }
function formatNumber(value) { return new Intl.NumberFormat().format(value || 0); }
function formatDuration(minutes) {
  if (!minutes) return '0m';
  const days = Math.floor(minutes / 1440); const hours = Math.floor((minutes % 1440) / 60); const mins = minutes % 60;
  return [days && `${days}d`, hours && `${hours}h`, mins && `${mins}m`].filter(Boolean).join(' ');
}
function baseFromObserved(value, reduction) {
  const divisor = 1 - Math.min(99.99, Math.max(0, Number(reduction) || 0)) / 100;
  return Math.round((Number(value) || 0) / divisor);
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character]);
}
function upgradeItems(category) {
  let items = [];
  if (category === 'building') items = buildings.map(item => ({ value: item.name, label: item.name }));
  if (category === 'research') items = researchTrees.map(item => ({ value: item.name, label: item.name }));
  if (category === 'alliance') items = Object.entries(allianceBranches).flatMap(([branch, branchItems]) => branchItems.map(item => ({ value: item, label: `${branch} · ${item}` })));
  if (category === 'hero-level' || category === 'hero-star') items = heroes.map(item => ({ value: item.id, label: `${item.name} · ${item.rarity} ${item.heroClass}` }));
  if (category === 'survivor-star') items = state.survivors.map(item => ({ value: item.id, label: `${item.name} · ${item.rarity}` }));
  const existingItems = state.upgradeRecords
    .filter(record => record.category === category && !items.some(item => item.value === record.item))
    .map(record => ({ value: record.item, label: `${record.item} · Saved observation` }));
  return [...items, ...existingItems.filter((item, index) => existingItems.findIndex(candidate => candidate.value === item.value) === index)];
}
function upgradeItemOptions(category, selected = '') {
  const items = upgradeItems(category);
  const knownSelection = items.some(item => item.value === selected);
  const options = items.map(item => `<option value="${escapeHtml(item.value)}" ${item.value === selected ? 'selected' : ''}>${escapeHtml(item.label)}</option>`);
  if (selected && !knownSelection) options.unshift(`<option value="${escapeHtml(selected)}" selected>${escapeHtml(selected)} · Imported record</option>`);
  if (!items.length && !selected) return '<option value="" selected disabled>No tracked items available</option>';
  return options.join('');
}
function populateUpgradeItemSelect(select, category, selected = '') {
  select.innerHTML = upgradeItemOptions(category, selected);
}
function firstMissingLevel(category, item, current, target) {
  for (let level = current + 1; level <= target; level += 1) {
    if (!state.upgradeRecords.some(record => record.category === category && record.item === item && record.level === level)) return level;
  }
  return current + 1;
}
function calculateUpgrade(category, item, current, target) {
  const records = state.upgradeRecords.filter(record => record.category === category && record.item === item && record.level > current && record.level <= target);
  const total = records.reduce((result, record) => {
    resourceNames.forEach(name => { result.resources[name] += Number(record.resources?.[name]) || 0; });
    result.minutes += Number(record.minutes) || 0; return result;
  }, { resources: emptyResources(), minutes: 0 });
  const isStarPlan = category === 'hero-star' || category === 'survivor-star';
  if (isStarPlan) total.resources.shards += shardsUsed(target) - shardsUsed(current);
  const needed = Math.max(0, target - current);
  return { ...total, found: category === 'hero-star' ? needed : records.length, needed };
}
function planSummary(category, item, current, target) {
  if (target <= current) return '<small class="plan-ready">TARGET REACHED</small>';
  const plan = calculateUpgrade(category, item, current, target);
  if (!plan.needed || plan.found !== plan.needed) {
    const known = resourceNames.filter(name => plan.resources[name]).map(name => `${formatNumber(plan.resources[name])} ${name}`).join(' · ');
    const missingLevel = firstMissingLevel(category, item, current, target);
    return `<small class="plan-missing">${known ? `${known} · ` : ''}COST DATA ${plan.found}/${plan.needed} LEVELS · <button type="button" class="missing-data-button" data-add-record data-category="${category}" data-item="${item}" data-level="${missingLevel}">FILL LEVEL ${missingLevel}</button></small>`;
  }
  const resources = resourceNames.filter(name => plan.resources[name]).map(name => `${formatNumber(plan.resources[name])} ${name}`).join(' · ');
  return `<small class="plan-ready">${resources || 'No resources'} · ◷ ${formatDuration(plan.minutes)}</small>`;
}
function targetControl(category, item, current, max = 30, label = 'TARGET') {
  const target = Math.max(current, Math.min(max, targetFor(category, item, current)));
  return `<div class="target-plan"><label>${label}<input class="target-level" data-category="${category}" data-item="${item}" type="number" min="${current}" max="${max}" value="${target}"></label>${planSummary(category, item, current, target)}</div>`;
}
function starPicker(id, steps, ownerType = 'hero') {
  return `<div class="star-picker" role="group" aria-label="Star power: ${(steps / 5).toFixed(1)} of 5 stars">${Array.from({length: 5}, (_, star) => `<div class="progress-star" role="group" aria-label="Star ${star + 1}">${Array.from({length: 5}, (_, section) => { const step = star * 5 + section + 1; const filled = step <= steps; return `<button class="star-section ${filled ? 'filled' : ''}" data-star-owner="${ownerType}" data-id="${id}" data-step="${step}" aria-label="Set star power to ${(step / 5).toFixed(1)}" aria-pressed="${filled}"></button>`; }).join('')}</div>`).join('')}</div>`;
}

function overviewPage() {
  pageHeader('COMMAND CENTER', 'Overview');
  const completedBuildings = Object.values(state.buildings).filter(level => level > 1).length;
  return `<section class="hero-banner"><div><span class="chapter">YOUR SURVIVOR RECORD</span><h2>Plan the road<br><strong>ahead.</strong></h2><p>Record what you have. We will leave power calculations for verified game data.</p></div><div class="level-control summary"><span>HQ</span><strong>${state.buildings.HQ}</strong><small>Change this from Construction</small></div></section>
  <section class="stats-grid"><article class="stat-card"><div class="stat-icon orange">⌂</div><div><span>BUILDINGS TRACKED</span><strong>${completedBuildings} / ${buildings.length}</strong><small>Above starting level</small></div></article><article class="stat-card"><div class="stat-icon green">⌬</div><div><span>RESEARCH TREES</span><strong>${researchTrees.length}</strong><small>Ready for future tree data</small></div></article><article class="stat-card"><div class="stat-icon gold">♙</div><div><span>HEROES OWNED</span><strong>${state.ownedHeroes.length}</strong><small>From the community roster</small></div></article><article class="stat-card"><div class="stat-icon blue">◇</div><div><span>ALLIANCE LEVELS</span><strong>${Object.values(state.alliance).reduce((a,b)=>a+b,0)}</strong><small>Entered by you</small></div></article></section>
  <section class="quick-grid"><a class="quick-card" href="#construction"><span>01</span><h3>Construction</h3><p>Set the current level of every building.</p><b>Open tracker →</b></a><a class="quick-card" href="#research"><span>02</span><h3>Research</h3><p>Record personal technology levels by branch.</p><b>Open research →</b></a><a class="quick-card" href="#alliance"><span>03</span><h3>Alliance research</h3><p>Keep your alliance technology record nearby.</p><b>Open alliance →</b></a><a class="quick-card" href="#heroes"><span>04</span><h3>Hero roster</h3><p>Mark the heroes already in your roster.</p><b>Open heroes →</b></a><a class="quick-card" href="#survivors"><span>05</span><h3>Survivors</h3><p>Assign specialists and plan their stars.</p><b>Open survivors →</b></a></section>`;
}

function constructionPage() {
  pageHeader('SETTLEMENT', 'Construction');
  return `<section class="page-intro"><div><p class="eyebrow">BUILDING DIRECTORY</p><h2>Your settlement levels</h2><p>Set current and target levels. Verified database records are totaled into the resources and build time required.</p></div><div class="completion-ring"><strong>${Object.values(state.buildings).filter(v=>v>1).length}</strong><span>UPDATED</span></div></section>${constructionGroups.map(group => `<section class="construction-group"><header><div><p class="eyebrow">CONSTRUCTION</p><h2>${group.name}</h2></div><span>${group.buildings.length} ${group.buildings.length === 1 ? 'BUILDING' : 'BUILDINGS'}</span></header><div class="card-grid">${group.buildings.map(({ name, description, icon }) => `<article class="tracker-card"><div class="tracker-icon">${icon}</div><div class="tracker-copy"><h3>${name}</h3><p>${description}</p></div>${levelControl('buildings', name, state.buildings[name], 30)}${targetControl('building', name, state.buildings[name], 30)}</article>`).join('')}</div></section>`).join('')}<p class="source-note">Building names and numbered slots follow the supplied construction directory. Costs remain explicitly marked as missing until they are added to the verified upgrade database.</p>`;
}

function researchPage() {
  pageHeader('TECH LAB', 'Research');
  const selectedId = location.hash.split('/')[1];
  const selectedTree = researchTrees.find(tree => tree.id === selectedId);

  if (selectedTree) {
    return `<section class="page-intro research-intro"><div><p class="eyebrow">RESEARCH TREE</p><h2>${selectedTree.name}</h2><p>This tree is ready for its research nodes when verified game data is available.</p></div><a class="source-link" href="#research">← All research trees</a></section>
      <section class="research-placeholder" aria-labelledby="research-placeholder-title">
        <div class="research-placeholder-icon" aria-hidden="true">⌬</div>
        <p class="eyebrow">TREE DATA COMING SOON</p>
        <h2 id="research-placeholder-title">${selectedTree.name}</h2>
        <p>The individual upgrades, prerequisites, levels, and effects will be added here later.</p>
        <div class="upgrade-data-preview" aria-label="Data tracked for each future research upgrade">
          <span><i class="resource-dot food"></i><b>Food</b></span>
          <span><i class="resource-dot metal"></i><b>Metal</b></span>
          <span><i class="resource-dot oil"></i><b>Oil</b></span>
          <span class="duration">◷ <b>Completion time</b></span>
        </div>
        <small>Each upgrade can use one or more resources and has a set completion time.</small>
        <button class="button primary research-add-data" type="button" data-add-record data-category="research" data-item="${selectedTree.name}" data-level="1">+ Add research node data</button>
      </section>`;
  }

  return `<section class="page-intro research-intro"><div><p class="eyebrow">RESEARCH DIRECTORY</p><h2>Choose a research tree</h2><p>Select a category to open its tree. Upgrade data will be added as it becomes available.</p></div><div class="completion-ring"><strong>${researchTrees.length}</strong><span>RESEARCH TREES</span></div></section>
    <section class="research-directory" aria-labelledby="research-directory-title">
      <header><div><p class="eyebrow">TECH LAB</p><h2 id="research-directory-title">Research categories</h2></div><span>SELECT A TREE TO OPEN</span></header>
      <div class="research-tree-grid">${researchTrees.map((tree, index) => `<a class="research-tree-card" href="#research/${tree.id}" aria-label="Open ${tree.name} research tree"><div class="research-tree-image" aria-hidden="true"><span>⌬</span><small>IMAGE</small></div><div><span>${String(index + 1).padStart(2, '0')}</span><h3>${tree.name}</h3><small>OPEN TREE →</small></div></a>`).join('')}</div>
    </section>
    <aside class="research-data-note"><b>PLANNING DATA</b><p>Research and construction upgrades use Food, Metal, Oil, or a combination of those resources, plus a set completion time. These values will feed future current-base-to-max calculations.</p><div><span><i class="resource-dot food"></i>Food</span><span><i class="resource-dot metal"></i>Metal</span><span><i class="resource-dot oil"></i>Oil</span><span>◷ Completion time</span></div></aside>`;
}

function branchPage(type, title, subtitle, branches) {
  pageHeader(type === 'research' ? 'TECH LAB' : 'ALLIANCE', title);
  return `<section class="page-intro"><div><p class="eyebrow">LEVEL TRACKER</p><h2>${title}</h2><p>${subtitle}</p></div></section><div class="branch-layout"><aside class="branch-nav">${Object.keys(branches).map((name,i)=>`<a href="#branch-${type}-${i}"><i></i>${name}</a>`).join('')}</aside><section class="branch-content">${Object.entries(branches).map(([branch, items],i)=>`<article class="branch-panel" id="branch-${type}-${i}"><header><div><p class="eyebrow">${type === 'research' ? 'RESEARCH BRANCH' : 'ALLIANCE BRANCH'}</p><h3>${branch}</h3></div><span>${items.reduce((sum,name)=>sum+state[type][name],0)} LEVELS</span></header>${items.map(name=>`<div class="tech-row"><div><b>${name}</b><p>Enter the level shown in game</p></div>${levelControl(type,name,state[type][name],30)}${targetControl(type,name,state[type][name],30)}</div>`).join('')}</article>`).join('')}</section></div>`;
}

function heroesPage() {
  pageHeader('FORMATION', 'Heroes');
  const cap = heroCap();
  return `<section class="page-intro hero-intro"><div><p class="eyebrow">HERO DIRECTORY</p><h2>Your hero roster</h2><p>Track ownership, levels, star power, and equipment. Your HQ ${state.buildings.HQ} hero level cap is ${cap}.</p></div><div class="hero-cap"><span>HERO LEVEL CAP</span><strong>${cap}</strong><small>HQ 30 max · −5 per HQ level</small></div></section>
  <div class="hero-legend"><span><i class="rarity SR">SR</i> Rare</span><span><i class="rarity SSR">SSR</i> Super rare</span><span><i class="rarity UR">UR</i> Ultimate rare</span><span>FL · Frontline</span><span>BL · Backline</span><span>S · Support</span></div>
  ${['Warrior','Assault','Tactical'].map(heroClass => `<section class="hero-class"><header><div><p class="eyebrow">HERO CLASS</p><h2>${heroClass}</h2></div><span>${heroes.filter(item=>item.heroClass===heroClass).length} HEROES</span></header><div class="hero-grid">${heroes.filter(item=>item.heroClass===heroClass).map((item,index)=>heroCard(item,index,cap)).join('')}</div></section>`).join('')}
  <p class="source-note">Star progress uses five subsections per star and the supplied shard costs (5 / 10 / 20 / 60 / 100 per subsection). That schedule totals 975 shards from zero to five stars. Skill tracking will be added when skill level limits are available.</p>`;
}

function heroCard(item, index, cap) {
  const owned = state.ownedHeroes.includes(item.id);
  const progress = heroProgress(item);
  const stars = (progress.starSteps / 5).toFixed(1).replace('.0', '');
  return `<article class="hero-card ${owned?'owned':''}" data-rarity="${item.rarity}">
    <div class="hero-summary"><div class="hero-portrait"><span>${String(index+1).padStart(2,'0')}</span>${item.name[0]}</div><div class="hero-identity"><div class="hero-badges"><i class="rarity ${item.rarity}">${item.rarity}</i><i>${item.type} · ${typeNames[item.type]}</i></div><h3>${item.name}${item.promoted?'<small>PROMOTED</small>':''}</h3><button data-hero="${item.id}">${owned?'✓ IN MY ROSTER':'+ ADD TO ROSTER'}</button></div></div>
    ${owned?`<div class="hero-details"><label>HERO LEVEL <input class="hero-level" data-id="${item.id}" type="number" min="1" max="${cap}" value="${Math.min(progress.level,cap)}"><small>/ ${cap}</small>${targetControl('hero-level', item.id, progress.level, cap)}</label><div class="star-field"><span>STAR POWER</span>${starPicker(item.id, progress.starSteps)}<b>${stars} ★ · ${shardsUsed(progress.starSteps)} shards invested</b>${targetControl('hero-star', item.id, progress.starSteps, 25, 'TARGET STEP')}</div><div class="equipment"><span>EQUIPMENT</span>${equipmentSlots.map(slot=>`<label>${slot}<select class="hero-equipment" data-id="${item.id}" data-slot="${slot}">${equipmentQualities.map(quality=>`<option ${progress.equipment[slot]===quality?'selected':''}>${quality}</option>`).join('')}</select></label>`).join('')}</div><div class="skills-placeholder"><span>4 SKILLS</span><small>Level limits coming with verified skill data</small></div></div>`:''}
  </article>`;
}

function survivorProgress(item) { return { starSteps: 0, building: '', ...item }; }
function survivorsPage() {
  pageHeader('SETTLEMENT CREW', 'Survivors');
  return `<section class="page-intro survivor-intro"><div><p class="eyebrow">SURVIVOR DIRECTORY</p><h2>Building specialists</h2><p>Track Other, SSR, and Mythic survivors, assign each one to a building, and plan star upgrades in fifth-star increments.</p></div><button class="button primary" id="addSurvivor">+ Add survivor</button></section>
    <div class="hero-legend"><span><i class="rarity Other">OTHER</i> Other</span><span><i class="rarity SSR">SSR</i> Super rare</span><span><i class="rarity Mythic">MYTHIC</i> Mythic</span><span>Each diamond fills 20% of one star</span></div>
    ${state.survivors.length ? `<section class="survivor-grid">${state.survivors.map((raw, index) => { const item = survivorProgress(raw); const stars = (item.starSteps / 5).toFixed(1).replace('.0',''); return `<article class="survivor-card"><header><div class="survivor-avatar">${item.name[0].toUpperCase()}</div><div><i class="rarity ${item.rarity}">${item.rarity}</i><h3>${item.name}</h3><small>${item.benefit || 'Benefit not recorded'}</small></div><button class="remove-survivor" data-remove-survivor="${item.id}" aria-label="Remove ${item.name}">×</button></header><label class="assignment">ASSIGNED BUILDING<select class="survivor-building" data-id="${item.id}"><option value="">Unassigned</option>${buildings.map(building => `<option value="${building.name}" ${item.building === building.name ? 'selected' : ''}>${building.name}</option>`).join('')}</select></label><div class="star-field"><span>STAR POWER</span>${starPicker(item.id, item.starSteps, 'survivor')}<b>${stars} ★ · ${shardsUsed(item.starSteps)} shards invested</b>${targetControl('survivor-star', item.id, item.starSteps, 25, 'TARGET STEP')}</div></article>`; }).join('')}</section>` : `<section class="empty-state"><span>♟</span><h2>No survivors yet</h2><p>Add the survivors you discover; no names or benefits are guessed.</p><button class="button primary" id="addSurvivorEmpty">Add your first survivor</button></section>`}
    <p class="source-note">Shard requirements use the same 5 / 10 / 20 / 60 / 100 schedule as heroes. Add verified survivor-token requirements in Upgrade data; they will be included in target totals.</p>`;
}

function dataPage() {
  pageHeader('PLANNING DATABASE', 'Upgrade data');
  return `<section class="page-intro"><div><p class="eyebrow">COMMUNITY DATA</p><h2>Upgrade cost database</h2><p>Capture the values shown in game and any active reductions. The planner uses estimated base values so observations made with different bonuses remain comparable.</p></div><div class="completion-ring"><strong>${state.upgradeRecords.length}</strong><span>LOCAL RECORDS</span></div></section>
    <section class="data-layout"><div class="data-form data-callout"><header><p class="eyebrow">QUICK ENTRY</p><h2>Fill a missing value</h2></header><p>Open a missing-data link anywhere in the tracker to arrive with the item and next missing level filled in, or start a new observation here.</p><button class="button primary" type="button" data-add-record>+ Record upgrade data</button><div class="data-method"><b>HOW NORMALIZATION WORKS</b><p>If the game shows 900 food with a 10% reduction, we retain 900 as the observation and estimate the underlying cost as 1,000. Both values and the bonus context are exported for later pattern analysis.</p></div></div>
    <section class="data-records"><header><div><p class="eyebrow">LOCAL DATABASE</p><h2>Upgrade observations</h2></div><div><button class="button secondary" id="exportData">Export JSON</button><label class="button secondary import-button">Import JSON<input id="importData" type="file" accept="application/json"></label></div></header>${state.upgradeRecords.length ? `<div class="record-table">${state.upgradeRecords.map((record,index)=>`<article><div><span>${record.category} · ${record.observation ? 'NORMALIZED' : 'BASE VALUE'}</span><b>${record.item} → ${record.level}</b><small>${resourceNames.filter(name=>record.resources?.[name]).map(name=>`${formatNumber(record.resources[name])} ${name}`).join(' · ') || 'No resources'} · ${formatDuration(record.minutes)}${record.observation?.resourceReduction ? ` · ${record.observation.resourceReduction}% resource reduction` : ''}${record.observation?.timeReduction ? ` · ${record.observation.timeReduction}% time reduction` : ''}${record.source ? ` · ${record.source}` : ''}</small></div><div class="record-actions"><button data-edit-record="${index}" aria-label="Edit record">✎</button><button data-delete-record="${index}" aria-label="Delete record">×</button></div></article>`).join('')}</div>` : '<div class="empty-records">No observations yet. Click any missing-data prompt in the trackers, or start one here.</div>'}</section></section>
    <section class="objective-calculator"><div><p class="eyebrow">ANY UPGRADE</p><h2>Target calculator</h2><p>Choose a tracked item to plan its verified requirements.</p></div><form id="objectiveForm"><label>CATEGORY<select name="category"><option value="building">Building</option><option value="research">Research</option><option value="alliance">Alliance research</option><option value="hero-level">Hero level</option><option value="hero-star">Hero star</option><option value="survivor-star">Survivor star</option></select></label><label>ITEM<select name="item" required>${upgradeItemOptions('building')}</select></label><label>CURRENT<input name="current" type="number" min="0" required value="0"></label><label>TARGET<input name="target" type="number" min="1" required value="1"></label><button class="button primary" type="submit">Calculate</button></form><div id="objectiveResult" class="objective-result">Choose an objective to calculate its verified requirements.</div></section>`;
}

function updateNormalizationPreview(form) {
  const values = Object.fromEntries(new FormData(form));
  const resourceReduction = Number(values.resourceReduction) || 0;
  const timeReduction = Number(values.timeReduction) || 0;
  const resources = resourceNames.filter(name => Number(values[name])).map(name => `${formatNumber(baseFromObserved(values[name], resourceReduction))} ${name}`);
  $('#normalizationPreview').innerHTML = `<span>ESTIMATED BASE VALUES</span><b>${resources.join(' · ') || 'No resources'} · ${formatDuration(baseFromObserved(values.minutes, timeReduction))}</b><small>${resourceReduction || timeReduction ? 'Calculated from the reductions entered above. The displayed values are also retained.' : 'No reductions entered; shown and base values are the same.'}</small>`;
}

function openUpgradeDialog(trigger = {}) {
  const form = $('#quickUpgradeForm');
  form.reset();
  form.elements.editIndex.value = trigger.editIndex ?? '';
  form.elements.category.value = trigger.category || 'building';
  populateUpgradeItemSelect(form.elements.item, form.elements.category.value, trigger.item || '');
  form.elements.level.value = trigger.level || 1;
  $('#upgradeDialogTitle').textContent = trigger.editIndex === undefined ? 'Record an upgrade' : 'Edit upgrade observation';
  updateNormalizationPreview(form);
  $('#upgradeDialog').showModal();
  setTimeout(() => (form.elements.item.value ? form.elements.food : form.elements.item).focus(), 50);
}

let pendingObservation = null;
function requestUpgradeDialog(trigger = {}) {
  pendingObservation = trigger;
  $('#observationReadinessDialog').showModal();
  setTimeout(() => $('#continueObservation').focus(), 50);
}

function editUpgradeRecord(index) {
  const record = state.upgradeRecords[index];
  if (!record) return;
  const observed = record.observation?.resources || record.resources || emptyResources();
  openUpgradeDialog({ category: record.category, item: record.item, level: record.level, editIndex: index });
  const form = $('#quickUpgradeForm');
  resourceNames.forEach(name => { form.elements[name].value = Number(observed[name]) || 0; });
  form.elements.minutes.value = Number(record.observation?.minutes ?? record.minutes) || 0;
  form.elements.resourceReduction.value = Number(record.observation?.resourceReduction) || 0;
  form.elements.timeReduction.value = Number(record.observation?.timeReduction) || 0;
  form.elements.modifierNote.value = record.observation?.modifierNote || '';
  form.elements.source.value = record.source || '';
  updateNormalizationPreview(form);
}

const pages = {
  overview: overviewPage,
  construction: constructionPage,
  research: researchPage,
  alliance: () => branchPage('alliance', 'Alliance research', 'Record shared technology levels exactly as they appear for your alliance.', allianceBranches),
  heroes: heroesPage,
  survivors: survivorsPage,
  data: dataPage
};

function bindPageControls() {
  document.querySelectorAll('[data-add-record]').forEach(button => button.addEventListener('click', () => requestUpgradeDialog({
    category: button.dataset.category, item: button.dataset.item, level: button.dataset.level
  })));
  document.querySelectorAll('.level-stepper').forEach(control => {
    const input = control.querySelector('input');
    const update = value => {
      const max = Number(input.max); const level = Math.max(Number(input.min), Math.min(max, Number(value) || 0));
      input.value = level; state[control.dataset.group][control.dataset.name] = level; save();
    };
    input.addEventListener('change', () => update(input.value));
    control.querySelectorAll('button').forEach(button => button.addEventListener('click', () => update(Number(input.value) + Number(button.dataset.change))));
  });
  document.querySelectorAll('[data-hero]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.hero;
    state.ownedHeroes = state.ownedHeroes.includes(id) ? state.ownedHeroes.filter(hero=>hero!==id) : [...state.ownedHeroes,id];
    save(); renderRoute();
  }));
  document.querySelectorAll('.hero-level').forEach(input => input.addEventListener('change', () => {
    const progress = heroProgress({ id: input.dataset.id });
    progress.level = Math.max(1, Math.min(Number(input.max), Number(input.value) || 1));
    state.heroProgress[input.dataset.id] = progress; save(); renderRoute();
  }));
  document.querySelectorAll('.hero-stars').forEach(input => input.addEventListener('change', () => {
    const progress = heroProgress({ id: input.dataset.id });
    progress.starSteps = Number(input.value); state.heroProgress[input.dataset.id] = progress; save(); renderRoute();
  }));
  document.querySelectorAll('.hero-equipment').forEach(select => select.addEventListener('change', () => {
    const progress = heroProgress({ id: select.dataset.id });
    progress.equipment = { ...progress.equipment, [select.dataset.slot]: select.value };
    state.heroProgress[select.dataset.id] = progress; save();
  }));
  document.querySelectorAll('.star-section').forEach(button => button.addEventListener('click', () => {
    const steps = Number(button.dataset.step);
    if (button.dataset.starOwner === 'survivor') {
      const survivor = state.survivors.find(item => item.id === button.dataset.id);
      if (survivor) survivor.starSteps = survivor.starSteps === steps ? Math.max(0, steps - 1) : steps;
    } else {
      const progress = heroProgress({ id: button.dataset.id });
      progress.starSteps = progress.starSteps === steps ? Math.max(0, steps - 1) : steps;
      state.heroProgress[button.dataset.id] = progress;
    }
    save('Star power saved'); renderRoute();
  }));
  document.querySelectorAll('.target-level').forEach(input => input.addEventListener('change', () => {
    const value = Math.max(Number(input.min), Math.min(Number(input.max), Number(input.value) || Number(input.min)));
    state.targets[targetKey(input.dataset.category, input.dataset.item)] = value; save('Target saved'); renderRoute();
  }));
  const openSurvivorDialog = () => $('#survivorDialog').showModal();
  $('#addSurvivor')?.addEventListener('click', openSurvivorDialog);
  $('#addSurvivorEmpty')?.addEventListener('click', openSurvivorDialog);
  document.querySelectorAll('.survivor-building').forEach(select => select.addEventListener('change', () => {
    const survivor = state.survivors.find(item => item.id === select.dataset.id);
    if (survivor) { survivor.building = select.value; save('Assignment saved'); }
  }));
  document.querySelectorAll('[data-remove-survivor]').forEach(button => button.addEventListener('click', () => {
    state.survivors = state.survivors.filter(item => item.id !== button.dataset.removeSurvivor); save('Survivor removed'); renderRoute();
  }));
  document.querySelectorAll('[data-edit-record]').forEach(button => button.addEventListener('click', () => requestUpgradeDialog({ editIndex: Number(button.dataset.editRecord) })));
  document.querySelectorAll('[data-delete-record]').forEach(button => button.addEventListener('click', () => {
    state.upgradeRecords.splice(Number(button.dataset.deleteRecord), 1); save('Record deleted'); renderRoute();
  }));
  $('#exportData')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ schemaVersion: 2, updatedAt: new Date().toISOString(), records: state.upgradeRecords }, null, 2)], { type: 'application/json' });
    const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'zroute-upgrade-costs.json' }); link.click(); URL.revokeObjectURL(link.href);
  });
  $('#importData')?.addEventListener('change', async event => {
    try {
      const data = JSON.parse(await event.target.files[0].text());
      if (!Array.isArray(data.records)) throw new Error('Missing records array');
      state.upgradeRecords = data.records; save('Upgrade database imported'); renderRoute();
    } catch (error) { save(`Import failed: ${error.message}`); }
  });
  $('#objectiveForm')?.addEventListener('submit', event => {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget));
    const current = Number(values.current); const target = Number(values.target);
    $('#objectiveResult').innerHTML = target <= current ? '<b>Target already reached.</b>' : `<b>${values.item}: ${current} → ${target}</b>${planSummary(values.category, values.item.trim(), current, target)}`;
  });
  const objectiveForm = $('#objectiveForm');
  objectiveForm?.elements.category.addEventListener('change', event => populateUpgradeItemSelect(objectiveForm.elements.item, event.target.value));
}

function renderRoute() {
  const route = location.hash.slice(1).split('/')[0] || 'overview';
  const activeRoute = pages[route] ? route : 'overview';
  app.innerHTML = pages[activeRoute]();
  document.querySelectorAll('.nav-link').forEach(link => link.classList.toggle('active', link.dataset.route === activeRoute));
  $('#sidebar').classList.remove('open'); bindPageControls(); app.focus({preventScroll:true}); window.scrollTo(0,0);
}

$('#menuButton').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
$('#profileButton').addEventListener('click', () => { $('#nameInput').value = state.profile.name; $('#profileDialog').showModal(); setTimeout(()=>$('#nameInput').focus(),50); });
document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => $('#profileDialog').close()));
document.querySelectorAll('[data-close-survivor]').forEach(button => button.addEventListener('click', () => $('#survivorDialog').close()));
document.querySelectorAll('[data-close-upgrade]').forEach(button => button.addEventListener('click', () => $('#upgradeDialog').close()));
document.querySelectorAll('[data-close-readiness]').forEach(button => button.addEventListener('click', () => {
  pendingObservation = null;
  $('#observationReadinessDialog').close();
}));
$('#continueObservation').addEventListener('click', () => {
  const trigger = pendingObservation || {};
  pendingObservation = null;
  $('#observationReadinessDialog').close();
  if (trigger.editIndex !== undefined) editUpgradeRecord(trigger.editIndex); else openUpgradeDialog(trigger);
});
$('#quickUpgradeForm').elements.category.addEventListener('change', event => {
  populateUpgradeItemSelect($('#quickUpgradeForm').elements.item, event.target.value);
});
$('#quickUpgradeForm').addEventListener('input', event => {
  if (event.target.matches('input')) updateNormalizationPreview(event.currentTarget);
});
$('#quickUpgradeForm').addEventListener('submit', event => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  const resourceReduction = Number(values.resourceReduction) || 0;
  const timeReduction = Number(values.timeReduction) || 0;
  const observedResources = Object.fromEntries(resourceNames.map(name => [name, Number(values[name]) || 0]));
  const record = {
    category: values.category,
    item: values.item.trim(),
    level: Number(values.level),
    resources: Object.fromEntries(resourceNames.map(name => [name, baseFromObserved(values[name], resourceReduction)])),
    minutes: baseFromObserved(values.minutes, timeReduction),
    source: values.source.trim(),
    observation: { resources: observedResources, minutes: Number(values.minutes) || 0, resourceReduction, timeReduction, modifierNote: values.modifierNote.trim() }
  };
  const editIndex = values.editIndex === '' ? -1 : Number(values.editIndex);
  const duplicateIndex = state.upgradeRecords.findIndex((item, index) => index !== editIndex && item.category === record.category && item.item === record.item && item.level === record.level);
  const targetIndex = editIndex >= 0 ? editIndex : duplicateIndex;
  if (targetIndex >= 0) state.upgradeRecords[targetIndex] = record; else state.upgradeRecords.push(record);
  $('#upgradeDialog').close(); save(targetIndex >= 0 ? 'Observation updated' : 'Observation added'); renderRoute();
});
$('#survivorForm').addEventListener('submit', event => {
  event.preventDefault(); const name = $('#survivorName').value.trim(); if (!name) return;
  state.survivors.push({ id: `survivor-${Date.now()}`, name, rarity: $('#survivorRarity').value, benefit: $('#survivorBenefit').value.trim(), building: '', starSteps: 0 });
  event.currentTarget.reset(); $('#survivorDialog').close(); save('Survivor added'); renderRoute();
});
$('#profileForm').addEventListener('submit', event => { event.preventDefault(); const name=$('#nameInput').value.trim(); if (!name) return; state.profile.name=name; save('Profile saved'); setProfile(); $('#profileDialog').close(); });
$('#resetData').addEventListener('click', () => { if (!confirm('Reset your profile and every saved level?')) return; state=structuredClone(defaults); save('Progress reset'); setProfile(); renderRoute(); });
window.addEventListener('hashchange', renderRoute);
setProfile(); renderRoute();
if (!state.profile.name) setTimeout(() => $('#profileButton').click(), 450);
