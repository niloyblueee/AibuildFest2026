import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent))
from app.optimize import suggest_best_interventions
from app.data_loader import get_dataset
from app.model import get_meta

df = get_dataset()
meta = get_meta()
selected = ['Dhaka', 'Sylhet', 'Sunamganj', 'Kishoreganj']
results = suggest_best_interventions(
    df=df,
    selected_districts=selected,
    scenario_name='observed_baseline',
    feature_cols=meta['feature_cols'],
    total_vaccine_budget=1000000,
    allocation_options=[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
    num_suggestions=10,
)
for i, s in enumerate(results, start=1):
    print(f"Option {i}: risk={s['risk_score']}")
    print(f"  cases7={s['totals']['cases_7d']:.2f}, cases14={s['totals']['cases_14d']:.2f}, deaths={s['totals']['deaths_7d']:.2f}, averted14={s['cases_averted_14d']:.2f}")
    print('  alloc:', [(e['district'], e['allocation_pct'], round(e['coverage_children_pct'],2)) for e in s['allocation_plan']])
    print('  effective_budget=', s.get('effective_vaccine_budget'))
    print()
