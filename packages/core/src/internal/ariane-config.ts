/**
 * Préfixe de tags configuré par le consommateur via `ARIANE_CONFIG.prefix`, ou `undefined`.
 *
 * Lu sur `globalThis` et non sur `window` : `globalThis` vaut `window` dans le navigateur, et
 * `window` n'existe pas côté serveur (Next.js, SSR), où lire `window.ARIANE_CONFIG` à l'import
 * ferait lever un `ReferenceError`. Une application peut ainsi poser la configuration sur
 * `globalThis` avant d'importer la librairie, côté serveur comme côté client.
 */
export function configuredPrefix(): string | undefined {
    return globalThis.ARIANE_CONFIG?.prefix;
}
