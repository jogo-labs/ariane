# ArianeFormElement : propriétés réfléchies, API de validation, réinitialisation (#325) — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `ArianeFormElement` donne à tout composant de formulaire `name`/`disabled`/`required` réfléchis, la cascade fieldset, l'API de validation standard (avec fusion d'une erreur personnalisée) et la réinitialisation par `form.reset()` ; le datepicker en hérite.

**Architecture:** la base porte les propriétés et la cascade, délègue `validity`, `checkValidity()`… à `ElementInternals` (valeurs de repli sans `internals`), mémorise l'état de validité du composant et le message personnalisé pour les fusionner dans `setValidity`, et appelle un crochet protégé `formReset()` depuis `formResetCallback()`. Le datepicker supprime ses doublons, appelle `setComponentValidity` et surcharge `formReset()`.

**Tech Stack:** Lit 3 (décorateurs), TypeScript strict (`exactOptionalPropertyTypes`), Vitest (happy-dom, faux `ElementInternals`), Web Test Runner (Chromium, WebKit), `@open-wc/testing`.

**Spec:** `docs/superpowers/specs/2026-10-15-form-element-base-325-design.md`

## Global Constraints

- Prettier : 100 caractères, 4 espaces, guillemets simples. `import type` pour tout import de type. Pas de retours à la ligne manuels dans la prose des docs.
- Commits Conventional Commits sur la branche existante `feat/form-element-base-325` (le spec est déjà commité). En-tête de commit ≤ 100 caractères, lignes de pied de page ≤ 100 caractères. **Ne jamais pousser ni ouvrir de PR sans confirmation du mainteneur.**
- Node 24 : préfixer chaque commande npm par `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null &&` et utiliser les chemins absolus (racine : `/Users/jon/Code/Active_projects/ariane`).
- Headless : aucun fallback cosmétique. Aucune dépendance ajoutée. Aucun changement incompatible (ajouts seulement).
- API publique modifiée : mettre à jour le skill (`packages/core/scripts/skill/content/`) ; `npm run check:skill` doit passer.
- Tests navigateur locaux sans Firefox : `ARIANE_BROWSERS=chromium,webkit`. Un échec intermittent juste après un `npm run build` est connu (délai du premier démarrage) : relancer avant de diagnostiquer.

## Review Focus

1. Un `setCustomValidity` survit à une revalidation du composant (changement de valeur, changement de langue) et se retire avec `''` (Tâches 1, 2).
2. `form.reset()` : valeur initiale posée par attribut, posée par propriété avant le premier rendu, et vide ; texte saisi mais non validé (Tâches 1, 3).
3. `name` posé en propriété (cas React 19) entre dans `FormData` ; un `<fieldset disabled>` exclut la valeur (Tâche 1).
4. Sans `ElementInternals` (happy-dom, avant la connexion) : aucun délégué ne lève d'exception (Tâche 2).
5. `name`, `disabled`, `required` et les nouveaux membres restent documentés pour `ar-datepicker` dans le CEM, la doc et le skill (Tâche 4).

---

### Task 1: Tests navigateur sur un vrai formulaire (rouge)

**Files:**

- Create: `packages/core/src/components/datepicker/datepicker.form.browser.test.ts`

**Interfaces:**

- Produces: la spécification exécutable du comportement de formulaire du datepicker ; les Tâches 2 et 3 doivent la rendre verte.

- [ ] **Step 1: Écrire le test**

Créer `datepicker.form.browser.test.ts` :

