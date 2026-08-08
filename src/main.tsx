import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import "./style.css";

type FormState = { previous: string; current: string; totalAmount: string; totalKwh: string };
const emptyForm: FormState = { previous: "", current: "", totalAmount: "", totalKwh: "" };

function parseNumber(value: string) {
  const cleaned = value.trim().replace(/\s/g, "");
  if (!cleaned) return NaN;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const decimalPos = Math.max(lastComma, lastDot);
  if (decimalPos < 0) return Number(cleaned);
  const integer = cleaned.slice(0, decimalPos).replace(/[.,]/g, "");
  const decimals = cleaned.slice(decimalPos + 1).replace(/[.,]/g, "");
  return Number(`${integer}.${decimals}`);
}

function fmt(value: number, digits = 2) {
  return new Intl.NumberFormat("it-IT", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

function Field({ id, label, hint, suffix, value, onChange, error }: { id: keyof FormState; label: string; hint: string; suffix: string; value: string; onChange: (id: keyof FormState, value: string) => void; error?: string }) {
  return <div className="field"><label htmlFor={id}>{label}</label><div className={`input-wrap ${error ? "input-error" : ""}`}><input id={id} inputMode="decimal" autoComplete="off" placeholder="0" value={value} onChange={e => onChange(id, e.target.value)} aria-invalid={!!error}/><span>{suffix}</span></div><p className="hint">{hint}</p>{error && <p className="error" role="alert">{error}</p>}</div>;
}

function App() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [details, setDetails] = useState(false);
  const [notice, setNotice] = useState(false);
  useEffect(() => { const saved = localStorage.getItem("calcolo-bolletta-values"); if (saved) try { setForm(JSON.parse(saved)); } catch {} }, []);
  const values = useMemo(() => ({ previous: parseNumber(form.previous), current: parseNumber(form.current), totalAmount: parseNumber(form.totalAmount), totalKwh: parseNumber(form.totalKwh) }), [form]);
  const difference = values.current - values.previous;
  const unitPrice = values.totalAmount / values.totalKwh;
  const amountOne = difference * unitPrice;
  const kwhTwo = values.totalKwh - difference;
  const amountTwo = values.totalAmount - amountOne;
  const errors = useMemo(() => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!Number.isFinite(values.previous) || values.previous < 0) e.previous = "Inserisci una lettura valida.";
    if (!Number.isFinite(values.current) || values.current < 0) e.current = "Inserisci una lettura valida.";
    if (Number.isFinite(values.previous) && Number.isFinite(values.current) && values.current < values.previous) e.current = "La lettura attuale non può essere inferiore alla precedente.";
    if (!Number.isFinite(values.totalAmount) || values.totalAmount <= 0) e.totalAmount = "Inserisci un importo maggiore di zero.";
    if (!Number.isFinite(values.totalKwh) || values.totalKwh <= 0) e.totalKwh = "Inserisci un consumo maggiore di zero.";
    if (Number.isFinite(difference) && Number.isFinite(values.totalKwh) && difference > values.totalKwh) e.current = "La differenza supera il consumo totale: il consumo residuo sarebbe negativo.";
    return e;
  }, [values, difference]);
  const show = Object.values(form).every(v => v.trim()) && Object.keys(errors).length === 0;
  const update = (id: keyof FormState, value: string) => { if (/^[\d.,\s]*$/.test(value)) setForm(s => ({ ...s, [id]: value })); };
  const reset = () => { setForm(emptyForm); setDetails(false); localStorage.removeItem("calcolo-bolletta-values"); };
  const save = () => { localStorage.setItem("calcolo-bolletta-values", JSON.stringify(form)); setNotice(true); setTimeout(() => setNotice(false), 2200); };

  return <main><div className="ambient one"/><div className="ambient two"/><section className="shell"><header><div className="logo">€</div><div><p className="eyebrow">Strumento personale</p><h1>Calcolo Bolletta</h1><p className="intro">Ripartisci automaticamente un’unica bolletta elettrica tra due appartamenti.</p></div><div className="privacy"><i/>I dati restano sul dispositivo</div></header><div className="workspace"><form className="card form-card" onSubmit={e => e.preventDefault()}><div className="heading"><b>01</b><div><h2>Dati della bolletta</h2><p>Il contascatti misura il consumo del solo Appartamento 1.</p></div></div><div className="grid"><Field id="previous" label="Contascatti precedente · App. 1" hint="Lettura progressiva precedente" suffix="scatti" value={form.previous} onChange={update} error={form.previous ? errors.previous : undefined}/><Field id="current" label="Contascatti attuale · App. 1" hint="Il consumo è dato dalla differenza" suffix="scatti" value={form.current} onChange={update} error={form.current ? errors.current : undefined}/><Field id="totalAmount" label="Importo totale bolletta" hint="Importo complessivo dei due appartamenti" suffix="€" value={form.totalAmount} onChange={update} error={form.totalAmount ? errors.totalAmount : undefined}/><Field id="totalKwh" label="Consumo totale bolletta" hint="Consumo del solo periodo fatturato" suffix="kWh" value={form.totalKwh} onChange={update} error={form.totalKwh ? errors.totalKwh : undefined}/></div><div className="actions"><button type="button" onClick={reset}>Azzera</button><button className="link" type="button" onClick={save}>Salva valori</button></div>{notice && <p className="saved">Valori salvati su questo dispositivo.</p>}</form><aside className="card result" aria-live="polite"><div className="heading"><b>02</b><div><h2>Ripartizione</h2><p>Importi aggiornati automaticamente.</p></div></div>{show ? <><section className="difference"><span>Differenza contascatti · consumo App. 1</span><strong>{fmt(difference, difference % 1 ? 3 : 0)} <small>kWh</small></strong><em>{fmt(values.current, 3)} − {fmt(values.previous, 3)}</em></section><section className="amount amber"><span>Appartamento 1 · con contascatti</span><strong>€ {fmt(amountOne)}</strong><small>{fmt(difference, difference % 1 ? 3 : 0)} kWh × {fmt(unitPrice, 4)} €/kWh</small></section><section className="amount blue"><span>Appartamento 2 · consumo residuo</span><strong>€ {fmt(amountTwo)}</strong><small>{fmt(kwhTwo, kwhTwo % 1 ? 3 : 0)} kWh attribuiti</small></section><div className="stats"><div><span>Totale ripartito</span><strong>€ {fmt(amountOne + amountTwo)}</strong></div><div><span>Prezzo medio</span><strong>{fmt(unitPrice, 4)} €/kWh</strong></div></div><button className="details" type="button" onClick={() => setDetails(!details)}>Dettaglio del calcolo <span>{details ? "⌃" : "⌄"}</span></button>{details && <div className="formula"><p><span>Consumo App. 1</span>{fmt(values.current, 3)} − {fmt(values.previous, 3)} = {fmt(difference, 3)} kWh</p><p><span>Prezzo medio</span>€ {fmt(values.totalAmount)} ÷ {fmt(values.totalKwh, 3)} = {fmt(unitPrice, 4)} €/kWh</p><p><span>Quote finali</span>App. 1 € {fmt(amountOne)} · App. 2 € {fmt(amountTwo)}</p></div>}</> : <div className="empty"><div>€</div><h3>Ripartizione automatica</h3><p>Compila tutti i campi: gli importi appariranno immediatamente.</p><small>App. 1 + App. 2 = totale bolletta</small></div>}</aside></div><footer>Le letture del contascatti sono progressive · Il consumo della bolletta riguarda il singolo periodo · 1 scatto corrisponde a 1 kWh</footer></section></main>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
