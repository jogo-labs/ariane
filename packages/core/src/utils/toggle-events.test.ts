import { describe, expect, it, vi } from 'vitest';
import { emitToggleEvent } from './toggle-events.js';

describe('emitToggleEvent', () => {
    it('dispatch un CustomEvent avec bubbles/composed true', () => {
        const host = document.createElement('div');
        document.body.appendChild(host);
        const handler = vi.fn();
        host.addEventListener('my-event', handler);
        emitToggleEvent(host, 'my-event', { cancelable: true });
        expect(handler).toHaveBeenCalledOnce();
        const event = handler.mock.calls[0][0] as CustomEvent;
        expect(event.bubbles).toBe(true);
        expect(event.composed).toBe(true);
        host.remove();
    });

    it('applique cancelable depuis les options', () => {
        const host = document.createElement('div');
        const cancelableEvent = emitToggleEvent(host, 'my-event', { cancelable: true });
        expect(cancelableEvent.cancelable).toBe(true);
        const nonCancelableEvent = emitToggleEvent(host, 'my-event-2', { cancelable: false });
        expect(nonCancelableEvent.cancelable).toBe(false);
    });

    it('detail.id reflète host.id quand présent', () => {
        const host = document.createElement('div');
        host.id = 'mon-id';
        const event = emitToggleEvent(host, 'my-event', { cancelable: false });
        expect(event.detail).toEqual({ id: 'mon-id' });
    });

    it('detail.id vaut undefined quand host.id est vide', () => {
        const host = document.createElement('div');
        const event = emitToggleEvent(host, 'my-event', { cancelable: false });
        expect(event.detail).toEqual({ id: undefined });
    });

    it('retourne le CustomEvent dispatché (pour vérifier defaultPrevented)', () => {
        const host = document.createElement('div');
        host.addEventListener('my-event', (e) => e.preventDefault());
        const event = emitToggleEvent(host, 'my-event', { cancelable: true });
        expect(event.defaultPrevented).toBe(true);
    });
});
