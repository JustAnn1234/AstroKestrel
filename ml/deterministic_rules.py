import pandas as pd
import numpy as np

# ─────────────────────────────────────────────────────────────
# CLINICAL REFERENCE RANGES
# Based on NASA Operational Medicine and standard clinical ranges
# Format: low_critical, low_alert, high_alert, high_critical
# ─────────────────────────────────────────────────────────────

METABOLIC_THRESHOLDS = {
    'glucose_value_milligram_per_deciliter': {
        'low_critical': 55,
        'low_alert': 70,
        'high_alert': 126,
        'high_critical': 200,
        'unit': 'mg/dL',
        'name': 'Glucose',
        'system': 'metabolic',
        'significance': (
            'Blood glucose regulation. Elevation indicates metabolic stress '
            'or developing insulin resistance — a documented spaceflight effect. '
            'Low values indicate hypoglycaemia risk, dangerous during EVA operations.'
        )
    },
    'sodium_value_millimol_per_liter': {
        'low_critical': 125,
        'low_alert': 133,
        'high_alert': 147,
        'high_critical': 155,
        'unit': 'mmol/L',
        'name': 'Sodium',
        'system': 'metabolic',
        'significance': (
            'Critical electrolyte for nerve and muscle function. '
            'Spaceflight disrupts fluid distribution and renal regulation, '
            'directly impacting sodium balance and cognitive performance.'
        )
    },
    'potassium_value_millimol_per_liter': {
        'low_critical': 2.8,
        'low_alert': 3.3,
        'high_alert': 5.5,
        'high_critical': 6.2,
        'unit': 'mmol/L',
        'name': 'Potassium',
        'system': 'metabolic',
        'significance': (
            'Potassium abnormality carries direct cardiac arrhythmia risk. '
            'This is a mission-critical biomarker — cardiac events in space '
            'cannot be managed with the same resources as on Earth.'
        )
    },
    'calcium_value_milligram_per_deciliter': {
        'low_critical': 7.5,
        'low_alert': 8.3,
        'high_alert': 10.7,
        'high_critical': 12.0,
        'unit': 'mg/dL',
        'name': 'Calcium',
        'system': 'metabolic',
        'significance': (
            'Calcium leaches from bones at 0.5–1.5% per month in microgravity. '
            'Elevated blood calcium indicates significant ongoing bone resorption. '
            'This is also relevant to kidney stone formation, a documented spaceflight risk.'
        )
    },
    'creatinine_value_milligram_per_deciliter': {
        'low_critical': None,
        'low_alert': None,
        'high_alert': 1.5,
        'high_critical': 2.5,
        'unit': 'mg/dL',
        'name': 'Creatinine',
        'system': 'metabolic',
        'significance': (
            'Primary kidney filtration marker. Elevated creatinine indicates '
            'renal stress, which compounds with dehydration and fluid shifts '
            'common during spaceflight.'
        )
    },
    'urea_nitrogen_bun_value_milligram_per_deciliter': {
        'low_critical': None,
        'low_alert': None,
        'high_alert': 25,
        'high_critical': 40,
        'unit': 'mg/dL',
        'name': 'BUN (Blood Urea Nitrogen)',
        'system': 'metabolic',
        'significance': (
            'Reflects kidney function and protein metabolism. '
            'Elevated BUN in space may indicate either kidney stress '
            'or muscle breakdown from atrophy — both are mission concerns.'
        )
    },
    'alt_value_units_per_liter': {
        'low_critical': None,
        'low_alert': None,
        'high_alert': 56,
        'high_critical': 100,
        'unit': 'U/L',
        'name': 'ALT (Liver Enzyme)',
        'system': 'metabolic',
        'significance': (
            'Liver enzyme released when hepatic cells are stressed or damaged. '
            'Spaceflight-induced oxidative stress and altered drug metabolism '
            'can elevate ALT, indicating hepatic strain.'
        )
    },
    'ast_value_units_per_liter': {
        'low_critical': None,
        'low_alert': None,
        'high_alert': 40,
        'high_critical': 80,
        'unit': 'U/L',
        'name': 'AST (Liver/Muscle Enzyme)',
        'system': 'metabolic',
        'significance': (
            'Present in liver and muscle. Elevation in spaceflight may reflect '
            'muscle atrophy-related cell breakdown or hepatic stress from '
            'radiation-induced oxidative damage.'
        )
    },
}

