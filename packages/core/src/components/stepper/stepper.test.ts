import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ArStepper } from './stepper.js';
import type { ArStepperStepChangeDetail } from './stepper.js';
import { fixture, waitForUpdate } from '../../test-utils.js';
import './index.js';
import '../stepper-item/index.js';

// LocalizeController résout la langue via document.documentElement.lang, avec
// navigator.language comme secours (happy-dom retourne 'en-US' par défaut).
// En production, le site de doc pose lang="fr" sur <html> ; on reproduit ça ici
// pour que les assertions FR par défaut restent valides sans lang explicite.
document.documentElement.lang = 'fr';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Retourne le shadowRoot ou lance une erreur de test. */
function shadow(el: Element): ShadowRoot {
    if (!el.shadowRoot) throw new Error(`No shadowRoot on <${el.tagName.toLowerCase()}>`);
    return el.shadowRoot;
}

function requireQuery<T extends Element>(root: ParentNode, selector: string): T {
    const el = root.querySelector<T>(selector);
    if (!el) throw new Error(`Missing element for selector: ${selector}`);
    return el;
}

/** Monte un stepper avec des items. Attend deux updateComplete pour absorber queueMicrotask. */
async function fixtureWithItems(html: string): Promise<ArStepper> {
    const el = await fixture<ArStepper>(html);
    // Premier cycle : registration des items via context
    await waitForUpdate(el);
    // Second cycle : déclenché par rebuildTree() via queueMicrotask
    await waitForUpdate(el);
    return el;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ArStepper', () => {
    afterEach(() => {
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    // ── Rendu de base ─────────────────────────────────────────────────────────

    describe('rendu', () => {
        it('monte un shadow DOM', async () => {
            const el = await fixture<ArStepper>('<ar-stepper></ar-stepper>');
            expect(el.shadowRoot).not.toBeNull();
        });

        it('rend un slot transparent si aucun item', async () => {
            const el = await fixture<ArStepper>('<ar-stepper></ar-stepper>');
            expect(shadow(el).querySelector('slot')).not.toBeNull();
            expect(shadow(el).querySelector('nav')).toBeNull();
        });

        it('rend un <nav> avec part="stepper" quand les items sont enregistrés', async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/a">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
            expect(shadow(el).querySelector('[part="stepper"]')).not.toBeNull();
        });

        it('step-link porte aussi le rôle transverse "control"', async () => {
            // mode="edit" est requis pour que le renderer produise un vrai <a part="step-link ...">
            // (sans ce mode, la garde de stepper.renderer.ts rend un simple <div>, sans part testable).
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" mode="edit">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
            const link = shadow(el).querySelector('a[part~="step-link"]');
            expect(link?.getAttribute('part')?.split(/\s+/)).toContain('control');
        });

        it('bullet porte aussi le rôle transverse "indicator"', async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/a">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
            const bullet = shadow(el).querySelector('[part~="bullet"]');
            expect(bullet?.getAttribute('part')?.split(/\s+/)).toContain('indicator');
        });

        it('rend part="list" sur la liste des étapes', async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/a">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
            expect(shadow(el).querySelector('[part="list"]')).not.toBeNull();
        });

        it('rend part="step" sur un item de premier niveau et part="substep" sur une sous-étape', async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/a/1">
                    <ar-stepper-item path="/a" label="Étape A">
                        <ar-stepper-item path="/a/1" label="Sous-étape 1"></ar-stepper-item>
                        <ar-stepper-item path="/a/2" label="Sous-étape 2"></ar-stepper-item>
                    </ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
            const topLevel = shadow(el).querySelectorAll('[part="list"] > li[part="step"]');
            expect(topLevel.length).toBeGreaterThan(0);
            const nested = shadow(el).querySelectorAll('[part="list"] li[part="substep"]');
            expect(nested.length).toBe(2);
            // Vérifie que la sous-liste imbriquée porte bien part="list list--substep"
            const nestedList = shadow(el).querySelector('li[part="step"] > [part~="list"]');
            expect(nestedList?.getAttribute('part')).toBe('list list--substep');
        });

        it('rend part="step-link" sur le lien d\'une étape complétée, jamais sur une étape non cliquable', async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" mode="edit">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
            const link = shadow(el).querySelector('a[part~="step-link"]');
            // En mode edit, isGroupCurrent() rend "isCurrent" toujours vrai pour un step top-level
            // (tous les groupes sont navigables) : le lien porte donc aussi le part d'état
            // step-link--current — cf. le test dédié plus bas pour la variante "non courante".
            expect(link?.getAttribute('part')).toContain('step-link');
            const currentItemInner = shadow(el).querySelector('div.item-header');
            expect(currentItemInner?.hasAttribute('part')).toBe(false);
        });

        it('rend part="bullet" sur la puce de chaque étape', async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/a">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
            expect(shadow(el).querySelector('[part~="bullet"]')).not.toBeNull();
        });

        it('rend le part d\'état "bullet--current" uniquement sur la puce de l\'étape courante', async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/a">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
            const steps = shadow(el).querySelectorAll('[part="list"] > li[part="step"]');
            expect(steps.length).toBe(2);

            const bulletA = requireQuery<HTMLElement>(steps[0]!, '[part~="bullet"]');
            expect(bulletA.getAttribute('part')).toBe('bullet indicator bullet--current');

            const bulletB = requireQuery<HTMLElement>(steps[1]!, '[part~="bullet"]');
            expect(bulletB.getAttribute('part')).toBe('bullet indicator');
        });

        it('rend le part d\'état "step-link--current" sur le lien de la sous-étape courante en mode edit', async () => {
            // Au niveau top-level, isGroupCurrent() rend "isCurrent" toujours vrai en mode edit
            // (tous les groupes sont navigables) : impossible d'y observer un lien "courant" vs
            // "non courant" côte à côte. Au niveau sous-étape, sub.state === 'current' est un
            // état littéral par sous-étape : c'est le seul niveau où deux liens rendus
            // simultanément peuvent différer sur ce part d'état — exactement le scénario visé
            // par le correctif (plusieurs liens courants simultanément en mode edit).
            const el = await fixtureWithItems(`
                        <ar-stepper current-path="/a/2" mode="edit">
                            <ar-stepper-item path="/a" label="Étape A">
                                <ar-stepper-item path="/a/1" label="Sous-étape 1"></ar-stepper-item>
                                <ar-stepper-item path="/a/2" label="Sous-étape 2"></ar-stepper-item>
                            </ar-stepper-item>
                        </ar-stepper>
                    `);
            const links = shadow(el).querySelectorAll('li[part~="substep"] a[part~="step-link"]');
            expect(links.length).toBe(2);

            const link1 = [...links].find((l) => l.getAttribute('data-path') === '/a/1');
            const link2 = [...links].find((l) => l.getAttribute('data-path') === '/a/2');
            expect(link1?.getAttribute('part')).toBe('step-link control');
            expect(link2?.getAttribute('part')).toBe('step-link control step-link--current');
        });

        it('rend le part d\'état "bullet--current" sur la puce d\'une sous-étape courante', async () => {
            const el = await fixtureWithItems(`
                        <ar-stepper current-path="/a/1">
                            <ar-stepper-item path="/a" label="Étape A">
                                <ar-stepper-item path="/a/1" label="Sous-étape 1"></ar-stepper-item>
                                <ar-stepper-item path="/a/2" label="Sous-étape 2"></ar-stepper-item>
                            </ar-stepper-item>
                        </ar-stepper>
                    `);
            const substepBullets = shadow(el).querySelectorAll(
                'li[part~="substep"] [part~="bullet"]',
            );
            expect(substepBullets.length).toBe(2);
            const [bullet1, bullet2] = substepBullets;
            expect(bullet1?.getAttribute('part')).toBe('bullet indicator bullet--current');
            expect(bullet2?.getAttribute('part')).toBe('bullet indicator');
        });
    });

    // ── Propriétés ────────────────────────────────────────────────────────────

    describe('propriétés', () => {
        it('currentPath par défaut vaut ""', async () => {
            const el = await fixture<ArStepper>('<ar-stepper></ar-stepper>');
            expect(el.currentPath).toBe('');
        });

        it('mode par défaut vaut "create"', async () => {
            const el = await fixture<ArStepper>('<ar-stepper></ar-stepper>');
            expect(el.mode).toBe('create');
        });

        it('followScroll par défaut vaut false', async () => {
            const el = await fixture<ArStepper>('<ar-stepper></ar-stepper>');
            expect(el.followScroll).toBe(false);
        });

        it("version n'est plus une propriété du composant", async () => {
            const el = await fixture<ArStepper>('<ar-stepper></ar-stepper>');
            expect('version' in el).toBe(false);
        });

        it('lit les attributs depuis le HTML', async () => {
            const el = await fixture<ArStepper>(
                '<ar-stepper current-path="/b" mode="edit" follow-scroll></ar-stepper>',
            );
            expect(el.currentPath).toBe('/b');
            expect(el.mode).toBe('edit');
            expect(el.followScroll).toBe(true);
        });
    });

    // ── Enregistrement des items ──────────────────────────────────────────────

    describe('enregistrement des items', () => {
        it("construit l'arbre depuis les items enfants", async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/a">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                    <ar-stepper-item path="/c" label="Étape C"></ar-stepper-item>
                </ar-stepper>
            `);
            const items = shadow(el).querySelectorAll('li.item');
            expect(items.length).toBe(3);
        });

        it('gère les sous-étapes imbriquées', async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/a/1">
                    <ar-stepper-item path="/a" label="Étape A">
                        <ar-stepper-item path="/a/1" label="Sous-étape 1"></ar-stepper-item>
                        <ar-stepper-item path="/a/2" label="Sous-étape 2"></ar-stepper-item>
                    </ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
            const nav = shadow(el).querySelector('nav');
            expect(nav).not.toBeNull();
        });
    });

    // ── Événements ───────────────────────────────────────────────────────────

    describe('événements', () => {
        it('émet ar-stepper-step-change au clic sur un lien, avec { from, to }', async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" mode="edit">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);

            const handler = vi.fn();
            el.addEventListener('ar-stepper-step-change', handler);

            const link = requireQuery<HTMLAnchorElement>(shadow(el), 'a[data-path="/a"]');
            link.click();

            expect(handler).toHaveBeenCalledOnce();
            const event = handler.mock.calls[0][0] as CustomEvent<ArStepperStepChangeDetail>;
            expect(event.detail).toEqual({ from: '/b', to: '/a' });

            el.removeEventListener('ar-stepper-step-change', handler);
        });

        it('ar-stepper-step-change est cancelable', async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" mode="edit">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
            const handler = vi.fn();
            el.addEventListener('ar-stepper-step-change', handler);

            const link = requireQuery<HTMLAnchorElement>(shadow(el), 'a[data-path="/a"]');
            link.click();

            expect(handler).toHaveBeenCalledOnce();
            const event = handler.mock.calls[0][0] as CustomEvent;
            expect(event.cancelable).toBe(true);
        });

        it('preventDefault() sur ar-stepper-step-change bloque toute suite : currentPath inchangé, focus reste sur le lien cliqué', async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" mode="edit">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
            el.addEventListener('ar-stepper-step-change', (e) => e.preventDefault());
            const changedHandler = vi.fn();
            el.addEventListener('ar-stepper-step-changed', changedHandler);

            const link = requireQuery<HTMLAnchorElement>(shadow(el), 'a[data-path="/a"]');
            link.focus();
            link.click();
            await waitForUpdate(el);

            expect(el.currentPath).toBe('/b');
            expect(changedHandler).not.toHaveBeenCalled();
            expect(shadow(el).activeElement).toBe(link);
        });

        it("preventDefault() sur ar-stepper-step-change bloque aussi la navigation native quand l'étape a un href réel", async () => {
            // Contrat documenté (JSDoc @event) : preventDefault() bloque la navigation, sans
            // qualification sur la présence d'un href réel. Un href réel (ex: "#etape-2-1",
            // utilisé par la doc pour les sous-étapes) doit donc aussi voir son comportement
            // natif d'ancre bloqué quand le consommateur annule l'event.
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" mode="edit">
                    <ar-stepper-item path="/a" href="#etape-2-1" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
            el.addEventListener('ar-stepper-step-change', (e) => e.preventDefault());

            const link = requireQuery<HTMLAnchorElement>(shadow(el), 'a[data-path="/a"]');
            const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
            link.dispatchEvent(clickEvent);

            expect(clickEvent.defaultPrevented).toBe(true);
            expect(el.currentPath).toBe('/b');
        });

        it("n'émet plus step-changed (nom court) au clic", async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" mode="edit">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);

            const handler = vi.fn();
            el.addEventListener('step-changed', handler);

            const link = shadow(el).querySelector<HTMLAnchorElement>('a[part~="step-link"]');
            if (link) {
                link.click();
                expect(handler).not.toHaveBeenCalled();
            }

            el.removeEventListener('step-changed', handler);
        });
    });

    describe('événement ar-stepper-step-changed', () => {
        it("n'est pas émis tant que currentPath n'a pas réellement changé", async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" mode="edit">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
            const handler = vi.fn();
            el.addEventListener('ar-stepper-step-changed', handler);

            const link = requireQuery<HTMLAnchorElement>(shadow(el), 'a[data-path="/a"]');
            link.click();
            await waitForUpdate(el);

            expect(handler).not.toHaveBeenCalled();
        });

        it('est émis avec { from, to }, non cancelable, quand currentPath change (réassignation externe)', async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" mode="edit">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
            const handler = vi.fn();
            el.addEventListener('ar-stepper-step-changed', handler);

            el.currentPath = '/a';
            await waitForUpdate(el);

            expect(handler).toHaveBeenCalledOnce();
            const event = handler.mock.calls[0][0] as CustomEvent<ArStepperStepChangeDetail>;
            expect(event.cancelable).toBe(false);
            expect(event.detail).toEqual({ from: '/b', to: '/a' });
        });

        it("n'est pas émis au premier rendu", async () => {
            // Le listener est attaché sur document AVANT le montage : l'event bubble
            // (bubbles: true, composed: true) donc si le garde-fou _hasRenderedOnce était
            // absent, l'émission aurait lieu pendant fixtureWithItems() et serait captée ici.
            const handler = vi.fn();
            document.addEventListener('ar-stepper-step-changed', handler);

            try {
                await fixtureWithItems(`
                    <ar-stepper current-path="/b" mode="edit">
                        <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                        <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                    </ar-stepper>
                `);

                expect(handler).not.toHaveBeenCalled();
            } finally {
                document.removeEventListener('ar-stepper-step-changed', handler);
            }
        });
    });

    describe('navigation — preventDefault sur les liens sans href réel', () => {
        it("appelle preventDefault() au clic sur un lien d'étape (empêche le scroll-to-top natif)", async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" mode="edit">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);

            const link = shadow(el).querySelector<HTMLAnchorElement>('a[part~="step-link"]');
            expect(link).not.toBeNull();
            const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
            const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');

            link!.dispatchEvent(clickEvent);

            expect(preventDefaultSpy).toHaveBeenCalledOnce();
        });

        it("appelle preventDefault() quand href vaut explicitement '#' (convention documentée)", async () => {
            // La doc (ar-stepper.mdx) pose systématiquement href="#" plutôt que de l'omettre —
            // ce cas doit être traité comme décoratif au même titre qu'un href absent.
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" mode="edit">
                    <ar-stepper-item path="/a" href="#" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);

            const link = shadow(el).querySelector<HTMLAnchorElement>('a[part~="step-link"]');
            expect(link).not.toBeNull();
            const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
            const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');

            link!.dispatchEvent(clickEvent);

            expect(preventDefaultSpy).toHaveBeenCalledOnce();
        });

        it("n'appelle pas preventDefault() quand l'étape a un href réel fourni par le consommateur", async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" mode="edit">
                    <ar-stepper-item path="/a" href="/etape-a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);

            const link = shadow(el).querySelector<HTMLAnchorElement>('a[part~="step-link"]');
            expect(link).not.toBeNull();
            const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
            const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');

            link!.dispatchEvent(clickEvent);

            expect(preventDefaultSpy).not.toHaveBeenCalled();
        });
    });

    // ── Mise à jour de currentPath ─────────────────────────────────────────────

    describe('mise à jour de currentPath', () => {
        it("met à jour l'état courant quand currentPath change", async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/a">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);

            el.currentPath = '/b';
            await waitForUpdate(el);

            const items = shadow(el).querySelectorAll('li.item');
            expect(items[0]?.classList.contains('current')).toBe(false);
            expect(items[1]?.classList.contains('current')).toBe(true);
        });
    });

    // ── Focus après activation (#154) ───────────────────────────────────────

    describe("focus après activation d'un lien", () => {
        it("porte data-path sur le <div> de remplacement de l'étape courante", async () => {
            const el = await fixtureWithItems(`
                    <ar-stepper current-path="/b">
                        <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                        <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                    </ar-stepper>
                `);

            const currentHeader = requireQuery<HTMLDivElement>(
                shadow(el),
                'li.item.current > .item-header',
            );
            expect(currentHeader.tagName.toLowerCase()).toBe('div');
            expect(currentHeader.getAttribute('data-path')).toBe('/b');
        });

        it("focalise le <div> de l'étape cliquée quand le consommateur répond en mettant à jour currentPath", async () => {
            const el = await fixtureWithItems(`
                    <ar-stepper current-path="/b">
                        <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                        <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                    </ar-stepper>
                `);

            const linkA = requireQuery<HTMLAnchorElement>(shadow(el), 'a[data-path="/a"]');
            linkA.click();

            // Le composant est contrôlé : le consommateur répond à l'event en réassignant
            // currentPath (pattern déjà utilisé par les tests existants du fichier).
            el.currentPath = '/a';
            await waitForUpdate(el);

            const newCurrentHeader = shadow(el).querySelector<HTMLDivElement>('[data-path="/a"]');
            expect(newCurrentHeader?.tagName.toLowerCase()).toBe('div');
            expect(shadow(el).activeElement).toBe(newCurrentHeader);
            expect(newCurrentHeader?.getAttribute('tabindex')).toBe('-1');
        });

        it('ne vole pas le focus si currentPath change sans rapport avec le dernier clic (ex. scroll-follow)', async () => {
            const el = await fixtureWithItems(`
                    <ar-stepper current-path="/a" follow-scroll>
                        <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                        <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                    </ar-stepper>
                `);

            // Simule un changement de currentPath déclenché par le scroll-follow, sans clic
            // préalable sur aucun lien.
            el.currentPath = '/b';
            await waitForUpdate(el);

            expect(shadow(el).activeElement).not.toBe(shadow(el).querySelector('[data-path="/b"]'));
        });

        it("n'affecte plus le focus au cycle de rendu suivant un clic (fenêtre bornée à un seul cycle)", async () => {
            const el = await fixtureWithItems(`
                    <ar-stepper current-path="/c">
                        <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                        <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                        <ar-stepper-item path="/c" label="Étape C"></ar-stepper-item>
                    </ar-stepper>
                `);

            const linkA = requireQuery<HTMLAnchorElement>(shadow(el), 'a[data-path="/a"]');
            linkA.click();

            // Le consommateur ignore l'event (currentPath ne change pas tout de suite) puis,
            // un cycle plus tard, une cause sans rapport (scroll-follow) amène sur /a.
            await waitForUpdate(el);
            el.currentPath = '/a';
            await waitForUpdate(el);

            expect(shadow(el).activeElement).not.toBe(shadow(el).querySelector('[data-path="/a"]'));
        });

        it('focalise le <div> de la SOUS-étape cliquée, pas celui du step parent (les deux deviennent .item.current simultanément via isGroupCurrent())', async () => {
            const el = await fixtureWithItems(`
                    <ar-stepper current-path="/a/2">
                        <ar-stepper-item path="/a" label="Étape A">
                            <ar-stepper-item path="/a/1" label="Sous-étape 1"></ar-stepper-item>
                            <ar-stepper-item path="/a/2" label="Sous-étape 2"></ar-stepper-item>
                        </ar-stepper-item>
                        <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                    </ar-stepper>
                `);

            // /a/1 est complétée (avant la sous-étape courante /a/2) : rendue comme lien cliquable.
            const linkSub1 = requireQuery<HTMLAnchorElement>(shadow(el), 'a[data-path="/a/1"]');
            linkSub1.click();

            // Le consommateur répond en mettant à jour currentPath vers la sous-étape cliquée.
            el.currentPath = '/a/1';
            await waitForUpdate(el);

            // isGroupCurrent() fait que le step parent /a ET la sous-étape /a/1 sont
            // simultanément .item.current — un sélecteur par classe seule matcherait les deux.
            const currentItems = shadow(el).querySelectorAll('li.item.current');
            expect(currentItems.length).toBe(2);

            const subStepHeader = shadow(el).querySelector<HTMLDivElement>('[data-path="/a/1"]');
            expect(subStepHeader?.tagName.toLowerCase()).toBe('div');
            expect(shadow(el).activeElement).toBe(subStepHeader);

            const parentHeader = shadow(el).querySelector<HTMLDivElement>('[data-path="/a"]');
            expect(shadow(el).activeElement).not.toBe(parentHeader);
        });
    });

    // ── Téléportation ─────────────────────────────────────────────────────────

    describe('téléportation', () => {
        function mockMatchMedia(matches: boolean) {
            return vi.spyOn(window, 'matchMedia').mockReturnValue({
                matches,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            } as unknown as MediaQueryList);
        }

        it('desktopTarget vaut undefined par défaut', async () => {
            const el = await fixture<ArStepper>('<ar-stepper></ar-stepper>');
            expect(el.desktopTarget).toBeUndefined();
        });

        it('desktopFrom vaut 992 par défaut', async () => {
            const el = await fixture<ArStepper>('<ar-stepper></ar-stepper>');
            expect(el.desktopFrom).toBe(992);
        });

        it('sans desktop-target : écoute le breakpoint mais ne déplace pas le composant', async () => {
            const spy = mockMatchMedia(false);
            const el = await fixture<ArStepper>('<ar-stepper></ar-stepper>');
            expect(spy).toHaveBeenCalled();
            expect(el.parentElement).toBe(document.body);
        });

        it('avec desktop-target valide + viewport desktop : téléporte dans la cible', async () => {
            mockMatchMedia(true);

            const target = document.createElement('div');
            target.id = 'sidebar';
            document.body.appendChild(target);

            const el = await fixtureWithItems(`
                <ar-stepper desktop-target="sidebar" current-path="/a">
                    <ar-stepper-item path="/a" label="A"></ar-stepper-item>
                </ar-stepper>
            `);

            expect(el.parentElement).toBe(target);
            expect((el as unknown as { _isDesktop: boolean })._isDesktop).toBe(true);
        });

        it('avec desktop-target valide + viewport mobile : reste à sa position', async () => {
            mockMatchMedia(false);

            const target = document.createElement('div');
            target.id = 'sidebar2';
            document.body.appendChild(target);

            const container = document.createElement('div');
            document.body.appendChild(container);
            container.innerHTML = `
                <ar-stepper desktop-target="sidebar2" current-path="/a">
                    <ar-stepper-item path="/a" label="A"></ar-stepper-item>
                </ar-stepper>
            `;
            const el = requireQuery<ArStepper>(container, 'ar-stepper');
            await waitForUpdate(el as ArStepper);

            expect(el.parentElement).toBe(container);
            expect((el as unknown as { _isDesktop: boolean })._isDesktop).toBe(false);
        });

        it('desktop-target avec ID inexistant : console.warn, composant non déplacé, rendu desktop', async () => {
            mockMatchMedia(true);
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            const container = document.createElement('div');
            document.body.appendChild(container);
            container.innerHTML = `
                <ar-stepper desktop-target="inexistant" current-path="/a">
                    <ar-stepper-item path="/a" label="A"></ar-stepper-item>
                </ar-stepper>
            `;
            const el = requireQuery<ArStepper>(container, 'ar-stepper');
            await waitForUpdate(el as ArStepper);

            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('inexistant'));
            expect(el.parentElement).toBe(container);
            // La téléportation échoue mais le rendu suit quand même le viewport
            expect((el as unknown as { _isDesktop: boolean })._isDesktop).toBe(true);
        });

        it('suppression de desktop-target après téléportation : restaure la position originale', async () => {
            mockMatchMedia(true);

            const target = document.createElement('div');
            target.id = 'sidebar-restore';
            document.body.appendChild(target);

            // fixture() appende dans document.body → _originalParent = document.body
            const el = await fixtureWithItems(`
                <ar-stepper desktop-target="sidebar-restore" current-path="/a">
                    <ar-stepper-item path="/a" label="A"></ar-stepper-item>
                </ar-stepper>
            `);

            expect(el.parentElement).toBe(target);

            el.removeAttribute('desktop-target');
            await waitForUpdate(el);

            expect(el.parentElement).toBe(document.body);
            // Le viewport est toujours desktop → _isDesktop reste true, seule la téléportation est annulée
            expect((el as unknown as { _isDesktop: boolean })._isDesktop).toBe(true);
        });

        it('disconnectedCallback débranche le listener matchMedia', async () => {
            const removeListenerSpy = vi.fn();
            vi.spyOn(window, 'matchMedia').mockReturnValue({
                matches: false,
                addEventListener: vi.fn(),
                removeEventListener: removeListenerSpy,
            } as unknown as MediaQueryList);

            const target = document.createElement('div');
            target.id = 'sidebar3';
            document.body.appendChild(target);

            const el = await fixture<ArStepper>(
                '<ar-stepper desktop-target="sidebar3"></ar-stepper>',
            );
            el.remove();

            expect(removeListenerSpy).toHaveBeenCalledOnce();
        });
    });

    // ── Alignement ────────────────────────────────────────────────────────────

    describe('reverse-align', () => {
        it('vaut false par défaut', async () => {
            const el = await fixture<ArStepper>(`<ar-stepper></ar-stepper>`);
            expect(el.reverseAlign).toBe(false);
        });

        it('est réfléchi comme attribut HTML', async () => {
            const el = await fixture<ArStepper>(`<ar-stepper reverse-align></ar-stepper>`);
            expect(el.hasAttribute('reverse-align')).toBe(true);
            expect(el.reverseAlign).toBe(true);
        });
    });

    describe('rendu responsive', () => {
        it('sans desktop-target + viewport mobile : rendu dropdown', async () => {
            vi.spyOn(window, 'matchMedia').mockReturnValue({
                matches: false,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            } as unknown as MediaQueryList);

            const el = await fixtureWithItems(`
                <ar-stepper current-path="/a">
                    <ar-stepper-item path="/a" label="A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="B"></ar-stepper-item>
                </ar-stepper>
            `);

            expect(shadow(el).querySelector('.dropdown')).not.toBeNull();
            expect(shadow(el).querySelector('.desktop')).toBeNull();
        });

        it('sans desktop-target + viewport desktop : rendu liste desktop sans téléportation', async () => {
            vi.spyOn(window, 'matchMedia').mockReturnValue({
                matches: true,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            } as unknown as MediaQueryList);

            const el = await fixtureWithItems(`
                <ar-stepper current-path="/a">
                    <ar-stepper-item path="/a" label="A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="B"></ar-stepper-item>
                </ar-stepper>
            `);

            expect(shadow(el).querySelector('.desktop')).not.toBeNull();
            expect(shadow(el).querySelector('.dropdown')).toBeNull();
            // Pas de téléportation : reste dans document.body (où fixture() l'a inséré)
            expect(el.parentElement).toBe(document.body);
        });

        it('avec desktop-target + viewport mobile : rend le dropdown mobile', async () => {
            vi.spyOn(window, 'matchMedia').mockReturnValue({
                matches: false,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            } as unknown as MediaQueryList);

            const target = document.createElement('div');
            target.id = 'sidebar-mobile';
            document.body.appendChild(target);

            const el = await fixtureWithItems(`
                <ar-stepper desktop-target="sidebar-mobile" current-path="/a">
                    <ar-stepper-item path="/a" label="A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="B"></ar-stepper-item>
                </ar-stepper>
            `);

            expect(shadow(el).querySelector('.dropdown')).not.toBeNull();
            expect(shadow(el).querySelector('.desktop')).toBeNull();
        });

        it('avec desktop-target + viewport desktop : rend la liste desktop', async () => {
            vi.spyOn(window, 'matchMedia').mockReturnValue({
                matches: true,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            } as unknown as MediaQueryList);

            const target = document.createElement('div');
            target.id = 'sidebar-desktop';
            document.body.appendChild(target);

            const el = await fixtureWithItems(`
                <ar-stepper desktop-target="sidebar-desktop" current-path="/a">
                    <ar-stepper-item path="/a" label="A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="B"></ar-stepper-item>
                </ar-stepper>
            `);

            expect(shadow(el).querySelector('.desktop')).not.toBeNull();
            expect(shadow(el).querySelector('.dropdown')).toBeNull();
        });

        it('réinsère le composant à sa position d’origine quand le viewport repasse en mobile', async () => {
            let matches = true;
            let listener: ((event: MediaQueryListEvent) => void) | undefined;
            vi.spyOn(window, 'matchMedia').mockReturnValue({
                get matches() {
                    return matches;
                },
                addEventListener: vi.fn((_type, cb) => {
                    listener = cb as (event: MediaQueryListEvent) => void;
                }),
                removeEventListener: vi.fn(),
            } as unknown as MediaQueryList);

            const target = document.createElement('div');
            target.id = 'sidebar-roundtrip';
            document.body.appendChild(target);

            const marker = document.createElement('div');
            marker.id = 'marker';

            const container = document.createElement('div');
            document.body.append(container);
            container.append(marker);
            container.insertAdjacentHTML(
                'beforeend',
                `
                    <ar-stepper desktop-target="sidebar-roundtrip" current-path="/a">
                        <ar-stepper-item path="/a" label="A"></ar-stepper-item>
                        <ar-stepper-item path="/b" label="B"></ar-stepper-item>
                    </ar-stepper>
                `,
            );

            const el = document.querySelector('ar-stepper') as ArStepper;
            await waitForUpdate(el);
            await waitForUpdate(el);

            matches = false;
            listener?.({ matches: false } as MediaQueryListEvent);
            await waitForUpdate(el);

            expect(el.parentElement).toBe(container);
            expect(marker.nextElementSibling).toBe(el);
            expect(shadow(el).querySelector('.dropdown')).not.toBeNull();
        });
    });

    // ── Attribut open ─────────────────────────────────────────────────────────

    describe('attribut open', () => {
        it('vaut false par défaut', async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/a">
                    <ar-stepper-item path="/a" label="A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="B"></ar-stepper-item>
                </ar-stepper>
            `);
            expect(el.open).toBe(false);
            expect(el.hasAttribute('open')).toBe(false);
        });

        it('est reflété comme attribut HTML quand posé programmatiquement', async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/a">
                    <ar-stepper-item path="/a" label="A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="B"></ar-stepper-item>
                </ar-stepper>
            `);
            el.open = true;
            await waitForUpdate(el);

            expect(el.open).toBe(true);
            expect(el.hasAttribute('open')).toBe(true);
        });

        it("open=true n'a pas d'effet en mode desktop", async () => {
            vi.spyOn(window, 'matchMedia').mockReturnValue({
                matches: true,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            } as unknown as MediaQueryList);

            const el = await fixtureWithItems(`
                <ar-stepper current-path="/a">
                    <ar-stepper-item path="/a" label="A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="B"></ar-stepper-item>
                </ar-stepper>
            `);
            el.open = true;
            await waitForUpdate(el);

            expect(el.open).toBe(true);
            expect(shadow(el).querySelector('[part="trigger"]')).toBeNull();
        });
    });

    // ── Annonces a11y ─────────────────────────────────────────────────────────

    describe('annonces a11y', () => {
        afterEach(() => {
            document.querySelectorAll('[data-ar-live-region]').forEach((node) => node.remove());
        });

        it("n'annonce rien tant que currentPath n'est pas confirmé par le consommateur", async () => {
            vi.spyOn(window, 'matchMedia').mockReturnValue({
                matches: true,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            } as unknown as MediaQueryList);

            const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" mode="edit">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);

            const link = shadow(el).querySelector<HTMLAnchorElement>('a[data-path="/a"]');
            if (!link) throw new Error('Lien vers /a introuvable');
            link.click();
            await new Promise((resolve) => setTimeout(resolve, 60));

            expect(document.getElementById('ar-live-region-polite')).toBeNull();
        });

        it('un clic confirmé sur une étape de premier niveau annonce son label', async () => {
            vi.spyOn(window, 'matchMedia').mockReturnValue({
                matches: true,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            } as unknown as MediaQueryList);

            const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" mode="edit">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
            el.addEventListener('ar-stepper-step-change', (e) => {
                el.currentPath = (e as CustomEvent<ArStepperStepChangeDetail>).detail.to;
            });

            const link = shadow(el).querySelector<HTMLAnchorElement>('a[data-path="/a"]');
            if (!link) throw new Error('Lien vers /a introuvable');
            link.click();
            await waitForUpdate(el);
            await new Promise((resolve) => setTimeout(resolve, 60));

            expect(document.getElementById('ar-live-region-polite')?.textContent).toBe('Étape A');
        });

        it('un clic confirmé sur une sous-étape annonce son label (branche flatMap)', async () => {
            vi.spyOn(window, 'matchMedia').mockReturnValue({
                matches: true,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            } as unknown as MediaQueryList);

            const el = await fixtureWithItems(`
                <ar-stepper current-path="/a" mode="edit">
                    <ar-stepper-item path="/a" label="Étape A">
                        <ar-stepper-item path="/a/1" label="Sous-étape 1"></ar-stepper-item>
                        <ar-stepper-item path="/a/2" label="Sous-étape 2"></ar-stepper-item>
                    </ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
            el.addEventListener('ar-stepper-step-change', (e) => {
                el.currentPath = (e as CustomEvent<ArStepperStepChangeDetail>).detail.to;
            });

            const link = shadow(el).querySelector<HTMLAnchorElement>('a[data-path="/a/2"]');
            if (!link) throw new Error('Lien vers /a/2 introuvable');
            link.click();
            await waitForUpdate(el);
            await new Promise((resolve) => setTimeout(resolve, 60));

            expect(document.getElementById('ar-live-region-polite')?.textContent).toBe(
                'Sous-étape 2',
            );
        });
    });

    describe('warn() — desktop-target introuvable', () => {
        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('émet un warn si desktop-target pointe vers un ID inexistant', async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            const el = await fixture<ArStepper>(
                '<ar-stepper desktop-target="conteneur-inexistant"></ar-stepper>',
            );
            (el as unknown as Record<string, () => void>)['_teleportToTarget']?.();

            expect(spy).toHaveBeenCalled();
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('[ar-stepper]'));
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('conteneur-inexistant'));
        });
    });

    describe('traduction', () => {
        it('lang="en" traduit le label de navigation', async () => {
            const el = await fixture<ArStepper>(
                '<ar-stepper current-path="/a" lang="en"><ar-stepper-item href="/a" label="A"></ar-stepper-item></ar-stepper>',
            );
            await waitForUpdate(el);
            const label = el.shadowRoot?.querySelector('#label-nav');
            expect(label?.textContent).toBe('Form steps');
            el.remove();
        });

        it('lang="en" traduit le label sr-only de chaque étape', async () => {
            const el = await fixture<ArStepper>(
                '<ar-stepper current-path="/a" lang="en"><ar-stepper-item href="/a" label="A"></ar-stepper-item></ar-stepper>',
            );
            await waitForUpdate(el);
            const srOnly = el.shadowRoot?.querySelector('.item .sr-only');
            expect(srOnly?.textContent).toBe('step 1:');
            el.remove();
        });
    });

    describe('régressions change-in-update', () => {
        afterEach(() => {
            vi.restoreAllMocks();
        });

        it("ne déclenche pas de warning Lit 'change-in-update' lors de l'enregistrement des items", async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            await fixtureWithItems(`
                <ar-stepper current-path="/a">
                    <ar-stepper-item path="/a" label="A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="B"></ar-stepper-item>
                    <ar-stepper-item path="/c" label="C"></ar-stepper-item>
                </ar-stepper>
            `);

            expect(
                spy.mock.calls
                    .flat()
                    .filter((v) => typeof v === 'string')
                    .some((v) => v.includes('scheduled an update')),
            ).toBe(false);
        });

        it("ne déclenche pas de warning Lit 'change-in-update' lors du toggle open en mode mobile", async () => {
            vi.spyOn(window, 'matchMedia').mockReturnValue({
                matches: false,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            } as unknown as MediaQueryList);

            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            const el = await fixtureWithItems(`
                <ar-stepper current-path="/a">
                    <ar-stepper-item path="/a" label="A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="B"></ar-stepper-item>
                </ar-stepper>
            `);

            el.open = true;
            await waitForUpdate(el);
            el.open = false;
            await waitForUpdate(el);

            expect(
                spy.mock.calls
                    .flat()
                    .filter((v) => typeof v === 'string')
                    .some((v) => v.includes('scheduled an update')),
            ).toBe(false);
        });
    });
});
