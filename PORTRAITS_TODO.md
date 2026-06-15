# Portraits — état & priorités (vedettes du journal)

> Généré le 2026-06-15 en croisant les données live (386 personnes) avec les 355 portraits
> présents dans `cards/`. On ne liste que les joueurs **mis en avant** dans le journal
> (top 5 de chaque rubrique + cover/hero), car ce sont eux qu'on voit en grand.
>
> Les portraits sont résolus par **slug** : `cards/<slug>.webp` (+ `cards/thumb/<slug>.webp`).
> Le slug vient du nom (minuscules, accents translittérés, non-alphanum → `-`).
> Sans portrait → la plateforme affiche proprement les **initiales**.

## ✅ Bilan
- **355 portraits** sur 386 personnes. Parmi les **vedettes** du journal, seulement **5** posent
  question — dont **3 déjà présents** sous un slug légèrement différent (correction rapide) et
  **2 réellement manquants** (à générer).

## 🟠 À corriger — portrait existant mais slug qui ne matche pas
Le fichier existe déjà ; le nom dans la Sheet diffère légèrement → le slug ne tombe pas dessus.
Fix possible : **renommer le fichier** vers le slug attendu (ou corriger l'orthographe côté Sheet).

| Joueur (Sheet) | Slug attendu | Fichier présent | Action |
|---|---|---|---|
| Alejandro Rubio Fabian (ES Enterprise) | `alejandro-rubio-fabian` | `alejandro-rubio.webp` | renommer `alejandro-rubio` → `alejandro-rubio-fabian` (full + thumb) |
| Lucas FEMENIA (FR - Regions 2) | `lucas-femenia` | `lucas-femina.webp` | renommer `lucas-femina` → `lucas-femenia` (full + thumb) |
| Simon DHONDT (BELGIUM) | `simon-dhondt` | `simon-dhont.webp` | renommer `simon-dhont` → `simon-dhondt` (full + thumb) |

> ⚠️ À confirmer que c'est bien la même personne avant de renommer (très probable vu les noms).

## 🔴 À générer — aucun portrait
| Joueur | Équipe | Slug cible |
|---|---|---|
| Pablo MARTIN GUTIERREZ | ES Enterprise | `pablo-martin-gutierrez` |
| Noor BENACHAIBA | FR - Innovative Tech 2 | `noor-benachaiba` |

## Procédure (rappel)
1. Générer le portrait (Gemini), fond transparent idéalement, cadrage tête + maillot.
2. Exporter en **webp** : `cards/<slug>.webp` (≈1024px) **et** `cards/thumb/<slug>.webp` (≈256px).
3. Ajouter le `<slug>` au set `CARD_PHOTOS` dans `index.html` (sinon il n'est pas servi).
4. Bump `CARD_VER` dans `index.html` pour défaire le cache navigateur.
