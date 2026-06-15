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
- [ ] **Donnée amont `#N/A`** (Jose / OneBI, repéré 13-06) : 3 personnes ont `TEAM = #N/A`
      dans `Challenge Ranking` (absentes/mal orthographiées dans `People List`/`TEAMS`).
      **Stopgap appliqué côté app le 13-06** (`PEOPLE_TEAM_OVERRIDES` dans `index.html`, clé =
      nom normalisé) → **Majdouline GUEDIRI = `FR - Initiatives Platforms`** (confirmé Léandre) ;
      **Maria de Fátima Santos** et **Marta Godinho = `PORTUGAL`** (niveau nation, **provisoire** —
      squad PORTUGAL 1/2/3 exact non confirmé, à ajuster). La nation fantôme `#N/A` disparaît.
      **Reste à faire côté Jose** : corriger la source (ajouter au roster avec la bonne équipe
      PORTUGAL 1/2/3, corriger l'orthographe « Madjouline »→« Majdouline »), puis on pourra
      retirer l'override. Reco durable : clé le lookup `TEAM` sur le **Workday ID** (WID Maria
      219560, Marta 115708) plutôt que sur le nom.
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
- **Sémantique classements (validée Sebastien/Jose, 06-11)** : individus = **New Business**
  (Golden Boot, Rookie) ; équipes = **Total (NB + renouvellements)**. Voulu. La carte joueur
  met NB en avant, PS Total = ligne discrète « métrique de l'équipe ».
- **Discipline** : seuils centralisés dans la constante `RULES` (5 meetings/sem, 25% NB GM,
  Stage 2+/50K€) → alimente le flag (`normalizePeople`) ET tous les affichages, donc aucun
  risque de désync règle ↔ flag. 🏃 Low Activity (meetings), 🥅 Low Margin (NB GM).
- **Cartons jaunes** : tally par groupe `🟨 ( N )` (podium/équipes/nations/TV) + cartons
  individuels tappables ; **popover flottant unique `#cards-pop`** (tap/Entrée → split, toggle,
  clic-à-côté absorbé sauf champs de formulaire, Échap) ; split précalculé par render
  (`cardsByTeam`/`cardsByRegion`). Carte joueur : **stats cliquables** → explication + règle.
- **A11y** : badges 🟨 et stats de la carte = `role="button" tabindex="0"`, activables clavier.

---

## Journal (le plus récent en premier)

### 2026-06-15 — Suite revue : 4 chantiers choisis par Léandre appliqués
Léandre a tranché les sujets « laissés au choix ». Commits `d4bd0d3` (accordéon) + `d2e8d39`
(a11y/scroll/header). CI verte (ESLint + smoke + e2e).

1. **Classements en accordéon** (P1-1, option « regrouper ») : les 6 leaderboards → une section
   « The Leaderboards » de `<details>` natifs (1er ouvert, autres en teaser → tap pour déplier,
   accessibles clavier). TOC : 6 chips → 1. Les badges catégorie (kicker/tags) **déplient + scroll**
   vers le bon board. Journal bien plus court, richesse conservée.
2. **A11y toutes modales** (P0-2/P0-3) : helper `setDialogA11y()` → `role=dialog`+`aria-modal`+
   `aria-label` sur digest/rules/search/compare ; focus déplacé dans le dialog à l'ouverture
   (digest + rules ; search/compare focalisaient déjà un input).
3. **Conteneur de scroll unique** (P1-4) : `#digest-overlay { overflow:hidden }` → le journal
   scrolle uniquement dans `.digest-modal`, épinglage sticky déterministe.
4. **Menu ⋯ header mobile** (P2-1) : ≤560px, les boutons secondaires (🌙/ℹ️/📲/📺) se replient
   derrière un ⋯ (ferme au clic extérieur/Échap/sélection) ; cibles tactiles **44px**. Desktop
   inchangé (`display:contents`). Vérifié headless : toggle OK, ⋯ = 44px.

### 2026-06-15 — Revue de code + analyse UX complètes (2 agents) → correctifs sûrs appliqués
Léandre : « revue complète du code + analyse UX complète ». 2 agents lancés en // (code review +
UX). Synthèse priorisée ; correctifs sûrs appliqués (commit `2f6d833`), gros sujets laissés au
choix de Léandre. CI re-vérifiée verte (ESLint + smoke + e2e, **+ nouveau test recap**).

**Appliqué (code review)** : suppression handler mort `[data-goboard]` + CSS morte
(`.mag-sech-link/.mag-sech-go`) ; **disconnect de l'IntersectionObserver** à la fermeture (fuite) ;
arg inutile retiré de `recapSection` ; **test smoke recap** ajouté (ouvre le journal → carte → Back
restaure le journal).

**Appliqué (UX)** : **découvrabilité** → 4ᵉ étape de tour vers le 📰 ; **a11y** → digest en
`role=dialog`/`aria-modal` + focus déplacé sur le bouton fermer à l'ouverture, médailles avec
`aria-label`, marquee BREAKING en `aria-hidden` ; **share** → anti double-tap + toast « Building
your front page… » + état disabled ; **clarté** → tooltips glossaire sur les unités (NB/NB GM/
Licence GM/opps) ; **perf** → count-up sauté au retour d'une carte ; contraste micro-label gold
11px/600.

**⏸️ Laissé au choix de Léandre (gros / subjectif, non appliqués)** :
- **P1-1 Longueur/redondance du journal** : ~13 blocs, le leader Golden Boot peut apparaître ~10×.
  Conflit avec la demande explicite « max de joueurs / faut que ça claque ». Options proposées :
  regrouper les 6 leaderboards en accordéon/onglets, et/ou dé-dupliquer le lead (le retirer de
  Talking Points / pull-quote). **À trancher.**
- **P1-4** : 2 conteneurs scrollables (overlay + modal) → épinglage sticky géré en JS (mesure
  hauteur header). Robuste mais fragile ; option : rendre le `.modal` seul scroller.
- **P0-2/P0-3 étendus** : `role=dialog`/focus appliqués au digest ; à étendre aux autres overlays
  dynamiques (rules) pour cohérence a11y (search/compare focalisent déjà un input).
- **P2-1** : header chargé sur petit mobile (7 icônes ~42px) → menu « ⋯ » + cibles 44px.

### 2026-06-15 — Partage de la « une » en image + liste portraits prioritaires
Commit `64a9ace`. Les 2 pistes proposées, livrées.

- **📤 Partager la une** : bouton dans le header du journal → `shareCover()` charge logo +
  portrait du cover star, attend les webfonts, puis `drawCover()` dessine une **image portrait
  720×900 @2x** (masthead + N° + kicker + portrait + nom + stat NB + ruban « la semaine »
  Golden Boot/Playmaker/Top Team + footer « Grand Final · J-N » + URL). Remis au **partage natif**
  (`navigator.share` fichier) avec **fallback download** (réutilise `shareCanvas`). Testé headless :
  2 `toBlob`, 0 erreur.
