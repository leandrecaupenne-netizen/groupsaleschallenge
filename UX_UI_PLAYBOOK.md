# UX / UI Playbook — recette d'une app « quali »

> Document de synthèse **portable et réutilisable**. Il distille les bonnes pratiques qui
> rendent l'app *Devoteam World Cup Sales Challenge* agréable, lisible et solide — pour servir
> de **base de qualité** sur n'importe quel autre projet (front web/mobile).
>
> Lecture : chaque section donne **le principe**, **le pourquoi**, et **le comment concret**
> (souvent du CSS/JS prêt à adapter). Les ✅ = règles à appliquer, les ⚠️ = pièges à éviter.

---

## 0. Les 10 principes qui font « quali » (TL;DR)

1. **Un système de design tokens** (couleurs, espacements, rayons) avant d'écrire un seul écran.
2. **Hiérarchie visuelle claire** : 1 action principale par écran, le reste en secondaire.
3. **Contraste suffisant** partout (texte ≥ 4.5:1) — la 1ʳᵉ cause de « ça fait cheap ».
4. **Cibles tactiles ≥ 44×44 px** et états (hover/focus/active/disabled) sur **chaque** élément cliquable.
5. **Responsive mobile-first**, testé sur vrai petit écran (≤ 360 px) et avec le pouce.
6. **Accessibilité native** : HTML sémantique, focus visible, navigation clavier, `aria-*` sur les composants custom.
7. **Mouvement au service du sens**, jamais gratuit — et **toujours** coupé sous `prefers-reduced-motion`.
8. **Les états vides / chargement / erreur sont des écrans à part entière**, pas des oublis.
9. **Ne jamais casser le contexte de l'utilisateur** : préserver scroll, état des modals, position après un retour.
10. **Performance perçue** : afficher quelque chose tout de suite, hydrater ensuite, animer les chiffres.

---

## 1. Design tokens (la fondation)

✅ **Définir toutes les valeurs réutilisées dans des variables CSS** (`:root`). On ne code jamais
une couleur ou un espacement « en dur » dans un composant.

```css
:root {
  /* Couleurs de marque */
  --brand:        #1E2A78;
  --brand-2:      #2D3550;
  --accent:       #C8102E;     /* action principale */
  --gold:         #F2C75C;     /* highlight / récompense */

  /* Couleurs sémantiques (pas « rouge » mais « danger ») */
  --ink:    #0F1419;           /* texte principal */
  --muted:  #5B6577;           /* texte secondaire — assombri exprès pour le contraste */
  --line:   #E5E7EB;           /* bordures / séparateurs */
  --paper:  #FFFFFF;           /* fond cartes */
  --ok:     #16A34A;
  --warn:   #DC2626;

  /* Espacement (échelle, pas de valeurs au hasard) */
  --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px; --sp-6: 24px; --sp-8: 32px;

  /* Rayons & ombres cohérents */
  --r-sm: 8px; --r-md: 12px; --r-lg: 16px;
  --shadow-card: 0 4px 16px rgba(0,0,0,.08);
  --shadow-pop:  0 20px 60px rgba(0,0,0,.30);
}
```

**Pourquoi** : un thème cohérent + un *dark mode* deviennent triviaux (on ne réoverride que les
tokens), et l'app « respire » la même identité partout.

⚠️ Nommer par **rôle** (`--accent`, `--danger`) et pas par valeur (`--blue`). Le jour où la marque
change de couleur, on touche une ligne.

---

## 2. Couleur & contraste

- ✅ **Texte sur fond : viser AA (4.5:1)** pour le corps, 3:1 minimum pour le gros texte.
  Astuce vécue ici : le gris « secondaire » a dû être **assombri** (`--muted: #5B6577`) car le
  gris clair d'origine passait mal sur les petits labels.
- ✅ **3 niveaux de texte suffisent** : principal (`--ink`), secondaire (`--muted`), inversé (blanc).
- ✅ **Couleur = renfort, jamais seul porteur d'info** (daltonisme). Un carton « jaune » a aussi
  une **icône** (🟨) et un libellé, pas juste une teinte.