CARDIOVASCULAR_THRESHOLDS = {
    # CRP thresholds converted to pg/mL (clinical ranges are in mg/L)
    # 1 mg/L = 1,000,000 pg/mL
    # Low risk: < 1 mg/L, Average: 1-3 mg/L, High: > 3 mg/L, Very High: > 10 mg/L
    'crp_concentration_picogram_per_milliliter': {
        'low_critical': None,
        'low_alert': None,
        'high_alert': 3000000,    # 3 mg/L — elevated cardiovascular risk
        'high_critical': 10000000, # 10 mg/L — very high systemic inflammation
        'unit': 'pg/mL (≡ mg/L ÷ 1,000,000)',
        'name': 'CRP (C-Reactive Protein)',
        'system': 'cardiovascular',
        'significance': (
            'Primary systemic inflammation marker. Values above 3 mg/L '
            'indicate elevated cardiovascular risk. Above 10 mg/L suggests '
            'significant systemic inflammation consistent with post-spaceflight '
            'endothelial stress and immune dysregulation.'
        )
    },
    # Fibrinogen and Alpha-2 Macroglobulin: multiplex assay values cannot be
    # directly compared to standard clinical ranges. These biomarkers use
    # z-score baseline-relative rules (handled in get_biomarker_explanations).
    # Absolute thresholds are set conservatively based on cohort observed ranges.
    'fibrinogen_concentration_nanogram_per_milliliter': {
        'low_critical': None,
        'low_alert': None,
        'high_alert': 6000,    # >2 SD above observed cohort range
        'high_critical': 8000, # >3 SD above observed cohort range
        'unit': 'ng/mL (multiplex, not standard clinical units)',
        'name': 'Fibrinogen',
        'system': 'cardiovascular',
        'significance': (
            'Fibrinogen drives blood clot formation. Elevated levels '
            'increase deep vein thrombosis risk — a documented spaceflight '
            'complication. NOTE: Values from multiplex serum assay; '
            'relative change from baseline is the primary clinical signal.'
        )
    },
    'a2_macroglobulin_concentration_nanogram_per_milliliter': {
        'low_critical': None,
        'low_alert': None,
        'high_alert': 3000000,  # conservative upper bound from cohort
        'high_critical': 4500000,
        'unit': 'ng/mL (multiplex, not standard clinical units)',
        'name': 'Alpha-2 Macroglobulin',
        'system': 'cardiovascular',
        'significance': (
            'Acute phase protein regulating inflammation and clotting. '
            'Elevated in spaceflight vascular stress states. '
            'Relative change from pre-flight baseline is the primary signal.'
        )
    },
}

