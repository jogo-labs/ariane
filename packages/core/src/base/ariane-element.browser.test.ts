/// <reference types="mocha" />
/**
 * ariane-element.browser.test.ts
 *
 * Tests nécessitant un vrai browser (Chromium via @web/test-runner) :
 *   - :state() (ElementInternals.states, non implémenté par happy-dom/Vitest)
 */
import { fixture, expect } from '@open-wc/testing';
import { html } from 'lit';
import { ArianeElement } from './ariane-element.js';
import { LocalizeController } from '../controllers/localize.controller.js';

class TestArianeElementBrowser extends ArianeElement {
    callToggleState(name: string, active: boolean) {
        this.toggleState(name, active);
    }
}
class TestLocalized extends ArianeElement {
    private _localize = new LocalizeController(this);
    protected override render() {
        return html`${this._localize.term('close')}`;
    }
}
if (!customElements.get('test-ariane-localized')) {
    customElements.define('test-ariane-localized', TestLocalized);
}
if (!customElements.get('test-ariane-element-browser')) {
    customElements.define('test-ariane-element-browser', TestArianeElementBrowser);
}

describe('ArianeElement — browser', () => {
    it('toggleState(name, true) rend :state(name) matchable, false le retire', async () => {
        const el = await fixture<TestArianeElementBrowser>(
            '<test-ariane-element-browser></test-ariane-element-browser>',
        );
        expect(el.matches(':state(open)')).to.equal(false);

        el.callToggleState('open', true);
        expect(el.matches(':state(open)')).to.equal(true);

        el.callToggleState('open', false);
        expect(el.matches(':state(open)')).to.equal(false);
    });

    it('deux états sont indépendants', async () => {
        const el = await fixture<TestArianeElementBrowser>(
            '<test-ariane-element-browser></test-ariane-element-browser>',
        );
        el.callToggleState('open', true);
        el.callToggleState('disabled', true);
        expect(el.matches(':state(open)')).to.equal(true);
        expect(el.matches(':state(disabled)')).to.equal(true);

        el.callToggleState('open', false);
        expect(el.matches(':state(open)')).to.equal(false);
        expect(el.matches(':state(disabled)')).to.equal(true);
    });

    describe('lang réactif', () => {
        const text = (el: Element) => el.shadowRoot!.textContent!.trim();
        let htmlLang: string;
        before(() => {
            htmlLang = document.documentElement.lang;
            document.documentElement.lang = 'fr';
        });
        after(() => {
            document.documentElement.lang = htmlLang;
        });

        it("un changement d'attribut lang relance le rendu et la traduction", async () => {
            const el = await fixture<TestLocalized>(
                '<test-ariane-localized lang="fr"></test-ariane-localized>',
            );
            expect(text(el)).to.equal('Fermer');
            el.setAttribute('lang', 'en');
            await el.updateComplete;
            expect(text(el)).to.equal('Close');
        });

        it("assigner la propriété lang écrit l'attribut, comme la propriété native", async () => {
            const el = await fixture<TestLocalized>(
                '<test-ariane-localized></test-ariane-localized>',
            );
            el.lang = 'en';
            await el.updateComplete;
            expect(el.getAttribute('lang')).to.equal('en');
            expect(el.matches(':lang(en)')).to.equal(true);
            expect(text(el)).to.equal('Close');
        });

        it('retirer lang rend la langue du document', async () => {
            const el = await fixture<TestLocalized>(
                '<test-ariane-localized lang="en"></test-ariane-localized>',
            );
            expect(text(el)).to.equal('Close');
            el.removeAttribute('lang');
            await el.updateComplete;
            expect(text(el)).to.equal('Fermer');
        });
    });
});
