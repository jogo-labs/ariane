/**
 * autoloader.ts
 *
 * Observe le DOM et charge les composants à la demande via dynamic import.
 * Destiné uniquement au bundle CDN.
 *
 * Problème central : MutationObserver ne traverse PAS les shadow DOM boundaries.
 * Un `ar-alert` dans le shadowRoot d'un `ar-card` est invisible à un observer
 * posé sur `document.body`, même avec `subtree: true`.
 *
 * Solution :
 *   1. Maintenir un Set de tous les roots observés (document.body + chaque shadowRoot).
 *   2. Dès qu'on découvre un élément avec un shadowRoot, l'ajouter aux roots observés.
 *   3. Après le chargement d'un composant, rescanner TOUS les roots connus car les
 *      éléments qui étaient déjà dans le DOM ont maintenant un shadowRoot (après upgrade).
 */

/**
 * Table nom-de-composant → loader de la classe pure (aucun effet de bord).
 * Le tag effectivement enregistré est construit dynamiquement avec le préfixe
 * configuré (voir `prefix` ci-dessous), pas hardcodé ici.
 */
const COMPONENT_DEFS: Record<string, () => Promise<Record<string, unknown>>> = {
    alert: () => import('./components/alert/alert.js'),
    breadcrumb: () => import('./components/breadcrumb/breadcrumb.js'),
    'breadcrumb-item': () => import('./components/breadcrumb-item/breadcrumb-item.js'),
    pagination: () => import('./components/pagination/pagination.js'),
    progressbar: () => import('./components/progressbar/progressbar.js'),
    spinner: () => import('./components/spinner/spinner.js'),
    stepper: () => import('./components/stepper/stepper.js'),
    'stepper-item': () => import('./components/stepper-item/stepper-item.js'),
    dialog: () => import('./components/dialog/dialog.js'),
    dropdown: () => import('./components/dropdown/dropdown.js'),
    'dropdown-item': () => import('./components/dropdown-item/dropdown-item.js'),
    'tab-group': () => import('./components/tab-group/tab-group.js'),
    tab: () => import('./components/tab/tab.js'),
    'tab-panel': () => import('./components/tab-panel/tab-panel.js'),
    'table-sort': () => import('./components/table-sort/table-sort.js'),
    charcounter: () => import('./components/charcounter/charcounter.js'),
    collapse: () => import('./components/collapse/collapse.js'),
    datepicker: () => import('./components/datepicker/datepicker.js'),
    tooltip: () => import('./components/tooltip/tooltip.js'),
    // ⚠ Mis à jour automatiquement par le script create-component.js
};

/** Préfixe des tags, lu une seule fois au chargement du module. Défaut : 'ar'. */
const prefix = window.ARIANE_CONFIG?.prefix ?? 'ar';

/** Map inverse tag → nom de composant, construite à partir du préfixe résolu. */
const TAG_TO_COMPONENT: Record<string, string> = Object.fromEntries(
    Object.keys(COMPONENT_DEFS).map((name) => [`${prefix}-${name}`, name]),
);

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
    const componentName = TAG_TO_COMPONENT[tagName];
    if (loaded.has(tagName) || !componentName) return;

    // Marque comme "en cours" immédiatement pour éviter les appels parallèles
    loaded.add(tagName);

    try {
        const componentModule = await COMPONENT_DEFS[componentName]();
        // Le module peut exporter d'autres classes utilitaires (ex. `ArAlertConfig`) en plus
        // de l'élément lui-même : on prend le premier export qui est un constructeur de
        // HTMLElement, pas simplement le premier export nommé.
        const ExportedClass = Object.values(componentModule).find(
            (value): value is CustomElementConstructor =>
                typeof value === 'function' && value.prototype instanceof HTMLElement,
        );

        if (!ExportedClass) {
            throw new Error(`No HTMLElement constructor exported for component "${componentName}"`);
        }

        if (!customElements.get(tagName)) {
            customElements.define(tagName, ExportedClass);
        }

        // Attend que le custom element soit effectivement enregistré dans la registry
        // (le module peut définir l'élément de façon asynchrone dans certains cas)
        await customElements.whenDefined(tagName);

        // Rescanne tous les roots connus : les instances de ce composant
        // ont maintenant un shadowRoot et peuvent contenir d'autres composants
        rescanAllRoots();
    } catch (err) {
        console.error(`[ariane autoloader] Failed to load <${tagName}>:`, err);
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

export {};
