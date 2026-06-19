# PLAYBOOK.md — Transmission de savoir : construire une app "leaderboard live" production-ready

> **À quoi sert ce document.** Il capture *tout* le savoir-faire accumulé sur la plateforme
> *Devoteam World Cup Sales Challenge 2026* (un leaderboard live, single-file, alimenté par une
> Google Sheet) pour qu'une **prochaine application du même genre soit livrée beaucoup plus vite,
> au même niveau de qualité et de solidité**, sans tout redécouvrir.
>
> **Comment l'utiliser.** Donne ce fichier en **tout début d'une nouvelle session** Claude Code.
> Il décrit une *méthode* + des *patterns réutilisables* + des *pièges déjà payés*. Ce n'est pas
> un copier-coller du code de l'app actuelle : c'est la recette pour en refaire une aussi bonne,
> sur n'importe quel thème.
>
> **Public.** Un développeur (humain ou Claude Code) qui n'a jamais vu le projet d'origine.
>
> **Périmètre type couvert.** Application web *single-file* (HTML/CSS/Vanilla JS, **pas de build**),
> données **live** lues depuis une Google Sheet via un **Google Apps Script** (API JSON read-only),
> hébergée en **statique sur Vercel**, consultée par quelques centaines d'utilisateurs internes sur
> mobile et desktop. PWA installable. Accès protégé par un code partagé.

---

## 0. TL;DR — la recette en 12 points

