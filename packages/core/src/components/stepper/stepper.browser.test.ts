/// <reference types="mocha" />
/**
 * stepper.browser.test.ts
 *
 * Tests nécessitant un vrai browser (Chromium via @web/test-runner) :
 *   - API Popover native (showPopover / hidePopover / :popover-open)
 *   - Chargement initial en mode mobile (régression : attach différé)
 *   - Propriétés CSS logiques (RTL).
 */
import { fixture, html, expect, aTimeout, elementUpdated } from '@open-wc/testing';
import type { ArStepper } from './stepper.js';
import './index.js';
import '../stepper-item/index.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPanel(el: ArStepper): HTMLElement {
    const panel = el.shadowRoot?.querySelector<HTMLElement>('#stepper-dropdown-menu');
    if (!panel) throw new Error('#stepper-dropdown-menu introuvable');
    return panel;
}

function getTrigger(el: ArStepper): HTMLElement {
    const btn = el.shadowRoot?.querySelector<HTMLElement>('[part="trigger"]');
    if (!btn) throw new Error('[part="trigger"] introuvable');
    return btn;
}

async function mobileStepper(): Promise<ArStepper> {
    const el = await fixture<ArStepper>(html`
        <ar-stepper current-path="/step2" desktop-from="9999">
            <ar-stepper-item label="Étape 1" href="/step1"></ar-stepper-item>
            <ar-stepper-item label="Étape 2" href="/step2"></ar-stepper-item>
            <ar-stepper-item label="Étape 3" href="/step3"></ar-stepper-item>
        </ar-stepper>
    `);
    await aTimeout(50);
    return el;
}

// ──────────────────────────────────────────────────────────────────────────────