- ⚠️ Tester le contraste en **dark mode aussi** : un fond de popover translucide devient illisible,
  il faut un fond **opaque** sur les barres sticky/overlays en sombre.

---

## 3. Typographie

- ✅ **Deux familles max** : une « display » pour les gros titres (impact), une « UI » très lisible
  pour le corps (ici Anton + Montserrat). Au-delà, ça fait brouillon.
- ✅ **Échelle typographique limitée** (ex. 12 / 14 / 16 / 20 / 28 / 40) — pas 15 tailles ad hoc.
- ✅ **Self-hoster les polices** (woff2) plutôt que CDN : marche hors-ligne, pas de FOIT, pas de
  dépendance réseau externe, et ça respecte une CSP stricte. Toujours `font-display: swap`.
- ✅ **Hauteur de ligne** ~1.4–1.6 pour le corps ; titres plus serrés.
- ⚠️ Quand une police display se charge **vraiment**, sa *line-box* peut recouvrir un élément
  voisin et le rendre non-cliquable. Penser au `z-index` des éléments interactifs proches.

---

## 4. Layout & responsive (mobile-first)

- ✅ **Concevoir d'abord pour ~360 px de large**, puis élargir avec des `@media (min-width: …)`.
- ✅ **Grilles fluides** : `grid-template-columns: repeat(auto-fit, minmax(150px, 1fr))` →
  3 colonnes en desktop, 1 en mobile, sans media query.
- ✅ **Respecter les encoches** : `padding: env(safe-area-inset-*)` pour iOS.
- ✅ **Header dense sur mobile** : replier les actions secondaires derrière un menu « ⋯ »
  (≤ 560 px), garder visibles seulement l'essentiel. Desktop : tout déplié (`display: contents`).
- ⚠️ Tester **au pouce**, pas juste en réduisant la fenêtre desktop. Les zones du haut sont dures à
  atteindre d'une main → actions primaires plutôt en bas/centre sur mobile.

---

## 5. Boutons & éléments cliquables

C'est LE détail qui sépare une app « pro » d'une app « bricolée ».

- ✅ **Cible tactile ≥ 44×44 px** (norme Apple/WCAG). Si le visuel est plus petit, agrandir la zone
  cliquable avec du padding ou un pseudo-élément.
- ✅ **Les 5 états, toujours** :
  ```css
  .btn          { background: var(--accent); color:#fff; border-radius: var(--r-sm);
                  padding: 12px 16px; font-weight: 700; transition: background .15s, transform .1s; }
  .btn:hover    { background: #A00D26; }
  .btn:active   { transform: translateY(1px); }            /* feedback d'appui */
  .btn:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }  /* clavier */
  .btn:disabled { opacity: .5; cursor: not-allowed; }
  ```
