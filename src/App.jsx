import React, { useMemo, useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { TrendingUp, DollarSign, Clock, RotateCcw, PiggyBank } from "lucide-react";

// ---------------------------------------------------------------------------
// Fixed reference points
// ---------------------------------------------------------------------------
const TODAY = new Date(2026, 7, 21); // Aug 21, 2026
const SCENARIOS = [
  { key: "sep", label: "Start Sept 1", short: "Sept", start: new Date(2026, 8, 1), color: "#2F6F6B" },
  { key: "oct", label: "Start Oct 1", short: "Oct", start: new Date(2026, 9, 1), color: "#C98A2C" },
  { key: "nov", label: "Start Nov 1", short: "Nov", start: new Date(2026, 10, 1), color: "#C1462F" },
];

const DEFAULTS = {
  currentSubs: 70,
  organicPerDay: 0,
  dailyBudget: 20,
  cpa: 2,
  openingDate: "2027-01-15",
  conversionPct: 2,
  revenuePerConversion: 2000,
  directBudget: 50,
  directCpl: 20,
  directConvPct: 2,
  directRevenuePerPatient: 2000,
};

const STORAGE_PREFIX = "tenmore-growth-dashboard:";

// ---------------------------------------------------------------------------
// Persistence: same API as useState, but reads/writes localStorage so a
// visitor's inputs are still there next time they open the page.
// ---------------------------------------------------------------------------
function usePersistentState(key, defaultValue) {
  const storageKey = STORAGE_PREFIX + key;

  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // localStorage unavailable (private browsing, quota, etc.) — fail silently
    }
  }, [storageKey, value]);

  return [value, setValue];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const fmtInt = (n) => Math.round(n).toLocaleString("en-US");
const fmtUSD = (n) =>
  n >= 1000
    ? `$${Math.round(n).toLocaleString("en-US")}`
    : `$${n.toFixed(0)}`;
const fmtDate = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
const daysBetween = (a, b) => Math.round((b.getTime() - a.getTime()) / 86400000);

function buildSeries(opening, currentSubs, organicPerDay, dailyBudget, cpa) {
  const data = [];
  let subs = { sep: currentSubs, oct: currentSubs, nov: currentSubs };
  let cursor = new Date(TODAY);
  const step = 4;
  const paidRate = dailyBudget > 0 && cpa > 0 ? dailyBudget / cpa : 0;

  const pushPoint = (d) =>
    data.push({
      dateLabel: fmtDate(d),
      sep: Math.round(subs.sep),
      oct: Math.round(subs.oct),
      nov: Math.round(subs.nov),
    });

  pushPoint(cursor);
  while (cursor.getTime() < opening.getTime()) {
    for (let i = 0; i < step && cursor.getTime() < opening.getTime(); i++) {
      SCENARIOS.forEach((s) => {
        const active = cursor.getTime() >= s.start.getTime();
        subs[s.key] += organicPerDay + (active ? paidRate : 0);
      });
      cursor = new Date(cursor.getTime() + 86400000);
    }
    pushPoint(cursor);
  }
  return data;
}

