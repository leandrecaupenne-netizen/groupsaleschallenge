# DECISIONS.md — Journal de bord du projet

> **But de ce fichier** : garder la mémoire entre les sessions Claude Code (sur le web,
> chaque session repart d'un conteneur vierge — seul ce qui est commité survit).
> `CLAUDE.md` décrit l'**état cible** ; ce fichier décrit **l'historique des décisions et
> ce qui reste à faire**.
>
> **Convention** : à la fin de chaque session de travail, ajouter une entrée datée en haut
> de la section « Journal » (la plus récente en premier). Format : ce qui a été fait,
> pourquoi, et les TODO / points d'attention qui en découlent. Mettre à jour la section
> « ⚠️ Actions en attente » si une étape humaine (déploiement, accès, validation) est requise.

---

## ⚠️ Actions en attente (à faire par Léandre / humains)

- [ ] **Redéployer l'Apps Script** (nouvelle version) pour servir la colonne `Team nicknames`
      ajoutée le 2026-06-05 → sinon les surnoms n'apparaissent pas. (Même opération que le
      redéploiement Drive ci-dessous : un seul redéploiement couvre les deux.)

- [ ] **(fait le 2026-06-05 ?)** Redéployer l'Apps Script avec la nouvelle autorisation
      **Drive** (lecture), sinon le timestamp « Last updated » ne reflétera pas les vraies
      éditions de la Sheet. → Léandre a indiqué « c'est fait » le 2026-06-05, à reconfirmer
      en testant `…/exec?action=data&pw=devoteam2026` → champ `updated_at` doit = dernière
      édition réelle de la Sheet.
- [ ] Définir l'URL Vercel de **production** (Settings → Domains) avant le lancement aux ~400 commerciaux.
- [ ] Compléter les contacts manquants dans `CLAUDE.md` §12 (email Jose, contact IT Devoteam).

---

## État du projet (résumé vivant)

- **Plateforme** : `index.html` (HTML/CSS/Vanilla JS, fichier unique), hébergée sur Vercel.
- **Backend** : `apps_script_backend.gs` déployé en Web App sur la Google Sheet OneBI de Jose.
  Lit directement les onglets `Team Ranking` / `Challenge Ranking`, exclut Morocco/Serbia/Tunisia.
- **Données** : Jose alimente la Sheet depuis OneBI. Peut changer **plusieurs fois par semaine**.
- **Accès** : mot de passe `devoteam2026` (constante `SETTINGS.PASSWORD`). Refresh manuel
  réservé admin via `?admin=leandre-refresh-2026`.
- **Actualisation** : front poll toutes les ~2 min (jitter ±25 %), cache serveur 30 s.
  Pause si onglet caché ou idle 15 min — **sauf en mode TV** (projection toujours live).

---

## Journal (le plus récent en premier)

### 2026-06-05 — Surnoms d'équipe (colonne « Team nicknames »)
Branche : `claude/wonderful-edison-W21bT`

**Contexte** : Jose a ajouté une colonne **« Team nicknames »** dans l'onglet `Team Ranking`
(ex. SWEDEN → SNOWBALL, FR - Cyber Trust → THE UNPATCHABLES, FR - N Platform → THE
NOWVENGERS, GERMANY → The Beckenbauers, NETHERLANDS → "The Flying Dutch…").

**Fait** :
1. **Backend** : ajout de `{ field: 'nickname', header: 'Team nicknames' }` dans `TEAM_MAP`.
2. **Front** : helper `teamNick()` (trim + retire les guillemets autour). Surnom affiché,
   uniquement s'il existe, en italique guillemeté dans : podium (`.podium-nick`),
   ligne de classement (`.tt-nick`), en-tête du modal équipe (`.modal-nick`), et en
   sous-titre du hero TV « Top Teams ».
3. Dégradation propre : tant que le backend n'est pas redéployé, `nickname` est absent →
   rien ne s'affiche, aucune casse.

**⚠️ TODO créé** : **redéployer l'Apps Script** (nouvelle version) pour que la colonne
`Team nicknames` soit servie — sinon les surnoms n'apparaissent pas en prod.


### 2026-06-05 — Fiabiliser l'actualisation quand la Sheet change > 1×/semaine
Branche : `claude/wonderful-edison-W21bT` · Commit : `f6f4c59`

**Contexte** : Léandre a signalé que les données peuvent changer plus d'une fois par
semaine ; il fallait garantir que l'app reflète bien ces changements.

**Fait** :
1. **Backend — timestamp honnête.** `updated_at` retombait sur `new Date()` quand l'onglet
   `Config` est absent (cas par défaut), affichant donc toujours « maintenant » sans lien
   avec la vraie édition. Ajout de `sheetLastUpdated()` (via `DriveApp...getLastUpdated()`).
   Priorité : override `Config.last_update` → vraie date de modif de la Sheet → now.
   → Le timestamp bouge tout seul à chaque édition de Jose, sans cellule manuelle.
2. **Front — mode TV anti-pause.** L'auto-pause idle (15 min sans interaction) figeait une
   projection murale. Désormais : pas d'idle en mode TV ; `enterTV()` relance le polling ;
   `exitTV()` réarme l'idle normal.
3. Docs mises à jour : `SHEET_SPEC.md`, `CLAUDE.md` (troubleshooting), commentaire poll.

**Point d'attention / TODO créé** : le `DriveApp` ajoute un **scope d'autorisation Drive** →
**redéploiement de l'Apps Script requis** avec acceptation de la nouvelle autorisation
(voir « Actions en attente »). Sans ça, l'ancienne version tourne toujours.

**Alternative en réserve** : si la politique Devoteam bloque le scope Drive, variante sans
`DriveApp` basée sur une cellule `last_update` auto-calculée (`=TEXT(NOW();...)`).

### 2026-06-05 — Mise en place de ce journal
Création de `DECISIONS.md` pour conserver la mémoire entre sessions (chaque session web
repart d'un conteneur vierge). Convention : mettre à jour ce fichier en fin de session.