- **Sticky fix** : le masthead étant lui aussi `sticky` (z-index 10), la quick-nav est désormais
  **épinglée juste sous le header** (hauteur mesurée en JS → `tocEl.style.top`), avec
  `--stick` pour le `scroll-margin-top` des sections. Listener resize nettoyé à la fermeture.
- **`PORTRAITS_TODO.md`** : croisé data live × `cards/`. Parmi les **vedettes**, seulement **5**
  à traiter — **3 déjà présents sous un slug proche** (à renommer : `alejandro-rubio`→`-fabian`,
  `lucas-femina`→`lucas-femenia`, `simon-dhont`→`simon-dhondt`) + **2 à générer**
  (Pablo MARTIN GUTIERREZ, Noor BENACHAIBA). Procédure rappelée dans le fichier.

**Vérif** : ESLint + UX smoke + UX e2e verts ; génération cover sans erreur.

### 2026-06-15 — Repasse UX globale du journal (nav collante, a11y, retours fluides)
Léandre : « repasse globale + améliore l'UX au max sur le journal ». Commit `738e045`.
Revue de cohérence + 4 améliorations (CI re-vérifiée verte : ESLint + smoke + e2e) :
- **Quick-nav collante + scrollable** : « In this issue » passe en `position: sticky` (barre
  une-ligne, `overflow-x:auto`, scrollbar masquée) → toujours accessible en lisant le long numéro.
  `.mag-block` scroll-margin-top 58px pour ne pas passer sous la barre. Dark theme : fond opaque.
- **Surbrillance de section active** : `IntersectionObserver` (root = vrai scroller détecté) met le
  chip de la section lue en surbrillance (`.on`) et le ramène dans la nav.
- **Accessibilité clavier** : les cibles `div/article` (`[data-jump]`/`[data-scrollto]` non-button)
  reçoivent `role=button` + `tabindex=0` et s'activent à **Entrée/Espace**.
- **Retours fluides** : revenir d'une carte **ne rejoue plus** la cascade d'entrée (classe
  `.mag-instant`) → restauration instantanée à la position de scroll mémorisée.

### 2026-06-15 — Fix CI (UX tests) + fonts self-hosted + Nation redesign
CI « UX tests » au rouge (capture Léandre). Diagnostic local (Playwright 1.56.1 +
`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`) → 2 causes corrigées. Commit `a846e71`.

- **Cause 1 (smoke)** : le `<link>` **Google Fonts** déclenchait `Failed to load resource`
  (console error) → `ux-smoke.cjs` échoue (il fail sur toute erreur console). **Fix = fonts
  self-hosted** : Montserrat (variable) + Anton en **woff2 latin** dans `/fonts` (56 KB total).
  Plus aucun CDN externe → conforme au brief, marche même si Google Fonts bloqué. CSP `vercel.json`
  remise à `font-src 'self'` ; header cache 1 an immutable sur `/fonts/*.woff2`.
- **Cause 2 (e2e)** : maintenant qu'**Anton se charge vraiment**, la line-box du `.pc-name`
  (gros titre) **recouvrait** le badge 🟨 flottant de la carte joueur → plus tappable
  (`elementFromPoint` renvoyait `.pc-name`). **Fix** : `.pc-card > .pc-avatar { z-index: 4 }`
  (le badge vit dans le stacking context de l'avatar) → badge de nouveau cliquable.
- **Nation of the Week redesign** : drapeau + bloc pays + **chip capitaine** (gros avatar,
  label « ⭐ Captain » au-dessus du nom) à la place de la pastille du bas, mal disposée.

**Vérif locale (= 3 jobs CI) : ESLint exit 0, UX smoke ALL GREEN, UX e2e ALL GREEN.**

### 2026-06-15 — Police : Montserrat (UI) + Anton (display) en webfonts
Léandre : « pour la police, mets du Montserrat ». Commit `0e302ea`.
Avant : `Inter`/`Anton` étaient juste **nommés** (jamais chargés → fallback système/Impact). Ajout
`<link>` Google Fonts **Montserrat 400-900 + Anton** (`display=swap`). `body` → **Montserrat**
(Anton conservé pour les gros titres, désormais **vraiment rendu**). **CSP mise à jour**
(`vercel.json`) : `style-src` + `https://fonts.googleapis.com`, `font-src 'self'
https://fonts.gstatic.com data:`. **Service worker** : bypass des requêtes cross-origin (fonts/
analytics passent direct, pas de cache opaque) + cache `v37`. ⚠️ entorse assumée au « tout inline /
no CDN » du brief (demande explicite ; fallback gracieux si réseau bloque Google Fonts).

### 2026-06-15 — Recap v10 : AUCUN lien ne sort du journal + valeurs unitées + fix scroll
Léandre (3 retours) : « les liens (Golden Boots, Licence…) me **font sortir** du journal — pas
ce que je veux, vérifie TOUS les liens » ; « les valeurs des classements = quoi ? **NB ?** » ;
« revenir d'une carte me remet **en haut** du journal, pas à l'endroit cliqué ». Commit `77ef823`.

- **Zéro sortie** : vérifié runtime → **0 `data-goboard`** dans le journal. En-têtes de classement
  (`recapBoard`) et de tickers (`recapSection`) repassés en **`<h3>` simples** (plus de ↗ board) ;
  **Nation** : suppression des boutons « Table ↗ » et stat-lien. Les badges catégorie (kicker
  rouge + tags Panini) → **`recapCatAttr` renvoie toujours `data-scrollto`** (scroll interne, no-op
  si pas de section). Seule « sortie » = fermer le journal (× / Back). Les cartes joueur restent
  des overlays internes (Back revient au journal).
- **Valeurs unitées** : chaque ligne de classement affiche son unité via `recapLbRow(…, unit)` →
  **NB / opps / NB GM / Licence GM** (Clean Sheets = NB). Header + ligne now sans ambiguïté.
- **Fix scroll restore** : le bug venait du `requestAnimationFrame` qui relisait
  `digestReturnScroll` **après** sa remise à 0 → scroll 0 (haut). Corrigé : copie locale `y`
  d'abord, puis `restore()` synchrone + rAF + `setTimeout(60)` → on revient **pile** à l'endroit.

**Vérif runtime** : 0 goboard, unités {NB, opps, NB GM, Licence GM}, 18 liens scrollto internes,
55 cartes data-jump, Nation sans goboard. JS/CSS OK.

### 2026-06-15 — Recap v9 : BREAKING + Talking Points + Nation + KPIs clairs/cliquables + scroll
Léandre (3 retours) : « faut que ça claque » ; « €1.27M oui mais quoi ? précise toujours (NB…)
et rends **chaque KPI cliquable** » ; « Back depuis une carte → revient au journal **au même
niveau**, pas tout en haut ». Fast-forward `main`. Commit `10a9128`.

**Nouveau contenu (esprit Mondial) :**
- **Bandeau BREAKING défilant** en tête (marquee, pause au survol, `reduced-motion` → statique
  scrollable). Teasers data-driven.
- **Talking Points** (`recapTalking`) : 3 brèves de vestiaire **avec visage** + carte cliquable.
- **Nation of the Week** (`recapNation`) : top team, **grand drapeau**, capitaine (visage), stat
  moyenne **cliquable** → Team Ranking.

**Clarté KPIs (de quoi parle-t-on + cliquable) :**
- Duel : valeurs étiquetées **« PS New Business »** ; légende + pull-quote disent « New Business ».
- Stat of the Week : libellés clarifiés (**Sharpest NB margin**, **NB gap · #x vs #y**,
  **Opportunities created**).
- Team of the Week : chaque stat porte son **unité** (NB / GM / opps).
- Nation : la moyenne devient un **bouton** vers le Team Ranking.
- (Rappel : tout KPI vit dans un élément cliquable → ouvre la fiche Panini qui explique chaque
  chiffre via ses tuiles `data-explain`.)

**Fix UX scroll** : ouvrir une carte depuis le journal **mémorise la position de scroll**
(`digestReturnScroll`, lue sur `.digest-modal`/overlay) ; à la réouverture du journal (Back/Esc/
bouton), on **restaure exactement** ce niveau au lieu de revenir en haut.

**Navigation interne (ne plus sortir du journal)** : le **bouton rouge (kicker)** du hero et les
**tags** des cartes Panini ne **quittent plus** le journal — ils **scrollent vers la section
correspondante** dans le numéro (`recapCatAttr` → `data-scrollto` ; map tab→section
golden/playmaker/nation/stars/fairplay/rookies/licence). Le handler `data-scrollto` fait
`stopPropagation` (ne pas ouvrir la fiche en même temps). Les **en-têtes de classement** gardent
le ↗ « voir le board complet » (sortie délibérée, assumée).

**Team of the Week explicable** : ajout d'un **chapô** qui explique la sélection (« un titulaire
par rôle : top scorer Golden Boot / top assists / meilleure marge NB / meilleur rookie / top
scorer au casier VAR vierge — chaque nom une seule fois »).