// ---------------------------------------------------------------------------
// Small UI atoms
// ---------------------------------------------------------------------------
function Field({ label, unit, value, min, max, step, onChange, format }) {
  const display = format ? format(value) : value;
  return (
    <div className="field">
      <div className="field-top">
        <span className="field-label">{label}</span>
        <span className="field-value">
          {display}
          {unit ? <span className="field-unit">{unit}</span> : null}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="tooltip">
      <div className="tooltip-date">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="tooltip-row">
          <span className="dot" style={{ background: p.color }} />
          <span className="tooltip-name">{p.name}</span>
          <span className="tooltip-val">{formatter ? formatter(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function AudienceGrowthDashboard() {
  const [currentSubs, setCurrentSubs] = usePersistentState("currentSubs", DEFAULTS.currentSubs);
  const [organicPerDay, setOrganicPerDay] = usePersistentState("organicPerDay", DEFAULTS.organicPerDay);
  const [dailyBudget, setDailyBudget] = usePersistentState("dailyBudget", DEFAULTS.dailyBudget);
  const [cpa, setCpa] = usePersistentState("cpa", DEFAULTS.cpa);
  const [openingDateStr, setOpeningDateStr] = usePersistentState("openingDate", DEFAULTS.openingDate);
  const [conversionPct, setConversionPct] = usePersistentState("conversionPct", DEFAULTS.conversionPct);
  const [revenuePerConversion, setRevenuePerConversion] = usePersistentState(
    "revenuePerConversion",
    DEFAULTS.revenuePerConversion
  );

  const [directBudget, setDirectBudget] = usePersistentState("directBudget", DEFAULTS.directBudget);
  const [directCpl, setDirectCpl] = usePersistentState("directCpl", DEFAULTS.directCpl);
  const [directConvPct, setDirectConvPct] = usePersistentState("directConvPct", DEFAULTS.directConvPct);
  const [directRevenuePerPatient, setDirectRevenuePerPatient] = usePersistentState(
    "directRevenuePerPatient",
    DEFAULTS.directRevenuePerPatient
  );

  const opening = useMemo(() => {
    const [y, m, d] = openingDateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [openingDateStr]);

  const series = useMemo(
    () => buildSeries(opening, currentSubs, organicPerDay, dailyBudget, cpa),
    [opening, currentSubs, organicPerDay, dailyBudget, cpa]
  );

  const finals = series[series.length - 1] || { sep: currentSubs, oct: currentSubs, nov: currentSubs };

  const scenarioRows = SCENARIOS.map((s) => {
    const runwayDays = Math.max(0, daysBetween(s.start > TODAY ? s.start : TODAY, opening));
    const paidRate = dailyBudget > 0 && cpa > 0 ? dailyBudget / cpa : 0;
    const netPaidSubs = Math.round(paidRate * runwayDays);
    const spend = dailyBudget * runwayDays;
    const finalSubs = finals[s.key];
    const conversions = finalSubs * (conversionPct / 100);
    const revenue = conversions * revenuePerConversion;
    return { ...s, runwayDays, netPaidSubs, spend, finalSubs, conversions, revenue };
  });

  const best = scenarioRows[0];
  const worst = scenarioRows[scenarioRows.length - 1];
  const subGap = best.finalSubs - worst.finalSubs;
  const revGap = best.revenue - worst.revenue;

  const barData = scenarioRows.map((s) => ({ name: s.short, revenue: Math.round(s.revenue), color: s.color }));

  // Direct-to-clinic comparison: what would it cost to win the same patients
  // through direct-to-clinic ads instead of through the newsletter funnel?
  const costPerPatientDirect =
    directConvPct > 0 ? directCpl / (directConvPct / 100) : 0;

  const comparisonRows = scenarioRows.map((s) => {
    const newsletterCAC = s.conversions > 0 ? s.spend / s.conversions : 0;
    const directSpendSameWindow = directBudget * s.runwayDays;
    const directLeadsSameWindow = directCpl > 0 ? directSpendSameWindow / directCpl : 0;
    const directPatientsSameWindow = directLeadsSameWindow * (directConvPct / 100);
    const costToMatchViaDirect = costPerPatientDirect * s.conversions;
    const savings = costToMatchViaDirect - s.spend;
    return {
      ...s,
      newsletterCAC,
      directPatientsSameWindow,
      costToMatchViaDirect,
      savings,
    };
  });

  const headline = comparisonRows[0]; // Sept / earliest-start scenario
  const totalSavingsAcrossScenarios = comparisonRows.reduce((sum, r) => sum + r.savings, 0);

  const cacBarData = comparisonRows.map((s) => ({
    name: s.short,
    newsletterCAC: Math.round(s.newsletterCAC),
    directCAC: Math.round(costPerPatientDirect),
    color: s.color,
  }));

  const reset = () => {
    setCurrentSubs(DEFAULTS.currentSubs);
    setOrganicPerDay(DEFAULTS.organicPerDay);
    setDailyBudget(DEFAULTS.dailyBudget);
    setCpa(DEFAULTS.cpa);
    setOpeningDateStr(DEFAULTS.openingDate);
    setConversionPct(DEFAULTS.conversionPct);
    setRevenuePerConversion(DEFAULTS.revenuePerConversion);
    setDirectBudget(DEFAULTS.directBudget);
    setDirectCpl(DEFAULTS.directCpl);
    setDirectConvPct(DEFAULTS.directConvPct);
    setDirectRevenuePerPatient(DEFAULTS.directRevenuePerPatient);
  };

  return (
    <div className="wrap">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

        .wrap {
          --paper: #F6F5F1;
          --surface: #FFFFFF;
          --ink: #1B2430;
          --muted: #6B7280;
          --line: #E4E1D8;
          --teal: #2F6F6B;
          --teal-tint: #E4EEEC;
          --amber: #C98A2C;
          --coral: #C1462F;
          --coral-tint: #F6E6E0;
          font-family: 'IBM Plex Sans', -apple-system, sans-serif;
          background: var(--paper);
          color: var(--ink);
          padding: 28px 24px 40px;
          max-width: 1040px;
          margin: 0 auto;
          box-sizing: border-box;
          min-height: 100vh;
        }
        .wrap * { box-sizing: border-box; }
        .mono { font-family: 'IBM Plex Mono', monospace; }

        .header { margin-bottom: 28px; border-bottom: 1px solid var(--line); padding-bottom: 20px; }
        .eyebrow {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--teal);
          margin-bottom: 10px;
        }
        .h1 {
          font-family: 'Fraunces', serif;
          font-weight: 500;
          font-size: 30px;
          line-height: 1.15;
          margin: 0 0 8px;
        }
        .sub { color: var(--muted); font-size: 14.5px; max-width: 640px; line-height: 1.5; margin: 0; }
        .reset-btn {
          display: inline-flex; align-items: center; gap: 6px;
          margin-top: 14px; background: transparent; border: 1px solid var(--line);
          color: var(--muted); font-size: 12.5px; padding: 6px 12px; border-radius: 20px;
          cursor: pointer; font-family: 'IBM Plex Sans', sans-serif;
        }
        .reset-btn:hover { border-color: var(--teal); color: var(--teal); }

        .panel {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 4px;
          padding: 24px;
          margin-bottom: 24px;
        }
        .panel-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 18px; flex-wrap: wrap; gap: 8px; }
        .panel-title { font-family: 'Fraunces', serif; font-size: 19px; font-weight: 500; margin: 0; display:flex; align-items:center; gap:8px;}
        .panel-title svg { color: var(--teal); }
        .panel-note { font-size: 12.5px; color: var(--muted); }

        .controls-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 20px 24px;
          margin-bottom: 22px;
        }
        .field-top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
        .field-label { font-size: 12.5px; color: var(--muted); }
        .field-value { font-family: 'IBM Plex Mono', monospace; font-size: 13.5px; font-weight: 600; }
        .field-unit { font-size: 11px; color: var(--muted); margin-left: 2px; font-weight: 400; }
        input[type=range] {
          width: 100%; accent-color: var(--teal); height: 4px; cursor: pointer;
        }
        input[type=date] {
          width: 100%; border: 1px solid var(--line); border-radius: 3px; padding: 7px 8px;
          font-family: 'IBM Plex Mono', monospace; font-size: 13px; color: var(--ink); background: var(--paper);
        }

        .chart-block { width: 100%; height: 300px; margin-bottom: 6px; }
        .legend-row { display: flex; gap: 18px; justify-content: center; margin-top: 4px; flex-wrap: wrap; }
        .legend-item { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--muted); }
        .legend-dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }

        .callout {
          margin-top: 20px; padding: 16px 18px; border-radius: 3px;
          background: var(--teal-tint); border-left: 3px solid var(--teal);
          display: flex; gap: 14px; align-items: flex-start;
        }
        .callout svg { flex-shrink: 0; color: var(--teal); margin-top: 2px; }
        .callout-text { font-size: 14px; line-height: 1.55; }
        .callout-text b { font-family: 'IBM Plex Mono', monospace; font-weight: 600; }

        table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 13px; }
        th, td { text-align: right; padding: 9px 10px; border-bottom: 1px solid var(--line); }
        th:first-child, td:first-child { text-align: left; }
        th { font-weight: 500; color: var(--muted); font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.04em; }
        td { font-family: 'IBM Plex Mono', monospace; }
        td:first-child { font-family: 'IBM Plex Sans', sans-serif; }
        tr.scenario-row td:first-child { display: flex; align-items: center; gap: 8px; font-family:'IBM Plex Sans', sans-serif; }
        .swatch { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }

        .tooltip {
          background: var(--ink); color: #fff; padding: 10px 12px; border-radius: 4px;
          font-size: 12.5px; box-shadow: 0 4px 14px rgba(0,0,0,0.18);
        }
        .tooltip-date { font-family: 'IBM Plex Mono', monospace; margin-bottom: 6px; opacity: 0.7; }
        .tooltip-row { display: flex; align-items: center; gap: 6px; padding: 2px 0; }
        .tooltip-row .dot { width: 7px; height: 7px; border-radius: 50%; }
        .tooltip-name { flex: 1; }
        .tooltip-val { font-family: 'IBM Plex Mono', monospace; font-weight: 600; }

        .footer-note { font-size: 12px; color: var(--muted); line-height: 1.6; margin-top: 4px; }
        .persist-note { font-size: 11.5px; color: var(--muted); margin-top: 10px; }

        @media (max-width: 560px) {
          .h1 { font-size: 24px; }
          .panel { padding: 18px 16px; }
        }
      `}</style>

      <div className="header">
        <div className="eyebrow">Newsletter → Clinic Growth Model</div>
        <h1 className="h1">Benefits of starting early</h1>
        <p className="sub">
          Every month we start paid growth earlier is a month of compounding we get to keep before the
          first clinic opens. Adjust the assumptions below to see how audience size and projected revenue
          grow depending on when we start — and build the case for starting early.
        </p>
        <button className="reset-btn" onClick={reset}>
          <RotateCcw size={12} /> Reset to defaults
        </button>
        <p className="persist-note">
          Your inputs are saved in this browser, so they'll still be here next time you open this page.
        </p>
      </div>

      {/* ---------------- GROWTH SECTION ---------------- */}
      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title"><TrendingUp size={17} /> Audience growth by start date</h2>
          <span className="panel-note">Opening day: <b className="mono">{fmtDate(opening)}, {opening.getFullYear()}</b></span>
        </div>

        <div className="controls-grid">
          <Field label="Current subscribers" value={currentSubs} min={0} max={5000} step={10}
            onChange={setCurrentSubs} format={fmtInt} />
          <Field label="Organic growth" unit="/day" value={organicPerDay} min={0} max={30} step={1}
            onChange={setOrganicPerDay} />
          <Field label="Daily growth budget" unit="/day" value={dailyBudget} min={0} max={1000} step={10}
            onChange={setDailyBudget} format={fmtUSD} />
          <Field label="Cost per acquisition" unit="/sub" value={cpa} min={1} max={100} step={1}
            onChange={setCpa} format={fmtUSD} />
          <div className="field">
            <div className="field-top">
              <span className="field-label">Clinic opening date</span>
            </div>
            <input type="date" value={openingDateStr} min="2026-12-01" max="2027-04-01"
              onChange={(e) => setOpeningDateStr(e.target.value)} />
          </div>
        </div>

        <div className="chart-block">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="#E4E1D8" vertical={false} />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: "#6B7280" }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} width={54} />
              <Tooltip content={<CustomTooltip formatter={fmtInt} />} />
              {SCENARIOS.map((s) => (
                <Line key={s.key} type="monotone" dataKey={s.key} name={s.label}
                  stroke={s.color} strokeWidth={2.25} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="legend-row">
          {SCENARIOS.map((s) => (
            <span key={s.key} className="legend-item">
              <span className="legend-dot" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>

        <table>
          <thead>
            <tr>
              <th>Scenario</th>
              <th>Days of runway</th>
              <th>Paid subscribers added</th>
              <th>Total spend</th>
              <th>Audience at opening</th>
            </tr>
          </thead>
          <tbody>
            {scenarioRows.map((s) => (
              <tr className="scenario-row" key={s.key}>
                <td><span className="swatch" style={{ background: s.color }} />{s.label}</td>
                <td>{s.runwayDays}</td>
                <td>+{fmtInt(s.netPaidSubs)}</td>
                <td>{fmtUSD(s.spend)}</td>
                <td>{fmtInt(s.finalSubs)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="callout">
          <Clock size={18} />
          <div className="callout-text">
            Starting in September instead of November wins us <b>{fmtInt(subGap)} more subscribers</b> by
            opening day — {fmtInt(best.runwayDays - worst.runwayDays)} extra days of compounding growth
            we only get by starting early.
          </div>
        </div>
      </div>

      {/* ---------------- REVENUE SECTION ---------------- */}
      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title"><DollarSign size={17} /> What that audience is worth</h2>
          <span className="panel-note">Revenue projected at opening day</span>
        </div>

        <div className="controls-grid">
          <Field label="Newsletter → patient conversion" unit="%" value={conversionPct} min={0.1} max={10} step={0.1}
            onChange={setConversionPct} format={(v) => v.toFixed(1)} />
          <Field label="Avg. revenue per conversion" unit="/yr" value={revenuePerConversion} min={500} max={20000} step={250}
            onChange={setRevenuePerConversion} format={fmtUSD} />
        </div>

        <div className="chart-block" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="#E4E1D8" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6B7280" }} />
              <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} width={64} tickFormatter={(v) => fmtUSD(v)} />
              <Tooltip content={<CustomTooltip formatter={fmtUSD} />} />
              <Bar dataKey="revenue" name="Projected revenue" radius={[3, 3, 0, 0]}>
                {barData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <table>
          <thead>
            <tr>
              <th>Scenario</th>
              <th>Audience at opening</th>
              <th>Est. conversions</th>
              <th>Projected revenue</th>
            </tr>
          </thead>
          <tbody>
            {scenarioRows.map((s) => (
              <tr className="scenario-row" key={s.key}>
                <td><span className="swatch" style={{ background: s.color }} />{s.label}</td>
                <td>{fmtInt(s.finalSubs)}</td>
                <td>{s.conversions.toFixed(1)}</td>
                <td>{fmtUSD(s.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="callout">
          <DollarSign size={18} />
          <div className="callout-text">
            At these assumptions, starting in September instead of November gains us
            <b> {fmtUSD(revGap)}</b> in projected first-year revenue — for only
            {" "}{fmtUSD((best.spend - worst.spend))} more in total spend. Starting early is a small extra
            cost for a much bigger head start.
          </div>
        </div>

        <p className="footer-note">
          Model assumptions: organic growth and daily paid growth (budget ÷ CPA) are held constant once
          paid acquisition starts for a scenario; conversion is applied to total audience size at opening,
          not just newly acquired subscribers. Treat outputs as directional, not a financial forecast —
          adjust CPA, conversion rate, and revenue per conversion as real data comes in.
        </p>
      </div>

      {/* ---------------- DIRECT-TO-CLINIC COMPARISON ---------------- */}
      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title"><PiggyBank size={17} /> The savings of getting there first</h2>
          <span className="panel-note">Newsletter funnel vs. paid ads straight to the clinic</span>
        </div>
        <p className="panel-note" style={{ marginBottom: 18, fontSize: 13, lineHeight: 1.5 }}>
          TenMore is also planning to run ads directly to the clinic. Those ads compete for a much
          narrower, higher-intent audience, so they cost more per lead and per patient. Every patient the
          newsletter converts is one TenMore doesn't have to pay direct-to-clinic prices to acquire.
        </p>

        <div className="controls-grid">
          <Field label="Direct-to-clinic ad budget" unit="/day" value={directBudget} min={0} max={1000} step={10}
            onChange={setDirectBudget} format={fmtUSD} />
          <Field label="Cost per lead" unit="/lead" value={directCpl} min={1} max={300} step={1}
            onChange={setDirectCpl} format={fmtUSD} />
          <Field label="Lead → patient conversion" unit="%" value={directConvPct} min={0.1} max={20} step={0.1}
            onChange={setDirectConvPct} format={(v) => v.toFixed(1)} />
          <Field label="Revenue per patient" unit="/yr" value={directRevenuePerPatient} min={500} max={20000} step={250}
            onChange={setDirectRevenuePerPatient} format={fmtUSD} />
        </div>

        <div className="chart-block" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cacBarData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="#E4E1D8" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6B7280" }} />
              <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} width={64} tickFormatter={(v) => fmtUSD(v)} />
              <Tooltip content={<CustomTooltip formatter={fmtUSD} />} />
              <Legend wrapperStyle={{ fontSize: 12.5 }} />
              <Bar dataKey="newsletterCAC" name="Cost per patient — newsletter" fill="#2F6F6B" radius={[3, 3, 0, 0]} />
              <Bar dataKey="directCAC" name="Cost per patient — direct-to-clinic" fill="#C1462F" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <table>
          <thead>
            <tr>
              <th>Scenario</th>
              <th>Patients via newsletter</th>
              <th>Newsletter spend</th>
              <th>Cost to match via direct ads</th>
              <th>Newsletter savings</th>
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map((s) => (
              <tr className="scenario-row" key={s.key}>
                <td><span className="swatch" style={{ background: s.color }} />{s.label}</td>
                <td>{s.conversions.toFixed(1)}</td>
                <td>{fmtUSD(s.spend)}</td>
                <td>{fmtUSD(s.costToMatchViaDirect)}</td>
                <td>{fmtUSD(s.savings)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="callout" style={{ background: "#E4EEEC", borderLeftColor: "#2F6F6B" }}>
          <PiggyBank size={18} color="#2F6F6B" />
          <div className="callout-text">
            Starting in September, the newsletter is projected to bring in <b>{fmtUSD(headline.revenue)}</b> in
            first-year patient revenue while costing <b>{fmtUSD(costPerPatientDirect)}</b> less per patient
            than acquiring the same person through direct-to-clinic ads — a savings of roughly
            {" "}<b>{fmtUSD(headline.savings)}</b> for that scenario alone. Across all three start dates, the
            newsletter is projected to save on the order of <b>{fmtUSD(totalSavingsAcrossScenarios)}</b> in
            acquisition costs TenMore won't have to spend on paid clinic ads.
          </div>
        </div>

        <p className="footer-note">
          "Cost to match via direct ads" is the estimated spend needed to acquire the same number of
          patients using the direct-to-clinic cost-per-lead and conversion rate above. It isn't money
          TenMore is spending twice — it's the counterfactual cost avoided because the newsletter got there
          first. Newsletter cost-per-patient is blended across paid and organic growth, so it's a
          conservative (lower) estimate of the true gap.
        </p>
      </div>
    </div>
  );
}
