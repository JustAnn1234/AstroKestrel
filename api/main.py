from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
import pandas as pd
import os
from pydantic import BaseModel

from ml.data_loader import load_all
from ml.anomaly import run_anomaly_analysis
from ml.risk_engine import run_full_mission_analysis, compute_cross_system_risk, generate_interventions
from ml.forecast import run_mars_mission_forecast
from ml.sans import run_sans_analysis

from dotenv import load_dotenv
load_dotenv()

app = FastAPI(title="AstroKestrel API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

print("Loading NASA data and running models...")
metabolic, cardio, immune = load_all()
anomaly_results = run_anomaly_analysis(metabolic, cardio, immune)
sans_results = run_sans_analysis()
anomaly_results = pd.concat([anomaly_results, sans_results[['astronaut_id', 'system', 'days_from_launch', 'phase', 'risk_score']]], ignore_index=True)
mission_results = run_full_mission_analysis(anomaly_results)
forecast_results = run_mars_mission_forecast(anomaly_results)
print("Models ready.")

@app.get("/")
def root():
    return {"status": "AstroKestrel operational", "astronauts": 4, "systems_monitored": 3}

@app.get("/api/dashboard")
def get_dashboard():
    astronauts = []
    for astronaut_id in ['C001', 'C002', 'C003', 'C004']:
        astronaut_data = mission_results[mission_results['astronaut_id'] == astronaut_id]
        latest = astronaut_data.sort_values('day').iloc[-1]
        
        system_scores = {}
        latest_anomaly = anomaly_results[
            (anomaly_results['astronaut_id'] == astronaut_id) &
            (anomaly_results['days_from_launch'] == latest['day'])
        ]
        for _, row in latest_anomaly.iterrows():
            system_scores[row['system']] = row['risk_score']

        astronauts.append({
            "id": astronaut_id,
            "name": f"Astronaut {astronaut_id}",
            "composite_risk": latest['composite_risk'],
            "alert_level": latest['alert_level'],
            "system_scores": system_scores,
            "latest_day": int(latest['day'])
        })

    critical_count = sum(1 for a in astronauts if a['alert_level'] in ['CRITICAL', 'HIGH'])

    return {
        "mission_status": "ACTIVE",
        "crew": astronauts,
        "critical_alerts": critical_count,
        "total_astronauts": 4
    }

@app.get("/api/astronaut/{astronaut_id}/timeline")
def get_timeline(astronaut_id: str):
    data = mission_results[mission_results['astronaut_id'] == astronaut_id.upper()]
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
    
    return {"astronaut_id": astronaut_id.upper(), "timeline": timeline}

@app.get("/api/astronaut/{astronaut_id}/forecast")
def get_forecast(astronaut_id: str):
    data = forecast_results[forecast_results['astronaut_id'] == astronaut_id.upper()]
    if data.empty:
        return {"error": "Astronaut not found"}
    
    systems = []
    for _, row in data.iterrows():
        systems.append({
            "system": row['system'],
            "day_30_risk": row['day_30_risk'],
            "day_90_risk": row['day_90_risk'],
            "day_180_risk": row['day_180_risk'],
            "critical_threshold_day": row['critical_threshold_day'] if row['breaches_critical'] else None,
            "breaches_critical": bool(row['breaches_critical'])
        })
    
    return {"astronaut_id": astronaut_id.upper(), "mars_mission_forecast": systems}

@app.get("/api/astronaut/{astronaut_id}/brief")
def get_brief(astronaut_id: str):
    data = mission_results[mission_results['astronaut_id'] == astronaut_id.upper()]
    if data.empty:
        return {"error": "Astronaut not found"}
    
    latest = data.sort_values('day').iloc[-1]
    latest_anomaly = anomaly_results[
        (anomaly_results['astronaut_id'] == astronaut_id.upper()) &
        (anomaly_results['days_from_launch'] == latest['day'])
    ]
    
    system_scores = {}
    for _, row in latest_anomaly.iterrows():
        system_scores[row['system']] = row['risk_score']
    
    risk_result = compute_cross_system_risk(system_scores)
    interventions = generate_interventions(risk_result)
    
    return {
        "astronaut_id": astronaut_id.upper(),
        "day": int(latest['day']),
        "composite_risk": risk_result['composite_risk'],
        "alert_level": risk_result['alert_level'],
        "system_scores": system_scores,
        "interactions": risk_result['interactions_triggered'],
        "interventions": interventions
    }

@app.get("/api/alerts")
def get_alerts():
    critical = mission_results[
        mission_results['alert_level'].isin(['CRITICAL', 'HIGH'])
    ].sort_values('composite_risk', ascending=False)
    
    alerts = []
    for _, row in critical.iterrows():
        alerts.append({
            "astronaut_id": row['astronaut_id'],
            "day": int(row['day']),
            "alert_level": row['alert_level'],
            "composite_risk": row['composite_risk'],
            "interventions_needed": int(row['interventions_needed'])
        })
    
class ChatQuery(BaseModel):
    query: str
    context: str = ""

@app.post("/api/chat")
async def chat(payload: ChatQuery):
    api_key = os.getenv("GROQ_API_KEY", "")
    
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
                    {
                        "role": "system",
                        "content": f"""You are AstroKestrel, an AI mission health intelligence system for space exploration.
You have access to real NASA Inspiration4 astronaut biomarker data.
Current mission data: {payload.context}
Answer questions about crew health, risk levels, and interventions concisely and professionally.
Use specific numbers from the data. Keep responses under 150 words.
You are speaking to a mission commander. Be direct and actionable."""
                    },
                    {
                        "role": "user",
                        "content": payload.query
                    }
                ]
            },
            timeout=30.0
        )
        data = response.json()
        reply = data["choices"][0]["message"]["content"]
        return {"reply": reply}

    return {"total_alerts": len(alerts), "alerts": alerts}