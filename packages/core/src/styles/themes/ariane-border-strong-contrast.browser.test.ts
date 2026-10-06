/// <reference types="mocha" />
/**
 * Épingle le contraste 3:1 (WCAG 1.4.11) de `--ar-color-border-strong` contre les
 * surfaces où il dessine la frontière d'un contrôle, en clair et en sombre, à partir
 * du thème réellement chargé (issue #310).
 */
import { expect } from '@open-wc/testing';
import { contrastRatio } from '../../browser-test-utils.js';

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
