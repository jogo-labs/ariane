/// <reference types="mocha" />
import { fixture, html, expect } from '@open-wc/testing';
import type { ArTableSort } from './table-sort.js';
import './index.js';

describe('ar-table-sort — accessibilité', () => {
    // ── Audit axe ─────────────────────────────────────────────────────────

    describe('audit axe', () => {
        it('passe axe dans un <table> complet', async () => {
            const table = await fixture(html`
                <table>
                    <thead>
                        <tr>
                            <th><ar-table-sort type="alpha">Nom</ar-table-sort></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Alice</td>
                        </tr>
                    </tbody>
                </table>
            `);
            await expect(table).to.be.accessible();
        });

        it('passe axe avec order="asc"', async () => {
            const table = await fixture(html`
                <table>
                    <thead>
                        <tr>
                            <th>
                                <ar-table-sort type="numeric" order="asc">Prix</ar-table-sort>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>10</td>
                        </tr>
                    </tbody>
                </table>
            `);
            await expect(table).to.be.accessible();
        });
    });

    // ── aria-sort ─────────────────────────────────────────────────────────

    describe('aria-sort sur le <th>', () => {
        it('aria-sort="none" par défaut', async () => {
            const th = await fixture<HTMLTableCellElement>(
                html`<th><ar-table-sort>Nom</ar-table-sort></th>`,
            );
            expect(th.getAttribute('aria-sort')).to.equal('none');
        });

        it('aria-sort="ascending" quand order="asc"', async () => {
            const th = await fixture<HTMLTableCellElement>(
                html`<th><ar-table-sort order="asc">Nom</ar-table-sort></th>`,
            );
            expect(th.getAttribute('aria-sort')).to.equal('ascending');
        });

        it('aria-sort="descending" quand order="desc"', async () => {
            const th = await fixture<HTMLTableCellElement>(
                html`<th><ar-table-sort order="desc">Nom</ar-table-sort></th>`,
            );
            expect(th.getAttribute('aria-sort')).to.equal('descending');
        });
    });

    // ── scope ─────────────────────────────────────────────────────────────

    describe('scope sur le <th>', () => {
        it('pose scope="col" si absent', async () => {
            const th = await fixture<HTMLTableCellElement>(
                html`<th><ar-table-sort>Nom</ar-table-sort></th>`,
            );
            expect(th.getAttribute('scope')).to.equal('col');
        });

        it('ne remplace pas scope="row" existant', async () => {
            const th = await fixture<HTMLTableCellElement>(
                html`<th scope="row"><ar-table-sort>Nom</ar-table-sort></th>`,
            );
            expect(th.getAttribute('scope')).to.equal('row');
        });
    });

    // ── Structure du bouton ───────────────────────────────────────────────

    describe('bouton', () => {
        it('contient un <button> dans le shadow DOM', async () => {
            const el = await fixture<ArTableSort>(html`<ar-table-sort>Nom</ar-table-sort>`);
            expect(el.shadowRoot!.querySelector('button')).to.not.equal(null);
        });

        it('aria-disabled="true" pendant pending', async () => {
            const el = await fixture<ArTableSort>(html`<ar-table-sort>Nom</ar-table-sort>`);
            el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.click();
            await el.updateComplete;
            expect(
                el.shadowRoot!.querySelector('[part="button"]')!.getAttribute('aria-disabled'),
            ).to.equal('true');
        });
    });
});