- ✅ **Hiérarchie** : 1 bouton **primaire** (plein, couleur d'accent), les autres **secondaires**
  (outline/ghost). Jamais deux primaires côte à côte.
- ✅ **Libellés orientés action** : « Accéder au classement », pas « OK ». L'utilisateur sait ce qui
  va se passer.
- ✅ **Feedback immédiat sur action async** : bouton → « Vérification… » + `disabled` pendant le
  traitement, anti double-clic. Spinner pour le rafraîchissement (icône qui tourne).
- ⚠️ Ne jamais retirer l'`outline` de focus sans le remplacer. Utiliser `:focus-visible` pour
  l'afficher au clavier sans polluer le clic souris.

---

## 6. Accessibilité (a11y) — pas optionnelle

- ✅ **HTML sémantique d'abord** : `<button>` pour une action, `<a>` pour naviguer. Un `<div>`
  cliquable doit recevoir `role="button"` + `tabindex="0"` + gestion **Entrée/Espace**.
- ✅ **Modals / overlays** : `role="dialog"`, `aria-modal="true"`, `aria-label`, **focus déplacé
  dans le dialog à l'ouverture**, fermeture au `Échap` et au clic extérieur, focus rendu à
  l'élément déclencheur à la fermeture.
- ✅ **Pas d'imbrication d'interactifs** (un `role=button` dans un `<a>`) — ça crée des doubles
  arrêts de tabulation et des comportements imprévisibles.
- ✅ **Tout ce qui est cliquable est atteignable au clavier** et a un `title`/`aria-label` explicite.
- ✅ **Marquees / animations décoratives** en `aria-hidden="true"`.
- ⚠️ Un petit helper centralisé évite d'oublier :
  ```js
  function setDialogA11y(el, label){
    el.setAttribute('role','dialog');
    el.setAttribute('aria-modal','true');
    el.setAttribute('aria-label', label);
    (el.querySelector('[autofocus],button,input') || el).focus();
  }
  ```

---

## 7. Mouvement & micro-interactions

- ✅ **Le mouvement raconte quelque chose** : un chiffre qui *count-up* de 0 → sa valeur, une carte
  qui « s'imprime » en cascade, un flash discret sur un nouveau #1. Ça crée de la vie et du sens.
- ✅ **Court et fluide** : transitions 120–300 ms, easing naturel (`ease-out`/cubic). Au-delà, ça traîne.
- ✅ **Respecter `prefers-reduced-motion`** — non négociable : sous cette préférence, on **affiche
  la valeur finale immédiatement** et on coupe les animations.
  ```css
  @media (prefers-reduced-motion: reduce){
    *{ animation: none !important; transition: none !important; }
  }
  ```
- ✅ **La valeur finale est rendue d'abord**, l'animation se superpose → si JS échoue ou est lent,
  l'utilisateur voit quand même la bonne donnée (no-JS friendly).
- ⚠️ Ne pas animer au retour dans une vue déjà vue (rejouer la cascade à chaque retour agace) :
  prévoir une classe « instant » pour les ré-affichages.

---

## 8. Modals, overlays & navigation

- ✅ **Un seul conteneur scrollable** par overlay (`overflow:hidden` sur le fond, scroll dans la
  modale). Deux scrolls imbriqués = sticky qui saute, frustration.
- ✅ **Préserver le scroll** quand on re-render : capturer `scrollTop` avant, le restaurer après.
  ```js
  function renderKeepModalScroll(selector, render){
    const el = document.querySelector(selector);
    const y = el ? el.scrollTop : 0;
    render();
    const el2 = document.querySelector(selector);
    if (el2) el2.scrollTop = y;
  }
  ```
- ✅ **Le bouton « Retour » revient là où on était**, pas en haut ni dans un menu. Mémoriser
  l'origine (quelle vue, quelle position) et la restaurer. Gérer aussi le **bouton Back du
  navigateur** (`popstate`) pour fermer la couche du dessus, pas quitter l'app.
- ✅ **Navigation sticky** (onglets, sommaire) qui reste accessible en scrollant, avec
  `scroll-margin-top` sur les ancres pour ne pas passer **sous** la barre.
- ✅ **Sommaire « In this issue »** qui surligne la section en cours de lecture
  (`IntersectionObserver`) → l'utilisateur sait toujours où il est.
- ⚠️ Penser à **déconnecter** les `IntersectionObserver`/listeners à la fermeture (fuite mémoire).

---

## 9. États : chargement, vide, erreur

Trois écrans qu'on oublie et qui font toute la différence de robustesse perçue.

- ✅ **Loading** : afficher immédiatement un squelette ou un message (« Chargement… »), jamais une
  page blanche. Mieux : **instant-paint** des données en cache pendant qu'on rafraîchit.
- ✅ **Empty state** : expliquer *pourquoi* c'est vide et *quoi faire* (« Aucun résultat — élargis ta
  recherche »). Une section sans contenu ne s'affiche pas du tout plutôt que de montrer un cadre vide.
- ✅ **Erreur non bloquante** : si un rafraîchissement échoue, **garder les anciennes données** et
  afficher un badge discret (« ⚠ Dernière synchro échouée, nouvelle tentative… ») plutôt que de
  tout casser. Une erreur au 1ᵉʳ chargement, elle, propose un bouton « Réessayer ».
- ✅ **Garde anti-données périmées** : si un élément référence une donnée qui a disparu, le clic ne
  fait rien (pas d'ouverture d'une fiche vide).

---

## 10. Données live / temps réel (si pertinent)

