import { afterEach, describe, expect, it, vi } from 'vitest';
import { NavigationTreeController } from './navigation-tree.controller.js';
import type { ArStepperItem } from '../components/stepper-item/stepper-item.js';

// ─── Mock host ────────────────────────────────────────────────────────────────

function makeHost() {
    return {
        addController: vi.fn(),
        requestUpdate: vi.fn(),
    };
}

// ─── Mock ArStepperItem ───────────────────────────────────────────────────────

function makeItem(
    path: string,
    opts: {
        label?: string;
        href?: string;
        parent?: HTMLElement;
    } = {},
): ArStepperItem {
    const el = document.createElement('div') as unknown as ArStepperItem;
    el.path = path;
    el.label = opts.label ?? path;
    el.href = opts.href ?? '';

    // compareDocumentPosition : simuler un ordre séquentiel via position dans le DOM
    if (opts.parent) {
        opts.parent.appendChild(el as unknown as HTMLElement);
    } else {
        document.body.appendChild(el as unknown as HTMLElement);
    }

    return el;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('NavigationTreeController', () => {
    afterEach(() => {
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    it('démarre avec un arbre vide', () => {
        const host = makeHost();
        const ctrl = new NavigationTreeController(host);
        expect(ctrl.tree).toEqual([]);
        expect(ctrl.currentNode).toBeUndefined();
    });

    it('currentNode retourne undefined si currentPath est vide', () => {
        const host = makeHost();
        const ctrl = new NavigationTreeController(host);
        expect(ctrl.currentNode).toBeUndefined();
    });

    it('buildFromItems() construit un arbre plat', () => {
        const host = makeHost();
        const ctrl = new NavigationTreeController(host);

        const a = makeItem('/a');
        const b = makeItem('/b');
        const c = makeItem('/c');

        ctrl.buildFromItems([a, b, c]);

        expect(ctrl.tree).toHaveLength(3);
        expect(ctrl.tree.map((n) => n.path)).toEqual(['/a', '/b', '/c']);
    });

    it('buildFromItems() appelle requestUpdate', () => {
        const host = makeHost();
        const ctrl = new NavigationTreeController(host);
        ctrl.buildFromItems([makeItem('/a')]);
        expect(host.requestUpdate).toHaveBeenCalledTimes(1);
    });

    it('setCurrentPath() met à jour le chemin courant et appelle requestUpdate', () => {
        const host = makeHost();
        const ctrl = new NavigationTreeController(host);
        ctrl.buildFromItems([makeItem('/a'), makeItem('/b')]);

        ctrl.setCurrentPath('/b');

        expect(ctrl.currentNode?.path).toBe('/b');
        expect(host.requestUpdate).toHaveBeenCalledTimes(2); // buildFromItems + setCurrentPath
    });

    it('setCurrentPath() ne fait rien si le path est identique', () => {
        const host = makeHost();
        const ctrl = new NavigationTreeController(host);
        ctrl.buildFromItems([makeItem('/a')]);
        ctrl.setCurrentPath('/a');

        const callsBefore = (host.requestUpdate as ReturnType<typeof vi.fn>).mock.calls.length;
        ctrl.setCurrentPath('/a');

        expect(host.requestUpdate).toHaveBeenCalledTimes(callsBefore);
    });

    it('avertit en cas de path dupliqué', () => {
        const host = makeHost();
        const ctrl = new NavigationTreeController(host);
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        ctrl.buildFromItems([makeItem('/dup'), makeItem('/dup')]);

        expect(spy).toHaveBeenCalledWith(expect.stringContaining('duplicate path'));
    });
});
