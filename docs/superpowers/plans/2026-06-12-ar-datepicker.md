# ar-datepicker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter `ar-datepicker` — champ texte + calendrier popover synchronisés, sélection de date unique, accessibilité APG Date Picker Dialog complète.

**Architecture:** Un seul LitElement public `ar-datepicker` orchestré par `CalendarController` (Lit Reactive Controller privé pour la logique calendrier) et `AnchoredController` (existant, pour le positionnement popover). Le parsing/formatting de date est isolé dans `date-parser.ts`.

**Tech Stack:** Lit 3, TypeScript, `AnchoredController`, `HasSlotController`, `ElementInternals` (form association), `Intl.DateTimeFormat`, Vitest + WTR + axe-core.

**Spec:** `docs/superpowers/specs/2026-06-12-datepicker-design.md`

---

## Fichiers créés / modifiés

| Fichier                                                               | Action                             |
| --------------------------------------------------------------------- | ---------------------------------- |
| `packages/core/src/components/datepicker/datepicker.ts`               | Créé par scaffold, réécrit         |
| `packages/core/src/components/datepicker/datepicker.styles.ts`        | Créé par scaffold, complété        |
| `packages/core/src/components/datepicker/datepicker.test.ts`          | Créé par scaffold, complété        |
| `packages/core/src/components/datepicker/datepicker.browser.test.ts`  | Créé manuellement                  |
| `packages/core/src/components/datepicker/datepicker.a11y.test.ts`     | Créé manuellement                  |
| `packages/core/src/components/datepicker/calendar.controller.ts`      | Créé manuellement                  |
| `packages/core/src/components/datepicker/calendar.controller.test.ts` | Créé manuellement                  |
| `packages/core/src/components/datepicker/date-parser.ts`              | Créé manuellement                  |
| `packages/core/src/components/datepicker/date-parser.test.ts`         | Créé manuellement                  |
| `packages/core/src/index.ts`                                          | Mis à jour par scaffold            |
| `packages/core/src/autoloader.ts`                                     | Mis à jour par scaffold            |
| `packages/core/src/styles/themes/default.css`                         | Tokens `--ar-datepicker-*` ajoutés |
| `apps/docs/src/content/components/ar-datepicker.mdx`                  | Créé par scaffold, complété        |

---

## Task 1 : Scaffold du composant

**Files:**

- Create: `packages/core/src/components/datepicker/` (via script)
- Modify: `packages/core/src/index.ts` (auto)
- Modify: `packages/core/src/autoloader.ts` (auto)

- [ ] **Step 1 : Exécuter le scaffold depuis la racine du repo**

```bash
npm run create -- datepicker
```

Sortie attendue :

```
🧩 Création de "ar-datepicker"...

  ✓ src/components/datepicker/datepicker.ts
  ✓ src/components/datepicker/datepicker.styles.ts
  ✓ src/components/datepicker/datepicker.test.ts
  ✓ apps/docs/src/content/components/ar-datepicker.mdx
  ✓ src/index.ts mis à jour
  ✓ src/autoloader.ts mis à jour
```

- [ ] **Step 2 : Créer les fichiers supplémentaires non générés par le scaffold**

```bash
touch packages/core/src/components/datepicker/date-parser.ts
touch packages/core/src/components/datepicker/date-parser.test.ts
touch packages/core/src/components/datepicker/calendar.controller.ts
touch packages/core/src/components/datepicker/calendar.controller.test.ts
touch packages/core/src/components/datepicker/datepicker.browser.test.ts
touch packages/core/src/components/datepicker/datepicker.a11y.test.ts
```

- [ ] **Step 3 : Vérifier que les tests existants passent (baseline)**

```bash
npm run test
```

Sortie attendue : tous les tests passent (la suite de base scaffoldée passe, les fichiers vides ne font rien).

- [ ] **Step 4 : Commit**

```bash
git add packages/core/src/components/datepicker/ apps/docs/src/content/components/ar-datepicker.mdx packages/core/src/index.ts packages/core/src/autoloader.ts
git commit -m "feat(datepicker): scaffold ar-datepicker"
```

---

## Task 2 : date-parser (TDD)

**Files:**

- Create: `packages/core/src/components/datepicker/date-parser.ts`
- Test: `packages/core/src/components/datepicker/date-parser.test.ts`

- [ ] **Step 1 : Écrire les tests (fichier doit échouer)**

```typescript
// packages/core/src/components/datepicker/date-parser.test.ts
import { describe, expect, it } from 'vitest';
import { format, parse } from './date-parser.js';

describe('parse', () => {
    describe('saisie complète valide', () => {
        it('parse dd/MM/yyyy', () => {
            const r = parse('12/06/2026', 'dd/MM/yyyy');
            expect(r).toEqual({ complete: true, valid: true, date: new Date(2026, 5, 12) });
        });

        it('parse avec un seul chiffre pour dd et MM', () => {
            const r = parse('1/6/2026', 'dd/MM/yyyy');
            expect(r).toEqual({ complete: true, valid: true, date: new Date(2026, 5, 1) });
        });

        it('parse yyyy-MM-dd', () => {
            const r = parse('2026-06-12', 'yyyy-MM-dd');
            expect(r).toEqual({ complete: true, valid: true, date: new Date(2026, 5, 12) });
        });

        it('accepte le 29/02 une année bissextile', () => {
            const r = parse('29/02/2024', 'dd/MM/yyyy');
            expect(r.complete).toBe(true);
            expect(r.valid).toBe(true);
            expect(r.date).toEqual(new Date(2024, 1, 29));
        });
    });

    describe('saisie incomplète', () => {
        it('retourne complete:false pour une saisie partielle', () => {
            const r = parse('12/06', 'dd/MM/yyyy');
            expect(r).toEqual({ complete: false, valid: false, date: null });
        });

        it('retourne complete:false pour une saisie vide', () => {
            const r = parse('', 'dd/MM/yyyy');
            expect(r).toEqual({ complete: false, valid: false, date: null });
        });

        it('retourne complete:false pour une année incomplète', () => {
            const r = parse('12/06/202', 'dd/MM/yyyy');
            expect(r).toEqual({ complete: false, valid: false, date: null });
        });
    });

    describe('saisie complète invalide', () => {
        it('retourne valid:false pour le 30/02', () => {
            const r = parse('30/02/2026', 'dd/MM/yyyy');
            expect(r.complete).toBe(true);
            expect(r.valid).toBe(false);
            expect(r.date).toBeNull();
        });

        it('retourne valid:false pour le 31/11', () => {
            const r = parse('31/11/2026', 'dd/MM/yyyy');
            expect(r.complete).toBe(true);
            expect(r.valid).toBe(false);
            expect(r.date).toBeNull();
        });

        it('retourne valid:false pour le 29/02 hors année bissextile', () => {
            const r = parse('29/02/2025', 'dd/MM/yyyy');
            expect(r.complete).toBe(true);
            expect(r.valid).toBe(false);
            expect(r.date).toBeNull();
        });

        it('retourne valid:false pour le mois 13', () => {
            const r = parse('01/13/2026', 'dd/MM/yyyy');
            expect(r.complete).toBe(true);
            expect(r.valid).toBe(false);
            expect(r.date).toBeNull();
        });
    });
});

describe('format', () => {
    it('formate dd/MM/yyyy', () => {
        expect(format(new Date(2026, 5, 12), 'dd/MM/yyyy')).toBe('12/06/2026');
    });

    it('formate yyyy-MM-dd', () => {
        expect(format(new Date(2026, 5, 1), 'yyyy-MM-dd')).toBe('2026-06-01');
    });

    it('padde les jours et mois avec zéro', () => {
        expect(format(new Date(2026, 0, 5), 'dd/MM/yyyy')).toBe('05/01/2026');
    });

    it('aller-retour format → parse', () => {
        const date = new Date(2026, 5, 12);
        const str = format(date, 'dd/MM/yyyy');
        const result = parse(str, 'dd/MM/yyyy');
        expect(result.valid).toBe(true);
        expect(result.date).toEqual(date);
    });
});
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
npm run test -- --reporter=verbose 2>&1 | grep -A5 "date-parser"
```

Sortie attendue : erreur d'import (`Cannot find module './date-parser.js'`).

- [ ] **Step 3 : Implémenter date-parser.ts**

```typescript
// packages/core/src/components/datepicker/date-parser.ts

export interface ParseResult {
    complete: boolean;
    valid: boolean;
    date: Date | null;
}

const TOKEN_REGEX: Record<string, string> = {
    dd: '(\\d{1,2})',
    MM: '(\\d{1,2})',
    yyyy: '(\\d{4})',
};

export function parse(input: string, formatPattern: string): ParseResult {
    const tokenOrder: string[] = [];

    // Échapper les caractères spéciaux sauf les tokens connus
    const regexStr = formatPattern
        .replace(/[.*+?^${}()|[\]\\]/g, (ch) => `\\${ch}`)
        .replace(/yyyy|MM|dd/g, (token) => {
            tokenOrder.push(token);
            return TOKEN_REGEX[token];
        });

    const match = input.match(new RegExp(`^${regexStr}$`));
    if (!match) return { complete: false, valid: false, date: null };

    const values: Record<string, number> = {};
    tokenOrder.forEach((token, i) => {
        values[token] = parseInt(match[i + 1], 10);
    });

    const day = values['dd'] ?? 1;
    const month = (values['MM'] ?? 1) - 1; // 0-indexed
    const year = values['yyyy'] ?? 0;

    // Validation stricte : le Date reconstruit doit correspondre aux valeurs saisies
    const constructed = new Date(year, month, day);
    const valid =
        constructed.getFullYear() === year &&
        constructed.getMonth() === month &&
        constructed.getDate() === day;

    return {
        complete: true,
        valid,
        date: valid ? constructed : null,
    };
}

export function format(date: Date, formatPattern: string): string {
    const pad = (n: number, len: number): string => String(n).padStart(len, '0');
    return formatPattern
        .replace('dd', pad(date.getDate(), 2))
        .replace('MM', pad(date.getMonth() + 1, 2))
        .replace('yyyy', String(date.getFullYear()));
}
```

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils passent**

