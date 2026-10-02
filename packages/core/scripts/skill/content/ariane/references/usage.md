# Utiliser les composants

Les composants sont des Custom Elements natifs : ils s'utilisent directement en HTML, sans framework, quel que soit le mode de chargement (voir `installation.md`). Le détail par composant (attributs, slots, événements, méthodes) est dans `components/index.md` et `components/<tag>.md`.

```html
<ar-alert variant="success">Votre message a bien été envoyé.</ar-alert>

<ar-spinner></ar-spinner>
```

## Charger avant d'utiliser

Les Custom Elements s'enregistrent de manière asynchrone. Avant de lire une propriété, d'appeler une méthode ou de poser une propriété JavaScript sur un composant au chargement de la page, attendre qu'il soit défini. Avant la définition, l'élément est un `HTMLElement` générique : ses propriétés et méthodes n'existent pas.

Un composant :

```js
await customElements.whenDefined('ar-alert');
const alert = document.querySelector('ar-alert');
alert.setAttribute('variant', 'success');
```

Tous les composants présents dans la page, via npm (`whenAllDefined` du sous-chemin `@ariane-ui/core/utils`, qui n'enregistre aucun composant) :

```js
import { whenAllDefined } from '@ariane-ui/core/utils';

await whenAllDefined();
// Tous les composants ar-* présents sont prêts

await whenAllDefined({ prefix: 'acme-' });
// Préfixe personnalisé (import headless)

await whenAllDefined({ root: monElement });
// Limité à un sous-arbre (élément ou shadow root)
```

Signature : `whenAllDefined({ prefix?, root? }): Promise<void>`.

| Option   | Défaut                                                    | Rôle                                             |
| -------- | --------------------------------------------------------- | ------------------------------------------------ |
| `prefix` | `window.ARIANE_CONFIG.prefix` suivi de `-`, sinon `'ar-'` | Préfixe des tags à attendre                      |
| `root`   | `document`                                                | `ParentNode` (élément ou shadow root) où scanner |

- Le retour est `void` (pas de liste de constructeurs).
- Les shadow roots ouverts sont parcourus, et le scan est répété tant que de nouveaux tags non définis apparaissent : un composant imbriqué n'existe dans le DOM qu'après la définition de son parent. Les shadow roots `closed` ne sont pas atteignables.
- En import headless, passer le préfixe utilisé pour `customElements.define()`.

Via CDN, sans import :

```js
const tags = [
    ...new Set(
        [...document.querySelectorAll('*')]
            .map((el) => el.localName)
            .filter((name) => name.startsWith('ar-')),
    ),
];
await Promise.all(tags.map((tag) => customElements.whenDefined(tag)));
// Tous les composants ar-* sont prêts
```

## Attributs et propriétés

| Valeur                                       | Utiliser                        |
| -------------------------------------------- | ------------------------------- |
| Chaîne, nombre, booléen                      | Attribut HTML                   |
| Fonction, tableau, objet (jamais une chaîne) | Propriété JavaScript uniquement |

```html
<ar-pagination current="1" total="10"></ar-pagination>
```

Un attribut ne porte que du texte. Une valeur non textuelle ne se pose qu'en JavaScript, après la définition du composant. Exemple : `isDateDisabled` d'`ar-datepicker` est une propriété sans attribut associé :

```js
const datepicker = document.querySelector('ar-datepicker');

// Désactive les dimanches
datepicker.isDateDisabled = (date) => date.getDay() === 0;
```

Attributs booléens : convention native, seule la présence compte, quelle que soit la valeur. Seule l'absence de l'attribut le désactive (`compact="false"` active `compact`).

```html
<!-- Ces deux écritures activent "compact" -->
<ar-pagination compact></ar-pagination>
<ar-pagination compact="false"></ar-pagination>

<!-- Seule l'absence de l'attribut le désactive -->
<ar-pagination></ar-pagination>
```

Réflexion : certaines propriétés sont reflétées en attribut (`current`, `total` et `compact` d'`ar-pagination` le sont), donc l'attribut suit la propriété quand elle change. Toutes ne le sont pas : le tableau d'attributs de `components/<tag>.md` liste ce qui existe en HTML ; ce qui n'y figure pas est une propriété seule.

## Slots

Le slot par défaut (élément sans attribut `slot`) reçoit le contenu principal :

```html
<ar-dialog label="Confirmation">
    <p>Voulez-vous vraiment supprimer cet élément ?</p>
</ar-dialog>
```

Un slot nommé se cible avec l'attribut `slot` sur l'élément projeté :

```html
<ar-collapse>
    <button slot="trigger">Afficher les détails</button>
    <p>Contenu affiché/masqué au clic sur le déclencheur.</p>
</ar-collapse>
```

Les slots disponibles sont listés par composant dans `components/<tag>.md`. Le slot sans nom y figure comme slot par défaut.

## Événements

Les composants émettent des `CustomEvent` standards, nommés `<tag>-<nom>` (`ar-pagination-page-changed`, `ar-collapse-shown`). Ils s'écoutent avec `addEventListener`. `detail` porte les données ; son type est dans `components/<tag>.md`.

```js
const pagination = document.querySelector('ar-pagination');

pagination.addEventListener('ar-pagination-page-changed', (event) => {
    console.log(`Page changée : ${event.detail.from} → ${event.detail.to}`);
});
```

### Événements annulables

Un événement annulable est marqué `@cancelable` dans sa description du Custom Elements Manifest et dans la colonne « Annulable » de la référence du composant : il est émis avec `cancelable: true`, et `event.preventDefault()` bloque l'action. Les événements non marqués ne s'annulent pas.

Motif cycle de vie « disclosure », partagé par `ar-collapse`, `ar-dialog`, `ar-dropdown` et `ar-breadcrumb` (les événements de `ar-collapse` ci-dessous) :

| Événement                    | Moment                                   | Annulable |
| ---------------------------- | ---------------------------------------- | --------- |
| `ar-collapse-show`           | Avant l'ouverture                        | oui       |
| `ar-collapse-show-prevented` | Émis si `ar-collapse-show` est annulé    | non       |
| `ar-collapse-shown`          | Après la fin de l'animation d'ouverture  | non       |
| `ar-collapse-hide`           | Avant la fermeture                       | oui       |
| `ar-collapse-hide-prevented` | Émis si `ar-collapse-hide` est annulé    | non       |
| `ar-collapse-hidden`         | Après la fin de l'animation de fermeture | non       |

Le même motif existe sous d'autres noms : `ar-dialog-show`, `ar-dialog-show-prevented`, `ar-dialog-shown`, `ar-dialog-hide`, `ar-dialog-hide-prevented` (`ar-dialog-hide-prevented` secoue en plus le dialog et annonce `prevented-message` aux lecteurs d'écran).

```js
const collapse = document.querySelector('ar-collapse');

collapse.addEventListener('ar-collapse-show', (event) => {
    if (!autorise) event.preventDefault(); // l'ouverture n'a pas lieu
});

collapse.addEventListener('ar-collapse-show-prevented', () => {
    // réagir au refus (message, journalisation...)
});
```

- Ces événements remontent (`bubbles`) et traversent le shadow DOM (`composed`) ; leur `detail` est `{ id }` (l'`id` de l'hôte, ou `undefined`).
- `ar-dialog-dismissed` et `ar-dialog-accepted` (clic sur un élément portant `data-ar-dismiss` ou `data-ar-accept`) sont aussi annulables.
- Autre motif : `-change` annulable puis `-changed` après effet. `ar-pagination-page-change` (annulable : `current` ne change pas) précède `ar-pagination-page-changed` (non annulable, émis quand `current` a réellement changé). `ar-stepper-step-change` est annulable et bloque la navigation. `detail` de ces événements : `{ from, to }`.
- Vérifier dans `components/<tag>.md` si un événement donné existe et s'il est annulable : tous les composants n'ont pas le motif complet (`ar-datepicker-show` et `-hide` sont annulables, sans événement `-prevented` listé ni pour `-show` ni pour `-hide`).

## Méthodes

Certaines actions s'appellent directement sur l'élément, une fois le composant défini (voir « Charger avant d'utiliser »). Exemple avec `ar-collapse`, qui expose `show()` et `hide()` :

```html
<ar-collapse>
    <button slot="trigger">Révéler le contenu</button>
    <p>Contenu qui se révèle à l'ouverture</p>
</ar-collapse>

<script type="module">
    await customElements.whenDefined('ar-collapse');
    const collapse = document.querySelector('ar-collapse');
    collapse.show();
</script>
```

`show()` est sans effet si le composant est déjà ouvert, en cours d'animation ou `disabled` ; `hide()` est sans effet s'il est déjà fermé. Les méthodes disponibles par composant sont dans `components/<tag>.md`.

## Autocomplétion IDE

Le paquet npm publie des fichiers de données VS Code générés depuis le Custom Elements Manifest : autocomplétion des tags `ar-*`, de leurs attributs et des custom properties CSS `--ar-*`. À référencer dans le `.vscode/settings.json` du projet :

```json
{
    "html.customData": ["node_modules/@ariane-ui/core/dist/vscode.html-custom-data.json"],
    "css.customData": ["node_modules/@ariane-ui/core/dist/vscode.css-custom-data.json"]
}
```

Le manifeste lui-même est exporté sous `@ariane-ui/core/custom-elements.json`.
