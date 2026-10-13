import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as LocalizeModule from '../controllers/localize.controller.js';
import type * as RegisterModule from './register-translation.js';

type Term = (key: string) => string;
type ControllerModule = typeof LocalizeModule;

/** Hôte minimal du contrôleur (addController, lang, dir) : pas besoin d'un vrai composant. */
function termFor(controllerModule: ControllerModule, lang: string): Term {
    const host = { addController() {}, lang, dir: '' } as never;
    const controller = new controllerModule.LocalizeController(host);
    return (key) => (controller as unknown as { term: Term }).term(key);
}

describe('registerTranslation (enrobage de /utils)', () => {
    let register: typeof RegisterModule.registerTranslation;
    let controllerModule: ControllerModule;

    beforeEach(async () => {
        vi.resetModules();
        ({ registerTranslation: register } = await import('./register-translation.js'));
        controllerModule = await import('../controllers/localize.controller.js');
    });

    it('fr est le repli complet même si une autre langue est enregistrée en premier', () => {
        register({ $code: 'es', $name: 'Español', $dir: 'ltr', closeAlert: 'Cerrar' });

        expect(termFor(controllerModule, 'de')('closeDialog')).toBe('Fermer la boîte de dialogue');
        expect(termFor(controllerModule, 'es')('closeAlert')).toBe('Cerrar');
        expect(termFor(controllerModule, 'es')('closeDialog')).toBe('Fermer la boîte de dialogue');
    });

    it('une surcharge partielle de fr enregistrée avant les composants est conservée', async () => {
        register({
            $code: 'fr',
            $name: 'Français',
            $dir: 'ltr',
            closeAlert: 'Fermer ce bandeau',
        });
        // Les composants importent fr.ts : le module déjà évalué ne ré-enregistre rien.
        await import('../translations/fr.js');
        await import('../translations/en.js');

        const term = termFor(controllerModule, 'fr');
        expect(term('closeAlert')).toBe('Fermer ce bandeau');
        expect(term('closeDialog')).toBe('Fermer la boîte de dialogue');
    });

    it('une surcharge partielle de en enregistrée avant les composants est conservée', async () => {
        register({ $code: 'en', $name: 'English', $dir: 'ltr', closeAlert: 'Dismiss this banner' });
        await import('../translations/fr.js');
        await import('../translations/en.js');

        const term = termFor(controllerModule, 'en');
        expect(term('closeAlert')).toBe('Dismiss this banner');
        expect(term('closeDialog')).toBe('Close dialog');
    });

    it('une variante régionale ne remplace que sa région', () => {
        register({
            $code: 'fr-CA',
            $name: 'Français (Canada)',
            $dir: 'ltr',
            closeAlert: 'Fermer (CA)',
        });

        expect(termFor(controllerModule, 'fr-CA')('closeAlert')).toBe('Fermer (CA)');
        expect(termFor(controllerModule, 'fr-FR')('closeAlert')).toBe("Fermer l'alerte");
    });

    it('en reste disponible une fois les composants chargés', async () => {
        await import('../translations/en.js');

        expect(termFor(controllerModule, 'en')('closeAlert')).toBe('Close alert');
    });
});
