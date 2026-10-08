// Extra pages and panels: VS days, squads, promo codes, backup and share, hero EXP chests, producer ROI.
// Loaded after app.js and uses its globals (state, GAME, pages, helpers).
// Ideas and data come from github.com/JeffxLabs: zrouteredemption, P1MP-VS and ZR-S117-Capitol.

const EXTRAS_KEY = 'zroute-command-center-extras-v1';
const extrasDefaults = () => ({ expItems: {}, roiWeights: { food: 1, metal: 1, oil: 1 }, squads: [[], [], [], []], usedCodes: [], customCodes: [] });
let extras = loadExtras();
function loadExtras() {
  try {
    const saved = JSON.parse(localStorage.getItem(EXTRAS_KEY) || '{}');
    const base = extrasDefaults();
    return {
      ...base, ...saved,
      roiWeights: { ...base.roiWeights, ...saved.roiWeights },
      squads: base.squads.map((empty, index) => Array.isArray(saved.squads?.[index]) ? saved.squads[index].slice(0, 5) : empty)
    };
  } catch { return extrasDefaults(); }
}
function saveExtras(message) {
  try { localStorage.setItem(EXTRAS_KEY, JSON.stringify(extras)); } catch {}
  if (message) save(message);
}

/* ---------- Hero EXP chests (Heroes page) ---------- */

const expData = GAME.heroExpItems;
function chestExp(chest) { return chest.expByHq[Math.max(1, Math.min(chest.expByHq.length, hqLevel())) - 1] || 0; }
function ownedHeroExp() {
  if (!expData) return 0;
  const items = extras.expItems;
  return expData.chests.reduce((sum, chest) => sum + (Number(items[chest.grade]) || 0) * chestExp(chest), 0)
    + (Number(items.battle) || 0) * expData.battleItem.exp + (Number(items.loose) || 0);
}
// VS points for Hero EXP (Monday and Thursday). Points Buff research raises every action's points.
function vsPointsForExp(exp) {
  if (!expData || !exp) return 0;
  return Math.floor(exp / expData.vsExpPerPoint) * (1 + researchBenefit(expData.vsPointsBenefit));
}
function heroExpNeeds() {
  const cap = heroCap();
  let toTarget = 0; let toCap = 0;
  state.ownedHeroes.forEach(id => {
    const hero = heroes.find(item => item.id === id); if (!hero) return;
    const level = Math.min(cap, Number(heroProgress(hero).level) || 1);
    const target = Math.min(hero.maxLevel, Math.max(level, targetFor('hero-level', hero.id, level)));
    if (target > level) toTarget += calculateUpgrade('hero-level', hero.id, level, target).resources.heroExp;
    if (cap > level) toCap += calculateUpgrade('hero-level', hero.id, level, cap).resources.heroExp;
  });
  return { toTarget, toCap };
}
function heroExpPanel() {
  if (!expData) return '';
  const hq = Math.max(1, hqLevel()); const owned = ownedHeroExp(); const needs = heroExpNeeds();
  const chestCount = (need, chest) => need ? formatNumber(Math.ceil(need / chestExp(chest))) : '0';
  const need = (label, value) => `<article><span>${label}</span><strong>${formatNumber(value)}</strong><small>${value > owned ? `Short ${formatNumber(value - owned)}` : 'Covered by your items'}</small>
    <small>${expData.chests.map(chest => `${chestCount(Math.max(0, value - owned), chest)} ${chest.grade}`).join(' · ')} chests still</small></article>`;
  const input = (key, label, each) => `<label>${escapeHtml(label)}<input type="number" min="0" data-exp-item="${key}" value="${Number(extras.expItems[key]) || 0}"><small>${formatNumber(each)} EXP each</small></label>`;
  return `<details open class="panel grand-plan exp-panel"><summary><div><p class="eyebrow">HQ ${hq} CHEST SIZES</p><h2>${iconImg('assets/icons/ui/exp_chest.webp', 'inline-icon')}Hero EXP items</h2></div><a class="button secondary" href="#vs">VS days</a></summary>
    <form class="power-fields exp-items"><fieldset><legend>WHAT YOU OWN · ${formatNumber(owned)} EXP</legend>
      ${expData.chests.map(chest => input(chest.grade, chest.name, chestExp(chest))).join('')}
      ${input('battle', expData.battleItem.name, expData.battleItem.exp)}
      <label>LOOSE HERO EXP<input type="number" min="0" data-exp-item="loose" value="${Number(extras.expItems.loose) || 0}"><small>From the resource bar</small></label>
    </fieldset></form>
    <div class="grand-plan-values exp-needs">${need('ROSTER TO YOUR TARGETS', needs.toTarget)}${need(`ROSTER TO LEVEL ${heroCap()}`, needs.toCap)}
      <article><span>VS POINTS IF USED ON VS DAY</span><strong>${formatNumber(vsPointsForExp(owned))}</strong><small>1 point per ${formatNumber(expData.vsExpPerPoint)} EXP${researchBenefit(expData.vsPointsBenefit) ? ` · +${formatPercent(researchBenefit(expData.vsPointsBenefit) * 100)} Points Buff` : ''}</small><small>Hero EXP scores on Monday and Thursday</small></article></div>
    <p>Chests give more EXP at a higher HQ level, so opening them after an HQ upgrade is worth more. The hero level cap is HQ × 5.</p></details>`;
}

