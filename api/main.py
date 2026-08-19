from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
import pandas as pd
from pydantic import BaseModel
from dotenv import load_dotenv

from ml.data_loader import load_all
from ml.anomaly import run_anomaly_analysis
from ml.risk_engine import (
    run_full_mission_analysis,
    compute_cross_system_risk,
    generate_interventions
)
from ml.forecast import run_mars_mission_forecast
from ml.sans import run_sans_analysis
from ml.deterministic_rules import (
    run_deterministic_rules,
    get_combined_tier,
    get_biomarker_explanations,
    ALERT_TIERS
)

load_dotenv()

app = FastAPI(title="AstroKestrel API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# ─────────────────────────────────────────────────────────────
# STARTUP — Load all models and build indices
# ─────────────────────────────────────────────────────────────

print("Loading NASA OSDR data...")
metabolic, cardio, immune = load_all()

print("Running ML anomaly detection...")
anomaly_results = run_anomaly_analysis(metabolic, cardio, immune)

print("Running SANS neuro-ocular analysis...")
sans_results = run_sans_analysis()
anomaly_results = pd.concat(
    [anomaly_results,
     sans_results[['astronaut_id', 'system', 'days_from_launch', 'phase', 'risk_score']]],
    ignore_index=True
)

print("Running cross-system risk engine...")
mission_results = run_full_mission_analysis(anomaly_results)

print("Running Mars mission forecasting...")
forecast_results = run_mars_mission_forecast(anomaly_results)

print("Building deterministic clinical rules index...")
deterministic_index = {}
ASTRONAUT_IDS = ['C001', 'C002', 'C003', 'C004']

for astronaut_id in ASTRONAUT_IDS:
    ast_post_met = metabolic[
        (metabolic['astronaut_id'] == astronaut_id) &
        (metabolic['phase'] == 'post_return')
    ]
    ast_post_cardio = cardio[
        (cardio['astronaut_id'] == astronaut_id) &
        (cardio['phase'] == 'post_return')
    ]
    ast_post_immune = immune[
        (immune['astronaut_id'] == astronaut_id) &
        (immune['phase'] == 'post_return')
    ]

    if ast_post_met.empty:
        continue

    latest_met = ast_post_met.sort_values('days_from_launch').iloc[-1]
    latest_cardio = (
        ast_post_cardio.sort_values('days_from_launch').iloc[-1]
        if not ast_post_cardio.empty else None
    )
    latest_immune = (
        ast_post_immune.sort_values('days_from_launch').iloc[-1]
        if not ast_post_immune.empty else None
    )

    det_result = run_deterministic_rules(latest_met, latest_cardio, latest_immune)
    deterministic_index[astronaut_id] = det_result
    print(f"  {astronaut_id}: [{det_result['overall_tier']}] — {det_result['rules_count']} rules fired")

print("\nAll models ready. AstroKestrel operational.\n")


# ─────────────────────────────────────────────────────────────
# HELPER
# ─────────────────────────────────────────────────────────────

def _baseline_sample_count(astronaut_id: str) -> int:
    return len(metabolic[
        (metabolic['astronaut_id'] == astronaut_id) &
        (metabolic['phase'] == 'pre_flight')
    ])


# ─────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "status": "AstroKestrel operational",
        "version": "2.0.0",
        "astronauts": 4,
        "systems_monitored": 5,
        "engines": ["ML anomaly detection", "cross-system risk", "deterministic rules", "Mars forecasting"],
        "data_source": "NASA OSDR OSD-575 / OSD-530 (Inspiration4 mission)"
    }


