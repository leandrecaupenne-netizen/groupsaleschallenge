# CLAUDE.md — Devoteam World Cup Sales Challenge 2026

> Brief technique complet pour passer la maquette HTML en application production-ready.
> Document destiné à Claude Code (Anthropic) pour piloter l'implémentation.

---

## 1. Contexte projet

**Projet** : Devoteam World Cup Sales Challenge 2026.

**Nature** : challenge commercial à l'échelle du Groupe Devoteam, sur le thème de la Coupe du Monde de football. Durée : du 1er juin au 3 juillet 2026 (5 semaines). Cérémonie de remise des prix à Paris, le 9 juillet, au Victoria Paris (l'Arc).

**Périmètre** :
- 35 équipes (32 actives, Serbia/Tunisia/Morocco exclus)
- 377 commerciaux (Group Sales)
- 3 classements principaux + 4 special awards
- Règles VAR : Yellow Card / Red Card selon meetings et GM

**Source de données** : Jose (Group Sales) maintient une Google Sheet à partir des reports OneBI. La plateforme doit lire cette Sheet (read-only depuis le front).

**Stakeholders** :
- Léandre CAUPENNE : porteur du projet côté animation/plateforme
- Jose : data owner, alimente la Google Sheet
- Aline : organise les meetings projet
- Alexis : co-anime le post-match commentary (hors scope de ce brief)

---

## 2. État actuel : ce qui existe

Un fichier HTML self-contained (`devoteam_world_cup_platform.html`, ~225 KB) qui contient :

**Stack technique** :
- HTML / CSS / Vanilla JavaScript (pas de framework, pas de build step)
- Données embedded en JSON dans un `<script type="application/json">`
- Aucune dépendance externe (CDN, fonts, libs) : tout est inline
- Logo officiel Sales Challenge embedé en base64

**Structure visuelle** :
- Header bleu marine FIFA avec logo + pastille LIVE + timestamp
- Hero podium (Top 3 équipes, World Cup Winner mis en valeur en or)
- 5 onglets sticky : Team Ranking / Golden Boot / Playmaker / Special Awards / My Position
- Footer avec countdown et infos finale Paris

**Fonctionnalités** :
- Tableau des 32 équipes triées par avg PS Bookings, avec recherche
- Click sur une équipe → modal avec les membres triés par contribution PS Total, leurs stats, leurs yellow cards
- Top 5 Golden Boot (PS Bookings NB) avec badges yellow card
- Top 5 Playmaker (Opportunities créées)
- Special Awards : Licence (Top 3), Rookie of the Year (Top 3), AI Play (TBD panel), Transformative Deal (TBD panel)
- My Position : search par nom, affiche rangs dans chaque catégorie + status cards

**Palette** :
```css
--usa-red: #C8102E;
--mex-green: #006847;
--navy: #1E2A78;
--navy-2: #2D3550;
--gold: #F2C75C;
--cream: #F8F4ED;
```

**Wording** : 100% football (Golden Boot, Playmaker, Yellow Card, Red Card, VAR, World Cup Winner). Noms d'équipes en majuscules comme dans la Sheet (LUXEMBOURG, FR - M Cloud, DENMARK, etc.).

---

## 3. Objectif : ce qu'on construit

Transformer cette maquette en application production-ready, hébergée publiquement, avec données live alimentées par la Google Sheet de Jose.

**Architecture cible** :

```
┌──────────────────────────────────────┐
│  Jose (Group Sales)                  │
│  alimente la sheet depuis OneBI      │
└──────────┬───────────────────────────┘
           │ écrit
           ▼
┌──────────────────────────────────────┐
│  Google Sheet                        │
│  (4 onglets standardisés)            │
└──────────┬───────────────────────────┘
           │ lu par
           ▼
┌──────────────────────────────────────┐
│  Google Apps Script (Web App)        │
│  API REST publique, returns JSON     │
└──────────┬───────────────────────────┘
           │ fetch via HTTPS
           ▼
┌──────────────────────────────────────┐
│  Plateforme HTML (hébergée Vercel)   │
│  - Auth par mot de passe             │
│  - Polling toutes les 30 secondes    │
│  - Bouton refresh manuel             │
│  - Last updated timestamp visible    │
└──────────┬───────────────────────────┘
           │ accédée par
           ▼
┌──────────────────────────────────────┐
│  Tous les commerciaux Devoteam       │
│  ~400 personnes, sur web/mobile      │
└──────────────────────────────────────┘
```

