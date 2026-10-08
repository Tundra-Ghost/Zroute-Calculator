const STORAGE_KEY = 'zroute-command-center-v3';
const LEGACY_STORAGE_KEY = 'zroute-command-center-v2';

// Game tables come from data/game-data.js, which tools/build_game_data.py
// generates from the raw exports in data/source/.
const GAME = window.ZROUTE_DATA || {
  resources: {}, vipBuildingSpeed: [], benefitTypes: {}, buildings: [], researchTrees: [], research: [],
  heroes: [], heroExp: {}, skillBooks: {}, starShards: [], starSkillLimit: [],
  producers: [], outputBenefits: {}, speedups: [], exclusiveGear: {}, gearShards: []
};

const buildingIcons = {
  HQ: '⌂', Economy: '♨', Military: '⚔', Development: '⌬', Season: '☢',
  Farm: '♨', 'Metal Smelting Plant': '◆', 'Training Ground': '⚒', 'Oil Extraction Well': '◉', Barn: '▰', 'Metal Warehouse': '▣',
  'Oil Tank': '●', Hospital: '✚', 'Alliance Center': '◇', Radar: '◉', 'Scout Drone': '⌁', 'Gear Craft Center': '⚙',
  'Alpha Research Division': 'α', 'Beta Research Department': 'β', 'Warrior Training Center': '⚔', 'Assault Training Center': '➶', 'Tactical Training Center': '⌖'
};

// Every building copy is its own slot with its own level. Multi-copy buildings
// are numbered and each copy unlocks at the HQ level the game data gives.
const constructionGroups = ['HQ', 'Economy', 'Military', 'Development', 'Season'].map(name => ({
  name,
  buildings: GAME.buildings.filter(def => def.group === name).flatMap(def => def.slots.map((unlock, slot) => ({
    name: def.slots.length > 1 ? `${def.name} ${slot + 1}` : def.name,
    description: def.slots.length > 1 ? `${def.name} · copy ${slot + 1} unlocks at HQ ${unlock}` : `${def.name}${unlock > 1 ? ` · unlocks at HQ ${unlock}` : ''}`,
    icon: buildingIcons[def.name] || buildingIcons[name], def, slot, unlock
  })))
})).filter(group => group.buildings.length);
const buildings = constructionGroups.flatMap(group => group.buildings);
const buildingSlot = name => buildings.find(item => item.name === name);
const buildingDefById = new Map(GAME.buildings.map(def => [def.id, def]));
const slotsByDefId = id => buildings.filter(item => item.def.id === id);

const slug = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const researchTrees = GAME.researchTrees.map(tree => ({ ...tree, gameId: tree.id, id: slug(tree.name) }));
const researchNodes = GAME.research;
const researchById = new Map(researchNodes.map(node => [node.id, node]));
const nodesInTree = tree => researchNodes.filter(node => node.tree === tree.gameId);

const allianceBranches = {
  Develop: ['Alliance Member Limit', 'Alliance Help', 'Construction Support', 'Research Support'],
  War: ['Rally Attack', 'Rally Defense', 'March Speed', 'Wounded Capacity'],
  Comprehensive: ['Territory Expansion', 'Resource Protection', 'Alliance Gathering', 'Rally Capacity']
};

const heroes = GAME.heroes;
const equipmentSlots = ['Rifle', 'Scope', 'Helmet', 'Bullet Proof Vest'];
const equipmentQualities = ['None', 'R / Green', 'SR / Blue', 'SSR / Purple', 'UR / Gold'];
const starShardCosts = GAME.starShards.length ? GAME.starShards : [5, 5, 5, 5, 5, 10, 10, 10, 10, 10, 20, 20, 20, 20, 20, 60, 60, 60, 60, 60, 100, 100, 100, 100, 100];
const skillSlots = [1, 2, 3];
const typeNames = { FL: 'Frontline', BL: 'Backline', S: 'Support' };
const survivorRarities = ['Other', 'SSR', 'Mythic'];
// Observation records keep their original fields. Plan totals use the wider list.
const resourceNames = ['food', 'metal', 'oil', 'shards', 'tokens'];
const planResources = ['food', 'metal', 'oil', 'uranium', 'antibody', 'researchData', 'heroExp', 'shards', 'skillBooks', 'gearShards', 'tokens'];
const resourceTitles = { ...GAME.resources, shards: 'Shards', gearShards: 'Weapon Shards', tokens: 'Tokens' };
const emptyResources = () => Object.fromEntries(planResources.map(name => [name, 0]));
const powerFields = ['heroLevel', 'heroSkill', 'heroAttributes', 'heroStars', 'gear', 'hallOfLegends', 'exclusiveWeapons', 'soldier', 'building', 'survivor', 'tech', 'fighterLevel', 'fighterComponent', 'wingman'];
const emptyPower = () => Object.fromEntries(powerFields.map(name => [name, 0]));
const bonusFields = ['vipLevel', 'buildingSpeed', 'researchSpeed'];
const emptyBonuses = () => Object.fromEntries(bonusFields.map(name => [name, 0]));
const dataCategories = ['building', 'research', 'hero-level', 'hero-star', 'hero-skill', 'hero-gear'];
const hasGear = hero => Boolean(GAME.exclusiveGear[hero.gameId]);
const gearMax = () => GAME.gearShards.length || 30;

const defaults = {
  profile: { name: '', server: 52, alliance: 'ExpeditionCorps', allianceTag: 'ExC', power: emptyPower(), bonuses: emptyBonuses() },
  buildings: Object.fromEntries(buildings.map(({ name }) => [name, 1])),
  research: {},
  alliance: Object.fromEntries(Object.values(allianceBranches).flat().map(name => [name, 0])),
  ownedHeroes: [],
  heroProgress: {},
  survivors: [],
  upgradeRecords: [],
  speedups: {},
  targets: {}
};

// Building names used before the game data was added.
const legacyBuildingNames = {
  Headquarters: 'HQ', 'Research Center Alpha': 'Alpha Research Division', 'Research Center Beta': 'Beta Research Department',
  'Gear Metal Factory': 'Gear Material Factory'
};
function migrateBuildingName(name) {
  if (legacyBuildingNames[name]) return legacyBuildingNames[name];
  return name.replace(/^Trainin Ground /, 'Training Ground ');
}