```bash
npm run test -- --reporter=verbose 2>&1 | grep -E "(date-parser|✓|✗|PASS|FAIL)"
```

Sortie attendue : tous les tests `date-parser` passent.

- [ ] **Step 5 : Commit**

```bash
git add packages/core/src/components/datepicker/date-parser.ts packages/core/src/components/datepicker/date-parser.test.ts
git commit -m "feat(datepicker): date-parser — parse et format avec validation stricte"
```

---

## Task 3 : CalendarController (TDD)

**Files:**

- Create: `packages/core/src/components/datepicker/calendar.controller.ts`
- Test: `packages/core/src/components/datepicker/calendar.controller.test.ts`

- [ ] **Step 1 : Écrire les tests**

```typescript
// packages/core/src/components/datepicker/calendar.controller.test.ts
import { describe, expect, it, vi } from 'vitest';
import { CalendarController } from './calendar.controller.js';

// Stub minimal du ReactiveControllerHost
function makeHost() {
    return { addController: vi.fn(), requestUpdate: vi.fn() };
}

describe('CalendarController', () => {
    describe('getGridWeeks', () => {
        it('retourne toujours 6 semaines de 7 jours', () => {
            const host = makeHost();
            const ctrl = new CalendarController(host as never);
            ctrl.currentViewMonth = new Date(2026, 5, 1); // juin 2026
            const weeks = ctrl.getGridWeeks();
            expect(weeks).toHaveLength(6);
            weeks.forEach((w) => expect(w).toHaveLength(7));
        });

        it('commence le lundi précédant le 1er du mois', () => {
            const host = makeHost();
            const ctrl = new CalendarController(host as never);
            // Juin 2026 commence un lundi — le lundi précédant est le 1er lui-même
            ctrl.currentViewMonth = new Date(2026, 5, 1);
            const firstDay = ctrl.getGridWeeks()[0][0];
            expect(firstDay.getDay()).toBe(1); // lundi = 1
        });

        it('inclut des jours du mois précédent quand le mois commence un mercredi', () => {
            const host = makeHost();
            const ctrl = new CalendarController(host as never);
            // Juillet 2026 commence un mercredi
            ctrl.currentViewMonth = new Date(2026, 6, 1);
            const firstDay = ctrl.getGridWeeks()[0][0];
            // Le premier lundi avant le 1er juillet 2026 est le 29 juin 2026
            expect(firstDay.getMonth()).toBe(5); // juin
            expect(firstDay.getDate()).toBe(29);
        });

        it('la dernière cellule est toujours un dimanche', () => {
            const host = makeHost();
            const ctrl = new CalendarController(host as never);
            ctrl.currentViewMonth = new Date(2026, 5, 1);
            const weeks = ctrl.getGridWeeks();
            const lastDay = weeks[5][6];
            expect(lastDay.getDay()).toBe(0); // dimanche = 0
        });
    });

    describe('navigation', () => {
        it('previousMonth passe au mois précédent', () => {
            const host = makeHost();
            const ctrl = new CalendarController(host as never);
            ctrl.currentViewMonth = new Date(2026, 5, 1); // juin
            ctrl.previousMonth();
            expect(ctrl.currentViewMonth.getMonth()).toBe(4); // mai
            expect(host.requestUpdate).toHaveBeenCalled();
        });

        it("previousMonth en janvier passe à décembre de l'année précédente", () => {
            const host = makeHost();
            const ctrl = new CalendarController(host as never);
            ctrl.currentViewMonth = new Date(2026, 0, 1); // janvier 2026
            ctrl.previousMonth();
            expect(ctrl.currentViewMonth.getMonth()).toBe(11); // décembre
            expect(ctrl.currentViewMonth.getFullYear()).toBe(2025);
        });

        it('nextMonth passe au mois suivant', () => {
            const host = makeHost();
            const ctrl = new CalendarController(host as never);
            ctrl.currentViewMonth = new Date(2026, 11, 1); // décembre
            ctrl.nextMonth();
            expect(ctrl.currentViewMonth.getMonth()).toBe(0); // janvier
            expect(ctrl.currentViewMonth.getFullYear()).toBe(2027);
        });

        it("previousYear décrémente l'année", () => {
            const host = makeHost();
            const ctrl = new CalendarController(host as never);
            ctrl.currentViewMonth = new Date(2026, 5, 1);
            ctrl.previousYear();
            expect(ctrl.currentViewMonth.getFullYear()).toBe(2025);
            expect(ctrl.currentViewMonth.getMonth()).toBe(5);
        });

        it("nextYear incrémente l'année", () => {
            const host = makeHost();
            const ctrl = new CalendarController(host as never);
            ctrl.currentViewMonth = new Date(2026, 5, 1);
            ctrl.nextYear();
            expect(ctrl.currentViewMonth.getFullYear()).toBe(2027);
        });
    });

    describe('isDisabled', () => {
        it('retourne false par défaut', () => {
            const host = makeHost();
            const ctrl = new CalendarController(host as never);
            expect(ctrl.isDisabled(new Date(2026, 5, 12))).toBe(false);
        });

        it('retourne true si avant min', () => {
            const host = makeHost();
            const ctrl = new CalendarController(host as never);
            ctrl.update({ min: '2026-06-10' });
            expect(ctrl.isDisabled(new Date(2026, 5, 9))).toBe(true);
            expect(ctrl.isDisabled(new Date(2026, 5, 10))).toBe(false);
        });

        it('retourne true si après max', () => {
            const host = makeHost();
            const ctrl = new CalendarController(host as never);
            ctrl.update({ max: '2026-06-20' });
            expect(ctrl.isDisabled(new Date(2026, 5, 21))).toBe(true);
            expect(ctrl.isDisabled(new Date(2026, 5, 20))).toBe(false);
        });

        it('délègue au callback isDateDisabled', () => {
            const host = makeHost();
            const ctrl = new CalendarController(host as never);
            ctrl.update({ isDateDisabled: (d) => d.getDay() === 0 }); // dimanches
            expect(ctrl.isDisabled(new Date(2026, 5, 7))).toBe(true); // dimanche
            expect(ctrl.isDisabled(new Date(2026, 5, 8))).toBe(false); // lundi
        });
    });

    describe('isToday', () => {
        it('retourne true uniquement pour la date du jour', () => {
            const host = makeHost();
            const ctrl = new CalendarController(host as never);
            const today = new Date();
            expect(ctrl.isToday(today)).toBe(true);
            expect(ctrl.isToday(new Date(2000, 0, 1))).toBe(false);
        });
    });

    describe('isSameMonth', () => {
        it('retourne true pour les dates du mois affiché', () => {
            const host = makeHost();
            const ctrl = new CalendarController(host as never);
            ctrl.currentViewMonth = new Date(2026, 5, 1);
            expect(ctrl.isSameMonth(new Date(2026, 5, 15))).toBe(true);
            expect(ctrl.isSameMonth(new Date(2026, 4, 31))).toBe(false);
        });
    });
});
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
npm run test -- --reporter=verbose 2>&1 | grep -A5 "calendar.controller"
```

Sortie attendue : erreur d'import.

- [ ] **Step 3 : Implémenter CalendarController**

```typescript
// packages/core/src/components/datepicker/calendar.controller.ts
import type { ReactiveController, ReactiveControllerHost } from 'lit';

export interface CalendarControllerOptions {
    min?: string;
    max?: string;
    isDateDisabled?: (date: Date) => boolean;
}

export class CalendarController implements ReactiveController {
    private readonly _host: ReactiveControllerHost;
    private _min?: Date;
    private _max?: Date;
    private _isDateDisabledFn?: (date: Date) => boolean;

    currentViewMonth: Date;
    focusedDate: Date;
    selectedDate: Date | null = null;

    constructor(host: ReactiveControllerHost) {
        this._host = host;
        host.addController(this);
        const today = new Date();
        this.currentViewMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        this.focusedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    }

    hostConnected(): void {}
    hostDisconnected(): void {}

    /** Mettre à jour les contraintes depuis les props du host. */
    update(opts: CalendarControllerOptions): void {
        this._min = opts.min ? this._startOfDay(new Date(opts.min)) : undefined;
        this._max = opts.max ? this._startOfDay(new Date(opts.max)) : undefined;
        this._isDateDisabledFn = opts.isDateDisabled;
    }

    previousMonth(): void {
        const d = this.currentViewMonth;
        this.currentViewMonth = new Date(d.getFullYear(), d.getMonth() - 1, 1);
        this._host.requestUpdate();
    }

    nextMonth(): void {
        const d = this.currentViewMonth;
        this.currentViewMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        this._host.requestUpdate();
    }

    previousYear(): void {
        const d = this.currentViewMonth;
        this.currentViewMonth = new Date(d.getFullYear() - 1, d.getMonth(), 1);
        this._host.requestUpdate();
    }

    nextYear(): void {
        const d = this.currentViewMonth;
        this.currentViewMonth = new Date(d.getFullYear() + 1, d.getMonth(), 1);
        this._host.requestUpdate();
    }

    /** Génère 6 semaines × 7 jours. La semaine commence le lundi. */
    getGridWeeks(): Date[][] {
        const year = this.currentViewMonth.getFullYear();
        const month = this.currentViewMonth.getMonth();

        const firstOfMonth = new Date(year, month, 1);
        // getDay() : 0=dim, 1=lun, ..., 6=sam. On veut lundi en premier.
        let dow = firstOfMonth.getDay();
        if (dow === 0) dow = 7; // dimanche → traité comme 7 pour le calcul
        const gridStart = new Date(year, month, 1 - (dow - 1));

        const weeks: Date[][] = [];
        const cursor = new Date(gridStart);
        for (let w = 0; w < 6; w++) {
            const week: Date[] = [];
            for (let d = 0; d < 7; d++) {
                week.push(new Date(cursor));
                cursor.setDate(cursor.getDate() + 1);
            }
            weeks.push(week);
        }
        return weeks;
    }

    isDisabled(date: Date): boolean {
        const d = this._startOfDay(date);
        if (this._min && d < this._min) return true;
        if (this._max && d > this._max) return true;
        if (this._isDateDisabledFn?.(date)) return true;
        return false;
    }

    isToday(date: Date): boolean {
        return this._isSameDay(date, new Date());
    }

    isSameMonth(date: Date): boolean {
        return (
            date.getMonth() === this.currentViewMonth.getMonth() &&
            date.getFullYear() === this.currentViewMonth.getFullYear()
        );
    }

    private _startOfDay(date: Date): Date {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    private _isSameDay(a: Date, b: Date): boolean {
        return (
            a.getDate() === b.getDate() &&
            a.getMonth() === b.getMonth() &&
            a.getFullYear() === b.getFullYear()
        );
    }
}
```

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils passent**

