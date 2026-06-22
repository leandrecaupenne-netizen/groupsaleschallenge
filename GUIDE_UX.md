# GUIDE_UX.md — Bonnes pratiques UX pour une app web "solide"

> **À qui s'adresse ce document.** À Claude Code (ou tout dev) qui démarre une **nouvelle app web**,
> sur **n'importe quel thème**. C'est la condensation, rendue **indépendante du thème**, de tout ce
> qui a été trouvé, débuggé et poli "à la sueur" sur une app précédente (un leaderboard live).
> Chaque règle ici a coûté un bug réel au moins une fois.
>
> **Comment l'utiliser.**
> 1. Lis d'abord la **section 0 (principes-noyaux)** — c'est la philosophie.
> 2. Traite les sections 1→19 comme des **exigences**, pas des "nice to have". Implémente-les
>    **dès le départ** sur chaque vue, pas en rattrapage.
> 3. Avant de considérer une vue "finie", passe la **checklist d'acceptation (section 20)**.
> 4. **Garde chaque comportement par un test** (section 21) : si une régression réapparaît,
>    c'est qu'un test manque.
>
> **Format de chaque règle** : *la règle*, puis souvent *(le bug qu'on a payé)* — le scénario concret
> qui justifie la règle. Garde ces parenthèses en tête : c'est là qu'est l'expérience.

> ⚠️ **Périmètre.** Ce guide couvre **l'UX et la robustesse front**. Il ne contient volontairement
> rien de spécifique à un backend, une source de données ou un thème. Les exemples sont illustratifs ;
> transpose-les à ton domaine.

---

## 0. Les principes-noyaux (à graver)

Ce sont les invariants qui font qu'une app paraît *pro* et tient dans le temps, pas seulement "jolie".

1. **Une métaphore / un langage unique, appliqué jusqu'au bout.** Le thème n'est pas une déco posée
   sur une UI générique : c'est **l'architecture de l'information**. Choisis UNE métaphore qui colle
   au métier et décline-la dans **chaque libellé, icône, couleur, animation**. Un utilisateur doit
   comprendre l'app **sans manuel**. Une métaphore cohérente vaut dix features.
2. **Chaque chiffre / donnée s'explique et mène à sa preuve.** Aucune valeur n'est un cul-de-sac : on
   la tape → une bulle dit *ce que c'est et pourquoi ça compte* → un lien mène au détail qui la
   justifie. **L'app est sa propre documentation.**
3. **Des visages / une identité partout.** Une liste de noms est froide. Donne une **identité visuelle**
   (photo, avatar, logo, initiales colorées, emoji-totem) à chaque entité. C'est un multiplicateur
   d'attachement et de lisibilité, sur toutes les surfaces.
4. **Une donnée, plusieurs surfaces selon le contexte.** Le même contenu peut alimenter le **mobile
   perso** (consultation rapide), un **mode ambiant/projection** (glanceable, vu de loin), un **outil
   opérateur/admin** (réservé). On ne refait pas la donnée, on **re-cadre l'affichage** par usage.
5. **Une couche éditoriale qui raconte la donnée.** Au-dessus des tableaux/listes bruts, un **récit**
   (titre, résumé, "fait marquant", comparaison) transforme des données en **histoire qu'on suit**.
   C'est ce qui crée le retour et l'attachement.
6. **Hiérarchie glanceable : un héros + un peloton.** Partout, "**l'élément vedette mis en scène + le
   reste classé/listé proprement**". On voit l'essentiel en 1 seconde, le détail si on veut.
7. **Tout est data-driven et conditionnel.** Rien codé en dur : une section n'apparaît que si elle a
   du contenu, les seuils/libellés viennent d'**une source unique**, les vues dérivées se recalculent.
   Ajouter un élément ou changer un seuil ne doit pas toucher la logique.
8. **Le plaisir sans nuire à la compréhension.** Animations, finitions, micro-célébrations : présents,
   mais **toujours derrière `prefers-reduced-motion`** et **la valeur/le contenu exact rendu d'abord**.
   Le delight est un bonus, **jamais un péage devant l'information**.

---

## 1. Navigation & bouton retour (ne JAMAIS sortir de l'app par erreur)

- **Pile de couches (layers) + bouton Back navigateur géré.** Chaque overlay (modale, panneau,
  recherche, comparateur, etc.) **pushe une entrée d'historique** à l'ouverture. Le **bouton Back du
  téléphone / `popstate`** ferme **la couche du dessus** au lieu de quitter l'app.
  *(Bug payé : sur mobile, le réflexe "swipe back / bouton retour" faisait quitter le site au lieu de
  fermer la modale.)*
- **Retour contextuel (revenir d'où l'on vient, pas au menu).** Quand une vue B est ouverte **depuis**
  une vue A, pose un **flag de retour**. Les **3 chemins de fermeture** — bouton à l'écran, Back
  navigateur, **Escape** — **honorent ce flag** et **rouvrent A** au lieu de retomber sur l'accueil.
  Le bouton affiche alors **"← Back"** (et non "← Close").
  *(Bug payé : ouvrir un détail depuis un panneau, puis Retour, renvoyait au menu parce que le panneau
  d'origine avait été retiré du DOM — il n'avait aucune cible de retour.)*
- **Réinitialiser le flag de retour sur toute autre transition** (ouverture directe, navigation
  latérale) pour ne jamais hériter d'un état périmé. *(Bug payé : un flag laissé à `true` faisait
  "rebondir" vers une vue qu'on ne venait pas de quitter.)*
- **Pas de double-push d'historique** : une couche déjà ouverte ne re-pushe pas. Trace **à la main**
  tous les scénarios (Back, bouton écran, Esc, lien interne, ouverture directe).

---

## 2. Modales & overlays

- **Ouverture/fermeture uniformes** : tout overlay a un bouton de fermeture **visible**, se ferme à
  **Escape**, au **clic sur le fond (backdrop)** et via le **Back navigateur**.
- **A11y dialog systématique** : `role="dialog"` + `aria-modal="true"` + `aria-label` sur **chaque**
  overlay. **Déplace le focus dans le dialog à l'ouverture** (sur l'input s'il y en a un, sinon sur le
  bouton fermer). *(Sans ça : lecteur d'écran perdu, focus resté derrière l'overlay.)*
