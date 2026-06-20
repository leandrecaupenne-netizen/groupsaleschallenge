# PLAYBOOK.md — Transmission de savoir : construire une app "leaderboard live" production-ready

> ## 🟢 À LIRE EN PREMIER — instructions pour Claude Code (nouvelle session)
> Tu démarres une **nouvelle app** et l'utilisateur t'a donné ce document. Il **fait foi** :
> il condense tout le savoir-faire d'une app live single-file déjà livrée en production.
> **Ne re-découvre rien de ce qui est ici.** Marche à suivre :
> 1. **Demande d'abord** à l'utilisateur les 3 choses qui changent d'un projet à l'autre :
>    le **thème/métaphore**, la **source de données** (Google Sheet ? autre ?) et ses **colonnes**,
>    et les **surfaces voulues** (mobile seul ? + projection/TV ? + outil admin ?). Une seule salve
>    de questions, puis agis.
> 2. **Scaffolde** le repo en copiant l'**Annexe E** (configs verbatim + squelettes), puis adapte
>    `CONFIG`, le `SETTINGS`+mapping du backend, et le `mockData()` des tests à la nouvelle donnée.
> 3. **Conçois le produit** avec l'**Annexe D** (métaphore tenue jusqu'au bout, chiffres qui
>    s'expliquent, visages, match-sheet, couche éditoriale…).
> 4. **Construis chaque vue** en respectant l'**Annexe C** (checklist UX) dès le départ.
> 5. **Garde chaque comportement par un test** (Annexe B) — *tout bug UX corrigé devient une
>    assertion Playwright*. Lance le smoke test avant chaque push (le hook pre-push le fait).
> 6. **Initialise la mémoire** : crée `CLAUDE.md` (état cible) + `DECISIONS.md` (journal daté +
>    actions humaines en attente) et tiens-les à jour (cf. §12).
> 7. Respecte les **invariants** : single-file / no-build, données en **POST** (jamais GET),
>    mot de passe **côté serveur**, polling jitter + pause onglet caché, **rien de hover-only**,
>    **rien de clippé** dans une carte. Voir §0 (les 12 points), §8 (sécurité), §14 (performance)
>    et §16 (pièges déjà payés).
>
> *Si une seule chose : ce fichier seul suffit à démarrer. Commence par poser les 3 questions du point 1.*

---

