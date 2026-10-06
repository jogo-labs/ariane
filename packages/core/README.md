# @ariane-ui/core

Bibliothèque de composants web accessibles basée sur **Lit 3**.

Fait partie du monorepo [Ariane](../../README.md).

---

## Installation

```bash
npm install @ariane-ui/core
```

## Utilisation rapide

```html
<!-- CDN -->
<script type="module" src="node_modules/@ariane-ui/core/cdn/index.js"></script>
<link rel="stylesheet" href="./ariane-starter.css" />

<ar-alert variant="success">Opération réussie.</ar-alert>
```

Le `<link>` du thème est indispensable : sans lui, les composants ne sont pas stylés (voir la section [Thème](#thème) ci-dessous).

```typescript
// ESM avec bundler (tree-shakeable)
import '@ariane-ui/core';
import './ariane-starter.css';
```

### Thème

Ariane est headless : sans thème, aucun composant n'est stylé. Partez du thème neutre du [starter-kit](https://github.com/jogo-labs/ariane-starter-kit) (démo : [Kitchen Sink](https://jogo-labs.github.io/ariane-starter-kit/)) : copiez `ariane-starter.css` et le dossier `ariane-starter/` dans votre projet, puis adaptez-les.

```html
<link rel="stylesheet" href="./ariane-starter.css" />
```

Pour un essai rapide sans rien copier, le même thème est servi à `https://jogo-labs.github.io/ariane-starter-kit/ariane-starter.css` (non versionné, il suit la dernière release).

---

## Composants

| Composant    | Tag                | Description                                                                                |
| ------------ | ------------------ | ------------------------------------------------------------------------------------------ |
| Alert        | `<ar-alert>`       | Message contextuel (info, success, warning, error)                                         |
| Breadcrumb   | `<ar-breadcrumb>`  | Fil d'ariane de navigation, mobile et desktop (liens : `<ar-breadcrumb-item>`)             |
| Charcounter  | `<ar-charcounter>` | Caractères restants d'un champ de texte, avec alerte avant la limite                       |
| Collapse     | `<ar-collapse>`    | Résumé qui se déplie pour révéler du contenu additionnel                                   |
| Datepicker   | `<ar-datepicker>`  | Champ de saisie de date synchronisé avec un calendrier popover                             |
| Dialog       | `<ar-dialog>`      | Modale ou drawer qui capte l'attention                                                     |
| Dropdown     | `<ar-dropdown>`    | Panneau contextuel déclenché par un bouton, menu d'actions (items : `<ar-dropdown-item>`)  |
| Pagination   | `<ar-pagination>`  | Navigation entre pages                                                                     |
| Progress Bar | `<ar-progressbar>` | Barre de progression                                                                       |
| Spinner      | `<ar-spinner>`     | Indicateur de chargement                                                                   |
| Stepper      | `<ar-stepper>`     | Navigation multi-étapes avec sous-étapes, desktop et mobile (étapes : `<ar-stepper-item>`) |
| Tab Group    | `<ar-tab-group>`   | Onglets : un panneau affiché à la fois (`<ar-tab>`, `<ar-tab-panel>`)                      |
| Table Sort   | `<ar-table-sort>`  | Indicateur de tri sur un entête de colonne, avec confirmation asynchrone                   |
| Tooltip      | `<ar-tooltip>`     | Information contextuelle brève au survol ou au focus (WCAG 1.4.13)                         |

---

## Exports

```typescript
// Enregistre tous les composants
import '@ariane-ui/core';

// Import individuel (tree-shaking)
import '@ariane-ui/core/dist/components/alert/index.js';

// CDN bundle (Lit inclus), version de production
import '@ariane-ui/core/cdn';

// CDN autoloader (charge les composants à la demande), version de production
import '@ariane-ui/core/cdn/autoloader';

// Versions de développement (avertissements dans la console) : '@ariane-ui/core/cdn.dev'
// et '@ariane-ui/core/cdn/autoloader.dev'

// Manifest CEM (outillage et intégrations)
import manifest from '@ariane-ui/core/custom-elements.json';
```

---

## Pour les agents IA

Le paquet livre une Agent Skill `ariane` (`skills/ariane/`) qui décrit l'installation, l'usage, le thème, les traductions et l'API de chaque composant de la version installée.

Si votre agent IA prend en charge les skills, installez celle du paquet avec l'outil `skills` (observé avec la version 1.7.0, sur un paquet `npm pack` installé dans un projet vierge) :

```bash
npx skills experimental_sync -a <nom-de-votre-agent> -y
```

Exemple avec Claude Code (le seul agent testé) :

```bash
npx skills experimental_sync -a claude-code -y
```

- La commande (expérimentale, d'après son nom) cherche les skills livrées par les paquets de `node_modules` et installe `ariane` : copie dans `.agents/skills/ariane`, puis dossier de l'agent ciblé (observé pour Claude Code : lien `.claude/skills/ariane` vers cette copie). Elle installe aussi les skills livrées par d'autres paquets installés. L'option `-a` est décrite par `npx skills add --help`.
- Après une mise à jour de `@ariane-ui/core`, relancer la même commande : elle rafraîchit la skill si son contenu a changé, et répond « already up to date » sinon. Aucune notification automatique à la mise à jour du paquet, et `npx skills update` ne gère pas ce cas (observé : « No project skills to update » pour une skill installée depuis un chemin local).
- Alternative : `npx skills add ./node_modules/@ariane-ui/core/skills/ariane -a <nom-de-votre-agent> -y` copie la skill dans le dossier de l'agent et écrit un `skills-lock.json` ; la copie ne suit pas les mises à jour du paquet.
- Sans prise en charge des skills : `node_modules/@ariane-ui/core/llms/llms.txt` (et `llms-full.txt`, tout le contenu en un fichier).

Le déclenchement d'une skill relève du jugement de l'agent, qui peut ne pas la consulter. Facultatif : si vous constatez qu'elle n'est pas utilisée, vous pouvez ajouter au `CLAUDE.md` ou `AGENTS.md` de votre projet une ligne qui l'invoque explicitement, par exemple :

> Pour tout code utilisant `@ariane-ui/core` ou des balises `ar-*`, utiliser la skill `ariane` (ou lire `node_modules/@ariane-ui/core/llms/llms.txt`).

---

## Personnalisation CSS

Chaque composant expose des **CSS Custom Properties** pour la personnalisation sans modifier les sources :

```css
/* Exemple : personnaliser ar-alert */
ar-alert {
    --ar-alert-close-size: 2.5rem;
    --ar-alert-info-bg: #e0f2fe;
}
```

Les valeurs de design sont définies par le thème (voir le starter-kit) ; le composant n'en porte aucune.
Créez votre propre thème en définissant ces variables dans votre CSS global.

Trois leviers : les tokens `--ar-*`, les parts `::part()` (y compris les parts d'état), puis les états personnalisés `:state()`.

### CSS Parts

Les éléments internes (et des parts d'état) sont exposés via `::part()` pour un ciblage CSS précis :

```css
ar-alert::part(icon) {
    /* le conteneur de l'icône */
}
ar-alert::part(body) {
    /* le conteneur du contenu */
}
```

### États personnalisés

Chaque composant expose ses états via `:state()` ; la liste figure dans la référence API de la page du composant.

---

## Architecture interne

```
src/
├── components/          # Un répertoire par composant
│   └── alert/
│       ├── alert.ts          ← LitElement + JSDoc CEM
│       ├── alert.styles.ts   ← Styles Lit CSS
│       └── alert.test.ts     ← Tests Vitest
├── controllers/         # ReactiveControllers réutilisables
├── context/             # Providers @lit/context (communication parent-enfant)
├── internal/            # Utilitaires internes (defineComponent…)
├── state/               # Moteurs de calcul d'état purs
├── styles/              # CSS partagé
│   ├── themes/          ← Thème de la documentation (ariane.css)
│   └── components/      ← Styles utilitaires partagés
├── types/               # Interfaces TypeScript globales
├── utils/               # Utilitaires publics (sous-chemin @ariane-ui/core/utils)
└── index.ts             # Export barrel

scripts/skill/           # Sources de la skill et de llms.txt
skills/ et llms/         # Générés par build:skill, publiés avec le paquet
```

### Patterns clés

**Propriétés réactives** — toujours `reflect: true` pour synchroniser l'attribut HTML :

```typescript
@property({ reflect: true })
variant: 'filled' | 'outlined' = 'filled';
```

**Événements custom** — toujours `bubbles` + `composed` pour traverser le Shadow DOM :

```typescript
this.dispatchEvent(new CustomEvent('ar-change', { bubbles: true, composed: true }));
```

**Composition parent-enfant** — via `@lit/context` :
Le parent expose un `ContextProvider`, l'enfant souscrit via `ContextConsumer`.
Voir `stepper/` et `stepper-item/` pour un exemple complet.

**Composants sans Shadow DOM** — les composants conteneurs de données (ex : `ar-stepper-item`)
surchargent `createRenderRoot()` pour retourner `this` et éviter l'encapsulation CSS.

---

## Build

```bash
npm run build             # Build complet
npm run build:manifest    # Génère custom-elements.json depuis la JSDoc
npm run build:bundles     # dist/ (npm) + cdn/ (CDN)
npm run build:css         # Thèmes CSS
npm run build:types       # Déclarations TypeScript
```

Le build est orchestré par des scripts esbuild dans `scripts/`.

### Outputs

| Répertoire                          | Contenu                                                |
| ----------------------------------- | ------------------------------------------------------ |
| `dist/`                             | ESM tree-shakeable, Lit en peer dependency             |
| `cdn/`                              | Bundle auto-contenu (Lit inclus), minifié              |
| `dist/custom-elements.json`         | Manifest CEM — source de vérité pour la doc et les IDE |
| `dist/styles/themes/`               | Fichiers CSS de thème prêts à l'emploi                 |
| `dist/vscode.html-custom-data.json` | Autocomplétion HTML VS Code                            |
| `dist/vscode.css-custom-data.json`  | Autocomplétion CSS VS Code                             |

---

## Custom Elements Manifest (CEM)

Le fichier `custom-elements.json` est généré automatiquement par
`@custom-elements-manifest/analyzer` depuis les annotations JSDoc des composants.

### Annotations JSDoc reconnues

```typescript
/**
 * @summary Description courte du composant.
 * @display demo              ← mode d'affichage dans la doc (demo | docs)
 * @parent ar-stepper         ← déclare ce composant comme enfant de ar-stepper
 * @localized                 ← affiche la section "Traduction" (mécanisme lang/LocalizeController)
 *
 * @slot                      ← slot par défaut
 * @slot prefix               ← slot nommé
 *
 * @csspart base              ← CSS part exposé
 *
 * @cssprop --ar-alert-info-bg  ← CSS custom property
 *
 * @event {CustomEvent} ar-alert-close ← événement émis
 */
```

```typescript
/** @ignore */ // exclut ce membre des contrôles du playground
internalState = false;
```

Le CEM est consommé par :

- Le site de documentation (pages composants, playground, référence API)
- Les intégrations IDE VS Code (autocomplétion)
- Potentiellement : wrappers React/Vue générés automatiquement

---

## Tests

```bash
npm run test           # passe unique (CI)
npm run test:watch     # mode interactif (dev)
npm run test:coverage  # rapport de couverture
```

Environnement : **Vitest** + **happy-dom** (DOM léger sans navigateur).

```typescript
async function fixture<T extends HTMLElement>(html: string): Promise<T> {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const el = template.content.firstElementChild as T;
    document.body.appendChild(el);
    await (el as any).updateComplete;
    return el;
}
```

---

## Crédits

L'infrastructure i18n s'appuie sur [`@shoelace-style/localize`](https://github.com/shoelace-style/localize)
(MIT), la micro-librairie de traduction de Shoelace. Ariane s'inspire plus largement de
[WebAwesome](https://webawesome.com/) (successeur de Shoelace) comme référence de conception pour
plusieurs de ses composants et mécanismes.

---

## Contribuer

Voir [CONTRIBUTING.md](../../CONTRIBUTING.md) pour le workflow complet.
