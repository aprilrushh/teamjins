import { useState, useEffect, useMemo, useRef } from "react";
import {
  Trophy, Users, ClipboardList, Shield, Plus, Trash2, Shuffle, Check,
  ChevronRight, ChevronLeft, Crown, Circle, Lock, Unlock, X, UserPlus,
  Clock, Send, Inbox, Swords, Handshake
} from "lucide-react";
import { supabase } from "./supabaseClient";

/* ------------------------------------------------------------------ */
/*  Supabase storage (table: league, single row id='current')        */
/* ------------------------------------------------------------------ */
const ROW_ID = "current";

async function loadSeason() {
  const { data, error } = await supabase
    .from("league").select("data").eq("id", ROW_ID).maybeSingle();
  if (error) { console.error("load error", error); return null; }
  return data?.data ?? null;
}
async function saveSeason(d) {
  const { error } = await supabase
    .from("league")
    .upsert({ id: ROW_ID, data: d, updated_at: new Date().toISOString() });
  if (error) console.error("save error", error);
}

/* ------------------------------- utils ---------------------------- */
const uid = () => Math.random().toString(36).slice(2, 9);
const DAYS = ["월", "화", "수", "목", "금", "토", "일"];

const newSeason = () => ({
  club: "서종테니스회 팀진스",
  title: "2026년 6월 리그",
  phase: "registration", // registration -> pairing -> playing -> finished
  teams: [],      // {id, name, p1, p2, slots:[{id,day,time}]}
  waiting: [],    // {id, name}  ("운영진이 팀 정해준대로 따를께요")
  challenges: [], // {id, challenger, opponent, day, time, status, scoreA, scoreB}
  adminPin: null,
  createdAt: Date.now(),
});

const PHASES = [
  { key: "registration", label: "참가신청", icon: UserPlus },
  { key: "pairing", label: "짝 배정", icon: Shuffle },
  { key: "playing", label: "리그 진행", icon: Swords },
  { key: "finished", label: "결과", icon: Trophy },
];
const phaseIndex = (p) => PHASES.findIndex((x) => x.key === p);

/* ----------------------------- styles ----------------------------- */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&display=swap');
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css');

.tc * { box-sizing:border-box; }
.tc {
  --bg:#f1ede1; --paper:#fbf9f2; --ink:#15271e; --muted:#6c7c71;
  --court:#1d4e3a; --court-deep:#123528; --line:#e6e0cf;
  --ball:#d7f23a; --ball-deep:#b9d61f; --clay:#c2603a;
  font-family:'Bricolage Grotesque','Pretendard',sans-serif;
  color:var(--ink); background:var(--bg); min-height:100vh; width:100%;
  -webkit-font-smoothing:antialiased;
}
.tc-wrap { max-width:940px; margin:0 auto; padding:18px 16px 80px; }

.tc-head { background:var(--court); color:#fff; border-radius:20px; padding:22px 22px 18px;
  position:relative; overflow:hidden; box-shadow:0 14px 30px -16px rgba(18,53,40,.6); }
.tc-head::after{ content:""; position:absolute; inset:0;
  background-image:linear-gradient(rgba(255,255,255,.10) 1px,transparent 1px),
                   linear-gradient(90deg,rgba(255,255,255,.10) 1px,transparent 1px);
  background-size:34px 34px; opacity:.35; pointer-events:none; }
.tc-head .row{ position:relative; z-index:1; display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
.tc-club{ font-weight:800; font-size:25px; letter-spacing:-.5px; line-height:1.08; }
.tc-season{ color:var(--ball); font-weight:800; font-size:15px; margin-top:5px; letter-spacing:.2px; }
.tc-sub{ color:rgba(255,255,255,.78); font-weight:600; font-size:12.5px; margin-top:3px; }

.tc-steps{ position:relative; z-index:1; display:flex; gap:6px; margin-top:18px; flex-wrap:wrap; }
.tc-step{ flex:1; min-width:80px; display:flex; align-items:center; gap:7px;
  background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.14);
  padding:8px 10px; border-radius:11px; font-size:12px; font-weight:600; color:rgba(255,255,255,.65); }
