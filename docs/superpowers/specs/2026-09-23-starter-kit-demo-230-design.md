# Repo `ariane-starter-kit` : thème neutre + démo "Kitchen Sink" (#230, points 3 & 4)

## Contexte

Suite du chantier #201/#222 (refonte palette `default.css`). Constat posé dans #230 : `default.css` est en réalité le thème de la doc Ariane ("Le Fil"), pas un thème neutre au sens headless. #230 propose 4 actions ; cette spec ne couvre que les points 3 et 4 :

3. Un starter-kit CSS neutre (gris/bleu passe-partout, radius neutres), à copier/forker.
4. Une démo statique autonome, tous les composants Ariane instanciés avec ce starter-kit, déployée sur GitHub Pages depuis un repo à part.

Les points 1 et 2 (renommer `default.css` → `ariane.css`, réorganiser en imports) restent hors scope de cette spec — traités séparément.

## Décisions

### Repo externe unique : `jogo-labs/ariane-starter-kit`

Un seul repo GitHub, marqué _template repository_, contenant :

- `ariane-starter.css` — fichier d'entrée du thème neutre, **généré** (copie de la structure `@import` de `ariane.css`, cf. section dédiée ci-dessous) — jamais édité à la main.
- `ariane-starter/` — arbre de fragments, **généré** : copie conforme de `packages/core/src/styles/themes/ariane/` (issue de #256), à l'exception de `_palette.css` (neutralisé) et de l'échelle de radius dans `_global-tokens.css` (neutralisée). Tout le reste (tokens sémantiques, tokens partagés, tokens+règles par composant) est repris **verbatim**.
- `index.html` — la page de démo "Kitchen Sink" (générée, committée en l'état, jamais éditée à la main).
- `README.md` — instructions de fork/copie pour un consommateur (seul fichier écrit à la main dans ce repo).

Pas de second repo séparé pour la démo : elle n'a de sens qu'avec le CSS starter à côté, et dupliquer la configuration Pages/CI pour deux repos n'apporte rien à ce stade (YAGNI).

**Déploiement** : GitHub Pages en "Deploy from a branch" (`main`, racine) — pas de workflow Pages dédié, tout le contenu est statique et déjà committé.

### Thème neutre : dérivé de `ariane.css`, pas écrit à la main

Décision prise après #256 (restructuration de `default.css` → `ariane.css` en fragments) : plutôt qu'un fichier neutre maintenu indépendamment (risque de drift au fil de l'évolution de la lib), le starter-kit **copie l'arbre de fragments réel** et ne neutralise que ce qui porte l'identité visuelle "Ariane" — deux fragments précis, ciblés par transformation de texte plutôt que réécrits à la main :

- **`_palette.css`** — seules les valeurs `--ar-color-primary-*` (11 déclarations) changent : la **luminosité (L)** de chaque palier est extraite du fichier source réel (regex sur `oklch(<L> <C> <H>)`) et **préservée telle quelle** — donc si la palette ambre est recalibrée plus tard (contraste AA, etc.), le starter neutre suit automatiquement, sans intervention. Seuls la teinte et le chroma sont fixés à des valeurs neutres (slate-blue, hue 250, chroma fortement réduit) :

    ```
    05: oklch(<L source> 0.02  250)     50: oklch(<L source> 0.045 250)
    10: oklch(<L source> 0.025 250)     60: oklch(<L source> 0.05  250)
    20: oklch(<L source> 0.03  250)     70: oklch(<L source> 0.045 250)
    30: oklch(<L source> 0.035 250)     80: oklch(<L source> 0.035 250)
    40: oklch(<L source> 0.04  250)     90: oklch(<L source> 0.025 250)
                                        95: oklch(<L source> 0.015 250)
    ```

    `--ar-color-vault`/`-vault-deep` sont réécrits en alias vers la rampe neutre déjà présente dans le même fichier (`var(--ar-color-neutral-10)`/`var(--ar-color-neutral-05)`) plutôt qu'en valeurs propres — indépendant de toute évolution future de ces deux tokens. Le reste de `_palette.css` (Green/Yellow/Red/Blue/White/Neutral — hues sémantiques universelles success/warning/danger/info, pas une identité de marque) est copié **verbatim**, inchangé.

- **`_global-tokens.css`** — seules les 4 valeurs `--ar-border-radius-{sm,md,lg,xl}` sont remplacées par une échelle plus discrète (`0.25rem`/`0.375rem`/`0.5rem`/`0.75rem` — `-full` inchangé, déjà générique). Tout le reste du fichier (typographie, espacement, tokens génériques mutualisés bouton/input/panel) est copié **verbatim** — ce ne sont pas des choix d'identité, ce sont des valeurs structurelles/fonctionnelles.
- **Tous les autres fragments** (`_semantic-tokens.css`, `shared/_panel.css`, `shared/_anchor.css`, les 14 fragments `components/`) sont copiés **verbatim**, sans transformation — ils référencent déjà les primitives via `var()`, donc héritent automatiquement du rendu neutre.

Deux petites fonctions pures (testables) portent cette logique : `deriveNeutralPalette(paletteCssText) => string` et `deriveNeutralGlobalTokens(globalTokensCssText) => string` — dans `ariane`, à côté du générateur de la démo.

### Génération de la démo et du thème : scripts dans le monorepo `ariane`

Le générateur (`scripts/starter-kit/generate-starter-demo.js`, nouveau, dans `ariane`) orchestre deux sorties vers le repo externe en une seule commande/un seul commit : la page `index.html` (Kitchen Sink) **et** le thème (`ariane-starter.css` + `ariane-starter/`, cf. section précédente). Il doit vivre dans `ariane` car il a besoin des sources suivantes, toutes privées au monorepo (jamais publiées sur npm) :

- **`packages/core/dist/custom-elements.json`** (manifest CEM) → liste des 19 tagNames + `summary` de chaque composant.
- **`apps/docs/src/content/components/ar-*.mdx`** → frontmatter `variants: [{ name, label, description, html }]`, déjà écrit à la main pour la doc réelle. Réutilisé tel quel, zéro duplication de contenu de démo.

**Sortie** : un unique `index.html` autonome —

- `<head>` : `<script type="module" src="https://unpkg.com/@ariane-ui/core/cdn/autoloader.prod.js">` (pattern déjà documenté/publié, zéro build côté démo) + `<link rel="stylesheet" href="./ariane-starter.css">` (chemin relatif, le fichier vit dans le même repo).
- `<body>` : ossature à trois zones, **inspirée visuellement** de la doc Astro (`Layout.astro`/`SiteNav`/`TableOfContents.astro`) mais recodée en HTML/CSS/JS statique indépendant, sans aucune dépendance à Astro — pas de réutilisation littérale du composant (chemins absolus, liens de nav internes et branding de la doc ne sont pas transposables à un repo externe sans friction) — **révisé après la première mise en ligne** (retour d'usage réel : #230, section "Révision post-déploiement" ci-dessous) :
    - une barre de nav sticky en haut (`z-index` explicite, au-dessus du contenu) : logo/nom "Ariane" à gauche, à droite un switch clair/sombre/auto (bouton natif, pas un composant Ariane — cf. justification ci-dessous), un lien vers le repo `ariane`, un lien vers le repo `ariane-starter-kit` lui-même ;
    - une TOC latérale à gauche (sticky, ancres vers chaque section `#<tagName>`, masquée en dessous de 700px de large) ;
    - une zone de contenu scrollable à droite, avec une section par composant (titre = `summary` du manifest), puis chaque variant avec son `label`/`description` et son `html` injecté brut.
- **Switch clair/sombre/auto** : un simple `<button>` qui cycle entre les 3 états (`auto` = suit `prefers-color-scheme`, sans attribut posé ; `light`/`dark` = pose `data-theme` sur `<html>`), préférence persistée en `localStorage`. Volontairement **pas** un composant Ariane (ex. `ar-dropdown`) : le switch pilote le thème que les composants Ariane consomment eux-mêmes — le faire dépendre d'un composant Ariane créerait une dépendance circulaire (si le thème casse, le switch qui sert à le corriger casse aussi). `data-theme` sur `<html>` est le même mécanisme que `ariane.css`/`ariane-starter.css` reconnaissent déjà nativement (`:root[data-theme='dark']`), donc pilote à la fois le chrome de la page ET les composants avec un seul attribut.
- **Palette** : sobre et neutre, volontairement distincte de l'identité visuelle "Ariane" (pas la palette ambre/Voûte de `default.css`) — cohérente avec l'esprit "point de départ neutre" du starter-kit plutôt qu'avec le branding de la doc. Les tokens du chrome (`--ks-*`) suivent le même mécanisme `[data-theme]`/`prefers-color-scheme` que le thème réel, pour rester cohérents avec les composants qu'ils entourent — avant la révision post-déploiement (voir section dédiée ci-dessous), ils étaient codés en dur en clair uniquement, indépendants de la préférence système.
- `<h3>` de variant : `variant.label ?? variant.name` — filet de sécurité si un `.mdx` omet `label` (cf. révision post-déploiement ci-dessous), plutôt que d'afficher `"undefined"`.

## Révision post-déploiement (constats réels sur le site live, après premier déploiement)

Après la première mise en ligne réelle (#230), la démo présentait plusieurs problèmes invisibles en revue de code, découverts en usage réel :

1. **Pas de cohérence clair/sombre** : le chrome de la page était codé en dur en clair, mais les composants suivaient `prefers-color-scheme` (`color-scheme: light dark` hérité du thème) — un visiteur en dark mode système voyait des composants sombres sur un fond de page clair. → switch clair/sombre/auto ajouté (ci-dessus).
2. **Absence de TOC jugée trop pénalisante à l'usage** — décision initiale ("pas de TOC") revue : 19 sections qui scrollent sans repère justifient une TOC latérale malgré l'intention initiale de rester minimal.
3. **`ar-datepicker.mdx` sans champ `label`** sur ses variants (seul composant dans ce cas) → titres affichés "undefined". Corrigé dans le contenu doc + filet de sécurité ajouté au générateur.
4. **GitHub Pages/Jekyll** excluait silencieusement tous les fragments préfixés `_` (404 sur les 19 fragments du thème) — `.nojekyll` généré par le tooling (traité séparément, cf. ledger #230).
5. **`ar-datepicker`/`ar-tooltip`/`ar-charcounter`/`ar-collapse`/`ar-table-sort` absents du bundle CDN publié** — décalage de ~4 mois entre `dev` et la dernière publication npm (`0.1.0-alpha.8`, juin). Root cause distincte de ce chantier, résolue par une release (`0.1.0-alpha.9`), pas par un changement du générateur.

**Garde-fou** : si un composant du manifest n'a aucun `variants` trouvé dans son `.mdx` (composant tout juste créé, pas encore documenté), le script émet un avertissement explicite sur stdout et inclut quand même le composant dans la sortie avec une mention "démo à compléter" — un oubli doit être visible, jamais masqué silencieusement.

### Flux de mise à jour : manuel, mais outillé (niveau A du tableau posté sur #230)

Pas d'automatisation CI cross-repo pour l'instant (pas de PAT, pas de `repository_dispatch`) — on commence simple et on réévalue si le flux manuel s'avère insuffisant en pratique.

Le script prend en charge la partie fastidieuse pour réduire les deux irritants identifiés (oubli, manipulation manuelle entre repos) :

```
npm run generate:starter-demo -- --repo ../ariane-starter-kit
```

- Génère `index.html` **et** régénère `ariane-starter.css`/`ariane-starter/` (copie + neutralisation ciblée), les écrit directement dans le checkout du repo externe (chemin relatif, checkout frère supposé en local).
- Fait `git add` + `git commit` dans ce checkout (message de commit généré, ex. `chore: régénère la démo et le thème (ariane vX.Y.Z)`).
- **Ne pousse jamais automatiquement** — le `git push` reste un geste volontaire du dev, après relecture du diff généré.

**Précondition documentée** (dans le `README` du script et celui d'`ariane-starter-kit`) : les deux repos doivent être clonés en checkouts frères en local (ex. `~/Code/.../ariane` et `~/Code/.../ariane-starter-kit`). `--repo` a pour défaut `../ariane-starter-kit`, overridable.

**Contre l'oubli** : une ligne est ajoutée à la checklist de release déjà documentée dans `CLAUDE.md` (bump version → commit → merge `dev→main` → tag) : _si un composant a changé depuis la dernière release, régénérer + pousser la démo starter-kit_. Pas de nouvelle mémoire à entretenir — on s'accroche à un rituel qui existe déjà et qui a lieu à chaque publication.

Le niveau C (job ajouté à `release.yml`, poussant automatiquement à chaque tag) reste une évolution possible si cette étape checklist se fait oublier dans la pratique — non construit maintenant.

### Validation : smoke test en CI (dry-run, sans repo externe)

Le script est exécuté en CI (`ci-core.yml` ou `ci-docs.yml`) en mode dry-run : génère le HTML dans un répertoire scratch, sans toucher à `ariane-starter-kit` (pas de checkout croisé, pas de secret). Objectif unique : détecter une régression du script lui-même (composant sans variant qui ferait planter au lieu d'avertir, manifest malformé, etc.). Ce n'est pas une garantie de fraîcheur de la démo publiée — celle-ci reste portée par l'étape de checklist de release.

## Hors scope (explicitement)

- Points 1 et 2 de #230 (renommage `default.css` → `ariane.css`, réorganisation en imports).
- Publication npm d'un package `starter-theme` séparé — le CSS se copie/fork, pas de couplage de release.
- Toute automatisation CI cross-repo (niveau C) — révisable plus tard si le flux manuel montre ses limites.
- Réorganisation de l'arborescence des checkouts locaux pour matcher `jogo-labs/ariane` + `jogo-labs/ariane-starter-kit` (implique migration d'historique + workspace VSCode) — évoquée en discussion, explicitement reportée par l'utilisateur, pas nécessaire pour ce chantier.
- Une page par composant pour la démo (rejeté au profit d'une page unique "Kitchen Sink").
- Deux repos externes séparés (starter-theme + demo) — rejeté au profit d'un seul repo.
- Réutilisation littérale du composant Astro `Layout.astro`/`SiteNav` (via un build Astro dont la sortie serait copiée) — rejeté : chemins absolus, liens de nav internes et branding de la doc ne sont pas transposables sans friction à un repo externe. Seule l'inspiration visuelle (ossature nav + contenu) est reprise, recodée en HTML/CSS statique indépendant.

## Points restant à trancher en implémentation (pas bloquants pour le plan)

- Emplacement exact des scripts dans l'arborescence `ariane` — `scripts/starter-kit/` à la racine du monorepo (le script lit des données de `packages/core/` et `apps/docs/`, donc pas rattaché à un seul package).
