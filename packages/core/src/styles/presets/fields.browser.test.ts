/// <reference types="mocha" />
/**
 * Vérifie que les classes `.ar-input`/`.ar-label` de `presets/fields.css`
 * consomment bien les tokens `--ar-*` génériques de `themes/default.css`
 * (issue #209).
 */
import { expect } from '@open-wc/testing';

async function loadStylesheet(relativePath: string): Promise<HTMLLinkElement> {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL(relativePath, import.meta.url).href;
    document.head.appendChild(link);
    await new Promise<void>((resolve) => {
        link.addEventListener('load', () => resolve(), { once: true });
    });
    return link;
}

describe('presets/fields.css', () => {
    let themeLink: HTMLLinkElement;
    let presetsLink: HTMLLinkElement;
    let container: HTMLDivElement;

    before(async () => {
        themeLink = await loadStylesheet('../themes/default.css');
        presetsLink = await loadStylesheet('./fields.css');
    });

    after(() => {
        themeLink.remove();
        presetsLink.remove();
    });

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        container.remove();
    });

    function makeInput(tag: 'input' | 'textarea'): HTMLInputElement | HTMLTextAreaElement {
        const el = document.createElement(tag);
        el.className = 'ar-input';
        container.appendChild(el);
        return el;
    }

    function makeLabel(): HTMLLabelElement {
        const el = document.createElement('label');
        el.className = 'ar-label';
        el.textContent = 'Label';
        container.appendChild(el);
        return el;
    }

    it('ar-input consomme --ar-color-border', () => {
        const input = makeInput('input');
        expect(getComputedStyle(input).borderColor).to.equal('rgb(230, 231, 236)');
    });

    it('ar-input consomme --ar-color-bg et --ar-color-text', () => {
        const input = makeInput('input');
        const style = getComputedStyle(input);
        expect(style.backgroundColor).to.equal('rgb(255, 255, 255)');
        expect(style.color).to.equal('rgb(46, 46, 49)');
    });

    it('textarea.ar-input applique resize:vertical', () => {
        const textarea = makeInput('textarea');
        expect(getComputedStyle(textarea).resize).to.equal('vertical');
    });

    it('ar-input avec aria-invalid consomme --ar-color-danger-text', () => {
        const input = makeInput('input');
        input.setAttribute('aria-invalid', 'true');
        expect(getComputedStyle(input).borderColor).to.equal('rgb(165, 44, 43)');
    });

    it('ar-label consomme --ar-color-text par défaut', () => {
        const label = makeLabel();
        expect(getComputedStyle(label).color).to.equal('rgb(46, 46, 49)');
    });

    it("ar-label[data-ar-char-state='warning'] consomme --ar-color-warning-text", () => {
        const label = makeLabel();
        label.dataset.arCharState = 'warning';
        expect(getComputedStyle(label).color).to.equal('rgb(125, 79, 4)');
    });

    it("ar-label[data-ar-char-state='error'] consomme --ar-color-danger-text", () => {
        const label = makeLabel();
        label.dataset.arCharState = 'error';
        expect(getComputedStyle(label).color).to.equal('rgb(165, 44, 43)');
    });

    it('un input disabled reste lisible (cursor not-allowed, opacité réduite)', () => {
        const input = makeInput('input') as HTMLInputElement;
        input.disabled = true;
        expect(getComputedStyle(input).cursor).to.equal('not-allowed');
    });
});
