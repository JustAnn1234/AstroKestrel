# 🦅 AstroKestrel
### AI-Powered Astronaut Physiological Risk Intelligence System

> **IBM AI Builders Challenge — August 2026**  
> Theme: Advance Space Exploration with AI  
> Built by: Omosomi Ann Hassan

---

## The Problem

In 2030, astronauts will spend 18 months traveling to Mars. The biggest threat to that mission isn't a rocket failure — it's what space quietly does to the human body.

Bone density loss. Cardiovascular deconditioning. Immune dysregulation. Vision damage from rising intracranial pressure (SANS). These systems don't fail independently — they **cascade**. And NASA's current tools monitor each system in isolation, reacting to symptoms rather than predicting them.

**AstroKestrel sees what's coming before the first symptom appears.**

Just as the kestrel is the only bird that can hold perfectly still in a storm while watching everything below it with extraordinary precision — AstroKestrel holds steady, watches all four body systems simultaneously, and acts before the crisis arrives.

---

## The Solution

AstroKestrel is a cross-system predictive health intelligence platform that:

- Ingests real astronaut biomarker data from NASA's Open Science Data Repository (Inspiration4 mission)
- Builds a personalised pre-flight baseline for each crew member
- Detects anomalies across **4 body systems** simultaneously: cardiovascular, immune, metabolic, and neuro-ocular (SANS)
- Flags dangerous **cross-system interactions** — e.g. when cardiovascular AND immune systems deteriorate together, the combined risk is exponentially worse than either alone
- Forecasts deterioration trajectories across a simulated **180-500 day Mars mission**
- Delivers **actionable intervention recommendations** to mission commanders before symptoms appear
- Features a dual-mode interface: **Modern Dashboard** and **NASA Flight Display** mode
- Includes **Ask AstroKestrel** — a live AI mission briefing assistant powered by real biomarker data

---

## What Makes It Different

Every existing space health tool is either:
- **Reactive** — responds to symptoms you report
- **Siloed** — monitors one system at a time

AstroKestrel is the first integrated, cross-system, **predictive** health intelligence system built for space medicine.

When cardiovascular AND immune markers deteriorate together, the risk isn't additive — it's multiplicative. AstroKestrel's interaction penalty engine catches that cascade. No current operational tool does.

---

## Real Data. Real Findings.

Built on NASA OSDR datasets from the **Inspiration4 mission** (OSD-575, OSD-530):
- Comprehensive Metabolic Panel — 28 samples, 4 astronauts, 7 timepoints
- Cardiovascular serum biomarkers (CRP, fibrinogen, haptoglobin)
- 143-cytokine immune panel (IL-6, TNF-α, IL-1β, IFN-γ, VEGF-A)
- RNA sequencing data — 22,475 genes, 20 SANS-relevant gene signatures identified

### Key findings from real data:

**Astronaut C001** — cardiovascular system deteriorates progressively post-return, reaching CRITICAL risk by Day 82. Immune system peaks simultaneously — a cross-system cascade that AstroKestrel flags before individual system thresholds would trigger any alert.

**Mars mission projection** — C001's cardiovascular system breaches CRITICAL threshold by Mission Day 80, with immune cascade beginning at Day 60, and neuro-ocular (SANS) risk reaching critical by Day 150. AstroKestrel recommends intervention by Day 46 — two weeks before the first crisis.

**Astronaut C003** — immediate CRITICAL immune response on return Day 1, with neuro-ocular risk remaining persistently elevated across all timepoints. Highest SANS risk profile in the crew.

---

## AI Approach & Architecture

