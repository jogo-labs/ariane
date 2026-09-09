/// <reference types="mocha" />
/**
 * Vérifie que `default.css` stylise le bouton/lien slotté dans `ar-dropdown-item` —
 * reset de base, hover et focus-visible (issue #199). `ar-dropdown-item` n'a
 * aucun style interne (`:host { display: contents }`), tout vient du thème,
 * ciblé directement sur le light DOM (`::slotted()` est inatteignable depuis
 * une feuille externe, hors du shadow root propriétaire du slot).
 */
import { fixture, html, expect, aTimeout } from '@open-wc/testing';
import type { ArDropdownItem } from './dropdown-item.js';
import './index.js';

async function loadTheme(): Promise<HTMLLinkElement> {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('../../styles/themes/default.css', import.meta.url).href;
    document.head.appendChild(link);
    await new Promise<void>((resolve) => {
        link.addEventListener('load', () => resolve(), { once: true });
    });
    return link;
}

function* walkRules(rules: CSSRuleList): Generator<CSSRule> {
    for (const rule of rules) {
        yield rule;
        if ('cssRules' in rule) yield* walkRules((rule as CSSGroupingRule).cssRules);
    }
}

// Le CSSOM ne résout pas les sélecteurs imbriqués (`&`) : `selectorText` d'une
// règle imbriquée ne contient que sa portion locale, jamais celle de ses
// ancêtres. On identifie donc l'appartenance à `ar-dropdown-item` en remontant
// `parentRule`, plutôt qu'en cherchant "ar-dropdown-item" dans le texte.
function isNestedUnderDropdownItem(rule: CSSRule): boolean {
    let current: CSSRule | null = rule.parentRule;
    while (current) {
        if (current instanceof CSSStyleRule && current.selectorText === 'ar-dropdown-item') {
            return true;
        }
        current = current.parentRule;
    }
    return false;
}

function findRule(selectorFragment: string): CSSStyleRule | undefined {
    for (const sheet of document.styleSheets) {
        for (const rule of walkRules(sheet.cssRules)) {
            if (
                rule instanceof CSSStyleRule &&
                rule.selectorText.includes(selectorFragment) &&
                isNestedUnderDropdownItem(rule)
            ) {
                return rule;
            }
        }
    }
    return undefined;
}

describe('ar-dropdown-item — thème par défaut (button slotté)', () => {
    let link: HTMLLinkElement;

    before(async () => {
        link = await loadTheme();
    });

    after(() => {
        link.remove();
    });

    it('réinitialise le chrome natif du bouton slotté (largeur pleine, sans bordure)', async () => {
        const el = await fixture<ArDropdownItem>(html`
            <ar-dropdown-item><button>Modifier</button></ar-dropdown-item>
        `);
        const btn = el.querySelector('button') as HTMLButtonElement;
        await aTimeout(0);
        const style = getComputedStyle(btn);
        expect(style.display).to.equal('block');
        expect(style.width).to.not.equal('0px');
        expect(style.borderStyle).to.equal('none');
        expect(style.cursor).to.equal('pointer');
    });

    // :hover/:focus-visible ne peuvent pas être forcés de façon fiable en JS pur
    // (pas de vrai pointeur) — on inspecte les règles CSS elles-mêmes.

    it('consomme --ar-dropdown-item-hover-bg/-color au survol', () => {
        const hoverRule = findRule(':hover');
        expect(hoverRule).to.not.equal(undefined, 'règle :hover introuvable');
        expect(hoverRule?.style.backgroundColor).to.equal('var(--ar-dropdown-item-hover-bg)');
        expect(hoverRule?.style.color).to.equal('var(--ar-dropdown-item-hover-color)');
    });

    it('pose un anneau de focus visible sur :focus-visible', () => {
        const focusRule = findRule(':focus-visible');
        expect(focusRule).to.not.equal(undefined, 'règle :focus-visible introuvable');
        expect(focusRule?.style.outline).to.include('solid');
    });
});