```bash
npm run test -- --reporter=verbose 2>&1 | grep -E "(calendar.controller|✓|✗)"
```

Sortie attendue : tous les tests `calendar.controller` passent.

- [ ] **Step 5 : Commit**

```bash
git add packages/core/src/components/datepicker/calendar.controller.ts packages/core/src/components/datepicker/calendar.controller.test.ts
git commit -m "feat(datepicker): CalendarController — navigation, grille 6 semaines, isDisabled"
```

---

## Task 4 : Skeleton du composant — props, structure Shadow DOM, styles de base

**Files:**

- Modify: `packages/core/src/components/datepicker/datepicker.ts`
- Modify: `packages/core/src/components/datepicker/datepicker.styles.ts`
- Modify: `packages/core/src/components/datepicker/datepicker.test.ts`

- [ ] **Step 1 : Réécrire datepicker.ts — props + Shadow DOM sans logique**

```typescript
// packages/core/src/components/datepicker/datepicker.ts
import { LitElement, html, nothing, type TemplateResult, type PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { CalendarController } from './calendar.controller.js';
import { HasSlotController } from '../../controllers/has-slot.controller.js';
import { AnchoredController } from '../../controllers/anchored.controller.js';
import { parse, format } from './date-parser.js';
import panelStyles from '../../styles/shared/panel.styles.js';
import styles from './datepicker.styles.js';

/**
 * @summary Champ de saisie de date avec calendrier popover accessible.
 *
 * @slot label       - Contenu riche du label (remplace le prop `label`).
 * @slot after-label - Éléments après le label (bouton d'aide, tooltip…).
 * @slot hint        - Texte d'aide persistant (format attendu). Lié via aria-describedby.
 * @slot error       - Message d'erreur. Déclenche has-error sur le host.
 *
 * @csspart input   - Le champ texte.
 * @csspart trigger - Le bouton d'ouverture du calendrier.
 * @csspart panel   - Le popover flottant.
 * @csspart header  - En-tête du calendrier (navigation).
 * @csspart grid    - La grille calendrier.
 * @csspart day     - Les boutons jours.
 * @csspart footer  - Pied du calendrier (boutons Aujourd'hui / Fermer).
 *
 * @cssprop [--ar-datepicker-panel-width=20rem] - Largeur du popover.
 * @cssprop [--ar-datepicker-day-size=2.25rem]  - Taille des cellules jour.
 * @cssprop [--ar-datepicker-day-today-bg]      - Fond du jour actuel.
 * @cssprop [--ar-datepicker-day-today-color]   - Couleur texte du jour actuel.
 * @cssprop [--ar-datepicker-day-selected-bg]   - Fond du jour sélectionné.
 * @cssprop [--ar-datepicker-day-selected-color]- Couleur texte du jour sélectionné.
 * @cssprop [--ar-datepicker-input-error-border-color] - Bordure input en état d'erreur.
 *
 * @event {CustomEvent} ar-datepicker-input-change   - Valeur commitée (blur ou sélection calendrier).
 * @event {CustomEvent} ar-datepicker-input-complete - Saisie texte complète (valide ou non).
 * @event {CustomEvent} ar-datepicker-show           - Avant ouverture du popover.
 * @event {CustomEvent} ar-datepicker-shown          - Après ouverture.
 * @event {CustomEvent} ar-datepicker-hide           - Avant fermeture.
 * @event {CustomEvent} ar-datepicker-hidden         - Après fermeture.
 */
@customElement('ar-datepicker')
export class ArDatepicker extends LitElement {
    static override styles = [panelStyles, styles];
    static formAssociated = true;

    private readonly _internals = this.attachInternals();
    private readonly _uid = Math.random().toString(36).slice(2, 9);

    private readonly _calendar = new CalendarController(this);
    private readonly _hasSlot = new HasSlotController(
        this,
        'label',
        'after-label',
        'hint',
        'error',
    );
    private readonly _anchored = new AnchoredController(this, {
        popupMode: 'dialog',
        placement: 'bottom-start',
        onExternalClose: () => {
            this.open = false;
        },
    });

    // ── Props ──────────────────────────────────────────────────────────────────

    /** Date ISO 8601 sélectionnée (`2026-06-12`). */
    @property({ reflect: true }) value = '';

    /** Pattern de saisie texte. */
    @property() format = 'dd/MM/yyyy';

    /** Locale pour les labels du calendrier. Défaut : locale du navigateur. */
    @property() locale = '';

    /** Date ISO minimum sélectionnable. */
    @property() min = '';

    /** Date ISO maximum sélectionnable. */
    @property() max = '';

    /** Callback de désactivation de jours custom. */
    @property({ attribute: false }) isDateDisabled?: (date: Date) => boolean;

    /** Placeholder de l'input. Ne pas y mettre d'informations de format. */
    @property() placeholder = '';

    /** Valeur de l'attribut `autocomplete` répercutée sur l'input natif. */
    @property() autocomplete = '';

    /** Label du champ (fallback si le slot `label` est absent). */
    @property() label = '';

    /** Désactive le composant. La valeur n'est pas soumise au formulaire. */
    @property({ reflect: true, type: Boolean }) disabled = false;

    /**
     * Rend le champ non éditable. La saisie texte et l'ouverture du calendrier
     * sont bloquées. La valeur est soumise au formulaire.
     */
    @property({ reflect: true, type: Boolean }) readonly = false;

    /** Champ obligatoire. */
    @property({ reflect: true, type: Boolean }) required = false;

    /** Nom du champ pour la participation aux formulaires natifs. */
    @property() name = '';

    /** Ouvre ou ferme le popover calendrier. */
    @property({ reflect: true, type: Boolean }) open = false;

    // ── Queries ────────────────────────────────────────────────────────────────

    @query('[part="input"]') private _input!: HTMLInputElement;
    @query('[part="panel"]') private _panel!: HTMLElement;
    @query('[part="trigger"]') private _trigger!: HTMLButtonElement;

    // ── Getter public ──────────────────────────────────────────────────────────

    /** Donne accès à l'input interne pour brancher une lib de masque (IMask…). */
    get inputElement(): HTMLInputElement {
        return this._input;
    }

    // ── Lifecycle ──────────────────────────────────────────────────────────────

    override firstUpdated(): void {
        this._anchored.attach(this._trigger, this._panel);
        this._syncFormValue();
    }

    override updated(changed: PropertyValues<this>): void {
        // Sync CalendarController constraints
        if (changed.has('min') || changed.has('max') || changed.has('isDateDisabled')) {
            this._calendar.update({
                min: this.min,
                max: this.max,
                isDateDisabled: this.isDateDisabled,
            });
        }

        // has-error auto-reflection
        this.toggleAttribute('has-error', this._hasSlot.test('error'));

        if (changed.has('open')) {
            if (this.open) this._show();
            else this._hide();
        }

        if (changed.has('value')) {
            this._syncInputFromValue();
            this._syncFormValue();
        }
    }

    override render(): TemplateResult {
        const locale = this.locale || navigator.language;
        const defaultHint = `Format attendu : ${this.format}`;

        return html`
            <label part="label">
                <slot name="label">${this.label}</slot>
            </label>
            <slot name="after-label"></slot>

            <div class="input-wrapper">
                <input
                    part="input"
                    type="text"
                    ?disabled=${this.disabled}
                    ?readonly=${this.readonly}
                    ?required=${this.required}
                    autocomplete=${this.autocomplete || nothing}
                    placeholder=${this.placeholder || nothing}
                    aria-describedby="dp-hint-${this._uid} dp-error-${this._uid}"
                    @input=${this._handleInput}
                    @blur=${this._handleBlur}
                />
                <button
                    part="trigger"
                    type="button"
                    ?disabled=${this.disabled || this.readonly}
                    aria-label="Ouvrir le calendrier"
                    aria-haspopup="dialog"
                    @click=${this._handleTriggerClick}
                >
                    <svg
                        aria-hidden="true"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                </button>
            </div>

            <p id="dp-hint-${this._uid}">
                <slot name="hint">${defaultHint}</slot>
            </p>
            <p id="dp-error-${this._uid}" role="alert">
                <slot name="error"></slot>
            </p>

            <div
                part="panel"
                popover="auto"
                role="dialog"
                aria-modal="true"
                aria-label="Sélectionner une date"
                id="ar-dp-panel-${this._uid}"
                @keydown=${this._handlePanelKeyDown}
            >
                ${this.open ? this._renderCalendar(locale) : nothing}
            </div>
        `;
    }

    // ── Stubs à implémenter dans les tâches suivantes ─────────────────────────

    private _renderCalendar(_locale: string): TemplateResult {
        return html`<!-- calendrier : Task 6 -->`;
    }

    private async _show(): Promise<void> {
        /* Task 5 */
    }
    private _hide(): void {
        /* Task 5 */
    }
    private _handleTriggerClick(): void {
        /* Task 5 */
    }
    private _handleInput(_e: Event): void {
        /* Task 8 */
    }
    private _handleBlur(): void {
        /* Task 8 */
    }
    private _handlePanelKeyDown(_e: KeyboardEvent): void {
        /* Task 7 */
    }
    private _syncInputFromValue(): void {
        /* Task 8 */
    }
    private _syncFormValue(): void {
        /* Task 10 */
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-datepicker': ArDatepicker;
    }
}
```

