/* APEX FININT — Morning Brief screen. States: readiness → refresh → generating → brief.
 * Composes the APEX design-system primitives. Dark mode primary. */

const DS = window.APEXDesignSystem_0dc6fd;

/* ─────────────────────────── helpers ─────────────────────────── */

const TIER = {
  high:  { label: "HIGH",  tone: "blue" },
  watch: { label: "WATCH", tone: "orange" },
  skip:  { label: "SKIP",  tone: "neutral" },
};

const OI = {
  NEW_LONGS:        { label: "NEW LONGS",        dir: "bull", strong: true },
  SHORT_COVERING:   { label: "SHORT COVERING",   dir: "bull", strong: false },
  NEW_SHORTS:       { label: "NEW SHORTS",       dir: "bear", strong: true },
  LONG_LIQUIDATION: { label: "LONG LIQUIDATION", dir: "bear", strong: false },
};

function fmtPct(p) {
  const s = (p > 0 ? "+" : p < 0 ? "−" : "");
  return s + Math.abs(p).toFixed(2) + "%";
}
function fmtNum(n) {
  return n.toLocaleString("en-IN");
}

/* Plain-language tooltip — dotted-underline term + hover bubble. */
function Tip({ term, k, children, bare, style }) {
  const [open, setOpen] = React.useState(false);
  const text = window.FININT_GLOSSARY[k];
  return (
    <span
      style={{ position: "relative", borderBottom: bare ? "none" : "1px dotted var(--apex-text-tertiary)", cursor: "help", ...style }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children || term}
      {open && text && (
        <span style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
          width: "260px", padding: "10px 12px", zIndex: 100,
          background: "var(--apex-bg-tertiary)", border: "0.5px solid var(--apex-border-default)",
          borderRadius: "var(--apex-radius-control)", cursor: "default",
          fontFamily: "var(--apex-font-sans)", fontSize: "12px", lineHeight: "17px",
          fontWeight: 400, letterSpacing: 0, textTransform: "none", color: "var(--apex-text-primary)",
          whiteSpace: "normal", textAlign: "left",
        }}>
          {text}
        </span>
      )}
    </span>
  );
}

function SourceDot({ status, pulse }) {
  const c = { green: "var(--apex-green)", amber: "var(--apex-yellow)", red: "var(--apex-red)" }[status];
  return <span className={pulse ? "apex-pulse" : undefined} style={{ width: "8px", height: "8px", borderRadius: "50%", background: c, flexShrink: 0,
    animation: pulse ? "apex-pulse 1.5s var(--apex-ease) infinite" : undefined }} />;
}

function SectionHead({ children, right }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "14px" }}>
      <h2 style={{ margin: 0, fontFamily: "var(--apex-font-sans)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--apex-text-tertiary)" }}>{children}</h2>
      {right}
    </div>
  );
}

function DirArrow({ dir, size = 14 }) {
  const up = dir === "bull";
  return <Icon name={up ? "arrowUp" : "arrowDown"} size={size} style={{ color: up ? "var(--apex-green)" : "var(--apex-red)" }} />;
}

/* ─────────────────────────── STATE 1 · READINESS ─────────────────────────── */

