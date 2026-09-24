# Design — ar-datepicker

**Date :** 2026-06-12  
**Statut :** Validé

---

## Périmètre

Composant de sélection de **date unique** avec aide visuelle à la saisie. Combine un champ texte libre et un calendrier popover synchronisés. Pas de sélection de plage de dates (feature future, composant séparé).

---

## Architecture

### Approche retenue : composant unique + controller interne

Un seul LitElement public (`ar-datepicker`). La logique calendrier est extraite dans un `CalendarController` Lit Reactive Controller privé, testable indépendamment. Le positionnement du popover réutilise `AnchoredController`.

### Fichiers

```
packages/core/src/components/datepicker/
  datepicker.ts                  ← LitElement ar-datepicker
  datepicker.styles.ts
  datepicker.test.ts             ← Vitest (logique, attributs, événements)
  datepicker.browser.test.ts     ← WTR (focus, clavier, synchronisation)
  datepicker.a11y.test.ts        ← WTR + axe-core
  calendar.controller.ts         ← Lit Reactive Controller (privé)
  calendar.controller.test.ts    ← Vitest unitaire pur
  date-parser.ts                 ← parsing/formatting (privé)
  date-parser.test.ts
```

---

## API publique

### Propriétés / Attributs

| Propriété        | Type                      | Défaut         | Description                                                |
| ---------------- | ------------------------- | -------------- | ---------------------------------------------------------- |
| `value`          | `string`                  | `''`           | Date ISO 8601 (`2026-06-12`)                               |
| `format`         | `string`                  | `'dd/MM/yyyy'` | Pattern de saisie texte                                    |
| `locale`         | `string`                  | navigateur     | Locale pour les labels du calendrier                       |
| `min`            | `string`                  | —              | Date ISO minimum sélectionnable                            |
| `max`            | `string`                  | —              | Date ISO maximum sélectionnable                            |
| `isDateDisabled` | `(date: Date) => boolean` | —              | Callback de désactivation custom                           |
| `placeholder`    | `string`                  | —              | Placeholder de l'input (ne pas y mettre d'infos de format) |
| `autocomplete`   | `string`                  | —              | Répercuté sur l'input natif (`bday`, `off`…)               |
| `label`          | `string`                  | —              | Label du champ (fallback si slot `label` absent)           |
| `disabled`       | `boolean`                 | `false`        | Désactive le composant, exclut la valeur du formulaire     |
| `readonly`       | `boolean`                 | `false`        | Bloque saisie ET ouverture du calendrier, valeur soumise   |
| `required`       | `boolean`                 | `false`        | Champ obligatoire                                          |
| `name`           | `string`                  | —              | Participation aux formulaires natifs                       |
| `open`           | `boolean`                 | `false`        | État du popover (reflect)                                  |
| `has-error`      | `boolean`                 | `false`        | Reflété automatiquement quand le slot `error` a du contenu |

### Getter public

```ts
get inputElement(): HTMLInputElement
```

Permet à l'intégrateur de brancher une librairie de masque de saisie (IMask, Cleave.js…) sur l'input interne.

### Événements

| Événement                      | Déclencheur                                                                                                                                                                            | `detail`                                                               |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `ar-datepicker-input-change`   | Valeur modifiée et commitée — blur sur l'input (saisie complète ou non) OU sélection via le calendrier. Pas de distinction entre les deux modes. Miroir de l'événement natif `change`. | `{ value: string \| null, valueAsDate: Date \| null, valid: boolean }` |
| `ar-datepicker-input-complete` | Saisie texte forme une date complète au format attendu (valide ou non). Signal temps réel pendant la frappe. `detail.valid` indique si la date est calendriquement correcte.           | `{ value: string \| null, valueAsDate: Date \| null, valid: boolean }` |
| `ar-datepicker-show`           | Avant ouverture du popover                                                                                                                                                             | —                                                                      |
| `ar-datepicker-shown`          | Après ouverture                                                                                                                                                                        | —                                                                      |
| `ar-datepicker-hide`           | Avant fermeture                                                                                                                                                                        | —                                                                      |
| `ar-datepicker-hidden`         | Après fermeture                                                                                                                                                                        | —                                                                      |

Le champ `valid` distingue une saisie au bon format (`complete: true`) mais calendriquement impossible (ex. `30/02/2026`).

### Slots

