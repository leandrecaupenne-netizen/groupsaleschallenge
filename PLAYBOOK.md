# The Playbook — recette complète d'une app solide & superbe

> Guide de référence **unique, exhaustif et stack-agnostique** : tout ce qui rend une application
> **fiable, maintenable, sûre, performante ET agréable** — du premier commit à la production et
> au-delà. À utiliser comme **base de qualité** sur n'importe quel projet (web, mobile, vanilla,
> React, Vue, Flutter…).
>
> Deux moitiés complémentaires :
> - **Partie A — Ingénierie** (§1–9, §11–18) : la solidité technique.
> - **Partie B — UX / UI** (§10, ultra-détaillée) : ce qui rend l'app *superbe* à l'usage.
>
> Convention : ✅ = à faire, ⚠️ = piège classique, 💡 = leçon vécue sur un vrai projet.

---

## 0. Les 12 piliers (TL;DR)

1. **Spécifier avant de coder** : le problème, les utilisateurs, les contraintes, le « done ».
2. **Architecture simple** : la complexité se justifie, elle ne se subit pas. YAGNI.
3. **La donnée est sacrée** : valider, typer, ne jamais faire confiance à une source externe.
4. **Sécurité par défaut** : moindre privilège, secrets hors du code, tout input est hostile.
5. **Tests proportionnés au risque** : les parcours critiques sont couverts et le restent.
6. **Erreurs traitées explicitement** : pas de catch vide, pas d'état cassé silencieux.
7. **Observabilité** : logs, métriques, alertes — on sait ce qui se passe en prod.
8. **Performance mesurée**, pas devinée.
9. **Déploiement automatisé et réversible** (CI/CD, rollback).
10. **UX soignée** : hiérarchie, accessibilité, états, préservation du contexte.
11. **Code lisible** : on optimise pour la lecture, pas pour l'écriture.
12. **Mémoire du projet** : décisions tracées, doc à jour, on ne re-décide pas deux fois.

---

# PARTIE A — INGÉNIERIE

## 1. Avant de coder — cadrage & conception

- ✅ **Écrire le problème en 3 lignes** : qui, quel besoin, quel succès mesurable. Si tu ne sais pas
  le dire simplement, tu n'es pas prêt à coder.
- ✅ **Lister les contraintes réelles** : nombre d'utilisateurs, fréquence des données, budget,
  quotas d'API, mobile/desktop, offline, navigateurs cibles.