function Readiness({ data, onGenerate, onRefreshKite, onViewLast }) {
  const { Button } = DS;
  const kite = data.sources.find((s) => s.key === "kite");
  const criticalBlocked = data.sources.some((s) => s.critical && s.status === "red");

  return (
    <div style={{ maxWidth: "760px" }}>
      <h1 style={{ margin: "0 0 8px", fontFamily: "var(--apex-font-sans)", fontSize: "28px", fontWeight: 400, letterSpacing: "-0.01em", color: "var(--apex-text-primary)" }}>FININT Brief</h1>
      <p style={{ margin: "0 0 28px", fontFamily: "var(--apex-font-sans)", fontSize: "14px", lineHeight: "20px", color: "var(--apex-text-secondary)", maxWidth: "560px" }}>
        Your pre-market intelligence read for {data.date}. MCX opens {data.opensAt}. Generate on fresh data, then scan the board before the bell.
      </p>

      {/* Generate + last-brief */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "12px" }}>
        <Button variant="primary" size="lg" disabled={criticalBlocked} onClick={onGenerate}
          style={{ background: criticalBlocked ? "var(--apex-bg-tertiary)" : "var(--apex-blue)", color: criticalBlocked ? "var(--apex-text-tertiary)" : "#fff" }}>
          <Icon name="brief" size={18} /> Generate Brief
        </Button>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <span style={{ fontFamily: "var(--apex-font-sans)", fontSize: "12px", color: "var(--apex-text-tertiary)" }}>Last brief · {data.lastBrief}</span>
          <a href="#" onClick={(e) => { e.preventDefault(); onViewLast(); }} style={{ fontFamily: "var(--apex-font-sans)", fontSize: "12px", color: "var(--apex-blue)", textDecoration: "none" }}>View last brief →</a>
        </div>
      </div>
      {criticalBlocked && (
        <p style={{ margin: "0 0 24px", fontFamily: "var(--apex-font-sans)", fontSize: "12px", color: "var(--apex-text-tertiary)" }}>
          Generation is locked until the critical sources (Kite, COMEX, USD/INR) are fresh.
        </p>
      )}

      {/* Data-source health */}
      <div style={{ marginTop: "16px", border: "0.5px solid var(--apex-border-default)", borderRadius: "var(--apex-radius-card)", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", background: "var(--apex-bg-secondary)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--apex-font-sans)", fontSize: "13px", fontWeight: 500, color: "var(--apex-text-primary)" }}>Data sources</span>
          <span style={{ fontFamily: "var(--apex-font-sans)", fontSize: "11px", color: "var(--apex-text-tertiary)" }}>
            {data.sources.filter((s) => s.status === "green").length}/{data.sources.length} fresh
          </span>
        </div>
        {data.sources.map((s) => (
          <div key={s.key} style={{ display: "grid", gridTemplateColumns: "16px 1.1fr 1.4fr auto", gap: "12px", alignItems: "center",
            padding: "0 16px", height: "52px", borderTop: "0.5px solid var(--apex-border-subtle)" }}>
            <SourceDot status={s.status} pulse={s.status === "red"} />
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontFamily: "var(--apex-font-sans)", fontSize: "14px", color: "var(--apex-text-primary)" }}>{s.label}</span>
              {s.critical && <span style={{ fontFamily: "var(--apex-font-sans)", fontSize: "10px", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--apex-text-tertiary)" }}>critical</span>}
            </div>
            <span style={{ fontFamily: "var(--apex-font-sans)", fontSize: "13px", color: s.status === "red" ? "var(--apex-red)" : "var(--apex-text-secondary)" }}>{s.note}</span>
            <span style={{ justifySelf: "end" }}>
              {s.key === "kite" && s.status === "red"
                ? <button onClick={onRefreshKite} style={{ display: "inline-flex", alignItems: "center", gap: "6px", height: "28px", padding: "0 12px", whiteSpace: "nowrap",
                    background: "var(--apex-yellow-tint)", color: "var(--apex-yellow)", border: "0.5px solid var(--apex-yellow)", borderRadius: "var(--apex-radius-control)",
                    fontFamily: "var(--apex-font-sans)", fontSize: "12px", fontWeight: 500, cursor: "pointer" }}>
                    <Icon name="refresh" size={13} /> Refresh Kite token
                  </button>
                : null}
            </span>
          </div>
        ))}
      </div>
      {kite && kite.status === "red" && (
        <p style={{ margin: "12px 2px 0", fontFamily: "var(--apex-font-sans)", fontSize: "12px", lineHeight: "17px", color: "var(--apex-text-secondary)" }}>
          <span style={{ color: "var(--apex-yellow)" }}>Kite needs a daily manual login</span> — refresh to generate on fresh price &amp; open-interest data.
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────── STATE 2 · KITE REFRESH ─────────────────────────── */

function KiteRefresh({ onClose, onComplete }) {
  const { Input, Button } = DS;
  const [token, setToken] = React.useState("");
  const [done, setDone] = React.useState(false);

  const stepNum = (n) => (
    <span style={{ width: "22px", height: "22px", borderRadius: "50%", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center",
      background: "var(--apex-bg-tertiary)", color: "var(--apex-text-secondary)", fontFamily: "var(--apex-font-mono)", fontSize: "11px", fontWeight: 600 }}>{n}</span>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--apex-scrim)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "440px", background: "var(--apex-bg-primary)", border: "0.5px solid var(--apex-border-default)",
        borderRadius: "var(--apex-radius-sheet)", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>

        {done ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--apex-green-tint)", color: "var(--apex-green)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="check" size={20} />
              </span>
              <div>
                <div style={{ fontFamily: "var(--apex-font-sans)", fontSize: "16px", fontWeight: 500, color: "var(--apex-text-primary)" }}>Kite token refreshed</div>
                <div style={{ fontFamily: "var(--apex-font-sans)", fontSize: "13px", color: "var(--apex-text-secondary)" }}>Valid until ~7:30 AM tomorrow.</div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button variant="primary" onClick={onComplete} style={{ background: "var(--apex-blue)" }}>Back to readiness</Button>
            </div>
          </>
        ) : (
          <>
            <div>
              <div style={{ fontFamily: "var(--apex-font-sans)", fontSize: "20px", fontWeight: 500, color: "var(--apex-text-primary)" }}>Refresh Kite token</div>
              <div style={{ fontFamily: "var(--apex-font-sans)", fontSize: "13px", lineHeight: "18px", color: "var(--apex-text-secondary)", marginTop: "6px" }}>
                Kite requires a manual login once per day. Two quick steps.
              </div>
            </div>

            {/* Step 1 */}
            <div style={{ display: "flex", gap: "12px" }}>
              {stepNum(1)}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--apex-font-sans)", fontSize: "14px", fontWeight: 500, color: "var(--apex-text-primary)", marginBottom: "8px" }}>Open the Kite login</div>
                <button onClick={() => {}} style={{ display: "inline-flex", alignItems: "center", gap: "6px", height: "32px", padding: "0 12px", whiteSpace: "nowrap",
                  background: "transparent", color: "var(--apex-text-primary)", border: "0.5px solid var(--apex-border-default)", borderRadius: "var(--apex-radius-control)",
                  fontFamily: "var(--apex-font-sans)", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>
                  <Icon name="external" size={14} /> Open Kite login
                </button>
              </div>
            </div>

            {/* Step 2 */}
            <div style={{ display: "flex", gap: "12px" }}>
              {stepNum(2)}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--apex-font-sans)", fontSize: "14px", fontWeight: 500, color: "var(--apex-text-primary)", marginBottom: "8px" }}>Paste the request_token from the redirect URL</div>
                <Input mono value={token} onChange={(e) => setToken(e.target.value)} placeholder="request_token=…" />
                {/* hint image of where the token appears in the URL */}
                <div style={{ marginTop: "8px", padding: "8px 10px", background: "var(--apex-bg-secondary)", borderRadius: "var(--apex-radius-control)", border: "0.5px solid var(--apex-border-subtle)" }}>
                  <div style={{ fontFamily: "var(--apex-font-sans)", fontSize: "10px", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--apex-text-tertiary)", marginBottom: "4px" }}>After login, the URL looks like</div>
                  <div style={{ fontFamily: "var(--apex-font-mono)", fontSize: "11px", lineHeight: "16px", wordBreak: "break-all", color: "var(--apex-text-secondary)" }}>
                    https://…/redirect?status=success&amp;<span style={{ color: "var(--apex-yellow)", background: "var(--apex-yellow-tint)", padding: "0 2px", borderRadius: "2px" }}>request_token=AbC12Xy</span>&amp;action=login
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
              <button onClick={onClose} style={{ height: "36px", padding: "0 16px", background: "transparent", color: "var(--apex-text-secondary)",
                border: "0.5px solid var(--apex-border-default)", borderRadius: "var(--apex-radius-control)", fontFamily: "var(--apex-font-sans)", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>Cancel</button>
              <Button variant="primary" disabled={token.trim().length < 4} onClick={() => setDone(true)}
                style={{ background: token.trim().length < 4 ? "var(--apex-bg-tertiary)" : "var(--apex-blue)", color: token.trim().length < 4 ? "var(--apex-text-tertiary)" : "#fff" }}>
                Complete refresh
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── STATE 3 · GENERATING ─────────────────────────── */

function Generating({ data, onDone }) {
  const [step, setStep] = React.useState(0);
  React.useEffect(() => {
    if (step >= data.pipeline.length) { const t = setTimeout(onDone, 500); return () => clearTimeout(t); }
    const t = setTimeout(() => setStep((s) => s + 1), 850);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div style={{ maxWidth: "560px", margin: "40px auto 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
        <span className="apex-spin" style={{ width: "16px", height: "16px", borderRadius: "50%", border: "2px solid var(--apex-blue)", borderTopColor: "transparent", animation: "apex-spin 0.7s linear infinite" }} />
        <h1 style={{ margin: 0, fontFamily: "var(--apex-font-sans)", fontSize: "20px", fontWeight: 500, color: "var(--apex-text-primary)" }}>Generating your brief</h1>
      </div>
      <p style={{ margin: "0 0 28px 26px", fontFamily: "var(--apex-font-sans)", fontSize: "13px", color: "var(--apex-text-tertiary)" }}>Running on fresh data · {data.date}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {data.pipeline.map((p, i) => {
          const state = i < step ? "done" : i === step ? "active" : "pending";
          return (
            <div key={p.key} style={{ display: "flex", gap: "14px", alignItems: "flex-start", padding: "14px 0", borderBottom: i < data.pipeline.length - 1 ? "0.5px solid var(--apex-border-subtle)" : "none",
              opacity: state === "pending" ? 0.4 : 1, transition: "opacity 400ms var(--apex-ease)" }}>
              <span style={{ width: "20px", height: "20px", flexShrink: 0, marginTop: "1px", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center",
                background: state === "done" ? "var(--apex-green-tint)" : state === "active" ? "var(--apex-blue-tint)" : "var(--apex-bg-tertiary)",
                color: state === "done" ? "var(--apex-green)" : "var(--apex-blue)" }}>
                {state === "done" ? <Icon name="check" size={13} />
                  : state === "active" ? <span className="apex-spin" style={{ width: "10px", height: "10px", borderRadius: "50%", border: "1.5px solid var(--apex-blue)", borderTopColor: "transparent", animation: "apex-spin 0.7s linear infinite" }} />
                  : <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--apex-text-tertiary)" }} />}
              </span>
              <div>
                <div style={{ fontFamily: "var(--apex-font-sans)", fontSize: "14px", fontWeight: 500, color: "var(--apex-text-primary)" }}>{p.label}</div>
                <div style={{ fontFamily: "var(--apex-font-sans)", fontSize: "12px", color: "var(--apex-text-tertiary)", marginTop: "2px" }}>{p.detail}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

window.FININT_Readiness = Readiness;
window.FININT_KiteRefresh = KiteRefresh;
window.FININT_Generating = Generating;
