# Engineering Playbook — recette d'une app solide (exhaustif)

> Document de référence **portable et stack-agnostique** : tout ce qui rend une application
> **fiable, maintenable, sûre, performante et agréable** — du premier commit à la production et
> au-delà. À utiliser comme **base de qualité** sur n'importe quel projet.
>
> Complément : la couche purement visuelle est détaillée dans `UX_UI_PLAYBOOK.md` (résumée ici en §10).
>
> Convention : ✅ = à faire, ⚠️ = piège classique, 💡 = astuce vécue sur un vrai projet.

---

## 0. Les 12 piliers d'une app solide (TL;DR)

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

## 9. Données temps réel / synchronisation (si pertinent)

- ✅ **Choisir le bon mécanisme** : polling (simple, robuste) vs SSE/WebSocket (réactif) selon la
  fréquence réelle et le coût serveur.
- ✅ **Polling civilisé** : intervalle adapté + jitter ±25 % (désynchroniser les clients) + pause
  quand inactif/caché.
- ✅ **Source de fraîcheur visible** : timestamp « dernière mise à jour » + refresh manuel.
- ✅ **Cohérence pendant le refresh** : ne pas perdre le scroll ni l'état des modals (re-render sans flash).
- ✅ **Dégradation** : servir la dernière valeur connue si la source tombe.

---

## 10. UX / UI (résumé — détail dans `UX_UI_PLAYBOOK.md`)

- ✅ **Design tokens** (couleurs/espacements/rayons en variables) avant tout écran.
- ✅ **Hiérarchie** : 1 action primaire/écran ; contraste AA ; typo à 2 familles max.
- ✅ **Cibles tactiles ≥ 44 px** ; **5 états** sur chaque cliquable (hover/focus-visible/active/disabled).
- ✅ **Accessibilité** : sémantique, clavier, focus visible, `role`/`aria` sur composants custom,
  modals `role=dialog` avec gestion du focus.
- ✅ **Mouvement maîtrisé** : court, porteur de sens, coupé sous `prefers-reduced-motion`.
- ✅ **États loading / vide / erreur** soignés ; **préservation du contexte** (scroll, retour au bon endroit).
- ✅ **Responsive mobile-first**, testé sur vrai petit écran et au pouce.

---

## 11. Git & collaboration

- ✅ **Commits atomiques** avec messages clairs : *quoi* et surtout *pourquoi*. Un commit = un changement cohérent.
- ✅ **Branches de fonctionnalité** + revue avant merge sur la branche principale. Ne jamais pousser
  directement sur `main` sans validation.
- ✅ **`main` toujours déployable** (vert, fonctionnel).
- ✅ **Pull requests petites** : plus c'est gros, moins c'est relu sérieusement.
- ✅ **Revue de code à double regard** : un passage « correctness/bugs », un passage « simplification/altitude ».
- ✅ **`.gitignore` propre** : pas de `node_modules`, build, secrets, deps lourdes.
- ⚠️ **Ne pas committer de gros binaires/artefacts** dans le repo.

---

## 12. CI/CD & déploiement

- ✅ **Pipeline automatisé** : à chaque push → lint + tests + build. Merge bloqué si rouge.
- ✅ **Déploiement reproductible** : même artefact du dev à la prod, config par environnement (env vars).
- ✅ **Preview par branche** (URLs de preview) pour tester avant de merger. 💡 Vercel ici : push sur
  `main` = prod auto, autres branches = preview.
- ✅ **Rollback facile et rapide** : pouvoir revenir à la version précédente en 1 geste.
- ✅ **Migrations de données versionnées** et réversibles si base de données.
- ✅ **Feature flags** pour activer/désactiver sans redéployer (et faire du dark launch). 💡 Ici un
  simple `MOVEMENT_BADGES_ENABLED = false` a permis de couper une feature instable sans rien casser.
- ⚠️ **Pas de déploiement le vendredi soir** sans surveillance. Et toujours savoir comment annuler.

---

## 13. Observabilité (savoir ce qui se passe en prod)