```ts
/// <reference types="mocha" />
/**
 * Comportement de formulaire d'ar-datepicker dans un vrai navigateur : `FormData`, `form.reset()`,
 * API de validation, erreur personnalisée, fieldset, labels (#325).
 */
import { expect, fixture } from '@open-wc/testing';
import type { ArDatepicker } from './datepicker.js';
import './index.js';

document.documentElement.lang = 'fr';

async function mount(markup: string): Promise<{ form: HTMLFormElement; el: ArDatepicker }> {
    const form = await fixture<HTMLFormElement>(`<form>${markup}</form>`);
    const el = form.querySelector<ArDatepicker>('ar-datepicker')!;
    await el.updateComplete;
    return { form, el };
}

describe('ar-datepicker — formulaire', () => {
    describe('name', () => {
        it('posé en propriété (React 19), la valeur entre dans FormData', async () => {
            const form = await fixture<HTMLFormElement>('<form></form>');
            const el = document.createElement('ar-datepicker') as ArDatepicker;
            el.name = 'date';
            el.value = '2026-03-15';
            form.append(el);
            await el.updateComplete;
            expect(el.getAttribute('name')).to.equal('date');
            expect(new FormData(form).get('date')).to.equal('2026-03-15');
        });

        it('un <fieldset disabled> exclut la valeur de FormData', async () => {
            const { form } = await mount(
                '<fieldset disabled><ar-datepicker name="d" value="2026-03-15"></ar-datepicker></fieldset>',
            );
            expect(new FormData(form).get('d')).to.equal(null);
        });
    });

    describe('form.reset()', () => {
        it("restaure la valeur initiale posée par l'attribut, texte de saisie compris", async () => {
            const { form, el } = await mount(
                '<ar-datepicker name="d" value="2026-05-01"></ar-datepicker>',
            );
            el.value = '2026-06-02';
            await el.updateComplete;
            form.reset();
            await el.updateComplete;
            expect(el.value).to.equal('2026-05-01');
            expect(new FormData(form).get('d')).to.equal('2026-05-01');
            expect(el.inputElement.value).to.equal('01/05/2026');
        });

        it('restaure la valeur posée par propriété avant le premier rendu', async () => {
            const form = await fixture<HTMLFormElement>('<form></form>');
            const el = document.createElement('ar-datepicker') as ArDatepicker;
            el.name = 'd';
            el.value = '2026-01-10';
            form.append(el);
            await el.updateComplete;
            el.value = '2026-02-20';
            await el.updateComplete;
            form.reset();
            await el.updateComplete;
            expect(el.value).to.equal('2026-01-10');
        });

        it('revient à vide quand la valeur initiale est vide, et efface le texte saisi', async () => {
            const { form, el } = await mount('<ar-datepicker name="d"></ar-datepicker>');
            el.inputElement.value = '12/06/20';
            el.value = '2026-06-12';
            await el.updateComplete;
            form.reset();
            await el.updateComplete;
            expect(el.value).to.equal('');
            expect(el.inputElement.value).to.equal('');
            expect(new FormData(form).get('d')).to.equal(null);
        });

        it('ne change ni la validité personnalisée ni les événements', async () => {
            const { form, el } = await mount('<ar-datepicker name="d"></ar-datepicker>');
            let events = 0;
            el.addEventListener('ar-datepicker-input-change', () => (events += 1));
            el.setCustomValidity('Date indisponible');
            form.reset();
            await el.updateComplete;
            expect(el.validity.customError).to.equal(true);
            expect(events).to.equal(0);
        });
    });

    describe('API de validation', () => {
        it('un champ obligatoire vide est invalide, avec le message localisé', async () => {
            const { form, el } = await mount('<ar-datepicker required></ar-datepicker>');
            expect(el.willValidate).to.equal(true);
            expect(el.checkValidity()).to.equal(false);
            expect(el.validity.valueMissing).to.equal(true);
            expect(el.validationMessage).to.equal('Veuillez renseigner ce champ.');
            expect(el.form).to.equal(form);
            el.value = '2026-06-12';
            await el.updateComplete;
            expect(el.checkValidity()).to.equal(true);
            expect(el.validationMessage).to.equal('');
        });

        it("labels renvoie le <label for> associé à l'hôte", async () => {
            const { el } = await mount(
                '<label for="dp-test">Date</label><ar-datepicker id="dp-test"></ar-datepicker>',
            );
            expect(el.labels.length).to.equal(1);
            expect((el.labels[0] as HTMLElement).textContent).to.equal('Date');
        });
    });

    describe('setCustomValidity', () => {
        it('rend le champ invalide, survit à une revalidation du composant, se retire avec une chaîne vide', async () => {
            const { form, el } = await mount('<ar-datepicker name="d"></ar-datepicker>');
            el.setCustomValidity('Date indisponible');
            expect(el.validity.customError).to.equal(true);
            expect(el.validationMessage).to.equal('Date indisponible');
            expect(form.checkValidity()).to.equal(false);

            // Revalidation par le composant (changement de valeur) : l'erreur personnalisée reste.
            el.value = '2026-06-12';
            await el.updateComplete;
            expect(el.validity.customError).to.equal(true);

            el.setCustomValidity('');
            expect(el.validity.customError).to.equal(false);
            expect(el.checkValidity()).to.equal(true);
        });

        it("s'ajoute au drapeau valueMissing sans le remplacer, et le message personnalisé prime", async () => {
            const { el } = await mount('<ar-datepicker required></ar-datepicker>');
            el.setCustomValidity('Choisissez une date ouvrée');
            expect(el.validity.valueMissing).to.equal(true);
            expect(el.validity.customError).to.equal(true);
            expect(el.validationMessage).to.equal('Choisissez une date ouvrée');
            el.setCustomValidity('');
            expect(el.validity.valueMissing).to.equal(true);
            expect(el.validationMessage).to.equal('Veuillez renseigner ce champ.');
        });
    });
});
```

