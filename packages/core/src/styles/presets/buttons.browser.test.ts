/// <reference types="mocha" />
/**
 * Vérifie que les classes `.ar-btn-*` de `presets/buttons.css` consomment
 * bien les tokens `--ar-button-*` de `themes/default.css` (issue #200).
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

describe('presets/buttons.css', () => {
    let themeLink: HTMLLinkElement;
    let presetsLink: HTMLLinkElement;
    let container: HTMLDivElement;

    before(async () => {
        themeLink = await loadStylesheet('../themes/default.css');
        presetsLink = await loadStylesheet('./buttons.css');
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

    function makeButton(className: string): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.className = className;
        btn.textContent = 'Test';
        container.appendChild(btn);
        return btn;
    }

    it("n'applique aucune couleur de variante sans classe de variante (border transparente)", () => {
        const btn = makeButton('ar-btn');
        expect(getComputedStyle(btn).borderColor).to.equal('rgba(0, 0, 0, 0)');
    });

    it('ar-btn-primary consomme --ar-button-bg', () => {
        const btn = makeButton('ar-btn ar-btn-primary');
        expect(getComputedStyle(btn).backgroundColor).to.equal('rgb(40, 50, 118)');
    });

    it('ar-btn-secondary consomme --ar-button-secondary-bg', () => {
        const btn = makeButton('ar-btn ar-btn-secondary');
        expect(getComputedStyle(btn).backgroundColor).to.equal('rgb(255, 255, 255)');
    });

    it('ar-btn-danger consomme --ar-button-danger-bg', () => {
        const btn = makeButton('ar-btn ar-btn-danger');
        expect(getComputedStyle(btn).backgroundColor).to.equal('rgb(208, 68, 66)');
    });

    it('ar-btn-tertiary consomme --ar-button-tertiary-bg', () => {
        const btn = makeButton('ar-btn ar-btn-tertiary');
        expect(getComputedStyle(btn).backgroundColor).to.equal('rgba(26, 26, 26, 0.05)');
    });

    it('un bouton disabled applique --ar-button-disabled-bg quelle que soit la variante', () => {
        const btn = makeButton('ar-btn ar-btn-primary');
        btn.disabled = true;
        expect(getComputedStyle(btn).backgroundColor).to.equal('rgb(230, 231, 236)');
    });

    // :hover ne peut pas être forcé de façon fiable en JS pur (pas de vrai pointeur) —
    // on inspecte donc la règle CSS elle-même plutôt que le style calculé.
    function* walkRules(rules: CSSRuleList): Generator<CSSRule> {
        for (const rule of rules) {
            yield rule;
            if ('cssRules' in rule) yield* walkRules((rule as CSSGroupingRule).cssRules);
        }
    }

    function findHoverRule(selectorFragment: string): CSSStyleRule | undefined {
        for (const sheet of document.styleSheets) {
            for (const rule of walkRules(sheet.cssRules)) {
                if (
                    rule instanceof CSSStyleRule &&
                    rule.selectorText.includes(selectorFragment) &&
                    rule.selectorText.includes(':hover')
                ) {
                    return rule;
                }
            }
        }
        return undefined;
    }

    it('ar-btn-secondary:hover repasse le texte en clair (fond gris moyen, sinon illisible)', () => {
        const rule = findHoverRule('.ar-btn-secondary');
        expect(rule).to.not.equal(undefined, 'règle .ar-btn-secondary:hover introuvable');
        expect(rule?.style.color).to.equal('var(--ar-color-white)');
    });
});