/* ---------- Producer ROI (Resources page) ---------- */

const roiOutputs = { Food: 'food', Metal: 'metal', Oil: 'oil' };
function producerRoiRows() {
  const weights = extras.roiWeights;
  return buildings.flatMap(item => {
    const producer = producerFor(item.def); const key = producer && roiOutputs[producer.output];
    const level = Number(state.buildings[item.name]) || 0;
    if (!key || !level || isLocked(item) || level >= item.def.max) return [];
    const plan = calculateUpgrade('building', item.name, level, level + 1);
    const gain = ((producer.perHour[level] || 0) - (producer.perHour[level - 1] || 0)) * (1 + outputBonus(producer.output));
    const cost = ['food', 'metal', 'oil'].reduce((sum, name) => sum + plan.resources[name] * (Number(weights[name]) || 0), 0);
    const value = gain * (Number(weights[key]) || 0);
    return [{ item, producer, level, plan, gain, payback: value > 0 ? cost / value * 3600 : Infinity }];
  }).sort((a, b) => a.payback - b.payback);
}
function producerRoiPanel() {
  const rows = producerRoiRows();
  const weights = extras.roiWeights;
  const body = rows.map(row => `<tr><td>${iconImg(row.item.def.icon, 'chip-icon')}${escapeHtml(row.item.name)}</td><td>Lv ${row.level} → ${row.level + 1}</td>
    <td>${['food', 'metal', 'oil'].filter(name => row.plan.resources[name]).map(name => `${formatNumber(row.plan.resources[name])} ${resourceTitles[name]}`).join('<br>')}</td>
    <td>+${formatNumber(row.gain)} ${escapeHtml(row.producer.output)}/hr</td><td><b>${Number.isFinite(row.payback) ? formatDuration(row.payback) : '—'}</b></td><td>${formatDuration(row.plan.seconds)}</td></tr>`).join('');
  return `<details open class="panel grand-plan roi-panel"><summary><div><p class="eyebrow">BEST PAYBACK FIRST</p><h2>Producer ROI</h2></div></summary>
    <form class="roi-weights"><span>How much is 1 of each worth to you?</span>${['food', 'metal', 'oil'].map(name => `<label>${resourceTitles[name].toUpperCase()}<input type="number" min="0" step="0.1" data-roi-weight="${name}" value="${Number(weights[name])}"></label>`).join('')}</form>
    ${body ? `<div class="table-scroll"><table class="roi-table"><thead><tr><th>Building</th><th>Upgrade</th><th>Cost</th><th>Extra output</th><th>Pays back in</th><th>Build time</th></tr></thead><tbody>${body}</tbody></table></div>` : '<p>Set your Farm, Metal Smelting Plant or Oil Extraction Well levels to compare upgrades.</p>'}
    <p>Payback is the next upgrade's cost divided by the extra output it adds, using your values above. Output research is included. Survivors, VIP and events are not.</p></details>`;
}

