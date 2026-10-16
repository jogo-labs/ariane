import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, waitForUpdate, getPart } from '../../test-utils.js';
import type { ArCharcounter } from './charcounter.js';
import './index.js';

// LocalizeController résout la langue via document.documentElement.lang, avec
// navigator.language comme secours (happy-dom retourne 'en-US' par défaut).
// En production, le site de doc pose lang="fr" sur <html> ; on reproduit ça ici
// pour que les assertions FR par défaut restent valides sans lang explicite.
document.documentElement.lang = 'fr';

describe('ArCharcounter', () => {
    let el: ArCharcounter;
    afterEach(() => {
        el?.remove();
        document.body.innerHTML = '';
    });

    // ── Valeurs par défaut ────────────────────────────────────────────────

    describe('valeurs par défaut', () => {
        beforeEach(async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture('<ar-charcounter for="f" max="200"></ar-charcounter>');
        });

        it('warnThreshold vaut 20', () => expect(el.warnThreshold).toBe(20));
        it('label vaut undefined par défaut (traduit dynamiquement)', () =>
            expect(el.label).toBeUndefined());
        it('state vaut "normal"', () => expect(el.state).toBe('normal'));
        it('state="normal" est réfléchi comme attribut', () =>
            expect(el.getAttribute('state')).toBe('normal'));
    });

    // ── Reflection des attributs ──────────────────────────────────────────

    describe('reflect', () => {
        it('lit warnThreshold depuis warn-threshold', async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture(
                '<ar-charcounter for="f" max="200" warn-threshold="30"></ar-charcounter>',
            );
            expect(el.warnThreshold).toBe(30);
        });

        it("lit label depuis l'attribut", async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture(
                '<ar-charcounter for="f" max="200" label="remaining"></ar-charcounter>',
            );
            expect(el.label).toBe('remaining');
        });
    });

    // ── Rendu shadow DOM ──────────────────────────────────────────────────

    describe('rendu shadow DOM', () => {
        beforeEach(async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture('<ar-charcounter for="f" max="200"></ar-charcounter>');
        });

        it('contient part="charcounter"', () => expect(getPart(el, 'charcounter')).not.toBeNull());
        it('contient part="count"', () => expect(getPart(el, 'count')).not.toBeNull());
        it('contient part="remaining"', () => expect(getPart(el, 'remaining')).not.toBeNull());
        it('contient part="label"', () => expect(getPart(el, 'label')).not.toBeNull());
        it('affiche "200 caractères restants" au départ (champ vide)', () => {
            expect(getPart(el, 'remaining')?.textContent?.trim()).toBe('200');
            expect(getPart(el, 'label')?.textContent).toBe('caractères restants');
        });
    });

    // ── warn() si max absent ──────────────────────────────────────────────

    describe('warn() si max absent', () => {
        it("émet un warn si max n'est pas fourni", async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture('<ar-charcounter for="f"></ar-charcounter>');
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('max'));
            spy.mockRestore();
        });

        it('ne rend rien si max est absent', async () => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture('<ar-charcounter for="f"></ar-charcounter>');
            expect(getPart(el, 'charcounter')).toBeNull();
            vi.restoreAllMocks();
        });
    });

    // ── warn() si warn-threshold invalide ────────────────────────────────

    describe('warn() si warn-threshold invalide', () => {
        it('émet un warn si warn-threshold vaut 0', async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture(
                '<ar-charcounter for="f" max="100" warn-threshold="0"></ar-charcounter>',
            );
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('warn-threshold'));
            spy.mockRestore();
        });

        it('émet un warn si warn-threshold est négatif', async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture(
                '<ar-charcounter for="f" max="100" warn-threshold="-5"></ar-charcounter>',
            );
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('warn-threshold'));
            spy.mockRestore();
        });
    });

    // ── warn() si for absent ou invalide ─────────────────────────────────

    describe('warn() si for absent ou invalide', () => {
        it("émet un warn si for n'est pas fourni", async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            el = await fixture('<ar-charcounter max="100"></ar-charcounter>');
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('for'));
            spy.mockRestore();
        });

        it('émet un warn si for est une chaîne vide', async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            el = await fixture('<ar-charcounter for="" max="100"></ar-charcounter>');
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('for'));
            spy.mockRestore();
        });

        it("émet un warn si l'id est introuvable", async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            el = await fixture('<ar-charcounter for="inexistant" max="100"></ar-charcounter>');
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('inexistant'));
            spy.mockRestore();
        });
    });

    // ── Observation du champ ──────────────────────────────────────────────

    describe('observation du champ', () => {
        it('lit la valeur initiale du champ', async () => {
            document.body.innerHTML = '<textarea id="f">bonjour</textarea>';
            el = await fixture('<ar-charcounter for="f" max="200"></ar-charcounter>');
            expect(getPart(el, 'remaining')?.textContent?.trim()).toBe('193');
        });

        it('pose data-ar-char-state sur un champ prérempli en warning, après le premier rendu', async () => {
            document.body.innerHTML = '<textarea id="f">abcdefghi</textarea>';
            el = await fixture(
                '<ar-charcounter for="f" max="10" warn-threshold="3"></ar-charcounter>',
            );
            await waitForUpdate(el);
            await Promise.resolve();
            await waitForUpdate(el);
            expect(document.getElementById('f')!.getAttribute('data-ar-char-state')).toBe(
                'warning',
            );
        });

        it('met à jour le décompte à chaque event input', async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture('<ar-charcounter for="f" max="200"></ar-charcounter>');
            const field = document.getElementById('f') as HTMLTextAreaElement;
            field.value = 'hello';
            field.dispatchEvent(new Event('input'));
            await waitForUpdate(el);
            expect(getPart(el, 'remaining')?.textContent?.trim()).toBe('195');
        });

        it('retire le listener input au changement de for', async () => {
            document.body.innerHTML = '<textarea id="a"></textarea><textarea id="b"></textarea>';
            el = await fixture('<ar-charcounter for="a" max="100"></ar-charcounter>');
            el.for = 'b';
            await waitForUpdate(el);
            const fieldA = document.getElementById('a') as HTMLTextAreaElement;
            fieldA.value = 'xxx';
            fieldA.dispatchEvent(new Event('input'));
            await waitForUpdate(el);
            expect(getPart(el, 'remaining')?.textContent?.trim()).toBe('100');
        });

        it('observe le nouveau champ après changement de for', async () => {
            document.body.innerHTML = '<textarea id="a"></textarea><textarea id="b">abc</textarea>';
            el = await fixture('<ar-charcounter for="a" max="100"></ar-charcounter>');
            el.for = 'b';
            await waitForUpdate(el);
            expect(getPart(el, 'remaining')?.textContent?.trim()).toBe('97');
        });
    });

    // ── refresh() : valeur posée par programme ───────────────────────────

    describe('refresh()', () => {
        const remaining = () => getPart(el, 'remaining')?.textContent?.trim();
        // Pose la valeur sans passer par le `value` de l'instance (invisible pour le compteur).
        const setSilently = (field: HTMLTextAreaElement, value: string) =>
            Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(
                field,
                value,
            );

        it('relit une valeur posée sans passer par le value du champ', async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture('<ar-charcounter for="f" max="200"></ar-charcounter>');
            setSilently(document.getElementById('f') as HTMLTextAreaElement, 'bonjour');
            await waitForUpdate(el);
            expect(remaining()).toBe('200');
            el.refresh();
            await waitForUpdate(el);
            expect(remaining()).toBe('193');
        });

        it("recalcule l'état et l'annonce comme pour une saisie", async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture(
                '<ar-charcounter for="f" max="10" warn-threshold="3"></ar-charcounter>',
            );
            setSilently(document.getElementById('f') as HTMLTextAreaElement, '12345678');
            el.refresh();
            await waitForUpdate(el);
            expect(el.state).toBe('warning');
        });

        it('se rattache au champ remplacé par le framework (même id)', async () => {
            document.body.innerHTML = '<div><textarea id="f"></textarea></div>';
            el = await fixture('<ar-charcounter id="cc" for="f" max="200"></ar-charcounter>');
            const old = document.getElementById('f') as HTMLTextAreaElement;
            const fresh = document.createElement('textarea');
            fresh.id = 'f';
            fresh.value = 'abc';
            document.querySelector('div')!.replaceChildren(fresh);
            el.refresh();
            await waitForUpdate(el);
            expect(remaining()).toBe('197');
            expect(fresh.getAttribute('aria-describedby')).toBe('cc');
            fresh.value = 'abcdef';
            fresh.dispatchEvent(new Event('input'));
            await waitForUpdate(el);
            expect(remaining()).toBe('194');
            old.value = 'x';
            old.dispatchEvent(new Event('input'));
            await waitForUpdate(el);
            expect(remaining()).toBe('194');
        });

        it("pose data-ar-char-state sur le champ remplacé quand l'état ne change pas", async () => {
            document.body.innerHTML = '<div><textarea id="f">abcdefghi</textarea></div>';
            el = await fixture(
                '<ar-charcounter for="f" max="10" warn-threshold="3"></ar-charcounter>',
            );
            await waitForUpdate(el);
            await Promise.resolve();
            const fresh = document.createElement('textarea');
            fresh.id = 'f';
            fresh.value = 'abcdefghi';
            document.querySelector('div')!.replaceChildren(fresh);
            el.refresh();
            await waitForUpdate(el);
            expect(el.state).toBe('warning');
            expect(fresh.getAttribute('data-ar-char-state')).toBe('warning');
        });

        it('ne ré-annonce pas le dépassement quand le champ est rattaché sans changement', async () => {
            document.body.innerHTML = '<div><textarea id="f">abcdefghij</textarea></div>';
            el = await fixture(
                '<ar-charcounter for="f" max="5" warn-threshold="1"></ar-charcounter>',
            );
            await waitForUpdate(el);
            await new Promise((resolve) => setTimeout(resolve, 400));
            const region = document.getElementById('ar-live-region-assertive')!;
            region.textContent = '';
            const fresh = document.createElement('textarea');
            fresh.id = 'f';
            fresh.value = 'abcdefghij';
            document.querySelector('div')!.replaceChildren(fresh);
            el.refresh();
            await new Promise((resolve) => setTimeout(resolve, 400));
            expect(region.textContent).toBe('');
        });

        it('est sans effet (sans erreur) sur un compteur déconnecté', async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture('<ar-charcounter for="f" max="100"></ar-charcounter>');
            el.remove();
            expect(() => el.refresh()).not.toThrow();
            const detached = document.createElement('ar-charcounter') as ArCharcounter;
            detached.for = 'f';
            expect(() => detached.refresh()).not.toThrow();
            expect(document.getElementById('f')!.hasAttribute('aria-describedby')).toBe(false);
        });

        it('est sans effet sans attribut for', async () => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});
            el = await fixture('<ar-charcounter max="100"></ar-charcounter>');
            expect(() => el.refresh()).not.toThrow();
            vi.restoreAllMocks();
        });
    });

    // ── Champ rendu après le compteur ────────────────────────────────────

    describe('valeur posée par programme', () => {
        const remaining = () => getPart(el, 'remaining')?.textContent?.trim();
        const protoSet = (proto: object) => Object.getOwnPropertyDescriptor(proto, 'value')!.set!;

        it('suit field.value = … sans événement input ni refresh()', async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture('<ar-charcounter for="f" max="200"></ar-charcounter>');
            (document.getElementById('f') as HTMLTextAreaElement).value = 'bonjour';
            await waitForUpdate(el);
            expect(remaining()).toBe('193');
        });

        it('suit aussi un <input>', async () => {
            document.body.innerHTML = '<input id="f" type="text" />';
            el = await fixture('<ar-charcounter for="f" max="200"></ar-charcounter>');
            (document.getElementById('f') as HTMLInputElement).value = 'bonjour';
            await waitForUpdate(el);
            expect(remaining()).toBe('193');
        });

        it("recalcule l'état", async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture(
                '<ar-charcounter for="f" max="10" warn-threshold="3"></ar-charcounter>',
            );
            (document.getElementById('f') as HTMLTextAreaElement).value = '12345678901';
            await waitForUpdate(el);
            expect(el.state).toBe('error');
        });

        it('laisse le champ lire et écrire sa valeur normalement', async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture('<ar-charcounter for="f" max="200"></ar-charcounter>');
            const field = document.getElementById('f') as HTMLTextAreaElement;
            field.value = 'abc';
            expect(field.value).toBe('abc');
            field.value = '';
            expect(field.value).toBe('');
        });

        it("rend le champ intact quand le compteur est retiré, sans plus d'effet", async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture('<ar-charcounter for="f" max="200"></ar-charcounter>');
            const field = document.getElementById('f') as HTMLTextAreaElement;
            el.remove();
            expect(Object.getOwnPropertyDescriptor(field, 'value')).toBeUndefined();
            field.value = 'abc';
            expect(field.value).toBe('abc');
        });

        it('garde et rend le value propre au champ posé par le framework (suivi de React)', async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            const field = document.getElementById('f') as HTMLTextAreaElement;
            const writes: string[] = [];
            const frameworkOwn: PropertyDescriptor = {
                configurable: true,
                get() {
                    return Object.getOwnPropertyDescriptor(
                        HTMLTextAreaElement.prototype,
                        'value',
                    )!.get!.call(this);
                },
                set(v: string) {
                    writes.push(v);
                    protoSet(HTMLTextAreaElement.prototype).call(this, v);
                },
            };
            Object.defineProperty(field, 'value', frameworkOwn);

            el = await fixture('<ar-charcounter for="f" max="200"></ar-charcounter>');
            field.value = 'bonjour';
            await waitForUpdate(el);
            expect(writes).toEqual(['bonjour']);
            expect(remaining()).toBe('193');

            el.remove();
            const restored = Object.getOwnPropertyDescriptor(field, 'value');
            expect(restored?.get).toBe(frameworkOwn.get);
            expect(restored?.set).toBe(frameworkOwn.set);
        });

        it('suit le nouveau champ après un changement de for, et rend le précédent', async () => {
            document.body.innerHTML = '<textarea id="a"></textarea><textarea id="b"></textarea>';
            el = await fixture('<ar-charcounter for="a" max="200"></ar-charcounter>');
            el.setAttribute('for', 'b');
            await waitForUpdate(el);
            await new Promise((r) => setTimeout(r, 0));
            expect(
                Object.getOwnPropertyDescriptor(document.getElementById('a'), 'value'),
            ).toBeUndefined();
            (document.getElementById('b') as HTMLTextAreaElement).value = 'bonjour';
            await waitForUpdate(el);
            expect(remaining()).toBe('193');
        });

        it('suit un champ rendu après le compteur', async () => {
            document.body.innerHTML = '';
            el = await fixture('<ar-charcounter for="late" max="200"></ar-charcounter>');
            const field = document.createElement('textarea');
            field.id = 'late';
            document.body.appendChild(field);
            await new Promise((r) => setTimeout(r, 0));
            field.value = 'bonjour';
            await waitForUpdate(el);
            expect(remaining()).toBe('193');
        });
    });

    describe('champ rendu après le compteur', () => {
        const remaining = () => getPart(el, 'remaining')?.textContent?.trim();
        const insertLate = async (id = 'late', value = 'abcde') => {
            const field = document.createElement('textarea');
            field.id = id;
            field.value = value;
            document.body.appendChild(field);
            await Promise.resolve(); // livraison du MutationObserver
            await waitForUpdate(el);
            return field;
        };

        beforeEach(() => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});
        });
        afterEach(() => {
            vi.restoreAllMocks();
        });

        it("se rattache quand le champ apparaît, avec sa valeur et l'aria-describedby", async () => {
            el = await fixture('<ar-charcounter id="cc" for="late" max="100"></ar-charcounter>');
            const field = await insertLate();
            expect(remaining()).toBe('95');
            expect(field.getAttribute('aria-describedby')).toBe('cc');
        });

        it('suit ensuite la saisie', async () => {
            el = await fixture('<ar-charcounter for="late" max="100"></ar-charcounter>');
            const field = await insertLate();
            field.value = 'abcdefgh';
            field.dispatchEvent(new Event('input'));
            await waitForUpdate(el);
            expect(remaining()).toBe('92');
        });

        it('ne se rattache pas si le compteur a été retiré avant', async () => {
            el = await fixture('<ar-charcounter for="late" max="100"></ar-charcounter>');
            el.remove();
            const field = await insertLate();
            expect(field.hasAttribute('aria-describedby')).toBe(false);
        });

        it("n'attend plus l'ancien champ après un changement de for", async () => {
            el = await fixture('<ar-charcounter for="late" max="100"></ar-charcounter>');
            el.for = 'autre';
            await waitForUpdate(el);
            await Promise.resolve();
            const field = await insertLate();
            expect(field.hasAttribute('aria-describedby')).toBe(false);
        });

        it("n'avertit qu'une fois par valeur de for, puis pour une nouvelle valeur", async () => {
            const spy = vi.spyOn(console, 'warn');
            el = await fixture('<ar-charcounter for="late" max="100"></ar-charcounter>');
            el.refresh();
            el.refresh();
            expect(spy.mock.calls.filter((c) => String(c[0]).includes('"late"'))).toHaveLength(1);
            el.for = 'autre';
            await waitForUpdate(el);
            await Promise.resolve();
            await waitForUpdate(el);
            expect(spy.mock.calls.filter((c) => String(c[0]).includes('"autre"'))).toHaveLength(1);
        });

        it("ne déclenche pas d'avertissement quand le champ existe déjà", async () => {
            const spy = vi.spyOn(console, 'warn');
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture('<ar-charcounter for="f" max="100"></ar-charcounter>');
            el.refresh();
            expect(spy.mock.calls.filter((c) => String(c[0]).includes('"f"'))).toHaveLength(0);
        });
    });

    // ── Pluralisation du label ────────────────────────────────────────────

    describe('pluralisation du label', () => {
        it('affiche la forme singulier quand remaining = 1', async () => {
            document.body.innerHTML = `<textarea id="f">${'x'.repeat(199)}</textarea>`;
            el = await fixture(
                '<ar-charcounter for="f" max="200" label="caractère restant|caractères restants"></ar-charcounter>',
            );
            expect(getPart(el, 'label')?.textContent).toBe('caractère restant');
        });

        it('affiche la forme pluriel quand remaining = 0', async () => {
            document.body.innerHTML = `<textarea id="f">${'x'.repeat(200)}</textarea>`;
            el = await fixture(
                '<ar-charcounter for="f" max="200" label="caractère restant|caractères restants"></ar-charcounter>',
            );
            expect(getPart(el, 'label')?.textContent).toBe('caractères restants');
        });

        it('affiche la forme pluriel quand remaining = 5', async () => {
            document.body.innerHTML = `<textarea id="f">${'x'.repeat(195)}</textarea>`;
            el = await fixture(
                '<ar-charcounter for="f" max="200" label="caractère restant|caractères restants"></ar-charcounter>',
            );
            expect(getPart(el, 'label')?.textContent).toBe('caractères restants');
        });

        it('affiche la forme singulier quand remaining = -1 (dépassement de 1)', async () => {
            document.body.innerHTML = `<textarea id="f">${'x'.repeat(201)}</textarea>`;
            el = await fixture(
                '<ar-charcounter for="f" max="200" label="caractère restant|caractères restants"></ar-charcounter>',
            );
            expect(getPart(el, 'label')?.textContent).toBe('caractère restant');
        });

        it('utilise le label tel quel si pas de pipe (compat descendante)', async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture(
                '<ar-charcounter for="f" max="200" label="restants"></ar-charcounter>',
            );
            expect(getPart(el, 'label')?.textContent).toBe('restants');
        });
    });

    // ── Transitions d'état ────────────────────────────────────────────────

    describe("transitions d'état", () => {
        async function setupWithCount(count: number, max = 200, threshold = 20) {
            document.body.innerHTML = `<textarea id="f">${'x'.repeat(count)}</textarea>`;
            const el = await fixture<ArCharcounter>(
                `<ar-charcounter for="f" max="${max}" warn-threshold="${threshold}"></ar-charcounter>`,
            );
            return el;
        }

        it('state="normal" quand remaining > seuil', async () => {
            el = await setupWithCount(0, 200, 20);
            expect(el.state).toBe('normal');
            expect(el.getAttribute('state')).toBe('normal');
        });

        it('state="warning" quand remaining ≤ seuil (seuil = 20)', async () => {
            el = await setupWithCount(180, 200, 20);
            expect(el.state).toBe('warning');
            expect(el.getAttribute('state')).toBe('warning');
        });

        it('state="warning" exactement au seuil (remaining = 20)', async () => {
            el = await setupWithCount(180, 200, 20);
            expect(el.state).toBe('warning');
        });

        it('state="normal" quand remaining = 21 (juste au-dessus du seuil)', async () => {
            el = await setupWithCount(179, 200, 20);
            expect(el.state).toBe('normal');
        });

        it('state="error" quand remaining < 0', async () => {
            el = await setupWithCount(201, 200, 20);
            expect(el.state).toBe('error');
            expect(el.getAttribute('state')).toBe('error');
        });

        it('émet part="count count--warning" en état warning', async () => {
            el = await setupWithCount(180, 200, 20);
            expect(getPart(el, 'count--warning')).not.toBeNull();
        });

        it('émet part="count count--error" en état error', async () => {
            el = await setupWithCount(201, 200, 20);
            expect(getPart(el, 'count--error')).not.toBeNull();
        });

        it("n'émet ni count--warning ni count--error en état normal", async () => {
            el = await setupWithCount(0, 200, 20);
            expect(getPart(el, 'count--warning')).toBeNull();
            expect(getPart(el, 'count--error')).toBeNull();
        });

        it('affiche remaining négatif en état error', async () => {
            el = await setupWithCount(205, 200, 20);
            expect(getPart(el, 'remaining')?.textContent?.trim()).toBe('-5');
        });

        it('retour à normal depuis error après suppression de texte', async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture(
                '<ar-charcounter for="f" max="10" warn-threshold="3"></ar-charcounter>',
            );
            const field = document.getElementById('f') as HTMLTextAreaElement;
            field.value = 'xxxxxxxxxxxx';
            field.dispatchEvent(new Event('input'));
            await waitForUpdate(el);
            expect(el.state).toBe('error');
            field.value = 'hello';
            field.dispatchEvent(new Event('input'));
            await waitForUpdate(el);
            expect(el.state).toBe('normal');
        });
    });

    // ── Annonces aria-live ────────────────────────────────────────────────

    describe('annonces aria-live', () => {
        afterEach(() => {
            document.querySelectorAll('[data-ar-live-region]').forEach((el) => el.remove());
        });

        it('vide la région assertive lors du passage error → warning', async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture(
                '<ar-charcounter for="f" max="5" warn-threshold="3"></ar-charcounter>',
            );
            const field = document.getElementById('f') as HTMLTextAreaElement;

            field.value = 'xxxxxx';
            field.dispatchEvent(new Event('input'));
            await waitForUpdate(el);
            await new Promise((resolve) => setTimeout(resolve, 60));

            expect(el.state).toBe('error');

            field.value = 'xxxxx';
            field.dispatchEvent(new Event('input'));
            await waitForUpdate(el);

            expect(el.state).toBe('warning');
            const region = document.getElementById('ar-live-region-assertive');
            expect(region?.textContent).toBe('');
        });

        it('annonce le warning avec le label pluralisé (pluriel)', async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture(
                '<ar-charcounter for="f" max="10" warn-threshold="6" label="caractère restant|caractères restants"></ar-charcounter>',
            );
            const field = document.getElementById('f') as HTMLTextAreaElement;
            field.value = 'xxxxx';
            field.dispatchEvent(new Event('input'));
            await waitForUpdate(el);
            await new Promise((resolve) => setTimeout(resolve, 60));

            expect(el.state).toBe('warning');
            const region = document.getElementById('ar-live-region-polite');
            expect(region?.textContent).toBe('5 caractères restants');
        });

        it('annonce le warning avec le label pluralisé (singulier)', async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture(
                '<ar-charcounter for="f" max="10" warn-threshold="5" label="caractère restant|caractères restants"></ar-charcounter>',
            );
            const field = document.getElementById('f') as HTMLTextAreaElement;
            field.value = 'xxxxxxxxx';
            field.dispatchEvent(new Event('input'));
            await waitForUpdate(el);
            await new Promise((resolve) => setTimeout(resolve, 60));

            expect(el.state).toBe('warning');
            const region = document.getElementById('ar-live-region-polite');
            expect(region?.textContent).toBe('1 caractère restant');
        });

        it('annonce le dépassement avec son nombre en pluriel', async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture(
                '<ar-charcounter for="f" max="5" warn-threshold="0"></ar-charcounter>',
            );
            const field = document.getElementById('f') as HTMLTextAreaElement;
            field.value = 'xxxxxxx';
            field.dispatchEvent(new Event('input'));
            await waitForUpdate(el);
            await new Promise((resolve) => setTimeout(resolve, 60));

            expect(el.state).toBe('error');
            const region = document.getElementById('ar-live-region-assertive');
            expect(region?.textContent).toBe('Limite dépassée de 2 caractères');
        });

        it('annonce le dépassement au singulier quand excess = 1', async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture(
                '<ar-charcounter for="f" max="5" warn-threshold="0"></ar-charcounter>',
            );
            const field = document.getElementById('f') as HTMLTextAreaElement;
            field.value = 'xxxxxx';
            field.dispatchEvent(new Event('input'));
            await waitForUpdate(el);
            await new Promise((resolve) => setTimeout(resolve, 60));

            expect(el.state).toBe('error');
            const region = document.getElementById('ar-live-region-assertive');
            expect(region?.textContent).toBe('Limite dépassée de 1 caractère');
        });

        it('ne ré-annonce pas immédiatement en état error lors de frappes rapides (debounce)', async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture(
                '<ar-charcounter for="f" max="5" warn-threshold="1"></ar-charcounter>',
            );
            const field = document.getElementById('f') as HTMLTextAreaElement;

            // Transition normale→error : annonce immédiate (non debounce)
            field.value = 'xxxxxx'; // excess=1
            field.dispatchEvent(new Event('input'));
            await waitForUpdate(el);
            await new Promise((r) => setTimeout(r, 60));

            const region = document.getElementById('ar-live-region-assertive');
            expect(region?.textContent).toBe('Limite dépassée de 1 caractère');

            // Frappes rapides en état error — annonce debounce, pas encore résolue
            field.value = 'xxxxxxxxxx'; // excess=5
            field.dispatchEvent(new Event('input'));
            await waitForUpdate(el);
            await new Promise((r) => setTimeout(r, 60)); // << debounce duration

            // Sans debounce : '...5 caractères' → RED
            // Avec debounce : toujours '...1 caractère' (debounce pas encore résolu)
            expect(region?.textContent).toBe('Limite dépassée de 1 caractère');
        });

        it('vide la région assertive au retour à létat normal depuis error', async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture(
                '<ar-charcounter for="f" max="5" warn-threshold="0"></ar-charcounter>',
            );
            const field = document.getElementById('f') as HTMLTextAreaElement;

            field.value = 'xxxxxx';
            field.dispatchEvent(new Event('input'));
            await waitForUpdate(el);
            await new Promise((resolve) => setTimeout(resolve, 60));

            expect(el.state).toBe('error');

            field.value = 'hi';
            field.dispatchEvent(new Event('input'));
            await waitForUpdate(el);

            expect(el.state).toBe('normal');
            const region = document.getElementById('ar-live-region-assertive');
            expect(region?.textContent).toBe('');
        });
    });

    // ── Cycle de vie / fuites de listener ────────────────────────────────

    describe('cycle de vie', () => {
        it("ne déclenche pas de mutation de l'attribut state s'il ne change pas", async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture('<ar-charcounter for="f" max="100"></ar-charcounter>');

            const mutations: MutationRecord[] = [];
            const observer = new MutationObserver((r) => mutations.push(...r));
            observer.observe(el, { attributes: true, attributeFilter: ['state'] });

            const field = document.getElementById('f') as HTMLTextAreaElement;
            field.value = 'hello'; // reste normal (5 chars < 80 remaining)
            field.dispatchEvent(new Event('input'));
            await waitForUpdate(el);
            await Promise.resolve(); // flush MutationObserver callbacks

            observer.disconnect();

            // Sans fix : setAttribute appelé → mutation enregistrée
            // Avec fix : pas d'appel si valeur identique
            expect(mutations).toHaveLength(0);
        });
    });

    // ── data-ar-char-state sur le champ et le label ───────────────────────

    describe('data-ar-char-state', () => {
        it('pose data-ar-char-state="warning" sur le textarea', async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            const el = await fixture<ArCharcounter>(
                '<ar-charcounter for="f" max="10" warn-threshold="2"></ar-charcounter>',
            );
            const field = document.getElementById('f') as HTMLTextAreaElement;
            field.value = 'xxxxxxxxxx';
            field.dispatchEvent(new Event('input'));
            await waitForUpdate(el);
            expect(field.getAttribute('data-ar-char-state')).toBe('warning');
            el.remove();
        });

        it('pose data-ar-char-state="error" sur le textarea', async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            const el = await fixture<ArCharcounter>(
                '<ar-charcounter for="f" max="5" warn-threshold="1"></ar-charcounter>',
            );
            const field = document.getElementById('f') as HTMLTextAreaElement;
            field.value = 'xxxxxx';
            field.dispatchEvent(new Event('input'));
            await waitForUpdate(el);
            expect(field.getAttribute('data-ar-char-state')).toBe('error');
            el.remove();
        });

        it('retire data-ar-char-state au retour à normal', async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            const el = await fixture<ArCharcounter>(
                '<ar-charcounter for="f" max="5" warn-threshold="1"></ar-charcounter>',
            );
            const field = document.getElementById('f') as HTMLTextAreaElement;
            field.value = 'xxxxxx';
            field.dispatchEvent(new Event('input'));
            await waitForUpdate(el);
            field.value = 'hi';
            field.dispatchEvent(new Event('input'));
            await waitForUpdate(el);
            expect(field.hasAttribute('data-ar-char-state')).toBe(false);
            el.remove();
        });

        it('retire data-ar-char-state au disconnectedCallback', async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            const el = await fixture<ArCharcounter>(
                '<ar-charcounter for="f" max="5" warn-threshold="1"></ar-charcounter>',
            );
            const field = document.getElementById('f') as HTMLTextAreaElement;
            field.value = 'xxxxxx';
            field.dispatchEvent(new Event('input'));
            await waitForUpdate(el);
            el.remove();
            expect(field.hasAttribute('data-ar-char-state')).toBe(false);
        });
    });

    // ── aria-describedby automatique ──────────────────────────────────────

    describe('aria-describedby automatique', () => {
        it("ajoute son id à aria-describedby du champ à l'attache", async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture('<ar-charcounter for="f" max="200"></ar-charcounter>');
            const field = document.getElementById('f') as HTMLTextAreaElement;
            expect(field.getAttribute('aria-describedby')).toContain(el.id);
        });

        it('génère un id si le composant en est dépourvu', async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture('<ar-charcounter for="f" max="200"></ar-charcounter>');
            expect(el.id).toMatch(/^ar-charcounter-\d+$/);
        });

        it('conserve les ids existants dans aria-describedby', async () => {
            document.body.innerHTML = '<textarea id="f" aria-describedby="hint-1"></textarea>';
            el = await fixture(
                '<ar-charcounter id="my-counter" for="f" max="200"></ar-charcounter>',
            );
            const field = document.getElementById('f') as HTMLTextAreaElement;
            const ids = field.getAttribute('aria-describedby')?.split(' ') ?? [];
            expect(ids).toContain('hint-1');
            expect(ids).toContain('my-counter');
        });

        it("ne duplique pas l'id si aria-describedby est déjà présent", async () => {
            document.body.innerHTML = '<textarea id="f" aria-describedby="my-counter"></textarea>';
            el = await fixture(
                '<ar-charcounter id="my-counter" for="f" max="200"></ar-charcounter>',
            );
            const field = document.getElementById('f') as HTMLTextAreaElement;
            const ids = (field.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean);
            expect(ids.filter((i) => i === 'my-counter')).toHaveLength(1);
        });

        it('retire son id de aria-describedby au disconnectedCallback', async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture('<ar-charcounter for="f" max="200"></ar-charcounter>');
            const field = document.getElementById('f') as HTMLTextAreaElement;
            const id = el.id;
            el.remove();
            const desc = field.getAttribute('aria-describedby') ?? '';
            expect(desc).not.toContain(id);
        });

        it('conserve les autres ids lors de la suppression du composant', async () => {
            document.body.innerHTML = '<textarea id="f" aria-describedby="hint-1"></textarea>';
            el = await fixture(
                '<ar-charcounter id="my-counter" for="f" max="200"></ar-charcounter>',
            );
            const field = document.getElementById('f') as HTMLTextAreaElement;
            el.remove();
            expect(field.getAttribute('aria-describedby')).toBe('hint-1');
        });
    });

    // ── Traduction ────────────────────────────────────────────────────────

    describe('traduction', () => {
        it('lang="en" traduit le label et le message de dépassement', async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture('<ar-charcounter for="f" max="5" lang="en"></ar-charcounter>');
            const field = document.getElementById('f') as HTMLTextAreaElement;
            expect(getPart(el, 'label')?.textContent).toBe('characters remaining');

            field.value = '123456';
            field.dispatchEvent(new Event('input'));
            await waitForUpdate(el);
            await new Promise((resolve) => setTimeout(resolve, 350));
            expect(document.getElementById('ar-live-region-assertive')?.textContent).toBe(
                'Limit exceeded by 1 character',
            );
        });

        it('lang="en" traduit l\'annonce warning', async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture(
                '<ar-charcounter for="f" max="10" warn-threshold="5" lang="en"></ar-charcounter>',
            );
            const field = document.getElementById('f') as HTMLTextAreaElement;
            field.value = '123456'; // remaining = 4, <= warnThreshold(5) → état warning
            field.dispatchEvent(new Event('input'));
            await waitForUpdate(el);
            await new Promise((resolve) => setTimeout(resolve, 350));
            expect(document.getElementById('ar-live-region-polite')?.textContent).toBe(
                '4 characters remaining',
            );
        });
    });
});
