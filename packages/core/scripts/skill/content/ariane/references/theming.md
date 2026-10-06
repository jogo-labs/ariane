# Thème et personnalisation

## Principe

- Ariane est headless : aucun style visuel sans thème. Les composants fonctionnent (accessibilité, interactions, slots) mais leur apparence est brute tant qu'une feuille CSS n'est pas chargée.
- Un thème est une feuille CSS ordinaire qui pose des valeurs sur le contrat de chaque composant : ses propriétés CSS personnalisées (`--ar-*`), ses `::part()` et ses états CSS (`:state()`).
- Ce contrat est listé par composant dans `components/<tag>.md` (voir `components/index.md`) : propriétés CSS, parts, états CSS. Ne jamais supposer un token ou une part absents de ces fichiers.
- Trois leviers, du plus large au plus fin :

| Levier                                 | Portée                                                                | Quand l'utiliser                                             |
| -------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------ |
| Propriété CSS personnalisée (`--ar-*`) | Toute la page, ou une instance via une classe                         | Couleurs, espacements, typographie : la majorité des besoins |
| `::part()`                             | Une partie interne précise d'un composant                             | Layout ou style qu'aucun token ne couvre                     |
| État CSS `:state(x)`                   | Le composant (`:state(x)`) ou une de ses parts (`:state(x)::part(y)`) | Styliser selon un état du composant (ouvert, désactivé…)     |

- Les trois leviers ne couvrent que le shadow DOM des composants. Un bouton, un `<input>` ou un `<textarea>` placé en slot reste du HTML natif : le CSS de la page le stylise (voir `## Presets`).
- Chrome et Edge avant 125 : les états CSS portent le préfixe `--` (`:--open`), voir `installation.md`.

## Appliquer un thème

Le thème de départ est celui du starter-kit : https://github.com/jogo-labs/ariane-starter-kit (démo Kitchen Sink : https://jogo-labs.github.io/ariane-starter-kit/). Il gère les modes clair et sombre et sert directement, ou de base pour un thème propre. Copier ses fichiers CSS dans le projet, puis les charger.

- Aucune feuille de thème de départ n'est versionnée (ni sur npm, ni sur le CDN `unpkg`) : les fichiers du starter-kit se copient depuis GitHub. Le paquet contient `themes/ariane.css` et `themes/ariane.js`, mais c'est le thème de la documentation d'Ariane : interne, sans garantie de stabilité ; ne jamais le charger, l'importer, le recommander ni s'en servir de base.
- Le point d'entrée du starter est `ariane-starter.css`, une liste d'`@import` de ses fragments.

Avec un bundler, depuis la copie locale :

```js
import './ariane-starter.css';
```

Sans build, dans le `<head>`, avec la copie hébergée par le projet :

```html
<link rel="stylesheet" href="/ariane-starter.css" />
```

Dans un shadow DOM applicatif : voir `## Shadow DOM applicatif`.

| Fichier publié                                       | Export npm                          |
| ---------------------------------------------------- | ----------------------------------- |
| `dist/styles/themes/<nom>.css` (interne : voir note) | `@ariane-ui/core/themes/<nom>.css`  |
| `dist/styles/themes/<nom>.js` (interne : voir note)  | `@ariane-ui/core/themes/<nom>.js`   |
| `dist/styles/presets/<nom>.css`                      | `@ariane-ui/core/presets/<nom>.css` |

Note : les lignes `themes/<nom>` ci-dessus sont le thème de la documentation d'Ariane, interne, sans garantie de stabilité : ne pas charger ni recommander ; partir du starter-kit.

- Sans thème de la page ou de l'application, aucun composant n'est stylé : charger un thème (celui du starter-kit ou le vôtre) est la première chose à vérifier quand un composant paraît « brut ».
- Pour un thème propre : partir de la copie du starter-kit, ou écrire une feuille qui valorise les tokens et les `::part()` des composants utilisés.

## Structure du thème du starter-kit

`ariane-starter.css` est une liste d'`@import`, chacun placé dans `layer(ariane.theme)` ; l'arbre de fragments ci-dessous est le sien (palette neutre) :