**Stack final** : aucune ajout. Toujours HTML/CSS/Vanilla JS. Pas de framework. Le but est de garder la simplicité du fichier unique tout en ajoutant la connexion live.

---

## 4. Roadmap d'implémentation (5 étapes)

### Étape 1 — Préparer la Google Sheet (briefing pour Jose)

Léandre doit transmettre à Jose la structure exacte à créer. **Critique** : les noms d'onglets, de colonnes et l'ordre des colonnes doivent matcher exactement, sinon l'Apps Script casse.

Le doc de spec pour Jose est dans `SHEET_SPEC.md` (à créer dans ce projet).

### Étape 2 — Déployer le back-end Apps Script

Léandre crée le script (code prêt fourni dans ce brief, section 6), le déploie en "Web App" avec accès "Anyone, even anonymous", et récupère l'URL `/exec`. Cette URL devient `APPS_SCRIPT_URL` dans le HTML.

### Étape 3 — Modifier le HTML pour le live

Claude Code se charge de :
- Ajouter écran de login par mot de passe (simple, avec localStorage)
- Remplacer le bloc JSON statique par un fetch vers `APPS_SCRIPT_URL`
- Implémenter polling toutes les 30 secondes
- Connecter le timestamp `Last updated` au champ `updated_at` de l'API
- Ajouter un bouton refresh manuel à côté du timestamp
- Gérer les états : loading, error, retry
- Garantir que l'UX reste fluide pendant les refresh (pas de flash, pas de scroll perdu)

### Étape 4 — Hébergement Vercel

Le GitHub de Léandre est connecté à Vercel : importer le repo, preset `Other` (pas de build), déployer. Chaque push sur `main` redéploie automatiquement. Configurer un sous-domaine accrocheur (suggestion : `devoteam-world-cup-2026.vercel.app` ou `dvt-sales-challenge.vercel.app`).

### Étape 5 — Domaine custom (optionnel, après validation)

Si Devoteam IT joue le jeu, possibilité d'ajouter un sous-domaine maison type `salechallenge.devoteam.com` via configuration DNS. À voir avec l'IT Devoteam.

---

## 5. SHEET_SPEC.md — structure de la Google Sheet

> ⚠️ **MISE À JOUR (mai 2026).** Après inspection du vrai fichier OneBI, on ne crée
> **plus** d'onglets `Teams`/`People`. Le backend lit directement les onglets existants
> `Team Ranking` (headers ligne 2) et `Challenge Ranking` (headers ligne 1), exclut
> automatiquement Morocco/Serbia/Tunisia (→ 32 équipes, 377 personnes), et prend le mot
> de passe / période / dates dans les constantes du script (onglet `Config` optionnel).
> **La spec à jour et faisant foi est dans le fichier [`SHEET_SPEC.md`](./SHEET_SPEC.md).**
> La structure ci-dessous décrit le format "idéal standardisé" d'origine, conservée pour
> mémoire.

À transmettre tel quel à Jose.

**Nom du fichier suggéré** : `Devoteam World Cup 2026 — Live Data`

**Permissions** : Léandre en lecture/écriture (pour configurer), Jose en écriture, tout le monde en lecture pour le compte de service Apps Script.

### Onglet 1 : `Teams`

Ligne 1 = headers, données à partir de la ligne 2.

