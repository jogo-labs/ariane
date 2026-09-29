import { afterEach, describe, expect, it } from 'vitest';
import { whenAllDefined } from './when-all-defined.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

let counter = 0;

/** Tag unique par appel : un custom element ne peut pas être « dé-défini » entre deux tests. */
function uniqueTag(prefix: string): string {
    counter += 1;
    return `${prefix}-el${counter}`;
}

function appendElement(tag: string, parent: ParentNode = document.body): Element {
    const el = document.createElement(tag);
    parent.appendChild(el);
    return el;
}

/** Vrai si la promesse n'est pas résolue après un tour de la boucle d'événements. */
async function isPending(promise: Promise<unknown>): Promise<boolean> {
    let settled = false;
    void promise.then(() => {
        settled = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    return !settled;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('whenAllDefined', () => {
    afterEach(() => {
        document.body.innerHTML = '';
        delete window.ARIANE_CONFIG;
    });

    it('résout immédiatement si aucun custom element non défini dans le DOM', async () => {
        await expect(whenAllDefined()).resolves.toBeUndefined();
    });

    it('attend la définition d’un tag ar-* présent dans le DOM', async () => {
        const tag = uniqueTag('ar');
        appendElement(tag);

        const promise = whenAllDefined();
        expect(await isPending(promise)).toBe(true);

        customElements.define(tag, class extends HTMLElement {});
        await expect(promise).resolves.toBeUndefined();
    });

    it("ignore les éléments natifs sans tiret (ex: 'div', 'span')", async () => {
        appendElement('div');
        appendElement('span');

        await expect(whenAllDefined()).resolves.toBeUndefined();
    });

    it('ignore les éléments avec un préfixe différent', async () => {
        appendElement(uniqueTag('my')); // jamais défini
        const tag = uniqueTag('ar');
        appendElement(tag);

        const promise = whenAllDefined();
        customElements.define(tag, class extends HTMLElement {});

        await expect(promise).resolves.toBeUndefined();
    });

    it('utilise le préfixe configuré via window.ARIANE_CONFIG par défaut', async () => {
        window.ARIANE_CONFIG = { prefix: 'acme' };
        appendElement(uniqueTag('ar')); // jamais défini
        const tag = uniqueTag('acme');
        appendElement(tag);

        const promise = whenAllDefined();
        customElements.define(tag, class extends HTMLElement {});

        await expect(promise).resolves.toBeUndefined();
    });

    it('accepte un préfixe personnalisé', async () => {
        appendElement(uniqueTag('ar')); // jamais défini
        const tag = uniqueTag('my');
        appendElement(tag);

        const promise = whenAllDefined({ prefix: 'my-' });
        expect(await isPending(promise)).toBe(true);

        customElements.define(tag, class extends HTMLElement {});
        await expect(promise).resolves.toBeUndefined();
    });

    it('traverse les shadow roots ouverts', async () => {
        const tag = uniqueTag('ar');
        const host = appendElement('div');
        appendElement(tag, host.attachShadow({ mode: 'open' }));

        const promise = whenAllDefined();
        expect(await isPending(promise)).toBe(true);

        customElements.define(tag, class extends HTMLElement {});
        await expect(promise).resolves.toBeUndefined();
    });

    it('attend aussi les enfants qui apparaissent dans le shadow DOM après la définition du parent', async () => {
        const parentTag = uniqueTag('ar');
        const childTag = uniqueTag('ar');
        appendElement(parentTag);

        const promise = whenAllDefined();

        // Le parent crée son shadow DOM (avec un enfant non défini) à sa connexion,
        // donc l'enfant n'existe dans le DOM qu'après la définition du parent.
        customElements.define(
            parentTag,
            class extends HTMLElement {
                connectedCallback() {
                    appendElement(childTag, this.attachShadow({ mode: 'open' }));
                }
            },
        );
        expect(await isPending(promise)).toBe(true);

        customElements.define(childTag, class extends HTMLElement {});
        await expect(promise).resolves.toBeUndefined();
    });

    describe('root', () => {
        it('limite l’attente au sous-arbre donné', async () => {
            const outsideTag = uniqueTag('ar'); // jamais défini
            const insideTag = uniqueTag('ar');
            appendElement(outsideTag);
            const section = appendElement('section');
            appendElement(insideTag, section);

            const promise = whenAllDefined({ root: section });
            expect(await isPending(promise)).toBe(true);

            customElements.define(insideTag, class extends HTMLElement {});
            await expect(promise).resolves.toBeUndefined();
        });

        it('accepte un shadow root', async () => {
            const outsideTag = uniqueTag('ar'); // jamais défini
            const insideTag = uniqueTag('ar');
            appendElement(outsideTag);
            const shadow = appendElement('div').attachShadow({ mode: 'open' });
            appendElement(insideTag, shadow);

            const promise = whenAllDefined({ root: shadow });
            expect(await isPending(promise)).toBe(true);

            customElements.define(insideTag, class extends HTMLElement {});
            await expect(promise).resolves.toBeUndefined();
        });
    });
});
