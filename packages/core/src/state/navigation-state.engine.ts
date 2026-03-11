import { type NavigationNode } from '../types/navigation-nodes.js';

export function computeNavigationStates(ordered: NavigationNode[], currentPath: string) {
    ordered.forEach((node) => {
        node.state = 'idle';
    });

    const matched = ordered.find((n) => n.path === currentPath);

    // Aucun match (currentPath vide ou inconnu) → premier noeud racine.
    // On cherche le premier noeud sans parent (= racine), pas juste ordered[0]
    // qui pourrait être un enfant si l'arbre est mal ordonné.
    const fallback = ordered.find((n) => !n.parent);

    const resolved = matched ?? fallback;
    if (!resolved) return;

    // Si le noeud résolu a des enfants → déléguer au premier enfant.
    // S'applique aussi bien au match qu'au fallback.
    const current = resolved.children.length > 0 ? resolved.children[0] : resolved;

    current.state = 'current';

    const index = ordered.indexOf(current);

    for (let i = 0; i < index; i++) {
        ordered[i].state = 'completed';
    }
}