| Colonne | Type | Exemple | Notes |
|---------|------|---------|-------|
| `country` | string | LUXEMBOURG | Nom officiel de l'équipe, identique à `team` dans People |
| `members` | int | 4 | Nombre de membres actifs |
| `total_ps` | number | 8056326.49 | Total PS Bookings cumulé de l'équipe |
| `avg_ps` | number | 2014081.62 | Average PS Bookings per person (sert au classement) |
| `avg_gm` | number | 0.27 | Average GM en décimal (0.27 = 27%) |
| `avg_meetings` | number | 5.67 | Average meetings per week |
| `avg_opps` | number | 6.75 | Average opportunities created |

32 équipes attendues (les 3 exclus Serbia/Tunisia/Morocco ne doivent pas figurer).

### Onglet 2 : `People`

Ligne 1 = headers, données à partir de la ligne 2. 377 lignes attendues.

| Colonne | Type | Exemple | Notes |
|---------|------|---------|-------|
| `name` | string | Louis MASSON | Nom complet |
| `team` | string | LUXEMBOURG | Doit matcher exactement un `country` de Teams |
| `tenure` | string | Over a year | Valeurs possibles : `Over a year`, `Over 6 months`, `<6 months` |
| `ps_total` | number | 2699249.5 | PS Bookings Total (Total business) |
| `ps_total_gm` | number | 0.30 | GM en décimal sur PS Total |
| `ps_nb` | number | 712462 | PS Bookings New Business (sert Golden Boot) |
| `ps_nb_gm` | number | 0.29 | GM en décimal sur PS NB |
| `licence_gm` | number | 26906 | Licence GM Amount (sert award Licence) |
| `meetings` | number | 7.09 | Meetings par semaine (sert yellow card si < 5) |
| `opps` | number | 17 | Opportunities créées (sert Playmaker, déjà filtré Stage 2+ et > 50K€) |

**Important** :
- Les pourcentages (`gm`) doivent être en **décimal** (0.27 et pas 27 ni "27%")
- Les valeurs vides ou erreurs (`#DIV/0!`, `#N/A`) doivent être remplacées par 0 ou laissées vides
- Le `name` doit être unique (pas de doublons)
- Le `team` doit obligatoirement matcher un `country` dans Teams, sinon la personne n'apparaît pas dans le drilldown

### Onglet 3 : `Config`

| key | value | description |
|-----|-------|-------------|
| `password` | `devoteam2026` | Mot de passe d'accès à la plateforme |
| `last_update` | `2026-06-15T14:30:00Z` | Timestamp ISO, à mettre à jour à chaque update manuel |
| `period` | `Week 3 of 5` | Texte affiché dans le header |
| `challenge_start` | `2026-06-01` | Date début du challenge |
| `challenge_end` | `2026-07-03` | Date fin du challenge |

**Pour Jose** : après chaque update des onglets Teams et People, mettre à jour la cellule `last_update` avec le timestamp courant. Formule Google Sheets pour le faire automatiquement : `=TEXT(NOW(),"YYYY-MM-DD\"T\"HH:MM:SS\"Z\"")` à placer dans la cellule value de la ligne `last_update`.

### Onglet 4 : `Special Awards` (optionnel, pour AI Play et Transformative Deal)

À remplir une fois les awards sélectionnés par les jurys.

| key | name | team | description |
|-----|------|------|-------------|
| `ai_play_winner` | Louis MASSON | LUXEMBOURG | Sélectionné par l'AI Agency pour son deal sur ... |
| `transformative_deal_winner` | Carlos Maraui | ES Growth 1 | Sélectionné par Group Sales pour ... |

Si pas rempli, la plateforme affiche "To be selected after the challenge" comme actuellement.

---

## 6. Apps Script back-end (code prêt à déployer)

> ⚠️ **MISE À JOUR (mai 2026).** Le code ci-dessous est l'ébauche d'origine (qui lisait
> des onglets `Teams`/`People`). **Le code réellement déployé est dans
> [`apps_script_backend.gs`](./apps_script_backend.gs)** : il lit les onglets existants
> `Team Ranking` / `Challenge Ranking`, mappe les colonnes par nom (insensible à la
> casse/espaces/retours ligne), exclut Morocco/Serbia/Tunisia, et porte le mot de passe /
> période / dates dans un bloc `SETTINGS`. C'est ce fichier qui fait foi. Le bloc ci-dessous
> est conservé pour mémoire.