**Vérif runtime** : breaking/talking/nation présents, labels NB OK partout, stat nation =
bouton goboard, kicker/tags = `data-scrollto`, chapô TOTW présent, 14 sections TOC. JS/CSS OK.

### 2026-06-15 — Recap v8 : plume éditoriale (chapôs, pull-quote, Une variable)
Toujours « faire vivre le journal ». Fast-forward `main`. Commit `798e6e1`.

- **Chapôs (deks)** sous chaque classement, **générés depuis la data** (italique serif) :
  Golden Boots « X sets the target at €Y — Z gives chase », Best Opportunities « X is the
  supply line… », Margins « Quality over quantity — X converts at Z% », Rookies, Licence,
  Clean Sheets. `recapBoard` accepte désormais `dek`.
- **Pull-quote** (`recapPullQuote`) entre Stat of the Week et les classements : le chiffre
  signature de la semaine en très gros (« €1.27M and counting. ») + byline, cliquable → fiche.
- **Titre de Une variable** : pour le cas frontrunner, le verbe **tourne avec la semaine**
  (`verbs[wk % n]` : SETS THE PACE / LEADS THE CHASE / OUT IN FRONT / TOPS THE CHARTS / …) pour
  que la couverture ne soit pas identique chaque lundi.

**Vérif runtime** : pull-quote OK (« €1.27M »), 6 deks data-driven corrects, Une « Erjona GURINA
TOPS THE CHARTS » (semaine 3). JS/CSS OK.

### 2026-06-15 — Recap v7 : Team of the Week (le XI) + signature rédaction
Léandre : « imagine que tu es un journaliste spécial Coupe du Monde sales Devoteam, fais vivre
ton journal pour le vendre ». Fast-forward `main`. Commit `bd31f59`.

- **Team of the Week** (`recapTeamOfWeek`) : le **XI de la semaine** sur une **pelouse verte**
  (gradient + ligne médiane + rond central), un titulaire par rôle — ⚡ Striker (Golden Boot),
  🅰️ Playmaker (opps), 🎯 Finisher (meilleure marge), 🎓 Wonderkid (top rookie), 🧤 Clean Sheet
  (sans carton) — **5 joueurs distincts** (dedup via `picked` Set), grands visages cliquables →
  fiche Panini. Placé après les Leaders, dans la quick-nav (chip 🌟).
- **Signature rédaction** dans le bandeau-titre : « ⚽ By the Devoteam Newsroom · Group Sales ».

**Vérif runtime** : XI = 5 rôles / 5 joueurs distincts, stats correctes (€1.27M / 22 opps /
76.4% / €463K / €430K), chip TOC `totw` présent, 25 joueurs distincts dans le numéro. JS/CSS OK.

### 2026-06-15 — Recap v6 : visages partout + Duel of the Week + esprit Mondial
Retour Léandre (capture à l'appui) : quand on **mentionne quelqu'un, toujours montrer sa carte
Panini** ; + plus d'images, de texte, d'**engagement/suspense**, sentir l'**esprit Mondial**.
Fast-forward `main`. Commit `4901b84`.

- **Visage sur chaque mention** : les tuiles **Stat of the Week** ont désormais un **disque
  portrait** (badge emoji en coin) ; l'**éditorial** affiche une **bande de chips-visages**
  cliquables pour chaque joueur cité (plus de nom en texte seul). Tout ouvre la fiche Panini.
- **Duel of the Week** (`recapDuel`) : le top 2 du Golden Boot **face-à-face**, 2 grands
  portraits + badge **VS** rouge + l'écart entre eux + accroche suspense (« who'll wear the
  Golden Boot in Paris? » / « Dead heat » si égalité). Les 2 visages ouvrent la fiche.
- **Éditorial enrichi** : phrase de clôture avec **semaines restantes** (parsées de `period`
  « Week N of M ») → « With X weeks to go, the race to Paris is wide open 🌍 ».
