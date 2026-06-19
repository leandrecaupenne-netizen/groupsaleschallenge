# Playwright Playbook — Devoteam World Cup Sales Challenge 2026

> Guide complet pour tester la plateforme avec **Playwright** : mise en place,
> structure, **focus CLI**, écriture de tests, CI, et dépannage.
> Cible : Léandre et tout futur intervenant sur le repo.

---

## 1. C'est quoi, et pourquoi ici

[Playwright](https://playwright.dev/) est le framework d'automatisation de
navigateur de Microsoft. On l'utilise ici pour des **tests end-to-end (E2E)** :
on pilote un vrai navigateur (Chromium, Firefox, WebKit + émulation mobile) qui
ouvre la plateforme, se connecte, clique sur les onglets, ouvre les modals, etc.,
exactement comme un commercial Devoteam le ferait.

**Ce qu'on gagne**, branché sur la checklist de validation du `CLAUDE.md` (section 9) :

| Item checklist | Test Playwright |
|---|---|
| Login bon/mauvais mot de passe | `tests/login.spec.js` |
| Session persiste après refresh | `tests/login.spec.js` |
| Timestamp `Last updated` = valeur API | `tests/live-data.spec.js` |
| Modal détail équipe + membres triés | `tests/leaderboard.spec.js` |
| Golden Boot / Playmaker / VAR | `tests/leaderboard.spec.js` |
| Recherche My Position avec noms réels | `tests/my-position.spec.js` |
| Responsive mobile (iPhone + Android) | `tests/responsive.spec.js` |
| Gestion d'erreur (backend down) | `tests/live-data.spec.js` |

**Principe clé : on ne touche JAMAIS au vrai backend Apps Script.** Chaque test
intercepte les appels vers `script.google.com` et répond avec une fixture
(`tests/fixtures/mock-data.js`). Résultat : la suite est **rapide, déterministe,
et tourne hors-ligne / en CI sans secret ni quota Apps Script**.

La promesse « vanilla, no build » du projet est intacte : Playwright est la seule
dépendance de dev, et il vit dans `devDependencies` (jamais déployé sur Vercel).

---

## 2. Mise en place (une fois)

```bash
# 1. Installer la dépendance de dev (@playwright/test)
npm install

# 2. Télécharger les navigateurs (Chromium/Firefox/WebKit) + leurs libs système
npm run pw:install        # alias de: playwright install --with-deps
```

> ⚠️ **Sandbox Claude Code web** : l'environnement d'exécution distant a une
> *network egress policy* restreinte qui **bloque le téléchargement des
> navigateurs** (`cdn.playwright.dev` n'est pas dans l'allowlist). Les tests s'y
> **valident** (`npx playwright test --list`) mais ne s'y **exécutent** pas.
> Lance la suite **en local** (machine de Léandre) ou **en CI** (GitHub Actions,
> egress ouvert) — voir §6. Pour autoriser l'exécution dans une session web,
> ajouter `cdn.playwright.dev` à l'allowlist réseau de l'environnement.

Pré-requis : **Node 18+** (testé sur Node 20/22).

---

## 3. Structure des fichiers

```
groupsaleschallenge/
├── playwright.config.js          Config: projets (5 navigateurs), webServer, reporters
├── package.json                  devDependency + scripts npm
├── tests/
│   ├── server.js                 Serveur statique 0-dépendance (sert index.html en http)
│   ├── helpers.js                mockBackend(), seedSession(), gotoApp()
│   ├── fixtures/
│   │   └── mock-data.js          Payload API mocké (teams/people/period/...)
│   ├── login.spec.js             Écran de login (form réel)
│   ├── leaderboard.spec.js       Onglets, classements, modal équipe, VAR
│   ├── my-position.spec.js       Recherche joueur
│   ├── live-data.spec.js         Timestamp, polling, backend down
│   └── responsive.spec.js        Viewport mobile
└── .github/workflows/playwright.yml   CI
```

Le `webServer` de la config démarre `tests/server.js` (port **4173**) avant la
suite et l'arrête après. On sert en **http://localhost** (et pas `file://`) parce
que le service worker, `fetch` et le mocking de routes se comportent alors comme
en production.

---

## 4. 🎯 Focus CLI — la commande `playwright`

Tout passe par le binaire `playwright` (via `npx playwright …` ou les scripts
`npm run …`). Voici le pense-bête complet, **adapté à ce projet**.

### 4.1 Lancer les tests — `playwright test`

```bash
npx playwright test                       # toute la suite, tous les navigateurs (headless)
npm test                                  # idem (alias)

# Cibler un fichier / un test
npx playwright test tests/login.spec.js   # un seul fichier
npx playwright test -g "wrong access"     # filtre par titre (grep)
npx playwright test login                 # filtre par chemin partiel

# Cibler un navigateur (« projet »)
npx playwright test --project=chromium
npm run test:mobile                       # Mobile Chrome + Mobile Safari

# Voir le navigateur (debug visuel)
npx playwright test --headed              # fenêtre visible
npm run test:headed

# Vitesse / robustesse
npx playwright test --workers=4           # parallélisme (défaut: nb de cœurs)
npx playwright test --workers=1           # série (debug d'un état partagé)
npx playwright test --repeat-each=5       # détecter un test « flaky »
npx playwright test --retries=2           # retenter les échecs
npx playwright test --max-failures=1      # stopper au 1er échec

# Sélection intelligente
npx playwright test --last-failed         # rejouer uniquement les échecs précédents
npx playwright test --only-changed        # tests liés aux fichiers modifiés (git)
```

### 4.2 Mode UI — le plus utile au quotidien — `--ui`

```bash
npx playwright test --ui
npm run test:ui
```

Ouvre le **Playwright UI Mode** : time-travel sur chaque action, watch mode,
sélection des tests à la souris, DOM snapshot à chaque étape. À privilégier pour
développer/déboguer des tests.

### 4.3 Débogage — `--debug`

```bash
npx playwright test --debug                       # ouvre l'Inspector, pas-à-pas
npx playwright test tests/login.spec.js --debug   # cibler un fichier
PWDEBUG=console npx playwright test               # expose `playwright` dans la console du navigateur
```

Dans le code, on peut aussi poser un point d'arrêt : `await page.pause();`.

### 4.4 Générer des tests par enregistrement — `codegen`

```bash
# 1. Démarrer le serveur local dans un terminal
npm run serve                              # http://localhost:4173

# 2. Enregistrer ses clics → génère le code de test
npm run codegen                            # = playwright codegen http://localhost:4173
npx playwright codegen --device="iPhone 14" http://localhost:4173   # en émulation mobile
```

Playwright ouvre un navigateur ; chaque interaction est transcrite en code
(avec des sélecteurs robustes). Idéal pour démarrer un nouveau spec.

> Note : le codegen part de l'**écran de login**. Tape le mot de passe
> (`devoteam2026`) pour atteindre le leaderboard, puis enregistre la suite. Ou
> pré-remplis la session via les helpers (voir §5) une fois le squelette généré.

### 4.5 Rapport & traces — `show-report` / `show-trace`

```bash
npx playwright show-report                 # ouvre le rapport HTML du dernier run
npm run report

# Trace = enregistrement rejouable (DOM, réseau, console, captures) d'un test
npx playwright show-trace test-results/<...>/trace.zip
npm run trace -- test-results/<...>/trace.zip
```

La config capture une trace **au 1er retry** (`trace: 'on-first-retry'`), une
capture **à l'échec**, et une vidéo **conservée à l'échec**. Pour forcer la trace
sur tous les tests : `npx playwright test --trace on`.

### 4.6 Navigateurs — `install`

```bash
npx playwright install                     # tous les navigateurs
npx playwright install chromium            # un seul
npx playwright install --with-deps         # + dépendances système (Linux/CI)
npx playwright install --dry-run           # voir ce qui serait téléchargé
```

### 4.7 Divers utiles

```bash
npx playwright test --list                 # lister les tests SANS les exécuter (valide config+specs, aucun navigateur requis)
npx playwright --version                   # version
npx playwright merge-reports ./blob-report # fusionner des rapports (CI shardée)
npx playwright test --reporter=line        # changer de reporter ad hoc (line|dot|list|html|json|github)
```

### 4.8 Variables d'environnement

| Variable | Effet |
|---|---|
| `CI=1` | Active le profil CI de la config (retries=2, workers=1, reporter `github`) |
| `PORT=5000` | Change le port du serveur de test (config + `npm run serve`) |
| `PWDEBUG=1` | Lance l'Inspector (équivalent `--debug`) |
| `PLAYWRIGHT_HTML_OPEN=never` | N'ouvre pas le rapport automatiquement |

---

## 5. Écrire un test pour CETTE app

### 5.1 Les helpers (à connaître)

`tests/helpers.js` expose trois fonctions :

```js
const { gotoApp, mockBackend, seedSession } = require('./helpers');

// Le plus simple : mocke le backend, ouvre une session valide, charge l'app,
// attend que le leaderboard soit affiché.
await gotoApp(page);

// Variantes (pour tester le login lui-même, ou un backend en panne) :
await mockBackend(page);                  // intercepte script.google.com → fixture
await mockBackend(page, { fail: true });  // toutes les requêtes data renvoient 500
await mockBackend(page, { onData: () => hits++ });  // compter les appels (polling)
await seedSession(page);                  // pré-remplit localStorage (skip login)
```

Comment ça marche : `mockBackend` fait un `page.route('**/macros/s/**', …)` qui
répond au prewarm (`GET ?action=ping`), valide le mot de passe sur les
`POST {action:'data'}`, et renvoie `mock-data.js`. C'est **l'unique point de
contact réseau** simulé.

### 5.2 Sélecteurs stables de la plateforme

| Élément | Sélecteur |
|---|---|
| Champ mot de passe | `#login-pwd` |
| Bouton login | `#login-btn` |
| Message d'erreur login | `.login-error` |
| Barre d'onglets | `#tabs-bar` |
| Un onglet | `.tab-btn[data-tab="golden"]` (`teams`/`spotlight`/`golden`/`playmaker`/`awards`/`var`/`position`) |
| Onglet actif | `.tab-btn.active` |
| Ligne équipe | `.teams-table-row[data-team="LUXEMBOURG"]` |
| Carte podium | `.podium-card[data-team="…"]` |
| Ligne / carte joueur | `[data-player="Louis MASSON"]` |
| Modal squad équipe | `#cd-overlay` (fermer : `#cd-close`) |
| Modal carte joueur | `#player-overlay` |
| Timestamp live | `#last-update` |
| Recherche My Position | `#position-search` |
| Bouton refresh (admin) | `#refresh-btn` (caché sauf `?admin=leandre-refresh-2026`) |

Privilégier les locators **par rôle / texte** quand c'est possible
(`page.getByRole`, `page.getByText`) — plus résistants aux refactors CSS.

### 5.3 Squelette type

```js
const { test, expect } = require('@playwright/test');
const { gotoApp } = require('./helpers');

test('Golden Boot met Louis MASSON en tête', async ({ page }) => {
  await gotoApp(page);
  await page.locator('.tab-btn[data-tab="golden"]').click();
  await expect(page.locator('.tab-btn.active')).toHaveText(/Golden Boot/);
  await expect(page.getByText('Louis MASSON').first()).toBeVisible();
});
```

### 5.4 Adapter la fixture

`tests/fixtures/mock-data.js` est volontairement **petit et déterministe**
(3 équipes, 5 joueurs) pour pouvoir affirmer un ordre exact. Les flags dérivés
(`is_rookie`, `yellow_meetings`, `yellow_gm`) sont calculés comme dans
`apps_script_backend.gs`. Pour tester un nouveau cas (ex. un award rempli),
ajoute-le dans `dataPayload.special_awards` et écris l'assertion.

---

## 6. CI — GitHub Actions

`.github/workflows/playwright.yml` exécute la suite sur **push** et **pull
request**. Les runners GitHub ont un egress ouvert : `npx playwright install
--with-deps` y fonctionne (contrairement à la sandbox web). Le rapport HTML est
uploadé en **artifact** (`playwright-report`, 14 j de rétention).

Étapes : checkout → setup Node 20 → `npm ci` → install navigateurs → `npx
playwright test` → upload report.

> Astuce PR : en cas d'échec CI, télécharger l'artifact `playwright-report`,
> dézipper, ouvrir `index.html` (ou `npx playwright show-report chemin/`) pour
> revoir traces, captures et vidéos.

---

## 7. Dépannage

**`Executable doesn't exist … run "playwright install"`**
Les navigateurs ne sont pas téléchargés : `npm run pw:install`. En sandbox web,
c'est attendu (egress bloqué) — lance en local ou en CI.

**`Host not in allowlist: cdn.playwright.dev` (403)**
La policy réseau de l'environnement bloque le download. Ajouter
`cdn.playwright.dev` à l'allowlist, ou exécuter ailleurs (local/CI).

**Le test attend indéfiniment `#tabs-bar`**
Le mock backend n'est pas posé avant `page.goto`, ou le mot de passe seedé ne
matche pas la fixture. Toujours `mockBackend()` **avant** `goto`, et utiliser
`gotoApp()` qui ordonne tout correctement.

**Le port 4173 est déjà pris**
`PORT=4180 npx playwright test` (la config lit `PORT`). En local, le webServer
réutilise un serveur déjà lancé (`reuseExistingServer: true`).

**Test « flaky »**
`npx playwright test -g "le test" --repeat-each=10` pour reproduire ; préférer
les locators auto-attendus (`expect(locator).toBeVisible()`) aux `waitForTimeout`.

**Voir ce qui s'est passé**
`npx playwright test --trace on` puis `npx playwright show-report`.

---

## 8. Aide-mémoire express

```bash
npm install && npm run pw:install   # setup (navigateurs : local/CI seulement)
npm test                            # tout
npm run test:ui                     # mode UI (recommandé pour développer)
npm run test:headed                 # voir le navigateur
npx playwright test --debug         # pas-à-pas
npm run codegen                     # enregistrer un test (serveur via npm run serve)
npm run report                      # rapport du dernier run
npx playwright test --list          # valider sans exécuter (aucun navigateur requis)
```