describe('ar-stepper — browser', () => {
    let el: ArStepper;

    afterEach(() => el?.remove());

    describe('chargement initial en mode mobile', () => {
        it('le panel est attaché dès le premier affichage mobile (régression #attach-initial)', async () => {
            el = await mobileStepper();
            const panel = getPanel(el);
            // Le controller doit avoir posé popover="auto" via attach()
            expect(panel.hasAttribute('popover')).to.equal(true);
        });

        it('le trigger a aria-expanded="false" après attach initial', async () => {
            el = await mobileStepper();
            const trigger = getTrigger(el);
            expect(trigger.getAttribute('aria-expanded')).to.equal('false');
        });

        it('le panel est en :popover-open après un clic sur le trigger', async () => {
            el = await mobileStepper();
            getTrigger(el).click();
            await aTimeout(50);
            expect(getPanel(el).matches(':popover-open')).to.equal(true);
        });

        it('le panel se ferme après un deuxième clic', async () => {
            el = await mobileStepper();
            getTrigger(el).click();
            await aTimeout(50);
            getTrigger(el).click();
            await aTimeout(50);
            expect(getPanel(el).matches(':popover-open')).to.equal(false);
        });

        it('le panel a part="panel"', async () => {
            el = await mobileStepper();
            const panel = el.shadowRoot?.querySelector('[part="panel"]');
            expect(panel).to.not.equal(null);
        });
    });

    // ── Fallback CSS d'accessibilité ─────────────────────────────────────────

    describe('fallback CSS sans thème chargé', () => {
        it('le panel a un fond et une bordure visibles même sans default.css', async () => {
            el = await mobileStepper();
            getTrigger(el).click();
            await aTimeout(50);
            const panel = getPanel(el);
            const computed = getComputedStyle(panel);

            // default.css n'est jamais chargé dans les tests (Vitest ni WTR) : ces
            // valeurs viennent uniquement du fallback système CSS4 posé dans
            // panel.styles.ts, pas d'un thème.
            expect(computed.backgroundColor).to.not.equal('');
            expect(computed.backgroundColor).to.not.equal('rgba(0, 0, 0, 0)');
            expect(computed.borderTopColor).to.not.equal('');
            expect(computed.borderTopColor).to.not.equal('rgba(0, 0, 0, 0)');
            expect(computed.borderTopWidth).to.equal('1px');
        });
    });

    describe('focus après activation (#154)', () => {
        // Vérifie que le focus atterrit sur le nouvel élément data-path courant et que
        // :focus-visible matche après un focus() + click() programmatiques, quand le
        // consommateur répond à ar-stepper-step-change. Ne vérifie PAS l'ordre de
        // tabulation réel ni la distinction clavier/souris — nécessiterait
        // @web/test-runner-commands (sendKeys/sendMouse), non installé, hors scope de ce
        // correctif.
        it('focalise le nouvel élément data-path courant et :focus-visible matche après activation', async () => {
            // desktop-from="0" force le mode desktop : évite le chemin mobile (attach du
            // popover de navigation), qui ré-exécute `void this.updateComplete.then(...)`
            // sur chaque cycle tant que le dropdown n'est pas attaché — un pattern
            // réentrant équivalent à celui corrigé pour le focus (#154), non lié au
            // scénario testé ici. Le forcer en desktop isole le comportement vérifié.
            el = await fixture<ArStepper>(html`
                <ar-stepper current-path="/b" desktop-from="0">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
            await elementUpdated(el);
            await elementUpdated(el);

            el.addEventListener('ar-stepper-step-change', (event: Event) => {
                el.currentPath = (event as CustomEvent<{ path: string }>).detail.path;
            });

            const shadowRoot = el.shadowRoot as ShadowRoot;
            const linkA = shadowRoot.querySelector('a[data-path="/a"]') as HTMLElement;
            linkA.focus();
            linkA.click();
            await elementUpdated(el);

            const newCurrent = shadowRoot.querySelector('[data-path="/a"]') as HTMLElement;
            expect(newCurrent.tagName.toLowerCase()).to.equal('div');
            expect(shadowRoot.activeElement).to.equal(newCurrent);
            expect(newCurrent.matches(':focus-visible')).to.equal(true);
        });
    });

    describe('propriétés logiques par défaut (RTL)', () => {
        async function desktopStepper(dir: 'ltr' | 'rtl' = 'ltr'): Promise<ArStepper> {
            const stepper = await fixture<ArStepper>(html`
                <ar-stepper current-path="/step2" desktop-from="0" dir=${dir}>
                    <ar-stepper-item label="Étape 1" href="/step1">
                        <ar-stepper-item label="Sous-étape 1" href="/step1-1"></ar-stepper-item>
                    </ar-stepper-item>
                    <ar-stepper-item label="Étape 2" href="/step2"></ar-stepper-item>
                </ar-stepper>
            `);
            await aTimeout(50);
            return stepper;
        }

        // Un test purement LTR ne distingue pas margin-inline-end de margin-right (même
        // résultat calculé dans les deux cas) — la comparaison passe par dir="rtl", où seule
        // une propriété logique bascule physiquement de côté.
        it('la puce utilise margin-inline-end : bascule à gauche sous dir="rtl"', async () => {
            el = await desktopStepper('rtl');
            const bullet = el.shadowRoot?.querySelector<HTMLElement>('[part~="bullet"]');
            if (!bullet) throw new Error('[part~="bullet"] introuvable');
            const style = getComputedStyle(bullet);
            expect(style.marginLeft).to.equal('8px');
            expect(style.marginRight).to.equal('0px');
        });

        it('la puce de sous-étape utilise margin-inline-start/end : bascule sous dir="rtl"', async () => {
            el = await desktopStepper('rtl');
            const subBullet = el.shadowRoot?.querySelector<HTMLElement>(
                "[part='substep'] [part~='bullet']",
            );
            if (!subBullet) throw new Error("[part='substep'] [part~='bullet'] introuvable");
            const style = getComputedStyle(subBullet);
            expect(style.marginRight).to.equal('12px');
            expect(style.marginLeft).to.equal('20px');
        });

        // Régression #140 : .list-unstyled (feuille partagée utilities.styles.ts) posait
        // padding-left: 0, une propriété physique qui ne résout pas le padding-inline-start
        // de 40px imposé par l'UA stylesheet sur <ol> sous dir="rtl" (indent fantôme côté
        // start/droite). Le fix passe .list-unstyled en padding-inline-start: 0.
        it('la liste (.list-unstyled) n\'a pas de padding fantôme côté physique gauche sous dir="rtl"', async () => {
            el = await desktopStepper('rtl');
            const list = el.shadowRoot?.querySelector<HTMLElement>('[part="list"]');
            if (!list) throw new Error('[part="list"] introuvable');
            const style = getComputedStyle(list);
            expect(style.paddingLeft).to.equal('0px');
        });
    });

    describe('reverse-align × dir', () => {
        async function desktopStepper(reverseAlign: boolean, dir?: 'rtl'): Promise<ArStepper> {
            const stepper = await fixture<ArStepper>(html`
                <ar-stepper
                    current-path="/step2"
                    desktop-from="0"
                    ?reverse-align=${reverseAlign}
                    dir=${dir ?? 'ltr'}
                >
                    <ar-stepper-item label="Étape 1" href="/step1"></ar-stepper-item>
                    <ar-stepper-item label="Étape 2" href="/step2"></ar-stepper-item>
                </ar-stepper>
            `);
            await aTimeout(50);
            return stepper;
        }

        it('sans reverse-align, en LTR : la puce garde order initial (0)', async () => {
            el = await desktopStepper(false);
            const bullet = el.shadowRoot?.querySelector<HTMLElement>('[part~="bullet"]');
            if (!bullet) throw new Error('[part~="bullet"] introuvable');
            expect(getComputedStyle(bullet).order).to.equal('0');
        });

        it('avec reverse-align, en LTR : la puce passe en fin de ligne (order 2)', async () => {
            el = await desktopStepper(true);
            const bullet = el.shadowRoot?.querySelector<HTMLElement>('[part~="bullet"]');
            if (!bullet) throw new Error('[part~="bullet"] introuvable');
            expect(getComputedStyle(bullet).order).to.equal('2');
        });

        it('avec reverse-align, en RTL : la puce passe aussi en fin de ligne (order 2) — effet composable avec dir', async () => {
            el = await desktopStepper(true, 'rtl');
            const bullet = el.shadowRoot?.querySelector<HTMLElement>('[part~="bullet"]');
            if (!bullet) throw new Error('[part~="bullet"] introuvable');
            expect(getComputedStyle(bullet).order).to.equal('2');
        });

        // `order` est direction-agnostic : ce test ne distinguerait pas une propriété
        // logique d'une propriété physique équivalente. Le bloc :host([reverse-align])
        // pose margin-inline-end: 0 / margin-inline-start: 0.5rem sur la puce — sous
        // dir="rtl", ça doit se résoudre en marginRight (pas marginLeft), l'inverse de ce
        // qu'un margin-left physique aurait donné (qui resterait marginLeft peu importe dir).
        it('avec reverse-align, en RTL : la marge de la puce bascule en physique (marginRight, pas marginLeft)', async () => {
            el = await desktopStepper(true, 'rtl');
            const bullet = el.shadowRoot?.querySelector<HTMLElement>('[part~="bullet"]');
            if (!bullet) throw new Error('[part~="bullet"] introuvable');
            const style = getComputedStyle(bullet);
            expect(style.marginRight).to.equal('8px');
            expect(style.marginLeft).to.equal('0px');
        });
    });
});
