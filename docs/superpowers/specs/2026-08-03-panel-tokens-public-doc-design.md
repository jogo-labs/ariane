# Documentation publique des tokens panel partagés (`--ar-panel-*`)

**Date :** 2026-08-03
**Statut :** Brouillon — à valider avant plan

**Amendement (commit `efda33b`)** : la « Technique 2 » (`::part(panel)`) décrite ci-dessous a été
retirée lors d'une réécriture manuelle du rendu — cette section documente désormais uniquement la
surcharge de token scopée. Conservé ci-dessous pour l'historique de la décision initiale.

## Contexte

`packages/core/src/styles/shared/panel.styles.ts` est une feuille de style partagée, importée via
`static override styles` par 4 composants : `ar-dropdown`, `ar-breadcrumb`, `ar-stepper`,
`ar-datepicker`. Elle pilote `[part='panel']` via 9 tokens `--ar-panel-*` : `bg`, `text`,
`border-color`, `radius`, `shadow`, `padding`, `min-width`, `max-width`, `show-duration`.

Aujourd'hui, rien ne documente publiquement ces tokens sur les pages composant de la doc Astro
(`apps/docs`) — seuls le JSDoc `@cssprop` et `default.css` renseignent, et **aucun des 4
composants ne documente ces tokens hérités dans son propre JSDoc**. Un consommateur ne peut le
découvrir qu'en fouillant les sources (`panel.styles.ts` ou `default.css`).

