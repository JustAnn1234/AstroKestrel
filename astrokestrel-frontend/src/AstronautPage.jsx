import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import axios from "axios"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from "recharts"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

const SYSTEM_COLORS = {
  cardiovascular: "#ef4444",
  immune: "#f97316",
  metabolic: "#eab308",
  neuro_ocular: "#8b5cf6",
  radiation: "#06b6d4",
}

const TIER_COLORS = {
  IMMEDIATE_INTERVENTION: "#ef4444",
  MEDICAL_ADVISORY: "#f97316",
  REVIEW: "#eab308",
  WATCH: "#3b82f6",
}

function getRiskColor(score) {
  if (score >= 0.75) return "#ef4444"
  if (score >= 0.55) return "#f97316"
  if (score >= 0.35) return "#eab308"
  return "#22c55e"
}

function TierBadge({ tier, flight }) {
  if (!tier) return null
  const color = TIER_COLORS[tier] || "#64748b"
  const label = tier.replace(/_/g, " ")
  if (flight) {
    return (
      <span style={{ color, border: `1px solid ${color}`, padding: "2px 8px", fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.08em" }}>
        [{tier}]
      </span>
    )
  }
  return (
    <span style={{ background: `${color}15`, color, border: `1px solid ${color}40`, padding: "4px 12px", borderRadius: "999px", fontSize: "11px", fontWeight: 700 }}>
      {label}
    </span>
  )
}

export default function AstronautPage({ flight, setFlight }) {
  const { astronautId } = useParams()
  const navigate = useNavigate()
  const aid = astronautId?.toUpperCase()

  const [brief, setBrief] = useState(null)
  const [biomarkers, setBiomarkers] = useState(null)
  const [timeline, setTimeline] = useState(null)
  const [forecast, setForecast] = useState(null)
  const [loading, setLoading] = useState(true)

  // Persistent action log — survives navigation
  const logKey = `astrokestrel_log_${aid}`
  const [actionLog, setActionLog] = useState(() => {
    try { return JSON.parse(localStorage.getItem(logKey) || "[]") } catch { return [] }
  })

  const bg = flight ? "#000a0a" : "#0a0e1a"
  const surface = flight ? "#000d0d" : "rgba(13,18,35,0.8)"
  const border = flight ? "rgba(0,255,136,0.15)" : "rgba(99,102,241,0.15)"
  const text = flight ? "#00ff88" : "#e2e8f0"
  const muted = flight ? "#00aa55" : "#64748b"
  const ff = flight ? "'Share Tech Mono', monospace" : "system-ui, sans-serif"
  const accent = flight ? "#00ff88" : "#6366f1"

  const card = { background: surface, border: `1px solid ${border}`, borderRadius: flight ? "4px" : "16px", padding: "1.25rem 1.5rem", marginBottom: "1rem" }
  const cardTitle = { fontSize: flight ? "11px" : "13px", fontWeight: flight ? 400 : 600, color: muted, marginBottom: "1rem", letterSpacing: flight ? "0.1em" : 0, textTransform: flight ? "uppercase" : "none", fontFamily: ff }

  useEffect(() => {
    if (!aid) return
    setLoading(true)
    try {
      const stored = localStorage.getItem(logKey)
      setActionLog(stored ? JSON.parse(stored) : [])
    } catch { setActionLog([]) }

    Promise.all([
      axios.get(`${API}/api/astronaut/${aid}/brief`),
      axios.get(`${API}/api/astronaut/${aid}/biomarkers`),
      axios.get(`${API}/api/astronaut/${aid}/timeline`),
      axios.get(`${API}/api/astronaut/${aid}/forecast`)
    ]).then(([b, bio, t, f]) => {
      setBrief(b.data)
      setBiomarkers(bio.data)
      setTimeline(t.data)
      setForecast(f.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [aid])

  const acknowledgeRule = (ruleKey, action) => {
    const entry = { timestamp: new Date().toISOString(), astronaut: aid, rule: ruleKey, action, acknowledged_by: "MISSION COMMANDER" }
    setActionLog(prev => {
      const newLog = [entry, ...prev]
      try { localStorage.setItem(logKey, JSON.stringify(newLog)) } catch {}
      return newLog
    })
  }

  const isAcknowledged = (ruleKey) => actionLog.some(a => a.rule === ruleKey)

  if (loading) return (
    <div style={{ background: bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ff }}>
      <div style={{ textAlign: "center", color: accent }}>
        <div style={{ fontSize: "32px", marginBottom: "12px" }}>🦅</div>
        <div style={{ fontSize: "13px", letterSpacing: "0.1em" }}>
          {flight ? `LOADING CREW/${aid} DATA...` : `Loading ${aid} health data...`}
        </div>
      </div>
    </div>
  )

  if (!brief) return (
    <div style={{ background: bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ff, color: "#ef4444" }}>
      <div>
        Astronaut {aid} not found.{" "}
        <button onClick={() => navigate("/")} style={{ color: accent, background: "none", border: "none", cursor: "pointer", fontFamily: ff }}>Return to dashboard</button>
      </div>
    </div>
  )

  const tierColor = TIER_COLORS[brief.combined_tier] || "#64748b"
  const timelineData = timeline?.timeline?.map(t => ({ day: `D+${t.day}`, risk: +(t.composite_risk * 100).toFixed(1) })) || []

  return (
    <div style={{ background: bg, minHeight: "100vh", color: text, fontFamily: ff }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Share+Tech+Mono&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${accent}30; border-radius: 2px; }
        ${flight ? "* { text-shadow: 0 0 8px rgba(0,255,136,0.15); } body { background: #000a0a; }" : ""}
        @media (max-width: 768px) {
          .ak-header-grid { grid-template-columns: 1fr 1fr !important; }
          .ak-two-col { grid-template-columns: 1fr !important; }
          .ak-five-col { grid-template-columns: 1fr 1fr !important; }
          .ak-rules-grid { grid-template-columns: 1fr !important; }
          .ak-main { padding: 1rem !important; }
          .ak-nav { padding: 0 1rem !important; }
          .ak-nav-inner { flex-wrap: wrap; height: auto !important; padding: 8px 0 !important; gap: 8px !important; }
        }
      `}</style>

      {/* NAV */}
      <nav className="ak-nav" style={{ background: flight ? "#000d0d" : "rgba(13,18,35,0.95)", borderBottom: `1px solid ${border}`, padding: "0 2rem", position: "sticky", top: 0, zIndex: 100 }}>
        <div className="ak-nav-inner" style={{ maxWidth: "1400px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: "56px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button onClick={() => navigate("/")} style={{ background: "transparent", border: `1px solid ${border}`, borderRadius: flight ? "2px" : "8px", padding: "6px 12px", color: muted, fontSize: "12px", cursor: "pointer", fontFamily: ff }}>
              {flight ? "← DASHBOARD" : "← Dashboard"}
            </button>
            <span style={{ color: border, fontSize: "16px" }}>|</span>
            <div>
              <div style={{ fontSize: flight ? "14px" : "16px", fontWeight: 600, color: accent, letterSpacing: flight ? "0.1em" : 0 }}>
                {flight ? `CREW/${aid} — DEEP DIVE` : `Astronaut ${aid} — Full Health Report`}
              </div>
              <div style={{ fontSize: "10px", color: muted }}>
                {flight ? `MED-DAY +${brief.day} POST-RTN` : `Day ${brief.day} post-return`}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            {setFlight && (
              <button onClick={() => setFlight(!flight)} style={{ background: "transparent", border: `1px solid ${flight ? "#00ff88" : "rgba(99,102,241,0.4)"}`, borderRadius: flight ? "2px" : "8px", padding: "5px 12px", color: flight ? "#00ff88" : "#6366f1", fontSize: "11px", fontFamily: ff, cursor: "pointer" }}>
                {flight ? "[SWITCH: MODERN]" : "Flight Display"}
              </button>
            )}
            <TierBadge tier={brief.combined_tier} flight={flight} />
          </div>
        </div>
      </nav>

      <main className="ak-main" style={{ maxWidth: "1400px", margin: "0 auto", padding: "1.5rem 2rem" }}>

        {/* HEADER SUMMARY CARD */}
        <div style={{ ...card, borderColor: `${tierColor}30`, marginBottom: "1.5rem" }}>
          <div className="ak-header-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1rem", marginBottom: brief.commander_action ? "14px" : 0 }}>
            <div>
              <div style={{ fontSize: "10px", color: muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Composite Risk</div>
              <div style={{ fontSize: "32px", fontWeight: 700, color: tierColor, fontFamily: "'Space Mono', monospace" }}>{(brief.composite_risk * 100).toFixed(1)}%</div>
            </div>
            <div>
              <div style={{ fontSize: "10px", color: muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Combined Tier</div>
              <TierBadge tier={brief.combined_tier} flight={flight} />
              <div style={{ fontSize: "10px", color: muted, marginTop: "6px" }}>Source: {brief.tier_source}</div>
            </div>
            <div>
              <div style={{ fontSize: "10px", color: muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Rules Fired</div>
              <div style={{ fontSize: "28px", fontWeight: 700, color: brief.rules_count > 0 ? "#f97316" : "#22c55e", fontFamily: "'Space Mono', monospace" }}>{brief.rules_count}</div>
            </div>
            <div>
              <div style={{ fontSize: "10px", color: muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Confidence</div>
              <div style={{ fontSize: "14px", color: brief.confidence === "LOW" ? "#f97316" : "#22c55e", fontFamily: "'Space Mono', monospace" }}>{brief.confidence}</div>
              <div style={{ fontSize: "10px", color: muted, marginTop: "2px" }}>{biomarkers?.baseline_samples} baseline samples</div>
            </div>
            <div>
              <div style={{ fontSize: "10px", color: muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Systems Flagged</div>
              <div style={{ fontSize: "12px", color: text, lineHeight: "1.6" }}>{brief.systems_flagged?.join(", ") || "None"}</div>
            </div>
          </div>
          {brief.commander_action && (
            <div style={{ background: `${tierColor}08`, border: `1px solid ${tierColor}20`, borderRadius: flight ? "2px" : "8px", padding: "10px 14px" }}>
              <div style={{ fontSize: "10px", color: tierColor, letterSpacing: "0.08em", marginBottom: "4px", fontWeight: 600, fontFamily: ff }}>Commander Action Required</div>
              <div style={{ fontSize: "12px", color: text, lineHeight: "1.6", fontFamily: ff }}>{brief.commander_action}</div>
            </div>
          )}
        </div>

        {/* ROW 1: System Scores + Timeline | Cascade Alerts + Interventions */}
        <div className="ak-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start", marginBottom: "0" }}>
          <div>
            <div style={card}>
              <div style={cardTitle}>System Risk Indices</div>
              {Object.entries(brief.system_scores || {}).map(([sys, score]) => {
                const color = getRiskColor(score)
                const sysColor = SYSTEM_COLORS[sys] || color
                return (
                  <div key={sys} style={{ marginBottom: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ fontSize: "12px", color: muted, textTransform: flight ? "uppercase" : "capitalize", fontFamily: ff }}>{sys.replace("_", "-")}</span>
                      <span style={{ fontSize: "13px", fontWeight: 700, color, fontFamily: "'Space Mono', monospace" }}>{(score * 100).toFixed(1)}%</span>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "4px", height: "6px" }}>
                      <div style={{ width: `${score * 100}%`, background: `linear-gradient(90deg, ${sysColor}80, ${sysColor})`, borderRadius: "4px", height: "6px", boxShadow: `0 0 8px ${sysColor}50` }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={card}>
              <div style={cardTitle}>{flight ? `RISK TIMELINE — CREW/${aid}` : `Risk Timeline — ${aid}`}</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={flight ? "#00ff8810" : "rgba(255,255,255,0.05)"} />
                  <XAxis dataKey="day" tick={{ fill: muted, fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: muted, fontSize: 10 }} unit="%" />
                  <Tooltip contentStyle={{ background: flight ? "#000d0d" : "#0d1223", border: `1px solid ${border}`, borderRadius: "4px", color: text }} formatter={v => [`${v}%`, "CRI"]} />
                  <ReferenceLine y={75} stroke="#ef444460" strokeDasharray="4 4" label={{ value: "CRITICAL", fontSize: 9, fill: "#ef4444" }} />
                  <ReferenceLine y={55} stroke="#f9731660" strokeDasharray="4 4" label={{ value: "HIGH", fontSize: 9, fill: "#f97316" }} />
                  <Line type="monotone" dataKey="risk" stroke={accent} strokeWidth={2} dot={{ r: 5, fill: accent, strokeWidth: 0 }} activeDot={{ r: 7, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            {brief.interactions?.length > 0 && (
              <div style={{ ...card, borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.04)" }}>
                <div style={cardTitle}>{flight ? "CROSS-SYSTEM CASCADE ALERTS" : "Cross-System Cascade Alerts"}</div>
                {brief.interactions.map((interaction, idx) => (
                  <div key={idx} style={{ fontSize: "12px", color: "#f87171", fontFamily: ff, lineHeight: "1.6", marginBottom: "6px" }}>
                    {flight ? ">> " : "⚠ "}{interaction}
                  </div>
                ))}
              </div>
            )}
            <div style={card}>
              <div style={cardTitle}>{flight ? "INTERVENTION PROTOCOL" : "Intervention Protocol"}</div>
              {(!brief.interventions || brief.interventions.length === 0) ? (
                <div style={{ fontSize: "12px", color: "#22c55e", fontFamily: ff, textAlign: "center", padding: "1rem" }}>
                  {flight ? "> NO INTERVENTIONS REQUIRED" : "✓ No interventions required"}
                </div>
              ) : (
                brief.interventions.map((iv, i) => {
                  const c = TIER_COLORS[iv.priority] || "#64748b"
                  return (
                    <div key={i} style={{ display: "flex", gap: "12px", padding: "10px 0", borderBottom: i < brief.interventions.length - 1 ? `1px solid ${border}` : "none" }}>
                      <span style={{ fontSize: "10px", padding: "3px 8px", borderRadius: flight ? "2px" : "6px", height: "fit-content", whiteSpace: "nowrap", background: `${c}15`, color: c, border: `1px solid ${c}40`, fontFamily: ff }}>{iv.priority}</span>
                      <div>
                        <div style={{ fontSize: "11px", fontWeight: 600, color: muted, marginBottom: "4px", fontFamily: ff }}>{flight ? `[${iv.system.toUpperCase()}]` : iv.system}</div>
                        <div style={{ fontSize: "11px", color: muted, lineHeight: "1.6", fontFamily: ff }}>{iv.action}</div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* ROW 2: Mars Forecast FULL WIDTH — 4 columns, one per system */}
        <div style={card}>
          <div style={cardTitle}>{flight ? "MARS MISSION TRAJECTORY — 180D SIMULATION" : "Mars Mission Trajectory (180-day simulation)"}</div>
          <div className="ak-five-col" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.75rem" }}>
            {forecast?.mars_mission_forecast?.map(sys => {
              const sysColor = SYSTEM_COLORS[sys.system] || "#64748b"
              return (
                <div key={sys.system} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${border}`, borderRadius: flight ? "2px" : "12px", padding: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <span style={{ fontSize: "12px", color: muted, textTransform: flight ? "uppercase" : "capitalize", fontFamily: ff }}>{sys.system.replace("_", "-")}</span>
                    {sys.breaches_critical && (
                      <span style={{ fontSize: "9px", color: "#ef4444", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", padding: "2px 6px", borderRadius: "4px", fontFamily: ff }}>
                        ⚠ D{sys.critical_threshold_day}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {[["D30", sys.day_30_risk], ["D90", sys.day_90_risk], ["D180", sys.day_180_risk]].map(([label, val]) => {
                      const c = getRiskColor(val)
                      return (
                        <div key={label} style={{ flex: 1, background: `${c}08`, border: `1px solid ${c}20`, borderRadius: flight ? "2px" : "6px", padding: "6px", textAlign: "center" }}>
                          <div style={{ fontSize: "9px", color: muted, marginBottom: "2px" }}>{label}</div>
                          <div style={{ fontSize: "14px", fontWeight: 700, color: c, fontFamily: "'Space Mono', monospace" }}>{(val * 100).toFixed(0)}%</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ROW 3: Deterministic Rules FULL WIDTH — 2 per row grid */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div style={cardTitle}>
              {flight ? "DETERMINISTIC CLINICAL RULES LOG" : "Clinical Rules — Deterministic Engine"}
            </div>
            <div style={{ fontSize: "11px", color: muted, fontFamily: ff }}>
              {brief.rules_count} rules fired · {actionLog.length} acknowledged
            </div>
          </div>
          {(!brief.deterministic_rules || brief.deterministic_rules.length === 0) ? (
            <div style={{ fontSize: "12px", color: "#22c55e", textAlign: "center", padding: "1.5rem", fontFamily: ff }}>
              {flight ? "> NO RULES FIRED. ALL BIOMARKERS WITHIN CLINICAL THRESHOLDS." : "✓ No clinical rules fired — all biomarkers within normal thresholds"}
            </div>
          ) : (
            <div className="ak-rules-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {brief.deterministic_rules.map((rule, i) => {
                const ruleKey = `${rule.biomarker}_${rule.tier}`
                const tColor = TIER_COLORS[rule.tier] || "#64748b"
                const acked = isAcknowledged(ruleKey)
                return (
                  <div key={i} style={{ padding: "12px 14px", borderRadius: flight ? "2px" : "10px", border: `1px solid ${acked ? "rgba(34,197,94,0.25)" : tColor + "25"}`, background: acked ? "rgba(34,197,94,0.04)" : `${tColor}06` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <div style={{ flex: 1, paddingRight: "8px" }}>
                        <div style={{ fontSize: "11px", fontWeight: 600, color: acked ? "#22c55e" : tColor, fontFamily: ff, marginBottom: "2px" }}>
                          {flight ? rule.name.toUpperCase() : rule.name}
                        </div>
                        <div style={{ fontSize: "10px", color: muted, fontFamily: "monospace" }}>
                          {rule.value > 1000000 ? `${(rule.value / 1000000).toFixed(2)}M` : rule.value > 1000 ? `${(rule.value / 1000).toFixed(1)}k` : rule.value} {rule.unit.split("(")[0].trim()}
                          {rule.pct_of_threshold && ` · ${rule.pct_of_threshold}% of threshold`}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", flexShrink: 0 }}>
                        <TierBadge tier={rule.tier} flight={flight} />
                        {acked ? (
                          <span style={{ fontSize: "9px", color: "#22c55e", fontFamily: ff }}>✓ {flight ? "ACK" : "Acknowledged"}</span>
                        ) : (
                          <button onClick={() => acknowledgeRule(ruleKey, `${rule.tier}: ${rule.name}`)} style={{ background: "transparent", border: `1px solid ${tColor}40`, borderRadius: flight ? "2px" : "4px", padding: "2px 8px", color: tColor, fontSize: "9px", cursor: "pointer", fontFamily: ff }}>
                            {flight ? "ACK" : "Acknowledge"}
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: "11px", color: muted, lineHeight: "1.5", fontFamily: ff, borderLeft: `2px solid ${acked ? "#22c55e40" : tColor + "30"}`, paddingLeft: "8px" }}>
                      {rule.significance}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ROW 4: Action Log | Confidence — FULL WIDTH 2 COLUMNS */}
        <div className="ak-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>

          <div style={card}>
            <div style={cardTitle}>{flight ? "COMMANDER ACTION LOG — TRACEABILITY" : "Commander Action Log"}</div>
            {actionLog.length === 0 ? (
              <div style={{ fontSize: "11px", color: muted, fontFamily: ff, textAlign: "center", padding: "0.75rem" }}>
                {flight ? "> NO ACTIONS LOGGED. ACKNOWLEDGE RULES ABOVE TO CREATE ENTRIES." : "No actions logged. Acknowledge clinical rules above to create traceability entries."}
              </div>
            ) : (
              <>
                <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                  {actionLog.map((entry, i) => (
                    <div key={i} style={{ padding: "8px 10px", borderRadius: flight ? "2px" : "6px", background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)", marginBottom: "6px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                        <span style={{ fontSize: "10px", fontWeight: 600, color: "#22c55e", fontFamily: ff }}>✓ {flight ? "ACK" : "Acknowledged"}</span>
                        <span style={{ fontSize: "9px", color: muted, fontFamily: "monospace" }}>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div style={{ fontSize: "10px", color: muted, fontFamily: ff }}>{entry.action}</div>
                      <div style={{ fontSize: "9px", color: muted, fontFamily: ff, marginTop: "2px" }}>{entry.acknowledged_by}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: "10px", color: muted, marginTop: "8px", fontFamily: ff, paddingTop: "8px", borderTop: `1px solid ${border}` }}>
                  {flight ? "NOTE: LOG PERSISTS IN BROWSER STORAGE." : "Note: Acknowledgements persist across navigation."}
                </div>
              </>
            )}
          </div>

          <div style={{ ...card, borderColor: "rgba(234,179,8,0.2)", background: "rgba(234,179,8,0.03)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontSize: "13px", color: "#ca8a04", lineHeight: "1.7", fontFamily: ff, marginBottom: "14px" }}>
              ⚠ {brief.confidence_note}
            </div>
            <div style={{ paddingTop: "12px", borderTop: "1px solid rgba(234,179,8,0.15)", fontSize: "11px", color: "#a16207", lineHeight: "1.6", fontFamily: ff }}>
              {flight
                ? "ALL OUTPUTS REQUIRE CMO VALIDATION. THIS SYSTEM SUPPORTS CLINICAL DECISION-MAKING AND DOES NOT REPLACE IT. HUMAN AUTHORITY IS FINAL."
                : "All risk outputs require Crew Medical Officer validation. AstroKestrel supports clinical decision-making — it does not replace it. Human authority is always final."}
            </div>
          </div>

        </div>

      </main>
    </div>
  )
}