| Fragment                                  | Contenu                                                                                                                                       |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `_palette.css`                            | Palette brute (échelles de couleurs)                                                                                                          |
| `_semantic-tokens.css`                    | Alias sémantiques (`--ar-color-success-*`, `--ar-color-danger-*`, `--ar-color-text`…) vers la palette                                         |
| `_global-tokens.css`                      | Tokens globaux : typographie (`--ar-font-size-*`), espacement et forme (`--ar-spacing-*`, `--ar-border-radius-*`), `color-scheme: light dark` |
| `shared/_panel.css`, `shared/_anchor.css` | Tokens partagés par les composants à panneau flottant (`--ar-panel-*`)                                                                        |
| `components/_<nom>.css`                   | Un fichier par composant stylé : tokens `--ar-<nom>-*` et règles `::part()`                                                                   |

- Le starter-kit stylise tous les composants racine (un fragment par composant dans `components/`) ; un sous-composant (item, panneau…) est stylé par le fragment de son parent.
- Les valeurs de la palette du starter ne font pas partie du contrat : ne pas les recopier ni s'y fier. Les alias sémantiques et les tokens par composant sont le point d'accroche.
- Deux tokens de bordure : `--ar-color-border` pour les séparateurs et panneaux décoratifs, `--ar-color-border-strong` pour la frontière d'un contrôle (champ, bouton à bordure), qui garde un contraste d'au moins 3:1 (WCAG 1.4.11). Un contrôle personnalisé dont la bordure l'identifie utilise le second.
- Toutes les règles du thème sont dans `@layer ariane.theme`. Une règle hors de toute couche l'emporte sur une règle en couche, quelle que soit la spécificité : le CSS de l'application (non layered) surcharge le thème sans `!important` ni sélecteur renforcé.
- Si l'application utilise elle-même des couches, c'est l'ordre de déclaration des couches qui décide : déclarer `ariane.theme` avant la couche de l'application.
- Les tokens du thème sont posés sur `:root` : surcharger au même niveau.

```css
:root {
    --ar-alert-color: #2e2e31;
    --ar-alert-close-size: 2rem;
}
```

- Pointer les tokens Ariane vers ceux d'un design system existant plutôt que dupliquer les valeurs : le nom du token Ariane reste stable, sa valeur suit celle du design system (mode sombre inclus s'il est géré de leur côté).

```css
:root {
    --ar-alert-color: var(--mon-ds-color-alert);
}
```

## Surcharger : tokens, parts, états

Choisir le levier :

- Couleur, espacement, typographie, durée → token `--ar-<composant>-*` (ou famille partagée comme `--ar-panel-*`). Premier choix.
- Layout ou style hors token → `::part()`.
- Apparence selon un état → part d'état si elle existe, sinon `:state()`.
- Propriété lue en JavaScript (`getComputedStyle`) → token : `::part()` n'est pas lisible depuis JS.
- Propriété appliquée à `:host` → token : `::part()` ne peut jamais cibler `:host`.
- Un composant a plusieurs tokens pour un même rôle : lire `components/<tag>.md` avant d'en inventer un. Ne jamais déclarer un token absent de ce fichier.

Toute la page, tokens et parts :

```css
:root {
    --ar-alert-color: #2e2e31;
}
ar-alert::part(close-button) {
    border-radius: 10px;
    color: currentColor;
}
```

Une instance : ajouter une classe et surcharger tokens ou parts.

```css
.alerte-succes-perso {
    --ar-alert-bg: #f5f0ff;
    --ar-alert-icon: #7c3aed;
}
```

Contrainte de cascade `::part()` :

