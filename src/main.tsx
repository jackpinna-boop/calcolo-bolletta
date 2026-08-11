import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import "./style.css";

type FormState = {
  previous: string;
  current: string;
  totalAmount: string;
  totalKwh: string;
  fixedCosts: string;
};

const emptyForm: FormState = {
  previous: "",
  current: "",
  totalAmount: "",
  totalKwh: "",
  fixedCosts: "",
};

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
  return new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function Field({
  id,
  label,
  hint,
  suffix,
  value,
  onChange,
  error,
}: {
  id: keyof FormState;
  label: string;
  hint: string;
  suffix: string;
  value: string;
  onChange: (id: keyof FormState, value: string) => void;
  error?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className={`input-wrap ${error ? "input-error" : ""}`}>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={value}
          onChange={(e) => onChange(id, e.target.value)}
          aria-invalid={!!error}
        />
        <span>{suffix}</span>
      </div>
      <p className="hint">{hint}</p>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}

function App() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [details, setDetails] = useState(false);
  const [notice, setNotice] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("calcolo-bolletta-values");
    if (saved) {
      try {
        setForm({ ...emptyForm, ...JSON.parse(saved) });
      } catch {}
    }
  }, []);

  const values = useMemo(
    () => ({
      previous: parseNumber(form.previous),
      current: parseNumber(form.current),
      totalAmount: parseNumber(form.totalAmount),
      totalKwh: parseNumber(form.totalKwh),
      fixedCosts: parseNumber(form.fixedCosts),
    }),
    [form]
  );

  const difference = values.current - values.previous;
  const kwhTwo = values.totalKwh - difference;
  const shareOne = difference / values.totalKwh;
  const shareTwo = kwhTwo / values.totalKwh;

  // Metodo 1: l'intera bolletta viene ripartita in proporzione ai kWh.
  const proportionalOne = values.totalAmount * shareOne;
  const proportionalTwo = values.totalAmount * shareTwo;

  // Metodo 2: quota fissa + quota potenza al 50%, resto in proporzione ai consumi.
  const variableAmount = values.totalAmount - values.fixedCosts;
  const fixedPerApartment = values.fixedCosts / 2;
  const splitFixedOne = fixedPerApartment + variableAmount * shareOne;
  const splitFixedTwo = fixedPerApartment + variableAmount * shareTwo;

  const averageUnitPrice = values.totalAmount / values.totalKwh;

  const errors = useMemo(() => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!Number.isFinite(values.previous) || values.previous < 0)
      e.previous = "Inserisci una lettura valida.";
    if (!Number.isFinite(values.current) || values.current < 0)
      e.current = "Inserisci una lettura valida.";
    if (
      Number.isFinite(values.previous) &&
      Number.isFinite(values.current) &&
      values.current < values.previous
    )
      e.current = "La lettura attuale non può essere inferiore alla precedente.";
    if (!Number.isFinite(values.totalAmount) || values.totalAmount <= 0)
      e.totalAmount = "Inserisci un importo maggiore di zero.";
    if (!Number.isFinite(values.totalKwh) || values.totalKwh <= 0)
      e.totalKwh = "Inserisci un consumo maggiore di zero.";
    if (!Number.isFinite(values.fixedCosts) || values.fixedCosts < 0)
      e.fixedCosts = "Inserisci un importo valido, anche 0.";
    if (
      Number.isFinite(values.fixedCosts) &&
      Number.isFinite(values.totalAmount) &&
      values.fixedCosts > values.totalAmount
    )
      e.fixedCosts = "I costi fissi non possono superare il totale della bolletta.";
    if (
      Number.isFinite(difference) &&
      Number.isFinite(values.totalKwh) &&
      difference > values.totalKwh
    )
      e.current = "La differenza supera il consumo totale: il consumo residuo sarebbe negativo.";
    return e;
  }, [values, difference]);

  const show =
    Object.values(form).every((v) => v.trim()) &&
    Object.keys(errors).length === 0;

  const update = (id: keyof FormState, value: string) => {
    if (/^[\d.,\s]*$/.test(value)) setForm((s) => ({ ...s, [id]: value }));
  };

  const reset = () => {
    setForm(emptyForm);
    setDetails(false);
    localStorage.removeItem("calcolo-bolletta-values");
  };

  const save = () => {
    localStorage.setItem("calcolo-bolletta-values", JSON.stringify(form));
    setNotice(true);
    setTimeout(() => setNotice(false), 2200);
  };

  return (
    <main>
      <div className="ambient one" />
      <div className="ambient two" />
      <section className="shell">
        <header>
          <div className="logo">€</div>
          <div>
            <p className="eyebrow">Strumento personale</p>
            <h1>Calcolo Bolletta</h1>
            <p className="intro">
              Confronta contemporaneamente la ripartizione proporzionale e quella con costi fissi divisi al 50%.
            </p>
          </div>
          <div className="privacy">
            <i />I dati restano sul dispositivo
          </div>
        </header>

        <div className="workspace">
          <form className="card form-card" onSubmit={(e) => e.preventDefault()}>
            <div className="heading">
              <b>01</b>
              <div>
                <h2>Dati della bolletta</h2>
                <p>Il contascatti misura il consumo del solo Appartamento 1.</p>
              </div>
            </div>

            <div className="grid">
              <Field
                id="previous"
                label="Contascatti precedente · App. 1"
                hint="Lettura progressiva precedente"
                suffix="scatti"
                value={form.previous}
                onChange={update}
                error={form.previous ? errors.previous : undefined}
              />
              <Field
                id="current"
                label="Contascatti attuale · App. 1"
                hint="Il consumo è dato dalla differenza"
                suffix="scatti"
                value={form.current}
                onChange={update}
                error={form.current ? errors.current : undefined}
              />
              <Field
                id="totalAmount"
                label="Importo totale bolletta"
                hint="Importo complessivo dei due appartamenti"
                suffix="€"
                value={form.totalAmount}
                onChange={update}
                error={form.totalAmount ? errors.totalAmount : undefined}
              />
              <Field
                id="totalKwh"
                label="Consumo totale bolletta"
                hint="Consumo del periodo fatturato"
                suffix="kWh"
                value={form.totalKwh}
                onChange={update}
                error={form.totalKwh ? errors.totalKwh : undefined}
              />
              <Field
                id="fixedCosts"
                label="Costi fissi da dividere al 50%"
                hint="Somma quota fissa + quota potenza della bolletta"
                suffix="€"
                value={form.fixedCosts}
                onChange={update}
                error={form.fixedCosts ? errors.fixedCosts : undefined}
              />
            </div>

            <div className="fixed-note">
              <strong>Cosa inserire nei costi fissi?</strong>
              <span>
                Somma le voci indipendenti dai kWh, ad esempio “Quota fissa” e “Quota potenza”. Nella bolletta analizzata: 37,86 € + 23,72 € = 61,58 €.
              </span>
            </div>

            <div className="actions">
              <button type="button" onClick={reset}>Azzera</button>
              <button className="link" type="button" onClick={save}>Salva valori</button>
            </div>
            {notice && <p className="saved">Valori salvati su questo dispositivo.</p>}
          </form>

          <aside className="card result" aria-live="polite">
            <div className="heading">
              <b>02</b>
              <div>
                <h2>Confronto ripartizione</h2>
                <p>I due criteri sono mostrati contemporaneamente.</p>
              </div>
            </div>

            {show ? (
              <>
                <section className="difference">
                  <span>Consumo App. 1 · da contascatti</span>
                  <strong>{fmt(difference, difference % 1 ? 3 : 0)} <small>kWh</small></strong>
                  <em>
                    {fmt(shareOne * 100, 1)}% del totale · App. 2 {fmt(shareTwo * 100, 1)}%
                  </em>
                </section>

                <section className="method-card">
                  <div className="method-title">
                    <div>
                      <span>Metodo 1</span>
                      <h3>Proporzionale ai consumi</h3>
                    </div>
                    <small>Tutta la bolletta segue i kWh</small>
                  </div>
                  <div className="method-amounts">
                    <div className="method-amount amber-text">
                      <span>Appartamento 1</span>
                      <strong>€ {fmt(proportionalOne)}</strong>
                      <small>{fmt(difference, difference % 1 ? 3 : 0)} kWh · {fmt(shareOne * 100, 1)}%</small>
                    </div>
                    <div className="method-amount blue-text">
                      <span>Appartamento 2</span>
                      <strong>€ {fmt(proportionalTwo)}</strong>
                      <small>{fmt(kwhTwo, kwhTwo % 1 ? 3 : 0)} kWh · {fmt(shareTwo * 100, 1)}%</small>
                    </div>
                  </div>
                </section>

                <section className="method-card emphasized">
                  <div className="method-title">
                    <div>
                      <span>Metodo 2</span>
                      <h3>Costi fissi 50/50</h3>
                    </div>
                    <small>Fissi uguali, consumi proporzionali</small>
                  </div>
                  <div className="method-amounts">
                    <div className="method-amount amber-text">
                      <span>Appartamento 1</span>
                      <strong>€ {fmt(splitFixedOne)}</strong>
                      <small>€ {fmt(fixedPerApartment)} fissi + quota variabile</small>
                    </div>
                    <div className="method-amount blue-text">
                      <span>Appartamento 2</span>
                      <strong>€ {fmt(splitFixedTwo)}</strong>
                      <small>€ {fmt(fixedPerApartment)} fissi + quota variabile</small>
                    </div>
                  </div>
                </section>

                <div className="comparison">
                  <div>
                    <span>Differenza App. 1</span>
                    <strong>{splitFixedOne - proportionalOne >= 0 ? "+" : ""}€ {fmt(splitFixedOne - proportionalOne)}</strong>
                  </div>
                  <div>
                    <span>Differenza App. 2</span>
                    <strong>{splitFixedTwo - proportionalTwo >= 0 ? "+" : ""}€ {fmt(splitFixedTwo - proportionalTwo)}</strong>
                  </div>
                </div>

                <div className="stats">
                  <div>
                    <span>Costi fissi totali</span>
                    <strong>€ {fmt(values.fixedCosts)}</strong>
                  </div>
                  <div>
                    <span>Parte variabile</span>
                    <strong>€ {fmt(variableAmount)}</strong>
                  </div>
                  <div>
                    <span>Totale bolletta</span>
                    <strong>€ {fmt(values.totalAmount)}</strong>
                  </div>
                  <div>
                    <span>Prezzo medio</span>
                    <strong>{fmt(averageUnitPrice, 4)} €/kWh</strong>
                  </div>
                </div>

                <button className="details" type="button" onClick={() => setDetails(!details)}>
                  Dettaglio del calcolo <span>{details ? "⌃" : "⌄"}</span>
                </button>

                {details && (
                  <div className="formula">
                    <p>
                      <span>Consumo App. 1</span>
                      {fmt(values.current, 3)} − {fmt(values.previous, 3)} = {fmt(difference, 3)} kWh
                    </p>
                    <p>
                      <span>Metodo proporzionale</span>
                      App. 1: € {fmt(values.totalAmount)} × {fmt(shareOne * 100, 2)}% = € {fmt(proportionalOne)} · App. 2: € {fmt(proportionalTwo)}
                    </p>
                    <p>
                      <span>Scorporo costi fissi</span>
                      € {fmt(values.totalAmount)} − € {fmt(values.fixedCosts)} = € {fmt(variableAmount)} da ripartire secondo i consumi
                    </p>
                    <p>
                      <span>Quota fissa per appartamento</span>
                      € {fmt(values.fixedCosts)} ÷ 2 = € {fmt(fixedPerApartment)} ciascuno
                    </p>
                    <p>
                      <span>Quote finali con fissi 50/50</span>
                      App. 1 € {fmt(splitFixedOne)} · App. 2 € {fmt(splitFixedTwo)}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="empty">
                <div>€</div>
                <h3>Confronto automatico</h3>
                <p>Compila tutti i campi: verranno mostrati insieme entrambi i metodi di ripartizione.</p>
                <small>Ogni metodo restituisce App. 1 + App. 2 = totale bolletta</small>
              </div>
            )}
          </aside>
        </div>

        <footer>
          Le letture del contascatti sono progressive · Il consumo della bolletta riguarda il singolo periodo · 1 scatto corrisponde a 1 kWh
        </footer>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