/* ---------- VS days ---------- */

// Server time is UTC-2 (inferred from the P1MP VS capture times).
function serverDay() { return new Date(Date.now() - 2 * 3600 * 1000).getUTCDay(); }
function vsPage() {
  pageHeader('ALLIANCE DUEL', 'VS days');
  const plan = grandUpgradePlan();
  const today = serverDay();
  const r = plan.resources;
  const buildCount = planObjectives().filter(item => item.category === 'building').reduce((sum, item) => sum + item.target - item.current, 0);
  const researchCount = planObjectives().filter(item => item.category === 'research').reduce((sum, item) => sum + item.target - item.current, 0);
  const minutes = category => formatDuration(speedupMinutes(category) * 60);
  const expPoints = formatNumber(vsPointsForExp(r.heroExp));
  const fromPlan = [
    [`Hero EXP to your targets: <b>${formatNumber(r.heroExp)}</b> (about ${expPoints} points)`, `Fighter Parts <b>${formatNumber(r.fighterParts)}</b> · Combat Chips <b>${formatNumber(r.combatChips)}</b>`],
    [`<b>${formatNumber(buildCount)}</b> building levels planned · ${formatDuration(plan.buildSeconds)}`, `Build speedups you own: <b>${minutes('build')}</b>`],
    [`<b>${formatNumber(researchCount)}</b> research levels planned · ${formatDuration(plan.researchSeconds)}`, `Research Data planned: <b>${formatNumber(r.researchData)}</b>`, `Research speedups you own: <b>${minutes('research')}</b>`],
    [`Hero EXP to your targets: <b>${formatNumber(r.heroExp)}</b> (about ${expPoints} points)`, `Hero shards <b>${formatNumber(r.shards)}</b> · Skill books <b>${formatNumber(r.skillBooks)}</b>`],
    [`Build, research and training all score today`, `Training speedups you own: <b>${minutes('train')}</b>`],
    [`Healing speedups you own: <b>${minutes('cure')}</b>`, `Speedups of every kind score today`]
  ];
  const cards = (GAME.vsDays || []).map((day, index) => `<article class="vs-day ${index + 1 === today ? 'today' : ''}"><header><div><p class="eyebrow">${escapeHtml(day.day.toUpperCase())}${index + 1 === today ? ' · TODAY' : ''}</p><h3>${escapeHtml(day.name)}</h3></div><span class="pill">${day.wins} WIN${day.wins === 1 ? '' : 'S'}</span></header>
    <p>${escapeHtml(day.about)}</p>
    <div class="vs-plan"><b>FROM YOUR PLAN</b>${(fromPlan[index] || []).map(line => `<span>${line}</span>`).join('')}</div>
    <details><summary>What scores (${day.activities.length})</summary><ul>${day.activities.map(text => `<li>${escapeHtml(text)}</li>`).join('')}</ul></details></article>`).join('');
  return `<section class="page-intro"><div><p class="eyebrow">ALLIANCE COMPETITION</p><h2>Save it for the right day</h2><p>Each VS day rewards different actions. Hold speedups, EXP and shards for the day they score. Sunday has no VS stage. Server time is UTC−2.</p></div><div class="completion-ring"><strong>${today === 0 ? 'Rest' : escapeHtml(GAME.vsDays?.[today - 1]?.name || '')}</strong><span>TODAY ON THE SERVER</span></div></section>
    <section class="vs-grid">${cards}</section>
    <p class="source-note">Stage rules from github.com/JeffxLabs/P1MP-VS. Hero EXP points (1 per ${formatNumber(expData?.vsExpPerPoint || 650)} EXP, raised by Points Buff research) from github.com/JeffxLabs/zrouteredemption. Other point values are not in the data yet.</p>`;
}

/* ---------- Squads ---------- */

