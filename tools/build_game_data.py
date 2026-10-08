#!/usr/bin/env python3
"""Compact the raw game JSON exports into one small file the app can load.

Reads data/source/progression.json, heroes.json and resources.json and writes
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

COST_KEYS = {1: 'food', 2: 'metal', 3: 'oil', 5: 'heroExp', 211: 'uranium', 212: 'antibody'}
ITEM_KEYS = {'item_research_info': 'researchData', 'item_HeroSkill_Book': 'skillBooks'}
RESOURCE_LABELS = {
    'food': 'Food', 'metal': 'Metal', 'oil': 'Oil', 'uranium': 'Uranium', 'antibody': 'Antibody',
    'researchData': 'Research Data', 'heroExp': 'Hero EXP', 'shards': 'Hero Shards', 'skillBooks': 'Skill Books'
}
GROUPS = {1: 'Economy', 2: 'Military', 4: 'Development', 5: 'Season'}
RENAMES = {1001: 'HQ'}
RARITY = {3: 'SR', 4: 'SSR', 5: 'UR'}
HERO_CLASS = {1: 'Tactical', 2: 'Assault', 3: 'Warrior'}
HERO_TYPE = {1: 'FL', 2: 'S', 3: 'BL'}
# Untranslated keys, decorations and the vehicle are not player-facing buildings.
HIDDEN_NAME = re.compile(r'^(buildingname_|decoration_|itemname_|hero_secret|BuildingName_|armed_truck)', re.I)
DECORATION_CLASS = 40


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


def build_buildings(progression):
    buildings, seen = [], set()
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
        })
    order = ['HQ', 'Economy', 'Military', 'Development', 'Season']
    buildings.sort(key=lambda item: (order.index(item['group']), item['id']))
    return buildings


def build_research(progression):
    trees = [{
        'id': tree['id'], 'name': tree['name'], 'req': compact_requirements(tree['prerequisites'])
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


def build_heroes(heroes_raw):
    heroes, seen = [], set()
    for raw in heroes_raw['playable_heroes']:
        rarity = RARITY[raw['quality']]
        key = f"{raw['name'].lower().replace(' ', '-')}-{rarity.lower()}"
        if key in seen:  # the export lists Nora twice with identical stats
            continue
        seen.add(key)
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
        })
    class_order = ['Warrior', 'Assault', 'Tactical']
    rarity_order = ['SR', 'SSR', 'UR']
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
    skill_limits = [max(slot['level_limit'] for slot in step['skill_slots']) for step in steps]
    return heroes, exp_curves, skill_curves, star_shards, skill_limits


def main():
    progression = load('progression.json')
    heroes_raw = load('heroes.json')
    resources = load('resources.json')
    trees, research = build_research(progression)
    heroes, exp_curves, skill_curves, star_shards, skill_limits = build_heroes(heroes_raw)
    modifiers = progression['construction_modifiers']
    data = {
        'version': 1,
        'resources': RESOURCE_LABELS,
        'vipBuildingSpeed': modifiers['vip_building_speed_percent_by_level'],
        'benefitTypes': {'buildingSpeed': 20005, 'researchSpeed': 20008, 'buildingCost': 20007},
        'buildings': build_buildings(progression),
        'researchTrees': trees,
        'research': research,
        'heroes': heroes,
        'heroExp': exp_curves,
        'skillBooks': skill_curves,
        'starShards': star_shards,
        'starSkillLimit': skill_limits,
        'producers': {
            str(item['building_id']): [level['base_output_per_hour'] for level in item['levels']]
            for item in resources['producer_buildings']
        },
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
