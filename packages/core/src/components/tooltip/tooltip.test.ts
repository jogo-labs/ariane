import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, waitForUpdate, getPart } from '../../test-utils.js';
import type { ArTooltip } from './tooltip.js';
import './tooltip.js';

// happy-dom ne supporte pas l'API Popover — on mock showPopover/hidePopover sur la bulle.
function mockBubblePopover(el: ArTooltip): void {
    const bubble = getPart(el, 'bubble') as HTMLElement | null;
    if (!bubble) return;
    (bubble as any).showPopover = vi.fn();
    (bubble as any).hidePopover = vi.fn();
}

describe('ArTooltip', () => {
    let el: ArTooltip;

    afterEach(() => el?.remove());

    describe('rendu', () => {
        beforeEach(async () => {
            document.body.innerHTML = '<button id="btn">x</button>';
            el = await fixture<ArTooltip>('<ar-tooltip for="btn">Aide</ar-tooltip>');
            mockBubblePopover(el);
        });

        it('monte un shadow DOM', () => {
            expect(el.shadowRoot).not.toBeNull();
        });

        it('contient un bubble avec part="bubble"', () => {
            expect(getPart(el, 'bubble')).not.toBeNull();
        });

        it('bubble a role="tooltip"', () => {
            expect(getPart(el, 'bubble')?.getAttribute('role')).toBe('tooltip');
        });

        it('bubble a popover="manual"', () => {
            expect(getPart(el, 'bubble')?.getAttribute('popover')).toBe('manual');
        });

        it('affiche le caret par défaut', () => {
            expect(getPart(el, 'arrow')).not.toBeNull();
        });
    });

    describe('valeurs par défaut', () => {
        beforeEach(async () => {
            document.body.innerHTML = '<button id="btn">x</button>';
            el = await fixture<ArTooltip>('<ar-tooltip for="btn">Aide</ar-tooltip>');
        });

        it('placement="top"', () => expect(el.placement).toBe('top'));
        it('distance=6', () => expect(el.distance).toBe(6));
        it('offset=0', () => expect(el.offset).toBe(0));
        it('showDelay=300', () => expect(el.showDelay).toBe(300));
        it('hideDelay=150', () => expect(el.hideDelay).toBe(150));
        it('withoutArrow=false', () => expect(el.withoutArrow).toBe(false));
        it('disabled=false', () => expect(el.disabled).toBe(false));
    });

    describe('ARIA', () => {
        beforeEach(async () => {
            document.body.innerHTML = '<button id="btn">x</button>';
            el = await fixture<ArTooltip>('<ar-tooltip for="btn">Aide</ar-tooltip>');
        });

        it("pose aria-describedby sur le trigger pointant vers l'id de l'hôte", () => {
            const trigger = document.getElementById('btn')!;
            expect(trigger.getAttribute('aria-describedby')).toBe(el.id);
        });

        it("l'id de l'hôte est non vide", () => {
            expect(el.id).not.toBe('');
        });
    });

    describe('without-arrow', () => {
        it('omet le caret quand without-arrow est posé', async () => {
            document.body.innerHTML = '<button id="btn">x</button>';
            el = await fixture<ArTooltip>('<ar-tooltip for="btn" without-arrow>Aide</ar-tooltip>');
            expect(getPart(el, 'arrow')).toBeNull();
        });

        it('restitue le caret quand without-arrow est retiré', async () => {
            document.body.innerHTML = '<button id="btn">x</button>';
            el = await fixture<ArTooltip>('<ar-tooltip for="btn" without-arrow>Aide</ar-tooltip>');
            el.withoutArrow = false;
            await waitForUpdate(el);
            expect(getPart(el, 'arrow')).not.toBeNull();
        });
    });

    describe('warn() — trigger introuvable', () => {
        it("affiche un warn si l'ID est introuvable", async () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            el = await fixture<ArTooltip>('<ar-tooltip for="id-qui-nexiste-pas">Aide</ar-tooltip>');
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('id-qui-nexiste-pas'));
            warnSpy.mockRestore();
        });
    });

    describe('changement de for', () => {
        it("retire aria-describedby de l'ancien trigger", async () => {
            document.body.innerHTML = '<button id="a">a</button><button id="b">b</button>';
            el = await fixture<ArTooltip>('<ar-tooltip for="a">Aide</ar-tooltip>');
            el.for = 'b';
            await waitForUpdate(el);
            expect(document.getElementById('a')!.hasAttribute('aria-describedby')).toBe(false);
        });

        it('pose aria-describedby sur le nouveau trigger', async () => {
            document.body.innerHTML = '<button id="a">a</button><button id="b">b</button>';
            el = await fixture<ArTooltip>('<ar-tooltip for="a">Aide</ar-tooltip>');
            el.for = 'b';
            await waitForUpdate(el);
            expect(document.getElementById('b')!.getAttribute('aria-describedby')).toBe(el.id);
        });
    });

    describe('disabled', () => {
        it('ne schedule pas le show si disabled=true', async () => {
            document.body.innerHTML = '<button id="btn">x</button>';
            el = await fixture<ArTooltip>(
                '<ar-tooltip for="btn" disabled show-delay="0">Aide</ar-tooltip>',
            );
            mockBubblePopover(el);
            document.getElementById('btn')!.dispatchEvent(new Event('mouseenter'));
            await new Promise((r) => setTimeout(r, 10));
            expect((getPart(el, 'bubble') as any).showPopover).not.toHaveBeenCalled();
        });
    });
});
