#!/usr/bin/env python3
"""Compact the raw game JSON exports into one small file the app can load.

Reads data/source/progression.json, heroes.json, resources.json, research_layout.json,
equipment.json and fighter.json and writes
data/game-data.js. Run it again whenever the source files change:

    python3 tools/build_game_data.py

The output stores each level table as plain arrays (index 0 = level 1), so
the browser only sums array slices instead of walking the 5 MB raw export.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'data' / 'source'
OUTPUT = ROOT / 'data' / 'game-data.js'
ICONS = ROOT / 'assets' / 'icons'
RESOURCE_ICONS = {'food': 'food', 'metal': 'metal', 'oil': 'oil', 'heroExp': 'hero_exp',
                  'researchData': 'research_data', 'skillBooks': 'skill_book', 'combatChips': 'chips', 'fighterParts': 'fighter_parts'}

COST_KEYS = {1: 'food', 2: 'metal', 3: 'oil', 5: 'heroExp', 211: 'uranium', 212: 'antibody'}
ITEM_KEYS = {
    'item_research_info': 'researchData', 'item_HeroSkill_Book': 'skillBooks',
    'item_equipment_enhanceStone': 'refiningStone',
    'item_equip_produce_materials_03': 'heatGold', 'item_equip_produce_materials_04': 'composite',
    'item_equip_produce_materials_05': 'crystal',
    'item_equipment_equipmentDrawing_legendary': 'blueprintLegendary',
    'item_equipment_equipmentDrawing_mythology': 'blueprintMythic',
}
RESOURCE_LABELS = {
    'food': 'Food', 'metal': 'Metal', 'oil': 'Oil', 'uranium': 'Uranium', 'antibody': 'Antibody',
    'researchData': 'Research Data', 'heroExp': 'Hero EXP', 'shards': 'Hero Shards', 'skillBooks': 'Skill Books',
    'refiningStone': 'Refining Stone', 'heatGold': 'Heat-resistant Gold', 'composite': 'Composite Material',
    'crystal': 'Conductive Crystal', 'blueprintLegendary': 'Legendary Blueprint', 'blueprintMythic': 'Mythic Blueprint',
    'combatChips': 'Combat Chips', 'fighterParts': 'Fighter Parts', 'chipCopies': 'Wingman Chip Copies',
    'componentCopies': 'Lv 1 Component Copies', 'evolutionXp': 'Evolution XP'
}
FIGHTER_ITEMS = {'item_drone_data': 'combatChips', 'item_drone_part': 'fighterParts'}
CHIP_SLOTS = ['Debut', 'Attack', 'Support', 'Defense']
GROUPS = {1: 'Economy', 2: 'Military', 4: 'Development', 5: 'Season'}
RENAMES = {1001: 'HQ'}
RARITY = {3: 'SR', 4: 'SSR', 5: 'UR'}
HERO_CLASS = {1: 'Tactical', 2: 'Assault', 3: 'Warrior'}
HERO_TYPE = {1: 'FL', 2: 'S', 3: 'BL'}
# Untranslated keys, decorations and the vehicle are not player-facing buildings.
HIDDEN_NAME = re.compile(r'^(buildingname_|decoration_|itemname_|hero_secret|BuildingName_|armed_truck)', re.I)
DECORATION_CLASS = 40
# Research benefits that add one more copy of a building. 30007 says "Barracks";
# the game's barracks is the Soldier Training Camp.
SLOT_BENEFITS = {30004: 1016, 30005: 1017, 30006: 1019, 30007: 1020, 30008: 1004, 30009: 5006}


def icon(folder, name):
    """Path of an icon in assets/icons, or None when it was not imported."""
    path = ICONS / folder / f'{name}.webp'
    return f'assets/icons/{folder}/{name}.webp' if path.exists() else None


def load(name):
    return json.loads((SOURCE / name).read_text(encoding='utf-8'))


def cost_columns(levels, cost_field='costs'):
    """Turn per-level cost lists into {resource: [count per level]}."""
    columns = {}
    for index, level in enumerate(levels):
        entries = list(level.get(cost_field, [])) + list(level.get('special_costs', []))
        for cost in entries:
            key = COST_KEYS.get(cost['type']) or ITEM_KEYS.get(cost.get('item_id'))
            if not key:
                continue
            column = columns.setdefault(key, [0] * len(levels))
            column[index] += int(cost['count'])
    return {key: values for key, values in columns.items() if any(values)}


def compact_requirements(prerequisites):
    """Keep only requirements the planner can check from tracked state."""
    result = []
    for req in prerequisites:
        kind = req.get('kind')
        if kind in ('building_level', 'any_building_in_list_level'):
            result.append(['b', req['building_ids'], req['minimum_level']])
        elif kind == 'any_building_class_level':
            result.append(['c', req['building_class'], req['minimum_level']])
        elif kind == 'research_level':
            result.append(['r', req['research_id'], req['minimum_level']])
    return result


def slot_unlocks(count_limits):
    """HQ level at which each numbered copy of a building becomes available."""
    unlocks = []
    for limit in sorted(count_limits, key=lambda item: item['base_level']):
        while len(unlocks) < limit['count']:
            unlocks.append(limit['base_level'])
    return unlocks or [1]


def research_slots(progression):
    """Building id -> research ids that each add one more copy."""
    slots = {}
    for node in progression['research']:
        for level in node['levels']:
            for benefit in level.get('benefits', []):
                if benefit['type'] in SLOT_BENEFITS:
                    slots.setdefault(SLOT_BENEFITS[benefit['type']], []).append(node['id'])
    return slots


def build_buildings(progression):
    buildings, seen = [], set()
    extra_slots = research_slots(progression)
    for raw in progression['buildings']:
        name = RENAMES.get(raw['id'], raw['name'])
        if raw['class'] == DECORATION_CLASS or HIDDEN_NAME.match(name) or raw['type'] not in GROUPS and raw['id'] != 1001:
            continue
        if name in seen:  # duplicate unlock-only entries (e.g. Fighter Command)
            continue
        seen.add(name)
        levels = sorted(raw['levels'], key=lambda level: level['level'])
        buildings.append({
            'id': raw['id'],
            'name': name,
            'class': raw['class'],
            'group': 'HQ' if raw['id'] == 1001 else GROUPS[raw['type']],
            'max': raw['available_max_level'],
            'slots': slot_unlocks(raw['count_limits']),
            'time': [level['base_time_seconds'] for level in levels],
            'power': [level['ability'] for level in levels],
            'cost': cost_columns(levels),
            'req': [compact_requirements(level['prerequisites']) for level in levels],
            'icon': icon('buildings', raw['id']),
            'researchSlots': extra_slots.get(raw['id'], []),
        })
    order = ['HQ', 'Economy', 'Military', 'Development', 'Season']
    buildings.sort(key=lambda item: (order.index(item['group']), item['id']))
    return buildings


def build_research(progression, layout):
    tree_icons = {tree['id']: tree['icon'] for tree in layout['trees']}
    node_icons = {tech['id']: tech['icon'] for tree in layout['trees'] for tech in tree['techs']}
    trees = [{
        'id': tree['id'], 'name': tree['name'], 'req': compact_requirements(tree['prerequisites']),
        'icon': icon('research', tree_icons.get(tree['id'], '')),
    } for tree in progression['research_types']]
    nodes = []
    for raw in progression['research']:
        levels = sorted(raw['levels'], key=lambda level: level['level'])
        effects = {}
        for index, level in enumerate(levels):
            for benefit in level.get('benefits', []):
                effect = effects.setdefault(benefit['type'], {'type': benefit['type'], 'name': benefit['name'], 'values': [0] * len(levels)})
                effect['values'][index] = benefit['value']
        nodes.append({
            'id': raw['id'],
            'name': raw['name'],
            'tree': raw['type_id'],
            'max': raw['max_level'],
            'time': [level['base_time_seconds'] for level in levels],
            'power': [level.get('ability', 0) for level in levels],
            'cost': cost_columns(levels),
            'req': [compact_requirements(level['prerequisites']) for level in levels],
            'effects': list(effects.values()),
            'icon': icon('research', node_icons.get(raw['id'], '')),
        })
    add_tree_layout(nodes)
    return trees, nodes


def add_tree_layout(nodes):
    """Give each node its parents in the same tree and a tier (row) for drawing the tree."""
    by_id = {node['id']: node for node in nodes}
    for node in nodes:
        parents = {req[1] for level in node['req'] for req in level if req[0] == 'r'}
        node['parents'] = sorted(pid for pid in parents if pid in by_id and by_id[pid]['tree'] == node['tree'])
    tiers = {}

    def tier(node, trail=()):
        if node['id'] not in tiers:
            parents = [by_id[pid] for pid in node['parents'] if pid not in trail]
            tiers[node['id']] = 1 + max((tier(parent, trail + (node['id'],)) for parent in parents), default=-1)
        return tiers[node['id']]

    for node in nodes:
        node['tier'] = tier(node)


def build_gear(equipment):
    """One entry per gear quality. All four slots share the same costs.

    Step N costs index N - 1. Steps 1 to the strengthen max are levels; for
    UR gear the promotion stages follow as extra steps.
    """
    gear = {}
    for raw in equipment['equipment']:
        if raw['quality'] in gear or not raw['manufacturable']:
            continue
        levels = [level for level in sorted(raw['strengthen_levels'], key=lambda level: level['level']) if level['level'] > 0]
        stages = sorted(raw.get('promotion_levels') or [], key=lambda step: (step['level'], step['stage']))[1:]
        craft = cost_columns([{'costs': raw['manufacturing_costs']}])
        gear[raw['quality']] = {
            'quality': raw['quality'],
            'levels': len(levels),
            'steps': len(levels) + len(stages),
            'stages': [[step['level'], step['stage']] for step in stages],
            'craft': {key: values[0] for key, values in craft.items()},
            'craftSeconds': raw['manufacturing_time_seconds'],
            'craftBuildingLevel': raw['required_building_level'],
            'cost': cost_columns(levels + stages),
        }
    return [gear[quality] for quality in sorted(gear)]


def build_fighter(raw):
    """Fighter level rows and wingman chip star costs.

    Rows are (level, phase). Phase 1-5 rows are the key upgrade stages the game
    shows as stage phase - 1 of 5. cost[key][r] is the cost of leaving row r
    (index 0 is unused), assuming no bonus progress.
    """
    rows = sorted(raw['levels'], key=lambda row: row['id'])
    cost = {key: [0] * (len(rows) + 1) for key in FIGHTER_ITEMS.values()}
    for row in rows:
        clicks = -(-row['progressTotal'] // row['progressAdd']) if row['progressAdd'] > 0 else 0
        for item in row['cost']:
            cost[FIGHTER_ITEMS[item['id']]][row['id']] += abs(item['count']) * clicks
    chips = [{
        'id': int(chip_id), 'name': chip['name'], 'quality': chip['quality'], 'slot': chip['slot'],
        'copies': [chip['stars'][str(star)]['copies'] for star in range(len(chip['stars']) - 1)],
        'icon': icon('fighter', Path(chip['icon']).stem),
    } for chip_id, chip in sorted(raw['modules'].items(), key=lambda item: int(item[0]))]
    # Components merge 3 to 1 up to level 8, then level by feeding XP where a
    # level L piece is worth 3^(L-1) XP. So a level L piece is always worth
    # 3^(L-1) level 1 copies. componentCost[L] is the cost of going L to L + 1.
    base = sorted((c for c in raw['components'].values() if c['slot'] == 0 and c['expPercentage'] == 0), key=lambda c: c['level'])
    component_cost = [1] + [2 * 3 ** (c['level'] - 1) for c in base[:-1]]
    # Evolution level E costs evolution[E] XP to reach E + 1. Activation (0 to 1) is not in the data.
    evolution = [0] * (len(raw['evolution']) + 1)
    for key, step in raw['evolution'].items():
        evolution[int(key)] = step['progressTotal']
    return {'rows': [[row['level'], row['phase']] for row in rows], 'cost': cost, 'chips': chips, 'chipSlots': CHIP_SLOTS,
            'componentSlots': [slot['name'] for slot in sorted(raw['slots'], key=lambda slot: slot['slot'])],
            # Icon per slot for levels 1-2, 3-4, 5-7 and 8+.
            'componentIcons': [[icon('fighter', Path(c['icon']).stem) for c in sorted(
                (c for c in raw['components'].values() if c['slot'] == slot['slot'] and c['expPercentage'] == 0), key=lambda c: c['level'])]
                for slot in sorted(raw['slots'], key=lambda slot: slot['slot'])],
            'componentCost': component_cost, 'evolutionXp': evolution[:-1]}


def build_heroes(heroes_raw, skill_info):
    heroes, seen = [], set()
    for raw in heroes_raw['playable_heroes']:
        rarity = RARITY[raw['quality']]
        key = f"{raw['name'].lower().replace(' ', '-')}-{rarity.lower()}"
        if key in seen:  # the export lists Nora twice with identical stats
            continue
        seen.add(key)
        skills = skill_info['heroes'].get(str(raw['id']), [])
        heroes.append({
            'id': key,
            'gameId': raw['id'],
            'name': raw['name'],
            'rarity': rarity,
            'heroClass': HERO_CLASS[raw['camp_type']],
            'type': HERO_TYPE[raw['army_type']],
            'promoted': raw['id'] == 31003,
            'maxLevel': raw['max_level'],
            'expCurve': str(raw['level_curve_id']),
            'skillCurve': str(raw['quality']),
            'icon': icon('heroes', raw['id']),
            'skillIcons': [icon('skills', f"{raw['id']}_{slot}") for slot in (1, 2, 3, 4)],
            # Specialty skills stay at level 1; only the others take skill books.
            'levelSkills': [skill['slot'] for skill in skills if skill['type'] != 'Specialty'] or [1, 2, 3],
            'skills': skills,
        })
    class_order = ['Warrior', 'Assault', 'Tactical']
    rarity_order = ['UR', 'SSR', 'SR']  # highest rarity first
    heroes.sort(key=lambda hero: (class_order.index(hero['heroClass']), rarity_order.index(hero['rarity']), hero['gameId']))

    exp_curves = {
        curve_id: [sum(cost['count'] for cost in level['costs']) for level in sorted(levels, key=lambda level: level['level'])]
        for curve_id, levels in heroes_raw['level_curves'].items()
    }
    skill_curves = {
        quality: [sum(cost['count'] for cost in level['costs']) for level in sorted(levels, key=lambda level: level['level'])]
        for quality, levels in heroes_raw['skill_level_curves'].items()
    }
    steps = sorted(heroes_raw['star_curve'], key=lambda step: step['step'])
    star_shards = [step['fragment_count'] for step in steps[1:]]
    # A promoted hero (Aria UR) pays the higher shard cost per step.
    promoted_shards = [step['extra_fragment_count'] for step in steps[1:]]
    skill_limits = [max(slot['level_limit'] for slot in step['skill_slots']) for step in steps]
    return heroes, exp_curves, skill_curves, star_shards, promoted_shards, skill_limits


def main():
    progression = load('progression.json')
    heroes_raw = load('heroes.json')
    resources = load('resources.json')
    equipment = load('equipment.json')
    fighter = load('fighter.json')
    trees, research = build_research(progression, load('research_layout.json'))
    heroes, exp_curves, skill_curves, star_shards, promoted_shards, skill_limits = build_heroes(heroes_raw, load('hero_skills.json'))
    modifiers = progression['construction_modifiers']
    data = {
        'version': 1,
        'resources': RESOURCE_LABELS,
        'resourceIcons': {key: icon('ui', name) for key, name in RESOURCE_ICONS.items()},
        'vipBuildingSpeed': modifiers['vip_building_speed_percent_by_level'],
        'benefitTypes': {'buildingSpeed': 20005, 'researchSpeed': 20008, 'buildingCost': 20007},
        'buildings': build_buildings(progression),
        'researchTrees': trees,
        'research': research,
        'heroes': heroes,
        'heroExp': exp_curves,
        'skillBooks': skill_curves,
        'starShards': star_shards,
        'starShardsPromoted': promoted_shards,
        'classIcons': {name: icon('ui', f'class_{camp}') for camp, name in HERO_CLASS.items()},
        'starSkillLimit': skill_limits,
        'producers': [{
            'building': item['building_id'], 'output': item['output_name'],
            'perHour': [level['base_output_per_hour'] for level in sorted(item['levels'], key=lambda level: level['level'])]
        } for item in resources['producer_buildings']],
        'outputBenefits': {'Food': 20001, 'Metal': 20002, 'Oil': 20003},
        'speedups': [{'category': item['category'], 'name': item['name'], 'minutes': item['duration_minutes']} for item in resources['speedups']],
        # Gear level L costs gearShards[L - 1] exclusive weapon shards to reach L + 1.
        'exclusiveGear': {str(gear['hero_id']): {'heroName': gear['hero_name'], 'icon': icon('weapons', f"weapon_{gear['hero_id']}")} for gear in heroes_raw['exclusive_gear']},
        'gear': build_gear(equipment),
        'fighter': build_fighter(fighter),
        'gearShards': [step['fragment_count'] for step in sorted(heroes_raw['exclusive_gear_level_curve'], key=lambda step: step['id'])],
    }
    body = json.dumps(data, separators=(',', ':'), ensure_ascii=False)
    OUTPUT.write_text(
        '// Generated by tools/build_game_data.py from data/source/*.json. Do not edit by hand.\n'
        f'window.ZROUTE_DATA = {body};\n',
        encoding='utf-8')
    print(f'Wrote {OUTPUT.relative_to(ROOT)} ({len(body) // 1024} KB): '
          f"{len(data['buildings'])} buildings, {len(research)} research nodes, {len(heroes)} heroes")


if __name__ == '__main__':
    main()