IMMUNE_THRESHOLDS = {
    'il_6_concentration_picogram_per_milliliter': {
        'low_critical': None,
        'low_alert': None,
        'high_alert': 7.0,
        'high_critical': 50.0,
        'unit': 'pg/mL',
        'name': 'IL-6 (Interleukin-6)',
        'system': 'immune',
        'significance': (
            'Primary pro-inflammatory cytokine. Chronic IL-6 elevation '
            'drives systemic inflammation, endothelial dysfunction, and '
            'bone resorption — three simultaneous spaceflight hazards. '
            'IL-6 is a key marker of the inflammatory triad in spaceflight.'
        )
    },
    'tnfα_concentration_picogram_per_milliliter': {
        'low_critical': None,
        'low_alert': None,
        'high_alert': 8.1,
        'high_critical': 50.0,
        'unit': 'pg/mL',
        'name': 'TNF-α (Tumour Necrosis Factor alpha)',
        'system': 'immune',
        'significance': (
            'TNF-α drives cell death and systemic inflammation. '
            'Chronically elevated TNF-α accelerates cardiovascular disease '
            'and bone loss — both critical spaceflight health risks. '
            'Works synergistically with IL-6 to amplify inflammatory damage.'
        )
    },
    'il_1β_concentration_picogram_per_milliliter': {
        'low_critical': None,
        'low_alert': None,
        'high_alert': 5.0,
        'high_critical': 20.0,
        'unit': 'pg/mL',
        'name': 'IL-1β (Interleukin-1 beta)',
        'system': 'immune',
        'significance': (
            'Part of the inflammatory triad with IL-6 and TNF-α. '
            'IL-1β drives fever, pain, and systemic inflammation. '
            'Significant elevation indicates active immune dysregulation '
            'beyond normal spaceflight adaptation.'
        )
    },
    'vegf_a_concentration_picogram_per_milliliter': {
        'low_critical': None,
        'low_alert': None,
        'high_alert': 500.0,
        'high_critical': 1000.0,
        'unit': 'pg/mL',
        'name': 'VEGF-A (Vascular Endothelial Growth Factor)',
        'system': 'immune',
        'significance': (
            'VEGF-A controls new blood vessel formation and vascular '
            'permeability. Elevated VEGF-A contributes to the fluid '
            'leakage from vessels implicated in the cephalad fluid '
            'shift driving SANS development.'
        )
    },
    'mcp_1_concentration_picogram_per_milliliter': {
        'low_critical': None,
        'low_alert': None,
        'high_alert': 500.0,
        'high_critical': 2000.0,
        'unit': 'pg/mL',
        'name': 'MCP-1 (Monocyte Chemoattractant Protein-1)',
        'system': 'immune',
        'significance': (
            'MCP-1 recruits monocytes to sites of inflammation and '
            'is elevated by both immune dysregulation and radiation-induced '
            'oxidative stress — making it a proxy marker for spaceflight '
            'radiation exposure impact.'
        )
    },
    'il_8_concentration_picogram_per_milliliter': {
        'low_critical': None,
        'low_alert': None,
        'high_alert': 20.0,
        'high_critical': 100.0,
        'unit': 'pg/mL',
        'name': 'IL-8 (Interleukin-8)',
        'system': 'immune',
        'significance': (
            'IL-8 drives neutrophil recruitment and is elevated by both '
            'immune dysregulation and oxidative stress from radiation. '
            'Serves as an additional proxy for radiation impact on '
            'immune function in the absence of direct dosimetry.'
        )
    },
}

# ─────────────────────────────────────────────────────────────
# FOUR-TIER ALERT SYSTEM
# ─────────────────────────────────────────────────────────────

ALERT_TIERS = {
    'WATCH': {
        'level': 1,
        'color': '#3b82f6',
        'bg': 'rgba(59,130,246,0.1)',
        'description': 'Biomarker approaching threshold. Increase monitoring frequency.',
        'commander_action': (
            'Increase biomarker monitoring to every 6 hours. '
            'No immediate intervention required. Log and continue observation.'
        ),
        'escalation_window_hours': 24,
    },
    'REVIEW': {
        'level': 2,
        'color': '#eab308',
        'bg': 'rgba(234,179,8,0.1)',
        'description': 'Clinical threshold crossed or ML risk elevated. CMO review required within 24 hours.',
        'commander_action': (
            'Schedule Crew Medical Officer evaluation within 24 hours. '
            'Document current biomarker readings. Begin reviewing applicable '
            'countermeasure protocols.'
        ),
        'escalation_window_hours': 12,
    },
    'MEDICAL_ADVISORY': {
        'level': 3,
        'color': '#f97316',
        'bg': 'rgba(249,115,22,0.1)',
        'description': 'Significant deviation or cross-system coupling detected. Implement countermeasure protocol.',
        'commander_action': (
            'Initiate countermeasure protocol per mission medical guidelines. '
            'CMO evaluation required immediately. Prepare status report for '
            'next Earth communication window. Consider modifying EVA schedule.'
        ),
        'escalation_window_hours': 4,
    },
    'IMMEDIATE_INTERVENTION': {
        'level': 4,
        'color': '#ef4444',
        'bg': 'rgba(239,68,68,0.1)',
        'description': 'Critical threshold breach. Mission commander must act immediately.',
        'commander_action': (
            'IMMEDIATE ACTION REQUIRED. Initiate emergency medical protocol. '
            'Suspend all non-essential EVA operations. Contact Mission Control '
            'on priority channel at earliest window. CMO assume primary '
            'health management responsibility.'
        ),
        'escalation_window_hours': 1,
    },
}