- TOC : nouveau chip **⚔️ Duel** (placé après l'édito, avant les Leaders, pour le suspense tôt).

**Vérifs runtime** : Duel présent (écart €495K affiché), 3 tuiles SOTW avec visage, 3 chips-
visages dans l'édito, closer « weeks to go » OK, **25 joueurs distincts**. JS/CSS OK.

### 2026-06-15 — Recap v5 : journal enrichi (quick-nav, édito, leaderboards, max joueurs)
Demande Léandre : « rajoute un maximum de choses qui facilitent l'utilisation du journal ;
catégories, storytelling, meilleure marge depuis le début, Golden Boots, plus belles
opportunités ; mettre en avant un **maximum de joueurs** ». Fast-forward `main`. Commit `50b0d53`.

- **Quick-nav « In this issue »** : chips qui **scrollent** vers chaque section dans le modal
  (`data-scrollto` → `[data-sec]`, `scrollIntoView` smooth). Ne liste que les sections **non
  vides** de la semaine.
- **Éditorial** (`recapEditorial`) : 2-4 phrases générées (leader Golden Boot, Playmaker, top
  team, gros grimpeur) → storytelling « Editor's Note · Week N ».
- **6 leaderboards thématiques** (top 5, chaque ligne ouvre la fiche joueur ; en-tête → board) :
  🥇 Golden Boots (ps_nb), 🎩 Best Opportunities (opps), 🎯 **Sharpest Margins** (NB GM, *season
  to date*, ≥ €100K), 🎓 Rookie Watch, 📜 Licence Leaders, ✅ Clean Sheets (top scorers sans
  carton). Composant réutilisable `recapBoard` + `recapLbRow` (médailles 🥇🥈🥉).
- **Stagger** passé à un index `--i` posé en JS sur `.mag > *` → s'adapte à n'importe quel
  nombre de sections.
- **Sections conditionnelles** : n'apparaissent que si elles ont du contenu (rookies/licence/
  changes masqués sinon). Wrapper `[data-sec]` ajouté pour l'ancrage TOC.

**Vérifs runtime** : full digest → **25 joueurs distincts** mis en avant (38 cibles), 10 chips
TOC tous ancrés ; semaine calme (`d=null`) → chip « This Week » correctement absent, 24 joueurs.
JS/CSS OK. Audit clic/explicabilité maintenu (chaque ligne data-jump + title, en-têtes goboard
vers onglets valides, chips TOC = navigation interne).

### 2026-06-15 — Fix UX : retour depuis une carte ouverte du journal → revient au journal
Bug remonté par Léandre : ouvrir « voir carte » depuis la une puis **Retour** renvoyait au
**menu** au lieu du **journal**. Fast-forward sur `main`. Commit `3d56b61`.

**Cause.** La une (`#digest-overlay`) est un **overlay dynamique** retiré du DOM dès qu'on ouvre
une carte joueur — contrairement aux modals équipe/nation qui ont un retour (`playerReturnToTeam/
Nation`). La carte n'avait donc **aucune cible de retour** → fermeture = menu.

**Fix.** Nouveau flag `playerReturnToDigest` (calqué sur les autres) :
- **posé** quand une carte est ouverte depuis la une (handler `[data-jump]` du digest) ;
- **honoré dans les 3 chemins de fermeture** — bouton Back/Close à l'écran (`closePlayer`),
  Back navigateur / `popstate` (`closeTopLayer`), et `Escape` — qui **rouvrent `openDigest()`**
  et **ré-arment le garde d'historique** (un Back suivant ferme alors le journal) ;
- **remis à false** sur toute autre transition pour éviter un état périmé : ouverture de carte
  in-app (`[data-player]`), lien squad (`pc-team-link`), et `statGoto` (saut vers un board) ;
- le **bouton de la carte** affiche « ← Back » (au lieu de « ← Close ») quand le retour mène
  au journal.

**Vérif.** 6 scénarios tracés à la main contre la logique du garde d'historique (Back nav,
bouton écran, Esc, lien squad, view-full-ranking, ouverture in-app) — pas de double-push ni de
sortie d'app intempestive. JS/CSS OK. (Pas de test e2e dédié : comportement d'historique
navigateur, non couvert par la suite Playwright mockée.)

### 2026-06-15 — Recap v4 : finitions « catchy » (count-up, reveal, N° d'édition, teaser)
Demande Léandre : rendre la une **vraiment plaisante à lire**, qui **parle à l'œil** et soit
**catchy**, façon couverture de magazine. Fast-forward sur `main`. Commit `7fd175b`.

- **Entrée en cascade** (`@keyframes magIn` + delays sur `.mag > *`) : la une « s'imprime »
  section par section à l'ouverture. Désactivée sous `prefers-reduced-motion`.
- **Count-up** (`animateRecapCounts` + `countSpan` → `data-cv`/`data-cf`) : les gros chiffres
  dorés (stats des Panini + Stat of the Week) **montent de 0** vers leur valeur (money/pct/int,
  easing cubic). La **valeur finale est rendue d'abord** (no-JS / reduced-motion = valeur exacte
  immédiate). Vérifié : raw→format == valeur affichée pour les 6 compteurs.
- **N° d'édition** : tampon doré incliné `N°3` dans le bandeau-titre (parsé depuis `period`).
- **Living paper** : overline « ⚽ Matchday Report · The Race to Paris 🇫🇷 » (filet doré) en haut,
  et **footer teaser** « 🗞️ New edition every Monday · 🏆 Grand Final · Paris · 9 Jul · J-N »
  (J- calculé vers le 2026-07-09 ; testé J-24 au 15/06).
- Fix : `.mag-sotw-val` repassé en `display:block` (devenu `<span>` pour le count-up).

Vérifs : 3 scripts JS OK, accolades CSS équilibrées, test runtime (overline/footer/edition/
6 compteurs cohérents).

### 2026-06-15 — Recap v3.1 : audit « tout cliquable & explicable » sans léser l'UX
Demande Léandre : vérifier que **tout est cliquable et explicable**, sans dégrader l'UX.
Fast-forward sur `main`. Commit `e0b8318`.

**Audit runtime** (rendu full digest + semaine calme + nom périmé) : tous les `data-jump`
(hero/cartes/tuiles SOTW/lignes ticker) résolvent vers des **personnes réelles** ; tous les
`data-goboard` pointent vers des **onglets valides** (golden/playmaker/teams/spotlight/var) ;
chaque cible a un **handler** + une **affordance** (tooltip + `↗`/CTA).

**Correctifs UX appliqués :**
- **Garde anti-nom périmé** : si une ligne de ticker référence un joueur sorti des données, le
  tap ne fait **rien** (ne peut plus ouvrir une fiche vide) au lieu d'ouvrir un modal cassé.
- **Hero sans portrait** (`mag-hero-noimg`) : la catégorie devient un **vrai lien** et l'article
  n'affiche plus un **curseur pointer trompeur** (`cursor:default`).
- **Code mort retiré** : handler `data-jump-team` supprimé (la carte Top Team cible son capitaine
  via `data-jump`).
- **Tooltips** ajoutés au hero et aux lignes de ticker → chaque cible est auto-explicative.

### 2026-06-15 — Recap v3 : magazine permanent + pastille lundi + foil holo + Stat of the Week
Suite des v1/v2 recap. Fast-forward sur `main`. Commit `22fad6d`.