const squadRules = GAME.squad;
function squadBonus(list) {
  const counts = Object.values(list.reduce((map, hero) => ({ ...map, [hero.heroClass]: (map[hero.heroClass] || 0) + 1 }), {})).sort((a, b) => b - a);
  return (squadRules?.lineupBonus || []).filter(rule => rule.pattern.every((need, index) => (counts[index] || 0) >= need))
    .reduce((best, rule) => rule.percent > (best?.percent || 0) ? rule : best, null);
}
// Takes the squad's five slots in order; empty slots are undefined.
function squadAdvice(slots) {
  const notes = []; const list = slots.filter(Boolean);
  slots.forEach((hero, index) => {
    if (!hero) return;
    if (index < squadRules.front && hero.type !== 'FL') notes.push(`${hero.name} is ${typeNames[hero.type]}. The front row is for Frontline heroes.`);
    if (index >= squadRules.front && hero.type === 'FL') notes.push(`${hero.name} is Frontline. Move them to the front row.`);
  });
  if (new Set(list.map(hero => hero.id)).size < list.length) notes.push('The same hero is in this squad twice.');
  return notes;
}
function squadCard(squad, index) {
  const slots = Array.from({ length: squadRules.size }, (_, position) => heroes.find(hero => hero.id === squad[position]));
  const list = slots.filter(Boolean);
  const pool = state.ownedHeroes.length ? heroes.filter(hero => state.ownedHeroes.includes(hero.id)) : heroes;
  const usedElsewhere = new Set(extras.squads.flatMap((other, otherIndex) => otherIndex === index ? [] : other));
  const slot = position => {
    const selected = squad[position] || '';
    const options = pool.map(hero => `<option value="${hero.id}" ${hero.id === selected ? 'selected' : ''}>${escapeHtml(hero.name)} · ${hero.rarity} ${hero.heroClass} · ${hero.type}${usedElsewhere.has(hero.id) ? ' (in another squad)' : ''}</option>`).join('');
    const hero = heroes.find(item => item.id === selected);
    return `<label class="squad-slot">${position < squadRules.front ? 'FRONT' : 'BACK'} ${position < squadRules.front ? position + 1 : position - squadRules.front + 1}${hero?.icon ? iconImg(hero.icon, 'squad-head') : '<span class="squad-head empty">+</span>'}<select data-squad="${index}" data-slot="${position}"><option value="">Empty</option>${options}</select></label>`;
  };
  const bonus = squadBonus(list);
  const counts = list.reduce((map, hero) => ({ ...map, [hero.heroClass]: (map[hero.heroClass] || 0) + 1 }), {});
  const main = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const beats = squadRules.counters.find(([faction]) => faction === main)?.[1];
  const weakTo = squadRules.counters.find(([, target]) => target === main)?.[0];
  const notes = squadAdvice(slots);
  return `<article class="squad-card"><header><h3>Squad ${index + 1}</h3><span class="pill">${list.length} / ${squadRules.size}</span>${list.length ? `<button type="button" class="button secondary" data-clear-squad="${index}">Clear</button>` : ''}</header>
    <div class="squad-rows"><div>${[0, 1].map(slot).join('')}</div><div>${[2, 3, 4].map(slot).join('')}</div></div>
    <div class="squad-summary"><span>LINEUP BONUS <b>${bonus ? `+${bonus.percent}% HP, ATK, DEF` : 'None'}</b></span>${main ? `<span>MAIN CLASS <b>${escapeHtml(main)}</b></span><span>STRONG AGAINST <b>${escapeHtml(beats)}</b></span><span>WEAK TO <b>${escapeHtml(weakTo)}</b></span>` : ''}</div>
    ${notes.length ? `<ul class="squad-notes">${notes.map(note => `<li>${escapeHtml(note)}</li>`).join('')}</ul>` : ''}</article>`;
}
function squadsPage() {
  pageHeader('FORMATION', 'Squads');
  if (!squadRules) return '<p class="empty-note">Squad rules are not loaded.</p>';
  return `<section class="page-intro"><div><p class="eyebrow">SQUAD PLANNER</p><h2>Build your squads</h2><p>${squadRules.front} front and ${squadRules.back} back slots. Heroes of the same class unlock a lineup bonus. ${state.ownedHeroes.length ? 'Lists show heroes in your roster.' : 'Add heroes to your roster on the Heroes page to shorten these lists.'}</p></div></section>
    <section class="rule-strip">${squadRules.lineupBonus.map(rule => `<span><b>+${rule.percent}%</b> ${escapeHtml(rule.text)}</span>`).join('')}<span><b>−${squadRules.counterReduction}%</b> damage taken from the class you counter. ${squadRules.counters.map(([a, b]) => `${a} beats ${b}`).join(' · ')}.</span></section>
    <section class="squad-grid">${extras.squads.map(squadCard).join('')}</section>
    <details class="panel grand-plan"><summary><div><p class="eyebrow">FROM THE HERO DIRECTORY</p><h2>Squad tips</h2></div></summary><div class="tips">${squadRules.tips.map(tip => `<article><b>${escapeHtml(tip.title)}</b><p>${escapeHtml(tip.body)}</p></article>`).join('')}</div></details>
    <p class="source-note">Rules and tips from github.com/JeffxLabs/zrouteredemption (heroes directory).</p>`;
}