- ✅ **Définir le « done »** par fonctionnalité (critères d'acceptation) — sinon ça ne finit jamais.
- ✅ **Choisir le stack le plus simple qui marche.** Une lib/un framework = une dette. 💡 Sur ce
  projet, *zéro framework, un seul fichier* a été un avantage décisif (chargement instantané,
  hébergement trivial, rien à maintenir).
- ✅ **Modéliser les données d'abord** (les entités, leurs relations, qui possède quoi). 90 % des
  bugs profonds viennent d'un modèle de données bancal.
- ⚠️ **Ne pas sur-architecturer** « au cas où ». On ajoute l'abstraction quand le 3ᵉ cas concret
  arrive, pas avant (règle de trois).

## 2. Architecture & structure du code

- ✅ **Séparer les responsabilités** : données (fetch/parse/validation) ↔ logique métier ↔
  présentation. Même dans un petit projet, ces 3 couches doivent être identifiables.
- ✅ **Une source de vérité par donnée.** Pas la même info recalculée à 3 endroits avec 3 résultats.
  💡 Ici les **seuils de règles** (meetings, marge, stages) sont dans **une seule constante `RULES`**
  qui alimente à la fois le calcul *et* l'affichage → impossible de désynchroniser.
- ✅ **Dépendances orientées vers le stable** : le métier ne dépend pas de l'UI ni du transport.
- ✅ **Fonctions courtes, un seul niveau d'abstraction**, nommées par ce qu'elles *font*.
- ✅ **Frontières explicites** entre modules (interfaces/contrats), pas d'accès « par effet de bord ».
- ⚠️ **Éviter l'état global mutable** dispersé. S'il y en a, le centraliser et documenter qui le modifie.
- 💡 **Couplage faible / cohésion forte** : ce qui change ensemble vit ensemble ; ce qui change pour
  des raisons différentes est séparé.

## 3. Qualité & style de code

- ✅ **Le code se lit 10× plus qu'il ne s'écrit** → optimiser la lisibilité. Noms explicites,
  pas d'abréviations cryptiques.
- ✅ **Cohérence > préférence perso** : suivre le style existant du projet (indentation, nommage,
  patterns). Un linter + formatter automatiques (ESLint/Prettier, Ruff/Black, etc.) en CI.
- ✅ **Commentaires = le *pourquoi*, pas le *quoi*.** Le code dit ce qu'il fait ; le commentaire dit
  pourquoi ce choix non-évident.
- ✅ **Pas de code mort** : supprimer dès que ça ne sert plus (un handler orphelin, une CSS inutilisée).
  💡 Sur ce projet, chaque refactor s'accompagne d'une chasse au code mort (0 référence restante).
- ✅ **Typage** quand le langage le permet (TypeScript, type hints) — c'est de la doc qui ne ment pas
  et qui attrape des bugs à la compilation.
- ✅ **Constantes nommées** plutôt que valeurs magiques.
- ⚠️ **DRY avec discernement** : factoriser une vraie duplication, pas deux choses qui se ressemblent
  par hasard et vont diverger.

## 4. Gestion des données & intégrité

C'est souvent le cœur d'une app « solide ».

- ✅ **Valider à la frontière** : toute donnée entrante (API, fichier, formulaire, sheet) est
  validée et normalisée *avant* d'entrer dans le système (schéma, types, bornes).
- ✅ **Mapping tolérant aux sources instables** : si tu lis une source que tu ne contrôles pas
  (Google Sheet, export, CSV), mapper les colonnes **par nom** (insensible casse/espaces) avec
  **fallback**, et **logguer les colonnes non reconnues** plutôt que casser. 💡 Exactement ce qui
  a sauvé ce projet quand OneBI a réorganisé ses colonnes.
- ✅ **Gérer les valeurs sales** : `#DIV/0!`, `#N/A`, vides, doublons → règle explicite (→ 0, ignorer,
  override) plutôt que propager du NaN dans l'UI.
- ✅ **Réconcilier les sources** : si deux vues d'une même donnée doivent coïncider, le vérifier.
  💡 Vécu ici : la somme des individus ≠ total d'équipe (dédup de deals partagés en amont) — détecté
  par un **diff automatique**, documenté comme propriété de la source, et **non** « corrigé » à tort.
- ✅ **Idempotence & cohérence** : une même opération répétée ne corrompt pas l'état ; pas d'écriture
  partielle qui laisse la donnée à moitié à jour.
- ✅ **Donnée en lecture seule = read-only de bout en bout** (pas de mutation accidentelle côté front).
- ⚠️ **Ne jamais clé-er sur un libellé humain** (nom, orthographe) si un identifiant stable existe
  (ID). 💡 Recommandation faite ici : clé sur le Workday ID, pas sur le nom.

## 5. Robustesse & gestion d'erreurs

- ✅ **Échouer bruyamment au dev, gracieusement en prod.** Jamais de `catch {}` vide.
- ✅ **Distinguer erreur récupérable / fatale** : un refresh qui rate → garder l'ancienne donnée +
  badge discret + retry. Un échec au 1ᵉʳ chargement → écran d'erreur avec « Réessayer ».
- ✅ **Retries avec backoff exponentiel** sur les erreurs réseau transitoires (2s, 4s, 8s…), avec
  un plafond. Pas de retry sur une erreur 4xx (ce sera toujours non).
- ✅ **Timeouts partout** sur les appels réseau (jamais d'attente infinie).
- ✅ **Garde-fous sur données périmées** : un élément qui référence une donnée disparue ne déclenche
  rien plutôt que d'ouvrir un écran vide.
- ✅ **Dégradation progressive** : l'app reste utilisable même si une partie (réseau, fonction
  avancée) tombe.
- ⚠️ **Ne pas avaler les erreurs** : les logguer avec assez de contexte pour diagnostiquer.

## 6. Sécurité (par défaut, pas en option)

- ✅ **Tout input est hostile** : valider, échapper, ne jamais injecter de données externes brutes
  dans le DOM/HTML/SQL/shell. (XSS, injection.)
- ✅ **Secrets hors du code** : variables d'environnement / coffre, jamais commités. Un `.gitignore`
  qui couvre `.env`, clés, tokens.
- ✅ **Moindre privilège** : chaque composant/clé/service a le minimum de droits nécessaires.
- ✅ **HTTPS partout**, headers de sécurité (CSP stricte, `X-Content-Type-Options`,
  `Referrer-Policy`, etc.). 💡 Ici : `default-src 'self'`, polices self-hostées pour tenir une CSP serrée.
- ✅ **Auth côté serveur** : un contrôle d'accès front (mot de passe localStorage) filtre le casual
  mais **ne protège rien de sensible** — le vrai contrôle vit côté backend.
- ✅ **Dépendances à jour** : audit régulier (npm audit / dependabot), supprimer les libs non utilisées
  (surface d'attaque + supply chain).
- ✅ **Pas de PII inutile** ; si données personnelles : minimisation, durée de conservation, conformité (RGPD).
- ⚠️ **Ne jamais logguer de secrets/PII** dans les logs ou messages d'erreur.

## 7. Tests & qualité automatisée

- ✅ **Tester proportionnellement au risque** : les **parcours critiques** d'abord (login, paiement,
  données affichées justes), pas 100 % de couverture pour le plaisir.
- ✅ **Pyramide de tests** : beaucoup d'unitaires (rapides), quelques intégration, peu d'E2E (lents
  mais réalistes). 💡 Ici : tests unit/contrat *offline* + E2E *mockés* + une suite *live* contre le
  vrai backend.
- ✅ **Tests de non-régression** sur chaque bug corrigé : on écrit le test qui aurait attrapé le bug.
- ✅ **Tests déterministes** : pas de dépendance au réseau réel/à l'horloge non maîtrisée → mocker.
- ✅ **Tester les cas limites** : vide, null, énormes valeurs, ex-aequo, caractères spéciaux,
  localStorage bloqué, hors-ligne.
- ✅ **CI qui bloque le merge** si lint/tests rouges. Le vert est non négociable pour merger.
- ⚠️ Un test fragile (« flaky ») est pire que pas de test : le réparer ou le supprimer.

## 8. Performance

- ✅ **Mesurer avant d'optimiser** : profiler, identifier le vrai goulot. Pas d'optimisation à l'aveugle.
- ✅ **Performance perçue d'abord** : afficher quelque chose tout de suite (cache/instant-paint),
  hydrater ensuite. L'utilisateur juge la *réactivité ressentie*.
- ✅ **Minimiser le travail** : pas de recalcul inutile, mémoïsation des calculs coûteux, lazy-loading
  de ce qui n'est pas visible.
- ✅ **Réseau frugal** : batcher les requêtes, cache HTTP agressif sur l'immuable (assets, polices :
  `immutable, max-age=1an`), payloads compacts. 💡 Ici : polling avec **jitter**, **pause onglet
  caché**, **pause après inactivité**, **cache chunké côté backend** pour tenir les quotas.
