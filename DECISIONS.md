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

- [ ] **Redéployer l'Apps Script avec la DERNIÈRE version** de `apps_script_backend.gs`
      (campagne 06-06 : `keepWarm` + onglet manquant non bloquant + data POST-only +
      cache chunks 45000). Léandre a indiqué « c'est fait » le 06-06 — **à confirmer que
      le déploiement actif pointe bien sur la nouvelle version** (Déployer → Gérer les
      déploiements → Nouvelle version). Le re-save seul corrige `keepWarm` ; le
      redéploiement applique les correctifs serveur au front.
- [ ] **Trigger `keepWarm`** : vérifier dans ⏰ Triggers → Exécutions qu'il est au vert
      (il échouait 290× car une ancienne version sans `keepWarm` avait été collée).
- [ ] Vérifier l'URL Vercel de **production** (`groupsaleschallenge.vercel.app`) après push sur `main`.
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

---

## Journal (le plus récent en premier)

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
