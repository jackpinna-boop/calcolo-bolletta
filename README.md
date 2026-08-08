# Calcolo Bolletta

Applicazione web gratuita per ripartire una bolletta elettrica tra due appartamenti. Il contascatti progressivo misura il consumo dell'Appartamento 1; all'Appartamento 2 viene attribuito il consumo residuo del periodo.

## Pubblicazione gratuita su GitHub Pages

1. Accedi a GitHub e crea un nuovo repository, per esempio `calcolo-bolletta`.
2. Estrai questo pacchetto e carica nel repository **tutti i file**, compresa la cartella `.github`.
3. Apri **Settings → Pages** nel repository.
4. In **Build and deployment → Source**, seleziona **GitHub Actions**.
5. Apri la scheda **Actions** e attendi il completamento del flusso “Pubblica su GitHub Pages”.
6. Il sito sarà disponibile all'indirizzo `https://NOMEUTENTE.github.io/calcolo-bolletta/`.

Ogni modifica inviata al ramo `main` produrrà automaticamente una nuova pubblicazione.

### Se non vedi la cartella `.github` su Mac

La cartella è nascosta perché il nome inizia con un punto. Nel Finder premi:

`Command + Shift + .`

La cartella apparirà in trasparenza. All'interno deve essere presente:

`.github/workflows/deploy.yml`

Nel pacchetto è inclusa anche una copia visibile chiamata
`WORKFLOW-GITHUB-PAGES.yml`. È solo una copia di controllo: GitHub esegue
automaticamente il workflow soltanto quando il file si trova nel percorso
`.github/workflows/deploy.yml`.

## Prova sul computer

Richiede Node.js 22 o successivo:

```bash
npm install
npm run dev
```

Per verificare la versione finale:

```bash
npm run build
npm run preview
```

## Calcoli

- differenza contascatti = lettura attuale − lettura precedente;
- prezzo medio = importo totale ÷ consumo totale del periodo;
- quota Appartamento 1 = differenza contascatti × prezzo medio;
- quota Appartamento 2 = importo totale − quota Appartamento 1.

Le letture sono progressive, mentre il consumo della bolletta riguarda esclusivamente il periodo fatturato.

## Configurazione Supabase

1. Crea un progetto su Supabase.
2. Apri **SQL Editor → New query**, incolla `supabase/schema.sql` ed esegui lo script.
3. In **Authentication → URL Configuration** imposta come Site URL `https://NOMEUTENTE.github.io/calcolo-bolletta/` e aggiungi lo stesso indirizzo ai Redirect URLs.
4. In GitHub apri **Settings → Secrets and variables → Actions**.
5. In **Variables** crea `VITE_SUPABASE_URL` con il Project URL.
6. In **Secrets** crea `VITE_SUPABASE_PUBLISHABLE_KEY` con la Publishable key (o la chiave `anon` legacy).
7. Rilancia il workflow da **Actions → Pubblica su GitHub Pages → Run workflow**.

Non usare mai nel frontend la chiave `service_role`, una Secret key, la password del database o la stringa PostgreSQL. Lo schema abilita la Row Level Security e consente a ogni utente autenticato di accedere soltanto alle proprie bollette.

L'app permette registrazione/accesso, salvataggio, consultazione dello storico, modifica e cancellazione. I valori calcolati vengono ricalcolati dal database tramite trigger prima di ogni inserimento o aggiornamento.
