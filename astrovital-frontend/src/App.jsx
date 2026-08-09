import { useState, useEffect, useRef } from "react"
import axios from "axios"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend
} from "recharts"

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

// ─── MODERN MODE STYLES ───────────────────────────────────────
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

// ─── FLIGHT DISPLAY MODE STYLES ───────────────────────────────
const flightStyles = {
  app: { fontFamily: "'Share Tech Mono', 'Space Mono', monospace", background: "#000a0a", minHeight: "100vh", color: "#00ff88" },
  nav: { background: "#000d0d", borderBottom: "1px solid #00ff8840", padding: "0 2rem", position: "sticky", top: 0, zIndex: 100 },
  navInner: { maxWidth: "1400px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: "56px" },
  logoText: { fontSize: "18px", fontWeight: 400, color: "#00ff88", letterSpacing: "0.15em" },
  logoSub: { fontSize: "10px", color: "#00aa55", letterSpacing: "0.2em" },
  card: { background: "#000d0d", border: "1px solid #00ff8830", borderRadius: "4px", padding: "1rem 1.25rem", marginBottom: "1rem", position: "relative" },
  metricCard: { background: "#000d0d", border: "1px solid #00ff8830", borderRadius: "4px", padding: "1rem 1.25rem" },
  cardTitle: { fontSize: "11px", fontWeight: 400, color: "#00aa55", marginBottom: "1rem", letterSpacing: "0.1em", textTransform: "uppercase" },
  sectionLabel: { fontSize: "10px", color: "#00aa55", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "1rem" },
}

// ─── MET CLOCK ────────────────────────────────────────────────
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
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "9px", color: "#00aa55", letterSpacing: "0.15em" }}>MET</div>
          <div style={{ fontSize: "16px", color: "#00ff88", letterSpacing: "0.1em" }}>{hh}:{mm}:{ss}</div>
        </div>
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

// ─── RISK BADGE ───────────────────────────────────────────────
function RiskBadge({ level, flight }) {
  const color = RISK_COLORS[level] || "#64748b"
  if (flight) {
    return (
      <span style={{ color, border: `1px solid ${color}`, padding: "2px 8px", fontSize: "10px", letterSpacing: "0.1em" }}>
        [{level}]
      </span>
    )
  }
  return (
    <span style={{ background: `${color}15`, color, border: `1px solid ${color}40`, padding: "3px 10px", borderRadius: "999px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em" }}>
      {level}
    </span>
  )
}

