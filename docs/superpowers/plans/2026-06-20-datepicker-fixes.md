# Plan : Correctifs ar-datepicker (findings code review)

## Contexte

Branch : `feat/ar-datepicker`  
Composant : `packages/core/src/components/datepicker/`  
Source : findings de la code review du 2026-06-20

## Global Constraints

- Lit 3 / TypeScript strict (`exactOptionalPropertyTypes: true`)
- Headless : aucun fallback cosmétique dans les styles du composant
- `import type` pour tous les imports de type
- Prettier : 100 chars, 4 spaces, single quotes
- Conventional Commits (`fix:` pour les bugs, `refactor:` pour le nettoyage)
- Tests : vitest (unit/jsdom) + WTR (browser) — `npm run test:all` depuis la racine
- Ne jamais committer les fichiers `/dist`
- Tous les commits sur `feat/ar-datepicker`

---

## Task 1 — setValidity() + éliminer le double \_syncFormValue()

**Findings adressés :** #1 (critique) et #6 (basse)

### Contexte

`ArDatepicker` est `formAssociated = true` et expose `required`, mais `_syncFormValue()` n'appelle jamais `_internals?.setValidity()`. Résultat : `form.checkValidity()` retourne `true` même quand un champ `required` est vide, et la pseudo-classe `:invalid` ne s'applique jamais.

En parallèle, `_selectDay()` appelle `_syncFormValue()` explicitement, puis set `this.value` déclenche `updated()` qui rappelle `_syncFormValue()` — double écriture sur ElementInternals.

### Objectif

1. Dans `_syncFormValue()`, après `setFormValue`, appeler `setValidity()` :
    - Si `this.required && !this.value` → `setValidity({ valueMissing: true }, 'Veuillez sélectionner une date.', this._input)`
    - Sinon → `setValidity({})` (état valide)

2. Dans `_selectDay()`, retirer l'appel explicite à `_syncFormValue()` — laisser `updated()` gérer le sync unique quand `value` change.

### Fichiers à modifier

- `packages/core/src/components/datepicker/datepicker.ts`

### Tests à écrire / mettre à jour

Dans `datepicker.test.ts` :

- `<ar-datepicker required>` vide → `form.checkValidity()` retourne `false`
- `<ar-datepicker required>` avec valeur → `form.checkValidity()` retourne `true`
- `<ar-datepicker>` (sans required) vide → `form.checkValidity()` retourne `true`
- Vérifier que `_syncFormValue` n'est appelé qu'une fois par sélection de jour (si testable via spy, sinon skip)

### Commit

```
fix(datepicker): setValidity() pour required + supprimer double syncFormValue
```

---

## Task 2 — Garde anti-boucle open/close + void \_show() avec catch

**Findings adressés :** #2 (haute) et #3 (moyenne)

### Contexte

**Finding #2 — Boucle infinie :** Si un consumer annule les deux events `ar-datepicker-hide` et `ar-datepicker-show` simultanément :

- `_hide()` → event cancelled → `this.open = true` → `updated()` → `_show()`
- `_show()` → event cancelled → `this.open = false` → `updated()` → `_hide()`
- → boucle infinie de microtasks, fige le browser

**Fix :** Ajouter un flag `_isTogglingOpen` (ou `_pendingOpen`) qui bloque le re-entry dans `_show()` / `_hide()` quand l'event opposé vient d'être cancelled. Alternative plus simple : ne pas re-écrire `open` si la valeur ne change pas.

La solution la plus simple : dans `_hide()`, quand l'event est cancelled, ne pas re-setter `this.open = true` si `this.open` est déjà `true`. Dans `_show()`, idem. Utiliser un check préalable.

```typescript
// _hide() : si event cancelled
if (!allowed) {
    if (!this.open) this.open = true; // seulement si ça change
    return;
}

// _show() : si event cancelled
if (!allowed) {
    if (this.open) this.open = false; // seulement si ça change
    return;
}
```

Mais ça ne suffit pas : la première itération change bien la valeur. Solution robuste : ajouter un flag privé `_cancelGuard = false` positionné à `true` pendant le dispatch + traitement, reseté en fin de méthode. Si le flag est déjà `true` quand `updated()` tente d'appeler `_show()`/`_hide()`, on skip.

Alternative encore plus simple : comparer `changed.get('open')` (la valeur précédente) dans `updated()` — si `open` a été re-togglé pendant le même cycle, ne pas re-dispatcher.

**Recommandation :** Utiliser un flag `_isHandlingOpenChange = false` dans la classe :

```typescript
private _isHandlingOpenChange = false;

// Dans updated() :
if (changed.has('open') && !this._isHandlingOpenChange) {
    this._isHandlingOpenChange = true;
    try {
        if (this.open) void this._show();
        else this._hide();
    } finally {
        this._isHandlingOpenChange = false;
    }
}
```

Mais attention : comme `_show()` est async, le `finally` se déclenche avant la fin de `_show()`. Il faut adapter.

**Approche finale recommandée :** Dans `_hide()`, si l'event est cancelled, setter `this.open = true` uniquement si `this.open !== true`. Dans `_show()`, si l'event est cancelled, setter `this.open = false` uniquement si `this.open !== false`. Lit ne schedule pas de re-render si la valeur ne change pas → la boucle est brisée.

```typescript
// _hide()
if (!allowed) {
    // Évite une boucle si show est aussi cancelled
    if (this.open !== true) this.open = true;
    return;
}

// _show()
if (!allowed) {
    if (this.open !== false) this.open = false;
    return;
}
```