- Une règle `::part()` externe (thème ou application) l'emporte sur une règle interne au shadow DOM du composant ciblant la même propriété, même à spécificité inférieure. Pour une déclaration `!important`, l'ordre s'inverse : la règle interne l'emporte.
- Conséquence : une propriété modifiée par une règle d'état interne du composant (classe de survol, de sélection…) reste un token ; la forcer via `::part()` figerait tous les états. Le contrat de chaque composant tient compte de cela : utiliser les tokens listés avant de passer par `::part()`.
- Ne pas utiliser `!important` pour une préférence de style. Ariane l'emploie seulement quand une surcharge casserait un contrat fonctionnel (positionnement, garantie d'accessibilité).
- Un `ar-<tag> { --token: … }` n'atteint qu'un élément du même arbre : il ne traverse pas la frontière du shadow DOM d'un autre composant. Un composant Ariane instancié dans le shadow DOM d'un autre (cas du tooltip interne d'`ar-table-sort`) se paramètre par des tokens valorisés sur `:root`, qui traversent toutes les frontières par héritage.
- Pour une largeur d'`ar-dialog` personnalisée, utiliser `--ar-dialog-width`. Avec le thème du starter-kit (en couche), une règle de l'application hors couche l'emporte sur le palier `ar-dialog[size='…']` du thème quelle que soit la spécificité. La spécificité ne joue que si les deux règles sont dans la même couche ou toutes deux hors couche (thème propre sans couche) : alors un `ar-dialog { … }` non qualifié perd face à `ar-dialog[size='…']` ; le rendre aussi spécifique ou omettre `size`.

### Parts sémantiques transverses

Plusieurs composants exposent des parts à rôle commun ; un même élément en expose souvent une transverse et une spécifique (par exemple `control` et `link`).

| Part               | Rôle                                                                          |
| ------------------ | ----------------------------------------------------------------------------- |
| nom du composant   | Racine du composant (`ar-breadcrumb::part(breadcrumb)`)                       |
| `panel`            | Conteneur flottant secondaire (datepicker, dropdown…)                         |
| `trigger`          | Ouvre/ferme un panneau ou une zone repliable                                  |
| `header`, `footer` | En-tête, pied de composant                                                    |
| `body`             | Zone de contenu principal                                                     |
| `control`          | Élément interactif générique (hors champ, bouton d'action, trigger)           |
| `field`            | Élément qui reçoit une saisie, sous-rôles `input` (texte) et `select` (liste) |
| `action-button`    | Bouton d'action ponctuelle (pas un toggle de panneau)                         |
| `indicator`        | Marqueur visuel                                                               |
| `label`            | Texte descriptif                                                              |
| `icon`             | Icône                                                                         |

### Parts d'état

Convention `<élément>--<état>` : l'élément de base reste présent, l'état s'ajoute comme second nom dans l'attribut `part` du même élément (`part="indicator indicator--current"`). Cibler `::part(indicator--current)` pour l'état seul.

| Suffixe      | Signification                                            | Exemple                                     |
| ------------ | -------------------------------------------------------- | ------------------------------------------- |
| `--current`  | Position atteinte par navigation                         | `ar-pagination::part(item--current)`        |
| `--selected` | Choix actif de l'utilisateur                             | `ar-tab::part(tab--selected)`               |
| `--disabled` | Désactivé                                                | `ar-pagination::part(nav-button--disabled)` |
| `--pending`  | Traitement en cours                                      | `ar-table-sort::part(sort-button--pending)` |
| `--warning`  | Avertissement                                            | `ar-charcounter::part(count--warning)`      |
| `--error`    | Erreur                                                   | `ar-charcounter::part(count--error)`        |
| `--desktop`  | Affichage desktop d'un élément ayant une variante mobile | `ar-breadcrumb::part(list--desktop)`        |
| `--mobile`   | Affichage mobile d'un élément ayant une variante desktop | `ar-breadcrumb::part(list--mobile)`         |
| `--substep`  | Sous-liste d'étapes imbriquée                            | `ar-stepper-item::part(list--substep)`      |

- Les états CSS (`:state(x)`) de chaque composant sont dans la section dédiée de `components/<tag>.md`.

## Presets

`presets/buttons.css` et `presets/fields.css` habillent du HTML ordinaire écrit par l'application, hors du contrat des composants `ar-*` : un `<button>` placé en slot (par exemple d'un `ar-dropdown-item`), un `<input>` ou `<textarea>` associé à un composant (par exemple via `for` à `ar-charcounter`).

- Opt-in : rien n'est appliqué sans poser la classe.
- Fichiers indépendants du thème (à charger séparément) mais ils consomment des tokens que le thème du starter-kit valorise (`--ar-button-*`, `--ar-input-*`, `--ar-field-gap`, `--ar-color-*`, `--ar-font-size-sm`). Sans thème chargé (ou sans ces tokens dans un thème propre), les valeurs sont indéfinies : charger le thème, ou valoriser ces tokens.
- Leurs règles sont dans `@layer ariane.presets`.
- Ce ne sont pas des composants : ni comportement ni accessibilité ajoutés, uniquement du style.

| Fichier       | Classes                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| `buttons.css` | `ar-btn` (base), variantes `ar-btn-primary`, `ar-btn-secondary`, `ar-btn-danger`, `ar-btn-tertiary`     |
| `fields.css`  | `ar-input` (`<input>`, `<textarea>`), `ar-label`, `ar-field-group` (empile label, champ, éléments liés) |

- `ar-btn` seule ne pose aucune couleur de variante : toujours l'associer à une variante.
- `ar-btn` prend en charge `:disabled` et `[aria-disabled='true']`. Pour ces états, `buttons.css` pose `background-color`, `border-color` et `color` en `!important` (valeurs `--ar-button-disabled-*`) : un `!important` en couche l'emporte sur le CSS hors couche, donc surcharger ces couleurs passe par les tokens `--ar-button-disabled-bg`, `--ar-button-disabled-border` et `--ar-button-disabled-color`. Un `!important` de l'application hors couche ne l'emporte pas sur celui du preset (en couche). `ar-input` prend en charge `[aria-invalid='true']`, `:disabled`, `[aria-disabled]` et `:read-only`.
- `ar-label` réagit à `data-ar-char-state="warning"` et `data-ar-char-state="error"` : hook documenté par `ar-charcounter`, à poser sur le label lié au champ observé.

```html
<link
    rel="stylesheet"
    href="https://unpkg.com/@ariane-ui/core@<version>/dist/styles/presets/buttons.css"
/>
<link
    rel="stylesheet"
    href="https://unpkg.com/@ariane-ui/core@<version>/dist/styles/presets/fields.css"
/>

<button class="ar-btn ar-btn-primary">Valider</button>

<div class="ar-field-group">
    <label class="ar-label" for="bio">Bio</label>
    <textarea class="ar-input" id="bio"></textarea>
    <ar-charcounter for="bio" max="150"></ar-charcounter>
</div>
```

Avec un bundler : `import '@ariane-ui/core/presets/buttons.css';` et `import '@ariane-ui/core/presets/fields.css';`. Les fichiers `presets/` du starter-kit et `@ariane-ui/core/presets/*.css` sont deux alternatives.

## Shadow DOM applicatif

Si l'application place ses pages ou une partie de son contenu dans un web component avec son propre shadow DOM :

- Les propriétés CSS personnalisées du thème chargé dans le document traversent la frontière par héritage : les tokens fonctionnent sans action.
- Les règles `::part()` du thème du document ne traversent pas : les composants Ariane dans ce shadow DOM n'ont que leurs tokens. Le thème doit rester chargé au niveau du document (sans lui, aucun token).
- Pour les `::part()`, adopter une feuille de style dans chaque shadow root concerné (`adoptedStyleSheets`, chargement synchrone, instance partagée, pas de FOUC).

Pour adopter un thème dans un shadow root, il faut une version JavaScript du CSS : un `CSSStyleSheet` peuplé avec les règles composants (`::part()`, dans `@layer ariane.theme`), sans les tokens `:root` (`:root` ne cible jamais un shadow root). Aucune feuille de thème de départ n'est versionnée (le `themes/ariane.js` du paquet est celui de la documentation d'Ariane : interne, à ne pas utiliser). Le starter-kit fournit le script qui la génère : `npm install` puis `npm run build:js` produit `ariane-starter.js`. Pour un autre thème : `node scripts/theme-to-js.js <entrée.css> <sortie.js> --name <identifiant>`, l'export nommé étant l'identifiant donné (`starterTheme` pour `build:js`).

Exemple, avec le fichier généré (export nommé `starterTheme`) :

```js
import { starterTheme } from './ariane-starter.js';

export class MonApp extends HTMLElement {
    connectedCallback() {
        const shadow = this.attachShadow({ mode: 'open' });
        shadow.adoptedStyleSheets = [starterTheme];
        shadow.append(document.createElement('ar-datepicker'));
    }
}
customElements.define('mon-app', MonApp);
```
