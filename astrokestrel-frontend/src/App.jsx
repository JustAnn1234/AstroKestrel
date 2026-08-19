import { useState, useEffect, useRef } from "react"
import axios from "axios"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend
} from "recharts"
import { Routes, Route, useNavigate } from "react-router-dom"
import AstronautPage from "./AstronautPage.jsx"

const API = "http://localhost:8000"

const RISK_COLORS = {
  CRITICAL: "#ef4444",
  HIGH: "#f97316",
  MODERATE: "#eab308",
  LOW: "#22c55e"
}

function getRiskColor(score) {
  if (score >= 0.75) return RISK_COLORS.CRITICAL
  if (score >= 0.55) return RISK_COLORS.HIGH
  if (score >= 0.35) return RISK_COLORS.MODERATE
  return RISK_COLORS.LOW
}

const modernStyles = {
  app: { fontFamily: "'Inter', system-ui, sans-serif", background: "#0a0e1a", minHeight: "100vh", color: "#e2e8f0" },
  nav: { background: "rgba(13,18,35,0.95)", borderBottom: "1px solid rgba(99,102,241,0.2)", padding: "0 2rem", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 100 },
  navInner: { maxWidth: "1400px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px" },
  logoText: { fontSize: "20px", fontWeight: 700, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  logoSub: { fontSize: "11px", color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase" },
  card: { background: "rgba(13,18,35,0.8)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: "16px", padding: "1.25rem 1.5rem", backdropFilter: "blur(10px)", marginBottom: "1rem" },
  metricCard: { background: "rgba(13,18,35,0.8)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: "16px", padding: "1.25rem 1.5rem" },
  cardTitle: { fontSize: "13px", fontWeight: 600, color: "#94a3b8", marginBottom: "1rem" },
  sectionLabel: { fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1rem" },
}

const flightStyles = {
  app: { fontFamily: "'Share Tech Mono', 'Space Mono', monospace", background: "#000a0a", minHeight: "100vh", color: "#00ff88" },
  nav: { background: "#000d0d", borderBottom: "1px solid #00ff8840", padding: "0 2rem", position: "sticky", top: 0, zIndex: 100 },
  navInner: { maxWidth: "1400px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: "56px" },
  logoText: { fontSize: "18px", fontWeight: 400, color: "#00ff88", letterSpacing: "0.15em" },
  logoSub: { fontSize: "10px", color: "#00aa55", letterSpacing: "0.2em" },
  card: { background: "#000d0d", border: "1px solid #00ff8830", borderRadius: "4px", padding: "1rem 1.25rem", marginBottom: "1rem" },
  metricCard: { background: "#000d0d", border: "1px solid #00ff8830", borderRadius: "4px", padding: "1rem 1.25rem" },
  cardTitle: { fontSize: "11px", fontWeight: 400, color: "#00aa55", marginBottom: "1rem", letterSpacing: "0.1em", textTransform: "uppercase" },
  sectionLabel: { fontSize: "10px", color: "#00aa55", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "1rem" },
}

function METClock({ flight }) {
  const [elapsed, setElapsed] = useState(0)
  const start = useRef(Date.now())
  useEffect(() => {
    const timer = setInterval(() => setElapsed(Date.now() - start.current), 1000)
    return () => clearInterval(timer)
  }, [])
  const totalSec = Math.floor(elapsed / 1000)
  const hh = String(Math.floor(totalSec / 3600)).padStart(3, "0")
  const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0")
  const ss = String(totalSec % 60).padStart(2, "0")
  if (flight) {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "9px", color: "#00aa55", letterSpacing: "0.15em" }}>MET</div>
        <div style={{ fontSize: "16px", color: "#00ff88", letterSpacing: "0.1em" }}>{hh}:{mm}:{ss}</div>
      </div>
    )
  }
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "9px", color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase" }}>Mission Elapsed Time</div>
      <div style={{ fontSize: "14px", fontFamily: "'Space Mono', monospace", color: "#6366f1", letterSpacing: "0.05em" }}>{hh}:{mm}:{ss}</div>
    </div>
  )
}

function RiskBadge({ level, flight }) {
  const color = RISK_COLORS[level] || "#64748b"
  if (flight) return <span style={{ color, border: `1px solid ${color}`, padding: "2px 8px", fontSize: "10px", letterSpacing: "0.1em" }}>[{level}]</span>
  return <span style={{ background: `${color}15`, color, border: `1px solid ${color}40`, padding: "3px 10px", borderRadius: "999px", fontSize: "10px", fontWeight: 700 }}>{level}</span>
}

function RiskBar({ value, system, unit = "Risk Index", flight }) {
  const color = getRiskColor(value)
  const pct = (value * 100).toFixed(1)
  if (flight) {
    const filled = Math.round(value * 20)
    const bar = "█".repeat(filled) + "░".repeat(20 - filled)
    return (
      <div style={{ marginBottom: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
          <span style={{ fontSize: "11px", color: "#00aa55", textTransform: "uppercase" }}>{system}</span>
          <span style={{ fontSize: "11px", color }}>{pct}% | Z-DEV: {(value * 4.2).toFixed(2)}σ</span>
        </div>
        <div style={{ fontSize: "12px", color, letterSpacing: "1px" }}>{bar}</div>
      </div>
    )
  }
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
        <span style={{ fontSize: "12px", color: "#94a3b8", textTransform: "capitalize" }}>{system}</span>
        <span style={{ fontSize: "12px", fontWeight: 700, color, fontFamily: "'Space Mono', monospace" }}>
          {pct}% <span style={{ fontSize: "10px", color: "#475569" }}>({unit})</span>
        </span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "4px", height: "4px" }}>
        <div style={{ width: `${value * 100}%`, background: `linear-gradient(90deg, ${color}80, ${color})`, borderRadius: "4px", height: "4px", boxShadow: `0 0 8px ${color}60`, transition: "width 0.6s ease" }} />
      </div>
    </div>
  )
}

// Clicking selects the card (updates mission intel on right).
// "Full Report" button navigates to deep dive page.
function AstronautCard({ astronaut, selected, onClick, flight }) {
  const navigate = useNavigate()
  const color = RISK_COLORS[astronaut.alert_level] || "#64748b"

  if (flight) {
    return (
      <div onClick={onClick} style={{ background: selected ? "#001a0a" : "#000d0d", border: `1px solid ${selected ? "#00ff88" : "#00ff8830"}`, borderRadius: "4px", padding: "1rem", cursor: "pointer", marginBottom: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <div>
            <div style={{ fontSize: "13px", color: "#00ff88", letterSpacing: "0.1em" }}>CREW/{astronaut.id}</div>
            <div style={{ fontSize: "10px", color: "#00aa55" }}>MED-DAY +{astronaut.latest_day} POST-RTN</div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {selected && <span style={{ fontSize: "9px", color: "#00ff88", border: "1px solid #00ff8840", padding: "2px 6px", fontFamily: "monospace" }}>VIEWING</span>}
            <RiskBadge level={astronaut.alert_level} flight />
          </div>
        </div>
        {Object.entries(astronaut.system_scores).map(([sys, score]) => (
          <RiskBar key={sys} system={sys.replace("_", "-")} value={score} flight />
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", paddingTop: "8px", borderTop: "1px solid #00ff8820" }}>
          <span style={{ fontSize: "16px", color }}>{(astronaut.composite_risk * 100).toFixed(1)}%</span>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/astronaut/${astronaut.id}`) }}
            style={{ background: "transparent", border: "1px solid #00ff8840", borderRadius: "2px", padding: "3px 10px", color: "#00ff88", fontSize: "10px", cursor: "pointer", fontFamily: "monospace" }}
          >
            DEEP DIVE →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div onClick={onClick} style={{ background: selected ? "rgba(99,102,241,0.08)" : "rgba(13,18,35,0.6)", border: `1px solid ${selected ? "rgba(99,102,241,0.4)" : "rgba(99,102,241,0.1)"}`, borderRadius: "16px", padding: "1.25rem", cursor: "pointer", marginBottom: "12px", transition: "all 0.2s", boxShadow: selected ? "0 0 20px rgba(99,102,241,0.15)" : "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: `${color}20`, border: `1px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color }}>{astronaut.id.slice(-2)}</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: "14px", color: "#e2e8f0" }}>{astronaut.name}</div>
            <div style={{ fontSize: "11px", color: "#475569" }}>Day {astronaut.latest_day} post-return</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {selected && (
            <span style={{ fontSize: "10px", color: "#6366f1", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", padding: "2px 8px", borderRadius: "999px" }}>
              Viewing ↗
            </span>
          )}
          <RiskBadge level={astronaut.alert_level} />
        </div>
      </div>
      {Object.entries(astronaut.system_scores).map(([sys, score]) => (
        <RiskBar key={sys} system={sys.replace("_", " ")} value={score} />
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <span style={{ fontSize: "18px", fontWeight: 700, color, fontFamily: "'Space Mono', monospace" }}>{(astronaut.composite_risk * 100).toFixed(1)}%</span>
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/astronaut/${astronaut.id}`) }}
          style={{ background: "transparent", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "8px", padding: "5px 12px", color: "#6366f1", fontSize: "11px", cursor: "pointer" }}
        >
          Full Report →
        </button>
      </div>
    </div>
  )
}

function SimulationSlider({ astronautId, flight }) {
  const [missionDays, setMissionDays] = useState(180)
  const [forecast, setForecast] = useState(null)
  useEffect(() => {
    if (!astronautId) return
    axios.get(`${API}/api/astronaut/${astronautId}/forecast`).then(res => setForecast(res.data))
  }, [astronautId])
  if (!forecast) return null
  const getInterpolatedRisk = (sys, day) => {
    if (day <= 30) return sys.day_30_risk
    if (day >= 180) return sys.day_180_risk
    if (day <= 90) return sys.day_30_risk + ((day - 30) / 60) * (sys.day_90_risk - sys.day_30_risk)
    return sys.day_90_risk + ((day - 90) / 90) * (sys.day_180_risk - sys.day_90_risk)
  }
  const s = flight ? flightStyles : modernStyles
  return (
    <div style={s.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div style={s.cardTitle}>{flight ? "MISSION DURATION SIM" : "Mars Mission Simulation"}</div>
        <div style={{ fontSize: flight ? "14px" : "20px", fontWeight: flight ? 400 : 700, fontFamily: "monospace", color: flight ? "#00ff88" : "#6366f1", letterSpacing: flight ? "0.1em" : 0 }}>
          {flight ? `T+${String(missionDays).padStart(3, "0")} DAYS` : `Day ${missionDays}`}
        </div>
      </div>
      <input type="range" min="1" max="500" value={missionDays} onChange={e => setMissionDays(Number(e.target.value))} style={{ width: "100%", marginBottom: "1rem", accentColor: flight ? "#00ff88" : "#6366f1" }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: flight ? "#00aa55" : "#475569", marginBottom: "1rem", marginTop: "-0.5rem" }}>
        <span>T+001</span><span>ISS (~180d)</span><span>MARS TRANSIT (~500d)</span>
      </div>
      {forecast.mars_mission_forecast.map(sys => {
        const risk = Math.min(getInterpolatedRisk(sys, missionDays), 1)
        const willBeCritical = sys.breaches_critical && sys.critical_threshold_day <= missionDays
        return <RiskBar key={sys.system} system={sys.system.replace("_", "-") + (willBeCritical ? " ⚠" : "")} value={risk} unit={willBeCritical ? `CRIT DAY ${sys.critical_threshold_day}` : "projected"} flight={flight} />
      })}
    </div>
  )
}

function RadarPanel({ crew, flight }) {
  if (!crew || crew.length === 0) return null
  const s = flight ? flightStyles : modernStyles
  const data = [
    { system: "Cardiovascular", ...Object.fromEntries(crew.map(a => [a.id, +((a.system_scores.cardiovascular || 0) * 100).toFixed(0)])) },
    { system: "Immune", ...Object.fromEntries(crew.map(a => [a.id, +((a.system_scores.immune || 0) * 100).toFixed(0)])) },
    { system: "Metabolic", ...Object.fromEntries(crew.map(a => [a.id, +((a.system_scores.metabolic || 0) * 100).toFixed(0)])) },
    { system: "Neuro-Ocular", ...Object.fromEntries(crew.map(a => [a.id, +((a.system_scores.neuro_ocular || 0) * 100).toFixed(0)])) },
  ]
  const colors = flight ? ["#00ff88", "#ff8800", "#00aaff", "#ffff00"] : ["#6366f1", "#f97316", "#22c55e", "#eab308"]
  return (
    <div style={s.card}>
      <div style={s.cardTitle}>{flight ? "CREW COMPARATIVE ANALYSIS — ALL SYSTEMS" : "Comparative Crew Analysis"}</div>
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={data}>
          <PolarGrid stroke={flight ? "#00ff8820" : "rgba(255,255,255,0.08)"} />
          <PolarAngleAxis dataKey="system" tick={{ fill: flight ? "#00aa55" : "#64748b", fontSize: 11 }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: flight ? "#006633" : "#475569", fontSize: 9 }} />
          {crew.map((a, i) => <Radar key={a.id} name={a.id} dataKey={a.id} stroke={colors[i]} fill={colors[i]} fillOpacity={0.08} strokeWidth={2} />)}
          <Legend wrapperStyle={{ fontSize: "11px", color: flight ? "#00aa55" : "#94a3b8" }} />
          <Tooltip contentStyle={{ background: flight ? "#000d0d" : "#0d1223", border: `1px solid ${flight ? "#00ff8830" : "rgba(99,102,241,0.2)"}`, borderRadius: flight ? "2px" : "8px", color: flight ? "#00ff88" : "#e2e8f0" }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

function TimelineChart({ astronautId, flight }) {
  const [data, setData] = useState([])
  const s = flight ? flightStyles : modernStyles
  useEffect(() => {
    if (!astronautId) return
    axios.get(`${API}/api/astronaut/${astronautId}/timeline`).then(res => {
      setData(res.data.timeline.map(t => ({ day: `D+${t.day}`, risk: +(t.composite_risk * 100).toFixed(1) })))
    })
  }, [astronautId])
  return (
    <div style={s.card}>
      <div style={s.cardTitle}>{flight ? `RISK TIMELINE — CREW/${astronautId}` : `Risk Timeline — ${astronautId}`}</div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray={flight ? "1 4" : "3 3"} stroke={flight ? "#00ff8815" : "rgba(255,255,255,0.05)"} />
          <XAxis dataKey="day" tick={{ fill: flight ? "#00aa55" : "#64748b", fontSize: 10 }} />
          <YAxis domain={[0, 100]} tick={{ fill: flight ? "#00aa55" : "#64748b", fontSize: 10 }} unit="%" />
          <Tooltip contentStyle={{ background: flight ? "#000d0d" : "#0d1223", border: `1px solid ${flight ? "#00ff8830" : "rgba(99,102,241,0.2)"}`, borderRadius: "4px", color: flight ? "#00ff88" : "#e2e8f0" }} formatter={(v) => [`${v}%`, "CRI"]} />
          <ReferenceLine y={75} stroke="#ef444460" strokeDasharray="4 4" label={{ value: "CRIT", fontSize: 9, fill: "#ef4444" }} />
          <ReferenceLine y={55} stroke="#f9731660" strokeDasharray="4 4" label={{ value: "HIGH", fontSize: 9, fill: "#f97316" }} />
          <Line type="monotone" dataKey="risk" stroke={flight ? "#00ff88" : "#6366f1"} strokeWidth={flight ? 1 : 2} dot={{ r: 4, fill: flight ? "#00ff88" : "#6366f1", strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function BriefPanel({ astronautId, flight }) {
  const [brief, setBrief] = useState(null)
  const s = flight ? flightStyles : modernStyles
  useEffect(() => {
    if (!astronautId) return
    axios.get(`${API}/api/astronaut/${astronautId}/brief`).then(res => setBrief(res.data))
  }, [astronautId])
  if (!brief) return null
  return (
    <div style={s.card}>
      <div style={s.cardTitle}>{flight ? `CMD BRIEF — CREW/${astronautId}` : `Mission Commander Brief — ${astronautId}`}</div>
      {brief.interactions.length > 0 && (
        <div style={{ background: flight ? "rgba(255,0,0,0.05)" : "rgba(239,68,68,0.08)", border: `1px solid ${flight ? "#ff000040" : "rgba(239,68,68,0.2)"}`, borderRadius: flight ? "2px" : "10px", padding: "10px 14px", marginBottom: "14px" }}>
          {brief.interactions.map((interaction, i) => (
            <div key={i} style={{ fontSize: "11px", color: flight ? "#ff4444" : "#f87171" }}>{flight ? ">> " : "⚠ "}{interaction}</div>
          ))}
        </div>
      )}
      {brief.interventions.length === 0 ? (
        <div style={{ fontSize: "12px", color: flight ? "#00ff88" : "#22c55e", textAlign: "center", padding: "1rem" }}>
          {flight ? "> ALL SYSTEMS NOMINAL." : "✓ No interventions required"}
        </div>
      ) : (
        brief.interventions.map((iv, i) => (
          <div key={i} style={{ display: "flex", gap: "12px", padding: "10px 0", borderBottom: i < brief.interventions.length - 1 ? `1px solid ${flight ? "#00ff8815" : "rgba(255,255,255,0.05)"}` : "none" }}>
            <span style={{ fontSize: "10px", padding: "3px 8px", borderRadius: flight ? "2px" : "6px", height: "fit-content", whiteSpace: "nowrap", background: `${RISK_COLORS[iv.priority] || "#64748b"}15`, color: RISK_COLORS[iv.priority] || "#64748b", border: `1px solid ${RISK_COLORS[iv.priority] || "#64748b"}40` }}>{iv.priority}</span>
            <div>
              <div style={{ fontSize: "11px", color: flight ? "#00aa55" : "#94a3b8", marginBottom: "4px" }}>{flight ? `[${iv.system.toUpperCase()}]` : iv.system}</div>
              <div style={{ fontSize: "11px", color: flight ? "#007744" : "#64748b", lineHeight: "1.6" }}>{iv.action}</div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function BiomarkerExplainer({ astronautId, flight }) {
  const [data, setData] = useState(null)
  const [expanded, setExpanded] = useState({})
  const s = flight ? flightStyles : modernStyles

  useEffect(() => {
    if (!astronautId) return
    setData(null)
    axios.get(`${API}/api/astronaut/${astronautId}/biomarkers`).then(res => setData(res.data)).catch(() => setData(null))
  }, [astronautId])

  if (!data) return null

  const tierColors = { IMMEDIATE_INTERVENTION: "#ef4444", MEDICAL_ADVISORY: "#f97316", REVIEW: "#eab308", WATCH: "#3b82f6" }
  const tierLabels = { IMMEDIATE_INTERVENTION: "IMMEDIATE", MEDICAL_ADVISORY: "ADVISORY", REVIEW: "REVIEW", WATCH: "WATCH" }
  const systemLabels = { cardiovascular: "Cardiovascular Panel", immune: "Immune / Cytokine Panel", metabolic: "Comprehensive Metabolic Panel" }

  const getZBar = (z) => {
    const abs = Math.min(Math.abs(z), 5)
    const pct = (abs / 5) * 100
    const color = abs >= 3 ? "#ef4444" : abs >= 2 ? "#f97316" : abs >= 1 ? "#eab308" : "#22c55e"
    return { pct, color }
  }

  return (
    <div style={s.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div style={s.cardTitle}>{flight ? "BIOMARKER EVIDENCE CHAIN — EXPLAINABILITY LAYER" : "Biomarker Evidence Chain"}</div>
        <div style={{ fontSize: "10px", color: flight ? "#00aa55" : "#64748b", textAlign: "right" }}>
          {data.baseline_samples} baseline samples<br />Confidence: LOW
        </div>
      </div>

      {data.overall_deterministic_tier && (
        <div style={{ background: `${tierColors[data.overall_deterministic_tier]}10`, border: `1px solid ${tierColors[data.overall_deterministic_tier]}40`, borderRadius: flight ? "2px" : "8px", padding: "8px 12px", marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: flight ? "#00aa55" : "#94a3b8" }}>{flight ? "DETERMINISTIC RULES ENGINE:" : "Deterministic rules engine:"}</span>
          <span style={{ fontSize: "11px", fontWeight: 700, color: tierColors[data.overall_deterministic_tier], letterSpacing: "0.05em" }}>
            {flight ? `[${data.overall_deterministic_tier}]` : data.overall_deterministic_tier.replace(/_/g, " ")}
          </span>
        </div>
      )}

      {Object.entries(data.explanations).map(([system, biomarkers]) => {
        const isExpanded = expanded[system]
        const firedCount = biomarkers.filter(b => b.deterministic_rule_fired).length
        const topTier = biomarkers.find(b => b.deterministic_rule_fired)?.deterministic_tier

        return (
          <div key={system} style={{ marginBottom: "10px" }}>
            <button onClick={() => setExpanded(prev => ({ ...prev, [system]: !prev[system] }))}
              style={{ width: "100%", background: firedCount > 0 ? `${tierColors[topTier] || "#64748b"}08` : (flight ? "rgba(0,255,136,0.03)" : "rgba(255,255,255,0.03)"), border: `1px solid ${firedCount > 0 ? `${tierColors[topTier] || "#64748b"}30` : (flight ? "#00ff8815" : "rgba(255,255,255,0.08)")}`, borderRadius: flight ? "2px" : "8px", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", color: flight ? "#00ff88" : "#e2e8f0", fontFamily: flight ? "monospace" : "inherit", fontSize: "12px", fontWeight: 500, textAlign: "left" }}
            >
              <span>{flight ? systemLabels[system].toUpperCase() : systemLabels[system]}</span>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {firedCount > 0 && <span style={{ fontSize: "10px", color: tierColors[topTier] }}>{firedCount} rule{firedCount > 1 ? 's' : ''} fired</span>}
                <span style={{ color: flight ? "#00aa55" : "#64748b", fontSize: "12px" }}>{isExpanded ? "▲" : "▼"}</span>
              </div>
            </button>

            {isExpanded && (
              <div style={{ border: `1px solid ${flight ? "#00ff8815" : "rgba(255,255,255,0.06)"}`, borderTop: "none", borderRadius: flight ? "0 0 2px 2px" : "0 0 8px 8px", overflow: "hidden" }}>
                {biomarkers.map((b, i) => {
                  const zBar = getZBar(b.z_score)
                  return (
                    <div key={b.biomarker} style={{ padding: "12px 14px", borderBottom: i < biomarkers.length - 1 ? `1px solid ${flight ? "#00ff8808" : "rgba(255,255,255,0.04)"}` : "none", background: b.deterministic_rule_fired ? `${tierColors[b.deterministic_tier]}05` : "transparent" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                            <span style={{ fontSize: "12px", fontWeight: 500, color: b.deterministic_rule_fired ? tierColors[b.deterministic_tier] : (flight ? "#00ff88" : "#e2e8f0"), fontFamily: flight ? "monospace" : "inherit" }}>
                              {flight ? b.name.toUpperCase() : b.name}
                            </span>
                            {b.deterministic_rule_fired && (
                              <span style={{ fontSize: "9px", padding: "1px 6px", borderRadius: flight ? "0" : "4px", background: `${tierColors[b.deterministic_tier]}20`, color: tierColors[b.deterministic_tier], border: `1px solid ${tierColors[b.deterministic_tier]}40`, fontWeight: 600 }}>
                                {flight ? tierLabels[b.deterministic_tier] : b.deterministic_tier.replace(/_/g, " ")}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "10px", color: flight ? "#006633" : "#475569" }}>{flight ? b.unit.toUpperCase() : b.unit}</div>
                        </div>
                        <div style={{ textAlign: "right", minWidth: "120px" }}>
                          <div style={{ fontSize: "14px", fontWeight: 600, color: b.deterministic_rule_fired ? tierColors[b.deterministic_tier] : (flight ? "#00ff88" : "#e2e8f0"), fontFamily: "monospace" }}>
                            {b.current_value > 1000000 ? `${(b.current_value / 1000000).toFixed(2)}M` : b.current_value > 1000 ? `${(b.current_value / 1000).toFixed(1)}k` : b.current_value}
                          </div>
                          <div style={{ fontSize: "10px", color: flight ? "#006633" : "#475569", fontFamily: "monospace" }}>
                            baseline: {b.baseline_mean > 1000000 ? `${(b.baseline_mean / 1000000).toFixed(2)}M` : b.baseline_mean > 1000 ? `${(b.baseline_mean / 1000).toFixed(1)}k` : b.baseline_mean.toFixed(2)}
                          </div>
                          <div style={{ fontSize: "10px", color: Math.abs(b.z_score) >= 2 ? "#f97316" : (flight ? "#006633" : "#475569"), fontFamily: "monospace" }}>
                            z = {b.z_score > 0 ? "+" : ""}{b.z_score}σ
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                        <div style={{ flex: 1, height: "3px", background: flight ? "rgba(0,255,136,0.1)" : "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" }}>
                          <div style={{ width: `${zBar.pct}%`, height: "100%", background: zBar.color, borderRadius: "2px", boxShadow: `0 0 4px ${zBar.color}60` }} />
                        </div>
                        <span style={{ fontSize: "9px", color: flight ? "#006633" : "#475569", fontFamily: "monospace", minWidth: "40px" }}>{Math.abs(b.z_score).toFixed(1)}σ</span>
                      </div>
                      {b.deterministic_rule_fired && (
                        <div style={{ fontSize: "11px", color: flight ? "#007744" : "#64748b", lineHeight: "1.5", borderLeft: `2px solid ${tierColors[b.deterministic_tier]}40`, paddingLeft: "8px", marginTop: "4px" }}>
                          {b.significance}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      <div style={{ fontSize: "10px", color: flight ? "#004422" : "#334155", marginTop: "12px", paddingTop: "10px", borderTop: `1px solid ${flight ? "#00ff8810" : "rgba(255,255,255,0.05)"}`, lineHeight: "1.5" }}>
        {data.data_note}
      </div>
    </div>
  )
}

// ── FloatingChat: button hidden when open, panel clamped to viewport ──
function FloatingChat({ dashboardData, flight }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [messages, setMessages] = useState([
    { role: "assistant", content: flight ? "> ASTROKESTREL MISSION AI ONLINE\n> AWAITING COMMANDER INPUT..." : "Mission AI ready. Ask me anything about crew health, risk trajectories, or intervention recommendations." }
  ])
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const [pos, setPos] = useState({ right: 24, bottom: 24 })
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef({ startMouseX: 0, startMouseY: 0, startRight: 24, startBottom: 24 })

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, open])

  const startDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(true)
    dragRef.current = { startMouseX: e.clientX, startMouseY: e.clientY, startRight: pos.right, startBottom: pos.bottom }
  }

  useEffect(() => {
    if (!dragging) return
    const onMove = (e) => {
      const dx = e.clientX - dragRef.current.startMouseX
      const dy = e.clientY - dragRef.current.startMouseY
      setPos({
        right: Math.max(8, Math.min(window.innerWidth - 70, dragRef.current.startRight - dx)),
        bottom: Math.max(8, Math.min(window.innerHeight - 70, dragRef.current.startBottom - dy))
      })
    }
    const onUp = () => setDragging(false)
    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp) }
  }, [dragging])

  const ask = async () => {
    if (!query.trim() || loading) return
    const userMsg = query.trim()
    setQuery("")
    setMessages(prev => [...prev, { role: "user", content: userMsg }])
    setLoading(true)
    try {
      const response = await axios.post(`${API}/api/chat`, { query: userMsg, context: JSON.stringify(dashboardData) })
      setMessages(prev => [...prev, { role: "assistant", content: response.data.reply }])
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: flight ? "> COMM ERROR. RETRY." : "Communication error. Please retry." }])
    }
    setLoading(false)
  }

  const accent = flight ? "#00ff88" : "#6366f1"
  const bg = flight ? "#000d0d" : "#0d1223"
  const border = flight ? "rgba(0,255,136,0.3)" : "rgba(99,102,241,0.3)"
  const ff = flight ? "monospace" : "system-ui, sans-serif"

  const panelWidth = 360
  const panelHeight = 480
  const panelRight = Math.min(pos.right, window.innerWidth - panelWidth - 8)
  const panelBottom = Math.min(pos.bottom + 70, window.innerHeight - panelHeight - 8)

  return (
    <>
      {open && (
        <div style={{ position: "fixed", bottom: `${panelBottom}px`, right: `${panelRight}px`, width: `${panelWidth}px`, height: `${panelHeight}px`, background: bg, border: `1px solid ${border}`, borderRadius: flight ? "4px" : "16px", display: "flex", flexDirection: "column", zIndex: 1000, boxShadow: `0 8px 32px rgba(0,0,0,0.6)` }}>
          <div onMouseDown={startDrag} style={{ padding: "14px 16px", borderBottom: `1px solid ${border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: flight ? "#001a0a" : "rgba(99,102,241,0.08)", borderRadius: flight ? "4px 4px 0 0" : "16px 16px 0 0", cursor: "grab", userSelect: "none" }}>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: accent, fontFamily: ff, letterSpacing: flight ? "0.1em" : 0 }}>{flight ? "MISSION AI — ASTROKESTREL" : "Ask AstroKestrel"}</div>
              <div style={{ fontSize: "10px", color: flight ? "#00aa55" : "#64748b", marginTop: "2px", fontFamily: ff }}>{flight ? "DRAG HEADER TO MOVE" : "Drag header to move"}</div>
            </div>
            {/* × ONLY in header — no floating × button when open */}
            <button onClick={(e) => { e.stopPropagation(); setOpen(false) }} style={{ background: "transparent", border: "none", color: flight ? "#00aa55" : "#64748b", fontSize: "20px", cursor: "pointer", lineHeight: 1, padding: "0 4px" }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "85%", background: m.role === "user" ? (flight ? "rgba(0,255,136,0.1)" : "rgba(99,102,241,0.2)") : (flight ? "transparent" : "rgba(255,255,255,0.04)"), border: `1px solid ${m.role === "user" ? accent + "40" : border}`, borderRadius: flight ? "2px" : "10px", padding: "8px 12px", fontSize: "12px", color: flight ? (m.role === "user" ? "#00ff88" : "#00cc66") : "#e2e8f0", fontFamily: ff, lineHeight: "1.5", whiteSpace: "pre-wrap" }}>
                  {flight && m.role === "assistant" && "> "}{m.content}
                </div>
              </div>
            ))}
            {loading && <div style={{ fontSize: "11px", color: flight ? "#00aa55" : "#475569", fontFamily: ff }}>{flight ? "> PROCESSING BIOTELEMETRY..." : "Analysing mission data..."}</div>}
            <div ref={messagesEndRef} />
          </div>
          <div style={{ padding: "10px 12px", borderTop: `1px solid ${border}`, display: "flex", gap: "8px" }}>
            <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && ask()} placeholder={flight ? "> ENTER QUERY..." : "Ask about crew health..."} style={{ flex: 1, background: flight ? "#001a0a" : "rgba(255,255,255,0.04)", border: `1px solid ${border}`, borderRadius: flight ? "2px" : "8px", padding: "8px 12px", fontSize: "12px", color: flight ? "#00ff88" : "#e2e8f0", fontFamily: ff, outline: "none" }} />
            <button onClick={ask} disabled={loading} style={{ background: flight ? "transparent" : accent, border: `1px solid ${accent}`, borderRadius: flight ? "2px" : "8px", padding: "8px 14px", color: flight ? accent : "white", fontSize: "12px", fontFamily: ff, cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "..." : (flight ? "TX" : "Ask")}
            </button>
          </div>
        </div>
      )}

      {/* Floating button ONLY shown when chat is closed */}
      {!open && (
        <button
          onMouseDown={startDrag}
          onClick={() => setOpen(true)}
          style={{ position: "fixed", bottom: `${pos.bottom}px`, right: `${pos.right}px`, width: "56px", height: "56px", borderRadius: "50%", background: flight ? "#001a0a" : accent, border: `2px solid ${accent}`, color: flight ? accent : "white", fontSize: "22px", cursor: dragging ? "grabbing" : "pointer", zIndex: 1001, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 20px ${accent}40`, transition: dragging ? "none" : "all 0.2s", userSelect: "none" }}
        >
          🦅
        </button>
      )}
    </>
  )
}

function Dashboard({ flight, setFlight }) {
  const [dashboard, setDashboard] = useState(null)
  const [selected, setSelected] = useState(() => {
    try { return localStorage.getItem('astrokestrel_selected') || "C001" } catch { return "C001" }
  })
  const s = flight ? flightStyles : modernStyles

  useEffect(() => {
    axios.get(`${API}/api/dashboard`).then(res => setDashboard(res.data))
  }, [])

  const handleSelect = (id) => {
    setSelected(id)
    try { localStorage.setItem('astrokestrel_selected', id) } catch {}
  }

  if (!dashboard) return (
    <div style={{ ...s.app, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🦅</div>
        <div style={{ color: flight ? "#00ff88" : "#6366f1", fontSize: "13px", letterSpacing: "0.15em", fontFamily: flight ? "monospace" : "inherit" }}>
          {flight ? "ASTROKESTREL INITIALISING..." : "AstroKestrel initialising..."}
        </div>
      </div>
    </div>
  )

  return (
    <div style={s.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Share+Tech+Mono&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input[type=range] { cursor: pointer; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${flight ? "#00ff8830" : "rgba(99,102,241,0.3)"}; border-radius: 2px; }
        ${flight ? "* { text-shadow: 0 0 8px rgba(0,255,136,0.2); } body { background: #000a0a; }" : ""}
      `}</style>

      <nav style={s.nav}>
        <div style={s.navInner}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "24px" }}>🦅</span>
            <div>
              <div style={s.logoText}>{flight ? "ASTROKESTREL" : "AstroKestrel"}</div>
              <div style={s.logoSub}>{flight ? "MISSION HEALTH INTELLIGENCE SYS v2.0" : "Crew Health Surveillance & Decision Support"}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <METClock flight={flight} />
            <button onClick={() => setFlight(!flight)} style={{ background: "transparent", border: `1px solid ${flight ? "#00ff88" : "rgba(99,102,241,0.4)"}`, borderRadius: flight ? "2px" : "8px", padding: "6px 14px", color: flight ? "#00ff88" : "#6366f1", fontSize: "11px", fontFamily: flight ? "monospace" : "inherit", cursor: "pointer", letterSpacing: flight ? "0.1em" : 0 }}>
              {flight ? "[SWITCH: MODERN]" : "Flight Display"}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: flight ? "transparent" : "rgba(34,197,94,0.1)", border: `1px solid ${flight ? "#00ff8840" : "rgba(34,197,94,0.3)"}`, borderRadius: flight ? "2px" : "999px", padding: "6px 14px", fontSize: "12px", color: "#22c55e", fontFamily: flight ? "monospace" : "inherit" }}>
              {!flight && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e" }} />}
              {flight ? "● MISSION ACTIVE" : "Mission Active"}
            </div>
            {dashboard.critical_alerts > 0 && (
              <div style={{ background: flight ? "transparent" : "rgba(239,68,68,0.1)", border: `1px solid ${flight ? "#ef444460" : "rgba(239,68,68,0.3)"}`, borderRadius: flight ? "2px" : "999px", padding: "6px 14px", fontSize: "12px", color: "#ef4444", fontWeight: 600, fontFamily: flight ? "monospace" : "inherit" }}>
                {flight ? `⚠ ${dashboard.critical_alerts} ALERTS` : `⚠ ${dashboard.critical_alerts} Alerts`}
              </div>
            )}
          </div>
        </div>
      </nav>

      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "1.5rem 2rem" }}>
        {flight && (
          <div style={{ fontFamily: "monospace", fontSize: "10px", color: "#00aa55", marginBottom: "1rem", letterSpacing: "0.08em" }}>
            SYSTEM: ASTROKESTREL-MHI-v2.0 | DATA: NASA-OSDR OSD-575/OSD-530 | CREW: INSPIRATION4 | ML+DETERMINISTIC: OFFLINE-CAPABLE | CHAT: CLOUD-DEPENDENT | STATUS: NOMINAL
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "1.5rem" }}>
          {[
            { label: flight ? "CREW MONITORED" : "Crew Monitored", value: dashboard.total_astronauts, sub: flight ? "INSPIRATION4 MISSION" : "Inspiration4 mission" },
            { label: flight ? "ACTIVE ALERTS" : "Active Alerts", value: dashboard.critical_alerts, sub: flight ? "REQ. COMMANDER ATTENTION" : "requiring attention", danger: dashboard.critical_alerts > 0 },
            { label: flight ? "SYS MONITORED" : "Systems Tracked", value: 4, sub: flight ? "CV · IMM · MET · NRO" : "cardiovascular · immune · metabolic · neuro-ocular" },
            { label: flight ? "BIOMARKERS" : "Biomarkers", value: "168+", sub: flight ? "NASA OSDR DATASETS" : "NASA OSDR — Inspiration4" }
          ].map(({ label, value, sub, danger }) => (
            <div key={label} style={{ ...s.metricCard, border: `1px solid ${danger ? (flight ? "#ff000040" : "rgba(239,68,68,0.3)") : (flight ? "#00ff8820" : "rgba(99,102,241,0.15)")}` }}>
              <div style={{ fontSize: "10px", color: flight ? "#00aa55" : "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>{label}</div>
              <div style={{ fontSize: "28px", fontWeight: flight ? 400 : 700, color: danger ? "#ef4444" : (flight ? "#00ff88" : "#e2e8f0"), fontFamily: "'Space Mono', monospace" }}>{value}</div>
              <div style={{ fontSize: "10px", color: flight ? "#006633" : "#475569", marginTop: "4px" }}>{sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.5rem" }}>
  <div style={{ fontSize: "10px", color: "#475569", background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: "6px", padding: "4px 10px" }}>
    🔒 ML models run offline · AI chat requires connection
  </div>
</div>

        <div style={{ marginBottom: "0.75rem", fontSize: "11px", color: flight ? "#00aa55" : "#64748b", fontFamily: flight ? "monospace" : "inherit" }}>
          {flight
            ? "► CLICK CARD TO SELECT AND VIEW MISSION INTEL. USE 'DEEP DIVE' FOR FULL HEALTH REPORT."
            : "Click any crew card to view their mission intelligence on the right. Use 'Full Report →' for the complete health deep-dive."}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "1.5rem" }}>
          <div>
            <div style={s.sectionLabel}>{flight ? "CREW HEALTH STATUS" : "Crew Status"}</div>
            {dashboard.crew.map(astronaut => (
              <AstronautCard
                key={astronaut.id}
                astronaut={astronaut}
                selected={selected === astronaut.id}
                onClick={() => handleSelect(astronaut.id)}
                flight={flight}
              />
            ))}
          </div>
          <div>
            <div style={s.sectionLabel}>{flight ? `MISSION INTELLIGENCE — CREW/${selected}` : `Mission Intelligence — ${selected}`}</div>
            <TimelineChart astronautId={selected} flight={flight} />
            <SimulationSlider astronautId={selected} flight={flight} />
            <RadarPanel crew={dashboard.crew} flight={flight} />
            <BriefPanel astronautId={selected} flight={flight} />
          </div>
        </div>

        <BiomarkerExplainer astronautId={selected} flight={flight} />
      </main>

      <FloatingChat dashboardData={dashboard} flight={flight} />
    </div>
  )
}

export default function App() {
  const [flight, setFlight] = useState(false)
  return (
    <Routes>
      <Route path="/astronaut/:astronautId" element={<AstronautPage flight={flight} setFlight={setFlight} />} />
      <Route path="/*" element={<Dashboard flight={flight} setFlight={setFlight} />} />
    </Routes>
  )
}