Vérifier : si `open` était déjà `true` quand `_hide()` est appelée (ce qui est le cas normal — on ferme un panel ouvert), et que l'event est cancelled, alors `this.open !== true` est `false` → on ne re-set pas → pas de re-render → boucle stoppée. ✓

**Finding #3 — Unhandled rejection :** Dans `updated()`, `this._show()` est appelée sans `await` ni `.catch()`. Wrapper avec `void this._show().catch((e) => { if (__DEV__) console.error('[ar-datepicker] _show() failed:', e); })`.

### Fichiers à modifier

- `packages/core/src/components/datepicker/datepicker.ts`

### Tests à écrire / mettre à jour

Dans `datepicker.test.ts` :

- Vérifier que canceller `ar-datepicker-hide` ne cause pas de boucle infinie (le panel reste ouvert)
- Vérifier que canceller `ar-datepicker-show` ne cause pas de boucle infinie (le panel reste fermé)
- Ces tests doivent compléter sans timeout

### Commit

```
fix(datepicker): garde anti-boucle open/close + catch sur _show()
```

---

## Task 3 — Cache Intl.DateTimeFormat dans \_getDayNames et \_renderDay

**Finding adressé :** #4 (moyenne — performance)

### Contexte

À chaque render du calendrier :

- `_getDayNames()` crée 14 `Intl.DateTimeFormat` (2 par nom de jour × 7 jours)
- `_renderDay()` crée 1 `Intl.DateTimeFormat` par cellule (42 par render = 6 semaines × 7 jours)
- Total : ~56 constructeurs Intl par render, sans cache

`Intl.DateTimeFormat` est coûteux à construire mais bon marché à appeler. Il faut cacher les instances par locale.

### Objectif

1. **`_getDayNames`** : Mémoriser le résultat par locale. Utiliser une propriété privée `_dayNamesCache = new Map<string, Array<{abbr: string; full: string}>>()`. Si la locale est déjà dans le cache, retourner directement.

2. **`_renderDay`** : Extraire la création du `Intl.DateTimeFormat` (long date) hors de `_renderDay`. L'instance est identique pour toutes les cellules d'un même render (même locale, même options). Créer l'instance dans `_renderCalendar` et la passer à `_renderDay` en paramètre.

    ```typescript
    private _renderCalendar(locale: string): TemplateResult {
        // ...
        const dayLabelFormat = new Intl.DateTimeFormat(locale, {
            day: 'numeric', month: 'long', year: 'numeric',
        });
        // ...passer dayLabelFormat à _renderDay
    }

    private _renderDay(day: Date, locale: string, dayLabelFormat: Intl.DateTimeFormat): TemplateResult {
        const ariaLabel = dayLabelFormat.format(day);
        // ...
    }
    ```

    Optionnel : aussi cacher cette instance par locale dans `_renderCalendar` si on veut éviter la recréation entre renders. Mais la passer en paramètre suffit pour éliminer les 42 instances redondantes par render.

### Fichiers à modifier

- `packages/core/src/components/datepicker/datepicker.ts`

### Tests

Pas de nouveau test nécessaire — le comportement observable ne change pas. Vérifier que les tests existants passent toujours.

### Commit

```
perf(datepicker): cacher Intl.DateTimeFormat dans _getDayNames et _renderDay
```

---

## Task 4 — Nettoyage : \_toIso, \_isSameDay, \_parseDate

**Findings adressés :** #5 (basse), #7 (basse), #8 (basse)

### Contexte

Trois duplications à éliminer :

**Finding #5** — `_selectDay()` reconstruit l'ISO à la main alors que `_toIso()` existe :

```typescript
// Ligne ~400 de datepicker.ts — À REMPLACER
const isoValue = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
// PAR :
const isoValue = this._toIso(day);
```

**Finding #7** — `_isSameDay()` est définie identiquement dans `datepicker.ts` ET dans `calendar.controller.ts`. Solution : rendre `_isSameDay` publique dans `CalendarController` (ou en faire un helper statique/exporté depuis `calendar.controller.ts`), et avoir `datepicker.ts` déléguer à `this._calendar.isSameDay(a, b)` (ou un import direct).

Recommandation : ajouter une méthode publique `isSameDay(a: Date, b: Date): boolean` dans `CalendarController` (en exposant `_isSameDay` comme publique), et supprimer `_isSameDay` de `datepicker.ts` en la remplaçant par `this._calendar.isSameDay(a, b)`.

**Finding #8** — `CalendarController._parseDate()` parse du ISO `yyyy-MM-dd` en splitant sur `'-'`, alors que `date-parser.parse(str, 'yyyy-MM-dd')` fait la même chose. Remplacer :

```typescript
// calendar.controller.ts
import { parse } from './date-parser.js';

// Dans update() :
this._min = opts.min ? (parse(opts.min, 'yyyy-MM-dd').date ?? undefined) : undefined;
this._max = opts.max ? (parse(opts.max, 'yyyy-MM-dd').date ?? undefined) : undefined;

// Supprimer _parseDate()
```

### Fichiers à modifier

- `packages/core/src/components/datepicker/datepicker.ts`
- `packages/core/src/components/datepicker/calendar.controller.ts`

### Tests

Vérifier que les tests existants passent sans modification. Aucun nouveau test n'est nécessaire — ce sont des refactors purs.

### Commit

```
refactor(datepicker): utiliser _toIso dans _selectDay, dédupliquer _isSameDay et _parseDate
```