```javascript
// ============================================
// Devoteam World Cup 2026 — Backend API
// ============================================

const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

// CORS-friendly JSON response
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Read a sheet as array of objects (headers from row 1)
function readSheetAsObjects(sheetName) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1)
    .filter(row => row.some(cell => cell !== '' && cell !== null))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        let v = row[i];
        // Convert numeric strings to numbers if possible, ignore errors
        if (typeof v === 'string' && v.startsWith('#')) v = 0;
        obj[h] = v;
      });
      return obj;
    });
}

// Read config as flat key/value object
function readConfig() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Config');
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  const config = {};
  data.slice(1).forEach(row => {
    if (row[0]) config[row[0]] = row[1];
  });
  return config;
}

// Read special awards (optional sheet)
function readSpecialAwards() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Special Awards');
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return {};
  const headers = data[0];
  const awards = {};
  data.slice(1).forEach(row => {
    if (row[0]) {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      awards[row[0]] = obj;
    }
  });
  return awards;
}

// Main GET endpoint
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'data';
  
  try {
    if (action === 'data') {
      const teams = readSheetAsObjects('Teams');
      const peopleRaw = readSheetAsObjects('People');
      const config = readConfig();
      const specialAwards = readSpecialAwards();
      
      // Compute derived fields for people
      const people = peopleRaw.map(p => {
        const tenure = String(p.tenure || '');
        return {
          ...p,
          is_rookie: tenure.includes('months') || tenure.includes('<'),
          yellow_meetings: (p.meetings || 0) < 5,
          yellow_gm: (p.ps_total_gm || 0) < 0.25 && (p.ps_total || 0) > 0
        };
      });
      
      return jsonResponse({
        teams,
        people,
        updated_at: config.last_update || new Date().toISOString(),
        period: config.period || 'Current',
        challenge_dates: {
          start: config.challenge_start || '2026-06-01',
          end: config.challenge_end || '2026-07-03'
        },
        special_awards: specialAwards
      });
    }
    
    if (action === 'ping') {
      return jsonResponse({ ok: true, time: new Date().toISOString() });
    }
    
    return jsonResponse({ error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ error: err.message, stack: err.stack });
  }
}

// Password verification endpoint (POST)
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    if (data.action === 'verify_password') {
      const config = readConfig();
      const correctPassword = config.password || '';
      return jsonResponse({
        ok: String(data.password) === String(correctPassword)
      });
    }
    
    return jsonResponse({ error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}
```

**Déploiement** :
1. Coller le code dans l'éditeur Apps Script
2. Sauver (Ctrl+S), nommer le projet `Devoteam World Cup API`
3. Cliquer Déployer → Nouveau déploiement
4. Type : `Application Web`
5. Description : `v1`
6. Exécuter en tant que : `Moi (votre email)`
7. Accès : `Tous, même les utilisateurs anonymes`
8. Cliquer Déployer, autoriser quand demandé
9. **Copier l'URL** qui ressemble à `https://script.google.com/macros/s/AKfycby.../exec`
10. Tester en collant l'URL + `?action=ping` dans le navigateur, doit retourner `{"ok":true,"time":"..."}`

Cette URL est la variable `APPS_SCRIPT_URL` à utiliser dans le HTML.

---

## 7. Modifications à apporter au HTML

### 7.1 Configuration en haut du script

Ajouter en tout début de la balise `<script>` (juste après `'use strict';`) :

```javascript
const CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/REPLACE_ME/exec',
  POLL_INTERVAL_MS: 30000,  // 30 secondes
  SESSION_KEY: 'devoteam_wc_session_v1'
};
```

### 7.2 Supprimer le bloc data inline

Supprimer le bloc :
```html
<script id="data" type="application/json">__CHALLENGE_DATA__</script>
```

Et la ligne :
```javascript
const DATA = JSON.parse(document.getElementById('data').textContent);
const { teams, people, updated_at, period, challenge_dates } = DATA;
```