| Slot          | Description                                                                                                                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `label`       | Contenu riche du label (remplace le prop `label`)                                                                                                                                                    |
| `after-label` | Éléments après le label (bouton d'aide, tooltip…)                                                                                                                                                    |
| `hint`        | Texte d'aide persistant lié via `aria-describedby`. Valeur par défaut basée sur le prop `format` (ex. `Format attendu : dd/MM/yyyy`). L'intégrateur surcharge via le slot pour localiser le libellé. |
| `error`       | Message d'erreur — déclenche `has-error` sur le host et annoncé via `role="alert"`                                                                                                                   |

### CSS Parts

| Part      | Élément                                           |
| --------- | ------------------------------------------------- |
| `input`   | Le champ texte                                    |
| `trigger` | Le bouton d'ouverture du calendrier               |
| `panel`   | Le popover flottant                               |
| `header`  | En-tête du calendrier (navigation)                |
| `grid`    | La grille calendrier (`<table>`)                  |
| `day`     | Les boutons jours                                 |
| `footer`  | Pied du calendrier (boutons Aujourd'hui / Fermer) |

### Tokens CSS

| Token                                      | Description                       |
| ------------------------------------------ | --------------------------------- |
| `--ar-datepicker-panel-width`              | Largeur du popover                |
| `--ar-datepicker-day-size`                 | Taille des cellules jour          |
| `--ar-datepicker-day-today-bg`             | Fond du jour actuel               |
| `--ar-datepicker-day-today-color`          | Couleur texte du jour actuel      |
| `--ar-datepicker-day-selected-bg`          | Fond du jour sélectionné          |
| `--ar-datepicker-day-selected-color`       | Couleur texte du jour sélectionné |
| `--ar-datepicker-input-error-border-color` | Bordure input en état d'erreur    |

Cascade vers les tokens `--ar-panel-*` pour le panel flottant.

---

## Structure Shadow DOM

```
<label part="label">
  <slot name="label">{prop label}</slot>
</label>
<slot name="after-label"></slot>
<div class="input-wrapper">
  <input
    part="input"
    aria-describedby="hint-{uid} error-{uid}"
    autocomplete={autocomplete}
  >
  <button part="trigger" aria-label="Ouvrir le calendrier">…</button>
</div>
<p id="hint-{uid}">
  <slot name="hint">{défaut dynamique selon format + locale}</slot>
</p>
<p id="error-{uid}" role="alert">
  <slot name="error"></slot>
</p>

<!-- Popover -->
<div role="dialog" aria-modal="true" part="panel">
  …
</div>
```

Les IDs `hint-{uid}` et `error-{uid}` sont dans le shadow root — résout le problème de scope `aria-describedby` cross shadow DOM. Les `<p>` ont `margin: 0` dans `datepicker.styles.ts`.

---

## Structure du calendrier (APG Date Picker Dialog)

```html
<div role="dialog" aria-modal="true" aria-label="Sélectionner une date" part="panel">
  <div part="header">
    <button aria-label="Année précédente">«</button>
    <button aria-label="Mois précédent">‹</button>
    <span aria-live="polite">Juillet 2026</span>  <!-- texte statique, non cliquable -->
    <button aria-label="Mois suivant">›</button>
    <button aria-label="Année suivante">»</button>
  </div>

  <table role="grid" aria-label="Juillet 2026" part="grid">
    <thead>
      <tr>
        <th abbr="Lundi" scope="col">Lun</th>
        …
      </tr>
    </thead>
    <tbody>
      <tr>
        <td role="gridcell">
          <button
            part="day"
            tabindex="-1"
            aria-selected="false"
            aria-label="1 juillet 2026"
            aria-current="date"   ← uniquement sur aujourd'hui
            aria-disabled="true"  ← si désactivé (pas disabled natif)
          >1</button>
        </td>
        …
      </tr>
    </tbody>
  </table>

  <div part="footer">
    <button>Aujourd'hui</button>
    <button>Fermer</button>
  </div>
</div>
```

**Grille toujours 6 semaines fixes** — évite les sauts de layout. Les jours débordants (mois précédent/suivant) sont rendus avec style atténué mais `aria-label` complet.

---

## Navigation clavier

| Touche                              | Action                                                       |
| ----------------------------------- | ------------------------------------------------------------ |
| `←` `→` `↑` `↓`                     | Naviguer jour par jour dans la grille                        |
| `Page Up` / `Page Down`             | Mois précédent / suivant                                     |
| `Shift+Page Up` / `Shift+Page Down` | Année précédente / suivante                                  |
| `Home` / `End`                      | Premier / dernier jour de la semaine courante                |
| `Entrée` / `Espace`                 | Sélectionner le jour focalisé                                |
| `Échap`                             | Fermer sans sélectionner                                     |
| `Tab`                               | Cycle : trigger → nav header → grille → Aujourd'hui → Fermer |

**Roving tabindex** : `tabindex="0"` sur le jour actif, `tabindex="-1"` sur tous les autres.

**Gestion du focus à l'ouverture :**

- Date sélectionnée → focus sur la date sélectionnée
- Aucune sélection → focus sur aujourd'hui si le mois affiché est le mois courant, sinon sur le 1er du mois

**Focus à la fermeture** : retourné sur le bouton trigger.

**Comportement `disabled` vs `readonly` :**

|                              | `disabled` | `readonly` |
| ---------------------------- | ---------- | ---------- |
| Input focusable              | non        | oui        |
| Calendrier s'ouvre           | non        | non        |
| Saisie texte                 | bloquée    | bloquée    |
| Valeur soumise au formulaire | non        | oui        |

---

## CalendarController

Lit Reactive Controller privé (pas un LitElement).

```ts
// État réactif
currentViewMonth: Date     // mois affiché dans la grille
focusedDate: Date          // jour avec tabindex="0"
selectedDate: Date | null  // jour sélectionné

// Navigation
previousMonth(): void
nextMonth(): void
previousYear(): void
nextYear(): void

// Grille
getGridWeeks(): Date[][]   // 6 semaines × 7 jours, débords inclus

// Helpers
isDisabled(date: Date): boolean  // agrège min, max, isDateDisabled
isToday(date: Date): boolean
isSameMonth(date: Date): boolean // pour styler les jours débordants
```

---

## date-parser.ts

Module privé, zéro dépendance externe.

```ts
interface ParseResult {
  complete: boolean   // le pattern est entièrement rempli
  valid: boolean      // la date est calendriquement valide
  date: Date | null
}

// Tokens supportés : dd, MM, yyyy
parse(input: string, format: string): ParseResult
format(date: Date, format: string): string
```

**Validation stricte :** après parsing des tokens, la date reconstituée est comparée aux valeurs saisies — attrape `30/02` (débordement de mois).

`complete` alimente `ar-datepicker-input-complete`.  
`valid` alimente le booléen `detail.valid` des deux événements.

---

## Stratégie de tests

### `date-parser.test.ts` (Vitest)

- Parse nominal, toutes combinaisons de tokens
- Saisies incomplètes (`complete: false`)
- Dates invalides : 30/02, 31/11, 29/02 hors bissextile
- Aller-retour `format()` → `parse()`

### `calendar.controller.test.ts` (Vitest)

- `getGridWeeks()` : toujours 6 semaines, débords corrects
- Navigation en limite (janvier → décembre année précédente…)
- `isDisabled()` : min, max, callback, combinaisons
- `isToday()`, `isSameMonth()`

### `datepicker.test.ts` (Vitest + happy-dom)

- Propriétés reflétées : `open`, `disabled`, `readonly`, `has-error`
- Événements et `detail` correct
- `inputElement` getter
- `readonly` bloque l'ouverture
- Participation formulaire (`ElementInternals`)

### `datepicker.browser.test.ts` (WTR + Playwright)

- Focus à l'ouverture (aujourd'hui / date sélectionnée)
- Focus retourné au trigger à la fermeture
- Navigation clavier complète
- Roving tabindex (un seul `tabindex="0"` à la fois)
- Synchronisation input ↔ calendrier dans les deux sens
- `ar-datepicker-input-complete` déclenché au bon moment

### `datepicker.a11y.test.ts` (WTR + axe-core)

- Audit axe état fermé et état ouvert
- `aria-describedby` correctement résolu
- `aria-live` annoncé lors de la navigation entre mois
- `aria-disabled` sur jours désactivés (pas `disabled` natif)
- `aria-current="date"` sur aujourd'hui
- `aria-selected` sur le jour sélectionné

---

## Documentation (apps/docs)

Page `apps/docs/src/content/components/datepicker.mdx`.

**Sections :**

1. Démo / Playground (format, locale, min, max, disabled, readonly, slots)
2. Saisie texte — synchronisation input ↔ calendrier, événements
3. Validation — slot error, has-error, distinction complete vs valid
4. Dates désactivées — min, max, isDateDisabled (ex. week-ends)
5. Formulaires — participation native, readonly vs disabled
6. Intégration masque de saisie — exemple inputElement + IMask
7. Accessibilité — raccourcis clavier, ARIA, recommandations label/hint/error
8. API — props, événements, slots, parts, tokens

**Note `placeholder`** (section accessibilité) :

> Le `placeholder` ne doit pas contenir d'informations utiles à la saisie (format attendu, exemples de contraintes). Préférer le slot `hint` pour ces informations. Réserver `placeholder` à des exemples de valeurs illustratifs (`ex. 01/01/1990`).
