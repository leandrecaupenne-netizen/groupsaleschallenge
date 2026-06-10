# DECISIONS.md — Journal de bord du projet

> **But de ce fichier** : garder la mémoire entre les sessions Claude Code (sur le web,
> chaque session repart d'un conteneur vierge — seul ce qui est commité survit).
> `CLAUDE.md` décrit l'**état cible** ; ce fichier décrit **l'historique des décisions et
> ce qui reste à faire**.
>
> **Convention** : à la fin de chaque session, ajouter une entrée datée en haut de la
> section « Journal » (la plus récente en premier) : ce qui a été fait, pourquoi, et les
> TODO / points d'attention. Mettre à jour « ⚠️ Actions en attente » si une étape humaine
> (déploiement, accès, validation) est requise.

---

## ⚠️ Actions en attente (à faire par Léandre / humains)

- [x] **Redéployer l'Apps Script** : ✅ confirmé le **07-06**. Léandre a recollé la dernière
      version de `apps_script_backend.gs` (via Gérer les déploiements → Modifier → **Nouvelle
      version**, donc **même URL `/exec`** → rien à toucher côté `index.html`) et
      `test/run-live.sh` repasse **au vert** (ping, auth, 32 équipes / 379 personnes, aucun
      warning de mapping). ⚠️ Rappel permanent : le `.gs` du repo ≠ projet Apps Script —
      toute modif future du `.gs` doit être **recollée + redéployée** côté Google.
- [x] **Trigger `keepWarm`** : ✅ confirmé au vert le **07-06** (Exécutions « Completed »).
      Les ~290 échecs « Script function not found » venaient d'une **ancienne version du
      script** (sans `keepWarm`) collée dans l'éditeur ; depuis le re-collage de la version à
      jour, le trigger time-driven (toutes les 5 min) s'exécute correctement.
- [ ] **Donnée amont `UK`** (Jose / OneBI) : 14 personnes ont `TEAM = UK`, mais `UK` n'a
      **aucune ligne dans `Team Ranking`** → pas de drill-down d'équipe pour elles. Depuis
      le 07-06 elles sont classées individuellement **et** apparaissent dans la vue Nations
      (agrégées depuis `people`). Pour fermer le trou : ajouter une ligne `UK` dans
      `Team Ranking`, ou rattacher ces personnes à une équipe existante.
- [x] Vérifier l'URL Vercel de **production** (`groupsaleschallenge.vercel.app`) : ✅ 07-06,
      HTTP 200, 548 KB, 1,3 s, sert l'app avec la bonne `APPS_SCRIPT_URL`.
- [ ] Compléter les contacts manquants dans `CLAUDE.md` §12 (email Jose, contact IT Devoteam).

---

## 🔁 Pour reprendre le contexte à la prochaine session
- **Lire ce fichier en entier** (surtout l'entrée 06-06 ci-dessous).
- État : plateforme front **auditée ligne par ligne + durcie**, considérée **launch-ready**.
- **Tests** : `node test/ux-smoke.cjs` et `node test/ux-e2e.cjs` (Playwright + Chromium).
  En session web, le Chromium pré-installé peut avoir une version qui ne matche pas ;
  contournement utilisé : lancer via un wrapper qui force `executablePath` vers
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. Le réseau vers script.google.com
  et vercel.app est **bloqué** → les tests **mockent** le fetch (route Playwright).
- 8 tests de régression en place : discipline (cold+hydrate), XSS (admin+breakout),
  i18n (clés `t()`), localStorage bloqué, **rangs ex-aequo** (board+carte cohérents).
- **Suite de tests live ajoutée le 07-06** (complète les Playwright mockés en testant le
  backend **réel** déployé) :
  - `bash test/run-live.sh` — smoke curl : ping, mauvais mot de passe rejeté, pull
    authentifié + checks d'intégrité (compte équipes/personnes, exclusions, référentiel).
  - `node test/backend-contract.js` — contrat de l'API dans un sandbox Apps Script mocké
    (offline), incl. la règle de discipline (`meetings < 5 && activité`).
  - `node test/e2e/run.js` — Chromium headless **contre le backend live** (login, onglets,
    cross-checks classements, modal, VAR, My Position, mobile, dark, persistance session,
    drapeaux des chips). Deps lourdes gitignored ; `E2E_INSECURE=1` seulement en sandbox à
    proxy TLS. NB : réseau Google **autorisé** dans cette session-ci (bloqué le 06-06).

---

## État du projet (résumé vivant)

- **Plateforme** : `index.html` (HTML/CSS/Vanilla JS, fichier unique), prod sur Vercel
  (`groupsaleschallenge.vercel.app`), redéploiement auto à chaque push sur `main`.
- **Backend** : `apps_script_backend.gs` (Web App sur la Google Sheet OneBI de Jose). Lit
  `Team Ranking` / `Challenge Ranking`, exclut Morocco/Serbia/Tunisia, colonne nickname
  optionnelle, timestamp = vraie date de modif de la Sheet (Drive). Durci 06-06 :
  data POST-only, onglet manquant non bloquant, cache chunks 45000, `keepWarm`.
- **Statut (06-06)** : front **audité ligne par ligne + repasses UX + couche calcul
  vérifiée exacte**, 8 tests de régression, considéré **launch-ready**. Filtres = tous les
  pays présents séparément (plus de Nordics/Benelux ; Alps→Switzerland). Surnoms
  temporaires Sweden/Norway/Denmark. Rangs **ex-aequo partagés** partout (tables, boards,
  carte, My Position). Navigation onglets : taper un onglet amène son contenu en vue.
- **Données** : Jose alimente depuis OneBI ; peut changer plusieurs fois par semaine.
- **Onglets** : Team Ranking · Players of the Moment · Golden Boot · Playmaker · **Rookie Cup** ·
  **Licence** · Special Awards · VAR Room · My Position (+ admin : VAR TIME, Coach Room).
- **Mode TV** (`?tv=1` / 📺) : deck de panneaux projetables, ne se met plus en pause idle.
- **Historique** : `history/<date>.json` = snapshots hebdo figés (OneBI n'a pas d'historique).
  Baseline `2026-06-08.json` ; capture auto chaque lundi via GitHub Action (`snapshot.yml`).
  UI d'évolution à construire après le 2ᵉ point (lundi suivant).
- **Renames d'équipe** (`TEAM_ALIASES`, index.html) : `ALPS → Switzerland`,
  `FR - Digital Impulse → Impulse RainMakers`.

---

## Journal (le plus récent en premier)

### 2026-06-09 — Quick wins suite aux questions de Sebastien (split en deux PR)
**PR « sûre » (1/3/4)** — indépendants du débat sur les cartons, mergés :
1. **Carte joueur** : ajout du **volume PS NB (€)** dans les stats de tête (PS RANK · PS NB ·
   NB GM · MTG/WK), gap resserré à 15px.
3. **Règles** : retrait du 3ᵉ bullet (Opportunities Stage 2 / €50K) du chapitre cartons (c'est une
   définition Playmaker, déjà listée dans les classements).
4. **Coach Room** : **recherche par nom** (`#coach-search`) → PS Total + **GM total** ET PS NB +
   NB GM côte à côte (cas Marc, sans drill nation→équipe→joueur).

**PR « rouge » (2/5)** — EN ATTENTE de l'alignement Léandre/Jose/Sebastien sur le modèle de
carton rouge :
2. Carton **rouge** auto quand 2 règles cassées (badge + label).
5. Tally cartons par équipe/nation (`🟨 (X) 🟥 (Y)`).
**Désaccord identifié** (thread Teams) : Léandre = « 2 jaunes = 1 rouge » (live) ; Jose (data
owner) = jaune = avertissement, **rouge décidé À LA FIN par le VAR** (manuel), car la métrique
meetings est bruitée (planned+done/5 sem). **Proposition de Léandre (endossée)** : modèle rugby
= « 2 jaunes = rouge » **mais le rouge passe en revue VAR TIME** (le comité confirme/annule), +
sanction à définir (suspension/amende €). Note technique : les verdicts VAR sont aujourd'hui
**locaux (localStorage admin)**, non publiés → pour afficher la décision finale à tous il faudrait
les persister (colonne Sheet). Dès validation du modèle rugby : reformuler le rouge en
« 🟥 sous revue VAR » et livrer 2/5.


### 2026-06-09 — Vercel Speed Insights (version first-party, durcie)
L'agent Vercel (PR draft #29) avait branché Speed Insights via un **import ES module depuis le
CDN tiers jsdelivr** + élargissement CSP `script-src … cdn.jsdelivr.net` (et passage ESLint en
`sourceType: module`). Risque supply-chain (un paquet jsdelivr compromis pourrait lire le
localStorage = code d'accès), juste après le durcissement de la suite 9. **Refait en first-party**
(branche `claude/…`, PR à la place de #29) : snippet officiel Vercel « no framework » →
`<script defer src="/_vercel/speed-insights/script.js">` (même origine), donc **pas de CDN tiers,
pas de jsdelivr en CSP, pas de `type=module`** (ESLint reste en `script`). CSP : on ajoute juste
`https://vitals.vercel-insights.com` à `connect-src`. Service worker bump v35→v36. Tests : route
no-op `**/_vercel/**` ajoutée (sinon 404 → erreur console en local). `lint` + `ux` au vert.
**Action humaine** : activer Speed Insights dans Vercel (Project Settings → Speed Insights), puis
fermer la PR bot #29 au profit de celle-ci.

### 2026-06-08 (suite 9) — Audit sécurité + sortir le site des moteurs de recherche
**Demande** (Léandre) : trafic US surprenant dans Vercel Analytics + crainte de scrapers/bots.
**Audit** : le site est **statique sur le CDN Vercel** (ne peut pas « crasher » sous des scrapers) ;
les **données sont protégées par mot de passe côté serveur** (`apps_script_backend.gs` → `passwordOk`,
POST-only) ; le mot de passe **n'est pas dans le code public** (tapé par l'utilisateur, stocké en
localStorage). Le trafic US = **bots/crawlers/unfurlers**, pas de vrais accès aux données. Déjà bon :
CSP stricte, cache serveur 60 s (anti-DoS), polling 2 min jitté, échappement HTML + test XSS.
Risques résiduels mineurs : mot de passe faible/partagé (`devoteam2026`), quota Apps Script si
flood délibéré (atténué par le cache), bande passante. **Action appliquée** : sortir le site des
moteurs de recherche → `robots.txt` (Disallow: /), `<meta name="robots" content="noindex,nofollow">`
+ `googlebot`, en-tête `X-Robots-Tag: noindex, nofollow` (vercel.json). Réduit le bruit de bots ;
les bots d'aperçu de lien (Teams/WhatsApp) ignorent ces directives → **les previews de partage
continuent de marcher**. À faire côté Léandre (hors repo, optionnel) : Vercel Firewall/Attack
Challenge Mode, code d'accès moins devinable, Deployment Protection si verrou plus dur souhaité.

### 2026-06-08 (suite 8) — Nettoyage du code mort signalé par ESLint
Suppression des 8 warnings ESLint (code mort réel, −49 lignes dans `index.html`) : variable
`DATA` (écrite mais jamais lue) + ses 2 assignations, helpers locaux inutilisés
(`ini`, deux `initials`, `verdictBtns`), et deux fonctions jamais appelées (`renderIndivCard`,
`scrollToMainContent`) + un en-tête de commentaire orphelin. **ESLint : 0 problème** ;
`ux-smoke`/`ux-e2e` au vert.

### 2026-06-08 (suite 7) — Revue de code : correctifs + mise en place d'ESLint
**Revue de code** (7 angles, recall élevé) → correctifs appliqués dans `index.html` :
1. **A11y** : les lignes/cartes/onglets sont désormais de vrais `<a>` (activés par Entrée,
   **pas** par Espace) → ajout d'un handler `keydown` Espace dans `bindNewTabGestures` pour
   restaurer l'activation clavier (régression introduite par l'open-in-new-tab).
2. **Coach Room** : la pastille 🟨 du deep-dive GM se basait sur `yellow_gm` (= GM New Business)
   alors que la valeur affichée est le **GM Total** → flag recalculé sur `ps_total_gm < 0.25`
   (cohérent avec le chiffre montré).
3. **`teamShortLabel`** routé via `nicknameOverride` → le surnom est cohérent aussi dans les
   listes compactes (sinon « FR - Digital Impulse » ici / « Impulse RainMakers » ailleurs).
4. **My Position** : ligne GM neutre (`status-neutral`) pour les profils **sans New Business**
   (au lieu d'aucune ligne), alignée sur la carte Panini.
5. **Compare** : un profil sans New Business n'est plus noté « 0 % » / perdant (null = non
   comparable au lieu de `||0`).
6. **Perf** `upgradeClickablesToLinks` : `color`/`text-decoration` déplacés en CSS (`:where()`,
   spécificité 0), `getComputedStyle` mis en cache **par classe** (au lieu de par élément).
7. **Deep-link** `?team=` : résolu via `TEAM_ALIASES` + `teamKey` (un lien partagé avec un
   surnom/ancien nom retrouve l'équipe renommée).

**ESLint** (nouveau) : `eslint.config.mjs` (flat config) lint le `<script>` inline d'`index.html`
(via `eslint-plugin-html`), le service worker et les runners de test. **Pas de `package.json`
racine** (pour ne pas impacter le déploiement statique Vercel) : CI et hook pre-push installent
ESLint à la volée (même pattern que Playwright). Règles ciblées « vrais bugs » en `error`
(`no-undef`, `no-redeclare`, `no-dupe-keys`, `no-const-assign`…) + bruit utile en `warn`
(`eqeqeq` smart, `no-unused-vars`). Résultat actuel : **0 erreur, 8 warnings** (code mort
signalé pour nettoyage futur). Job `lint` ajouté à `ux-tests.yml` + étape dans `.githooks/pre-push`
(skip gracieux si ESLint absent). Tests `ux-smoke`/`ux-e2e` au vert (+2 assertions : Espace
clavier, ligne GM neutre).

### 2026-06-08 (suite 6) — Impulse Rainmakers : rattacher à la France (drapeau + consolidation)
**Signalé** (Léandre) : dans **Nations Ranking**, « Impulse Rainmakers » apparaissait comme une
**nation à part** (drapeau italien au hasard) au lieu d'être **consolidée dans la France**.
**Cause** : la Sheet porte l'équipe sous son **surnom** « Impulse Rainmakers » (sans préfixe
`FR`), donc `regionOf()` ne la voyait pas comme française → nation standalone. (La suite 4 avait
corrigé le doublon mais dans le mauvais sens : elle n'avait pas rétabli l'identité française.)
**Fix** (`index.html`) : alias `TEAM_ALIASES['IMPULSE RAINMAKERS'] → 'FR - Digital Impulse'` :
l'entité reprend son vrai nom français → `regionOf` = `FR` → **consolidée dans la France, bon
drapeau** ; et `NICKNAME_OVERRIDES['FR - Digital Impulse'] = 'Impulse RainMakers'` (déjà en place)
**réaffiche le surnom** en grand avec « FR - Digital Impulse » en dessous. Test de non-régression
ajouté dans `ux-e2e` (mock dédié : l'équipe se replie dans FR, pas de nation « Impulse », surnom +
vrai nom). `ux-smoke` + `ux-e2e` **au vert**.

### 2026-06-08 (suite 5) — Install PWA : instructions par navigateur + détection in-app
**Signalé** (Léandre) : l'install marche sur **Chrome** mais pas sur « le navigateur Android » —
en tapant 📲 Install, le message dit « menu ⋮ → Install app / Add to Home screen » mais
l'option n'apparaît pas.
**Analyse** : manifest + service worker remplissent bien les critères PWA (icônes 192/512 +
maskable, handler `fetch`, HTTPS) → c'est **côté navigateur**. Causes probables : (a) un
**navigateur in-app** (lien ouvert dans Teams/LinkedIn/WhatsApp/Gmail… = WebView **sans** option
d'install), (b) **Samsung Internet** où l'option existe mais s'appelle « Ajouter la page à →
Écran d'accueil », (c) Firefox (« Installer »), (d) iOS hors Safari.
**Fix** (`index.html`, `onInstallClick`) : helper `isInAppBrowser()` + message **adapté au
navigateur** quand aucun prompt natif n'est capturé : in-app → « ouvre d'abord dans Chrome » ;
Samsung → chemin exact ; Firefox → « Installer » ; iOS non-Safari → « ouvre dans Safari » ;
défaut → menu ⋮ + repli « sinon ouvre dans Chrome ». Pas de blocage d'installabilité côté code
(rien à corriger sur le manifest/SW). `ux-smoke` au vert, 0 erreur JS.

### 2026-06-08 (suite 4) — Impulse RainMakers : surnom + vrai nom (au lieu du doublon)
**Signalé** (Léandre) : la carte podium affichait « Impulse RainMakers » **deux fois**. Cause :
un **alias** `TEAM_ALIASES['FR - DIGITAL IMPULSE'] → 'Impulse RainMakers'` **renommait l'entité**
(écrasant le vrai nom), si bien que surnom = nom = « Impulse RainMakers ».
**Fix** : on **retire l'alias** (l'entité garde son vrai nom **FR - Digital Impulse**) et on ajoute
`'FR - Digital Impulse' → 'Impulse RainMakers'` dans `NICKNAME_OVERRIDES` (comme Sweden/Norway/
Denmark). Résultat : **surnom « Impulse RainMakers » en grand + vrai nom « FR - Digital Impulse »
en petit**, comme les autres équipes. Garde-fou défensif ajouté dans `teamNameHTML` /
`playerTeamHTML` : si surnom == nom, on n'imprime qu'une ligne (anti-doublon). `ux` au vert.

### 2026-06-08 (suite 3) — Clic-droit « Ouvrir dans un nouvel onglet » (vrais liens `<a>`)
**Demande** (Léandre) : sur le Web, le menu **clic-droit du navigateur** ne proposait pas
« Ouvrir dans un nouvel onglet » (la limite assumée de la suite 2). Ce menu n'apparaît que
sur de **vrais liens** `<a href>`.

**Implémentation** (`index.html`) :
- `upgradeClickablesToLinks()` appelée après chaque rendu : convertit en place les cartes
  joueur, lignes équipe (`teams-table-row`, `podium-card`), nations, lignes nation-équipe et
  **onglets** (`tab-btn`) en vrais `<a href="…">` (deep-link `?player=`/`?team=`/`?nation=` ou
  `#onglet`). La **mise en page est préservée** en recopiant le `display` calculé (un `<a>` est
  inline par défaut) ; les éléments contenant déjà un bouton/lien sont **ignorés** (pas de
  contenu interactif imbriqué = HTML invalide).
- `bindNewTabGestures()` ajusté : clic gauche normal sur un lien → `preventDefault` (reste
  in-app, le handler ouvre le modal) ; **Ctrl/⌘/Maj-clic** et **clic-molette** → onglet/fenêtre
  géré **nativement** par le navigateur (on coupe juste l'ouverture du modal dans l'onglet
  courant). → Le **clic-droit → « Ouvrir dans un nouvel onglet »** fonctionne désormais.
- Tests : `ux-e2e` étendu (les lignes joueur **et** les onglets sont de vrais `<a>` ; Ctrl-clic
  ouvre un onglet sur le deep-link sans ouvrir le modal courant). `ux-smoke` + `ux-e2e` **au
  vert, 0 erreur JS**. La limite « clic-droit non supporté » de la suite 2 est **levée**.

### 2026-06-08 (suite 2) — Ouvrir cartes / équipes / onglets dans un nouvel onglet
**Demande** (Léandre) : sur navigateur web, pouvoir ouvrir des cartes (joueur), des équipes
et des « pages » (onglets) dans un **nouvel onglet**.

**Problème** : les cartes/lignes/onglets sont des `<div>`/`<button>` ouverts en JS (modal),
pas des `<a href>` → le navigateur ne propose pas nativement « ouvrir dans un nouvel onglet ».

**Décision / implémentation** (`index.html`) :
- **Deep-links partageables** lus au chargement : `?player=Nom` (existait déjà), **ajout de
  `?team=Pays` et `?nation=Région`** ; les onglets via `#id` (existait déjà). Une nouvelle
  fenêtre/onglet atterrit directement sur la bonne carte/équipe/nation.
- **Gestes natifs** via un handler délégué en phase capture (`deepLinkFor` + `bindNewTabGestures`)
  : **Ctrl/⌘-clic** et **clic-molette** sur une carte joueur, une équipe, une nation ou un
  onglet → ouverture dans un **nouvel onglet** (sans ouvrir le modal dans l'onglet courant).
  Le clic gauche normal reste inchangé (modal in-app).
- **Limite assumée** : le menu clic-droit « Ouvrir dans un nouvel onglet » du navigateur n'est
  pas proposé (il faudrait convertir tous les conteneurs en vrais `<a>`, risque de régression
  layout sur ~20 templates en prod). Ctrl/⌘-clic + clic-molette couvrent les gestes usuels.
- Tests : `ux-e2e` étendu (deep-links `?player`/`?team`/`?nation` + Ctrl-clic ouvre un onglet
  popup et n'ouvre pas le modal courant). `ux-smoke` + `ux-e2e` **au vert, 0 erreur JS**.

### 2026-06-08 (suite) — GM individuel = New Business uniquement (renouvellements exclus)
**Problème signalé** (Léandre) : Charles VALET affichait **4% de GM** sur la plateforme alors
qu'il n'apparaît pas au Player Ranking — ce 4% vient de **renouvellements** (Total business),
or le challenge ne classe que sur le **New Business**. Données live confirmées : `ps_total_gm`
= 4% mais `ps_nb` = 0 → `ps_nb_gm` = 0.

**Décision (validée avec Léandre)** :
- Le **GM d'un individu = GM New Business** (`ps_nb_gm`) partout : Player Ranking (affichage
  **et** tri de la colonne GM), cartes joueur, fiches, listes membres (modals équipe/nation),
  My Position, comparateur, verdicts/ticker VAR.
- **Yellow Card « low GM »** désormais jugée sur le **GM NB < 25%**, et **seulement** pour ceux
  qui ont du New Business (`ps_nb > 0`). Sans ce garde-fou, les 306 personnes sans NB seraient
  toutes cardées (0%). Impact réel : ~12 cartes GM (sur GM Total) → **~10** (sur GM NB).
- **Sans New Business → « — »** (pas de marge à calculer), jamais de carte GM.
- **Classements équipe / pays / agrégats restent sur le GM Total** (inchangé) : `avg_gm` des
  équipes, agrégat Nations, et les KPI/dives **Coach Room** (admin) « Avg Gross Margin weighted
  by PS » conservent le Total business.

**Implémentation** (`index.html`) : helper `indivGm(p)` = `ps_nb>0 ? ps_nb_gm : null`
(`fmtPct(null)` → « — »), règle `yellow_gm` recalculée sur NB, et bascule de tous les
affichages GM individuels. Tests mockés mis à jour (un joueur sans NB + un cas GM-NB bas) :
`ux-smoke` et `ux-e2e` **au vert, 0 erreur JS** (la carte « 🟨🟨 » confirme le déclenchement
sur GM NB).

### 2026-06-08 — Système d'historique (snapshots hebdo) + rename d'équipe
**Objectif** : pouvoir montrer l'**évolution semaine après semaine** des classements. Or Jose
ne synchronise la Sheet qu'une fois par semaine (le lundi) et OneBI n'a **pas d'historique** —
il faut donc **figer nous-mêmes** un instantané chaque semaine.

- **Baseline Semaine 1** capturée **avant** la 1ʳᵉ synchro → `history/2026-06-08.json`
  (données live trimées aux champs utiles ; les rangs sont recalculés à la lecture, pas stockés).
  PR #16, mergée.
- **Capture automatisée** via **GitHub Action** (mécanisme retenu : zéro infra en plus, pas de
  changement Apps Script/Vercel). PR #17, mergée :
  - `.github/workflows/snapshot.yml` — cron **chaque lundi 06:00 UTC** + bouton manuel
    *Run workflow*. Fetch l'API live, écrit `history/<date>.json`, commit avec `[skip ci]`
    (n'enclenche pas la suite UX). POST sans `-X` pour gérer le 302 Apps Script (comme
    `test/run-live.sh`).
  - `scripts/snapshot.py` — trim du payload + **garde-fou** : sort en erreur (exit≠0) si le
    payload est `unauthorized`/vide → le job échoue franchement plutôt que de committer un
    snapshot cassé. Réutilisable en local : `python3 scripts/snapshot.py <live.json> [out_dir]`.
- **Run de test manuel** déclenché le 08-06 → **vert sur les 5 étapes** (auth, fetch, trim,
  commit). Pas de doublon créé (contenu identique à la baseline du jour → « nothing to commit »,
  comportement voulu).
- **Rename d'équipe** : **`FR - Digital Impulse` → `Impulse RainMakers`**. Ajouté dans
  `TEAM_ALIASES` (index.html, même mécanisme que `ALPS → Switzerland`) ; s'applique partout
  (chip de filtre, nom d'équipe, labels joueurs). Données live confirmées : 9 personnes,
  clé normalisée `FR - DIGITAL IMPULSE`.

**Pré-requis humains réglés cette session** (sinon l'auto ne tournait pas) :
- Secret repo **`APP_PASSWORD` = `devoteam2026`** ajouté (Settings → Secrets and variables → Actions).
- **Branche par défaut GitHub passée de `claude/affectionate-hamilton-4Gqpx` à `main`** :
  les workflows `schedule` + `workflow_dispatch` ne se déclenchent QUE depuis la branche par
  défaut — sans ça le cron n'aurait jamais tourné. Aligne aussi GitHub sur Vercel (prod = main).

**TODO UI (après lundi, au 2ᵉ point de données)** : afficher les évolutions — ▲/▼ de rang
vs semaine précédente (équipes & joueurs), « plus gros grimpeurs de la semaine », et plus tard
mini-courbes. Lecture des fichiers `history/*.json` côté front (read-only).

### 2026-06-07 (suite) — Test grandeur nature : charge live + UX + Workspace confirmé
Repasse UX **en live** (Chromium headless contre le backend déployé, screenshots dans
`test/e2e/shots/`) : parcours complet validé, **0 échec**, aucune erreur console/réseau.
Correctifs de la session bien visibles en prod (drapeaux des chips, Golden Boot/Playmaker à
**5** joueurs, égalités partagées). Fausse alerte levée : le « €312K vs €656K » sur la carte
spotlight d'Ivan = **artefact de l'animation count-up** capturée en cours, pas un bug (valeur
et légende utilisent toutes deux `ps_nb`).

**Test de charge grandeur nature** (rafale type coup d'envoi) :
- **Prod Vercel** : HTTP 200, 548 KB, 1,3 s, bonne `APPS_SCRIPT_URL`.
- **40 chargements authentifiés simultanés** → **40/40 HTTP 200**, payload **identique**
  (96 692 o, 32 équipes / 379 personnes, 0 warning) → cache 60 s chunké confirmé. Rafale
  encaissée en ~7 s wall-clock.
- Latence/req : médiane **6,1 s**, p95 **6,9 s** — inhérent à Apps Script (aller-retour
  `/exec` → 302 → googleusercontent). Géré côté UX par l'écran « WARMING UP » au 1er load,
  puis refresh en arrière-plan toutes les ~2 min.
- ⚠️→✅ **Quota** : sur **Google Workspace Devoteam** (confirmé par Léandre), pas de limite
  « 20 000 exéc./jour » du grand public ; quotas Workspace largement suffisants. Seul plafond
  à surveiller = **30 exécutions simultanées**, confortable grâce au polling ~2 min + jitter +
  pause onglet caché + cache court. **Aucun garde-fou nécessaire, polling laissé à ~2 min.**
- Méthode de test : POST via `curl -sS -L --data` **sans** `-X POST` (un `-X POST` force le
  POST sur la redirection 302 → l'endpoint googleusercontent renvoie 405 ; sans, curl bascule
  en GET et l'URL one-time sert le payload). À réutiliser pour tout futur test live.
- **Conclusion : plateforme prête pour les ~400 commerciaux.**

### 2026-06-07 — Drapeaux des chips + revue globale + Top 5 correctifs
Session web. Branche `claude/ecstatic-noether-P4j8Y`, livrée en **3 PR squash-mergées** sur `main`.

- **Chips de filtre pays → vrais drapeaux** (PR #1) : les chips utilisaient des emojis
  régionaux (« 🇫🇷 ») qui dégradent en **lettres nues (« FR ») sur Windows/Chrome**. Bascule
  sur le système de drapeaux maison (`flagBars`/`flagForTeam`, SVG/CSS) déjà utilisé sur
  podium/cartes. Ajout d'une **suite de tests live** : `test/run-live.sh` (smoke curl du
  backend déployé), `test/backend-contract.js` (contrat API en sandbox offline),
  `test/e2e/` (Chromium headless contre le backend **réel** : login, tabs, cross-checks
  classements, modal, VAR, My Position, mobile, dark, persistance session).
- **Chips = toggle** (PR #2) : recliquer le drapeau actif enlève le filtre (retour « All »).
- **Repasse globale + Top 5 correctifs** (PR #3, après revue de code priorisée) :
  1. Golden Boot & Playmaker affichaient **6** joueurs sous un libellé « Top 5 » → **5**.
  2. Le filtre pays **fuyait** entre les sous-vues (Teams→Nations→Players) → reset au switch.
  3. La vue **Nations ignorait `UK`** (orphelins) → agrégation depuis `people`, UK apparaît.
  4. La **recherche** remettait le curseur en fin de champ à chaque frappe → `captureFocus`/
     `restoreFocus` (édition en milieu de chaîne OK).
  5. **États vides** explicites (modal équipe sans membres ; nation sans breakdown d'équipe).
  Validé : check syntaxe JS, `backend-contract.js`, `run-live.sh`, **e2e live 0 échec**.
- **Doc** : `SHEET_SPEC.md` documente le seuil GM `>1.5` (auto-correction %→décimal, M2) ;
  `README.md` ajoute une section « Security model » (mot de passe/clé admin = obfuscation,
  pas contrôle d'accès, M5) ; `CLAUDE.md` §6 — bloc de code Apps Script obsolète **retiré**,
  remplacé par un pointeur vers `apps_script_backend.gs` (évite un redéploiement cassé, D3).
- **keepWarm** : confirmé au vert (les échecs « Script function not found » du 06-06 venaient
  d'une ancienne version collée ; résolu). Rappel : le `.gs` du repo ≠ projet Apps Script —
  toute modif du `.gs` doit être **recollée + redéployée** côté Google.
- **Backend redéployé + vérifié (fin de session 07-06)** : Léandre a recollé/redéployé
  `apps_script_backend.gs` (même URL `/exec`) ; `test/run-live.sh` au vert (32 équipes /
  379 personnes, 0 warning). **4 PR squash-mergées** sur `main` ce jour : #1 (drapeaux chips
  + suite de tests live), #2 (toggle des chips), #3 (Top 5 correctifs), #4 (doc M2/M5/D3 +
  journal). Prod Vercel redéployée auto à chaque merge. Reste ouvert : ligne `UK` dans
  `Team Ranking` (Jose/OneBI), contacts §12, et faire évoluer `PERIOD` au fil des semaines.

### 2026-06-06 (suite) — Repasses UX + revue de code + couche calcul vérifiée
Sessions de suivi le même jour (« continue », « repasse UX », « creuse tout »).
Méthode : détecteurs DOM maison qui **exercent les interactions** (clic sur chaque
en-tête triable pour révéler les flèches, ouverture des modales/deep-dives), revue de
code fan-out (4 agents), et tests de calcul avec données **calculées à la main**.
Tout commité/poussé sur `main`, tout vert.

**UX (navigation + densité) :**
- **Taper un onglet depuis le haut** révèle son contenu : avant, le podium d'équipe
  (473px, présent en tête de chaque onglet) restait affiché et il fallait scroller ~790px.
  Le handler de tab ne scrollait que vers le bas (`scrollY > y`) ; corrigé pour caler le
  contenu sous la barre d'onglets sticky dans les deux sens. Commit `60810ae`.
- **Modal équipe** : les 5 stats passaient en **1 colonne** sur mobile (~400px) ; passé en
  **2 colonnes** (~186px) → stats + effectif visibles d'un coup. Commit `60810ae`.

**Bugs d'affichage (classe « contenu qui déborde sur la cellule voisine ») :**
- **Flèche de tri RANK collée à TEAM** : « RANK ▼ » (~51px) débordait la colonne 40/30px.
  Colonne RANK élargie (Teams 52/48px, Players 48px). Commit `a5a4392`.
- **Fix général** : flèche de tri compacte (`sortArrow()` → `<span class="th-arr">`, 0.64em)
  dans les 3 tableaux → 0 débordement à toutes largeurs/états (détecteur qui clique chaque
  en-tête). Commit `3875fcb`.
- **Coach Room deep-dive** : `FLAG_STRIPES` utilisait les anciennes clés groupées
  (DK/NORDICS/BENELUX) qui ne matchent plus `regionOf` par-pays → case drapeau **vide** pour
  la plupart des nations + **double drapeau** FR/ES. Remplacé par le drapeau **emoji** du nom
  via `regionParts()`. Commit `a290778`.

**Fairness / correctness :**
- **Rangs ex-aequo sur les boards individuels** : Golden Boot / Playmaker / Rookie / Licence,
  carte joueur et My Position utilisaient des rangs **index** (`findIndex+1`) → sur égalité
  (fréquent sur les **opps entiers**) trois joueurs à 7 opps montraient #2/#3/#4. Passés en
  **rangs de compétition** (ex-aequo partagés) via `renderMatchSheet`/`fullRankingList`
  self-contained + maps dans `computeRankings` pour la carte/My Position. Test de régression
  ajouté. Commit `ce242d6`.

**Couche calcul — VÉRIFIÉE EXACTE (données calculées à la main, aucun bug) :**
- Agrégation Nations (avg_ps = Σtotal_ps/Σmembres, avg_gm pondéré par membres).
- Totaux Coach Room (PS, NB%, GM pondéré par PS €, meetings, opps, licence).
- VAR / discipline : sur carton jaune, clean sheet, garde `hasData` (tout-zéro non
  sanctionné), « 2 strikes » = rouge.
- Spotlights (5 catégories distinctes + dé-dup), Photo finish (tightRace, seuil 8%),
  digest hebdo (nouveaux #1 / grimpeurs / nouveaux top-10 / nouveaux cartons), honneurs.

> **Note technique** : `renderIndivCard` est du **code mort** (jamais appelé). Le digest se
> calcule au **backgroundRefresh décalé (0–2,5s)** après un changement de période (chemin
> snapshot) — en attendre l'effet dans les tests. Les flèches de tri n'apparaissent qu'après
> un clic → les détecteurs doivent cliquer les en-têtes pour couvrir cet état.


### 2026-06-06 — Grande campagne d'audit QA + revue de code ligne par ligne
Objectif : « creuse tout, faut que tout soit parfait » avant le lancement (~400 users).
Méthode : tests Playwright headless (fetch mocké), détecteur DOM maison (overlaps/clips),
revue de code fan-out sur 4 agents + cœur logique revu à la main. **Tout est commité/poussé
sur `main`** ; tout vert (smoke + e2e + détecteur overlap, 0 erreur JS).

**Bugs corrigés (front, déployés auto via Vercel) :**
- **HIGH — Onglet Nations s'ouvrait à l'envers** (pire nation en haut). Défaut `nationSort`
  passé de `rank/desc` à `rank/asc` (l'inversion donne best-first). Commit `951e97a`.
- **HIGH — Race discipline** : un joueur enfreignant les règles pouvait s'afficher
  « ✅ Playing by the rules » au 1er paint (~50% du temps). Cause : flags discipline +
  normalisation GM + dedup noms vivaient seulement dans `fetchData`, pas dans le chemin
  snapshot/hydrate ni le chokepoint `computeRankings`. Fix : `normalizePeople()` appelée
  en tête de `computeRankings()` (tous les chemins dérivent des données identiques).
  Commit `6897ad5`.
- **HIGH — XSS via `region`** : `regionOf()` renvoie le nom d'équipe brut de la Sheet pour
  les nations isolées, injecté **non échappé** dans 7 attributs (chips `data-region`,
  `<option value>` des filtres Coach/VAR/VAR TIME, `data-cd-region`) + fallback
  `nationLabel`. Tous passés par `escapeHtml`. Commit `7395b2d`.
- **HIGH — App bloquée si localStorage indisponible** (Safari mode privé / MDM) : le bon
  code renvoyait en boucle au login. Fix : fallback mémoire `MEM` dans
  `safeGet/safeSet/safeRemove`. Commit `144753e`.
- **HIGH — Race `fetchData` concurrents** (poll+visibilité+idle+init) : ajout d'un
  garde-fou in-flight (promesse partagée). Commit `7395b2d`.
- **HIGH — Overlays dynamiques hors back-button mobile** (search/rules/digest/compare) :
  Back quittait l'app au lieu de fermer l'overlay → ajoutés à `anyOverlayOpen`/
  `closeTopLayer` + arment le guard d'historique. Commit `7395b2d`.
- **MED — Header Nations qui débordait sur mobile** (« AVG PS / PERSONAVG GM »). Astuce
  `.th-thin` (masque « / PERSON » <800px), comme la table Teams. Commit `22bd226`.
- **MED — Surnoms absents en mode TV** + dans « Players of the Moment » + bandeau
  « Photo finish » → `nicknameOverride`/`playerTeamHTML`/`teamShortLabel` partout.
  Commits `b54a50c`, `0147c6c`, `7395b2d`.
- **MED — Awards Licence/Rookie sans légende de stat** (`renderDataAward` lisait un
  `list.statLabel` inexistant). Commit `7395b2d`.
- **LOW** — `buildRankMaps` aligné sur les rangs de compétition (plus de faux ▲1/▼1 sur
  égalités) ; `restoreFocus` en `preventScroll` ; a11y (aria-label des champs de recherche
  + retour de focus au déclencheur à la fermeture des modales). Commits `0de1092`, `255d05e`.

**Backend (`apps_script_backend.gs`, à REDÉPLOYER — commit `3f223b7`) :**
- `keepWarm()` présent (corrige les emails d'échec du trigger toutes les 5 min).
- Onglet manquant/renommé → warning + `[]` (au lieu d'un échec total générique).
- Data **POST-only** (plus de `?pw=` → le code n'atterrit plus dans les logs/URLs).
- Cache en chunks **45000** chars (sûr <100KB en octets même avec accents é/ø/þ).

**Zones VÉRIFIÉES robustes (aucun bug trouvé) :** rendu/overflow (tous écrans+thèmes via
détecteur DOM), données vides au lancement (0 faux carton, garde `hasData`), movers ▲▼
semaine 1 vs 2, refresh live (poll met à jour les modales ouvertes), Compare, My Position
(accents, multi, no-match), **XSS** (échappement partout, `avatarInitials` strippe),
**résilience réseau** (échec/JSON malformé/stale conservé/récupération), **perf** (payload
8.9KB gzip, switch d'onglet 7-36ms, heap 5-6MB, full ranking 371 lignes en 108ms),
**i18n** (57 clés `t()` définies, app EN par design), **PWA/offline** (manifest valide,
relance hors-ligne affiche l'app via cache+snapshot), **génération d'images** (carte joueur
+ export standings = PNG valides, pas de canvas taint same-origin), countdown/dates.

**Note** : `renderIndivCard` est du **code mort** (jamais appelé) — laissé en place.

**RANK cliquable** : l'en-tête RANK des 3 tables (équipes/nations/joueurs) flippe le
classement (commit `e29eed2`). **Filtres** : tous les pays présents, plus de Nordics/Benelux
groupés, Alps → Switzerland (commits `f6e6098`, `81a6c2b`, `44156c8`). **Surnoms
temporaires** Sweden=Snowball, Norway=Team Haaland, Denmark=Grand Danois (`NICKNAME_OVERRIDES`,
en attendant que la Sheet porte la colonne) — commit `19d08dc`.


### 2026-06-05 — Pays au lieu de « Others » + rang ex-aequo
- **Plus de « Others »** : `regionOf` ne regroupe plus les marchés non listés dans un bucket
  générique — chaque pays devient sa propre nation (Italy, Indonesia, Saudi Arabia, Austria,
  Alps…). Helpers `nationLabel()` (libellé + drapeau, table `NATION_LABELS_EXTRA`) et
  `regionsPresentFrom()` (régions présentes, groupes connus puis pays alpha) ; chip/labels
  « Others » retirés (vue équipes + dropdowns admin VAR/Coach/VAR TIME).
- **Rang ex-aequo** : en tri inversé, les égalités affichaient des numéros distincts
  décroissants (ex. trois €4K → #3/#4/#5). Helper `competitionRanks()` (1,2,2,4 : égalités
  = même rang) appliqué aux 3 tables triables (équipes, nations, joueurs).


### 2026-06-05 — Repasse QA pré-lancement : surnoms d'équipe partout (player lists)
- Avant : surnoms présents au podium / classement équipes / modal équipe / mode TV, mais
  les **listes joueurs in-app** affichaient l'entité brute. Ajout des helpers
  `playerTeamHTML(team, realClass, suffix)` (surnom + entité en petit) et `teamShortLabel`
  (surnom seul, pour les lignes tronquées `nowrap`).
- Surnom désormais affiché dans : match-sheet hero + rows (Golden/Playmaker/Rookie/Licence),
  full-ranking (surnom seul), Special Awards hero + mini (surnom seul), carte joueur,
  My Position, modal Nation (équipes). **Aucun changement pour les équipes sans surnom**
  (le helper retombe sur l'entité → risque nul).
- Surfaces secondaires/admin laissées en entité (VAR, Coach, recherche, ticker, digest).
- Vérifié : fetchData robuste (timeout/abort, unauthorized→logout, warnings, normalisation
  GM, recalcul flags discipline, snapshot) ; cartes joueurs = Set de slugs + fallback
  initiales (onerror) ; deck TV OK.


### 2026-06-05 — Mode TV : revenir au top 5 facilement
- Le bouton de repli était en bas de la liste étendue (il fallait scroller), donc on
  cliquait « Exit » (qui quitte tout le mode TV). Désormais le bouton « + Show more / ← Back
  to top 5 » est **collé en bas de l'écran** (`position: sticky`), toujours visible. Échap
  replie d'abord la liste (retour top 5), puis quitte le mode TV au 2e appui.


### 2026-06-05 — Surnoms d'équipe dans les classements joueurs (mode TV)
- Dans les panneaux joueurs du mode TV (Golden, Playmaker, Special Awards, spotlight),
  la ligne sous le nom affichait l'entité ("FR - Cyber Trust"). Désormais : **surnom de
  l'équipe** (ex. THE UNPATCHABLES) + **entité réelle en petit** dessous (`.tv-real`),
  via le helper `tvTeamLabelHTML(teamName)` (lookup du nickname par `teams.country`).
  Le podium (panneau équipe) reste inchangé (surnom déjà géré).

### 2026-06-05 — Nouvelles icônes catégories
- **Playmaker** : 🎯 → 🌱 (jeune pousse = création d'opportunités). Toutes occurrences,
  y compris la KPI « Opportunities » du Coach Room.
- **Rookie** : 🌱 → 🎓 (chapeau de graduate). Toutes occurrences.
- **Licence** : 💼/📜 unifiés → 📜 (certificat) partout.
  (Ordre des remplacements : 🌱→🎓 avant 🎯→🌱 pour éviter la collision.)

### 2026-06-05 — Fix région Nordics + UX mode TV (côte à côte, scroll, top 5 + « + »)
- **Bug région Nordics** : le Danemark était une nation séparée (`DK`). Désormais `regionOf`
  range DENMARK dans `NORDICS` (= DK+NO+SE+FI+IS). Chip/ordre `DK` retirés. Vaut partout
  (Nations view, drilldown, coach, etc.).
- **Mode TV — Special Awards en 2 colonnes côte à côte** : `.tv-awards` passé en CSS grid
  `1fr 1fr` (s'empilait avant en flex-wrap ; 1 colonne seulement ≤640px).
- **Mode TV — scroll** : `.tv-body` en `justify-content: safe center` + `overflow-y:auto`
  → centré quand ça tient, scrollable sinon (corrige « je pouvais pas descendre »).
- **Mode TV — top 5 + bouton « + »** : tous les panneaux classement (podium, golden,
  playmaker, awards) affichent le top 5 puis un bouton « + Show more » / « − Show top 5 »
  (état `tvExpanded`, reset à chaque changement de panneau). La limitation TV ne touche pas
  les onglets in-app (qui gardent leurs classements complets).

### 2026-06-05 — Surnoms en mode TV + deck TV reconfiguré
- **Surnoms TV** : le panneau podium TV affichait le nom officiel (FR - Creative Tech 2)
  au lieu du surnom. Désormais : surnom en gros (THE STORMERS) + nom officiel en sous-titre,
  quand il existe. `tvMatchSheet` accepte un `item.id` (clé de lookup = pays) distinct du
  nom affiché, pour que le tap ouvre toujours le bon squad. In-app (podium/classement/modal)
  affichait déjà les surnoms via `teamNameHTML`.
- **Deck TV** réduit et réordonné à la demande : `['podium','golden','playmaker','awards','spotlight']`
  = Team → Golden → Playmaker → Special Awards (Licence & Rookie) → Top Players.
  **VAR et Clean Sheet retirés** du mode TV. Les onglets Rookie/Licence dédiés en TV
  (ajoutés plus tôt) sont retirés du deck (remplacés par le panneau Special Awards combiné).
  Les onglets in-app Rookie Cup / Licence restent inchangés.


### 2026-06-05 — Classements Rookie & Licence + polish, ré-appliqués sur `main`
Contexte : `main` avait beaucoup avancé en parallèle (PWA, drapeaux, portraits, tests, et sa
propre version des nicknames / timestamp Drive / cache 60s). Plutôt que merger une vieille
branche (risque d'écraser `main`), on a **ré-appliqué uniquement le nouveau** sur `main`.

Ajouté à `main` :
- **Onglets `Rookie Cup 🌱` et `Licence 💼`** : classements complets (hero #1 + full ranking
  dépliable), même pattern que Golden Boot/Playmaker. Rookies = PS Bookings NB des <1 an ;
  Licence = Licence GM Amount. Tout est cliquable (deep dive carte joueur).
- **Mode TV** : panneaux `rookies` et `licence` (cliquables) ajoutés au deck.
- **Carte joueur** : tuile Rookie Cup (→ onglet rookies), tuile Licence pointe vers l'onglet
  licence, honneur « Rookie Podium ».
- **Mode TV anti-pause** : plus de pause idle en projection (reste live indéfiniment).
- **Lisibilité mode nuit** : chiffres du résumé d'équipe + titres de règles passés en or.
- **Onglets** : chevrons ‹ › + nudge pour signaler le scroll horizontal (catégories cachées).
- **DECISIONS.md** : ce journal, pour la mémoire inter-sessions.

Non ré-appliqué (déjà présent sur `main`, en mieux) : nicknames, timestamp Drive, cache 60s.