Remplacer par une variable mutable :
```javascript
let DATA = null;
let teams = [], people = [], updated_at = null, period = '', challenge_dates = {};
let sortedTeams = [], sortedGoldenBoot = [], sortedPlaymaker = [], sortedPSTotal = [], sortedLicence = [], sortedRookies = [];
```

### 7.3 Fonction de fetch

```javascript
async function fetchData() {
  try {
    const res = await fetch(CONFIG.APPS_SCRIPT_URL + '?action=data');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    
    DATA = data;
    teams = data.teams || [];
    people = (data.people || []).filter(p => p.name); // ignorer lignes vides
    updated_at = data.updated_at;
    period = data.period;
    challenge_dates = data.challenge_dates;
    
    // Recalculer les classements
    sortedTeams = [...teams].sort((a,b) => (b.avg_ps||0) - (a.avg_ps||0));
    sortedGoldenBoot = [...people].sort((a,b) => (b.ps_nb||0) - (a.ps_nb||0));
    sortedPlaymaker = [...people].sort((a,b) => (b.opps||0) - (a.opps||0));
    sortedPSTotal = [...people].sort((a,b) => (b.ps_total||0) - (a.ps_total||0));
    sortedLicence = [...people].filter(p => p.licence_gm > 0).sort((a,b) => b.licence_gm - a.licence_gm);
    sortedRookies = [...people].filter(p => p.is_rookie).sort((a,b) => (b.ps_nb||0) - (a.ps_nb||0));
    
    return true;
  } catch (err) {
    console.error('Fetch failed:', err);
    return false;
  }
}
```

### 7.4 Écran de login

À insérer comme premier état de l'app (avant le render normal). Quand `localStorage.getItem(CONFIG.SESSION_KEY)` est vide, afficher un écran de login avec un champ password et un bouton.

CSS suggéré (à intégrer aux styles existants) :

```css
.login-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--navy) 0%, var(--navy-2) 100%);
  padding: 20px;
}
.login-card {
  background: var(--paper);
  border-radius: 16px;
  padding: 40px;
  max-width: 420px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}
.login-logo { width: 100px; height: 100px; margin: 0 auto 20px; }
.login-title { font-family: 'Anton', Impact, sans-serif; font-size: 28px; letter-spacing: 0.04em; margin-bottom: 8px; }
.login-subtitle { color: var(--muted); font-size: 13px; margin-bottom: 28px; }
.login-input { width: 100%; padding: 14px 16px; border: 2px solid var(--line); border-radius: 8px; font-size: 16px; margin-bottom: 16px; }
.login-input:focus { outline: none; border-color: var(--usa-red); }
.login-btn { width: 100%; padding: 14px; background: var(--usa-red); color: white; font-weight: 700; border-radius: 8px; font-size: 14px; letter-spacing: 0.1em; cursor: pointer; }
.login-btn:hover { background: #A00D26; }
.login-error { color: var(--usa-red); font-size: 13px; margin-top: 12px; min-height: 18px; }
```

Logique :

```javascript
async function attemptLogin(password) {
  try {
    const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'verify_password', password })
    });
    const data = await res.json();
    if (data.ok) {
      localStorage.setItem(CONFIG.SESSION_KEY, '1');
      return true;
    }
    return false;
  } catch (err) {
    console.error(err);
    return false;
  }
}

function isLoggedIn() {
  return localStorage.getItem(CONFIG.SESSION_KEY) === '1';
}

function logout() {
  localStorage.removeItem(CONFIG.SESSION_KEY);
  location.reload();
}

function renderLoginScreen(errorMsg) {
  return `
    <div class="login-screen">
      <div class="login-card">
        <img src="${LOGO_DATA_URI}" class="login-logo" alt="Sales Challenge" />
        <div class="login-title">DEVOTEAM WORLD CUP</div>
        <div class="login-subtitle">Sales Challenge 2026 — Internal Access</div>
        <input type="password" id="login-pwd" class="login-input" placeholder="Enter access code" autofocus />
        <button id="login-btn" class="login-btn">ACCESS THE LEADERBOARD</button>
        <div class="login-error">${errorMsg || ''}</div>
      </div>
    </div>
  `;
}
```

