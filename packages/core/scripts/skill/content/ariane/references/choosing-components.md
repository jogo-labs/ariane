# Choisir un composant

## Par besoin

| Besoin                                                                                           | Composant                                                                       | Attributs clés                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Message à ne pas manquer, intégré au contenu : confirmation, avertissement, erreur, information  | `<ar-alert>`                                                                    | `variant` (`error` par défaut, `warning`, `success`, `info`), `urgent`, `next-focus` (seul moyen d'afficher le bouton de fermeture), `without-notification`              |
| Position de la page dans la hiérarchie du site                                                   | `<ar-breadcrumb>` avec un `<ar-breadcrumb-item>` par niveau                     | `<ar-breadcrumb-item>` : `label`, `href` (le dernier item est toujours rendu en texte avec `aria-current="page"`) ; `<ar-breadcrumb>` : `open` (panel mobile)            |
| Caractères restants d'un champ texte, avec alerte avant la limite                                | `<ar-charcounter>`                                                              | `for` (ID du champ, requis), `max` (requis), `warn-threshold` (20 par défaut), `label`                                                                                   |
| Contenu additionnel déplié sur place : « Lire la suite », FAQ, options avancées, accordéon       | `<ar-collapse>`                                                                 | `open`, `name` (accordéon), `for` (déclencheur externe), `trigger-position`, `disabled`                                                                                  |
| Saisie d'une date au clavier ou dans un calendrier, dans un formulaire                           | `<ar-datepicker>`                                                               | `label`, `value` (ISO `yyyy-MM-dd`), `format` (`dd/MM/yyyy` par défaut), `min`, `max`, `name`, `required`, `readonly`, `disabled`                                        |
| Tâche focalisée qui interrompt le flux : confirmation, formulaire, menu de navigation, filtres   | `<ar-dialog>`                                                                   | `label`, `mode` (`modal` par défaut, `drawer`), `placement` (drawer), `size`, `open`, `close-on-backdrop`, `without-header`                                              |
| Panneau déclenché par un bouton : menu d'actions, filtres, contenu qui ne justifie pas un dialog | `<ar-dropdown>`, avec `<ar-dropdown-item>` autour de chaque action en mode menu | `placement` (`bottom-start` par défaut), `for` (déclencheur externe), `open`, `disabled`, `no-scroll-lock`                                                               |
| Liste longue découpée en pages                                                                   | `<ar-pagination>`                                                               | `current` (commence à 1), `total`, `compact`                                                                                                                             |
| Avancement mesurable d'une opération : upload, parcours                                          | `<ar-progressbar>`                                                              | `percent` (borné entre 0 et 100) ; libellé dans le slot par défaut                                                                                                       |
| Opération en cours de durée inconnue                                                             | `<ar-spinner>`                                                                  | `done`, `loading-label`, `done-label`, `size` (`xs`, `sm`, `lg`)                                                                                                         |
| Parcours de création ou de modification en plusieurs étapes, avec sous-étapes                    | `<ar-stepper>` avec des `<ar-stepper-item>` (imbriqués pour les sous-étapes)    | `current-path`, `mode` (`create` par défaut, `edit`), `follow-scroll`, `desktop-target`, `desktop-from` (992 par défaut) ; `<ar-stepper-item>` : `path`, `label`, `href` |
| Contenus associés affichés un panneau à la fois, avec des onglets                                | `<ar-tab-group>` contenant des `<ar-tab>` et des `<ar-tab-panel>`               | `active`, `label`, `manual-activation` ; `<ar-tab>` : `panel` (requis), `disabled` ; `<ar-tab-panel>` : `name` (requis)                                                  |
| Tri d'une colonne de tableau, confirmé de façon asynchrone (côté serveur)                        | `<ar-table-sort>` dans un `<th>`                                                | `type` (`alpha` par défaut, `numeric`, `date`), `order` (piloté par `confirm()`/`reject()`), `pending`                                                                   |
| Information brève et non interactive au survol ou au focus d'un élément                          | `<ar-tooltip>`                                                                  | `for` (ID du déclencheur, requis), `placement` (`top` par défaut), `show-delay` (300), `hide-delay` (150), `without-arrow`, `disabled`                                   |

API complète (attributs, propriétés, événements, slots, parts, tokens) : `components/<tag>.md`, sous-composants inclus dans le fichier du parent.

## Confusions fréquentes

### Navigation : dropdown, tab-group, stepper, breadcrumb, pagination

- Situer la page courante dans la hiérarchie du site → `<ar-breadcrumb>` ; sous 768px il passe seul en rendu condensé (bouton « Retour » vers le premier lien, liens intermédiaires dans un dropdown).
- Faire avancer dans une séquence d'étapes ordonnées → `<ar-stepper>` ; `mode="create"` ne rend cliquables que les étapes complétées, `mode="edit"` lève cette restriction.
- Afficher un panneau parmi plusieurs dans une même zone, au choix de l'utilisateur → `<ar-tab-group>` ; chaque `<ar-tab panel="x">` s'associe au `<ar-tab-panel name="x">` de même nom.
- Contenu de panneau coûteux à charger → `<ar-tab-group manual-activation>` : les flèches déplacent le focus sans activer l'onglet.
- Parcourir une liste découpée en pages → `<ar-pagination>` ; le composant ne charge ni n'annonce le nouveau contenu, c'est à l'intégrateur de le faire.
- Proposer des actions ou un contenu ancré à un bouton, sans changer de page → `<ar-dropdown>` ; avec des `<ar-dropdown-item>`, panel en `role="menu"` et navigation clavier, sans eux, conteneur libre sans rôle ni navigation clavier.
- `<ar-pagination>` et `<ar-stepper>` ne changent pas d'état seuls : réassigner la propriété `current` (sur `ar-pagination-page-change`) ou `currentPath` (sur `ar-stepper-step-change`) avec `event.detail.to`, de façon synchrone pour que le focus suive.
- Erreur typique : un `current-path` qui ne correspond au `path` d'aucun `<ar-stepper-item>` n'active aucune étape, sans aucun signal visuel ni vocal.

### Retours à l'utilisateur : alert, tooltip, dialog

- Message à lire sans interrompre la tâche → `<ar-alert>` ; le rôle ARIA découle de `variant` (`error`/`warning` → `role="alert"`, `success`/`info` → `role="status"`), `<ar-alert urgent>` force `role="alert"`, ne jamais poser `role` à la main (écrasé).
- Description brève d'un élément, sans lien ni bouton → `<ar-tooltip>` ; c'est un complément du nom accessible du déclencheur, jamais son seul libellé (un bouton icône garde son `aria-label`).
- Contenu riche ou cliquable lié à un déclencheur → `<ar-dropdown>`, pas `<ar-tooltip>` (contenu `role="tooltip"` non interactif).
- Tâche qui exige l'attention et interrompt le flux (confirmer, remplir, choisir) → `<ar-dialog>` ; `data-ar-accept` et `data-ar-dismiss` sur les boutons distinguent confirmation et annulation.
- Panneau latéral glissant depuis le bord (ex. filtres de recherche) → `<ar-dialog mode="drawer">` ; fenêtre centrée avec backdrop → `mode="modal"` (défaut).
- Erreur de saisie d'un `<ar-datepicker>` → contenu dans son slot `error`, déjà enveloppé dans un `role="alert"` et annoncé automatiquement.
- Erreur typique : attendre un bouton de fermeture sur `<ar-alert>` sans `next-focus` ; il n'est rendu que si `next-focus` désigne l'ID de l'élément qui recevra le focus, et la fermeture retire l'alerte du DOM sans moyen de la réafficher.

### Attente : spinner, progressbar

- Durée inconnue → `<ar-spinner>` ; poser `done` à la fin pour annoncer `done-label`.
- Progression mesurable → `<ar-progressbar>` ; mettre à jour `percent` au rythme réel de l'opération, le composant ne suit rien seul.
- Montrer l'avancement d'un parcours en plusieurs étapes → `<ar-progressbar>` ; permettre de naviguer entre les étapes → `<ar-stepper>`.
- `<ar-progressbar>` sans libellé dans son slot → le lecteur d'écran annonce le pourcentage sans dire ce qui progresse.
- Erreur typique : plusieurs `<ar-spinner>` actifs en même temps avec des `loading-label` identiques ; chacun s'annonce via `role="alert"`, les annonces se confondent.

### Révéler du contenu : collapse

- Révéler sur place un contenu sous son résumé (« Voir plus », FAQ, options avancées) → `<ar-collapse>` avec un `<button slot="trigger">`.
- Accordéon (un seul panneau ouvert à la fois) → plusieurs `<ar-collapse>` partageant le même `name` ; pas de composant conteneur, et pas entre shadow roots distincts.
- Bouton « Lire la suite » placé sous le texte → `<ar-collapse trigger-position="after">` (ordre DOM, pas CSS `order`).
- Déclencheur situé ailleurs dans la page → `for` avec l'ID d'un bouton natif, dans le même arbre DOM que le composant.
- Un panneau visible à la fois avec tous les intitulés affichés comme onglets → `<ar-tab-group>` ; contenu flottant ancré à un bouton → `<ar-dropdown>` ; tâche qui interrompt le flux → `<ar-dialog>`.
- Erreur typique : un déclencheur non focusable ou sans nom accessible (texte visible, `aria-label` ou `aria-labelledby`) ; `<ar-collapse>` pose `aria-expanded` et `aria-controls` mais ne rend pas le déclencheur accessible.
