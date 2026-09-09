# Unification tokens / titres / espacements de la documentation (#110, sous-chantier 1)

## Contexte

L'issue #110 (« refonte visuelle de la documentation ») a livré la home page (PR #202, identité Rivian : ambre `#ffaa00`, neutres stone/forest, rayons 4/12/20/40, easing `cubic-bezier(0.83,0,0.17,1)`, typo Instrument Sans/Inter) mais son étape 3 — décliner cette identité sur le reste d'`apps/docs` — reste ouverte. Un audit préalable (2026-09-09) a montré que le problème dépasse le style visuel : deux systèmes d'authoring et deux systèmes de tokens coexistent par accident, pas par choix.

Ce document couvre le premier des deux sous-chantiers décidés pour finir #110 : les **fondations techniques** (tokens, typographie, structure). Le second — rework visuel du layout principal — est explicitement hors scope ici (cf. section Hors scope) et sera mené séparément, potentiellement avec Opus pour le brainstorming visuel.

## État actuel (constats de l'audit)

- **Collision de tokens `--doc-*`** : `Layout.astro` (pages contenu + composant) définit un vocabulaire bleu cobalt (`--doc-accent: #2955a8`) avec un dark mode fonctionnel mais dupliqué intégralement sous `[data-theme="dark"] { ... }`. `HomeLayout.astro` (home uniquement) définit un vocabulaire Rivian (`--doc-accent: #ffaa00`) sans aucun dark mode. Certains noms de token sont identiques dans les deux fichiers avec des valeurs incompatibles (`--doc-accent`, `--doc-code-block-bg`) — ce ne sont pas deux thèmes d'un même système, mais deux systèmes distincts qui se recouvrent par accident de nommage.
- **Deux modèles d'authoring de titres** : les pages composant (`[slug].astro`) génèrent leurs titres MDX via `NarrativeHeading.astro`/`NarrativeSubheading.astro` (h2→`<h3>`, h3→`<h4>`, id slugifié automatiquement via `github-slugger`, garanti en sync avec la TOC). Les pages de contenu (`getting-started/*.astro`) tapent leurs titres à la main (`<h2 class="page-title">`, `<h3 class="section-title">`, ids manuels) — aucune garantie de cohérence, aucune automatisation.
- **`NarrativeHeading`/`NarrativeSubheading` ne posent aucune classe** : leurs `<h3>`/`<h4>` bruts n'ont aucun style dédié dans `doc-prose.css` (qui ne contient que des sélecteurs de classe, jamais de sélecteur de balise) — bug concret trouvé pendant l'audit, pas seulement une supposition.
- **Espacements en valeurs littérales, sans règle** : `doc-prose.css` fixe des `margin`/`gap` en dur par sélecteur (`2rem`, `1.5rem`, `0.75rem`, `1.875rem`...), sans échelle nommée ni logique de proximité haut/bas.
- **Navigation plate** : `SiteNav.astro` n'a que 2 sections (« Bien démarrer », « Composants »), qui mélangent des pages de nature différente (onboarding, référence, personnalisation).
- Aucun ADR ne couvre layout/typographie de la doc ; le travail de la home (PR #202) n'a jamais été formalisé par écrit.

## Portée

### Dans le périmètre

1. Unification des tokens `--doc-*` sous l'identité Rivian, dark mode étendu via `light-dark()`.
2. Règles de rythme vertical (typographie/espacement) formalisées et appliquées.
3. Migration des pages de contenu vers le mécanisme de titres auto-générés.
4. Réorganisation de la navigation en 3 groupes.
5. Renommage/déplacement de la page « Conventions de nommage ».
6. Documentation : ADR-006 + `docs/design/charte-graphique.md`.

### Hors scope

- Rework visuel du layout principal (colonnes, positionnement, structure de page au-delà des tokens/typo) — sous-chantier 2, séparé.
- Contenu des futures pages Resources (#12 Aide & Support, #10 Contribuer) — seule la place dans la nav est réservée.
- `themes/default.css` (packages/core) — c'est #201, qui suit ce chantier.

## 1. Tokens `--doc-*` unifiés

**Fichier unique** `apps/docs/src/styles/doc-tokens.css`, importé par `HomeLayout.astro` et `Layout.astro` — remplace les deux blocs `<style>` actuellement dupliqués/divergents.

**Palette** : reprend telle quelle celle de `HomeLayout.astro` (seule identité validée, 2 itérations de design) — `paper/stone/forest/forest-dark/ink/ink-muted/line/line-soft/accent/accent-hi/accent-wash/on-dark/on-dark-muted/on-dark-line/focus`, `--font-display`/`--font-body`, rayons `--r-nano/micro/macro/mega` (4/12/20/40), `--ease`.

**Mécanisme dark mode** — même pattern que `packages/core/src/styles/themes/default.css` :

```css
:root {
    color-scheme: light dark;
    --doc-bg: light-dark(var(--doc-paper), var(--doc-forest));
    --doc-text: light-dark(var(--doc-ink), var(--doc-on-dark));
    /* ... un token par rôle sémantique, jamais de bloc dupliqué */
}
:root[data-theme='dark'] {
    color-scheme: dark;
}
:root[data-theme='light'] {
    color-scheme: light;
}
```

Chaque token sémantique (bg/text/border/accent/code-block-bg...) est déclaré **une seule fois** avec `light-dark()`, jamais redéclaré dans un bloc `[data-theme='dark']` séparé.

**Palette dark à calibrer** : `HomeLayout.astro` n'a actuellement qu'une palette claire — la moitié sombre de chaque `light-dark()` est à définir pendant l'implémentation (contraste WCAG AA à vérifier, cf. précédent `ar-datepicker-error-color` trouvé en #109). Point de vigilance à traiter dans le plan d'implémentation, pas dans cette spec.

**Simplification JS du toggle** : le toggle 3 états (clair/sombre/système) reste dans `Layout.astro`, mais sa logique change — « système » devient l'absence de l'attribut `data-theme` (résolution native via `color-scheme: light dark` + `prefers-color-scheme`, réactive sans listener). Le listener JS `matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ...)` est retiré ; seul le calcul de l'icône affichée (clair/sombre/système) dans le menu reste nécessaire côté JS.

## 2. Rythme vertical — règles

Une échelle nommée et des règles de proximité remplacent les valeurs littérales actuelles de `doc-prose.css` :

1. **Séparation vs groupement** : deux natures d'espacement distinctes. `--doc-space-section`/`--doc-space-subsection` (séparation, avant un titre) vs `--doc-space-paragraph` (groupement, entre éléments de contenu liés).
2. **Asymétrie haut/bas** : le `margin-top` d'un titre est toujours strictement supérieur à son `margin-bottom` — un titre colle au contenu qu'il introduit, se détache de ce qui précède.
3. **Poids de coupure proportionnel au niveau** : `margin-top` de h2 (`--doc-space-section`) > h3 (`--doc-space-subsection`) > h4. Plus la hiérarchie descend, plus la rupture visuelle s'atténue.
4. **Pattern « owl selector »** : `:where(h2, h3, h4, p, ul, ol, pre, .ar-alert) + *` pour piloter l'espacement entre éléments adjacents plutôt que des `margin-bottom` fixes par élément — élimine le double espacement en fin de section.
5. **Premier titre après `.page-title`** : espacement réduit (`:where(.page-title) + *`), pas de double espace immédiatement sous le H1 de page.
6. Valeurs concrètes définies comme tokens nommés dans `doc-tokens.css` (`--doc-space-section`, `--doc-space-subsection`, `--doc-space-paragraph`), pas de littéral dans `doc-prose.css`.

Ces règles s'appliquent identiquement aux pages de contenu et aux pages composant (source commune `doc-prose.css`).

## 3. Migration des titres des pages de contenu

Les pages `getting-started/*.astro` restantes (`quickstart`, `usage`, `shadow-dom`, `internationalization` — `naming-conventions` déplacée et renommée, cf. section 5) migrent du HTML tapé à la main vers le contenu MDX + `NarrativeHeading`/`NarrativeSubheading`, sur le modèle exact des pages composant. Les classes `.page-title`/`.section-title`/`.subsection-title` sont explicitement posées sur les balises rendues par ces composants (actuellement nues) pour corriger le bug de style manquant trouvé en audit.

Conséquence directe : chaque page de contenu peut désormais afficher une TOC garantie synchronisée (mécanisme déjà présent via `showToc`/slot `toc`/`TableOfContents.astro`, déjà utilisé — pas un nouveau mécanisme à construire).

## 4. Navigation en 3 groupes

Inspiré de la structure WebAwesome (Getting Started / Resources / Theming & Utilities), adapté au contenu réel d'Ariane :

- **Getting Started** : Démarrage rapide, Utilisation, Internationalisation.
- **Theming & Utilities** : Shadow DOM applicatif, Parts & Slots (cf. section 5).
- **Resources** : vide pour l'instant — section créée dans `SiteNav.astro`, réservée pour #12 (Aide & Support) et #10 (Contribuer), pas de contenu à produire dans ce chantier.
- **Composants** : inchangé.

## 5. Renommage « Conventions de nommage »

La page ne couvre que `::part()` sémantiques, parts d'état et conventions de slot — c'est de la doc de personnalisation, pas des règles de code. Renommée **« Parts & Slots »**, déplacée de `apps/docs/src/pages/getting-started/naming-conventions.astro` vers `apps/docs/src/pages/theming/parts-and-slots.astro`. Toute référence interne (liens, `SiteNav.astro`, éventuels renvois depuis d'autres pages) mise à jour en conséquence.

## 6. Documentation

- **ADR-006** (`docs/decisions/ADR-006-...md`) : décision d'unifier tout `apps/docs` sous l'identité Rivian et de retirer le système cobalt, raisonnement et alternatives écartées.
- **`docs/design/charte-graphique.md`** (nouveau répertoire) : référence vivante — palette, typographie, rayons, easing, échelle d'espacement, règles de rythme vertical de la section 2. Mise à jour au fil des pages traitées (pas figée à la fin de ce chantier).

## Tests / vérification

- Vérification visuelle Playwright (clair + sombre) sur au moins une page de chaque famille (home, contenu migré, composant) avant/après.
- Contrôle de contraste WCAG AA sur la palette dark nouvellement calibrée (`--doc-*` texte/fond).
- `npm run test` (Vitest + WTR docs) et build Astro (`astro build` ou équivalent) sans erreur après le déplacement de `naming-conventions.astro`.
- Vérification manuelle que les liens internes vers l'ancienne URL `getting-started/naming-conventions` sont tous mis à jour (grep sur le repo).

## Suite

Une fois ce sous-chantier livré : sous-chantier 2 (brainstorming visuel du layout principal, potentiellement Opus), puis #201 (rafraîchir `themes/default.css` dans `packages/core`).
