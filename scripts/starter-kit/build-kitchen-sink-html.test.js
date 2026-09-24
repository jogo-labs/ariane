import { describe, expect, it } from 'vitest';
import { buildKitchenSinkHtml } from './build-kitchen-sink-html.js';

describe('buildKitchenSinkHtml', () => {
    it('rend le tagName, le summary et le html brut du variant', () => {
        const { html, warnings } = buildKitchenSinkHtml([
            {
                tagName: 'ar-alert',
                summary: 'Affiche un message important.',
                variants: [
                    {
                        name: 'default',
                        label: 'Défaut',
                        description: 'Rendu par défaut.',
                        html: '<ar-alert>Texte</ar-alert>',
                    },
                ],
            },
        ]);
        expect(html).toMatch(/<h2>ar-alert<\/h2>/);
        expect(html).toMatch(/Affiche un message important\./);
        expect(html).toMatch(/<ar-alert>Texte<\/ar-alert>/);
        expect(warnings).toEqual([]);
    });

    it('échappe le texte (summary/label/description) mais pas le html du variant', () => {
        const { html } = buildKitchenSinkHtml([
            {
                tagName: 'ar-sample',
                summary: 'Résumé avec <balise> non voulue',
                variants: [
                    {
                        name: 'x',
                        label: 'Label',
                        description: 'desc',
                        html: '<ar-sample></ar-sample>',
                    },
                ],
            },
        ]);
        expect(html).toMatch(/Résumé avec &lt;balise&gt; non voulue/);
        expect(html).toMatch(/<ar-sample><\/ar-sample>/);
    });

    it('composant sans variant : avertissement + mention "démo à compléter"', () => {
        const { html, warnings } = buildKitchenSinkHtml([
            { tagName: 'ar-nouveau', summary: 'Un nouveau composant.', variants: [] },
        ]);
        expect(warnings.length).toBe(1);
        expect(warnings[0]).toMatch(/ar-nouveau/);
        expect(html).toMatch(/démo à compléter/i);
    });

    it('inclut la barre de nav sobre et le lien CDN autoloader', () => {
        const { html } = buildKitchenSinkHtml([]);
        expect(html).toMatch(/cdn\/autoloader\.prod\.js/);
        expect(html).toMatch(/ariane-starter\.css/);
        expect(html).toMatch(/class="ks-nav"/);
    });
});
