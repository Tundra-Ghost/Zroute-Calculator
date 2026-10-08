const STORAGE_KEY = 'zroute-command-center-v3';
const LEGACY_STORAGE_KEY = 'zroute-command-center-v2';

// Game tables come from data/game-data.js, which tools/build_game_data.py
// generates from the raw exports in data/source/.
const GAME = window.ZROUTE_DATA || {
  resources: {}, vipBuildingSpeed: [], benefitTypes: {}, buildings: [], researchTrees: [], research: [],
  heroes: [], heroExp: {}, skillBooks: {}, starShards: [], starSkillLimit: [],
  producers: [], outputBenefits: {}, speedups: [], exclusiveGear: {}, gearShards: [], gear: [],
  fighter: { rows: [[1, 0]], cost: {}, chips: [], chipSlots: [], componentSlots: [], componentCost: [], evolutionXp: [] }
};

const buildingIcons = {
  HQ: '⌂', Economy: '♨', Military: '⚔', Development: '⌬', Season: '☢',
  Farm: '♨', 'Metal Smelting Plant': '◆', 'Training Ground': '⚒', 'Oil Extraction Well': '◉', Barn: '▰', 'Metal Warehouse': '▣',
  'Oil Tank': '●', Hospital: '✚', 'Alliance Center': '◇', Radar: '◉', 'Scout Drone': '⌁', 'Gear Craft Center': '⚙',
  'Alpha Research Division': 'α', 'Beta Research Department': 'β', 'Warrior Training Center': '⚔', 'Assault Training Center': '➶', 'Tactical Training Center': '⌖'
};

const researchNodes = GAME.research;
const researchById = new Map(researchNodes.map(node => [node.id, node]));

// Every building copy is its own slot with its own level. Multi-copy buildings
// are numbered and each copy unlocks at the HQ level the game data gives.
const constructionGroups = ['HQ', 'Economy', 'Military', 'Development', 'Season'].map(name => ({
  name,
  buildings: GAME.buildings.filter(def => def.group === name).flatMap(def => {
    // Some research (Extra Farm and similar) adds one more copy after the HQ copies.
    const copies = [...def.slots.map(unlock => ({ unlock })), ...(def.researchSlots || []).map(research => ({ unlock: 1, research }))];
    return copies.map(({ unlock, research }, slot) => ({
      name: copies.length > 1 ? `${def.name} ${slot + 1}` : def.name,
      description: research ? `Unlocks with research ${researchById.get(research)?.name || research}` : unlock > 1 ? `Unlocks at HQ ${unlock}` : '',
      icon: buildingIcons[def.name] || buildingIcons[name], def, slot, unlock, research
    }));
  })
})).filter(group => group.buildings.length);
const buildings = constructionGroups.flatMap(group => group.buildings);
const buildingSlot = name => buildings.find(item => item.name === name);
const buildingDefById = new Map(GAME.buildings.map(def => [def.id, def]));
const slotsByDefId = id => buildings.filter(item => item.def.id === id);

const iconImg = (src, className = 'game-icon') => src ? `<img class="${className}" src="${src}" alt="" loading="lazy">` : '';
const slug = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const researchTrees = GAME.researchTrees.map(tree => ({ ...tree, gameId: tree.id, id: slug(tree.name) }));
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
const heroSkillSlots = hero => hero?.levelSkills || skillSlots;
const typeNames = { FL: 'Frontline', BL: 'Backline', S: 'Support' };
const survivorRarities = ['Other', 'SSR', 'Mythic'];
// Observation records keep their original fields. Plan totals use the wider list.
const resourceNames = ['food', 'metal', 'oil', 'shards', 'tokens'];
const planResources = ['food', 'metal', 'oil', 'uranium', 'antibody', 'researchData', 'heroExp', 'shards', 'skillBooks', 'gearShards', 'refiningStone', 'heatGold', 'composite', 'crystal', 'blueprintLegendary', 'blueprintMythic', 'combatChips', 'fighterParts', 'chipCopies', 'componentCopies', 'evolutionXp', 'tokens'];
const resourceTitles = { ...GAME.resources, shards: 'Shards', gearShards: 'Weapon Shards', tokens: 'Tokens' };
const emptyResources = () => Object.fromEntries(planResources.map(name => [name, 0]));
const powerFields = ['heroLevel', 'heroSkill', 'heroAttributes', 'heroStars', 'gear', 'hallOfLegends', 'exclusiveWeapons', 'soldier', 'building', 'survivor', 'tech', 'fighterLevel', 'fighterComponent', 'wingman'];
const emptyPower = () => Object.fromEntries(powerFields.map(name => [name, 0]));
const bonusFields = ['vipLevel', 'buildingSpeed', 'researchSpeed'];
const emptyBonuses = () => Object.fromEntries(bonusFields.map(name => [name, 0]));
const dataCategories = ['building', 'research', 'hero-level', 'hero-star', 'hero-skill', 'hero-gear', 'hero-equip', 'fighter-level', 'fighter-chip', 'fighter-component', 'fighter-evolution'];
// Gear quality N in the data is equipmentQualities[N - 1]. R gear cannot be crafted or upgraded.
const gearByQuality = new Map(GAME.gear.map(table => [equipmentQualities[table.quality - 1], table]));
// Gear crafting materials merge 4 to 1: Steel, Steel Component, Heat-resistant Gold, Composite Material, Conductive Crystal.
const steelPerMaterial = { heatGold: 16, composite: 64, crystal: 256 };
// Fighter rows are numbered from 1. Key upgrade rows show as stage (phase - 1) of 5.
const fighterRows = GAME.fighter.rows;
const chipById = new Map(GAME.fighter.chips.map(chip => [chip.id, chip]));
function fighterRowLabel(row) {
  const [level, phase] = fighterRows[row - 1] || [1, 0];
  return phase ? `Lv ${level} · stage ${phase - 1}/5` : `Lv ${level}`;
}
// Level L either has one plain row, or five key upgrade rows shown as stage 0-4 of 5.
const fighterMaxLevel = Math.max(...fighterRows.map(([level]) => level));
const fighterHasStages = level => fighterRows.some(([rowLevel, phase]) => rowLevel === level && phase > 0);
function fighterRowFor(level, stage) {
  const index = fighterRows.findIndex(([rowLevel, phase]) => rowLevel === level && (fighterHasStages(level) ? phase === stage + 1 : true));
  return index + 1 || 1;
}
function fighterLevelPicker(which, row, minRow = 1) {
  const [level, phase] = fighterRows[row - 1] || [1, 0];
  const stage = phase ? phase - 1 : 0;
  const bar = fighterHasStages(level) ? `<div class="stage-bar" role="group" aria-label="Stage ${stage} of 5">${[1, 2, 3, 4, 5].map(segment => `<button type="button" class="stage-segment ${segment <= stage ? 'filled' : ''}" data-fighter-which="${which}" data-stage="${segment}" ${segment === 5 ? 'disabled title="Stage 5 is the next level"' : ''} aria-label="Stage ${segment}"></button>`).join('')}<small>STAGE ${stage} / 5</small></div>` : '<div class="stage-bar empty"><small>No stages at this level</small></div>';
  return `<div class="fighter-picker"><label>${which === 'current' ? 'CURRENT' : 'TARGET'} LEVEL<input class="fighter-level-input" data-fighter-which="${which}" type="number" min="${fighterRows[minRow - 1]?.[0] || 1}" max="${fighterMaxLevel}" value="${level}"></label>${bar}</div>`;
}
function fighterChip(slot) { return chipById.get(Number(state.fighter.chips[slot]?.id)); }
// Steps past the strengthen max are UR promotion stages.
function gearStepLabel(table, step) {
  if (step <= table.levels) return `Lv ${step}`;
  const [promotion, stage] = table.stages[step - table.levels - 1];
  return stage ? `Lv ${table.levels} · promotion ${promotion + 1} stage ${stage}` : `Lv ${table.levels} · promotion ${promotion} complete`;
}
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
  targets: {},
  // "Everything to max" what-ifs. Ministers add speed; the ignore switches drop bonuses.
  // autoFill: raising a level also raises the prerequisites it needed.
  prefs: { autoFill: true },
  maxOptions: { buildMinister: 0, researchMinister: 0, ignoreResearch: false, ignoreVip: false, ignoreOther: false },
  fighter: { row: 1, chips: GAME.fighter.chipSlots.map(() => ({ id: 0, star: 0 })), components: GAME.fighter.componentSlots.map(() => 0), evolution: 0 }
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
      targets: saved.targets && typeof saved.targets === 'object' ? saved.targets : {},
      maxOptions: { ...defaults.maxOptions, ...saved.maxOptions },
      prefs: { ...defaults.prefs, ...saved.prefs },
      fighter: {
        row: Math.max(1, Math.min(fighterRows.length, Number(saved.fighter?.row) || 1)),
        chips: defaults.fighter.chips.map((empty, slot) => ({ ...empty, ...saved.fighter?.chips?.[slot] })),
        components: defaults.fighter.components.map((empty, slot) => Number(saved.fighter?.components?.[slot]) || empty),
        evolution: Number(saved.fighter?.evolution) || 0
      }
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
function flatNote(bonus) {
  const parts = [['Construction', bonus.buildingFlat], ['Research', bonus.researchFlat]].map(([label, flat]) => {
    const text = Object.entries(flat).filter(([, value]) => value).map(([name, value]) => `${formatNumber(value)} ${resourceTitles[name].toLowerCase()}`).join(', ');
    return text && `${label} −${text} per level`;
  }).filter(Boolean);
  return parts.length ? ` · ${parts.join(' · ')}` : '';
}
// Set only while the max-out what-if is computed.
let whatIf = null;
function speedBonuses() {
  const bonuses = state.profile.bonuses;
  const options = whatIf || {};
  const research = type => options.ignoreResearch ? 0 : researchBenefit(type);
  const vip = options.ignoreVip ? 0 : GAME.vipBuildingSpeed[Number(bonuses.vipLevel) || 0] || 0;
  const researchBuilding = research(GAME.benefitTypes.buildingSpeed) * 100;
  const researchResearch = research(GAME.benefitTypes.researchSpeed) * 100;
  const otherBuilding = options.ignoreOther ? 0 : Number(bonuses.buildingSpeed) || 0;
  const otherResearch = options.ignoreOther ? 0 : Number(bonuses.researchSpeed) || 0;
  return {
    vip, researchBuilding, researchResearch,
    building: vip + researchBuilding + otherBuilding + (Number(options.buildMinister) || 0),
    research: researchResearch + otherResearch + (Number(options.researchMinister) || 0),
    buildingCost: research(GAME.benefitTypes.buildingCost) * 100,
    // Flat cuts per upgrade (benefit parameter type 2 is a fixed amount).
    buildingFlat: { food: research(20101), metal: research(20102) },
    researchFlat: { food: research(20110), metal: research(20111), oil: research(20112) }
  };
}
const speedUp = (seconds, percent) => Math.ceil(seconds / (1 + Math.max(0, percent) / 100));
const formatPercent = value => `${Math.round(value * 100) / 100}%`;