1. **Une stack volontairement minuscule** : un seul `index.html` autoportant (HTML + CSS + Vanilla JS inline), **aucun framework, aucun build step, aucune dépendance runtime**. C'est la décision structurante : tout le reste en découle.
2. **Données live sans serveur à maintenir** : Google Sheet → Google Apps Script (Web App, JSON) → `fetch()` côté front. Le métier (qui alimente la donnée) garde son outil, on lit par-dessus.
3. **Lecture seule + gate serveur** : le mot de passe vit **côté Apps Script**, jamais dans le bundle. La donnée n'est servie qu'en **POST** avec le code (jamais en GET → pas de fuite dans l'URL/historique/logs).
4. **Polling résilient** : ~2 min jitter ±25 %, **pause quand l'onglet est caché** et après inactivité, **stale-while-revalidate** (on repeint la dernière donnée connue instantanément), re-render **sans perdre le scroll ni les modales ouvertes**, badge discret "⚠ sync failed" en cas d'échec.
5. **Mapping backend tolérant** : on mappe les colonnes par **nom de header normalisé** (casse/espaces/retours-ligne) avec **fallback regex par mot-clé**, et on **remonte des `warnings`** au front. Les renommages amont ne cassent plus l'app.
6. **Tests UX headless réels** (Playwright + Chromium) qui **pilotent la vraie app** avec le backend mocké : smoke (rapide) + e2e (profond). **Chaque correctif UX devient un test de non-régression.**
7. **Lint sans `package.json`** : ESLint flat config, installé *à la volée* en CI et dans le hook pre-push (`npm install --no-save`). Zéro pollution du déploiement statique.
8. **Garde-fous git** : hook `pre-push` (lint + smoke test, skip gracieux si outils absents) + 2 workflows GitHub Actions (UX tests sur PR/main, snapshot hebdo).
9. **Sécurité par en-têtes** : `vercel.json` pose CSP stricte, `X-Frame-Options`, `noindex`, cache par type d'asset. `robots.txt` + meta noindex (outil interne).
10. **PWA propre** : manifest + service worker *network-first* pour le HTML (toujours frais après deploy), *cache-first* pour les assets, **jamais** l'API.
11. **Mobile-first, deux lois non négociables** : (a) *rien d'important n'est hover-only* (tout tooltip doit être atteignable au tap), (b) *rien n'est clippé dans une carte* (`overflow:hidden` coupe en silence → faire wrapper, pas déborder). Les deux sont **gardées par des tests**.
12. **Mémoire inter-sessions** : `CLAUDE.md` = état cible, `DECISIONS.md` = journal daté + actions humaines en attente. À lire en début de session, à mettre à jour en fin.

---

## 1. Philosophie & décisions structurantes

### 1.1 Pourquoi "single-file, no build"
- **Déploiement trivial** : un fichier statique, Vercel preset `Other`, build command vide. Chaque push sur `main` redéploie. Aucune chaîne de build à entretenir, à débugger, à mettre à jour.
- **Longévité** : pas de `node_modules` runtime qui pourrit, pas de version de framework qui se périme. Dans 2 ans le fichier s'ouvrira encore.
- **Lisibilité d'un coup d'œil** : tout est là. On `Ctrl-F` dans un fichier. Pas de chasse au composant à travers 40 fichiers.
- **Coût d'hébergement nul** et CDN gratuit.

**Le prix à payer (assumé)** : un gros fichier (le nôtre fait ~10 000 lignes / ~690 KB avec assets base64). On compense par une **discipline d'organisation interne** (voir §4) et par les tests. Quand tu en hérites, n'essaie pas de "moderniser en React" : tu perdrais tous les avantages ci-dessus pour un problème que l'app n'a pas.

### 1.2 Pourquoi Sheet + Apps Script (et pas une vraie API/DB)
- Le **data owner métier** (chez nous : Jose, depuis OneBI) alimente déjà une Google Sheet. On lit *par-dessus* son workflow sans rien lui imposer.
- Apps Script = **un backend gratuit, hébergé par Google, sans serveur à opérer**, qui sait lire le classeur et renvoyer du JSON.
- Contrepartie : **quotas** (≈20k requêtes/jour) et **cold starts**. D'où le polling lent + cache (§7).

### 1.3 Quand cette recette s'applique (et quand non)
✅ Bon fit : leaderboard/tableau de bord interne, données qui changent lentement (heures/jours), <~1000 utilisateurs, donnée peu sensible, un humain qui maintient la source dans un tableur.
❌ Mauvais fit : écritures concurrentes utilisateur, données sensibles/réglementées, temps réel <10 s, authentification par utilisateur obligatoire, millions de hits. Dans ces cas → vraie API + DB + SSO (voir §13 "évolutions").

---

## 2. Architecture cible (vue d'ensemble)

```
┌────────────────────────────┐
│ Data owner (métier)        │  alimente une Google Sheet (souvent export d'un BI)
└──────────────┬─────────────┘
               ▼
┌────────────────────────────┐
│ Google Sheet               │  onglets existants, headers stables
└──────────────┬─────────────┘
               │ lue par
               ▼
┌────────────────────────────┐
│ Google Apps Script Web App │  API JSON read-only, POST {action, password}
│  - mapping colonnes tolérant│  cache chunké, keepWarm, warnings[]
└──────────────┬─────────────┘
               │ fetch HTTPS (POST)
               ▼
┌────────────────────────────┐
│ index.html (statique/Vercel)│ login → fetch → polling → render
│  - PWA, service worker      │ stale-while-revalidate, scroll/modal preservé
└──────────────┬─────────────┘
               ▼
   ~400 utilisateurs (mobile + desktop)
```

**Flux de données du front** : `login (POST password)` → `fetchData() (POST {action:data,password})` → recalcul des classements **côté client** → `render()` → `startPolling()`.

---

## 3. Environnement de dev & outillage Claude Code

> Cette section est le cœur de ce que tu demandais ("superpowers, lint, agents, chromium…").

### 3.1 Claude Code on the web — conteneur éphémère
- Les sessions tournent dans un **conteneur jetable** : le repo est cloné à neuf, **seul ce qui est commité/poussé survit**. Corollaire : **commit/push tôt et souvent**, et **toute la connaissance vit dans le repo** (d'où `CLAUDE.md`/`DECISIONS.md`/ce playbook).
- **Chromium + Playwright sont pré-installés** dans les sessions cloud → les tests UX headless tournent sans setup. En local il faut `npm i -D playwright && npx playwright install chromium`.
- Réseau sortant gouverné par la *network policy* de l'environnement. Pour ce type d'app il faut au minimum pouvoir joindre `script.google.com` (l'API) et `github.com`.

### 3.2 Le plugin **superpowers**
Activé via `.claude/settings.json` :
```json
{
  "extraKnownMarketplaces": {
    "superpowers-marketplace": { "source": { "source": "github", "repo": "obra/superpowers-marketplace" } }
  },
  "enabledPlugins": { "superpowers@superpowers-marketplace": true }
}
```
- Il apporte des **skills** (workflows outillés) réutilisables. Réflexe en début de session : **lister les skills disponibles et préférer un skill dédié** quand il matche la tâche, plutôt que de tout refaire à la main.
- Garde ce bloc dans `.claude/settings.json` du nouveau repo pour retrouver le même environnement. `.claude/settings.local.json` est **gitignoré** (réglages perso, secrets locaux).

### 3.3 Les **agents / subagents**
Quand une tâche est large ou parallélisable, **déléguer à des subagents** plutôt que tout faire en série :
- `Explore` / `general-purpose` : recherche large dans le code (fan-out), tu ne récupères que la conclusion — idéal sur un fichier de 10k lignes.
- `Plan` : conception d'un plan d'implémentation avant d'écrire.
- **Lancer plusieurs agents indépendants dans un même message** pour qu'ils tournent en parallèle.
- Règle d'or héritée : utilise un agent quand répondre demande de **balayer beaucoup de fichiers** et que tu ne veux que le résultat ; fais la recherche toi-même pour un fait unique que tu sais localiser.

### 3.4 Lint — ESLint flat config, **sans `package.json`**
Décision clé : **pas de `package.json` à la racine** pour ne **jamais** ajouter d'étape d'install/build au déploiement statique. ESLint et ses plugins sont installés **à la volée** (CI + hook) avec `npm install --no-save`.

`eslint.config.mjs` (flat config) lint :
- l'**inline `<script>` de `index.html`** via `eslint-plugin-html`,
- le **service worker** (globals serviceworker+browser),
- les **runners de test** `.cjs/.js` (globals node+browser, car ils contiennent des snippets `page.evaluate`).

Règles : **erreurs = vrais bugs** (font échouer la CI : `no-undef`, `no-redeclare`, `no-dupe-keys`, `no-const-assign`, `no-unreachable`, `use-isnan`, `valid-typeof`…). **Warnings = bruit utile** non bloquant (`eqeqeq: smart`, `no-empty: allowEmptyCatch`, `no-unused-vars` avec `args:none`/`caughtErrors:none`). On assume `== null` et les `catch {}` vides volontaires.

Ignorés : `node_modules`, dossiers d'assets (`cards/`, `qr/`, `history/`), sous-projet de test live `test/e2e/`.

Lancer en local : `npm i -D eslint eslint-plugin-html globals && npx eslint .`

### 3.5 Tests UX headless — Playwright + Chromium
Philosophie : **piloter la VRAIE app dans un vrai navigateur**, backend **mocké** (aucun appel réseau à Google).
- Un **petit serveur HTTP statique** sert le repo sur un port éphémère.
- `ctx.route('**script.google.com**', …)` intercepte et renvoie un **dataset mock** à la *shape* exacte de l'API.
- On capture **`pageerror` et `console.error`** : toute erreur JS non catchée fait échouer la suite.
- On teste : login, changement d'onglets, CTA, ouverture de modales, recherche + fuzzy search, **overflow horizontal à 320/375/768 px**, **aucun contenu clippé dans une carte sur mobile**, mode TV, dark mode, partage de carte, ticker cliquable, compare, et les popovers **tap** (pas de hover) sur mobile.
- Deux niveaux : `ux-smoke.cjs` (rapide, lancé au pre-push) et `ux-e2e.cjs` (profond, lancé en CI).
- Bonus : **check d'intégrité i18n statique** — chaque clé `t('…')` utilisée doit exister dans `I18N.en`, sinon la clé brute fuit à l'écran.

**Règle culturelle la plus importante du projet** : *chaque bug UX corrigé se transforme en assertion de test*. La liste des tests = la liste des régressions déjà payées. Le commit log est plein de `test+fix(ux): …` — c'est voulu.

### 3.6 Hook git `pre-push`
`.githooks/pre-push` (activé une fois par clone : `git config core.hooksPath .githooks`) :
1. lance **ESLint** s'il est installé (sinon skip avec message),
2. lance le **smoke test** s'il l'est, et **avorte le push** sur échec,
3. **skip gracieux** (exit 0) si node/Playwright/Chromium absents → ne bloque jamais un environnement nu.
Bypass ponctuel : `git push --no-verify`.

### 3.7 CI — GitHub Actions
- **`ux-tests.yml`** : sur PR + push `main`. Job `lint` (ESLint installé à la volée) + job `ux` (Playwright/Chromium → smoke + e2e). Commente automatiquement la PR/commit en cas d'échec.
- **`snapshot.yml`** : cron hebdo (lundi matin) — tire la donnée live (avec un secret `APP_PASSWORD`), écrit un **snapshot trimé** dans `history/` et commit `[skip ci]`. C'est ce qui permet plus tard les évolutions semaine/semaine.
- Le hook local protège les pushs *depuis une machine* ; la CI protège tout le reste (pushs web, PR). Les deux sont nécessaires.

---

## 4. Organisation du fichier monolithe (discipline interne)

Un seul `index.html`, mais structuré par **bannières de section** repérables au `Ctrl-F` :
```css
/* === BASE === */            /* === HEADER === */        /* === TABS === */
/* === HERO === */            /* === TEAM TABLE === */    /* === MODAL : … === */
/* === LIVE: login screen === */   /* === RESPONSIVE === */   …
```
Ordre type : `<head>` (meta social/PWA/CSP), **CSS par sections**, puis le `<script>` avec en haut : `CONFIG`, helpers (slug, avatars, i18n), **état `let DATA/teams/people/…`**, `fetchData()`, `render()` + sous-renderers par onglet, login, polling, init.

Conventions retenues :
- **CSS d'override appended-wins** : pour faire évoluer un visuel sans toucher l'ancien bloc, on ajoute un bloc plus bas qui gagne par cascade (commenté `(overrides above; appended so they win)`). Pratique pour itérer vite sans casser.
- **Variables CSS de thème** en `:root` (palette, couleurs d'accent) → re-thémer une nouvelle app = changer ~6 variables.
- **`render()` idempotent** : on peut le rappeler à chaque poll. Il **sauvegarde/restaure `window.scrollY`** et l'**état des modales** ouvertes.
- **Pré-calculs une fois par chargement** (ex. `cardsByTeam`, lookups de rang) pour ne pas re-filtrer 377 personnes par ligne à chaque render.

---

## 5. Le backend Apps Script (patterns à reprendre)

Fichier de référence : `apps_script_backend.gs`. **⚠️ Le `.gs` du repo ≠ le projet Apps Script déployé** : toute modif doit être **recollée dans l'éditeur Apps Script puis redéployée** (Gérer les déploiements → Modifier → *Nouvelle version* → garde la même URL `/exec`, rien à toucher côté front).

Patterns essentiels :
- **Bloc `SETTINGS` éditable en tête** : `PASSWORD`, `PERIOD`, dates, `EXCLUDED_TEAMS`, et la définition des onglets source (`{name, headerRow}`). Tout le "config métier" est là.
- **Mapping par header normalisé + fallback regex** (`TEAM_MAP`/`PEOPLE_MAP`) : chaque champ essaie son/ses header(s) exact(s), puis une **regex mot-clé** (lookaheads pour séparer Total/NB/GM → 0 collision). `normHeader()` = lowercase + collapse espaces/retours-ligne. Résultat : un renommage amont ne flatline plus un classement.
- **`warnings[]` dans la réponse** : quand un mapping tombe en fallback ou qu'un header manque, on **remonte un warning** que le front peut afficher. Observabilité gratuite.
- **Coercition robuste** : `toNumber()` transforme `''`/`#DIV/0!`/`#N/A` en 0 ; les pourcentages sont en décimal (0.27, pas 27).
- **Exclusions** centralisées (`EXCLUDED_TEAMS`, insensible à la casse).
- **Sécurité** : la donnée n'est servie qu'en **POST** avec `password` vérifié **côté serveur** (`String()` comparaison, attention aux espaces parasites). `?action=ping` (GET) ne renvoie qu'un `{ok:true}`. Mauvais mot de passe → `{error:"unauthorized"}`. Le code n'est **jamais renvoyé** au client.
- **Quota / latence** : **cache chunké** (la réponse JSON est découpée et mise en cache Apps Script), et **trigger `keepWarm`** (time-driven ~5 min) pour limiter les cold starts. `lastDataUpdate()` retombe sur la date de dernière édition Drive du classeur si pas de `Config.last_update`.
- **CORS** : l'accès doit être *"Anyone, even anonymous"*, sinon le `fetch` est bloqué.

Procédure de déploiement (à transmettre à l'humain qui a accès au classeur) :
1. Sheet → Extensions → Apps Script, coller le `.gs`. 2. Sauver, nommer le projet. 3. Déployer → Web app → *Exécuter en tant que : Moi* / *Accès : Tous*. 4. Autoriser. 5. Copier l'URL `/exec`. 6. Tester `?action=ping`.

---

## 6. Le contrat de données (shape JSON)

Le front et les tests dépendent d'une **shape stable**. À figer dès le début d'un nouveau projet :
```jsonc
{
  "teams":   [{ "country","members","total_ps","avg_ps","avg_gm","avg_meetings","avg_opps","nickname?" }],
  "people":  [{ "name","team","tenure","ps_total","ps_total_gm","ps_nb","ps_nb_gm","licence_gm","meetings","opps" }],
  "updated_at": "ISO-8601",
  "period": "Week 1 of 5",
  "challenge_dates": { "start":"YYYY-MM-DD", "end":"YYYY-MM-DD" },
  "special_awards": { },
  "warnings": []
}
```
- Adapte les champs au métier de la nouvelle app, **mais garde** : `updated_at`, `period`, un objet de dates, et **`warnings`**.
- Les **classements sont recalculés côté client** (`sortedX = [...people].sort(...)`) → l'API reste bête, le front décide du tri/affichage. Facile à faire évoluer sans redéployer le backend.
- Documente cette shape dans un `SHEET_SPEC.md` à donner au data owner (noms d'onglets, colonnes, ordre, types, décimales). C'est le contrat humain de l'autre côté.

---

## 7. Patterns front "live" (le cœur de la robustesse)

À reprendre quasi tels quels :

- **Config en tête** : `APPS_SCRIPT_URL`, `POLL_INTERVAL_MS` (120000), `IDLE_TIMEOUT_MS` (15 min), `FETCH_TIMEOUT_MS` (20 s, généreux pour cold start), clés `localStorage` versionnées (`_v1/_v2/_v3`).
- **Login server-side** : on POST `{action:'verify_password', password}` ; succès → flag `localStorage` (`SESSION_KEY`) + on **stocke le code** (`PWD_KEY`) pour le renvoyer à chaque `fetchData`. La session persiste au reload.
- **`fetchData()`** : POST `{action:'data', password}`, `AbortController` sur `FETCH_TIMEOUT_MS`, en cas d'`error`→throw, en cas de succès → set state + recompute classements + **persiste un snapshot** (`SNAPSHOT_KEY`).
- **Stale-while-revalidate** : au démarrage on **repeint instantanément le dernier snapshot connu** (s'il a < `SNAPSHOT_MAX_AGE_MS`) pendant que le fetch frais tourne en arrière-plan → pas d'écran blanc de 10 s sur un backend froid.
- **Polling** : `setInterval` à `POLL_INTERVAL_MS` **+ jitter ±25 %** (évite le thundering herd des 400 clients synchronisés). **Pause sur `visibilitychange` quand `document.hidden`** et après `IDLE_TIMEOUT_MS` sans interaction. Reprend à l'activité.
- **Re-render sans flash** : sauver `window.scrollY` et l'état des modales avant `render()`, restaurer après. Jamais de "scroll qui saute".
- **Résilience d'erreur** : un poll qui échoue **ne casse rien** — on garde l'ancienne donnée à l'écran et on affiche un badge discret "⚠ sync failed, retrying…" près du timestamp jusqu'au prochain succès.
- **Timestamp visible** : "Last updated" branché sur `updated_at` de l'API → la fraîcheur est lisible par l'utilisateur.
- **Refresh manuel admin-only** : bouton ↻ qui spinne, gated par `?admin=<clé>` (voir §8).
- **Évolution semaine/semaine** : snapshots de rangs en `localStorage` keyés par `period` + snapshots serveur dans `history/` (cron) → badges ▲▼ et digest hebdo. ⚠️ *Leçon* : on a **désactivé les indicateurs de mouvement pendant la montée en charge des données** car ils étaient trompeurs au démarrage — n'active ce genre de feature qu'une fois la donnée stabilisée.

---

## 8. Sécurité (modèle "gate interne léger", à dimensionner honnêtement)

C'est **un portail interne, pas du contrôle d'accès réel**. À écrire noir sur blanc dans le README pour éviter les malentendus :
- **Code partagé unique**, vérifié côté serveur, jamais embarqué dans le bundle. Mais quiconque a le lien + le code voit le leaderboard. Donnée à traiter comme "interne, faible sensibilité".
- **Mode admin (`?admin=…`)** : ne débloque que des **affordances UI** (refresh manuel, panneaux spéciaux) sur l'appareil via `localStorage`. La clé admin **est dans le bundle** → auto-attribuable par quiconque lit le JS. Ça *gate de la commodité, pas de la donnée*.
- **Pas d'auth par utilisateur**. Si un jour requis → **Google SSO restreint au domaine** (`@devoteam.com`), pas le code partagé.

**En-têtes (`vercel.json`)** — à reprendre tels quels et adapter `connect-src` :
- **CSP stricte** : `default-src 'self'`, `script-src 'self' 'unsafe-inline' <analytics>`, `connect-src 'self' https://script.google.com https://script.googleusercontent.com <analytics>`, `object-src 'none'`, `base-uri 'none'`. ⚠️ Pense à **lister le domaine de l'API et de l'analytics** dans `connect-src`/`script-src`, sinon le fetch est bloqué.
- `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Robots-Tag: noindex,nofollow`.
- **Cache par type** : HTML `max-age=0, must-revalidate` (toujours frais après deploy), images/webp/woff2 longs (`immutable` pour les fonts), service worker non caché.
- `robots.txt` + `<meta name="robots" noindex>` (outil interne). Les bots d'unfurl ignorent robots.txt → les **link previews** Slack/Teams/WhatsApp marchent quand même (meta `og:` conservées).

---

## 9. PWA & service worker

- **`manifest.webmanifest`** : `name`/`short_name`, `display: standalone`, `theme_color`, icônes 192/512 + une **maskable** 512, `launch_handler: navigate-existing`.
- **`service-worker.js`** (vanilla, versionné `CACHE = 'app-shell-vNN'`) :
  - **network-first pour les navigations** → on a toujours le HTML frais après un deploy, avec fallback cache hors-ligne.
  - **cache-first pour les assets** statiques (icônes, manifest), avec échec propre (jamais `undefined`).
  - **ne touche JAMAIS l'API** (`script.google.com` court-circuité ; les POST sont laissés passer).
  - `install` précache le shell *par URL avec catch* (un 404 ne fait pas échouer tout l'install), `activate` purge les vieux caches.
  - **Bump `CACHE` à chaque changement de shell** pour forcer la mise à jour.
- **Bannière "installer l'app"** + nudge "ouvrir dans l'app", dismissables (flag `localStorage`).
- **Versioning des assets par query** (`?v=N`, ex. `CARD_VER`) : le nom de fichier reste stable, on bump `?v=` pour défaire le cache HTTP quand l'image change.

---

## 10. Les deux lois mobile/touch (non négociables, testées)

L'app est autant utilisée sur téléphone que sur desktop. Deux règles s'appliquent à **chaque** surface :

1. **Rien d'important n'est hover-only.** Les écrans tactiles n'ont pas de hover. Toute info qu'un tooltip révèle doit être **atteignable au tap**. Pattern : un handler délégué en **phase capture** ouvre un petit popover au tap **et stoppe la propagation** pour ne pas aussi ouvrir la modale parente ; un tap ailleurs (ou un vrai scroll) ferme. Sur le mode TV (pas de pointeur) → l'indicateur reste *glanceable only*, par design.
2. **Rien n'est clippé dans une carte.** Les cartes en `overflow:hidden` **coupent en silence** un contenu plus large que leur boîte (invisible à un check d'overflow au niveau document). Fix : faire **wrapper** les rangées meta (`flex-wrap`) plutôt que déborder. Les seules boîtes volontairement plus larges (ticker marquee, avatars ronds cover-crop, fond décoratif du hero) sont **allowlistées** dans les tests.

Ces deux lois sont **gardées par les tests UX** (`No content clipped inside a box on mobile`, assertions tap-tally / tap-outside-closes). Quand tu ajoutes une surface, ajoute la garde.

Détails qui comptent : petits compteurs entre parenthèses avec **espace intérieur** `🟨 ( N )` pour rester lisibles en dense/TV ; `loading="lazy"`/`decoding="async"` sur les images ; **thumbs pré-scalés** (256px) pour les petits avatars (downscaler un 1024px en ~50px donne un rendu aliasé et charge des Mo inutiles), full-res réservé au hero/modale.

---

## 11. Pipeline d'assets (portraits / images)

- Portraits dans `cards/<slug>.webp` (1024px) + `cards/thumb/<slug>.webp` (256px). **Slugification déterministe** du nom (`nameSlug`: translittération d'accents via table `ACCENTS`, puis `[^a-z0-9]+ → -`).
- **Set `CARD_PHOTOS`** des slugs disponibles → un nom absent **retombe sur un avatar initiales**, sans toucher au code. On peut donc **ajouter des batches de photos au fil de l'eau**.
- **Doublons de noms** : suffixe ` · TEAM` pour garder une clé d'identité unique ; `baseName()` la retire avant de résoudre le slug/initiales.
- **Recherche fuzzy** insensible aux accents (`normLoose`) → un commercial qui tape sans accent / juste son nom de famille se retrouve quand même.
- `og-image.png`, `icon-*.png`, `qr/` (QR du lien public) : générés une fois, servis statiques.

---

## 12. Mémoire inter-sessions & process (le plus important pour aller vite)

Le conteneur est jetable → **la mémoire vit dans le repo** :
- **`CLAUDE.md`** = brief + **état cible** de l'app. Lu en début de session. Décrit l'archi, la stack, les contacts, les URLs, la checklist de validation.
- **`DECISIONS.md`** = **journal de bord daté** (le plus récent en haut) + section **"⚠️ Actions en attente (humains)"**. À chaque fin de session : entrée datée *quoi/pourquoi/TODO*. C'est là qu'on retrouve "pourquoi les opps sont à 0" ou "pourquoi tel override existe" sans réenquêter. **Convention stricte, tenue à chaque commit de doc** (`docs: …`).
- **`SHEET_SPEC.md`** = contrat pour le data owner.
- **`README.md`** = doc d'usage (setup, sécurité, tests, lancement local).
- **Commits sémantiques** : `feat(...)`, `fix(...)`, `ux:`, `test+fix(ux):`, `docs:`, `fix(backend):`. Lisible, traçable.

**Résilience de la donnée amont** (leçons concrètes, à anticiper) :
- Prévois un mécanisme d'**overrides côté front** (ex. `PEOPLE_TEAM_OVERRIDES`, clé = nom normalisé) pour patcher en urgence une donnée source cassée (`#N/A`, faute d'orthographe) sans attendre le data owner. **Documente chaque override dans `DECISIONS.md`** et la reco durable (ex. *clé le lookup sur l'ID Workday plutôt que sur le nom*).
- **Ne mets jamais en avant un leader à valeur 0** dans les cartes "star"/journal (garde-fou explicite) : une colonne source vide ne doit pas produire un faux champion.

---

## 13. Checklist de pré-lancement (avant de diffuser l'URL)

- [ ] La Sheet a les bons onglets/colonnes (ortho, casse, ordre) — voir `SHEET_SPEC.md`.
- [ ] Apps Script déployé, accès *Anyone*, `?action=ping` → `{ok:true}`.
- [ ] `APPS_SCRIPT_URL` du front pointe sur la bonne URL `/exec`.
- [ ] Login OK (bon code = accès / mauvais = erreur), session persiste au reload.
- [ ] Timestamp "Last updated" reflète l'API ; refresh manuel (admin) anime.
- [ ] Polling visible dans l'onglet Network (~2 min), pause quand onglet caché.
- [ ] Modales s'ouvrent, recherche/fuzzy marche avec de vrais noms.
- [ ] **Responsive testé sur vrai iPhone + Android**, rien de clippé.
- [ ] CSP n'a rien bloqué (Console propre), HTTPS OK.
- [ ] `node test/ux-smoke.cjs` et `node test/ux-e2e.cjs` au vert ; ESLint au vert.
- [ ] `bash test/run-live.sh` (smoke du backend réel) au vert.
- [ ] Test de charge minimal : ~10 personnes ouvrent en même temps.

---

## 14. Évolutions futures (hors MVP, gardées en tête)
Push refresh (SSE/Pusher) au lieu du polling · Google SSO `@domaine` · stats d'évolution graphiques (snapshots historiques déjà capturés par le cron) · animations count-up sur les scores qui changent · notifications Slack sur nouveau #1 · **mode TV/projection** plein écran (`/projection`) · domaine custom via DNS de l'IT.

---

## 15. Pièges déjà payés (anti-patterns à éviter)
- **Ne renomme pas** les onglets/headers de la Sheet sans prévenir : ça flatline un classement. Le mapping tolérant amortit, mais surveille les `warnings`.
- **Ne sers jamais la donnée en GET** : le code partagé fuiterait dans l'URL/historique.
- **Ne fais pas confiance à un check d'overflow document-level** : le clipping intra-carte (`overflow:hidden`) est invisible pour lui. Teste *dans* les cartes, sur mobile.
- **N'oublie pas `connect-src`/`script-src` dans la CSP** quand tu ajoutes un domaine (API, analytics) : symptôme = "Failed to load data" + erreur CSP en console.
- **N'ajoute pas de `package.json` runtime** : tu casserais le "no build" et le déploiement statique. Installe les outils *à la volée*.
- **Le `.gs` du repo n'est pas le script déployé** : recolle + redéploie après chaque modif backend.
- **N'affiche pas d'indicateurs d'évolution tant que la donnée n'est pas stabilisée** (au début ils mentent).
- **Bump les clés `localStorage` versionnées** (`_vN`) quand tu changes la forme d'un état persistant, sinon tu lis du vieux format.

---

## 16. Kit de démarrage pour la PROCHAINE app (copie ce qui suit)

Fichiers à reprendre **tels quels puis adapter** :
```
nouveau-projet/
├── PLAYBOOK.md                 ← ce fichier (la méthode)
├── CLAUDE.md                   ← brief + état cible (réécrire pour le nouveau thème)
├── DECISIONS.md                ← repartir d'un journal vierge avec la convention
├── SHEET_SPEC.md               ← contrat data owner (adapter colonnes)
├── README.md                   ← doc d'usage (adapter)
├── index.html                  ← repartir du squelette : CONFIG, fetchData, polling,
│                                 login, render(), service-worker hooks, thème en :root
├── apps_script_backend.gs      ← SETTINGS + mapping tolérant + warnings + cache + keepWarm
├── eslint.config.mjs           ← IDENTIQUE (lint l'inline <script>, le SW, les tests)
├── vercel.json                 ← adapter connect-src/script-src de la CSP
├── service-worker.js           ← IDENTIQUE (bump le nom de cache)
├── manifest.webmanifest        ← adapter name/couleurs/icônes
├── robots.txt                  ← IDENTIQUE
├── .claude/settings.json       ← IDENTIQUE (superpowers)
├── .githooks/pre-push          ← IDENTIQUE (lint + smoke, skip gracieux)
├── .github/workflows/ux-tests.yml   ← IDENTIQUE
├── .github/workflows/snapshot.yml   ← adapter APPS_SCRIPT_URL + secret APP_PASSWORD
├── scripts/snapshot.py         ← adapter aux champs trimés
├── test/ux-smoke.cjs           ← adapter le mockData() à la nouvelle shape
├── test/ux-e2e.cjs             ← idem + features spécifiques
├── test/run-live.sh            ← smoke du backend réel (ping/auth/shape/intégrité)
└── .gitignore                  ← IDENTIQUE (node_modules, .env, .claude/settings.local.json)
```

**Rituel d'ouverture de session (à faire dire à Claude Code) :**
1. Lire `CLAUDE.md` (état cible) puis `DECISIONS.md` (journal + actions en attente).
2. Lister les **skills** disponibles (superpowers) et préférer un skill dédié quand il matche.
3. `git config core.hooksPath .githooks` si pas déjà fait.
4. Travailler sur la **branche dédiée**, commits sémantiques, **push tôt** (conteneur éphémère).
5. **Tout correctif UX → une assertion de test.** Lancer `ux-smoke` avant push (le hook le fait).
6. Fin de session : entrée datée dans `DECISIONS.md` + MAJ des "actions en attente".

**Pour démarrer encore plus vite (estimations d'effort) :**
- Re-thémer le visuel : changer les variables CSS `:root` + le logo/manifest/og-image → ~1 séance.
- Adapter le contrat de données : `SHEET_SPEC.md` + `*_MAP` du backend + `mockData()` des tests → ~1 séance.
- Le reste (live patterns, PWA, CI, lint, sécurité, mobile) est **réutilisable quasi à l'identique**.

---

*Fin du playbook. Si tu ne retiens que trois choses : (1) single-file + no build, données live via Sheet/Apps Script en POST ; (2) chaque bug UX devient un test Playwright headless ; (3) la mémoire du projet vit dans le repo — `CLAUDE.md` (cible) + `DECISIONS.md` (journal).*
