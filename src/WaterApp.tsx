import React, { useEffect, useMemo, useState } from "react";

type WaterForm = { previous: string; current: string; totalAmount: string; totalM3: string; fixedFee: string };
const emptyWaterForm: WaterForm = { previous: "", current: "", totalAmount: "", totalM3: "", fixedFee: "" };

function parseWaterNumber(value: string) {
  const cleaned = value.trim().replace(/\s/g, "");
  if (!cleaned) return NaN;
  const comma = cleaned.lastIndexOf(",");
  const dot = cleaned.lastIndexOf(".");
  const pos = Math.max(comma, dot);
  if (pos < 0) return Number(cleaned);
  return Number(cleaned.slice(0, pos).replace(/[.,]/g, "") + "." + cleaned.slice(pos + 1).replace(/[.,]/g, ""));
}
function fmtWater(value: number, digits = 2) {
  return new Intl.NumberFormat("it-IT", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}
function WaterField({ id, label, hint, suffix, value, onChange, error }: {
  id: keyof WaterForm; label: string; hint: string; suffix: string; value: string;
  onChange: (id: keyof WaterForm, value: string) => void; error?: string;
}) {
  return <div className="field">
    <label htmlFor={"water-" + id}>{label}</label>
    <div className={"input-wrap " + (error ? "input-error" : "")}>
      <input id={"water-" + id} inputMode="decimal" autoComplete="off" placeholder="0" value={value}
        onChange={(e) => onChange(id, e.target.value)} aria-invalid={!!error} />
      <span>{suffix}</span>
    </div>
    <p className="hint">{hint}</p>{error && <p className="error" role="alert">{error}</p>}
  </div>;
}

export default function WaterApp() {
  const [form, setForm] = useState<WaterForm>(emptyWaterForm);
  const [details, setDetails] = useState(false);
  const [notice, setNotice] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("calcolo-bolletta-water-values");
    if (saved) { try { setForm({ ...emptyWaterForm, ...JSON.parse(saved) }); } catch {} }
  }, []);

  const values = useMemo(() => ({
    previous: parseWaterNumber(form.previous), current: parseWaterNumber(form.current),
    totalAmount: parseWaterNumber(form.totalAmount), totalM3: parseWaterNumber(form.totalM3),
    fixedFee: parseWaterNumber(form.fixedFee),
  }), [form]);
  const difference = values.current - values.previous;
  const m3Two = values.totalM3 - difference;
  const shareOne = difference / values.totalM3;
  const shareTwo = m3Two / values.totalM3;
  const proportionalOne = values.totalAmount * shareOne;
  const proportionalTwo = values.totalAmount * shareTwo;
  const variableAmount = values.totalAmount - values.fixedFee;
  const fixedPerApartment = values.fixedFee / 2;
  const splitFixedOne = fixedPerApartment + variableAmount * shareOne;
  const splitFixedTwo = fixedPerApartment + variableAmount * shareTwo;

  const errors = useMemo(() => {
    const e: Partial<Record<keyof WaterForm, string>> = {};
    if (!Number.isFinite(values.previous) || values.previous < 0) e.previous = "Inserisci una lettura valida.";
    if (!Number.isFinite(values.current) || values.current < 0) e.current = "Inserisci una lettura valida.";
    if (Number.isFinite(values.previous) && Number.isFinite(values.current) && values.current < values.previous)
      e.current = "La lettura attuale non può essere inferiore alla precedente.";
    if (!Number.isFinite(values.totalAmount) || values.totalAmount <= 0) e.totalAmount = "Inserisci un importo maggiore di zero.";
    if (!Number.isFinite(values.totalM3) || values.totalM3 <= 0) e.totalM3 = "Inserisci un consumo totale maggiore di zero.";
    if (!Number.isFinite(values.fixedFee) || values.fixedFee < 0) e.fixedFee = "Inserisci una quota valida, anche 0.";
    if (Number.isFinite(values.fixedFee) && Number.isFinite(values.totalAmount) && values.fixedFee > values.totalAmount)
      e.fixedFee = "La quota fissa non può superare l'importo totale.";
    if (Number.isFinite(difference) && Number.isFinite(values.totalM3) && difference > values.totalM3)
      e.current = "La differenza supera il consumo totale della bolletta.";
    return e;
  }, [values, difference]);
  const show = Object.values(form).every((v) => v.trim()) && Object.keys(errors).length === 0;
  const update = (id: keyof WaterForm, value: string) => {
    if (/^[\d.,\s]*$/.test(value)) setForm((s) => ({ ...s, [id]: value }));
  };
  const reset = () => { setForm(emptyWaterForm); setDetails(false); localStorage.removeItem("calcolo-bolletta-water-values"); };
  const save = () => { localStorage.setItem("calcolo-bolletta-water-values", JSON.stringify(form)); setNotice(true); setTimeout(() => setNotice(false), 2200); };

  return <div className="water-workspace">
    <form className="card form-card water-form-card" onSubmit={(e) => e.preventDefault()}>
      <div className="heading"><b>01</b><div><h2>Dati della bolletta idrica</h2><p>Il contatore secondario misura il consumo del solo Appartamento 1.</p></div></div>
      <div className="grid">
        <WaterField id="previous" label="Lettura precedente · App. 1" hint="Lettura progressiva del contatore" suffix="m³" value={form.previous} onChange={update} error={form.previous ? errors.previous : undefined} />
        <WaterField id="current" label="Lettura attuale · App. 1" hint="Il consumo è la differenza tra le letture" suffix="m³" value={form.current} onChange={update} error={form.current ? errors.current : undefined} />
        <WaterField id="totalAmount" label="Importo totale bolletta" hint="Importo complessivo da ripartire" suffix="€" value={form.totalAmount} onChange={update} error={form.totalAmount ? errors.totalAmount : undefined} />
        <WaterField id="totalM3" label="Consumo totale fatturato" hint="Volume indicato in bolletta per il periodo" suffix="m³" value={form.totalM3} onChange={update} error={form.totalM3 ? errors.totalM3 : undefined} />
        <WaterField id="fixedFee" label="Quota fissa da dividere al 50%" hint="Inserisci la quota fissa idrica; usa 0 se non vuoi scorporarla" suffix="€" value={form.fixedFee} onChange={update} error={form.fixedFee ? errors.fixedFee : undefined} />
      </div>
      <section className="formula-box water-formula-box">
        <strong>Come viene ripartita la bolletta dell'acqua</strong>
        <div className="formula-main">Metodo 1: importo totale × quota dei m³ consumati</div>
        <div className="formula-main">Metodo 2: (quota fissa ÷ 2) + parte restante × quota dei m³ consumati</div>
        <p>La quota fissa è divisa in parti uguali solo nel Metodo 2. Tutto l'importo residuo è ripartito in base ai consumi rilevati.</p>
        <small>Questo strumento ripartisce una bolletta esistente; non ricostruisce la tariffazione ufficiale del gestore idrico.</small>
      </section>
      <div className="actions"><button type="button" onClick={reset}>Azzera</button><button className="link" type="button" onClick={save}>Salva valori</button></div>
      {notice && <p className="saved">Valori idrici salvati su questo dispositivo.</p>}
    </form>
    <aside className="card result water-result" aria-live="polite">
      <div className="heading"><b>02</b><div><h2>Ripartizione acqua</h2><p>Confronto tra i due criteri di ripartizione.</p></div></div>
      {show ? <>
        <section className="difference"><span>Consumo App. 1 · da contatore secondario</span><strong>{fmtWater(difference, difference % 1 ? 3 : 0)} <small>m³</small></strong><em>{fmtWater(shareOne * 100, 1)}% del totale · App. 2 {fmtWater(shareTwo * 100, 1)}%</em></section>
        <section className="method-card"><div className="method-title"><div><span>Metodo 1</span><h3>Proporzionale ai consumi</h3></div><small>Tutta la bolletta segue i m³</small></div>
          <div className="method-amounts">
            <div className="method-amount amber-text"><span>Appartamento 1</span><strong>€ {fmtWater(proportionalOne)}</strong><small>{fmtWater(difference, difference % 1 ? 3 : 0)} m³ · {fmtWater(shareOne * 100, 1)}%</small></div>
            <div className="method-amount blue-text"><span>Appartamento 2</span><strong>€ {fmtWater(proportionalTwo)}</strong><small>{fmtWater(m3Two, m3Two % 1 ? 3 : 0)} m³ · {fmtWater(shareTwo * 100, 1)}%</small></div>
          </div>
        </section>
        <section className="method-card emphasized"><div className="method-title"><div><span>Metodo 2</span><h3>Quota fissa al 50%</h3></div><small>Quota fissa uguale, resto a consumo</small></div>
          <div className="fixed-breakdown"><span>Quota fissa: € {fmtWater(values.fixedFee)} → € {fmtWater(fixedPerApartment)} ciascuno</span><span>Parte restante: € {fmtWater(variableAmount)} ripartita sui consumi</span></div>
          <div className="method-amounts">
            <div className="method-amount amber-text"><span>Appartamento 1</span><strong>€ {fmtWater(splitFixedOne)}</strong><small>€ {fmtWater(fixedPerApartment)} quota fissa + parte a consumo</small></div>
            <div className="method-amount blue-text"><span>Appartamento 2</span><strong>€ {fmtWater(splitFixedTwo)}</strong><small>€ {fmtWater(fixedPerApartment)} quota fissa + parte a consumo</small></div>
          </div>
        </section>
        <div className="comparison"><div><span>Differenza App. 1</span><strong>{splitFixedOne - proportionalOne >= 0 ? "+" : ""}€ {fmtWater(splitFixedOne - proportionalOne)}</strong></div><div><span>Differenza App. 2</span><strong>{splitFixedTwo - proportionalTwo >= 0 ? "+" : ""}€ {fmtWater(splitFixedTwo - proportionalTwo)}</strong></div></div>
        <div className="stats"><div><span>Quota fissa</span><strong>€ {fmtWater(values.fixedFee)}</strong></div><div><span>Parte restante</span><strong>€ {fmtWater(variableAmount)}</strong></div><div><span>Consumo totale</span><strong>{fmtWater(values.totalM3, 3)} m³</strong></div><div><span>Totale bolletta</span><strong>€ {fmtWater(values.totalAmount)}</strong></div></div>
        <button className="details" type="button" onClick={() => setDetails(!details)}>Dettaglio del calcolo <span>{details ? "⌃" : "⌄"}</span></button>
        {details && <div className="formula">
          <p><span>Consumo App. 1</span>{fmtWater(values.current, 3)} − {fmtWater(values.previous, 3)} = {fmtWater(difference, 3)} m³</p>
          <p><span>Consumo App. 2</span>{fmtWater(values.totalM3, 3)} − {fmtWater(difference, 3)} = {fmtWater(m3Two, 3)} m³</p>
          <p><span>Metodo proporzionale</span>App. 1: € {fmtWater(values.totalAmount)} × {fmtWater(shareOne * 100, 2)}% = € {fmtWater(proportionalOne)} · App. 2: € {fmtWater(proportionalTwo)}</p>
          <p><span>Metodo con quota fissa</span>€ {fmtWater(values.fixedFee)} ÷ 2 = € {fmtWater(fixedPerApartment)} ciascuno; parte restante € {fmtWater(variableAmount)} ripartita sui consumi.</p>
        </div>}
      </> : <div className="empty"><div>€</div><h3>Ripartizione automatica</h3><p>Inserisci le letture del contatore, l'importo totale, i m³ fatturati e la quota fissa.</p><small>Il consumo residuo è attribuito all'Appartamento 2</small></div>}
    </aside>
  </div>;
}
