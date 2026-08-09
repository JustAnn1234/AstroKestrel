import pandas as pd
import numpy as np

SYSTEM_WEIGHTS = {
    'cardiovascular': 0.30,
    'immune': 0.30,
    'metabolic': 0.20,
    'neuro_ocular': 0.20
}

INTERACTION_RULES = [
    {
        'systems': ['cardiovascular', 'immune'],
        'threshold': 0.6,
        'penalty': 1.4,
        'description': 'Cardiovascular-immune cascade: elevated inflammation accelerating cardiac stress'
    },
    {
        'systems': ['immune', 'metabolic'],
        'threshold': 0.5,
        'penalty': 1.25,
        'description': 'Metabolic-immune coupling: systemic inflammation disrupting metabolic homeostasis'
    },
    {
        'systems': ['neuro_ocular', 'cardiovascular'],
        'threshold': 0.6,
        'penalty': 1.35,
        'description': 'SANS-cardiovascular interaction: intracranial pressure elevation compounding cardiovascular stress'
    },
    {
        'systems': ['neuro_ocular', 'immune'],
        'threshold': 0.6,
        'penalty': 1.3,
        'description': 'Neuroinflammatory cascade: immune dysregulation driving optic nerve inflammation'
    },
    {
        'systems': ['cardiovascular', 'immune', 'metabolic'],
        'threshold': 0.5,
        'penalty': 1.7,
        'description': 'CRITICAL: Multi-system cascade detected across cardiovascular, immune and metabolic systems'
    },
    {
        'systems': ['cardiovascular', 'immune', 'neuro_ocular'],
        'threshold': 0.6,
        'penalty': 1.8,
        'description': 'CRITICAL: Triple cascade — cardiovascular stress, immune dysregulation and SANS onset detected simultaneously'
    }
]

def compute_cross_system_risk(system_scores: dict) -> dict:
    base_score = sum(
        system_scores.get(system, 0) * weight
        for system, weight in SYSTEM_WEIGHTS.items()
    )

    interaction_penalty = 1.0
    triggered_interactions = []

    for rule in INTERACTION_RULES:
        systems_above = [
            s for s in rule['systems']
            if system_scores.get(s, 0) >= rule['threshold']
        ]
        if len(systems_above) == len(rule['systems']):
            if rule['penalty'] > interaction_penalty:
                interaction_penalty = rule['penalty']
            triggered_interactions.append(rule['description'])

    composite = min(base_score * interaction_penalty, 1.0)

    if composite >= 0.75:
        alert_level = 'CRITICAL'
    elif composite >= 0.55:
        alert_level = 'HIGH'
    elif composite >= 0.35:
        alert_level = 'MODERATE'
    else:
        alert_level = 'LOW'

    return {
        'composite_risk': round(composite, 3),
        'alert_level': alert_level,
        'base_score': round(base_score, 3),
        'interaction_penalty': round(interaction_penalty, 3),
        'interactions_triggered': triggered_interactions,
        'system_scores': system_scores
    }

def generate_interventions(risk_result: dict) -> list:
    interventions = []
    scores = risk_result['system_scores']
    level = risk_result['alert_level']

    if scores.get('cardiovascular', 0) >= 0.6:
        interventions.append({
            'priority': 'HIGH',
            'system': 'Cardiovascular',
            'action': 'Increase resistance exercise to 90 min/day. Monitor blood pressure every 6 hours. Review fluid intake protocol.'
        })

    if scores.get('immune', 0) >= 0.6:
        interventions.append({
            'priority': 'HIGH',
            'system': 'Immune',
            'action': 'Flag for medical review. Check for latent viral reactivation. Review sleep quality logs — immune dysregulation correlates with sleep disruption.'
        })

    if scores.get('neuro_ocular', 0) >= 0.6:
        interventions.append({
            'priority': 'HIGH',
            'system': 'Neuro-Ocular (SANS)',
            'action': 'Initiate visual acuity assessment. Monitor intraocular pressure. Review fluid restriction protocol — consider head-down tilt sleep position modification to reduce CSF pooling.'
        })

    if scores.get('metabolic', 0) >= 0.5:
        interventions.append({
            'priority': 'MODERATE',
            'system': 'Metabolic',
            'action': 'Review electrolyte balance. Adjust caloric intake. Monitor glucose trends over next 48 hours.'
        })

    if level == 'CRITICAL':
        interventions.insert(0, {
            'priority': 'CRITICAL',
            'system': 'Mission Commander',
            'action': 'IMMEDIATE: Multi-system cascade detected. Reduce EVA schedule. Initiate daily medical check-in. Consider early return evaluation if trajectory continues.'
        })

    return interventions

