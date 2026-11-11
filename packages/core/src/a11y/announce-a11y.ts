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

/**
 * Éléments qui accueillent les régions d'annonce à la place de `document.body`, du plus ancien
 * au plus récent. Un `<dialog>` modal rend tout ce qui est hors de lui inerte, région comprise :
 * pendant qu'il est ouvert, les annonces doivent donc être écrites à l'intérieur.
 */
const hosts: HTMLElement[] = [];

/** Fait accueillir les annonces par `host` (un dialog modal ouvert) jusqu'à `popAnnounceHost`. */
export function pushAnnounceHost(host: HTMLElement): void {
    if (hosts.includes(host)) return;
    hosts.push(host);
    // Régions créées avant la première annonce : une région qui apparaît avec son texte n'est
    // pas toujours annoncée.
    getLiveRegion('polite');
    getLiveRegion('assertive');
}

export function popAnnounceHost(host: HTMLElement): void {
    const index = hosts.indexOf(host);
    if (index !== -1) hosts.splice(index, 1);
    host.querySelectorAll('[data-ar-live-region]').forEach((region) => region.remove());
}

function getLiveRegion(politeness: AriaPoliteness): HTMLElement | null {
    // Les annonces sont centralisées au niveau document pour être réutilisables
    // par plusieurs composants et éviter de dépendre d'un shadow root spécifique,
    // sauf sous un dialog modal (voir `hosts`).
    if (typeof document === 'undefined' || !document.body) return null;

    const host = hosts[hosts.length - 1] ?? document.body;
    const id = `${LIVE_REGION_ID_PREFIX}-${politeness}`;
    const existing =
        host === document.body
            ? document.getElementById(id)
            : host.querySelector<HTMLElement>(`[data-ar-live-region="${politeness}"]`);
    if (existing) return existing;

    const region = document.createElement('div');
    region.id = id;
    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', 'true');
    region.setAttribute('data-ar-live-region', politeness);
    region.style.cssText = VISUALLY_HIDDEN_STYLE;
    host.appendChild(region);
    return region;
}

export function clearA11yRegion(politeness: AriaPoliteness): void {
    const region = getLiveRegion(politeness);
    if (region) region.textContent = '';
}

export function announceA11y(message: string, politeness: AriaPoliteness = 'polite'): void {
    const normalized = message.trim();
    if (!normalized) return;

    const region = getLiveRegion(politeness);
    if (!region) return;

    // Vider puis réécrire après 50ms : VoiceOver/Safari ignore les mutations trop
    // rapprochées dans le même cycle de rendu ; rAF n'est pas suffisant.
    region.textContent = '';
    setTimeout(() => {
        region.textContent = normalized;
    }, 50);
}
