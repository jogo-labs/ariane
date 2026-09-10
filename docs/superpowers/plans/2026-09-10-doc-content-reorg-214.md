# Refonte du contenu et de l'organisation de la doc (#214) — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Réorganiser la navigation et enrichir le contenu des pages narratives d'`apps/docs` (hors pages composant) selon la spec #214 : nouvelle section "Utilisations avancées", page Overview, page Frameworks, sections Attributs/Slots/Événements/Méthodes sur la page Utilisation, renommages Traductions et Personnalisation avancée.

**Architecture:** Travail purement Astro/contenu sur `apps/docs` — aucun changement à `packages/core`. Chaque tâche produit une ou plusieurs pages `.astro` buildables indépendamment ; la mise à jour de `SiteNav.astro` (qui référence toutes les URLs cibles) est repoussée à l'avant-dernière tâche, une fois toutes les pages en place, pour ne jamais avoir de lien mort en base.

**Tech Stack:** Astro 6, TypeScript, CSS scoping Astro (`:global()`), highlight.js (classes `language-html`/`language-javascript`/`language-typescript`/`language-bash`/`language-json` uniquement — aucune autre grammaire n'est chargée par le bundle CDN utilisé, cf. `apps/docs/src/layouts/Layout.astro:46-48`).

**Spec:** `docs/superpowers/specs/2026-09-10-doc-content-reorg-214-design.md`

## Global Constraints

- Tout le contenu reste en français (site 100% français).
- Chaque page importe `doc-prose.css` (et `doc-table.css` si elle contient un tableau) via `<style>@import '../../styles/doc-prose.css';</style>`, suit le patron `Layout` + `.page-container` + `.page-header` + `.narrative`.
- Titres de section via `NarrativeHeading`/`NarrativeSubheading` avec `id` explicite — jamais de wrappers `.main-section`/`.subsection` (mécanisme unique retenu sur #110).
- Tout code de démonstration passe par une `const` déclarée dans le frontmatter puis `<pre><code class="language-xxx" set:text={codeXxx} /></pre>` — jamais de JSX/HTML brut inline dans le template (pattern déjà utilisé sur toutes les pages existantes, nécessaire ici car plusieurs exemples contiennent eux-mêmes des chevrons/accolades qu'Astro interpréterait sinon comme son propre templating).
- Classes de langage highlight.js autorisées : `language-html`, `language-javascript`, `language-typescript`, `language-bash`, `language-json`, `language-css`. Ne jamais utiliser `language-jsx`/`language-vue`/`language-svelte`/`language-tsx` (grammaires absentes du bundle CDN chargé — le bloc s'afficherait sans coloration, mais **ne pas en introduire par erreur**, un contributeur pourrait croire la grammaire supportée).
- Aucune redirection d'URL pour les pages déplacées/renommées (cf. Non-objectifs de la spec).
- Ne jamais committer avec `--no-verify` : chaque commit passe par lint-staged (Prettier) normalement.

## File Structure

```
apps/docs/src/
  components/
    NextStep.astro                    (nouveau — Task 4)
  pages/
    getting-started/
      quickstart.astro                (Task 1 — dead code retiré)
      utilisation.astro               (Task 6 — sections réécrites)
      frameworks.astro                (nouveau — Task 7)
      traductions.astro               (nouveau — Task 2, remplace i18n.astro)
      i18n.astro                      (supprimé — Task 2)
    theming/
      overview.astro                  (nouveau — Task 5)
      appliquer-un-theme.astro        (nouveau — Task 4)
      personnalisation-avancee.astro  (nouveau — Task 3, remplace parts-and-slots.astro)
      parts-and-slots.astro           (supprimé — Task 3)
      shadow-dom.astro                (Task 1 — currentPath/title alignés)
      tag-customization.astro         (inchangé)
    index.astro                       (Task 2 — lien i18n mis à jour)
  components/
    SiteNav.astro                     (Task 8 — structure de nav cible)
    ComponentApi.astro                (Task 2 — lien i18n mis à jour)
  content/components/
    ar-datepicker.mdx                 (Task 2 — lien i18n mis à jour)
  utils/
    transverse-roles.ts               (Task 3 — commentaire mis à jour)
  styles/
    doc-prose.css                     (Task 4 — règle .next-step ajoutée)
apps/docs/scripts/
  check-build.js                      (Task 9 — EXPECTED_PAGES mis à jour)
```

---

### Task 1: Corriger les scories du travail exploratoire

**Files:**

- Modify: `apps/docs/src/pages/theming/shadow-dom.astro`
- Modify: `apps/docs/src/pages/getting-started/quickstart.astro`

**Interfaces:**

- Consumes: rien (fichiers déjà déplacés par le travail exploratoire précédent).
- Produces: rien de nouveau — juste des fichiers cohérents pour les tâches suivantes.

Le travail exploratoire manuel déjà présent sur la branche a déplacé
`shadow-dom.astro` vers `theming/` mais laissé son `currentPath`/`title`
pointer vers l'ancienne URL `getting-started/shadow-dom`, et laissé une
entrée de TOC morte (commentée) dans `quickstart.astro`.

- [ ] **Step 1: Corriger `currentPath`/`title` de `theming/shadow-dom.astro`**

Dans `apps/docs/src/pages/theming/shadow-dom.astro`, remplacer :

```astro
<Layout
    title="Ariane dans un shadow DOM applicatif"
    currentPath="/getting-started/shadow-dom"
    showToc={true}
>
```

par :

```astro
<Layout
    title="Dans un shadow DOM applicatif"
    currentPath="/theming/shadow-dom"
    showToc={true}
>
```

(Le `h2.page-title` "Utiliser Ariane dans un shadow DOM" reste inchangé —
seul le `title` de la balise `<title>`/meta et le `currentPath` utilisé pour
le surlignage de nav étaient incohérents.)

- [ ] **Step 2: Retirer le dead code de `quickstart.astro`**

Dans `apps/docs/src/pages/getting-started/quickstart.astro`, remplacer le
bloc `tocEntries` :

<!-- prettier-ignore -->
```
const tocEntries = [
    { id: 'cdn',            label: 'Via CDN',            level: 1 as const },
    { id: 'autoloader',     label: 'Autoloader',         level: 2 as const },
    { id: 'bundle',         label: 'Bundle complet',     level: 2 as const },
    // { id: 'prefix',         label: 'Renommer les tags',  level: 2 as const },
    { id: 'npm',            label: 'Installation avec NPM', level: 1 as const },
    // { id: 'headless-import', label: 'Import headless',   level: 2 as const },
    { id: 'ide-autocomplete', label: 'Autocomplétion IDE', level: 2 as const },
];
```

par :

<!-- prettier-ignore -->
```
const tocEntries = [
    { id: 'cdn',            label: 'Via CDN',            level: 1 as const },
    { id: 'autoloader',     label: 'Autoloader',         level: 2 as const },
    { id: 'bundle',         label: 'Bundle complet',     level: 2 as const },
    { id: 'npm',            label: 'Installation avec NPM', level: 1 as const },
    { id: 'ide-autocomplete', label: 'Autocomplétion IDE', level: 2 as const },
];
```

- [ ] **Step 3: Vérifier**

Run: `npm run build --workspace=apps/docs`
Expected: build réussit, `dist/theming/shadow-dom/index.html` existe,
`dist/getting-started/shadow-dom/index.html` **n'existe pas**.

Run: `grep -n "prefix\|headless-import" apps/docs/src/pages/getting-started/quickstart.astro`
Expected: aucune occurrence.

- [ ] **Step 4: Commit**

```bash
git add apps/docs/src/pages/theming/shadow-dom.astro apps/docs/src/pages/getting-started/quickstart.astro
git commit -m "fix(docs): aligne currentPath/title de shadow-dom.astro, retire le dead code de quickstart"
```

---

### Task 2: Renommer i18n → Traductions

**Files:**

- Create: `apps/docs/src/pages/getting-started/traductions.astro`
- Delete: `apps/docs/src/pages/getting-started/i18n.astro`
- Modify: `apps/docs/src/components/ComponentApi.astro`
- Modify: `apps/docs/src/content/components/ar-datepicker.mdx`
- Modify: `apps/docs/src/pages/index.astro`

**Interfaces:**

- Consumes: rien.
- Produces: URL `/getting-started/traductions` — consommée par `SiteNav.astro` en Task 8.

- [ ] **Step 1: Créer `traductions.astro`**

Créer `apps/docs/src/pages/getting-started/traductions.astro` avec le
contenu intégral de `apps/docs/src/pages/getting-started/i18n.astro`
(imports, `tocEntries`, tous les `const code...`, tout le contenu narratif),
avec exactement ces deux changements :

```astro
<Layout title="Internationalisation (i18n)" currentPath="/getting-started/i18n" showToc={true}>
```

→

```astro
<Layout title="Traductions" currentPath="/getting-started/traductions" showToc={true}>
```

et

```astro
<h2 class="page-title">Internationalisation</h2>
```

→

```astro
<h2 class="page-title">Traductions</h2>
```

Rien d'autre ne change (tocEntries, tous les paragraphes, tous les exemples
de code, le composant `<ar-alert>` d'avertissement, les liens GitHub).

- [ ] **Step 2: Supprimer l'ancien fichier**

```bash
git rm apps/docs/src/pages/getting-started/i18n.astro
```

- [ ] **Step 3: Mettre à jour `ComponentApi.astro`**

Dans `apps/docs/src/components/ComponentApi.astro`, ligne ~48 :

```astro
                page <a href="/getting-started/i18n">Internationalisation</a> pour le détail du
```

→

```astro
                page <a href="/getting-started/traductions">Traductions</a> pour le détail du
```

- [ ] **Step 4: Mettre à jour `ar-datepicker.mdx`**

Dans `apps/docs/src/content/components/ar-datepicker.mdx`, ligne ~237 :

```
[Internationalisation](/getting-started/i18n)).
```

→

```
[Traductions](/getting-started/traductions)).
```

- [ ] **Step 5: Mettre à jour `index.astro`**

Dans `apps/docs/src/pages/index.astro`, ligne ~272 :

```astro
                    Le français et l'anglais sont inclus, mais Ariane peut <a href="getting-started/i18n"
```

→

```astro
                    Le français et l'anglais sont inclus, mais Ariane peut <a href="getting-started/traductions"
```

- [ ] **Step 6: Vérifier**

Run: `grep -rn "getting-started/i18n" apps/docs/src`
Expected: aucune occurrence.

Run: `npm run build --workspace=apps/docs`
Expected: build réussit, `dist/getting-started/traductions/index.html` existe.

- [ ] **Step 7: Commit**

```bash
git add apps/docs/src/pages/getting-started/traductions.astro \
        apps/docs/src/pages/getting-started/i18n.astro \
        apps/docs/src/components/ComponentApi.astro \
        apps/docs/src/content/components/ar-datepicker.mdx \
        apps/docs/src/pages/index.astro
git commit -m "refactor(docs): renomme i18n en Traductions, met à jour tous les liens"
```

---

### Task 3: Renommer Parts & Slots → Personnalisation avancée, retirer les slots

**Files:**

- Create: `apps/docs/src/pages/theming/personnalisation-avancee.astro`
- Delete: `apps/docs/src/pages/theming/parts-and-slots.astro`
- Modify: `apps/docs/src/utils/transverse-roles.ts`
- Modify: `apps/docs/src/components/ComponentApi.astro` (2 liens `/theming/parts-and-slots#semantic-parts`/`#state-parts`, texte "Parts & Slots" — trouvés en implémentation, absents du grep initial de la spec)
- Modify: `apps/docs/src/styles/doc-table.css` (commentaire référençant `parts-and-slots.astro`)

**Interfaces:**

- Consumes: rien.
- Produces: URL `/theming/personnalisation-avancee` — consommée par le
  `<NextStep>` de `theming/appliquer-un-theme.astro` (Task 4),
  `theming/overview.astro` (Task 5) et `SiteNav.astro` (Task 8).

- [ ] **Step 1: Créer `personnalisation-avancee.astro`**

Créer `apps/docs/src/pages/theming/personnalisation-avancee.astro` avec ce
contenu exact (repris de `parts-and-slots.astro`, section "Conventions de
slot" retirée) :

```astro
---
import Layout from '../../layouts/Layout.astro';
import TableOfContents from '../../components/TableOfContents.astro';
import NarrativeHeading from '../../components/NarrativeHeading.astro';

const tocEntries = [
    { id: 'semantic-parts', label: 'CSS Part sémantiques', level: 1 as const },
    { id: 'state-parts', label: 'Parts d\'état', level: 1 as const },
];
---

<Layout
    title="Personnalisation avancée"
    description="Vocabulaire de CSS part sémantiques et parts d'état partagés par tous les composants Ariane."
    currentPath="/theming/personnalisation-avancee"
    showToc={true}
>
    <div class="page-container">
        <div class="page-header">
            <h2 class="page-title">Personnalisation avancée</h2>
        </div>

        <div class="narrative">
            <NarrativeHeading id="semantic-parts">CSS Part sémantiques</NarrativeHeading>
            <p>
                En plus de <code>CSS part</code> propres à chacun, les composants Ariane
                exposent des CSS part qui ont un rôle <strong>sémantique et transverse</strong>.<br />
                Un même élément expose souvent plusieurs CSS part complémentaires, par exemple
                <code>control</code> (sémantique) et <code>link</code> (spécifique).
            </p>
            <p style="margin-top: 1rem">
                Ces <code>::part()</code> sémantiques facilitent la personnalisation des éléments communs à
                chacun des composants, permettant une meilleure intégration à un Design System.
            </p>

            <div class="table-wrap" id="roles-table">
                <table>
                    <thead>
                        <tr>
                            <th scope="col">Part sémantique</th>
                            <th scope="col">Signification</th>
                            <th scope="col">Exemples</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><code>(nom du composant)</code></td>
                            <td>Racine du composant.</td>
                            <td>
                                <code>ar-charcounter::part(charcounter)</code>,
                                <code>ar-datepicker::part(datepicker)</code>,
                                <code>ar-breadcrumb::part(breadcrumb)</code>
                            </td>
                        </tr>
                        <tr>
                            <td><code>panel</code></td>
                            <td>Conteneur flottant secondaire (datepicker, dropdown...).</td>
                            <td><code>ar-datepicker::part(panel)</code></td>
                        </tr>
                        <tr>
                            <td><code>trigger</code></td>
                            <td>Ouvre/ferme un panel ou une zone repliable.</td>
                            <td><code>ar-datepicker::part(trigger)</code></td>
                        </tr>
                        <tr>
                            <td><code>header</code> / <code>footer</code></td>
                            <td>En-tête / pied de composant.</td>
                            <td><code>ar-datepicker::part(header)</code></td>
                        </tr>
                        <tr>
                            <td><code>body</code></td>
                            <td>Zone de contenu principal.</td>
                            <td>
                                <code>ar-dialog::part(body)</code>,
                                <code>ar-alert::part(body)</code>
                            </td>
                        </tr>
                        <tr>
                            <td><code>control</code></td>
                            <td>
                                Élément interactif générique (hors
                                field/action-button/trigger).
                            </td>
                            <td>
                                <code>ar-pagination::part(link)</code>,
                                <code>ar-datepicker::part(day)</code>
                            </td>
                        </tr>
                        <tr>
                            <td><code>field</code></td>
                            <td>
                                Élément qui reçoit une saisie. Deux sous-rôles standard,
                                réutilisables par tout futur composant :
                                <code>input</code> (champ texte/textarea) et
                                <code>select</code> (liste déroulante).
                            </td>
                            <td>
                                <code>ar-datepicker::part(input)</code>,
                                <code>ar-pagination::part(select)</code>
                            </td>
                        </tr>
                        <tr>
                            <td><code>action-button</code></td>
                            <td>
                                Bouton qui déclenche une action ponctuelle (pas un toggle de
                                panel).
                            </td>
                            <td>
                                <code>ar-pagination::part(prev)</code>,
                                <code>ar-datepicker::part(today-button)</code>
                            </td>
                        </tr>
                        <tr>
                            <td><code>indicator</code></td>
                            <td>Marqueur/indicateur visuel.</td>
                            <td><code>ar-table-sort::part(indicator)</code></td>
                        </tr>
                        <tr>
                            <td><code>label</code></td>
                            <td>Texte descriptif.</td>
                            <td><code>ar-datepicker::part(label)</code></td>
                        </tr>
                        <tr>
                            <td><code>icon</code></td>
                            <td>Icône.</td>
                            <td><code>ar-alert::part(icon)</code></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <NarrativeHeading id="state-parts">Parts d'état</NarrativeHeading>
            <p>
                Certains <code>::part()</code> portent en plus un <strong>modificateur
                    d'état</strong>, selon la convention
                <code>&lt;élément&gt;--&lt;état&gt;</code> : l'élément de base reste
                présent, l'état s'ajoute en second part sur le même attribut (ex.
                <code>part="bullet bullet--current"</code>). <br />
                Ces parts d'état permettent une customisation avancée des composants dans leur différents états.
            </p>

            <div class="table-wrap" id="states-table">
                <table>
                    <thead>
                        <tr>
                            <th scope="col">État</th>
                            <th scope="col">Signification</th>
                            <th scope="col">Exemples</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><code>--current</code></td>
                            <td>Position atteinte par navigation.</td>
                            <td><code>ar-pagination::part(item--current)</code></td>
                        </tr>
                        <tr>
                            <td><code>--selected</code></td>
                            <td>Choix actif de l'utilisateur.</td>
                            <td><code>ar-tab::part(tab--selected)</code></td>
                        </tr>
                        <tr>
                            <td><code>--disabled</code></td>
                            <td>Désactivé.</td>
                            <td><code>ar-pagination::part(nav-button--disabled)</code></td>
                        </tr>
                        <tr>
                            <td><code>--pending</code></td>
                            <td>Traitement en cours.</td>
                            <td><code>ar-table-sort::part(sort-button--pending)</code></td>
                        </tr>
                        <tr>
                            <td><code>--warning</code></td>
                            <td>État d'avertissement.</td>
                            <td><code>ar-charcounter::part(count--warning)</code></td>
                        </tr>
                        <tr>
                            <td><code>--error</code></td>
                            <td>État d'erreur.</td>
                            <td><code>ar-charcounter::part(count--error)</code></td>
                        </tr>
                        <tr>
                            <td><code>--desktop</code></td>
                            <td>Affichage desktop d'un élément ayant une variante mobile.</td>
                            <td><code>ar-breadcrumb::part(list--desktop)</code></td>
                        </tr>
                        <tr>
                            <td><code>--mobile</code></td>
                            <td>Affichage mobile d'un élément ayant une variante desktop.</td>
                            <td><code>ar-breadcrumb::part(list--mobile)</code></td>
                        </tr>
                        <tr>
                            <td><code>--substep</code></td>
                            <td>Sous-liste d'étape imbriquée dans une liste d'étape parente.</td>
                            <td><code>ar-stepper::part(list--substep)</code></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <TableOfContents entries={tocEntries} slot="toc" />
</Layout>

<style>
    @import '../../styles/doc-prose.css';
    @import '../../styles/doc-table.css';
</style>
```

- [ ] **Step 2: Supprimer l'ancien fichier**

```bash
git rm apps/docs/src/pages/theming/parts-and-slots.astro
```

- [ ] **Step 3: Mettre à jour `transverse-roles.ts`**

Dans `apps/docs/src/utils/transverse-roles.ts`, ligne ~8 :

```ts
 * la table de /theming/parts-and-slots (Parts & Slots).
```

→

```ts
 * la table de /theming/personnalisation-avancee (Personnalisation avancée).
```

- [ ] **Step 4: Vérifier**

Run: `grep -rn "parts-and-slots" apps/docs/src`
Expected: aucune occurrence.

Run: `npm run build --workspace=apps/docs`
Expected: build réussit, `dist/theming/personnalisation-avancee/index.html`
existe et contient les deux tableaux (`roles-table`, `states-table`) mais
aucune section "Conventions de slot".

- [ ] **Step 5: Commit**

```bash
git add apps/docs/src/pages/theming/personnalisation-avancee.astro \
        apps/docs/src/pages/theming/parts-and-slots.astro \
        apps/docs/src/utils/transverse-roles.ts
git commit -m "refactor(docs): renomme Parts & Slots en Personnalisation avancée, retire les slots"
```

---

### Task 4: Composant NextStep, token CSS associé, page Appliquer un thème

**Files:**

- Create: `apps/docs/src/components/NextStep.astro`
- Create: `apps/docs/src/pages/theming/appliquer-un-theme.astro`
- Modify: `apps/docs/src/styles/doc-prose.css`

Note : cette tâche ne touche pas `utilisation.astro` — son ancien bloc
"Thème et personnalisation"/"Styles prêts à l'emploi" reste en place jusqu'à
la réécriture complète du fichier en Task 6, qui retire l'ancien contenu et
ajoute les 4 nouvelles sections en une seule passe.

**Interfaces:**

- Consumes: `/theming/personnalisation-avancee` (Task 3).
- Produces: composant `NextStep` (`Props: { label: string; links: { href: string; label: string }[] }`), classe CSS `.next-step`, URL `/theming/appliquer-un-theme#presets` — consommés par `theming/overview.astro` (Task 5) et `getting-started/utilisation.astro` (Task 6).

- [ ] **Step 1: Créer `NextStep.astro`**

Créer `apps/docs/src/components/NextStep.astro` :

```astro
---
/**
 * NextStep.astro
 *
 * Bloc de navigation contextuelle en pied de page narrative — "Prochaine
 * étape :" suivi d'un lien unique ou d'une liste de liens. Toujours en
 * sibling de .narrative, à l'intérieur de .page-container (jamais dans
 * slot="toc").
 */
interface StepLink {
    href:  string;
    label: string;
}

interface Props {
    label: string;
    links: StepLink[];
}

const { label, links } = Astro.props;
---

<p class="next-step">
    <strong>{label}</strong>
    {links.length === 1 ? (
        <a href={links[0].href}>{links[0].label}</a>
    ) : (
        <ul>
            {links.map((link) => (
                <li><a href={link.href}>{link.label}</a></li>
            ))}
        </ul>
    )}
</p>
```

- [ ] **Step 2: Ajouter la règle CSS `.next-step` à `doc-prose.css`**

Ajouter à la fin de `apps/docs/src/styles/doc-prose.css` (après la règle
`.badge-subtle`) :

```css
/* ── NextStep ──────────────────────────────────────────────────────────
 * .next-step est rendu par un composant séparé (NextStep.astro) : comme
 * pour .section-title/.subsection-title, `:global()` est nécessaire pour
 * que la règle matche à travers la frontière de scope Astro. Le préfixe
 * `.page-container` reste HORS `:global()` — il est écrit directement dans
 * chaque page important ce fichier, donc porte bien le scope de CETTE
 * page, ce qui ajoute la spécificité nécessaire sans rien casser. */

.page-container :global(.next-step) {
    margin-top: var(--doc-space-section);
    padding-top: var(--doc-space-subsection);
    border-top: 1px solid var(--doc-border);
    font-size: var(--doc-font-size-sm);
    color: var(--doc-text);
}

.page-container :global(.next-step ul) {
    margin-top: 0.5rem;
    padding-left: 1.25rem;
}

.page-container :global(.next-step li + li) {
    margin-top: 0.35rem;
}
```

- [ ] **Step 3: Créer `theming/appliquer-un-theme.astro`**

Créer `apps/docs/src/pages/theming/appliquer-un-theme.astro` :

```astro
---
import Layout from '../../layouts/Layout.astro';
import TableOfContents from '../../components/TableOfContents.astro';
import NarrativeHeading from '../../components/NarrativeHeading.astro';
import NarrativeSubheading from '../../components/NarrativeSubheading.astro';
import NextStep from '../../components/NextStep.astro';

const tocEntries = [
    { id: 'personnalisation',        label: 'Thème et personnalisation',   level: 1 as const },
    { id: 'charger-un-theme',        label: 'Charger un thème',            level: 2 as const },
    { id: 'personnaliser-instance',  label: 'Personnaliser une instance',  level: 2 as const },
    { id: 'tokens-globaux',          label: 'Personnaliser toute la librairie', level: 2 as const },
    { id: 'presets',                 label: 'Styles prêts à l\'emploi',    level: 2 as const },
];

const codeCustomProps = `.alerte-succes-perso {
    --ar-alert-bg:   #f5f0ff;
    --ar-alert-icon: #7c3aed;
}`;

const codeTokens = `:root {
    --ar-color-interactive: #7c3aed;
    --ar-border-radius-md:  0.75rem;
}`;

const codeTokensAlias = `:root {
    --ar-color-interactive: var(--mon-ds-color-primary);
    --ar-color-text:        var(--mon-ds-color-text);
}`;

const codePresets = `<!-- Charger le CSS dans le <head> -->
<link rel="stylesheet" href="https://unpkg.com/@ariane-ui/core/dist/styles/presets/buttons.css" />

<!-- Utilisez les classes dans votre HTML -->
<button class="ar-btn ar-btn-primary">Valider</button>
<button class="ar-btn ar-btn-secondary">Annuler</button>
`;
---

<Layout
    title="Appliquer un thème à vos composants"
    description="Charger et personnaliser le thème CSS d'Ariane, à l'échelle d'une instance ou de toute la librairie."
    currentPath="/theming/appliquer-un-theme"
    showToc={true}
>
    <div class="page-container">
        <div class="page-header">
            <h2 class="page-title">Appliquer un thème à vos composants</h2>
        </div>

        <div class="narrative">
            <NarrativeHeading id="personnalisation">Thème et personnalisation</NarrativeHeading>
            <p>
                Ariane est une librairie <strong>headless</strong> : les composants ne portent
                aucun style visuel par défaut. Sans thème, ils fonctionnent (accessibilité,
                interactions, slots) mais leur rendu visuel est indéfini — c'est intentionnel,
                Ariane est une fondation sur laquelle construire un design system, pas un kit
                d'UI clé en main. Couleurs, espacements et typographie proviennent exclusivement
                d'un fichier de thème chargé séparément.
            </p>

            <NarrativeSubheading id="charger-un-theme">Charger un thème</NarrativeSubheading>
            <p>
                Les exemples de cette documentation utilisent <code>themes/default.css</code>,
                un thème de démo fourni avec Ariane (modes clair et sombre inclus) — pas les
                valeurs par défaut intrinsèques des composants. Utilisez-le comme point de
                départ pour construire votre propre thème :
            </p>
            <p>
                <a class="download-theme" href="/themes/default.css" download>
                    Télécharger default.css
                </a>
            </p>

            <NarrativeSubheading id="personnaliser-instance">Personnaliser une instance</NarrativeSubheading>
            <p>
                Chaque composant expose des <strong>CSS Custom Properties</strong>. Pour
                personnaliser une instance précise, ajoutez-lui une classe et surchargez ses
                propriétés sur cette classe :
            </p>
            <pre><code class="language-css" set:text={codeCustomProps} /></pre>

            <NarrativeSubheading id="tokens-globaux">Personnaliser toute la librairie</NarrativeSubheading>
            <p>
                Pour modifier l'ensemble de la librairie, surchargez plutôt les tokens
                globaux (couleurs, espacements, typographie) sur <code>:root</code> :
            </p>
            <pre><code class="language-css" set:text={codeTokens} /></pre>
            <p>
                Si vous avez déjà votre propre design system, pointez les tokens Ariane vers
                les vôtres au lieu de dupliquer les valeurs — le nom du token Ariane reste
                stable, sa valeur suit la vôtre (y compris un éventuel mode sombre déjà géré
                de votre côté) :
            </p>
            <pre><code class="language-css" set:text={codeTokensAlias} /></pre>
            <p class="hint">
                Les propriétés disponibles par composant sont listées dans la section
                <strong>Référence API</strong> de chaque page de composant.
            </p>

            <p style="margin-top: 1rem">
                Ces mécanismes — tokens et <code>::part()</code> — couvrent l'intérieur des composants.
                Un bouton ou un champ que vous slottez dans un composant reste toutefois du HTML natif,
                hors de leur portée : c'est ce que couvrent les styles prêts à l'emploi ci-dessous.
            </p>

            <NarrativeSubheading id="presets">Styles prêts à l'emploi</NarrativeSubheading>
            <p style="margin-bottom: 1rem">
                Ariane propose — de manière optionnelle — des feuilles de styles comportant
                des classes CSS prêtes à l'emploi.<br />
                Elles peuvent s'appliquer au HTML qui se trouve dans le Light DOM
                (un bouton slotté dans un composant, par exemple) — distinctes des tokens /
                <code>::part()</code> du thème qui s'appliquent aux composants <code>ar-*</code>. <br />
                Chaque famille de classes vit dans son propre fichier,
                à charger séparément de <code>themes/default.css</code> :
            </p>
            <pre><code class="language-html" set:text={codePresets} /></pre>
        </div>

        <NextStep
            label="Prochaine étape :"
            links={[{ href: '/theming/personnalisation-avancee', label: 'Personnalisation avancée' }]}
        />
    </div>

    <TableOfContents entries={tocEntries} slot="toc" />
</Layout>

<style>
    @import '../../styles/doc-prose.css';

    .download-theme {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.5rem 1rem;
        border: 1px solid var(--doc-border);
        border-radius: 0.375rem;
        background: var(--doc-nav-bg);
        color: var(--doc-text);
        font-size: 0.85rem;
        font-weight: 600;
        text-decoration: none;
    }

    .download-theme:hover {
        background: var(--doc-accent-bg);
        color: var(--doc-accent);
    }
</style>
```

Note : la classe `.page-summary` de l'ancien bloc `<style>` d'`utilisation.astro`
n'est **pas** reprise ici — elle ne correspondait à aucun élément du markup
(la vraie classe est `.summary`), c'était du CSS mort issu d'un copier-coller.

- [ ] **Step 4: Vérifier**

Run: `npm run build --workspace=apps/docs`
Expected: build réussit, `dist/theming/appliquer-un-theme/index.html`
existe et contient un `id="presets"` et un bloc `.next-step` avec un lien
vers `/theming/personnalisation-avancee`.

- [ ] **Step 5: Commit**

```bash
git add apps/docs/src/components/NextStep.astro \
        apps/docs/src/pages/theming/appliquer-un-theme.astro \
        apps/docs/src/styles/doc-prose.css
git commit -m "feat(docs): ajoute NextStep et la page Appliquer un thème (tokens + presets)"
```

---

### Task 5: Page Overview

**Files:**

- Create: `apps/docs/src/pages/theming/overview.astro`

**Interfaces:**

- Consumes: `NextStep` (Task 4), `/theming/appliquer-un-theme#presets` (Task 4), `/theming/personnalisation-avancee` (Task 3), `/theming/shadow-dom` (Task 1).
- Produces: URL `/theming/overview` — consommée par le `<NextStep>` de `getting-started/utilisation.astro` (Task 6) et `SiteNav.astro` (Task 8).

- [ ] **Step 1: Créer `overview.astro`**

Créer `apps/docs/src/pages/theming/overview.astro` :

```astro
---
import Layout from '../../layouts/Layout.astro';
import NarrativeHeading from '../../components/NarrativeHeading.astro';
import NextStep from '../../components/NextStep.astro';
---

<Layout
    title="Overview"
    description="Comprendre le modèle headless d'Ariane et les leviers disponibles pour le personnaliser."
    currentPath="/theming/overview"
    showToc={false}
>
    <div class="page-container">
        <div class="page-header">
            <h2 class="page-title">Personnaliser vos composants</h2>
            <p class="summary">
                Ariane est une librairie <strong>headless</strong> : aucun style visuel par
                défaut. Sans thème, les composants fonctionnent pleinement (accessibilité,
                interactions, slots) mais leur rendu est indéfini — c'est une fondation sur
                laquelle construire un design system, pas un kit d'UI clé en main.
            </p>
        </div>

        <div class="narrative">
            <NarrativeHeading id="leviers">Trois leviers de personnalisation</NarrativeHeading>
            <p>
                Selon ce que vous cherchez à faire, un de ces trois mécanismes s'applique :
            </p>

            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th scope="col">Levier</th>
                            <th scope="col">Portée</th>
                            <th scope="col">Quand l'utiliser</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Tokens CSS (<code>--ar-*</code>)</td>
                            <td>Toute la librairie, ou une instance via une classe</td>
                            <td>Couleurs, espacements, typographie — la majorité des besoins</td>
                        </tr>
                        <tr>
                            <td><code>::part()</code></td>
                            <td>Une partie interne précise d'un composant</td>
                            <td>Layout ou styles non couverts par un token</td>
                        </tr>
                        <tr>
                            <td>Styles prêts à l'emploi (presets)</td>
                            <td>Éléments HTML natifs slottés (pas les composants <code>ar-*</code>)</td>
                            <td>Un bouton ou un champ que vous slottez doit ressembler aux composants Ariane</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <p class="hint">
                Les tokens et les <code>::part()</code> couvrent l'intérieur des composants —
                les styles prêts à l'emploi sont documentés comme complément, dans la page
                <a href="/theming/appliquer-un-theme#presets">Appliquer un thème</a>.
            </p>
            <p class="hint">
                Si vous découvrez tout juste les Custom Elements, commencez par
                <a href="/theming/appliquer-un-theme">Appliquer un thème</a> — les autres
                pages partent du principe que le thème par défaut est chargé.
            </p>
        </div>

        <NextStep
            label="Prochaine étape : choisissez votre point d'entrée"
            links={[
                { href: '/theming/appliquer-un-theme', label: 'Appliquer un thème' },
                { href: '/theming/personnalisation-avancee', label: 'Personnalisation avancée' },
                { href: '/theming/shadow-dom', label: 'Dans un shadow DOM applicatif' },
            ]}
        />
    </div>
</Layout>

<style>
    @import '../../styles/doc-prose.css';
    @import '../../styles/doc-table.css';
</style>
```

Cette page importe `doc-table.css` en plus de `doc-prose.css` : elle
contient un `<table>` (le tableau des 3 leviers), contrairement à
`appliquer-un-theme.astro` qui n'en a pas.

- [ ] **Step 2: Vérifier**

Run: `npm run build --workspace=apps/docs`
Expected: build réussit, `dist/theming/overview/index.html` existe, contient
le tableau des 3 leviers et un bloc `.next-step` avec 3 liens.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/pages/theming/overview.astro
git commit -m "feat(docs): ajoute la page Overview (Thème & Personnalisation)"
```

---

### Task 6: Réécrire la page Utilisation

**Files:**

- Modify: `apps/docs/src/pages/getting-started/utilisation.astro`

**Interfaces:**

- Consumes: `NextStep` (Task 4), `/theming/overview` (Task 5).
- Produces: rien de nouveau consommé ailleurs (les 4 nouvelles sections sont
  documentaires, pas des interfaces).

Remplacer l'intégralité du fichier `apps/docs/src/pages/getting-started/utilisation.astro`
par :

```astro
---
import Layout from '../../layouts/Layout.astro';
import TableOfContents from '../../components/TableOfContents.astro';
import NarrativeHeading from '../../components/NarrativeHeading.astro';
import NarrativeSubheading from '../../components/NarrativeSubheading.astro';
import NextStep from '../../components/NextStep.astro';

const tocEntries = [
    { id: 'composants',  label: 'Utiliser les composants',  level: 1 as const },
    { id: 'chargement',  label: 'Attendre le chargement',   level: 1 as const },
    { id: 'attributs',   label: 'Attributs & propriétés',   level: 1 as const },
    { id: 'slots',       label: 'Slots',                    level: 1 as const },
    { id: 'evenements',  label: 'Événements',                level: 1 as const },
    { id: 'methodes',    label: 'Méthodes',                  level: 1 as const },
];

const codeHtml = `<ar-alert version="success">
  <span slot="title">Succès</span>
  <span slot="content">Votre message a bien été envoyé.</span>
</ar-alert>

<ar-spinner></ar-spinner>`;

const codeWhenDefined = `await customElements.whenDefined('ar-alert');
const alert = document.querySelector('ar-alert');
alert.setAttribute('version', 'success');`;

const codeWhenAllDefinedNpm = `import { whenAllDefined } from '@ariane-ui/core';
await whenAllDefined();
// Tous les composants ar-* sont prêts`;

const codeWhenAllDefinedCdn = `const tags = [...new Set(
    [...document.querySelectorAll('*')]
        .map(el => el.localName)
        .filter(name => name.startsWith('ar-'))
)];
await Promise.all(tags.map(tag => customElements.whenDefined(tag)));
// Tous les composants ar-* sont prêts`;

const codeAttribute = `<ar-pagination current="1" total="10"></ar-pagination>`;

const codeBooleanAttribute = `<!-- Ces deux écritures activent "compact" -->
<ar-pagination compact></ar-pagination>
<ar-pagination compact="false"></ar-pagination>

<!-- Seule l'absence de l'attribut le désactive -->
<ar-pagination></ar-pagination>`;

const codeJsProperty = `const datepicker = document.querySelector('ar-datepicker');

// Désactive les dimanches
datepicker.isDateDisabled = (date) => date.getDay() === 0;`;

const codeDefaultSlot = `<ar-dialog label="Confirmation">
  <p>Voulez-vous vraiment supprimer cet élément ?</p>
</ar-dialog>`;

const codeNamedSlot = `<ar-collapse>
  <button slot="trigger">Afficher les détails</button>
  <p>Contenu affiché/masqué au clic sur le déclencheur.</p>
</ar-collapse>`;

const codeEventListener = `const pagination = document.querySelector('ar-pagination');

pagination.addEventListener('ar-pagination-page-changed', (event) => {
    console.log(\`Page changée : \${event.detail.from} → \${event.detail.to}\`);
});`;

const codeMethodCall = `const collapse = document.querySelector('ar-collapse');

await customElements.whenDefined('ar-collapse');
collapse.show();`;
---

<Layout
    title="Utilisation"
    currentPath="/getting-started/utilisation"
    showToc={true}
>
    <div class="page-container">
        <div class="page-header">
            <h2 class="page-title">Utilisation</h2>
            <p class="summary">
                Ces exemples supposent que vous avez suivi le guide de <a href="/getting-started/quickstart">Démarrage rapide</a>.<br />
                Ils s'appliquent quel que soit le mode d'intégration (CDN ou npm).
            </p>
        </div>

        <div class="narrative">
            <NarrativeHeading id="composants">Utiliser les composants</NarrativeHeading>
            <p>
                Les composants sont des Custom Elements natifs — ils s'utilisent directement
                en HTML, aucun framework requis.
            </p>
            <pre><code class="language-html" set:text={codeHtml} /></pre>

            <NarrativeHeading id="chargement">Attendre le chargement</NarrativeHeading>
            <p>
                Les Custom Elements s'enregistrent de manière asynchrone. Si votre code
                JavaScript interagit avec un composant au chargement de la page, attendez
                qu'il soit défini avant d'agir dessus.
            </p>

            <NarrativeSubheading>Un composant individuel</NarrativeSubheading>
            <pre><code class="language-js" set:text={codeWhenDefined} /></pre>

            <NarrativeSubheading>Tous les composants Ariane présents dans la page</NarrativeSubheading>
            <p>Via npm :</p>
            <pre><code class="language-js" set:text={codeWhenAllDefinedNpm} /></pre>
            <p>Via CDN (sans import) :</p>
            <pre><code class="language-js" set:text={codeWhenAllDefinedCdn} /></pre>

            <NarrativeHeading id="attributs">Attributs & propriétés</NarrativeHeading>
            <p>
                Comme tout élément HTML, les composants Ariane s'configurent par
                <strong>attributs</strong> (valeur texte, visible dans le HTML) ou par
                <strong>propriétés</strong> JavaScript (n'importe quelle valeur,
                y compris un objet ou une fonction).
            </p>
            <pre><code class="language-html" set:text={codeAttribute} /></pre>
            <p>
                Les attributs booléens suivent la convention native : leur simple
                présence suffit à activer le comportement, peu importe leur valeur.
            </p>
            <pre><code class="language-html" set:text={codeBooleanAttribute} /></pre>
            <p class="hint">
                Une <strong>propriété</strong> ne se pose qu'en JavaScript, jamais en
                attribut HTML — c'est le cas dès que la valeur n'est pas une chaîne de
                caractères (fonction, tableau, objet). Par exemple,
                <code>ar-datepicker</code> expose une propriété
                <code>isDateDisabled</code> pour désactiver certaines dates :
            </p>
            <pre><code class="language-js" set:text={codeJsProperty} /></pre>
            <p class="hint">
                La liste complète des attributs et propriétés de chaque composant est
                documentée dans sa <strong>Référence API</strong>, section
                « Attributs & Propriétés ».
            </p>

            <NarrativeHeading id="slots">Slots</NarrativeHeading>
            <p>
                Les <code>&lt;slot&gt;</code> permettent de projeter votre propre
                contenu à un emplacement précis du composant. Le <strong>slot par
                défaut</strong> (sans attribut <code>slot</code>) reçoit le contenu
                principal :
            </p>
            <pre><code class="language-html" set:text={codeDefaultSlot} /></pre>
            <p>
                Un <strong>slot nommé</strong> cible un emplacement spécifique via
                l'attribut <code>slot</code> sur l'élément projeté — par exemple, le
                déclencheur d'<code>ar-collapse</code> :
            </p>
            <pre><code class="language-html" set:text={codeNamedSlot} /></pre>
            <p class="hint">
                Les slots disponibles pour chaque composant sont documentés dans sa
                Référence API, section « Slots ».
            </p>
            <p class="hint">
                Pour plus d'information sur ce sujet, voir la
                <a href="https://developer.mozilla.org/fr/docs/Web/API/Web_components/Using_templates_and_slots"
                target="_blank" rel="noopener">documentation complète sur MDN</a>.
            </p>

            <NarrativeHeading id="evenements">Événements</NarrativeHeading>
            <p>
                Les composants Ariane émettent des <code>CustomEvent</code> standards,
                préfixés par le nom du tag (<code>ar-pagination-page-changed</code>,
                <code>ar-collapse-shown</code>...). Écoutez-les comme n'importe quel
                événement DOM :
            </p>
            <pre><code class="language-js" set:text={codeEventListener} /></pre>
            <p>
                Certains événements sont <strong>annulables</strong>
                (<code>event.preventDefault()</code> bloque le comportement par défaut)
                — c'est indiqué dans la colonne « Annulable » de leur Référence API.
            </p>
            <p class="hint">
                La liste complète des événements de chaque composant, avec le type de
                leur <code>detail</code>, est documentée dans sa Référence API, section
                « Événements ».
            </p>
            <p class="hint">
                Pour plus d'information sur ce sujet, voir la
                <a href="https://developer.mozilla.org/fr/docs/Web/API/CustomEvent"
                target="_blank" rel="noopener">documentation complète sur MDN</a>.
            </p>

            <NarrativeHeading id="methodes">Méthodes</NarrativeHeading>
            <p>
                Certaines actions s'appellent directement en JavaScript sur l'élément,
                une fois le composant défini :
            </p>
            <pre><code class="language-js" set:text={codeMethodCall} /></pre>
            <p class="hint">
                La liste des méthodes disponibles par composant est documentée dans sa
                Référence API, section « Méthodes ». Voir aussi la section précédente
                <a href="#chargement">Attendre le chargement</a> pour garantir que le
                composant est prêt avant d'appeler une méthode.
            </p>
        </div>

        <NextStep
            label="Prochaine étape :"
            links={[{ href: '/theming/overview', label: 'Appliquez un style à vos composants' }]}
        />
    </div>

    <TableOfContents entries={tocEntries} slot="toc" />
</Layout>

<style>
    @import '../../styles/doc-prose.css';
</style>
```

Ce fichier retire entièrement les anciens blocs "Thème et personnalisation"
et "Styles prêts à l'emploi" (migrés vers `theming/appliquer-un-theme.astro`
en Task 4) ainsi que les consts `codeCustomProps`/`codeTokens`/`codeTokensAlias`/`codePresets`
et le style `.download-theme`/`.page-summary` devenus inutiles ici.

- [ ] **Step 1: Vérifier**

Run: `npm run build --workspace=apps/docs`
Expected: build réussit, `dist/getting-started/utilisation/index.html`
contient les 4 nouvelles sections (`id="attributs"`, `id="slots"`,
`id="evenements"`, `id="methodes"`) et **ne contient plus** `id="personnalisation"`
ni `id="presets"`.

Run: `grep -n "download-theme\|codeCustomProps\|codePresets" apps/docs/src/pages/getting-started/utilisation.astro`
Expected: aucune occurrence.

- [ ] **Step 2: Commit**

```bash
git add apps/docs/src/pages/getting-started/utilisation.astro
git commit -m "feat(docs): ajoute Attributs/Slots/Événements/Méthodes à Utilisation, retire le thème"
```

---

### Task 7: Page Frameworks

**Files:**

- Create: `apps/docs/src/pages/getting-started/frameworks.astro`

**Interfaces:**

- Consumes: rien.
- Produces: URL `/getting-started/frameworks` — consommée par `SiteNav.astro` (Task 8).

- [ ] **Step 1: Créer `frameworks.astro`**

Créer `apps/docs/src/pages/getting-started/frameworks.astro` :

```astro
---
import Layout from '../../layouts/Layout.astro';
import TableOfContents from '../../components/TableOfContents.astro';
import NarrativeHeading from '../../components/NarrativeHeading.astro';

const tocEntries = [
    { id: 'react',   label: 'React',   level: 1 as const },
    { id: 'vue',     label: 'Vue',     level: 1 as const },
    { id: 'angular', label: 'Angular', level: 1 as const },
    { id: 'svelte',  label: 'Svelte',  level: 1 as const },
];

const codeReactUsage = `import { useEffect, useRef } from 'react';
import '@ariane-ui/core';

function Pagination() {
    const ref = useRef(null);

    useEffect(() => {
        const el = ref.current;
        const onChanged = (event) => console.log(event.detail.to);
        el.addEventListener('ar-pagination-page-changed', onChanged);
        return () => el.removeEventListener('ar-pagination-page-changed', onChanged);
    }, []);

    return <ar-pagination ref={ref} current={1} total={10} />;
}`;

const codeReactProperty = `// Propriété JS complexe : passe par une ref, comme pour tout DOM node.
useEffect(() => {
    if (datepickerRef.current) {
        datepickerRef.current.isDateDisabled = (date) => date.getDay() === 0;
    }
}, []);`;

const codeVueTemplate = `<ar-pagination :current="1" :total="10" @ar-pagination-page-changed="onChanged" />
<ar-datepicker :is-date-disabled="(date) => date.getDay() === 0" />`;

const codeVueScript = `function onChanged(event) {
    console.log(event.detail.to);
}`;

const codeViteConfig = `// vite.config.ts — indique à Vue de ne pas traiter les tags ar-* comme des
// composants Vue
export default defineConfig({
    plugins: [
        vue({
            template: {
                compilerOptions: {
                    isCustomElement: (tag) => tag.startsWith('ar-'),
                },
            },
        }),
    ],
});`;

const codeAngularTemplate = `<ar-pagination [current]="1" [total]="10" (ar-pagination-page-changed)="onChanged($event)">
</ar-pagination>
<ar-datepicker [isDateDisabled]="isSunday"></ar-datepicker>`;

const codeAngularModule = `@NgModule({
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppModule {}`;

const codeAngularHandler = `onChanged(event: CustomEvent<{ from: number; to: number }>) {
    console.log(event.detail.to);
}

isSunday = (date: Date) => date.getDay() === 0;`;

const codeSvelteScript = `import '@ariane-ui/core';

function onChanged(event) {
    console.log(event.detail.to);
}`;

const codeSvelteMarkup = `<ar-pagination current={1} total={10} on:ar-pagination-page-changed={onChanged} />
<ar-datepicker isDateDisabled={(date) => date.getDay() === 0} />`;
---

<Layout
    title="Frameworks"
    description="Utiliser les composants Ariane avec React, Vue, Angular ou Svelte."
    currentPath="/getting-started/frameworks"
    showToc={true}
>
    <div class="page-container">
        <div class="page-header">
            <h2 class="page-title">Frameworks</h2>
            <p class="summary">
                Ariane est bâtie sur les Custom Elements natifs — elle fonctionne donc
                avec n'importe quel framework, sans wrapper dédié. Chaque framework a
                cependant ses spécificités pour la liaison de propriétés complexes et
                l'écoute d'événements personnalisés, détaillées ci-dessous.
            </p>
        </div>

        <div class="narrative">
            <NarrativeHeading id="react">React</NarrativeHeading>
            <p>
                Installez le paquet (<code>npm install @ariane-ui/core</code>) puis
                importez-le une fois à un point d'entrée global — React ne rend pas les
                Custom Elements utilisables sans que leur classe soit enregistrée.
            </p>
            <pre><code class="language-javascript" set:text={codeReactUsage} /></pre>
            <p>
                Une propriété JS complexe (objet, fonction) passe par une ref, comme pour
                tout DOM node :
            </p>
            <pre><code class="language-javascript" set:text={codeReactProperty} /></pre>
            <p class="hint">
                React ne convertit pas automatiquement un événement custom kebab-case en
                prop <code>onX</code> — l'écoute passe toujours par
                <code>addEventListener</code> via une ref, quelle que soit la version de
                React.
            </p>

            <NarrativeHeading id="vue">Vue</NarrativeHeading>
            <p>
                Déclarez les tags <code>ar-*</code> comme éléments personnalisés dans la
                configuration Vite, pour que Vue ne tente pas de les résoudre comme ses
                propres composants :
            </p>
            <pre><code class="language-javascript" set:text={codeViteConfig} /></pre>
            <p>Dans le template :</p>
            <pre><code class="language-html" set:text={codeVueTemplate} /></pre>
            <p>Et le script associé :</p>
            <pre><code class="language-javascript" set:text={codeVueScript} /></pre>
            <p class="hint">
                Vue détecte automatiquement les propriétés JS existantes sur l'élément
                (comme <code>isDateDisabled</code>) et les affecte directement — pas de
                binding <code>.prop</code> à ajouter.
            </p>

            <NarrativeHeading id="angular">Angular</NarrativeHeading>
            <p>
                Ajoutez <code>CUSTOM_ELEMENTS_SCHEMA</code> au module qui utilise des
                composants Ariane, pour qu'Angular accepte des tags inconnus de son
                compilateur de template :
            </p>
            <pre><code class="language-typescript" set:text={codeAngularModule} /></pre>
            <p>Dans le template :</p>
            <pre><code class="language-html" set:text={codeAngularTemplate} /></pre>
            <p>Et le gestionnaire associé :</p>
            <pre><code class="language-typescript" set:text={codeAngularHandler} /></pre>
            <p class="hint">
                Le binding <code>[prop]</code> affecte toujours une propriété JS (jamais
                un attribut), donc les valeurs complexes passent sans configuration
                additionnelle.
            </p>

            <NarrativeHeading id="svelte">Svelte</NarrativeHeading>
            <p>Importez le paquet, puis utilisez les composants directement dans le markup :</p>
            <pre><code class="language-javascript" set:text={codeSvelteScript} /></pre>
            <pre><code class="language-html" set:text={codeSvelteMarkup} /></pre>
            <p class="hint">
                Svelte reconnaît les tags contenant un tiret comme des custom elements et
                affecte automatiquement les valeurs non-textuelles en propriété JS plutôt
                qu'en attribut.
            </p>
        </div>
    </div>

    <TableOfContents entries={tocEntries} slot="toc" />
</Layout>

<style>
    @import '../../styles/doc-prose.css';
</style>
```

- [ ] **Step 2: Vérifier**

Run: `npm run build --workspace=apps/docs`
Expected: build réussit, `dist/getting-started/frameworks/index.html` existe
et contient les 4 sections (`id="react"`, `id="vue"`, `id="angular"`,
`id="svelte"`).

Run: `grep -n "language-jsx\|language-vue\|language-svelte\|language-tsx" apps/docs/src/pages/getting-started/frameworks.astro`
Expected: aucune occurrence (cf. Global Constraints — grammaires non supportées par le bundle highlight.js chargé).

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/pages/getting-started/frameworks.astro
git commit -m "feat(docs): ajoute la page Frameworks (React/Vue/Angular/Svelte)"
```

---

### Task 8: Restructurer SiteNav.astro

**Files:**

- Modify: `apps/docs/src/components/SiteNav.astro`

**Interfaces:**

- Consumes: toutes les URLs créées/renommées dans les Tasks 1 à 7.
- Produces: rien de nouveau consommé ailleurs — dernière pièce du puzzle nav.

Cette tâche vient après toutes les précédentes : chaque URL référencée ici
doit déjà exister dans le dist.

- [ ] **Step 1: Remplacer les tableaux de liens statiques**

Dans `apps/docs/src/components/SiteNav.astro`, remplacer :

```ts
const gettingStartedLinks: NavLink[] = withCurrent([
    { href: '/getting-started/quickstart', label: 'Démarrage rapide' },
    { href: '/getting-started/utilisation', label: 'Utilisation' },
    { href: '/getting-started/i18n', label: 'Internationalisation' },
]);

const themingLinks: NavLink[] = withCurrent([
    { href: '/theming/parts-and-slots', label: 'Parts & Slots' },
    { href: '/theming/shadow-dom', label: 'Dans un shadow DOM applicatif' },
    { href: '/theming/tag-customization', label: 'Personaliser le préfixe des tags' },
]);

const resourcesLinks: NavLink[] = withCurrent([]);
```

par :

```ts
const gettingStartedLinks: NavLink[] = withCurrent([
    { href: '/getting-started/quickstart', label: 'Démarrage rapide' },
    { href: '/getting-started/utilisation', label: 'Utilisation' },
    { href: '/getting-started/frameworks', label: 'Frameworks' },
]);

const themingLinks: NavLink[] = withCurrent([
    { href: '/theming/overview', label: 'Overview' },
    { href: '/theming/appliquer-un-theme', label: 'Appliquer un thème' },
    { href: '/theming/personnalisation-avancee', label: 'Personnalisation avancée' },
    { href: '/theming/shadow-dom', label: 'Dans un shadow DOM applicatif' },
]);

const advancedUsageLinks: NavLink[] = withCurrent([
    { href: '/getting-started/traductions', label: 'Traductions' },
    { href: '/theming/tag-customization', label: 'Personnaliser le préfixe des tags' },
]);

const resourcesLinks: NavLink[] = withCurrent([]);
```

- [ ] **Step 2: Ajouter le bloc de nav "Utilisations avancées"**

Dans le template, entre le bloc "Thème & Personnalisation" et le bloc
`{resourcesLinks.length > 0 && (...)}`, ajouter :

```astro
        {advancedUsageLinks.length > 0 && (
            <div class="nav-section">
                <h2>Utilisations avancées</h2>
                <ul class="nav-list">
                    {advancedUsageLinks.map((link) => (
                        <li>
                            <a href={link.href} aria-current={link.ariaCurrent}>{link.label}</a>
                        </li>
                    ))}
                </ul>
            </div>
        )}
```

Le bloc doit s'insérer juste après la fermeture du `<div class="nav-section">`
de "Thème & Personnalisation" et juste avant le bloc conditionnel de
"Ressources", en suivant exactement le même patron JSX que celui-ci (accès
via `{...length > 0 && (...)}`, `<h2>`, `<ul class="nav-list">`,
`{...map((link) => (...))}`).

- [ ] **Step 3: Vérifier**

Run: `grep -n "getting-started/i18n\|theming/parts-and-slots\|getting-started/shadow-dom" apps/docs/src/components/SiteNav.astro`
Expected: aucune occurrence.

Run: `npm run build --workspace=apps/docs`
Expected: build réussit. Ouvrir `dist/getting-started/quickstart/index.html`
et vérifier visuellement (ou via grep du HTML généré) que les 4 groupes de
nav apparaissent dans l'ordre : Bien démarrer, Thème & Personnalisation,
Utilisations avancées, Composants (Ressources reste vide donc absent).

- [ ] **Step 4: Commit**

```bash
git add apps/docs/src/components/SiteNav.astro
git commit -m "refactor(docs): restructure la nav en 4 groupes (ajoute Utilisations avancées)"
```

---

### Task 9: check-build.js et vérification finale

**Files:**

- Modify: `apps/docs/scripts/check-build.js`

**Interfaces:**

- Consumes: toutes les URLs des Tasks 1 à 8.
- Produces: rien — tâche de clôture.

- [ ] **Step 1: Mettre à jour `EXPECTED_PAGES`**

Dans `apps/docs/scripts/check-build.js`, remplacer :

```js
const EXPECTED_PAGES = [
    'index.html',
    'getting-started/quickstart/index.html',
    'getting-started/utilisation/index.html',
    'getting-started/shadow-dom/index.html',
    'theming/parts-and-slots/index.html',
];
```

par :

```js
const EXPECTED_PAGES = [
    'index.html',
    'getting-started/quickstart/index.html',
    'getting-started/utilisation/index.html',
    'getting-started/frameworks/index.html',
    'getting-started/traductions/index.html',
    'theming/overview/index.html',
    'theming/appliquer-un-theme/index.html',
    'theming/personnalisation-avancee/index.html',
    'theming/shadow-dom/index.html',
    'theming/tag-customization/index.html',
];
```

- [ ] **Step 2: Grep de contrôle final**

Run:

```bash
grep -rn "getting-started/i18n\|getting-started/shadow-dom\|theming/parts-and-slots" apps/docs/src apps/docs/scripts
```

Expected: aucune occurrence dans tout `apps/docs` (les seules URLs encore
valides sont `theming/shadow-dom` et `theming/personnalisation-avancee`).

- [ ] **Step 3: Build + check-build + a11y**

Run: `npm run build --workspace=apps/docs`
Expected: build réussit.

Run: `node apps/docs/scripts/check-build.js`
Expected: exit 0, toutes les pages de `EXPECTED_PAGES` listées avec `✓`.

Run: `npm run test:a11y --workspace=apps/docs`
Expected: suite a11y verte sur toutes les pages, nouvelles incluses —
vérifier en particulier les tableaux (`theming/overview`,
`theming/personnalisation-avancee`) et les nouveaux liens `.hint` (contraste
déjà couvert par les tokens `--doc-*` issus de #110, aucune nouvelle couleur
introduite dans ce chantier).

- [ ] **Step 4: Vérification manuelle des snippets React/Vue/Angular/Svelte**

Relire chaque bloc de code de `frameworks.astro` (Task 7) contre le
fonctionnement réel connu de chaque framework face aux custom elements —
ces exemples ont été écrits par analogie (cf. spec, Contraintes globales) et
n'ont pas été exécutés dans un vrai projet. Si un doute subsiste sur un
comportement précis (ex. binding de propriété complexe Svelte), l'annoter
d'un commentaire `{/* à vérifier */}` plutôt que de le laisser affirmé sans
réserve — décision à trancher par l'implémenteur au moment de la relecture,
pas à deviner ici.

- [ ] **Step 5: Commit**

```bash
git add apps/docs/scripts/check-build.js
git commit -m "test(docs): met à jour EXPECTED_PAGES pour la nouvelle structure de pages"
```

## Tests global check (fin de plan)

Run: `npm test` (racine du repo)
Expected: 4/4 tâches Turborepo réussies (core build, core test, docs build,
docs test), comme pour #110.
