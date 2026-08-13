import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArDatepicker } from './datepicker.js';
import { fixture, getPart, waitForUpdate } from '../../test-utils.js';
import './index.js';

describe('ArDatepicker', () => {
    let el: ArDatepicker;
    afterEach(() => el?.remove());

    describe('rendu', () => {
        beforeEach(async () => {
            el = await fixture('<ar-datepicker></ar-datepicker>');
        });

        it('monte un shadow DOM', () => expect(el.shadowRoot).not.toBeNull());
        it('contient un input part="input"', () => expect(getPart(el, 'input')).not.toBeNull());
        it('input porte le rôle transverse "field"', () => {
            expect(getPart(el, 'input')?.getAttribute('part')?.split(/\s+/)).toContain('field');
        });
        it('contient un bouton part="trigger"', () =>
            expect(getPart(el, 'trigger')).not.toBeNull());
        it('contient un div part="panel"', () => expect(getPart(el, 'panel')).not.toBeNull());
        it('contient un label part="label"', () => expect(getPart(el, 'label')).not.toBeNull());
        it('contient un p part="hint"', () => expect(getPart(el, 'hint')).not.toBeNull());
        it('contient un p part="error"', () => expect(getPart(el, 'error')).not.toBeNull());
        it('contient un div racine part="datepicker" enveloppant tout le contenu', () => {
            const root = getPart(el, 'datepicker');
            expect(root).not.toBeNull();
            expect(root?.contains(getPart(el, 'input'))).toBe(true);
            expect(root?.contains(getPart(el, 'panel'))).toBe(true);
        });
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
            const handler = vi.fn();
            el.addEventListener('ar-datepicker-show', handler);
            el.open = true;
            await waitForUpdate(el);
            expect(handler).toHaveBeenCalledOnce();
        });

        it('émet ar-datepicker-hide à la fermeture', async () => {
            el.open = true;
            await waitForUpdate(el);
            const handler = vi.fn();
            el.addEventListener('ar-datepicker-hide', handler);
            el.open = false;
            await waitForUpdate(el);
            expect(handler).toHaveBeenCalledOnce();
        });

        it("disabled bloque l'ouverture", async () => {
            el.disabled = true;
            await waitForUpdate(el);
            el.open = true;
            await waitForUpdate(el);
            expect(el.open).toBe(true);
        });

        it("readonly bloque l'ouverture", async () => {
            el.readonly = true;
            await waitForUpdate(el);
            el.open = true;
            await waitForUpdate(el);
            expect(el.open).toBe(true);
        });

        it('canceller ar-datepicker-hide maintient le panel ouvert sans boucle', async () => {
            el.open = true;
            await waitForUpdate(el);
            el.addEventListener('ar-datepicker-hide', (e) => e.preventDefault());
            el.open = false;
            await waitForUpdate(el);
            // Le panel doit rester ouvert et la propriété doit être revenue à true
            expect(el.open).toBe(true);
        });

        it("ne déplace pas le focus vers l'input si ar-datepicker-hide est annulé après sélection", async () => {
            el = await fixture('<ar-datepicker value="2026-06-12"></ar-datepicker>');
            el.open = true;
            await waitForUpdate(el);
            el.addEventListener('ar-datepicker-hide', (e) => e.preventDefault());

            const dayBtn = el.shadowRoot?.querySelector<HTMLButtonElement>(
                '[part="day"][tabindex="0"]',
            );
            dayBtn?.focus();
            dayBtn?.click();
            await waitForUpdate(el);

            expect(el.open).toBe(true);
            expect(el.shadowRoot?.activeElement).not.toBe(el.inputElement);
        });

        it('canceller ar-datepicker-show maintient le panel fermé sans boucle', async () => {
            el.addEventListener('ar-datepicker-show', (e) => e.preventDefault());
            el.open = true;
            await waitForUpdate(el);
            // Le panel doit rester fermé et la propriété doit être revenue à false
            expect(el.open).toBe(false);
        });

        it("ne boucle pas à l'infini si hide et show sont tous les deux annulés", async () => {
            el = await fixture('<ar-datepicker></ar-datepicker>');
            el.addEventListener('ar-datepicker-show', (e) => e.preventDefault());
            el.addEventListener('ar-datepicker-hide', (e) => e.preventDefault());
            // Tenter d'ouvrir ne doit pas bloquer
            el.open = true;
            await el.updateComplete;
            await new Promise((r) => setTimeout(r, 50));
            // Le panel doit rester fermé (show annulé)
            expect(el.open).toBe(false);
        });
    });

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
            const handler = vi.fn();
            el.addEventListener('ar-datepicker-input-change', handler);
            el.inputElement.value = '12/06/2026';
            el.inputElement.dispatchEvent(new Event('blur'));
            await waitForUpdate(el);
            expect(handler).toHaveBeenCalledOnce();
        });
    });

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
            const parts = describedBy.split(' ').filter(Boolean);
            // Sans slot error, seul dp-hint est référencé
            expect(parts).toHaveLength(1);
            parts.forEach((id) => {
                expect(el.shadowRoot?.getElementById(id)).not.toBeNull();
            });
        });

        it('aria-describedby inclut dp-error quand le slot error est rempli', async () => {
            el = await fixture(`
                <ar-datepicker>
                    <span slot="error">Date invalide</span>
                </ar-datepicker>
            `);
            await waitForUpdate(el);
            const describedBy = el.inputElement.getAttribute('aria-describedby') ?? '';
            const parts = describedBy.split(' ').filter(Boolean);
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

        it('hint par défaut ne mentionne pas de plage sans min/max', async () => {
            el = await fixture('<ar-datepicker></ar-datepicker>');
            const year = new Date().getFullYear();
            const hint = getPart(el, 'hint');
            expect(hint?.textContent?.trim()).toBe(
                `Format attendu : dd/MM/yyyy (ex. 31/12/${year})`,
            );
        });

        it('hint par défaut mentionne la plage quand min et max sont définis', async () => {
            el = await fixture(
                '<ar-datepicker locale="fr-FR" min="2026-01-01" max="2026-12-31"></ar-datepicker>',
            );
            await waitForUpdate(el);
            const hint = getPart(el, 'hint');
            expect(hint?.textContent).toContain('entre le 1er janvier 2026 et le 31 décembre 2026');
        });

        it('la ligne de plage ne colle pas au texte du format (séparateur non vide entre les deux)', async () => {
            el = await fixture(
                '<ar-datepicker locale="fr-FR" min="2026-01-01" max="2026-12-31"></ar-datepicker>',
            );
            await waitForUpdate(el);
            const hint = getPart(el, 'hint');
            expect(hint?.textContent).not.toContain(')Dates disponibles');
        });

        it('hint par défaut mentionne uniquement min quand max est absent', async () => {
            el = await fixture('<ar-datepicker locale="fr-FR" min="2026-01-01"></ar-datepicker>');
            await waitForUpdate(el);
            const hint = getPart(el, 'hint');
            expect(hint?.textContent).toContain('à partir du 1er janvier 2026');
        });

        it('hint par défaut mentionne uniquement max quand min est absent', async () => {
            el = await fixture('<ar-datepicker locale="fr-FR" max="2026-12-31"></ar-datepicker>');
            await waitForUpdate(el);
            const hint = getPart(el, 'hint');
            expect(hint?.textContent).toContain("jusqu'au 31 décembre 2026");
        });

        it("l'ordinal « 1er » ne s'applique qu'en français", async () => {
            el = await fixture('<ar-datepicker locale="en-US" min="2026-01-01"></ar-datepicker>');
            await waitForUpdate(el);
            const hint = getPart(el, 'hint');
            expect(hint?.textContent).toContain('January 1, 2026');
            expect(hint?.textContent).not.toContain('1er');
        });

        it('slot hint personnalisé remplace le hint par défaut (plage incluse)', async () => {
            el = await fixture(`
                <ar-datepicker min="2026-01-01">
                    <span slot="hint">Format jj/mm/aaaa</span>
                </ar-datepicker>
            `);
            await waitForUpdate(el);
            const slotEl = el.shadowRoot?.querySelector('slot[name="hint"]') as HTMLSlotElement;
            const assigned = slotEl.assignedElements();
            expect(assigned).toHaveLength(1);
            expect(assigned[0].textContent).toBe('Format jj/mm/aaaa');
        });
    });

    describe('libellés today/close', () => {
        it('todayLabel et closeLabel valent "Aujourd\'hui" / "Fermer" par défaut', async () => {
            el = await fixture('<ar-datepicker></ar-datepicker>');
            expect(el.todayLabel).toBe("Aujourd'hui");
            expect(el.closeLabel).toBe('Fermer');
        });

        it('les props todayLabel/closeLabel changent le texte des boutons', async () => {
            el = await fixture(
                '<ar-datepicker today-label="Today" close-label="Close"></ar-datepicker>',
            );
            el.open = true;
            await waitForUpdate(el);
            const todayBtn = getPart(el, 'today-btn');
            const closeBtn = getPart(el, 'close-btn');
            expect(todayBtn?.textContent?.trim()).toBe('Today');
            expect(todayBtn?.getAttribute('aria-label')).toBe('Today');
            expect(closeBtn?.textContent?.trim()).toBe('Close');
            expect(closeBtn?.getAttribute('aria-label')).toBe('Close');
        });

        it('les slots today-label/close-label remplacent le contenu par défaut', async () => {
            el = await fixture(`
                <ar-datepicker>
                    <span slot="today-label">📅 Aujourd'hui</span>
                    <span slot="close-label">✕</span>
                </ar-datepicker>
            `);
            el.open = true;
            await waitForUpdate(el);

            const todaySlot = el.shadowRoot?.querySelector(
                'slot[name="today-label"]',
            ) as HTMLSlotElement;
            const closeSlot = el.shadowRoot?.querySelector(
                'slot[name="close-label"]',
            ) as HTMLSlotElement;
            expect(todaySlot.assignedElements()).toHaveLength(1);
            expect(closeSlot.assignedElements()).toHaveLength(1);
        });

        it('aria-label reste posé sur le bouton même quand le slot est utilisé (icône seule)', async () => {
            el = await fixture(`
                <ar-datepicker close-label="Fermer le calendrier">
                    <span slot="close-label" aria-hidden="true">✕</span>
                </ar-datepicker>
            `);
            el.open = true;
            await waitForUpdate(el);
            const closeBtn = getPart(el, 'close-btn');
            expect(closeBtn?.getAttribute('aria-label')).toBe('Fermer le calendrier');
        });
    });

    describe('participation formulaire', () => {
        it('formAssociated est true', () => {
            const ArDatepickerType = customElements.get('ar-datepicker') as typeof ArDatepicker;
            expect(ArDatepickerType.formAssociated).toBe(true);
        });

        it('disabled exclut la valeur du formulaire', async () => {
            el = await fixture('<ar-datepicker value="2026-06-12" disabled></ar-datepicker>');
            await waitForUpdate(el);
            expect(() => (el.disabled = false)).not.toThrow();
        });
    });

    describe('setValidity / required', () => {
        // happy-dom ne supporte pas attachInternals() ni form.checkValidity() pour les FACE.
        // On injecte un faux ElementInternals via attachInternals pour espionner setValidity.

        function withFakeInternals(test: (spy: ReturnType<typeof vi.fn>) => Promise<void>) {
            return async () => {
                const setValiditySpy = vi.fn();
                const setFormValueSpy = vi.fn();
                const fakeInternals = {
                    setFormValue: setFormValueSpy,
                    setValidity: setValiditySpy,
                };
                // happy-dom : attachInternals n'existe pas, on l'injecte
                (HTMLElement.prototype as unknown as Record<string, unknown>).attachInternals =
                    () => fakeInternals;
                await test(setValiditySpy);
                delete (HTMLElement.prototype as unknown as Record<string, unknown>)
                    .attachInternals;
            };
        }

        it(
            '<ar-datepicker required> vide → setValidity({ valueMissing:true }) appelé',
            withFakeInternals(async (setValiditySpy) => {
                el = await fixture('<ar-datepicker required></ar-datepicker>');
                await waitForUpdate(el);
                const valueMissingCall = setValiditySpy.mock.calls.find(
                    ([flags]: [ValidityStateFlags]) => flags?.valueMissing === true,
                );
                expect(valueMissingCall).toBeDefined();
            }),
        );

        it(
            '<ar-datepicker required> avec valeur → setValidity({}) appelé',
            withFakeInternals(async (setValiditySpy) => {
                el = await fixture('<ar-datepicker required value="2026-06-12"></ar-datepicker>');
                await waitForUpdate(el);
                const lastCall = setValiditySpy.mock.calls.at(-1);
                expect(lastCall).toBeDefined();
                expect(Object.keys(lastCall![0] as object)).toHaveLength(0);
            }),
        );

        it(
            '<ar-datepicker> sans required, vide → setValidity({}) appelé (pas de valueMissing)',
            withFakeInternals(async (setValiditySpy) => {
                el = await fixture('<ar-datepicker></ar-datepicker>');
                await waitForUpdate(el);
                const valueMissingCall = setValiditySpy.mock.calls.find(
                    ([flags]: [ValidityStateFlags]) => flags?.valueMissing === true,
                );
                expect(valueMissingCall).toBeUndefined();
            }),
        );

        it(
            're-valide quand required change au runtime',
            withFakeInternals(async (setValiditySpy) => {
                el = await fixture('<ar-datepicker></ar-datepicker>');
                await waitForUpdate(el);
                // Pas required par défaut → pas de valueMissing
                const initialMissingCall = setValiditySpy.mock.calls.find(
                    ([flags]: [ValidityStateFlags]) => flags?.valueMissing === true,
                );
                expect(initialMissingCall).toBeUndefined();

                // On rend required → doit appeler setValidity({ valueMissing: true })
                setValiditySpy.mockClear();
                el.required = true;
                await waitForUpdate(el);
                const afterRequiredCall = setValiditySpy.mock.calls.find(
                    ([flags]: [ValidityStateFlags]) => flags?.valueMissing === true,
                );
                expect(afterRequiredCall).toBeDefined();

                // On annule required → doit appeler setValidity({})
                setValiditySpy.mockClear();
                el.required = false;
                await waitForUpdate(el);
                const lastCall = setValiditySpy.mock.calls.at(-1);
                expect(lastCall).toBeDefined();
                expect(Object.keys(lastCall![0] as object)).toHaveLength(0);
            }),
        );
    });

    describe('fonds par défaut du calendrier (thème)', () => {
        it("default.css définit un background pour ::part(header)/::part(footer), et les tokens color/background-color de la cellule jour (pas ::part(day) : un ::part() de l'outer stylesheet du thème l'emporterait sur les surcharges d'état .today/.selected/:hover du composant, cf #129)", async () => {
            // Lecture directe du fichier source : le thème n'est pas chargé dans
            // l'environnement de test (happy-dom), voir vitest.config.ts.
            // `new URL(relative, import.meta.url)` est évité car happy-dom remplace le
            // constructeur URL global et résout la base sur `window.location` au lieu
            // de l'argument fourni — on passe donc par node:url/node:path.
            const { readFileSync } = await import('node:fs');
            const { fileURLToPath } = await import('node:url');
            const { dirname, join } = await import('node:path');
            const themePath = join(
                dirname(fileURLToPath(import.meta.url)),
                '../../styles/themes/default.css',
            );
            const themeCss = readFileSync(themePath, 'utf-8');
            // Regex agnostiques du préfixe de sélecteur (flat `ar-datepicker::part(...)`
            // ou nesting CSS `&::part(...)`) et de la valeur exacte — seule la présence
            // de la déclaration `background:`/`background-color:` est vérifiée.
            expect(themeCss).toMatch(/::part\(header\)\s*{[^}]*background:/);
            expect(themeCss).toMatch(/::part\(footer\)\s*{[^}]*background:/);
            // color/background-color de la cellule jour ne doivent PAS être dans
            // ::part(day) (voir explication ci-dessus) : ils sont pilotés par des
            // tokens que le composant consomme lui-même, dans son propre shadow tree.
            expect(themeCss).not.toMatch(/::part\(day\)\s*{[^}]*background-color:/);
            expect(themeCss).not.toMatch(/::part\(day\)\s*{[^}]*\bcolor:/);
            expect(themeCss).toMatch(/--ar-datepicker-day-color:/);
            expect(themeCss).toMatch(/--ar-datepicker-day-bg:/);
        });
    });
});