- ✅ **Polling raisonné** : intervalle adapté à la fréquence réelle des données (ici ~2 min), avec
  **jitter ±25 %** pour ne pas synchroniser tous les clients, **pause quand l'onglet est caché**
  (`visibilitychange`) et **après X min d'inactivité** → économise serveur et batterie.
- ✅ **Timestamp « Dernière mise à jour » visible** + bouton refresh manuel (animé).
- ✅ **Re-render sans flash** : ne pas perdre le scroll ni l'état des modals pendant un refresh
  (cf. §8).
- ✅ **Cache + dégradation** : servir la dernière valeur connue si le réseau tombe.

---

## 11. Performance (réelle et perçue)

- ✅ **Afficher vite, hydrater après** : peindre le contenu en cache instantanément, remplacer par
  les données fraîches quand elles arrivent.
- ✅ **Pas de dépendances superflues** : ici, zéro framework, tout inline → chargement quasi
  instantané. Chaque lib ajoutée doit se justifier.
- ✅ **Assets cachés agressivement** (polices, images : `Cache-Control: immutable, max-age=1an`),
  HTML revalidé.
- ✅ **Lazy-load** ce qui n'est pas visible (images hors écran, sections repliées).
- ✅ **Service worker** pour le offline-first si l'app le mérite (bypass des requêtes cross-origin
  pour ne pas cacher des réponses opaques).

---

## 12. Sécurité front (réflexes de base)

- ✅ **Échapper toute donnée externe** injectée dans le DOM (XSS). Ne jamais faire confiance à un
  champ rempli par un utilisateur ou une API.
- ✅ **CSP stricte** (`default-src 'self'`, `font-src 'self'`, etc.) + headers de sécurité.
- ✅ **Pas de secret côté front** : un mot de passe « plateforme » filtre l'accès casual mais n'est
  pas un vrai mur — le sensible reste côté backend.

---

## 13. Cohérence & finition (le « polish »)

- ✅ **Espacements rythmés** : tout aligné sur l'échelle de tokens (multiples de 4/8).
- ✅ **Mêmes rayons, mêmes ombres, mêmes durées** d'animation partout → impression d'un produit unique.
- ✅ **Iconographie cohérente** (même set, même poids).
- ✅ **Wording cohérent** et au service du thème (ici, vocabulaire foot de bout en bout). Une voix
  unique = une app qui a une personnalité.
- ✅ **Détails « waouh » ciblés** : un effet holographique sur une carte de récompense, un partage
  d'image générée — mais **un par écran max**, sinon ça sature.

---

## 14. Checklist avant de livrer un écran

```
[ ] 1 seule action primaire, claire
[ ] Tous les cliquables : hover + focus-visible + active + disabled
[ ] Cibles ≥ 44×44 px, testées au pouce sur ≤ 360 px
[ ] Contraste AA vérifié (clair ET sombre)
[ ] Navigable 100% au clavier ; focus visible ; Échap ferme les overlays
[ ] role/aria sur composants custom ; focus géré à l'ouverture/fermeture
[ ] États loading / empty / error présents et utiles
[ ] Aucune perte de scroll/contexte au re-render ou au retour
[ ] Animations < 300 ms et coupées sous prefers-reduced-motion
[ ] Données externes échappées (anti-XSS)
[ ] Rien en dur : couleurs/espacements/rayons = tokens
```

---

## 15. Méthode de travail qui a payé ici

- **Itérer vite à partir de captures** : montrer, corriger, re-montrer. L'UX se juge à l'œil.
- **Revues croisées** (un passage « bugs/correction » + un passage « UX/altitude ») avant de figer.
- **Tests de non-régression** sur les parcours critiques (login, onglets, modal, recherche, mobile,
  dark, persistance de session) — pour que le polish ne casse rien.
- **Journal de décisions** (`DECISIONS.md`) : tracer *pourquoi* chaque choix UX a été fait, pour ne
  pas le défaire par erreur plus tard.

---

*Ce document est volontairement agnostique du stack : applique-le en React, Vue, Svelte, Flutter ou
vanilla. Les principes (tokens, hiérarchie, contraste, états, a11y, motion maîtrisé, préservation du
contexte) sont les mêmes partout.*