Le `LOGO_DATA_URI` est déjà dans le HTML (le base64 du logo), à extraire dans une constante en haut du script pour le réutiliser.

### 7.5 Polling automatique

```javascript
let pollIntervalId = null;

function startPolling() {
  stopPolling();
  pollIntervalId = setInterval(async () => {
    const wasOpen = openTeamModal; // garder l'état modal
    const success = await fetchData();
    if (success) {
      // Re-render mais préserver scroll et état modal
      const scrollY = window.scrollY;
      render();
      window.scrollTo(0, scrollY);
    }
  }, CONFIG.POLL_INTERVAL_MS);
}

function stopPolling() {
  if (pollIntervalId) clearInterval(pollIntervalId);
}

// Pause le polling quand l'onglet n'est pas visible (économie de quotas Apps Script)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopPolling();
  else startPolling();
});
```

### 7.6 Bouton refresh manuel et statut

Modifier le header pour ajouter un bouton refresh à côté du `last-update` :

```html
<div class="last-update" id="last-update">Loading...</div>
<button id="refresh-btn" class="refresh-btn" title="Refresh now">↻</button>
```

CSS :

```css
.refresh-btn {
  background: rgba(255,255,255,0.1);
  color: var(--gold);
  width: 32px; height: 32px;
  border-radius: 50%;
  font-size: 18px;
  display: flex; align-items: center; justify-content: center;
  position: relative; z-index: 1;
  transition: background 0.15s, transform 0.3s;
}
.refresh-btn:hover { background: rgba(255,255,255,0.25); }
.refresh-btn.spinning { animation: spin 0.8s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
```

JS :

```javascript
async function manualRefresh() {
  const btn = document.getElementById('refresh-btn');
  if (btn) btn.classList.add('spinning');
  await fetchData();
  render();
  if (btn) {
    setTimeout(() => btn.classList.remove('spinning'), 600);
  }
}
```

Et binder dans `render()` :

```javascript
const refreshBtn = document.getElementById('refresh-btn');
if (refreshBtn) refreshBtn.addEventListener('click', manualRefresh);
```

### 7.7 Init de l'app

Remplacer le `render()` initial à la fin du script par :

```javascript
async function init() {
  if (!isLoggedIn()) {
    // Show login
    let errorMsg = '';
    const showLogin = (err) => {
      document.getElementById('app').innerHTML = renderLoginScreen(err);
      const btn = document.getElementById('login-btn');
      const input = document.getElementById('login-pwd');
      const submit = async () => {
        const pwd = input.value.trim();
        if (!pwd) return;
        btn.textContent = 'CHECKING...';
        btn.disabled = true;
        const ok = await attemptLogin(pwd);
        if (ok) {
          init(); // re-init
        } else {
          showLogin('Incorrect access code. Try again.');
        }
      };
      btn.addEventListener('click', submit);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    };
    showLogin();
    return;
  }
  
  // Logged in : load data and start app
  document.getElementById('app').innerHTML = `<div style="padding:80px 20px;text-align:center;color:#666;font-family:sans-serif">Loading Sales Challenge data...</div>`;
  const ok = await fetchData();
  if (!ok) {
    document.getElementById('app').innerHTML = `<div style="padding:80px 20px;text-align:center;color:#c00;font-family:sans-serif">Failed to load data. <button onclick="location.reload()">Retry</button></div>`;
    return;
  }
  render();
  startPolling();
}

init();
```

### 7.8 Gestion d'erreur globale

Si le fetch échoue pendant un polling, ne pas casser l'écran : garder les anciennes données et afficher un badge discret "⚠ Last sync failed, retrying..." à côté du timestamp.

---

## 8. Hébergement Vercel

### 8.1 Compte et connexion GitHub

