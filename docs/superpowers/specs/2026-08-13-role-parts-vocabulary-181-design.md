# Design — Vocabulaire de rôles `::part()` et conventions de `slot` transverses

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

| Rôle                 | Signification                                                      | Sources qui le valident                          |
| -------------------- | ------------------------------------------------------------------ | ------------------------------------------------ |
| _(nom du composant)_ | Racine du composant (remplace `base`/`container` s'il existe déjà) | Web Awesome                                      |
| `panel`              | Conteneur flottant secondaire                                      | Shoelace, Web Awesome                            |
| `body`               | Zone de contenu principal                                          | Radix, Shoelace, Web Awesome, notre existant     |
| `trigger`            | Ouvre/ferme un panel ou une zone repliable                         | Shoelace, Web Awesome, Radix, notre existant     |
| `header` / `footer`  | En-tête / pied de composant                                        | Shoelace, Web Awesome, Radix, notre existant     |
| `control`            | Élément interactif générique (hors field/action/trigger)           | Spectrum (officiel)                              |
| `field`              | Reçoit une saisie                                                  | Spectrum (officiel)                              |
| `action-button`      | Bouton qui déclenche une action ponctuelle                         | Spectrum, PatternFly, Vaadin (pattern `-button`) |
| `indicator`          | Marqueur/indicateur visuel                                         | Spectrum, Radix, notre `ar-table-sort` existant  |
| `label`              | Texte descriptif                                                   | Déjà transverse de fait dans Ariane              |
| `icon`               | Icône                                                              | Déjà transverse de fait dans Ariane (`ar-alert`) |

**Le part racine ne justifie jamais, à lui seul, l'ajout d'un nouvel élément wrapper.** La
justification initiale (éviter une collision de nom lors d'un chaînage `exportparts` si un
composant est un jour imbriqué dans un autre) s'est révélée spéculative en pratique : `exportparts`
n'est utilisé nulle part dans le codebase actuel, et le seul nesting réel entre composants Ariane
(`ar-tooltip` dans `ar-table-sort`, #168) ne s'appuie pas sur ce mécanisme. Renommer un part racine
déjà existant (`base`/`container` → nom du composant) reste fait, sans coût, par clarté — mais
ajouter un wrapper dédié rien que pour porter ce rôle (comme fait pour `ar-datepicker` au lot 1)
n'est plus la politique par défaut : ne l'envisager que si un besoin concret de nesting/exportparts
se présente. `ar-datepicker` n'est pas revu rétroactivement pour l'instant.

`trigger` et `action-button` restent des rôles frères, pas hiérarchiques : `trigger` uniquement
pour un toggle de panel/zone repliable, `action-button` pour tout autre bouton de commande (close,
prev/next, today, footer-button...).

**`field` a deux spécialisations reconnues, réutilisables par tout futur composant** — même schéma
générique+spécifique que `control`/`action-button` : `input` (champ texte/textarea) et `select`
(liste déroulante). Ce ne sont pas de simples noms qui coïncident aujourd'hui sur `ar-datepicker`
(`input`) et `ar-pagination` (`select`) — ce sont désormais des noms de vocabulaire officiels :
tout futur composant avec un champ texte doit utiliser `part="input field"`, tout futur composant
avec une liste déroulante `part="select field"`, plutôt que d'inventer un nom propre. Justification
pratique (retour utilisateur) : un consommateur qui veut un style de champ cohérent entre un input
texte et un select a besoin de cibler `::part(field)` pour le commun (bordure, padding, focus-ring)
tout en gardant `::part(input)`/`::part(select)` pour ce qui diverge structurellement (flèche du
select, largeur, `appearance`).

**Convention `-button` en toutes lettres, jamais `-btn` abrégé.** `action-button` établit la
convention en toutes lettres ; les parts déjà existants `nav-btn`/`footer-btn`/`today-btn`/
`close-btn` (datepicker) et `nav-btn` (pagination), ainsi que les `@cssprop` associés
(`--ar-pagination-btn-size`, `--ar-datepicker-nav-btn-*`, `--ar-datepicker-footer-btn-*`), sont
renommés en toutes lettres (`nav-button`, `footer-button`, `today-button`, `close-button`,
`--ar-pagination-button-size`, etc.) pour rester cohérents avec le reste du vocabulaire. Renommage
sec (alpha, cf. contrainte projet), entièrement contenu dans les 2 composants déjà dans le
périmètre de ce lot — aucune extension à d'autres composants.

## Slots — documenter l'existant, un correctif de cohérence

Audit des `@slot` sur les 19 composants : contrairement aux `part`, les slots suivent déjà des
conventions cohérentes de fait, sans l'incohérence type `base`/`container` trouvée sur les parts.
Un `slot` désigne intrinsèquement un point précis de structure (l'icône du bouton close, pas un
point d'injection générique réutilisable ailleurs) — la notion de rôle transverse abstrait ne s'y
transpose pas comme pour les `part`. Décision : **pas de retrofit de code pour les slots**, sauf un
correctif ponctuel repéré pendant l'audit (ci-dessous). Seule la documentation est nouvelle.

Conventions déjà suivies, à formaliser dans la doc :

- **Slot par défaut (sans nom)** = contenu principal — natif HTML, aucune ambiguïté possible
  (dropdown, alert, collapse, dialog, tab, tab-panel, tooltip, table-sort...).
- **`trigger`** — même nom, même sens que le rôle `trigger` des `part` (dropdown, collapse).
- **Suffixe `<rôle>-icon`** — déjà systématique (mémoire `project_icon_slot_pattern`) : `close-icon`,
  `home-icon`, `trigger-icon`, `prev-icon`/`next-icon`.
- **`header-actions`, `footer`** (dialog) — reprennent déjà les noms des `part` homonymes.

**Correctif de cohérence inclus dans ce chantier** : `ar-charcounter` expose `icon-warning`/
`icon-error`, seul écart au suffixe `<rôle>-icon` établi partout ailleurs. Renommés en
`warning-icon`/`error-icon`. Renommage sec (pas d'alias, pas de dépréciation) — projet en alpha,
`warnDeprecated` non requis à ce stade (cf. CLAUDE.md).

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
n'accumule jamais ancien nom + nouveau, **même quand le nom existant est sémantiquement
significatif** (`nav` sur un `<nav>`, `bubble` pour une bulle) plutôt qu'un filler générique
(`base`, `container`) : le part racine est toujours **remplacé** par le nom du composant, sur le
modèle Web Awesome. Un lot 2 (`ar-breadcrumb`/`ar-tooltip`) et le lot 1 (`ar-pagination`) ont un
temps dérogé à cette règle en gardant `nav`/`bubble` en plus du nom du composant — corrigé
rétroactivement (lot 2 étendu) après revue : un doublon sur la racine n'ouvre aucun usage
transverse (contrairement à `control`/`field`/`action-button`, qui permettent de cibler une
famille d'éléments à travers plusieurs composants, la racine est unique par composant et
n'a donc rien à gagner à conserver un second nom). Composants sans aucun part racine actuellement
(spinner, dialog) : le part est simplement ajouté, pas de migration.

**JSDoc de la racine — description minimale.** `@csspart <nom> - Racine du composant.`, sans
qualificatif ni mention de ce qu'elle remplace ou porte — même formulation partout, alignée sur
le lot 1 (`ar-pagination`, `ar-datepicker`, `ar-charcounter`).

**JSDoc `@csspart`.** Une ligne dédiée par rôle transverse (même convention que les parts d'état
`--current`/`--pending`), avec une description normale — **sans** marqueur « Rôle transverse (voir
...) » répété sur chaque ligne. Décision révisée après livraison du premier lot : le marqueur par
ligne, présent sur chaque `@csspart` d'un rôle transverse, s'est révélé répétitif dès qu'un
composant porte plusieurs rôles (jusqu'à 4 lignes dupliquant la même mention sur `ar-datepicker`).

```ts
/**
 * @csspart close - Le bouton de fermeture.
 * @csspart action-button - Porté par `close` : déclenche une action ponctuelle.
 */
```

**Détection automatique + mention unique dans la doc générée.** Plutôt que documenter le caractère
transverse dans chaque ligne JSDoc, la page composant (`ComponentApi.astro`) détecte
automatiquement si le composant expose au moins un rôle transverse — comparaison de chaque nom de
part contre le catalogue des rôles (`apps/docs/src/utils/transverse-roles.ts`, source de vérité
unique synchronisée avec la table de `/getting-started/naming-conventions`), plus un cas
particulier pour la racine (nom de part égal au nom du composant sans préfixe). Si détecté, une
phrase est ajoutée automatiquement au paragraphe d'aide (`hint`) de la section CSS Parts, avec un
lien cliquable vers `/getting-started/naming-conventions` — pas de répétition par ligne.

## Documentation

Nouvelle page dédiée dans `apps/docs` (`/getting-started/naming-conventions` ou emplacement équivalent
choisi au moment du plan d'implémentation, cohérent avec l'architecture de nav existante).
**Objectif explicite de la page, pas seulement une table de référence passive** : expliciter que ce
vocabulaire existe pour permettre au consommateur d'écrire des règles CSS transverses qui
facilitent l'intégration d'Ariane dans son propre design system — un thème qui style
`::part(action-button)` une seule fois s'applique à tous les composants qui portent ce rôle, sans
dupliquer la règle composant par composant. Cette raison d'être doit être formulée dans
l'introduction de la page, pas seulement démontrée implicitement par la table. Deux sections :

1. **Rôles `::part()` transverses** : chaque rôle, sa signification, et les composants/parts qui le
   portent. Référencée depuis chaque page composant concernée par au moins un rôle transverse.
2. **Conventions de `slot`** : slot par défaut = contenu principal, `trigger`, suffixe `<rôle>-icon`,
   `header-actions`/`footer` — documente l'existant, pas de nouveau mécanisme.

## Rollout

Rétrofit progressif par lots sur le modèle du chantier #129 (spec + plan dédiés par lot, exécution
subagent-driven-development, revue finale de branche). Premier lot suggéré : `ar-datepicker` et
`ar-pagination` (les plus riches en rôles concernés : `control`, `field`, `action-button`, racine
absente). Le correctif de slot `ar-charcounter` (`icon-warning`/`icon-error` →
`warning-icon`/`error-icon`) est indépendant du reste — peut être fait dans n'importe quel lot,
y compris le premier. Ordre des lots suivants à affiner au moment d'écrire le premier plan.

**Lot 2** : renommage du part racine `base`/`container`/`nav`/`bubble` → nom du composant, gratuit
(élément wrapper déjà existant, simple renommage de chaîne, toujours en remplacement — jamais
additif, cf. règle ci-dessus) sur `ar-breadcrumb`, `ar-collapse`, `ar-progressbar`, `ar-tab`,
`ar-tab-panel`, `ar-tab-group`, `ar-tooltip`. Inclut aussi la correction rétroactive de
`ar-pagination` (lot 1) : `nav pagination` → `pagination` seul, pour la même raison. `ar-alert`,
`ar-dropdown`, `ar-table-sort` et `ar-spinner` n'ont pas de wrapper existant pour porter ce rôle
sans en ajouter un — exclus du lot 2 par la politique retenue ci-dessus (pas de wrapper ajouté sans
besoin concret). Le lot 2 inclut aussi 2 correctifs propres à
`ar-collapse` : `content` → `body` (aligne sur le rôle transverse retenu) et `panel` → `collapsible`
(le wrapper animé overflow/hauteur n'est pas un conteneur flottant, collision de sens à lever avec
le rôle `panel`).

## Impact `custom-elements.json` / doc générée

Les rôles transverses sont de simples `@csspart` supplémentaires, déjà supportés par le pipeline
CEM existant — aucun mécanisme nouveau requis côté génération de manifeste. La page de doc dédiée
(`/getting-started/naming-conventions`) reste écrite à la main (table statique), pas générée
depuis le manifeste — cf. section « Documentation ». Seule nouveauté côté site de doc :
`ComponentApi.astro` détecte, pour chaque composant, si l'un de ses parts porte un rôle transverse
(catalogue dans `apps/docs/src/utils/transverse-roles.ts`) afin d'afficher une mention avec lien
vers la page dédiée dans le paragraphe d'aide de la section CSS Parts — cf. section « Mécanisme ».

## Hors scope de ce chantier

- Renommage des rôles déjà transverses de fait (`trigger`, `header`, `footer`, `label`, `icon`) —
  confirmés tels quels, aucune migration nécessaire.
- `help-text`/`validation-marker` — cf. section Hors périmètre.
- Extension du vocabulaire à des composants futurs non encore conçus — ce chantier couvre le
  rétrofit des 19 composants existants ; les nouveaux composants adoptent le vocabulaire dès leur
  conception, sans travail supplémentaire de ce chantier.
