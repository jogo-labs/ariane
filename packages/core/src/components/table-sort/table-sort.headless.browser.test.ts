/// <reference types="mocha" />
/**
 * Entrée /headless uniquement : ce fichier n'importe que `headless.ts`, jamais un `index.ts`
 * de composant. C'est donc le consommateur qui choisit les tags (#295) : `ar-table-sort`
 * embarque un tooltip sous un tag interne privé, sans rien enregistrer sous `ar-*`.
 */
import { fixture, html, expect, aTimeout } from '@open-wc/testing';
import { ArTableSort, ArTooltip } from '../../headless.js';

const INTERNAL_TOOLTIP = 'ariane-internal-tooltip';

// Comparer des booléens : un `expect` qui échoue sur une classe ou un nœud DOM force chai à le
// sérialiser, et le lanceur de tests reste alors bloqué sur la sérialisation.
function isDefined(tag: string): boolean {
    return customElements.get(tag) !== undefined;
}

function internalTooltip(el: HTMLElement): HTMLElement {
    const tip = el.shadowRoot?.querySelector<HTMLElement>(INTERNAL_TOOLTIP);
    if (!tip) throw new Error(`${INTERNAL_TOOLTIP} introuvable`);
    return tip;
}

describe('ar-table-sort — entrée /headless (#295)', () => {
    it("importer /headless ne définit aucun élément (pas d'ar-tooltip, pas d'ar-table-sort)", () => {
        expect(isDefined('ar-tooltip'), 'ar-tooltip défini').to.equal(false);
        expect(isDefined('ar-table-sort'), 'ar-table-sort défini').to.equal(false);
    });

    describe('avec ArTableSort renommé par le consommateur', () => {
        before(() => {
            customElements.define('acme-table-sort', ArTableSort);
        });

        it('rend un tooltip interne privé, amélioré, sans définir ar-tooltip', async () => {
            const th = await fixture<HTMLTableCellElement>(
                html`<th><acme-table-sort lang="fr">Nom</acme-table-sort></th>`,
            );
            const el = th.querySelector<ArTableSort>('acme-table-sort')!;
            await el.updateComplete;

            const tip = internalTooltip(el);
            expect(Boolean(tip.shadowRoot), 'le tooltip interne est amélioré').to.equal(true);
            expect(tip.textContent?.trim()).to.equal('Trier de A à Z');
            expect(isDefined('ar-tooltip'), 'ar-tooltip défini').to.equal(false);
        });

        it('le survol du bouton ouvre la bulle du tooltip interne', async () => {
            const th = await fixture<HTMLTableCellElement>(
                html`<th><acme-table-sort>Nom</acme-table-sort></th>`,
            );
            const el = th.querySelector<ArTableSort>('acme-table-sort')!;
            await el.updateComplete;

            const bubble =
                internalTooltip(el).shadowRoot!.querySelector<HTMLElement>('[part="tooltip"]')!;
            expect(bubble.matches(':popover-open')).to.equal(false);

            el.shadowRoot!.querySelector('[part~="sort-button"]')!.dispatchEvent(
                new MouseEvent('mouseenter'),
            );
            await aTimeout(500);
            expect(bubble.matches(':popover-open')).to.equal(true);
        });

        it('plusieurs instances partagent un seul enregistrement du tag privé', async () => {
            const row = await fixture<HTMLElement>(
                html`<div>
                    <acme-table-sort>A</acme-table-sort>
                    <acme-table-sort>B</acme-table-sort>
                </div>`,
            );
            const [a, b] = Array.from(row.querySelectorAll<ArTableSort>('acme-table-sort'));
            await Promise.all([a.updateComplete, b.updateComplete]);

            expect(Boolean(internalTooltip(a).shadowRoot), 'premier amélioré').to.equal(true);
            expect(Boolean(internalTooltip(b).shadowRoot), 'second amélioré').to.equal(true);
            expect(isDefined(INTERNAL_TOOLTIP), 'tag privé défini').to.equal(true);
        });

        it("ArTooltip reste enregistrable sous le tag du consommateur, même après la connexion d'un table-sort", async () => {
            const th = await fixture<HTMLTableCellElement>(
                html`<th><acme-table-sort>Nom</acme-table-sort></th>`,
            );
            await th.querySelector<ArTableSort>('acme-table-sort')!.updateComplete;

            let error = '';
            try {
                customElements.define('acme-tooltip', ArTooltip);
            } catch (e) {
                error = (e as Error).name;
            }
            expect(error, 'erreur de define').to.equal('');
            expect(customElements.get('acme-tooltip') === ArTooltip).to.equal(true);
        });
    });
});
