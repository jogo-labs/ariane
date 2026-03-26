import { afterEach, describe, expect, it, vi } from 'vitest';
import { DropdownController } from './dropdown.controller.js';

// ─── Mock host ────────────────────────────────────────────────────────────────

function makeHost() {
    const el = document.createElement('div');
    document.body.appendChild(el);
    return Object.assign(el, {
        addController: vi.fn(),
        requestUpdate: vi.fn(),
    });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DropdownController', () => {
    let host: ReturnType<typeof makeHost>;
    let ctrl: DropdownController;

    afterEach(() => {
        host?.remove();
        vi.restoreAllMocks();
    });

    it('démarre fermé', () => {
        host = makeHost();
        ctrl = new DropdownController(host);
        expect(ctrl.isOpen).toBe(false);
    });

    it('show() ouvre le dropdown', () => {
        host = makeHost();
        ctrl = new DropdownController(host);
        ctrl.show();
        expect(ctrl.isOpen).toBe(true);
        expect(host.requestUpdate).toHaveBeenCalledTimes(1);
    });

    it('show() ne fait rien si déjà ouvert', () => {
        host = makeHost();
        ctrl = new DropdownController(host);
        ctrl.show();
        ctrl.show();
        expect(host.requestUpdate).toHaveBeenCalledTimes(1);
    });

    it('hide() ferme le dropdown', () => {
        host = makeHost();
        ctrl = new DropdownController(host);
        ctrl.show();
        ctrl.hide();
        expect(ctrl.isOpen).toBe(false);
        expect(host.requestUpdate).toHaveBeenCalledTimes(2);
    });

    it('hide() ne fait rien si déjà fermé', () => {
        host = makeHost();
        ctrl = new DropdownController(host);
        ctrl.hide();
        expect(host.requestUpdate).not.toHaveBeenCalled();
    });

    it('toggle() ouvre si fermé, ferme si ouvert', () => {
        host = makeHost();
        ctrl = new DropdownController(host);
        ctrl.toggle();
        expect(ctrl.isOpen).toBe(true);
        ctrl.toggle();
        expect(ctrl.isOpen).toBe(false);
    });

    it('hostDisconnected() nettoie le listener même si ouvert', () => {
        host = makeHost();
        ctrl = new DropdownController(host);
        ctrl.show();
        ctrl.hostDisconnected();
        // Le listener a été retiré : un clic en dehors ne doit pas crasher
        expect(() => document.dispatchEvent(new MouseEvent('click'))).not.toThrow();
        expect(ctrl.isOpen).toBe(true); // hostDisconnected ne ferme pas, il nettoie
    });

    it('ferme le dropdown sur un clic en dehors du host (après rAF)', async () => {
        host = makeHost();
        ctrl = new DropdownController(host);
        ctrl.show();

        // Laisse passer le requestAnimationFrame
        await new Promise((r) => requestAnimationFrame(r));

        const outside = document.createElement('button');
        document.body.appendChild(outside);
        outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(ctrl.isOpen).toBe(false);
        outside.remove();
    });

    it("ne ferme pas le dropdown sur un clic à l'intérieur du host", async () => {
        host = makeHost();
        ctrl = new DropdownController(host);
        ctrl.show();

        await new Promise((r) => requestAnimationFrame(r));

        const inside = document.createElement('span');
        host.appendChild(inside);
        inside.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(ctrl.isOpen).toBe(true);
    });
});