@app.get("/api/dashboard")
def get_dashboard():
    astronauts = []
    for astronaut_id in ASTRONAUT_IDS:
        astronaut_data = mission_results[mission_results['astronaut_id'] == astronaut_id]
        if astronaut_data.empty:
            continue
        latest = astronaut_data.sort_values('day').iloc[-1]

        system_scores = {}
        latest_anomaly = anomaly_results[
            (anomaly_results['astronaut_id'] == astronaut_id) &
            (anomaly_results['days_from_launch'] == latest['day'])
        ]
        for _, row in latest_anomaly.iterrows():
            system_scores[row['system']] = row['risk_score']

        det_result = deterministic_index.get(astronaut_id, {})
        combined = get_combined_tier(latest['composite_risk'], det_result)

        astronauts.append({
            "id": astronaut_id,
            "name": f"Astronaut {astronaut_id}",
            "composite_risk": latest['composite_risk'],
            "alert_level": latest['alert_level'],
            "combined_tier": combined['final_tier'],
            "tier_source": combined['tier_source'],
            "deterministic_rules_fired": det_result.get('rules_count', 0),
            "systems_flagged": det_result.get('systems_flagged', []),
            "system_scores": system_scores,
            "latest_day": int(latest['day'])
        })

    critical_count = sum(
        1 for a in astronauts
        if a['combined_tier'] in ['IMMEDIATE_INTERVENTION', 'MEDICAL_ADVISORY']
    )

    return {
        "mission_status": "ACTIVE",
        "crew": astronauts,
        "critical_alerts": critical_count,
        "total_astronauts": 4
    }


@app.get("/api/astronaut/{astronaut_id}/timeline")
def get_timeline(astronaut_id: str):
    aid = astronaut_id.upper()
    data = mission_results[mission_results['astronaut_id'] == aid]
    if data.empty:
        return {"error": "Astronaut not found"}

    timeline = []
    for _, row in data.sort_values('day').iterrows():
        timeline.append({
            "day": int(row['day']),
            "composite_risk": row['composite_risk'],
            "alert_level": row['alert_level'],
            "interventions_needed": int(row['interventions_needed'])
        })

    return {"astronaut_id": aid, "timeline": timeline}


@app.get("/api/astronaut/{astronaut_id}/forecast")
def get_forecast(astronaut_id: str):
    aid = astronaut_id.upper()
    data = forecast_results[forecast_results['astronaut_id'] == aid]
    if data.empty:
        return {"error": "Astronaut not found"}

    systems = []
    for _, row in data.iterrows():
        systems.append({
            "system": row['system'],
            "day_30_risk": row['day_30_risk'],
            "day_90_risk": row['day_90_risk'],
            "day_180_risk": row['day_180_risk'],
            "critical_threshold_day": (
                row['critical_threshold_day'] if row['breaches_critical'] else None
            ),
            "breaches_critical": bool(row['breaches_critical'])
        })

    return {"astronaut_id": aid, "mars_mission_forecast": systems}


@app.get("/api/astronaut/{astronaut_id}/brief")
def get_brief(astronaut_id: str):
    aid = astronaut_id.upper()
    data = mission_results[mission_results['astronaut_id'] == aid]
    if data.empty:
        return {"error": "Astronaut not found"}

    latest = data.sort_values('day').iloc[-1]
    latest_anomaly = anomaly_results[
        (anomaly_results['astronaut_id'] == aid) &
        (anomaly_results['days_from_launch'] == latest['day'])
    ]

    system_scores = {}
    for _, row in latest_anomaly.iterrows():
        system_scores[row['system']] = row['risk_score']

    risk_result = compute_cross_system_risk(system_scores)
    interventions = generate_interventions(risk_result)

    det_result = deterministic_index.get(aid, {})
    combined = get_combined_tier(risk_result['composite_risk'], det_result)

    n_baseline = _baseline_sample_count(aid)
    confidence = "LOW" if n_baseline < 4 else "MODERATE" if n_baseline < 8 else "HIGH"

    return {
        "astronaut_id": aid,
        "day": int(latest['day']),
        "composite_risk": risk_result['composite_risk'],
        "alert_level": risk_result['alert_level'],
        "combined_tier": combined['final_tier'],
        "tier_source": combined['tier_source'],
        "tier_info": combined['tier_info'],
        "ml_tier": combined['ml_tier'],
        "deterministic_tier": combined['deterministic_tier'],
        "system_scores": system_scores,
        "interactions": risk_result['interactions_triggered'],
        "interventions": interventions,
        "deterministic_rules": det_result.get('fired_rules', []),
        "rules_count": det_result.get('rules_count', 0),
        "systems_flagged": det_result.get('systems_flagged', []),
        "commander_action": (
            combined['tier_info']['commander_action']
            if combined['tier_info'] else None
        ),
        "confidence": confidence,
        "confidence_note": (
            f"Risk scores based on {n_baseline} pre-flight baseline samples. "
            f"Confidence: {confidence}. "
            "Treat as clinical decision support — human CMO review required."
        )
    }


