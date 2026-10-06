import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Les démos reçoivent le thème neutre du starter-kit (`.doc-demo`), le chrome du site garde
 * ariane.css. Une sonde `ar-alert` est posée dans et hors d'un conteneur pour comparer.
 */
async function probeColors(page: Page) {
    await page.waitForFunction(() => customElements.get('ar-alert'));
    return page.evaluate(() => {
        const mk = (parent: Element) => {
            const el = document.createElement('ar-alert');
            el.textContent = 'sonde';
            parent.appendChild(el);
            return getComputedStyle(el).getPropertyValue('--ar-color-primary-50').trim();
        };
        const demo = document.querySelector('.doc-demo');
        return { inside: demo ? mk(demo) : null, outside: mk(document.body) };
    });
}

test.describe('thème des démos (.doc-demo)', () => {
    for (const scheme of ['light', 'dark'] as const) {
        test(`page composant, ${scheme} : la preview a un thème différent du chrome`, async ({
            page,
        }) => {
            await page.emulateMedia({ colorScheme: scheme });
            await page.goto('/components/alert/');
            await page.waitForLoadState('networkidle');
            const { inside, outside } = await probeColors(page);
            expect(inside).not.toBeNull();
            expect(inside).not.toBe(outside);
        });
    }

    test("page d'accueil : les démos sont dans un conteneur .doc-demo", async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        expect(await page.locator('.try-preview-stage.doc-demo').count()).toBeGreaterThan(0);
    });
});
