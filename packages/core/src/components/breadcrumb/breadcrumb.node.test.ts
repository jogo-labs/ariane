// @vitest-environment node
import { describe, expect, it } from 'vitest';

describe('ar-breadcrumb sans DOM (Node)', () => {
    it("s'importe sans window ni document", async () => {
        expect(typeof window).toBe('undefined');

        await expect(import('./breadcrumb.js')).resolves.toHaveProperty('ArBreadcrumb');
    });

    it("n'accède à window.matchMedia qu'à l'usage : mobileQuery vaut null sans window", async () => {
        const { ArBreadcrumb } = await import('./breadcrumb.js');

        expect(ArBreadcrumb.mobileQuery).toBeNull();
    });
});
