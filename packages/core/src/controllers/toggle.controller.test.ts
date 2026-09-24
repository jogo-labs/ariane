import { LitElement } from 'lit';
import { property } from 'lit/decorators.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fixture, waitForUpdate } from '../test-utils.js';
import { ToggleController } from './toggle.controller.js';
import { emitToggleEvent } from '../utils/toggle-events.js';

class TestToggleHost extends LitElement {
    @property({ type: Boolean }) open = false;

    readonly onShowSpy = vi.fn();
    readonly onHideSpy = vi.fn();

    readonly toggle = new ToggleController(this, {
        eventPrefix: 'ar-test',
        onShow: () => {
            this.onShowSpy();
            emitToggleEvent(this, 'ar-test-shown', { cancelable: false });
        },
        onHide: () => {
            this.onHideSpy();
            emitToggleEvent(this, 'ar-test-hidden', { cancelable: false });
        },
    });
}
if (!customElements.get('test-toggle-host')) {
    customElements.define('test-toggle-host', TestToggleHost);
}

class TestToggleHostSkipInitial extends LitElement {
    @property({ type: Boolean }) open = false;
    readonly onShowSpy = vi.fn();
    readonly onHideSpy = vi.fn();
    readonly toggle = new ToggleController(this, {
        eventPrefix: 'ar-test',
        onShow: () => this.onShowSpy(),
        onHide: () => this.onHideSpy(),
        skipInitialTransition: true,
    });
}
if (!customElements.get('test-toggle-host-skip-initial')) {
    customElements.define('test-toggle-host-skip-initial', TestToggleHostSkipInitial);
}

class TestToggleHostGated extends LitElement {
    @property({ type: Boolean }) open = false;
    gateOpen = true;
    readonly onShowSpy = vi.fn();
    readonly onHideSpy = vi.fn();
    readonly toggle = new ToggleController(this, {
        eventPrefix: 'ar-test',
        onShow: () => this.onShowSpy(),
        onHide: () => this.onHideSpy(),
        shouldToggle: () => this.gateOpen,
    });
}
if (!customElements.get('test-toggle-host-gated')) {
    customElements.define('test-toggle-host-gated', TestToggleHostGated);
}

declare global {
    interface HTMLElementTagNameMap {
        'test-toggle-host': TestToggleHost;
        'test-toggle-host-skip-initial': TestToggleHostSkipInitial;
        'test-toggle-host-gated': TestToggleHostGated;
    }
}