```text
NASA OSDR Data (OSD-575 + OSD-530)
       │
       ▼
Data Loader (ml/data_loader.py)
   • Parses astronaut IDs, mission timepoints
   • Pre-flight baseline vs post-return phases
       │
       ▼
Anomaly Detection (ml/anomaly.py)
   • Z-score deviation from personal pre-flight baseline
   • Sigmoid normalisation → 0–1 risk scale
   • Per-system scores: cardiovascular, immune, metabolic
       │
       ▼
SANS Module (ml/sans.py)
   • 20 SANS-relevant genes identified in RNA-seq data
   • Neuro-ocular risk scoring: 4th body system
       │
       ▼
Cross-System Risk Engine (ml/risk_engine.py)  <-- THE NOVEL LAYER
   • Weighted composite scoring across all 4 systems
   • Interaction penalty rules:
       - Cardiovascular + Immune → 1.4x penalty
       - SANS + Cardiovascular → 1.35x penalty
       - Triple cascade → 1.8x penalty
   • Actionable intervention generation
       │
       ▼
Mars Mission Forecasting (ml/forecast.py)
   • Polynomial trajectory fitting on post-return data
   • 180–500 day extrapolation
   • Critical threshold day prediction
   • Intervention timing recommendations
       │
       ▼
FastAPI Backend (api/main.py)
   • 6 endpoints: dashboard, timeline, forecast, brief, alerts, chat
       │
       ▼
React Dashboard (astrokestrel-frontend/)
   • Dual-mode: Modern + NASA Flight Display
   • Floating AI chat assistant (Ask AstroKestrel)
   • Mission simulation slider (Day 1–500)
   • 4-system radar chart
   • Real-time risk timeline


---

## How IBM Bob Was Used

IBM Bob was used as the primary development partner throughout the build:
- Architecture planning and API endpoint design
- Debugging the anomaly scoring normalisation pipeline
- Optimising the cross-system interaction penalty logic
- React component structure, state management, and dual-mode theming
- Data pipeline troubleshooting across multiple NASA dataset formats
- README and documentation drafting

---

## Challenge Theme Alignment

**August Challenge: Advance Space Exploration with AI**

AstroKestrel directly addresses NASA's documented gap in integrated, predictive space health monitoring. It transforms space medicine from reactive symptom management to insight-driven risk intelligence — enabling smarter missions and making deep space exploration safer for human crews.

> *"In mythology, Argus had a hundred eyes and could never be surprised. AstroKestrel watches four body systems simultaneously and acts before the crisis arrives."*

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Data | NASA OSDR (OSD-575, OSD-530) |
| ML | Python, scikit-learn, NumPy, pandas |
| AI Chat | Groq API (Llama 3.3 70B) |
| API | FastAPI, Uvicorn |
| Frontend | React 19, Vite, Recharts, Lucide |

---

## Setup & Run

### Prerequisites
- Python 3.10+
- Node.js 18+
- Groq API key (free at console.groq.com)

### Backend
```bash
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt

# Create .env file with your Groq key
echo GROQ_API_KEY=your_key_here > .env

uvicorn api.main:app --reload --port 8000
```

### Frontend
```bash
cd astrokestrel-frontend
npm install
npm run dev
```

Open `http://localhost:5173`

---

## Project Structure

AstroKestrel/
├── api/
│   └── main.py                    # FastAPI backend, 6 endpoints
├── ml/
│   ├── data_loader.py             # NASA OSDR data ingestion
│   ├── anomaly.py                 # Z-score deviation risk scoring
│   ├── risk_engine.py             # Cross-system cascade detection
│   ├── forecast.py                # Mars mission trajectory forecasting
│   └── sans.py                    # Neuro-ocular SANS risk module
├── data/
│   └── Raw/                       # NASA OSDR datasets
├── astrokestrel-frontend/
│   └── src/
│       └── App.jsx                # React dashboard, dual-mode UI
├── requirements.txt
└── README.md


---

## NASA Datasets Used

| Dataset | File | Content |
|---------|------|---------|
| OSD-575 | CMP_TRANSFORMED.csv | Comprehensive metabolic panel |
| OSD-575 | cardiovascular_EvePanel.csv | Cardiovascular serum biomarkers |
| OSD-575 | immune_EvePanel.csv | 143-cytokine immune panel |
| OSD-575 | immune_AlamarPanel.csv | Extended inflammatory markers |
| OSD-530 | rna-seq scaling normalized.xlsx | Gene expression (22,475 genes) |

---

## Future Development

- Integration of ISS long-duration mission datasets (6-month timepoints)
- Direct intracranial pressure measurement data for SANS validation
- Cognitive performance module (reaction time, memory, decision speed)
- Musculoskeletal deterioration tracking (bone density, muscle cross-section)
- Real-time telemetry integration via NASA's DTN protocol
- Federated learning across multiple mission datasets

---

## About the Builder

**Omosomi Ann Hassan** — AI/ML Engineer with a BSc in Physiology (University of Benin).

The combination of biomedical science and AI engineering is what makes AstroKestrel possible. Understanding *why* each body system fails in space — the homeostatic mechanisms, the feedback loops, the cross-system interactions — is what separates a model that monitors numbers from one that understands what those numbers mean for human survival.

*Built during the IBM AI Builders Challenge, August 2026.*

---

## License

MIT License — open for the space medicine community to build on.