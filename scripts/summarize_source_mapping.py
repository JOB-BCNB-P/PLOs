from pathlib import Path
import csv, json
from collections import Counter, defaultdict

source = Path('/home/ubuntu/plo-assessment-system/docs/source_analysis/curriculum_mapping_import.csv')
rows = list(csv.DictReader(source.open(encoding='utf-8-sig')))
summary = {
    'source': 'Curriculummapping-2565วพบกรุงเทพพฤษภาคม65.xlsx',
    'records': len(rows),
    'courses': len({r['course_code'] for r in rows}),
    'plo_codes': sorted({r['plo_code'] for r in rows}),
    'mapping_level_counts': dict(Counter(r['mapping_level'] for r in rows)),
    'year_level_counts': dict(Counter(r['year_level'] for r in rows)),
    'records_by_plo': dict(Counter(r['plo_code'] for r in rows)),
    'records_by_year_and_level': dict(Counter((r['year_level'], r['mapping_level']) for r in rows)),
}
summary['records_by_year_and_level'] = {f'{k[0]}|{k[1]}': v for k, v in summary['records_by_year_and_level'].items()}
Path('/home/ubuntu/plo-assessment-system/docs/source_analysis/mapping_summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(summary, ensure_ascii=False, indent=2))
