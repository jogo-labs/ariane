# Installer et charger Ariane

## Choisir le mode de chargement

| Mode                                                                      | Quand l'utiliser                                    | Ce qu'il enregistre                                                                | `ARIANE_CONFIG.prefix`                   |
| ------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------- |
| CDN autoloader (`cdn/autoloader.js`)                                      | Page HTML sans outil de build ; cas le plus simple  | À la demande : charge chaque composant quand son tag apparaît (page et shadow DOM) | Honoré (lu une seule fois au chargement) |
| CDN bundle complet (`cdn/index.js`)                                       | Beaucoup de composants, ou pas d'imports dynamiques | Tous les composants, en une requête                                                | Honoré                                   |
| npm barrel (`import '@ariane-ui/core'`)                                   | Projet avec bundler, tous les composants            | Tous les composants                                                                | Honoré, à poser avant l'import           |
| npm import par composant (`@ariane-ui/core/dist/components/<x>/index.js`) | Projet avec bundler, quelques composants            | Le composant importé (et son tag seul)                                             | Honoré                                   |
| npm headless (`@ariane-ui/core/headless`)                                 | Choisir soi-même chaque tag                         | Rien : exporte les classes, l'appelant fait `customElements.define()`              | Non utilisé                              |

Règles :

- Pas de build, ou prototype → CDN autoloader.
- Tags personnalisés par composant, ou aucun enregistrement automatique → headless.
- `@ariane-ui/core/utils` n'enregistre rien dans aucun mode.

## CDN

| Fichier                                                   | Usage                                |
| --------------------------------------------------------- | ------------------------------------ |
| `https://unpkg.com/@ariane-ui/core/cdn/autoloader.js`     | Production, autoloader (minifié)     |
| `https://unpkg.com/@ariane-ui/core/cdn/index.js`          | Production, bundle complet (minifié) |
| `https://unpkg.com/@ariane-ui/core/cdn/autoloader.dev.js` | Développement, autoloader            |
| `https://unpkg.com/@ariane-ui/core/cdn/index.dev.js`      | Développement, bundle complet        |

```html
<script type="module" src="https://unpkg.com/@ariane-ui/core/cdn/autoloader.js"></script>

<ar-alert variant="success">Opération réussie.</ar-alert>
```

- Le nom court (`autoloader.js`, `index.js`) est la production : minifié, avertissements supprimés. Le suffixe `.dev.js` est le développement : non minifié, avertissements actifs dans la console (erreurs d'usage, notamment d'accessibilité).
- Utiliser `.dev.js` en local, le nom court sur le site publié.
- Épingler une version dans l'URL en production (`https://unpkg.com/@ariane-ui/core@<version>/cdn/autoloader.js`) : sans version, unpkg sert la dernière publiée. Le paquet est pré-v1 (version actuelle `0.1.0-alpha.13`) et toutes les versions pré-v1 sont publiées sous le dist-tag npm `latest`, donc une URL sans version suit la dernière publiée, y compris une alpha.
- Avec npm, un seul build est publié : c'est le bundler du projet qui choisit selon `process.env.NODE_ENV` (`production` supprime les avertissements).

## npm

```bash
npm install @ariane-ui/core
```

| Import                                                                         | Effet                                                                                                 |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `import '@ariane-ui/core';`                                                    | Barrel : enregistre tous les composants                                                               |
| `import '@ariane-ui/core/dist/components/alert/index.js';`                     | Enregistre un seul composant (`alert` ; même schéma pour chaque composant, `components/<x>/index.js`) |
| `import { ArAlert } from '@ariane-ui/core/headless';`                          | Classes seules, aucun `customElements.define`                                                         |
| `import { whenAllDefined, registerTranslation } from '@ariane-ui/core/utils';` | Code pur, sans enregistrer de composant ni embarquer les composants                                   |

- Le sous-chemin `/dist/*` est exporté par le paquet : l'import par composant passe par lui.
- Dans un contexte headless, importer `whenAllDefined` et `registerTranslation` depuis `@ariane-ui/core/utils` et non depuis le barrel : le barrel enregistre les `ar-*`. Mesure : 962 octets via `/utils` contre 201 896 octets via le barrel (minifié).
- Le paquet n'a pas de champ `sideEffects` : `import '@ariane-ui/core'` n'est jamais supprimé par le tree-shaking.
- Autres exports : `@ariane-ui/core/themes/*.css`, `@ariane-ui/core/presets/*.css`, `@ariane-ui/core/custom-elements.json`.
- `whenAllDefined({ prefix?, root? }): Promise<void>` : attend que les tags du préfixe présents sous `root` (défaut `document`) soient définis, shadow roots ouverts inclus ; les shadow roots `closed` ne sont pas atteignables.

## Préfixe des tags

Par défaut, les tags sont `ar-*`. `window.ARIANE_CONFIG.prefix` les change pour tous les composants enregistrés par la librairie.

