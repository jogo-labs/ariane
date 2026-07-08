/**
 * Dérive le préfixe runtime effectif à partir du tag déjà résolu de l'hôte
 * (`this.tagName`), en lui retirant son nom local. Permet de reconstruire le
 * tag d'un composant apparenté (enfant, frère) sans connaître ni lire
 * `window.ARIANE_CONFIG` directement — hôte et composants apparentés
 * partagent toujours le même préfixe runtime, qu'il s'agisse du défaut npm
 * ('ar') ou d'un préfixe CDN configuré.
 */
export function getRuntimePrefix(hostTagName: string, localName: string): string {
    const tag = hostTagName.toLowerCase();
    const suffix = `-${localName}`;
    return tag.endsWith(suffix) ? tag.slice(0, -suffix.length) : tag;
}