// ─── RISK BAR ─────────────────────────────────────────────────
function RiskBar({ value, system, unit = "Risk Index", flight }) {
  const color = getRiskColor(value)
  const pct = (value * 100).toFixed(1)

  if (flight) {
    const filled = Math.round(value * 20)
    const bar = "█".repeat(filled) + "░".repeat(20 - filled)
    return (
      <div style={{ marginBottom: "10px", fontFamily: "monospace" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
          <span style={{ fontSize: "11px", color: "#00aa55", textTransform: "uppercase", letterSpacing: "0.08em" }}>{system}</span>
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

// ─── ASTRONAUT CARD ───────────────────────────────────────────
function AstronautCard({ astronaut, selected, onClick, flight }) {
  const color = RISK_COLORS[astronaut.alert_level] || "#64748b"
  const s = flight ? flightStyles : modernStyles

  if (flight) {
    return (
      <div onClick={onClick} style={{
        background: selected ? "#001a0a" : "#000d0d",
        border: `1px solid ${selected ? "#00ff88" : "#00ff8830"}`,
        borderRadius: "4px", padding: "1rem", cursor: "pointer", marginBottom: "8px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <div>
            <div style={{ fontSize: "13px", color: "#00ff88", letterSpacing: "0.1em" }}>CREW/{astronaut.id}</div>
            <div style={{ fontSize: "10px", color: "#00aa55" }}>MED-DAY +{astronaut.latest_day} POST-RTN</div>
          </div>
          <RiskBadge level={astronaut.alert_level} flight />
        </div>
        {Object.entries(astronaut.system_scores).map(([sys, score]) => (
          <RiskBar key={sys} system={sys.replace("_", "-")} value={score} flight />
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px", paddingTop: "8px", borderTop: "1px solid #00ff8820", fontFamily: "monospace" }}>
          <span style={{ fontSize: "10px", color: "#00aa55" }}>COMPOSITE RISK INDEX</span>
          <span style={{ fontSize: "16px", color }}>{(astronaut.composite_risk * 100).toFixed(1)}%</span>
        </div>
      </div>
    )
  }

  return (
    <div onClick={onClick} style={{
      background: selected ? "rgba(99,102,241,0.08)" : "rgba(13,18,35,0.6)",
      border: `1px solid ${selected ? "rgba(99,102,241,0.4)" : "rgba(99,102,241,0.1)"}`,
      borderRadius: "16px", padding: "1.25rem", cursor: "pointer", marginBottom: "12px",
      transition: "all 0.2s", boxShadow: selected ? "0 0 20px rgba(99,102,241,0.15)" : "none"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: `${color}20`, border: `1px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color }}>
            {astronaut.id.slice(-2)}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: "14px", color: "#e2e8f0" }}>{astronaut.name}</div>
            <div style={{ fontSize: "11px", color: "#475569" }}>Day {astronaut.latest_day} post-return</div>
          </div>
        </div>
        <RiskBadge level={astronaut.alert_level} />
      </div>
      {Object.entries(astronaut.system_scores).map(([sys, score]) => (
        <RiskBar key={sys} system={sys.replace("_", " ")} value={score} />
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <span style={{ fontSize: "11px", color: "#475569" }}>Composite risk</span>
        <span style={{ fontSize: "18px", fontWeight: 700, color, fontFamily: "'Space Mono', monospace" }}>
          {(astronaut.composite_risk * 100).toFixed(1)}%
        </span>
      </div>
    </div>
  )
}

// ─── SIMULATION SLIDER ────────────────────────────────────────
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
      <input type="range" min="1" max="500" value={missionDays}
        onChange={e => setMissionDays(Number(e.target.value))}
        style={{ width: "100%", marginBottom: "1rem", accentColor: flight ? "#00ff88" : "#6366f1" }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: flight ? "#00aa55" : "#475569", marginBottom: "1rem", marginTop: "-0.5rem" }}>
        <span>T+001</span><span>ISS (~180d)</span><span>MARS TRANSIT (~500d)</span>
      </div>
      {forecast.mars_mission_forecast.map(sys => {
        const risk = Math.min(getInterpolatedRisk(sys, missionDays), 1)
        const willBeCritical = sys.breaches_critical && sys.critical_threshold_day <= missionDays
        return (
          <RiskBar key={sys.system}
            system={sys.system.replace("_", "-") + (willBeCritical ? " ⚠" : "")}
            value={risk} unit={willBeCritical ? `CRIT DAY ${sys.critical_threshold_day}` : "projected"} flight={flight} />
        )
      })}
    </div>
  )
}

// ─── RADAR PANEL ──────────────────────────────────────────────
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
          {crew.map((a, i) => (
            <Radar key={a.id} name={a.id} dataKey={a.id} stroke={colors[i]} fill={colors[i]} fillOpacity={0.08} strokeWidth={2} />
          ))}
          <Legend wrapperStyle={{ fontSize: "11px", color: flight ? "#00aa55" : "#94a3b8" }} />
          <Tooltip contentStyle={{ background: flight ? "#000d0d" : "#0d1223", border: `1px solid ${flight ? "#00ff8830" : "rgba(99,102,241,0.2)"}`, borderRadius: flight ? "2px" : "8px", color: flight ? "#00ff88" : "#e2e8f0", fontFamily: flight ? "monospace" : "inherit" }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── TIMELINE CHART ───────────────────────────────────────────
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
          <XAxis dataKey="day" tick={{ fill: flight ? "#00aa55" : "#64748b", fontSize: 10, fontFamily: flight ? "monospace" : "inherit" }} />
          <YAxis domain={[0, 100]} tick={{ fill: flight ? "#00aa55" : "#64748b", fontSize: 10, fontFamily: flight ? "monospace" : "inherit" }} unit="%" />
          <Tooltip contentStyle={{ background: flight ? "#000d0d" : "#0d1223", border: `1px solid ${flight ? "#00ff8830" : "rgba(99,102,241,0.2)"}`, borderRadius: "4px", color: flight ? "#00ff88" : "#e2e8f0", fontFamily: flight ? "monospace" : "inherit" }} formatter={(v) => [`${v}%`, "CRI"]} />
          <ReferenceLine y={75} stroke="#ef444460" strokeDasharray="4 4" label={{ value: flight ? "CRIT" : "CRITICAL", fontSize: 9, fill: "#ef4444" }} />
          <ReferenceLine y={55} stroke="#f9731660" strokeDasharray="4 4" label={{ value: flight ? "HIGH" : "HIGH", fontSize: 9, fill: "#f97316" }} />
          <Line type="monotone" dataKey="risk" stroke={flight ? "#00ff88" : "#6366f1"} strokeWidth={flight ? 1 : 2}
            dot={{ r: 4, fill: flight ? "#00ff88" : "#6366f1", strokeWidth: 0 }}
            activeDot={{ r: 6, strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── ASK ASTROKESTREL ─────────────────────────────────────────
function AskAstroKestrel({ dashboardData, flight }) {
  const [query, setQuery] = useState("")
  const [messages, setMessages] = useState([
    { role: "assistant", content: flight ? "> ASTROKESTREL MISSION AI ONLINE\n> AWAITING COMMANDER INPUT..." : "Mission health intelligence ready. Ask me anything about crew status, risk trajectories, or intervention recommendations." }
  ])
  const [loading, setLoading] = useState(false)

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

  const s = flight ? flightStyles : modernStyles

  return (
    <div style={s.card}>
      <div style={s.cardTitle}>{flight ? "MISSION AI — ASTROKESTREL INTERFACE" : "Ask AstroKestrel — Mission AI"}</div>
      <div style={{ height: "220px", overflowY: "auto", marginBottom: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "85%",
              background: flight
                ? (m.role === "user" ? "rgba(0,255,136,0.08)" : "transparent")
                : (m.role === "user" ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)"),
              border: flight
                ? `1px solid ${m.role === "user" ? "#00ff8840" : "#00ff8820"}`
                : `1px solid ${m.role === "user" ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: flight ? "2px" : "12px",
              padding: "8px 12px",
              fontSize: "12px",
              color: flight ? (m.role === "user" ? "#00ff88" : "#00cc66") : "#e2e8f0",
              fontFamily: flight ? "monospace" : "inherit",
              lineHeight: "1.5",
              whiteSpace: "pre-wrap"
            }}>
              {flight && m.role === "assistant" && "> "}{m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ fontSize: "12px", color: flight ? "#00aa55" : "#475569", fontFamily: flight ? "monospace" : "inherit" }}>
            {flight ? "> PROCESSING BIOTELEMETRY..." : "Analysing mission data..."}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <input value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && ask()}
          placeholder={flight ? "> ENTER QUERY..." : "e.g. Which astronaut is at highest risk on a Mars mission?"}
          style={{
            flex: 1,
            background: flight ? "#001a0a" : "rgba(255,255,255,0.04)",
            border: `1px solid ${flight ? "#00ff8840" : "rgba(99,102,241,0.2)"}`,
            borderRadius: flight ? "2px" : "10px",
            padding: "10px 14px",
            fontSize: "12px",
            color: flight ? "#00ff88" : "#e2e8f0",
            fontFamily: flight ? "monospace" : "inherit",
            outline: "none"
          }}
        />
        <button onClick={ask} disabled={loading} style={{
          background: flight ? "transparent" : "rgba(99,102,241,0.8)",
          border: flight ? "1px solid #00ff88" : "none",
          borderRadius: flight ? "2px" : "10px",
          padding: "10px 18px",
          color: flight ? "#00ff88" : "white",
          fontSize: "12px",
          fontFamily: flight ? "monospace" : "inherit",
          fontWeight: flight ? 400 : 600,
          cursor: loading ? "not-allowed" : "pointer",
          letterSpacing: flight ? "0.1em" : 0
        }}>
          {loading ? (flight ? "PROC" : "...") : (flight ? "SEND" : "Ask")}
        </button>
      </div>
    </div>
  )
}

// ─── BRIEF PANEL ──────────────────────────────────────────────
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
            <div key={i} style={{ fontSize: "11px", color: flight ? "#ff4444" : "#f87171", fontFamily: flight ? "monospace" : "inherit" }}>
              {flight ? ">> " : "⚠ "}{interaction}
            </div>
          ))}
        </div>
      )}
      {brief.interventions.length === 0 ? (
        <div style={{ fontSize: "12px", color: flight ? "#00ff88" : "#22c55e", textAlign: "center", padding: "1rem", fontFamily: flight ? "monospace" : "inherit" }}>
          {flight ? "> ALL SYSTEMS NOMINAL. NO INTERVENTION REQUIRED." : "✓ No interventions required"}
        </div>
      ) : (
        brief.interventions.map((iv, i) => (
          <div key={i} style={{ display: "flex", gap: "12px", padding: "10px 0", borderBottom: i < brief.interventions.length - 1 ? `1px solid ${flight ? "#00ff8815" : "rgba(255,255,255,0.05)"}` : "none" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: flight ? "2px" : "6px", height: "fit-content", whiteSpace: "nowrap", background: `${RISK_COLORS[iv.priority] || "#64748b"}15`, color: RISK_COLORS[iv.priority] || "#64748b", border: `1px solid ${RISK_COLORS[iv.priority] || "#64748b"}40`, fontFamily: flight ? "monospace" : "inherit" }}>
              {iv.priority}
            </span>
            <div>
              <div style={{ fontSize: "11px", fontWeight: flight ? 400 : 600, color: flight ? "#00aa55" : "#94a3b8", marginBottom: "4px", fontFamily: flight ? "monospace" : "inherit", letterSpacing: flight ? "0.05em" : 0 }}>{flight ? `[${iv.system.toUpperCase()}]` : iv.system}</div>
              <div style={{ fontSize: "11px", color: flight ? "#007744" : "#64748b", lineHeight: "1.6", fontFamily: flight ? "monospace" : "inherit" }}>{iv.action}</div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ─── MAIN APP ─────────────────────────────────────────────────
export default function App() {
  const [dashboard, setDashboard] = useState(null)
  const [selected, setSelected] = useState("C001")
  const [flight, setFlight] = useState(false)

  useEffect(() => {
    axios.get(`${API}/api/dashboard`).then(res => setDashboard(res.data))
  }, [])

  const s = flight ? flightStyles : modernStyles

  if (!dashboard) return (
    <div style={{ ...s.app, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🚀</div>
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
        ${flight ? `
          * { text-shadow: 0 0 8px rgba(0,255,136,0.3); }
          body { background: #000a0a; }
        ` : ""}
      `}</style>

      <nav style={s.nav}>
        <div style={s.navInner}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: flight ? "18px" : "24px" }}>🦅</span>
            <div>
              <div style={s.logoText}>{flight ? "ASTROKESTREL" : "AstroKestrel"}</div>
              <div style={s.logoSub}>{flight ? "MISSION HEALTH INTELLIGENCE SYS v1.0" : "Mission Health Intelligence"}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <METClock flight={flight} />

            <button onClick={() => setFlight(!flight)} style={{
              background: "transparent",
              border: `1px solid ${flight ? "#00ff88" : "rgba(99,102,241,0.4)"}`,
              borderRadius: flight ? "2px" : "8px",
              padding: "6px 14px",
              color: flight ? "#00ff88" : "#6366f1",
              fontSize: "11px",
              fontFamily: flight ? "monospace" : "inherit",
              cursor: "pointer",
              letterSpacing: flight ? "0.1em" : 0
            }}>
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
            SYSTEM: ASTROKESTREL-MHI-v1.0 | DATA: NASA-OSDR OSD-575/OSD-530 | CREW: INSPIRATION4 | SYSTEMS: 4 | STATUS: NOMINAL
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "1.5rem" }}>
          {[
            { label: flight ? "CREW MONITORED" : "Crew Monitored", value: dashboard.total_astronauts, sub: flight ? "INSPIRATION4 MISSION" : "Inspiration4 mission" },
            { label: flight ? "ACTIVE ALERTS" : "Active Alerts", value: dashboard.critical_alerts, sub: flight ? "REQ. COMMANDER ATTENTION" : "requiring attention", danger: dashboard.critical_alerts > 0 },
            { label: flight ? "SYS MONITORED" : "Systems Tracked", value: 4, sub: flight ? "CV · IMM · MET · NRO" : "cardiovascular · immune · metabolic · neuro-ocular" },
            { label: flight ? "BIOMARKERS" : "Data Points", value: "168+", sub: flight ? "NASA OSDR DATASETS" : "NASA OSDR biomarkers" }
          ].map(({ label, value, sub, danger }) => (
            <div key={label} style={{ ...s.metricCard, border: `1px solid ${danger ? (flight ? "#ff000040" : "rgba(239,68,68,0.3)") : (flight ? "#00ff8820" : "rgba(99,102,241,0.15)")}` }}>
              <div style={{ fontSize: "10px", color: flight ? "#00aa55" : "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>{label}</div>
              <div style={{ fontSize: "28px", fontWeight: flight ? 400 : 700, color: danger ? "#ef4444" : (flight ? "#00ff88" : "#e2e8f0"), fontFamily: flight ? "monospace" : "'Space Mono', monospace" }}>{value}</div>
              <div style={{ fontSize: "10px", color: flight ? "#006633" : "#475569", marginTop: "4px" }}>{sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "1.5rem" }}>
          <div>
            <div style={s.sectionLabel}>{flight ? "CREW HEALTH STATUS" : "Crew Status"}</div>
            {dashboard.crew.map(astronaut => (
              <AstronautCard key={astronaut.id} astronaut={astronaut} selected={selected === astronaut.id} onClick={() => setSelected(astronaut.id)} flight={flight} />
            ))}
          </div>

          <div>
            <div style={s.sectionLabel}>{flight ? `MISSION INTELLIGENCE — CREW/${selected}` : `Mission Intelligence — ${selected}`}</div>
            <TimelineChart astronautId={selected} flight={flight} />
            <SimulationSlider astronautId={selected} flight={flight} />
            <RadarPanel crew={dashboard.crew} flight={flight} />
            <AskAstroKestrel dashboardData={dashboard} flight={flight} />
            <BriefPanel astronautId={selected} flight={flight} />
          </div>
        </div>
      </main>
    </div>
  )
}