- ✅ **Budget de perf** explicite (taille du bundle, temps d'interaction) et le surveiller.
- ⚠️ **Attention aux fuites mémoire** : déconnecter listeners, observers, timers à la destruction.

## 9. Données temps réel / synchronisation (si pertinent)

- ✅ **Choisir le bon mécanisme** : polling (simple, robuste) vs SSE/WebSocket (réactif) selon la
  fréquence réelle et le coût serveur.
- ✅ **Polling civilisé** : intervalle adapté + jitter ±25 % (désynchroniser les clients) + pause
  quand inactif/caché.
- ✅ **Source de fraîcheur visible** : timestamp « dernière mise à jour » + refresh manuel.
- ✅ **Cohérence pendant le refresh** : ne pas perdre le scroll ni l'état des modals (re-render sans flash).
- ✅ **Dégradation** : servir la dernière valeur connue si la source tombe.

---

# PARTIE B — UX / UI (le « superbe »)

## 10. UX / UI — la recette détaillée

### 10.0 Les 10 principes qui font « quali »

1. **Un système de design tokens** (couleurs, espacements, rayons) avant d'écrire un écran.
2. **Hiérarchie visuelle claire** : 1 action principale par écran, le reste en secondaire.
3. **Contraste suffisant** partout (texte ≥ 4.5:1) — 1ʳᵉ cause de « ça fait cheap ».
4. **Cibles tactiles ≥ 44×44 px** et états (hover/focus/active/disabled) sur **chaque** cliquable.
5. **Responsive mobile-first**, testé sur vrai petit écran (≤ 360 px) et au pouce.
6. **Accessibilité native** : HTML sémantique, focus visible, clavier, `aria-*` sur le custom.
7. **Mouvement au service du sens**, jamais gratuit — coupé sous `prefers-reduced-motion`.
8. **États vides / chargement / erreur = écrans à part entière**, pas des oublis.
9. **Ne jamais casser le contexte** : préserver scroll, état des modals, position après retour.
10. **Performance perçue** : afficher tout de suite, hydrater ensuite, animer les chiffres.

### 10.1 Design tokens (la fondation)

✅ **Toutes les valeurs réutilisées dans des variables** (`:root`). Jamais une couleur/un espacement en dur.

```css
:root {
  /* Couleurs de marque */
  --brand: #1E2A78; --brand-2: #2D3550;
  --accent: #C8102E;          /* action principale */
  --gold: #F2C75C;            /* highlight / récompense */
  /* Couleurs sémantiques (par rôle, pas par valeur) */
  --ink: #0F1419;             /* texte principal */
  --muted: #5B6577;           /* texte secondaire — assombri exprès pour le contraste */
  --line: #E5E7EB; --paper: #FFFFFF; --ok: #16A34A; --warn: #DC2626;
  /* Espacement (échelle, pas de valeurs au hasard) */
  --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px; --sp-6: 24px; --sp-8: 32px;
  /* Rayons & ombres cohérents */
  --r-sm: 8px; --r-md: 12px; --r-lg: 16px;
  --shadow-card: 0 4px 16px rgba(0,0,0,.08);
  --shadow-pop:  0 20px 60px rgba(0,0,0,.30);
}
```

💡 Nommer par **rôle** (`--accent`, `--danger`), pas par valeur (`--blue`) → thème + dark mode triviaux.

### 10.2 Couleur & contraste

- ✅ **Viser AA (4.5:1)** pour le corps, 3:1 pour le gros texte. 💡 Ici le gris secondaire a dû être
  **assombri** car il passait mal sur les petits labels.
- ✅ **3 niveaux de texte suffisent** : principal, secondaire, inversé.
- ✅ **Couleur = renfort, jamais seul porteur d'info** (daltonisme) : un carton « jaune » a aussi une
  **icône** (🟨) et un libellé.
- ⚠️ Tester le contraste **en dark mode aussi** : fonds translucides → passer en **opaque** sur les
  barres sticky/overlays en sombre.

### 10.3 Typographie

- ✅ **Deux familles max** : une « display » pour l'impact, une « UI » très lisible pour le corps.
- ✅ **Échelle limitée** (12 / 14 / 16 / 20 / 28 / 40), pas 15 tailles ad hoc.
- ✅ **Self-hoster les polices** (woff2, `font-display: swap`) : marche hors-ligne, pas de FOIT, CSP stricte.
- ✅ **Hauteur de ligne** ~1.4–1.6 pour le corps ; titres plus serrés.
- ⚠️ Une police display qui se charge **vraiment** peut recouvrir un voisin et le rendre non-cliquable
  → penser au `z-index` des éléments interactifs proches.

### 10.4 Layout & responsive (mobile-first)

- ✅ **Concevoir d'abord ~360 px**, puis élargir avec `@media (min-width: …)`.
- ✅ **Grilles fluides** : `grid-template-columns: repeat(auto-fit, minmax(150px, 1fr))` → multi-colonnes
  en desktop, 1 en mobile, sans media query.
- ✅ **Respecter les encoches** : `padding: env(safe-area-inset-*)`.
- ✅ **Header dense sur mobile** : replier les actions secondaires derrière un « ⋯ » (≤ 560 px) ;
  desktop tout déplié (`display: contents`).
- ⚠️ Tester **au pouce**, pas juste en réduisant la fenêtre. Actions primaires plutôt en bas/centre sur mobile.

### 10.5 Boutons & éléments cliquables

C'est LE détail qui sépare le « pro » du « bricolé ».

- ✅ **Cible tactile ≥ 44×44 px** (agrandir la zone via padding/pseudo-élément si le visuel est petit).
- ✅ **Les 5 états, toujours** :
  ```css
  .btn          { background: var(--accent); color:#fff; border-radius: var(--r-sm);
                  padding: 12px 16px; font-weight: 700; transition: background .15s, transform .1s; }
  .btn:hover    { background: #A00D26; }
  .btn:active   { transform: translateY(1px); }                       /* feedback d'appui */
  .btn:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }  /* clavier */
  .btn:disabled { opacity: .5; cursor: not-allowed; }
  ```
- ✅ **Hiérarchie** : 1 bouton **primaire** (plein, couleur d'accent), les autres **secondaires**
  (outline/ghost). Jamais deux primaires côte à côte.
- ✅ **Libellés orientés action** : « Accéder au classement », pas « OK ».
- ✅ **Feedback immédiat sur async** : « Vérification… » + `disabled` (anti double-clic), spinner sur refresh.
- ⚠️ Ne jamais retirer l'`outline` de focus sans le remplacer → utiliser `:focus-visible`.

### 10.6 Accessibilité (a11y) — pas optionnelle

- ✅ **HTML sémantique d'abord** : `<button>` pour agir, `<a>` pour naviguer. Un `<div>` cliquable →
  `role="button"` + `tabindex="0"` + gestion **Entrée/Espace**.
- ✅ **Modals / overlays** : `role="dialog"`, `aria-modal="true"`, `aria-label`, **focus déplacé dans le
  dialog à l'ouverture**, fermeture `Échap` + clic extérieur, focus rendu au déclencheur à la fermeture.
- ✅ **Pas d'imbrication d'interactifs** (un `role=button` dans un `<a>`) → doubles arrêts de tab.
- ✅ **Tout cliquable est atteignable au clavier** + `title`/`aria-label` explicite.
- ✅ **Animations décoratives** en `aria-hidden="true"`.
- 💡 Helper centralisé pour ne rien oublier :
  ```js
  function setDialogA11y(el, label){
    el.setAttribute('role','dialog');
    el.setAttribute('aria-modal','true');
    el.setAttribute('aria-label', label);
    (el.querySelector('[autofocus],button,input') || el).focus();
  }
  ```

### 10.7 Mouvement & micro-interactions

- ✅ **Le mouvement raconte quelque chose** : count-up d'un chiffre, cartes en cascade, flash discret
  sur un nouveau #1. De la vie *et* du sens.
- ✅ **Court et fluide** : 120–300 ms, easing naturel (`ease-out`/cubic).
- ✅ **Respecter `prefers-reduced-motion`** (non négociable) : valeur finale affichée immédiatement,
  animations coupées.
  ```css
  @media (prefers-reduced-motion: reduce){ *{ animation:none!important; transition:none!important; } }
  ```
- ✅ **La valeur finale est rendue d'abord**, l'animation se superpose → no-JS friendly.
- ⚠️ Ne pas rejouer la cascade d'entrée à chaque retour dans une vue déjà vue → classe « instant ».

### 10.8 Modals, overlays & navigation

- ✅ **Un seul conteneur scrollable** par overlay (`overflow:hidden` sur le fond, scroll dans la modale).
- ✅ **Préserver le scroll** au re-render :
  ```js
  function renderKeepModalScroll(selector, render){
    const el = document.querySelector(selector);
    const y = el ? el.scrollTop : 0;
    render();
    const el2 = document.querySelector(selector);
    if (el2) el2.scrollTop = y;
  }
  ```
- ✅ **« Retour » revient là où on était** (mémoriser origine + position). Gérer aussi le **Back
  navigateur** (`popstate`) → fermer la couche du dessus, pas quitter l'app.
- ✅ **Navigation sticky** (onglets/sommaire) + `scroll-margin-top` sur les ancres (ne pas passer sous la barre).
- ✅ **Sommaire qui surligne la section lue** (`IntersectionObserver`).
- ⚠️ **Déconnecter** observers/listeners à la fermeture (fuite mémoire).

### 10.9 États : chargement, vide, erreur

- ✅ **Loading** : squelette/message immédiat, jamais de page blanche. Mieux : **instant-paint** du cache.
- ✅ **Empty state** : expliquer *pourquoi* c'est vide et *quoi faire*. Une section vide ne s'affiche pas.
- ✅ **Erreur non bloquante** : garder l'ancienne donnée + badge discret (« ⚠ synchro échouée… »)
  plutôt que tout casser. Erreur au 1ᵉʳ chargement → bouton « Réessayer ».
- ✅ **Garde anti-données périmées** : clic sur une donnée disparue = no-op (pas de fiche vide).

### 10.10 Données live côté UX

- ✅ **Timestamp « Dernière mise à jour » visible** + refresh manuel animé.
- ✅ **Re-render sans flash** : préserver scroll + état des modals pendant le polling.
- ✅ **Polling raisonné** (cf. §9) : intervalle adapté, jitter, pause onglet caché/inactif.

---

# PARTIE A (suite) — OPS & PÉRENNITÉ

## 11. Git & collaboration

- ✅ **Commits atomiques** avec messages clairs : *quoi* et surtout *pourquoi*.
- ✅ **Branches de fonctionnalité** + revue avant merge. Ne jamais pousser direct sur `main` sans validation.
- ✅ **`main` toujours déployable** (vert, fonctionnel).
- ✅ **PR petites** : plus c'est gros, moins c'est relu sérieusement.
- ✅ **Revue à double regard** : un passage « correctness/bugs », un passage « simplification/altitude ».
- ✅ **`.gitignore` propre** : pas de `node_modules`, build, secrets, deps lourdes.
- ⚠️ **Pas de gros binaires/artefacts** dans le repo.

## 12. CI/CD & déploiement

- ✅ **Pipeline automatisé** : push → lint + tests + build. Merge bloqué si rouge.
- ✅ **Déploiement reproductible** : même artefact dev→prod, config par env (env vars).
- ✅ **Preview par branche** pour tester avant merge. 💡 Vercel : push `main` = prod, autres = preview.
- ✅ **Rollback facile et rapide** : revenir à la version précédente en 1 geste.
- ✅ **Migrations de données versionnées** et réversibles.
- ✅ **Feature flags** pour activer/désactiver sans redéployer. 💡 Ici un `MOVEMENT_BADGES_ENABLED = false`
  a coupé une feature instable sans rien casser.
- ⚠️ **Pas de déploiement vendredi soir** sans surveillance. Toujours savoir comment annuler.

## 13. Observabilité (savoir ce qui se passe en prod)

- ✅ **Logs structurés**, niveaux adaptés (debug/info/warn/error), sans secrets ni PII.
- ✅ **Métriques clés** : latence, taux d'erreur, trafic, saturation (4 golden signals).
- ✅ **Alerting** sur les seuils qui comptent (erreurs, quota proche, source plus à jour).
- ✅ **Suivi des erreurs front** (Sentry-like) : voir ce que vivent les utilisateurs réels.
- ✅ **Health check** simple (endpoint `ping`).

## 14. Documentation & mémoire du projet

- ✅ **README utile** : ce que fait l'app, comment la lancer, la tester, la déployer.
- ✅ **Journal de décisions** (ADR / `DECISIONS.md`) : *pourquoi* chaque choix non-trivial, ce qui reste
  à faire, les actions humaines en attente. 💡 C'est ce qui permet de **ne pas re-décider deux fois**
  et de **ne pas défaire par erreur** un choix volontaire.
- ✅ **État cible vs historique** séparés.
- ✅ **Contrats documentés** (formats d'API, structure de fichiers attendue) pour les intervenants externes.
- ⚠️ **Doc périmée = pire que pas de doc** : la mettre à jour dans la même PR que le code.

## 15. Maintenabilité & dette technique

- ✅ **Refactor en continu** (petites touches), pas de « grand refactor » repoussé à l'infini.
- ✅ **Dette assumée et tracée** : un TODO sans contexte est un mensonge.
- ✅ **Dépendances maîtrisées** : peu, à jour, justifiées.
- ✅ **Supprimer agressivement** ce qui ne sert plus.
- ✅ **Automatiser le répétitif** (format, release, snapshots). 💡 Une GitHub Action capture un snapshot
  hebdo automatiquement (la source n'a pas d'historique).

## 16. Fiabilité, sauvegarde & reprise

- ✅ **Sauvegardes** de tout état non reproductible (et **tester la restauration**).
- ✅ **Pas de point de défaillance unique** non documenté ; connaître les dépendances externes et leur SLA.
- ✅ **Données critiques versionnées / snapshotées** si la source ne garde pas d'historique.
- ✅ **Plan de reprise** : que faire si base / API tierce / hébergeur tombe.
- ⚠️ **Environnement éphémère** : tout ce qui n'est pas commité/sauvegardé est perdu.

## 17. Checklist « avant de mettre en prod »

```
PRODUIT
[ ] Critères d'acceptation remplis et vérifiés
[ ] Parcours critiques testés à la main + en automatique

CODE
[ ] Lint + format OK, pas de code mort, pas de TODO bloquant
[ ] Revue de code faite (bugs + simplification)
[ ] Constantes/secrets externalisés, rien en dur

DONNÉES
[ ] Validation à la frontière, valeurs sales gérées
[ ] Sources réconciliées / écarts compris et documentés

SÉCURITÉ
[ ] Inputs échappés (XSS/injection), HTTPS + headers, CSP
[ ] Secrets hors repo, dépendances auditées, moindre privilège

FIABILITÉ
[ ] Erreurs gérées (retry/backoff, timeouts, dégradation)
[ ] États loading/empty/error présents
[ ] Pas de fuite (listeners/observers/timers nettoyés)

UX / UI
[ ] 1 action primaire claire ; 5 états sur chaque cliquable
[ ] Cibles ≥ 44px, contraste AA (clair+sombre), 100% clavier
[ ] role/aria + focus géré sur les overlays
[ ] Animations < 300ms, coupées sous reduced-motion
[ ] Aucune perte de scroll/contexte au re-render ou au retour
[ ] Responsive vérifié ≤ 360px, au pouce

PERF
[ ] Budget respecté, instant-paint, cache assets immuables

OPS
[ ] CI verte, déploiement reproductible, rollback connu
[ ] Logs/métriques/alertes en place, health check
[ ] Sauvegarde + restauration testées

DOC
[ ] README à jour, décisions tracées, contrats documentés
```

## 18. La méthode qui a payé sur ce projet

- **Cadrer le « pourquoi » avant le « comment »**, puis itérer vite (montrer, corriger, re-montrer).
  L'UX se juge à l'œil.
- **Vérifier la donnée par diff automatique** plutôt qu'« à l'œil » → distinguer un vrai écart d'un
  artefact de lecture, et une propriété de la source d'un bug.
- **Tracer chaque décision** pour ne pas la défaire : la mémoire du projet est un actif.
- **Garde-fous plutôt que corrections risquées** : couper une feature instable derrière un flag,
  ne pas « réparer » ce qui reflète fidèlement la source.
- **Revues croisées** (bugs + UX/altitude) avant de figer, **tests de non-régression** sur les
  parcours critiques (login, onglets, modal, recherche, mobile, dark, persistance de session).
- **Simplicité radicale du stack** : moins de pièces mobiles = moins de pannes.

---

*Exhaustif mais agnostique : applique-le quel que soit le langage/framework. La solidité ET la beauté
d'une app ne viennent pas d'une techno, mais de la discipline sur toutes ces dimensions — données,
erreurs, sécurité, tests, ops, doc, et UX — appliquée avec constance.*
