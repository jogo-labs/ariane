export type NavigationState = 'idle' | 'current' | 'completed';

export type NavigationMode = 'create' | 'edit';

export interface NavigationNode {
    path: string;
    label: string;
    href?: string | undefined;

    parent?: NavigationNode;
    children: NavigationNode[];

    state: NavigationState;
}
