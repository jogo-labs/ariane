/// <reference types="mocha" />
/**
 * Épingle le contraste 3:1 (WCAG 1.4.11) de `--ar-color-border-strong` contre les
 * surfaces où il dessine la frontière d'un contrôle, en clair et en sombre, à partir
 * du thème réellement chargé (issue #310).
 */
import { expect } from '@open-wc/testing';
import { contrastRatio } from '../../browser-test-utils.js';
import '../../components/datepicker/index.js';
import type { ArDatepicker } from '../../components/datepicker/datepicker.js';

const SURFACES = ['--ar-color-bg', '--ar-input-bg', '--ar-button-secondary-bg'];

async function loadDefaultTheme(): Promise<HTMLLinkElement> {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('./ariane.css', import.meta.url).href;
    document.head.appendChild(link);
    await new Promise<void>((resolve) => {
        link.addEventListener('load', () => resolve(), { once: true });
    });
    return link;
}

function resolveToken(parent: HTMLElement, token: string): string {
    const probe = document.createElement('div');
    probe.style.background = `var(${token})`;
    parent.appendChild(probe);
    return getComputedStyle(probe).backgroundColor;
}

describe('ariane.css — contraste de --ar-color-border-strong', () => {
    let link: HTMLLinkElement;
    let root: HTMLDivElement;

    before(async () => {
        link = await loadDefaultTheme();
    });

    after(() => {
        link.remove();
    });

    beforeEach(() => {
        root = document.createElement('div');
        document.body.appendChild(root);
    });

    afterEach(() => {
        root.remove();
    });

    for (const theme of ['light', 'dark']) {
        for (const surface of SURFACES) {
            it(`atteint 3:1 contre ${surface} en thème ${theme}`, () => {
                const scope = document.createElement('div');
                scope.setAttribute('data-theme', theme);
                root.appendChild(scope);

                const border = resolveToken(scope, '--ar-color-border-strong');
                const bg = resolveToken(scope, surface);
                expect(contrastRatio(border, bg)).to.be.at.least(3);
            });
        }
    }
});

describe('ariane.css — bordures de survol et de champ inactif', () => {
    let link: HTMLLinkElement;
    let root: HTMLDivElement;

    before(async () => {
        link = await loadDefaultTheme();
    });

    after(() => {
        link.remove();
    });

    beforeEach(() => {
        root = document.createElement('div');
        document.body.appendChild(root);
    });

    afterEach(() => {
        root.remove();
    });

    function scopeFor(theme: string): HTMLDivElement {
        const scope = document.createElement('div');
        scope.setAttribute('data-theme', theme);
        root.appendChild(scope);
        return scope;
    }

    for (const theme of ['light', 'dark']) {
        it(`la bordure de survol secondaire est nettement plus contrastée que celle au repos (${theme})`, () => {
            // Mesuré en clair : repos 3,4:1, survol 13,7:1 (neutral-20) ; avec neutral-40, écart 3,2.
            const scope = scopeFor(theme);
            const bg = resolveToken(scope, '--ar-color-bg');
            const rest = contrastRatio(resolveToken(scope, '--ar-color-border-strong'), bg);
            const hover = contrastRatio(
                resolveToken(scope, '--ar-button-secondary-border-hover'),
                bg,
            );
            expect(hover).to.be.at.least(rest + 4);
        });

        it(`la bordure de champ inactif suit le bouton désactivé, pas la bordure forte (${theme})`, () => {
            const scope = scopeFor(theme);
            const inactive = resolveToken(scope, '--ar-input-inactive-border-color');
            expect(inactive).to.equal(resolveToken(scope, '--ar-button-disabled-border'));
            expect(inactive).not.to.equal(resolveToken(scope, '--ar-color-border-strong'));
        });
    }

    for (const state of ['readonly', 'disabled'] as const) {
        it(`ar-datepicker : la bordure du champ ${state} s'aligne sur celle du trigger désactivé`, async () => {
            const el = document.createElement('ar-datepicker') as ArDatepicker;
            el[state] = true;
            root.appendChild(el);
            await el.updateComplete;
            const input = el.shadowRoot!.querySelector<HTMLInputElement>('[part~="input"]')!;
            const trigger = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="trigger"]')!;
            expect(trigger.disabled).to.equal(true);
            const inputBorder = getComputedStyle(input).borderTopColor;
            expect(inputBorder).to.equal(getComputedStyle(trigger).borderTopColor);
            expect(inputBorder).not.to.equal(resolveToken(root, '--ar-color-border-strong'));
        });
    }
});

describe('contrastRatio (helper)', () => {
    it('calcule les bornes et une paire connue', () => {
        expect(contrastRatio('#000000', '#ffffff')).to.be.closeTo(21, 0.001);
        expect(contrastRatio('#ffffff', '#ffffff')).to.equal(1);
        // #767676 sur blanc : 4,54:1 (seuil AA classique)
        expect(contrastRatio('#767676', '#ffffff')).to.be.closeTo(4.54, 0.01);
    });

    it('refuse une couleur non opaque', () => {
        expect(() => contrastRatio('rgba(0, 0, 0, 0.5)', '#ffffff')).to.throw();
    });
});
