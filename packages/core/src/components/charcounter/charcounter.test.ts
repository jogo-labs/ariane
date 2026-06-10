import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, getPart } from '../../test-utils.js';
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
        it('label vaut "restants"', () => expect(el.label).toBe('restants'));
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
        it('affiche "200 restants" au départ (champ vide)', () => {
            expect(getPart(el, 'remaining')?.textContent?.trim()).toBe('200');
            expect(getPart(el, 'label')?.textContent?.trim()).toBe('restants');
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

    // ── warn() si for invalide ────────────────────────────────────────────

    describe('warn() si for invalide', () => {
        it("émet un warn si l'id est introuvable", async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            el = await fixture('<ar-charcounter for="inexistant" max="100"></ar-charcounter>');
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('inexistant'));
            spy.mockRestore();
        });
    });
});
