import { describe, expect, it, vi } from 'vitest';
import { emitEvent } from './emit-event.js';

describe('emitEvent', () => {
    it('dispatch un CustomEvent bubbles et composed sur l hôte', () => {
        const host = document.createElement('div');
        document.body.appendChild(host);
        const handler = vi.fn();
        host.addEventListener('my-event', handler);
        emitEvent(host, 'my-event');
        expect(handler).toHaveBeenCalledOnce();
        const event = handler.mock.calls[0][0] as CustomEvent;
        expect(event.bubbles).toBe(true);
        expect(event.composed).toBe(true);
        host.remove();
    });

    it('non annulable par défaut, annulable sur demande', () => {
        const host = document.createElement('div');
        expect(emitEvent(host, 'a').cancelable).toBe(false);
        expect(emitEvent(host, 'b', { cancelable: false }).cancelable).toBe(false);
        expect(emitEvent(host, 'c', { cancelable: true }).cancelable).toBe(true);
    });

    it('detail.id vaut host.id tel quel quand présent', () => {
        const host = document.createElement('div');
        host.id = 'mon-id';
        expect(emitEvent(host, 'e').detail).toStrictEqual({ id: 'mon-id' });
    });

    it('detail.id vaut undefined (clé présente) quand host.id est vide', () => {
        const host = document.createElement('div');
        expect(emitEvent(host, 'e').detail).toStrictEqual({ id: undefined });
    });

    it('fusionne le detail propre à l événement après id', () => {
        const host = document.createElement('div');
        host.id = 'x';
        const event = emitEvent(host, 'e', { detail: { from: 1, to: 2 } });
        expect(event.detail).toStrictEqual({ id: 'x', from: 1, to: 2 });
        expect(Object.keys(event.detail)).toEqual(['id', 'from', 'to']);
    });

    it('retourne l événement dispatché (defaultPrevented lisible)', () => {
        const host = document.createElement('div');
        host.addEventListener('e', (ev) => ev.preventDefault());
        expect(emitEvent(host, 'e', { cancelable: true }).defaultPrevented).toBe(true);
    });
});