.tc-step.on{ background:var(--ball); color:var(--court-deep); border-color:var(--ball); }
.tc-step.done{ color:#fff; background:rgba(215,242,58,.18); border-color:rgba(215,242,58,.3); }

.tc-admin-btn{ display:inline-flex; align-items:center; gap:6px; cursor:pointer;
  background:rgba(255,255,255,.12); color:#fff; border:1px solid rgba(255,255,255,.2);
  padding:8px 12px; border-radius:999px; font-size:12px; font-weight:700; font-family:inherit; }
.tc-admin-btn.active{ background:var(--ball); color:var(--court-deep); border-color:var(--ball); }

.tc-tabs{ display:flex; gap:6px; margin:16px 0; overflow-x:auto; padding-bottom:4px; }
.tc-tab{ flex:none; display:inline-flex; align-items:center; gap:6px; cursor:pointer;
  background:var(--paper); border:1px solid var(--line); color:var(--muted);
  padding:9px 14px; border-radius:11px; font-size:13px; font-weight:700; font-family:inherit; white-space:nowrap; }
.tc-tab.on{ background:var(--court); color:#fff; border-color:var(--court); }

.tc-card{ background:var(--paper); border:1px solid var(--line); border-radius:16px; padding:18px; margin-bottom:14px; }
.tc-card h3{ margin:0 0 4px; font-size:17px; font-weight:800; letter-spacing:-.3px; display:flex; align-items:center; gap:7px; }
.tc-note{ color:var(--muted); font-size:13px; line-height:1.55; margin:0; }

.tc-btn{ display:inline-flex; align-items:center; justify-content:center; gap:7px; cursor:pointer;
  background:var(--court); color:#fff; border:none; border-radius:11px;
  padding:11px 16px; font-size:14px; font-weight:700; font-family:inherit; }
.tc-btn:hover{ filter:brightness(1.08); }
.tc-btn.ball{ background:var(--ball); color:var(--court-deep); }
.tc-btn.ghost{ background:transparent; color:var(--court); border:1px solid var(--court); }
.tc-btn.clay{ background:var(--clay); }
.tc-btn.sm{ padding:8px 12px; font-size:12.5px; border-radius:9px; }
.tc-btn:disabled{ opacity:.4; cursor:not-allowed; }

.tc-input{ font-family:inherit; font-size:14px; padding:11px 13px; border-radius:11px;
  border:1px solid var(--line); background:#fff; color:var(--ink); width:100%; }
.tc-input:focus{ outline:2px solid var(--ball-deep); border-color:transparent; }
.tc-select{ font-family:inherit; font-size:14px; padding:10px 12px; border-radius:11px;
  border:1px solid var(--line); background:#fff; color:var(--ink); }

.tc-chip{ display:inline-flex; align-items:center; gap:6px; background:#fff; border:1px solid var(--line);
  border-radius:999px; padding:7px 12px; font-size:13px; font-weight:600; }
.tc-chip.sel{ background:var(--ball); border-color:var(--ball-deep); }
.tc-chip.pick{ cursor:pointer; }
.tc-x{ cursor:pointer; color:var(--clay); display:inline-flex; }
.tc-empty{ text-align:center; color:var(--muted); padding:26px 10px; font-size:13.5px; }

.tc-seg{ display:flex; gap:6px; background:#fff; border:1px solid var(--line); border-radius:12px; padding:4px; margin-bottom:14px; }
.tc-seg button{ flex:1; border:none; background:transparent; padding:9px 10px; border-radius:9px;
  font-family:inherit; font-weight:700; font-size:13px; color:var(--muted); cursor:pointer; }
.tc-seg button.on{ background:var(--court); color:#fff; }

.tc-tablewrap{ overflow-x:auto; }
table.tc-tbl{ width:100%; border-collapse:collapse; font-size:13.5px; min-width:460px; }
.tc-tbl th{ text-align:center; color:var(--muted); font-weight:700; font-size:11.5px; padding:8px 6px;
  border-bottom:2px solid var(--line); text-transform:uppercase; letter-spacing:.4px; }
.tc-tbl td{ text-align:center; padding:11px 6px; border-bottom:1px solid var(--line); }
.tc-tbl td.name{ text-align:left; font-weight:700; }
.tc-tbl tr.top td{ background:rgba(215,242,58,.16); }
.tc-rank{ display:inline-flex; width:24px; height:24px; align-items:center; justify-content:center;
  border-radius:7px; background:var(--court); color:#fff; font-weight:800; font-size:12px; }
.tc-rank.g1{ background:var(--ball); color:var(--court-deep); }

.tc-match{ display:flex; align-items:center; gap:10px; padding:12px; border:1px solid var(--line);
  border-radius:13px; background:#fff; margin-bottom:9px; flex-wrap:wrap; }
.tc-tm{ flex:1; min-width:110px; font-weight:700; font-size:13.5px; }
.tc-vs{ color:var(--muted); font-weight:800; font-size:12px; }
.tc-score-in{ width:52px; text-align:center; padding:8px 4px; border-radius:9px; border:1px solid var(--line);
  font-family:inherit; font-size:15px; font-weight:800; }
.tc-win{ color:var(--court); }

.tc-status{ font-size:11px; font-weight:800; padding:3px 9px; border-radius:999px; white-space:nowrap; }
.tc-status.pending{ background:#f6e7c9; color:#8a5a12; }
.tc-status.accepted{ background:var(--ball); color:var(--court-deep); }
.tc-status.done{ background:var(--court); color:#fff; }
.tc-status.declined{ background:#eedcd6; color:var(--clay); }
.tc-slotchip{ display:inline-flex; align-items:center; gap:6px; background:#fff; border:1px solid var(--line);
  border-radius:9px; padding:6px 11px; font-size:12.5px; font-weight:700; }
.tc-slotchip.pick{ cursor:pointer; } .tc-slotchip.pick:hover{ border-color:var(--ball-deep); background:#fbfcef; }

.tc-champ{ background:linear-gradient(160deg,var(--court),var(--court-deep)); color:#fff;
  border-radius:20px; padding:30px 22px; text-align:center; position:relative; overflow:hidden; }
.tc-champ::after{ content:""; position:absolute; inset:0;
  background:radial-gradient(circle at 50% -20%, rgba(215,242,58,.4), transparent 60%); }
.tc-champ .inner{ position:relative; z-index:1; }
.tc-flash{ display:inline-flex; align-items:center; gap:7px; background:var(--ball); color:var(--court-deep);
  font-weight:800; font-size:12px; padding:6px 13px; border-radius:999px; margin-bottom:14px; letter-spacing:.4px; }

.tc-modal-bg{ position:fixed; inset:0; background:rgba(18,53,40,.55); display:flex; align-items:center; justify-content:center; padding:20px; z-index:50; }
.tc-modal{ background:var(--paper); border-radius:18px; padding:24px; width:100%; max-width:380px; }

.tc-flex{ display:flex; gap:9px; flex-wrap:wrap; }
.tc-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(155px,1fr)); gap:10px; }
.tc-sec-label{ font-size:11.5px; font-weight:800; color:var(--muted); text-transform:uppercase; letter-spacing:.5px; margin:0 0 9px; display:flex; align-items:center; gap:6px; }
@media(max-width:560px){ .tc-club{ font-size:21px; } }
`;

/* ============================================================== */
export default function TennisClubApp() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("dash");
  const [isAdmin, setIsAdmin] = useState(false);
  const [modal, setModal] = useState(null);
  const [pinInput, setPinInput] = useState("");
  const [pinErr, setPinErr] = useState("");
  const [myTeamId, setMyTeamId] = useState("");
  const [signupMode, setSignupMode] = useState("pair");
  const lastWrite = useRef("");

  /* ---- load + realtime sync ---- */
  useEffect(() => {
    let mounted = true;
    (async () => {
      let s = await loadSeason();
      if (!s) { s = newSeason(); await saveSeason(s); }
      if (mounted) { setData(s); setLoading(false); }
    })();

    const channel = supabase
      .channel("league-changes")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "league", filter: `id=eq.${ROW_ID}` },
        (payload) => {
          const incoming = payload.new?.data;
          if (!incoming) return;
          if (JSON.stringify(incoming) === lastWrite.current) return; // 내 변경 echo 무시
          setData(incoming);
        })
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(channel); };
  }, []);

  const update = (fn) =>
    setData((prev) => {
      const next = fn(structuredClone(prev));
      lastWrite.current = JSON.stringify(next);
      saveSeason(next);
      return next;
    });

  /* ---- standings (조기 반환보다 앞 → 훅 순서 고정) ---- */
  const standings = useMemo(() => {
    if (!data) return [];
    const rows = data.teams.map((t) => {
      let w = 0, l = 0, d = 0, pf = 0, pa = 0, played = 0;
      data.challenges.forEach((c) => {
        if (c.status !== "done") return;
        if (c.challenger !== t.id && c.opponent !== t.id) return;
        const mine = c.challenger === t.id;
        const my = mine ? c.scoreA : c.scoreB;
        const opp = mine ? c.scoreB : c.scoreA;
        pf += my; pa += opp; played++;
        if (my > opp) w++; else if (my < opp) l++; else d++;
      });
      return { ...t, w, l, d, pf, pa, played, diff: pf - pa };
    });
    rows.sort((x, y) => y.w - x.w || y.diff - x.diff || y.pf - x.pf);
    return rows;
  }, [data]);

  if (loading)
    return (<div className="tc"><style>{CSS}</style><div className="tc-wrap"><div className="tc-empty">불러오는 중…</div></div></div>);

  const ph = data.phase;
  const teamById = (id) => data.teams.find((t) => t.id === id);
  const teamLabel = (id) => teamById(id)?.name || "?";
  const champion = ph === "finished" && standings[0]?.played > 0 ? standings[0] : null;

  /* ---- admin ---- */
  const requestAdmin = () => {
    if (isAdmin) { setIsAdmin(false); return; }
    setModal(data.adminPin ? "enterpin" : "setpin"); setPinInput(""); setPinErr("");
  };
  const confirmSetPin = () => {
    if (pinInput.length < 4) { setPinErr("4자리 이상 입력하세요."); return; }
    update((d) => { d.adminPin = pinInput; return d; }); setIsAdmin(true); setModal(null);
  };
  const confirmEnterPin = () => {
    if (pinInput === data.adminPin) { setIsAdmin(true); setModal(null); }
    else setPinErr("PIN이 일치하지 않습니다.");
  };
  const goPhase = (dir) => {
    const i = phaseIndex(ph) + dir;
    if (i < 0 || i >= PHASES.length) return;
    update((d) => { d.phase = PHASES[i].key; return d; });
  };

  /* ---- registration ---- */
  const addPairTeam = (n1, n2) => {
    const a = n1.trim(), b = n2.trim();
    if (!a || !b) return false;
    update((d) => { d.teams.push({ id: uid(), p1: a, p2: b, name: `${a} · ${b}`, slots: [] }); return d; });
    return true;
  };
  const addSolo = (name) => {
    const n = name.trim();
    if (!n) return false;
    update((d) => { d.waiting.push({ id: uid(), name: n }); return d; });
    return true;
  };
  const removeTeam = (id) =>
    update((d) => {
      d.teams = d.teams.filter((t) => t.id !== id);
      d.challenges = d.challenges.filter((c) => c.challenger !== id && c.opponent !== id);
      return d;
    });
  const removeWaiting = (id) => update((d) => { d.waiting = d.waiting.filter((w) => w.id !== id); return d; });
  const renameTeam = (id, name) => update((d) => { const t = d.teams.find((x) => x.id === id); if (t) t.name = name; return d; });

  /* ---- pairing waiting pool ---- */
  const pairWaiting = (id1, id2) =>
    update((d) => {
      const a = d.waiting.find((w) => w.id === id1), b = d.waiting.find((w) => w.id === id2);
      if (!a || !b) return d;
      d.teams.push({ id: uid(), p1: a.name, p2: b.name, name: `${a.name} · ${b.name}`, slots: [] });
      d.waiting = d.waiting.filter((w) => w.id !== id1 && w.id !== id2);
      return d;
    });
  const autoPairWaiting = () =>
    update((d) => {
      const pool = [...d.waiting];
      for (let i = pool.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [pool[i], pool[j]] = [pool[j], pool[i]]; }
      while (pool.length >= 2) {
        const a = pool.shift(), b = pool.shift();
        d.teams.push({ id: uid(), p1: a.name, p2: b.name, name: `${a.name} · ${b.name}`, slots: [] });
      }
      d.waiting = pool;
      return d;
    });

  /* ---- availability slots ---- */
  const addSlot = (teamId, day, time) =>
    update((d) => { const t = d.teams.find((x) => x.id === teamId); if (t) t.slots.push({ id: uid(), day, time: time.trim() }); return d; });
  const removeSlot = (teamId, slotId) =>
    update((d) => { const t = d.teams.find((x) => x.id === teamId); if (t) t.slots = t.slots.filter((s) => s.id !== slotId); return d; });

  /* ---- challenges ---- */
  const activeBetween = (a, b) =>
    data.challenges.some((c) => (c.status === "pending" || c.status === "accepted") &&
      ((c.challenger === a && c.opponent === b) || (c.challenger === b && c.opponent === a)));
  const sendChallenge = (challenger, opponent, day, time) =>
    update((d) => { d.challenges.push({ id: uid(), challenger, opponent, day, time: time.trim(), status: "pending", scoreA: "", scoreB: "" }); return d; });
  const respondChallenge = (id, accept) =>
    update((d) => { const c = d.challenges.find((x) => x.id === id); if (c) c.status = accept ? "accepted" : "declined"; return d; });
  const cancelChallenge = (id) => update((d) => { d.challenges = d.challenges.filter((c) => c.id !== id); return d; });
  const setChScore = (id, field, val) =>
    update((d) => { const c = d.challenges.find((x) => x.id === id); if (c) c[field] = val; return d; });
  const finalizeScore = (id) =>
    update((d) => {
      const c = d.challenges.find((x) => x.id === id);
      if (c && c.scoreA !== "" && c.scoreB !== "") { c.scoreA = +c.scoreA; c.scoreB = +c.scoreB; c.status = "done"; }
      return d;
    });

  const otherTeams = data.teams.filter((t) => t.id !== myTeamId);
  const myTeam = teamById(myTeamId);
  const received = data.challenges.filter((c) => c.opponent === myTeamId && c.status === "pending");
  const sent = data.challenges.filter((c) => c.challenger === myTeamId && c.status === "pending");
  const upcoming = data.challenges.filter((c) => c.status === "accepted" && (c.challenger === myTeamId || c.opponent === myTeamId));
  const scoreList = data.challenges.filter((c) => c.status === "accepted" || c.status === "done");

  /* ============================ render ============================ */
  return (
    <div className="tc">
      <style>{CSS}</style>
      <div className="tc-wrap">

        <div className="tc-head">
          <div className="row">
            <div>
              <div className="tc-club">🎾 {data.club}</div>
              <div className="tc-season">{data.title}</div>
              <div className="tc-sub">{data.teams.length}팀 · 짝 대기 {data.waiting.length}명 · 완료 경기 {data.challenges.filter(c => c.status === "done").length}</div>
            </div>
            <button className={"tc-admin-btn" + (isAdmin ? " active" : "")} onClick={requestAdmin}>
              {isAdmin ? <Unlock size={14} /> : <Lock size={14} />}{isAdmin ? "운영진 ON" : "운영진"}
            </button>
          </div>
          <div className="tc-steps">
            {PHASES.map((p, i) => {
              const cur = phaseIndex(ph);
              const cls = i === cur ? " on" : i < cur ? " done" : "";
              const Ic = p.icon;
              return <div key={p.key} className={"tc-step" + cls}><Ic size={14} />{p.label}</div>;
            })}
          </div>
        </div>

        {isAdmin && (
          <div className="tc-card" style={{ borderColor: "var(--ball-deep)", background: "#fbfcef" }}>
            <p className="tc-sec-label"><Shield size={13} /> 운영진 단계 관리</p>
            <div className="tc-flex" style={{ alignItems: "center" }}>
              <button className="tc-btn ghost" disabled={phaseIndex(ph) === 0} onClick={() => goPhase(-1)}>
                <ChevronLeft size={16} /> 이전 단계
              </button>
              {ph === "registration" && <button className="tc-btn ball" onClick={() => goPhase(1)}>참가 마감 → 짝 배정 <ChevronRight size={16} /></button>}
              {ph === "pairing" && <button className="tc-btn ball" disabled={data.teams.length < 2} onClick={() => goPhase(1)}>짝 확정 → 리그 시작 <ChevronRight size={16} /></button>}
              {ph === "playing" && <button className="tc-btn ball" onClick={() => goPhase(1)}>리그 종료 → 우승팀 발표 <Trophy size={16} /></button>}
              {ph === "finished" && <button className="tc-btn clay" onClick={() => setModal("reset")}>새 시즌 시작</button>}
            </div>
          </div>
        )}

        <div className="tc-tabs">
          {[
            { k: "dash", l: "대시보드", I: Trophy },
            { k: "signup", l: "참가신청", I: Users },
            { k: "time", l: "가능시간", I: Clock },
            { k: "board", l: "도전게시판", I: Swords },
            { k: "results", l: "경기결과", I: ClipboardList },
          ].map(({ k, l, I }) => (
            <button key={k} className={"tc-tab" + (view === k ? " on" : "")} onClick={() => setView(k)}>
              <I size={15} />{l}
            </button>
          ))}
        </div>

        {view === "dash" && (
          <>
            {champion && (
              <div className="tc-champ" style={{ marginBottom: 14 }}>
                <div className="inner">
                  <div className="tc-flash"><Crown size={14} /> 우승팀</div>
                  <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-.5px" }}>{champion.name}</div>
                  <div style={{ marginTop: 8, color: "var(--ball)", fontWeight: 700, fontSize: 14 }}>
                    {champion.w}승 {champion.l}패 · 득실 {champion.diff > 0 ? "+" : ""}{champion.diff}
                  </div>
                </div>
              </div>
            )}
            <div className="tc-card">
              <h3><Trophy size={17} /> 순위표</h3>
              <p className="tc-note" style={{ marginBottom: 12 }}>승수 → 득실차 → 총득점 순으로 정렬됩니다. 완료된 경기만 반영돼요.</p>
              {data.teams.length === 0 ? (
                <div className="tc-empty">아직 팀이 없습니다. ‘참가신청’ 탭에서 신청해 주세요.</div>
              ) : (
                <div className="tc-tablewrap">
                  <table className="tc-tbl">
                    <thead><tr><th>순위</th><th>팀</th><th>경기</th><th>승</th><th>패</th><th>득점</th><th>실점</th><th>득실</th></tr></thead>
                    <tbody>
                      {standings.map((t, i) => (
                        <tr key={t.id} className={i === 0 && t.played > 0 ? "top" : ""}>
                          <td><span className={"tc-rank" + (i === 0 && t.played > 0 ? " g1" : "")}>{i + 1}</span></td>
                          <td className="name">{i === 0 && t.played > 0 && <Crown size={13} style={{ color: "var(--ball-deep)", marginRight: 4, verticalAlign: -2 }} />}{t.name}</td>
                          <td>{t.played}</td><td style={{ fontWeight: 800 }}>{t.w}</td><td>{t.l}</td>
                          <td>{t.pf}</td><td>{t.pa}</td>
                          <td style={{ fontWeight: 700 }}>{t.diff > 0 ? "+" : ""}{t.diff}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {view === "signup" && (
          <>
            {ph === "registration" ? (
              <div className="tc-card">
                <h3><UserPlus size={17} /> 참가신청</h3>
                <p className="tc-note" style={{ marginBottom: 14 }}>짝과 함께 두 사람 이름을 넣어 신청하거나, 아직 짝이 없으면 운영진 배정을 신청하세요.</p>
                <div className="tc-seg">
                  <button className={signupMode === "pair" ? "on" : ""} onClick={() => setSignupMode("pair")}>짝과 함께 신청</button>
                  <button className={signupMode === "solo" ? "on" : ""} onClick={() => setSignupMode("solo")}>운영진이 팀 정해준대로 따를께요</button>
                </div>
                {signupMode === "pair" ? <PairAdder onAdd={addPairTeam} /> : <SoloAdder onAdd={addSolo} />}
              </div>
            ) : (
              <div className="tc-card">
                <h3><UserPlus size={17} /> 참가신청</h3>
                <p className="tc-note">참가신청이 마감되었습니다.{isAdmin && " (운영진은 아래에서 추가 가능)"}</p>
                {isAdmin && (
                  <div style={{ marginTop: 14 }}>
                    <div className="tc-seg">
                      <button className={signupMode === "pair" ? "on" : ""} onClick={() => setSignupMode("pair")}>팀 추가</button>
                      <button className={signupMode === "solo" ? "on" : ""} onClick={() => setSignupMode("solo")}>대기자 추가</button>
                    </div>
                    {signupMode === "pair" ? <PairAdder onAdd={addPairTeam} /> : <SoloAdder onAdd={addSolo} />}
                  </div>
                )}
              </div>
            )}

            {isAdmin && ph === "pairing" && data.waiting.length > 0 && (
              <div className="tc-card" style={{ borderColor: "var(--ball-deep)", background: "#fbfcef" }}>
                <h3><Shuffle size={17} /> 대기자 짝 배정</h3>
                <p className="tc-note" style={{ marginBottom: 12 }}>‘운영진 배정’을 신청한 분들입니다. 두 명을 차례로 눌러 팀을 만들거나 자동 배정하세요.</p>
                <button className="tc-btn ball" onClick={autoPairWaiting} disabled={data.waiting.length < 2}>
                  <Shuffle size={16} /> 대기자 자동 랜덤 배정
                </button>
                <Pairer members={data.waiting} onPair={pairWaiting} />
              </div>
            )}

            <div className="tc-card">
              <h3><Handshake size={17} /> 팀 목록 ({data.teams.length})</h3>
              {data.teams.length === 0 ? (
                <div className="tc-empty">아직 등록된 팀이 없습니다.</div>
              ) : (
                <div className="tc-grid" style={{ marginTop: 4 }}>
                  {data.teams.map((t, i) => (
                    <div key={t.id} style={{ border: "1px solid var(--line)", borderRadius: 13, padding: 13, background: "#fff" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span className="tc-rank">{String.fromCharCode(65 + i)}</span>
                        {isAdmin && <span className="tc-x" onClick={() => removeTeam(t.id)}><Trash2 size={15} /></span>}
                      </div>
                      {isAdmin && (ph === "registration" || ph === "pairing") ? (
                        <input className="tc-input" style={{ fontSize: 13, padding: "8px 10px" }} value={t.name} onChange={(e) => renameTeam(t.id, e.target.value)} />
                      ) : (
                        <div style={{ fontWeight: 800, fontSize: 15 }}>{t.name}</div>
                      )}
                      <div style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 6 }}>{t.p1} &amp; {t.p2}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {data.waiting.length > 0 && (
              <div className="tc-card">
                <h3><Users size={17} /> 짝 대기 ({data.waiting.length})</h3>
                <p className="tc-note" style={{ marginBottom: 10 }}>운영진이 팀을 정해드릴 분들입니다.</p>
                <div className="tc-flex">
                  {data.waiting.map((w) => (
                    <span key={w.id} className="tc-chip">
                      {w.name}
                      {(ph === "registration" || isAdmin) && <span className="tc-x" onClick={() => removeWaiting(w.id)}><X size={14} /></span>}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {view === "time" && (
          <>
            <div className="tc-card">
              <h3><Clock size={17} /> 우리 팀 가능시간 등록</h3>
              <p className="tc-note" style={{ marginBottom: 12 }}>내 팀을 고르고, 경기 가능한 요일·시간을 올려 두면 다른 팀이 보고 도전합니다.</p>
              {data.teams.length === 0 ? (
                <div className="tc-empty">먼저 팀이 등록되어야 합니다.</div>
              ) : (
                <>
                  <select className="tc-select" style={{ width: "100%", marginBottom: 14 }} value={myTeamId} onChange={(e) => setMyTeamId(e.target.value)}>
                    <option value="">— 내 팀 선택 —</option>
                    {data.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  {myTeam ? (
                    <>
                      <SlotAdder onAdd={(day, time) => addSlot(myTeam.id, day, time)} />
                      <div className="tc-flex" style={{ marginTop: 12 }}>
                        {myTeam.slots.length === 0 && <div className="tc-empty" style={{ width: "100%" }}>아직 등록한 가능시간이 없습니다.</div>}
                        {myTeam.slots.map((s) => (
                          <span key={s.id} className="tc-slotchip">
                            {s.day}요일 {s.time}
                            <span className="tc-x" onClick={() => removeSlot(myTeam.id, s.id)}><X size={13} /></span>
                          </span>
                        ))}
                      </div>
                    </>
                  ) : <div className="tc-empty">위에서 내 팀을 선택하세요.</div>}
                </>
              )}
            </div>

            <div className="tc-card">
              <h3><Users size={17} /> 전체 팀 가능시간</h3>
              {data.teams.length === 0 ? (
                <div className="tc-empty">표시할 팀이 없습니다.</div>
              ) : (
                <div className="tc-grid">
                  {data.teams.map((t) => (
                    <div key={t.id} style={{ border: "1px solid var(--line)", borderRadius: 13, padding: 13, background: "#fff" }}>
                      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>{t.name}</div>
                      <div className="tc-flex">
                        {t.slots.length === 0 ? <span style={{ color: "var(--muted)", fontSize: 12.5 }}>미등록</span>
                          : t.slots.map((s) => <span key={s.id} className="tc-slotchip">{s.day} {s.time}</span>)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {view === "board" && (
          <>
            <div className="tc-card">
              <h3><Swords size={17} /> 도전게시판</h3>
              {ph !== "playing" && ph !== "finished" ? (
                <p className="tc-note">‘리그 진행’ 단계가 되면 도전신청이 열립니다.</p>
              ) : data.teams.length < 2 ? (
                <div className="tc-empty">팀이 2팀 이상이어야 합니다.</div>
              ) : (
                <>
                  <p className="tc-note" style={{ marginBottom: 12 }}>내 팀을 고른 뒤, 상대 팀의 가능시간을 보고 도전을 신청하세요. 상대가 수락하면 경기가 잡힙니다.</p>
                  <select className="tc-select" style={{ width: "100%" }} value={myTeamId} onChange={(e) => setMyTeamId(e.target.value)}>
                    <option value="">— 내 팀 선택 —</option>
                    {data.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </>
              )}
            </div>

            {(ph === "playing" || ph === "finished") && myTeam && (
              <>
                {received.length > 0 && (
                  <div className="tc-card" style={{ borderColor: "var(--ball-deep)" }}>
                    <h3><Inbox size={17} /> 받은 도전 ({received.length})</h3>
                    {received.map((c) => (
                      <div key={c.id} className="tc-match">
                        <span className="tc-tm">{teamLabel(c.challenger)} <span style={{ color: "var(--muted)", fontWeight: 600 }}>→ 우리 팀</span></span>
                        <span className="tc-slotchip">{c.day} {c.time}</span>
                        <div style={{ flexBasis: "100%", height: 0 }} />
                        <button className="tc-btn ball sm" onClick={() => respondChallenge(c.id, true)}><Check size={14} /> 수락</button>
                        <button className="tc-btn ghost sm" onClick={() => respondChallenge(c.id, false)}><X size={14} /> 거절</button>
                      </div>
                    ))}
                  </div>
                )}

                {upcoming.length > 0 && (
                  <div className="tc-card">
                    <h3><Handshake size={17} /> 예정 경기 ({upcoming.length})</h3>
                    {upcoming.map((c) => (
                      <div key={c.id} className="tc-match">
                        <span className="tc-tm" style={{ textAlign: "right" }}>{teamLabel(c.challenger)}</span>
                        <span className="tc-vs">VS</span>
                        <span className="tc-tm">{teamLabel(c.opponent)}</span>
                        <span className="tc-slotchip">{c.day} {c.time}</span>
                        <span className="tc-status accepted">수락됨 · 경기결과 탭에서 점수입력</span>
                      </div>
                    ))}
                  </div>
                )}

                {sent.length > 0 && (
                  <div className="tc-card">
                    <h3><Send size={17} /> 보낸 도전 ({sent.length})</h3>
                    {sent.map((c) => (
                      <div key={c.id} className="tc-match">
                        <span className="tc-tm"><span style={{ color: "var(--muted)", fontWeight: 600 }}>우리 팀 →</span> {teamLabel(c.opponent)}</span>
                        <span className="tc-slotchip">{c.day} {c.time}</span>
                        <span className="tc-status pending">응답 대기</span>
                        <button className="tc-btn ghost sm" onClick={() => cancelChallenge(c.id)}>취소</button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="tc-card">
                  <h3><Swords size={17} /> 도전할 팀</h3>
                  {otherTeams.length === 0 ? <div className="tc-empty">도전할 다른 팀이 없습니다.</div> : (
                    <div className="tc-grid">
                      {otherTeams.map((t) => {
                        const busy = activeBetween(myTeam.id, t.id);
                        return (
                          <div key={t.id} style={{ border: "1px solid var(--line)", borderRadius: 13, padding: 13, background: "#fff" }}>
                            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>{t.name}</div>
                            <div className="tc-flex" style={{ marginBottom: 10 }}>
                              {t.slots.length === 0 ? <span style={{ color: "var(--muted)", fontSize: 12 }}>가능시간 미등록</span>
                                : t.slots.map((s) => (
                                  <span key={s.id} className={"tc-slotchip" + (busy ? "" : " pick")}
                                    onClick={() => !busy && setModal({ type: "challenge", opponentId: t.id, day: s.day, time: s.time })}>
                                    {s.day} {s.time}
                                  </span>
                                ))}
                            </div>
                            <button className="tc-btn sm" disabled={busy}
                              onClick={() => setModal({ type: "challenge", opponentId: t.id, day: "토", time: "" })}>
                              {busy ? "진행 중" : <><Swords size={14} /> 도전신청</>}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {view === "results" && (
          <div className="tc-card">
            <h3><ClipboardList size={17} /> 경기결과 입력</h3>
            <p className="tc-note" style={{ marginBottom: 14 }}>
              {ph === "playing" || ph === "finished"
                ? "수락된 경기의 점수(게임/세트 수)를 입력하면 순위에 자동 반영됩니다."
                : "‘리그 진행’ 단계가 되면 점수를 입력할 수 있습니다."}
            </p>
            {scoreList.length === 0 ? (
              <div className="tc-empty">아직 잡힌 경기가 없습니다. 도전게시판에서 도전이 수락되면 여기에 표시됩니다.</div>
            ) : (
              scoreList.map((c) => {
                const aw = c.status === "done" && c.scoreA > c.scoreB;
                const bw = c.status === "done" && c.scoreB > c.scoreA;
                const editable = ph === "playing" || ph === "finished";
                return (
                  <div key={c.id} className="tc-match">
                    <span className={"tc-tm" + (aw ? " tc-win" : "")} style={{ textAlign: "right" }}>
                      {aw && <Check size={14} style={{ verticalAlign: -2 }} />} {teamLabel(c.challenger)}
                    </span>
                    {editable ? (
                      <input className="tc-score-in" type="number" min="0" value={c.scoreA}
                        onChange={(e) => setChScore(c.id, "scoreA", e.target.value)} onBlur={() => finalizeScore(c.id)} />
                    ) : <span className="tc-score-in" style={{ borderColor: "transparent", background: "var(--bg)" }}>{c.status === "done" ? c.scoreA : "-"}</span>}
                    <span className="tc-vs">:</span>
                    {editable ? (
                      <input className="tc-score-in" type="number" min="0" value={c.scoreB}
                        onChange={(e) => setChScore(c.id, "scoreB", e.target.value)} onBlur={() => finalizeScore(c.id)} />
                    ) : <span className="tc-score-in" style={{ borderColor: "transparent", background: "var(--bg)" }}>{c.status === "done" ? c.scoreB : "-"}</span>}
                    <span className={"tc-tm" + (bw ? " tc-win" : "")}>
                      {teamLabel(c.opponent)} {bw && <Check size={14} style={{ verticalAlign: -2 }} />}
                    </span>
                    <span style={{ flexBasis: "100%", display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                      <span className={"tc-status " + c.status}>{c.status === "done" ? "완료" : "예정"}</span>
                      <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{c.day} {c.time}</span>
                      {isAdmin && <span className="tc-x" style={{ marginLeft: "auto" }} onClick={() => cancelChallenge(c.id)}><Trash2 size={14} /></span>}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}

        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 11.5, marginTop: 18 }}>
          기록은 Supabase에 저장되어 회원 모두에게 실시간 공유됩니다.
        </p>
      </div>

      {modal && (
        <div className="tc-modal-bg" onClick={() => setModal(null)}>
          <div className="tc-modal" onClick={(e) => e.stopPropagation()}>
            {modal === "setpin" && (
              <>
                <h3 style={{ marginTop: 0 }}>운영진 PIN 설정</h3>
                <p className="tc-note" style={{ marginBottom: 14 }}>운영을 위한 PIN(4자리 이상)을 처음 한 번 설정하세요.</p>
                <input className="tc-input" type="password" value={pinInput} placeholder="PIN 입력" onChange={(e) => setPinInput(e.target.value)} />
                {pinErr && <p style={{ color: "var(--clay)", fontSize: 13, margin: "8px 0 0" }}>{pinErr}</p>}
                <div className="tc-flex" style={{ marginTop: 16, justifyContent: "flex-end" }}>
                  <button className="tc-btn ghost" onClick={() => setModal(null)}>취소</button>
                  <button className="tc-btn ball" onClick={confirmSetPin}>설정</button>
                </div>
              </>
            )}
            {modal === "enterpin" && (
              <>
                <h3 style={{ marginTop: 0 }}>운영진 PIN 입력</h3>
                <input className="tc-input" type="password" value={pinInput} placeholder="PIN 입력" autoFocus
                  onChange={(e) => setPinInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && confirmEnterPin()} />
                {pinErr && <p style={{ color: "var(--clay)", fontSize: 13, margin: "8px 0 0" }}>{pinErr}</p>}
                <div className="tc-flex" style={{ marginTop: 16, justifyContent: "flex-end" }}>
                  <button className="tc-btn ghost" onClick={() => setModal(null)}>취소</button>
                  <button className="tc-btn ball" onClick={confirmEnterPin}>확인</button>
                </div>
              </>
            )}
            {modal === "reset" && (
              <>
                <h3 style={{ marginTop: 0 }}>새 시즌 시작</h3>
                <p className="tc-note" style={{ marginBottom: 14 }}>현재 시즌의 모든 팀·대기자·도전·결과가 삭제됩니다. 계속할까요?</p>
                <div className="tc-flex" style={{ justifyContent: "flex-end" }}>
                  <button className="tc-btn ghost" onClick={() => setModal(null)}>취소</button>
                  <button className="tc-btn clay" onClick={() => {
                    const pin = data.adminPin, club = data.club;
                    update(() => { const s = newSeason(); s.adminPin = pin; s.club = club; return s; });
                    setView("dash"); setMyTeamId(""); setModal(null);
                  }}>전체 초기화</button>
                </div>
              </>
            )}
            {typeof modal === "object" && modal.type === "challenge" && (
              <>
                <h3 style={{ marginTop: 0 }}><Swords size={17} style={{ verticalAlign: -3 }} /> 도전신청</h3>
                <p className="tc-note" style={{ marginBottom: 14 }}>
                  <b>{myTeam?.name}</b> → <b>{teamLabel(modal.opponentId)}</b> 경기를 신청합니다. 원하는 요일·시간을 정하세요.
                </p>
                <div className="tc-flex" style={{ alignItems: "stretch" }}>
                  <select className="tc-select" value={modal.day} onChange={(e) => setModal({ ...modal, day: e.target.value })}>
                    {DAYS.map((d) => <option key={d} value={d}>{d}요일</option>)}
                  </select>
                  <input className="tc-input" style={{ flex: 1, minWidth: 120 }} placeholder="예: 저녁 7시"
                    value={modal.time} onChange={(e) => setModal({ ...modal, time: e.target.value })} />
                </div>
                <div className="tc-flex" style={{ marginTop: 16, justifyContent: "flex-end" }}>
                  <button className="tc-btn ghost" onClick={() => setModal(null)}>취소</button>
                  <button className="tc-btn ball" disabled={!modal.time.trim()}
                    onClick={() => { sendChallenge(myTeam.id, modal.opponentId, modal.day, modal.time); setModal(null); }}>
                    <Send size={15} /> 도전 보내기
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- small components ---- */
function PairAdder({ onAdd }) {
  const [a, setA] = useState(""); const [b, setB] = useState("");
  const submit = () => { if (onAdd(a, b)) { setA(""); setB(""); } };
  return (
    <div className="tc-flex" style={{ alignItems: "stretch" }}>
      <input className="tc-input" style={{ flex: 1, minWidth: 130 }} placeholder="회원 1 이름" value={a} onChange={(e) => setA(e.target.value)} />
      <input className="tc-input" style={{ flex: 1, minWidth: 130 }} placeholder="회원 2 이름" value={b} onChange={(e) => setB(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
      <button className="tc-btn" onClick={submit}><Plus size={16} /> 팀 신청</button>
    </div>
  );
}
function SoloAdder({ onAdd }) {
  const [v, setV] = useState("");
  const submit = () => { if (onAdd(v)) setV(""); };
  return (
    <>
      <p className="tc-note" style={{ margin: "0 0 10px" }}>짝 없이 신청하면 운영진이 짝을 정해드립니다.</p>
      <div className="tc-flex" style={{ alignItems: "stretch" }}>
        <input className="tc-input" style={{ flex: 1, minWidth: 160 }} placeholder="내 이름" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
        <button className="tc-btn" onClick={submit}><Plus size={16} /> 혼자 신청</button>
      </div>
    </>
  );
}
function SlotAdder({ onAdd }) {
  const [day, setDay] = useState("토"); const [time, setTime] = useState("");
  const submit = () => { if (time.trim()) { onAdd(day, time); setTime(""); } };
  return (
    <div className="tc-flex" style={{ alignItems: "stretch" }}>
      <select className="tc-select" value={day} onChange={(e) => setDay(e.target.value)}>
        {DAYS.map((d) => <option key={d} value={d}>{d}요일</option>)}
      </select>
      <input className="tc-input" style={{ flex: 1, minWidth: 130 }} placeholder="예: 오전 10시, 저녁 7시" value={time} onChange={(e) => setTime(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
      <button className="tc-btn" onClick={submit}><Plus size={16} /> 추가</button>
    </div>
  );
}
function Pairer({ members, onPair }) {
  const [sel, setSel] = useState(null);
  const click = (id) => {
    if (sel === null) setSel(id);
    else if (sel === id) setSel(null);
    else { onPair(sel, id); setSel(null); }
  };
  return (
    <div style={{ marginTop: 14 }}>
      <p className="tc-sec-label"><Users size={13} /> 짝이 없는 회원 ({members.length})</p>
      <div className="tc-flex">
        {members.length === 0 && <div className="tc-empty" style={{ width: "100%" }}>모든 회원이 팀에 배정되었습니다.</div>}
        {members.map((m) => (
          <span key={m.id} className={"tc-chip pick" + (sel === m.id ? " sel" : "")} onClick={() => click(m.id)}>
            <Circle size={11} style={{ fill: sel === m.id ? "var(--court)" : "none", color: "var(--court)" }} />{m.name}
          </span>
        ))}
      </div>
    </div>
  );
}