**Nuance déjà résolue** (PR #150, 2026-08-03) : `ar-datepicker` référençait `--ar-panel-bg`
directement dans son CSS interne (`datepicker.styles.ts`) pour un usage propre (cutout du focus
ring), ce qui aurait pollué une détection par simple préfixe de nom. Ce token a été renommé
`--ar-datepicker-day-focus-border-color` — `ar-datepicker` ne référence plus aucun token
`--ar-panel-*` dans son CSS interne. **La détection par préfixe `--ar-panel-` est donc fiable pour
les 4 composants**, sans cas particulier ni jugement de rédaction.

## Décision retenue

**Option 1, avec un twist** — pas de nouveau mécanisme JSDoc :

1. Documenter normalement chacun des 9 tokens `--ar-panel-*` via `@cssprop` dans le JSDoc des 4
   composants consommateurs (duplication assumée — 4× la même liste, cohérent avec la convention
   déjà actée sur ce projet de documentation manuelle par composant, pas de dérivation
   automatique).
2. **Twist côté rendu** : dans `apps/docs/src/components/ComponentApi.astro`, section « CSS
   Custom Properties », séparer les `@cssprop` en deux blocs quand le composant a des tokens
   préfixés `--ar-panel-` : le tableau habituel (tokens propres) + un bloc dédié pour les tokens
   hérités, avec un texte d'intro expliquant que le composant utilise un panel partagé, et un
   exemple de code montrant comment les personnaliser via `::part(panel)`.
3. Détection du bloc dédié : par préfixe de nom (`--ar-panel-*`), pas par un nouveau tag JSDoc.

## Changements

### 1. JSDoc — 4 composants

Ajouter les 9 lignes suivantes (texte identique dans les 4 fichiers, juste après le dernier
`@cssprop` existant, avant les `@event`) dans `dropdown.ts`, `breadcrumb.ts`, `stepper.ts`,
`datepicker.ts` :

```
 * @cssprop --ar-panel-bg - Fond du panel partagé. Repli système `Canvas` si aucun thème n'est chargé.
 * @cssprop --ar-panel-text - Couleur du texte du panel partagé. Repli système `CanvasText` si aucun thème n'est chargé.
 * @cssprop --ar-panel-border-color - Couleur de bordure du panel partagé. Repli système `ButtonBorder` si aucun thème n'est chargé.
 * @cssprop --ar-panel-radius - Rayon de bordure du panel partagé.
 * @cssprop --ar-panel-shadow - Ombre portée du panel partagé.
 * @cssprop --ar-panel-padding - Espacement interne du panel partagé.
 * @cssprop --ar-panel-min-width - Largeur minimale du panel partagé.
 * @cssprop --ar-panel-max-width - Largeur maximale du panel partagé.
 * @cssprop --ar-panel-show-duration - Durée de l'animation d'ouverture du panel partagé (respecte `prefers-reduced-motion`).
```

Les 3 premiers replis (`bg`/`text`/`border-color`) reflètent les valeurs déjà posées dans
`panel.styles.ts` (`var(--ar-panel-bg, Canvas)` etc.). Les 6 autres tokens n'ont aucun repli dans
`panel.styles.ts` (non critiques a11y) — pas de mention de repli pour eux, pour rester honnête sur
le comportement réel sans thème.

**Composants déjà partiellement documentés** : `ar-dropdown`/`ar-breadcrumb`/`ar-stepper`
documentent déjà leurs propres tokens `--ar-<composant>-bg`/`-border-color` qui _cascadent_ vers
`--ar-panel-bg`/`--ar-panel-border-color` (ex. `--ar-dropdown-bg - Fond du panel (cascade vers
--ar-panel-bg, ...)`). Ces entrées restent inchangées dans le tableau normal — elles documentent un
point de personnalisation propre au composant, distinct du token panel générique lui-même. Les deux
listes coexistent sans conflit (préfixes différents).

### 2. `apps/docs/src/components/ComponentApi.astro`

Dans la section « CSS Custom Properties » (lignes ~150-173) :

- Partitionner `component.cssProperties` en `ownProps` (ne commence pas par `--ar-panel-`) et
  `panelProps` (commence par `--ar-panel-`).
- Si `panelProps.length > 0`, rendre **d'abord** le bloc dédié au panel partagé, **puis** le
  tableau `ownProps` juste après (ordre inversé par rapport au brouillon initial — le panel est un
  prérequis transverse, plus logique à lire avant les tokens propres au composant) :
    - Titre `h5` (ou `h4` selon la hiérarchie existante) : « Tokens du panel partagé ».
    - Texte d'intro expliquant que le composant utilise un panel flottant partagé avec d'autres
      composants de la librairie, et que deux techniques de personnalisation sont possibles :
        1. Redéfinir un ou plusieurs tokens `--ar-panel-*` **scopés à ce composant seulement**
           (n'affecte pas les autres consommateurs du panel partagé).
        2. Surcharger n'importe quelle propriété CSS via `::part(panel)`, sans passer par les
           tokens — utile pour une propriété que le thème par défaut ne tokenise pas, ou pour un
           changement plus large que ce que les tokens exposent.
    - Deux exemples de code (`<pre><code class="language-css">`, même pattern que
      `Playground.astro`), l'un après l'autre, avec une légende courte au-dessus de chacun :

        Technique 1 — token scopé au composant :

        ```css
        ar-<tag-name > {
            --ar-panel-bg: #fff;
        }
        ```

        Technique 2 — `::part(panel)` :

        ```css
        ar-<tag-name > ::part(panel) {
            background-color: #fff;
        }
        ```

        `<tag-name>` doit être dynamique (`component.tagName`) dans les deux exemples, pas en dur.

    - Tableau `panelProps` (même structure Nom/Description que le tableau habituel), après les
      deux exemples.

- Rendre `ownProps` dans le tableau existant (inchangé dans sa structure), après le bloc panel
  s'il existe.
- Si `panelProps.length === 0` (tous les autres composants), comportement strictement inchangé —
  un seul tableau, comme aujourd'hui, sans bloc panel.

### 3. Styles

Réutiliser les classes déjà existantes (`.hint`, `.table-wrap`, `table`) plutôt que d'introduire de
nouvelles règles. Pour le bloc de code, reprendre le pattern `.code-block`/`<pre><code
class="language-css">` de `Playground.astro` (pas de nouveau composant de coloration syntaxique).

## Vérification

- `npm run build:manifest` (garde-fou `validate-cssprop-defaults` — les 3 tokens avec repli
  système doivent matcher le format attendu par le script).
- `npm run build --workspace=apps/docs` (build Astro complet, pas seulement dev, pour repérer une
  erreur de rendu sur les 4 pages concernées).
- Vérification visuelle Playwright (dev serveur, JS de `packages/core/dist` rebuild explicitement
  avant — cf. piège déjà connu) sur les 4 pages composant concernées (`ar-dropdown`,
  `ar-breadcrumb`, `ar-stepper`, `ar-datepicker`) : le bloc « Tokens du panel partagé » apparaît
  correctement, avec le bon nom de tag dans l'exemple de code.
- Vérifier au moins une page composant **sans** tokens panel (ex. `ar-alert`) pour confirmer
  qu'aucune régression n'apparaît sur le tableau CSS Custom Properties habituel.
- Tests existants (`npm run test`) : aucune assertion connue sur `ComponentApi.astro` (pas de test
  dédié aujourd'hui) — à confirmer par grep avant de conclure qu'aucun test n'est à mettre à jour.

## Résultat attendu

- Les 9 tokens `--ar-panel-*` sont documentés une fois par composant consommateur (JSDoc), et
  affichés en premier (avant les tokens propres au composant) dans un bloc dédié sur les 4 pages
  composant concernées, avec les deux techniques de personnalisation illustrées (token scopé au
  composant, ou `::part(panel)` complet).
- Aucun changement pour les composants qui ne consomment pas `panel.styles.ts`.
- Le mécanisme de détection (préfixe de nom) ne nécessite aucune exception — confirmé par la
  résolution préalable du cas `ar-datepicker`.

## Hors scope

- `--ar-tooltip-show-duration: var(--ar-panel-show-duration)` (`default.css`) — `ar-tooltip`
  n'importe pas `panel.styles.ts`, cette référence est une commodité d'auteur du thème, pas une
  vraie dépendance du composant. Pas concerné par ce chantier (cf. règle déjà actée : une
  consommation par `default.css` lui-même n'est pas une réutilisation par le composant).
- Autres feuilles de style partagées du projet (`button.styles.ts`, `resetStyles`,
  `utilitiesStyles`) — même question potentiellement applicable, pas auditée ici.
- Le mécanisme JSDoc custom façon `@display`/`@parent` porté par `panel.styles.ts` lui-même — déjà
  écarté comme trop lourd (cf. mémoire du chantier), pas reconsidéré ici.
