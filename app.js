const STORAGE_KEY = 'zroute-command-center-v2';

const buildings = [
  ['Headquarters', 'The heart of your settlement', '⌂'], ['Research Center', 'Home of personal research', '⌬'],
  ['Alliance Center', 'Supports alliance activity', '◇'], ['Barracks', 'Trains fighter units', '⚔'],
  ['Shooting Range', 'Trains ranged units', '◎'], ['Garage', 'Trains vehicle units', '▰'],
  ['Hospital', 'Treats wounded units', '✚'], ['Wall', 'Protects your settlement', '▥'],
  ['Warehouse', 'Stores protected resources', '▣'], ['Farm', 'Produces food', '♨'],
  ['Oil Field', 'Produces oil', '◉'], ['Lumberyard', 'Produces lumber', '⌁']
];

const researchBranches = {
  Development: ['Construction Speed', 'Research Speed', 'Building Capacity', 'Stamina Recovery'],
  Economy: ['Food Production', 'Oil Production', 'Lumber Production', 'Gathering Speed'],
  Combat: ['Fighter Training', 'Ranged Training', 'Vehicle Training', 'March Capacity']
};

const allianceBranches = {
  Growth: ['Alliance Member Limit', 'Alliance Help', 'Construction Support', 'Research Support'],
  Territory: ['Territory Expansion', 'Resource Protection', 'Alliance Gathering', 'Rally Capacity'],
  Combat: ['Rally Attack', 'Rally Defense', 'March Speed', 'Wounded Capacity']
};

// Hero names are sourced from the community wiki linked in the interface. No power
// formula or inferred game values are attached to them.
const heroes = ['Maddie', 'Park', 'Rex', 'Zoe', 'Liam', 'Eva', 'Mason', 'Sophia', 'Logan', 'Olivia', 'Carter', 'Nora'];

const defaults = {
  profile: { name: '' },
  buildings: Object.fromEntries(buildings.map(([name]) => [name, 1])),
  research: Object.fromEntries(Object.values(researchBranches).flat().map(name => [name, 0])),
  alliance: Object.fromEntries(Object.values(allianceBranches).flat().map(name => [name, 0])),
  ownedHeroes: []
};

let state = loadState();
const $ = selector => document.querySelector(selector);
const app = $('#app');

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      profile: { ...defaults.profile, ...saved.profile },
      buildings: { ...defaults.buildings, ...saved.buildings },
      research: { ...defaults.research, ...saved.research },
      alliance: { ...defaults.alliance, ...saved.alliance },
      ownedHeroes: Array.isArray(saved.ownedHeroes) ? saved.ownedHeroes : []
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

function overviewPage() {
  pageHeader('COMMAND CENTER', 'Overview');
  const completedBuildings = Object.values(state.buildings).filter(level => level > 1).length;
  const researchLevels = Object.values(state.research).reduce((a, b) => a + b, 0);
  return `<section class="hero-banner"><div><span class="chapter">YOUR SURVIVOR RECORD</span><h2>Plan the road<br><strong>ahead.</strong></h2><p>Record what you have. We will leave power calculations for verified game data.</p></div><div class="level-control summary"><span>HEADQUARTERS</span><strong>${state.buildings.Headquarters}</strong><small>Change this from Construction</small></div></section>
  <section class="stats-grid"><article class="stat-card"><div class="stat-icon orange">⌂</div><div><span>BUILDINGS TRACKED</span><strong>${completedBuildings} / ${buildings.length}</strong><small>Above starting level</small></div></article><article class="stat-card"><div class="stat-icon green">⌬</div><div><span>RESEARCH LEVELS</span><strong>${researchLevels}</strong><small>Across your personal research</small></div></article><article class="stat-card"><div class="stat-icon gold">♙</div><div><span>HEROES OWNED</span><strong>${state.ownedHeroes.length}</strong><small>From the community roster</small></div></article><article class="stat-card"><div class="stat-icon blue">◇</div><div><span>ALLIANCE LEVELS</span><strong>${Object.values(state.alliance).reduce((a,b)=>a+b,0)}</strong><small>Entered by you</small></div></article></section>
  <section class="quick-grid"><a class="quick-card" href="#construction"><span>01</span><h3>Construction</h3><p>Set the current level of every building.</p><b>Open tracker →</b></a><a class="quick-card" href="#research"><span>02</span><h3>Research</h3><p>Record personal technology levels by branch.</p><b>Open research →</b></a><a class="quick-card" href="#alliance"><span>03</span><h3>Alliance research</h3><p>Keep your alliance technology record nearby.</p><b>Open alliance →</b></a><a class="quick-card" href="#heroes"><span>04</span><h3>Hero roster</h3><p>Mark the heroes already in your roster.</p><b>Open heroes →</b></a></section>`;
}