def generate_daily_brief(astronaut_id, day, risk_result, interventions):
    level = risk_result['alert_level']
    composite = risk_result['composite_risk']
    scores = risk_result['system_scores']

    brief = f"AstroKestrel DAILY BRIEF — Astronaut {astronaut_id} — Mission Day {day}\n"
    brief += "=" * 60 + "\n"
    brief += f"Overall Risk: {level} ({composite})\n\n"
    brief += "System Status:\n"

    for system, score in scores.items():
        label = 'HIGH' if score >= 0.7 else 'MODERATE' if score >= 0.4 else 'LOW'
        brief += f"  {system.capitalize():<20} {score:.3f}  [{label}]\n"

    if risk_result['interactions_triggered']:
        brief += "\nInteraction Alerts:\n"
        for interaction in risk_result['interactions_triggered']:
            brief += f"  ⚠ {interaction}\n"

    if interventions:
        brief += "\nRecommended Actions:\n"
        for iv in interventions:
            brief += f"  [{iv['priority']}] {iv['system']}: {iv['action']}\n"

    return brief

def run_full_mission_analysis(anomaly_results_df):
    astronauts = anomaly_results_df['astronaut_id'].unique()
    timepoints = sorted(anomaly_results_df['days_from_launch'].unique())

    all_results = []

    for astronaut in astronauts:
        for day in timepoints:
            day_data = anomaly_results_df[
                (anomaly_results_df['astronaut_id'] == astronaut) &
                (anomaly_results_df['days_from_launch'] == day)
            ]

            if day_data.empty:
                continue

            system_scores = {}
            for _, row in day_data.iterrows():
                system_scores[row['system']] = row['risk_score']

            risk_result = compute_cross_system_risk(system_scores)
            interventions = generate_interventions(risk_result)
            brief = generate_daily_brief(astronaut, day, risk_result, interventions)

            all_results.append({
                'astronaut_id': astronaut,
                'day': day,
                'composite_risk': risk_result['composite_risk'],
                'alert_level': risk_result['alert_level'],
                'interactions': len(risk_result['interactions_triggered']),
                'interventions_needed': len(interventions),
                'brief': brief
            })

    return pd.DataFrame(all_results)

if __name__ == "__main__":
    import sys, os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from ml.data_loader import load_all
    from ml.anomaly import run_anomaly_analysis

    metabolic, cardio, immune = load_all()
    anomaly_results = run_anomaly_analysis(metabolic, cardio, immune)
    mission_results = run_full_mission_analysis(anomaly_results)

    print("\n=== MISSION RISK DASHBOARD ===")
    print(mission_results[['astronaut_id', 'day', 'composite_risk',
                            'alert_level', 'interactions',
                            'interventions_needed']].to_string())

    print("\n\n=== SAMPLE DAILY BRIEF ===")
    c001_high = mission_results[
        (mission_results['astronaut_id'] == 'C001') &
        (mission_results['alert_level'].isin(['HIGH', 'CRITICAL']))
    ]
    if not c001_high.empty:
        print(c001_high.iloc[0]['brief'])

    print("\n=== CRITICAL ALERTS ACROSS MISSION ===")
    critical = mission_results[mission_results['alert_level'].isin(['HIGH', 'CRITICAL'])]
    print(critical[['astronaut_id', 'day', 'composite_risk',
                    'alert_level', 'interventions_needed']].to_string())