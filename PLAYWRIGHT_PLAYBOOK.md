# Playwright Playbook — Devoteam World Cup Sales Challenge 2026

> Guide de test de la plateforme : comment marche la suite `test/` existante,
> comment l'exécuter / la déboguer / l'étendre, et un **mémo CLI Playwright**.
> Cible : Léandre et tout futur intervenant sur le repo.

---

## 1. C'est quoi, et comment c'est branché ici

[Playwright](https://playwright.dev/) pilote un vrai navigateur (Chromium) par
programmation. Sur ce projet, on l'utilise pour des **tests UX headless** qui
ouvrent la vraie `index.html`, **mockent le back-end Apps Script** (aucun appel
réseau vers Google) et cliquent à travers l'app comme un commercial Devoteam.

> ⚠️ **Point clé sur la stack.** Ce repo utilise la **librairie `playwright`
> brute** (`require('playwright')`) dans des runners Node `.cjs`, **pas** le test
> runner `@playwright/test`. C'est un choix délibéré : **aucun `package.json`
> racine** n'est commité, donc le déploiement Vercel reste un site statique pur
> (les deps de test/lint s'installent à la volée en CI et via le hook pre-push).
> Les commandes `npx playwright test …` ne s'appliquent donc **pas** ici — on
> lance `node test/<runner>.cjs`.

---

## 2. La suite de tests (`test/`)

| Fichier | Couvre | Deps | Quand le lancer |
|---|---|---|---|
| `test/backend-contract.js` | logique back-end `apps_script_backend.gs`, hors-ligne (Apps Script mocké dans une sandbox `vm`) | aucune | avant de redéployer l'Apps Script |
| `test/run-live.sh` | l'API **déployée** réelle sur le réseau (shape + intégrité du payload) | `curl` | check quotidien / debug « Failed to load data » |
| `test/ux-smoke.cjs` | **rapide** : login, onglets, CTA « Find your position », modals, recherche + fuzzy, overflow responsive @320/375/768, rien de clippé dans une carte sur mobile | Playwright + Chromium | à chaque changement UI |
| `test/ux-e2e.cjs` | **profond** : admin (VAR TIME / Coach Room / VAR review), mode TV, partage de carte, ticker cliquable, compare, sous-vues, dark mode, popover « tap-the-tally » mobile | Playwright + Chromium | avant un lancement / après une grosse refonte |
| `test/e2e/run.js` | **parcours complet en navigateur** contre le **back-end live** (Puppeteer, sous-projet autonome avec son propre `node_modules`) | Puppeteer + Chromium | avant un lancement / après un gros changement UI |

Code de sortie `0` = tout vert ; `1` = un check a échoué ou une erreur JS a été levée.

Les runners `ux-*.cjs` lancent **leur propre serveur statique** pour servir le
repo, bloquent le service worker, et **interceptent les requêtes vers
`script.google.com`** pour répondre avec des données mockées (login + payload) —
donc zéro secret, zéro réseau Google, déterministe.

---

## 3. Pré-requis & installation

Playwright + Chromium sont **pré-installés dans les sessions cloud Claude Code**
(et le hook `SessionStart` s'en assure — voir §7). En local :

```bash
npm i -D playwright && npx playwright install chromium   # pour ux-smoke / ux-e2e
npm i -D eslint eslint-plugin-html globals               # pour le lint
# le test Puppeteer est à part :
cd test/e2e && npm install                               # puppeteer-core + Chromium
```

Pas de `package.json` racine : ces `npm i -D` créent un `node_modules/` local
**non commité** (ignoré par `.gitignore`). C'est voulu.

---

## 4. Lancer les tests

```bash
# Tests UX headless (mockent le back-end — pas de réseau)
node test/ux-smoke.cjs        # rapide (~login, tabs, modals, responsive)
node test/ux-e2e.cjs          # profond (admin, TV, share, compare, dark…)

# Contrat back-end (hors-ligne, sandbox vm)
node test/backend-contract.js

# Lint (les mêmes règles que la CI)
npx eslint .

# Smoke live contre l'Apps Script déployé
bash test/run-live.sh
APPS_SCRIPT_URL=https://script.google.com/macros/s/…/exec PASSWORD=… bash test/run-live.sh

# Parcours complet en navigateur contre le back-end live (Puppeteer)
cd test/e2e && node run.js
```

---

## 5. 🎯 Mémo CLI Playwright

Avec la **librairie `playwright`**, la CLI sert surtout à **installer les
navigateurs** et à **écrire/déboguer des sélecteurs** (le « run » des tests passe
par `node test/<runner>.cjs`, pas par un test runner).

### 5.1 Navigateurs — `playwright install`

```bash
npx playwright install                 # tous les navigateurs
npx playwright install chromium        # juste Chromium (ce dont les runners ont besoin)
npx playwright install --with-deps chromium   # + libs système (Linux/CI ; nécessite apt)
npx playwright install --dry-run       # voir ce qui serait téléchargé
npx playwright --version               # version installée
```

> Les binaires viennent de **`cdn.playwright.dev`**. En session Claude Code web,
> cet hôte doit être dans l'allowlist réseau (Network access → **Custom** +
> `cdn.playwright.dev`, ou niveau **Full**), sinon le download renvoie `403`.

### 5.2 Écrire des tests par enregistrement — `playwright codegen`

Le plus utile pour **trouver des sélecteurs robustes** quand tu étends un runner.

```bash
# 1. Servir l'app en local (un terminal)
python3 -m http.server 8000           # → http://localhost:8000

# 2. Enregistrer ses clics → code + sélecteurs générés
npx playwright codegen http://localhost:8000
npx playwright codegen --device="iPhone 14" http://localhost:8000   # en émulation mobile
```

Codegen démarre sur l'**écran de login** : tape le code d'accès
(`devoteam2026`) pour atteindre le leaderboard, puis enregistre. Récupère les
sélecteurs générés (`getByRole`, `getByText`, `[data-team]`, `[data-player]`…)
et reporte-les dans le runner `.cjs`.

### 5.3 Inspecter / capturer — `open`, `screenshot`

```bash
npx playwright open http://localhost:8000          # ouvre l'app + l'inspecteur de sélecteurs
npx playwright screenshot --device="iPhone 14" http://localhost:8000 shot.png
npx playwright open --device="Pixel 7" http://localhost:8000
```

### 5.4 Déboguer un runner — `PWDEBUG`

Les runners tournent en `headless: true`. Pour voir ce qui se passe :

```bash
PWDEBUG=1 node test/ux-smoke.cjs       # ouvre le Playwright Inspector (pas-à-pas, sélecteurs)
```

Pour voir la fenêtre du navigateur en continu, passe ponctuellement
`headless: true` → `false` (et éventuellement `slowMo: 250`) dans le
`chromium.launch({…})` du runner concerné — à ne pas committer.

### 5.5 Sélecteurs stables de la plateforme

| Élément | Sélecteur |
|---|---|
| Champ mot de passe / bouton login | `#login-pwd` / `#login-btn` |
| Erreur login | `.login-error` |
| Barre d'onglets / onglet | `#tabs-bar` / `.tab-btn[data-tab="golden"]` (`teams`/`spotlight`/`golden`/`playmaker`/`awards`/`var`/`position`) |
| Onglet actif | `.tab-btn.active` |
| Ligne équipe / carte podium | `.teams-table-row[data-team="…"]` / `.podium-card[data-team="…"]` |
| Ligne / carte joueur | `[data-player="Louis MASSON"]` |
| Modal squad / fermeture | `#cd-overlay` / `#cd-close` |
| Modal carte joueur | `#player-overlay` |
| Timestamp live | `#last-update` |
| Recherche My Position | `#position-search` |
| Bouton refresh (admin) | `#refresh-btn` (caché sauf `?admin=leandre-refresh-2026`) |

Privilégier `getByRole` / `getByText` quand possible (résistant aux refactors CSS).

---

## 6. CI & garde-fous

- **`.github/workflows/ux-tests.yml`** — sur chaque push/PR : job **lint**
  (`npx eslint .`) puis job **ux** (installe Playwright+Chromium, lance
  `ux-smoke.cjs` puis `ux-e2e.cjs`, commente en cas d'échec). Les runners GitHub
  ont un egress ouvert : `playwright install --with-deps chromium` y passe.
- **`.github/workflows/snapshot.yml`** — snapshots planifiés.
- **Pre-push hook** `.githooks/pre-push` — lance ESLint + le smoke test avant
  chaque `git push` (skip gracieux si Node/Playwright absents). À activer une fois
  par clone :
  ```bash
  git config core.hooksPath .githooks
  ```
  Contourner ponctuellement : `git push --no-verify`.

---

## 7. Sessions Claude Code on the web

Chaque session web démarre dans un conteneur neuf. Le hook
**`.claude/hooks/session-start.sh`** (enregistré dans `.claude/settings.json`)
installe automatiquement, en remote uniquement, ce qu'il faut pour faire tourner
la suite : **Playwright + Chromium** et **ESLint + plugins**. Il est idempotent,
non-interactif, et **ne casse jamais le démarrage** : si `cdn.playwright.dev`
n'est pas autorisé, il l'indique et la session démarre quand même.

> Pré-requis réseau : ajouter `cdn.playwright.dev` à l'allowlist **Custom** de
> l'environnement (ou niveau **Full**), puis **démarrer une nouvelle session**
> (le changement de policy ne s'applique pas au conteneur déjà lancé).

Une fois en place : `node test/ux-smoke.cjs` tourne directement.

---

## 8. Dépannage

**`Playwright not found` / `Executable doesn't exist`**
`npm i -D playwright && npx playwright install chromium` (ou attendre le hook en
session web). En CI c'est géré par `ux-tests.yml`.

**`Host not in allowlist: cdn.playwright.dev` (403)**
La policy réseau bloque le download. Mets l'environnement en **Custom +
`cdn.playwright.dev`** (ou **Full**) et démarre une **nouvelle** session.

**Un test UX échoue / « flaky »**
`PWDEBUG=1 node test/ux-smoke.cjs` pour rejouer pas-à-pas ; vérifie les
sélecteurs (cf. §5.5) et préfère les attentes auto (`waitForSelector`) aux délais
fixes.

**`run-live.sh` renvoie une erreur**
Vérifie `APPS_SCRIPT_URL` (test direct `?action=ping`), l'accès « Anyone » du
déploiement Apps Script, et le `PASSWORD`.

**ESLint casse la CI après un changement**
`npx eslint .` en local avant de pousser ; la config est dans `eslint.config.mjs`
(règles « vrais bugs = erreurs, style = warnings »).

---

## 9. Aide-mémoire express

```bash
node test/ux-smoke.cjs        # tests UX rapides
node test/ux-e2e.cjs          # tests UX profonds
node test/backend-contract.js # contrat back-end (hors-ligne)
npx eslint .                  # lint
bash test/run-live.sh         # smoke live de l'API
npx playwright codegen http://localhost:8000   # écrire des sélecteurs (servir l'app d'abord)
PWDEBUG=1 node test/ux-smoke.cjs               # debug pas-à-pas
git config core.hooksPath .githooks            # activer le pre-push
```
