/// <reference types="mocha" />
/**
 * Vérifie que les classes `.ar-btn-*` de `presets/buttons.css` consomment
 * bien les tokens `--ar-button-*` de `themes/ariane.css` (issue #200).
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
        themeLink = await loadStylesheet('../themes/ariane.css');
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

    it('ar-btn-primary consomme --ar-button-primary-bg', () => {
        const btn = makeButton('ar-btn ar-btn-primary');
        expect(getComputedStyle(btn).backgroundColor).to.equal('oklch(0.8016 0.1705 73.27)');
    });

    it('ar-btn-secondary consomme --ar-button-secondary-bg', () => {
        const btn = makeButton('ar-btn ar-btn-secondary');
        expect(getComputedStyle(btn).backgroundColor).to.equal('oklch(1 0 0)');
    });

    it('ar-btn-danger consomme --ar-button-danger-bg', () => {
        const btn = makeButton('ar-btn ar-btn-danger');
        expect(getComputedStyle(btn).backgroundColor).to.equal('oklch(0.5851 0.177 25.15)');
    });

    it('ar-btn-tertiary consomme --ar-button-tertiary-bg', () => {
        const btn = makeButton('ar-btn ar-btn-tertiary');
        expect(getComputedStyle(btn).backgroundColor).to.equal('rgba(26, 26, 26, 0.05)');
    });

    it('un bouton disabled applique --ar-button-disabled-bg quelle que soit la variante', () => {
        const btn = makeButton('ar-btn ar-btn-primary');
        btn.disabled = true;
        expect(getComputedStyle(btn).backgroundColor).to.equal('oklch(0.9286 0.002 90)');
    });

    // :hover ne peut pas être forcé de façon fiable en JS pur (pas de vrai pointeur) —
    // on inspecte donc la règle CSS elle-même plutôt que le style calculé. Avec le CSS
    // nesting natif (`&:hover { ... }`), le selectorText de la règle imbriquée ne
    // contient que le fragment relatif ("&:not(...):hover"), pas le sélecteur parent —
    // on localise donc d'abord la règle parente exacte (selectorFragment), puis on
    // cherche ":hover" uniquement parmi ses propres enfants imbriqués.
    function* walkRules(rules: CSSRuleList): Generator<CSSRule> {
        for (const rule of rules) {
            yield rule;
            if ('cssRules' in rule) yield* walkRules((rule as CSSGroupingRule).cssRules);
        }
    }

    function findHoverRule(selectorFragment: string): CSSStyleRule | undefined {
        for (const sheet of document.styleSheets) {
            for (const rule of walkRules(sheet.cssRules)) {
                if (rule instanceof CSSStyleRule && rule.selectorText === selectorFragment) {
                    for (const child of rule.cssRules ?? []) {
                        if (
                            child instanceof CSSStyleRule &&
                            child.selectorText.includes(':hover')
                        ) {
                            return child;
                        }
                    }
                }
            }
        }
        return undefined;
    }

    it("ar-btn-secondary:hover garde le texte neutre (fond pâle --ar-color-bg-subtle, pas besoin d'inverser la couleur)", () => {
        const rule = findHoverRule('.ar-btn-secondary');
        expect(rule).to.not.equal(undefined, 'règle .ar-btn-secondary:hover introuvable');
        expect(rule?.style.color).to.equal('');
    });
});