def _check_single_biomarker(col_name, value, threshold_dict):
    """
    Check a single biomarker value against its clinical thresholds.
    Returns a fired rule dict or None if within normal range.
    """
    thresholds = threshold_dict.get(col_name)
    if thresholds is None:
        return None
    if pd.isna(value):
        return None

    tier = None
    direction = None
    pct_of_threshold = None

    # Check high thresholds
    if thresholds.get('high_critical') and value >= thresholds['high_critical']:
        tier = 'IMMEDIATE_INTERVENTION'
        direction = 'HIGH'
        pct_of_threshold = (value / thresholds['high_critical']) * 100
    elif thresholds.get('high_alert') and value >= thresholds['high_alert']:
        tier = 'MEDICAL_ADVISORY'
        direction = 'HIGH'
        pct_of_threshold = (value / thresholds['high_alert']) * 100
    elif thresholds.get('high_alert') and value >= thresholds['high_alert'] * 0.95:
        tier = 'WATCH'
        direction = 'HIGH'
        pct_of_threshold = (value / thresholds['high_alert']) * 100

    # Check low thresholds
    elif thresholds.get('low_critical') and value <= thresholds['low_critical']:
        tier = 'IMMEDIATE_INTERVENTION'
        direction = 'LOW'
        pct_of_threshold = (thresholds['low_critical'] / value) * 100 if value > 0 else 999
    elif thresholds.get('low_alert') and value <= thresholds['low_alert']:
        tier = 'MEDICAL_ADVISORY'
        direction = 'LOW'
        pct_of_threshold = (thresholds['low_alert'] / value) * 100 if value > 0 else 999
    elif thresholds.get('low_alert') and value <= thresholds['low_alert'] * 1.01:
        tier = 'WATCH'
        direction = 'LOW'

    if tier is None:
        return None

    return {
        'biomarker': col_name,
        'name': thresholds.get('name', col_name),
        'value': round(float(value), 3),
        'unit': thresholds.get('unit', ''),
        'system': thresholds.get('system', 'unknown'),
        'significance': thresholds.get('significance', ''),
        'direction': direction,
        'tier': tier,
        'high_alert': thresholds.get('high_alert'),
        'high_critical': thresholds.get('high_critical'),
        'low_alert': thresholds.get('low_alert'),
        'low_critical': thresholds.get('low_critical'),
        'pct_of_threshold': round(pct_of_threshold, 1) if pct_of_threshold else None,
        'rule_type': 'DETERMINISTIC',
    }