1. Le GitHub de Léandre est déjà connecté à Vercel.
2. Plan gratuit (Hobby) suffit largement pour ~400 utilisateurs internes.
3. Le repo contient un `vercel.json` (headers de sécurité + revalidation du HTML).

### 8.2 Déploiement (méthode GitHub, automatique)

1. Sur Vercel : **Add New → Project → Import** le repo `groupsaleschallenge`.
2. **Framework Preset** : `Other` (site statique, pas de framework).
3. **Build Command** : vide. **Output Directory** : racine (`./`). **Install Command** : vide.
4. Cliquer **Deploy**.
5. À chaque push sur `main` → déploiement **Production** automatique. Les autres branches
   génèrent des **Preview URLs** (pratique pour tester avant de merger).
6. URL par défaut type `https://<projet>.vercel.app`, renommable dans
   **Project Settings → Domains**.

> Note : pas de drag-and-drop comme sur Netlify. Le flux Vercel passe par Git
> (ou la CLI `vercel`). Comme le repo est connecté, il n'y a rien d'autre à faire
> que pousser sur `main`.

### 8.3 Domaine custom (étape suivante)

**Option simple** : sous-domaine Vercel gratuit (renommer le projet), ex. :
- `devoteam-world-cup-2026.vercel.app`
- `dvt-sales-challenge.vercel.app`

**Option premium** : domaine sous `devoteam.com`. Nécessite IT Devoteam pour configurer DNS :
- Dans Vercel : **Project Settings → Domains → Add** `salechallenge.devoteam.com`
- Suivre les enregistrements DNS indiqués par Vercel (CNAME vers `cname.vercel-dns.com`,
  ou A record selon le cas)