- [ ] **Step 2: Lancer pour voir l'échec**

Run: `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && cd /Users/jon/Code/Active_projects/ariane/packages/core && ARIANE_BROWSERS=chromium npx web-test-runner --files "src/components/datepicker/datepicker.form.browser.test.ts" 2>&1 | grep -E "passed|failed|AssertionError|TypeError|is not a function" | head -14`
Expected: échecs pour `name` posé en propriété (`getAttribute('name')` vaut `null`), les trois `form.reset()` (valeur non restaurée), l'API de validation (`el.willValidate` ou `el.checkValidity is not a function`), `labels`, et les deux `setCustomValidity`. Seul le test du `<fieldset disabled>` peut déjà passer : il documente un comportement existant. Si un autre test passe d'emblée, le durcir avant de continuer.

- [ ] **Step 3: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add packages/core/src/components/datepicker/datepicker.form.browser.test.ts && git commit -m "test(core): comportement de formulaire du datepicker en navigateur réel (#325)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: La base `ArianeFormElement`

**Files:**

- Modify: `packages/core/src/base/ariane-form-element.ts`
- Modify: `packages/core/src/base/ariane-form-element.test.ts`

**Interfaces:**

- Consumes: `ArianeElement` (`protected internals: ElementInternals | undefined`, `connectedCallback` qui l'attache).
- Produces (utilisé par la Tâche 3) : propriétés `name`, `disabled`, `required` ; `protected _formDisabled` (état) ; `protected get effectiveDisabled(): boolean` ; `formDisabledCallback(disabled)` et `formResetCallback()` (`@internal`) ; `protected formReset(): void` ; délégués publics `validity`, `validationMessage`, `willValidate`, `form`, `labels`, `checkValidity()`, `reportValidity()`, `setCustomValidity(message)` ; `protected setComponentValidity(flags, message?, anchor?)`.

- [ ] **Step 1: Écrire les tests de la base (rouge)**

Dans `ariane-form-element.test.ts`, remplacer l'import `vi` si besoin (il est déjà présent) et ajouter, à la suite des tests existants, dans le même `describe` :

```ts
// ── Propriétés partagées ────────────────────────────────────────────────

it('name, disabled et required sont réfléchis en attributs', async () => {
    el = await fixture<TestArianeFormElement>(
        '<test-ariane-form-element></test-ariane-form-element>',
    );
    el.name = 'champ';
    el.disabled = true;
    el.required = true;
    await el.updateComplete;
    expect(el.getAttribute('name')).toBe('champ');
    expect(el.hasAttribute('disabled')).toBe(true);
    expect(el.hasAttribute('required')).toBe(true);
});

it('effectiveDisabled combine disabled et la cascade fieldset (formDisabledCallback)', async () => {
    el = await fixture<TestArianeFormElement>(
        '<test-ariane-form-element></test-ariane-form-element>',
    );
    expect(el.isEffectivelyDisabled()).toBe(false);
    el.formDisabledCallback(true);
    expect(el.isEffectivelyDisabled()).toBe(true);
    el.formDisabledCallback(false);
    el.disabled = true;
    expect(el.isEffectivelyDisabled()).toBe(true);
});

it('formResetCallback appelle le crochet formReset()', async () => {
    el = await fixture<TestArianeFormElement>(
        '<test-ariane-form-element></test-ariane-form-element>',
    );
    el.formResetCallback();
    expect(el.resetCalls).toBe(1);
});

// ── Délégués de validation ──────────────────────────────────────────────

describe('sans ElementInternals (happy-dom, avant la connexion)', () => {
    it('les délégués renvoient des valeurs de repli sans lever', async () => {
        el = await fixture<TestArianeFormElement>(
            '<test-ariane-form-element></test-ariane-form-element>',
        );
        expect(el.getInternals()).toBeUndefined();
        expect(el.checkValidity()).toBe(true);
        expect(el.reportValidity()).toBe(true);
        expect(el.validationMessage).toBe('');
        expect(el.willValidate).toBe(false);
        expect(el.form).toBeNull();
        expect(el.labels.length).toBe(0);
        expect(el.validity.valid).toBe(true);
        expect(el.validity.customError).toBe(false);
        expect(() => el.setCustomValidity('x')).not.toThrow();
        expect(() => el.validateWith({ valueMissing: true }, 'requis')).not.toThrow();
    });
});

describe('avec ElementInternals', () => {
    interface Fake {
        validity: object;
        validationMessage: string;
        willValidate: boolean;
        form: HTMLFormElement | null;
        labels: NodeList;
        checkValidity: ReturnType<typeof vi.fn>;
        reportValidity: ReturnType<typeof vi.fn>;
        setValidity: ReturnType<typeof vi.fn>;
    }
    let fake: Fake;

    beforeEach(() => {
        fake = {
            validity: { valid: false, valueMissing: true },
            validationMessage: 'message natif',
            willValidate: true,
            form: document.createElement('form'),
            labels: document.createDocumentFragment().childNodes,
            checkValidity: vi.fn(() => false),
            reportValidity: vi.fn(() => false),
            setValidity: vi.fn(),
        };
        (HTMLElement.prototype as unknown as Record<string, unknown>).attachInternals = () => fake;
    });
    afterEach(() => {
        delete (HTMLElement.prototype as unknown as Record<string, unknown>).attachInternals;
    });

    it('délègue chaque membre à ElementInternals', async () => {
        el = await fixture<TestArianeFormElement>(
            '<test-ariane-form-element></test-ariane-form-element>',
        );
        expect(el.validity).toBe(fake.validity);
        expect(el.validationMessage).toBe('message natif');
        expect(el.willValidate).toBe(true);
        expect(el.form).toBe(fake.form);
        expect(el.labels).toBe(fake.labels);
        expect(el.checkValidity()).toBe(false);
        expect(el.reportValidity()).toBe(false);
        expect(fake.checkValidity).toHaveBeenCalledOnce();
        expect(fake.reportValidity).toHaveBeenCalledOnce();
    });

    it('setComponentValidity transmet drapeaux, message et ancre à setValidity', async () => {
        el = await fixture<TestArianeFormElement>(
            '<test-ariane-form-element></test-ariane-form-element>',
        );
        const anchor = document.createElement('input');
        fake.setValidity.mockClear();
        el.validateWith({ valueMissing: true }, 'requis', anchor);
        expect(fake.setValidity).toHaveBeenLastCalledWith({ valueMissing: true }, 'requis', anchor);
    });

    it('setCustomValidity ajoute customError aux drapeaux du composant et son message prime', async () => {
        el = await fixture<TestArianeFormElement>(
            '<test-ariane-form-element></test-ariane-form-element>',
        );
        el.validateWith({ valueMissing: true }, 'requis');
        el.setCustomValidity('indisponible');
        expect(fake.setValidity).toHaveBeenLastCalledWith(
            { valueMissing: true, customError: true },
            'indisponible',
            undefined,
        );
    });

    it("une nouvelle validation du composant conserve l'erreur personnalisée", async () => {
        el = await fixture<TestArianeFormElement>(
            '<test-ariane-form-element></test-ariane-form-element>',
        );
        el.setCustomValidity('indisponible');
        el.validateWith({}, undefined);
        expect(fake.setValidity).toHaveBeenLastCalledWith(
            { customError: true },
            'indisponible',
            undefined,
        );
    });

    it("setCustomValidity('') retire l'erreur personnalisée et rétablit l'état du composant", async () => {
        el = await fixture<TestArianeFormElement>(
            '<test-ariane-form-element></test-ariane-form-element>',
        );
        el.validateWith({ valueMissing: true }, 'requis');
        el.setCustomValidity('indisponible');
        el.setCustomValidity('');
        expect(fake.setValidity).toHaveBeenLastCalledWith(
            { valueMissing: true },
            'requis',
            undefined,
        );
    });

    it("applique à la connexion une erreur personnalisée posée avant l'attache d'internals", async () => {
        const detached = document.createElement(
            'test-ariane-form-element',
        ) as TestArianeFormElement;
        detached.setCustomValidity('tôt');
        document.body.append(detached);
        el = detached;
        await el.updateComplete;
        expect(fake.setValidity).toHaveBeenLastCalledWith({ customError: true }, 'tôt', undefined);
    });
});
```

et remplacer la classe de test en tête de fichier par :

```ts
class TestArianeFormElement extends ArianeFormElement {
    resetCalls = 0;
    getInternals() {
        return this.internals;
    }
    isEffectivelyDisabled() {
        return this.effectiveDisabled;
    }
    validateWith(flags: ValidityStateFlags, message?: string, anchor?: HTMLElement) {
        this.setComponentValidity(flags, message, anchor);
    }
    protected override formReset(): void {
        this.resetCalls += 1;
    }
}
```

Ajouter `beforeEach` à l'import de `vitest`.

- [ ] **Step 2: Lancer pour voir l'échec**

Run: `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run src/base/ariane-form-element.test.ts 2>&1 | grep -E "Tests |×|Error" | head -14`
Expected: échec de compilation ou des tests (`effectiveDisabled`, `setComponentValidity`, `formReset` inexistants ; les anciens tests restent verts).

- [ ] **Step 3: Implémenter la base**

Remplacer le contenu de `packages/core/src/base/ariane-form-element.ts` par :

```ts
import { property, state } from 'lit/decorators.js';
import { ArianeElement } from './ariane-element.js';

/** `validity` de repli quand `ElementInternals` n'existe pas (happy-dom, avant la connexion). */
const VALID_STATE = Object.freeze({
    badInput: false,
    customError: false,
    patternMismatch: false,
    rangeOverflow: false,
    rangeUnderflow: false,
    stepMismatch: false,
    tooLong: false,
    tooShort: false,
    typeMismatch: false,
    valid: true,
    valueMissing: false,
}) as ValidityState;

/**
 * Base pour un composant participant à un `<form>` natif (ex. `ar-datepicker`). Pose
 * `formAssociated = true`, porte `name`, `disabled` et `required` (réfléchis en attributs, comme un
 * contrôle natif : un contrôle associé n'entre dans `FormData` que par son attribut `name`), la
 * cascade `<fieldset disabled>`, l'API de validation standard déléguée à `ElementInternals`, et la
 * réinitialisation par `form.reset()`.
 *
 * Un composant dérivé signale sa validité avec `setComponentValidity()` (jamais directement avec
 * `internals.setValidity()`, qui écraserait une erreur posée par `setCustomValidity()`), et surcharge
 * `formReset()` pour revenir à sa valeur initiale.
 *
 * @internal
 */
export class ArianeFormElement extends ArianeElement {
    static formAssociated = true;

    /** Identifie le champ dans `FormData`. */
    @property({ reflect: true }) name = '';

    /** Désactive le champ et exclut sa valeur du formulaire. */
    @property({ reflect: true, type: Boolean }) disabled = false;

    /** Active la contrainte de validation native `required`. */
    @property({ reflect: true, type: Boolean }) required = false;

    /**
     * Désactivé par cascade d'un `<fieldset disabled>` ancêtre (`formDisabledCallback`), distinct de
     * `disabled` (posé explicitement par le consommateur) pour ne pas refléter cet état sur
     * l'attribut HTML `disabled` de l'hôte et ne pas perdre l'origine si les deux divergent.
     */
    @state() protected _formDisabled = false;

    private _componentFlags: ValidityStateFlags = {};
    private _componentMessage: string | undefined;
    private _componentAnchor: HTMLElement | undefined;
    private _customMessage = '';

    /** `disabled` explicite ou hérité d'un `<fieldset disabled>` ancêtre. */
    protected get effectiveDisabled(): boolean {
        return this.disabled || this._formDisabled;
    }

    override connectedCallback(): void {
        super.connectedCallback();
        // `internals` n'existe qu'à partir d'ici : applique ce qui a été posé avant la connexion.
        this._applyValidity();
    }

    /**
     * Appelé par le navigateur quand un `<fieldset disabled>` ancêtre change d'état.
     * @internal
     */
    formDisabledCallback(disabled: boolean): void {
        this._formDisabled = disabled;
    }

    /**
     * Appelé par le navigateur sur `form.reset()`.
     * @internal
     */
    formResetCallback(): void {
        this.formReset();
    }

    /** Remet le champ à sa valeur initiale. Sans effet par défaut : à surcharger. */
    protected formReset(): void {}

    // ── API de validation standard (déléguée à ElementInternals) ────────────

    /** État de validité du champ (`ValidityState`). */
    get validity(): ValidityState {
        return this.internals?.validity ?? VALID_STATE;
    }

    /** Message de validité courant, vide si le champ est valide. */
    get validationMessage(): string {
        return this.internals?.validationMessage ?? '';
    }

    /** Vrai si le champ est soumis à la validation (faux s'il est désactivé). */
    get willValidate(): boolean {
        return this.internals?.willValidate ?? false;
    }

    /** Le formulaire propriétaire, ou `null`. */
    get form(): HTMLFormElement | null {
        return this.internals?.form ?? null;
    }

    /** Les `<label>` associés au champ. */
    get labels(): NodeList {
        return this.internals?.labels ?? document.createDocumentFragment().childNodes;
    }

    /** Renvoie `true` si le champ est valide ; émet `invalid` sinon. */
    checkValidity(): boolean {
        return this.internals?.checkValidity() ?? true;
    }

    /** Comme `checkValidity()`, et affiche le message de validation au navigateur. */
    reportValidity(): boolean {
        return this.internals?.reportValidity() ?? true;
    }

    /**
     * Pose une erreur de validation personnalisée (par exemple une erreur de serveur). Elle persiste,
     * comme sur un `<input>` natif, jusqu'à `setCustomValidity('')`, y compris après `form.reset()`
     * et après une nouvelle saisie.
     */
    setCustomValidity(message: string): void {
        this._customMessage = message;
        this._applyValidity();
    }

    /**
     * Signale la validité propre au composant (par exemple `{ valueMissing: true }` avec son message).
     * Fusionné avec l'erreur personnalisée éventuelle. `{}` signifie valide.
     */
    protected setComponentValidity(
        flags: ValidityStateFlags,
        message?: string,
        anchor?: HTMLElement,
    ): void {
        this._componentFlags = flags;
        this._componentMessage = message;
        this._componentAnchor = anchor;
        this._applyValidity();
    }

    private _applyValidity(): void {
        const internals = this.internals;
        if (!internals) return;
        if (this._customMessage) {
            internals.setValidity(
                { ...this._componentFlags, customError: true },
                this._customMessage,
                this._componentAnchor,
            );
        } else {
            internals.setValidity(
                this._componentFlags,
                this._componentMessage,
                this._componentAnchor,
            );
        }
    }
}
```

- [ ] **Step 4: Relancer, typage, lint**

Run: `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run src/base 2>&1 | grep -E "Test Files|Tests |×"; npx tsc --noEmit -p tsconfig.json 2>&1 | tail -5; npx eslint src/base 2>&1 | tail -4`
Expected: tout PASS. Le datepicker ne compile plus (doublons `name`, `disabled`, `required`, `_formDisabled`, `formDisabledCallback`) : c'est l'objet de la Tâche 3 ; si `tsc` ne signale que le datepicker, continuer. Corriger toute autre erreur (en particulier un `@state() protected` ou un `exactOptionalPropertyTypes`).

- [ ] **Step 5: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add packages/core/src/base && git commit -m "feat(core): ArianeFormElement porte les propriétés, la validation et la réinitialisation (#325)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

(Si le hook de commit échoue sur `tsc` à cause du datepicker, enchaîner directement la Tâche 3 et commiter les deux ensemble avec le même message ; noter le choix dans le ledger.)

---

### Task 3: Le datepicker adopte la base et se réinitialise

**Files:**

- Modify: `packages/core/src/components/datepicker/datepicker.ts`
- Modify: `packages/core/src/components/datepicker/datepicker.test.ts`

**Interfaces:**

- Consumes: tout ce que la Tâche 2 produit.

- [ ] **Step 1: Test unitaire de la réinitialisation (rouge)**

Dans `datepicker.test.ts`, ajouter un `describe` (réutiliser les helpers `fixture`, `waitForUpdate` déjà importés) :

```ts
describe('formResetCallback (#325)', () => {
    it('restaure la valeur initiale, remet le texte de saisie et ferme le panneau', async () => {
        el = await fixture('<ar-datepicker value="2026-05-01"></ar-datepicker>');
        await waitForUpdate(el);
        el.value = '2026-06-02';
        el.open = true;
        await waitForUpdate(el);
        el.formResetCallback();
        await waitForUpdate(el);
        expect(el.value).toBe('2026-05-01');
        expect(el.inputElement.value).toBe('01/05/2026');
        expect(el.open).toBe(false);
    });

    it('revient à vide quand il n’y avait pas de valeur initiale', async () => {
        el = await fixture('<ar-datepicker></ar-datepicker>');
        await waitForUpdate(el);
        el.value = '2026-06-02';
        await waitForUpdate(el);
        el.formResetCallback();
        await waitForUpdate(el);
        expect(el.value).toBe('');
        expect(el.inputElement.value).toBe('');
    });

    it('ne change la valeur initiale mémorisée que par le premier rendu', async () => {
        el = await fixture('<ar-datepicker value="2026-05-01"></ar-datepicker>');
        await waitForUpdate(el);
        el.value = '2026-07-07';
        await waitForUpdate(el);
        el.formResetCallback();
        await waitForUpdate(el);
        expect(el.value).toBe('2026-05-01');
    });
});
```

Run: `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run src/components/datepicker/datepicker.test.ts -t "formResetCallback" 2>&1 | grep -E "Tests |×|Error" | head`
Expected: échec (`formResetCallback` redéfini par la base mais sans restauration, car `formReset()` est un no-op), ou erreur de compilation due aux doublons : dans les deux cas, rouge pour la bonne raison.

- [ ] **Step 2: Retirer les doublons et brancher la base**

Dans `datepicker.ts` :

1. Supprimer les déclarations `@property({ reflect: true, type: Boolean }) disabled = false;`, `… required = false;`, `@property() name = '';` (et leurs JSDoc), `@state() private _formDisabled = false;` (avec son commentaire), le getter `private get _effectiveDisabled()` et la méthode `formDisabledCallback`.
2. Remplacer toutes les occurrences de `_effectiveDisabled` par `effectiveDisabled` : `sed -i '' 's/_effectiveDisabled/effectiveDisabled/g' packages/core/src/components/datepicker/datepicker.ts`. Les `changed.has('_formDisabled')` restent valables (la propriété existe sur la base).
3. Ajouter le champ et mémoriser la valeur initiale :

```ts
    /** Valeur au premier rendu : celle que `form.reset()` restaure. */
    private _defaultValue = '';
```

et dans `firstUpdated()`, avant `this._syncFormValue();` :

```ts
this._defaultValue = this.value;
```

4. Remplacer le corps de `_syncFormValue()` par :

```ts
    private _syncFormValue(): void {
        if (this.effectiveDisabled) {
            this.internals?.setFormValue(null);
            this.setComponentValidity({});
            return;
        }
        this.internals?.setFormValue(this.value || null, this.value || null);
        if (this.required && !this.value) {
            this.setComponentValidity(
                { valueMissing: true },
                this.localize.term('validationValueMissing'),
                this._input ?? undefined,
            );
        } else {
            this.setComponentValidity({});
        }
    }
```

5. Ajouter la surcharge du crochet, près de `formDisabledCallback` supprimé :

```ts
    /** Retour à la valeur initiale : valeur, texte de saisie, sélection du calendrier, panneau. */
    protected override formReset(): void {
        const date = this._defaultValue ? parse(this._defaultValue, 'yyyy-MM-dd').date : null;
        this._calendar.selectedDate = date;
        if (date) {
            this._calendar.currentViewMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            this._calendar.focusedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        }
        this.value = this._defaultValue;
        this._syncInputFromValue();
        this.open = false;
        this.requestUpdate();
    }
```

Les JSDoc de `name`, `disabled`, `required` vivent désormais dans la base.

- [ ] **Step 3: Tests unitaires, typage, lint**

Run: `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && cd /Users/jon/Code/Active_projects/ariane/packages/core && npx tsc --noEmit -p tsconfig.json 2>&1 | tail -5; npx eslint src 2>&1 | tail -4; npx vitest run 2>&1 | grep -E "Test Files|Tests |×"`
Expected: `tsc` et `eslint` sans erreur ; toute la suite Vitest PASS, y compris les tests existants du datepicker (critère 5 du spec : aucune assertion modifiée). Si un test existant échoue, corriger le code, pas le test.

- [ ] **Step 4: Tests navigateur (vert)**

Run: `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && cd /Users/jon/Code/Active_projects/ariane/packages/core && ARIANE_BROWSERS=chromium,webkit npx web-test-runner --files "src/components/datepicker/*.browser.test.ts" 2>&1 | grep -E "passed|failed|AssertionError" | tail -6`
Expected: tous PASS sur les deux moteurs, `datepicker.form.browser.test.ts` compris. Un test de réinitialisation qui échoue sur le texte saisi signale un défaut de `_syncInputFromValue` : le diagnostiquer avant de contourner.

- [ ] **Step 5: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add packages/core/src/components/datepicker && git commit -m "feat(core): ar-datepicker hérite de la base de formulaire et se réinitialise (#325)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: CEM, documentation, skill, vérification d'ensemble

**Files:**

- Modify: `apps/docs/src/content/components/ar-datepicker.mdx`
- Modify: `packages/core/scripts/skill/content/ariane/references/choosing-components.md` (et toute référence au datepicker qui liste son API)

- [ ] **Step 1: Mesurer le risque du CEM (membres hérités)**

Run: `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && cd /Users/jon/Code/Active_projects/ariane/packages/core && npm run build:manifest >/dev/null 2>&1 && node -e "
const m=require('./dist/custom-elements.json');
const d=m.modules.flatMap(x=>x.declarations||[]).find(d=>d.tagName==='ar-datepicker');
console.log((d.members||[]).filter(x=>(x.privacy||'public')==='public').map(x=>x.name+(x.inheritedFrom?'(hérité)':'')).join(', '));
"`
Expected : la liste contient `name`, `disabled`, `required` et les nouveaux membres publics (`validity`, `validationMessage`, `willValidate`, `form`, `labels`, `checkValidity`, `reportValidity`, `setCustomValidity`), éventuellement marqués hérités. **Si `name`, `disabled` ou `required` ont disparu** : appliquer la règle de repli du spec : redéclarer ces trois propriétés (avec décorateurs et JSDoc) dans `ArDatepicker`, sans changer le comportement, et le noter dans le ledger. **Si seuls les délégués manquent** : consigner l'écart (ils sont des membres de la base `@internal`), documenter l'API de validation dans la page du composant (étape 2) et signaler le point dans le rapport final.

- [ ] **Step 2: Documenter**

Lire `apps/docs/src/content/components/ar-datepicker.mdx`, repérer la section qui traite des formulaires (`name`, `required`, `FormData`) et y ajouter une sous-section « Formulaires » (ou compléter l'existante) :

```md
### Formulaires

`ar-datepicker` se comporte comme un champ natif :

- `name` identifie le champ dans `FormData`. Il est réfléchi en attribut, donc `<ar-datepicker name="date">` fonctionne aussi quand un framework le pose comme propriété (React 19).
- `form.reset()` ramène le champ à sa valeur initiale, celle du premier rendu, texte de saisie compris. Aucun événement n'est émis.
- L'API de validation standard est disponible sur l'élément : `checkValidity()`, `reportValidity()`, `validity`, `validationMessage`, `willValidate`, `form` et `labels`.
- `setCustomValidity(message)` signale une erreur (par exemple une erreur de serveur). Comme sur un `<input>`, elle persiste jusqu'à `setCustomValidity('')` : à l'application de l'effacer, par exemple à la prochaine saisie. Le slot `error` reste l'affichage du message dans la page ; la validité native sert à la validation du formulaire et à la bulle du navigateur.
```

Dans le skill : `grep -n "ar-datepicker" packages/core/scripts/skill/content/ariane/references/choosing-components.md packages/core/scripts/skill/content/ariane/references/usage.md` ; à chaque endroit qui liste l'API du datepicker, ajouter « `name` (réfléchi), `form.reset()`, API de validation et `setCustomValidity()` » en une phrase, sans dupliquer la doc. Puis `npm run build:manifest && npm run build:skill && npm run check:skill`.

- [ ] **Step 3: Vérification d'ensemble**

Run: `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && cd /Users/jon/Code/Active_projects/ariane && npm run test 2>&1 | grep -E "Tests " && cd packages/core && ARIANE_BROWSERS=chromium,webkit npx web-test-runner 2>&1 | grep -E "test files \| [0-9]+ passed|❌" | tail -3; npx eslint src 2>&1 | tail -2; npx prettier --check src 2>&1 | tail -1; npm run build 2>&1 | grep -E "✓|✗|rror" | tail -5; cd ../.. && npm run build --workspace=apps/docs 2>&1 | tail -2`
Expected: tout PASS, build du paquet et du site OK, `check:cdn` et `check:skill` verts.

- [ ] **Step 4: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add apps/docs packages/core && git commit -m "docs(core): formulaires du datepicker, API de validation et réinitialisation (#325)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Rapport au mainteneur, sans pousser**

Résumer les commits, les résultats, le résultat de la mesure du CEM (étape 1 de cette tâche) et les écarts. **Demander confirmation avant `git push` et avant d'ouvrir la PR** (`Closes #325`, labels `scope:core` et `type:feat`, `status:en-attente-release` sur l'issue, section « Points d'attention » dans la description).
