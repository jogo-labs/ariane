/**
 * cem-types.ts
 *
 * Types TypeScript partagés pour travailler avec le Custom Elements Manifest (CEM).
 * Généré par `@custom-elements-manifest/analyzer` depuis les sources du package core.
 *
 * Ces types correspondent à la structure du fichier `custom-elements.json`.
 * Les champs `x-*` sont des extensions custom ajoutées via les plugins JSDoc dans cem.config.js.
 */

// ─── Membres d'un composant (propriétés, méthodes) ───────────────────────────

export interface CemMember {
    kind: string;
    name: string;
    attribute?: string;
    privacy?: string;
    static?: boolean;
    readonly?: boolean;
    reflects?: boolean;
    type?: { text: string };
    default?: string;
    description?: string;
}

// ─── Autres éléments d'API ────────────────────────────────────────────────────

export interface CemAttribute {
    name: string;
    type?: { text: string };
    description?: string;
    default?: string;
}

export interface CemEvent {
    name: string;
    type?: { text: string };
    description?: string;
}

export interface CemCssPart {
    name: string;
    description?: string;
}

export interface CemCssProperty {
    name: string;
    description?: string;
    default?: string;
}

export interface CemSlot {
    name: string;
    description?: string;
}

// ─── Déclaration complète d'un composant ─────────────────────────────────────

export interface CemDeclaration {
    kind: string;
    customElement?: boolean;
    tagName?: string;
    name: string;
    summary?: string;
    description?: string;
    members?: CemMember[];
    attributes?: CemAttribute[];
    events?: CemEvent[];
    cssParts?: CemCssPart[];
    cssProperties?: CemCssProperty[];
    slots?: CemSlot[];
    /** Extension JSDoc @display — contrôle le mode d'affichage de la page */
    'x-display'?: 'demo' | 'docs';
    /** Extension JSDoc @parent — tag name du composant parent */
    'x-parent'?: string;
}

// ─── Contrôles du playground ──────────────────────────────────────────────────

/** Contrôle généré depuis un membre CEM pour le playground interactif. */
export interface CemControl {
    attribute: string;
    description?: string;
    controlType: 'select' | 'checkbox' | 'text' | 'number';
    options: string[];
    default?: string;
    addDefault?: boolean;
}

// ─── Helpers manifest ────────────────────────────────────────────────────────

/** Extrait toutes les déclarations de custom elements depuis un manifest CEM. */
export function getCustomElements(manifest: {
    modules?: { declarations?: CemDeclaration[] }[];
}): CemDeclaration[] {
    return (manifest.modules ?? [])
        .flatMap((m) => m.declarations ?? [])
        .filter((d) => d.kind === 'class' && d.customElement === true);
}

// ─── Helpers détection des contrôles playground ───────────────────────────────

/** Retourne true si le type CEM est une union de string literals : 'a' | 'b' | … */
export function isStringUnion(typeText: string): boolean {
    const clean = typeText.replace(/\s*\|\s*(undefined|null)/g, '').trim();
    const parts = clean.split(/\s*\|\s*/);
    return parts.length > 1 && parts.every((p) => /^['"][^'"]+['"]$/.test(p));
}

/** Extrait les valeurs d'une union de string literals. */
export function getOptions(typeText: string): string[] {
    return typeText
        .replace(/\s*\|\s*(undefined|null)/g, '')
        .split(/\s*\|\s*/)
        .map((p) => p.replace(/^['"]|['"]$/g, ''));
}

/** Retourne true si le type contient `undefined` (→ option "Par défaut" dans le select). */
export function hasUndefined(typeText: string): boolean {
    return /\bundefined\b/.test(typeText);
}

/**
 * Construit le tableau de contrôles playground depuis les membres CEM d'un composant.
 * Filtre les membres privés, protected, readonly et ceux sans attribut HTML.
 */
export function buildControls(members: CemMember[]): CemControl[] {
    return members
        .filter(
            (m) =>
                m.kind === 'field' &&
                m.privacy !== 'private' &&
                m.privacy !== 'protected' &&
                m.attribute &&
                !m.readonly,
        )
        .map((m) => {
            const typeText = m.type?.text ?? '';
            const stringUnion = isStringUnion(typeText);
            return {
                attribute: m.attribute as string,
                description: m.description,
                default: m.default,
                controlType: stringUnion
                    ? ('select' as const)
                    : typeText === 'boolean'
                      ? ('checkbox' as const)
                      : typeText === 'number' || typeText === 'number | undefined'
                        ? ('number' as const)
                        : ('text' as const),
                options: stringUnion ? getOptions(typeText) : [],
                addDefault: stringUnion && hasUndefined(typeText),
            };
        });
}
