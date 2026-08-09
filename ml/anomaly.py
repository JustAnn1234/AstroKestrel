import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')

def get_numeric_features(df):
    exclude = ['Sample Name', 'astronaut_id', 'days_from_launch', 'phase']
    return [c for c in df.columns if c not in exclude and df[c].dtype in ['float64', 'int64']]

def build_baseline(df, astronaut_id):
    return df[
        (df['astronaut_id'] == astronaut_id) &
        (df['phase'] == 'pre_flight')
    ].copy()

def compute_deviation_score(baseline_df, sample_row, feature_cols):
    baseline_data = baseline_df[feature_cols].fillna(baseline_df[feature_cols].median())
    baseline_mean = baseline_data.mean()
    baseline_std = baseline_data.std().replace(0, 1)

    sample_data = sample_row[feature_cols].fillna(baseline_mean)
    z_scores = ((sample_data - baseline_mean) / baseline_std).abs()

    mean_z = z_scores.mean()
    # Sigmoid to map z-score to 0-1 risk
    risk = float(1 / (1 + np.exp(-0.5 * (mean_z - 2))))
    return round(risk, 3)

def run_anomaly_analysis(metabolic, cardio, immune):
    results = []

    for astronaut in ['C001', 'C002', 'C003', 'C004']:
        for dataset_name, df in [('metabolic', metabolic), ('cardiovascular', cardio), ('immune', immune)]:
            features = get_numeric_features(df)
            if not features:
                continue

            baseline = build_baseline(df, astronaut)
            if len(baseline) < 2:
                continue

            post = df[
                (df['astronaut_id'] == astronaut) &
                (df['phase'] == 'post_return')
            ].copy()

            for _, row in post.iterrows():
                risk = compute_deviation_score(baseline, row, features)
                results.append({
                    'astronaut_id': astronaut,
                    'system': dataset_name,
                    'days_from_launch': row['days_from_launch'],
                    'phase': row['phase'],
                    'risk_score': risk
                })

    return pd.DataFrame(results)

def get_risk_label(score):
    if score >= 0.7:
        return 'HIGH'
    elif score >= 0.4:
        return 'MODERATE'
    else:
        return 'LOW'

if __name__ == "__main__":
    import sys, os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from ml.data_loader import load_all

    metabolic, cardio, immune = load_all()
    results = run_anomaly_analysis(metabolic, cardio, immune)

    results['risk_label'] = results['risk_score'].apply(get_risk_label)

    print("\n=== AstroKestrel RISK SCORES ===")
    print(results.sort_values(['astronaut_id', 'system', 'days_from_launch']).to_string())

    print("\n=== SUMMARY BY ASTRONAUT & SYSTEM ===")
    summary = results.groupby(['astronaut_id', 'system'])['risk_score'].mean().round(3)
    print(summary)

    print("\n=== HIGHEST RISK READINGS ===")
    high = results[results['risk_label'] == 'HIGH'].sort_values('risk_score', ascending=False)
    print(high.to_string() if len(high) > 0 else "No HIGH risk readings detected")

    print("\n=== RECOVERY TREND (C001 metabolic) ===")
    c001 = results[(results['astronaut_id'] == 'C001') & (results['system'] == 'metabolic')]
    print(c001[['days_from_launch', 'risk_score', 'risk_label']].to_string())