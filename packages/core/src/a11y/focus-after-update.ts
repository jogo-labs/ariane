import type { ReactiveElement } from 'lit';

/**
 * Focalise le premier élément du shadow DOM correspondant à `selector`, une fois le rendu
 * en cours terminé. Sans effet si aucun élément ne matche.
 */
export async function focusAfterUpdate(host: ReactiveElement, selector: string): Promise<void> {
    await host.updateComplete;
    host.shadowRoot?.querySelector<HTMLElement>(selector)?.focus();
}