- **Rendre le focus à l'ouvreur** : mémorise `document.activeElement` à l'ouverture, refocalise-le à la
  fermeture.
- **Préserver le scroll interne d'une modale au re-render** : capture/restaure le `scrollTop` du
  conteneur scrollable. Utile pour tout toggle interne (ex. "Voir tout"). *(Bug payé : un toggle
  reconstruisait le DOM → la modale remontait brutalement en haut.)*
- **Un seul conteneur scrollable par overlay** : l'overlay parent en `overflow:hidden`, le contenu
  scrolle **uniquement** dans la zone interne. *(Bug payé : 2 scrollers imbriqués → double scrollbar,
  sticky header indéterministe, ascenseurs qui se battent.)*
- **Aide au scroll dans les longues modales** : flèches flottantes haut/bas (scroll fluide),
  **auto-masquées** si le contenu n'est pas assez long. Câble-les sur **tous** les overlays, y compris
  ceux créés en dehors du render principal. *(Bug payé : sur un long contenu, on ne savait pas qu'il y
  avait de quoi scroller.)*
- **"Voir tout N" partout** : aucune liste ne plafonne sans échappatoire. Toggle "Show all N" avec
  **clés d'état distinctes par contexte**, sinon l'état "bave" d'une vue à l'autre. *(Bug payé : une
  clé d'expansion partagée entre deux endroits → déplier l'un dépliait l'autre.)*

---

## 3. Bulles / popovers (le point le plus piégeux)

Le pattern validé, à reproduire à l'identique :

- **Un seul popover flottant délégué** pour tous les badges/déclencheurs (pas un popover par badge).
  Handler **délégué en phase capture**.
- **Tap = toggle** (re-taper le même déclencheur referme). **Une seule bulle ouverte à la fois.**
- **Le tap qui ouvre la bulle est "absorbé"** (`stopPropagation`) → il **n'active pas** l'élément
  **sous** le badge. *(Bug payé : taper un badge ouvrait *aussi* la modale qui était dessous.)*
- **Fermeture** : tap **à côté** (et ce tap-à-côté est absorbé, n'active rien d'autre), **Escape**,
  et **un vrai scroll** ferment. *(Bug payé : la bulle restait collée pendant le scroll.)*
- **Activation clavier** : un déclencheur focusé s'ouvre à **Entrée** *et* **Espace**.
- **Survit au re-render** : keye le toggle sur **le contenu** (identité logique), pas sur l'identité du
  nœud DOM — sinon un refresh en arrière-plan reconstruit le DOM et la bulle "saute".
- **Contenu jamais tronqué dans la bulle** : `flex-wrap` + sous-ligne pleine largeur (jamais
  `white-space:nowrap` dans une boîte étroite). *(Bug payé : un détail était coupé dans une bulle
  étroite.)*

---

## 4. Boutons, flèches & affordances

- **Cibles tactiles ≥ 44px** sur tous les boutons d'action (norme tactile).
- **Menu de débordement "⋯" dans le header sur petit mobile** (≤560px) : les boutons secondaires se
  replient derrière un **⋯** ; le menu se ferme au **clic extérieur**, à **Escape**, et **à la
  sélection**. Desktop inchangé. *(Bug payé : trop d'icônes tassées dans le header sur petit écran.)*
- **Affordance de lien visible sans hover** : les liens ont un **indice persistant** (ex. soulignement
  pointillé en `currentColor` → marche en clair *et* sombre), plein au survol. *(Bug payé : l'indice
  n'était qu'au hover → invisible sur tactile.)*
- **Ne pas rendre cliquable ce qui rouvre la même vue** : sur une fiche déjà ouverte, l'élément qui
  rouvrirait le même modal s'affiche en **texte simple**, pas en lien. *(Bug payé : re-open inutile.)*
- **Boutons d'action avec état pendant l'attente** : un bouton refresh/submit **spinne** ou se
  désactive pendant l'opération, l'animation est retirée après. L'utilisateur voit que ça travaille.
- **Contraste des boutons OK en clair ET en sombre** (teste les deux thèmes).

---

## 5. Tout est cliquable ET explicable (sans curseur trompeur)

- **Chaque élément cliquable résout vers une donnée réelle.** Audit runtime : tous les déclencheurs
  pointent vers une cible valide, et ont un handler **+ une affordance** (tooltip, `↗`, CTA).
- **Garde anti-référence périmée** : si un élément référence une entité disparue des données, le tap
  **ne fait rien** au lieu d'ouvrir une vue vide/cassée.
- **Pas de curseur `pointer` trompeur** : un élément non cliquable garde `cursor:default`.
- **Données auto-explicatives** : taper une valeur ou un en-tête de colonne ouvre une **bulle
  d'explication** + un **lien vers le détail/la liste complète** qui la justifie. La modale **reste
  ouverte** quand on explique un en-tête de colonne. Tooltips glossaire partout sur les unités.

---

## 6. Sémantique des liens (clic-droit / ctrl-clic / nouvel onglet)

- **Les lignes navigables et les onglets sont de vrais `<a href>`.** Ça active nativement le
  **clic-droit → ouvrir dans un nouvel onglet** et le **Ctrl/Cmd-clic**.
- **Mais Ctrl/Cmd-clic n'ouvre PAS la modale dans l'onglet courant** : laisse le navigateur ouvrir le
  nouvel onglet, n'intercepte pas. Un **clic simple** ouvre la modale (et `preventDefault`).
  *(Détail qui fait "pro" : les power-users ouvrent plusieurs fiches en onglets.)*

---

## 7. Troncature & débordement (le tueur silencieux)

- **`overflow:hidden` coupe en silence** : invisible à un check d'overflow au niveau document.
  **Toujours tester *dans* les cartes/boîtes.** Règle : faire **wrapper** les rangées meta
  (`flex-wrap`), pas déborder.
- **Tailles de police fluides** (`clamp(...)`) pour les valeurs → elles tiennent de 320px à grand
  écran. Masquer les éléments secondaires (ⓘ) sous ~360px.
- **Du texte qui passe sous une image/un avatar** : garde-fou dédié pour que le label/la stat ne
  déborde pas sous le visuel. *(Bug payé : une fois la vraie webfont chargée, la line-box du gros titre
  recouvrait/débordait.)*
- **Conséquence z-index d'une webfont** : une vraie font chargée peut recouvrir un badge flottant →
  plus tappable. **Teste le tap APRÈS chargement des fonts.**

---

## 8. Responsive (points de rupture validés)

- **Tester au minimum 320 / 360 / 375 / 768 px** (et un sweep de ~9 devices avant lancement).
- ≤600px : les en-têtes "titre + pastille" passent la **pastille pleine largeur sous le titre**
  (`min-width:0` sur le conteneur flex), avec une marge pour ne pas chevaucher l'élément du dessus.
- ≤360px : masquer les ⓘ secondaires ; valeurs en `clamp`.
- **Encoches / safe-areas (iPhone & co.)** : `<meta name="viewport" content="…, viewport-fit=cover">`
  **+** padding via `env(safe-area-inset-*)` sur **tout** élément fixé en bas/haut (CTA, bannière,
  barres collantes, bouton scroll-top). *(Sans ça, un CTA fixé en bas est mangé par la home-bar.)*
- **Aucun overflow horizontal** à ces largeurs, **toutes modales ouvertes comprises**.

---

## 9. Scroll (ne jamais le faire sauter)

- **Préserver `window.scrollY` à travers chaque re-render** (sauver avant, restaurer après).
- **Une navigation interne ("voir la suite →") doit atterrir sur la bonne cible**, pas à côté — y
  compris sur **vrai smartphone**. Si des images/contenus chargent après coup et décalent la page
  (*layout shift*), **re-snappe le scroll après stabilisation du layout**. *(Bug payé : sur mobile on
  atterrissait à côté car le scroll était calculé avant que les images aient poussé la page.)*
- **`scroll-margin-top`** sur les sections cibles d'une nav collante (≈ hauteur de la barre sticky)
  pour ne pas passer dessous.

---

## 10. Éléments collants (sticky) & empilement

- **Empilement sticky mesuré en JS** quand deux éléments collants se superposent (ex. en-tête + sous-
  barre de navigation) : mesure la hauteur du premier → calcule le `top` du second. **Nettoie le
  listener `resize` à la fermeture.** *(Bug payé : deux éléments sticky qui se chevauchaient.)*
- **Surbrillance de la section active** dans une nav longue via `IntersectionObserver` (root = le vrai
  scroller) ; **`observer.disconnect()` à la fermeture** (sinon fuite mémoire / observer fantôme).

---

## 11. Préservation d'état au re-render (un refresh reconstruit le DOM)

> Vrai dès qu'un polling/refresh/relivraison de données re-render l'UI sous les doigts de l'utilisateur.

- **Toggles keyés sur le contenu, pas sur l'identité du nœud** → survivent au re-render.
- **État des overlays ouverts préservé** pendant un refresh (on ne ferme rien sous les doigts).
- **Caret/sélection préservés** : avant un re-render, sauve l'`activeElement` **et** son
  `selectionStart/End`, restaure après → on ne perd jamais sa place en train de taper. *(Bug payé : un
  refresh en arrière-plan vidait/replaçait le champ pendant la frappe.)*
- **Ne pas rejouer les animations sur un refresh silencieux** : un flag (ex. `suppressAnim`) coupe les
  cascades/count-ups pendant les refresh de fond, en les gardant pour les ouvertures intentionnelles.
- **Animations d'entrée non rejouées sur un "retour"** : revenir d'une vue restaure **instantanément**
  à la position mémorisée, sans rejouer la cascade. *(Bug payé : chaque retour relançait toute
  l'animation.)*
- **Sauter les re-renders no-op** : garde une signature (ex. timestamp/hash) du dernier paint ; si un
  refresh renvoie la **même** donnée, **ne reconstruis pas le DOM**.

---

## 12. Accessibilité (clavier & lecteurs d'écran)

- **`role="dialog"` + `aria-modal` + focus déplacé** dans chaque overlay (cf. §2).
- Les cibles cliquables qui sont des `div`/`article` (non-`button`) reçoivent **`role="button"` +
  `tabindex="0"`** et s'activent à **Entrée *et* Espace**.
- **Pas d'interactif imbriqué dans de l'interactif** : si une ligne est déjà un `<a>`, n'y mets pas un
  second `role=button`+`tabindex`. *(Bug payé : double arrêt Tab, focus piégé.)*
- **`aria-hidden`** sur le décoratif (marquees, ornements), **`aria-label`** sur les icônes porteuses
  de sens.
- **`role="status"` + `aria-live="polite"`** sur les zones de feedback transitoire (toast, badge de
  statut, flash de refresh) → annoncées au lecteur d'écran sans voler le focus.

---

## 13. Formulaires & saisie

- **Le clic de fermeture (backdrop/extérieur) respecte les champs de formulaire** : cliquer ou
  sélectionner du texte dans un input **ne ferme pas** l'overlay. *(Bug payé : sélectionner du texte
  dans la recherche fermait la modale.)*
- **`autofocus`** sur l'input principal d'un overlay ; **Entrée = valider**.
- **Recherche tolérante** : insensible à la casse **et aux accents** (fuzzy/`normLoose` → "García"
  trouvé en tapant "garcia", un mot-clé partiel suffit). Pas d'exigence d'exactitude pour trouver.
- **Debounce** sur les entrées qui filtrent → pas de render par frappe.

---

## 14. États vides, robustesse & garde-fous data

- **Valeur indéfinie ≠ zéro** : afficher **"—"** (valeur `null`), pas `0`, quand une métrique n'a pas
  de sens (et ne jamais pénaliser/classer sur une métrique indéfinie).
- **Ne jamais mettre en avant un "leader" à valeur 0** dans une carte vedette : une source vide ne doit
  pas produire un faux champion.
- **Recherche : message gracieux** quand aucun résultat (jamais d'écran vide).
- **Sections conditionnelles** : n'afficher une section que si elle a du contenu.
- **Échappement HTML systématique** de toute donnée externe (test XSS dédié : une donnée malicieuse ne
  doit ni s'exécuter ni injecter d'élément).
- **L'app fonctionne même si `localStorage` est bloqué** (navigation privée) : entoure **tout** accès
  storage d'un try/catch, l'app doit rester utilisable.
- **Égalités (ex æquo) cohérentes** : si tu affiches des rangs, l'ex æquo partage le même rang
  (rang de compétition), et le rang affiché sur une fiche **matche** celui de la liste. Jamais un
  "duel serré" affiché alors que l'écart est 0.
- **Bump les clés `localStorage` versionnées** (`_vN`) quand la forme d'un état persistant change,
  sinon tu lis du vieux format.

---

## 15. Thème sombre

- **Dark mode togglable et persistant.** **Toutes les affordances doivent marcher dans les deux
  thèmes** → privilégier `currentColor` (ex. soulignement pointillé), et des fonds de bulle/nav
  **opaques** en sombre (sinon le texte derrière transparaît).
- Teste chaque vue dans les deux thèmes — un contraste OK en clair peut casser en sombre.

---

## 16. Mouvement & animation (toujours sous `prefers-reduced-motion`)

- **Toute animation** (cascade d'entrée, count-up des chiffres, reflets, confetti, flash) est
  **désactivée sous `prefers-reduced-motion`**, et la **valeur/le contenu final exact est rendu
  d'abord** (no-JS / reduced-motion = état correct immédiat). Le delight ne doit jamais retarder
  l'information.
- **Animations via `requestAnimationFrame`** + **`will-change`** sur les éléments animés.
- **Indicateurs d'évolution ▲▼** : utiles mais **trompeurs tant que la donnée n'est pas stable** →
  derrière un flag qu'on n'active qu'une fois les deltas fiables. *(Bug payé : "▲4" sur un élément déjà
  #1 → deltas faux pendant le ramp-up.)*

---

## 17. Fonts & icônes

- **Webfonts self-hosted** (woff2, cache 1 an `immutable`) + **`font-display: swap`** → texte visible
  immédiatement en fallback puis swap, **jamais de FOIT** ni de render-blocking. **Pas de CDN tiers**
  (Google Fonts & co.) : un `Failed to load resource` peut casser la CI et te rend dépendant d'un tiers
  (et c'est un risque supply-chain). *(Bug payé exactement comme ça.)*
- **Emoji multicolore dans une pastille colorée rend mal** → garde l'icône neutre et mets le détail
  ailleurs (dans la bulle), pas dans la pastille.

---

## 18. Onboarding

- **Tour de première visite** (overlay avec étapes, Skip/Next) qui présente les fonctions clés. Une
  fois vu, **flag localStorage** → ne réapparaît pas.
- Comme il **overlay et intercepte les clics**, les **tests doivent le dismisser** avant d'interagir.

---

## 19. Feedback de célébration & états transitoires (le "vivant")

- **État loading brandé** (pas un spinner nu) : un écran de chargement aux couleurs/au thème de l'app
  au premier fetch (et masqué instantanément si une donnée en cache est hydratée).
- **État erreur + Retry explicite** : si le premier chargement échoue (et aucun cache), montre un
  message clair **avec un bouton Retry**, pas un écran blanc. En refresh de fond, ne casse rien : garde
  les anciennes données + un badge discret "⚠ sync failed, retrying…".
- **Célébration mesurée** : un événement fort (nouveau #1, succès) déclenche un **flash + un toast**
  (auto-dismiss), voire un confetti sur les moments forts. **Tout sous `prefers-reduced-motion`** et
  **non bloquant** (`pointer-events:none` sur le toast). C'est ce qui donne l'impression que "ça bouge"
  sans gêner la lecture.
- **Compare l'ancien et le nouvel état** au refresh pour savoir *quoi* célébrer (le #1 a-t-il changé ?)
  — d'où l'intérêt de garder un snapshot en localStorage.
- **Actions de partage/copie avec retour visuel** : un bouton passe en état `.copied` (✓) après copie
  presse-papier, ou un toast "✅ Shared!". L'utilisateur doit **voir** que l'action a marché.

---

## 19bis. Les deux lois mobile/touch (non négociables)

S'appliquent à **chaque** surface. Quand tu ajoutes une surface, ajoute la garde de test.

1. **Rien d'important n'est hover-only.** Les écrans tactiles n'ont pas de hover. Toute info qu'un
   tooltip révèle doit être **atteignable au tap** (pattern popover délégué en phase capture, cf. §3).
2. **Rien n'est clippé dans une carte.** Les boîtes en `overflow:hidden` **coupent en silence** un
   contenu plus large (invisible à un check document-level). Fix : faire **wrapper** les rangées meta
   (`flex-wrap`). Allowliste explicitement les rares boîtes volontairement plus larges (marquee,
   avatars cover-crop, fonds décoratifs).

Détails qui comptent : `loading="lazy"` + `decoding="async"` sur les images ; **thumbs pré-scalés**
pour les petits avatars (downscaler un grand visuel en ~50px donne un rendu aliasé et charge des Mo
inutiles), full-res réservé au héros/modale.

---

## 19ter. Performance perçue (ce qui rend l'app "fluide")

- **First paint rapide** : un seul fichier statique compressible, peint la dernière donnée connue
  **instantanément** au retour (cache/snapshot `stale-while-revalidate`) pendant que le fetch frais
  tourne → **jamais d'écran blanc**.
- **Pré-calcul une fois par chargement** des agrégats coûteux (groupements, lookups, rangs) → un
  re-render ne re-filtre pas toute la population à chaque ligne. Trie les listes **une fois** après
  fetch, pas à chaque accès.
- **Images** : format moderne (webp), **deux résolutions** (thumb pour les listes, full pour le héros),
  `lazy`/`async`, fallback initiales si 404, versioning `?v=N` pour défaire le cache quand l'art change.
- **Éviter le layout shift (CLS)** : re-snappe le scroll **après** stabilisation du layout (cf. §9).
- **Mesure réelle** : suis LCP/CLS avec des analytics first-party (pas de script tiers).

---

## 20. Checklist d'acceptation UX (à appliquer DÈS le départ, sur chaque vue)

Coche tout ça avant de considérer une vue "finie".

**Navigation/retour** — [ ] Back navigateur ferme la couche du dessus, ne quitte pas l'app · [ ]
retour contextuel (vue ouverte depuis X → revient à X, bouton "← Back") · [ ] Esc ferme la couche du
dessus · [ ] pas de double-push d'historique.
**Modales** — [ ] backdrop + Esc + bouton ferment · [ ] `role=dialog`+`aria-modal`+focus déplacé · [ ]
focus rendu à l'ouvreur à la fermeture · [ ] scroll interne préservé au toggle · [ ] un seul scroller
par overlay · [ ] aide au scroll sur les longues modales (auto-masquée si court) · [ ] "Voir tout N"
partout, clés d'état distinctes.
**Bulles** — [ ] tap ouvre (toggle), tap-à-côté/Esc/scroll ferment · [ ] le tap est absorbé (n'ouvre
pas la vue dessous) · [ ] une seule à la fois · [ ] Entrée+Espace · [ ] survit au re-render · [ ]
contenu wrap (jamais tronqué).
**Boutons/affordances** — [ ] cibles ≥44px · [ ] menu ⋯ header sur petit mobile · [ ] affordance de
lien visible sans hover (currentColor) · [ ] pas de lien qui rouvre la vue courante · [ ] bouton
d'action qui montre son état (spin/disabled).
**Cliquable & explicable** — [ ] tout cliquable résout une donnée réelle · [ ] garde anti-référence
périmée · [ ] pas de curseur pointer trompeur · [ ] données → bulle d'explication + lien vers le détail.
**Liens** — [ ] lignes & onglets = vrais `<a href>` · [ ] Ctrl/Cmd-clic = nouvel onglet sans ouvrir la
modale.
**Overflow** — [ ] rien de clippé *dans* les cartes (flex-wrap) · [ ] polices `clamp` · [ ] tester
APRÈS chargement des fonts.
**Responsive** — [ ] 320/360/375/768 sans overflow horizontal, modales ouvertes comprises · [ ]
safe-areas (`viewport-fit=cover` + `env(safe-area-inset-*)`) sur les éléments fixés.
**Feedback/états** — [ ] loading brandé · [ ] erreur + Retry (jamais d'écran blanc) · [ ] célébration
d'événement fort (flash/toast) sous reduced-motion · [ ] actions de partage/copie avec retour visuel.
**Scroll** — [ ] `scrollY` préservé à chaque render · [ ] navigation interne atterrit sur la cible,
re-snap après layout shift · [ ] `scroll-margin-top` sous les barres sticky.
**Sticky** — [ ] empilement mesuré en JS · [ ] section active surlignée · [ ] observers/listeners
nettoyés à la fermeture.
**État au re-render** — [ ] toggles keyés contenu · [ ] overlays ouverts préservés · [ ] caret/
sélection préservés · [ ] animations non rejouées au retour/refresh silencieux · [ ] re-renders no-op
sautés.
**A11y** — [ ] `role=button`+`tabindex` + Entrée/Espace sur cibles non-button · [ ] pas d'interactif
imbriqué · [ ] `aria-hidden` décoratif / `aria-label` icônes · [ ] `aria-live` sur le transitoire.
**Formulaires** — [ ] clic de fermeture respecte les inputs · [ ] autofocus + Entrée valide · [ ]
recherche fuzzy/accents · [ ] debounce sur le filtrage.
**Robustesse** — [ ] valeur indéfinie = "—" pas 0 · [ ] jamais de leader à 0 en vedette · [ ] no-match
gracieux · [ ] sections conditionnelles · [ ] HTML échappé (test XSS) · [ ] marche sans localStorage ·
[ ] rangs tie-aware · [ ] clés localStorage versionnées.
**Thème/motion** — [ ] dark mode OK pour toutes les affordances · [ ] tout sous
`prefers-reduced-motion`, valeur finale rendue d'abord · [ ] indicateurs ▲▼ derrière un flag tant que
la data n'est pas stable.
**Fonts** — [ ] webfonts self-hosted (pas de CDN), `font-display:swap` · [ ] tester le tap après
chargement font.
**Onboarding** — [ ] tour 1ʳᵉ visite, dismissable, flag localStorage.
**Perf** — [ ] paint instantané au retour (cache) · [ ] pré-calcul des agrégats · [ ] images 2
résolutions + lazy · [ ] mesure LCP/CLS first-party.

---

## 21. Liste de non-régression (chaque ligne = un test à écrire)

> **Garde chaque comportement ci-dessus par un test automatisé** (Playwright headless, ou équivalent).
> Si une régression d'une section 1→19 réapparaît, c'est qu'un de ces tests manque. Adapte les
> sélecteurs/données à ton app. Idéalement deux niveaux : un **smoke** rapide (lancé au pre-push) et
> un **e2e** plus profond (lancé en CI).

Exemples de gardes à reprendre (transposer au thème) :

- L'app rend après l'écran initial · le tour d'onboarding se ferme avant interaction.
- Un CTA bascule sur la bonne vue **ET** amène l'élément cible dans le viewport (pas coincé en haut).
- Une modale/fiche s'ouvre · se ferme à **Esc** · se ferme au **backdrop** · se ferme au **bouton**.
- **Fermer une fiche ouverte depuis X restaure X** (pas l'accueil).
- Recherche fuzzy/accents trouve un résultat · no-match → message gracieux.
- **Aucun contenu clippé dans une carte @360px, sur toutes les vues** · une rangée de stats tient
  @320px · une bulle d'explication reste à l'écran @320px.
- Le texte d'un héros tient et dégage l'image (pas de débordement sous l'avatar).
- **Popover/bulle** : tap ouvre · tap n'ouvre PAS la vue dessous · tap-à-côté ferme · Esc ferme ·
  Entrée sur déclencheur focusé ouvre · **le toggle survit à un re-render**.
- **Liens** : Ctrl-clic ouvre un nouvel onglet · Ctrl-clic n'ouvre PAS la modale · les lignes sont de
  vrais `<a>` · les onglets sont de vrais `<a>`.
- @375 aucun overflow, modale ouverte comprise.
- **Espace** ouvre une cible non-button (a11y) · **XSS** : une donnée malicieuse ne s'exécute pas /
  n'injecte aucun élément · **localStorage bloqué** : l'app reste utilisable.
- Si rangs : ex æquo partagent un rang · jamais d'écart 0 affiché en "photo finish" · rang sur la
  fiche == rang de la liste.
- Une navigation interne atterrit sur la cible **malgré un layout shift**.
- Dark mode toggle ne casse aucune affordance.

---

## 22. Mini-protocole pour démarrer (l'ordre qui marche)

1. **Choisis la métaphore** et écris le **glossaire** (terme du thème ↔ donnée réelle) **avant** de
   coder.
2. **Liste les surfaces** : public mobile (la base) + éventuellement *ambiant/projection* + *opérateur
   admin*. Décide lesquelles entrent dans le MVP.
3. **Identifie l'élément "héros"** de chaque vue → réutilise **une seule** fonction de rendu paramétrée
   pour toutes les listes/boards (héros + peloton).
4. **Donne un visage** à chaque entité (pipeline d'identité avec fallback initiales, ajout de visuels
   au fil de l'eau sans toucher au code).
5. **Centralise les règles métier** (seuils + libellés + icônes au **même endroit**, source unique) →
   zéro divergence entre une bulle, le glossaire, la prose et le calcul.
6. **Rends chaque donnée cliquable → explicable → traçable** (cf. principe 2).
7. **Applique la checklist (section 20) à chaque vue**, **garde par des tests (section 21)**, et
   **journalise les décisions** (un fichier `DECISIONS.md` daté : quoi/pourquoi/TODO) pour la mémoire
   inter-sessions.

---

## 23. Anti-patterns (pièges déjà payés — à éviter d'emblée)

- **Ne fais pas confiance à un check d'overflow document-level** : le clipping intra-carte est
  invisible pour lui. Teste *dans* les cartes, sur mobile.
- **Pas de `<script>`/font/CSS depuis un CDN tiers** : risque supply-chain + dépendance + CI cassée sur
  un `Failed to load`. First-party only, self-hosted.
- **N'affiche pas d'indicateurs d'évolution tant que la donnée n'est pas stabilisée** (au début ils
  mentent).
- **Ne keye pas un toggle sur l'identité du nœud DOM** : il "saute" au premier re-render.
- **N'oublie pas de nettoyer** les `IntersectionObserver` / listeners `resize` à la fermeture d'un
  overlay (fuite mémoire / observers fantômes).
- **Ne laisse pas un flag de retour traîner** entre deux navigations (rebond vers la mauvaise vue).
- **Ne calcule pas un scroll de navigation avant le chargement des images** (tu atterris à côté).
- **Ne mets pas d'interactif dans de l'interactif** (double Tab, focus piégé).
- **Ne change pas une forme d'état persistant sans bumper la clé `localStorage` versionnée.**

---

*Fin du guide. Donne-le tel quel à Claude Code sur le nouveau projet : il peut commencer par la
section 22 (protocole), puis appliquer les sections 1→19 comme exigences et la 20 comme porte de
sortie de chaque vue.*
