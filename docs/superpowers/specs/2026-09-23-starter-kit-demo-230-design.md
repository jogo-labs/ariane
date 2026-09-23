# Repo `ariane-starter-kit` : thème neutre + démo "Kitchen Sink" (#230, points 3 & 4)

## Contexte

Suite du chantier #201/#222 (refonte palette `default.css`). Constat posé dans #230 : `default.css` est en réalité le thème de la doc Ariane ("Le Fil"), pas un thème neutre au sens headless. #230 propose 4 actions ; cette spec ne couvre que les points 3 et 4 :

3. Un starter-kit CSS neutre (gris/bleu passe-partout, radius neutres), à copier/forker.
4. Une démo statique autonome, tous les composants Ariane instanciés avec ce starter-kit, déployée sur GitHub Pages depuis un repo à part.

Les points 1 et 2 (renommer `default.css` → `ariane.css`, réorganiser en imports) restent hors scope de cette spec — traités séparément.

## Décisions

### Repo externe unique : `jogo-labs/ariane-starter-kit`

Un seul repo GitHub, marqué _template repository_, contenant :

- `ariane-starter.css` — le thème neutre, écrit à la main (valeurs sobres pour les tokens `--ar-*` existants : gris/bleu, radius neutres). Pas de logique, pas de build.
- `index.html` — la page de démo "Kitchen Sink" (générée, committée en l'état, jamais éditée à la main).
- `README.md` — instructions de fork/copie pour un consommateur.

Pas de second repo séparé pour la démo : elle n'a de sens qu'avec le CSS starter à côté, et dupliquer la configuration Pages/CI pour deux repos n'apporte rien à ce stade (YAGNI).

**Déploiement** : GitHub Pages en "Deploy from a branch" (`main`, racine) — pas de workflow Pages dédié, `index.html` est un fichier statique déjà committé.

### Génération de la démo : script dans le monorepo `ariane`

Le générateur (`scripts/generate-starter-demo.js`, nouveau, dans `ariane`) est la seule pièce de logique de tout le chantier. Il doit vivre dans `ariane` car il a besoin des deux sources suivantes, toutes deux privées au monorepo (jamais publiées sur npm) :

- **`packages/core/dist/custom-elements.json`** (manifest CEM) → liste des 19 tagNames + `summary` de chaque composant.
- **`apps/docs/src/content/components/ar-*.mdx`** → frontmatter `variants: [{ name, label, description, html }]`, déjà écrit à la main pour la doc réelle. Réutilisé tel quel, zéro duplication de contenu de démo.

**Sortie** : un unique `index.html` autonome —

- `<head>` : `<script type="module" src="https://unpkg.com/@ariane-ui/core/cdn/autoloader.prod.js">` (pattern déjà documenté/publié, zéro build côté démo) + `<link rel="stylesheet" href="./ariane-starter.css">` (chemin relatif, le fichier vit dans le même repo).
- `<body>` : une section par composant (titre = `summary` du manifest), puis chaque variant du composant avec son `label`/`description` et son `html` injecté brut. Page unique, scrollable — pas de navigation JS, pas de routing.

**Garde-fou** : si un composant du manifest n'a aucun `variants` trouvé dans son `.mdx` (composant tout juste créé, pas encore documenté), le script émet un avertissement explicite sur stdout et inclut quand même le composant dans la sortie avec une mention "démo à compléter" — un oubli doit être visible, jamais masqué silencieusement.

### Flux de mise à jour : manuel, mais outillé (niveau A du tableau posté sur #230)

Pas d'automatisation CI cross-repo pour l'instant (pas de PAT, pas de `repository_dispatch`) — on commence simple et on réévalue si le flux manuel s'avère insuffisant en pratique.

Le script prend en charge la partie fastidieuse pour réduire les deux irritants identifiés (oubli, manipulation manuelle entre repos) :

```
npm run generate:starter-demo -- --repo ../ariane-starter-kit
```

- Génère `index.html`, l'écrit directement dans le checkout du repo externe (chemin relatif, checkout frère supposé en local).
- Fait `git add` + `git commit` dans ce checkout (message de commit généré, ex. `chore: régénère la démo (ariane vX.Y.Z)`).
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

## Points restant à trancher en implémentation (pas bloquants pour le plan)

- Emplacement exact du script dans l'arborescence `ariane` (racine `scripts/` vs `packages/core/scripts/` vs nouveau `apps/docs/scripts/` — le script lit des données des deux packages, donc probablement à la racine du monorepo).
- Contenu précis des valeurs du thème starter (palette grise/bleue exacte, échelle de radius) — décision de détail visuelle, pas structurelle.
- Nom exact du fichier CSS starter (`ariane-starter.css` proposé, à confirmer).
