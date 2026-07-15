/* APEX FININT — The Brief (state 4). Market layer · scan board · per-instrument cards. */

/* freshness pill (price LIVE, OI as-of close, etc.) */
function FreshPill({ f }) {
  const live = f.state === "live";
  const c = live ? "var(--apex-green)" : "var(--apex-yellow)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "3px 10px", borderRadius: "var(--apex-radius-pill)",
      background: live ? "var(--apex-green-tint)" : "var(--apex-yellow-tint)" }}>
      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: c }} />
      <span style={{ fontFamily: "var(--apex-font-sans)", fontSize: "11px", fontWeight: 500, color: c }}>{f.label}</span>
      <span style={{ fontFamily: "var(--apex-font-sans)", fontSize: "11px", color: "var(--apex-text-tertiary)" }}>{f.note}</span>
    </span>
  );
}

function InstChip({ sym }) {
  return <span style={{ fontFamily: "var(--apex-font-mono)", fontSize: "11px", fontWeight: 500, padding: "1px 6px", borderRadius: "var(--apex-radius-badge)",
    background: "var(--apex-bg-tertiary)", color: "var(--apex-text-secondary)" }}>{sym}</span>;
}

function OiBadge({ state }) {
  const o = OI[state];
  const bull = o.dir === "bull";
  const col = bull ? "var(--apex-green)" : "var(--apex-red)";
  return (
    <Tip k={state} bare>
      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "var(--apex-radius-badge)", whiteSpace: "nowrap",
        background: o.strong ? (bull ? "var(--apex-green-tint)" : "var(--apex-red-tint)") : "transparent",
        border: o.strong ? "none" : `0.5px solid ${col}`,
        fontFamily: "var(--apex-font-sans)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.02em", color: col }}>
        {o.label}
      </span>
    </Tip>
  );
}