function requirementLabel(req) {
  const [kind, ref, level] = req;
  if (kind === 'b') return `${ref.map(id => buildingDefById.get(id)?.name || `Building ${id}`).join(' or ')} Lv ${level}`;
  if (kind === 'c') return `${GAME.buildings.filter(def => def.class === ref).map(def => def.name).join(' or ') || `Building class ${ref}`} Lv ${level}`;
  return `${researchById.get(ref)?.name || `Research ${ref}`} Lv ${level}`;
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
  // A promoted hero starts at 3 stars (step 15).
  const minSteps = heroes.find(item => item.id === hero.id)?.promoted ? 15 : 0;
  const result = { level: 1, starSteps: minSteps, equipment: {}, skills: {}, ...progress };
  result.starSteps = Math.max(minSteps, Number(result.starSteps) || 0);
  return result;
}
function gearLevel(progress, slot, table) { return Math.min(table.steps, Number(progress.equipLevels?.[slot]) || 0); }
function shardsUsed(steps) { return sumRange(starShardCosts, 0, steps); }
// Shards a hero has put into stars. A promoted hero counts from its 3 ★ start.
function heroShardTable(hero) { return hero.promoted && GAME.starShardsPromoted?.length ? GAME.starShardsPromoted : starShardCosts; }
function heroShards(hero, steps) { return sumRange(heroShardTable(hero), hero.promoted ? 15 : 0, steps); }
function stepsFromShards(hero, shards) {
  const table = heroShardTable(hero); let steps = hero.promoted ? 15 : 0; let left = shards;
  while (steps < 25 && left >= table[steps]) { left -= table[steps]; steps += 1; }
  return steps;
}
function skillCap(steps) { return GAME.starSkillLimit[steps] || 1; }

function sumPower(names) { return names.reduce((sum, name) => sum + (Number(state.profile.power[name]) || 0), 0); }
function powerTotals() {
  const hero = sumPower(['heroLevel', 'heroSkill', 'heroAttributes', 'heroStars', 'gear', 'hallOfLegends', 'exclusiveWeapons']);
  const soldier = sumPower(['soldier']); const building = sumPower(['building', 'survivor']);
  const tech = sumPower(['tech']); const fighter = sumPower(['fighterLevel', 'fighterComponent', 'wingman']);
  return { hero, soldier, building, tech, fighter, total: hero + soldier + building + tech + fighter };
}