/* ---------- Promo codes ---------- */

// Codes as listed on github.com/JeffxLabs/zrouteredemption (promo-codes) on 2026-10-08. Older codes may have expired.
const promoCodes = ['DC75KJDR', 'ZRTSML09', 'VK110KQBR', 'OKTOBER26', 'DC70KMFT', 'DC65KZPW', '26SCHOOL', 'DC60KHAX', 'ZRRUSG26',
  'DC50KURM', 'ZRDAD26', 'ZRRLW2AC', 'ZRSURV26', 'ZRR2NX6Q', 'ZRR999', 'ZRRFT9BM', 'ZRRC7WES', 'VK90KPJD', 'ZRYOUTH26', 'DC45KIGS',
  'DC38KQEU', 'DC40KHAX', 'ZRRVJ4YD', 'DC32KJBV', 'DC28KRCG', 'DC30KMWZ', 'DC35KNZH', 'DC55KQEU'];
const promoDates = { DC75KJDR: '2026-09-29', ZRTSML09: '2026-09-23', VK110KQBR: '2026-09-23', OKTOBER26: '2026-09-20', DC70KMFT: '2026-09-17', DC65KZPW: '2026-09-10', '26SCHOOL': '2026-08-31', DC60KHAX: '2026-08-31' };
function codesPage() {
  pageHeader('REWARDS', 'Promo codes');
  const all = [...extras.customCodes, ...promoCodes.filter(code => !extras.customCodes.includes(code))];
  const used = new Set(extras.usedCodes);
  const rows = all.map(code => `<article class="code-row ${used.has(code) ? 'used' : ''}"><div><b>${escapeHtml(code)}</b><small>${promoDates[code] ? `Added ${promoDates[code]}` : extras.customCodes.includes(code) ? 'Added by you' : ''}</small></div>
    <button type="button" class="button secondary" data-copy-code="${escapeHtml(code)}">Copy</button><label class="check"><input type="checkbox" data-used-code="${escapeHtml(code)}" ${used.has(code) ? 'checked' : ''}> Used</label></article>`).join('');
  return `<section class="page-intro"><div><p class="eyebrow">GIFT CODES</p><h2>Promo codes</h2><p>Copy a code and redeem it in game under Settings, Redeem Code. Tick it off once used. Older codes may have expired.</p></div><div class="completion-ring"><strong>${all.filter(code => used.has(code)).length} / ${all.length}</strong><span>USED</span></div></section>
    <form class="toolbar" id="addCodeForm"><label>ADD A NEW CODE<input name="code" maxlength="24" placeholder="Paste a code" autocomplete="off"></label><button class="button primary" type="submit">Add</button></form>
    <section class="code-list">${rows}</section>
    <p class="source-note">Code list from github.com/JeffxLabs/zrouteredemption, checked 2026-10-08.</p>`;
}

/* ---------- Backup and share ---------- */