def run_deterministic_rules(metabolic_row, cardio_row, immune_row):
    """
    Run all deterministic rules against biomarker data for one astronaut
    at one timepoint. Returns list of fired rules and overall tier.
    """
    fired_rules = []

    # Check metabolic
    if metabolic_row is not None:
        for col, thresholds in METABOLIC_THRESHOLDS.items():
            if col in metabolic_row.index:
                rule = _check_single_biomarker(col, metabolic_row[col], METABOLIC_THRESHOLDS)
                if rule:
                    fired_rules.append(rule)

    # Check cardiovascular
    if cardio_row is not None:
        for col in CARDIOVASCULAR_THRESHOLDS:
            if col in cardio_row.index:
                rule = _check_single_biomarker(col, cardio_row[col], CARDIOVASCULAR_THRESHOLDS)
                if rule:
                    fired_rules.append(rule)

    # Check immune
    if immune_row is not None:
        for col in IMMUNE_THRESHOLDS:
            if col in immune_row.index:
                rule = _check_single_biomarker(col, immune_row[col], IMMUNE_THRESHOLDS)
                if rule:
                    fired_rules.append(rule)

    # Determine highest tier fired
    tier_levels = {'WATCH': 1, 'REVIEW': 2, 'MEDICAL_ADVISORY': 3, 'IMMEDIATE_INTERVENTION': 4}
    level_names = {1: 'WATCH', 2: 'REVIEW', 3: 'MEDICAL_ADVISORY', 4: 'IMMEDIATE_INTERVENTION'}

    if not fired_rules:
        overall_tier = None
    else:
        max_level = max(tier_levels[r['tier']] for r in fired_rules)
        overall_tier = level_names[max_level]

    # Apply multi-system escalation rule:
    # If 2+ different systems have WATCH or higher, escalate overall tier
    if fired_rules:
        systems_with_rules = set(r['system'] for r in fired_rules)
        if len(systems_with_rules) >= 3 and tier_levels.get(overall_tier, 0) < 3:
            overall_tier = 'MEDICAL_ADVISORY'
        elif len(systems_with_rules) >= 2 and tier_levels.get(overall_tier, 0) < 2:
            overall_tier = 'REVIEW'

    return {
        'fired_rules': fired_rules,
        'overall_tier': overall_tier,
        'rules_count': len(fired_rules),
        'systems_flagged': list(set(r['system'] for r in fired_rules)),
        'tier_info': ALERT_TIERS.get(overall_tier) if overall_tier else None,
    }


def ml_risk_to_tier(composite_risk):
    """
    Map probabilistic ML composite risk score to alert tier.
    Used to combine with deterministic rules.
    """
    if composite_risk >= 0.85:
        return 'IMMEDIATE_INTERVENTION'
    elif composite_risk >= 0.70:
        return 'MEDICAL_ADVISORY'
    elif composite_risk >= 0.50:
        return 'REVIEW'
    elif composite_risk >= 0.30:
        return 'WATCH'
    return None


def get_combined_tier(ml_composite_risk, deterministic_result):
    """
    Combine ML probabilistic tier and deterministic rules tier.
    The higher of the two wins. Deterministic rules can escalate
    but cannot suppress ML-detected risk.
    """
    tier_levels = {None: 0, 'WATCH': 1, 'REVIEW': 2, 'MEDICAL_ADVISORY': 3, 'IMMEDIATE_INTERVENTION': 4}
    level_names = {0: None, 1: 'WATCH', 2: 'REVIEW', 3: 'MEDICAL_ADVISORY', 4: 'IMMEDIATE_INTERVENTION'}

    ml_tier = ml_risk_to_tier(ml_composite_risk)
    det_tier = deterministic_result.get('overall_tier')

    ml_level = tier_levels.get(ml_tier, 0)
    det_level = tier_levels.get(det_tier, 0)

    final_level = max(ml_level, det_level)
    final_tier = level_names[final_level]

    return {
        'final_tier': final_tier,
        'ml_tier': ml_tier,
        'deterministic_tier': det_tier,
        'tier_source': (
            'DETERMINISTIC' if det_level > ml_level else
            'ML_MODEL' if ml_level > det_level else
            'BOTH' if ml_level == det_level and ml_level > 0 else
            'NONE'
        ),
        'tier_info': ALERT_TIERS.get(final_tier) if final_tier else None,
    }


