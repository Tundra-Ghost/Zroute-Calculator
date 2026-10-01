const STORAGE_KEY = 'zroute-command-center-v2';

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

const defaults = {
  profile: { name: '' },
  buildings: Object.fromEntries(buildings.map(({ name }) => [name, 1])),
  research: {},
  alliance: Object.fromEntries(Object.values(allianceBranches).flat().map(name => [name, 0])),
  ownedHeroes: [],
  heroProgress: {}
};

let state = loadState();
const $ = selector => document.querySelector(selector);
const app = $('#app');

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
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
      heroProgress: saved.heroProgress && typeof saved.heroProgress === 'object' ? saved.heroProgress : {}
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

function overviewPage() {
  pageHeader('COMMAND CENTER', 'Overview');
  const completedBuildings = Object.values(state.buildings).filter(level => level > 1).length;
  return `<section class="hero-banner"><div><span class="chapter">YOUR SURVIVOR RECORD</span><h2>Plan the road<br><strong>ahead.</strong></h2><p>Record what you have. We will leave power calculations for verified game data.</p></div><div class="level-control summary"><span>HQ</span><strong>${state.buildings.HQ}</strong><small>Change this from Construction</small></div></section>
  <section class="stats-grid"><article class="stat-card"><div class="stat-icon orange">⌂</div><div><span>BUILDINGS TRACKED</span><strong>${completedBuildings} / ${buildings.length}</strong><small>Above starting level</small></div></article><article class="stat-card"><div class="stat-icon green">⌬</div><div><span>RESEARCH TREES</span><strong>${researchTrees.length}</strong><small>Ready for future tree data</small></div></article><article class="stat-card"><div class="stat-icon gold">♙</div><div><span>HEROES OWNED</span><strong>${state.ownedHeroes.length}</strong><small>From the community roster</small></div></article><article class="stat-card"><div class="stat-icon blue">◇</div><div><span>ALLIANCE LEVELS</span><strong>${Object.values(state.alliance).reduce((a,b)=>a+b,0)}</strong><small>Entered by you</small></div></article></section>
  <section class="quick-grid"><a class="quick-card" href="#construction"><span>01</span><h3>Construction</h3><p>Set the current level of every building.</p><b>Open tracker →</b></a><a class="quick-card" href="#research"><span>02</span><h3>Research</h3><p>Record personal technology levels by branch.</p><b>Open research →</b></a><a class="quick-card" href="#alliance"><span>03</span><h3>Alliance research</h3><p>Keep your alliance technology record nearby.</p><b>Open alliance →</b></a><a class="quick-card" href="#heroes"><span>04</span><h3>Hero roster</h3><p>Mark the heroes already in your roster.</p><b>Open heroes →</b></a></section>`;
}

function constructionPage() {
  pageHeader('SETTLEMENT', 'Construction');
  return `<section class="page-intro"><div><p class="eyebrow">BUILDING DIRECTORY</p><h2>Your settlement levels</h2><p>Record the level shown in game. No unlock, cost, time, or power values are estimated.</p></div><div class="completion-ring"><strong>${Object.values(state.buildings).filter(v=>v>1).length}</strong><span>UPDATED</span></div></section>${constructionGroups.map(group => `<section class="construction-group"><header><div><p class="eyebrow">CONSTRUCTION</p><h2>${group.name}</h2></div><span>${group.buildings.length} ${group.buildings.length === 1 ? 'BUILDING' : 'BUILDINGS'}</span></header><div class="card-grid">${group.buildings.map(({ name, description, icon }) => `<article class="tracker-card"><div class="tracker-icon">${icon}</div><div class="tracker-copy"><h3>${name}</h3><p>${description}</p></div>${levelControl('buildings', name, state.buildings[name], 30)}</article>`).join('')}</div></section>`).join('')}<p class="source-note">Building names and numbered slots follow the supplied construction directory. Requirements and bonuses will only be added when they can be verified.</p>`;
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
  return `<section class="page-intro"><div><p class="eyebrow">LEVEL TRACKER</p><h2>${title}</h2><p>${subtitle}</p></div></section><div class="branch-layout"><aside class="branch-nav">${Object.keys(branches).map((name,i)=>`<a href="#branch-${type}-${i}"><i></i>${name}</a>`).join('')}</aside><section class="branch-content">${Object.entries(branches).map(([branch, items],i)=>`<article class="branch-panel" id="branch-${type}-${i}"><header><div><p class="eyebrow">${type === 'research' ? 'RESEARCH BRANCH' : 'ALLIANCE BRANCH'}</p><h3>${branch}</h3></div><span>${items.reduce((sum,name)=>sum+state[type][name],0)} LEVELS</span></header>${items.map(name=>`<div class="tech-row"><div><b>${name}</b><p>Enter the level shown in game</p></div>${levelControl(type,name,state[type][name],30)}</div>`).join('')}</article>`).join('')}</section></div>`;
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
    ${owned?`<div class="hero-details"><label>HERO LEVEL <input class="hero-level" data-id="${item.id}" type="number" min="1" max="${cap}" value="${Math.min(progress.level,cap)}"><small>/ ${cap}</small></label><label>STAR POWER <input class="hero-stars" data-id="${item.id}" type="range" min="0" max="25" value="${progress.starSteps}"><b>${stars} ★</b><small>${shardsUsed(progress.starSteps)} shards invested</small></label><div class="equipment"><span>EQUIPMENT</span>${equipmentSlots.map(slot=>`<label>${slot}<select class="hero-equipment" data-id="${item.id}" data-slot="${slot}">${equipmentQualities.map(quality=>`<option ${progress.equipment[slot]===quality?'selected':''}>${quality}</option>`).join('')}</select></label>`).join('')}</div><div class="skills-placeholder"><span>4 SKILLS</span><small>Level limits coming with verified skill data</small></div></div>`:''}
  </article>`;
}

const pages = {
  overview: overviewPage,
  construction: constructionPage,
  research: researchPage,
  alliance: () => branchPage('alliance', 'Alliance research', 'Record shared technology levels exactly as they appear for your alliance.', allianceBranches),
  heroes: heroesPage
};

function bindPageControls() {
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
$('#profileForm').addEventListener('submit', event => { event.preventDefault(); const name=$('#nameInput').value.trim(); if (!name) return; state.profile.name=name; save('Profile saved'); setProfile(); $('#profileDialog').close(); });
$('#resetData').addEventListener('click', () => { if (!confirm('Reset your profile and every saved level?')) return; state=structuredClone(defaults); save('Progress reset'); setProfile(); renderRoute(); });
window.addEventListener('hashchange', renderRoute);
setProfile(); renderRoute();
if (!state.profile.name) setTimeout(() => $('#profileButton').click(), 450);