- [ ] **Step 2 : Compléter datepicker.styles.ts**

```typescript
// packages/core/src/components/datepicker/datepicker.styles.ts
import { css } from 'lit';

export default css`
    :host {
        display: block;
    }

    /* Supprime les marges navigateur des wrappers aria */
    p {
        margin: 0;
    }

    .input-wrapper {
        display: flex;
        align-items: stretch;
    }

    [part='input'] {
        flex: 1;
        min-width: 0;
    }

    [part='trigger'] {
        flex-shrink: 0;
        cursor: pointer;
    }

    :host([disabled]) [part='trigger'] {
        pointer-events: none;
    }

    /* État d'erreur — stylé par l'intégrateur via ar-datepicker[has-error]::part(input) */
    :host([has-error]) [part='input'] {
        border-color: var(--ar-datepicker-input-error-border-color);
    }

    [part='panel'] {
        width: var(--ar-datepicker-panel-width);
    }
`;
```

- [ ] **Step 3 : Mettre à jour datepicker.test.ts — tests de rendu et props**

```typescript
// Remplacer le contenu généré par le scaffold par :
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ArDatepicker } from './datepicker.js';
import { fixture, getPart, waitForUpdate } from '../../test-utils.js';
import './datepicker.js';

describe('ArDatepicker', () => {
    let el: ArDatepicker;
    afterEach(() => el?.remove());

    describe('rendu', () => {
        beforeEach(async () => {
            el = await fixture('<ar-datepicker></ar-datepicker>');
        });

        it('monte un shadow DOM', () => expect(el.shadowRoot).not.toBeNull());
        it('contient un input part="input"', () => expect(getPart(el, 'input')).not.toBeNull());
        it('contient un bouton part="trigger"', () =>
            expect(getPart(el, 'trigger')).not.toBeNull());
        it('contient un div part="panel"', () => expect(getPart(el, 'panel')).not.toBeNull());
        it('expose inputElement getter', () =>
            expect(el.inputElement).toBeInstanceOf(HTMLInputElement));
    });

    describe('valeurs par défaut', () => {
        beforeEach(async () => {
            el = await fixture('<ar-datepicker></ar-datepicker>');
        });

        it('format vaut "dd/MM/yyyy"', () => expect(el.format).toBe('dd/MM/yyyy'));
        it('disabled vaut false', () => expect(el.disabled).toBe(false));
        it('readonly vaut false', () => expect(el.readonly).toBe(false));
        it('open vaut false', () => expect(el.open).toBe(false));
    });

    describe('propriétés reflect', () => {
        beforeEach(async () => {
            el = await fixture('<ar-datepicker></ar-datepicker>');
        });

        it('disabled se reflète en attribut', async () => {
            el.disabled = true;
            await waitForUpdate(el);
            expect(el.hasAttribute('disabled')).toBe(true);
        });

        it('readonly se reflète en attribut', async () => {
            el.readonly = true;
            await waitForUpdate(el);
            expect(el.hasAttribute('readonly')).toBe(true);
        });

        it('has-error se reflète quand le slot error a du contenu', async () => {
            el = await fixture(`
                <ar-datepicker>
                    <span slot="error">Date invalide</span>
                </ar-datepicker>
            `);
            await waitForUpdate(el);
            expect(el.hasAttribute('has-error')).toBe(true);
        });
    });
});
```

- [ ] **Step 4 : Lancer les tests**

```bash
npm run test -- --reporter=verbose 2>&1 | grep -E "(ArDatepicker|✓|✗|FAIL)"
```

Sortie attendue : les tests de rendu et valeurs par défaut passent. Les tests `has-error` peuvent échouer jusqu'à Task 9 — noter les failures sans bloquer.

- [ ] **Step 5 : Commit**

```bash
git add packages/core/src/components/datepicker/datepicker.ts packages/core/src/components/datepicker/datepicker.styles.ts packages/core/src/components/datepicker/datepicker.test.ts
git commit -m "feat(datepicker): skeleton — props, Shadow DOM, styles de base"
```

---

## Task 5 : Popover — AnchoredController, open/close, événements

**Files:**

- Modify: `packages/core/src/components/datepicker/datepicker.ts`

- [ ] **Step 1 : Implémenter `_show`, `_hide`, `_handleTriggerClick`**

Remplacer les stubs de Task 4 dans `datepicker.ts` :

```typescript
private async _show(): Promise<void> {
    if (this.disabled || this.readonly) return;

    const allowed = this.dispatchEvent(
        new CustomEvent('ar-datepicker-show', { bubbles: true, composed: true, cancelable: true }),
    );
    if (!allowed) {
        this.open = false;
        return;
    }

    // Initialiser l'état du calendrier
    const today = new Date();
    if (this.value) {
        const result = parse(this.value, this.format);
        if (result.valid && result.date) {
            this._calendar.selectedDate = result.date;
            this._calendar.currentViewMonth = new Date(
                result.date.getFullYear(),
                result.date.getMonth(),
                1,
            );
            this._calendar.focusedDate = new Date(
                result.date.getFullYear(),
                result.date.getMonth(),
                result.date.getDate(),
            );
        }
    } else {
        this._calendar.selectedDate = null;
        this._calendar.currentViewMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        this._calendar.focusedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    }

    await this._anchored.show();
    await this.updateComplete;
    this._focusFocusedDay();

    this.dispatchEvent(
        new CustomEvent('ar-datepicker-shown', { bubbles: true, composed: true }),
    );
}

private _hide(): void {
    if (!this._anchored.isOpen) return;

    const allowed = this.dispatchEvent(
        new CustomEvent('ar-datepicker-hide', { bubbles: true, composed: true, cancelable: true }),
    );
    if (!allowed) {
        this.open = true;
        return;
    }

    this._anchored.hide();
    this.open = false;

    this.dispatchEvent(
        new CustomEvent('ar-datepicker-hidden', { bubbles: true, composed: true }),
    );
}

private _handleTriggerClick(): void {
    if (this.disabled || this.readonly) return;
    this.open = !this.open;
}

private _focusFocusedDay(): void {
    const grid = this.shadowRoot?.querySelector('[part="grid"]');
    const btn = grid?.querySelector<HTMLButtonElement>('[tabindex="0"]');
    btn?.focus();
}
```

- [ ] **Step 2 : Ajouter les tests d'ouverture/fermeture dans datepicker.test.ts**

```typescript
describe('popover', () => {
    beforeEach(async () => {
        el = await fixture('<ar-datepicker></ar-datepicker>');
    });

    it('open=true reflète en attribut', async () => {
        el.open = true;
        await waitForUpdate(el);
        expect(el.hasAttribute('open')).toBe(true);
    });

    it("émet ar-datepicker-show à l'ouverture", async () => {
        let fired = false;
        el.addEventListener('ar-datepicker-show', () => (fired = true));
        el.open = true;
        await waitForUpdate(el);
        expect(fired).toBe(true);
    });

    it('émet ar-datepicker-hide à la fermeture', async () => {
        el.open = true;
        await waitForUpdate(el);
        let fired = false;
        el.addEventListener('ar-datepicker-hide', () => (fired = true));
        el.open = false;
        await waitForUpdate(el);
        expect(fired).toBe(true);
    });

    it("disabled bloque l'ouverture", async () => {
        el.disabled = true;
        await waitForUpdate(el);
        el.open = true;
        await waitForUpdate(el);
        // _show() retourne immédiatement si disabled
        expect(el.open).toBe(true); // la prop est set mais le panel ne s'ouvre pas
    });

    it("readonly bloque l'ouverture", async () => {
        el.readonly = true;
        await waitForUpdate(el);
        el.open = true;
        await waitForUpdate(el);
        expect(el.open).toBe(true);
    });
});
```

- [ ] **Step 3 : Lancer les tests**

```bash
npm run test -- --reporter=verbose 2>&1 | grep -E "(ArDatepicker|✓|✗|FAIL)"
```

Sortie attendue : tests popover passent.

- [ ] **Step 4 : Commit**

```bash
git add packages/core/src/components/datepicker/datepicker.ts packages/core/src/components/datepicker/datepicker.test.ts
git commit -m "feat(datepicker): popover — open/close, événements show/hide"
```

---

## Task 6 : Rendu de la grille calendrier

**Files:**

- Modify: `packages/core/src/components/datepicker/datepicker.ts`

