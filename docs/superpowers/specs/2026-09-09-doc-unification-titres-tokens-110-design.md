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

**Structure à 2 niveaux**, proportionnée à la taille réelle du besoin (~15-20 tokens, pas la dizaine de composants de `packages/core`) — pas de 3ᵉ niveau « tokens composants » comme `default.css`, les pages Astro consomment directement le sémantique.

**Palette brute** — brainstorming visuel mené avec Opus (3 directions sombres comparées, contraste WCAG calculé). Direction retenue : **Voûte** (indigo nuit) — seule direction où l'on _se guide_ (ciel nocturne) plutôt que de subir l'obscurité, cohérente avec la métaphore du fil d'Ariane, et suffisamment distincte du `forest` déjà utilisé côté clair pour ne pas se lire comme un bug de rendu. Les primitifs clairs qui échoïaient explicitement le vocabulaire Rivian (`stone`, `forest` — cités comme tels dans le commentaire d'origine de `HomeLayout.astro`) sont renommés pour cohérence avec le nouveau vocabulaire sombre ; `paper`/`ink` restent inchangés (déjà suffisamment génériques) :

| Rôle                                           | Primitif clair                                                                                | Valeur                            | Primitif sombre                            | Valeur                                  |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------ | --------------------------------------- |
| Sol neutre 1                                   | `--doc-paper`                                                                                 | `#ffffff`                         | `--doc-vault`                              | `#191d2e`                               |
| Sol neutre 2                                   | `--doc-slate` (ex `stone`)                                                                    | `#f5f5f5`                         | `--doc-vault-deep`                         | `#10131f`                               |
| Bande sombre (zones dédiées, clair uniquement) | `--doc-grove` / `--doc-grove-deep` (ex `forest`/`forest-dark`)                                | `#313a2e` / `#252826`             | —                                          | —                                       |
| Texte                                          | `--doc-ink` / `--doc-ink-muted`                                                               | `#141414` / `#565656`             | `--doc-chalk` / `--doc-chalk-muted`        | `#e8eaf2` / `#a2a7bd`                   |
| Traits                                         | `--doc-line` / `--doc-line-soft`                                                              | `#141414` / 16 %                  | `--doc-thread` / `--doc-thread-soft`       | traits porteurs ~37 %, décoratifs ~14 % |
| Accent                                         | `--doc-ember` / `--doc-ember-hi` / `--doc-ember-wash` (ex `accent`/`accent-hi`/`accent-wash`) | `#ffaa00` / `#ffbd2e` / `#fff3d6` | _(mêmes primitifs, réutilisés tels quels)_ | —                                       |

Ratios vérifiés par Opus (AAA sur toutes les paires critiques) : `chalk`/`vault` 13,91:1, `chalk-muted`/`vault` 7,00:1, `ember`/`vault` 8,76:1, `ink`/`ember` (texte sur bouton plein) 9,65:1. L'ambre ne nécessite aucun recalibrage entre les deux modes — inutilisable en texte sur fond clair (1,9:1), il devient en sombre la couleur de lien et l'anneau de focus (`--doc-focus` : `ink` en clair, `ember` en sombre — l'ambre ne passe pas sur blanc, cf. rationale déjà présent dans `HomeLayout.astro`).

**Tokens sémantiques** — `bg`/`text`/`text-muted`/`border`/`accent`/`code-block-bg`/`focus`, chacun aliasé une seule fois via `light-dark(<primitif-clair>, <primitif-sombre>)` :

```css
:root {
    color-scheme: light dark;
    --doc-bg: light-dark(var(--doc-paper), var(--doc-vault));
    --doc-text: light-dark(var(--doc-ink), var(--doc-chalk));
    --doc-text-muted: light-dark(var(--doc-ink-muted), var(--doc-chalk-muted));
    --doc-border: light-dark(var(--doc-line-soft), var(--doc-thread-soft));
    --doc-accent: var(--doc-ember);
    --doc-code-block-bg: light-dark(var(--doc-grove-deep), var(--doc-vault-deep));
    --doc-focus: light-dark(var(--doc-ink), var(--doc-ember));
    /* ... un token sémantique par rôle, jamais de bloc dupliqué */
}
:root[data-theme='dark'] {
    color-scheme: dark;
}
:root[data-theme='light'] {
    color-scheme: light;
}
```

Chaque token sémantique est déclaré **une seule fois** avec `light-dark()`, jamais redéclaré dans un bloc `[data-theme='dark']` séparé — élimine la duplication qui a causé la collision initiale.

**Vocabulaire rationalisé sur `default.css`** — les deux systèmes de tokens (`--doc-*`/`--ar-*`) n'ont aucun lien fonctionnel, mais aligner leur terminologie facilite la lecture pour un mainteneur qui passe de l'un à l'autre. Renommage des tokens non-couleur de `HomeLayout.astro`, valeurs inchangées :

| Rôle   | Ancien nom                               | Nouveau nom                            | Équivalent `default.css`                                                                                   |
| ------ | ---------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Rayons | `--r-nano/micro/macro/mega` (4/12/20/40) | `--doc-radius-sm/md/lg/xl`             | `--ar-border-radius-sm/md/lg/xl`                                                                           |
| Easing | `--ease`                                 | `--doc-ease`                           | _(pas d'équivalent générique — chaque composant a sa propre durée, cf. `--ar-button-transition-duration`)_ |
| Typo   | `--font-display`/`--font-body`           | `--doc-font-display`/`--doc-font-body` | —                                                                                                          |

Tous les tokens `--doc-*` portent désormais systématiquement le préfixe `--doc-` (`--ease`/`--font-display`/`--font-body` n'en avaient pas dans `HomeLayout.astro` — incohérence corrigée au passage).

**Échelle typographique** (nouvelle, absente aujourd'hui) : `--doc-font-size-sm/md/lg/xl` et `--doc-font-weight-normal/medium/bold`, même style de nommage que `--ar-font-size-sm/md/lg`/`--ar-font-weight-normal/medium/bold`. Remplace les tailles littérales actuelles de `doc-prose.css` (`2rem`, `1.25rem`, `1.05rem`, `0.95rem`, `0.9rem`, `0.875rem`, `0.82rem`, `0.7rem`...) par une échelle nommée — les valeurs exactes des paliers sont un détail d'implémentation, pas fixées ici.

**Espacement — écart assumé au style `--ar-spacing-*`** : `default.css` a une échelle générique (`--ar-spacing-xs/sm/md/lg/xl`) qui n'est en réalité **consommée nulle part** dans le fichier (constat déjà noté au backlog du projet) — signe que l'abstraction pure « quelle taille pour quel usage » est insuffisamment guidante en pratique. Les tokens de rythme vertical (section 2 ci-dessous) restent donc nommés par rôle sémantique (`--doc-space-section`/`--doc-space-subsection`/`--doc-space-paragraph`) plutôt que par taille abstraite — écart délibéré au style `--ar-spacing-*`, pas un oubli de rationalisation.

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
