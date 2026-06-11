import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, waitForUpdate, getPart } from '../../test-utils.js';
import type { ArCharcounter } from './charcounter.js';
import './charcounter.js';

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
        it('label vaut "caractère restant|caractères restants"', () =>
            expect(el.label).toBe('caractère restant|caractères restants'));
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

        it('contient part="container"', () => expect(getPart(el, 'container')).not.toBeNull());
        it('contient part="count"', () => expect(getPart(el, 'count')).not.toBeNull());
        it('contient part="remaining"', () => expect(getPart(el, 'remaining')).not.toBeNull());
        it('contient part="label"', () => expect(getPart(el, 'label')).not.toBeNull());
        it('affiche "200 caractères restants" au départ (champ vide)', () => {
            expect(getPart(el, 'remaining')?.textContent?.trim()).toBe('200');
            expect(getPart(el, 'label')?.textContent?.trim()).toBe('caractères restants');
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
            expect(getPart(el, 'container')).toBeNull();
            vi.restoreAllMocks();
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

    // ── Pluralisation du label ────────────────────────────────────────────

    describe('pluralisation du label', () => {
        it('affiche la forme singulier quand remaining = 1', async () => {
            document.body.innerHTML = `<textarea id="f">${'x'.repeat(199)}</textarea>`;
            el = await fixture(
                '<ar-charcounter for="f" max="200" label="caractère restant|caractères restants"></ar-charcounter>',
            );
            expect(getPart(el, 'label')?.textContent?.trim()).toBe('caractère restant');
        });

        it('affiche la forme pluriel quand remaining = 0', async () => {
            document.body.innerHTML = `<textarea id="f">${'x'.repeat(200)}</textarea>`;
            el = await fixture(
                '<ar-charcounter for="f" max="200" label="caractère restant|caractères restants"></ar-charcounter>',
            );
            expect(getPart(el, 'label')?.textContent?.trim()).toBe('caractères restants');
        });

        it('affiche la forme pluriel quand remaining = 5', async () => {
            document.body.innerHTML = `<textarea id="f">${'x'.repeat(195)}</textarea>`;
            el = await fixture(
                '<ar-charcounter for="f" max="200" label="caractère restant|caractères restants"></ar-charcounter>',
            );
            expect(getPart(el, 'label')?.textContent?.trim()).toBe('caractères restants');
        });

        it('affiche la forme singulier quand remaining = -1 (dépassement de 1)', async () => {
            document.body.innerHTML = `<textarea id="f">${'x'.repeat(201)}</textarea>`;
            el = await fixture(
                '<ar-charcounter for="f" max="200" label="caractère restant|caractères restants"></ar-charcounter>',
            );
            expect(getPart(el, 'label')?.textContent?.trim()).toBe('caractère restant');
        });

        it('utilise le label tel quel si pas de pipe (compat descendante)', async () => {
            document.body.innerHTML = '<textarea id="f"></textarea>';
            el = await fixture(
                '<ar-charcounter for="f" max="200" label="restants"></ar-charcounter>',
            );
            expect(getPart(el, 'label')?.textContent?.trim()).toBe('restants');
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
});