**🗞️ Magazine permanent.** Demande Léandre : « fait apparaître **constamment** le magazine,
c'est comme un journal qu'on achète et qu'on vit au fur et à mesure ; et **tous les lundis
pastille rouge** quand les infos sont nouvelles ». → `applyDigestVisibility()` réécrit : le
bouton 📰 s'affiche **dès que les classements sont chargés** (`sortedGoldenBoot.length > 0`), plus
seulement quand `weekDigest.count > 0`. La **cover a toujours du contenu** (hero frontrunner + 3
Panini + Stat of the Week) même sans digest (`renderRecapMagazine(null)` testé OK). La **pastille
rouge** ne s'allume que pour une **édition fraîche non lue** (`weekDigest.count && !isDigestSeen`),
càd au changement de `period` → comportement « nouveau numéro du lundi » conservé.

**✨ Foil holographique.** Cartes Panini + hero : tint arc-en-ciel au survol (`::after`,
`mix-blend:screen`) + **balayage glossy** qui traverse la carte (`::before` translateX). Désactivé
sous `prefers-reduced-motion`.

**📊 Stat of the Week** (`recapStatOfWeek`). Bandeau navy « by the numbers », 3 tuiles
cliquables (→ fiche joueur) : 🎯 meilleure marge NB (parmi ≥ €100K NB), 🔥 photo finish (course
la plus serrée du podium Golden Boot via `tightRace`), 🅰️ plus gros créateur d'opportunités.
Inséré entre les cartes Panini et les tickers ; toujours présent (indépendant du digest).

**Vérifs.** 3 scripts JS OK, accolades CSS équilibrées, test runtime « semaine calme » (`d=null`)
→ hero + 3 `mp-card` + SOTW (3 tuiles : 76.4% / photo finish / 22), 0 ticker vide.

### 2026-06-15 — Recap v2 : cartes Panini + catégories cliquables (cover image-rich)
Suite directe de la refonte recap ci-dessous. Fast-forward sur `main`. Commit `4dddc52`.

**❓ Retour Léandre.** La v1 « magazine » manquait **cruellement d'images** → demande : ajouter
des **cartes Panini de joueurs**, rendre les **catégories cliquables** (pour comprendre ce qui
est mis en avant), s'inspirer des **couvertures de magazine**.