function targetKey(category, item) { return `${category}:${item}`; }
// Fighter target row: a saved row above the current one, else the next row.
function fighterTargetRow() {
  const row = state.fighter.row; const max = fighterRows.length; const saved = Number(state.targets[targetKey('fighter-level', 'fighter')]) || 0;
  return saved > row ? Math.min(max, saved) : Math.min(max, row + 1);
}
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
  if (category === 'hero-skill') items = heroes.flatMap(item => heroSkillSlots(item).map(slot => ({ value: `${item.id}|${slot}`, label: `${heroLabel(item)} · Skill ${slot}` })));
  if (category === 'hero-equip') items = heroes.flatMap(item => equipmentSlots.map(slot => ({ value: `${item.id}|${slot}`, label: `${heroLabel(item)} · ${slot}` })));
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
// `flat` takes a fixed amount off every level, after the percent cut.
function tableCost(table, current, target, { speed = 0, costCut = 0, flat = {} } = {}) {
  const result = { resources: emptyResources(), seconds: 0 };
  Object.entries(table.cost || {}).forEach(([name, values]) => {
    for (let index = current; index < Math.min(target, values.length); index += 1) {
      if (values[index]) result.resources[name] += Math.max(0, Math.ceil(values[index] * (1 - costCut / 100)) - (flat[name] || 0));
    }
  });
  for (let index = current; index < Math.min(target, (table.time || []).length); index += 1) result.seconds += speedUp(table.time[index], speed);
  return result;
}
function heroForItem(item) { return heroes.find(hero => hero.id === String(item).split('|')[0]); }
function dataPlan(category, item, current, target) {
  const bonus = speedBonuses();
  if (category === 'building') { const slotItem = buildingSlot(item); return slotItem && tableCost(slotItem.def, current, target, { speed: bonus.building, costCut: bonus.buildingCost, flat: bonus.buildingFlat }); }
  if (category === 'research') { const node = researchById.get(Number(item)); return node && tableCost(node, current, target, { speed: bonus.research, flat: bonus.researchFlat }); }
  if (category === 'fighter-level') return tableCost(GAME.fighter, current, target);
  if (category === 'fighter-component') return { resources: { ...emptyResources(), componentCopies: sumRange(GAME.fighter.componentCost, current, target) }, seconds: 0 };
  if (category === 'fighter-evolution') return { resources: { ...emptyResources(), evolutionXp: sumRange(GAME.fighter.evolutionXp, current, target) }, seconds: 0 };
  if (category === 'fighter-chip') {
    const chip = fighterChip(Number(item)); if (!chip) return null;
    const result = { resources: emptyResources(), seconds: 0 };
    result.resources.chipCopies = sumRange(chip.copies, current, target);
    return result;
  }
  const hero = heroForItem(item); if (!hero) return null;
  const result = { resources: emptyResources(), seconds: 0 };
  if (category === 'hero-level') result.resources.heroExp = sumRange(GAME.heroExp[hero.expCurve], Math.max(1, current), target);
  if (category === 'hero-star') result.resources.shards = sumRange(hero.promoted && GAME.starShardsPromoted?.length ? GAME.starShardsPromoted : starShardCosts, current, target);
  if (category === 'hero-skill') result.resources.skillBooks = sumRange(GAME.skillBooks[hero.skillCurve], Math.max(1, current), target);
  // Level L costs gearShards[L - 1] to reach L + 1. The unlock cost (0 to 1) is not in the data.
  if (category === 'hero-gear') result.resources.gearShards = sumRange(GAME.gearShards, Math.max(1, current) - 1, target - 1);
  if (category === 'hero-equip') {
    const table = gearByQuality.get(heroProgress(hero).equipment[String(item).split('|')[1]]);
    if (table) return tableCost(table, current, target);
  }
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
        ...heroSkillSlots(item).map(slot => objective('hero-skill', `${item.id}|${slot}`, owned ? Number(progress.skills[slot]) || 1 : 0, GAME.skillBooks[item.skillCurve]?.length || 30)),
        ...(hasGear(item) ? [objective('hero-gear', item.id, owned ? Number(progress.gear) || 0 : 0, gearMax())] : []),
        ...(owned ? equipmentSlots.flatMap(slot => {
          const table = gearByQuality.get(progress.equipment[slot]);
          return table ? [objective('hero-equip', `${item.id}|${slot}`, gearLevel(progress, slot, table), table.steps)] : [];
        }) : [])
      ];
    }),
    ...(fighterRows.length > 1 ? [objective('fighter-level', 'fighter', state.fighter.row, fighterRows.length)] : []),
    ...state.fighter.components.map((level, slot) => objective('fighter-component', String(slot), level, GAME.fighter.componentCost.length)),
    ...(GAME.fighter.evolutionXp.length ? [objective('fighter-evolution', 'evolution', state.fighter.evolution, GAME.fighter.evolutionXp.length)] : []),
    ...state.fighter.chips.flatMap((saved, slot) => { const chip = fighterChip(slot); return chip?.copies.length ? [objective('fighter-chip', String(slot), Number(saved.star) || 0, chip.copies.length)] : []; }),
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
  whatIf = state.maxOptions;
  try {
    return objectives.reduce((sum, objective) => {
      const plan = calculateUpgrade(objective.category, objective.item, objective.current, objective.target);
      planResources.forEach(name => { sum.resources[name] += plan.resources[name]; });
      sum.seconds += plan.seconds; sum.steps += plan.needed;
      sum[objective.category === 'building' ? 'buildSeconds' : 'researchSeconds'] += plan.seconds;
      return sum;
    }, { resources: emptyResources(), seconds: 0, buildSeconds: 0, researchSeconds: 0, steps: 0 });
  } finally { whatIf = null; }
}
function maxOptionsForm() {
  const options = state.maxOptions;
  const check = (name, label) => `<label class="check"><input type="checkbox" name="${name}" ${options[name] ? 'checked' : ''}> ${label}</label>`;
  return `<details class="max-options"><summary>What-if options${options.buildMinister || options.researchMinister || options.ignoreResearch || options.ignoreVip || options.ignoreOther ? ' · ACTIVE' : ''}</summary><form id="maxOptionsForm">
    <label>CONSTRUCTION MINISTER %<input type="number" name="buildMinister" min="0" step="0.1" value="${Number(options.buildMinister) || 0}"></label>
    <label>RESEARCH MINISTER %<input type="number" name="researchMinister" min="0" step="0.1" value="${Number(options.researchMinister) || 0}"></label>
    ${check('ignoreResearch', 'Remove research bonuses')}${check('ignoreVip', 'Remove VIP speed')}${check('ignoreOther', 'Remove other speed (statues, events)')}
  </form><small>Only changes this "Everything to max" total. Enter the minister bonus your capitol appointment gives.</small></details>`;
}
function totalValues(plan) {
  return `<div class="grand-plan-values">${shownResources(plan.resources).map(name => `<article><span>${iconImg(GAME.resourceIcons?.[name], 'chip-icon')}${resourceTitles[name].toUpperCase()}</span><strong>${formatNumber(plan.resources[name])}</strong></article>`).join('')}<article class="grand-plan-time"><span>TOTAL TIME</span><strong>${formatDuration(plan.seconds)}</strong></article></div>`;
}
function grandPlanMarkup() {
  const plan = grandUpgradePlan();
  const incomplete = plan.found !== plan.needed;
  const note = !plan.goals ? 'No targets set yet. Set a target on any building, research node, or hero and it is added here.'
    : `${formatNumber(plan.goals)} targets set. ${incomplete ? `⚠ ${formatNumber(plan.needed - plan.found)} alliance or survivor steps still need recorded costs.` : 'Every step has cost data.'}`;
  const max = maxOutPlan();
  return `<section class="grand-plan ${incomplete ? 'incomplete' : ''}"><header><div><p class="eyebrow">YOUR TARGETS</p><h2>Planned upgrades</h2></div><a class="button secondary" href="#planner">Open goal planner</a></header>${totalValues(plan)}<p>${note}</p></section>
  <section class="grand-plan max-plan"><header><div><p class="eyebrow">FROM YOUR CURRENT LEVELS</p><h2>Everything to max</h2></div><span class="pill">${formatNumber(max.steps)} LEVELS LEFT</span></header>${totalValues(max)}<p class="split-times">Building time ${formatDuration(max.buildSeconds)} · Research time ${formatDuration(max.researchSeconds)}</p>${maxOptionsForm()}<p>Every building copy and research node from its saved level to max. Change any level and this updates. Times include your speed bonuses but not speedup items.</p></section>`;
}
function resourceLabel(name, category, item) {
  if (name !== 'shards') return resourceTitles[name].toUpperCase();
  const rarity = category === 'hero-star' ? heroForItem(item)?.rarity : state.survivors.find(person => person.id === item)?.rarity;
  return `${rarity || ''} SHARDS`.trim();
}
function costChips(plan, category, item) {
  return shownResources(plan.resources, []).map(name => `<span>${iconImg(GAME.resourceIcons?.[name], 'chip-icon')}<b>${formatNumber(plan.resources[name])}</b> ${resourceLabel(name, category, item)}</span>`).join('') + (plan.seconds ? `<span><b>${formatDuration(plan.seconds)}</b> TIME</span>` : '');
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
// The target defaults to the next level. A saved target above the current level is kept, so custom and max goals stay.
function targetControl(category, item, current, max = 30, label = 'TARGET') {
  const saved = state.targets[targetKey(category, item)];
  const hasGoal = saved !== undefined && Number(saved) > current;
  const maxed = current >= max;
  const target = maxed ? max : hasGoal ? Math.min(max, Number(saved)) : current + 1;
  return `<div class="target-plan"><label>${label}<input class="target-level" data-category="${category}" data-item="${escapeHtml(item)}" type="number" min="${maxed ? max : current + 1}" max="${max}" value="${target}" ${maxed ? 'disabled' : ''}></label>${planSummary(category, item, current, hasGoal ? target : current, max)}</div>`;
}
const gearGlyphs = { Rifle: '🔫', Scope: '🔭', Helmet: '⛑️', 'Bullet Proof Vest': '🦺' };
function equipmentControl(hero, progress, slot) {
  const quality = progress.equipment[slot] || 'None';
  const table = gearByQuality.get(quality);
  const tier = equipmentQualities.indexOf(quality);
  const select = `<select class="hero-equipment" data-id="${hero.id}" data-slot="${slot}">${equipmentQualities.map(option => `<option ${quality === option ? 'selected' : ''}>${option}</option>`).join('')}</select>`;
  const head = `<span class="gear-icon q${tier}" aria-hidden="true">${gearGlyphs[slot] || '⚙'}</span><label class="gear-quality">${slot.toUpperCase()}${select}</label>`;
  if (!table) return `<div class="gear-row">${head}<small class="gear-row-note">${tier === 1 ? 'R gear cannot be upgraded.' : 'Pick a quality to plan upgrades.'}</small></div>`;
  const level = gearLevel(progress, slot, table);
  const item = `${hero.id}|${slot}`;
  return `<div class="gear-row">${head}<label class="now-input">LEVEL<input class="hero-equip-level" data-id="${hero.id}" data-slot="${slot}" type="number" min="0" max="${table.steps}" value="${level}"></label>${targetControl('hero-equip', item, level, table.steps)}<small class="gear-row-note">${level ? gearStepLabel(table, level) : 'Lv 0'} · max ${gearStepLabel(table, table.steps)}${table.steps > table.levels ? `. Steps ${table.levels + 1} to ${table.steps} are promotion stages.` : ''}</small></div>`;
}
function starPicker(id, steps, ownerType = 'hero') {
  return `<div class="star-picker" role="group" aria-label="Star power: ${(steps / 5).toFixed(1)} of 5 stars">${Array.from({length: 5}, (_, star) => `<div class="progress-star" role="group" aria-label="Star ${star + 1}">${Array.from({length: 5}, (_, section) => { const step = star * 5 + section + 1; const filled = step <= steps; return `<button class="star-section ${filled ? 'filled' : ''}" data-star-owner="${ownerType}" data-id="${id}" data-step="${step}" aria-label="Set star power to ${(step / 5).toFixed(1)}" aria-pressed="${filled}"></button>`; }).join('')}</div>`).join('')}</div>`;
}

/* ---------- Goal planner: a target plus every prerequisite it needs ---------- */

// Walks requirements recursively. need maps 'b:id' / 'r:id' to the level it must reach.
function prereqSolver() {
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
    requireLevels(table, from, to);
  };
  // Every requirement for levels from+1..to of one building or research.
  const requireLevels = (table, from, to) => {
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
  return { need, currentOf, require, requireLevels };
}
// Levels another item must have had for this one to reach its level. Never lowers anything.
function fillPrerequisites(items) {
  const solver = prereqSolver();
  items.forEach(([kind, id, level]) => {
    const table = kind === 'b' ? buildingDefById.get(Number(id)) : researchById.get(Number(id));
    if (table) solver.requireLevels(table, 0, Math.min(level, table.max));
  });
  let changed = 0;
  solver.need.forEach((level, key) => {
    const id = Number(key.slice(2));
    if (key.startsWith('b:')) {
      const slot = slotsByDefId(id).sort((a, b) => (Number(state.buildings[b.name]) || 0) - (Number(state.buildings[a.name]) || 0))[0];
      if (slot && (Number(state.buildings[slot.name]) || 0) < level) { state.buildings[slot.name] = level; changed += 1; }
    } else if (researchLevel(id) < level) { state.research[id] = level; changed += 1; }
  });
  return changed;
}
function everythingSet() {
  return [...buildings.map(item => ['b', item.def.id, Number(state.buildings[item.name]) || 0]), ...Object.entries(state.research).map(([id, level]) => ['r', Number(id), Number(level) || 0])].filter(item => item[2] > 0);
}
// Saves, fills prerequisites when that is on, and offers an undo.
function commitLevels(before, message, seeds) {
  const filled = state.prefs.autoFill && seeds.length ? fillPrerequisites(seeds) : 0;
  save(filled ? `${message}. Filled ${filled} prerequisite${filled === 1 ? '' : 's'}` : message);
  if (filled || seeds.length > 1) offerUndo(before);
  renderRoute({ keepScroll: true });
}
function snapshotLevels() { return { buildings: { ...state.buildings }, research: { ...state.research } }; }
function offerUndo(before) {
  const toast = $('#toast');
  const button = document.createElement('button'); button.type = 'button'; button.className = 'toast-undo'; button.textContent = 'Undo';
  button.addEventListener('click', () => { state.buildings = before.buildings; state.research = before.research; save('Undone'); renderRoute({ keepScroll: true }); });
  toast.append(' ', button); clearTimeout(save.timer); save.timer = setTimeout(() => toast.classList.remove('show'), 6000);
}

function planGoal(kind, id, level) {
  const { need, currentOf, require } = prereqSolver();
  require(`${kind}:${id}`, level);
  const bonus = speedBonuses();
  const steps = [...need.entries()].map(([key, target]) => {
    const isBuilding = key.startsWith('b:');
    const table = isBuilding ? buildingDefById.get(Number(key.slice(2))) : researchById.get(Number(key.slice(2)));
    const current = currentOf(key);
    const cost = tableCost(table, current, target, isBuilding ? { speed: bonus.building, costCut: bonus.buildingCost, flat: bonus.buildingFlat } : { speed: bonus.research, flat: bonus.researchFlat });
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
  if (!producer || !level || isLocked(item)) return null;
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
    <details open class="panel grand-plan"><summary><div><p class="eyebrow">FROM YOUR BUILDINGS</p><h2>Hourly production</h2></div><a class="button secondary" href="#construction">Update buildings</a></summary>${rows ? `<div class="production-values">${rows}</div>` : '<p>Set your Farm, Metal Smelting Plant, Oil Extraction Well, or Training Ground levels to see production.</p>'}<p>Base output only. VIP, events, and survivors are not included.</p></details>
    <details open class="panel grand-plan max-plan"><summary><div><p class="eyebrow">AGAINST YOUR TARGETS</p><h2>Speedup coverage</h2></div></summary><div class="grand-plan-values">
      <article><span>PLANNED BUILD TIME</span><strong>${formatDuration(plan.buildSeconds)}</strong></article>
      <article><span>BUILD TIME LEFT</span><strong>${formatDuration(coverage.buildLeft)}</strong></article>
      <article><span>PLANNED RESEARCH TIME</span><strong>${formatDuration(plan.researchSeconds)}</strong></article>
      <article><span>RESEARCH TIME LEFT</span><strong>${formatDuration(coverage.researchLeft)}</strong></article>
      <article><span>GENERAL SPEEDUPS SPARE</span><strong>${formatDuration(coverage.generalLeft)}</strong></article>
    </div><p>Build and research speedups go first. General speedups then cover building time, then research time.</p></details>
    <form id="speedupForm" class="speedup-form power-fields">${groups}</form>
    ${gearReference()}`;
}
function gearReference() {
  if (!GAME.gear.length) return '';
  const chips = resources => Object.entries(resources).filter(([, count]) => count).map(([name, count]) => `<span><b>${formatNumber(count)}</b> ${escapeHtml(resourceTitles[name] || name)}</span>`).join('');
  const rows = GAME.gear.map(table => {
    const toMax = tableCost(table, 0, table.levels).resources;
    const promotion = table.steps > table.levels ? tableCost(table, table.levels, table.steps).resources : null;
    return `<article><h3>${escapeHtml(equipmentQualities[table.quality - 1])}</h3>
      <div class="upgrade-analytics"><strong>CRAFT ONE PIECE</strong>${chips(table.craft)}${Object.entries(table.craft).filter(([name]) => steelPerMaterial[name]).map(([name, count]) => `<span>= <b>${formatNumber(count * steelPerMaterial[name])}</b> Steel</span>`).join('')}<span><b>${formatDuration(table.craftSeconds)}</b> TIME</span><span>Gear Craft Center Lv ${table.craftBuildingLevel}</span></div>
      <div class="upgrade-analytics"><strong>LV 0 TO ${table.levels}</strong>${chips(toMax)}</div>
      ${promotion ? `<div class="upgrade-analytics"><strong>ALL ${table.steps - table.levels} PROMOTION STAGES</strong>${chips(promotion)}</div>` : ''}</article>`;
  }).join('');
  return `<details open class="panel grand-plan gear-reference"><summary><div><p class="eyebrow">PER PIECE · ALL SLOTS COST THE SAME</p><h2>Gear crafting and upgrades</h2></div><a class="button secondary" href="#heroes">Set hero gear</a></summary><div class="gear-tables">${rows}</div><p>Base costs. Crafting speed and oil cost research are not applied. R gear cannot be crafted or upgraded. Materials merge 4 to 1: Steel, Steel Component, Heat-resistant Gold, Composite Material, Conductive Crystal.</p></details>`;
}

function plannerPage() {
  pageHeader('PLANNING', 'Goal planner');
  const buildingOptions = GAME.buildings.map(def => `<option value="b:${def.id}">${escapeHtml(def.name)}</option>`).join('');
  const researchOptions = researchTrees.map(tree => `<optgroup label="${escapeHtml(tree.name)}">${nodesInTree(tree).map(node => `<option value="r:${node.id}">${escapeHtml(node.name)}</option>`).join('')}</optgroup>`).join('');
  return `<section class="page-intro"><div><p class="eyebrow">GOAL PLANNER</p><h2>What does it take?</h2><p>Pick a building or research and a level. The planner adds every prerequisite you are still missing, based on your saved levels.</p></div></section>
    ${bonusPanel()}
    <section class="objective-calculator"><div><p class="eyebrow">CHOOSE A GOAL</p><h2>Goal</h2><p>Multi-copy buildings use your highest copy.</p></div><form id="goalForm"><label>GOAL<select name="goal"><optgroup label="Buildings">${buildingOptions}</optgroup>${researchOptions}</select></label><label>TARGET LEVEL<input name="level" type="number" min="1" max="30" value="${Math.min(30, hqLevel() + 1)}" required></label><button class="button primary" type="submit">Plan goal</button></form><div id="goalResult" class="objective-result">Choose a goal to see every upgrade it needs.</div></section>
    ${targetList()}`;
}
const categoryNames = { building: 'Building', research: 'Research', 'hero-level': 'Hero level', 'hero-star': 'Hero stars', 'hero-skill': 'Hero skill', 'hero-gear': 'Exclusive weapon', 'hero-equip': 'Hero gear', 'fighter-level': 'Fighter level', 'fighter-chip': 'Wingman chip', 'fighter-component': 'Fighter component', 'fighter-evolution': 'Fighter evolution', alliance: 'Alliance research', 'survivor-star': 'Survivor stars' };
function objectiveName(category, item) {
  if (category === 'research') return researchById.get(Number(item))?.name || item;
  if (category.startsWith('hero')) { const [id, part] = String(item).split('|'); const hero = heroForItem(id); return `${hero?.name || id}${hero?.promoted ? ' UR' : ''}${part ? ` · ${/^\d$/.test(part) ? `Skill ${part}` : part}` : ''}`; }
  if (category === 'fighter-chip') return fighterChip(Number(item))?.name || `Chip slot ${Number(item) + 1}`;
  if (category === 'fighter-component') return GAME.fighter.componentSlots[Number(item)] || item;
  if (category === 'fighter-level') return 'Fighter';
  if (category === 'fighter-evolution') return 'Evolution';
  if (category === 'survivor-star') return state.survivors.find(person => person.id === item)?.name || item;
  return item;
}
function objectiveLevel(category, value) { return category === 'fighter-level' ? fighterRowLabel(value) : `Lv ${value}`; }
function targetList() {
  const objectives = planObjectives();
  const rows = objectives.map(objective => { const plan = calculateUpgrade(objective.category, objective.item, objective.current, objective.target); return `<article><div><span>${escapeHtml(categoryNames[objective.category] || objective.category).toUpperCase()}</span><b>${escapeHtml(objectiveName(objective.category, objective.item))}</b><small>${objectiveLevel(objective.category, objective.current)} → ${objectiveLevel(objective.category, objective.target)}</small></div><div class="target-cost">${costChips(plan, objective.category, objective.item)}</div><button type="button" class="delete-target" data-delete-target="${escapeHtml(targetKey(objective.category, objective.item))}" aria-label="Delete this goal">✕</button></article>`; }).join('');
  return `<details open class="panel grand-plan target-list"><summary><div><p class="eyebrow">${objectives.length} SAVED</p><h2>Your goals</h2></div>${objectives.length ? '<button type="button" class="button secondary" data-clear-targets>Delete all</button>' : ''}</summary>${rows || '<p>No goals yet. Set a target on any building, research node, hero, or fighter part and it shows up here.</p>'}</details>`;
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
  </form><p>Building speed <b>${formatPercent(bonus.building)}</b> (VIP ${formatPercent(bonus.vip)} + research ${formatPercent(bonus.researchBuilding)}) · Research speed <b>${formatPercent(bonus.research)}</b> · Building cost cut <b>${formatPercent(bonus.buildingCost)}</b>${flatNote(bonus)}</p></section>`;
}

/* ---------- Pages ---------- */

function overviewPage() {
  pageHeader('COMMAND CENTER', 'Overview');
  const builtSlots = buildings.filter(item => (state.buildings[item.name] || 0) > 0).length;
  const researchDone = researchNodes.reduce((sum, node) => sum + researchLevel(node.id), 0);
  const power = powerTotals();
  return `<section class="hero-banner"><div><span class="chapter">SERVER 52 · EXPEDITIONCORPS [EXC]</span><h2>Plan the road<br><strong>ahead.</strong></h2><p>Record progress, power, and exact requirements from one local profile.</p></div><div class="level-control summary"><span>TOTAL POWER</span><strong>${formatNumber(power.total)}</strong><small>Unknown values currently count as 0</small></div></section>
  ${grandPlanMarkup()}
  ${fighterOverview()}
  <section class="power-summary"><header><div><p class="eyebrow">COMMANDER ANALYTICS</p><h2>Power level</h2></div><button class="button secondary" data-edit-profile>Edit power data</button></header><div>${Object.entries({Hero:power.hero,Soldier:power.soldier,Building:power.building,Tech:power.tech,Fighter:power.fighter}).map(([name,value])=>`<article><span>${iconImg('assets/icons/ui/power.webp', 'chip-icon')}${name.toUpperCase()} POWER</span><strong>${formatNumber(value)}</strong></article>`).join('')}</div><p>⚠ Unknown power values default to 0 until all data for each field has been completed.</p></section>
  <section class="stats-grid"><article class="stat-card"><div class="stat-icon orange">⌂</div><div><span>BUILDINGS BUILT</span><strong>${builtSlots} / ${buildings.length}</strong><small>HQ level ${hqLevel()}</small></div></article><article class="stat-card"><div class="stat-icon green">⌬</div><div><span>RESEARCH LEVELS</span><strong>${formatNumber(researchDone)}</strong><small>Across ${researchTrees.length} trees</small></div></article><article class="stat-card"><div class="stat-icon gold">♙</div><div><span>HEROES OWNED</span><strong>${state.ownedHeroes.length} / ${heroes.length}</strong><small>From the game roster</small></div></article><article class="stat-card"><div class="stat-icon blue">◇</div><div><span>ALLIANCE LEVELS</span><strong>${Object.values(state.alliance).reduce((a,b)=>a+b,0)}</strong><small>Entered by you</small></div></article></section>
  <section class="quick-grid"><a class="quick-card" href="#construction"><span>01</span><h3>Construction</h3><p>Set building levels and see the cost of every upgrade.</p><b>Open tracker →</b></a><a class="quick-card" href="#research"><span>02</span><h3>Research</h3><p>Track every research node and its cost.</p><b>Open research →</b></a><a class="quick-card" href="#planner"><span>03</span><h3>Goal planner</h3><p>See everything an HQ or research goal needs.</p><b>Open planner →</b></a><a class="quick-card" href="#heroes"><span>04</span><h3>Hero roster</h3><p>Plan EXP, shards, and skill books.</p><b>Open heroes →</b></a><a class="quick-card" href="#survivors"><span>05</span><h3>Survivors</h3><p>Assign specialists and plan their stars.</p><b>Open survivors →</b></a></section>`;
}

function fighterOverview() {
  const row = state.fighter.row; const max = fighterRows.length;
  if (max <= 1) return '';
  const target = Math.max(row, targetFor('fighter-level', 'fighter', row));
  const toTarget = target > row ? calculateUpgrade('fighter-level', 'fighter', row, target) : null;
  const toMax = calculateUpgrade('fighter-level', 'fighter', row, max);
  const values = plan => ['combatChips', 'fighterParts'].map(name => `<article><span>${iconImg(GAME.resourceIcons?.[name], 'chip-icon')}${resourceTitles[name].toUpperCase()}</span><strong>${formatNumber(plan.resources[name])}</strong></article>`).join('');
  return `<section class="grand-plan"><header><div><p class="eyebrow">FIGHTER · NOW ${fighterRowLabel(row).toUpperCase()}</p><h2>Fighter needs</h2></div><a class="button secondary" href="#fighter">Open fighter</a></header>
    ${toTarget ? `<p class="eyebrow">TO TARGET ${fighterRowLabel(target).toUpperCase()}</p><div class="grand-plan-values">${values(toTarget)}</div>` : '<p>No fighter target set.</p>'}
    <p class="eyebrow">TO MAX ${fighterRowLabel(max).toUpperCase()}</p><div class="grand-plan-values">${values(toMax)}</div></section>`;
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

const ui = { buildingSearch: '', hideLocked: false, collapsed: new Set(), openCards: new Set(), selectedNode: {}, closedPanels: new Set(), openHeroes: new Set(), heroOwnedOnly: false, heroTabs: {} };
function isLocked(item) {
  if (item.research) return researchLevel(item.research) < 1;
  return item.name !== 'HQ' && hqLevel() < item.unlock;
}
// One collapsible card per building. Each copy is a row with its own level and target.
function buildingCard(def, slots) {
  const open = ui.openCards.has(def.id);
  const rows = slots.map(item => {
    const level = Number(state.buildings[item.name]) || 0; const locked = isLocked(item);
    const label = slots.length > 1 ? `Copy ${item.slot + 1}` : 'Level';
    return `<div class="copy-row ${locked ? 'locked' : ''}"><div class="copy-label"><b>${label}${locked ? ' <small class="lock-tag">LOCKED</small>' : ''}</b>${item.description ? `<small>${escapeHtml(item.description)}</small>` : ''}${!locked && level < def.max ? nextLevelNeeds(def.req[level]) : ''}</div>${levelControl('buildings', item.name, level, def.max)}${def.max > 1 ? targetControl('building', item.name, level, def.max) : planSummary('building', item.name, level, level, def.max)}</div>`;
  }).join('');
  const unlocked = slots.filter(item => !isLocked(item));
  const levels = slots.map(item => isLocked(item) ? '–' : Number(state.buildings[item.name]) || 0);
  const output = slots.reduce((sum, item) => sum + (slotOutput(item)?.perHour || 0), 0);
  const producer = producerFor(def);
  const plan = slots.reduce((sum, item) => {
    const level = Number(state.buildings[item.name]) || 0; const target = targetFor('building', item.name, level);
    if (target <= level) return sum;
    const cost = calculateUpgrade('building', item.name, level, target);
    planResources.forEach(name => { sum.resources[name] += cost.resources[name]; }); sum.seconds += cost.seconds; sum.any = true; return sum;
  }, { resources: emptyResources(), seconds: 0, any: false });
  const allMax = unlocked.length && unlocked.every(item => (Number(state.buildings[item.name]) || 0) >= def.max);
  return `<details class="building-card ${unlocked.length ? '' : 'locked'}" data-def="${def.id}" data-search="${escapeHtml(def.name.toLowerCase())}" ${open ? 'open' : ''}>
    <summary><div class="tracker-icon">${def.icon ? iconImg(def.icon) : slots[0].icon}</div>
      <div class="building-head"><h3>${escapeHtml(def.name)}${unlocked.length ? '' : ' <small class="lock-tag">LOCKED</small>'}</h3>
        <p>${slots.length > 1 ? `${unlocked.length} / ${slots.length} copies · ` : ''}max ${def.max}${producer && output ? ` · <span class="output-note">${formatNumber(output)} ${escapeHtml(producer.output)}/hr</span>` : ''}</p></div>
      <div class="building-levels"><span>${slots.length > 1 ? 'LEVELS' : 'LEVEL'}</span><b>${levels.join(' · ')}</b>${allMax ? '<small class="plan-ready">MAX</small>' : ''}</div>
      ${plan.any ? `<div class="building-plan"><span>TO TARGET</span>${costChips(plan, 'building', def.name)}</div>` : ''}
    </summary>
    <div class="copy-rows">${slots.length > 1 && unlocked.length ? `<div class="bulk-row"><span>ALL ${unlocked.length} UNLOCKED COPIES</span><label>LEVEL<input class="bulk-level" type="number" min="1" max="${def.max}" value="${Math.max(...unlocked.map(item => Number(state.buildings[item.name]) || 0))}"></label><button type="button" class="button secondary" data-bulk-set="${def.id}">Set all</button><button type="button" class="button secondary" data-bulk-max="${def.id}">Max all</button></div>` : ''}${rows}</div></details>`;
}
function autoFillToggle() {
  return `<label class="check" title="Raising a level also raises the buildings and research it needed"><input class="auto-fill-toggle" type="checkbox" ${state.prefs.autoFill ? 'checked' : ''}> Auto-fill prerequisites</label>`;
}
function constructionPage() {
  pageHeader('SETTLEMENT', 'Construction');
  return `<section class="page-intro"><div><p class="eyebrow">BUILDING DIRECTORY</p><h2>Your settlement levels</h2><p>Tap a building to open it and set each copy's level and target. The closed card shows your levels and the total cost to your targets.</p></div><div class="completion-ring"><strong>HQ ${hqLevel()}</strong><span>${buildings.filter(item => !isLocked(item)).length} / ${buildings.length} UNLOCKED</span></div></section>
  ${bonusPanel()}
  <section class="toolbar"><label>SEARCH<input id="buildingSearch" type="search" placeholder="Find a building" value="${escapeHtml(ui.buildingSearch)}"></label><label class="check"><input id="hideLocked" type="checkbox" ${ui.hideLocked ? 'checked' : ''}> Hide locked buildings and copies</label>${autoFillToggle()}<button type="button" class="button secondary" data-fill-all>Fill missing prerequisites</button><small class="hotkey-tip">Tip: press M in a level or target box to max it.</small><span class="toolbar-actions"><button type="button" class="button secondary" data-cards="open">Open all</button><button type="button" class="button secondary" data-cards="close">Close all</button></span></section>
  ${constructionGroups.map(group => { const levels = group.buildings.reduce((sum, item) => sum + (Number(state.buildings[item.name]) || 0), 0); const max = group.buildings.reduce((sum, item) => sum + item.def.max, 0); return `<details class="construction-group" data-group="${group.name}" ${ui.collapsed.has(group.name) ? '' : 'open'}><summary><div><p class="eyebrow">CONSTRUCTION</p><h2>${group.name}</h2></div><span>${new Set(group.buildings.map(item => item.def)).size} ${group.buildings.length === 1 ? 'BUILDING' : 'BUILDINGS'} · ${levels} / ${max} LEVELS</span><span class="group-actions"><button type="button" class="button secondary" data-group-target="max" data-group-name="${group.name}">Target max</button><button type="button" class="button secondary" data-group-target="clear" data-group-name="${group.name}">Clear targets</button></span></summary><div class="building-list">${[...new Set(group.buildings.map(item => item.def))].map(def => buildingCard(def, group.buildings.filter(item => item.def === def))).join('')}</div></details>`; }).join('')}
  <p class="source-note">Times include the speed bonuses above. Resource costs include the research building cost cut and flat cost cuts. Event bonuses are not applied.</p>`;
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
// What a locked node still needs before its first level.
function lockNote(node) {
  if (nodeStatus(node) !== 'locked') return '';
  const missing = (node.req[0] || []).filter(req => !requirementMet(req)).map(requirementLabel).join(', ');
  return `<em class="node-lock" title="Needs ${escapeHtml(missing)}">🔒 Needs ${escapeHtml(missing)}</em>`;
}
function researchTreeMarkup(tree, selected) {
  const nodes = nodesInTree(tree);
  const { rows, column } = treeLayout(nodes);
  const rowHeight = 128; const tileHeight = 98; const height = rows.length * rowHeight;
  const x = id => (column.get(id) * 2 + 1) * 100;
  const y = node => node.tier * rowHeight + rowHeight / 2;
  const lines = nodes.flatMap(node => node.parents.map(id => { const parent = researchById.get(id); return `<line class="${researchLevel(id) > 0 ? 'done' : ''}" x1="${x(id)}" y1="${y(parent) + tileHeight / 2}" x2="${x(node.id)}" y2="${y(node) - tileHeight / 2}" vector-effect="non-scaling-stroke"/>`; })).join('');
  const tiles = nodes.map(node => { const level = researchLevel(node.id); return `<button type="button" class="tree-node ${nodeStatus(node)} ${selected?.id === node.id ? 'selected' : ''}" data-node="${node.id}" style="left:${x(node.id) / 6}%;top:${y(node) - tileHeight / 2}px;height:${tileHeight}px">${iconImg(node.icon, 'node-icon')}<b>${escapeHtml(node.name)}</b><small>LV ${level} / ${node.max}</small>${lockNote(node)}<i style="--fill:${level / node.max * 100}%"></i></button>`; }).join('');
  return `<div class="research-tree" style="height:${height}px"><svg viewBox="0 0 600 ${height}" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>${tiles}</div>`;
}
function researchDetail(node) {
  const level = researchLevel(node.id);
  const reqs = node.req[Math.min(level, node.max - 1)] || [];
  const effects = node.effects.map(effect => `<li><b>${escapeHtml(effect.name)}</b><span>${level ? formatEffect(effect.values[level - 1]) : '0'}${level < node.max ? ` → ${formatEffect(effect.values[level])}` : ''} · max ${formatEffect(effect.values[node.max - 1])}</span></li>`).join('');
  return `<aside class="node-detail" id="nodeDetail"><p class="eyebrow">RESEARCH NODE</p><h2>${iconImg(node.icon, 'detail-icon')}${escapeHtml(node.name)}</h2>
    <div class="node-level">${levelControl('research', node.id, level, node.max)}<small>${level >= node.max ? 'Maxed' : `Level ${level} of ${node.max}`}</small></div>
    ${effects ? `<ul class="node-effects">${effects}</ul>` : ''}
    ${level < node.max ? `<p class="eyebrow">${level ? 'NEXT LEVEL NEEDS' : 'UNLOCK NEEDS'}</p><ul class="node-reqs">${reqs.length ? reqs.map(req => `<li class="${requirementMet(req) ? 'met' : ''}">${requirementMet(req) ? '✓' : '✗'} ${escapeHtml(requirementLabel(req))}</li>`).join('') : '<li class="met">✓ Nothing</li>'}</ul>` : ''}
    ${targetControl('research', String(node.id), level, node.max)}
    ${node.parents.length ? `<button type="button" class="button secondary path-max" data-path-max="${node.id}">Max this node and every node before it</button>` : ''}</aside>`;
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
      ${total > 0 && done >= total ? '<div class="max-banner wide">MAX LEVEL REACHED</div>' : ''}<div class="tree-tools">${autoFillToggle()}<button type="button" class="button secondary" data-tree-max="${selectedTree.gameId}">Max whole tree</button><button type="button" class="button secondary" data-tree-clear="${selectedTree.gameId}">Reset tree to 0</button></div>
      <div class="tree-legend"><span class="maxed">Maxed</span><span class="progress">In progress</span><span class="available">Ready to start</span><span class="locked">Locked</span><small>Tap a node to set its level and target. Press M to max the selected node.</small></div>
      <div class="tree-layout">${researchTreeMarkup(selectedTree, selected)}${researchDetail(selected)}</div>`;
  }

  return `<section class="page-intro research-intro"><div><p class="eyebrow">RESEARCH DIRECTORY</p><h2>Choose a research tree</h2><p>Each tree is laid out from the game data. Open one to set levels node by node.</p></div><div class="completion-ring"><strong>${researchTrees.length}</strong><span>RESEARCH TREES</span></div></section>
    ${bonusPanel()}
    <section class="research-directory" aria-labelledby="research-directory-title">
      <header><div><p class="eyebrow">TECH LAB</p><h2 id="research-directory-title">Research categories</h2></div><span>SELECT A TREE TO OPEN</span></header>
      <div class="research-tree-grid">${researchTrees.map((tree, index) => { const nodes = nodesInTree(tree); const done = nodes.reduce((sum, node) => sum + researchLevel(node.id), 0); const total = nodes.reduce((sum, node) => sum + node.max, 0); const maxed = total > 0 && done >= total; return `<a class="research-tree-card ${maxed ? 'maxed' : ''}" href="#research/${tree.id}" aria-label="Open ${escapeHtml(tree.name)} research tree"><div class="research-tree-image" aria-hidden="true">${maxed ? '<b class="max-banner">MAX LEVEL REACHED</b>' : ''}${tree.icon ? iconImg(tree.icon) : '<span>⌬</span>'}<small>${Math.round(done / total * 100)}%</small></div><div><span>${String(index + 1).padStart(2, '0')}</span><h3>${escapeHtml(tree.name)}</h3><small>${nodes.length} NODES · ${done}/${total} LEVELS →</small>${tree.req.some(req => !requirementMet(req)) ? `<small class="req-note">Needs ${escapeHtml(tree.req.filter(req => !requirementMet(req)).map(requirementLabel).join(', '))}</small>` : ''}</div></a>`; }).join('')}</div>
    </section>`;
}

function branchPage(type, title, subtitle, branches) {
  pageHeader(type === 'research' ? 'TECH LAB' : 'ALLIANCE', title);
  return `<section class="page-intro"><div><p class="eyebrow">LEVEL TRACKER</p><h2>${title}</h2><p>${subtitle}</p></div></section><div class="branch-layout"><aside class="branch-nav">${Object.keys(branches).map((name,i)=>`<a href="#branch-${type}-${i}"><i></i>${name}</a>`).join('')}</aside><section class="branch-content">${Object.entries(branches).map(([branch, items],i)=>`<article class="branch-panel" id="branch-${type}-${i}"><header><div><p class="eyebrow">${type === 'research' ? 'RESEARCH BRANCH' : 'ALLIANCE BRANCH'}</p><h3>${branch}</h3></div><span>${items.reduce((sum,name)=>sum+state[type][name],0)} LEVELS</span></header>${items.map(name=>`<div class="tech-row"><div><b>${name}</b><p>Enter the level shown in game</p></div>${levelControl(type,name,state[type][name],30)}${targetControl(type,name,state[type][name],30)}</div>`).join('')}</article>`).join('')}</section></div>`;
}

function fighterPage() {
  pageHeader('MILITARY', 'Fighter');
  const max = fighterRows.length;
  const current = state.fighter.row;
  const target = fighterTargetRow();
  const chips = GAME.fighter.chipSlots.map((slotName, slot) => {
    const saved = state.fighter.chips[slot]; const chip = fighterChip(slot);
    const options = `<option value="0">None</option>${GAME.fighter.chips.filter(item => item.slot === slot).map(item => `<option value="${item.id}" ${item.id === chip?.id ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}`;
    const stars = chip?.copies.length ? `<label>STARS<input class="fighter-chip-star" data-slot="${slot}" type="number" min="0" max="${chip.copies.length}" value="${Number(saved.star) || 0}"></label>${targetControl('fighter-chip', String(slot), Number(saved.star) || 0, chip.copies.length, 'TARGET STARS')}` : chip ? '<small>This chip has no star upgrades.</small>' : '';
    return `<article class="gear-slot">${iconImg(chip?.icon, 'slot-icon')}<label>${slotName.toUpperCase()} CHIP<select class="fighter-chip" data-slot="${slot}">${options}</select></label>${stars}</article>`;
  }).join('');
  const componentMax = GAME.fighter.componentCost.length;
  const components = GAME.fighter.componentSlots.map((name, slot) => {
    const level = state.fighter.components[slot];
    const art = GAME.fighter.componentIcons?.[slot]?.[Math.max(0, level - 1)];
    return `<article class="gear-slot">${iconImg(art, 'slot-icon')}<label>${escapeHtml(name.toUpperCase())}<input class="fighter-component" data-slot="${slot}" type="number" min="0" max="${componentMax}" value="${level}"></label>${targetControl('fighter-component', String(slot), level, componentMax)}</article>`;
  }).join('');
  return `<section class="page-intro"><div><p class="eyebrow">FIGHTER</p><h2>Fighter planner</h2><p>Set your fighter level and stage as the game shows it, then pick a target. Every 5th level, and every level after 150, has five key upgrade stages that also cost Fighter Parts.</p></div></section>
    <details open class="panel grand-plan"><summary><div><p class="eyebrow">NOW ${fighterRowLabel(current).toUpperCase()}</p><h2>Fighter level</h2></div></summary>
      <div class="fighter-level">${fighterLevelPicker('current', current)}${fighterLevelPicker('target', target, current)}</div>
      ${planSummary('fighter-level', 'fighter', current, target, max)}
      <p>Assumes no bonus progress. Lucky bonus clicks make real costs lower.</p></details>
    <details open class="panel grand-plan"><summary><div><p class="eyebrow">COMPONENTS</p><h2>Component levels</h2></div></summary><div class="gear-tables">${components}</div><p>Level 0 means the slot is empty. Up to level 8, three pieces merge into one. After that, pieces are fed as XP. Costs are shown as Lv 1 component copies: a level L piece counts as 3^(L-1) copies.</p></details>
    <details open class="panel grand-plan"><summary><div><p class="eyebrow">EVOLUTION</p><h2>Evolution level</h2></div></summary><div class="gear-tables"><article class="gear-slot"><label>LEVEL<input class="fighter-evolution" type="number" min="0" max="${GAME.fighter.evolutionXp.length}" value="${state.fighter.evolution}"></label>${targetControl('fighter-evolution', 'evolution', state.fighter.evolution, GAME.fighter.evolutionXp.length)}</article></div><p>Level 0 means not activated. The activation cost and which items give evolution XP are not in the data.</p></details>
    <details open class="panel grand-plan"><summary><div><p class="eyebrow">WINGMAN CHIPS</p><h2>Chip stars</h2></div></summary><div class="gear-tables">${chips}</div><p>Star upgrades cost copies of the same chip. </p></details>`;
}

// Planned features. Status is Planned, Needs data (blocked on a data source), or Idea.
const roadmap = [
  { title: 'Server tracker', status: 'Planned', text: 'Track server activity: player counts, top power, new arrivals, and the event schedule for your server.', needs: 'A shared database that members or a bot feed, since the site has no server access on its own.' },
  { title: 'Alliance tracker', status: 'Planned', text: 'Track your alliance power, membership, and joins and leaves over time. Members can sync their base stats to show alliance totals and averages.', needs: 'Member sync through a shared database.' },
  { title: 'VS tracker', status: 'Planned', text: 'Record VS scores per day and per member, show participation history, and flag missed days.', needs: 'Daily score entry or screenshot import.' },
  { title: 'Quick entry', status: 'Done', text: 'Raising a level also fills in the buildings and research it needed (with Undo). Set or max all copies of a building at once, max a whole research tree, or max a node and every node before it.' },
  { title: 'Screenshot import', status: 'Next', text: 'Upload a game screenshot, such as your resource totals or a building screen, and the site reads the numbers and fills them in for you.', needs: 'Image text recognition. It can run in the browser, so screenshots never leave your device.' },
  { title: 'Inventory and "can I afford it"', status: 'Idea', text: 'Enter what you own (resources, speedups, gear materials, chips) and see what is left to farm for each target, plus how long your production takes to cover it.' },
  { title: 'Event calendar', status: 'Idea', text: 'Upcoming events and season unlocks with reminders, so you save speedups and resources for the right day.' },
  { title: 'Export and import code', status: 'Planned', text: 'Copy all your saved levels as one code and paste it on another device, so nobody types their data twice.' },
  { title: 'Share and compare plans', status: 'Idea', text: 'Export your profile as a link so alliance leaders can see member progress and compare plans.' },
  { title: 'Formation builder', status: 'Idea', text: 'Build squads from your roster and compare hero power, classes, and gear.' },
  { title: 'Alliance research and survivors', status: 'Needs data', text: 'Replace the manual observation pages with full cost tables once the game data is found.' }
];
function roadmapPage() {
  pageHeader('PLANNING', 'Roadmap');
  return `<section class="page-intro"><div><p class="eyebrow">ROADMAP</p><h2>Planned features</h2><p>What is coming next. Have an idea? Tell the site owner.</p></div></section>
    <section class="roadmap">${roadmap.map(item => `<article><header><h3>${escapeHtml(item.title)}</h3><i class="status ${slug(item.status)}">${escapeHtml(item.status)}</i></header><p>${escapeHtml(item.text)}</p>${item.needs ? `<small>Needs: ${escapeHtml(item.needs)}</small>` : ''}</article>`).join('')}</section>`;
}

function heroesPage() {
  pageHeader('FORMATION', 'Heroes');
  const cap = heroCap();
  return `<section class="page-intro hero-intro"><div><p class="eyebrow">HERO DIRECTORY</p><h2>Your hero roster</h2><p>Track ownership, levels, star power, skills, and equipment. Your HQ ${hqLevel()} hero level cap is ${cap}.</p></div><div class="hero-cap"><span>HERO LEVEL CAP</span><strong>${cap}</strong><small>HQ 30 max · −5 per HQ level</small></div></section>
  <div class="hero-legend"><span><i class="rarity SR">SR</i> Rare</span><span><i class="rarity SSR">SSR</i> Super rare</span><span><i class="rarity UR">UR</i> Ultimate rare</span><span>FL · Frontline</span><span>BL · Backline</span><span>S · Support</span></div>
  <section class="toolbar"><label class="check"><input id="heroOwnedOnly" type="checkbox" ${ui.heroOwnedOnly ? 'checked' : ''}> Show only heroes in my roster</label><span class="toolbar-actions"><button type="button" class="button secondary" data-heroes="open">Open all</button><button type="button" class="button secondary" data-heroes="close">Close all</button></span></section>
  ${['Warrior','Assault','Tactical'].map(heroClass => { const list = heroes.filter(item => item.heroClass === heroClass); const shown = ui.heroOwnedOnly ? list.filter(item => state.ownedHeroes.includes(item.id)) : list; const owned = list.filter(item => state.ownedHeroes.includes(item.id)).length; return shown.length ? `<details open class="panel hero-class"><summary>${iconImg(GAME.classIcons?.[heroClass], 'class-icon')}<div><p class="eyebrow">HERO CLASS</p><h2>${heroClass}</h2></div><span>${owned} / ${list.length} OWNED</span></summary><div class="hero-grid">${shown.map(item => heroCard(item, list.indexOf(item), cap)).join('')}</div></details>` : ''; }).join('') || '<p class="empty-note">No heroes in your roster yet. Untick the filter to add some.</p>'}
  <p class="source-note">Hero EXP, star shards (5 / 10 / 20 / 60 / 100 per subsection, 975 total), and skill books come from the game data. Skill level caps rise with stars.</p>`;
}

// Aria SSR promotes to Aria UR at 5 stars. Stars drop to 3 and each step costs double shards.
const promotedVersion = hero => heroes.find(other => other.promoted && other.name === hero.name && other.id !== hero.id);
function promotionNote(hero, owned, progress) {
  if (hero.promoted) return `<p class="promo-note">Promoted from ${escapeHtml(hero.name)} SSR at 5 ★. Stars restart at 3 ★ and each star step costs double shards.</p>`;
  const promoted = promotedVersion(hero); if (!promoted) return '';
  const ready = owned && progress.starSteps >= 25 && !state.ownedHeroes.includes(promoted.id);
  return `<p class="promo-note">Can promote to UR at 5 ★.${ready ? ` <button type="button" class="promote-button" data-promote="${hero.id}">Promote to UR</button>` : ''}</p>`;
}
function heroHasTargets(hero) {
  return Object.keys(state.targets).some(key => key.split(':')[1]?.split('|')[0] === hero.id && Number(state.targets[key]) > 0);
}
// In-game style tabs inside a hero's manage panel. The open tab is remembered per hero.
function heroTabs(hero, tabs) {
  const active = ui.heroTabs?.[hero.id] || 'level';
  return `<div class="hero-tabs" role="tablist">${tabs.map(([key, label]) => `<button type="button" role="tab" class="${key === active ? 'active' : ''}" data-hero-tab="${key}" data-id="${hero.id}" aria-selected="${key === active}">${label}</button>`).join('')}</div>
    <div class="hero-details">${tabs.map(([key, , body]) => `<div class="hero-pane ${key === active ? 'active' : ''}" data-pane="${key}">${body}</div>`).join('')}</div>`;
}
function heroCard(item, index, cap) {
  const owned = state.ownedHeroes.includes(item.id);
  const progress = heroProgress(item);
  const stars = (progress.starSteps / 5).toFixed(1).replace('.0', '');
  const limit = skillCap(progress.starSteps);
  const skillMax = GAME.skillBooks[item.skillCurve]?.length || 30;
  const wholeStars = Math.floor(progress.starSteps / 5);
  const info = item.skills?.length ? item.skills : skillSlots.map(slot => ({ slot, name: `Skill ${slot}` }));
  const skills = info.map(skill => {
    const slot = skill.slot; const levelable = heroSkillSlots(item).includes(slot);
    const level = Math.min(limit, Number(progress.skills[slot]) || 1);
    const effect = skill.byStar?.[wholeStars] || skill.description || '';
    const nextStar = skill.starUpgrades?.[wholeStars];
    const starList = skill.starUpgrades?.length ? `<ol class="skill-stars">${skill.starUpgrades.map((text, star) => `<li class="${star < wholeStars ? 'got' : ''}"><span>${'★'.repeat(star + 1)}</span>${escapeHtml(text)}</li>`).join('')}</ol>` : '';
    return `<div class="skill-quad"><header><div class="skill-badge">${iconImg(item.skillIcons?.[slot - 1], 'skill-icon')}<em>Lv.${levelable ? level : 1}</em></div><div><b>${escapeHtml(skill.name)}</b><small>${escapeHtml([skill.type, skill.cooldown && skill.cooldown !== 'Passive' ? `CD ${skill.cooldown}` : ''].filter(Boolean).join(' · '))}</small><small class="skill-unlock">${escapeHtml(skill.unlock || '')}</small></div></header>
      ${effect ? `<p class="skill-effect">${escapeHtml(effect)}${skill.byStar?.length ? ` <i>(max level at ${wholeStars} ★)</i>` : ''}</p>` : ''}
      ${starList}
      ${levelable ? `<div class="level-pair"><label class="now-input">LEVEL<input class="hero-skill" data-id="${item.id}" data-slot="${slot}" type="number" min="1" max="${limit}" value="${level}"><small>cap ${limit}</small></label>${targetControl('hero-skill', `${item.id}|${slot}`, level, skillMax)}</div>` : '<p class="skill-fixed">Fixed skill. No skill books needed.</p>'}</div>`;
  }).join('');
  return `<article class="hero-card ${owned?'owned':''}" data-rarity="${item.rarity}" ${owned ? `data-open-hero="${item.id}" title="Click to manage ${escapeHtml(item.name)}"` : ''}>${owned ? `<button type="button" class="hero-collapse" data-close-hero="${item.id}" aria-label="Collapse ${escapeHtml(item.name)}">✕</button>` : ''}
    <div class="hero-summary"><div class="hero-portrait"><span>${String(index+1).padStart(2,'0')}</span>${item.icon ? iconImg(item.icon, 'hero-head') : item.name[0]}</div><div class="hero-identity"><div class="hero-badges"><i class="rarity ${item.rarity}">${item.rarity}</i><i>${item.type} · ${typeNames[item.type]}</i></div><h3>${item.name}${item.promoted?'<small>PROMOTED</small>':''}</h3><button data-hero="${item.id}">${owned?'✓ IN MY ROSTER':'+ ADD TO ROSTER'}</button></div></div>${promotionNote(item, owned, progress)}
    ${owned?`<details class="hero-manage" data-hero-id="${item.id}" ${ui.openHeroes.has(item.id) ? 'open' : ''}><summary><b>Lv ${Math.min(progress.level, cap)} · ${stars} ★ · skills ${heroSkillSlots(item).map(slot => Math.min(limit, Number(progress.skills[slot]) || 1)).join('/')}</b>${heroHasTargets(item) ? '<small class="plan-ready">TARGETS SET</small>' : ''}</summary>${heroTabs(item, [
        ['level', 'Level Up', `<section class="manage-block"><h4>HERO LEVEL</h4><div class="level-pair"><label class="now-input">CURRENT<input class="hero-level" data-id="${item.id}" type="number" min="1" max="${cap}" value="${Math.min(progress.level,cap)}"><small>/ ${cap}</small></label>${targetControl('hero-level', item.id, progress.level, item.maxLevel)}</div></section><section class="manage-block"><h4>EQUIPMENT</h4><div class="gear-rows">${equipmentSlots.map(slot=>equipmentControl(item, progress, slot)).join('')}</div></section>${hasGear(item) ? `<section class="manage-block"><h4>${iconImg(GAME.exclusiveGear[item.gameId]?.icon, 'inline-icon')}EXCLUSIVE WEAPON</h4><div class="level-pair"><label class="now-input">LEVEL<input class="hero-gear" data-id="${item.id}" type="number" min="0" max="${gearMax()}" value="${Number(progress.gear) || 0}"></label>${targetControl('hero-gear', item.id, Number(progress.gear) || 0, gearMax())}</div><small class="gear-note">Level 0 means not unlocked. Unlock cost is not in the data.</small></section>` : ''}`],
        ['skill', 'Skill', `<section class="manage-block skills"><h4>SKILLS · LEVEL CAP ${limit} AT ${stars} ★</h4><div class="skill-quads">${skills}</div><small class="gear-note">Raise hero stars to raise the skill level cap.</small></section>`],
        ['star', 'Star Up', `<section class="manage-block star-field"><h4>STAR POWER <b class="step-count">${progress.starSteps} / 25</b></h4>${starPicker(item.id, progress.starSteps)}<div class="level-pair"><label class="now-input">SHARDS INVESTED<input class="hero-shards" data-id="${item.id}" type="number" min="0" max="${heroShards(item, 25)}" value="${heroShards(item, progress.starSteps)}"><small>${stars} ★</small></label>${targetControl('hero-star', item.id, progress.starSteps, 25, 'TARGET STEP')}</div></section>`]
      ])}</details>`:''}
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
  const categoryOptions = [['building', 'Building'], ['research', 'Research'], ['hero-level', 'Hero level'], ['hero-star', 'Hero star'], ['hero-skill', 'Hero skill'], ['hero-equip', 'Hero gear'], ['alliance', 'Alliance research'], ['survivor-star', 'Survivor star']].map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
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
  fighter: fighterPage,
  roadmap: roadmapPage,
  survivors: survivorsPage,
  filter: filterPage,
  data: dataPage
};

function bindPageControls() {
  $('[data-edit-profile]')?.addEventListener('click', openProfileDialog);
  document.querySelectorAll('[data-add-record]').forEach(button => button.addEventListener('click', () => requestUpgradeDialog({
    category: button.dataset.category, item: button.dataset.item, level: button.dataset.level
  })));
  // A MAX button beside every level input fills in the highest allowed value.
  document.querySelectorAll('.level-stepper input, .hero-level, .hero-skill, .hero-gear, .hero-shards, .hero-equip-level, .fighter-chip-star, .fighter-component, .fighter-evolution, .fighter-level-input, .target-level').forEach(input => {
    if (input.disabled || input.max === '' || Number(input.value) >= Number(input.max)) return;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'max-btn'; button.textContent = 'MAX'; button.setAttribute('aria-label', 'Set to max');
    button.addEventListener('click', event => { event.preventDefault(); input.value = input.max; input.dispatchEvent(new Event('change')); });
    const stepper = input.closest('.level-stepper');
    if (stepper) stepper.append(button); else input.after(button);
  });
  document.querySelectorAll('.auto-fill-toggle').forEach(box => box.addEventListener('change', () => { state.prefs.autoFill = box.checked; save(box.checked ? 'Auto-fill on' : 'Auto-fill off'); renderRoute({ keepScroll: true }); }));
  $('[data-fill-all]')?.addEventListener('click', () => {
    const before = snapshotLevels(); const filled = fillPrerequisites(everythingSet());
    save(filled ? `Filled ${filled} prerequisite${filled === 1 ? '' : 's'}` : 'Nothing missing'); if (filled) offerUndo(before); renderRoute({ keepScroll: true });
  });
  const bulkSet = (defId, level) => {
    const before = snapshotLevels(); const def = buildingDefById.get(defId); const value = Math.max(1, Math.min(def.max, level));
    // Fill prerequisites first so copies unlocked by a higher HQ are included.
    const filled = state.prefs.autoFill ? fillPrerequisites([['b', defId, value]]) : 0;
    const copies = slotsByDefId(defId).filter(item => !isLocked(item));
    copies.forEach(item => { state.buildings[item.name] = value; });
    save(`Set ${copies.length} copies${filled ? `. Filled ${filled} prerequisite${filled === 1 ? '' : 's'}` : ''}`); offerUndo(before); renderRoute({ keepScroll: true });
  };
  document.querySelectorAll('[data-bulk-set]').forEach(button => button.addEventListener('click', () => bulkSet(Number(button.dataset.bulkSet), Number(button.parentElement.querySelector('.bulk-level').value) || 1)));
  document.querySelectorAll('[data-bulk-max]').forEach(button => button.addEventListener('click', () => bulkSet(Number(button.dataset.bulkMax), buildingDefById.get(Number(button.dataset.bulkMax)).max)));
  const treeNodes = gameId => researchNodes.filter(node => node.tree === gameId);
  $('[data-tree-max]')?.addEventListener('click', event => {
    const before = snapshotLevels(); const nodes = treeNodes(Number(event.currentTarget.dataset.treeMax));
    nodes.forEach(node => { state.research[node.id] = node.max; });
    commitLevels(before, `Maxed ${nodes.length} nodes`, nodes.map(node => ['r', node.id, node.max]));
  });
  $('[data-tree-clear]')?.addEventListener('click', event => {
    if (!confirm('Set every node in this tree to level 0?')) return;
    const before = snapshotLevels(); treeNodes(Number(event.currentTarget.dataset.treeClear)).forEach(node => { delete state.research[node.id]; });
    save('Tree reset'); offerUndo(before); renderRoute({ keepScroll: true });
  });
  $('[data-path-max]')?.addEventListener('click', event => {
    const before = snapshotLevels(); const seen = new Set();
    const walk = id => { if (seen.has(id)) return; seen.add(id); researchById.get(id)?.parents.forEach(walk); };
    walk(Number(event.currentTarget.dataset.pathMax));
    const nodes = [...seen].map(id => researchById.get(id)).filter(Boolean);
    nodes.forEach(node => { state.research[node.id] = Math.max(researchLevel(node.id), node.max); });
    commitLevels(before, `Maxed ${nodes.length} nodes`, nodes.map(node => ['r', node.id, node.max]));
  });
  document.querySelectorAll('.level-stepper').forEach(control => {
    const input = control.querySelector('input');
    const update = value => {
      const max = Number(input.max); const level = Math.max(Number(input.min), Math.min(max, Number(value) || 0));
      input.value = level;
      const before = snapshotLevels(); const group = control.dataset.group; const name = control.dataset.name;
      if ((Number(state[group][name]) || 0) === level) return;
      state[group][name] = level;
      if (group === 'buildings') commitLevels(before, 'Level saved', [['b', buildingSlot(name).def.id, level]]);
      else if (group === 'research') commitLevels(before, 'Level saved', [['r', Number(name), level]]);
      else { save(); renderRoute({ keepScroll: true }); }
    };
    input.addEventListener('change', () => update(input.value));
    control.querySelectorAll('button[data-change]').forEach(button => button.addEventListener('click', () => update(Number(input.value) + Number(button.dataset.change))));
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
  document.querySelectorAll('[data-hero-tab]').forEach(button => button.addEventListener('click', () => {
    ui.heroTabs = { ...ui.heroTabs, [button.dataset.id]: button.dataset.heroTab };
    const panel = button.closest('.hero-manage');
    panel.querySelectorAll('[data-hero-tab]').forEach(tab => { const on = tab === button; tab.classList.toggle('active', on); tab.setAttribute('aria-selected', on); });
    panel.querySelectorAll('.hero-pane').forEach(pane => pane.classList.toggle('active', pane.dataset.pane === button.dataset.heroTab));
  }));
  document.querySelectorAll('.hero-shards').forEach(input => input.addEventListener('change', () => {
    const hero = heroes.find(item => item.id === input.dataset.id); if (!hero) return;
    const progress = heroProgress(hero);
    progress.starSteps = stepsFromShards(hero, Math.max(0, Number(input.value) || 0));
    state.heroProgress[hero.id] = progress; save('Stars saved'); renderRoute({ keepScroll: true });
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
    // A new piece of a different quality starts at level 0.
    progress.equipLevels = { ...progress.equipLevels, [select.dataset.slot]: 0 };
    delete state.targets[targetKey('hero-equip', `${select.dataset.id}|${select.dataset.slot}`)];
    state.heroProgress[select.dataset.id] = progress; save('Gear saved'); renderRoute({ keepScroll: true });
  }));
  // Fighter level: a level number plus a 5-segment stage bar for current and target.
  const setFighterRow = (which, row) => {
    if (which === 'current') {
      state.fighter.row = row;
      if (targetFor('fighter-level', 'fighter', row) < row) delete state.targets[targetKey('fighter-level', 'fighter')];
    } else state.targets[targetKey('fighter-level', 'fighter')] = Math.max(state.fighter.row, row);
    save(which === 'current' ? 'Fighter level saved' : 'Target saved'); renderRoute({ keepScroll: true });
  };
  const fighterSide = which => which === 'current' ? state.fighter.row : fighterTargetRow();
  document.querySelectorAll('.fighter-level-input').forEach(input => input.addEventListener('change', () => {
    const level = Math.max(1, Math.min(fighterMaxLevel, Number(input.value) || 1));
    setFighterRow(input.dataset.fighterWhich, fighterRowFor(level, 0));
  }));
  document.querySelectorAll('.stage-segment').forEach(button => button.addEventListener('click', () => {
    const which = button.dataset.fighterWhich; const [level, phase] = fighterRows[fighterSide(which) - 1];
    const clicked = Number(button.dataset.stage); const stage = phase - 1 === clicked ? clicked - 1 : clicked;
    setFighterRow(which, fighterRowFor(level, Math.max(0, Math.min(4, stage))));
  }));
  document.querySelectorAll('.fighter-chip').forEach(select => select.addEventListener('change', () => {
    state.fighter.chips[select.dataset.slot] = { id: Number(select.value), star: 0 };
    delete state.targets[targetKey('fighter-chip', select.dataset.slot)];
    save('Chip saved'); renderRoute({ keepScroll: true });
  }));
  document.querySelectorAll('.fighter-component').forEach(input => input.addEventListener('change', () => {
    state.fighter.components[input.dataset.slot] = Math.max(0, Math.min(Number(input.max), Number(input.value) || 0));
    save('Component saved'); renderRoute({ keepScroll: true });
  }));
  $('.fighter-evolution')?.addEventListener('change', event => {
    state.fighter.evolution = Math.max(0, Math.min(Number(event.target.max), Number(event.target.value) || 0));
    save('Evolution saved'); renderRoute({ keepScroll: true });
  });
  document.querySelectorAll('.fighter-chip-star').forEach(input => input.addEventListener('change', () => {
    state.fighter.chips[input.dataset.slot].star = Math.max(0, Math.min(Number(input.max), Number(input.value) || 0));
    save('Chip stars saved'); renderRoute({ keepScroll: true });
  }));
  document.querySelectorAll('.hero-equip-level').forEach(input => input.addEventListener('change', () => {
    const progress = heroProgress({ id: input.dataset.id });
    progress.equipLevels = { ...progress.equipLevels, [input.dataset.slot]: Math.max(0, Math.min(Number(input.max), Number(input.value) || 0)) };
    state.heroProgress[input.dataset.id] = progress; save('Gear level saved'); renderRoute({ keepScroll: true });
  }));
  document.querySelectorAll('.star-section').forEach(button => button.addEventListener('click', () => {
    const steps = Number(button.dataset.step);
    if (button.dataset.starOwner === 'survivor') {
      const survivor = state.survivors.find(item => item.id === button.dataset.id);
      if (survivor) survivor.starSteps = survivor.starSteps === steps ? Math.max(0, steps - 1) : steps;
    } else {
      const progress = heroProgress({ id: button.dataset.id });
      const minSteps = heroes.find(item => item.id === button.dataset.id)?.promoted ? 15 : 0;
      progress.starSteps = Math.max(minSteps, progress.starSteps === steps ? steps - 1 : steps);
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
      group.querySelectorAll('.building-card').forEach(card => {
        const show = (!query || card.dataset.search.includes(query)) && !(ui.hideLocked && card.classList.contains('locked'));
        card.hidden = !show; if (show) visible += 1;
        card.querySelectorAll('.copy-row').forEach(row => { row.hidden = ui.hideLocked && row.classList.contains('locked'); });
      });
      group.hidden = !visible;
      if (query && visible) group.open = true;
    });
  };
  $('#buildingSearch')?.addEventListener('input', event => { ui.buildingSearch = event.target.value; applyBuildingFilter(); });
  $('#hideLocked')?.addEventListener('change', event => { ui.hideLocked = event.target.checked; applyBuildingFilter(); });
  if ($('#buildingSearch')) applyBuildingFilter();
  document.querySelectorAll('[data-promote]').forEach(button => button.addEventListener('click', () => {
    const from = heroes.find(item => item.id === button.dataset.promote); const to = promotedVersion(from);
    const progress = heroProgress(from);
    state.heroProgress[to.id] = { ...progress, starSteps: 15 };
    state.ownedHeroes = [...state.ownedHeroes.filter(id => id !== from.id), to.id];
    save(`${from.name} promoted to UR`); renderRoute({ keepScroll: true });
  }));
  $('#heroOwnedOnly')?.addEventListener('change', event => { ui.heroOwnedOnly = event.target.checked; renderRoute({ keepScroll: true }); });
  document.querySelectorAll('[data-heroes]').forEach(button => button.addEventListener('click', () => {
    const open = button.dataset.heroes === 'open';
    document.querySelectorAll('details.hero-manage').forEach(card => { card.open = open; });
  }));
  // Clicking an owned hero card opens it. The ✕ in the corner returns it to the card view.
  document.querySelectorAll('[data-open-hero]').forEach(card => card.addEventListener('click', event => {
    const manage = card.querySelector('details.hero-manage');
    if (event.target.closest('summary')) event.preventDefault();
    if (!manage || manage.open || event.target.closest('button, input, select, label, a')) return;
    manage.open = true;
  }));
  document.querySelectorAll('[data-close-hero]').forEach(button => button.addEventListener('click', event => {
    event.stopPropagation();
    const manage = button.closest('.hero-card').querySelector('details.hero-manage'); if (manage) manage.open = false;
  }));
  document.querySelectorAll('details.hero-manage').forEach(card => card.addEventListener('toggle', () => {
    if (card.open) ui.openHeroes.add(card.dataset.heroId); else ui.openHeroes.delete(card.dataset.heroId);
  }));
  // Collapsible panels remember their closed state by page and title.
  document.querySelectorAll('details.panel').forEach(panel => {
    const key = `${location.hash.split('/')[0]}|${panel.querySelector('summary h2')?.textContent}`;
    if (ui.closedPanels.has(key)) panel.open = false;
    panel.addEventListener('toggle', () => { if (panel.open) ui.closedPanels.delete(key); else ui.closedPanels.add(key); });
  });
  document.querySelectorAll('[data-cards]').forEach(button => button.addEventListener('click', () => {
    const open = button.dataset.cards === 'open';
    document.querySelectorAll('details.building-card').forEach(card => { if (!card.hidden) card.open = open; });
  }));
  document.querySelectorAll('details.building-card').forEach(card => card.addEventListener('toggle', () => {
    const id = Number(card.dataset.def); if (card.open) ui.openCards.add(id); else ui.openCards.delete(id);
  }));
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
  $('#maxOptionsForm')?.addEventListener('change', event => {
    const form = event.currentTarget;
    state.maxOptions = {
      buildMinister: Math.max(0, Number(form.elements.buildMinister.value) || 0), researchMinister: Math.max(0, Number(form.elements.researchMinister.value) || 0),
      ignoreResearch: form.elements.ignoreResearch.checked, ignoreVip: form.elements.ignoreVip.checked, ignoreOther: form.elements.ignoreOther.checked
    };
    ui.maxOptionsOpen = true; save('What-if updated'); renderRoute({ keepScroll: true });
  });
  if (ui.maxOptionsOpen && $('.max-options')) $('.max-options').open = true;
  $('.max-options')?.addEventListener('toggle', event => { ui.maxOptionsOpen = event.target.open; });
  $('#bonusForm')?.addEventListener('change', event => {
    const form = event.currentTarget;
    state.profile.bonuses = Object.fromEntries(bonusFields.map(name => [name, Math.max(0, Number(form.elements[name].value) || 0)]));
    save('Bonuses saved'); renderRoute({ keepScroll: true });
  });
  document.querySelectorAll('[data-delete-target]').forEach(button => button.addEventListener('click', () => {
    delete state.targets[button.dataset.deleteTarget]; save('Goal deleted'); renderRoute({ keepScroll: true });
  }));
  $('[data-clear-targets]')?.addEventListener('click', event => {
    event.preventDefault();
    if (!confirm('Delete all saved goals?')) return;
    state.targets = {}; save('All goals deleted'); renderRoute({ keepScroll: true });
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
// Hotkey: "m" in a level or target box sets it to its max. On a research tree with no box focused, it maxes the selected node.
document.addEventListener('keydown', event => {
  if (event.key.toLowerCase() !== 'm' || event.ctrlKey || event.metaKey || event.altKey) return;
  const active = document.activeElement;
  if (active?.matches('input[type=number]')) {
    if (active.max === '' || active.disabled) return;
    event.preventDefault(); active.value = active.max; active.dispatchEvent(new Event('change'));
  } else if (!active?.matches('input, textarea, select, [contenteditable]')) {
    const input = $('#nodeDetail .level-stepper input');
    if (!input || Number(input.value) >= Number(input.max)) return;
    event.preventDefault(); input.value = input.max; input.dispatchEvent(new Event('change'));
  }
});
window.addEventListener('hashchange', renderRoute);
setProfile(); renderRoute();
if (!state.profile.name) setTimeout(() => $('#profileButton').click(), 450);

// GitHub Pages may serve a cached index.html for a few minutes after a release.
// Check the live page's asset version and offer a reload when it differs.
function checkForUpdate() {
  const loaded = document.querySelector('script[src*="app.js"]')?.src.match(/v=(\w+)/)?.[1];
  if (!loaded || location.protocol === 'file:') return;
  fetch('index.html', { cache: 'no-store' }).then(response => response.ok ? response.text() : '').then(html => {
    const live = html.match(/app\.js\?v=(\w+)/)?.[1];
    if (!live || live === loaded || $('#updateBanner')) return;
    const banner = document.createElement('div');
    banner.id = 'updateBanner'; banner.className = 'update-banner';
    banner.innerHTML = 'A new version of the site is ready. <button type="button">Reload</button>';
    banner.querySelector('button').addEventListener('click', () => location.reload());
    document.body.append(banner);
  }).catch(() => {});
}
checkForUpdate(); setInterval(checkForUpdate, 5 * 60 * 1000);
