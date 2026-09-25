import { describe, expect, it } from 'vitest';
import { buildKitchenSinkHtml } from './build-kitchen-sink-html.js';

describe('buildKitchenSinkHtml', () => {
    it('rend le tagName (h2) et le html brut du variant', () => {
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
        expect(html).toMatch(/<h2>ar-alert <code>&lt;ar-alert&gt;<\/code><\/h2>/);
        expect(html).toMatch(/<ar-alert>Texte<\/ar-alert>/);
        expect(warnings).toEqual([]);
    });

    it('échappe le texte (label/description) mais pas le html du variant', () => {
        const { html } = buildKitchenSinkHtml([
            {
                tagName: 'ar-sample',
                summary: 'Résumé.',
                variants: [
                    {
                        name: 'x',
                        label: 'Label avec <balise> non voulue',
                        description: 'desc avec <balise> non voulue',
                        html: '<ar-sample></ar-sample>',
                    },
                ],
            },
        ]);
        expect(html).toMatch(/Label avec &lt;balise&gt; non voulue/);
        expect(html).toMatch(/desc avec &lt;balise&gt; non voulue/);
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

    it('inclut une TOC latérale avec un lien par composant', () => {
        const { html } = buildKitchenSinkHtml([
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
            {
                tagName: 'ar-dialog',
                summary: 'Affiche une boîte de dialogue.',
                variants: [
                    {
                        name: 'default',
                        label: 'Défaut',
                        description: 'Rendu par défaut.',
                        html: '<ar-dialog></ar-dialog>',
                    },
                ],
            },
        ]);
        expect(html).toMatch(/<nav class="ks-toc"/);
        expect(html).toMatch(/<li><a href="#ar-alert">ar-alert<\/a><\/li>/);
        expect(html).toMatch(/<li><a href="#ar-dialog">ar-dialog<\/a><\/li>/);
    });

    it('utilise le title du frontmatter (TOC + h2), tout en gardant le tagName visible', () => {
        const { html } = buildKitchenSinkHtml([
            {
                tagName: 'ar-alert',
                title: 'Alerte',
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
        expect(html).toMatch(/<a href="#ar-alert">Alerte<\/a>/);
        expect(html).toMatch(/<h2>Alerte <code>&lt;ar-alert&gt;<\/code><\/h2>/);
    });

    it('sans title, retombe sur le tagName comme libellé visible (TOC + h2)', () => {
        const { html } = buildKitchenSinkHtml([
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
        expect(html).toMatch(/<a href="#ar-alert">ar-alert<\/a>/);
        expect(html).toMatch(/<h2>ar-alert <code>&lt;ar-alert&gt;<\/code><\/h2>/);
    });

    it('inclut les liens vers les presets CSS (boutons, champs)', () => {
        const { html } = buildKitchenSinkHtml([]);
        expect(html).toMatch(/<link rel="stylesheet" href="\.\/presets\/buttons\.css" \/>/);
        expect(html).toMatch(/<link rel="stylesheet" href="\.\/presets\/fields\.css" \/>/);
    });

    it('inclut le logo Ariane (SVG + libellé)', () => {
        const { html } = buildKitchenSinkHtml([]);
        expect(html).toMatch(/class="ks-logo-mark"/);
        expect(html).toMatch(/<span class="ks-logo">Ariane<\/span>/);
    });

    it('inclut le bouton de switch de thème', () => {
        const { html } = buildKitchenSinkHtml([]);
        expect(html).toMatch(/<button type="button" class="ks-theme-toggle" id="ks-theme-toggle"/);
    });

    it('utilise le name du variant comme titre quand label est absent', () => {
        const { html } = buildKitchenSinkHtml([
            {
                tagName: 'ar-sample',
                summary: 'Résumé.',
                variants: [
                    {
                        name: 'Nom du variant',
                        description: 'desc',
                        html: '<ar-sample></ar-sample>',
                    },
                ],
            },
        ]);
        expect(html).toMatch(/<h3>Nom du variant<\/h3>/);
        expect(html).not.toMatch(/<h3>undefined<\/h3>/);
    });

    it('inclut les liens vers les dépôts ariane et ariane-starter-kit dans la nav', () => {
        const { html } = buildKitchenSinkHtml([]);
        const navMatch = html.match(/<header class="ks-nav">[\s\S]*?<\/header>/);
        expect(navMatch).not.toBeNull();
        const nav = navMatch[0];
        expect(nav).toMatch(/https:\/\/github\.com\/jogo-labs\/ariane"/);
        expect(nav).toMatch(/https:\/\/github\.com\/jogo-labs\/ariane-starter-kit"/);
    });

    it('inclut le pageScript une fois après la section du composant (rend la démo interactive)', () => {
        const { html } = buildKitchenSinkHtml([
            {
                tagName: 'ar-pagination',
                summary: 'Pagination.',
                variants: [
                    {
                        name: 'default',
                        label: 'Défaut',
                        description: 'x',
                        html: '<ar-pagination></ar-pagination>',
                    },
                ],
                pageScript:
                    "<script>document.addEventListener('ar-pagination-page-change', (e) => { e.target.current = e.detail.to; });</script>",
            },
        ]);
        expect(html).toMatch(/ar-pagination-page-change/);
        // une seule occurrence du script, pas dupliqué par variant
        expect(html.match(/ar-pagination-page-change/g)).toHaveLength(1);
    });

    it('signale que le comportement est simulé quand pageScript est présent', () => {
        const { html } = buildKitchenSinkHtml([
            {
                tagName: 'ar-pagination',
                summary: 'Pagination.',
                variants: [],
                pageScript: '<script>/* ... */</script>',
            },
        ]);
        expect(html).toMatch(/simulé par un script/);
    });

    it('ne signale rien quand pageScript est absent', () => {
        const { html } = buildKitchenSinkHtml([
            { tagName: 'ar-alert', summary: 'x', variants: [] },
        ]);
        expect(html).not.toMatch(/simulé par un script/);
    });

    it('ne rend rien de plus quand pageScript est absent', () => {
        const { html } = buildKitchenSinkHtml([
            { tagName: 'ar-alert', summary: 'x', variants: [] },
        ]);
        expect(html).not.toMatch(/undefined/);
    });
});