def get_biomarker_explanations(metabolic_df, cardio_df, immune_df, astronaut_id):
    """
    For a given astronaut, return the full biomarker explanation
    for their latest post-return reading, including values, baselines,
    z-scores, and whether any deterministic rules fired.
    """
    all_thresholds = {**METABOLIC_THRESHOLDS, **CARDIOVASCULAR_THRESHOLDS, **IMMUNE_THRESHOLDS}
    explanations = {'cardiovascular': [], 'immune': [], 'metabolic': []}

    for dataset_name, df, thresholds in [
        ('metabolic', metabolic_df, METABOLIC_THRESHOLDS),
        ('cardiovascular', cardio_df, CARDIOVASCULAR_THRESHOLDS),
        ('immune', immune_df, IMMUNE_THRESHOLDS),
    ]:
        ast_data = df[df['astronaut_id'] == astronaut_id].copy()
        baseline = ast_data[ast_data['phase'] == 'pre_flight']
        latest_post = ast_data[ast_data['phase'] == 'post_return'].sort_values(
            'days_from_launch'
        ).iloc[-1] if len(ast_data[ast_data['phase'] == 'post_return']) > 0 else None

        if latest_post is None or len(baseline) == 0:
            continue

        for col, threshold in thresholds.items():
            if col not in ast_data.columns:
                continue

            current_val = latest_post.get(col)
            if pd.isna(current_val):
                continue

            baseline_vals = baseline[col].dropna()
            if len(baseline_vals) == 0:
                continue

            baseline_mean = baseline_vals.mean()
            baseline_std = baseline_vals.std() if len(baseline_vals) > 1 else baseline_mean * 0.1
            baseline_std = max(baseline_std, baseline_mean * 0.05)  # min 5% std

            z_score = (current_val - baseline_mean) / baseline_std if baseline_std > 0 else 0

            rule = _check_single_biomarker(col, current_val, thresholds)

            explanations[dataset_name].append({
                'biomarker': col,
                'name': threshold.get('name', col),
                'current_value': round(float(current_val), 3),
                'baseline_mean': round(float(baseline_mean), 3),
                'baseline_std': round(float(baseline_std), 3),
                'z_score': round(float(z_score), 2),
                'unit': threshold.get('unit', ''),
                'high_alert': threshold.get('high_alert'),
                'low_alert': threshold.get('low_alert'),
                'significance': threshold.get('significance', ''),
                'deterministic_rule_fired': rule is not None,
                'deterministic_tier': rule['tier'] if rule else None,
                'direction': rule['direction'] if rule else 'NORMAL',
            })

    return explanations


if __name__ == '__main__':
    import sys, os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from ml.data_loader import load_all

    metabolic, cardio, immune = load_all()

    print("\n=== DETERMINISTIC RULES ENGINE TEST ===")
    for astronaut in ['C001', 'C002', 'C003', 'C004']:
        ast_post_met = metabolic[
            (metabolic['astronaut_id'] == astronaut) &
            (metabolic['phase'] == 'post_return')
        ]
        ast_post_cardio = cardio[
            (cardio['astronaut_id'] == astronaut) &
            (cardio['phase'] == 'post_return')
        ]
        ast_post_immune = immune[
            (immune['astronaut_id'] == astronaut) &
            (immune['phase'] == 'post_return')
        ]

        if ast_post_met.empty:
            continue

        latest_met = ast_post_met.sort_values('days_from_launch').iloc[-1]
        latest_cardio = ast_post_cardio.sort_values('days_from_launch').iloc[-1] if not ast_post_cardio.empty else None
        latest_immune = ast_post_immune.sort_values('days_from_launch').iloc[-1] if not ast_post_immune.empty else None

        result = run_deterministic_rules(latest_met, latest_cardio, latest_immune)

        print(f"\nAstronaut {astronaut}:")
        print(f"  Deterministic tier: {result['overall_tier']}")
        print(f"  Rules fired: {result['rules_count']}")
        if result['fired_rules']:
            for rule in result['fired_rules']:
                print(f"    [{rule['tier']}] {rule['name']}: {rule['value']} {rule['unit']} ({rule['direction']})")