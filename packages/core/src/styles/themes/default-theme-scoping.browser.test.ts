/// <reference types="mocha" />
/**
 * Vérifie que `data-theme="dark"`/`data-theme="light"` scope les tokens `--ar-*`
 * de `default.css` au sous-arbre du conteneur qui le porte, pas seulement à `:root`
 * (issue #203).
 */
import { expect } from '@open-wc/testing';

const WHITE_RGB = 'rgb(255, 255, 255)';
const NEUTRAL_10_RGB = 'rgb(23, 23, 23)';

async function loadDefaultTheme(): Promise<HTMLLinkElement> {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('./default.css', import.meta.url).href;
    document.head.appendChild(link);
    await new Promise<void>((resolve) => {
        link.addEventListener('load', () => resolve(), { once: true });
    });
    return link;
}

function probeBackground(parent: HTMLElement): string {
    const probe = document.createElement('div');
    probe.style.background = 'var(--ar-color-bg)';
    parent.appendChild(probe);
    return getComputedStyle(probe).backgroundColor;
}

describe('default.css — scoping de data-theme par bloc', () => {
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

    it('applique le thème sombre à un conteneur non-racine (pas seulement :root)', () => {
        const dark = document.createElement('div');
        dark.setAttribute('data-theme', 'dark');
        root.appendChild(dark);

        expect(probeBackground(dark)).to.equal(NEUTRAL_10_RGB);
    });

    it("permet de forcer le thème clair dans un sous-arbre d'un ancêtre en dark", () => {
        const dark = document.createElement('div');
        dark.setAttribute('data-theme', 'dark');
        root.appendChild(dark);

        const light = document.createElement('div');
        light.setAttribute('data-theme', 'light');
        dark.appendChild(light);

        expect(probeBackground(dark)).to.equal(NEUTRAL_10_RGB);
        expect(probeBackground(light)).to.equal(WHITE_RGB);
    });

    it('un conteneur sans data-theme reste au thème clair par défaut', () => {
        expect(probeBackground(root)).to.equal(WHITE_RGB);
    });
});