@app.get("/api/astronaut/{astronaut_id}/biomarkers")
def get_biomarkers(astronaut_id: str):
    aid = astronaut_id.upper()
    try:
        explanations = get_biomarker_explanations(metabolic, cardio, immune, aid)
        det_result = deterministic_index.get(aid, {})
        n_baseline = _baseline_sample_count(aid)

        return {
            "astronaut_id": aid,
            "explanations": explanations,
            "fired_rules": det_result.get('fired_rules', []),
            "overall_deterministic_tier": det_result.get('overall_tier'),
            "baseline_samples": n_baseline,
            "data_note": (
                "Values from NASA OSDR Inspiration4 post-return blood samples. "
                "Cardiovascular multiplex assay values are relative concentrations — "
                "z-score deviation from personal pre-flight baseline is the primary "
                "clinical signal. CRP converted from pg/mL to mg/L equivalent for "
                "clinical interpretation."
            )
        }
    except Exception as e:
        return {"error": str(e), "detail": "Biomarker explanation generation failed"}


@app.get("/api/alerts")
def get_alerts():
    critical = mission_results[
        mission_results['alert_level'].isin(['CRITICAL', 'HIGH'])
    ].sort_values('composite_risk', ascending=False)

    alerts = []
    for _, row in critical.iterrows():
        det_result = deterministic_index.get(row['astronaut_id'], {})
        combined = get_combined_tier(row['composite_risk'], det_result)
        alerts.append({
            "astronaut_id": row['astronaut_id'],
            "day": int(row['day']),
            "alert_level": row['alert_level'],
            "combined_tier": combined['final_tier'],
            "composite_risk": row['composite_risk'],
            "interventions_needed": int(row['interventions_needed']),
            "deterministic_rules_fired": det_result.get('rules_count', 0)
        })

    return {"total_alerts": len(alerts), "alerts": alerts}


# ─────────────────────────────────────────────────────────────
# CHAT — Clinical Briefing Assistant (Groq / Llama 3.3 70B)
# Framed as decision support, not medical authority
# ─────────────────────────────────────────────────────────────

class ChatQuery(BaseModel):
    query: str
    context: str = ""


@app.post("/api/chat")
async def chat(payload: ChatQuery):
    api_key = os.getenv("GROQ_API_KEY", "")

    system_prompt = f"""You are AstroKestrel's Clinical Briefing Assistant — a decision-support 
tool for crew health surveillance on long-duration space missions. 

You have access to real NASA Inspiration4 astronaut biomarker data processed through 
AstroKestrel's ML anomaly detection and deterministic clinical rules engine.

Current mission data: {payload.context}

IMPORTANT OPERATIONAL CONSTRAINTS:
- You support the Crew Medical Officer's decision-making. You do not replace it.
- Never prescribe specific drug dosages or treatment protocols.
- Never make definitive medical diagnoses.
- Always recommend CMO review for any MEDICAL_ADVISORY or IMMEDIATE_INTERVENTION findings.
- Frame all outputs as risk assessments requiring human clinical judgment.
- Use specific biomarker numbers from the data when available.
- Keep responses under 180 words.
- Use operational language: "elevated risk", "warrants review", "trend suggests", not "the astronaut has X disease".

You are speaking to a mission commander or flight surgeon. Be direct, factual, and actionable."""

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "llama-3.3-70b-versatile",
                "max_tokens": 500,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": payload.query}
                ]
            },
            timeout=30.0
        )
        data = response.json()
        reply = data["choices"][0]["message"]["content"]
        return {
            "reply": reply,
            "disclaimer": (
                "This briefing supports, but does not replace, "
                "Crew Medical Officer clinical judgment."
            )
        }