- La variable doit exister AVANT l'évaluation de la librairie : le préfixe est lu au moment où elle s'exécute (l'autoloader le lit une seule fois au chargement).
- CDN : un `<script>` classique posant `window.ARIANE_CONFIG = { prefix: 'acme' };` placé avant le script Ariane. Les composants s'utilisent ensuite en `<acme-alert>`.
- npm, préfixe commun : poser la variable dans un module importé avant la librairie.

```ts
// ariane-config.ts
window.ARIANE_CONFIG = { prefix: 'acme' };
```

```ts
import './ariane-config'; // évalué en premier
import '@ariane-ui/core';
```

- Poser la variable dans le même module que l'import de la librairie, après la ligne `import`, ne marche pas : les imports d'un module sont évalués avant son propre code, et les tags `ar-*` sont déjà enregistrés. Cet ordre d'évaluation a été mesuré en Node. Ne rien supposer du comportement de Vite ou webpack : cet ordre n'a pas été vérifié avec eux ; passer par un module de configuration importé en premier.
- Le préfixe s'applique à tous les composants ; en CDN il est global. Renommer chaque composant individuellement impose npm avec `/headless`.
- Chaque `components/<x>/index.js` enregistre son tag via `defineComponent('ar-<x>', Classe)` : `<préfixe>-<nom>` avec `ARIANE_CONFIG.prefix`, sinon `ar-<nom>`.

Headless (le préfixe de `ARIANE_CONFIG` n'est pas utilisé) :

```ts
import { ArAlert } from '@ariane-ui/core/headless';
import { whenAllDefined } from '@ariane-ui/core/utils';

customElements.define('acme-alert', ArAlert);
await whenAllDefined({ prefix: 'acme-' });
```

- `whenAllDefined` attend par défaut `<ARIANE_CONFIG.prefix ?? 'ar'>-` ; en headless passer `prefix` (avec le tiret final : `'acme-'`) correspondant aux tags définis.
- Les types (`HTMLElementTagNameMap`) décrivent les tags par défaut `ar-*` : avec un préfixe personnalisé, les tags ne sont pas typés.
- `ar-table-sort` embarque un tooltip qu'il enregistre lui-même sous un nom interne privé : rien à enregistrer, le préfixe choisi n'est pas concerné, ne pas s'appuyer sur ce nom. Le tooltip embarqué se personnalise par tokens posés sur `:root` (toutes les instances) ou sur l'hôte (une instance) ; les règles CSS ciblant un tag ou `::part()` n'atteignent pas un élément situé dans le shadow DOM d'un autre composant.
- Le thème fourni cible les tags `ar-*`.

## Compatibilité

| Navigateur                    | Version minimale |
| ----------------------------- | ---------------- |
| Chrome et Edge                | 125              |
| Firefox                       | 126              |
| Safari (macOS, iOS et iPadOS) | 17.5             |

- Pas de polyfills. En dessous de ces versions, le comportement n'est pas garanti. Les versions sont déduites des données de compatibilité des fonctionnalités utilisées (API Popover, états personnalisés, `ElementInternals`, `<dialog>`, `inert` ; pour le thème fourni : `light-dark()`, `color-mix()`, `oklch()`, `@layer`, imbrication CSS), pas testées version par version. Les tests automatisés tournent sur Chromium, Firefox et WebKit.
- Chrome et Edge 125 : `:state()` n'existe pas, les états personnalisés sont exposés avec le préfixe `--` (`:--open`). Le thème fourni n'en tient pas compte ; la plupart des états ont un attribut équivalent (`[open]`, `[disabled]`…) à utiliser dans le CSS applicatif.
- Safari iOS et iPadOS avant 18.3 : le tap à l'extérieur d'un panneau ne le ferme pas nativement. Ariane ajoute cette fermeture ; elle est testée en émulation, pas sur appareil.
- SSR : pas de support officiel (fonctionnalité à venir) ; le support actuel est partiel et non testé.

## Frameworks

Composants natifs (Custom Elements), sans wrapper : ils fonctionnent avec n'importe quel framework. Points d'attention :

| Framework | Configuration et pièges                                                                                                                                                                                                                                                                                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| React     | `import '@ariane-ui/core';` une fois à un point d'entrée global. Événement personnalisé : React 19 → préfixe `on` sensible à la casse (`onar-pagination-page-changed` écoute `ar-pagination-page-changed`) ; React 18 et antérieur → `ref` + `addEventListener` (avec nettoyage dans `useEffect`). Propriété JS complexe (objet, fonction) : toujours via une `ref`, quelle que soit la version. |
| Vue       | Déclarer les tags comme éléments personnalisés dans `vite.config.ts` : `vue({ template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('ar-') } } })`. Binding d'une propriété JS : modificateur `.prop` (fiable même si le composant n'est pas encore chargé au rendu, cas courant avec l'autoloader CDN).                                                                       |
| Angular   | `schemas: [CUSTOM_ELEMENTS_SCHEMA]` dans le composant standalone qui utilise des tags Ariane. `[prop]="valeur"` affecte toujours une propriété JS (valeurs complexes sans configuration) ; `(événement)="handler($event)"` pour les événements.                                                                                                                                                  |
| Svelte    | `import '@ariane-ui/core';` puis tags directement dans le markup. Svelte affecte une valeur non textuelle (fonction) en propriété seulement si la clé correspond à un nom existant sur l'élément : heuristique non garantie, notamment si le composant n'est pas chargé au rendu ; vérifier sur la valeur critique avant de s'y fier.                                                            |

- Exemple d'écoute d'un événement : `event.detail.to` dans `ar-pagination-page-changed`.
