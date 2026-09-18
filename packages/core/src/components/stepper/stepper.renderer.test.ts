import { describe, it, expect, vi } from 'vitest';
import { pushItemRenderState } from './stepper.renderer.js';
import type { NavigationNode } from '../../types/navigation-nodes.js';
import type { ArStepperItem, ItemRenderState } from '../stepper-item/stepper-item.js';

function fakeItem(): { item: ArStepperItem; setRenderState: ReturnType<typeof vi.fn> } {
    const setRenderState = vi.fn();
    return { item: { setRenderState } as unknown as ArStepperItem, setRenderState };
}

function fakeNode(overrides: Partial<NavigationNode> = {}): NavigationNode {
    const { item } = fakeItem();
    return {
        path: 'a',
        label: 'A',
        item,
        children: [],
        state: 'idle',
        ...overrides,
    };
}

const stepLabel = (order: number, isSubstep: boolean): string =>
    `${isSubstep ? 'sous-' : ''}étape ${order}:`;

describe('pushItemRenderState', () => {
    it('mode create : étape complétée devient un lien (isLink: true)', () => {
        const { item, setRenderState } = fakeItem();
        const step: NavigationNode = { ...fakeNode(), item, state: 'completed' };

        pushItemRenderState([step], 'create', stepLabel);

        expect(setRenderState).toHaveBeenCalledWith({
            bulletState: 'completed',
            isSubstep: false,
            isLink: true,
            showSubsteps: false,
            srLabel: 'étape 1:',
        } satisfies ItemRenderState);
    });

    it('étape courante : jamais un lien, showSubsteps true si elle a des enfants', () => {
        const { item: subItem, setRenderState: setSubRenderState } = fakeItem();
        const sub: NavigationNode = { ...fakeNode(), item: subItem, path: 'a-1', state: 'idle' };
        const { item, setRenderState } = fakeItem();
        const step: NavigationNode = {
            ...fakeNode(),
            item,
            state: 'current',
            children: [sub],
        };
        sub.parent = step;

        pushItemRenderState([step], 'create', stepLabel);

        expect(setRenderState).toHaveBeenCalledWith({
            bulletState: 'current',
            isSubstep: false,
            isLink: false,
            showSubsteps: true,
            srLabel: 'étape 1:',
        } satisfies ItemRenderState);
        expect(setSubRenderState).toHaveBeenCalledWith({
            bulletState: 'default',
            isSubstep: true,
            isLink: false,
            showSubsteps: false,
            srLabel: 'sous-étape 1:',
        } satisfies ItemRenderState);
    });

    it('mode edit : sous-étape non courante devient un lien même si non complétée', () => {
        const { item: subItem, setRenderState: setSubRenderState } = fakeItem();
        const sub: NavigationNode = { ...fakeNode(), item: subItem, path: 'a-1', state: 'idle' };
        const { item } = fakeItem();
        const step: NavigationNode = { ...fakeNode(), item, state: 'idle', children: [sub] };
        sub.parent = step;

        pushItemRenderState([step], 'edit', stepLabel);

        expect(setSubRenderState).toHaveBeenCalledWith(expect.objectContaining({ isLink: true }));
    });
});
