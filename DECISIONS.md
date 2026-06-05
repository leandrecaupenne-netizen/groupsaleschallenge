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

- [ ] **Redéployer l'Apps Script** si ce n'est pas déjà fait avec la dernière version
      (`apps_script_backend.gs` : timestamp Drive + colonne nickname tolérante + coercition
      GM). Le redéploiement demande une autorisation **Drive** (lecture) à accepter une fois.
- [ ] Vérifier l'URL Vercel de **production** (`groupsaleschallenge.vercel.app`) après push sur `main`.
- [ ] Compléter les contacts manquants dans `CLAUDE.md` §12 (email Jose, contact IT Devoteam).

---

## État du projet (résumé vivant)

- **Plateforme** : `index.html` (HTML/CSS/Vanilla JS, fichier unique), prod sur Vercel
  (`groupsaleschallenge.vercel.app`), redéploiement auto à chaque push sur `main`.
- **Backend** : `apps_script_backend.gs` (Web App sur la Google Sheet OneBI de Jose). Lit
  `Team Ranking` / `Challenge Ranking`, exclut Morocco/Serbia/Tunisia, colonne nickname
  optionnelle, timestamp = vraie date de modif de la Sheet (Drive).
- **Données** : Jose alimente depuis OneBI ; peut changer plusieurs fois par semaine.
- **Onglets** : Team Ranking · Players of the Moment · Golden Boot · Playmaker · **Rookie Cup** ·
  **Licence** · Special Awards · VAR Room · My Position (+ admin : VAR TIME, Coach Room).
- **Mode TV** (`?tv=1` / 📺) : deck de panneaux projetables, ne se met plus en pause idle.

---

## Journal (le plus récent en premier)

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
