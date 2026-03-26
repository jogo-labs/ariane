import { afterEach, describe, expect, it, vi } from 'vitest';
import { warnDeprecated } from './deprecated.js';

describe('warnDeprecated', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('affiche un warning console la première fois', () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        warnDeprecated('ar-alert', 'links', 'Utilisez des slots.');

        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('ar-alert'));
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('links'));
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('Utilisez des slots.'));
    });

    it("n'affiche le warning qu'une seule fois par paire tag:member", () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        warnDeprecated('ar-breadcrumb', 'dark', 'Message.');
        warnDeprecated('ar-breadcrumb', 'dark', 'Message.');
        warnDeprecated('ar-breadcrumb', 'dark', 'Message.');

        expect(spy).toHaveBeenCalledTimes(1);
    });

    it('affiche des warnings distincts pour des paires tag:member différentes', () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        warnDeprecated('ar-foo', 'prop-a', 'Message A.');
        warnDeprecated('ar-foo', 'prop-b', 'Message B.');

        expect(spy).toHaveBeenCalledTimes(2);
    });
});
