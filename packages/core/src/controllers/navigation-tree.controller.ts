import { type ReactiveController, type ReactiveControllerHost } from 'lit';

import { type NavigationNode } from '../types/navigation-nodes.js';

import { type ArStepperItem } from '../components/stepper-item/stepper-item.js';

import { computeNavigationStates } from '../state/navigation-state.engine.js';

export class NavigationTreeController implements ReactiveController {
    private host: ReactiveControllerHost;

    private roots: NavigationNode[] = [];

    private ordered: NavigationNode[] = [];

    private nodeMap = new Map<string, NavigationNode>();

    private currentPath = '';

    constructor(host: ReactiveControllerHost) {
        this.host = host;

        host.addController(this);
    }

    hostConnected() {}

    get tree() {
        return this.roots;
    }

    get currentNode() {
        if (!this.currentPath) return undefined;

        return this.nodeMap.get(this.currentPath);
    }

    buildFromItems(items: ArStepperItem[]) {
        const sorted = [...items].sort((a, b) =>
            a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
        );

        const itemNodeMap = new Map<ArStepperItem, NavigationNode>();

        this.nodeMap.clear();

        sorted.forEach((item) => {
            if (this.nodeMap.has(item.path)) {
                console.warn(`[ar-stepper] duplicate path "${item.path}"`);
            }

            const node: NavigationNode = {
                path: item.path,
                label: item.label,
                href: item.href,

                children: [],
                state: 'idle',
            };

            itemNodeMap.set(item, node);

            this.nodeMap.set(node.path, node);
        });

        sorted.forEach((item) => {
            const parentItem = item.parentElement?.closest(
                'ar-stepper-item',
            ) as ArStepperItem | null;

            if (!parentItem) return;

            const node = itemNodeMap.get(item);

            const parentNode = itemNodeMap.get(parentItem);

            if (node && parentNode) {
                node.parent = parentNode;

                parentNode.children.push(node);
            }
        });

        this.roots = Array.from(itemNodeMap.values()).filter((n) => !n.parent);

        this.buildOrdered();

        computeNavigationStates(this.ordered, this.currentPath);

        this.host.requestUpdate();
    }

    setCurrentPath(path: string) {
        if (this.currentPath === path) return;

        this.currentPath = path;

        computeNavigationStates(this.ordered, this.currentPath);

        this.host.requestUpdate();
    }

    private buildOrdered() {
        const result: NavigationNode[] = [];

        const walk = (node: NavigationNode) => {
            result.push(node);

            node.children.forEach(walk);
        };

        this.roots.forEach(walk);

        this.ordered = result;
    }
}
