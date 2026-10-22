// `window.ARIANE_CONFIG` est déclaré par le paquet, sans type exporté.
import '@ariane-ui/core/utils';

window.ARIANE_CONFIG = { prefix: 'acme' };
globalThis.ARIANE_CONFIG = undefined;

// @ts-expect-error `prefix` est une chaîne
window.ARIANE_CONFIG = { prefix: 1 };