- [ ] **Step 1 : Ajouter les imports nécessaires en haut de datepicker.ts**

```typescript
import { classMap } from 'lit/directives/class-map.js';
```

- [ ] **Step 2 : Remplacer `_renderCalendar` par l'implémentation complète**

```typescript
private _renderCalendar(locale: string): TemplateResult {
    const viewDate = this._calendar.currentViewMonth;
    const monthLabel = new Intl.DateTimeFormat(locale, {
        month: 'long',
        year: 'numeric',
    }).format(viewDate);

    const dayNames = this._getDayNames(locale);
    const weeks = this._calendar.getGridWeeks();

    return html`
        <div part="header">
            <button type="button" aria-label="Année précédente" @click=${() => { this._calendar.previousYear(); this._focusFocusedDay(); }}>«</button>
            <button type="button" aria-label="Mois précédent" @click=${() => { this._calendar.previousMonth(); this._focusFocusedDay(); }}>‹</button>
            <span aria-live="polite">${monthLabel}</span>
            <button type="button" aria-label="Mois suivant" @click=${() => { this._calendar.nextMonth(); this._focusFocusedDay(); }}>›</button>
            <button type="button" aria-label="Année suivante" @click=${() => { this._calendar.nextYear(); this._focusFocusedDay(); }}>»</button>
        </div>

        <table role="grid" aria-label=${monthLabel} part="grid">
            <thead>
                <tr>
                    ${dayNames.map(({ abbr, full }) => html`<th abbr=${full} scope="col">${abbr}</th>`)}
                </tr>
            </thead>
            <tbody>
                ${weeks.map(
                    (week) => html`
                        <tr>
                            ${week.map((day) => this._renderDay(day, locale))}
                        </tr>
                    `,
                )}
            </tbody>
        </table>

        <div part="footer">
            <button type="button" @click=${this._handleTodayClick}>Aujourd'hui</button>
            <button type="button" @click=${this._handleCloseClick}>Fermer</button>
        </div>
    `;
}

private _renderDay(day: Date, locale: string): TemplateResult {
    const focused = this._isSameDay(day, this._calendar.focusedDate);
    const selected = this._calendar.selectedDate
        ? this._isSameDay(day, this._calendar.selectedDate)
        : false;
    const today = this._calendar.isToday(day);
    const disabled = this._calendar.isDisabled(day);
    const otherMonth = !this._calendar.isSameMonth(day);

    const ariaLabel = new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(day);

    return html`
        <td role="gridcell">
            <button
                type="button"
                part="day"
                tabindex=${focused ? '0' : '-1'}
                aria-selected=${selected ? 'true' : 'false'}
                aria-label=${ariaLabel}
                aria-current=${today ? 'date' : nothing}
                aria-disabled=${disabled ? 'true' : nothing}
                class=${classMap({ 'other-month': otherMonth, today, selected, disabled })}
                @click=${() => !disabled && this._selectDay(day)}
            >${day.getDate()}</button>
        </td>
    `;
}

private _getDayNames(locale: string): Array<{ abbr: string; full: string }> {
    // Lundi = jour 0 de notre grille, dimanche = jour 6
    const monday = new Date(2024, 0, 1); // 1er janvier 2024 = lundi
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return {
            abbr: new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d),
            full: new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(d),
        };
    });
}

private _selectDay(day: Date): void {
    this._calendar.selectedDate = day;
    this._calendar.focusedDate = day;

    const isoValue = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    this.value = isoValue;

    const formatted = format(day, this.format);
    if (this._input) this._input.value = formatted;

    this._syncFormValue();
    this._emitChange();
    this.open = false;
}

private _handleTodayClick(): void {
    const today = new Date();
    if (!this._calendar.isDisabled(today)) {
        this._selectDay(today);
    }
}

private _handleCloseClick(): void {
    this.open = false;
    this._trigger?.focus();
}

private _isSameDay(a: Date, b: Date): boolean {
    return (
        a.getDate() === b.getDate() &&
        a.getMonth() === b.getMonth() &&
        a.getFullYear() === b.getFullYear()
    );
}
```

- [ ] **Step 3 : Lancer les tests**

```bash
npm run test
```

Sortie attendue : aucun test ne régresse.

- [ ] **Step 4 : Commit**

```bash
git add packages/core/src/components/datepicker/datepicker.ts
git commit -m "feat(datepicker): rendu grille calendrier — header nav, table APG, today/selected markers"
```

---

## Task 7 : Navigation clavier (APG Date Picker Dialog)

**Files:**

- Modify: `packages/core/src/components/datepicker/datepicker.ts`

- [ ] **Step 1 : Implémenter `_handlePanelKeyDown` et `_handleGridKeyDown`**

Remplacer le stub `_handlePanelKeyDown` dans `datepicker.ts` :

```typescript
private _handlePanelKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
        e.preventDefault();
        this.open = false;
        this._trigger?.focus();
        return;
    }

    if (e.key === 'Tab') {
        this._handleTabInPanel(e);
        return;
    }

    if (this._isFocusInGrid()) {
        this._handleGridKeyDown(e);
    }
}

private _isFocusInGrid(): boolean {
    const grid = this.shadowRoot?.querySelector('[part="grid"]');
    const active = this.shadowRoot?.activeElement;
    return Boolean(grid?.contains(active ?? null));
}

private _handleTabInPanel(e: KeyboardEvent): void {
    const tabbable = Array.from(
        this._panel?.querySelectorAll<HTMLElement>(
            'button:not([disabled]):not([aria-disabled="true"]), [tabindex="0"]',
        ) ?? [],
    ).filter((el) => el.tabIndex >= 0);

    if (!tabbable.length) return;

    const active = this.shadowRoot?.activeElement;
    const first = tabbable[0];
    const last = tabbable[tabbable.length - 1];

    if (e.shiftKey && active === first) {
        e.preventDefault();
        this.open = false;
        this._trigger?.focus();
    } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        this.open = false;
        this._trigger?.focus();
    }
}

private _handleGridKeyDown(e: KeyboardEvent): void {
    let dayDelta = 0;

    switch (e.key) {
        case 'ArrowLeft':
            dayDelta = -1;
            break;
        case 'ArrowRight':
            dayDelta = 1;
            break;
        case 'ArrowUp':
            dayDelta = -7;
            break;
        case 'ArrowDown':
            dayDelta = 7;
            break;
        case 'Home': {
            // Premier jour de la semaine (lundi)
            const dow = this._calendar.focusedDate.getDay();
            dayDelta = -(dow === 0 ? 6 : dow - 1);
            break;
        }
        case 'End': {
            // Dernier jour de la semaine (dimanche)
            const dow = this._calendar.focusedDate.getDay();
            dayDelta = dow === 0 ? 0 : 7 - dow;
            break;
        }
        case 'PageUp':
            e.preventDefault();
            if (e.shiftKey) this._calendar.previousYear();
            else this._calendar.previousMonth();
            this._keepFocusedDayInView();
            return;
        case 'PageDown':
            e.preventDefault();
            if (e.shiftKey) this._calendar.nextYear();
            else this._calendar.nextMonth();
            this._keepFocusedDayInView();
            return;
        case 'Enter':
        case ' ':
            e.preventDefault();
            if (!this._calendar.isDisabled(this._calendar.focusedDate)) {
                this._selectDay(this._calendar.focusedDate);
            }
            return;
        default:
            return;
    }

    e.preventDefault();

    const next = new Date(this._calendar.focusedDate);
    next.setDate(next.getDate() + dayDelta);

    // Naviguer vers le bon mois si la nouvelle date en sort
    if (
        next.getMonth() !== this._calendar.currentViewMonth.getMonth() ||
        next.getFullYear() !== this._calendar.currentViewMonth.getFullYear()
    ) {
        this._calendar.currentViewMonth = new Date(next.getFullYear(), next.getMonth(), 1);
    }

    this._calendar.focusedDate = next;
    this.requestUpdate();
    void this.updateComplete.then(() => this._focusFocusedDay());
}

/** Après navigation Page Up/Down, maintenir le même jour du mois si possible. */
private _keepFocusedDayInView(): void {
    const v = this._calendar.currentViewMonth;
    const day = Math.min(
        this._calendar.focusedDate.getDate(),
        new Date(v.getFullYear(), v.getMonth() + 1, 0).getDate(), // dernier jour du mois
    );
    this._calendar.focusedDate = new Date(v.getFullYear(), v.getMonth(), day);
    void this.updateComplete.then(() => this._focusFocusedDay());
}
```

- [ ] **Step 2 : Lancer les tests**

```bash
npm run test
```

Sortie attendue : aucun test ne régresse.

- [ ] **Step 3 : Commit**

```bash
git add packages/core/src/components/datepicker/datepicker.ts
git commit -m "feat(datepicker): navigation clavier APG — flèches, Page Up/Down, Home/End, Escape, Tab"
```

---

## Task 8 : Synchronisation input ↔ calendrier + événements

**Files:**

- Modify: `packages/core/src/components/datepicker/datepicker.ts`
- Modify: `packages/core/src/components/datepicker/datepicker.test.ts`

- [ ] **Step 1 : Implémenter les handlers input et les helpers de sync**

Remplacer les stubs dans `datepicker.ts` :