function FactorBars({ f, emphasize }) {
  const keys = [["gap", "Gap"], ["oi", "OI"], ["level", "Level"], ["vol", "Vol"]];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
      {keys.map(([k, lbl]) => (
        <div key={k}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <Tip k={k}><span style={{ fontFamily: "var(--apex-font-sans)", fontSize: "10px", letterSpacing: "0.03em", textTransform: "uppercase", color: "var(--apex-text-tertiary)" }}>{lbl}</span></Tip>
            <span style={{ fontFamily: "var(--apex-font-mono)", fontSize: "10px", color: "var(--apex-text-secondary)" }}>{f[k]}</span>
          </div>
          <div style={{ height: "4px", borderRadius: "2px", background: "var(--apex-bg-tertiary)", overflow: "hidden" }}>
            <div style={{ width: `${f[k]}%`, height: "100%", borderRadius: "2px", background: emphasize ? "var(--apex-blue)" : "var(--apex-text-tertiary)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Market layer ── */
function MarketLayer({ m }) {
  return (
    <section style={{ marginBottom: "32px" }}>
      <SectionHead>Market layer</SectionHead>

      {/* session read */}
      <p style={{ margin: "0 0 20px", fontFamily: "var(--apex-font-sans)", fontSize: "17px", lineHeight: "25px", fontWeight: 400, color: "var(--apex-text-primary)", maxWidth: "820px", textWrap: "pretty" }}>
        {m.sessionRead}
      </p>

      {/* what changed overnight */}
      <div style={{ border: "0.5px solid var(--apex-border-default)", borderLeft: m.overnight.regimeChange ? "3px solid var(--apex-blue)" : "0.5px solid var(--apex-border-default)",
        borderRadius: "var(--apex-radius-card)", padding: "16px", marginBottom: "20px", background: "var(--apex-bg-primary)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <span style={{ fontFamily: "var(--apex-font-sans)", fontSize: "11px", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--apex-text-tertiary)" }}>What changed overnight</span>
          {m.overnight.regimeChange && (
            <span style={{ fontFamily: "var(--apex-font-sans)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", padding: "1px 6px", borderRadius: "var(--apex-radius-badge)", background: "var(--apex-blue)", color: "#fff" }}>NEW · REGIME CHANGE</span>
          )}
        </div>
        <div style={{ fontFamily: "var(--apex-font-sans)", fontSize: "16px", fontWeight: 500, color: "var(--apex-text-primary)", marginBottom: "6px" }}>{m.overnight.headline}</div>
        <div style={{ fontFamily: "var(--apex-font-sans)", fontSize: "13px", lineHeight: "19px", color: "var(--apex-text-secondary)", maxWidth: "760px" }}>{m.overnight.body}</div>
      </div>

      {/* backdrop tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {m.backdrop.map((b) => {
          const tc = b.tone === "down" ? "var(--apex-green)" : b.tone === "up" ? "var(--apex-red)" : "var(--apex-text-secondary)";
          return (
            <div key={b.label} style={{ background: "var(--apex-bg-secondary)", borderRadius: "var(--apex-radius-card)", padding: "14px 16px" }}>
              <div style={{ fontFamily: "var(--apex-font-sans)", fontSize: "11px", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--apex-text-tertiary)", marginBottom: "8px" }}>{b.label}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span style={{ fontFamily: "var(--apex-font-mono)", fontSize: "20px", fontWeight: 500, color: "var(--apex-text-primary)" }}>{b.value}</span>
                {b.delta && <span style={{ fontFamily: "var(--apex-font-mono)", fontSize: "12px", fontWeight: 500, color: tc }}>{b.delta}</span>}
              </div>
              <div style={{ fontFamily: "var(--apex-font-sans)", fontSize: "11px", lineHeight: "15px", color: "var(--apex-text-tertiary)", marginTop: "6px" }}>{b.note}</div>
            </div>
          );
        })}
      </div>

      {/* catalysts */}
      <SectionHead right={<span style={{ fontFamily: "var(--apex-font-sans)", fontSize: "11px", color: "var(--apex-text-tertiary)" }}>{m.catalysts.length} overnight</span>}>Catalysts</SectionHead>
      <div style={{ border: "0.5px solid var(--apex-border-default)", borderRadius: "var(--apex-radius-card)", overflow: "hidden", marginBottom: "20px" }}>
        {m.catalysts.map((c, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "20px 1fr auto", gap: "12px", alignItems: "start", padding: "14px 16px",
            borderTop: i ? "0.5px solid var(--apex-border-subtle)" : "none" }}>
            <span style={{ marginTop: "1px" }}><DirArrow dir={c.direction} /></span>
            <div>
              <div style={{ fontFamily: "var(--apex-font-sans)", fontSize: "14px", lineHeight: "19px", color: "var(--apex-text-primary)", marginBottom: "8px" }}>{c.headline}</div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                {c.instruments.map((s) => <InstChip key={s} sym={s} />)}
                <a href={c.source.url} onClick={(e) => e.preventDefault()} style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontFamily: "var(--apex-font-sans)", fontSize: "12px", color: "var(--apex-blue)", textDecoration: "none" }}>
                  <Icon name="link" size={12} /> {c.source.name}
                </a>
              </div>
            </div>
            <span style={{ justifySelf: "end", whiteSpace: "nowrap", fontFamily: "var(--apex-font-sans)", fontSize: "11px", fontWeight: c.isNew ? 600 : 400,
              padding: c.isNew ? "2px 8px" : "2px 0", borderRadius: "var(--apex-radius-badge)",
              background: c.isNew ? "var(--apex-blue-tint)" : "transparent", color: c.isNew ? "var(--apex-blue)" : "var(--apex-text-tertiary)" }}>{c.freshness}</span>
          </div>
        ))}
      </div>

      {/* cross-instrument notes */}
      <SectionHead>Cross-instrument notes</SectionHead>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
        {m.crossNotes.map((n, i) => (
          <li key={i} style={{ display: "flex", gap: "10px", fontFamily: "var(--apex-font-sans)", fontSize: "13px", lineHeight: "19px", color: "var(--apex-text-secondary)" }}>
            <span style={{ color: "var(--apex-blue)", flexShrink: 0 }}>→</span>{n}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── Scan board ── */
function ScanBoard({ instruments, expanded, onToggle }) {
  return (
    <section style={{ marginBottom: "32px" }}>
      <SectionHead right={<span style={{ fontFamily: "var(--apex-font-sans)", fontSize: "11px", color: "var(--apex-text-tertiary)" }}>9 instruments · ranked</span>}>Scan board</SectionHead>
      <div style={{ border: "0.5px solid var(--apex-border-default)", borderRadius: "var(--apex-radius-card)", overflow: "hidden" }}>
        {/* header */}
        <div style={{ display: "grid", gridTemplateColumns: "28px 1.4fr 0.8fr 0.9fr 1.3fr 1fr 28px", gap: "12px", alignItems: "center", padding: "10px 16px", background: "var(--apex-bg-secondary)",
          fontFamily: "var(--apex-font-sans)", fontSize: "11px", letterSpacing: "0.03em", textTransform: "uppercase", color: "var(--apex-text-tertiary)" }}>
          <span></span><span>Instrument</span><span><Tip k="tier">Tier</Tip></span>
          <span style={{ textAlign: "right" }}><Tip k="impliedOpen">Impl. open</Tip></span>
          <span><Tip k="oi">OI state</Tip></span>
          <span style={{ textAlign: "right" }}><Tip k="cotPctile">COT %ile</Tip></span><span></span>
        </div>
        {instruments.map((it, i) => {
          const high = it.tier === "high";
          const open = expanded === it.sym;
          return (
            <div key={it.sym}>
              <div onClick={() => onToggle(it.sym)} style={{ display: "grid", gridTemplateColumns: "28px 1.4fr 0.8fr 0.9fr 1.3fr 1fr 28px", gap: "12px", alignItems: "center",
                padding: "0 16px", height: "52px", cursor: "pointer", borderTop: i ? "0.5px solid var(--apex-border-subtle)" : "0.5px solid var(--apex-border-subtle)",
                background: high ? "var(--apex-blue-tint)" : "transparent",
                borderLeft: high ? "3px solid var(--apex-blue)" : "3px solid transparent", paddingLeft: "13px" }}>
                <span style={{ fontFamily: "var(--apex-font-mono)", fontSize: "12px", color: "var(--apex-text-tertiary)" }}>{i + 1}</span>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontFamily: "var(--apex-font-mono)", fontSize: "13px", fontWeight: 600, color: "var(--apex-text-primary)" }}>{it.sym}</span>
                  <span style={{ fontFamily: "var(--apex-font-sans)", fontSize: "11px", color: "var(--apex-text-tertiary)" }}>{it.name}</span>
                </div>
                <span><span style={{ fontFamily: "var(--apex-font-sans)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.04em", padding: "2px 7px", borderRadius: "var(--apex-radius-badge)",
                  background: high ? "var(--apex-blue-tint)" : it.tier === "watch" ? "var(--apex-orange-tint)" : "var(--apex-bg-tertiary)",
                  color: high ? "var(--apex-blue)" : it.tier === "watch" ? "var(--apex-orange)" : "var(--apex-text-tertiary)" }}>{TIER[it.tier].label}</span></span>
                <span style={{ textAlign: "right", fontFamily: "var(--apex-font-mono)", fontSize: "13px", fontWeight: 500, color: it.impliedOpen >= 0 ? "var(--apex-green)" : "var(--apex-red)" }}>{fmtPct(it.impliedOpen)}</span>
                <span><OiBadge state={it.oiState} /></span>
                <span style={{ textAlign: "right", fontFamily: "var(--apex-font-mono)", fontSize: "13px", color: it.cotPctile >= 70 ? "var(--apex-orange)" : "var(--apex-text-secondary)" }}>{it.cotPctile}<span style={{ fontSize: "10px", color: "var(--apex-text-tertiary)" }}>th</span></span>
                <span style={{ justifySelf: "center", color: "var(--apex-text-tertiary)", transform: open ? "rotate(90deg)" : "none", transition: "transform 100ms var(--apex-ease)" }}><Icon name="chevronRight" size={14} /></span>
              </div>
              {open && (
                <div style={{ padding: "14px 16px 16px 47px", background: "var(--apex-bg-secondary)", borderTop: "0.5px solid var(--apex-border-subtle)" }}>
                  <div style={{ fontFamily: "var(--apex-font-sans)", fontSize: "11px", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--apex-text-tertiary)", marginBottom: "10px" }}>Factor breakdown</div>
                  <div style={{ maxWidth: "520px" }}><FactorBars f={it.factors} emphasize={high} /></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── Per-instrument cards ── */
function InstrumentCard({ it, open, onToggle }) {
  const high = it.tier === "high";
  const tierTone = high ? "var(--apex-blue)" : it.tier === "watch" ? "var(--apex-orange)" : "var(--apex-text-tertiary)";
  const Metric = ({ label, k, children }) => (
    <div>
      <div style={{ fontFamily: "var(--apex-font-sans)", fontSize: "10px", letterSpacing: "0.03em", textTransform: "uppercase", color: "var(--apex-text-tertiary)", marginBottom: "4px" }}>
        {k ? <Tip k={k}>{label}</Tip> : label}
      </div>
      <div style={{ fontFamily: "var(--apex-font-mono)", fontSize: "14px", fontWeight: 500, color: "var(--apex-text-primary)" }}>{children}</div>
    </div>
  );

  return (
    <div style={{ border: "0.5px solid var(--apex-border-default)", borderRadius: "var(--apex-radius-card)", overflow: "hidden", background: "var(--apex-bg-primary)" }}>
      <div onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", cursor: "pointer" }}>
        <span style={{ fontFamily: "var(--apex-font-mono)", fontSize: "15px", fontWeight: 600, color: "var(--apex-text-primary)" }}>{it.sym}</span>
        <span style={{ fontFamily: "var(--apex-font-sans)", fontSize: "13px", color: "var(--apex-text-tertiary)" }}>{it.name}</span>
        <span style={{ fontFamily: "var(--apex-font-sans)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.04em", padding: "2px 7px", borderRadius: "var(--apex-radius-badge)", color: tierTone,
          background: high ? "var(--apex-blue-tint)" : it.tier === "watch" ? "var(--apex-orange-tint)" : "var(--apex-bg-tertiary)" }}>{TIER[it.tier].label}</span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontFamily: "var(--apex-font-mono)", fontSize: "14px", fontWeight: 500, color: it.impliedOpen >= 0 ? "var(--apex-green)" : "var(--apex-red)" }}>{fmtPct(it.impliedOpen)}</span>
          <span style={{ color: "var(--apex-text-tertiary)", transform: open ? "rotate(90deg)" : "none", transition: "transform 100ms var(--apex-ease)" }}><Icon name="chevronRight" size={16} /></span>
        </span>
      </div>

      {open && (
        <div style={{ padding: "4px 16px 18px", borderTop: "0.5px solid var(--apex-border-subtle)" }}>
          {/* hard data grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px 20px", padding: "16px 0" }}>
            <Metric label="Implied open" k="impliedOpen">{fmtPct(it.impliedOpen)}</Metric>
            <div>
              <div style={{ fontFamily: "var(--apex-font-sans)", fontSize: "10px", letterSpacing: "0.03em", textTransform: "uppercase", color: "var(--apex-text-tertiary)", marginBottom: "4px" }}>Intl × USD/INR</div>
              <div style={{ fontFamily: "var(--apex-font-mono)", fontSize: "13px", color: "var(--apex-text-secondary)" }}>{fmtPct(it.intlMove)} <span style={{ color: "var(--apex-text-tertiary)" }}>+ {fmtPct(it.usdinrEffect)}</span></div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--apex-font-sans)", fontSize: "10px", letterSpacing: "0.03em", textTransform: "uppercase", color: "var(--apex-text-tertiary)", marginBottom: "4px" }}><Tip k="oi">OI state</Tip></div>
              <OiBadge state={it.oiState} />
            </div>
            <Metric label="COT %ile" k="cotPctile">{it.cotPctile}th</Metric>
            <Metric label="ATR" k="atr">{fmtNum(it.atr)}</Metric>
            <div>
              <div style={{ fontFamily: "var(--apex-font-sans)", fontSize: "10px", letterSpacing: "0.03em", textTransform: "uppercase", color: "var(--apex-text-tertiary)", marginBottom: "4px" }}><Tip k="support">Support</Tip></div>
              <div style={{ fontFamily: "var(--apex-font-mono)", fontSize: "13px", color: "var(--apex-green)" }}>{it.support.map(fmtNum).join("  ·  ")}</div>
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <div style={{ fontFamily: "var(--apex-font-sans)", fontSize: "10px", letterSpacing: "0.03em", textTransform: "uppercase", color: "var(--apex-text-tertiary)", marginBottom: "4px" }}><Tip k="resistance">Resistance</Tip></div>
              <div style={{ fontFamily: "var(--apex-font-mono)", fontSize: "13px", color: "var(--apex-red)" }}>{it.resistance.map(fmtNum).join("  ·  ")}</div>
            </div>
          </div>

          {/* factor bars */}
          <div style={{ padding: "14px 0", borderTop: "0.5px solid var(--apex-border-subtle)" }}>
            <div style={{ fontFamily: "var(--apex-font-sans)", fontSize: "10px", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--apex-text-tertiary)", marginBottom: "10px" }}>Factor breakdown</div>
            <div style={{ maxWidth: "560px" }}><FactorBars f={it.factors} emphasize={high} /></div>
          </div>

          {/* AI read — coming */}
          <div style={{ marginTop: "4px", padding: "14px 16px", borderRadius: "var(--apex-radius-control)", border: "0.5px dashed var(--apex-border-default)", background: "var(--apex-bg-secondary)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <Icon name="brief" size={14} style={{ color: "var(--apex-text-tertiary)" }} />
              <span style={{ fontFamily: "var(--apex-font-sans)", fontSize: "11px", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--apex-text-tertiary)" }}>AI read — coming</span>
            </div>
            <div style={{ fontFamily: "var(--apex-font-sans)", fontSize: "13px", lineHeight: "18px", color: "var(--apex-text-tertiary)", fontStyle: "italic" }}>
              A written narrative tying these data points into a plain-language read will slot in here.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── The Brief shell ── */
function Brief({ data, onRegenerate }) {
  const m = data.market;
  const [boardOpen, setBoardOpen] = React.useState("SILVER");
  const [cardOpen, setCardOpen] = React.useState("GOLD");

  return (
    <div style={{ maxWidth: "1000px" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "14px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontFamily: "var(--apex-font-sans)", fontSize: "28px", fontWeight: 400, letterSpacing: "-0.01em", color: "var(--apex-text-primary)" }}>Morning Brief</h1>
          <div style={{ fontFamily: "var(--apex-font-sans)", fontSize: "14px", color: "var(--apex-text-secondary)" }}>{data.date} · MCX opens {data.opensAt}</div>
        </div>
        <button onClick={onRegenerate} style={{ display: "inline-flex", alignItems: "center", gap: "6px", height: "32px", padding: "0 12px", marginTop: "4px",
          background: "transparent", color: "var(--apex-text-secondary)", border: "0.5px solid var(--apex-border-default)", borderRadius: "var(--apex-radius-control)",
          fontFamily: "var(--apex-font-sans)", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>
          <Icon name="refresh" size={14} /> Regenerate
        </button>
      </div>

      {/* per-source freshness strip */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", padding: "12px 0", borderTop: "0.5px solid var(--apex-border-subtle)", borderBottom: "0.5px solid var(--apex-border-subtle)", marginBottom: "28px" }}>
        {data.freshness.map((f) => <FreshPill key={f.label} f={f} />)}
      </div>

      <MarketLayer m={m} />
      <ScanBoard instruments={data.instruments} expanded={boardOpen} onToggle={(s) => setBoardOpen((p) => p === s ? null : s)} />

      {/* per-instrument cards */}
      <section>
        <SectionHead right={<span style={{ fontFamily: "var(--apex-font-sans)", fontSize: "11px", color: "var(--apex-text-tertiary)" }}>tap to expand</span>}>Per-instrument detail</SectionHead>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {data.instruments.map((it) => (
            <InstrumentCard key={it.sym} it={it} open={cardOpen === it.sym} onToggle={() => setCardOpen((p) => p === it.sym ? null : it.sym)} />
          ))}
        </div>
      </section>
    </div>
  );
}

window.FININT_Brief = Brief;