function constructionPage() {
  pageHeader('SETTLEMENT', 'Construction');
  return `<section class="page-intro"><div><p class="eyebrow">BUILDING DIRECTORY</p><h2>Your settlement levels</h2><p>Record the level shown in game. No unlock, cost, time, or power values are estimated.</p></div><div class="completion-ring"><strong>${Object.values(state.buildings).filter(v=>v>1).length}</strong><span>UPDATED</span></div></section><section class="card-grid">${buildings.map(([name, description, icon]) => `<article class="tracker-card"><div class="tracker-icon">${icon}</div><div class="tracker-copy"><h3>${name}</h3><p>${description}</p></div>${levelControl('buildings', name, state.buildings[name], 30)}</article>`).join('')}</section><p class="source-note">Building names are organized as a user-editable tracker. Requirements and bonuses will only be added when they can be verified.</p>`;
}

function branchPage(type, title, subtitle, branches) {
  pageHeader(type === 'research' ? 'TECH LAB' : 'ALLIANCE', title);
  return `<section class="page-intro"><div><p class="eyebrow">LEVEL TRACKER</p><h2>${title}</h2><p>${subtitle}</p></div></section><div class="branch-layout"><aside class="branch-nav">${Object.keys(branches).map((name,i)=>`<a href="#branch-${type}-${i}"><i></i>${name}</a>`).join('')}</aside><section class="branch-content">${Object.entries(branches).map(([branch, items],i)=>`<article class="branch-panel" id="branch-${type}-${i}"><header><div><p class="eyebrow">${type === 'research' ? 'RESEARCH BRANCH' : 'ALLIANCE BRANCH'}</p><h3>${branch}</h3></div><span>${items.reduce((sum,name)=>sum+state[type][name],0)} LEVELS</span></header>${items.map(name=>`<div class="tech-row"><div><b>${name}</b><p>Enter the level shown in game</p></div>${levelControl(type,name,state[type][name],30)}</div>`).join('')}</article>`).join('')}</section></div>`;
}

function heroesPage() {
  pageHeader('FORMATION', 'Heroes');
  return `<section class="page-intro"><div><p class="eyebrow">HERO DIRECTORY</p><h2>Your hero roster</h2><p>Select heroes you own. Stats and power are intentionally omitted until verified data is available.</p></div><a class="source-link" href="https://zroute-redemption.fandom.com/wiki/Heroes" target="_blank" rel="noreferrer">View community wiki ↗</a></section><section class="hero-grid">${heroes.map((name,index)=>{const owned=state.ownedHeroes.includes(name);return `<article class="hero-card ${owned?'owned':''}"><div class="hero-portrait"><span>${String(index+1).padStart(2,'0')}</span>${name[0]}</div><div><p class="eyebrow">HERO</p><h3>${name}</h3><button data-hero="${name}">${owned?'✓ IN MY ROSTER':'+ ADD TO ROSTER'}</button></div></article>`}).join('')}</section><p class="source-note">Names are listed from the <a href="https://zroute-redemption.fandom.com/wiki/Heroes" target="_blank" rel="noreferrer">Z Route: Redemption community Heroes page</a>. This tool is not affiliated with Fandom or the game publisher.</p>`;
}

const pages = {
  overview: overviewPage,
  construction: constructionPage,
  research: () => branchPage('research', 'Research', 'Track the technology levels on your personal research screen.', researchBranches),
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
    const name = button.dataset.hero;
    state.ownedHeroes = state.ownedHeroes.includes(name) ? state.ownedHeroes.filter(hero=>hero!==name) : [...state.ownedHeroes,name];
    save(); renderRoute();
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
