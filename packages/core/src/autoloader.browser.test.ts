/// <reference types="mocha" />
/**
 * autoloader.browser.test.ts
 *
 * Teste le comportement de l'autoloader dans un vrai browser (Chromium via @web/test-runner).
 * Se concentre sur les cas impossibles à couvrir avec happy-dom :
 *   - Détection de composants dans des shadow DOM imbriqués
 *   - Upgrade après chargement dynamique dans un shadow root
 *   - MutationObserver cross-shadow
 *
 * Utilise le bundle CDN (Lit bundlé + autoloader + tous les composants).
 * Le dist/ doit être buildé avant de lancer ces tests (assuré par le job CI).
 */

import { expect } from '@open-wc/testing';

// Le bundle CDN enregistre tous les composants ET démarre l'autoloader.
// On l'importe une seule fois — l'autoloader attache son MutationObserver à document.body.
await import('../cdn/index.js');

const tick = () => new Promise((r) => setTimeout(r, 50));

afterEach(() => {
    document.body.innerHTML = '';
});

// ─── Cas de base ──────────────────────────────────────────────────────────────

describe('autoloader — cas de base', () => {
    it('upgrade un composant ajouté directement dans document.body', async () => {
        const el = document.createElement('ar-alert');
        document.body.appendChild(el);
        await customElements.whenDefined('ar-alert');
        await tick();

        expect(el.shadowRoot).to.not.equal(null);
    });

    it('ne charge pas deux fois le même composant (idempotent)', async () => {
        const a = document.createElement('ar-alert');
        const b = document.createElement('ar-alert');
        document.body.appendChild(a);
        document.body.appendChild(b);
        await customElements.whenDefined('ar-alert');
        await tick();

        // Les deux instances sont upgradées sans erreur
        expect(a.shadowRoot).to.not.equal(null);
        expect(b.shadowRoot).to.not.equal(null);
    });
});

// ─── Shadow DOM imbriqué ──────────────────────────────────────────────────────

describe('autoloader — shadow DOM imbriqué', () => {
    it("détecte un composant dans le shadow DOM d'un élément hôte custom", async () => {
        // Simule un hôte non-ariane avec un shadow root contenant un ar-alert
        const host = document.createElement('div');
        document.body.appendChild(host);
        const shadow = host.attachShadow({ mode: 'open' });

        const alertInShadow = document.createElement('ar-alert');
        shadow.appendChild(alertInShadow);

        await customElements.whenDefined('ar-alert');
        await tick();

        // L'autoloader doit avoir observé le shadow root et upgradé ar-alert
        expect(alertInShadow.shadowRoot).to.not.equal(null);
    });

    it('détecte un composant ajouté après coup dans un shadow root déjà observé', async () => {
        const host = document.createElement('div');
        document.body.appendChild(host);
        const shadow = host.attachShadow({ mode: 'open' });

        // Ajoute un premier composant pour que l'autoloader observe ce shadow root
        const first = document.createElement('ar-spinner');
        shadow.appendChild(first);
        await customElements.whenDefined('ar-spinner');
        await tick();

        // Puis ajoute un second composant dans le même shadow root
        const second = document.createElement('ar-alert');
        shadow.appendChild(second);
        await customElements.whenDefined('ar-alert');
        await tick();

        expect(second.shadowRoot).to.not.equal(null);
    });

    it("détecte un composant dans le shadow DOM d'un autre composant ar-*", async () => {
        // ar-breadcrumb contient ar-breadcrumb-item dans son light DOM (slot)
        const breadcrumb = document.createElement('ar-breadcrumb');
        const item = document.createElement('ar-breadcrumb-item');
        item.innerHTML = '<a href="/">Accueil</a>';
        breadcrumb.appendChild(item);
        document.body.appendChild(breadcrumb);

        await customElements.whenDefined('ar-breadcrumb');
        await customElements.whenDefined('ar-breadcrumb-item');
        await tick();

        // ar-breadcrumb a un shadow root (LitElement standard)
        expect(breadcrumb.shadowRoot).to.not.equal(null);
        // ar-breadcrumb-item n'a pas de shadow root (createRenderRoot retourne this),
        // mais doit être upgradé (`:defined`)
        expect(item.matches(':defined')).to.equal(true);
    });

    it('détecte des composants à deux niveaux de shadow DOM', async () => {
        // Niveau 1 : hôte custom → shadow root → ar-breadcrumb
        // Niveau 2 : ar-breadcrumb-item en light DOM de ar-breadcrumb
        const outerHost = document.createElement('div');
        document.body.appendChild(outerHost);
        const outerShadow = outerHost.attachShadow({ mode: 'open' });

        const breadcrumb = document.createElement('ar-breadcrumb');
        const item = document.createElement('ar-breadcrumb-item');
        item.innerHTML = '<a href="/">Accueil</a>';
        breadcrumb.appendChild(item);
        outerShadow.appendChild(breadcrumb);

        await customElements.whenDefined('ar-breadcrumb');
        await customElements.whenDefined('ar-breadcrumb-item');
        await tick();

        expect(breadcrumb.shadowRoot).to.not.equal(null);
        expect(item.matches(':defined')).to.equal(true);
    });
});