**🃏 Cartes Panini (`index.html`, `recapPanini`).**
- **Hero** = grand **portrait Panini** teinté à la couleur de l'équipe (`colorForTeam`), photo
  plein cadre (`photoFor`, fallback initiales), **drapeau** en coin (`flagBars`), dégradé bas
  pour la lisibilité. Quand le lead est une **équipe** (nouveau #1 Team Ranking), on met le
  **visage du capitaine** = top contributeur PS Total de l'équipe (`teamCaptain`).
- **3 cartes Panini** des leaders de catégorie : 🥇 Golden Boot (rank #, dorée), 🎩 Playmaker,
  🏆 Top Team (visage du capitaine + drapeau + avg/rep). Photos + drapeaux partout, ruban de
  rang, foil dégradé, hover lift. Grille responsive `auto-fit minmax(150px)`.

**🖱️ Catégories cliquables (`data-goboard` → `statGoto`).** Le **kicker** du hero, le **tag** de
chaque carte, et chaque **titre de rubrique** (ticker) sont des liens qui **basculent vers le
board correspondant** (Golden Boot/Playmaker/Team Ranking ; climbers & new-top-10 → *Players of
the Moment* `spotlight` ; VAR Report → `var`) et **scrollent au classement** (`statGoto`). Le
clic sur la carte ouvre le **joueur** ; le clic sur le tag fait `stopPropagation` pour ne pas
ouvrir la carte en même temps.

**🐛 Bug corrigé.** `flagForTeam()` renvoie un **tableau de couleurs**, pas un emoji — la v1
affichait donc le tableau brut sur la carte « Top Team ». Désormais tous les drapeaux passent
par `flagBars()`.

**Nettoyage / vérifs.** Anciennes classes `.mag-card*` / `.mag-hero-media` et `recapHeroMedia`
**supprimées** (0 référence). 3 scripts JS OK, accolades CSS équilibrées, test runtime sur
données live : hero + 3 `mp-card`, 7 liens `data-goboard` corrects, capitaine résolu, drapeaux
rendus via `flagBars`, rubans `#1`.

### 2026-06-15 — Weekly recap refait en « une » de magazine sportif (style L'Équipe)
Session chat pilotée par Léandre, **fast-forward sur `main`**. Commit `b3dcd24`.

**❓ Constat.** Le bouton 📰 « THIS WEEK'S RECAP » ouvrait une **liste plate** de petits
changements de rang (« up 1 #273→#272 »…) → jugé **triste et sans saveur**. Demande : en faire
une **première page de magazine** (gros titres « presse », highlights, mise en avant des
meilleurs joueurs) qui **donne envie**.

**📰 Refonte (`index.html`, `openDigest`).** Le corps du modal est désormais produit par
`renderRecapMagazine(d)` et ses helpers :
- **Masthead** dans le header du modal : nameplate `DEVOTEAM WORLD CUP TIMES` + dateline
  monospace (« 📰 This Week's Recap · since Week N · Week N of 5 »), filet de séparation.
- **Hero / lead story** (`recapLead`) = **le** gros titre de la semaine, choisi par priorité :
  1) nouveau #1 (Team/Golden Boot/Playmaker) → « X SEIZES THE GOLDEN BOOT » ; 2) sinon plus
  gros grimpeur si saut ≥ 2 → « X ON THE RISE » ; 3) sinon le **frontrunner** actuel du Golden
  Boot → « X SETS THE PACE » (⇒ jamais vide, même une semaine calme). Photo grande (`photoFor`,
  fallback initiales ; drapeau si lead = équipe), kicker rouge en pastille, headline Anton géant,
  standfirst en serif (Georgia) pour le côté presse.
- **Star cards** (`recapStarCards`) = 3 cartes des leaders **actuels** : 🥇 Golden Boot
  (`ps_nb`), 🎩 Playmaker (`opps`), 🏆 Top Team (`avg_ps`). Carte Golden Boot dorée.
- **Tickers presse** (`recapTicker`) : 📈 The Climbers, ⭐ New in the Top 10, 🟨 VAR Report
  (nouveaux cartons), chacun affiché **seulement s'il y a du contenu**.
- **Interactions** : tap sur un joueur (hero / carte / ligne) → sa carte ; tap sur la carte
  Top Team → drilldown équipe (binding élargi à `[data-jump]` + nouveau `[data-jump-team]`).
- Responsive (grille 3→1 col, hero compacté < 560px) + variantes dark theme.

**Nettoyage.** Anciens helper `digestRow` et CSS `.digest-row/.digest-section/.digest-h/...`
**supprimés** (0 référence restante). Vérifs : 3 scripts JS OK, accolades CSS équilibrées,
test runtime des builders sur données live (hero/grid/ticker présents, les 3 priorités de lead
correctes, stats cartes €1.27M / 22 / €547K).

**Note produit** : le bouton 📰 + pastille n'apparaît toujours que quand un digest existe
(`weekDigest.count > 0`, càd après un **changement de semaine** détecté côté `period`). La
« une » ne s'affiche donc qu'à partir de la 2ᵉ semaine de données — comportement inchangé.

### 2026-06-15 — Tri VAR par défaut = PS New Business + toggle « par infraction »
Session chat pilotée par Léandre. Développé sur `claude/clever-cori-vs8s31` puis **fast-forward
sur `main`** (accord explicite → prod redéployée). Commit `7c4a12e`.

**❓ Question de départ.** « Pourquoi Lucas Femenia est-il #1 dans VAR Room ? » Les cartes VAR
(VAR Room **public** et VAR TIME **admin**) étaient triées par **PS Total** (= New Business
**+ renouvellements**). Lucas a un PS Total énorme (**1,97 M€**) mais surtout porté par des
**renouvellements** — son **New Business n'est que de ~326 K€**. Il remontait donc artificiellement
en tête alors que, sur la métrique qui **score** le challenge individuel (le New Business), il est
loin derrière.

**🥇 Nouveau tri par défaut = PS Bookings New Business (desc).** Les deux colonnes d'infraction
(Low activity / Low margin) de VAR Room **et** VAR TIME s'ordonnent désormais par `ps_nb` décroissant
(au lieu de `ps_total`). `varBreakers()` (VAR TIME) trie par `ps_nb` desc → nb de strikes → meetings
asc. Avec les données du 15/06, la colonne *Low activity* devient #1 Erjona GURINA (NB 1,27 M€),
#2 Ivan Bergendorff, #3 Luis FOLGOSO ; Lucas Femenia n'est plus en tête.

**⚠️ Toggle « Sort by ».** Ajout d'une barre de tri (chips `.var-sort` / `.vt-sort`, état
`varSort` / `vartimeSort`, défaut `'nb'`) dans les deux vues, avec deux options :
- **🥇 New Business** (défaut) — PS NB desc.
- **⚠️ Infraction severity** — chaque colonne par sa **propre gravité** : *Low activity* →
  **meetings croissants** (le moins assidu en tête), *Low margin* → **GM croissant** (pire marge
  en tête). Tri sur `meetings` / `ps_nb_gm`. Les joueurs `yellow_gm` ont tous `ps_nb>0` donc pas
  de GM null à gérer.

**Notes.** La colonne *Clean sheet* (VAR Room) reste triée par **PS Total desc** (c'est la valeur
qu'elle affiche, et la notion « infraction » ne s'y applique pas). Handlers câblés dans les blocs
`currentTab === 'var'` et `=== 'vartime'`. Vérifs : 3 scripts JS OK, accolades CSS équilibrées.

### 2026-06-15 — Période auto « Week N of 5 » (plus d'édition hebdo manuelle)
Session chat pilotée par Léandre. Développé sur `claude/clever-cori-vs8s31` puis **fast-forward
sur `main`** (accord explicite → prod redéployée).

**🗓️ Auto-calcul du label de période.** Le header affichait une semaine figée (valeur du champ
`period` du Config tab / `SETTINGS.PERIOD`), qu'il fallait éditer **à la main chaque lundi**.
Désormais `computeAutoPeriod()` (`index.html`) **dérive la semaine** à partir de
`challenge_dates` : `start` (= **2026-06-01**, lundi du coup d'envoi) → semaine courante, et
`start→end` → nombre total de semaines (**défaut 5**). La semaine est **bornée à [1, totalWeeks]**
(jamais « Week 0/6 »). Câblé dans **les deux chemins** qui posent `period` (fetch live **et**
hydrate instant-paint) : `period = computeAutoPeriod() || data.period || ''` → l'auto prend le
dessus, **fallback** sur le Config tab si `challenge_dates.start` manque. Vérifié :
15/06 → « Week 3 of 5 », 22/06 → « Week 4 », après le 03/07 → « Week 5 » (plafonné). Commit `468137c`.

**🧭 Confusion résolue en séance** : le départ officiel est bien le **lundi 1er juin** (et non
« lundi dernier 08/06 »), donc au 15/06 on est en **semaine 3** — l'auto-calcul tombe juste.
Le champ `period` du Config tab devient **facultatif** (laissé comme filet de secours).

### 2026-06-13 — Classements complets partout + UX modals + flags Alps/Nordics + repasse globale
Session pilotée par Léandre en chat (itérations rapides à partir de captures). Tout développé
sur `claude/clever-cori-vs8s31` puis **fast-forward sur `main`** (avec accord explicite à chaque
fois → prod redéployée). 16 commits, `main` à `fe37713`.

**📊 « Voir le classement complet » partout (demande clé de Léandre).** Plusieurs vues
plafonnaient à un Top N sans moyen de tout voir :
- **Modal nation → Top contributors** : plafonné au top 15 / 181. Ajout d'un toggle
  **« Show all N »** (état `nationContribExpanded`), avec une **pastille dans le header**
  (visible direct) **et** un bouton pleine largeur en bas (classe partagée
  `nation-contrib-toggle`).
- **Coach Room** : toggle « Show all » sur les **deep-dives par nation** (`coachContribExpanded`)
  **et** sur le **panneau principal** de contributeurs (`coachPanelExpanded`).
- **Special Awards** : « ▼ Show full ranking » sous les cartes **Licence** (clé `licence_aw`)
  et **Rookie of the Year** (clé `rookies_aw`) — clés distinctes de l'onglet Licence / Rookie Cup
  pour ne pas partager l'état d'expansion. Les boards Golden Boot/Playmaker/Rookie l'avaient déjà.
- **Modal équipe** : affichait **déjà** tout le squad (pas de cap) — rien à changer.
- AI Play / Transformative Deal restent **Top 1** (prix jury à lauréat unique) — voulu.

**🏔️ Flags & labels.**
- **ALPS → « Alps »** : l'alias `TEAM_ALIASES['ALPS']` passait l'entité Devoteam Alps en
  « Switzerland » (drapeau suisse). Léandre l'a trouvé trop proche Autriche/Indonésie. Renommé
  en **`Alps`** + **drapeau SVG dédié `.flag-alps`** (montagnes enneigées sur ciel bleu, via
  `flagImg`, comme UK/PT) → reconnaissable, non confondable. Label sans emoji (le SVG porte la
  montagne). `applyTeamAliases` renomme aussi `people[].team` → jointures OK.
- **« Nordics G Cloud »** : tombait sur `FLAG_STRIPES.OTHER` (rouge/blanc/vert ≈ Italie).
  `flagForTeam` renvoie maintenant le **bleu/or nordique** pour tout nom contenant `NORDIC`
  (check **après** la correspondance exacte de pays → aucun vrai pays nordique impacté).

**🪟 UX des modals longs.**
- **Scroll préservé au toggle** : `render()` reconstruisait le DOM → le modal (scroll interne,
  header sticky) remontait en haut. Helper **`renderKeepModalScroll(overlayId)`** : capture/restaure
  le `scrollTop` du `.modal`. Utilisé par les toggles nation + coach-dive.
- **Flèches flottantes haut/bas** (`modalScrollNav()` / `.modal-scrollnav` / `.msn-btn`) :
  bouton rond navy+doré en bas à droite, **scroll fluide** vers le haut/bas, **auto-masqué**
  si le contenu n'est pas assez long (>120px). Sur nation, équipe, coach-dive. Helper
  **`bindModalScrollNav(root)`** appelé sur `#app` (pour ne pas double-binder pendant le polling)
  **et** dans `openTVTeamCard` (overlay TV ajouté hors `render()`).
- **Boutons toggle relookés** : style « médaille » doré plein + texte navy (contraste OK clair/sombre).
- **Header contributeurs responsive** : titre + pastille sur une ligne flexible (`min-width:0`),
  et **sur ≤600px** la pastille passe **pleine largeur sous le titre**. **Espacement** : ajout
  `margin-top:28px` car la pastille (plus haute qu'une ligne) débordait sur le tableau du dessus.

**🔎 Repasse globale (revue par sous-agent + vérif).** Aucun bug haute sévérité. 3 nits corrigés :
clé `licence_aw` (état d'expansion qui bavait entre onglet Licence et carte award), scope du
binding scroll-nav à `#app` (évite double smooth-scroll si polling pendant un overlay TV ouvert),
commentaires obsolètes « ALPS → Switzerland » rafraîchis. + correctif mode TV (flèches non câblées
dans `openTVTeamCard`).

**📄 Doc** : `CLAUDE.md` corrigé — la fréquence de polling réelle est **~2 min** (base 120 s,
jitter ±25 %, pause inactivité/arrière-plan), pas 30 s. `DECISIONS.md` était déjà à jour là-dessus.

**🧩 Donnée amont — 3 personnes `TEAM = #N/A`** (creusé via le `.xlsx` fourni par Léandre).
Dans `Challenge Ranking`, 3 lignes ont `TEAM = #N/A` → la plateforme les met dans une nation
fantôme `#N/A` (1 team / 3 people). **Cause** : absentes/mal orthographiées dans le roster maître
(`People List` / `TEAMS`), qui sert de lookup. Vraies équipes retrouvées via OneBI :
**Majdouline GUEDIRI → `FR - Initiatives Platforms`** (orthographiée « Madjouline » dans le roster
→ mismatch) ; **Maria de Fátima Santos → `PT - Business Support`** (WID 219560, absente du roster) ;
**Marta Godinho → `PT - Innovative Tech`** (WID 115708, absente). Le numéro exact PORTUGAL 1/2/3
n'est **pas** dérivable de l'OU (affectation manuelle Jose). **→ correctif côté Jose** (voir Actions
en attente). Reco : clé le lookup sur le **Workday ID** plutôt que sur le nom.

### 2026-06-12 — RÉCAP de session : système cartons → carte joueur → responsive → quality pass (PRs #36–#48)
Vue d'ensemble de tout ce qui a été livré dans cette session (les entrées détaillées juste
en dessous gardent le détail PR par PR ; ce récap comble les trous et fixe la décision produit).

**🎯 Décision produit — fait foi (validée en chat avec Sebastien CHEVREL & Jose) :**
- **Challenge individuel = New Business** (Golden Boot, Rookie Cup).
- **Classement des équipes** (World Cup : podium / home / mode TV) = **Total PS Bookings**
  (New Business **+** renouvellements). C'est **voulu**, ce n'est pas une incohérence.
- Carte joueur : **NB en rang héros** ; **PS Total** = simple ligne discrète « compte pour le
  classement de l'équipe » (le « very small somewhere » de Sebastien).
- Seuils discipline (centralisés dans la constante `RULES`) : **< 5 meetings/sem → 🏃 Low
  Activity** · **NB GM < 25% → 🥅 Low Margin** · opportunités **Stage 2+ & ≥ 50K€**.

**🟨 Système cartons jaunes (#36–#44) :** tally par groupe `🟨 ( N )` sur podium +
classements équipes/nations + mode TV (survol = split, **tap/Entrée = popover**) ; cartons
individuels `🟨` tappables partout (listes + carte Panini) via `cardBadge` + popover flottant
délégué unique `#cards-pop` ; cohérence emojis 🏃/🥅 popover ↔ « On a yellow card » ↔ carte
des règles ; comportement popover = toggle, **clic-à-côté absorbé** (n'ouvre pas le podium
en dessous), Échap, une seule à la fois ; débordement mobile du tally corrigé (flex-wrap).

**🃏 Carte joueur / Panini (#45) :** rang héros = NB, PS Total rétrogradé, **stats
cliquables → explication du classement + la règle** (+ bouton « View full ranking → »).

**📺 Mode TV (#41) :** la carte #1 reste **flottante (sticky)** quand la liste est dépliée,
au lieu de devenir une grande boîte verte vide avec le #1 sous la ligne de flottaison.

**📱 Responsive + scroll (#46–#47) :** carte joueur propre **320 → 1680px** (valeur des stats
en `clamp`, ⓘ masquée ≤360px) ; **« View full ranking → » scrolle bien sur le classement**
(plus sur le podium), y compris sur **vrai smartphone** (re-snap après stabilisation de la
mise en page : images/photos qui chargent, reveal du podium).

**🧹 Quality pass (#48, suite revue de code 7 angles) :** a11y clavier (badges + stats
`tabindex=0`, Entrée/Espace) ; toggle robuste au re-render (clé de contenu, pas l'identité du
nœud) ; clic de fermeture qui **respecte les champs de formulaire** ; **`RULES` = source
unique** des seuils/libellés ; **perf render** (split précalculé `cardsByTeam`/`cardsByRegion`,
~12k normalisations de chaîne/render éliminées) ; dédup navigation (`applyTabState`) ; CSS
mort retiré.

**📄 Doc (#39) :** section « Mobile & touch » dans le README + garde-fou de test anti-coupure
intra-carte (toutes tabs @360px).

**⏸️ Différé volontairement (jugement) :** unification des 3 systèmes de popover (réécriture
risquée sur prod, gain marginal) ; Ctrl+clic sur un badge (ouvre la ligne en nouvel onglet —
acceptable) ; sweep `RULES` des copies pré-existantes (i18n / Coach Room / prose de la carte
Rules) — refactor séparé.

**✅ Tests :** ESLint 0 · `ux-smoke` + `ux-e2e` (assertions ajoutées : tap/Entrée → popover,
dismiss sans ouvrir de modale, scroll post-navigation + résistance au layout-shift, carte qui
tient à 320px, toggle qui survit au re-render) · `backend-contract` · **audit responsive 9
devices « ALL DEVICES CLEAN »**. CI GitHub (lint + ux) verte avant chaque merge.


### 2026-06-10 — Décision cartons : statu quo (rouge/tally en attente)
Après l'échange Léandre / Jose / Sebastien sur le modèle de carton rouge (« 2 jaunes = rouge »
live vs « rouge décidé à la fin par le VAR »), **décision : rester en l'état**. On garde le
comportement actuel (carton **jaune** uniquement côté carte, pas de rouge auto, pas de tally par
équipe/nation). **« On verra si ça change pour la suite. »** La **PR #33 (carton rouge « rugby » +
tally) est fermée** mais le code reste sur la branche `claude/red-card-var-review` (réouvrable en
1 commande). Pour rappel, restent ouverts si le sujet revient : la sanction d'un rouge confirmé
(suspension / amende € / rien d'auto) et la **persistance des verdicts VAR** (aujourd'hui en
localStorage admin, non publiés → colonne Sheet à voir avec Jose pour les rendre visibles à tous).

**MAJ 2026-06-10** : Léandre veut quand même le **total des cartons jaunes par équipe**. Ajouté
(`yellowCardsBadge`) : badge **🟨 (N)** sous chaque équipe **et** nation (N = total de cartons
jaunes = somme des infractions ; un joueur cassant les 2 règles compte 2). **Jaunes seulement**
(pas de rouge live — cohérent avec « rouge = verdict de fin de challenge »). Le tally rouge reste
gelé sur `claude/red-card-var-review`.

**MAJ 2026-06-10 (2)** : tally étendu au **podium** et au **mode TV** (en plus des classements
équipes/nations). Sur demande de Léandre, on **garde le logo 🟨** (pas de remplacement par
🏃/🥅) : le badge affiche **🟨 (N)** et c'est **au survol** que l'infobulle donne le **split**
« 🏃 X Low Activity · 🥅 Y Low Margin · N total ». Idem sur les badges joueur : le 🟨 reste, et
l'infobulle précise le type (🏃 Low Activity / 🥅 Low Margin). (Intégrer l'emoji *dans* le carton
jaune rend mal — emoji multicolore dans un carré jaune — d'où la solution survol.)

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


### 2026-06-10 — Cartons jaunes cliquables (split au tap) + lisibilité crochets
Suite mobile (pas de survol) + retours Léandre :
- **Tally par groupe `🟨 ( N )`** : déjà tap-to-reveal (podium, classements équipes/nations,
  PR #37/#38). Corrigé le **débordement mobile** (la ligne meta du podium `flex-wrap`, PR #38).
- **Cartons individuels cliquables** : chaque `🟨` d'un joueur (Golden Boot, Players of the
  Moment, modales équipe/nation) est désormais **tappable** → popover avec sa raison unique
  (`🏃 Low Activity` <5 mtg/sem, ou `🥅 Low Margin` NB GM <25%, + la valeur). Helper unique
  `cardBadge(type, detail, cls)` ; même popover délégué que le tally (`.tt-card1`),
  capture-phase + `stopImmediatePropagation` pour ne pas ouvrir la fiche joueur en dessous.
  La pastille `.pc-discipline` de la fiche joueur reste tap-to-reveal aussi.
- **Lisibilité des nombres entre crochets** : espace ajouté dans les parenthèses du tally
  (`🟨 ( N )`) pour que les chiffres ne collent pas aux crochets aux petites tailles (TV).
- **Tests** : `ux-e2e` — tap d'un carton individuel → popover, sans ouvrir la fiche.
  `ux-smoke` — garde anti-coupure intra-carte (toutes tabs @360px) toujours vert.


### 2026-06-11 — Carte joueur : KPI individuel = New Business + stats cliquables
Consensus chat (Léandre / Sebastien CHEVREL / Jose) : **le challenge individuel se joue
sur le New Business** (Golden Boot, Rookie) ; **le classement des équipes reste sur le
Total (PS + NB)** — c'est voulu, pas une incohérence.

Carte joueur (Panini) — appliqué :
- **Rang héros = New Business** (Golden Boot) au lieu de l'ancien « PS RANK » (qui était le
  rang sur le Total). Libellé « NB RANK ».
- **PS Total rétrogradé** en petite ligne discrète sous les tuiles
  (« PS Total €X · #N overall · counts toward your team's ranking »), comme demandé par
  Sebastien (« very small somewhere »). Le classement équipes ne bouge pas.
- **Stats cliquables** : chaque stat (héros + tuiles + note PS Total) ouvre une **popover
  d'explication** (ce que mesure le classement + la règle), même comportement que les
  cartons (toggle, clic-à-côté absorbé, Échap). Les tuiles de classement proposent
  « View full ranking → » dans la popover (la navigation directe au tap est remplacée).
  Une seule popover ouverte à la fois (coordonnée avec honneurs/discipline).
- Affordance : ⓘ sur les stats + un seul hint « Tap any stat or badge ».


### 2026-06-11 — Quality pass (suite à la revue de code haute densité)
Corrigé les points concrets de la revue qualité (carte / popovers / système cartons) :
- **A11y clavier** : les badges 🟨 (`.tt-cards`/`.tt-card1`) et les stats (`.pc-explain`)
  sont `tabindex="0"` + activables au clavier (Entrée/Espace), pas seulement au clic/tap.
- **Toggle robuste au re-render** : la fermeture « re-tap = ferme » se base désormais sur
  une **clé de contenu** (`badgeKey`) et non sur l'identité du nœud DOM → survit à un poll
  qui remplace le badge.
- **Clic de fermeture** : un tap sur un vrai champ de formulaire (recherche…) n'est plus
  absorbé → il focus le champ du 1ᵉʳ coup (le swallow ne vise que ce qui ouvrirait une
  modale en dessous, cf. #43).
- **Source unique des règles** : constante `RULES` (5 meetings, 25% NB GM, Stage 2+/€50K +
  les libellés) — alimente le flag (`normalizePeople`) ET les popovers/cardBadge/
  STAT_EXPLAIN/explainLines, pour qu'un changement de seuil ne désynchronise plus rien.
- **Perf render** : split des cartons précalculé une fois par data load
  (`cardsByTeam`/`cardsByRegion`) au lieu de re-filtrer 377 personnes par ligne
  (~12k normalisations de chaîne par render éliminées).
- **Dédup navigation** : `applyTabState()` partagé entre le clic d'onglet et `statGoto`
  (qui purge maintenant aussi `currentSearch`/`positionQuery`).
- **CSS** : retrait des règles mortes `.pc-honour-hint` et du `position:relative` inutile ;
  les tuiles de stats affichent ⓘ (au lieu de ›) pour matcher le reste.
Volontairement **non fait** : unification des 3 systèmes de popover (réécriture risquée sur
prod pour un gain marginal ; la coordination actuelle tient en 3 appels) ; et le Ctrl+clic
sur un badge (ouvre la ligne parente en nouvel onglet — acceptable). Sweep RULES des copies
pré-existantes (i18n/coach/prose Rules) à planifier séparément.
