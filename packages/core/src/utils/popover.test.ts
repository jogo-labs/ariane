import { describe, expect, it, vi, afterEach } from 'vitest';
vi.mock('./warn.js', () => ({ warn: vi.fn() }));
import { Popover } from './popover.js';
import { warn } from './warn.js';
import { LitElement } from 'lit';

class TestHost extends LitElement {}
if (!customElements.get('ar-test-popover-host')) {
    customElements.define('ar-test-popover-host', TestHost);
}

describe('show() sans attach()', () => {
    afterEach(() => {
        document.querySelectorAll('ar-test-popover-host').forEach((el) => el.remove());
        vi.mocked(warn).mockClear();
    });

    it('utilise warn() plutôt que console.warn directement', async () => {
        const host = document.createElement('ar-test-popover-host') as TestHost;
        document.body.appendChild(host);
        const popover = new Popover(host);

        await popover.show();

        expect(warn).toHaveBeenCalledWith('Popover', 'show() called before attach()');
        host.remove();
    });
});