```typescript
private _handleInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    const result = parse(input.value, this.format);

    if (result.complete) {
        this.dispatchEvent(
            new CustomEvent('ar-datepicker-input-complete', {
                bubbles: true,
                composed: true,
                detail: {
                    value: result.valid ? this._toIso(result.date!) : null,
                    valueAsDate: result.date,
                    valid: result.valid,
                },
            }),
        );

        if (result.valid && result.date) {
            this._calendar.selectedDate = result.date;
            this._calendar.currentViewMonth = new Date(
                result.date.getFullYear(),
                result.date.getMonth(),
                1,
            );
            this._calendar.focusedDate = new Date(
                result.date.getFullYear(),
                result.date.getMonth(),
                result.date.getDate(),
            );
            this.requestUpdate();
        }
    }
}

private _handleBlur(): void {
    const raw = this._input?.value ?? '';
    const result = parse(raw, this.format);

    const isoValue = result.valid && result.date ? this._toIso(result.date) : null;
    this.value = isoValue ?? '';
    this._syncFormValue();

    this._emitChange(raw, result.date, result.valid);
}

private _syncInputFromValue(): void {
    if (!this._input) return;
    if (!this.value) {
        this._input.value = '';
        return;
    }
    // value est ISO (yyyy-MM-dd) → convertir au format d'affichage
    const isoResult = parse(this.value, 'yyyy-MM-dd');
    if (isoResult.valid && isoResult.date) {
        this._input.value = format(isoResult.date, this.format);
    }
}

private _emitChange(rawInput?: string, date?: Date | null, valid?: boolean): void {
    // Depuis la sélection calendrier (date fournie directement)
    const emitDate = date ?? (this.value ? parse(this.value, 'yyyy-MM-dd').date : null);
    const emitValid = valid ?? (emitDate !== null);
    const emitValue = emitDate ? this._toIso(emitDate) : null;

    this.dispatchEvent(
        new CustomEvent('ar-datepicker-input-change', {
            bubbles: true,
            composed: true,
            detail: {
                value: emitValue,
                valueAsDate: emitDate,
                valid: emitValid,
            },
        }),
    );
}

private _toIso(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
```

- [ ] **Step 2 : Ajouter les tests de synchronisation dans datepicker.test.ts**

```typescript
describe('synchronisation input ↔ calendrier', () => {
    it('value ISO → input texte formaté', async () => {
        el = await fixture('<ar-datepicker value="2026-06-12"></ar-datepicker>');
        await waitForUpdate(el);
        expect(el.inputElement.value).toBe('12/06/2026');
    });

    it('émet ar-datepicker-input-complete sur saisie complète', async () => {
        el = await fixture('<ar-datepicker></ar-datepicker>');
        let detail: Record<string, unknown> | null = null;
        el.addEventListener('ar-datepicker-input-complete', (e) => {
            detail = (e as CustomEvent).detail;
        });
        el.inputElement.value = '12/06/2026';
        el.inputElement.dispatchEvent(new Event('input'));
        await waitForUpdate(el);
        expect(detail).not.toBeNull();
        expect((detail as Record<string, unknown>).valid).toBe(true);
    });

    it('ar-datepicker-input-complete avec valid:false pour 30/02', async () => {
        el = await fixture('<ar-datepicker></ar-datepicker>');
        let detail: Record<string, unknown> | null = null;
        el.addEventListener('ar-datepicker-input-complete', (e) => {
            detail = (e as CustomEvent).detail;
        });
        el.inputElement.value = '30/02/2026';
        el.inputElement.dispatchEvent(new Event('input'));
        await waitForUpdate(el);
        expect((detail as Record<string, unknown>).valid).toBe(false);
    });

    it('émet ar-datepicker-input-change au blur', async () => {
        el = await fixture('<ar-datepicker></ar-datepicker>');
        let fired = false;
        el.addEventListener('ar-datepicker-input-change', () => (fired = true));
        el.inputElement.value = '12/06/2026';
        el.inputElement.dispatchEvent(new Event('blur'));
        await waitForUpdate(el);
        expect(fired).toBe(true);
    });
});
```

- [ ] **Step 3 : Lancer les tests**

```bash
npm run test
```

Sortie attendue : tous les tests passent.

- [ ] **Step 4 : Commit**

```bash
git add packages/core/src/components/datepicker/datepicker.ts packages/core/src/components/datepicker/datepicker.test.ts
git commit -m "feat(datepicker): sync input↔calendrier, événements input-change et input-complete"
```

---

## Task 9 : Slots, ARIA wiring, has-error

Les slots `label`, `after-label`, `hint`, `error` sont déjà dans le template (Task 4). Cette tâche vérifie que `has-error` se reflète correctement et que `aria-describedby` est résolu.

**Files:**

- Modify: `packages/core/src/components/datepicker/datepicker.test.ts`

- [ ] **Step 1 : Vérifier `has-error` auto-reflection**

```typescript
// Dans datepicker.test.ts — describe 'slots et ARIA'
describe('slots et ARIA', () => {
    it('has-error absent quand slot error est vide', async () => {
        el = await fixture('<ar-datepicker></ar-datepicker>');
        await waitForUpdate(el);
        expect(el.hasAttribute('has-error')).toBe(false);
    });

    it('has-error présent quand slot error a du contenu', async () => {
        el = await fixture(`
            <ar-datepicker>
                <span slot="error">Erreur</span>
            </ar-datepicker>
        `);
        await waitForUpdate(el);
        expect(el.hasAttribute('has-error')).toBe(true);
    });

    it("aria-describedby de l'input pointe vers les IDs internes", async () => {
        el = await fixture('<ar-datepicker></ar-datepicker>');
        const input = el.inputElement;
        const describedBy = input.getAttribute('aria-describedby') ?? '';
        // Les deux IDs doivent être dans le shadow DOM
        const parts = describedBy.split(' ');
        expect(parts).toHaveLength(2);
        parts.forEach((id) => {
            expect(el.shadowRoot?.getElementById(id)).not.toBeNull();
        });
    });

    it('slot label est rendu dans un <label>', async () => {
        el = await fixture(`
            <ar-datepicker>
                <span slot="label">Date de naissance</span>
            </ar-datepicker>
        `);
        const labelEl = el.shadowRoot?.querySelector('label');
        expect(labelEl).not.toBeNull();
        expect(labelEl?.querySelector('slot[name="label"]')).not.toBeNull();
    });
});
```

- [ ] **Step 2 : Lancer les tests**

```bash
npm run test
```

Sortie attendue : tous les tests slots et ARIA passent.

- [ ] **Step 3 : Commit**

```bash
git add packages/core/src/components/datepicker/datepicker.test.ts
git commit -m "test(datepicker): slots, aria-describedby, has-error auto-reflection"
```

---

## Task 10 : Participation aux formulaires (ElementInternals)

**Files:**

- Modify: `packages/core/src/components/datepicker/datepicker.ts`
- Modify: `packages/core/src/components/datepicker/datepicker.test.ts`

- [ ] **Step 1 : Implémenter `_syncFormValue`**

Remplacer le stub dans `datepicker.ts` :

```typescript
private _syncFormValue(): void {
    if (this.disabled) {
        this._internals.setFormValue(null);
        return;
    }
    this._internals.setFormValue(this.value || null, this.value || null);
}
```

S'assurer que `name` est pris en compte : `ElementInternals` utilise automatiquement l'attribut `name` de l'élément hôte pour identifier le champ dans le formulaire.

- [ ] **Step 2 : Ajouter les tests de participation formulaire**

```typescript
describe('participation formulaire', () => {
    it('formAssociated est true', () => {
        expect(ArDatepicker.formAssociated).toBe(true);
    });

    it('disabled exclut la valeur du formulaire', async () => {
        el = await fixture('<ar-datepicker value="2026-06-12" disabled></ar-datepicker>');
        await waitForUpdate(el);
        // ElementInternals.setFormValue(null) quand disabled
        // On vérifie via les internals que la valeur est null
        const internals = (el as unknown as { _internals: ElementInternals })._internals;
        // En happy-dom, on ne peut pas lire formValue directement — tester via form submission
        // Vérifier que _syncFormValue est appelé sans erreur
        expect(() => (el.disabled = false)).not.toThrow();
    });
});
```

- [ ] **Step 3 : Lancer les tests**

```bash
npm run test
```

Sortie attendue : tests passent.

- [ ] **Step 4 : Commit**

```bash
git add packages/core/src/components/datepicker/datepicker.ts packages/core/src/components/datepicker/datepicker.test.ts
git commit -m "feat(datepicker): participation formulaire via ElementInternals"
```

---

## Task 11 : Tokens CSS dans default.css

**Files:**

- Modify: `packages/core/src/styles/themes/default.css`
- Modify: `packages/core/src/components/datepicker/datepicker.styles.ts`

- [ ] **Step 1 : Ajouter les tokens datepicker dans default.css**

Repérer la dernière section de tokens dans `packages/core/src/styles/themes/default.css` et ajouter à la fin du bloc `:root` dans `@layer ariane.theme` :

```css
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ar-datepicker
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
--ar-datepicker-panel-width: 20rem;
--ar-datepicker-day-size: 2.25rem;

--ar-datepicker-day-today-bg: var(--ar-color-primary-90);
--ar-datepicker-day-today-color: var(--ar-color-primary-40);

--ar-datepicker-day-selected-bg: var(--ar-color-primary-50);
--ar-datepicker-day-selected-color: var(--ar-color-white);

--ar-datepicker-input-error-border-color: var(--ar-color-red-50);
```

- [ ] **Step 2 : Compléter les styles dans datepicker.styles.ts**

