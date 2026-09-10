# Refonte du contenu et de l'organisation des pages de contenu de la doc (#214)

## Contexte

Le chantier #110 (mergé, PR #213) a unifié les tokens CSS, la typographie et la
structure de navigation d'`apps/docs`. Cette spec couvre le second volet,
distinct : approfondir le **contenu** des pages hors composants (section
_Bien démarrer_, _Thème & Personnalisation_, nouvelle section _Utilisations
avancées_) et achever leur réorganisation.

Référence de style : [webawesome.com/docs/usage](https://webawesome.com/docs/usage)
et [webawesome.com/docs/frameworks](https://webawesome.com/docs/frameworks/).
WebAwesome ne présuppose aucune connaissance préalable des custom elements
tout en restant utile à un lecteur expérimenté — c'est le niveau visé ici,
sans copier leur profondeur (pas de wrappers framework, pas de guide SSR).

Un travail exploratoire a déjà été commencé manuellement (branche
`feat/docs-content-reorg-214`, issu d'un stash) : déplacement de
`shadow-dom.astro` et `tag-customization.astro` vers `theming/`, allègement de
`quickstart.astro`. Cette spec absorbe et complète ce travail — elle n'en
repart pas de zéro. Points restant à corriger dans ce travail exploratoire :

- `theming/shadow-dom.astro` a encore `currentPath="/getting-started/shadow-dom"`
  et un `<Layout title="Ariane dans un shadow DOM applicatif">` divergent du
  `h2.page-title` — à aligner sur la nouvelle URL/nav.
- `quickstart.astro` : la TOC contient encore une entrée `prefix` commentée
  (dead code) à supprimer, cohérente avec le déplacement du renommage de tag
  vers sa propre page.

## Non-objectifs

- Pages composants (`apps/docs/src/pages/components/`, `ComponentApi.astro`) :
  hors scope, déjà complètes et auto-générées depuis le CEM.
- Wrappers framework (`@ariane-ui/core/react`, etc.) : non prévus, la page
  Frameworks documente l'usage des custom elements natifs tels quels.
- Redirections d'URL pour les pages déplacées/renommées : la doc n'a pas
  d'audience externe à ce stade (cf. décision prise sur #110 concernant
  `naming-conventions.astro` — même raisonnement ici, aucune redirection à
  prévoir pour `i18n` → `traductions`, `getting-started/shadow-dom` →
  `theming/shadow-dom`, etc.)

## 1. Navigation cible

```
Bien démarrer
  ├─ Démarrage rapide            /getting-started/quickstart      (inchangée, déjà allégée)
  ├─ Utilisation                 /getting-started/utilisation     (augmentée, §3)
  └─ Frameworks                  /getting-started/frameworks      (nouvelle, §5)

Thème & Personnalisation
  ├─ Overview                    /theming/overview                 (nouvelle, §4)
  ├─ Appliquer un thème          /theming/appliquer-un-theme        (nouvelle, contenu extrait d'Utilisation)
  ├─ Styles prêts à l'emploi     /theming/styles-prets-a-l-emploi   (nouvelle, contenu extrait d'Utilisation)
  ├─ Personnalisation avancée    /theming/personnalisation-avancee  (ex parts-and-slots.astro, renommée, §6)
  └─ Dans un shadow DOM applicatif /theming/shadow-dom              (déjà déplacée, corrections §Contexte)

Utilisations avancées            (nouveau groupe de nav top-level)
  ├─ Traductions                 /getting-started/traductions       (ex i18n.astro, renommée+déplacée, §7)
  └─ Personnaliser le préfixe des tags /theming/tag-customization   (déplacée depuis `theming/` vers ce groupe, §8)

Ressources
  └─ (vide, inchangé)
```

Le groupe "Thème & Personnalisation" garde son libellé de nav actuel — seul
le titre `h2.page-title` de la page qui traite spécifiquement du chargement
de thème devient "Appliquer un thème à vos composants", pour éviter une
quasi-duplication de libellé entre le groupe et une page dans la sidebar.

`tag-customization.astro` change de **groupe de nav** (theming →
Utilisations avancées) mais reste au même chemin `theming/tag-customization`
— aucun renommage de fichier/URL nécessaire, seule l'entrée dans
`SiteNav.astro` change de tableau.

### `SiteNav.astro` — structure cible

```ts
const gettingStartedLinks: NavLink[] = withCurrent([
    { href: '/getting-started/quickstart', label: 'Démarrage rapide' },
    { href: '/getting-started/utilisation', label: 'Utilisation' },
    { href: '/getting-started/frameworks', label: 'Frameworks' },
]);

const themingLinks: NavLink[] = withCurrent([
    { href: '/theming/overview', label: 'Overview' },
    { href: '/theming/appliquer-un-theme', label: 'Appliquer un thème' },
    { href: '/theming/styles-prets-a-l-emploi', label: "Styles prêts à l'emploi" },
    { href: '/theming/personnalisation-avancee', label: 'Personnalisation avancée' },
    { href: '/theming/shadow-dom', label: 'Dans un shadow DOM applicatif' },
]);

const advancedUsageLinks: NavLink[] = withCurrent([
    { href: '/getting-started/traductions', label: 'Traductions' },
    { href: '/theming/tag-customization', label: 'Personnaliser le préfixe des tags' },
]);

const resourcesLinks: NavLink[] = withCurrent([]);
```

Le template ajoute un 4ᵉ bloc `<div class="nav-section">` pour
`advancedUsageLinks`, sous le même patron que les 3 blocs existants
(titre "Utilisations avancées" + `{advancedUsageLinks.length > 0 && (...)}`),
inséré entre le bloc Theming et le bloc Resources.

## 2. Motif "Prochaine étape"

Nouveau motif réutilisé sur 4 pages (Utilisation, Overview, Appliquer un
thème, Styles prêts à l'emploi) : un bloc de navigation contextuelle placé
en sibling de `.narrative`, à l'intérieur de `.page-container` (donc dans le
flux principal, hors TOC — qui reste dans `slot="toc"`). Composant dédié
`NextStep.astro` :

```astro
---
// apps/docs/src/components/NextStep.astro
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

Styles (`doc-prose.css`, nouvelle règle) :

```css
:global(.next-step) {
    margin-top: var(--doc-space-section);
    padding-top: var(--doc-space-subsection);
    border-top: 1px solid var(--doc-border);
}

:global(.next-step ul) {
    margin-top: 0.5rem;
}
```

Usage en fin de page Utilisation :

```astro
<NextStep
    label="Prochaine étape :"
    links={[{ href: '/theming/overview', label: 'Appliquez un style à vos composants' }]}
/>
```

Usage en fin de page Overview (liste) :

```astro
<NextStep
    label="Prochaine étape : choisissez votre point d'entrée"
    links={[
        { href: '/theming/appliquer-un-theme', label: 'Appliquer un thème' },
        { href: '/theming/styles-prets-a-l-emploi', label: 'Styles prêts à l\'emploi' },
        { href: '/theming/personnalisation-avancee', label: 'Personnalisation avancée' },
        { href: '/theming/shadow-dom', label: 'Dans un shadow DOM applicatif' },
    ]}
/>
```

## 3. Page Utilisation — sections ajoutées

Fichier : `apps/docs/src/pages/getting-started/utilisation.astro`.

Plan final de la page, dans l'ordre :

1. Utiliser les composants _(inchangé)_
2. Attendre le chargement _(inchangé)_
3. **Attributs & propriétés** _(nouveau)_
4. **Slots** _(nouveau)_
5. **Événements** _(nouveau)_
6. **Méthodes** _(nouveau)_
7. `<NextStep>` vers `/theming/overview`

Les blocs "Thème et personnalisation" et "Styles prêts à l'emploi" actuels
(lignes 99–158 du fichier actuel) sont **retirés** de cette page — leur
contenu migre tel quel vers `theming/appliquer-un-theme.astro` et
`theming/styles-prets-a-l-emploi.astro` (§9), `tocEntries` mis à jour en
conséquence (entrées `personnalisation`/`presets` retirées, `attributs`,
`slots`, `evenements`, `methodes` ajoutées).

Ton : chaque section part d'une phrase générale (le concept, valable pour
tout custom element) puis l'illustre avec un composant Ariane réel, et
referme sur un renvoi vers la Référence API de chaque page composant pour le
détail exhaustif — jamais de duplication des tableaux auto-générés.

### 3.1 Attributs & propriétés

```astro
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
```

```js
const codeAttribute = `<ar-pagination current="1" total="10"></ar-pagination>`;

const codeBooleanAttribute = `<!-- Ces deux écritures activent "compact" -->
<ar-pagination compact></ar-pagination>
<ar-pagination compact="false"></ar-pagination>

<!-- Seule l'absence de l'attribut le désactive -->
<ar-pagination></ar-pagination>`;

const codeJsProperty = `const datepicker = document.querySelector('ar-datepicker');

// Désactive les dimanches
datepicker.isDateDisabled = (date) => date.getDay() === 0;`;
```

### 3.2 Slots

```astro
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
```

```js
const codeDefaultSlot = `<ar-dialog label="Confirmation">
  <p>Voulez-vous vraiment supprimer cet élément ?</p>
</ar-dialog>`;

const codeNamedSlot = `<ar-collapse>
  <button slot="trigger">Afficher les détails</button>
  <p>Contenu affiché/masqué au clic sur le déclencheur.</p>
</ar-collapse>`;
```

### 3.3 Événements

```astro
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
```

```js
const codeEventListener = `const pagination = document.querySelector('ar-pagination');

pagination.addEventListener('ar-pagination-page-changed', (event) => {
    console.log(\`Page changée : \${event.detail.from} → \${event.detail.to}\`);
});`;
```

### 3.4 Méthodes

```astro
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
```

```js
const codeMethodCall = `const collapse = document.querySelector('ar-collapse');

await customElements.whenDefined('ar-collapse');
collapse.show();`;
```

## 4. Nouvelle page Overview (Thème & Personnalisation)

Fichier : `apps/docs/src/pages/theming/overview.astro`. Premier lien du
groupe de nav "Thème & Personnalisation". `showToc={false}` (page courte,
essentiellement des liens).

Objectif pédagogique : quelqu'un qui découvre les custom elements comprend
_pourquoi_ Ariane ne ressemble à rien visuellement par défaut ; quelqu'un
d'expérimenté peut sauter directement à la page qui l'intéresse.

```astro
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
                Si vous découvrez tout juste les Custom Elements, commencez par
                <a href="/theming/appliquer-un-theme">Appliquer un thème</a> — les autres
                pages partent du principe que le thème par défaut est chargé.
            </p>
        </div>

        <NextStep
            label="Prochaine étape : choisissez votre point d'entrée"
            links={[
                { href: '/theming/appliquer-un-theme', label: 'Appliquer un thème' },
                { href: '/theming/styles-prets-a-l-emploi', label: 'Styles prêts à l\'emploi' },
                { href: '/theming/personnalisation-avancee', label: 'Personnalisation avancée' },
                { href: '/theming/shadow-dom', label: 'Dans un shadow DOM applicatif' },
            ]}
        />
    </div>
</Layout>
```

## 5. Nouvelle page Frameworks

Fichier : `apps/docs/src/pages/getting-started/frameworks.astro`.
`showToc={true}`, une `NarrativeHeading` par framework (React, Vue, Angular,
Svelte), chaque bloc autonome — pas de fil narratif imposé entre frameworks,
un lecteur ne consulte que le sien.

Chapô commun (inspiré du "Web Awesome is built on standard web components,
so it works with any framework") :

```astro
<p class="summary">
    Ariane est bâtie sur les Custom Elements natifs — elle fonctionne donc
    avec n'importe quel framework, sans wrapper dédié. Chaque framework a
    cependant ses spécificités pour la liaison de propriétés complexes et
    l'écoute d'événements personnalisés, détaillées ci-dessous.
</p>
```

Chaque section suit le même trio d'exemples : rendu + attribut simple,
écoute d'un événement custom (`ar-pagination-page-changed`), affectation
d'une propriété JS complexe (`ar-datepicker.isDateDisabled`) — cohérent avec
les exemples de la page Utilisation (§3).

### 5.1 React

```jsx
// Installation : npm install @ariane-ui/core, puis import '@ariane-ui/core';
// à un point d'entrée global (React ne rend pas les Custom Elements
// utilisables sans que leur classe soit enregistrée).

function Pagination() {
    const ref = useRef(null);

    useEffect(() => {
        const el = ref.current;
        const onChanged = (event) => console.log(event.detail.to);
        el.addEventListener('ar-pagination-page-changed', onChanged);
        return () => el.removeEventListener('ar-pagination-page-changed', onChanged);
    }, []);

    return <ar-pagination ref={ref} current={1} total={10} />;
}
```

```jsx
// Propriété JS complexe : passe par une ref, comme pour tout DOM node.
useEffect(() => {
    if (datepickerRef.current) {
        datepickerRef.current.isDateDisabled = (date) => date.getDay() === 0;
    }
}, []);
```

Avertissement (hint) : React ne convertit pas automatiquement un événement
custom kebab-case en prop `onX` — l'écoute passe toujours par
`addEventListener` via une ref, quelle que soit la version de React.

### 5.2 Vue

```vue
<script setup>
function onChanged(event) {
    console.log(event.detail.to);
}
</script>

<template>
    <ar-pagination :current="1" :total="10" @ar-pagination-page-changed="onChanged" />
    <ar-datepicker :is-date-disabled="(date) => date.getDay() === 0" />
</template>
```

```js
// vite.config.ts — indique à Vue de ne pas traiter les tags ar-* comme des
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
});
```

Hint : Vue détecte automatiquement les propriétés JS existantes sur
l'élément (comme `isDateDisabled`) et les affecte directement — pas de
binding `.prop` à ajouter.

### 5.3 Angular

```html
<ar-pagination [current]="1" [total]="10" (ar-pagination-page-changed)="onChanged($event)">
</ar-pagination>
<ar-datepicker [isDateDisabled]="isSunday"></ar-datepicker>
```

```ts
@NgModule({
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppModule {}
```

```ts
onChanged(event: CustomEvent<{ from: number; to: number }>) {
    console.log(event.detail.to);
}

isSunday = (date: Date) => date.getDay() === 0;
```

Hint : `CUSTOM_ELEMENTS_SCHEMA` est requis pour qu'Angular accepte des tags
inconnus de son compilateur de template. Le binding `[prop]` affecte
toujours une propriété JS (jamais un attribut), donc les valeurs complexes
passent sans configuration additionnelle.

### 5.4 Svelte

```svelte
<script>
    import '@ariane-ui/core';

    function onChanged(event) {
        console.log(event.detail.to);
    }
</script>

<ar-pagination current={1} total={10} on:ar-pagination-page-changed={onChanged} />
<ar-datepicker isDateDisabled={(date) => date.getDay() === 0} />
```

Hint : Svelte reconnaît les tags contenant un tiret comme des custom
elements et affecte automatiquement les valeurs non-textuelles en propriété
JS plutôt qu'en attribut.

## 6. Page Personnalisation avancée (ex Parts & Slots)

Fichier : `apps/docs/src/pages/theming/personnalisation-avancee.astro`
(renommé depuis `parts-and-slots.astro`).

Changements sur le contenu existant (cf. fichier actuel, lu intégralement
pendant le brainstorming) :

- `<Layout title="Parts & Slots" ...>` → `title="Personnalisation avancée"`,
  `currentPath="/theming/personnalisation-avancee"`.
- `h2.page-title` → "Personnalisation avancée".
- Description Layout mise à jour : "Vocabulaire de CSS part sémantiques et
  parts d'état partagés par tous les composants Ariane." (retire la mention
  slots).
- **Section "Conventions de slot" (id `slots`, lignes 203–229 du fichier
  actuel) intégralement retirée** — jugée hors-sujet du titre recentré sur
  les `::part()`, et redondante avec la section Slots ajoutée à la page
  Utilisation (§3.2).
- `tocEntries` : retirer l'entrée `{ id: 'slots', ... }`.
- Les deux sections restantes ("CSS Part sémantiques", "Parts d'état") et
  leurs deux tableaux (`#roles-table`, `#states-table`) sont conservées à
  l'identique.

## 7. Page Traductions (ex i18n)

Fichier : `apps/docs/src/pages/getting-started/traductions.astro` (renommé
depuis `getting-started/i18n.astro`, reste dans le groupe de nav
"Utilisations avancées" — voir §1, le fichier change de groupe de nav mais
reste sous `getting-started/` par cohérence avec les autres pages narratives
non-thématiques).

Changements sur le contenu existant :

- `<Layout title="Internationalisation (i18n)" currentPath="/getting-started/i18n" ...>`
  → `title="Traductions"`, `currentPath="/getting-started/traductions"`.
- `h2.page-title` "Internationalisation" → "Traductions".
- Contenu narratif (fonctionnement, résolution de langue, création d'une
  traduction, traductions disponibles) inchangé — déjà clair et complet,
  seul le habillage (titre/URL) change.
- `ComponentApi.astro` référence déjà `/getting-started/i18n` dans son bloc
  "Traduction" (ligne ~48, lu pendant le brainstorming initial du chantier
  #110) — mettre à jour ce lien vers `/getting-started/traductions`.

## 8. Page Personnaliser le préfixe des tags

Fichier : `apps/docs/src/pages/theming/tag-customization.astro` — **aucun
changement de contenu ni d'URL**, uniquement un changement de groupe de nav
(theming → Utilisations avancées, cf. §1). Le fichier reste physiquement
sous `theming/` (son URL ne change pas) : seule l'entrée dans
`SiteNav.astro` change de tableau (`themingLinks` → `advancedUsageLinks`).

## 9. Pages extraites d'Utilisation

### 9.1 Appliquer un thème

Fichier : `apps/docs/src/pages/theming/appliquer-un-theme.astro` (nouveau).
Contenu repris à l'identique du bloc "Thème et personnalisation" actuel de
`utilisation.astro` (lignes 99–147 du fichier lu pendant le brainstorming :
paragraphe headless, sous-sections "Charger un thème", "Personnaliser une
instance", "Personnaliser toute la librairie") — seul l'habillage change
(`h2.page-title` = "Appliquer un thème à vos composants",
`currentPath="/theming/appliquer-un-theme"`), plus un `<NextStep>` en pied
de page :

```astro
<NextStep
    label="Prochaine étape :"
    links={[{ href: '/theming/styles-prets-a-l-emploi', label: 'Styles prêts à l\'emploi' }]}
/>
```

### 9.2 Styles prêts à l'emploi

Fichier : `apps/docs/src/pages/theming/styles-prets-a-l-emploi.astro`
(nouveau). Contenu repris à l'identique du bloc "Styles prêts à l'emploi"
actuel de `utilisation.astro` (lignes 148–158) — `h2.page-title` = "Styles
prêts à l'emploi", `currentPath="/theming/styles-prets-a-l-emploi"`, plus un
`<NextStep>` :

```astro
<NextStep
    label="Prochaine étape :"
    links={[{ href: '/theming/personnalisation-avancee', label: 'Personnalisation avancée' }]}
/>
```

## Contraintes globales

- Tout le contenu reste en français (site 100% français).
- Chaque nouvelle page importe `doc-prose.css` (et `doc-table.css` si elle
  contient un tableau), suit le patron `Layout` + `.page-container` +
  `.page-header` + `.narrative` déjà en place partout (cf. #110).
- Titres de section via `NarrativeHeading`/`NarrativeSubheading` avec `id`
  explicite (mécanisme unique retenu sur #110 — pas de retour aux wrappers
  `.main-section`/`.subsection`).
- Aucune redirection d'URL pour les pages déplacées/renommées (cf.
  Non-objectifs).
- Tout exemple de code doit référencer un composant, un attribut, un
  événement ou une méthode **réellement existants** dans
  `packages/core` — chaque exemple des §3 et §9 a déjà été vérifié contre
  `packages/core/dist/custom-elements.json` pendant la rédaction de cette
  spec (`ar-pagination`, `ar-collapse`, `ar-datepicker.isDateDisabled`,
  `ar-dialog`). Les comportements par-framework du §5 restent eux non
  vérifiés empiriquement (documentés par analogie avec le fonctionnement
  connu de chaque framework face aux custom elements) — à valider avec un
  repro réel avant publication, pas seulement documentés par déduction.

## Tests / vérification

- `npm run build --workspace=apps/docs` : toutes les nouvelles pages
  doivent apparaître dans la sortie de build.
- `apps/docs/scripts/check-build.js` : `EXPECTED_PAGES` mis à jour avec
  toutes les nouvelles URLs (`theming/overview`, `theming/appliquer-un-theme`,
  `theming/styles-prets-a-l-emploi`, `theming/personnalisation-avancee`,
  `getting-started/frameworks`, `getting-started/traductions`) et sans les
  anciennes (`getting-started/i18n`).
- Suite a11y/axe-core existante : doit rester verte sur toutes les pages,
  nouvelles incluses (tableaux, liens, contraste des blocs `.hint`/`.summary`
  déjà couverts par les tokens `--doc-*` issus de #110).
- Grep de contrôle : aucune référence résiduelle à
  `/getting-started/i18n`, `/getting-started/shadow-dom`, ou
  `/theming/parts-and-slots` après renommage (liens internes,
  `ComponentApi.astro`, `SiteNav.astro`).
- Vérification manuelle : chaque snippet de code des sections 3, 5 relu et
  testé (au moins mentalement contre le CEM) avant merge — pas de propriété,
  événement ou méthode inventés.
