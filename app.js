const defaultData = {
  hq: 18,
  upgrades: [
    { name: 'Headquarters', detail: 'Level 18 → 19 · Unlocks T7 units', icon: '⌂', done: false },
    { name: 'Training Grounds', detail: 'Level 16 → 17 · +4.2% troop capacity', icon: '⚔', done: false },
    { name: 'Field Hospital', detail: 'Level 15 → 16 · +8,400 wounded capacity', icon: '✚', done: false }
  ],
  research: [
    { name: 'Combat', progress: 78 }, { name: 'Development', progress: 64 }, { name: 'Economy', progress: 59 }
  ],
  heroes: [
    { name: 'Raven', role: 'ASSAULT · LV. 72', power: '248K', stars: 5 },
    { name: 'Mason', role: 'GUARDIAN · LV. 69', power: '221K', stars: 4 },
    { name: 'Vera', role: 'SUPPORT · LV. 68', power: '198K', stars: 4 }
  ]
};

let state;
try { state = { ...defaultData, ...JSON.parse(localStorage.getItem('zroute-progress') || '{}') }; }
catch { state = structuredClone(defaultData); }

const $ = (selector) => document.querySelector(selector);
const save = () => localStorage.setItem('zroute-progress', JSON.stringify(state));

function renderUpgrades() {
  $('#upgradeList').innerHTML = state.upgrades.map((item, index) => `
    <div class="upgrade ${item.done ? 'completed' : ''}">
      <div class="upgrade-icon">${item.icon}</div>
      <div><b>${item.name}</b><p>${item.detail}</p></div>
      <button data-upgrade="${index}">${item.done ? '✓ COMPLETED' : 'MARK COMPLETE'}</button>
    </div>`).join('');
  document.querySelectorAll('[data-upgrade]').forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.upgrade);
    state.upgrades[index].done = !state.upgrades[index].done;
    save(); renderUpgrades(); updateMetrics();
  }));
}

function renderResearch() {
  $('#researchList').innerHTML = state.research.map(item => `
    <div class="research-row"><header><b>${item.name}</b><span>${item.progress}%</span></header>
    <div class="track"><i style="width:${item.progress}%"></i></div></div>`).join('');
}

function renderHeroes() {
  $('#heroList').innerHTML = state.heroes.map(item => `
    <div class="hero-row"><div class="portrait">${item.name[0]}</div><div><b>${item.name}</b><p>${item.role}</p><span class="stars">${'★'.repeat(item.stars)}${'☆'.repeat(5-item.stars)}</span></div><strong>${item.power}</strong></div>`).join('');
}

function updateMetrics() {
  const level = Number(state.hq);
  const finished = state.upgrades.filter(item => item.done).length;
  const researchAverage = Math.round(state.research.reduce((sum, item) => sum + item.progress, 0) / state.research.length);
  $('#hqLevel').value = level; $('#hqOutput').value = level; $('#insightLevel').textContent = level;
  $('#nextHq').textContent = Math.min(30, level + 1);
  $('#power').textContent = `${(0.32 + level * .119 + finished * .07).toFixed(2)}M`;
  $('#heroPower').textContent = `${Math.round(360 + level * 29.1)}K`;
  $('#days').textContent = level >= 30 ? 'MAXED' : `${Math.max(1, Math.ceil((level + 5) / 6))} DAYS`;
  $('#researchPercent').textContent = `${researchAverage}%`;
  $('#researchBar').style.width = `${researchAverage}%`;
  $('#researchCount').textContent = `${Math.round(researchAverage * 12 / 100)} / 12`;
}

$('#hqLevel').addEventListener('input', event => { state.hq = Number(event.target.value); save(); updateMetrics(); });
$('#menuButton').addEventListener('click', () => $('.sidebar').classList.toggle('open'));
document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', () => {
  document.querySelectorAll('.nav-link').forEach(item => item.classList.remove('active')); link.classList.add('active'); $('.sidebar').classList.remove('open');
}));
$('#resetData').addEventListener('click', () => { state = structuredClone(defaultData); save(); renderUpgrades(); renderResearch(); renderHeroes(); updateMetrics(); });

renderUpgrades(); renderResearch(); renderHeroes(); updateMetrics();