describe('ToggleController', () => {
    let el: TestToggleHost;
    afterEach(() => el?.remove());

    it('appelle onShow quand open passe à true', async () => {
        el = await fixture('<test-toggle-host></test-toggle-host>');
        el.open = true;
        await waitForUpdate(el);
        await waitForUpdate(el);
        expect(el.onShowSpy).toHaveBeenCalledOnce();
    });

    it('appelle onHide quand open passe à false', async () => {
        el = await fixture('<test-toggle-host open></test-toggle-host>');
        await waitForUpdate(el);
        el.open = false;
        await waitForUpdate(el);
        await waitForUpdate(el);
        expect(el.onHideSpy).toHaveBeenCalledOnce();
    });

    it("émet ar-test-show avant d'appeler onShow", async () => {
        el = await fixture('<test-toggle-host></test-toggle-host>');
        const handler = vi.fn();
        el.addEventListener('ar-test-show', handler);
        el.open = true;
        await waitForUpdate(el);
        await waitForUpdate(el);
        expect(handler).toHaveBeenCalledOnce();
        expect(el.onShowSpy).toHaveBeenCalledOnce();
    });

    it("annule l'ouverture et émet ar-test-show-prevented si ar-test-show est preventDefault()", async () => {
        el = await fixture('<test-toggle-host></test-toggle-host>');
        el.addEventListener('ar-test-show', (e) => e.preventDefault());
        const preventedHandler = vi.fn();
        el.addEventListener('ar-test-show-prevented', preventedHandler);
        el.open = true;
        await waitForUpdate(el);
        await waitForUpdate(el);
        expect(el.open).toBe(false);
        expect(el.onShowSpy).not.toHaveBeenCalled();
        expect(preventedHandler).toHaveBeenCalledOnce();
    });

    it("ar-test-show-prevented n'est pas cancelable", async () => {
        el = await fixture('<test-toggle-host></test-toggle-host>');
        el.addEventListener('ar-test-show', (e) => e.preventDefault());
        let capturedEvent: CustomEvent | undefined;
        el.addEventListener('ar-test-show-prevented', (e) => {
            capturedEvent = e as CustomEvent;
        });
        el.open = true;
        await waitForUpdate(el);
        await waitForUpdate(el);
        expect(capturedEvent?.cancelable).toBe(false);
    });

    it('ne réémet pas ar-test-hide/-hidden après un show annulé (pas de cycle redondant)', async () => {
        el = await fixture('<test-toggle-host></test-toggle-host>');
        el.addEventListener('ar-test-show', (e) => e.preventDefault());
        const hideHandler = vi.fn();
        const hiddenHandler = vi.fn();
        el.addEventListener('ar-test-hide', hideHandler);
        el.addEventListener('ar-test-hidden', hiddenHandler);
        el.open = true;
        await waitForUpdate(el);
        await waitForUpdate(el);
        expect(hideHandler).not.toHaveBeenCalled();
        expect(hiddenHandler).not.toHaveBeenCalled();
        expect(el.onHideSpy).not.toHaveBeenCalled();
    });

    it('annule la fermeture et émet ar-test-hide-prevented si ar-test-hide est preventDefault()', async () => {
        el = await fixture('<test-toggle-host open></test-toggle-host>');
        await waitForUpdate(el);
        el.addEventListener('ar-test-hide', (e) => e.preventDefault());
        const preventedHandler = vi.fn();
        el.addEventListener('ar-test-hide-prevented', preventedHandler);
        el.open = false;
        await waitForUpdate(el);
        await waitForUpdate(el);
        expect(el.open).toBe(true);
        expect(el.onHideSpy).not.toHaveBeenCalled();
        expect(preventedHandler).toHaveBeenCalledOnce();
    });

    it('ne réémet pas ar-test-show/-shown après un hide annulé (pas de cycle redondant)', async () => {
        el = await fixture('<test-toggle-host open></test-toggle-host>');
        await waitForUpdate(el);
        el.onShowSpy.mockClear(); // fixture(open) a déjà appelé onShow une fois à la création
        el.addEventListener('ar-test-hide', (e) => e.preventDefault());
        const showHandler = vi.fn();
        const shownHandler = vi.fn();
        el.addEventListener('ar-test-show', showHandler);
        el.addEventListener('ar-test-shown', shownHandler);
        el.open = false;
        await waitForUpdate(el);
        await waitForUpdate(el);
        expect(showHandler).not.toHaveBeenCalled();
        expect(shownHandler).not.toHaveBeenCalled();
        expect(el.onShowSpy).not.toHaveBeenCalled();
    });

    it("émet detail.id sur ar-test-show avec l'id de l'hôte", async () => {
        el = await fixture('<test-toggle-host id="mon-host"></test-toggle-host>');
        let detail: { id?: string } | undefined;
        el.addEventListener('ar-test-show', (e) => {
            detail = (e as CustomEvent).detail;
        });
        el.open = true;
        await waitForUpdate(el);
        await waitForUpdate(el);
        expect(detail).toEqual({ id: 'mon-host' });
    });

    it('ar-test-show/-hide sont cancelable, ar-test-shown/-hidden non', async () => {
        el = await fixture('<test-toggle-host></test-toggle-host>');
        let showEvent: CustomEvent | undefined;
        let shownEvent: CustomEvent | undefined;
        el.addEventListener('ar-test-show', (e) => {
            showEvent = e as CustomEvent;
        });
        el.addEventListener('ar-test-shown', (e) => {
            shownEvent = e as CustomEvent;
        });
        el.open = true;
        await waitForUpdate(el);
        await waitForUpdate(el);
        expect(showEvent?.cancelable).toBe(true);
        expect(shownEvent?.cancelable).toBe(false);
    });
});

describe('ToggleController — skipInitialTransition', () => {
    let el: TestToggleHostSkipInitial;
    afterEach(() => el?.remove());

    it("n'appelle pas onShow si open=true dès la création (avant la 1ère connexion)", async () => {
        el = document.createElement('test-toggle-host-skip-initial') as TestToggleHostSkipInitial;
        el.open = true;
        document.body.appendChild(el);
        await waitForUpdate(el);
        await waitForUpdate(el);
        expect(el.onShowSpy).not.toHaveBeenCalled();
        expect(el.open).toBe(true);
    });

    it('appelle onShow pour un toggle ultérieur (skip uniquement le tout premier cycle)', async () => {
        el = await fixture('<test-toggle-host-skip-initial></test-toggle-host-skip-initial>');
        el.open = true;
        await waitForUpdate(el);
        await waitForUpdate(el);
        expect(el.onShowSpy).toHaveBeenCalledOnce();
    });
});

describe('ToggleController — shouldToggle', () => {
    let el: TestToggleHostGated;
    afterEach(() => el?.remove());

    it("n'appelle pas onShow si shouldToggle() retourne false", async () => {
        el = await fixture('<test-toggle-host-gated></test-toggle-host-gated>');
        el.gateOpen = false;
        el.open = true;
        await waitForUpdate(el);
        await waitForUpdate(el);
        expect(el.onShowSpy).not.toHaveBeenCalled();
    });

    it('appelle onShow si shouldToggle() retourne true', async () => {
        el = await fixture('<test-toggle-host-gated></test-toggle-host-gated>');
        el.gateOpen = true;
        el.open = true;
        await waitForUpdate(el);
        await waitForUpdate(el);
        expect(el.onShowSpy).toHaveBeenCalledOnce();
    });
});
