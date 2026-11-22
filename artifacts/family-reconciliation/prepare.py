import collections
import json
import re
import unicodedata
from pathlib import Path

import openpyxl

base = Path(__file__).parent
database = json.loads((base / 'database-before.json').read_text(encoding='utf-8'))
sheet = openpyxl.load_workbook(r'C:\Users\ASYV\Downloads\LFHS_students_data.xlsx', data_only=True).active

def tokens(name):
    return sorted(re.findall(r'\w+', unicodedata.normalize('NFKD', name).casefold()))

source = [dict(row=i, first_name=r[3].strip(), last_name=r[2].strip(), family='Family ' + r[6][1:])
          for i, r in enumerate(list(sheet.values)[1:], 2) if r[5] == 'EY-2025']
plan, unresolved = [], []
for player in database['players']:
    if player['family'] not in ('Family 3', 'Family 4'):
        continue
    name = tokens(player['first_name'] + ' ' + player['last_name'])
    exact = [s for s in source if tokens(s['first_name'] + ' ' + s['last_name']) == name]
    candidates = exact or [s for s in source if len(name) >= 2 and not (collections.Counter(name) - collections.Counter(tokens(s['first_name'] + ' ' + s['last_name'])))]
    if len(candidates) != 1:
        unresolved.append(player)
        continue
    match = candidates[0]
    if match['family'] != player['family']:
        plan.append(dict(id=player['id'], first_name=player['first_name'], last_name=player['last_name'], before=player['family'], after=match['family'], source_row=match['row'], source_name=match['first_name'] + ' ' + match['last_name'], evidence='full name' if exact else 'unique complete name tokens within longer spreadsheet name'))

result = dict(changes=plan, unresolved=unresolved, source_rosters=[s for s in source if s['family'] in ('Family 3', 'Family 4')])
(base / 'plan.json').write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding='utf-8')
print(json.dumps(dict(changes=plan, unresolved=unresolved), indent=2))