const toBase64Url = bytes => { let binary = ''; bytes.forEach(byte => { binary += String.fromCharCode(byte); }); return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const fromBase64Url = text => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0));
async function streamBytes(bytes, stream) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer()); }
// Code format: "z1." + deflated JSON, or "z0." + plain JSON when the browser cannot compress.
async function exportCode() {
  const bytes = new TextEncoder().encode(JSON.stringify({ app: 'zroute-command-center', version: 1, state, extras }));
  if (typeof CompressionStream === 'undefined') return `z0.${toBase64Url(bytes)}`;
  return `z1.${toBase64Url(await streamBytes(bytes, new CompressionStream('deflate-raw')))}`;
}
async function readCode(code) {
  const text = code.trim().replace(/^.*#backup\//, '');
  const [kind, body] = text.split('.');
  let bytes = fromBase64Url(body || '');
  if (kind === 'z1') bytes = await streamBytes(bytes, new DecompressionStream('deflate-raw'));
  else if (kind !== 'z0') throw new Error('Not a Z Route code');
  const data = JSON.parse(new TextDecoder().decode(bytes));
  if (data.app !== 'zroute-command-center' || !data.state) throw new Error('Not a Z Route backup');
  return data;
}
function applyBackup(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data.state));
  state = loadState();
  extras = { ...extrasDefaults(), ...(data.extras || {}) }; saveExtras();
  save('Profile loaded'); setProfile();
}
function backupSummary(data) {
  const saved = data.state;
  return `<b>${escapeHtml(saved.profile?.name || 'Unnamed commander')}</b> · HQ ${Number(saved.buildings?.HQ) || 0} · ${(saved.ownedHeroes || []).length} heroes · ${Object.keys(saved.targets || {}).length} targets`;
}
let pendingBackup = null;
function backupPage() {
  pageHeader('YOUR DATA', 'Backup and share');
  const shared = location.hash.split('/').slice(1).join('/');
  return `<section class="page-intro"><div><p class="eyebrow">SAVE AND SHARE</p><h2>Backup and share</h2><p>Your data lives only in this browser. Copy a code or a link to move it to another device, or send your plan to an alliance leader. Loading a code replaces the data on this device.</p></div></section>
    ${shared ? '<section class="grand-plan shared-backup" id="sharedBackup"><p>Reading the shared profile…</p></section>' : ''}
    <section class="backup-grid">
      <article class="grand-plan"><p class="eyebrow">EXPORT</p><h2>Copy your data</h2><p>Everything: levels, heroes, targets, speedups, squads and settings.</p>
        <div class="backup-actions"><button type="button" class="button primary" data-backup="code">Copy code</button><button type="button" class="button secondary" data-backup="link">Copy share link</button><button type="button" class="button secondary" data-backup="file">Download file</button></div>
        <textarea id="exportCode" readonly rows="4" placeholder="Your code appears here"></textarea></article>
      <article class="grand-plan"><p class="eyebrow">IMPORT</p><h2>Load data</h2><p>Paste a code or share link, or pick a backup file.</p>
        <textarea id="importCode" rows="4" placeholder="Paste a code or link"></textarea>
        <div class="backup-actions"><button type="button" class="button primary" data-backup="import">Load code</button><label class="button secondary file-button">Load file<input type="file" id="importFile" accept=".json,application/json"></label></div></article>
    </section>`;
}
async function showSharedBackup() {
  const box = $('#sharedBackup'); if (!box) return;
  try {
    pendingBackup = await readCode(location.hash.split('/').slice(1).join('/'));
    box.innerHTML = `<p class="eyebrow">SHARED WITH YOU</p><p>${backupSummary(pendingBackup)}</p><div class="backup-actions"><button type="button" class="button primary" data-backup="load-shared">Load this profile</button><a class="button secondary" href="#backup">Ignore</a></div><small>Loading replaces the data on this device. Copy your own code first if you want to keep it.</small>`;
    box.querySelector('[data-backup="load-shared"]').addEventListener('click', () => {
      if (!confirm('Replace the data on this device with this profile?')) return;
      applyBackup(pendingBackup); location.hash = '#overview';
    });
  } catch { box.innerHTML = '<p>This link is not a valid Z Route profile. It may have been cut off when it was copied.</p>'; }
}
async function copyText(text, message) {
  try { await navigator.clipboard.writeText(text); save(message); } catch { save('Select the text and copy it'); }
}
function bindBackup() {
  document.querySelectorAll('[data-backup]').forEach(button => button.addEventListener('click', async () => {
    const action = button.dataset.backup;
    if (action === 'import') {
      try {
        const data = await readCode($('#importCode').value);
        if (!confirm(`Load ${data.state.profile?.name || 'this profile'}? This replaces the data on this device.`)) return;
        applyBackup(data); renderRoute();
      } catch { save('That code could not be read'); }
      return;
    }
    if (action === 'load-shared') return;
    const code = await exportCode();
    $('#exportCode').value = code;
    if (action === 'code') copyText(code, 'Code copied');
    if (action === 'link') copyText(`${location.origin}${location.pathname}#backup/${code}`, 'Share link copied');
    if (action === 'file') {
      const blob = new Blob([JSON.stringify({ app: 'zroute-command-center', version: 1, state, extras }, null, 1)], { type: 'application/json' });
      const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
      link.download = `zroute-${(state.profile.name || 'profile').replace(/[^\w-]+/g, '_')}-${new Date().toISOString().slice(0, 10)}.json`;
      link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    }
  }));
  $('#importFile')?.addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.app !== 'zroute-command-center' || !data.state) throw new Error();
      if (!confirm(`Load ${data.state.profile?.name || 'this profile'}? This replaces the data on this device.`)) return;
      applyBackup(data); renderRoute();
    } catch { save('That file is not a Z Route backup'); }
  });
  showSharedBackup();
}

