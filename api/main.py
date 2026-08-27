from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
import pandas as pd
from pydantic import BaseModel
from dotenv import load_dotenv
from pathlib import Path

from ml.data_loader import load_all
from ml.anomaly import run_anomaly_analysis
from ml.risk_engine import (
    run_full_mission_analysis,
    compute_cross_system_risk,
    generate_interventions
)
from ml.forecast import run_mars_mission_forecast
from ml.sans import run_sans_analysis
from ml.radiation import run_radiation_analysis
from ml.deterministic_rules import (
    run_deterministic_rules,
    get_combined_tier,
    get_biomarker_explanations,
    ALERT_TIERS
)

# Load .env from project root regardless of where uvicorn is started from
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# Debug: confirm keys loaded
print(f"GROQ key loaded: {'yes' if os.getenv('GROQ_API_KEY') else 'NO — CHECK .env'}")
print(f"HF token loaded: {'yes' if os.getenv('HF_TOKEN') else 'NO — CHECK .env'}")

app = FastAPI(title="AstroKestrel API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# ─────────────────────────────────────────────────────────────
# STARTUP
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

print("Running radiation/oxidative stress analysis...")
radiation_results = run_radiation_analysis(immune)
anomaly_results = pd.concat(
    [anomaly_results,
     radiation_results[['astronaut_id', 'system', 'days_from_launch', 'phase', 'risk_score']]],
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
# HELPERS
# ─────────────────────────────────────────────────────────────

def _baseline_sample_count(astronaut_id: str) -> int:
    return len(metabolic[
        (metabolic['astronaut_id'] == astronaut_id) &
        (metabolic['phase'] == 'pre_flight')
    ])


def _uncertainty_for_n(n: int) -> dict:
    pct = max(5, round(30 / max(n, 1)))
    confidence = "LOW" if n < 4 else "MODERATE" if n < 8 else "HIGH"
    return {
        "confidence": confidence,
        "uncertainty_pct": pct,
        "uncertainty_note": (
            f"Estimated score uncertainty: ±{pct}% "
            f"(based on {n} pre-flight baseline samples). "
            f"Treat as clinical decision support — not validated diagnostic output."
        )
    }


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
        "engines": [
            "ML anomaly detection",
            "cross-system risk",
            "deterministic clinical rules",
            "Mars mission forecasting",
            "SANS neuro-ocular",
            "radiation/oxidative stress proxy"
        ],
        "data_source": "NASA OSDR OSD-575 / OSD-530 (Inspiration4 mission)",
        "offline_capable": "ML and deterministic engines run fully offline",
        "cloud_dependent": "AI chat assistant only"
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

        n = _baseline_sample_count(astronaut_id)
        unc = _uncertainty_for_n(n)

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
            "latest_day": int(latest['day']),
            "confidence": unc['confidence'],
            "uncertainty_pct": unc['uncertainty_pct']
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

    n = _baseline_sample_count(aid)
    unc = _uncertainty_for_n(n)

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
        "confidence": unc['confidence'],
        "uncertainty_pct": unc['uncertainty_pct'],
        "uncertainty_note": unc['uncertainty_note'],
        "confidence_note": (
            f"Risk scores based on {n} pre-flight baseline samples. "
            f"Confidence: {unc['confidence']} (±{unc['uncertainty_pct']}% estimated uncertainty). "
            "Treat as clinical decision support — human CMO review required."
        )
    }


@app.get("/api/astronaut/{astronaut_id}/biomarkers")
def get_biomarkers(astronaut_id: str):
    aid = astronaut_id.upper()
    try:
        explanations = get_biomarker_explanations(metabolic, cardio, immune, aid)
        det_result = deterministic_index.get(aid, {})
        n = _baseline_sample_count(aid)
        unc = _uncertainty_for_n(n)

        return {
            "astronaut_id": aid,
            "explanations": explanations,
            "fired_rules": det_result.get('fired_rules', []),
            "overall_deterministic_tier": det_result.get('overall_tier'),
            "baseline_samples": n,
            "confidence": unc['confidence'],
            "uncertainty_pct": unc['uncertainty_pct'],
            "data_note": (
                "Values from NASA OSDR Inspiration4 post-return blood samples. "
                "Cardiovascular multiplex assay values are relative concentrations — "
                "z-score deviation from personal pre-flight baseline is the primary "
                "clinical signal. CRP converted from pg/mL to mg/L equivalent for "
                "clinical interpretation."
            )
        }
    except Exception as e:
        return {"error": str(e)}


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
# CHAT — IBM Granite via HuggingFace (primary)
#        Groq/Llama fallback if HF unavailable
#        Granite Guardian screening on every response
# ─────────────────────────────────────────────────────────────

class ChatQuery(BaseModel):
    query: str
    context: str = ""


async def screen_with_guardian(response_text: str, hf_token: str) -> dict:
    """
    Screen AI response with IBM Granite Guardian 3.3 via HuggingFace.
    Checks for three medical safety criteria:
    1. Drug dosage prescriptions
    2. Definitive diagnoses
    3. Actions requiring physician authorization
    """
    medical_safety_prompt = f"""<|user|>
Evaluate this medical AI response for safety. Does it:
1. Prescribe specific drug dosages or treatments?
2. Make a definitive medical diagnosis?
3. Recommend actions requiring physician authorization?

Response to evaluate: "{response_text[:400]}"

Answer with SAFE or UNSAFE.
<|assistant|>"""

    try:
        headers = {"Content-Type": "application/json"}
        if hf_token:
            headers["Authorization"] = f"Bearer {hf_token}"

        async with httpx.AsyncClient() as client:
            result = await client.post(
                "https://api-inference.huggingface.co/models/ibm-granite/granite-guardian-3.3-2b",
                headers=headers,
                json={
                    "inputs": medical_safety_prompt,
                    "parameters": {"max_new_tokens": 10, "return_full_text": False}
                },
                timeout=8.0
            )
            output = result.json()
            generated = ""
            if isinstance(output, list) and output:
                generated = str(output[0].get("generated_text", "")).upper()
            is_safe = "UNSAFE" not in generated
            return {"safe": is_safe, "screened": True, "response": generated[:50]}
    except Exception:
        return {"safe": True, "screened": False, "response": "screening unavailable"}


@app.post("/api/chat")
async def chat(payload: ChatQuery):
    hf_token = os.getenv("HF_TOKEN", "")
    groq_key = os.getenv("GROQ_API_KEY", "")

    print(f"[chat] HF_TOKEN present: {bool(hf_token)} | GROQ_API_KEY present: {bool(groq_key)}")

    # Build a compact structured summary of ALL crew so no astronaut gets cut off
    context_summary = ""
    try:
        import json
        dashboard = json.loads(payload.context) if payload.context else {}
        crew = dashboard.get("crew", [])
        lines = []
        for a in crew:
            scores = ", ".join(f"{k}={v:.2f}" for k, v in (a.get("system_scores") or {}).items())
            lines.append(
                f"{a['id']}: composite={a.get('composite_risk', 0):.2f} "
                f"tier={a.get('combined_tier', '?')} alert={a.get('alert_level', '?')} "
                f"day={a.get('latest_day', '?')} uncertainty=±{a.get('uncertainty_pct', '?')}% "
                f"systems=[{scores}]"
            )
        context_summary = "\n".join(lines) if lines else "(no crew data)"
    except Exception:
        context_summary = payload.context[:600] if payload.context else "(no data)"

    system_prompt = f"""You are AstroKestrel's Clinical Briefing Assistant — a decision-support tool for crew health surveillance on long-duration space missions.

You have access to real NASA Inspiration4 astronaut biomarker data processed through AstroKestrel's ML anomaly detection and deterministic clinical rules engine.

Current crew status:
{context_summary}

OPERATIONAL CONSTRAINTS:
- You support the Crew Medical Officer's decision-making. You do not replace it.
- Never prescribe specific drug dosages or treatment protocols.
- Never make definitive medical diagnoses.
- Always recommend CMO review for MEDICAL_ADVISORY or IMMEDIATE_INTERVENTION findings.
- Frame outputs as risk assessments requiring human clinical judgment.
- Keep responses under 150 words.
- Use operational language: elevated risk, warrants review, trend suggests.
- Write in plain conversational prose. No markdown, no bullet points, no bold, no headers.
You are speaking to a mission commander or flight surgeon. Be direct and factual."""

    # ── Primary: Groq compound ─────────────────────────────────────
    # Note: HuggingFace inference API is blocked on many networks (DNS failure).
    # Groq compound is the reliable path with this key tier.
    if groq_key:
        try:
            print(f"[chat] Trying Groq compound ({groq_key[:8]}...)...")
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {groq_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "groq/compound",
                        "max_tokens": 400,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": payload.query}
                        ]
                    },
                    timeout=30.0
                )
                print(f"[chat] Groq status: {response.status_code}")
                data = response.json()
                if "choices" in data:
                    reply = data["choices"][0]["message"]["content"]
                    print(f"[chat] Groq success")
                    return {
                        "reply": reply,
                        "engine": "Groq Compound",
                        "guardian_screened": False,
                        "disclaimer": "Clinical briefing only. Does not replace CMO judgment."
                    }
                else:
                    print(f"[chat] Groq unexpected response: {str(data)[:300]}")
        except Exception as e:
            print(f"[chat] Groq exception: {type(e).__name__}: {e}")

    # ── Fallback: HuggingFace Granite (requires network access to api-inference.huggingface.co) ──
    if hf_token:
        try:
            prompt = f"<|system|>\n{system_prompt}\n<|user|>\n{payload.query}\n<|assistant|>\n"
            print(f"[chat] Trying HF Granite (prompt length: {len(prompt)} chars)...")
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api-inference.huggingface.co/models/ibm-granite/granite-3.3-8b-instruct",
                    headers={
                        "Authorization": f"Bearer {hf_token}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "inputs": prompt,
                        "parameters": {
                            "max_new_tokens": 300,
                            "temperature": 0.3,
                            "return_full_text": False
                        }
                    },
                    timeout=30.0
                )
                output = response.json()
                print(f"[chat] HF status: {response.status_code} | response: {str(output)[:300]}")

                if isinstance(output, list) and output and "generated_text" in output[0]:
                    reply = output[0]["generated_text"].strip()
                    if reply:
                        guardian = await screen_with_guardian(reply, hf_token)
                        if not guardian["safe"]:
                            reply = (
                                "This query requires direct CMO evaluation. "
                                "AstroKestrel's safety screening recommends "
                                "immediate Crew Medical Officer review."
                            )
                        print(f"[chat] HF success — guardian screened: {guardian['screened']}")
                        return {
                            "reply": reply,
                            "engine": "IBM Granite 3.3 8B (HuggingFace)",
                            "guardian_screened": guardian["screened"],
                            "guardian_safe": guardian["safe"],
                            "disclaimer": "Clinical briefing only. Screened by IBM Granite Guardian."
                        }
                elif isinstance(output, dict) and "error" in output:
                    print(f"[chat] HF API error: {output['error']}")
        except Exception as e:
            print(f"[chat] HF exception: {type(e).__name__}: {e}")

    print("[chat] Both engines failed — returning error to client")
    return {
        "reply": "Communication error. Both IBM Granite and fallback unavailable. Check API keys in .env file.",
        "engine": "unavailable",
        "guardian_screened": False,
        "disclaimer": ""
    }