let state = loadState();
const $ = selector => document.querySelector(selector);
const app = $('#app');

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY) || '{}');
    const savedBuildings = Object.fromEntries(Object.entries(saved.buildings || {}).map(([name, level]) => [migrateBuildingName(name), level]));
    const savedOwnedHeroes = Array.isArray(saved.ownedHeroes) ? saved.ownedHeroes : [];
    const ownedHeroes = savedOwnedHeroes.map(value => heroes.find(item => item.id === value)?.id || heroes.find(item => item.name === value)?.id).filter(Boolean);
    return {
      profile: { ...defaults.profile, ...saved.profile, power: { ...emptyPower(), ...saved.profile?.power }, bonuses: { ...emptyBonuses(), ...saved.profile?.bonuses } },
      buildings: Object.fromEntries(Object.keys(defaults.buildings).map(name => [name, Math.min(buildingSlot(name).def.max, Number(savedBuildings[name] ?? defaults.buildings[name]) || 0)])),
      research: { ...defaults.research, ...saved.research },
      alliance: { ...defaults.alliance, ...saved.alliance },
      ownedHeroes: [...new Set(ownedHeroes)],
      heroProgress: saved.heroProgress && typeof saved.heroProgress === 'object' ? saved.heroProgress : {},
      survivors: Array.isArray(saved.survivors) ? saved.survivors : [],
      upgradeRecords: Array.isArray(saved.upgradeRecords) ? saved.upgradeRecords : [],
      speedups: saved.speedups && typeof saved.speedups === 'object' ? saved.speedups : {},
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

/* ---------- Game data lookups ---------- */

const sumRange = (values = [], from, to) => { let total = 0; for (let index = Math.max(0, from); index < Math.min(to, values.length); index += 1) total += values[index] || 0; return total; };
function buildingLevel(id) { return Math.max(0, ...slotsByDefId(id).map(item => Number(state.buildings[item.name]) || 0)); }
function classLevel(buildingClass) { return Math.max(0, ...GAME.buildings.filter(def => def.class === buildingClass).map(def => buildingLevel(def.id))); }
function researchLevel(id) { return Number(state.research[id]) || 0; }
function hqLevel() { return Number(state.buildings.HQ) || 0; }

// Research bonuses are stored as the running total at each level.
function researchBenefit(type) {
  return researchNodes.reduce((sum, node) => {
    const level = researchLevel(node.id); if (!level) return sum;
    const effect = node.effects.find(item => item.type === type);
    return sum + (effect?.values[level - 1] || 0);
  }, 0);
}
function speedBonuses() {
  const bonuses = state.profile.bonuses;
  const vip = GAME.vipBuildingSpeed[Number(bonuses.vipLevel) || 0] || 0;
  const researchBuilding = researchBenefit(GAME.benefitTypes.buildingSpeed) * 100;
  const researchResearch = researchBenefit(GAME.benefitTypes.researchSpeed) * 100;
  return {
    vip, researchBuilding, researchResearch,
    building: vip + researchBuilding + (Number(bonuses.buildingSpeed) || 0),
    research: researchResearch + (Number(bonuses.researchSpeed) || 0),
    buildingCost: researchBenefit(GAME.benefitTypes.buildingCost) * 100
  };
}
const speedUp = (seconds, percent) => Math.ceil(seconds / (1 + Math.max(0, percent) / 100));
const formatPercent = value => `${Math.round(value * 100) / 100}%`;

function requirementLabel(req) {
  const [kind, ref, level] = req;
  if (kind === 'b') return `${ref.map(id => buildingDefById.get(id)?.name || `Building ${id}`).join(' or ')} ${level}`;
  if (kind === 'c') return `${GAME.buildings.filter(def => def.class === ref).map(def => def.name).join(' or ') || `Building class ${ref}`} ${level}`;
  return `${researchById.get(ref)?.name || `Research ${ref}`} ${level}`;
}
function requirementMet(req) {
  const [kind, ref, level] = req;
  if (kind === 'b') return ref.some(id => buildingLevel(id) >= level);
  if (kind === 'c') return classLevel(ref) >= level;
  return researchLevel(ref) >= level;
}
function nextLevelNeeds(reqs = []) {
  const missing = reqs.filter(req => !requirementMet(req));
  return missing.length ? `<small class="req-note">Next level needs ${missing.map(req => escapeHtml(requirementLabel(req))).join(', ')}</small>` : '';
}

function heroCap() { return Math.max(5, 150 - (30 - Math.min(30, hqLevel())) * 5); }
function heroProgress(hero) {
  const progress = state.heroProgress[hero.id] || {};
  return { level: 1, starSteps: 0, equipment: {}, skills: {}, ...progress };
}
function shardsUsed(steps) { return sumRange(starShardCosts, 0, steps); }
function skillCap(steps) { return GAME.starSkillLimit[steps] || 1; }

function sumPower(names) { return names.reduce((sum, name) => sum + (Number(state.profile.power[name]) || 0), 0); }
function powerTotals() {
  const hero = sumPower(['heroLevel', 'heroSkill', 'heroAttributes', 'heroStars', 'gear', 'hallOfLegends', 'exclusiveWeapons']);
  const soldier = sumPower(['soldier']); const building = sumPower(['building', 'survivor']);
  const tech = sumPower(['tech']); const fighter = sumPower(['fighterLevel', 'fighterComponent', 'wingman']);
  return { hero, soldier, building, tech, fighter, total: hero + soldier + building + tech + fighter };
}

function targetKey(category, item) { return `${category}:${item}`; }
function targetFor(category, item, fallback) { return Number(state.targets[targetKey(category, item)] ?? fallback); }
function formatNumber(value) { return new Intl.NumberFormat().format(Math.round(value || 0)); }
function formatDuration(seconds) {
  if (!seconds) return '0m';
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const minutes = Math.ceil(seconds / 60);
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
function heroLabel(item) { return `${item.name} · ${item.rarity} ${item.heroClass}${item.promoted ? ' (promoted)' : ''}`; }
function upgradeItems(category) {
  let items = [];
  if (category === 'building') items = buildings.map(item => ({ value: item.name, label: item.name }));
  if (category === 'research') items = researchTrees.flatMap(tree => nodesInTree(tree).map(node => ({ value: String(node.id), label: `${tree.name} · ${node.name}` })));
  if (category === 'alliance') items = Object.entries(allianceBranches).flatMap(([branch, branchItems]) => branchItems.map(item => ({ value: item, label: `${branch} · ${item}` })));
  if (category === 'hero-level' || category === 'hero-star') items = heroes.map(item => ({ value: item.id, label: heroLabel(item) }));
  if (category === 'hero-gear') items = heroes.filter(hasGear).map(item => ({ value: item.id, label: `${heroLabel(item)} · Exclusive weapon` }));
  if (category === 'hero-skill') items = heroes.flatMap(item => skillSlots.map(slot => ({ value: `${item.id}|${slot}`, label: `${heroLabel(item)} · Skill ${slot}` })));
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

/* ---------- Upgrade calculator ---------- */

// Sum a level table from `current` to `target`. Index 0 holds the cost of level 1.
function tableCost(table, current, target, { speed = 0, costCut = 0 } = {}) {
  const result = { resources: emptyResources(), seconds: 0 };
  Object.entries(table.cost || {}).forEach(([name, values]) => {
    for (let index = current; index < Math.min(target, values.length); index += 1) result.resources[name] += Math.ceil(values[index] * (1 - costCut / 100));
  });
  for (let index = current; index < Math.min(target, (table.time || []).length); index += 1) result.seconds += speedUp(table.time[index], speed);
  return result;
}
function heroForItem(item) { return heroes.find(hero => hero.id === String(item).split('|')[0]); }
function dataPlan(category, item, current, target) {
  const bonus = speedBonuses();
  if (category === 'building') { const slotItem = buildingSlot(item); return slotItem && tableCost(slotItem.def, current, target, { speed: bonus.building, costCut: bonus.buildingCost }); }
  if (category === 'research') { const node = researchById.get(Number(item)); return node && tableCost(node, current, target, { speed: bonus.research }); }
  const hero = heroForItem(item); if (!hero) return null;
  const result = { resources: emptyResources(), seconds: 0 };
  if (category === 'hero-level') result.resources.heroExp = sumRange(GAME.heroExp[hero.expCurve], Math.max(1, current), target);
  if (category === 'hero-star') result.resources.shards = sumRange(starShardCosts, current, target);
  if (category === 'hero-skill') result.resources.skillBooks = sumRange(GAME.skillBooks[hero.skillCurve], Math.max(1, current), target);
  // Level L costs gearShards[L - 1] to reach L + 1. The unlock cost (0 to 1) is not in the data.
  if (category === 'hero-gear') result.resources.gearShards = sumRange(GAME.gearShards, Math.max(1, current) - 1, target - 1);
  return result;
}
function calculateUpgrade(category, item, current, target) {
  const needed = Math.max(0, target - current);
  const fromData = dataCategories.includes(category) ? dataPlan(category, item, current, target) : null;
  if (fromData) return { ...fromData, found: needed, needed, fromData: true };
  const records = state.upgradeRecords.filter(record => record.category === category && record.item === item && record.level > current && record.level <= target);
  const total = records.reduce((result, record) => {
    resourceNames.forEach(name => { result.resources[name] += Number(record.resources?.[name]) || 0; });
    result.seconds += (Number(record.minutes) || 0) * 60; return result;
  }, { resources: emptyResources(), seconds: 0 });
  const isStarPlan = category === 'survivor-star';
  if (isStarPlan) total.resources.shards += shardsUsed(target) - shardsUsed(current);
  return { ...total, found: isStarPlan ? needed : records.length, needed };
}
function planObjectives() {
  const objective = (category, item, current, max) => ({ category, item, current, target: Math.min(max, Math.max(current, targetFor(category, item, current))) });
  return [
    ...buildings.map(({ name, def }) => objective('building', name, Number(state.buildings[name]) || 0, def.max)),
    ...researchNodes.map(node => objective('research', String(node.id), researchLevel(node.id), node.max)),
    ...heroes.flatMap(item => {
      const owned = state.ownedHeroes.includes(item.id);
      const progress = heroProgress(item);
      const level = owned ? Number(progress.level) || 1 : 0;
      const stars = owned ? Number(progress.starSteps) || 0 : 0;
      return [
        objective('hero-level', item.id, level, item.maxLevel),
        objective('hero-star', item.id, stars, 25),
        ...skillSlots.map(slot => objective('hero-skill', `${item.id}|${slot}`, owned ? Number(progress.skills[slot]) || 1 : 0, GAME.skillBooks[item.skillCurve]?.length || 30)),
        ...(hasGear(item) ? [objective('hero-gear', item.id, owned ? Number(progress.gear) || 0 : 0, gearMax())] : [])
      ];
    }),
    ...Object.values(allianceBranches).flat().map(name => objective('alliance', name, Number(state.alliance[name]) || 0, 30)),
    ...state.survivors.map(raw => { const item = survivorProgress(raw); return objective('survivor-star', item.id, Number(item.starSteps) || 0, 25); })
  ].filter(item => item.target > item.current);
}
function grandUpgradePlan() {
  return planObjectives().reduce((grand, objective) => {
    const plan = calculateUpgrade(objective.category, objective.item, objective.current, objective.target);
    planResources.forEach(name => { grand.resources[name] += plan.resources[name]; });
    grand.seconds += plan.seconds; grand.found += plan.found; grand.needed += plan.needed; grand.goals += 1;
    if (objective.category === 'building') grand.buildSeconds += plan.seconds;
    if (objective.category === 'research') grand.researchSeconds += plan.seconds;
    return grand;
  }, { resources: emptyResources(), seconds: 0, buildSeconds: 0, researchSeconds: 0, found: 0, needed: 0, goals: 0 });
}
function shownResources(resources, always = ['food', 'metal', 'oil']) {
  return planResources.filter(name => always.includes(name) || resources[name]);
}
function maxOutPlan() {
  const objectives = [
    ...buildings.map(({ name, def }) => ({ category: 'building', item: name, current: Number(state.buildings[name]) || 0, target: def.max })),
    ...researchNodes.map(node => ({ category: 'research', item: String(node.id), current: researchLevel(node.id), target: node.max }))
  ].filter(item => item.target > item.current);
  return objectives.reduce((sum, objective) => {
    const plan = calculateUpgrade(objective.category, objective.item, objective.current, objective.target);
    planResources.forEach(name => { sum.resources[name] += plan.resources[name]; });
    sum.seconds += plan.seconds; sum.steps += plan.needed;
    return sum;
  }, { resources: emptyResources(), seconds: 0, steps: 0 });
}
function totalValues(plan) {
  return `<div class="grand-plan-values">${shownResources(plan.resources).map(name => `<article><span>${resourceTitles[name].toUpperCase()}</span><strong>${formatNumber(plan.resources[name])}</strong></article>`).join('')}<article class="grand-plan-time"><span>TOTAL TIME</span><strong>${formatDuration(plan.seconds)}</strong></article></div>`;
}
function grandPlanMarkup() {
  const plan = grandUpgradePlan();
  const incomplete = plan.found !== plan.needed;
  const note = !plan.goals ? 'No targets set yet. Set a target on any building, research node, or hero and it is added here.'
    : `${formatNumber(plan.goals)} targets set. ${incomplete ? `⚠ ${formatNumber(plan.needed - plan.found)} alliance or survivor steps still need recorded costs.` : 'Every step has cost data.'}`;
  const max = maxOutPlan();
  return `<section class="grand-plan ${incomplete ? 'incomplete' : ''}"><header><div><p class="eyebrow">YOUR TARGETS</p><h2>Planned upgrades</h2></div><a class="button secondary" href="#planner">Open goal planner</a></header>${totalValues(plan)}<p>${note}</p></section>
  <section class="grand-plan max-plan"><header><div><p class="eyebrow">FROM YOUR CURRENT LEVELS</p><h2>Everything to max</h2></div><span class="pill">${formatNumber(max.steps)} LEVELS LEFT</span></header>${totalValues(max)}<p>Every building copy and research node from its saved level to max. Change any level and this updates. Times include your speed bonuses but not speedup items.</p></section>`;
}
function resourceLabel(name, category, item) {
  if (name !== 'shards') return resourceTitles[name].toUpperCase();
  const rarity = category === 'hero-star' ? heroForItem(item)?.rarity : state.survivors.find(person => person.id === item)?.rarity;
  return `${rarity || ''} SHARDS`.trim();
}
function costChips(plan, category, item) {
  return shownResources(plan.resources, []).map(name => `<span><b>${formatNumber(plan.resources[name])}</b> ${resourceLabel(name, category, item)}</span>`).join('') + (plan.seconds ? `<span><b>${formatDuration(plan.seconds)}</b> TIME</span>` : '');
}
function planSummary(category, item, current, target, max = target) {
  if (target <= current) {
    if (current >= max) return '<small class="plan-ready">MAX LEVEL</small>';
    if (!dataCategories.includes(category)) return '<small class="plan-ready">SET A TARGET TO PLAN</small>';
    const next = calculateUpgrade(category, item, current, current + 1);
    return `<div class="upgrade-analytics next-level"><strong>NEXT LEVEL</strong>${costChips(next, category, item) || '<span>No cost</span>'}</div>`;
  }
  const plan = calculateUpgrade(category, item, current, target);
  const incomplete = !plan.needed || plan.found !== plan.needed;
  const missingLevel = firstMissingLevel(category, item, current, target);
  return `<div class="upgrade-analytics ${incomplete ? 'incomplete' : ''}"><strong>YOU NEED</strong>${costChips(plan, category, item) || '<span>No cost</span>'}${incomplete ? `<small>⚠ Unknown values default to 0 until all data for this field is complete (${plan.found}/${plan.needed}). <button type="button" class="missing-data-button" data-add-record data-category="${category}" data-item="${escapeHtml(item)}" data-level="${missingLevel}">Fill level ${missingLevel}</button></small>` : ''}</div>`;
}
function targetControl(category, item, current, max = 30, label = 'TARGET') {
  const target = Math.max(current, Math.min(max, targetFor(category, item, current)));
  return `<div class="target-plan"><label>${label}<input class="target-level" data-category="${category}" data-item="${escapeHtml(item)}" type="number" min="${current}" max="${max}" value="${target}"></label>${planSummary(category, item, current, target, max)}</div>`;
}
function starPicker(id, steps, ownerType = 'hero') {
  return `<div class="star-picker" role="group" aria-label="Star power: ${(steps / 5).toFixed(1)} of 5 stars">${Array.from({length: 5}, (_, star) => `<div class="progress-star" role="group" aria-label="Star ${star + 1}">${Array.from({length: 5}, (_, section) => { const step = star * 5 + section + 1; const filled = step <= steps; return `<button class="star-section ${filled ? 'filled' : ''}" data-star-owner="${ownerType}" data-id="${id}" data-step="${step}" aria-label="Set star power to ${(step / 5).toFixed(1)}" aria-pressed="${filled}"></button>`; }).join('')}</div>`).join('')}</div>`;
}

/* ---------- Goal planner: a target plus every prerequisite it needs ---------- */

function planGoal(kind, id, level) {
  const need = new Map();
  const currentOf = key => key.startsWith('b:') ? buildingLevel(Number(key.slice(2))) : researchLevel(Number(key.slice(2)));
  const plannedOf = key => Math.max(currentOf(key), need.get(key) || 0);
  const satisfied = req => {
    const [type, ref, min] = req;
    if (type === 'b') return ref.some(buildingId => plannedOf(`b:${buildingId}`) >= min);
    if (type === 'c') return GAME.buildings.some(def => def.class === ref && plannedOf(`b:${def.id}`) >= min);
    return plannedOf(`r:${ref}`) >= min;
  };
  const require = (key, target) => {
    const table = key.startsWith('b:') ? buildingDefById.get(Number(key.slice(2))) : researchById.get(Number(key.slice(2)));
    if (!table) return;
    const from = plannedOf(key); const to = Math.min(target, table.max);
    if (to <= from) return;
    need.set(key, to);
    for (let next = from + 1; next <= to; next += 1) {
      (table.req[next - 1] || []).forEach(req => {
        if (satisfied(req)) return;
        const [type, ref, min] = req;
        if (type === 'b') require(`b:${ref[0]}`, min);
        else if (type === 'c') { const def = GAME.buildings.filter(item => item.class === ref).sort((a, b) => buildingLevel(b.id) - buildingLevel(a.id))[0]; if (def) require(`b:${def.id}`, min); }
        else require(`r:${ref}`, min);
      });
    }
  };
  require(`${kind}:${id}`, level);
  const bonus = speedBonuses();
  const steps = [...need.entries()].map(([key, target]) => {
    const isBuilding = key.startsWith('b:');
    const table = isBuilding ? buildingDefById.get(Number(key.slice(2))) : researchById.get(Number(key.slice(2)));
    const current = currentOf(key);
    const cost = tableCost(table, current, target, isBuilding ? { speed: bonus.building, costCut: bonus.buildingCost } : { speed: bonus.research });
    return { key, isBuilding, name: table.name, current, target, ...cost };
  }).sort((a, b) => (b.isBuilding - a.isBuilding) || a.name.localeCompare(b.name));
  const total = steps.reduce((sum, step) => { planResources.forEach(name => { sum.resources[name] += step.resources[name]; }); sum.seconds += step.seconds; return sum; }, { resources: emptyResources(), seconds: 0 });
  return { steps, total };
}

/* ---------- Production and speedups ---------- */

function producerFor(def) { return GAME.producers.find(item => item.building === def.id); }
function outputBonus(output) { const type = GAME.outputBenefits[output]; return type ? researchBenefit(type) : 0; }
function slotOutput(item) {
  const producer = producerFor(item.def); const level = Number(state.buildings[item.name]) || 0;
  if (!producer || !level) return null;
  return { output: producer.output, perHour: (producer.perHour[level - 1] || 0) * (1 + outputBonus(producer.output)) };
}
function hourlyProduction() {
  const totals = {};
  buildings.forEach(item => { const out = slotOutput(item); if (out) totals[out.output] = (totals[out.output] || 0) + out.perHour; });
  return totals;
}
const speedupCategories = { build: 'Build', research: 'Research', general: 'General', train: 'Training', cure: 'Healing' };
function speedupMinutes(category) {
  return GAME.speedups.filter(item => item.category === category).reduce((sum, item) => sum + (Number(state.speedups[item.name]) || 0) * item.minutes, 0);
}
// Category speedups go first. General speedups cover whatever is left, building time before research time.
function speedupCoverage(plan) {
  let general = speedupMinutes('general') * 60;
  const cover = (seconds, own) => { const afterOwn = Math.max(0, seconds - own); const used = Math.min(general, afterOwn); general -= used; return afterOwn - used; };
  const buildLeft = cover(plan.buildSeconds, speedupMinutes('build') * 60);
  const researchLeft = cover(plan.researchSeconds, speedupMinutes('research') * 60);
  return { buildLeft, researchLeft, generalLeft: general };
}
function resourcesPage() {
  pageHeader('ECONOMY', 'Resources');
  const production = hourlyProduction();
  const plan = grandUpgradePlan();
  const coverage = speedupCoverage(plan);
  const keyFor = { Food: 'food', Metal: 'metal', Oil: 'oil', 'Hero EXP': 'heroExp' };
  const rows = Object.entries(production).map(([output, perHour]) => {
    const need = keyFor[output] ? plan.resources[keyFor[output]] : 0;
    const bonus = outputBonus(output);
    return `<article><span>${escapeHtml(output.toUpperCase())}</span><strong>${formatNumber(perHour)}<small>/hr</small></strong><small>${formatNumber(perHour * 24)} per day${bonus ? ` · includes +${formatPercent(bonus * 100)} research` : ''}</small>${need ? `<small>Planned targets need ${formatNumber(need)}: about ${formatDuration(need / perHour * 3600)} of production</small>` : ''}</article>`;
  }).join('');
  const groups = Object.entries(speedupCategories).map(([category, label]) => `<fieldset><legend>${label.toUpperCase()} · ${formatDuration(speedupMinutes(category) * 60)}</legend>${GAME.speedups.filter(item => item.category === category).map(item => `<label>${escapeHtml(item.name.replace(/ (Build|Heal|Research|Training) Speedup| Speedup/, ''))}<input type="number" min="0" name="${escapeHtml(item.name)}" value="${Number(state.speedups[item.name]) || 0}"></label>`).join('')}</fieldset>`).join('');
  return `<section class="page-intro"><div><p class="eyebrow">RESOURCES</p><h2>Production and speedups</h2><p>Hourly output comes from your saved building levels and output research. Enter your speedup items to see how much of your planned time they cover.</p></div></section>
    <section class="grand-plan"><header><div><p class="eyebrow">FROM YOUR BUILDINGS</p><h2>Hourly production</h2></div><a class="button secondary" href="#construction">Update buildings</a></header>${rows ? `<div class="production-values">${rows}</div>` : '<p>Set your Farm, Metal Smelting Plant, Oil Extraction Well, or Training Ground levels to see production.</p>'}<p>Base output only. VIP, events, and survivors are not included.</p></section>
    <section class="grand-plan max-plan"><header><div><p class="eyebrow">AGAINST YOUR TARGETS</p><h2>Speedup coverage</h2></div></header><div class="grand-plan-values">
      <article><span>PLANNED BUILD TIME</span><strong>${formatDuration(plan.buildSeconds)}</strong></article>
      <article><span>BUILD TIME LEFT</span><strong>${formatDuration(coverage.buildLeft)}</strong></article>
      <article><span>PLANNED RESEARCH TIME</span><strong>${formatDuration(plan.researchSeconds)}</strong></article>
      <article><span>RESEARCH TIME LEFT</span><strong>${formatDuration(coverage.researchLeft)}</strong></article>
      <article><span>GENERAL SPEEDUPS SPARE</span><strong>${formatDuration(coverage.generalLeft)}</strong></article>
    </div><p>Build and research speedups go first. General speedups then cover building time, then research time.</p></section>
    <form id="speedupForm" class="speedup-form power-fields">${groups}</form>`;
}

function plannerPage() {
  pageHeader('PLANNING', 'Goal planner');
  const buildingOptions = GAME.buildings.map(def => `<option value="b:${def.id}">${escapeHtml(def.name)}</option>`).join('');
  const researchOptions = researchTrees.map(tree => `<optgroup label="${escapeHtml(tree.name)}">${nodesInTree(tree).map(node => `<option value="r:${node.id}">${escapeHtml(node.name)}</option>`).join('')}</optgroup>`).join('');
  return `<section class="page-intro"><div><p class="eyebrow">GOAL PLANNER</p><h2>What does it take?</h2><p>Pick a building or research and a level. The planner adds every prerequisite you are still missing, based on your saved levels.</p></div></section>
    ${bonusPanel()}
    <section class="objective-calculator"><div><p class="eyebrow">CHOOSE A GOAL</p><h2>Goal</h2><p>Multi-copy buildings use your highest copy.</p></div><form id="goalForm"><label>GOAL<select name="goal"><optgroup label="Buildings">${buildingOptions}</optgroup>${researchOptions}</select></label><label>TARGET LEVEL<input name="level" type="number" min="1" max="30" value="${Math.min(30, hqLevel() + 1)}" required></label><button class="button primary" type="submit">Plan goal</button></form><div id="goalResult" class="objective-result">Choose a goal to see every upgrade it needs.</div></section>`;
}
function goalResultMarkup(kind, id, level) {
  const { steps, total } = planGoal(kind, id, level);
  if (!steps.length) return '<b>Goal already reached.</b>';
  return `<div class="upgrade-analytics"><strong>TOTAL</strong>${costChips(total)}</div>
    <div class="goal-steps">${steps.map(step => `<article><span>${step.isBuilding ? 'BUILDING' : 'RESEARCH'}</span><b>${escapeHtml(step.name)} ${step.current} → ${step.target}</b><small>${shownResources(step.resources, []).map(name => `${formatNumber(step.resources[name])} ${resourceTitles[name]}`).join(' · ') || 'No resources'} · ${formatDuration(step.seconds)}</small></article>`).join('')}</div>
    <small>${steps.length} upgrades. Requirements tied to events or season days are not included.</small>`;
}

function bonusPanel() {
  const bonus = speedBonuses(); const values = state.profile.bonuses;
  return `<section class="bonus-panel"><header><div><p class="eyebrow">SPEED BONUSES</p><h2>Time modifiers</h2></div><small>Research bonuses update from your saved research levels.</small></header><form id="bonusForm" class="bonus-fields">
    <label>VIP LEVEL<input name="vipLevel" type="number" min="0" max="${Math.max(0, GAME.vipBuildingSpeed.length - 1)}" value="${Number(values.vipLevel) || 0}"></label>
    <label>OTHER BUILDING SPEED %<input name="buildingSpeed" type="number" min="0" step="0.1" value="${Number(values.buildingSpeed) || 0}"></label>
    <label>OTHER RESEARCH SPEED %<input name="researchSpeed" type="number" min="0" step="0.1" value="${Number(values.researchSpeed) || 0}"></label>
  </form><p>Building speed <b>${formatPercent(bonus.building)}</b> (VIP ${formatPercent(bonus.vip)} + research ${formatPercent(bonus.researchBuilding)}) · Research speed <b>${formatPercent(bonus.research)}</b> · Building cost cut <b>${formatPercent(bonus.buildingCost)}</b></p></section>`;
}

/* ---------- Pages ---------- */

function overviewPage() {
  pageHeader('COMMAND CENTER', 'Overview');
  const builtSlots = buildings.filter(item => (state.buildings[item.name] || 0) > 0).length;
  const researchDone = researchNodes.reduce((sum, node) => sum + researchLevel(node.id), 0);
  const power = powerTotals();
  return `<section class="hero-banner"><div><span class="chapter">SERVER 52 · EXPEDITIONCORPS [EXC]</span><h2>Plan the road<br><strong>ahead.</strong></h2><p>Record progress, power, and exact requirements from one local profile.</p></div><div class="level-control summary"><span>TOTAL POWER</span><strong>${formatNumber(power.total)}</strong><small>Unknown values currently count as 0</small></div></section>
  ${grandPlanMarkup()}
  <section class="power-summary"><header><div><p class="eyebrow">COMMANDER ANALYTICS</p><h2>Power level</h2></div><button class="button secondary" data-edit-profile>Edit power data</button></header><div>${Object.entries({Hero:power.hero,Soldier:power.soldier,Building:power.building,Tech:power.tech,Fighter:power.fighter}).map(([name,value])=>`<article><span>${name.toUpperCase()} POWER</span><strong>${formatNumber(value)}</strong></article>`).join('')}</div><p>⚠ Unknown power values default to 0 until all data for each field has been completed.</p></section>
  <section class="stats-grid"><article class="stat-card"><div class="stat-icon orange">⌂</div><div><span>BUILDINGS BUILT</span><strong>${builtSlots} / ${buildings.length}</strong><small>HQ level ${hqLevel()}</small></div></article><article class="stat-card"><div class="stat-icon green">⌬</div><div><span>RESEARCH LEVELS</span><strong>${formatNumber(researchDone)}</strong><small>Across ${researchTrees.length} trees</small></div></article><article class="stat-card"><div class="stat-icon gold">♙</div><div><span>HEROES OWNED</span><strong>${state.ownedHeroes.length} / ${heroes.length}</strong><small>From the game roster</small></div></article><article class="stat-card"><div class="stat-icon blue">◇</div><div><span>ALLIANCE LEVELS</span><strong>${Object.values(state.alliance).reduce((a,b)=>a+b,0)}</strong><small>Entered by you</small></div></article></section>
  <section class="quick-grid"><a class="quick-card" href="#construction"><span>01</span><h3>Construction</h3><p>Set building levels and see the cost of every upgrade.</p><b>Open tracker →</b></a><a class="quick-card" href="#research"><span>02</span><h3>Research</h3><p>Track every research node and its cost.</p><b>Open research →</b></a><a class="quick-card" href="#planner"><span>03</span><h3>Goal planner</h3><p>See everything an HQ or research goal needs.</p><b>Open planner →</b></a><a class="quick-card" href="#heroes"><span>04</span><h3>Hero roster</h3><p>Plan EXP, shards, and skill books.</p><b>Open heroes →</b></a><a class="quick-card" href="#survivors"><span>05</span><h3>Survivors</h3><p>Assign specialists and plan their stars.</p><b>Open survivors →</b></a></section>`;
}

function filterPage() {
  pageHeader('DIRECTORY TOOLS', 'Filter');
  return `<section class="page-intro"><div><p class="eyebrow">FILTER TAB</p><h2>Find tracked items</h2><p>Search and narrow your local directory across buildings, heroes, survivors, research, and alliance research.</p></div></section>
  <section class="filter-panel"><div class="filter-controls"><label>SEARCH<input id="filterSearch" type="search" placeholder="Search by name"></label><label>CATEGORY<select id="filterCategory"><option value="all">All categories</option><option value="Building">Buildings</option><option value="Hero">Heroes</option><option value="Survivor">Survivors</option><option value="Research">Research</option><option value="Alliance">Alliance research</option></select></label><label>STATUS<select id="filterStatus"><option value="all">Any status</option><option value="owned">Owned / active</option><option value="unowned">Not owned</option></select></label></div><p id="filterCount" class="filter-count"></p><div id="filterResults" class="filter-results"></div></section>`;
}

function filterItems() {
  return [
    ...buildings.map(item => ({ category: 'Building', name: item.name, detail: `Level ${state.buildings[item.name]} / ${item.def.max}`, active: state.buildings[item.name] > 0, href: '#construction' })),
    ...heroes.map(item => ({ category: 'Hero', name: item.name, detail: `${item.rarity} · ${item.heroClass}`, active: state.ownedHeroes.includes(item.id), href: '#heroes' })),
    ...state.survivors.map(item => ({ category: 'Survivor', name: item.name, detail: `${item.rarity} · ${item.building || 'Unassigned'}`, active: true, href: '#survivors' })),
    ...researchTrees.flatMap(tree => nodesInTree(tree).map(node => ({ category: 'Research', name: node.name, detail: `${tree.name} · Level ${researchLevel(node.id)} / ${node.max}`, active: researchLevel(node.id) > 0, href: `#research/${tree.id}` }))),
    ...Object.entries(allianceBranches).flatMap(([branch, items]) => items.map(name => ({ category: 'Alliance', name, detail: `${branch} · Level ${state.alliance[name] || 0}`, active: (state.alliance[name] || 0) > 0, href: '#alliance' })))
  ];
}

const ui = { buildingSearch: '', hideLocked: false, collapsed: new Set(), selectedNode: {} };
function isLocked(item) { return item.name !== 'HQ' && hqLevel() < item.unlock; }
function buildingCard(item) {
  const { name, description, icon, def } = item;
  const level = Number(state.buildings[name]) || 0;
  const locked = isLocked(item);
  return `<article class="tracker-card ${locked ? 'locked' : ''}" data-search="${escapeHtml(name.toLowerCase())}"><div class="tracker-icon">${icon}</div><div class="tracker-copy"><h3>${escapeHtml(name)}${locked ? ' <small class="lock-tag">LOCKED</small>' : ''}</h3><p>${escapeHtml(description)} · max ${def.max}</p>${(() => { const out = slotOutput(item); return out ? `<p class="output-note">Produces ${formatNumber(out.perHour)} ${escapeHtml(out.output)}/hr</p>` : ''; })()}${level < def.max ? nextLevelNeeds(def.req[level]) : ''}</div>${levelControl('buildings', name, level, def.max)}${def.max > 1 ? targetControl('building', name, level, def.max) : planSummary('building', name, level, level, def.max)}</article>`;
}
function constructionPage() {
  pageHeader('SETTLEMENT', 'Construction');
  return `<section class="page-intro"><div><p class="eyebrow">BUILDING DIRECTORY</p><h2>Your settlement levels</h2><p>Set each building to the level shown in game. Each card shows the next level cost, or the total to your target.</p></div><div class="completion-ring"><strong>HQ ${hqLevel()}</strong><span>${buildings.filter(item => !isLocked(item)).length} / ${buildings.length} UNLOCKED</span></div></section>
  ${bonusPanel()}
  <section class="toolbar"><label>SEARCH<input id="buildingSearch" type="search" placeholder="Find a building" value="${escapeHtml(ui.buildingSearch)}"></label><label class="check"><input id="hideLocked" type="checkbox" ${ui.hideLocked ? 'checked' : ''}> Hide buildings your HQ has not unlocked</label></section>
  ${constructionGroups.map(group => { const levels = group.buildings.reduce((sum, item) => sum + (Number(state.buildings[item.name]) || 0), 0); const max = group.buildings.reduce((sum, item) => sum + item.def.max, 0); return `<details class="construction-group" data-group="${group.name}" ${ui.collapsed.has(group.name) ? '' : 'open'}><summary><div><p class="eyebrow">CONSTRUCTION</p><h2>${group.name}</h2></div><span>${group.buildings.length} ${group.buildings.length === 1 ? 'BUILDING' : 'BUILDINGS'} · ${levels} / ${max} LEVELS</span><span class="group-actions"><button type="button" class="button secondary" data-group-target="max" data-group-name="${group.name}">Target max</button><button type="button" class="button secondary" data-group-target="clear" data-group-name="${group.name}">Clear targets</button></span></summary><div class="card-grid">${group.buildings.map(buildingCard).join('')}</div></details>`; }).join('')}
  <p class="source-note">Times include the speed bonuses above. Resource costs include the research building cost cut. Flat cost reductions and event bonuses are not applied.</p>`;
}

function formatEffect(value) { return value > 0 && value < 1 ? `${Math.round(value * 10000) / 100}%` : formatNumber(value); }
function nodeStatus(node) {
  const level = researchLevel(node.id);
  if (level >= node.max) return 'maxed';
  if (level > 0) return 'progress';
  return (node.req[0] || []).every(requirementMet) ? 'available' : 'locked';
}
// Rows follow prerequisite depth. Each row holds up to three nodes, ordered under their parents.
function treeLayout(nodes) {
  const rows = []; const column = new Map();
  nodes.forEach(node => { (rows[node.tier] ||= []).push(node); });
  const slots = { 1: [1], 2: [0, 2], 3: [0, 1, 2] };
  rows.forEach(row => {
    const anchor = node => { const cols = node.parents.map(id => column.get(id)).filter(value => value !== undefined); return cols.length ? cols.reduce((a, b) => a + b, 0) / cols.length : 1; };
    row.sort((a, b) => anchor(a) - anchor(b) || a.id - b.id);
    const places = slots[row.length] || row.map((_, index) => index * 2 / Math.max(1, row.length - 1));
    row.forEach((node, index) => column.set(node.id, places[index]));
  });
  return { rows, column };
}
function researchTreeMarkup(tree, selected) {
  const nodes = nodesInTree(tree);
  const { rows, column } = treeLayout(nodes);
  const rowHeight = 118; const tileHeight = 88; const height = rows.length * rowHeight;
  const x = id => (column.get(id) * 2 + 1) * 100;
  const y = node => node.tier * rowHeight + rowHeight / 2;
  const lines = nodes.flatMap(node => node.parents.map(id => { const parent = researchById.get(id); return `<line class="${researchLevel(id) > 0 ? 'done' : ''}" x1="${x(id)}" y1="${y(parent) + tileHeight / 2}" x2="${x(node.id)}" y2="${y(node) - tileHeight / 2}" vector-effect="non-scaling-stroke"/>`; })).join('');
  const tiles = nodes.map(node => { const level = researchLevel(node.id); return `<button type="button" class="tree-node ${nodeStatus(node)} ${selected?.id === node.id ? 'selected' : ''}" data-node="${node.id}" style="left:${x(node.id) / 6}%;top:${y(node) - tileHeight / 2}px;height:${tileHeight}px"><b>${escapeHtml(node.name)}</b><small>LV ${level} / ${node.max}</small><i style="--fill:${level / node.max * 100}%"></i></button>`; }).join('');
  return `<div class="research-tree" style="height:${height}px"><svg viewBox="0 0 600 ${height}" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>${tiles}</div>`;
}
function researchDetail(node) {
  const level = researchLevel(node.id);
  const reqs = node.req[Math.min(level, node.max - 1)] || [];
  const effects = node.effects.map(effect => `<li><b>${escapeHtml(effect.name)}</b><span>${level ? formatEffect(effect.values[level - 1]) : '0'}${level < node.max ? ` → ${formatEffect(effect.values[level])}` : ''} · max ${formatEffect(effect.values[node.max - 1])}</span></li>`).join('');
  return `<aside class="node-detail" id="nodeDetail"><p class="eyebrow">RESEARCH NODE</p><h2>${escapeHtml(node.name)}</h2>
    <div class="node-level">${levelControl('research', node.id, level, node.max)}<small>${level >= node.max ? 'Maxed' : `Level ${level} of ${node.max}`}</small></div>
    ${effects ? `<ul class="node-effects">${effects}</ul>` : ''}
    ${level < node.max ? `<p class="eyebrow">NEXT LEVEL NEEDS</p><ul class="node-reqs">${reqs.length ? reqs.map(req => `<li class="${requirementMet(req) ? 'met' : ''}">${requirementMet(req) ? '✓' : '✗'} ${escapeHtml(requirementLabel(req))}</li>`).join('') : '<li class="met">✓ Nothing</li>'}</ul>` : ''}
    ${targetControl('research', String(node.id), level, node.max)}</aside>`;
}
function researchPage() {
  pageHeader('TECH LAB', 'Research');
  const selectedId = location.hash.split('/')[1];
  const selectedTree = researchTrees.find(tree => tree.id === selectedId);

  if (selectedTree) {
    const nodes = nodesInTree(selectedTree);
    const done = nodes.reduce((sum, node) => sum + researchLevel(node.id), 0);
    const total = nodes.reduce((sum, node) => sum + node.max, 0);
    const selected = researchById.get(ui.selectedNode[selectedTree.gameId]) || nodes.find(node => nodeStatus(node) === 'available' || nodeStatus(node) === 'progress') || nodes[0];
    return `<div class="tree-head"><a class="source-link" href="#research">← All trees</a><div><p class="eyebrow">RESEARCH TREE</p><h2>${escapeHtml(selectedTree.name)}</h2>${nextLevelNeeds(selectedTree.req)}</div><div class="completion-ring"><strong>${done} / ${total}</strong><span>LEVELS</span></div></div>
      <div class="tree-legend"><span class="maxed">Maxed</span><span class="progress">In progress</span><span class="available">Ready to start</span><span class="locked">Locked</span><small>Tap a node to set its level and target.</small></div>
      <div class="tree-layout">${researchTreeMarkup(selectedTree, selected)}${researchDetail(selected)}</div>`;
  }

  return `<section class="page-intro research-intro"><div><p class="eyebrow">RESEARCH DIRECTORY</p><h2>Choose a research tree</h2><p>Each tree is laid out from the game data. Open one to set levels node by node.</p></div><div class="completion-ring"><strong>${researchTrees.length}</strong><span>RESEARCH TREES</span></div></section>
    ${bonusPanel()}
    <section class="research-directory" aria-labelledby="research-directory-title">
      <header><div><p class="eyebrow">TECH LAB</p><h2 id="research-directory-title">Research categories</h2></div><span>SELECT A TREE TO OPEN</span></header>
      <div class="research-tree-grid">${researchTrees.map((tree, index) => { const nodes = nodesInTree(tree); const done = nodes.reduce((sum, node) => sum + researchLevel(node.id), 0); const total = nodes.reduce((sum, node) => sum + node.max, 0); return `<a class="research-tree-card" href="#research/${tree.id}" aria-label="Open ${escapeHtml(tree.name)} research tree"><div class="research-tree-image" aria-hidden="true"><span>⌬</span><small>${Math.round(done / total * 100)}%</small></div><div><span>${String(index + 1).padStart(2, '0')}</span><h3>${escapeHtml(tree.name)}</h3><small>${nodes.length} NODES · ${done}/${total} LEVELS →</small>${tree.req.some(req => !requirementMet(req)) ? `<small class="req-note">Needs ${escapeHtml(tree.req.filter(req => !requirementMet(req)).map(requirementLabel).join(', '))}</small>` : ''}</div></a>`; }).join('')}</div>
    </section>`;
}

function branchPage(type, title, subtitle, branches) {
  pageHeader(type === 'research' ? 'TECH LAB' : 'ALLIANCE', title);
  return `<section class="page-intro"><div><p class="eyebrow">LEVEL TRACKER</p><h2>${title}</h2><p>${subtitle}</p></div></section><div class="branch-layout"><aside class="branch-nav">${Object.keys(branches).map((name,i)=>`<a href="#branch-${type}-${i}"><i></i>${name}</a>`).join('')}</aside><section class="branch-content">${Object.entries(branches).map(([branch, items],i)=>`<article class="branch-panel" id="branch-${type}-${i}"><header><div><p class="eyebrow">${type === 'research' ? 'RESEARCH BRANCH' : 'ALLIANCE BRANCH'}</p><h3>${branch}</h3></div><span>${items.reduce((sum,name)=>sum+state[type][name],0)} LEVELS</span></header>${items.map(name=>`<div class="tech-row"><div><b>${name}</b><p>Enter the level shown in game</p></div>${levelControl(type,name,state[type][name],30)}${targetControl(type,name,state[type][name],30)}</div>`).join('')}</article>`).join('')}</section></div>`;
}

function heroesPage() {
  pageHeader('FORMATION', 'Heroes');
  const cap = heroCap();
  return `<section class="page-intro hero-intro"><div><p class="eyebrow">HERO DIRECTORY</p><h2>Your hero roster</h2><p>Track ownership, levels, star power, skills, and equipment. Your HQ ${hqLevel()} hero level cap is ${cap}.</p></div><div class="hero-cap"><span>HERO LEVEL CAP</span><strong>${cap}</strong><small>HQ 30 max · −5 per HQ level</small></div></section>
  <div class="hero-legend"><span><i class="rarity SR">SR</i> Rare</span><span><i class="rarity SSR">SSR</i> Super rare</span><span><i class="rarity UR">UR</i> Ultimate rare</span><span>FL · Frontline</span><span>BL · Backline</span><span>S · Support</span></div>
  ${['Warrior','Assault','Tactical'].map(heroClass => `<section class="hero-class"><header><div><p class="eyebrow">HERO CLASS</p><h2>${heroClass}</h2></div><span>${heroes.filter(item=>item.heroClass===heroClass).length} HEROES</span></header><div class="hero-grid">${heroes.filter(item=>item.heroClass===heroClass).map((item,index)=>heroCard(item,index,cap)).join('')}</div></section>`).join('')}
  <p class="source-note">Hero EXP, star shards (5 / 10 / 20 / 60 / 100 per subsection, 975 total), and skill books come from the game data. Skill level caps rise with stars.</p>`;
}

function heroCard(item, index, cap) {
  const owned = state.ownedHeroes.includes(item.id);
  const progress = heroProgress(item);
  const stars = (progress.starSteps / 5).toFixed(1).replace('.0', '');
  const limit = skillCap(progress.starSteps);
  const skillMax = GAME.skillBooks[item.skillCurve]?.length || 30;
  const skills = skillSlots.map(slot => {
    const level = Math.min(limit, Number(progress.skills[slot]) || 1);
    return `<div class="skill-row"><label>SKILL ${slot}<input class="hero-skill" data-id="${item.id}" data-slot="${slot}" type="number" min="1" max="${limit}" value="${level}"></label>${targetControl('hero-skill', `${item.id}|${slot}`, level, skillMax)}</div>`;
  }).join('');
  return `<article class="hero-card ${owned?'owned':''}" data-rarity="${item.rarity}">
    <div class="hero-summary"><div class="hero-portrait"><span>${String(index+1).padStart(2,'0')}</span>${item.name[0]}</div><div class="hero-identity"><div class="hero-badges"><i class="rarity ${item.rarity}">${item.rarity}</i><i>${item.type} · ${typeNames[item.type]}</i></div><h3>${item.name}${item.promoted?'<small>PROMOTED</small>':''}</h3><button data-hero="${item.id}">${owned?'✓ IN MY ROSTER':'+ ADD TO ROSTER'}</button></div></div>
    ${owned?`<div class="hero-details"><label>HERO LEVEL <input class="hero-level" data-id="${item.id}" type="number" min="1" max="${cap}" value="${Math.min(progress.level,cap)}"><small>/ ${cap}</small></label>${targetControl('hero-level', item.id, progress.level, item.maxLevel)}<div class="star-field"><span>STAR POWER</span>${starPicker(item.id, progress.starSteps)}<b>${stars} ★ · ${shardsUsed(progress.starSteps)} shards invested</b>${targetControl('hero-star', item.id, progress.starSteps, 25, 'TARGET STEP')}</div><div class="equipment"><span>EQUIPMENT</span>${equipmentSlots.map(slot=>`<label>${slot}<select class="hero-equipment" data-id="${item.id}" data-slot="${slot}">${equipmentQualities.map(quality=>`<option ${progress.equipment[slot]===quality?'selected':''}>${quality}</option>`).join('')}</select></label>`).join('')}</div><div class="skills"><span>SKILLS · CAP ${limit} AT ${stars} ★</span>${skills}</div>${hasGear(item) ? `<div class="skills gear"><span>EXCLUSIVE WEAPON</span><div class="skill-row"><label>LEVEL<input class="hero-gear" data-id="${item.id}" type="number" min="0" max="${gearMax()}" value="${Number(progress.gear) || 0}"></label>${targetControl('hero-gear', item.id, Number(progress.gear) || 0, gearMax())}</div><small class="gear-note">Level 0 means not unlocked. Unlock cost is not in the data.</small></div>` : ''}</div>`:''}
  </article>`;
}

function survivorProgress(item) { return { starSteps: 0, building: '', ...item }; }
function survivorsPage() {
  pageHeader('SETTLEMENT CREW', 'Survivors');
  return `<section class="page-intro survivor-intro"><div><p class="eyebrow">SURVIVOR DIRECTORY</p><h2>Building specialists</h2><p>Track Other, SSR, and Mythic survivors, assign each one to a building, and plan star upgrades in fifth-star increments.</p></div><button class="button primary" id="addSurvivor">+ Add survivor</button></section>
    <div class="hero-legend"><span><i class="rarity Other">OTHER</i> Other</span><span><i class="rarity SSR">SSR</i> Super rare</span><span><i class="rarity Mythic">MYTHIC</i> Mythic</span><span>Each diamond fills 20% of one star</span></div>
    ${state.survivors.length ? `<section class="survivor-grid">${state.survivors.map((raw, index) => { const item = survivorProgress(raw); const stars = (item.starSteps / 5).toFixed(1).replace('.0',''); return `<article class="survivor-card"><header><div class="survivor-avatar">${item.name[0].toUpperCase()}</div><div><i class="rarity ${item.rarity}">${item.rarity}</i><h3>${item.name}</h3><small>${item.benefit || 'Benefit not recorded'}</small></div><button class="remove-survivor" data-remove-survivor="${item.id}" aria-label="Remove ${item.name}">×</button></header><label class="assignment">ASSIGNED BUILDING<select class="survivor-building" data-id="${item.id}"><option value="">Unassigned</option>${buildings.map(building => `<option value="${building.name}" ${item.building === building.name ? 'selected' : ''}>${building.name}</option>`).join('')}</select></label><div class="star-field"><span>STAR POWER</span>${starPicker(item.id, item.starSteps, 'survivor')}<b>${stars} ★ · ${shardsUsed(item.starSteps)} shards invested</b>${targetControl('survivor-star', item.id, item.starSteps, 25, 'TARGET STEP')}</div></article>`; }).join('')}</section>` : `<section class="empty-state"><span>♟</span><h2>No survivors yet</h2><p>Add the survivors you discover; no names or benefits are guessed.</p><button class="button primary" id="addSurvivorEmpty">Add your first survivor</button></section>`}
    <p class="source-note">Survivor data is not in the game export yet. Shards use the hero schedule. Add survivor-token requirements in Upgrade data; they will be included in target totals.</p>`;
}

function dataPage() {
  pageHeader('PLANNING DATABASE', 'Upgrade data');
  const categoryOptions = [['building', 'Building'], ['research', 'Research'], ['hero-level', 'Hero level'], ['hero-star', 'Hero star'], ['hero-skill', 'Hero skill'], ['alliance', 'Alliance research'], ['survivor-star', 'Survivor star']].map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
  return `<section class="page-intro"><div><p class="eyebrow">GAME DATA</p><h2>Upgrade cost database</h2><p>Buildings, research, and heroes use the bundled game data. Alliance research and survivors still use the observations you record below.</p></div><div class="completion-ring"><strong>${state.upgradeRecords.length}</strong><span>LOCAL RECORDS</span></div></section>
    <section class="stats-grid"><article class="stat-card"><div class="stat-icon orange">⌂</div><div><span>BUILDINGS</span><strong>${GAME.buildings.length}</strong><small>Costs, times, and requirements</small></div></article><article class="stat-card"><div class="stat-icon green">⌬</div><div><span>RESEARCH NODES</span><strong>${researchNodes.length}</strong><small>${researchTrees.length} trees</small></div></article><article class="stat-card"><div class="stat-icon gold">♙</div><div><span>HEROES</span><strong>${heroes.length}</strong><small>EXP, shards, skill books</small></div></article><article class="stat-card"><div class="stat-icon blue">◇</div><div><span>NOT IN DATA</span><strong>2</strong><small>Alliance research, survivors</small></div></article></section>
    <section class="objective-calculator"><div><p class="eyebrow">ANY UPGRADE</p><h2>Target calculator</h2><p>Choose a tracked item to plan its requirements.</p></div><form id="objectiveForm"><label>CATEGORY<select name="category">${categoryOptions}</select></label><label>ITEM<select name="item" required>${upgradeItemOptions('building')}</select></label><label>CURRENT<input name="current" type="number" min="0" required value="0"></label><label>TARGET<input name="target" type="number" min="1" required value="1"></label><button class="button primary" type="submit">Calculate</button></form><div id="objectiveResult" class="objective-result">Choose an objective to calculate its requirements.</div></section>
    <section class="data-layout"><div class="data-form data-callout"><header><p class="eyebrow">QUICK ENTRY</p><h2>Fill a missing value</h2></header><p>Open a missing-data link on the alliance or survivor pages to arrive with the item and next missing level filled in, or start a new observation here.</p><button class="button primary" type="button" data-add-record data-category="alliance">+ Record upgrade data</button><div class="data-method"><b>HOW NORMALIZATION WORKS</b><p>If the game shows 900 food with a 10% reduction, we retain 900 as the observation and estimate the underlying cost as 1,000. Both values and the bonus context are exported for later pattern analysis.</p></div></div>
    <section class="data-records"><header><div><p class="eyebrow">LOCAL DATABASE</p><h2>Upgrade observations</h2></div><div><button class="button secondary" id="exportData">Export JSON</button><label class="button secondary import-button">Import JSON<input id="importData" type="file" accept="application/json"></label></div></header>${state.upgradeRecords.length ? `<div class="record-table">${state.upgradeRecords.map((record,index)=>`<article><div><span>${record.category} · ${record.observation ? 'NORMALIZED' : 'BASE VALUE'}${dataCategories.includes(record.category) ? ' · GAME DATA USED INSTEAD' : ''}</span><b>${escapeHtml(record.item)} → ${record.level}</b><small>${resourceNames.filter(name=>record.resources?.[name]).map(name=>`${formatNumber(record.resources[name])} ${name}`).join(' · ') || 'No resources'} · ${formatDuration((Number(record.minutes) || 0) * 60)}${record.observation?.resourceReduction ? ` · ${record.observation.resourceReduction}% resource reduction` : ''}${record.observation?.timeReduction ? ` · ${record.observation.timeReduction}% time reduction` : ''}${record.source ? ` · ${escapeHtml(record.source)}` : ''}</small></div><div class="record-actions"><button data-edit-record="${index}" aria-label="Edit record">✎</button><button data-delete-record="${index}" aria-label="Delete record">×</button></div></article>`).join('')}</div>` : '<div class="empty-records">No observations yet. Click any missing-data prompt in the trackers, or start one here.</div>'}</section></section>
    <p class="source-note">Game data is generated from data/source by tools/build_game_data.py. Rerun it after replacing the source files.</p>`;
}

function updateNormalizationPreview(form) {
  const values = Object.fromEntries(new FormData(form));
  const resourceReduction = Number(values.resourceReduction) || 0;
  const timeReduction = Number(values.timeReduction) || 0;
  const resources = resourceNames.filter(name => Number(values[name])).map(name => `${formatNumber(baseFromObserved(values[name], resourceReduction))} ${name}`);
  $('#normalizationPreview').innerHTML = `<span>ESTIMATED BASE VALUES</span><b>${resources.join(' · ') || 'No resources'} · ${formatDuration(baseFromObserved(values.minutes, timeReduction) * 60)}</b><small>${resourceReduction || timeReduction ? 'Calculated from the reductions entered above. The displayed values are also retained.' : 'No reductions entered; shown and base values are the same.'}</small>`;
}

function openUpgradeDialog(trigger = {}) {
  const form = $('#quickUpgradeForm');
  form.reset();
  form.elements.editIndex.value = trigger.editIndex ?? '';
  form.elements.category.value = trigger.category || 'alliance';
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
  const observed = record.observation?.resources || record.resources || {};
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
  planner: plannerPage,
  resources: resourcesPage,
  alliance: () => branchPage('alliance', 'Alliance research', 'Record shared technology levels exactly as they appear for your alliance.', allianceBranches),
  heroes: heroesPage,
  survivors: survivorsPage,
  filter: filterPage,
  data: dataPage
};

function bindPageControls() {
  $('[data-edit-profile]')?.addEventListener('click', openProfileDialog);
  document.querySelectorAll('[data-add-record]').forEach(button => button.addEventListener('click', () => requestUpgradeDialog({
    category: button.dataset.category, item: button.dataset.item, level: button.dataset.level
  })));
  document.querySelectorAll('.level-stepper').forEach(control => {
    const input = control.querySelector('input');
    const update = value => {
      const max = Number(input.max); const level = Math.max(Number(input.min), Math.min(max, Number(value) || 0));
      input.value = level; state[control.dataset.group][control.dataset.name] = level; save(); renderRoute({ keepScroll: true });
    };
    input.addEventListener('change', () => update(input.value));
    control.querySelectorAll('button').forEach(button => button.addEventListener('click', () => update(Number(input.value) + Number(button.dataset.change))));
  });
  document.querySelectorAll('[data-hero]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.hero;
    state.ownedHeroes = state.ownedHeroes.includes(id) ? state.ownedHeroes.filter(hero=>hero!==id) : [...state.ownedHeroes,id];
    save(); renderRoute({ keepScroll: true });
  }));
  document.querySelectorAll('.hero-level').forEach(input => input.addEventListener('change', () => {
    const progress = heroProgress({ id: input.dataset.id });
    progress.level = Math.max(1, Math.min(Number(input.max), Number(input.value) || 1));
    state.heroProgress[input.dataset.id] = progress; save(); renderRoute({ keepScroll: true });
  }));
  document.querySelectorAll('.hero-gear').forEach(input => input.addEventListener('change', () => {
    const progress = heroProgress({ id: input.dataset.id });
    progress.gear = Math.max(0, Math.min(Number(input.max), Number(input.value) || 0));
    state.heroProgress[input.dataset.id] = progress; save('Weapon level saved'); renderRoute({ keepScroll: true });
  }));
  document.querySelectorAll('.hero-skill').forEach(input => input.addEventListener('change', () => {
    const progress = heroProgress({ id: input.dataset.id });
    progress.skills = { ...progress.skills, [input.dataset.slot]: Math.max(1, Math.min(Number(input.max), Number(input.value) || 1)) };
    state.heroProgress[input.dataset.id] = progress; save('Skill saved'); renderRoute({ keepScroll: true });
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
    save('Star power saved'); renderRoute({ keepScroll: true });
  }));
  document.querySelectorAll('.target-level').forEach(input => input.addEventListener('change', () => {
    const value = Math.max(Number(input.min), Math.min(Number(input.max), Number(input.value) || Number(input.min)));
    state.targets[targetKey(input.dataset.category, input.dataset.item)] = value; save('Target saved'); renderRoute({ keepScroll: true });
  }));
  document.querySelectorAll('[data-node]').forEach(button => button.addEventListener('click', () => {
    const tree = location.hash.split('/')[1];
    ui.selectedNode[researchTrees.find(item => item.id === tree)?.gameId] = Number(button.dataset.node);
    renderRoute({ keepScroll: true });
    if (window.innerWidth < 900) $('#nodeDetail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  const applyBuildingFilter = () => {
    const query = ui.buildingSearch.trim().toLowerCase();
    document.querySelectorAll('.construction-group').forEach(group => {
      let visible = 0;
      group.querySelectorAll('.tracker-card').forEach(card => {
        const show = (!query || card.dataset.search.includes(query)) && !(ui.hideLocked && card.classList.contains('locked'));
        card.hidden = !show; if (show) visible += 1;
      });
      group.hidden = !visible;
      if (query && visible) group.open = true;
    });
  };
  $('#buildingSearch')?.addEventListener('input', event => { ui.buildingSearch = event.target.value; applyBuildingFilter(); });
  $('#hideLocked')?.addEventListener('change', event => { ui.hideLocked = event.target.checked; applyBuildingFilter(); });
  if ($('#buildingSearch')) applyBuildingFilter();
  document.querySelectorAll('details.construction-group').forEach(group => group.addEventListener('toggle', () => {
    if (group.open) ui.collapsed.delete(group.dataset.group); else ui.collapsed.add(group.dataset.group);
  }));
  document.querySelectorAll('[data-group-target]').forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    const group = constructionGroups.find(item => item.name === button.dataset.groupName);
    group.buildings.forEach(item => {
      if (button.dataset.groupTarget === 'max') state.targets[targetKey('building', item.name)] = item.def.max;
      else delete state.targets[targetKey('building', item.name)];
    });
    save(button.dataset.groupTarget === 'max' ? 'Targets set to max' : 'Targets cleared'); renderRoute({ keepScroll: true });
  }));
  $('#speedupForm')?.addEventListener('change', event => {
    const input = event.target; state.speedups[input.name] = Math.max(0, Number(input.value) || 0);
    save('Speedups saved'); renderRoute({ keepScroll: true });
  });
  $('#bonusForm')?.addEventListener('change', event => {
    const form = event.currentTarget;
    state.profile.bonuses = Object.fromEntries(bonusFields.map(name => [name, Math.max(0, Number(form.elements[name].value) || 0)]));
    save('Bonuses saved'); renderRoute({ keepScroll: true });
  });
  $('#goalForm')?.addEventListener('submit', event => {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget));
    const [kind, id] = values.goal.split(':');
    $('#goalResult').innerHTML = goalResultMarkup(kind, Number(id), Number(values.level) || 1);
  });
  const goalForm = $('#goalForm');
  goalForm?.elements.goal.addEventListener('change', event => {
    const [kind, id] = event.target.value.split(':');
    const table = kind === 'b' ? buildingDefById.get(Number(id)) : researchById.get(Number(id));
    goalForm.elements.level.max = table.max;
    goalForm.elements.level.value = Math.min(table.max, (kind === 'b' ? buildingLevel(table.id) : researchLevel(table.id)) + 1);
  });
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
    event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form));
    const current = Number(values.current); const target = Number(values.target);
    const label = form.elements.item.selectedOptions[0]?.textContent || values.item;
    $('#objectiveResult').innerHTML = target <= current ? '<b>Target already reached.</b>' : `<b>${escapeHtml(label)}: ${current} → ${target}</b>${planSummary(values.category, values.item.trim(), current, target)}`;
  });
  const objectiveForm = $('#objectiveForm');
  objectiveForm?.elements.category.addEventListener('change', event => populateUpgradeItemSelect(objectiveForm.elements.item, event.target.value));
  const updateFilters = () => {
    const query = ($('#filterSearch')?.value || '').trim().toLowerCase(); const category = $('#filterCategory')?.value || 'all'; const status = $('#filterStatus')?.value || 'all';
    const matches = filterItems().filter(item => (!query || `${item.name} ${item.detail}`.toLowerCase().includes(query)) && (category === 'all' || item.category === category) && (status === 'all' || item.active === (status === 'owned')));
    if ($('#filterCount')) $('#filterCount').textContent = `${matches.length} RESULTS`;
    if ($('#filterResults')) $('#filterResults').innerHTML = matches.length ? matches.map(item => `<a href="${item.href}"><span>${item.category}</span><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.detail)}</small><i>${item.active ? 'ACTIVE' : 'NOT ACTIVE'} →</i></a>`).join('') : '<div class="empty-records">No tracked items match these filters.</div>';
  };
  ['#filterSearch','#filterCategory','#filterStatus'].forEach(selector => $(selector)?.addEventListener('input', updateFilters)); updateFilters();
}

