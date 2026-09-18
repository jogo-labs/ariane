import type { ArStepperItem } from '../components/stepper-item/stepper-item.js';

export type NavigationState = 'idle' | 'current' | 'completed';

export type NavigationMode = 'create' | 'edit';

export interface NavigationNode {
    path: string;
    label: string;
    href?: string | undefined;
    item: ArStepperItem;

    parent?: NavigationNode;
    children: NavigationNode[];

    state: NavigationState;
}
