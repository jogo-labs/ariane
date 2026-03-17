/**
 * autoloader.ts
 *
 * Observe le DOM et charge les composants à la demande via dynamic import.
 * Destiné uniquement au bundle CDN.
 *
 * Problème central : MutationObserver ne traverse PAS les shadow DOM boundaries.
 * Un `ar-button` dans le shadowRoot d'un `mr-card` est invisible à un observer
 * posé sur `document.body`, même avec `subtree: true`.
 *
 * Solution :
 *   1. Maintenir un Set de tous les roots observés (document.body + chaque shadowRoot).
 *   2. Dès qu'on découvre un élément avec un shadowRoot, l'ajouter aux roots observés.
 *   3. Après le chargement d'un composant, rescanner TOUS les roots connus car les
 *      éléments qui étaient déjà dans le DOM ont maintenant un shadowRoot (après upgrade).
 */

const COMPONENT_MAP: Record<string, () => Promise<unknown>> = {
    'ar-button': () => import('./components/button/button.js'),
    // Ajouter les nouveaux composants ici au fil du développement
};

/** Roots actuellement observés (évite les doublons). */
const observedRoots = new Set<Node>();

/** Tags dont le module est déjà chargé ou en cours de chargement. */
const loaded = new Set<string>();

// ─── Observer partagé ─────────────────────────────────────────────────────────

/**
 * Un seul MutationObserver utilisé pour tous les roots (document.body + shadow roots).
 * Le même callback gère les mutations venant de n'importe quel root observé.
 */
const mutationObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                scanElement(node as Element);
            }
        }
    }
});

// ─── Observation d'un root ────────────────────────────────────────────────────

/**
 * Attache l'observer à un root (document.body ou un shadowRoot) si pas déjà fait.
 * Puis scanne immédiatement le contenu existant de ce root.
 */
function observeRoot(root: Node): void {
    if (observedRoots.has(root)) return;
    observedRoots.add(root);

    mutationObserver.observe(root, {
        childList: true,
        subtree: true, // Capture les ajouts à n'importe quelle profondeur dans ce root
    });

    // Scanne le contenu déjà présent dans ce root au moment où on commence à l'observer
    scanNode(root);
}

// ─── Scan ─────────────────────────────────────────────────────────────────────

/**
 * Scanne tous les éléments d'un root.
 * querySelectorAll('*') est implémenté nativement (plus efficace que la récursion JS)
 * mais ne traverse PAS les shadowRoots — c'est précisément pourquoi on gère
 * les shadowRoots manuellement via observeRoot().
 */
function scanNode(root: Node): void {
    const elements =
        root instanceof Element
            ? [root, ...Array.from(root.querySelectorAll<Element>('*'))]
            : Array.from((root as Document | ShadowRoot).querySelectorAll<Element>('*'));

    for (const el of elements) {
        scanElement(el);
    }
}

/**
 * Inspecte un élément :
 *   - Lance le chargement si c'est un custom element non encore chargé.
 *   - Attache un observer à son shadowRoot s'il en a un.
 */
function scanElement(el: Element): void {
    const tagName = el.tagName.toLowerCase();

    // Déclenche le chargement du composant si nécessaire
    if (tagName.includes('-')) {
        loadComponent(tagName);
    }

    // Si l'élément a déjà un shadowRoot (composant déjà upgradé), on l'observe immédiatement.
    // Cas typique : un composant parent déjà chargé qui contient des enfants non encore chargés.
    if (el.shadowRoot) {
        observeRoot(el.shadowRoot);
    }
}

// ─── Chargement ───────────────────────────────────────────────────────────────

/**
 * Charge le module d'un composant, puis rescanne tous les roots connus.
 *
 * Pourquoi rescanner après le chargement ?
 * Avant le chargement, l'élément existait dans le DOM mais sans shadowRoot
 * (il était "non upgradé" — juste un HTMLElement générique).
 * Après l'upgrade, le composant crée son shadowRoot dans le constructor/connectedCallback.
 * On doit donc détecter ce nouveau shadowRoot et l'observer pour trouver
 * les composants enfants qu'il contient.
 */
async function loadComponent(tagName: string): Promise<void> {
    if (loaded.has(tagName) || !COMPONENT_MAP[tagName]) return;

    // Marque comme "en cours" immédiatement pour éviter les appels parallèles
    loaded.add(tagName);

    try {
        await COMPONENT_MAP[tagName]();

        // Attend que le custom element soit effectivement enregistré dans la registry
        // (le module peut définir l'élément de façon asynchrone dans certains cas)
        await customElements.whenDefined(tagName);

        // Rescanne tous les roots connus : les instances de ce composant
        // ont maintenant un shadowRoot et peuvent contenir d'autres composants
        rescanAllRoots();
    } catch (err) {
        console.error(`[mr-lib autoloader] Failed to load <${tagName}>:`, err);
        // Retire du Set pour permettre un retry
        loaded.delete(tagName);
    }
}

/**
 * Rescanne tous les roots observés.
 * Appelé après chaque chargement de composant pour découvrir les nouveaux shadowRoots
 * et les composants enfants qu'ils contiennent.
 */
function rescanAllRoots(): void {
    for (const root of observedRoots) {
        scanNode(root);
    }
}

// ─── Initialisation ───────────────────────────────────────────────────────────

// Démarre l'observation depuis document.body.
// Tous les shadowRoots découverts en cours de route seront ajoutés dynamiquement.
observeRoot(document.body);
