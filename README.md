# 🦅 AstroKestrel

### Crew Health Surveillance & Clinical Decision Support for Deep Space Missions

> **IBM AI Builders Challenge — August 2026**
> Theme: Advance Space Exploration with AI
> Built by: Omosomi Ann Hassan
> Live Demo: [astro-kestrel.vercel.app](https://astro-kestrel.vercel.app/)
> GitHub: [github.com/JustAnn1234/AstroKestrel](https://github.com/JustAnn1234/AstroKestrel)

---

> *The kestrel is the only bird that can hold perfectly still in a storm — hovering motionless while watching everything below it with extraordinary precision. AstroKestrel holds steady, watches all five body systems simultaneously, and acts before the crisis arrives.*
>
> **AstroKestrel sees what's coming before the first symptom appears.**

---

## The Problem

SpaceX is actively planning the first human missions to Mars, with crewed flights projected as early as 2031–2033. No human has ever traveled to Mars — every mission has been robotic. The journey takes 7 to 9 months each way. During that time, the human body undergoes progressive physiological deterioration across multiple interconnected systems simultaneously.

**What space does to the human body:**
- **Cardiovascular deconditioning** — the heart weakens without gravity to push against
- **Immune dysregulation** — latent viruses reactivate, cytokine cascades develop
- **Metabolic disruption** — electrolyte imbalances, insulin resistance, kidney stress
- **SANS (Spaceflight Associated Neuro-Ocular Syndrome)** — rising intracranial pressure physically flattens the eyeball, causing vision loss
- **Radiation/oxidative stress** — cosmic rays damage DNA, trigger chronic inflammation

These systems do not fail independently. **They cascade.** And with communication delays of 4 to 40 minutes making real-time Earth-based medical support infeasible, the crew must rely on onboard intelligence.

**The critical gap:** existing space health monitoring tools are reactive (respond to symptoms after they appear) and siloed (monitor one system at a time). No operational tool currently detects cross-system physiological coupling before the clinical threshold is crossed.

AstroKestrel addresses this gap.

---

## What AstroKestrel Does

AstroKestrel is a crew health surveillance and clinical decision-support system that:

- Ingests real astronaut biomarker data from NASA's Open Science Data Repository (Inspiration4 mission, OSD-575 and OSD-530)
- Builds a personalised pre-flight baseline for each crew member
- Detects early physiological drift and cross-system coupling across **five monitored domains simultaneously**
- Applies a **dual-engine risk scoring system** — both probabilistic ML and deterministic clinical rules
- Forecasts deterioration trajectories for simulated missions up to 500 days
- Delivers actionable, tiered intervention recommendations to mission commanders
- Screens all AI-generated briefings through **IBM Granite Guardian** before they reach the user

**AstroKestrel supports the Crew Medical Officer's decision-making. It does not replace it. Human authority is always final.**

---

## Five Monitored Systems

| System | Data Source | Method |
|--------|-------------|--------|
| Cardiovascular | OSD-575 serum panel | Z-score deviation + deterministic CRP/fibrinogen thresholds |
| Immune / Cytokine | OSD-575 multiplex panel | 143-cytokine deviation + IL-6/TNF-α/IL-1β clinical thresholds |
| Metabolic | OSD-575 CMP panel | Electrolyte, renal, hepatic marker deviation |
| Neuro-Ocular (SANS) | OSD-530 RNA-seq | 20 SANS-relevant genes identified; physiologically-grounded model |
| Radiation / Oxidative Stress | OSD-575 immune proxies | MCP-1, IL-8, VEGF-A as indirect radiation biomarker surrogates |

---

## The Novel Technical Approach

### Dual-Engine Risk Scoring

Every biomarker reading passes through two independent engines:

- **Engine 1 — ML Anomaly Detection:** Z-score deviation from each astronaut's personal pre-flight baseline, normalised to a 0–1 risk scale using a sigmoid function. Personalised — not generic population norms.
- **Engine 2 — Deterministic Clinical Rules:** Fires independently when biomarkers breach established clinical thresholds (e.g. CRP >10 mg/L, TNF-α >50 pg/mL). Cannot be overridden by ML uncertainty. Provides a hard safety net.

The combined tier is always the higher of the two engines.

### Cross-System Cascade Detection

When multiple systems deteriorate simultaneously, risk is not additive — it is multiplicative:

| Cascade | Penalty |
|---------|---------|
| Cardiovascular + Immune | 1.4× |
| SANS + Cardiovascular | 1.35× |
| Radiation + Immune | 1.25× |
| Triple system cascade | 1.7–1.8× |

### Four-Tier Alert System

**WATCH** → **REVIEW** → **MEDICAL ADVISORY** → **IMMEDIATE INTERVENTION**

Each tier has defined commander actions, escalation windows, and traceability logging.

---

## Real Data. Scientifically Grounded Findings.

Built on NASA OSDR datasets from **Inspiration4** (September 2021) — the first all-civilian orbital spaceflight. Four crew members. Blood samples at pre-flight (L-92, L-44, L-3) and post-return (R+1, R+45, R+82, R+194) timepoints.

**Key findings from real data:**
- **Astronaut C001:** CRP at 15.4 mg/L equivalent (normal <3 mg/L) and TNF-α at 69 pg/mL (normal <8.1 pg/mL) at Day 194 post-return. AstroKestrel detects a cardiovascular-immune cascade — IMMEDIATE INTERVENTION tier.
- **Astronaut C003:** Highest radiation proxy risk (0.905) and VEGF-A at 1,281 pg/mL — consistent with the cephalad fluid shift mechanism implicated in SANS development.
- **Mars projection:** On a simulated 180-day mission, C001's cardiovascular system reaches critical threshold by Mission Day 80, with immune cascade beginning at Day 60. AstroKestrel recommends intervention by Day 46 — over a month before the first projected symptom.

All risk scores carry **±10% estimated uncertainty** — explicitly disclosed on every output.

---

## Real-World Implementation Pathway

### How AstroKestrel Integrates With Actual Space Mission Health Systems

Current space missions already collect the data AstroKestrel needs:

- **Wearable biometric sensors** track heart rate, blood oxygen, skin temperature, respiration, sleep cycles, and cognitive fatigue patterns continuously. NASA's Artemis II crew is currently monitored using wearable technology throughout their mission.
- **Periodic biological sampling** — blood, urine, and saliva — is standard protocol on ISS missions and planned for Artemis/Mars missions. These samples generate exactly the biomarker panels (CMP, cytokine multiplex, cardiovascular serum) that power AstroKestrel's analysis.
- **Active radiation dosimeters** measure cumulative cosmic ray and solar particle exposure in real time — data that would feed directly into AstroKestrel's radiation module.

**Three deployment pathways for AstroKestrel:**

- **Pathway 1 — NASA Human Research Programme:** AstroKestrel's cross-system risk engine and Mars mission forecasting could serve as a prototype decision-support layer on top of NASA HRP's CIPHER experiment data. The platform already exports the biomarker formats AstroKestrel ingests.
- **Pathway 2 — Axiom Space / SpaceX Civilian Missions:** Axiom Space runs private astronaut missions to the ISS with crews who lack years of medical preparation. AstroKestrel's CMO-support model — monitoring civilian physiological responses, generating plain-language intervention recommendations — directly addresses the medical risk gap in civilian spaceflight.
- **Pathway 3 — Deep Space Medical Officer Training:** AstroKestrel's simulation mode (drag a slider from Day 1 to Day 500) provides a training environment for flight surgeons to build intuition about multi-system deterioration cascades before managing real crew members on long-duration missions.

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/dashboard` | Full crew risk overview — all 4 astronauts |
| `GET /api/astronaut/{id}/brief` | Deep per-astronaut risk brief with dual-engine output |
| `GET /api/astronaut/{id}/timeline` | Risk trajectory across all mission timepoints |
| `GET /api/astronaut/{id}/forecast` | Mars mission risk forecast to Day 500 |
| `GET /api/astronaut/{id}/biomarkers` | Individual biomarker values with clinical context |
| `GET /api/astronaut/{id}/fhir-export` | **FHIR R4-compatible health bundle** for EHR integration |
| `GET /api/alerts` | All CRITICAL/HIGH alerts across the crew |
| `POST /api/chat` | IBM Granite clinical briefing assistant |

### Integration Requirements for Production Deployment

- **Real-time wearable data stream** → replace periodic sample readings with continuous telemetry
- **On-board edge compute** → deploy ML models locally on spacecraft hardware (already offline-capable)
- **Electronic Health Record integration** → AstroKestrel already exports FHIR R4-compatible Bundles (`/api/astronaut/{id}/fhir-export`) — structured for direct ingestion by any FHIR-compliant EHR system
- **Federated learning** → train improved models across multiple missions without centralising private medical data (IBM watsonx.data architecture)

---

## IBM Tool Usage

| Tool | Role |
|------|------|
| **IBM Bob** | Primary development partner — architecture, debugging, code refinement, documentation throughout the entire build |
| **IBM Granite 3.3 8B** | Clinical briefing assistant — generates plain-language mission commander summaries from real biomarker data |
| **IBM Granite Guardian 3.3** | Safety screening — screens every AI response against three medical criteria: no drug prescriptions, no definitive diagnoses, no actions requiring physician authorisation |

---

## Technical Limitations & Scientific Disclosure

| Limitation | Detail |
|-----------|--------|
| Dataset size | 4 astronauts, 3-day mission. ±10% estimated uncertainty on all risk scores |
| Mars forecast | Polynomial extrapolation beyond observed data range — indicative trajectory, not validated prediction |
| SANS module | RNA-seq gene proxy model — not direct intracranial pressure measurement |
| Radiation module | Immune proxy biomarkers only — not direct dosimetry |
| Temporal resolution | Periodic sampling (not continuous streaming) — production deployment would use real-time wearable feeds |
| Offline AI | ML and deterministic engines run fully offline. AI chat requires internet connection |

---

## What Would Be Added With More Time

- **Musculoskeletal module** — bone density and muscle cross-section tracking from DXA scan data
- **Cognitive performance module** — reaction time, memory, and decision speed tests integrated as a 7th system
- **Real-time telemetry integration** — replace periodic sample readings with continuous wearable data streams
- **Direct radiation dosimetry** — replace proxy markers with actual cumulative dose measurements from active dosimeters
- **Federated learning** — train improved models across multiple missions without centralising private health data
- **Validated Mars trajectories** — retrain forecast models on ISS 6-month mission datasets for scientifically validated long-duration projections

---

## Architecture

```text
NASA OSDR Data (OSD-575 + OSD-530)
         │
         ▼
Data Loader
   • Parses astronaut IDs, mission timepoints
   • Pre-flight baseline vs post-return phases
         │
         ▼
┌─────────────────────────────────────────┐
│  DUAL-ENGINE RISK LAYER                 │
│  ML Anomaly Detection (anomaly.py)      │
│  + Deterministic Rules (deterministic_  │
│    rules.py) — fires on absolute        │
│    clinical thresholds independently    │
│  Combined tier = higher of both         │
└─────────────────────────────────────────┘
         │
         ▼
Cross-System Risk Engine (risk_engine.py)
   • 5-system weighted scoring + interaction penalty rules (1.25× to 1.8×)
         │
         ▼
Mars Mission Forecasting (forecast.py)
   • Polynomial trajectory fitting
   • Up to 500-day extrapolation
         │
         ▼
FastAPI Backend — 8 endpoints
         │
         ▼
React 19 Dashboard
   • Dual-mode: Modern + NASA Flight Display
   • IBM Granite 3.3 8B clinical briefing
   • IBM Granite Guardian safety screening

```

---

## Setup & Run

```bash
# Clone
git clone [https://github.com/JustAnn1234/AstroKestrel](https://github.com/JustAnn1234/AstroKestrel)
cd AstroKestrel

# Backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
echo GROQ_API_KEY=your_key > .env
echo HF_TOKEN=your_huggingface_token >> .env

uvicorn api.main:app --reload --port 8000

# Frontend (new terminal)
cd astrokestrel-frontend
npm install
npm run dev

```

Open `http://localhost:5173`

---

## NASA Datasets Used

| Dataset | File | Content |
| --- | --- | --- |
| OSD-575 | CMP_TRANSFORMED.csv | Comprehensive metabolic panel |
| OSD-575 | cardiovascular_EvePanel.csv | Cardiovascular serum biomarkers |
| OSD-575 | immune_EvePanel.csv | 143-cytokine immune panel |
| OSD-575 | immune_AlamarPanel.csv | Extended inflammatory markers |
| OSD-530 | rna-seq scaling normalized.xlsx | Gene expression (22,475 genes) |

---

## Challenge Theme Alignment

**August 2026: Advance Space Exploration with AI**

AstroKestrel transforms space medicine from reactive symptom management to proactive physiological surveillance — advancing mission safety for the first generation of humans who will travel beyond Earth's orbit to Mars.

---

## About

**Omosomi Ann Hassan**

AI/ML Engineer | BSc Physiology, University of Benin

AGIT Africa Agility Programme | IBM AI Builders Challenge 2026

The combination of biomedical science and AI engineering is what makes AstroKestrel possible. Understanding *why* each body system fails in space — the homeostatic mechanisms, the feedback loops, the cross-system interactions — is what separates a monitoring dashboard from a system that understands what the numbers mean for human survival.

---

## License

MIT — open for the space medicine community to build on.

```

```