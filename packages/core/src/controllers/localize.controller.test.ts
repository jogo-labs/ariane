import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as LocalizeModule from './localize.controller.js';

type Term = (key: string) => string;

/** Hôte minimal du contrôleur (addController, lang, dir) : pas besoin d'un vrai composant. */
function termFor(controllerModule: typeof LocalizeModule, lang: string): Term {
    const host = { addController() {}, lang, dir: '' } as never;
    const controller = new controllerModule.LocalizeController(host);
    return (key) => (controller as unknown as { term: Term }).term(key);
}

describe('LocalizeController', () => {
    let controllerModule: typeof LocalizeModule;

    beforeEach(async () => {
        vi.resetModules();
        controllerModule = await import('./localize.controller.js');
    });

    it('enregistre les traductions intégrées à son import : un composant localisé n’a rien à importer', () => {
        expect(termFor(controllerModule, 'en')('closeDialog')).toBe('Close dialog');
        expect(termFor(controllerModule, 'fr')('closeDialog')).toBe('Fermer la boîte de dialogue');
    });

    it('l’anglais est la langue de repli : une langue sans traduction s’affiche en anglais', () => {
        expect(termFor(controllerModule, 'de')('closeDialog')).toBe('Close dialog');
    });
});