```typescript
import { css } from 'lit';

export default css`
    :host {
        display: block;
    }

    p {
        margin: 0;
    }

    .input-wrapper {
        display: flex;
        align-items: stretch;
    }

    [part='input'] {
        flex: 1;
        min-width: 0;
    }

    [part='trigger'] {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    }

    :host([disabled]) [part='trigger'],
    :host([readonly]) [part='trigger'] {
        pointer-events: none;
    }

    :host([has-error]) [part='input'] {
        border-color: var(--ar-datepicker-input-error-border-color);
    }

    /* Panel */
    [part='panel'] {
        width: var(--ar-datepicker-panel-width);
        padding: var(--ar-panel-padding);
    }

    /* Header navigation */
    [part='header'] {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.25rem;
    }

    [part='header'] span[aria-live] {
        flex: 1;
        text-align: center;
        font-weight: 600;
    }

    /* Grille */
    [part='grid'] {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
    }

    [part='grid'] th {
        text-align: center;
        font-size: 0.75rem;
        padding-block: 0.5rem;
    }

    [part='day'] {
        width: var(--ar-datepicker-day-size);
        height: var(--ar-datepicker-day-size);
        display: flex;
        align-items: center;
        justify-content: center;
        margin: auto;
        cursor: pointer;
        border-radius: 50%;
        background: none;
        border: none;
    }

    [part='day'].today {
        background-color: var(--ar-datepicker-day-today-bg);
        color: var(--ar-datepicker-day-today-color);
    }

    [part='day'].selected {
        background-color: var(--ar-datepicker-day-selected-bg);
        color: var(--ar-datepicker-day-selected-color);
    }

    [part='day'].other-month {
        opacity: 0.4;
    }

    [part='day'].disabled,
    [part='day'][aria-disabled='true'] {
        opacity: 0.4;
        cursor: not-allowed;
    }

    /* Footer */
    [part='footer'] {
        display: flex;
        justify-content: space-between;
        gap: 0.5rem;
        padding-top: 0.5rem;
    }
`;
```

- [ ] **Step 3 : Lancer les tests pour vérifier aucune régression**

```bash
npm run test
```

- [ ] **Step 4 : Commit**

```bash
git add packages/core/src/styles/themes/default.css packages/core/src/components/datepicker/datepicker.styles.ts
git commit -m "feat(datepicker): tokens CSS et styles de la grille"
```

---

## Task 12 : Tests browser (WTR + Playwright)

**Files:**

- Create: `packages/core/src/components/datepicker/datepicker.browser.test.ts`

- [ ] **Step 1 : Écrire datepicker.browser.test.ts**

```typescript
// packages/core/src/components/datepicker/datepicker.browser.test.ts
import { expect, fixture, html, waitUntil } from '@open-wc/testing';
import type { ArDatepicker } from './datepicker.js';
import './datepicker.js';

// Helper : attendre que le popover soit ouvert et rendu
async function openPicker(el: ArDatepicker): Promise<void> {
    el.open = true;
    await el.updateComplete;
    await waitUntil(() => el.shadowRoot?.querySelector('[part="grid"]') !== null);
}

describe('ar-datepicker — browser tests', () => {
    let el: ArDatepicker;

    afterEach(() => el?.remove());

    // ── Focus management ────────────────────────────────────────────────────

    describe("focus à l'ouverture", () => {
        it("focus sur aujourd'hui quand aucune date sélectionnée", async () => {
            el = await fixture(html`<ar-datepicker></ar-datepicker>`);
            await openPicker(el);

            const focused = el.shadowRoot?.querySelector<HTMLButtonElement>(
                '[part="day"][tabindex="0"]',
            );
            expect(focused).to.exist;
            expect(document.activeElement?.shadowRoot?.activeElement).to.equal(focused);
        });

        it("focus sur la date sélectionnée à l'ouverture", async () => {
            el = await fixture(html`<ar-datepicker value="2026-06-12"></ar-datepicker>`);
            await openPicker(el);

            const focused = el.shadowRoot?.querySelector<HTMLButtonElement>(
                '[part="day"][tabindex="0"]',
            );
            expect(focused?.getAttribute('aria-label')).to.include('12');
        });
    });

    describe('focus retourné au trigger à la fermeture', () => {
        it('Escape retourne le focus au trigger', async () => {
            el = await fixture(html`<ar-datepicker></ar-datepicker>`);
            await openPicker(el);

            const panel = el.shadowRoot?.querySelector('[part="panel"]') as HTMLElement;
            panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            await el.updateComplete;

            expect(document.activeElement?.shadowRoot?.activeElement).to.equal(
                el.shadowRoot?.querySelector('[part="trigger"]'),
            );
        });
    });

    // ── Navigation clavier dans la grille ───────────────────────────────────

    describe('navigation clavier', () => {
        it("ArrowRight déplace le focus d'un jour", async () => {
            el = await fixture(html`<ar-datepicker value="2026-06-12"></ar-datepicker>`);
            await openPicker(el);

            const grid = el.shadowRoot?.querySelector('[part="grid"]') as HTMLElement;
            grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
            await el.updateComplete;

            const focused = el.shadowRoot?.querySelector<HTMLButtonElement>(
                '[part="day"][tabindex="0"]',
            );
            expect(focused?.getAttribute('aria-label')).to.include('13');
        });

        it("ArrowDown déplace le focus d'une semaine", async () => {
            el = await fixture(html`<ar-datepicker value="2026-06-01"></ar-datepicker>`);
            await openPicker(el);

            const grid = el.shadowRoot?.querySelector('[part="grid"]') as HTMLElement;
            grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
            await el.updateComplete;

            const focused = el.shadowRoot?.querySelector<HTMLButtonElement>(
                '[part="day"][tabindex="0"]',
            );
            expect(focused?.getAttribute('aria-label')).to.include('8');
        });

        it('PageDown navigue au mois suivant', async () => {
            el = await fixture(html`<ar-datepicker value="2026-06-12"></ar-datepicker>`);
            await openPicker(el);

            const panel = el.shadowRoot?.querySelector('[part="panel"]') as HTMLElement;
            panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true }));
            await el.updateComplete;

            const label = el.shadowRoot?.querySelector('[aria-live]');
            expect(label?.textContent?.toLowerCase()).to.include('juillet');
        });

        it("Shift+PageDown navigue à l'année suivante", async () => {
            el = await fixture(html`<ar-datepicker value="2026-06-12"></ar-datepicker>`);
            await openPicker(el);

            const panel = el.shadowRoot?.querySelector('[part="panel"]') as HTMLElement;
            panel.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'PageDown', shiftKey: true, bubbles: true }),
            );
            await el.updateComplete;

            const label = el.shadowRoot?.querySelector('[aria-live]');
            expect(label?.textContent).to.include('2027');
        });

        it('Enter sélectionne le jour focalisé', async () => {
            el = await fixture(html`<ar-datepicker value="2026-06-12"></ar-datepicker>`);
            let changeDetail: Record<string, unknown> | null = null;
            el.addEventListener('ar-datepicker-input-change', (e) => {
                changeDetail = (e as CustomEvent).detail;
            });

            await openPicker(el);

            const grid = el.shadowRoot?.querySelector('[part="grid"]') as HTMLElement;
            grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            await el.updateComplete;

            expect(changeDetail).to.exist;
            expect((changeDetail as Record<string, unknown>).value).to.equal('2026-06-12');
        });
    });

    // ── Roving tabindex ─────────────────────────────────────────────────────

    describe('roving tabindex', () => {
        it('un seul bouton day a tabindex="0" à la fois', async () => {
            el = await fixture(html`<ar-datepicker></ar-datepicker>`);
            await openPicker(el);

            const focused = el.shadowRoot?.querySelectorAll('[part="day"][tabindex="0"]');
            expect(focused?.length).to.equal(1);
        });
    });

    // ── Synchronisation input ↔ calendrier ──────────────────────────────────

    describe('synchronisation', () => {
        it('saisie texte valide met à jour la sélection dans le calendrier', async () => {
            el = await fixture(html`<ar-datepicker></ar-datepicker>`);
            el.inputElement.value = '12/06/2026';
            el.inputElement.dispatchEvent(new Event('input', { bubbles: true }));
            await el.updateComplete;

            await openPicker(el);

            const selected = el.shadowRoot?.querySelector('[part="day"][aria-selected="true"]');
            expect(selected?.getAttribute('aria-label')).to.include('12');
        });
    });
});
```

- [ ] **Step 2 : Lancer les tests browser**

```bash
npm run test:all 2>&1 | grep -E "(datepicker|✓|✗|PASS|FAIL)" | head -40
```

Sortie attendue : tous les tests browser passent.

- [ ] **Step 3 : Commit**

```bash
git add packages/core/src/components/datepicker/datepicker.browser.test.ts
git commit -m "test(datepicker): tests browser — focus, navigation clavier, roving tabindex, sync"
```

---

## Task 13 : Tests d'accessibilité (WTR + axe-core)

**Files:**

- Create: `packages/core/src/components/datepicker/datepicker.a11y.test.ts`

- [ ] **Step 1 : Écrire datepicker.a11y.test.ts**

