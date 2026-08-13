# Design — Vocabulaire de rôles `::part()` transverses

**Statut :** Validé (en attente de plan d'implémentation)
**Date :** 2026-08-13
**Contexte :** issue [#181](https://github.com/jogo-labs/ariane/issues/181)

## Problème

Chaque composant Ariane définit ses propres noms de `::part()` (`close`, `header`, `panel`,
`trigger`...), ce qui oblige un consommateur à apprendre le vocabulaire de chaque composant
individuellement pour le styliser en profondeur — contraire à l'objectif d'écosystème cohérent
visé par la philosophie headless du projet.

## Méthode

Avant de fixer la liste de rôles, audit des `@csspart` existants sur les 19 composants (voir
tableau ci-dessous) puis recherche croisée sur 11 design systems/librairies de référence utilisant
CSS Shadow Parts ou une vocabulaire d'anatomie transverse documentée : Shoelace, Web Awesome
(successeur direct de Shoelace, même auteur — déjà notre référence pour la convention `active` /
`base--selected` d'`ar-tab`), Fluent UI / FAST (Microsoft), Radix UI, Spectrum Design Data (Adobe —
registre officiel de termes d'anatomie), Primer (GitHub), Salesforce Lightning Design System,
PatternFly (Red Hat), Atlassian Design System, Ionic, Vaadin. Fluent 2, Carbon (IBM), Polaris
(Shopify) et Porsche Design System ont aussi été recherchés mais n'exposent pas de convention
`::part()` documentée publiquement exploitable.

### Constat de l'audit interne

Des noms transverses existent déjà de facto, avec un usage cohérent sur plusieurs composants :
`trigger` (collapse, breadcrumb, stepper, datepicker), `panel` (dropdown, datepicker, stepper,
breadcrumb — mais aussi, en collision de sens, la zone animée non-flottante d'`ar-collapse`),
`header`/`footer` (datepicker, dialog), `label` (datepicker, charcounter, progressbar, pagination).
Deux incohérences de nommage existantes et sans lien avec l'issue mais relevant du même problème :
racine du composant nommée `base` (tab, tab-panel, tab-group) vs `container` (progressbar,
charcounter) vs absente (spinner, pagination, dialog) ; zone de contenu principal nommée `body`
(alert, dialog) vs `content` (collapse).

### Constat de la recherche externe

- **Convergence claire** sur : racine du composant, conteneur flottant, `trigger`, `header`/
  `footer`, contenu principal, élément interactif générique, champ de saisie, bouton d'action,
  indicateur visuel, `label`, `icon`.
- **Root part nommé d'après le composant, pas un mot générique** : Web Awesome a déprécié son
  `base` générique au profit d'un part nommé d'après le composant (`<wa-button>` expose `button`,
  `<wa-details>` expose `details`). Aucune justification officielle écrite trouvée, mais la raison
  technique plausible et documentée ailleurs sur les CSS Shadow Parts est réelle et déjà rencontrée
  dans Ariane : `::part()` ne traverse qu'un seul niveau de frontière shadow, il faut chaîner
  `exportparts` pour remonter à travers plusieurs niveaux d'imbrication — un nom générique commun à
  tous les composants entre en collision dans cette chaîne. Ariane a déjà ce problème documenté
  (issue #168, `ar-tooltip` imbriqué dans `ar-table-sort`).
- **`control`/`field` sont un standard réel** (Spectrum Design Data, registre officiel Adobe), pas
  une invention Ariane comme l'audit initial le laissait craindre.
- **`action` isolé n'a aucun précédent** : toutes les sources qui formalisent ce concept le
  composent toujours avec le type d'élément (`action-button`, `close-button` — Spectrum ; `action-
button`/`action-item`/`action-card` — PatternFly ; `remove-button` — Vaadin).
- **`panel` = conteneur flottant** est le sens consensuel (Shoelace/Web Awesome), pas la zone
  animée d'`ar-collapse` — décision inverse de la première intuition de ce brainstorming.
- **`body`, pas `content`, pour la zone de contenu principal** : Radix formalise explicitement le
  triptyque _« Header, Body, and Footer, borrowing directly from HTML's document structure »_, et
  Shoelace/Web Awesome l'appliquent tel quel sur leur dialog (`header`/`body`/`footer`/
  `close-button`). Spectrum définit certes `content` comme terme séparé, mais de façon redondante
  avec son propre `body` — aucune source ne traite `content` de façon plus cohérente que `body`.
  Avec `header`/`footer` déjà retenus comme rôles transverses, `body` en est le complément naturel.
- Certains systèmes de référence (Salesforce Lightning Design System, en BEM) n'ont **aucun**
  vocabulaire transverse et scopent chaque nom à son composant — confirme que la démarche de
  l'issue #181 n'est pas une évidence universelle, mais un choix cohérent avec la philosophie
  headless déjà suivie par Ariane.

## Vocabulaire retenu

| Rôle                 | Signification                                             | Sources qui le valident                          |
| -------------------- | --------------------------------------------------------- | ------------------------------------------------ |
| _(nom du composant)_ | Racine du composant (remplace `base`/`container`/absence) | Web Awesome                                      |
| `panel`              | Conteneur flottant secondaire                             | Shoelace, Web Awesome                            |
| `body`               | Zone de contenu principal                                 | Radix, Shoelace, Web Awesome, notre existant     |
| `trigger`            | Ouvre/ferme un panel ou une zone repliable                | Shoelace, Web Awesome, Radix, notre existant     |
| `header` / `footer`  | En-tête / pied de composant                               | Shoelace, Web Awesome, Radix, notre existant     |
| `control`            | Élément interactif générique (hors field/action/trigger)  | Spectrum (officiel)                              |
| `field`              | Reçoit une saisie                                         | Spectrum (officiel)                              |
| `action-button`      | Bouton qui déclenche une action ponctuelle                | Spectrum, PatternFly, Vaadin (pattern `-button`) |
| `indicator`          | Marqueur/indicateur visuel                                | Spectrum, Radix, notre `ar-table-sort` existant  |
| `label`              | Texte descriptif                                          | Déjà transverse de fait dans Ariane              |
| `icon`               | Icône                                                     | Déjà transverse de fait dans Ariane (`ar-alert`) |

`trigger` et `action-button` restent des rôles frères, pas hiérarchiques : `trigger` uniquement
pour un toggle de panel/zone repliable, `action-button` pour tout autre bouton de commande (close,
prev/next, today, footer-btn...).

## Hors périmètre (YAGNI)

`help-text`/`validation-marker` (termes Spectrum officiels, proches de nos `hint`/`error`
existants) ne sont pas ajoutés en rôle transverse : un seul composant (`ar-datepicker`) les utilise
aujourd'hui, l'ajout n'allège rien tant qu'un deuxième cas réel n'apparaît pas. À reconsidérer si un
futur composant a besoin d'un texte d'aide ou d'un marqueur de validation.

## Mécanisme

**Additif uniquement, jamais de renommage breaking.** Un élément qui a déjà un part spécifique
gagne le rôle transverse en plus, dans le même attribut `part` : `part="close action-button"`,
`part="container base"` devient `part="progressbar"` (voir note racine ci-dessous). `ar-alert`/
`ar-dialog` n'ont rien à changer, ils utilisent déjà `body` — il devient directement le rôle
transverse confirmé. Seul `ar-collapse` renomme son ancien `panel` (libéré pour le sens flottant,
cf. ci-dessus) en `body`.

**Racine du composant — cas particulier.** Contrairement aux autres rôles (additifs), la racine
n'accumule pas ancien nom + nouveau : le part générique existant (`base` ou `container`) est
**remplacé** par le nom du composant, sur le modèle Web Awesome. C'est le seul renommage non-additif
du chantier, justifié par l'absence de valeur d'un doublon `part="container <nom-composant>"` (la
racine n'a jamais eu de rôle "spécifique" distinct à préserver — `base`/`container` étaient déjà
eux-mêmes génériques) et par la nécessité d'éviter la collision `exportparts` dès maintenant plutôt
que de la reporter à un futur renommage. Composants sans aucun part racine actuellement (spinner,
pagination, dialog) : le part est simplement ajouté, pas de migration.

**JSDoc `@csspart`.** Une ligne dédiée par rôle transverse (même convention que les parts d'état
`--current`/`--pending`), marquée explicitement comme rôle transverse avec renvoi vers la page de
doc dédiée :

```ts
/**
 * @csspart close - Le bouton de fermeture.
 * @csspart action-button - Rôle transverse (voir /concepts/parts-roles) : déclenche une action de
 *   fermeture.
 */
```

## Documentation

Nouvelle page dédiée dans `apps/docs` (`/concepts/parts-roles` ou emplacement équivalent choisi au
moment du plan d'implémentation, cohérent avec l'architecture de nav existante) : liste chaque
rôle, sa signification, et les composants/parts qui le portent. Référencée depuis chaque page
composant concernée par au moins un rôle transverse.

## Rollout

Rétrofit progressif par lots sur le modèle du chantier #129 (spec + plan dédiés par lot, exécution
subagent-driven-development, revue finale de branche). Premier lot suggéré : `ar-datepicker` et
`ar-pagination` (les plus riches en rôles concernés : `control`, `field`, `action-button`, racine
absente). Ordre des lots suivants à affiner au moment d'écrire le premier plan.

## Impact `custom-elements.json` / doc générée

Les rôles transverses sont de simples `@csspart` supplémentaires, déjà supportés par le pipeline
CEM existant — aucun mécanisme nouveau requis côté génération de manifeste. Seule nouveauté :
détecter et regrouper les parts marqués « rôle transverse » pour alimenter la nouvelle page de doc
dédiée (mécanisme précis à définir au moment du plan d'implémentation).

## Hors scope de ce chantier

- Renommage des rôles déjà transverses de fait (`trigger`, `header`, `footer`, `label`, `icon`) —
  confirmés tels quels, aucune migration nécessaire.
- `help-text`/`validation-marker` — cf. section Hors périmètre.
- Extension du vocabulaire à des composants futurs non encore conçus — ce chantier couvre le
  rétrofit des 19 composants existants ; les nouveaux composants adoptent le vocabulaire dès leur
  conception, sans travail supplémentaire de ce chantier.
