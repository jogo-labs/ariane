export type NavigationState = 'idle' | 'current' | 'completed';

export type NavigationMode = 'create' | 'edit';

export interface NavigationNode {
    path: string;
    label: string;
    href?: string;

    parent?: NavigationNode;
    children: NavigationNode[];

    state: NavigationState;
}
