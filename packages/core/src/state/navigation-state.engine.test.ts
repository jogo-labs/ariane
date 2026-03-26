import { describe, expect, it } from 'vitest';
import { type NavigationNode } from '../types/navigation-nodes.js';
import { computeNavigationStates } from './navigation-state.engine.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeNode(path: string, parent?: NavigationNode): NavigationNode {
    const node: NavigationNode = { path, state: 'idle', children: [], parent };
    if (parent) parent.children.push(node);
    return node;
}

function states(nodes: NavigationNode[]) {
    return nodes.map((n) => n.state);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('computeNavigationStates', () => {
    it('marque le noeud courant à "current" quand le path correspond', () => {
        const a = makeNode('/a');
        const b = makeNode('/b');
        const c = makeNode('/c');

        computeNavigationStates([a, b, c], '/b');

        expect(states([a, b, c])).toEqual(['completed', 'current', 'idle']);
    });

    it('marque tous les noeuds avant le courant à "completed"', () => {
        const nodes = [makeNode('/a'), makeNode('/b'), makeNode('/c'), makeNode('/d')];

        computeNavigationStates(nodes, '/c');

        expect(states(nodes)).toEqual(['completed', 'completed', 'current', 'idle']);
    });

    it('utilise le premier noeud racine comme fallback si currentPath ne correspond à rien', () => {
        const a = makeNode('/a');
        const b = makeNode('/b');

        computeNavigationStates([a, b], '/unknown');

        expect(a.state).toBe('current');
        expect(b.state).toBe('idle');
    });

    it('utilise le premier noeud racine comme fallback si currentPath est vide', () => {
        const a = makeNode('/a');
        const b = makeNode('/b');

        computeNavigationStates([a, b], '');

        expect(a.state).toBe('current');
    });

    it('ne fait rien si ordered est vide', () => {
        expect(() => computeNavigationStates([], '/a')).not.toThrow();
    });

    it('délègue au premier enfant si le noeud résolu a des enfants', () => {
        const parent = makeNode('/parent');
        const child1 = makeNode('/child1', parent);
        const child2 = makeNode('/child2', parent);

        computeNavigationStates([parent, child1, child2], '/parent');

        // Le parent a des enfants → délègue à child1
        expect(parent.state).toBe('completed');
        expect(child1.state).toBe('current');
        expect(child2.state).toBe('idle');
    });

    it('délègue au premier enfant même pour le fallback', () => {
        const parent = makeNode('/parent');
        const child = makeNode('/child', parent);

        computeNavigationStates([parent, child], '/unknown');

        expect(parent.state).toBe('completed');
        expect(child.state).toBe('current');
    });

    it('réinitialise tous les états à "idle" avant de calculer', () => {
        const a = makeNode('/a');
        const b = makeNode('/b');
        a.state = 'current';
        b.state = 'completed';

        computeNavigationStates([a, b], '/b');

        expect(states([a, b])).toEqual(['completed', 'current']);
    });
});
