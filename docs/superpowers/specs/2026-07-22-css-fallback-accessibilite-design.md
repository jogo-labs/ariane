# Fallback CSS d'accessibilité pour les surfaces flottantes — Design

## Contexte

ADR-004 (2026-05-08) autorisait un fallback fonctionnel inline dans les composants
(`var(--ar-tab-color, currentColor)`). ADR-005 (2026-07-16, chantier headless #47) l'a
explicitement interdit : plus aucune valeur de repli, fonctionnelle ou cosmétique, ne doit
apparaître dans le CSS d'un composant — toute valeur de design vit dans
`packages/core/src/styles/themes/default.css`, consommée via `var(--token)` sans second
argument. La règle est vérifiée automatiquement par
`packages/core/scripts/validate-no-hardcoded-tokens.js`, branché dans `cem.config.js`, qui
fait échouer `npm run build:manifest` si une valeur littérale est assignée à un `--ar-*`
dans un `*.styles.ts`.

Cette règle stricte suppose implicitement que `default.css` (ou un thème équivalent) est
toujours chargé par le consommateur. Dans la pratique — en particulier pour les surfaces
flottantes avec fond (`packages/core/src/styles/shared/panel.styles.ts`, partagé par
`ar-dropdown`, `ar-breadcrumb`, `ar-stepper`, `ar-datepicker`, plus `ar-tooltip` qui a son
propre système de tokens) — l'absence de thème rend le composant transparent : le panel se
confond avec le contenu de la page, le texte devient illisible. Ce n'est plus seulement une
question esthétique, mais un risque d'accessibilité concret (contraste, lisibilité) découvert
en pratique en réfléchissant à l'usage réel des composants déjà livrés (issue #125 et
discussion associée).

Ce document explore une exception ciblée à ADR-005 : dans quels cas, et selon quel mécanisme,
un composant peut-il embarquer un filet de sécurité fonctionnel sans revenir sur l'esprit
headless de la librairie ?

## Principe retenu

Amendement à ADR-005. Un token peut recevoir un fallback fonctionnel dans le composant si, et
seulement si, son absence rend le composant **confus, cassé ou inaccessible sans thème
chargé** — pas juste « moins joli ».