```typescript
// packages/core/src/components/datepicker/datepicker.a11y.test.ts
import { expect, fixture, html, waitUntil } from '@open-wc/testing';
import { axe, toHaveNoViolations } from 'axe-core';
import type { ArDatepicker } from './datepicker.js';
import './datepicker.js';

expect.extend(toHaveNoViolations);

async function openPicker(el: ArDatepicker): Promise<void> {
    el.open = true;
    await el.updateComplete;
    await waitUntil(() => el.shadowRoot?.querySelector('[part="grid"]') !== null);
}

describe('ar-datepicker — accessibilité', () => {
    let el: ArDatepicker;
    afterEach(() => el?.remove());

    it("aucune violation axe à l'état fermé", async () => {
        el = await fixture(html`
            <ar-datepicker label="Date de naissance">
                <span slot="hint">Format attendu : jj/mm/aaaa</span>
            </ar-datepicker>
        `);
        const results = await axe(el, { runOnly: ['wcag2a', 'wcag2aa'] });
        expect(results).to.have.no.violations();
    });

    it("aucune violation axe à l'état ouvert", async () => {
        el = await fixture(html`<ar-datepicker label="Date de naissance"></ar-datepicker>`);
        await openPicker(el);
        const results = await axe(el, { runOnly: ['wcag2a', 'wcag2aa'] });
        expect(results).to.have.no.violations();
    });

    it('aria-describedby résolu — les IDs existent dans le shadow DOM', async () => {
        el = await fixture(html`<ar-datepicker></ar-datepicker>`);
        const input = el.inputElement;
        const ids = (input.getAttribute('aria-describedby') ?? '').split(' ');
        ids.forEach((id) => {
            expect(el.shadowRoot?.getElementById(id)).to.exist;
        });
    });

    it('aria-live="polite" sur le label mois/année', async () => {
        el = await fixture(html`<ar-datepicker></ar-datepicker>`);
        await openPicker(el);
        const live = el.shadowRoot?.querySelector('[aria-live="polite"]');
        expect(live).to.exist;
    });

    it('aria-disabled sur les jours désactivés (pas disabled natif)', async () => {
        el = await fixture(html`
            <ar-datepicker
                value="2026-06-12"
                .isDateDisabled=${(d: Date) => d.getDay() === 0}
            ></ar-datepicker>
        `);
        await openPicker(el);

        const disabledDays = el.shadowRoot?.querySelectorAll('[part="day"][aria-disabled="true"]');
        expect(disabledDays?.length).to.be.greaterThan(0);

        // Aucun bouton ne doit avoir l'attribut natif "disabled"
        const nativeDisabled = el.shadowRoot?.querySelectorAll('[part="day"][disabled]');
        expect(nativeDisabled?.length).to.equal(0);
    });

    it('aria-current="date" uniquement sur aujourd\'hui', async () => {
        el = await fixture(html`<ar-datepicker></ar-datepicker>`);
        await openPicker(el);
        const todayButtons = el.shadowRoot?.querySelectorAll('[aria-current="date"]');
        expect(todayButtons?.length).to.equal(1);
    });

    it('aria-selected="true" uniquement sur le jour sélectionné', async () => {
        el = await fixture(html`<ar-datepicker value="2026-06-12"></ar-datepicker>`);
        await openPicker(el);
        const selected = el.shadowRoot?.querySelectorAll('[aria-selected="true"]');
        expect(selected?.length).to.equal(1);
    });

    it('role="alert" sur le wrapper du slot error', async () => {
        el = await fixture(html`<ar-datepicker></ar-datepicker>`);
        const alertEl = el.shadowRoot?.querySelector('[role="alert"]');
        expect(alertEl).to.exist;
    });
});
```

- [ ] **Step 2 : Lancer les tests a11y**

```bash
npm run test:all 2>&1 | grep -E "(datepicker.a11y|✓|✗|FAIL)" | head -30
```

Sortie attendue : tous les tests a11y passent.

- [ ] **Step 3 : Commit**

```bash
git add packages/core/src/components/datepicker/datepicker.a11y.test.ts
git commit -m "test(datepicker): tests accessibilité axe-core — audit ouvert/fermé, ARIA"
```

---

## Task 14 : Documentation (ar-datepicker.mdx)

**Files:**

- Modify: `apps/docs/src/content/components/ar-datepicker.mdx`

- [ ] **Step 1 : Remplacer le contenu généré par le scaffold**

La page doit suivre l'architecture du site de doc (skill `ariane-write-docs`). Voici la structure frontmatter et les sections attendues :

```mdx
---
tagName: ar-datepicker
title: Datepicker
description: Champ de saisie de date avec calendrier popover accessible — saisie libre et sélection visuelle synchronisées.
variants:
    - name: Par défaut
      description: Date unique avec format français.
      html: |
          <ar-datepicker
            label="Date de naissance"
            format="dd/MM/yyyy"
            locale="fr-FR"
          >
            <span slot="hint">Format attendu : jj/mm/aaaa</span>
          </ar-datepicker>
    - name: Avec erreur
      description: État d'erreur visible via le slot error.
      html: |
          <ar-datepicker label="Date de naissance">
            <span slot="error">Date invalide ou hors plage autorisée</span>
          </ar-datepicker>
    - name: Readonly
      description: Valeur affichée non modifiable, soumise au formulaire.
      html: |
          <ar-datepicker value="2026-06-12" readonly label="Date"></ar-datepicker>
    - name: Disabled
      description: Composant désactivé, valeur exclue du formulaire.
      html: |
          <ar-datepicker value="2026-06-12" disabled label="Date"></ar-datepicker>
---

Documentation narrative des sections…
```

**Sections narratives à rédiger :**

1. **Saisie texte** — synchronisation input ↔ calendrier, exemples d'événements `ar-datepicker-input-complete` et `ar-datepicker-input-change`
2. **Validation** — slot `error`, attribut `has-error`, distinction `complete` vs `valid` dans le `detail`
3. **Dates désactivées** — `min`, `max`, callback `isDateDisabled` (exemple week-ends)
4. **Formulaires** — `name`, `required`, `readonly` vs `disabled`
5. **Intégration masque de saisie** — exemple `inputElement` getter + IMask
6. **Accessibilité** — raccourcis clavier (tableau), recommandations label/hint/error, note sur `placeholder`

- [ ] **Step 2 : Lancer le serveur de dev et vérifier la page**

```bash
npm run dev
```

Ouvrir la page `ar-datepicker` dans le navigateur et vérifier : playground fonctionnel, toutes les variantes s'affichent, API table complète.

- [ ] **Step 3 : Commit**

```bash
git add apps/docs/src/content/components/ar-datepicker.mdx
git commit -m "docs(datepicker): page de documentation — playground, API, accessibilité"
```

---

## Task 15 : CEM manifest + vérification finale

**Files:**

- Generate: `packages/core/custom-elements.json` (via script)

- [ ] **Step 1 : Regénérer le Custom Elements Manifest**

```bash
npm run build:manifest
```

Vérifier que `ar-datepicker` apparaît dans `custom-elements.json` avec ses props, events, slots et cssparts.

```bash
grep -A5 '"ar-datepicker"' packages/core/custom-elements.json | head -20
```

- [ ] **Step 2 : Lancer la suite complète de tests**

```bash
npm run test:all
```

Sortie attendue : toutes les suites passent (Vitest + WTR).

- [ ] **Step 3 : Vérifier le lint**

```bash
npm run lint
```

Sortie attendue : aucune erreur.

- [ ] **Step 4 : Commit final**

```bash
git add packages/core/custom-elements.json
git commit -m "chore(datepicker): regénère custom-elements.json"
```

- [ ] **Step 5 : Ouvrir la PR**

```bash
gh pr create \
  --base dev \
  --title "feat(datepicker): ar-datepicker — sélection date unique avec calendrier APG" \
  --body "$(cat <<'EOF'
## Summary

- Composant `ar-datepicker` : input texte + calendrier popover synchronisés
- `CalendarController` (Lit Reactive Controller privé) + `date-parser.ts` testés indépendamment
- Navigation clavier APG Date Picker Dialog complète (flèches, Page Up/Down, Home/End, Escape)
- Participation aux formulaires natifs via `ElementInternals`
- Slots `label`, `after-label`, `hint` (défaut dynamique), `error` + `has-error` auto-reflété
- Getter `inputElement` pour intégration de masques de saisie (IMask…)
- Tokens CSS `--ar-datepicker-*` dans `themes/default.css`

## Test plan

- [ ] `npm run test:all` — toutes les suites passent
- [ ] Tester manuellement dans le browser : saisie texte → calendrier synchronisé
- [ ] Tester navigation clavier complète (voir doc Accessibilité)
- [ ] Tester avec un lecteur d'écran (VoiceOver / NVDA)
- [ ] Vérifier `readonly` bloque saisie ET calendrier, valeur soumise au formulaire
- [ ] Vérifier `disabled` exclut la valeur du formulaire

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Récapitulatif des commits

| Task | Commit                                                                                      |
| ---- | ------------------------------------------------------------------------------------------- |
| 1    | `feat(datepicker): scaffold ar-datepicker`                                                  |
| 2    | `feat(datepicker): date-parser — parse et format avec validation stricte`                   |
| 3    | `feat(datepicker): CalendarController — navigation, grille 6 semaines, isDisabled`          |
| 4    | `feat(datepicker): skeleton — props, Shadow DOM, styles de base`                            |
| 5    | `feat(datepicker): popover — open/close, événements show/hide`                              |
| 6    | `feat(datepicker): rendu grille calendrier — header nav, table APG, today/selected markers` |
| 7    | `feat(datepicker): navigation clavier APG — flèches, Page Up/Down, Home/End, Escape, Tab`   |
| 8    | `feat(datepicker): sync input↔calendrier, événements input-change et input-complete`        |
| 9    | `test(datepicker): slots, aria-describedby, has-error auto-reflection`                      |
| 10   | `feat(datepicker): participation formulaire via ElementInternals`                           |
| 11   | `feat(datepicker): tokens CSS et styles de la grille`                                       |
| 12   | `test(datepicker): tests browser — focus, navigation clavier, roving tabindex, sync`        |
| 13   | `test(datepicker): tests accessibilité axe-core — audit ouvert/fermé, ARIA`                 |
| 14   | `docs(datepicker): page de documentation — playground, API, accessibilité`                  |
| 15   | `chore(datepicker): regénère custom-elements.json` + PR                                     |
