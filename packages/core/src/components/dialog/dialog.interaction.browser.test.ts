/// <reference types="mocha" />
/**
 * Interactions du dialog avec son contenu, en vrai navigateur : vraie touche Échap (`sendKeys`),
 * clics qui doivent atteindre l'application, annonces exposées sous un dialog modal et retour du
 * focus quand le bouton cliqué n'a pas reçu le focus (Safari).
 */
import { aTimeout, expect, fixture, html } from '@open-wc/testing';
import { sendKeys } from '@web/test-runner-commands';
import { announceA11y } from '../../a11y/announce-a11y.js';
import type { ArDatepicker } from '../datepicker/datepicker.js';
import type { ArDropdown } from '../dropdown/dropdown.js';
import type { ArTooltip } from '../tooltip/tooltip.js';
import type { ArDialog } from './dialog.js';
import '../datepicker/index.js';
import '../dropdown/index.js';
import '../dropdown-item/index.js';
import '../tooltip/index.js';
import './index.js';

const CLOSE_MS = 600;

describe('ar-dialog — interactions', () => {
    describe('Échap avec un popup ouvert dans le dialog', () => {
        it('un dropdown ouvert est fermé par le premier Échap, le dialog par le second', async () => {
            const dialog = await fixture<ArDialog>(html`
                <ar-dialog open label="D">
                    <ar-dropdown>
                        <button slot="trigger" id="dd-trigger">Menu</button>
                        <ar-dropdown-item>Un</ar-dropdown-item>
                    </ar-dropdown>
                </ar-dialog>
            `);
            await aTimeout(300);
            const dropdown = dialog.querySelector<ArDropdown>('ar-dropdown')!;
            dialog.querySelector<HTMLElement>('#dd-trigger')!.click();
            await aTimeout(200);
            expect(dropdown.open).to.equal(true);

            await sendKeys({ press: 'Escape' });
            await aTimeout(100);
            expect(dropdown.open, 'dropdown fermé').to.equal(false);
            expect(dialog.open, 'dialog encore ouvert').to.equal(true);

            await sendKeys({ press: 'Escape' });
            await aTimeout(CLOSE_MS);
            expect(dialog.open, 'dialog fermé par le second Échap').to.equal(false);
        });

        it('un calendrier ouvert est fermé par le premier Échap, le dialog par le second', async () => {
            const dialog = await fixture<ArDialog>(html`
                <ar-dialog open label="D"><ar-datepicker label="Date"></ar-datepicker></ar-dialog>
            `);
            await aTimeout(300);
            const picker = dialog.querySelector<ArDatepicker>('ar-datepicker')!;
            picker.shadowRoot!.querySelector<HTMLElement>('[part="trigger"]')!.click();
            await aTimeout(200);
            expect(picker.open).to.equal(true);

            await sendKeys({ press: 'Escape' });
            await aTimeout(100);
            expect(picker.open, 'calendrier fermé').to.equal(false);
            expect(dialog.open, 'dialog encore ouvert').to.equal(true);

            await sendKeys({ press: 'Escape' });
            await aTimeout(CLOSE_MS);
            expect(dialog.open).to.equal(false);
        });

        it('une info-bulle affichée est fermée par le premier Échap, le dialog par le second', async () => {
            const dialog = await fixture<ArDialog>(html`
                <ar-dialog open label="D">
                    <button id="tt-btn">Aide</button>
                    <ar-tooltip trigger-id="tt-btn" show-delay="0">Texte</ar-tooltip>
                </ar-dialog>
            `);
            await aTimeout(300);
            const tooltip = dialog.querySelector<ArTooltip>('ar-tooltip')!;
            const bubble = tooltip.shadowRoot!.querySelector('[part="tooltip"]')!;
            dialog
                .querySelector<HTMLElement>('#tt-btn')!
                .dispatchEvent(new MouseEvent('mouseenter'));
            await aTimeout(100);
            expect(bubble.matches(':popover-open')).to.equal(true);

            await sendKeys({ press: 'Escape' });
            await aTimeout(100);
            expect(bubble.matches(':popover-open'), 'bulle fermée').to.equal(false);
            expect(dialog.open, 'dialog encore ouvert').to.equal(true);

            await sendKeys({ press: 'Escape' });
            await aTimeout(CLOSE_MS);
            expect(dialog.open).to.equal(false);
        });

        it('sans popup ouvert, Échap ferme le dialog', async () => {
            const dialog = await fixture<ArDialog>(html`
                <ar-dialog open label="D"><button>Ok</button></ar-dialog>
            `);
            await aTimeout(300);
            await sendKeys({ press: 'Escape' });
            await aTimeout(CLOSE_MS);
            expect(dialog.open).to.equal(false);
        });
    });

    describe('clics sur data-ar-accept et data-ar-dismiss', () => {
        it("atteignent le document : l'application peut les écouter", async () => {
            await fixture<ArDialog>(html`
                <ar-dialog open label="D">
                    <button id="cancel-btn" data-ar-dismiss>Annuler</button>
                    <button id="ok-btn" data-ar-accept>Valider</button>
                </ar-dialog>
            `);
            await aTimeout(300);
            const seen: string[] = [];
            const listener = (e: Event): void => {
                const target = e.composedPath()[0] as HTMLElement;
                if (target.id) seen.push(target.id);
            };
            document.addEventListener('click', listener);
            document.getElementById('ok-btn')!.click();
            await aTimeout(CLOSE_MS);
            document.removeEventListener('click', listener);
            expect(seen).to.deep.equal(['ok-btn']);
        });
    });

    describe('annonces sous un dialog modal', () => {
        it("sont écrites dans le dialog tant qu'il est ouvert, puis dans le document", async () => {
            const dialog = await fixture<ArDialog>(html`
                <ar-dialog open label="D"><button>Ok</button></ar-dialog>
            `);
            await aTimeout(300);
            const native = dialog.shadowRoot!.querySelector('dialog')!;
            announceA11y('Dans le dialog', 'polite');
            await aTimeout(120);
            const inside = native.querySelector('[data-ar-live-region="polite"]');
            expect(inside, 'région dans le dialog').to.not.equal(null);
            expect(inside!.textContent).to.equal('Dans le dialog');
            expect(native.matches(':modal')).to.equal(true);

            dialog.open = false;
            await aTimeout(CLOSE_MS);
            expect(native.querySelector('[data-ar-live-region]'), 'régions retirées').to.equal(
                null,
            );
            announceA11y('Dans le document', 'polite');
            await aTimeout(120);
            expect(document.getElementById('ar-live-region-polite')!.textContent).to.equal(
                'Dans le document',
            );
        });
    });

    describe('retour du focus', () => {
        it("revient sur le bouton cliqué même s'il n'a pas reçu le focus (Safari)", async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <div>
                    <button id="opener">Ouvrir</button>
                    <ar-dialog label="D"><button>Ok</button></ar-dialog>
                </div>
            `);
            const dialog = wrapper.querySelector<ArDialog>('ar-dialog')!;
            const opener = wrapper.querySelector<HTMLElement>('#opener')!;
            // Safari ne donne pas le focus au bouton cliqué : on simule le pointeur seul.
            (document.activeElement as HTMLElement | null)?.blur();
            opener.dispatchEvent(
                new PointerEvent('pointerdown', { bubbles: true, composed: true }),
            );
            expect(document.activeElement).to.equal(document.body);
            dialog.open = true;
            await aTimeout(300);
            dialog.open = false;
            await aTimeout(CLOSE_MS);
            expect(document.activeElement).to.equal(opener);
        });
    });
});
