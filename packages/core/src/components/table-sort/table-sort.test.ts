import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ArTableSort } from './table-sort.js';
import { fixture, waitForUpdate } from '../../test-utils.js';
import './table-sort.js';

describe('ArTableSort', () => {
    let el: ArTableSort;
    afterEach(() => el?.remove());

    // ── Valeurs par défaut ────────────────────────────────────────────────

    describe('valeurs par défaut', () => {
        beforeEach(async () => {
            el = await fixture('<ar-table-sort></ar-table-sort>');
        });

        it('type vaut "alpha"', () => expect(el.type).toBe('alpha'));
        it('order vaut "none"', () => expect(el.order).toBe('none'));
        it('pending vaut false', () => expect(el.pending).toBe(false));
        it('reflète order comme attribut', () => expect(el.getAttribute('order')).toBe('none'));
        it('ne reflète pas pending quand false', () =>
            expect(el.hasAttribute('pending')).toBe(false));
    });

    // ── Reflect depuis attributs HTML ─────────────────────────────────────

    describe('reflect', () => {
        it("lit type depuis l'attribut HTML", async () => {
            el = await fixture('<ar-table-sort type="numeric"></ar-table-sort>');
            expect(el.type).toBe('numeric');
        });

        it("lit order depuis l'attribut HTML", async () => {
            el = await fixture('<ar-table-sort order="asc"></ar-table-sort>');
            expect(el.order).toBe('asc');
        });
    });

    // ── Template ──────────────────────────────────────────────────────────

    describe('template', () => {
        beforeEach(async () => {
            el = await fixture('<ar-table-sort></ar-table-sort>');
        });

        it('contient part="button"', () => {
            expect(el.shadowRoot!.querySelector('[part="button"]')).not.toBeNull();
        });

        it('contient part="indicator"', () => {
            expect(el.shadowRoot!.querySelector('[part="indicator"]')).not.toBeNull();
        });

        it('contient une région aria-live="polite"', () => {
            const live = el.shadowRoot!.querySelector('[aria-live="polite"]');
            expect(live).not.toBeNull();
            expect(live!.getAttribute('aria-atomic')).toBe('true');
        });
    });

    // ── Labels alpha ──────────────────────────────────────────────────────

    describe('labels — alpha', () => {
        it('title = "Trier A → Z" quand order=none', async () => {
            el = await fixture('<ar-table-sort type="alpha" order="none"></ar-table-sort>');
            await waitForUpdate(el);
            expect(
                el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.getAttribute('title'),
            ).toBe('Trier A → Z');
        });

        it('title = "Trier Z → A" quand order=asc', async () => {
            el = await fixture('<ar-table-sort type="alpha" order="asc"></ar-table-sort>');
            await waitForUpdate(el);
            expect(
                el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.getAttribute('title'),
            ).toBe('Trier Z → A');
        });

        it('title = "Supprimer le tri" quand order=desc', async () => {
            el = await fixture('<ar-table-sort type="alpha" order="desc"></ar-table-sort>');
            await waitForUpdate(el);
            expect(
                el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.getAttribute('title'),
            ).toBe('Supprimer le tri');
        });
    });

    // ── Labels numeric ────────────────────────────────────────────────────

    describe('labels — numeric', () => {
        it('title = "Trier croissant" quand order=none', async () => {
            el = await fixture('<ar-table-sort type="numeric" order="none"></ar-table-sort>');
            await waitForUpdate(el);
            expect(
                el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.getAttribute('title'),
            ).toBe('Trier croissant');
        });

        it('title = "Trier décroissant" quand order=asc', async () => {
            el = await fixture('<ar-table-sort type="numeric" order="asc"></ar-table-sort>');
            await waitForUpdate(el);
            expect(
                el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.getAttribute('title'),
            ).toBe('Trier décroissant');
        });
    });

    // ── Labels date ───────────────────────────────────────────────────────

    describe('labels — date', () => {
        it('title = "Trier du plus ancien" quand order=none', async () => {
            el = await fixture('<ar-table-sort type="date" order="none"></ar-table-sort>');
            await waitForUpdate(el);
            expect(
                el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.getAttribute('title'),
            ).toBe('Trier du plus ancien');
        });

        it('title = "Trier du plus récent" quand order=asc', async () => {
            el = await fixture('<ar-table-sort type="date" order="asc"></ar-table-sort>');
            await waitForUpdate(el);
            expect(
                el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.getAttribute('title'),
            ).toBe('Trier du plus récent');
        });
    });

    // ── Label pendant pending ─────────────────────────────────────────────

    describe('label pendant pending', () => {
        it('title = "Tri en cours…" pendant pending', async () => {
            el = await fixture('<ar-table-sort></ar-table-sort>');
            el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.click();
            await waitForUpdate(el);
            expect(
                el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.getAttribute('title'),
            ).toBe('Tri en cours…');
        });
    });

    // ── Cycle et événement ────────────────────────────────────────────────

    describe('clic — cycle et événement', () => {
        it('passe pending=true et émet ar-table-sort-change', async () => {
            el = await fixture('<ar-table-sort></ar-table-sort>');
            const events: CustomEvent[] = [];
            el.addEventListener('ar-table-sort-change', (e) => events.push(e as CustomEvent));

            el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.click();
            await waitForUpdate(el);

            expect(el.pending).toBe(true);
            expect(el.hasAttribute('pending')).toBe(true);
            expect(events).toHaveLength(1);
            expect(events[0].detail.type).toBe('alpha');
            expect(events[0].detail.currentOrder).toBe('none');
            expect(events[0].detail.requestedOrder).toBe('asc');
        });

        it('inclut columnLabel dans le detail', async () => {
            el = await fixture('<ar-table-sort>Prix</ar-table-sort>');
            const events: CustomEvent[] = [];
            el.addEventListener('ar-table-sort-change', (e) => events.push(e as CustomEvent));

            el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.click();
            await waitForUpdate(el);

            expect(events[0].detail.columnLabel).toBe('Prix');
        });

        it('none → asc (cycle)', async () => {
            el = await fixture('<ar-table-sort order="asc"></ar-table-sort>');
            const events: CustomEvent[] = [];
            el.addEventListener('ar-table-sort-change', (e) => events.push(e as CustomEvent));

            el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.click();
            await waitForUpdate(el);
            expect(events[0].detail.requestedOrder).toBe('desc');
        });

        it('desc → none (cycle)', async () => {
            el = await fixture('<ar-table-sort order="desc"></ar-table-sort>');
            const events: CustomEvent[] = [];
            el.addEventListener('ar-table-sort-change', (e) => events.push(e as CustomEvent));

            el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.click();
            await waitForUpdate(el);
            expect(events[0].detail.requestedOrder).toBe('none');
        });

        it('second clic pendant pending ignoré', async () => {
            el = await fixture('<ar-table-sort></ar-table-sort>');
            const events: CustomEvent[] = [];
            el.addEventListener('ar-table-sort-change', (e) => events.push(e as CustomEvent));

            const btn = el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!;
            btn.click();
            await waitForUpdate(el);
            btn.click();
            await waitForUpdate(el);

            expect(events).toHaveLength(1);
        });

        it('aria-disabled="true" sur le bouton pendant pending', async () => {
            el = await fixture('<ar-table-sort></ar-table-sort>');
            el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.click();
            await waitForUpdate(el);
            expect(
                el.shadowRoot!.querySelector('[part="button"]')!.getAttribute('aria-disabled'),
            ).toBe('true');
        });
    });

    // ── confirm() ─────────────────────────────────────────────────────────

    describe('confirm()', () => {
        it('avance order et efface pending', async () => {
            el = await fixture('<ar-table-sort></ar-table-sort>');
            el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.click();
            await waitForUpdate(el);

            el.confirm();
            await waitForUpdate(el);

            expect(el.order).toBe('asc');
            expect(el.pending).toBe(false);
            expect(el.getAttribute('order')).toBe('asc');
            expect(el.hasAttribute('pending')).toBe(false);
        });

        it('sans effet si pending est false', async () => {
            el = await fixture('<ar-table-sort order="asc"></ar-table-sort>');
            el.confirm();
            await waitForUpdate(el);
            expect(el.order).toBe('asc');
        });

        it('second confirm() consécutif sans effet', async () => {
            el = await fixture('<ar-table-sort></ar-table-sort>');
            el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.click();
            await waitForUpdate(el);
            el.confirm();
            await waitForUpdate(el);
            el.confirm();
            await waitForUpdate(el);
            expect(el.order).toBe('asc');
        });
    });

    // ── reject() ──────────────────────────────────────────────────────────

    describe('reject()', () => {
        it('efface pending sans changer order', async () => {
            el = await fixture('<ar-table-sort></ar-table-sort>');
            el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.click();
            await waitForUpdate(el);

            el.reject();
            await waitForUpdate(el);

            expect(el.order).toBe('none');
            expect(el.pending).toBe(false);
        });

        it('sans effet si pending est false', async () => {
            el = await fixture('<ar-table-sort order="asc"></ar-table-sort>');
            el.reject();
            await waitForUpdate(el);
            expect(el.order).toBe('asc');
        });
    });

    // ── Effets de bord sur <th> ───────────────────────────────────────────

    describe('effets de bord sur le <th> parent', () => {
        async function inTh(attrs = ''): Promise<{ th: HTMLTableCellElement; el: ArTableSort }> {
            const th = document.createElement('th');
            th.innerHTML = `<ar-table-sort ${attrs}>Nom</ar-table-sort>`;
            document.body.appendChild(th);
            const sort = th.querySelector<ArTableSort>('ar-table-sort')!;
            await waitForUpdate(sort);
            return { th, el: sort };
        }

        afterEach(() => document.querySelectorAll('th').forEach((t) => t.remove()));

        it('pose aria-sort="none" au connectedCallback', async () => {
            const { th } = await inTh();
            expect(th.getAttribute('aria-sort')).toBe('none');
        });

        it('pose aria-sort="ascending" quand order="asc"', async () => {
            const { th } = await inTh('order="asc"');
            expect(th.getAttribute('aria-sort')).toBe('ascending');
        });

        it('pose aria-sort="descending" quand order="desc"', async () => {
            const { th } = await inTh('order="desc"');
            expect(th.getAttribute('aria-sort')).toBe('descending');
        });

        it('met à jour aria-sort après confirm()', async () => {
            const { th, el } = await inTh();
            el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.click();
            await waitForUpdate(el);
            el.confirm();
            await waitForUpdate(el);
            expect(th.getAttribute('aria-sort')).toBe('ascending');
        });

        it('pose scope="col" si absent', async () => {
            const { th } = await inTh();
            expect(th.getAttribute('scope')).toBe('col');
        });

        it('ne remplace pas un scope déjà présent', async () => {
            const th = document.createElement('th');
            th.setAttribute('scope', 'row');
            th.innerHTML = '<ar-table-sort>Nom</ar-table-sort>';
            document.body.appendChild(th);
            const sort = th.querySelector<ArTableSort>('ar-table-sort')!;
            await waitForUpdate(sort);
            expect(th.getAttribute('scope')).toBe('row');
            th.remove();
        });

        it('fonctionne si un wrapper est intercalé (closest)', async () => {
            const th = document.createElement('th');
            th.innerHTML = '<span><ar-table-sort>Nom</ar-table-sort></span>';
            document.body.appendChild(th);
            const sort = th.querySelector<ArTableSort>('ar-table-sort')!;
            await waitForUpdate(sort);
            expect(th.getAttribute('aria-sort')).toBe('none');
            th.remove();
        });
    });
});