- HTTPS automatique (certificat Let's Encrypt géré par Vercel)

---

## 9. Checklist de validation

Avant de partager l'URL aux 400 commerciaux, vérifier :

- [ ] La Google Sheet de Jose a les 4 onglets nommés correctement
- [ ] Les colonnes matchent exactement la spec (orthographe, casse, ordre)
- [ ] L'Apps Script est déployé et l'URL `?action=ping` retourne `{ok: true}`
- [ ] L'Apps Script est déployé avec accès "Anyone, even anonymous"
- [ ] La constante `APPS_SCRIPT_URL` dans le HTML pointe vers la bonne URL
- [ ] Le mot de passe dans `Config` est défini et communicable aux équipes
- [ ] Le login fonctionne (bon password = accès, mauvais = erreur)
- [ ] La session persiste après refresh (localStorage)
- [ ] Le timestamp `Last updated` affiche bien la valeur de la Sheet
- [ ] Le bouton refresh manuel fonctionne et anime
- [ ] Le polling automatique se déclenche toutes les 30 secondes (vérifier dans l'onglet Network du devtools)
- [ ] Le modal détail équipe s'ouvre et affiche les membres triés
- [ ] La recherche My Position fonctionne avec des noms réels
- [ ] La plateforme est responsive sur mobile (test sur iPhone et Android)
- [ ] L'URL Vercel fonctionne en HTTPS
- [ ] Test de charge minimal : 10 personnes ouvrent la page en même temps, vérifier que ça tient

---

## 10. Évolutions futures (post-MVP)

À garder en tête mais hors scope V1 :

- **Push refresh** : remplacer le polling par Server-Sent Events (SSE) ou Pusher. Beaucoup plus réactif, moins de quota Apps Script.
- **Authentification Google SSO** : si Devoteam le demande, utiliser Google Identity Services pour restreindre aux comptes `@devoteam.com`.
- **Stats avancées** : graphique d'évolution dans le temps (nécessite de stocker des snapshots historiques).
- **Animations renforcées** : count-up des scores qui changent au polling, flash sur les nouveaux #1, etc.
- **Notifications Slack** : webhook qui poste dans le canal Devoteam à chaque nouveau #1 ou yellow card.
- **Images Panini AI** : intégration des images Gemini des top performers (Léandre s'en occupe en parallèle).
- **Mode TV** : URL `/projection` plein écran sans tabs, pour projeter sur un écran fixe dans les locaux.

---

## 11. Troubleshooting fréquent

**"Failed to load data"** au démarrage :
- Vérifier que `APPS_SCRIPT_URL` est correcte (test direct dans le navigateur avec `?action=ping`)
- Vérifier que l'Apps Script est bien en accès `Anyone, even anonymous` (sinon CORS bloque le fetch)
- Vérifier dans l'onglet Network qu'il n'y a pas d'erreur 403 ou 404

**Login refusé alors que le password est correct** :
- Vérifier la cellule `password` dans Config : pas d'espace en début ou fin
- Vérifier que la comparaison côté backend utilise bien `String()` (les nombres dans Sheets peuvent poser souci)

**Le polling fait apparaître des rendus visibles (flash, scroll qui saute)** :
- Vérifier que `window.scrollY` est bien sauvegardé et restauré
- Vérifier que `openTeamModal` est préservé pendant le re-render

**Quota Apps Script dépassé** :
- Apps Script gratuit autorise 20K requêtes/jour. Pour 400 personnes qui pollent toutes les 30 sec en moyenne 4h/jour = 192K requêtes/jour, on dépasse.
- Solution : passer le polling à 60-120 secondes, ou implémenter du cache côté Apps Script (PropertiesService), ou passer aux SSE.

**Données qui ne se mettent pas à jour** :
- Le timestamp `Last updated` suit maintenant la **vraie date de dernière modif de la Sheet** (lue via Drive par l'Apps Script), donc il bouge tout seul à chaque édition de Jose, même plusieurs fois par semaine — sauf si une cellule `last_update` figée est présente dans l'onglet `Config`, qui ferait alors override (à retirer dans ce cas)
- Le front poll toutes les ~2 min (jitter ±25 %) : une modif de la Sheet apparaît donc en ~2,5 min max (moins le cache serveur de 30 s)
- Sur un écran de projection (mode TV / `?tv=1`), le polling ne se met **plus** en pause idle : l'écran reste live indéfiniment
- Vérifier le cache navigateur : Ctrl+Shift+R pour forcer un hard refresh

---

## 12. Contacts et accès

- **Léandre CAUPENNE** (project owner, plateforme) : leandre.caupenne@devoteam.com
- **Jose** (data owner Group Sales) : à compléter
- **Devoteam IT** (pour DNS domaine custom) : à compléter
- **URL Apps Script** : `https://script.google.com/macros/s/AKfycbydewCCd2LNmMKACluHC8PAqkzFxfK0u_jQrldoBEbjCyxycTPQjkQL4o-Hf-P_kDOq/exec`
- **URL Vercel (preview branche)** : https://groupsaleschallenge-git-clau-a93676-leandre-caupenne-s-projects.vercel.app/
- **URL Vercel (production)** : à définir dans Vercel → Settings → Domains (recommandé pour le lancement)
- **Mot de passe d'accès** : `devoteam2026` (constante `SETTINGS.PASSWORD` dans `apps_script_backend.gs`)
- **Clé admin (refresh manuel)** : `?admin=leandre-refresh-2026`
- **Repo GitHub** : leandrecaupenne-netizen/groupsaleschallenge

---

## Annexe : structure des fichiers du projet

```
groupsaleschallenge/
├── CLAUDE.md                       (ce fichier, contexte pour Claude Code)
├── SHEET_SPEC.md                   (spec à transmettre à Jose, extrait de la section 5)
├── index.html                      (la plateforme, point d'entrée Vercel)
├── apps_script_backend.gs          (le code Apps Script, copie de la section 6)
├── vercel.json                     (config Vercel : headers, revalidation HTML)
├── README.md                       (doc d'usage pour Léandre et futurs intervenants)
└── .gitignore                      (node_modules, .env, etc.)
```

---

*Fin du brief. Claude Code peut commencer par l'étape 3 (modifications HTML), Léandre s'occupe en parallèle de l'étape 1 (briefing Jose) et de l'étape 2 (déploiement Apps Script).*