- **Sous-ensemble prioritaire (présomption d'éligibilité) :** les cas relevant d'un critère
  WCAG précis et identifiable (1.4.3 contraste texte, 1.4.11 contraste non-textuel, 2.4.7
  focus visible, 2.5.8 taille de cible…).
- **Cas général (éligibilité sans présomption automatique) :** toute autre absence de valeur
  qui rend le composant confus ou cassé en pratique (ex. un panel totalement transparent qui
  se confond avec le contenu de la page — pas un manquement WCAG au sens strict, mais un vrai
  problème d'usage). Chaque cas doit être justifié individuellement, pas déduit d'une règle
  générale par type de propriété.

Ce critère devient la règle générale de la librairie, applicable à terme à l'ensemble des 19
composants. Il n'est **pas** appliqué rétroactivement dans ce chantier : le périmètre
d'implémentation immédiate reste les surfaces flottantes déjà identifiées (voir Périmètre). Un
audit dédié, à part entière, appliquera ce même critère au reste de la librairie — issue à
créer dans la milestone « Chantier post-beta : technique & doc » (#1), non traitée ici.

### Précédent existant

Ce n'est pas la première fois que la librairie assume une exception isolée au modèle headless
strict : l'attribut `size` d'`ar-dialog` (ADR-005, section « Exception assumée ») impose déjà
une taxonomie que le composant a choisie à la place du consommateur, documentée comme un cas
isolé et non un précédent générique. Les exceptions de ce document suivent la même logique :
chacune doit être justifiée pour le composant concerné, pas généralisée par mimétisme.

## Mécanisme

Deux mécanismes distincts selon la nature de la propriété, jamais un fallback « à nous »
choisi arbitrairement :

### A. Couleurs système CSS4 (préféré, quand applicable)

Pour tout ce qui touche au contraste (fond, texte, bordure de séparation), le fallback utilise
les mots-clés couleur système CSS (`Canvas`, `CanvasText`, `ButtonBorder`, `ButtonFace`,
`Field`, `FieldText`, etc.) plutôt qu'une valeur littérale. Ces mots-clés héritent du thème
OS/navigateur de l'utilisateur (y compris le mode contraste élevé), donc contraste garanti sans
qu'Ariane impose une opinion de design.

### B. Valeur littérale justifiée (quand pas d'équivalent système)

Pour les propriétés sans équivalent système (dimensions, tailles), un fallback littéral est
autorisé mais doit être documenté par une justification spécifique au composant, sur le modèle
déjà utilisé pour les tokens « valeur propre » (`--ar-dropdown-min-width`,
`--ar-datepicker-panel-max-width`, `--ar-stepper-panel-padding`).

### Ce qui reste hors périmètre de l'exception

`border-radius` et `box-shadow` restent purement cosmétiques — un panel à angles droits sans
ombre reste utilisable — donc **hors exception**, gouvernés par ADR-005 stricte (pas de
fallback). Le padding générique (espacement interne d'un panel) est également hors exception
par défaut : un panel avec du texte collé aux bords est inélégant mais pas « cassé ». Seul un
cas justifié individuellement (comme la taille des cellules jour du datepicker, voir
ci-dessous) peut faire exception à ce défaut.

## Périmètre de cette passe

### Système panel partagé

`packages/core/src/styles/shared/panel.styles.ts`, consommé par `ar-dropdown`,
`ar-breadcrumb`, `ar-stepper`, `ar-datepicker` :

| Token                     | Fallback       | Mécanisme           |
| ------------------------- | -------------- | ------------------- |
| `--ar-panel-bg`           | `Canvas`       | Couleur système (A) |
| `--ar-panel-text`         | `CanvasText`   | Couleur système (A) |
| `--ar-panel-border-color` | `ButtonBorder` | Couleur système (A) |

`border-radius` (`--ar-panel-radius`), `box-shadow` (`--ar-panel-shadow`) et `padding`
(`--ar-panel-padding`) restent sans fallback (hors périmètre, cf. ci-dessus).

### `ar-tooltip`

Tokens propres (pas de `panelStyles` partagé), consommés dans `tooltip.styles.ts:24-25` et
`:51` :

| Token                | Fallback     | Mécanisme           |
| -------------------- | ------------ | ------------------- |
| `--ar-tooltip-bg`    | `Canvas`     | Couleur système (A) |
| `--ar-tooltip-color` | `CanvasText` | Couleur système (A) |

### `ar-datepicker` — exceptions cas par cas

Deux tokens supplémentaires, justifiés individuellement pour ce composant (pas une règle
générale sur « padding » ou « max-width ») :

| Token                             | Fallback | Mécanisme             | Justification                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------- | -------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--ar-datepicker-panel-max-width` | `25rem`  | Littéral justifié (B) | Sans max-width, la grille de ~35 jours s'étale sur toute la largeur de la page — plus reconnaissable comme un calendrier (critère B, cas général).                                                                                                                                                                                                                                       |
| `--ar-datepicker-day-size`        | `2.5rem` | Littéral justifié (B) | `[part='grid']` a `border-collapse: collapse` (`datepicker.styles.ts:122`), qui supprime l'espacement par défaut du navigateur entre cellules de `<table>`. Sans thème, `[part='day']` (`datepicker.styles.ts:138-139`, un `<button>`) se dimensionne à son contenu textuel, probablement sous 24×24px — critère WCAG 2.5.8 (Target Size Minimum, niveau AA), sous-ensemble prioritaire. |

**Explicitement hors périmètre de cette passe (renvoyé à l'audit dédié)** : les couleurs de
fond des états datepicker (jour sélectionné, aujourd'hui, focus, hover). Le besoin est réel
(un composant de sélection de date sans indication visuelle d'état est difficilement
utilisable sans thème), mais son traitement complet nécessite une revue état par état qui
dépasse le cadre de cette passe ciblée.

## Garde-fou CI

`packages/core/scripts/validate-no-hardcoded-tokens.js` continue d'interdire toute valeur
littérale assignée à un `--ar-*` dans un `*.styles.ts`, sauf dans le second argument d'un
`var()`, et seulement si l'une de ces deux conditions est remplie :

1. **Mot-clé couleur système CSS4** reconnu — liste blanche fermée dans le script, limitée aux
   mots-clés effectivement utilisés dans ce document plus leurs équivalents directs :
   `Canvas`, `CanvasText`, `ButtonBorder`, `ButtonFace`, `ButtonText`, `Field`, `FieldText`,
   `GrayText`. La liste s'étend au cas par cas si un futur composant justifie un mot-clé
   supplémentaire — pas d'ouverture large préventive.
2. **Valeur littérale précédée d'un commentaire au format exact
   `/* a11y-fallback: <raison> */`** sur la ligne immédiatement précédente (même bloc de
   déclarations, une ligne au-dessus de l'assignation `--ar-*: value;`). Le script vérifie la
   présence de ce commentaire au format exact (pas une simple tolérance de tout commentaire) —
   chaque exception littérale reste ainsi auditable (`grep -r "a11y-fallback"
packages/core/src`), pas un trou silencieux dans la règle.

Toute autre valeur littérale, dans ou hors `var()`, continue à faire échouer
`npm run build:manifest` exactement comme aujourd'hui.

## Documentation

Contrairement aux tokens purement thème (où la valeur par défaut a été volontairement retirée
du JSDoc `@cssprop` — la valeur vit uniquement dans `default.css` et peut dériver sans qu'aucun
mécanisme ne le détecte, cf. la correction faite sur `datepicker.ts`/`stepper.ts` dans le cadre
de #125), le fallback d'accessibilité vit **dans le code du composant** : il ne peut pas dériver
silencieusement, toute modification passe par une revue de code sur le fichier `.styles.ts`
lui-même. Mentionner sa valeur dans le JSDoc est donc légitime et utile pour un consommateur :

```
@cssprop --ar-panel-bg - Fond du panel (repli système `Canvas` si aucun thème n'est chargé).
@cssprop --ar-datepicker-day-size - Taille des cellules jour (repli 2.5rem — cible tactile WCAG 2.5.8).
```

## Tests

Pour chaque composant touché, ajouter un test qui vérifie que le fallback s'applique réellement
quand le thème n'est pas chargé — par exemple en réinitialisant la custom property
(`element.style.setProperty('--ar-panel-bg', '')`) et en vérifiant via `getComputedStyle` que
la propriété résolue n'est ni vide ni `transparent`. C'est le seul moyen de garantir dans le
temps que la garantie d'accessibilité ne se fait pas discrètement contourner par un futur
changement (ex. quelqu'un qui retire le fallback en pensant simplifier le code).

## Hors périmètre — suivi

Une issue sera créée dans la milestone « Chantier post-beta : technique & doc » (#1) pour
l'audit général : appliquer le critère retenu dans ce document à l'ensemble des 19 composants
de la librairie (pas seulement les surfaces flottantes), et traiter en particulier les couleurs
d'état du datepicker laissées de côté ici.

## Conséquences

- Amendement à ADR-005 (nouvelle section documentant ce critère et ce mécanisme).
- `validate-no-hardcoded-tokens.js` : nouvelle liste blanche de mots-clés système + support du
  commentaire `a11y-fallback`.
- 7 tokens modifiés dans cette passe : `--ar-panel-bg`, `--ar-panel-text`,
  `--ar-panel-border-color`, `--ar-tooltip-bg`, `--ar-tooltip-color`,
  `--ar-datepicker-panel-max-width`, `--ar-datepicker-day-size`.
- Nouvelle issue de suivi (audit général) à créer dans la milestone #1, hors scope du plan
  d'implémentation qui suivra ce document.
