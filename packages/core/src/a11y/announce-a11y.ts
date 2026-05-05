const LIVE_REGION_ID_PREFIX = 'ar-live-region';

const VISUALLY_HIDDEN_STYLE = [
    'position:absolute',
    'width:1px',
    'height:1px',
    'padding:0',
    'margin:-1px',
    'overflow:hidden',
    'clip:rect(0, 0, 0, 0)',
    'white-space:nowrap',
    'border:0',
].join(';');

export type AriaPoliteness = 'polite' | 'assertive';

function getLiveRegion(politeness: AriaPoliteness): HTMLElement | null {
    // Les annonces sont centralisées au niveau document pour être réutilisables
    // par plusieurs composants et éviter de dépendre d'un shadow root spécifique.
    if (typeof document === 'undefined' || !document.body) return null;

    const id = `${LIVE_REGION_ID_PREFIX}-${politeness}`;
    const existing = document.getElementById(id);
    if (existing) return existing;

    const region = document.createElement('div');
    region.id = id;
    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', 'true');
    region.setAttribute('data-ar-live-region', politeness);
    region.style.cssText = VISUALLY_HIDDEN_STYLE;
    document.body.appendChild(region);
    return region;
}

export function announceA11y(message: string, politeness: AriaPoliteness = 'polite'): void {
    const normalized = message.trim();
    if (!normalized) return;

    const region = getLiveRegion(politeness);
    if (!region) return;

    // Vider puis réécrire le message aide les lecteurs d'écran à réannoncer
    // une même information déclenchée plusieurs fois.
    region.textContent = '';
    requestAnimationFrame(() => {
        region.textContent = normalized;
    });
}