function renderRoute({ keepScroll = false } = {}) {
  const scroll = window.scrollY;
  const route = location.hash.slice(1).split('/')[0] || 'overview';
  const activeRoute = pages[route] ? route : 'overview';
  app.innerHTML = pages[activeRoute]();
  document.querySelectorAll('.nav-link').forEach(link => link.classList.toggle('active', link.dataset.route === activeRoute));
  $('#sidebar').classList.remove('open'); bindPageControls(); app.focus({preventScroll:true}); window.scrollTo(0, keepScroll ? scroll : 0);
}

$('#menuButton').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
function openProfileDialog() { const form = $('#profileForm'); $('#nameInput').value = state.profile.name; powerFields.forEach(name => { form.elements[name].value = Number(state.profile.power[name]) || 0; }); $('#profileDialog').showModal(); setTimeout(()=>$('#nameInput').focus(),50); }
$('#profileButton').addEventListener('click', openProfileDialog);
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
$('#profileForm').addEventListener('submit', event => { event.preventDefault(); const name=$('#nameInput').value.trim(); if (!name) return; state.profile.name=name; state.profile.power = Object.fromEntries(powerFields.map(field => [field, Math.max(0, Number(event.currentTarget.elements[field].value) || 0)])); save('Profile and power saved'); setProfile(); $('#profileDialog').close(); renderRoute(); });
$('#resetData').addEventListener('click', () => { if (!confirm('Reset your profile and every saved level?')) return; state=structuredClone(defaults); save('Progress reset'); setProfile(); renderRoute(); });
window.addEventListener('hashchange', renderRoute);
setProfile(); renderRoute();
if (!state.profile.name) setTimeout(() => $('#profileButton').click(), 450);
