/**
 * test-utils.ts
 *
 * Helpers partagés pour les tests Vitest des composants Lit.
 *
 * Usage dans un fichier de test :
 *
 *   import { fixture, waitForUpdate, getPart } from '../../test-utils.js';
 *
 * Les fonctions sont génériques : TypeScript infère le type retourné depuis
 * le cast fourni à l'appel (ex: `fixture<ArButton>(...)`).
 */

/** Alias pour contourner le protected de `updateComplete` dans LitElement. */
type LitEl = { updateComplete: Promise<boolean> };

/**
 * Monte un composant dans le DOM de test et attend son premier rendu Lit.
 *
 * On passe par un <template> pour éviter que le parser HTML upgrade le custom
 * element avant qu'il soit inséré dans le document (comportement imprévisible
 * selon l'ordre de définition des custom elements).
 *
 * `updateComplete` est une Promise LitElement : elle se résout après que le
 * cycle de rendu réactif en cours soit terminé. Sans ce await, le shadowRoot
 * existe mais son contenu peut ne pas encore être dans le DOM.
 */
export async function fixture<T extends Element>(html: string): Promise<T> {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const el = template.content.firstElementChild as T;
    document.body.appendChild(el);
    await (el as unknown as LitEl).updateComplete;
    return el;
}

/**
 * Attend la fin du prochain cycle de rendu Lit sur un élément déjà monté.
 *
 * Lit batchifie les mises à jour : le re-render (reflect:true, shadow DOM) est
 * asynchrone. Sans ce await après une mutation de propriété, les assertions
 * liraient l'ancienne valeur du DOM.
 *
 * Pour les composants qui déclenchent un second cycle via `queueMicrotask`
 * (ex: `_scheduleRebuild`), appeler `waitForUpdate` deux fois de suite.
 */
export async function waitForUpdate(el: Element): Promise<void> {
    await (el as unknown as LitEl).updateComplete;
}

/**
 * Retourne un élément du Shadow DOM ciblé par son attribut `part="…"`, ou
 * `null` si absent.
 *
 * Utiliser pour les assertions négatives (`expect(...).toBeNull()`).
 * Pour les assertions positives avec chaînage, préférer `requirePart`.
 */
export function getPart(el: Element, part: string): Element | null {
    return el.shadowRoot?.querySelector(`[part="${part}"]`) ?? null;
}

/**
 * Retourne un élément du Shadow DOM ciblé par son attribut `part="…"`.
 * Lance une erreur de test si le part est absent.
 *
 * Utiliser quand le part est censé exister et qu'on veut enchaîner des
 * appels dessus (`.getAttribute`, `.classList`, `.click()`, etc.)
 * sans avoir à gérer le cas `null` dans chaque assertion.
 */
export function requirePart(el: Element, part: string): Element {
    const found = el.shadowRoot?.querySelector(`[part="${part}"]`);
    if (!found)
        throw new Error(`Part "${part}" not found in shadow DOM of <${el.tagName.toLowerCase()}>`);
    return found;
}