## 🗺️ Sommaire
**La méthode**
- [0. TL;DR — la recette en 12 points](#0-tldr--la-recette-en-12-points)
- [1. Philosophie & décisions structurantes](#1-philosophie--décisions-structurantes)
- [2. Architecture cible](#2-architecture-cible-vue-densemble)
- [3. Environnement de dev & outillage Claude Code](#3-environnement-de-dev--outillage-claude-code) *(superpowers, lint, agents, Chromium, CI, hooks, **§3.8 pyramide de tests & vérif agentique/live**)*
- [4. Organisation du fichier monolithe](#4-organisation-du-fichier-monolithe-discipline-interne)
- [5. Le backend Apps Script](#5-le-backend-apps-script-patterns-à-reprendre)
- [6. Le contrat de données (shape JSON)](#6-le-contrat-de-données-shape-json)
- [7. Patterns front "live"](#7-patterns-front-live-le-cœur-de-la-robustesse)
- [8. Sécurité](#8-sécurité-modèle-gate-interne-léger-à-dimensionner-honnêtement)
- [9. PWA & service worker](#9-pwa--service-worker)
- [10. Les deux lois mobile/touch](#10-les-deux-lois-mobiletouch-non-négociables-testées)
- [11. Pipeline d'assets](#11-pipeline-dassets-portraits--images)
- [12. Mémoire inter-sessions & process](#12-mémoire-inter-sessions--process-le-plus-important-pour-aller-vite)
- [13. Checklist de pré-lancement](#13-checklist-de-pré-lancement-avant-de-diffuser-lurl)
- [14. Performance & budget de perf (consolidé)](#14-performance--budget-de-perf-consolidé)
- [15. Évolutions futures](#15-évolutions-futures-hors-mvp-gardées-en-tête)
- [16. Pièges déjà payés](#16-pièges-déjà-payés-anti-patterns-à-éviter)
- [17. Kit de démarrage pour la prochaine app](#17-kit-de-démarrage-pour-la-prochaine-app-copie-ce-qui-suit)

**Les annexes**
- [A. Catalogue exhaustif UX / interactions](#annexe-a--catalogue-exhaustif-ux--interactions-ne-jamais-re-découvrir) — chaque bug payé + sa règle
- [B. Liste de non-régression](#annexe-b--la-liste-de-non-régression-chaque-ligne--un-test-à-reprendre) — les tests à reprendre
- [C. Checklist d'acceptation UX](#annexe-c--checklist-dacceptation-ux-à-appliquer-dès-le-départ-prochaine-app) — à cocher par vue
- [D. Principes de conception produit](#annexe-d--ce-qui-rend-lapp-géniale--principes-de-conception-transférables-pas-à-cloner) — ce qui rend l'app géniale
- [E. Fichiers de référence prêts à copier](#annexe-e--fichiers-de-référence-prêts-à-copier-le-playbook-est-auto-suffisant) — le scaffolding complet
- [F. Suite de tests (opérationnel)](#annexe-f--la-suite-de-tests-de-ce-repo-opérationnel--lancer--déboguer--étendre) — **les 5 tests regroupés** + mémo CLI Playwright + **`playwright-cli`** (vérif agent, F.9)

---

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
> 🛠️ Mode d'emploi concret (lancer / déboguer / CLI / sélecteurs / les **5 tests regroupés**) : **Annexe F**.

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

### 3.8 Pyramide de tests & boucle de vérification **agentique** (le point clé)
La force du projet n'est pas un seul test : c'est une **pyramide à 3 niveaux** + un **agent qui pilote
la vérification** au lieu de "lire le code et espérer". *(Le détail opérationnel des 5 tests — table,
commandes, dépannage — est regroupé en **Annexe F**.)*

**Les 3 niveaux (du plus rapide au plus réel) :**
1. **Mocké, headless, automatique** — `test/ux-smoke.cjs` (pre-push) + `test/ux-e2e.cjs` (CI) +
   `test/backend-contract.js`. Pilotent la **vraie app** dans Chromium avec **l'API Google mockée**
   (`ctx.route('**script.google.com**', …)`) → zéro réseau, déterministe, tourne partout. C'est le
   filet de non-régression (Annexe B).
2. **API live, réseau réel** — `test/run-live.sh` (curl + python3) : ping, mauvais mot de passe
   rejeté, pull authentifié, checks de **shape/compte/intégrité référentielle**. À lancer **après
   chaque redeploy Apps Script** et pour debugger un "Failed to load data".
3. **Parcours utilisateur complet contre le backend LIVE** — `test/e2e/run.js` (Puppeteer + vrai
   Chromium, sous-projet isolé avec son `node_modules`). Simule un vrai utilisateur (login, mauvais/
   bon code, chargement, chaque onglet, modale squad, VAR, My Position, mobile, dark, persistance au
   reload), **re-dérive les classements depuis le payload chargé et les compare au DOM** (attrape les
   régressions de tri côté client), **balaye les erreurs console + requêtes échouées**, et **écrit des
   screenshots** de chaque état dans `shots/`. C'est le seul test qui prouve **ce que l'utilisateur
   voit vraiment**. À lancer **avant un lancement** ou après une grosse refonte UI.

**La boucle agentique (comment Claude Code vérifie "en live") :**
- **Les screenshots sont les yeux de l'agent.** Un script headless qui **capture des PNG** permet à
  l'agent de **constater visuellement** le résultat (overflow, chevauchement, carte cassée) — pas
  seulement de croire un assert. Quand tu vérifies une UI, **fais produire des screenshots et
  regarde-les**.
- **Déléguer la revue à des agents en parallèle.** Pattern éprouvé : lancer **deux subagents
  simultanés** — un *code review* (bugs, fuites, code mort) + un *UX review* (parcours, a11y,
  affordances) — dans **un seul message** pour qu'ils tournent en // ; synthétiser, appliquer les
  correctifs sûrs, soumettre les gros choix à l'humain. (cf. les entrées "2 agents lancés en //" du
  journal.) Idem pour balayer un fichier de 10k lignes : un agent `Explore`, tu ne récupères que la
  conclusion.
- **Skills de vérification** (via superpowers / harnais) à privilégier quand ils matchent :
  **`verify`** (lance l'app et observe le comportement réel d'un changement), **`run`** (démarre /
  screenshot l'app), **`code-review`** et **`security-review`** (revue du diff). Préfère un skill
  dédié à une vérif manuelle ad hoc. Pour piloter un **vrai navigateur pas-à-pas** sur l'URL
  live/preview (sans écrire de script), **`playwright-cli`** — voir **Annexe F.9** (complément à la
  suite, pas un test de non-régression).
- **Tout correctif UX → une assertion** ajoutée au niveau 1 (Annexe B). La boucle se referme :
  l'agent reproduit le bug en test, le corrige, le test garde la non-régression pour toujours.

**Pièges de test live en environnement managé (cloud/CI) — déjà payés :**
- **TLS** : certains réseaux managés interceptent le HTTPS avec une CA privée que le Chromium de
  Puppeteer ne connaît pas → `net::ERR_CERT_AUTHORITY_INVALID` sur **toutes** les requêtes. Relancer
  avec `E2E_INSECURE=1` (n'affecte en rien la prod, qui sert des certs publics valides).
- **Apps Script 302** : en curl, `-L` **sans** `-X` (le POST se rejoue en GET sur le redirect) ; en
  navigateur, `connect-src` doit inclure `script.googleusercontent.com` (cf. §16).
- **Skip gracieux** : le pre-push et la CI **ne bloquent jamais** si Chromium/Playwright manquent
  (exit 0 + message) → un environnement nu reste utilisable. (Chromium est **pré-installé** dans les
  sessions Claude Code cloud.)
- **Headful pour debug** local : `E2E_HEADFUL=1` montre la fenêtre.

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
- **Tous les textes passent par un helper i18n** : un dictionnaire `const I18N = { en: { 'key': '…' } }` + une fonction `t('key', vars)` (fallback = la clé). Avantages : un seul endroit pour le wording, prêt pour d'autres langues, et une **garde de test** (chaque `t('…')` utilisé doit exister dans `I18N.en`, sinon la clé brute fuit à l'écran). Mets ce helper en place dès le début même si tu n'as qu'une langue — le retrofit est pénible.

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
1. Sheet → Extensions → Apps Script, coller le `.gs`. 2. Sauver, nommer le projet. 3. Déployer → Web app → *Exécuter en tant que : Moi* / *Accès : Tous*. 4. Autoriser (accepter le scope **Drive** demandé, sinon le timestamp `updated_at` retombe sur "now"). 5. Copier l'URL `/exec`. 6. Tester `?action=ping` → `{ok:true}`. 7. **Installer le trigger `keepWarm`** (sinon le 1er visiteur subit un cold start de plusieurs s) : éditeur Apps Script → ⏰ *Triggers* → *Add Trigger* → fonction `keepWarm` · *Time-driven* · *Minutes timer* · **toutes les 5 min** → Save.
- **Re-déploiement après modif du `.gs`** : *Gérer les déploiements → Modifier → Nouvelle version* → **l'URL `/exec` ne change pas** (rien à toucher côté front). Ne crée **pas** un *nouveau* déploiement (ça donnerait une nouvelle URL).
- **Changer le mot de passe sans redéployer** : ajoute un onglet `Config` (clé/valeur) avec une ligne `password` → `getCorrectPassword()` la lit en priorité sur `SETTINGS.PASSWORD`. Idem pour `period`, `last_update`, `challenge_start/end`.

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
- **Définis la sémantique de chaque classement EXPLICITEMENT — elle peut légitimement différer selon le périmètre.** Ici, décision validée avec le métier : le **challenge individuel** (Golden Boot, Rookie) compte le **New Business** ; le **classement d'équipe** (podium, "vainqueur") compte le **Total** (New Business + renouvellements). Ce n'est **pas** une incohérence : c'est un choix produit, écrit noir sur blanc. Note-le dans `DECISIONS.md` pour que personne ne le "corrige" par erreur plus tard.
- **Gère explicitement le cas "métrique indéfinie"** : une marge (GM) n'a de sens que s'il y a du volume. Quand une personne n'a pas de New Business, son GM individuel est **`null` → affiché "—"** (jamais 0, jamais pénalisé/cardé "low margin"). Décide ça par métrique, dès le contrat.
- **Quelques flags peuvent être dérivés côté serveur** (ex. `is_rookie` depuis l'ancienneté, `yellow_*` depuis les seuils) **avec une garde "données présentes"** : ne pas flagger tout le monde quand une colonne source est encore vide au démarrage du challenge.
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
- **Préserver le caret pendant un poll** : helpers `captureFocus()` / `restoreFocus()` sauvent l'élément focusé **et** son `selectionStart/End`, restaurés après le re-render → taper dans la recherche **n'est jamais interrompu** par un refresh en arrière-plan. (Indispensable dès qu'il y a un input + du polling.)
- **Pré-chauffer le backend pendant le login** : `prewarmBackend()` (un `?action=ping`) lancé **pendant que l'utilisateur lit/tape son code** → le cold start Apps Script (plusieurs s) est masqué, le 1er `fetchData` arrive sur un Web App déjà chaud.
- **États de cold start explicites** : loader "**WARMING UP** — waking the live data…" au tout premier chargement (pas un spinner muet), et un état vide "**Standings warming up**" tant que la donnée n'est pas prête (ex. < 3 entités classées au lancement) — au lieu d'un tableau vide qui a l'air cassé.
- **Période auto-calculée côté client** : `computeAutoPeriod()` dérive "Week N of N" à partir de `challenge_dates` (si on est dans la fenêtre), avec **fallback** sur le `period` du backend → plus besoin d'éditer un libellé chaque semaine.

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
- **Analytics en first-party uniquement** : ne charge **jamais** un script d'analytics (ou autre) depuis un **CDN tiers** — un paquet compromis pourrait lire le `localStorage` (donc le code d'accès). Utilise la variante same-origin (ici Vercel `/_vercel/…`), ce qui évite aussi d'élargir la CSP à un domaine tiers. *(Leçon payée : un bot avait branché Speed Insights via `jsdelivr` → refait en first-party.)*
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

**Ordre de mise en place (setup, une fois) :** 1) Sheet prête (onglets/colonnes stables, `SHEET_SPEC.md`) → 2) backend Apps Script collé + déployé (Web app, *Anyone*, scope Drive accepté) + **trigger `keepWarm`** installé → 3) `?action=ping` OK → 4) `APPS_SCRIPT_URL` renseignée dans `index.html` → 5) push → Vercel déploie → 6) tests (smoke/e2e/run-live) verts → 7) **premier snapshot manuel** avant le 1er cron : `curl -sS -L "$URL" --data '{"action":"data","password":"…"}' -o live.json && python3 scripts/snapshot.py live.json history` → 8) diffusion du lien + code.

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
- [ ] `cd test/e2e && node run.js` (parcours utilisateur complet contre le backend **live**, screenshots dans `shots/`) au vert — **regarder les screenshots**, pas seulement le code retour.
- [ ] Test de charge minimal : ~10 personnes ouvrent en même temps.
- [ ] **Distribution du lien prête** : URL publique courte/mémorisable + **QR code** généré (affiches, Teams), et le code d'accès communiqué par un canal séparé. Vérifier que le **link-preview** (og:image) s'affiche bien dans Slack/Teams/WhatsApp.
- [ ] Safe-areas OK sur un téléphone à encoche (rien sous la home-bar) ; états loading/erreur/Retry vérifiés en coupant le réseau.

---

## 14. Performance & budget de perf (consolidé)

> La perf est traitée *partout* dans le doc ; cette section la **rassemble** pour qu'aucun levier
> ne soit oublié. Objectif : **first paint < 1 s** et **interaction fluide même sur vieux mobile**,
> avec ~400 utilisateurs en simultané sur un backend Apps Script à quotas.

**Poids & premier rendu**
- **Un seul fichier statique** servi par le CDN Vercel, **gzip/brotli automatique** (~676 Ko brut
  → **~220 Ko compressé** dans notre cas). Surveille ce ratio : du JS/CSS répétitif compresse très
  bien, mais **les assets base64 inline (logo, images) gonflent le HTML non-cacheable séparément** →
  garde en base64 seulement le strict nécessaire (petit logo), tout le reste en fichiers `/cards`,
  `/icons` **cacheables à part** (headers longs, cf. §8).
- **Stale-while-revalidate** (snapshot localStorage) : au retour, l'app **peint la dernière donnée
  connue instantanément** pendant que le fetch frais tourne → pas d'écran blanc sur cold start.
- **Service worker** précache le shell → relance/offline peint tout de suite (§9).

**Fonts**
- **woff2 latin self-hosted** (~56 Ko les deux) + **`font-display: swap`** sur chaque `@font-face`
  → texte visible immédiatement en fallback puis swap, **jamais de FOIT** (texte invisible) ni de
  render-blocking sur un CDN tiers. Cache **1 an `immutable`**.

**Images**
- **webp** partout ; **deux résolutions** : thumb **256px** pour les petits ronds (listes, rails),
  full **1024px** réservé au héros/modale → on évite de charger ~5 Mo de portraits sur une vue dense
  HiDPI. **`loading="lazy"` + `decoding="async"`** systématiques ; **fallback initiales** si 404.
  **Versioning `?v=N`** (nom de fichier stable) pour défaire le cache HTTP quand l'art change.

**Coût par render (le poll reconstruit le DOM)**
- **Pré-calcul une fois par chargement** des agrégats coûteux (`cardsByTeam`, `cardsByRegion`,
  lookups de rang) → un render **ne re-filtre pas** toute la population par ligne (≈12k
  normalisations de chaîne/render économisées dans notre cas).
- **Classements triés une fois** après chaque fetch (`sortedX`), pas à chaque accès.
- **Sauter les re-renders no-op** : garde la `updated_at` du dernier paint (`lastRenderedUpdate`) ; si un poll renvoie la **même** valeur, **ne reconstruis pas le DOM** du tout. La donnée changeant ~hebdo, ça élimine la quasi-totalité des renders de polling.
- **Suspendre les animations pendant un re-render de fond** : un flag `suppressAnim` (vrai pendant un poll) **n'rejoue pas** les cascades d'entrée / count-ups (distinct de `prefers-reduced-motion` : ici on garde les animations pour les paints *intentionnels*, on les coupe juste pour les refresh silencieux).
- **`debounce`** sur les entrées qui filtrent (recherche, chips) → pas de render par frappe.
- **Animations via `requestAnimationFrame`** + **`will-change`** sur les éléments animés (ticker,
  confetti, count-up), et **tout coupé sous `prefers-reduced-motion`** (perf + accessibilité).
- **Éviter le layout shift (CLS)** : re-snapper le scroll **après** stabilisation du layout
  (images/portraits chargés) plutôt qu'avant (cf. A.9).

**Réseau & quota (le vrai facteur d'échelle ici)**
- **Polling lent (120 s) + jitter ±25 %** → évite le *thundering herd* de 400 clients synchronisés ;
  **pause onglet caché + après inactivité** ; **timeout de fetch** (20 s) pour ne pas pendre sur un
  cold start. Math de quota : Apps Script gratuit ≈ 20k req/jour ; 400 users × 120 s × 4 h ≈ 48k →
  d'où le **cache (chunké, TTL ~60 s) côté Apps Script** qui absorbe le reste (et fait office
  d'anti-DoS), + `keepWarm` contre les cold starts. Si ça déborde : allonger le poll, renforcer le
  cache (PropertiesService), ou passer aux **SSE** (§15).

**Mesure**
- **Vercel Speed Insights/Analytics en first-party** (§8) pour suivre LCP/CLS réels sans script tiers.

---

## 15. Évolutions futures (hors MVP, gardées en tête)
Push refresh (SSE/Pusher) au lieu du polling · Google SSO `@domaine` · stats d'évolution graphiques (snapshots historiques déjà capturés par le cron) · animations count-up sur les scores qui changent · notifications Slack sur nouveau #1 · **mode TV/projection** plein écran (`/projection`) · domaine custom via DNS de l'IT.

---

## 16. Pièges déjà payés (anti-patterns à éviter)
- **Ne renomme pas** les onglets/headers de la Sheet sans prévenir : ça flatline un classement. Le mapping tolérant amortit, mais surveille les `warnings`.
- **Ne sers jamais la donnée en GET** : le code partagé fuiterait dans l'URL/historique.
- **Ne fais pas confiance à un check d'overflow document-level** : le clipping intra-carte (`overflow:hidden`) est invisible pour lui. Teste *dans* les cartes, sur mobile.
- **N'oublie pas `connect-src`/`script-src` dans la CSP** quand tu ajoutes un domaine (API, analytics) : symptôme = "Failed to load data" + erreur CSP en console.
- **Apps Script répond par une redirection 302** vers un domaine de contenu : mets **`https://script.googleusercontent.com` dans `connect-src`** (en plus de `script.google.com`), sinon le `fetch` casse après le redirect. Côté curl (snapshot/test), utilise `-L` **sans** `-X` pour que le POST se rejoue en GET sur le 302.
- **Pas de `<script>` depuis un CDN tiers** (analytics, libs) : risque supply-chain (lecture du code d'accès en localStorage) → first-party only.
- **N'ajoute pas de `package.json` runtime** : tu casserais le "no build" et le déploiement statique. Installe les outils *à la volée*.
- **Le `.gs` du repo n'est pas le script déployé** : recolle + redéploie après chaque modif backend.
- **N'affiche pas d'indicateurs d'évolution tant que la donnée n'est pas stabilisée** (au début ils mentent).
- **Bump les clés `localStorage` versionnées** (`_vN`) quand tu changes la forme d'un état persistant, sinon tu lis du vieux format.

---

## 17. Kit de démarrage pour la PROCHAINE app (copie ce qui suit)

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

---

# ANNEXE A — Catalogue exhaustif UX / interactions (ne JAMAIS re-découvrir)

> **But.** Tout ce qui suit a été trouvé, débuggé et poli à la sueur sur l'app actuelle :
> boutons, flèches, bulles qui s'ouvrent/se ferment, flèches de retour qui ne sortent pas
> de l'app, troncatures invisibles, scroll qui saute, accessibilité… **Sur la prochaine app,
> tous ces comportements doivent être présents dès le départ.** Implémente-les comme des
> *exigences*, pas comme des "nice to have", et **garde chacun par un test** (voir Annexe B).
> Format : pour chaque point → **la règle**, puis *(le bug qu'on a payé)*.

## A.1 Navigation & bouton retour (ne JAMAIS sortir de l'app par erreur)

- **Pile de couches (layers) + bouton Retour navigateur géré.** Chaque overlay (modale joueur,
  modale équipe, modale nation, journal, recherche, compare, règles, TV) **pushe une entrée
  d'historique** à l'ouverture. Le **bouton Back du téléphone / `popstate`** ferme **la couche
  du dessus** (`closeTopLayer`) au lieu de quitter l'app. *(Bug payé : sur mobile, le réflexe
  "swipe back / bouton retour" faisait quitter le site au lieu de fermer la modale.)*
- **Retour contextuel (revenir d'où l'on vient, pas au menu).** Quand une carte joueur est
  ouverte **depuis** une autre vue (squad d'une équipe, d'une nation, ou depuis le **journal**),
  un **flag de retour** est posé (`playerReturnToTeam` / `playerReturnToNation` /
  `playerReturnToDigest`). Les **3 chemins de fermeture** — bouton à l'écran (`closePlayer`),
  Back navigateur (`popstate`/`closeTopLayer`), **Escape** — **honorent ce flag** et **rouvrent
  la vue d'origine** au lieu de retomber sur le menu. Le bouton affiche alors **"← Back"** (et non
  "← Close"). *(Bug payé : ouvrir "voir la carte" depuis le journal puis Retour renvoyait au menu,
  parce que le journal est un overlay retiré du DOM à l'ouverture de la carte — il n'avait aucune
  cible de retour.)*
- **Réinitialiser le flag de retour sur toute autre transition** (ouverture in-app directe, lien
  squad, saut vers un board) pour ne jamais hériter d'un état périmé. *(Bug payé : un flag laissé
  à `true` faisait "rebondir" vers une vue qu'on ne venait pas de quitter.)*
- **Pas de double-push d'historique** : une couche déjà ouverte ne re-pushe pas. Trace les
  scénarios à la main (Back, bouton écran, Esc, lien squad, view-full-ranking, ouverture in-app).

## A.2 Modales & overlays

- **Ouverture/fermeture uniformes** : tout overlay a un bouton de fermeture **visible** (← Back/
  Close), se ferme à **Escape**, au **clic sur le fond** (backdrop) et via le **Back navigateur**.
- **A11y dialog systématique** : helper `setDialogA11y()` → `role="dialog"` + `aria-modal="true"`
  + `aria-label` sur **chaque** overlay (joueur, équipe, nation, journal, règles, recherche,
  compare). **Le focus est déplacé dans le dialog à l'ouverture** (sur l'input s'il y en a un,
  sinon sur le bouton fermer). *(Sans ça : lecteur d'écran perdu, focus resté derrière l'overlay.)*
- **Préserver le scroll interne d'une modale au re-render** : helper
  `renderKeepModalScroll(overlayId)` capture/restaure le `scrollTop` du `.modal`. Utilisé par tous
  les toggles internes (ex. "Show all N"). *(Bug payé : un toggle "voir tout" reconstruisait le DOM
  → la modale remontait brutalement en haut.)*
- **Un seul conteneur scrollable par overlay** : l'overlay parent en `overflow:hidden`, le contenu
  scrolle **uniquement** dans `.modal`. *(Bug payé : 2 scrollers imbriqués → sticky header
  indéterministe, double scrollbar, ascenseur qui se battent.)*
- **Flèches flottantes haut/bas dans les longues modales** (`modalScrollNav()` /
  `.modal-scrollnav` / `.msn-btn`) : bouton rond navy+or en bas à droite, **scroll fluide** vers
  haut/bas, **auto-masqué** si le contenu n'est pas assez long (seuil ~120px). Présent sur nation,
  équipe, coach-dive **et** sur les overlays ajoutés hors `render()` (ex. carte TV) — d'où
  `bindModalScrollNav(root)` appelé **à la fois** sur `#app` (pour ne pas double-binder pendant le
  polling) **et** dans l'ouverture de l'overlay TV. *(Bug payé : sur un long classement on ne savait
  pas qu'il y avait de quoi scroller ; et les flèches n'étaient pas câblées dans l'overlay TV.)*
- **"Voir le classement complet" partout** : aucune liste ne plafonne sans échappatoire. Toggle
  **"Show all N"** avec état dédié (`nationContribExpanded`, `coachContribExpanded`,
  `coachPanelExpanded`, `licence_aw`, `rookies_aw`…). **Clés d'expansion distinctes** par contexte,
  sinon l'état "bave" d'une vue à l'autre. *(Bug payé : `licence_aw` partagé entre l'onglet Licence
  et la carte award → déplier l'un dépliait l'autre.)*

## A.3 Bulles / popovers (ouverture & fermeture rigoureuses)

C'est le point le plus piégeux. Le pattern validé :
- **Un seul popover flottant délégué** (`#cards-pop`) pour tous les badges (pas un popover par
  badge). Handler **délégué en phase capture**.
- **Tap = toggle** (rouvrir sur le même badge referme). **Une seule bulle à la fois.**
- **Le tap qui ouvre la bulle est "absorbé"** (`stopPropagation`) → il **n'ouvre pas** la modale/
  ligne **sous** le badge. *(Bug payé : taper le tally 🟨 sur le podium ouvrait *aussi* la modale
  d'équipe en dessous.)*
- **Fermeture** : tap **à côté** ferme (et ce tap-à-côté est absorbé, n'active rien d'autre),
  **Escape** ferme, **un vrai scroll** ferme. *(Bug payé : la bulle restait collée pendant le scroll.)*
- **Activation clavier** : un badge focusé s'ouvre à **Entrée** *et* **Espace**.
- **Survit au re-render/polling** : le toggle est keyé sur **le contenu** (identité logique), pas
  sur l'identité du nœud DOM — sinon un poll en arrière-plan reconstruit le DOM et la bulle "saute".
- **Contenu jamais tronqué dans la bulle** : `.cards-pop-row` en **`flex-wrap`** + sous-ligne pleine
  largeur (pas `white-space:nowrap` dans une boîte étroite). *(Bug payé : le détail "under 5
  meetings/wk · 3.0" était coupé dans la bulle de 240px.)*

## A.4 Boutons, flèches & affordances

- **Cibles tactiles ≥ 44px** sur tous les boutons d'action (norme tactile).
- **Menu "⋯" de débordement header sur petit mobile** (≤560px) : les boutons secondaires
  (🌙 dark / ℹ️ règles / 📲 install / 📺 TV) se replient derrière un **⋯** ; le menu se ferme au
  **clic extérieur**, à **Escape**, et **à la sélection**. Desktop inchangé (`display:contents`).
  *(Bug payé : 7 icônes ~42px tassées dans le header sur petit écran.)*
- **Affordance de lien visible sans hover** : les liens "équipe" (`.team-link`) ont un
  **soulignement pointillé persistant** (en `currentColor` → marche en clair *et* sombre), plein au
  survol. *(Bug payé : l'indice n'était qu'au hover → invisible sur tactile.)*
- **Ne pas rendre cliquable ce qui rouvre la même vue** : sur la fiche d'une équipe déjà ouverte,
  le "team" d'un membre s'affiche en **texte simple** (pas de lien qui rouvrirait le même modal). La
  modale **nation** garde le lien (équipes différentes). *(Bug payé : re-open inutile du modal.)*
- **Bouton refresh (admin)** : ↻ qui **spinne** pendant le fetch (`.spinning`), animation retirée
  après ~600ms. Réservé admin (`?admin=`).
- **Boutons toggle "médaille"** : or plein + texte navy → contraste OK en clair et en sombre.

## A.5 Tout est cliquable ET explicable (sans curseur trompeur)

- **Chaque élément cliquable résout vers une donnée réelle.** Audit runtime : tous les
  `data-jump`/`data-goboard`/`data-player` pointent vers une personne réelle / un onglet valide,
  et ont un handler **+ une affordance** (tooltip, `↗`, CTA).
- **Garde anti-nom périmé** : si une ligne (ex. ticker du journal) référence un joueur sorti des
  données, le tap **ne fait rien** au lieu d'ouvrir une fiche vide/cassée.
- **Pas de curseur `pointer` trompeur** : un élément non cliquable garde `cursor:default` (ex. hero
  du journal sans portrait → la *catégorie* devient le lien, pas tout l'article).
- **Stats auto-explicatives** : taper une stat (carte joueur, en-tête de colonne d'une modale)
  ouvre une **bulle d'explication de la métrique** (NB / NB GM / Licence GM / opps…) **+ un bouton
  "View full ranking →"** qui navigue vers le board correspondant. La modale **reste ouverte** quand
  on explique un en-tête de colonne. Tooltips glossaire partout sur les unités.

## A.6 Sémantique des liens (clic-droit / ctrl-clic / nouvel onglet)

- **Les lignes de classement et les onglets sont de vrais `<a href>`.** Ça active le **clic-droit →
  ouvrir dans un nouvel onglet** et le **Ctrl/Cmd-clic** (nouvel onglet) nativement.
- **Mais Ctrl/Cmd-clic n'ouvre PAS la modale dans l'onglet courant** (on laisse le navigateur
  ouvrir le nouvel onglet, on n'intercepte pas). Un clic simple, lui, ouvre la modale (et
  `preventDefault`). *(Détail qui fait "pro" : les power-users ouvrent plusieurs fiches en onglets.)*

## A.7 Troncature & débordement (le tueur silencieux)

- **`overflow:hidden` coupe en silence** : invisible à un check d'overflow document-level. **Toujours
  tester *dans* les cartes.** Règle : faire **wrapper** (`flex-wrap`) les rangées meta, pas déborder.
- **Tailles de police fluides** (`clamp(...)`) pour les valeurs de stats → tiennent de 320 à 1680px.
  Masquer les éléments secondaires (ⓘ) ≤360px.
- **Texte du hero qui passe sous un portrait** : garde-fou dédié — le label/stat du #1 ne doit pas
  déborder sous l'avatar. *(Bug payé : une fois la vraie webfont Anton chargée, la line-box du gros
  titre recouvrait/débordait.)*
- **Conséquence z-index d'une webfont** : Anton chargé pour de vrai recouvrait le badge 🟨 flottant
  de la carte → plus tappable. Fix : remonter le `z-index` de l'avatar qui porte le badge. *(Teste
  le tap APRÈS chargement des fonts.)*

## A.8 Responsive (points de rupture validés)

- **Tester 320 / 360 / 375 / 768 px** au minimum (et un sweep ~9 devices avant lancement).
- ≤600px : les en-têtes "titre + pastille" passent la **pastille pleine largeur sous le titre**
  (`min-width:0` sur le conteneur flex), avec une marge sup pour ne pas chevaucher le tableau au-dessus.
- ≤360px : masquer la ⓘ ; valeurs de stats en `clamp`.
- **Encoches / safe-areas (iPhone & co.)** : `<meta name="viewport" content="…, viewport-fit=cover">` **+** padding via `env(safe-area-inset-*)` sur les éléments fixés en bas/haut (bouton scroll-top, bannière install, barres collantes) → rien ne passe sous l'encoche ou la barre d'accueil. *(Sans ça, un CTA fixé en bas est mangé par la home-bar.)*
- **Aucun overflow horizontal** à ces largeurs, **toutes modales ouvertes comprises**.

## A.9 Scroll (ne jamais le faire sauter)

- **Préserver `window.scrollY` à travers chaque `render()` / poll** (sauver avant, restaurer après).
- **"View full ranking →" doit atterrir sur le classement**, pas sur le podium/hero — y compris sur
  **vrai smartphone**, en **re-snappant après stabilisation du layout** (images/portraits qui
  chargent, reveal du podium provoquent un *layout shift* qui décale la cible). *(Bug payé : sur
  mobile on atterrissait à côté car le scroll était calculé avant que les images aient poussé la page.)*
- **`scroll-margin-top`** sur les sections cibles d'une nav collante (≈58px) pour ne pas passer sous
  la barre sticky.

## A.10 Éléments collants (sticky) & empilement

- **Onglets sticky** sous le header. **Masthead du journal sticky** (z-index 10) **+ quick-nav
  "In this issue" sticky juste en-dessous** : hauteur du masthead **mesurée en JS** → `top` de la
  quick-nav (+ variable `--stick` pour le `scroll-margin-top`). Listener `resize` **nettoyé à la
  fermeture**. *(Bug payé : deux éléments sticky qui se chevauchaient.)*
- **Surbrillance de section active** dans la quick-nav via `IntersectionObserver` (root = le vrai
  scroller) ; **`observer.disconnect()` à la fermeture** (sinon fuite mémoire / observer fantôme).

## A.11 Préservation d'état au re-render (le polling reconstruit le DOM)

- **Toggles keyés sur le contenu, pas sur l'identité du nœud** → survivent au re-render du polling.
- **État des modales ouvertes préservé** pendant un poll (on ne ferme rien sous les doigts de
  l'utilisateur).
- **Caret/sélection préservés** : avant un re-render de poll, sauver l'`activeElement` **et** son
  `selectionStart/End` (`captureFocus`), restaurer après (`restoreFocus`) → on ne perd jamais sa
  place en train de taper dans la recherche. *(Bug payé : un poll en arrière-plan vidait/replaçait le
  champ pendant la frappe.)*
- **`suppressAnim` pendant les polls** : ne pas rejouer les cascades/count-ups sur un refresh
  silencieux (garde-les pour les ouvertures intentionnelles) — voir §14.
- **Animations d'entrée non rejouées sur un retour** : classe `.mag-instant` → revenir d'une carte
  restaure instantanément à la position mémorisée, sans rejouer la cascade. **Count-up sauté au
  retour** (on n'anime pas deux fois). *(Bug payé : chaque retour relançait toute l'animation.)*

## A.12 Accessibilité (clavier & lecteurs d'écran)

- **`role="dialog"` + `aria-modal` + focus déplacé** dans chaque overlay (cf. A.2).
- Les cibles cliquables qui sont des `div`/`article` (non-`button`) reçoivent **`role="button"` +
  `tabindex="0"`** et s'activent à **Entrée *et* Espace**.
- **Pas d'interactif imbriqué dans de l'interactif** : si une ligne joueur est déjà un `<a>`,
  ne pas y mettre un second `role=button`+`tabindex` (ex. `.team-link` **exclu** de la passe clavier
  `[data-team]:not(.team-link)`). *(Bug payé : double arrêt Tab, focus piégé.)*
- **`aria-hidden`** sur le décoratif (ex. marquee BREAKING), **`aria-label`** sur les médailles/icônes.
- **`role="status"` + `aria-live="polite"`** sur les zones de feedback transitoire (toast, badge
  "⚠ sync failed", flash de refresh) → annoncées au lecteur d'écran sans voler le focus.
- **Rendre le focus à l'ouvreur** : à la fermeture d'un overlay, refocaliser l'élément qui l'avait
  ouvert (`opener = document.activeElement` mémorisé à l'ouverture).

## A.13 Formulaires & saisie

- **Le clic de fermeture (backdrop/extérieur) respecte les champs de formulaire** : cliquer/
  sélectionner dans un input ne ferme pas l'overlay. *(Bug payé : sélectionner du texte dans la
  recherche fermait la modale.)*
- **`autofocus`** sur l'input principal d'un overlay ; **Entrée = valider**.

## A.14 États vides, robustesse & garde-fous data

- **Métrique indéfinie ≠ zéro** : une marge sans volume n'a pas de sens → afficher **"—"** (valeur
  `null`), pas `0`, et **ne jamais pénaliser/carder** sur une métrique indéfinie. *(cf. §6 : GM
  individuel `null` quand pas de New Business.)*
- **Ne jamais mettre en avant un leader à valeur 0** dans une carte "star"/journal (une colonne
  source vide ne doit pas produire un faux champion).
- **Recherche : message gracieux** quand aucun résultat (pas d'écran vide), et **recherche fuzzy
  insensible aux accents** (García → "garcia", nom de famille seul suffit).
- **Sections conditionnelles** : n'afficher une section que si elle a du contenu (rookies/licence…).
- **Échappement HTML systématique** des données venant de la Sheet (test XSS dédié : une donnée
  malicieuse ne doit ni s'exécuter ni injecter d'élément).
- **App fonctionne même si `localStorage` est bloqué** (mode privé) → le login atteint quand même
  le leaderboard (try/catch autour de tout accès storage).
- **Rangs avec égalités** : ex æquo partagent le même rang (rang de compétition), et le rang affiché
  sur la fiche joueur **matche** celui du board (tie-aware). **Jamais d'égalité à écart 0** affichée
  comme un duel serré.

## A.15 Thème sombre

- **Dark mode togglable** (🌙), persistant. **Toutes les affordances doivent marcher dans les deux
  thèmes** → privilégier `currentColor` (ex. soulignement pointillé), fonds de bulle/nav **opaques**
  en sombre (sinon le texte derrière transparaît).

## A.16 Mouvement & animation (toujours sous `prefers-reduced-motion`)

- **Toute animation** (cascade d'entrée du journal `magIn`, count-up des chiffres, foil
  holographique, balayage glossy, confetti, flash du nouveau #1) est **désactivée sous
  `prefers-reduced-motion`** et la **valeur finale exacte est rendue d'abord** (no-JS / reduced-motion
  = état correct immédiat).
- **Indicateurs d'évolution ▲▼** : utiles mais **trompeurs tant que la base de données n'est pas
  stable** → derrière un flag (`MOVEMENT_BADGES_ENABLED`) qu'on n'active qu'une fois la donnée
  hebdo fiable. *(Bug payé : "▲4" affiché sur une équipe déjà #1 → deltas faux pendant le ramp-up.)*

## A.17 Fonts & icônes

- **Webfonts self-hosted** (woff2 latin dans `/fonts`, cache 1 an immutable) — **pas de CDN Google
  Fonts** : sinon `Failed to load resource` casse la CI (le smoke test échoue sur toute erreur
  console) et l'app dépend d'un tiers. *(Bug payé exactement comme ça.)*
- **Emoji multicolore dans un carré jaune rend mal** → on garde le 🟨 nu et on met le type
  (🏃/🥅) dans la **bulle**, pas *dans* le carton.

## A.18 Onboarding

- **Tour de première visite** (overlay `#tour-ov` avec étapes, Skip/Next) qui **présente les
  fonctions clés** (dont le journal). Une fois vu, **flag localStorage** → ne réapparaît pas.
  Il **overlay et intercepte les clics** → les tests doivent le *dismisser* avant d'interagir.

## A.19 Feedback de célébration & états transitoires (le "vivant")

- **Célébration mesurée** : un **nouveau #1** déclenche un **flash doré** (`flash-gold`, 3 cycles)
  + un **toast** (`#toast-root`, auto-dismiss) ; confetti sur les moments forts. **Tout sous
  `prefers-reduced-motion`** (animations coupées) et **non bloquant** (pointer-events:none sur le
  toast). C'est ce qui donne l'impression que "ça bouge" sans gêner la lecture.
- **Compare l'ancien et le nouvel état au poll** pour savoir *quoi* célébrer (le #1 a-t-il changé
  depuis le dernier render ?) — d'où l'intérêt des snapshots de rang en localStorage.
- **État loading brandé** (pas un spinner nu) : un écran de chargement aux couleurs/au thème de
  l'app pendant le premier fetch (et masqué instantanément si un snapshot est hydraté, cf. §7).
- **État erreur + Retry explicite** : si le tout premier fetch échoue (et aucun snapshot), montre
  un message clair **avec un bouton Retry**, pas un écran blanc. En polling, ne casse rien : badge
  discret "⚠ sync failed" (cf. A.1/§7).
- **Copier-le-lien / actions de partage** avec **retour visuel** : un bouton qui passe en état
  `.copied` (✓) après copie presse-papier, ou un toast "✅ Shared!". L'utilisateur doit *voir* que
  l'action a marché.

---

# ANNEXE B — La liste de non-régression (chaque ligne = un test à reprendre)

Ces assertions sont **déjà** dans `test/ux-smoke.cjs` et `test/ux-e2e.cjs`. **Reprends-les comme
spec d'acceptation de la prochaine app** (adapte les sélecteurs/données). Si une régression de
l'Annexe A se reproduit, c'est qu'un de ces tests manque.

**Smoke (rapide, lancé au pre-push) :**
i18n — aucune clé `t()` brute qui fuit · l'app rend après login · le tour d'onboarding se ferme ·
CTA "Find your position" bascule sur l'onglet ET amène le champ de recherche dans le viewport
(pas coincé sur le hero) · My Position résout une carte · recherche fuzzy/accents trouve "Garcia" ·
no-match → message gracieux · carte joueur s'ouvre · carte joueur se ferme à Esc · modale équipe
s'ouvre · journal s'ouvre · journal → carte joueur s'ouvre · **fermer la carte restaure le journal
(pas le menu)** · le journal a un joueur tappable · recherche globale s'ouvre et renvoie un résultat ·
**aucun contenu clippé dans une carte @360px, sur tous les onglets** · le texte du hero tient et
dégage le portrait (pas de débordement sous l'avatar) · texte des cartes Panini/journal ne déborde
pas (hors ellipsis) · rangée de stats de la carte tient @320px · la bulle d'explication de stat
reste à l'écran @320px · les lignes membres montrent la ligne meta résumée sur mobile.

**E2E (profond, lancé en CI) :**
Admin débloque VAR TIME + Coach Room · VAR TIME rend · modale VAR review s'ouvre · clic verdict (no
crash) · Coach Room rend · deep-dive KPI s'ouvre · KPI GM cliquable → deep-dive · recherche Coach
trouve un joueur et montre Total GM + NB GM · **tally 🟨 (N) présent · tap tally → bulle split ·
tap tally n'ouvre PAS la modale squad · cliquer la carte referme la bulle sans ouvrir la modale ·
tap à côté ferme la bulle · Escape ferme · Entrée sur tally focusé ouvre · toggle survit au
re-render** · tap d'un carton individuel → bulle raison · tap carton n'ouvre pas la carte joueur ·
"Full ranking" se déplie · valeurs Golden Boot taguées NB · tap NB → explique New Business (sans
ouvrir la carte) · label de métrique du board explique · partage de carte (no crash) · compare
s'ouvre · titre du ticker ouvre la carte · **TV : le #1 reste visible quand on scrolle · panneau
suivant (no crash) · carte joueur par-dessus la projection · taper une nation ouvre son drilldown ·
sortie du TV** · dark mode toggle · en-tête de colonne explique sa métrique (la modale reste
ouverte) · **Ctrl-clic ouvre un nouvel onglet sur le deep-link · Ctrl-clic n'ouvre PAS la modale ·
les lignes joueur sont de vrais `<a>` · les onglets sont de vrais `<a>`** · @375 aucun overflow,
modale joueur ouverte · cold load : un tricheur montre un carton, un conforme est clean · Panini :
🟨 flottant tappable → bulle · l'explication "On a yellow card" a 🏃 + 🥅 · tap stat → bulle ·
la bulle offre "View full ranking →" · "View full ranking →" navigue vers le board · **…et y
atterrit malgré un layout shift** · reload (hydrate snapshot) : le tricheur montre toujours un
carton · équipe aliasée se replie dans sa région · pas de nation fantôme · équipe affiche surnom +
vrai nom · **Espace ouvre une carte (a11y)** · rep sans New Business → ligne GM neutre dans My
Position · **XSS : donnée malicieuse ne s'exécute pas / n'injecte aucun élément** · **localStorage
bloqué : le login atteint quand même le leaderboard** · playmakers ex æquo partagent un rang ·
photo finish jamais à écart 0 · rang playmaker de la carte == board (tie-aware).

---

# ANNEXE C — Checklist d'acceptation UX à appliquer DÈS le départ (prochaine app)

Coche tout ça avant de considérer une vue "finie". C'est la condensation des annexes A/B en punch-list.

**Navigation/retour** — [ ] Back navigateur ferme la couche du dessus, ne quitte pas l'app · [ ]
retour contextuel (carte ouverte depuis X → revient à X, bouton "← Back") · [ ] Esc ferme la couche
du dessus · [ ] pas de double-push d'historique.
**Modales** — [ ] backdrop + Esc + bouton ferment · [ ] `role=dialog`+`aria-modal`+focus déplacé ·
[ ] scroll interne préservé au toggle · [ ] un seul scroller par overlay · [ ] flèches haut/bas sur
les longues modales (auto-masquées si court) · [ ] "Voir tout N" partout, clés d'état distinctes.
**Bulles** — [ ] tap ouvre (toggle), tap-à-côté/Esc/scroll ferment · [ ] le tap est absorbé (n'ouvre
pas la vue dessous) · [ ] une seule à la fois · [ ] Entrée+Espace · [ ] survit au re-render · [ ]
contenu wrap (jamais tronqué).
**Boutons/affordances** — [ ] cibles ≥44px · [ ] menu ⋯ header sur petit mobile · [ ] affordance de
lien visible sans hover (currentColor) · [ ] pas de lien qui rouvre la vue courante · [ ] refresh
qui spinne (admin).
**Cliquable & explicable** — [ ] tout cliquable résout une donnée réelle · [ ] garde anti-nom périmé ·
[ ] pas de curseur pointer trompeur · [ ] stats → bulle d'explication + "View full ranking →".
**Liens** — [ ] lignes & onglets = vrais `<a href>` · [ ] Ctrl/Cmd-clic = nouvel onglet sans ouvrir
la modale.
**Overflow** — [ ] rien de clippé *dans* les cartes (flex-wrap) · [ ] polices `clamp` · [ ] tester
APRÈS chargement des fonts.
**Responsive** — [ ] 320/360/375/768 sans overflow horizontal, modales ouvertes comprises · [ ]
safe-areas (`viewport-fit=cover` + `env(safe-area-inset-*)`) sur les éléments fixés.
**Feedback/états** — [ ] loading brandé · [ ] erreur + Retry (jamais d'écran blanc) · [ ] célébration
nouveau #1 (flash/toast) sous reduced-motion · [ ] actions de partage/copie avec retour visuel · [ ]
i18n via `t()` (aucune clé brute qui fuit).
**Scroll** — [ ] `scrollY` préservé à chaque render/poll · [ ] "View full ranking" atterrit sur le
board, re-snap après layout shift · [ ] `scroll-margin-top` sous les barres sticky.
**Sticky** — [ ] empilement masthead+quicknav mesuré en JS · [ ] section active surlignée · [ ]
observers/listeners nettoyés à la fermeture.
**État** — [ ] toggles keyés contenu (survivent au poll) · [ ] modales ouvertes préservées au poll ·
[ ] animations non rejouées au retour, count-up sauté.
**A11y** — [ ] `role=button`+`tabindex` + Entrée/Espace sur cibles non-button · [ ] pas d'interactif
imbriqué · [ ] `aria-hidden` décoratif / `aria-label` icônes.
**Formulaires** — [ ] clic de fermeture respecte les inputs · [ ] autofocus + Entrée valide.
**Robustesse** — [ ] jamais de leader à 0 en vedette · [ ] no-match gracieux · [ ] sections
conditionnelles · [ ] HTML échappé (test XSS) · [ ] marche sans localStorage · [ ] rangs tie-aware.
**Thème/motion** — [ ] dark mode OK pour toutes les affordances · [ ] tout sous `prefers-reduced-motion`,
valeur finale rendue d'abord · [ ] indicateurs ▲▼ derrière un flag tant que la data n'est pas stable.
**Fonts** — [ ] webfonts self-hosted (pas de CDN) · [ ] tester le tap après chargement font.
**Onboarding** — [ ] tour 1ʳᵉ visite, dismissable, flag localStorage.

---

---

# ANNEXE D — Ce qui rend l'app "géniale" : principes de conception (transférables, pas à cloner)

> **Lis ceci en premier quand tu conçois une nouvelle app.** Le but n'est PAS de refaire le mode
> TV ou le journal à l'identique — ton prochain projet aura d'autres données et un autre thème.
> Le but est de **réappliquer les principes** qui ont fait que celle-ci "claque". Chaque section
> donne *le principe* (réutilisable partout), puis *comment il s'est incarné ici* (exemple concret),
> puis *les questions à te poser* pour le transposer.

## D.0 Les 8 principes-noyaux (à graver)

1. **Une métaphore unique, appliquée jusqu'au bout.** Le thème n'est pas une déco posée sur un
   tableau : c'est **l'architecture de l'information**. Ici, le foot/Coupe du Monde structure *tout*
   le vocabulaire (Golden Boot = volume, Playmaker = opportunités, Yellow Card = règle enfreinte,
   VAR = revue, World Cup Winner = #1). Résultat : un commercial comprend son classement sans manuel.
   → *Choisis UNE métaphore qui colle au métier, et décline-la dans chaque libellé, icône, couleur,
   animation. Une métaphore cohérente vaut dix features.*
2. **Chaque chiffre s'explique et mène à sa preuve.** Aucun nombre n'est un cul-de-sac : on le tape,
   une bulle dit *ce que c'est et pourquoi il compte*, et un lien mène au **classement complet** qui
   le justifie. L'app est sa propre documentation.
3. **Des visages partout.** Un leaderboard de noms est froid ; des **portraits** le rendent humain et
   "désirable" (on veut voir sa tête sur la carte). L'identité (photo/initiales/couleur d'équipe) est
   un fil rouge sur toutes les surfaces.
4. **Une donnée, plusieurs surfaces selon le contexte.** Le même dataset alimente : le **téléphone
   perso** (consultation rapide, My Position), la **projection TV** (ambiant, glanceable, dans les
   locaux), et l'**outil opérateur** (Coach Room / VAR, réservé admin). On ne refait pas la donnée,
   on **re-cadre l'affichage** pour l'usage.
5. **Une couche éditoriale qui raconte la donnée.** Au-dessus des tableaux, un **récit auto-généré**
   (titres, chapôs, "stat de la semaine", duels) transforme des chiffres en **histoire qu'on suit
   chaque semaine**. C'est ce qui crée l'attachement et le retour.
6. **Hiérarchie glanceable : un héros + un peloton.** Partout, le pattern "**#1 mis en scène + la
   chasse classée**" (le *match-sheet*) donne un point focal immédiat et de la lisibilité. On voit
   l'essentiel en 1 seconde, le détail si on veut.
7. **Tout est data-driven et conditionnel.** Rien n'est codé en dur : une section n'apparaît que si
   elle a du contenu, les seuils/libellés viennent d'**une source unique** (`RULES`), les classements
   se recalculent côté client. Ajouter une photo ou changer un seuil ne touche pas la logique.
8. **Le plaisir sans nuire à la compréhension.** Animations, foil holographique, confetti, count-up :
   présents, mais **toujours derrière `prefers-reduced-motion`** et **la valeur exacte rendue
   d'abord**. Le delight est un bonus, jamais un péage devant l'information.

## D.1 Le pattern "match-sheet" (héros + peloton) — réutilisable pour tout classement

- **Principe** : un classement plat fatigue. Mets **le premier en scène** (grande carte, portrait,
  stat héroïque = "man of the match") et liste les suivants en **peloton compact** à côté. Deux
  colonnes en desktop (`minmax(0, .95fr) / minmax(0,1.05fr)`), **empilées en mobile** (≤760px).
- **Ici** : `renderMatchSheet(list, opts)` sert Golden Boot, Playmaker, Rookie… une seule fonction,
  réutilisée. Les rangs sont **tie-aware** (ex æquo partagent le rang, et le top-5 est cohérent avec
  la fiche joueur).
- **À te poser** : quelle est la "stat héroïque" de ta nouvelle app ? Qui est le "man of the match"
  d'une catégorie ? Réutilise une **seule** fonction de rendu paramétrée pour tous tes boards.

## D.2 La couche éditoriale / "magazine" — fabriquer du récit à partir de la donnée

- **Principe** : les gens reviennent pour une **histoire**, pas pour un tableau. Génère, **à partir
  de la donnée elle-même**, une "une" : un gros titre choisi par priorité (frontrunner ? photo
  finish ? remontée ?), des **chapôs** (deks) sous chaque section, une **stat de la semaine**, un
  **duel** des deux premiers, une **équipe de la semaine**, une signature de "rédaction". Le ton est
  éditorial mais **les chiffres restent exacts et cliquables**.
- **Ce qui l'a rendu bon (itérations payées)** :
  - **Toujours présent** (pas seulement quand il y a du neuf) → c'est "le journal qu'on achète",
    avec une **pastille rouge "nouveau numéro"** seulement quand l'édition change (le lundi).
  - **Riche en images** : la v1 "liste plate" a échoué ; ce sont les **cartes Panini + visages
    partout** qui l'ont fait décoller. *Leçon : un récit sans visages tombe à plat.*
  - **Auto-explicable et sans sortie** : les catégories/tags **scrollent vers la section** du numéro
    plutôt que d'éjecter vers un autre onglet → on **ne quitte jamais le journal** par accident.
  - **Quick-nav collante** + surbrillance de section active pour un long numéro.
  - **Partage en image** : générer une "une" PNG partageable (Web Share + fallback download) →
    viralité interne gratuite.
  - **Robustesse** : jamais de leader à 0 en vedette ; garde anti-nom périmé sur chaque mention.
- **À te poser** : quel est le "gros titre" naturel de ta semaine de données ? Quelles 2-3 brèves
  un humain en tirerait ? Génère-les depuis la donnée, donne-leur un visage, rends-les cliquables.

## D.3 Le mode "projection / ambiant" — une surface glanceable, pas une page web rétrécie

- **Principe** : pour un écran dans les locaux (ou une réunion), il faut une surface **plein écran,
  sans navigation, lisible à 5 mètres**, qui se suffit en un coup d'œil. Ce n'est pas la page normale
  agrandie : c'est un **deck de panneaux** au design dédié (gros titres, fond riche, contrastes forts).
- **Ce qui l'a rendu bon** :
  - **Ne se met pas en pause idle** (contrairement au polling normal) : un écran de projection doit
    rester vivant.
  - **Pas de hover/pointeur** → les infos sont *glanceable only* (le tally 🟨 ( N ) est un indicateur,
    pas un tooltip).
  - Reprend le **match-sheet** (#1 héros sticky + peloton) ; quand on déplie une liste, le **#1 reste
    visible** (sticky) au lieu de disparaître en haut.
  - **`safe center`** : un panneau est centré s'il tient, sinon il bascule en haut et devient
    scrollable → jamais clippé en bas de l'écran.
- **À te poser** : ta nouvelle app sera-t-elle un jour projetée / vue de loin / en réunion ? Si oui,
  prévois **dès le départ** une surface ambiante dédiée (un mode `?tv=1`), pas un bricolage tardif.

## D.4 Surfaces "opérateur" réservées (admin) — divulgation progressive par rôle

- **Principe** : le grand public (les ~400 commerciaux) ne doit voir qu'une UI simple. Les **outils
  d'animation/pilotage** (suivi d'objectifs, deep-dive par entité, revue de sanctions) sont des
  **surfaces séparées débloquées par rôle** — ici via `?admin=` (flag localStorage). Ça **gate de la
  commodité, pas de la donnée** (cf. modèle de sécurité §8) : la clé est dans le bundle.
- **Ici** : **Coach Room** (KPIs cliquables → deep-dive par nation/équipe, recherche par nom montrant
  Total GM *et* NB GM côte à côte, snapshot discipline) et **VAR TIME** (revue des "cartons", verdicts
  **locaux** non publiés). Onglets admin **ajoutés dynamiquement** à la barre quand le mode est actif.
- **Ce qui l'a rendu bon** : les KPIs sont des **cartes cliquables** (affordance `.coach-kpi-click`
  hover/active/on) qui ouvrent un deep-dive — pas des chiffres morts. La recherche évite le parcours
  pénible nation→équipe→joueur.
- **À te poser** : qui *pilote* ton challenge/outil ? De quoi a-t-il besoin que le public ne doit pas
  voir ? Fais-en une surface admin séparée, dynamique, qui ne pollue pas l'UI publique.

## D.5 Identité & cartes "Panini" — humaniser la donnée

- **Principe** : transformer une ligne de tableau en **objet désirable** (une carte à collectionner)
  crée de l'engagement émotionnel. Portrait teinté à la couleur de l'équipe, rang, stats héroïques,
  finitions (foil, reflets) **sous reduced-motion**.
- **Mécanique réutilisable** (déjà décrite §11) : slug déterministe du nom → `cards/<slug>.webp`,
  **fallback initiales** si pas de photo (donc on ajoute des photos au fil de l'eau **sans toucher au
  code**), thumb 256px pour les petits ronds, full 1024px pour le héros, versioning `?v=` pour le cache.
- **À te poser** : peux-tu donner un **visage** (photo, avatar, logo, emoji-totem) à chaque entité de
  ta donnée ? Si oui, fais-le partout — c'est un multiplicateur d'attachement.

## D.6 Les invariants qui rendent l'ensemble "solide" (pas seulement joli)

Ce qui fait que ça paraît *pro* et tient dans le temps — à reproduire systématiquement :
- **Source unique des règles métier** (`RULES`) : seuils + libellés + emojis au même endroit → zéro
  divergence entre une bulle, le glossaire, la prose des règles, et le calcul.
- **Pré-calcul une fois par chargement** (splits par équipe/nation, rangs) → un re-render coûte zéro
  re-filtrage de toute la population. Performance perçue irréprochable même sur vieux mobile.
- **Tout passe par le live + le snapshot** : `stale-while-revalidate` → l'app peint instantanément au
  retour, jamais d'écran blanc, le timestamp dit la fraîcheur.
- **Aliases & overrides centralisés** (`TEAM_ALIASES`, `PEOPLE_TEAM_OVERRIDES`) pour absorber une
  donnée amont imparfaite **sans bloquer l'app** ni harceler le data owner — documentés dans
  `DECISIONS.md`, avec la reco durable (clé sur un ID stable, pas le nom).
- **Drapeaux/visuels avec fallback gracieux et anti-confusion** (ex. un visuel dédié plutôt qu'un
  drapeau de pays voisin trompeur).

## D.7 Comment transposer (mini-protocole pour la prochaine app)

1. **Choisis la métaphore** et écris le **glossaire** (terme thème ↔ métrique réelle) AVANT de coder.
2. **Liste les surfaces** : public mobile (la base), + éventuellement *ambiant/projection* + *opérateur
   admin*. Décide lesquelles tu veux dès le MVP.
3. **Identifie la stat héroïque** de chaque catégorie → réutilise un **seul** match-sheet paramétré.
4. **Donne un visage** à chaque entité (pipeline slug + fallback).
5. **Écris la couche éditoriale** : quel gros titre la donnée raconte-t-elle ? 2-3 brèves ? une
   stat-de-la-semaine ? Génère-les depuis la donnée, cliquables, avec visage.
6. **Centralise les règles** (`RULES`) et rends **chaque chiffre cliquable → explicable → traçable**.
7. **Applique l'Annexe C** (UX) à chaque vue, **garde par des tests** (Annexe B), **journalise** dans
   `DECISIONS.md`.

---

# ANNEXE E — Fichiers de référence prêts à copier (le playbook est auto-suffisant)

> **But.** Centraliser ici **tout le code d'infrastructure réutilisable**, pour que **donner ce seul
> fichier** suffise à scaffolder une nouvelle app. Les petits fichiers sont **verbatim** (copie-colle
> direct, adapte juste les valeurs marquées `⟨…⟩`). Les gros (`index.html`, backend, tests) sont des
> **squelettes distillés** : la structure et les patterns qui comptent, sans les 10k lignes
> spécifiques au thème. Ordre de création conseillé : E.1 → E.13.

## E.1 Arborescence à créer
```
nouveau-projet/
├── index.html                  (E.12 — la plateforme : <head>, CSS par sections, <script>)
├── apps_script_backend.gs      (E.11 — collé dans l'éditeur Apps Script, PAS déployé par Vercel)
├── vercel.json                 (E.6)   service-worker.js (E.7)   manifest.webmanifest (E.8)
├── robots.txt (E.9)            eslint.config.mjs (E.4)           .gitignore (E.3)
├── .claude/settings.json       (E.2)
├── .githooks/pre-push          (E.5)
├── .github/workflows/ux-tests.yml (E.10)   .github/workflows/snapshot.yml (E.10)
├── scripts/snapshot.py         (E.10)
├── test/ux-smoke.cjs (E.13)    test/ux-e2e.cjs   test/run-live.sh
├── CLAUDE.md  DECISIONS.md  SHEET_SPEC.md  README.md  PLAYBOOK.md (ce fichier)
└── icon-192.png  icon-512.png  icon-maskable-512.png  og-image.png  fonts/*.woff2
```

## E.2 `.claude/settings.json` (verbatim — active superpowers)
```json
{
  "extraKnownMarketplaces": {
    "superpowers-marketplace": { "source": { "source": "github", "repo": "obra/superpowers-marketplace" } }
  },
  "enabledPlugins": { "superpowers@superpowers-marketplace": true }
}
```

## E.3 `.gitignore` (verbatim)
```gitignore
node_modules/
.env
.env.*
*.local
.DS_Store
Thumbs.db
.vscode/
.idea/
*.swp
dist/
*.log
.claude/settings.local.json
```

## E.4 `eslint.config.mjs` (verbatim — lint l'inline `<script>`, le SW, les tests ; PAS de package.json)
```js
import html from 'eslint-plugin-html';
import globals from 'globals';

const jsRules = {
  'no-undef': 'error', 'no-redeclare': 'error', 'no-dupe-keys': 'error', 'no-dupe-args': 'error',
  'no-func-assign': 'error', 'no-const-assign': 'error', 'no-cond-assign': ['error', 'except-parens'],
  'no-unsafe-negation': 'error', 'no-self-assign': 'error', 'no-unreachable': 'error',
  'use-isnan': 'error', 'valid-typeof': 'error',
  'eqeqeq': ['warn', 'smart'], 'no-empty': ['warn', { allowEmptyCatch: true }],
  'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none', ignoreRestSiblings: true }],
};
export default [
  { ignores: ['**/node_modules/**', 'cards/**', 'qr/**', 'history/**', 'test/e2e/**'] },
  { files: ['index.html'], plugins: { html },
    languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: { ...globals.browser } }, rules: jsRules },
  { files: ['service-worker.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: { ...globals.serviceworker, ...globals.browser } }, rules: jsRules },
  { files: ['test/**/*.cjs', 'test/**/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs', globals: { ...globals.node, ...globals.browser } }, rules: jsRules },
];
```
Lancer : `npm i -D eslint eslint-plugin-html globals && npx eslint .`

## E.5 `.githooks/pre-push` (verbatim — lint + smoke, skip gracieux). Activer : `git config core.hooksPath .githooks`
```bash
#!/usr/bin/env bash
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
command -v node >/dev/null 2>&1 || { echo "[pre-push] node not found — skipping checks."; exit 0; }
if [ -x "$ROOT/node_modules/.bin/eslint" ]; then
  echo "[pre-push] Running ESLint…"
  "$ROOT/node_modules/.bin/eslint" "$ROOT" || { echo "[pre-push] ❌ ESLint errors — aborting (bypass: git push --no-verify)"; exit 1; }
else echo "[pre-push] ESLint not installed — skipping."; fi
node -e "try{require('playwright')}catch(e){require(require('child_process').execSync('npm root -g').toString().trim()+'/playwright')}" >/dev/null 2>&1 || {
  echo "[pre-push] Playwright not installed — skipping UX test."; exit 0; }
echo "[pre-push] Running UX smoke test…"
node "$ROOT/test/ux-smoke.cjs"; code=$?
[ $code -ne 0 ] && echo "[pre-push] ❌ UX smoke failed — aborting (bypass: git push --no-verify)"
exit $code
```

## E.6 `vercel.json` (verbatim — ⚠️ adapte `connect-src`/`script-src` aux domaines de TON API + analytics)
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "cleanUrls": true,
  "headers": [
    { "source": "/(.*)", "headers": [
      { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "X-Robots-Tag", "value": "noindex, nofollow" },
      { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
      { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self' https://script.google.com https://script.googleusercontent.com https://va.vercel-analytics.com https://vitals.vercel-insights.com; object-src 'none'; base-uri 'none'; frame-ancestors 'self'" }
    ]},
    { "source": "/(.*\\.png)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=86400, stale-while-revalidate=604800" }] },
    { "source": "/fonts/(.*\\.woff2)", "headers": [
      { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" },
      { "key": "Content-Type", "value": "font/woff2" } ]},
    { "source": "/(index.html)?", "headers": [{ "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }] },
    { "source": "/service-worker.js", "headers": [
      { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" },
      { "key": "Content-Type", "value": "application/javascript; charset=utf-8" } ]},
    { "source": "/manifest.webmanifest", "headers": [{ "key": "Content-Type", "value": "application/manifest+json; charset=utf-8" }] }
  ]
}
```

## E.7 `service-worker.js` (verbatim — network-first navigations, cache-first assets, API jamais touchée ; bump `CACHE` à chaque release)
```js
const CACHE = 'app-shell-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil((async () => {
  try { const c = await caches.open(CACHE); await Promise.all(SHELL.map(u => c.add(u).catch(() => {}))); } catch (err) {}
  self.skipWaiting();
})()); });
self.addEventListener('activate', e => { e.waitUntil((async () => {
  const keys = await caches.keys(); await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
  await self.clients.claim();
})()); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;            // laisse le POST data tranquille
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;                        // cross-origin (analytics) passe direct
  if (url.hostname.indexOf('script.google.com') !== -1) return;      // ne JAMAIS cacher l'API
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(req, c)); return r; })
      .catch(async () => (await caches.match(req)) || (await caches.match('./index.html')) || (await caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(req).then(m => m || fetch(req).then(r => {
    const c = r.clone(); caches.open(CACHE).then(ca => ca.put(req, c)); return r;
  }).catch(() => new Response('', { status: 504, statusText: 'Offline' }))));
});
```
Enregistrement (dans `index.html`) : `if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js');`

## E.8 `manifest.webmanifest` (verbatim — adapte name/couleurs/icônes)
```json
{
  "name": "⟨App name⟩", "short_name": "⟨Short⟩", "description": "⟨…⟩",
  "start_url": ".", "scope": ".", "display": "standalone", "orientation": "portrait-primary",
  "background_color": "#1E2A78", "theme_color": "#1E2A78",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "launch_handler": { "client_mode": "navigate-existing" }
}
```

## E.9 `robots.txt` (verbatim — outil interne ; les bots d'unfurl l'ignorent → les link-previews marchent)
```
User-agent: *
Disallow: /
```
+ dans `<head>` : `<meta name="robots" content="noindex, nofollow">` et les balises `og:`/`twitter:` pour les previews.

## E.10 CI & snapshot
**`.github/workflows/ux-tests.yml`** (verbatim, install à la volée) :
```yaml
name: UX tests
on: { push: { branches: [ main ] }, pull_request: {}, workflow_dispatch: {} }
permissions: { contents: write, pull-requests: write }
jobs:
  lint:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm init -y >/dev/null 2>&1 && npm install --no-save eslint@9 eslint-plugin-html@8 globals@15
      - run: npx eslint .
  ux:
    runs-on: ubuntu-latest
    timeout-minutes: 12
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm init -y && npm install --no-save playwright@1.56.1 && npx playwright@1.56.1 install --with-deps chromium
      - run: node test/ux-smoke.cjs
      - run: node test/ux-e2e.cjs
```
**`.github/workflows/snapshot.yml`** : cron hebdo qui POST l'API (secret `APP_PASSWORD` = le code d'accès), passe la réponse à `scripts/snapshot.py`, commit `history/<date>.json` `[skip ci]`. ⚠️ Mets ton `APPS_SCRIPT_URL` en `env:` et le `APP_PASSWORD` en secret repo. (Curl en `-L` sans `-X` pour suivre le 302 d'Apps Script.)
**`scripts/snapshot.py`** : lit le JSON, **échoue bruyamment** si `error`/payload trop petit (`teams<10`/`people<100`), trime aux champs utiles, écrit `history/<UTC>.json` compact. (Rangs dérivés à la lecture, pas stockés.)

## E.11 `apps_script_backend.gs` (squelette distillé — SETTINGS + mapping tolérant + warnings ; à coller dans l'éditeur Apps Script puis Déployer → Web app → *Anyone*)
```js
const SETTINGS = {
  PASSWORD: '⟨access-code⟩', PERIOD: 'Week 1 of 5',
  CHALLENGE_START: '2026-06-01', CHALLENGE_END: '2026-07-03',
  EXCLUDED: [],                                   // ex. ['MOROCCO'] (insensible casse)
  TEAMS_TAB:  { name: '⟨Tab A⟩', headerRow: 1 },  // adapte nom + ligne des headers
  PEOPLE_TAB: { name: '⟨Tab B⟩', headerRow: 1 }
};
// Mapping par header normalisé + fallback regex (lookaheads pour séparer les variantes).
const PEOPLE_MAP = [
  { field: 'name',  header: 'Full name', match: /full ?name|nom/ },
  { field: 'team',  header: 'TEAM',      match: /^team$|équipe|entity/ },
  { field: 'score', header: '⟨Col⟩',     match: /⟨keyword⟩/, numeric: true },
  // … un objet par champ. numeric:true → toNumber(); pct:true → décimal.
];
const TEAM_MAP = [ /* idem côté équipes */ ];

const SS = SpreadsheetApp.getActiveSpreadsheet();
const json = d => ContentService.createTextOutput(JSON.stringify(d)).setMimeType(ContentService.MimeType.JSON);
// Header normalisé : minuscules + espaces/retours-ligne collapsés → " Full  Name\n" matche 'Full name'.
const normHeader = h => String(h == null ? '' : h).toLowerCase().replace(/\s+/g, ' ').trim();
// Coercition robuste : '', null, #DIV/0!, #N/A, "1 234,56 €" → nombre (ou 0). Indispensable sur du BI.
function toNumber(v){ if(v===''||v==null) return 0; if(typeof v==='number') return isFinite(v)?v:0;
  let s=String(v).trim(); if(/#(div|n\/a|ref|value|name|num)/i.test(s)) return 0;
  s=s.replace(/[^0-9,.\-]/g,'').replace(',', '.'); const n=parseFloat(s); return isFinite(n)?n:0; }
function lastDataUpdate(){ try{ return DriveApp.getFileById(SS.getId()).getLastUpdated().toISOString(); }
  catch(e){ return new Date().toISOString(); } }   // ⚠️ nécessite le scope Drive, sinon "now"

function readTab(tab, map, warnings){                 // mappe une feuille → objets, remonte les warnings
  const sh = SS.getSheetByName(tab.name); if(!sh){ warnings.push('missing tab '+tab.name); return []; }
  const rows = sh.getDataRange().getValues(); const head = rows[tab.headerRow-1].map(normHeader);
  const idx = {};
  map.forEach(m => {
    const wanted = (m.headers||[m.header]).map(normHeader);
    let i = head.findIndex(h => wanted.includes(h));
    if(i<0 && m.match) i = head.findIndex(h => m.match.test(h));   // fallback mot-clé (regex à lookaheads)
    if(i<0 && !m.optional) warnings.push('header not found: '+m.field+' (seen: '+head.join(' | ')+')');
    idx[m.field] = i;
  });
  return rows.slice(tab.headerRow).map(r => { const o={};
    map.forEach(m => { let v = idx[m.field]>=0 ? r[idx[m.field]] : (m.optional?'':'');
      if(m.numeric) v=toNumber(v); if(m.pct && v>1.5) v=v/100; o[m.field]=v; }); return o; });
}
// Onglets optionnels clé/valeur : override le mot de passe / période / dates SANS redéployer.
function readConfig(){ const sh=SS.getSheetByName('Config'); if(!sh) return {}; const c={};
  sh.getDataRange().getValues().slice(1).forEach(r=>{ if(r[0]) c[String(r[0]).trim()]=r[1]; }); return c; }
function readSpecialAwards(){ const sh=SS.getSheetByName('Special Awards'); if(!sh) return {}; /* … key→{name,team,…} */ return {}; }
const ex = t => new Set(SETTINGS.EXCLUDED.map(s=>s.toUpperCase())).has(String(t||'').toUpperCase().trim());
function getCorrectPassword(){ const c=readConfig(); return (c.password!=null && c.password!=='') ? String(c.password) : String(SETTINGS.PASSWORD); }
const passwordOk = p => String(p==null?'':p) === getCorrectPassword();

// --- Cache chunké : CacheService plafonne à ~100 Ko/clé. 45000 CHARS reste sous la barre
// même si chaque char est un accent 2 octets (é, ø, þ…) — à 90000 un chunk accentué dépasse
// et putAll throw, désactivant le cache pour TOUS. Best-effort : le cache ne doit jamais casser la réponse.
const CACHE_CHUNK = 45000;
function cacheGetLarge(c, k){ try{ const n=parseInt(c.get(k+'_n'),10); if(!(n>0)) return null;
  const keys=[]; for(let i=0;i<n;i++) keys.push(k+'_'+i); const parts=c.getAll(keys); let out='';
  for(let i=0;i<n;i++){ const p=parts[k+'_'+i]; if(p==null) return null; out+=p; } return out; }catch(e){ return null; } }
function cachePutLarge(c, k, val, ttl){ try{ const o={}; let n=0;
  for(let i=0;i<val.length;i+=CACHE_CHUNK){ o[k+'_'+n]=val.substring(i,i+CACHE_CHUNK); n++; } o[k+'_n']=String(n);
  c.putAll(o, ttl); }catch(e){} }

function dataResponse(fresh){
  const cache=CacheService.getScriptCache(), KEY='data_v1';
  if(!fresh){ const hit=cacheGetLarge(cache, KEY); if(hit) return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON); }
  const cfg=readConfig(), w=[];
  const teams=readTab(SETTINGS.TEAMS_TAB, TEAM_MAP, w).filter(t=>t.country && !ex(t.country));
  const people=readTab(SETTINGS.PEOPLE_TAB, PEOPLE_MAP, w).filter(p=>p.name && !ex(p.team))
    .map(p => Object.assign({}, p, {                       // flags dérivés CÔTÉ SERVEUR
      is_rookie: /months|</.test(String(p.tenure||'')),
      // garde "données présentes" : ne carde pas tout le monde quand une colonne est vide au démarrage
      yellow_meetings: (p.meetings||0) < 5 && ((p.ps_total||0)>0 || (p.ps_nb||0)>0 || (p.meetings||0)>0),
      yellow_gm: (p.ps_total_gm||0) < 0.25 && (p.ps_total||0)>0 }));
  const payload=JSON.stringify({ teams, people,
    updated_at: cfg.last_update || lastDataUpdate(), period: cfg.period || SETTINGS.PERIOD,
    challenge_dates:{ start: cfg.challenge_start||SETTINGS.CHALLENGE_START, end: cfg.challenge_end||SETTINGS.CHALLENGE_END },
    special_awards: readSpecialAwards(), warnings: w });
  cachePutLarge(cache, KEY, payload, 60);                  // 60s ; le refresh admin ↻ passe fresh=true (bypass)
  return ContentService.createTextOutput(payload).setMimeType(ContentService.MimeType.JSON);
}

// Data = POST only. doGet ne sert QUE le ping santé ; il REFUSE action=data en GET pour que le
// code d'accès ne fuite jamais en query string (logs Apps Script / historique / referrer).
function doGet(e){ const a=(e&&e.parameter&&e.parameter.action)||'data';
  if(a==='ping') return json({ok:true,time:new Date().toISOString()});
  return json({error:'unauthorized', hint:'POST {action:"data", password} — pas servi en GET.'}); }
function doPost(e){ let b={}; try{ b=JSON.parse(e.postData.contents); }catch(_){}
  if(b.action==='verify_password') return json(passwordOk(b.password)?{ok:true}:{error:'unauthorized'});
  if(b.action==='data') return passwordOk(b.password) ? dataResponse(false) : json({error:'unauthorized'});
  return json({error:'unknown action'}); }

// Garde le Web App chaud (sinon 1er visiteur = cold start de plusieurs s) ET primes le cache 60s.
// TRIGGER (à installer une fois) : éditeur → ⏰ Triggers → Add Trigger → keepWarm · Time-driven ·
// Minutes timer · toutes les 5 min → Save.
function keepWarm(){ try{ dataResponse(true); }catch(e){} }
```
> **Tuning quota** (si > ~400 users / quota serré) : allonger le TTL du cache (60→120 s), allonger
> `POLL_INTERVAL_MS` côté front, ou passer aux **SSE** (§15). Note : un **Google Workspace** a des
> limites d'exécution plus hautes qu'un compte gratuit — à confirmer avant un gros lancement.

## E.12 `index.html` — squelette de la couche live (le reste = ton CSS/render thématique)
```html
<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<!-- og:/twitter: pour les previews · <link rel="manifest" href="manifest.webmanifest"> · fonts woff2 self-hosted -->
<style>:root{--navy:#1E2A78;--gold:#F2C75C;/* …palette: re-thémer = changer ces variables */}
/* === BASE === / === HEADER === / === TABS === / === HERO === / === MODAL === / === LIVE: login === / === RESPONSIVE === */</style>
</head><body><div id="app"></div><script>
'use strict';
const CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/⟨ID⟩/exec',
  POLL_INTERVAL_MS: 120000, IDLE_TIMEOUT_MS: 15*60*1000, FETCH_TIMEOUT_MS: 20000,
  SESSION_KEY: 'app_session_v1', PWD_KEY: 'app_pwd_v1',
  ADMIN_KEY: '⟨admin-secret⟩', ADMIN_FLAG: 'app_admin_v1',
  SNAPSHOT_KEY: 'app_data_v1', SNAPSHOT_MAX_AGE_MS: 90*24*60*60*1000
};
// --- état mutable ---
let DATA=null, teams=[], people=[], updated_at=null, period='', challenge_dates={};
let lastSyncFailed=false;
const store = { get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},
                set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}, del:k=>{try{localStorage.removeItem(k)}catch(e){}} };
// --- data ---
function recompute(){ /* sortedX = [...people].sort(...) — TOUT le classement se calcule ici, client-side */ }
async function fetchData(){
  const ctrl=new AbortController(); const to=setTimeout(()=>ctrl.abort(), CONFIG.FETCH_TIMEOUT_MS);
  try{
    const res=await fetch(CONFIG.APPS_SCRIPT_URL,{method:'POST',signal:ctrl.signal,
      body:JSON.stringify({action:'data',password:store.get(CONFIG.PWD_KEY)})});
    const d=await res.json(); if(d.error) throw new Error(d.error);
    DATA=d; teams=d.teams||[]; people=(d.people||[]).filter(p=>p.name);
    updated_at=d.updated_at; period=d.period; challenge_dates=d.challenge_dates||{};
    recompute(); store.set(CONFIG.SNAPSHOT_KEY, JSON.stringify({t:Date.now(),d}));
    lastSyncFailed=false; return true;
  }catch(err){ console.error('fetch failed',err); lastSyncFailed=true; return false; }
  finally{ clearTimeout(to); }
}
// --- login (vérif serveur) ---
async function attemptLogin(pwd){ try{
  const r=await fetch(CONFIG.APPS_SCRIPT_URL,{method:'POST',body:JSON.stringify({action:'verify_password',password:pwd})});
  const d=await r.json(); if(d.ok){ store.set(CONFIG.SESSION_KEY,'1'); store.set(CONFIG.PWD_KEY,pwd); return true; } return false;
}catch(e){ return false; } }
const isLoggedIn=()=>store.get(CONFIG.SESSION_KEY)==='1';
// --- render (idempotent, préserve scroll + modales) ---
function render(){ const y=window.scrollY; /* …build DOM dans #app… */ window.scrollTo(0,y);
  /* bind: refresh-btn → manualRefresh ; badge "⚠ sync failed" si lastSyncFailed */ }
// --- polling (jitter, pause cachée/idle) ---
let pollId=null, lastActivity=Date.now();
['click','keydown','scroll','touchstart'].forEach(ev=>addEventListener(ev,()=>lastActivity=Date.now(),{passive:true}));
function startPolling(){ stopPolling(); const tick=async()=>{
  if(document.hidden || Date.now()-lastActivity>CONFIG.IDLE_TIMEOUT_MS) return schedule();
  if(await fetchData()) render(); schedule(); };
  const schedule=()=>{ const j=CONFIG.POLL_INTERVAL_MS*(0.75+Math.random()*0.5); pollId=setTimeout(tick,j); };
  schedule();
}
function stopPolling(){ if(pollId) clearTimeout(pollId); pollId=null; }
document.addEventListener('visibilitychange',()=>{ if(document.hidden) stopPolling(); else startPolling(); });
async function manualRefresh(){ const b=document.getElementById('refresh-btn'); if(b)b.classList.add('spinning');
  await fetchData(); render(); if(b) setTimeout(()=>b.classList.remove('spinning'),600); }
// --- init (login → hydrate snapshot → fetch → render → poll) ---
async function init(){
  if(!isLoggedIn()){ /* renderLoginScreen() ; submit → attemptLogin → init() */ return; }
  const snap=store.get(CONFIG.SNAPSHOT_KEY);                       // stale-while-revalidate : peint tout de suite
  if(snap){ try{ const s=JSON.parse(snap); if(Date.now()-s.t<CONFIG.SNAPSHOT_MAX_AGE_MS){ DATA=s.d; teams=s.d.teams||[];
    people=(s.d.people||[]).filter(p=>p.name); updated_at=s.d.updated_at; period=s.d.period; recompute(); render(); } }catch(e){} }
  const ok=await fetchData(); if(!ok && !DATA){ /* écran erreur + Retry */ return; } render(); startPolling();
}
if(new URLSearchParams(location.search).get('admin')===CONFIG.ADMIN_KEY) store.set(CONFIG.ADMIN_FLAG,'1');
if('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js');
init();
</script></body></html>
```

## E.13 `test/ux-smoke.cjs` — squelette du harnais (sert le repo, mocke l'API, pilote la vraie app)
```js
'use strict';
const http=require('http'), fs=require('fs'), path=require('path');
let PW; try{ PW=require('playwright'); }catch{ console.error('install playwright'); process.exit(2); }
const ROOT=path.resolve(__dirname,'..');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
function mockData(){ return { teams:[/* …shape exacte de l'API… */], people:[/* … */],
  updated_at:new Date().toISOString(), period:'Week 1 of 5', challenge_dates:{start:'2026-06-01',end:'2026-07-03'}, special_awards:{}, warnings:[] }; }
(async()=>{
  const server=http.createServer((req,res)=>{ let p=decodeURIComponent(req.url.split('?')[0]); if(p==='/')p='/index.html';
    fs.readFile(path.join(ROOT,p),(e,b)=>{ if(e){res.writeHead(404);return res.end();} res.writeHead(200,{'content-type':MIME[path.extname(p)]||'application/octet-stream'}); res.end(b); }); });
  await new Promise(r=>server.listen(0,r)); const BASE=`http://localhost:${server.address().port}/index.html`;
  const results=[],errors=[]; const log=(n,ok,x='')=>results.push({ok,line:`${ok?'✅':'❌'} ${n}${x?' — '+x:''}`});
  const browser=await PW.chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:1280,height:900}});
  await ctx.route('**script.google.com**', r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(mockData())}));
  const page=await ctx.newPage();
  page.on('pageerror',e=>errors.push('PAGEERROR: '+e.message));            // toute erreur JS = échec
  page.on('console',m=>{ if(m.type()==='error') errors.push('CONSOLE: '+m.text()); });
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  if(await page.$('#login-pwd')){ await page.fill('#login-pwd','test'); await page.click('#login-btn'); }
  // … dismiss onboarding, click tabs, open/close modals, search, popovers, overflow @320/360/375 …
  // (reprends les assertions de l'Annexe B comme spec)
  for(const w of [320,360,375,768]){ await page.setViewportSize({width:w,height:800});
    const of=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1); log(`No horizontal overflow @${w}`,!of); }
  await browser.close(); server.close();
  results.forEach(r=>console.log(r.line)); errors.forEach(e=>console.log('  '+e));
  process.exit(results.some(r=>!r.ok)||errors.length ? 1 : 0);
})();
```
`test/run-live.sh` : smoke du **backend réel** (ping / mauvais mot de passe rejeté / pull authentifié + checks de shape/compte/intégrité référentielle). Lancer avant de diffuser l'URL et après chaque redeploy Apps Script.

## E.14 Documents-compagnons à initialiser (gabarits)
- **`CLAUDE.md`** : contexte + **état cible** + archi + URLs + checklist de validation (cf. §13). Lu en début de session.
- **`DECISIONS.md`** : entête avec la **convention** (entrée datée la + récente en haut) + section **"⚠️ Actions en attente (humains)"** vide. Mis à jour en fin de session.
- **`SHEET_SPEC.md`** : le **contrat data owner** (onglets, colonnes, ordre, types, décimales, exclusions).
- **`README.md`** : setup one-time (Sheet → Apps Script → front → Vercel), **modèle de sécurité honnête**, section **Mobile & touch**, commandes de test, preview local.

---

# ANNEXE F — La suite de tests de CE repo (opérationnel : lancer / déboguer / étendre)

> La **méthode** (pyramide à 3 niveaux + boucle de vérification agentique) est en **§3.5–3.8**.
> Cette annexe est le **mode d'emploi concret** de la suite `test/` telle qu'elle existe dans ce
> repo : **tous les tests regroupés** au même endroit, comment les lancer / déboguer / étendre,
> un **mémo CLI Playwright**, et les **pièges d'environnement déjà payés** (TLS, service worker,
> scripts Vercel-only, dérive de données live). Cible : Léandre et tout futur intervenant.
>
> *Cette annexe a fusionné l'ancien `PLAYWRIGHT_PLAYBOOK.md` (supprimé) — c'est désormais la
> source unique sur les tests.*

## F.0 Point clé sur la stack

On utilise la **librairie `playwright` brute** (`require('playwright')`) dans des runners Node
`.cjs`, **pas** le test runner `@playwright/test`. Choix délibéré : **aucun `package.json`
racine** n'est commité → le déploiement Vercel reste un **site statique pur** (les deps de
test/lint s'installent à la volée en CI et via le hook pre-push). Conséquence : les commandes
`npx playwright test …` **ne s'appliquent pas** ici — on lance `node test/<runner>.cjs`. Le
test Puppeteer (`test/e2e/`) est un **sous-projet isolé** avec son propre `node_modules`
(non commité).

## F.1 Tous les tests, en un seul endroit

| Test | Couvre | Niveau (pyramide §3.8) | Deps | Réseau | Quand le lancer |
|---|---|---|---|---|---|
| `test/backend-contract.js` | logique back-end `apps_script_backend.gs`, Apps Script mocké dans une sandbox `vm` | **1** — offline | aucune | aucun | **avant de redéployer** l'Apps Script |
| `test/ux-smoke.cjs` | **rapide** : login, onglets, CTA « Find your position », modales, recherche + fuzzy, overflow @320/375/768, rien de clippé dans une carte sur mobile, intégrité i18n | **1** — mocké, headless | Playwright + Chromium | **mocké** (zéro Google) | à **chaque changement UI** (lancé au pre-push) |
| `test/ux-e2e.cjs` | **profond** : admin (VAR TIME / Coach Room / VAR review), mode TV, partage de carte, ticker, compare, sous-vues, dark mode, deep-links, popovers **tap** mobile | **1** — mocké, headless | Playwright + Chromium | **mocké** | avant un lancement / **après une grosse refonte** (lancé en CI) |
| `test/run-live.sh` | l'API **déployée** réelle : ping, mauvais mot de passe rejeté, pull authentifié, checks de **shape / compte / intégrité référentielle** | **2** — API live | `curl`, `python3` | **live** (`script.google.com`) | **après chaque redeploy** Apps Script / debug « Failed to load data » |
| `test/e2e/run.js` | **parcours utilisateur complet en navigateur** contre le back-end **live** ; re-dérive les classements depuis le payload chargé et les **compare au DOM** ; **screenshots** de chaque état | **3** — navigateur + live | Puppeteer + Chromium (sous-projet `test/e2e/`) | **live** | **avant un lancement** / après un gros changement UI |

Code de sortie `0` = tout vert ; `1` = un check a échoué ou une erreur JS a été levée.

**Isolation des runners navigateur (important).** Les `ux-*.cjs` et `e2e/run.js` lancent **leur
propre serveur statique** pour servir le repo. Les trois **bloquent le service worker** et
**stubbent `**/_vercel/**`** (Vercel Speed Insights, servi *uniquement* en prod sur Vercel) pour
ne garder que les **vraies** erreurs. Les `ux-*` **interceptent `script.google.com`** et
renvoient un dataset mocké (login + payload) → zéro secret, zéro réseau Google, déterministe.
`run.js` tape au contraire le **vrai** back-end (d'où son niveau 3).

## F.2 Pré-requis & installation

Playwright + Chromium sont **pré-installés dans les sessions cloud Claude Code** (et le hook
`SessionStart` s'en assure — voir F.6). En local :

```bash
npm i -D playwright && npx playwright install chromium   # pour ux-smoke / ux-e2e
npm i -D eslint eslint-plugin-html globals               # pour le lint
cd test/e2e && npm install                               # puppeteer-core + Chromium (test live navigateur)
```

Pas de `package.json` racine : ces `npm i -D` créent un `node_modules/` local **non commité**
(ignoré par `.gitignore`). C'est voulu.

## F.3 Lancer les tests

```bash
# Niveau 1 — offline / mocké (zéro réseau, déterministe)
node test/backend-contract.js   # contrat back-end (sandbox vm)
node test/ux-smoke.cjs           # UX rapide (login, tabs, modals, responsive)
node test/ux-e2e.cjs             # UX profond (admin, TV, share, compare, dark…)

# Lint (mêmes règles que la CI)
npx eslint .

# Niveau 2 — API live déployée
bash test/run-live.sh
APPS_SCRIPT_URL=https://script.google.com/macros/s/…/exec PASSWORD=… bash test/run-live.sh
EXPECT_TEAMS=34 bash test/run-live.sh     # ajuster le compte d'équipes attendu (cf. F.7)

# Niveau 3 — parcours complet en navigateur contre le back-end live (Puppeteer)
cd test/e2e && node run.js
E2E_INSECURE=1 node run.js                # réseau managé qui intercepte le TLS (cf. F.7)
```

## F.4 🎯 Mémo CLI Playwright

Avec la **librairie `playwright`**, la CLI sert surtout à **installer les navigateurs** et à
**écrire/déboguer des sélecteurs** (le « run » des tests passe par `node test/<runner>.cjs`).

```bash
# Navigateurs
npx playwright install chromium              # juste Chromium (ce dont les runners ont besoin)
npx playwright install --with-deps chromium  # + libs système (Linux/CI ; nécessite apt)
npx playwright --version

# Écrire des tests par enregistrement (trouver des sélecteurs robustes)
python3 -m http.server 8000                  # 1) servir l'app
npx playwright codegen http://localhost:8000 # 2) enregistrer ses clics → code généré
npx playwright codegen --device="iPhone 14" http://localhost:8000   # en émulation mobile

# Inspecter / capturer
npx playwright open http://localhost:8000                    # app + inspecteur de sélecteurs
npx playwright screenshot --device="iPhone 14" http://localhost:8000 shot.png

# Déboguer un runner pas-à-pas
PWDEBUG=1 node test/ux-smoke.cjs             # ouvre le Playwright Inspector
```

> Codegen démarre sur l'**écran de login** : tape le code d'accès (`devoteam2026`) pour
> atteindre le leaderboard, puis enregistre. Les binaires viennent de **`cdn.playwright.dev`** —
> en session Claude Code web, cet hôte doit être dans l'allowlist réseau (**Custom** +
> `cdn.playwright.dev`, ou niveau **Full**), sinon le download renvoie `403`.

Pour voir la fenêtre en continu : passer ponctuellement `headless: true` → `false` (et éventuellement
`slowMo: 250`) dans le `chromium.launch({…})` du runner — **à ne pas committer**. Côté Puppeteer
(`e2e/run.js`) : `E2E_HEADFUL=1 node run.js`.

## F.5 Sélecteurs stables de la plateforme

| Élément | Sélecteur |
|---|---|
| Champ mot de passe / bouton login | `#login-pwd` / `#login-btn` |
| Erreur login | `.login-error` |
| Barre d'onglets / onglet | `#tabs-bar` / `.tab-btn[data-tab="golden"]` (`teams`/`spotlight`/`golden`/`playmaker`/`awards`/`var`/`position` ; + `vartime`/`coach` en admin) |
| Onglet actif | `.tab-btn.active` |
| Ligne équipe / carte podium | `.teams-table-row[data-team="…"]` / `.podium-card[data-team="…"]` |
| Ligne / carte joueur | `[data-player="Louis MASSON"]` |
| Hero « match-sheet » | `.ms-hero[data-player]` / peloton `.ms-row[data-player]` |
| Modal squad / carte joueur | `#modal-overlay` (ou `.modal-overlay`) / `#player-overlay` |
| Timestamp live / refresh (admin) | `#last-update` / `#refresh-btn` (caché sauf `?admin=leandre-refresh-2026`) |
| Recherche My Position | `#position-search` |

Privilégier `getByRole` / `getByText` quand possible (résistant aux refactors CSS).

## F.6 CI, hook pre-push & sessions web

- **`.github/workflows/ux-tests.yml`** — sur chaque push/PR : job **lint** (`npx eslint .`) puis
  job **ux** (installe Playwright+Chromium, lance `ux-smoke.cjs` puis `ux-e2e.cjs`, commente en
  cas d'échec). Les runners GitHub ont un egress ouvert : `playwright install --with-deps
  chromium` y passe. (Détail méthode : §3.7.)
- **`.github/workflows/snapshot.yml`** — snapshot hebdo de la donnée live → `history/`.
- **Pre-push hook** `.githooks/pre-push` — lance ESLint + le smoke test avant chaque `git push`
  (skip gracieux si Node/Playwright absents). À activer une fois par clone :
  `git config core.hooksPath .githooks`. Contourner ponctuellement : `git push --no-verify`.
- **Sessions Claude Code web** — chaque session démarre dans un conteneur neuf. Le hook
  **`.claude/hooks/session-start.sh`** (enregistré dans `.claude/settings.json`) installe
  automatiquement Playwright + Chromium (et ESLint). Idempotent, non-interactif, **ne casse jamais
  le démarrage** : si `cdn.playwright.dev` n'est pas autorisé, il l'indique et la session démarre
  quand même. Pré-requis réseau : `cdn.playwright.dev` en allowlist **Custom** (ou **Full**), puis
  **démarrer une nouvelle session** (un changement de policy ne s'applique pas au conteneur déjà lancé).

## F.7 Dépannage (dont pièges live déjà payés)

**`Playwright not found` / `Executable doesn't exist`** — `npm i -D playwright && npx playwright
install chromium` (ou attendre le hook en session web ; géré par `ux-tests.yml` en CI).

**`Host not in allowlist: cdn.playwright.dev` (403)** — la policy réseau bloque le download.
Environnement en **Custom + `cdn.playwright.dev`** (ou **Full**), puis **nouvelle** session.

**Un test UX échoue / « flaky »** — `PWDEBUG=1 node test/ux-smoke.cjs` pour rejouer pas-à-pas ;
vérifie les sélecteurs (F.5) et préfère les attentes auto (`waitForSelector`) aux délais fixes.

**`e2e/run.js` : `net::ERR_CERT_AUTHORITY_INVALID` sur toutes les requêtes** — réseau managé
(cloud/CI) qui intercepte le HTTPS avec une CA privée que le Chromium de Puppeteer ne connaît pas.
Relancer avec **`E2E_INSECURE=1`** (n'affecte en rien la prod, qui sert des certs publics valides).

**`e2e/run.js` : erreurs console 404 résiduelles** — déjà neutralisées : le runner **bloque le
service worker** (ses fetchs de précache `script.googleusercontent` / assets remontaient en
console mais pas via `page.on('response')`) et **stub `/_vercel/`** (Speed Insights, prod-only).
Si de **nouvelles** 404 apparaissent, ce sont de vrais assets manquants — investigue, ne masque pas.

**`run-live.sh` : `team count = N, expected 32`** — ce n'est pas un bug de code mais une **dérive
de donnée** : le compte d'équipes du `Team Ranking` live ne vaut plus 32. Vérifie côté Sheet
(Jose) si c'est voulu ; pour faire passer le check sur l'état courant, surcharge
`EXPECT_TEAMS=<N> bash test/run-live.sh` (ou `EXPECT_TEAMS= ` vide pour sauter le check).
Le « people on teams missing from Team Ranking » est un **warning** (pas un échec) : ces personnes
classent quand même, elles n'ont juste pas d'équipe où driller.

**Apps Script 302 en curl** — utiliser `-L` **sans** `-X` (sinon le POST se rejoue en GET sur le
redirect). En navigateur, `connect-src` doit inclure `script.googleusercontent.com` (cf. §16).

**ESLint casse la CI** — `npx eslint .` en local avant de pousser (config `eslint.config.mjs` :
« vrais bugs = erreurs, style = warnings »).

## F.8 Étendre la suite (la règle culturelle)

**Chaque bug UX corrigé → une assertion** ajoutée au niveau 1 (`ux-smoke`/`ux-e2e`, cf. Annexe B).
La liste des tests = la liste des régressions déjà payées ; le commit log est plein de
`test+fix(ux): …`, c'est voulu. Pour un nouveau check : repère un sélecteur stable (F.5 ou
`codegen`), ajoute un `log('…', condition)` au runner adéquat, et garde le test **déterministe**
(backend mocké, attentes auto). Les pièges d'environnement (TLS, SW, scripts prod-only) se
neutralisent **dans le runner**, pas en relâchant l'assertion.

## F.9 Vérif interactive pilotée par agent — `playwright-cli` (hors suite de non-régression)

`playwright-cli` ([microsoft/playwright-cli](https://github.com/microsoft/playwright-cli), npm
**`@playwright/cli`**) est un binaire qui laisse **un agent** (Claude Code…) piloter un navigateur
**pas-à-pas** en ligne de commande : `open` → `snapshot` (qui renvoie un arbre d'accessibilité avec
des **refs** `e10`, `e11`…) → `click e11` / `fill e10 "…"` / `type` → `screenshot` → `close`. C'est
une **alternative économe en tokens à MCP** (pas de gros schémas d'outils ni d'arbres a11y verbeux
chargés en contexte).

> **Ce n'est PAS un test de la suite.** Les runners de F.1 sont des **scripts de non-régression
> déterministes** (committés, backend mocké, assertions figées). `playwright-cli` est un **outil
> de vérif/inspection ad hoc** : constater visuellement un bug, explorer un parcours, confirmer un
> fix sur l'URL **live/preview** — sans écrire de script. Les deux sont **complémentaires** et
> orthogonaux. Boucle qui se referme : ce qu'on valide à la main ici, si c'est récurrent, **on le
> fige ensuite en assertion** dans `ux-smoke`/`ux-e2e` (F.8).

**Installation.** Le **skill est committé** dans `.claude/skills/playwright-cli/` (SKILL.md +
`references/`) → découvrable par l'agent dès le clone. Le **hook SessionStart** installe le
**binaire** automatiquement en session web (best-effort). Le **canal Chrome** (plus lourd) reste
**à la demande**, au premier pilotage de navigateur :
```bash
npm install -g @playwright/cli@latest   # binaire (le hook le fait en session web)
npx playwright install chrome           # canal "chrome" requis (PAS le chromium bundlé) — 1re utilisation
playwright-cli --version                # 0.1.x
playwright-cli install --skills         # (déjà fait) (ré)installe le skill agent dans .claude/skills/
```

**Workflow type — exactement ce qui a été joué contre la plateforme live :**
```bash
playwright-cli open https://groupsaleschallenge.vercel.app/   # ouvre + navigue
playwright-cli snapshot                       # → refs : textbox "Enter access code" [ref=e10], button … [ref=e11]
playwright-cli fill e10 "devoteam2026"        # saisir le code d'accès
playwright-cli click e11                      # cliquer « ACCESS THE LEADERBOARD »
playwright-cli snapshot                        # vérifier : banner LIVE + "Last updated … · Week N of 5"
playwright-cli screenshot                      # PNG de l'état courant
playwright-cli close
```
Ciblage des éléments : **ref de snapshot** (`e10`), sélecteur CSS unique (`#login-pwd`) ou locator
Playwright. Sessions parallèles : `playwright-cli -s=<nom> <cmd>`. Cibler les sélecteurs stables de
F.5. Le tour d'onboarding (overlay premier-visite) peut intercepter les clics → le passer
(`Skip`/`snapshot` puis `click` sur la ref du bouton).

**Piège réseau managé (déjà payé, même cause que `e2e/run.js`).** En environnement cloud/CI qui
intercepte le TLS, `open` échoue avec `net::ERR_CERT_AUTHORITY_INVALID`. Lancer avec un fichier de
config qui ignore les erreurs de cert — **temporaire/gitignoré, à NE PAS committer comme défaut**
(ça n'affecte en rien la prod, qui sert des certs publics valides) :
```bash
cat > /tmp/pwcli.config.json <<'JSON'
{ "browser": { "launchOptions": { "args": ["--ignore-certificate-errors"] },
               "contextOptions": { "ignoreHTTPSErrors": true } } }
JSON
playwright-cli open --config /tmp/pwcli.config.json https://groupsaleschallenge.vercel.app/
```

**Artefacts.** `playwright-cli` écrit snapshots `.yml`, screenshots `.png` et logs console dans
`.playwright-cli/` (et un workspace `.playwright/`) dans le cwd → **gitignorés** (`.gitignore`),
jamais committés. Ce sont les « yeux de l'agent » (cf. §3.8) au même titre que les screenshots de
`e2e/run.js`.

---

*Fin du playbook. Si tu ne retiens que trois choses : (1) single-file + no build, données live via Sheet/Apps Script en POST ; (2) chaque bug UX devient un test Playwright headless (suite complète & mode d'emploi : Annexe F) ; (3) la mémoire du projet vit dans le repo — `CLAUDE.md` (cible) + `DECISIONS.md` (journal). Pour l'UX : applique l'Annexe C dès la première vue. Pour le "génie" du produit : pars de l'Annexe D. Pour scaffolder : copie l'Annexe E. **Tout est ici — ce fichier seul suffit à démarrer la prochaine app.***