/* ---------- Wiring ---------- */

Object.assign(pages, { vs: vsPage, squads: squadsPage, codes: codesPage, backup: backupPage });

const bindBasePage = bindPageControls;
bindPageControls = function bindAll() {
  bindBasePage();
  document.querySelectorAll('[data-exp-item]').forEach(input => input.addEventListener('change', () => {
    extras.expItems[input.dataset.expItem] = Math.max(0, Number(input.value) || 0); saveExtras('EXP items saved'); renderRoute({ keepScroll: true });
  }));
  document.querySelectorAll('[data-roi-weight]').forEach(input => input.addEventListener('change', () => {
    extras.roiWeights[input.dataset.roiWeight] = Math.max(0, Number(input.value) || 0); saveExtras('Values saved'); renderRoute({ keepScroll: true });
  }));
  document.querySelectorAll('[data-squad]').forEach(select => select.addEventListener('change', () => {
    const squad = extras.squads[Number(select.dataset.squad)];
    squad[Number(select.dataset.slot)] = select.value;
    extras.squads[Number(select.dataset.squad)] = Array.from({ length: 5 }, (_, index) => squad[index] || '');
    saveExtras('Squad saved'); renderRoute({ keepScroll: true });
  }));
  document.querySelectorAll('[data-clear-squad]').forEach(button => button.addEventListener('click', () => {
    extras.squads[Number(button.dataset.clearSquad)] = []; saveExtras('Squad cleared'); renderRoute({ keepScroll: true });
  }));
  document.querySelectorAll('[data-copy-code]').forEach(button => button.addEventListener('click', () => copyText(button.dataset.copyCode, `${button.dataset.copyCode} copied`)));
  document.querySelectorAll('[data-used-code]').forEach(box => box.addEventListener('change', () => {
    const code = box.dataset.usedCode;
    extras.usedCodes = box.checked ? [...new Set([...extras.usedCodes, code])] : extras.usedCodes.filter(item => item !== code);
    saveExtras(box.checked ? 'Marked used' : 'Marked unused'); renderRoute({ keepScroll: true });
  }));
  $('#addCodeForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const code = event.currentTarget.elements.code.value.trim().toUpperCase().replace(/\s+/g, '');
    if (!code) return;
    extras.customCodes = [code, ...extras.customCodes.filter(item => item !== code)]; saveExtras('Code added'); renderRoute({ keepScroll: true });
  });
  if (location.hash.startsWith('#backup')) bindBackup();
};

// The reset button clears these extras too.
$('#resetData').addEventListener('click', () => { if (JSON.stringify(state) === JSON.stringify(defaults)) { extras = extrasDefaults(); saveExtras(); } });

// app.js drew the first page before this file loaded. Draw it again with the new pages and panels.
renderRoute();

// Offline support and "add to home screen". Network first, so new releases always win.
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
