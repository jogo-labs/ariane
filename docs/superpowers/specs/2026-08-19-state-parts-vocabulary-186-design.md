# Design — Vocabulaire de parts d'état `::part()`

**Statut :** Validé (en attente de plan d'implémentation)
**Date :** 2026-08-19
**Contexte :** issue [#186](https://github.com/jogo-labs/ariane/issues/186), suite de #181

## Problème

Le suffixe BEM utilisé pour exprimer un état actif/courant sur un `part=` varie sans convention
documentée selon les composants (`item--current`, `bullet--current`, `tab--selected`...) — même
famille de problème que #181 (vocabulaire `::part()` non harmonisé), sur l'axe état plutôt que
rôle.

## Constat de l'audit

Le pattern « part d'état » (convention BEM double-tiret, `<élément>--<état>`) a déjà été établi et
appliqué de façon cohérente au fil du chantier #129 (voir ADR-005, amendements du 2026-07-27 et
suivants), avec un choix de terminologie déjà tranché à cette occasion : `current` pour une
position atteinte par navigation, `selected` pour un choix actif de l'utilisateur — les deux
coexistent avec un usage distinct, pas un doublon à unifier.

Relecture de tous les `part` existants portant un modificateur d'état sur les 19 composants :

| Composant        | Part          | Modificateur                     |
| ---------------- | ------------- | -------------------------------- |
| `ar-pagination`  | `item`        | `item--current`                  |
| `ar-pagination`  | `prev`/`next` | `nav-button--disabled`           |
| `ar-breadcrumb`  | `bullet`      | `bullet--current`                |
| `ar-stepper`     | `bullet`      | `bullet--current`                |
| `ar-stepper`     | `step-link`   | `step-link--current`             |
| `ar-tab`         | `tab`         | `tab--selected`                  |
| `ar-table-sort`  | `sort-button` | `sort-button--pending`           |
| `ar-charcounter` | `count`       | `count--warning`, `count--error` |

**Aucune incohérence de nommage trouvée** : chaque modificateur suit déjà la convention établie et
un usage cohérent avec son équivalent ARIA natif quand il existe (`aria-current`, `aria-selected`,
`aria-disabled`). Ce chantier n'implique donc **aucun retrofit ni renommage de code** — le travail
restant est de rendre cette convention publique, elle n'existait jusqu'ici que dans un ADR interne.

## Vocabulaire retenu

| État         | Signification                    | Équivalent natif            |
| ------------ | -------------------------------- | --------------------------- |
| `--current`  | Position atteinte par navigation | `aria-current`              |
| `--selected` | Choix actif de l'utilisateur     | `aria-selected`             |
| `--disabled` | Désactivé                        | `aria-disabled`/`:disabled` |
| `--pending`  | Traitement en cours              | —                           |
| `--warning`  | État d'avertissement             | —                           |
| `--error`    | État d'erreur                    | —                           |

Toutes les entrées partagent la même syntaxe (`part="<élément> <élément>--<état>"`, le part de
base toujours présent). La documentation publique reste factuelle : elle liste ce qui existe et
comment s'en servir, sans distinguer en sous-catégories internes (état togglé vs variante de
sévérité) — cette distinction n'apporte rien à un consommateur qui veut simplement savoir quels
`::part()` cibler.

## Hors périmètre

- `ar-datepicker` : aucun changement de code. Le composant n'expose aujourd'hui aucun état de son
  élément `day` (aujourd'hui/sélectionné/désactivé) via `::part()` — ce n'est pas une incohérence
  de nommage à corriger par ce chantier, donc rien à documenter ni retrofitter ici.
- `:state()`/`CustomStateSet` (API `ElementInternals`) : ne s'applique pas, ces modificateurs
  portent sur des éléments internes, pas sur l'hôte du composant.
- Extension du vocabulaire à des composants futurs non encore conçus : ce chantier documente
  l'existant ; les nouveaux composants adoptent la convention dès leur conception.

## Documentation

Nouvelle section « Parts d'état » sur `/getting-started/naming-conventions`, après la table des
rôles transverses (#181), avec la table du vocabulaire retenu ci-dessus. L'introduction de la
section explicite le même objectif que la section rôles : permettre au consommateur d'écrire des
règles CSS transverses (`::part(x--current)` une fois, applicable à tout composant qui porte cet
état) sans redécouvrir une convention par composant.

## Mécanisme — détection automatique dans `ComponentApi.astro`

Même mécanisme que les rôles transverses (#181, `apps/docs/src/utils/transverse-roles.ts`) :

- Nouveau fichier `apps/docs/src/utils/state-parts.ts` exportant `isStatePart(partName): boolean`
  — détecte le motif `<élément>--<état>` (présence du séparateur `--`).
- `ComponentApi.astro` calcule `hasStateParts` (même schéma que `hasTransverseParts`) et ajoute,
  si détecté, une phrase au paragraphe d'aide de la section CSS Parts avec un lien ancré vers la
  nouvelle section de `/getting-started/naming-conventions`.
- Les deux mécanismes (rôles transverses, parts d'état) cohabitent sans collision : le mot après
  `--` n'entre jamais dans le catalogue `TRANSVERSE_ROLES`.

## Tests

- Test unitaire pour `isStatePart` : cas positifs (`bullet--current`, `count--warning`) et
  négatifs, notamment l'absence de faux positif sur un part à tiret simple non lié à un état
  (`step-link`, `action-button`) — même garde-fou que celui déjà validé côté composant
  (`validate-part-state-order.js`, ADR-005) pour la même classe de faux positif.
- Vérification visuelle en dev server : hint présent sur un composant avec part d'état
  (`ar-pagination`), absent sur un composant sans (`ar-tooltip`).
- Aucun nouveau test `packages/core` : aucun code composant ne change.

## Suivi

Une issue GitHub séparée est ouverte pour investiguer l'exposition des états combinables de
`ar-datepicker` (`day`) via `::part()` — problème distinct nécessitant une extension du mécanisme
ADR-005 (actuellement limité à un seul état à la fois par élément), hors périmètre de ce chantier.
