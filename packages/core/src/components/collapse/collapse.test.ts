import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, waitForUpdate, getPart, requirePart } from '../../test-utils.js';
import type { ArCollapse } from './collapse.js';
import './collapse.js';

// happy-dom ne déclenche pas transitionend — prefersReducedMotion=true
// fait passer show/hide dans la branche synchrone.
vi.mock('../../utils/media.js', () => ({ prefersReducedMotion: () => true }));

describe('ArCollapse', () => {
    let el: ArCollapse;

    afterEach(() => {
        el?.remove();
        document.body.innerHTML = '';
    });

    // ── Valeurs par défaut ────────────────────────────────────────────────────

    describe('valeurs par défaut', () => {
        beforeEach(async () => {
            el = await fixture('<ar-collapse></ar-collapse>');
        });

        it('open=false', () => expect(el.open).toBe(false));
        it('for=""', () => expect(el.for).toBe(''));
        it('name=""', () => expect(el.name).toBe(''));
        it('triggerPosition="before"', () => expect(el.triggerPosition).toBe('before'));
        it('disabled=false', () => expect(el.disabled).toBe(false));
    });

    // ── Reflect attributs ─────────────────────────────────────────────────────

    describe('reflect', () => {
        beforeEach(async () => {
            el = await fixture('<ar-collapse></ar-collapse>');
        });

        it('open reflète en attribut', async () => {
            el.show();
            await waitForUpdate(el);
            expect(el.hasAttribute('open')).toBe(true);
        });

        it('for reflète en attribut', async () => {
            el.for = 'btn';
            await waitForUpdate(el);
            expect(el.getAttribute('for')).toBe('btn');
        });

        it('name reflète en attribut', async () => {
            el.name = 'group-a';
            await waitForUpdate(el);
            expect(el.getAttribute('name')).toBe('group-a');
        });

        it('trigger-position reflète en attribut', async () => {
            el.triggerPosition = 'after';
            await waitForUpdate(el);
            expect(el.getAttribute('trigger-position')).toBe('after');
        });

        it('disabled reflète en attribut', async () => {
            el.disabled = true;
            await waitForUpdate(el);
            expect(el.hasAttribute('disabled')).toBe(true);
        });
    });

    // ── Rendu shadow DOM ──────────────────────────────────────────────────────

    describe('rendu shadow DOM', () => {
        beforeEach(async () => {
            el = await fixture('<ar-collapse></ar-collapse>');
        });

        it('contient part="base"', () => expect(getPart(el, 'base')).not.toBeNull());
        it('contient part="trigger-container"', () =>
            expect(getPart(el, 'trigger-container')).not.toBeNull());
        it('contient part="panel"', () => expect(getPart(el, 'panel')).not.toBeNull());
        it('contient part="content"', () => expect(getPart(el, 'content')).not.toBeNull());
        it('panel a hidden au départ', () => {
            expect(requirePart(el, 'panel').hasAttribute('hidden')).toBe(true);
        });
    });

    // ── id auto-généré ─────────────────────────────────────────────────────────

    describe('id auto-généré', () => {
        it('génère un id sur le host si absent', async () => {
            el = await fixture('<ar-collapse></ar-collapse>');
            expect(el.id).toMatch(/^ar-collapse-\d+$/);
        });

        it("ne remplace pas un id fourni par l'auteur", async () => {
            el = await fixture('<ar-collapse id="mon-id"></ar-collapse>');
            expect(el.id).toBe('mon-id');
        });
    });

    // ── show() / hide() ───────────────────────────────────────────────────────

    describe('show() / hide()', () => {
        beforeEach(async () => {
            el = await fixture('<ar-collapse></ar-collapse>');
        });

        it('show() passe open à true', async () => {
            el.show();
            await waitForUpdate(el);
            expect(el.open).toBe(true);
        });

        it('show() retire hidden du panel', async () => {
            el.show();
            await waitForUpdate(el);
            expect(requirePart(el, 'panel').hasAttribute('hidden')).toBe(false);
        });

        it('hide() passe open à false et repose hidden', async () => {
            el.show();
            await waitForUpdate(el);
            el.hide();
            await waitForUpdate(el);
            expect(el.open).toBe(false);
            expect(requirePart(el, 'panel').hasAttribute('hidden')).toBe(true);
        });

        it('show() est no-op si déjà open', async () => {
            el.show();
            await waitForUpdate(el);
            let count = 0;
            el.addEventListener('ar-collapse-show', () => count++);
            el.show();
            await waitForUpdate(el);
            expect(count).toBe(0);
        });

        it('hide() est no-op si déjà fermé', async () => {
            let count = 0;
            el.addEventListener('ar-collapse-hide', () => count++);
            el.hide();
            await waitForUpdate(el);
            expect(count).toBe(0);
        });
    });

    // ── Robustesse animation ──────────────────────────────────────────────────

    describe('robustesse animation', () => {
        it('annuler ar-collapse-show ne verrouille pas le composant', async () => {
            el = await fixture('<ar-collapse><button slot="trigger">T</button></ar-collapse>');
            const cancel = (e: Event) => e.preventDefault();
            el.addEventListener('ar-collapse-show', cancel);
            el.show();
            await waitForUpdate(el);
            expect(el.open).toBe(false);
            el.removeEventListener('ar-collapse-show', cancel);
            // Après annulation, show() doit fonctionner normalement
            el.show();
            await waitForUpdate(el);
            expect(el.open).toBe(true);
        });
    });

    // ── Événements ────────────────────────────────────────────────────────────

    describe('événements', () => {
        beforeEach(async () => {
            el = await fixture('<ar-collapse></ar-collapse>');
        });

        it('show() émet ar-collapse-show puis ar-collapse-shown', async () => {
            const order: string[] = [];
            el.addEventListener('ar-collapse-show', () => order.push('show'));
            el.addEventListener('ar-collapse-shown', () => order.push('shown'));
            el.show();
            await waitForUpdate(el);
            expect(order).toEqual(['show', 'shown']);
        });

        it('hide() émet ar-collapse-hide puis ar-collapse-hidden', async () => {
            el.show();
            await waitForUpdate(el);
            const order: string[] = [];
            el.addEventListener('ar-collapse-hide', () => order.push('hide'));
            el.addEventListener('ar-collapse-hidden', () => order.push('hidden'));
            el.hide();
            await waitForUpdate(el);
            expect(order).toEqual(['hide', 'hidden']);
        });

        it("annuler ar-collapse-show empêche l'ouverture", async () => {
            el.addEventListener('ar-collapse-show', (e) => e.preventDefault());
            el.show();
            await waitForUpdate(el);
            expect(el.open).toBe(false);
        });

        it('annuler ar-collapse-hide empêche la fermeture', async () => {
            el.show();
            await waitForUpdate(el);
            el.addEventListener('ar-collapse-hide', (e) => e.preventDefault());
            el.hide();
            await waitForUpdate(el);
            expect(el.open).toBe(true);
        });
    });

    // ── Trigger interne + ARIA ────────────────────────────────────────────────

    describe('trigger interne (slot)', () => {
        it('pose aria-expanded=false sur le trigger au départ', async () => {
            el = await fixture(`
                <ar-collapse>
                    <button slot="trigger">Toggle</button>
                </ar-collapse>
            `);
            const btn = el.querySelector('button')!;
            await waitForUpdate(el);
            expect(btn.getAttribute('aria-expanded')).toBe('false');
        });

        it("met à jour aria-expanded=true à l'ouverture", async () => {
            el = await fixture(`
                <ar-collapse>
                    <button slot="trigger">Toggle</button>
                </ar-collapse>
            `);
            const btn = el.querySelector('button')!;
            el.show();
            await waitForUpdate(el);
            expect(btn.getAttribute('aria-expanded')).toBe('true');
        });

        it("pose aria-controls pointant vers l'id du host", async () => {
            el = await fixture(`
                <ar-collapse id="my-collapse">
                    <button slot="trigger">Toggle</button>
                </ar-collapse>
            `);
            const btn = el.querySelector('button')!;
            await waitForUpdate(el);
            expect(btn.getAttribute('aria-controls')).toBe('my-collapse');
        });

        it('un clic sur le trigger ouvre le panel', async () => {
            el = await fixture(`
                <ar-collapse>
                    <button slot="trigger">Toggle</button>
                </ar-collapse>
            `);
            await waitForUpdate(el);
            const btn = el.querySelector<HTMLButtonElement>('button')!;
            btn.click();
            await waitForUpdate(el);
            expect(el.open).toBe(true);
        });

        it('un clic sur le trigger ferme le panel si ouvert', async () => {
            el = await fixture(`
                <ar-collapse open>
                    <button slot="trigger">Toggle</button>
                </ar-collapse>
            `);
            await waitForUpdate(el);
            const btn = el.querySelector<HTMLButtonElement>('button')!;
            btn.click();
            await waitForUpdate(el);
            expect(el.open).toBe(false);
        });
    });

    // ── Trigger externe (for) ─────────────────────────────────────────────────

    describe('trigger externe (for)', () => {
        afterEach(() => {
            document.body.innerHTML = '';
        });

        it('pose aria-expanded et aria-controls sur le bouton externe', async () => {
            document.body.innerHTML = '<button id="ext-btn">Toggle</button>';
            el = await fixture('<ar-collapse id="panel-1" for="ext-btn"></ar-collapse>');
            await waitForUpdate(el);
            const btn = document.getElementById('ext-btn')!;
            expect(btn.getAttribute('aria-expanded')).toBe('false');
            expect(btn.getAttribute('aria-controls')).toBe('panel-1');
        });

        it('un clic sur le bouton externe ouvre le panel', async () => {
            document.body.innerHTML = '<button id="ext-btn2">Toggle</button>';
            el = await fixture('<ar-collapse for="ext-btn2"></ar-collapse>');
            document.getElementById('ext-btn2')!.click();
            await waitForUpdate(el);
            expect(el.open).toBe(true);
        });

        it("émet un warn si l'id est introuvable", async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            el = await fixture('<ar-collapse for="inexistant"></ar-collapse>');
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('inexistant'));
            spy.mockRestore();
        });

        it('émet un warn si for et slot trigger sont tous les deux définis', async () => {
            document.body.innerHTML = '<button id="ext-btn3">Btn</button>';
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            el = await fixture(`
                <ar-collapse for="ext-btn3">
                    <button slot="trigger">Slot btn</button>
                </ar-collapse>
            `);
            await waitForUpdate(el);
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('for'));
            spy.mockRestore();
        });

        it('retire aria-controls du trigger externe lors du changement de for', async () => {
            document.body.innerHTML = '<button id="ext-btn4">Btn</button>';
            el = await fixture('<ar-collapse for="ext-btn4"></ar-collapse>');
            const btn = document.getElementById('ext-btn4')!;
            expect(btn.getAttribute('aria-controls')).not.toBeNull();
            el.for = '';
            await waitForUpdate(el);
            expect(btn.getAttribute('aria-controls')).toBeNull();
        });
    });

    // ── Accordéon (name) ──────────────────────────────────────────────────────

    describe('accordéon (name)', () => {
        let el2: ArCollapse;
        let el3: ArCollapse;

        afterEach(() => {
            el2?.remove();
            el3?.remove();
        });

        it('ouvrir un item ferme les autres du même groupe', async () => {
            el = await fixture('<ar-collapse name="faq"></ar-collapse>');
            el2 = await fixture('<ar-collapse name="faq"></ar-collapse>');
            el.show();
            await waitForUpdate(el);
            expect(el.open).toBe(true);
            el2.show();
            await waitForUpdate(el2);
            await waitForUpdate(el);
            expect(el2.open).toBe(true);
            expect(el.open).toBe(false);
        });

        it("ne ferme pas les panels d'un groupe différent", async () => {
            el = await fixture('<ar-collapse name="group-a"></ar-collapse>');
            el2 = await fixture('<ar-collapse name="group-b"></ar-collapse>');
            el.show();
            await waitForUpdate(el);
            el2.show();
            await waitForUpdate(el2);
            expect(el.open).toBe(true);
            expect(el2.open).toBe(true);
        });

        it('sans name, plusieurs panels peuvent être ouverts', async () => {
            el = await fixture('<ar-collapse></ar-collapse>');
            el2 = await fixture('<ar-collapse></ar-collapse>');
            el.show();
            el2.show();
            await waitForUpdate(el);
            await waitForUpdate(el2);
            expect(el.open).toBe(true);
            expect(el2.open).toBe(true);
        });

        it('un name contenant des guillemets ne crash pas', async () => {
            el = await fixture("<ar-collapse name='foo\"]' ></ar-collapse>");
            expect(() => el.show()).not.toThrow();
            await waitForUpdate(el);
        });

        it('deux accordéons indépendants avec le même name ne se contaminent pas', async () => {
            el = await fixture('<ar-collapse name="shared"></ar-collapse>');
            el2 = await fixture('<ar-collapse name="shared"></ar-collapse>');
            el.show();
            await waitForUpdate(el);
            expect(el.open).toBe(true);
            el2.remove();
        });
    });

    // ── disabled ──────────────────────────────────────────────────────────────

    describe('disabled', () => {
        it('show() est no-op quand disabled=true', async () => {
            el = await fixture('<ar-collapse disabled></ar-collapse>');
            el.show();
            await waitForUpdate(el);
            expect(el.open).toBe(false);
        });

        it('pose disabled et aria-disabled sur le trigger interne', async () => {
            el = await fixture(`
                <ar-collapse disabled>
                    <button slot="trigger">Toggle</button>
                </ar-collapse>
            `);
            const btn = el.querySelector('button')!;
            await waitForUpdate(el);
            expect(btn.hasAttribute('disabled')).toBe(true);
            expect(btn.getAttribute('aria-disabled')).toBe('true');
        });

        it('retire disabled et aria-disabled quand disabled passe à false', async () => {
            el = await fixture(`
                <ar-collapse disabled>
                    <button slot="trigger">Toggle</button>
                </ar-collapse>
            `);
            const btn = el.querySelector('button')!;
            el.disabled = false;
            await waitForUpdate(el);
            expect(btn.hasAttribute('disabled')).toBe(false);
            expect(btn.getAttribute('aria-disabled')).toBeNull();
        });

        it("un clic ne déclenche pas l'ouverture quand disabled", async () => {
            el = await fixture(`
                <ar-collapse disabled>
                    <button slot="trigger">Toggle</button>
                </ar-collapse>
            `);
            el.querySelector<HTMLButtonElement>('button')!.click();
            await waitForUpdate(el);
            expect(el.open).toBe(false);
        });

        it('pose aria-disabled sur le bouton externe quand disabled=true', async () => {
            document.body.innerHTML = '<button id="ext-dis">Btn</button>';
            el = await fixture('<ar-collapse for="ext-dis" disabled></ar-collapse>');
            await waitForUpdate(el);
            const btn = document.getElementById('ext-dis')!;
            expect(btn.getAttribute('aria-disabled')).toBe('true');
        });

        it('retire aria-disabled du bouton externe quand disabled repasse à false', async () => {
            document.body.innerHTML = '<button id="ext-dis2">Btn</button>';
            el = await fixture('<ar-collapse for="ext-dis2" disabled></ar-collapse>');
            await waitForUpdate(el);
            el.disabled = false;
            await waitForUpdate(el);
            const btn = document.getElementById('ext-dis2')!;
            expect(btn.getAttribute('aria-disabled')).toBeNull();
        });
    });

    // ── trigger-position ──────────────────────────────────────────────────────

    describe('trigger-position', () => {
        it('trigger-position="before" : trigger avant panel dans le DOM', async () => {
            el = await fixture(`
                <ar-collapse trigger-position="before">
                    <button slot="trigger">T</button>
                </ar-collapse>
            `);
            const base = requirePart(el, 'base');
            const children = Array.from(base.children);
            const triggerIdx = children.findIndex(
                (c) => c.getAttribute('part') === 'trigger-container',
            );
            const panelIdx = children.findIndex((c) => c.getAttribute('part') === 'panel');
            expect(triggerIdx).toBeLessThan(panelIdx);
        });

        it('trigger-position="after" : panel avant trigger dans le DOM', async () => {
            el = await fixture(`
                <ar-collapse trigger-position="after">
                    <button slot="trigger">T</button>
                </ar-collapse>
            `);
            const base = requirePart(el, 'base');
            const children = Array.from(base.children);
            const triggerIdx = children.findIndex(
                (c) => c.getAttribute('part') === 'trigger-container',
            );
            const panelIdx = children.findIndex((c) => c.getAttribute('part') === 'panel');
            expect(panelIdx).toBeLessThan(triggerIdx);
        });
    });
});