- ✅ **Logs structurés** et de niveau adapté (debug/info/warn/error), sans secrets ni PII.
- ✅ **Métriques clés** : latence, taux d'erreur, trafic, saturation (les « 4 golden signals »).
- ✅ **Alerting** sur les seuils qui comptent (taux d'erreur, quota proche, source qui ne se met plus
  à jour). 💡 Ici, surveiller la fraîcheur de la donnée et les quotas d'API était critique.
- ✅ **Suivi des erreurs front** (Sentry-like) pour voir ce que vivent les utilisateurs réels.
- ✅ **Health check** simple (endpoint `ping`) pour vérifier que le service répond.

---

## 14. Documentation & mémoire du projet

- ✅ **README utile** : ce que fait l'app, comment la lancer, la tester, la déployer.
- ✅ **Journal de décisions** (ADR / `DECISIONS.md`) : *pourquoi* chaque choix non-trivial a été fait,
  ce qui reste à faire, les actions humaines en attente. 💡 C'est ce qui permet de **ne pas
  re-décider deux fois** et de **ne pas défaire par erreur** un choix volontaire (ex. ne pas
  « réparer » les opps à 0, ne pas re-sommer les totaux d'équipe).
- ✅ **Doc d'état cible vs historique** séparés : l'un décrit où on va, l'autre comment on y est arrivé.
- ✅ **Spécifications des contrats** (formats d'API, structure de fichiers attendue) pour les
  intervenants externes (ici : la spec de la Google Sheet pour le data owner).
- ⚠️ **Doc périmée = pire que pas de doc.** La mettre à jour dans la même PR que le code.

---

## 15. Maintenabilité & dette technique

- ✅ **Refactor en continu** (petites touches), pas de « grand refactor » repoussé à l'infini.
- ✅ **Dette assumée et tracée** : un TODO sans contexte est un mensonge ; noter pourquoi et quand le traiter.
- ✅ **Dépendances maîtrisées** : peu, à jour, justifiées. Chaque lib est un engagement à long terme.
- ✅ **Supprimer agressivement** ce qui ne sert plus (features, code, flags retombés).
- ✅ **Automatiser le répétitif** (formatage, release, snapshots). 💡 Ici, une GitHub Action capture
  un snapshot hebdo automatiquement (la source n'a pas d'historique).

---

## 16. Fiabilité, sauvegarde & reprise

- ✅ **Sauvegardes** de tout état non reproductible (et **tester la restauration**, pas juste la sauvegarde).
- ✅ **Pas de point de défaillance unique** non documenté ; connaître les dépendances externes et leur SLA.
- ✅ **Données critiques versionnées / snapshotées** si la source ne garde pas d'historique.
- ✅ **Plan de reprise** : que faire si la base / l'API tierce / l'hébergeur tombe.
- ⚠️ **Environnement éphémère** : tout ce qui n'est pas commité/sauvegardé est perdu. Ne rien laisser
  uniquement « dans la tête de la machine ».

---

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

PERF
[ ] Budget respecté, instant-paint, cache assets immuables

OPS
[ ] CI verte, déploiement reproductible, rollback connu
[ ] Logs/métriques/alertes en place, health check
[ ] Sauvegarde + restauration testées

DOC
[ ] README à jour, décisions tracées, contrats documentés
```

---

## 18. La méthode qui a payé sur ce projet

- **Cadrer le « pourquoi » avant le « comment »**, puis itérer vite (montrer, corriger, re-montrer).
- **Vérifier la donnée par diff automatique** plutôt que « à l'œil » → on a distingué un vrai écart
  d'un artefact de lecture, et une propriété de la source d'un bug.
- **Tracer chaque décision** pour ne pas la défaire : la mémoire du projet est un actif.
- **Garde-fous plutôt que corrections risquées** : couper une feature instable derrière un flag,
  ne pas « réparer » ce qui reflète fidèlement la source.
- **Simplicité радicale du stack** : moins de pièces mobiles = moins de pannes.

---

*Exhaustif mais agnostique : applique-le quel que soit le langage/framework. La solidité d'une app
ne vient pas d'une techno, mais de la discipline sur ces dimensions — données, erreurs, sécurité,
tests, ops, doc — appliquée avec constance.*
