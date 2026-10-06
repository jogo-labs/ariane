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

    // Le menu de thème du site (localStorage `ariane-theme` -> html[data-theme]) doit primer sur
    // la préférence de l'OS, démos comprises : on force le site à l'opposé de l'OS.
    for (const [site, os] of [
        ['dark', 'light'],
        ['light', 'dark'],
    ] as const) {
        test(`site ${site} sur OS ${os} : les démos héritent du color-scheme de la page`, async ({
            page,
        }) => {
            await page.addInitScript((mode) => localStorage.setItem('ariane-theme', mode), site);
            await page.emulateMedia({ colorScheme: os });
            await page.goto('/components/alert/');
            await page.waitForLoadState('networkidle');
            const schemes = await page.evaluate(() => ({
                demo: getComputedStyle(document.querySelector('.doc-demo')!).colorScheme,
                root: getComputedStyle(document.documentElement).colorScheme,
            }));
            expect(schemes.root).toBe(site);
            expect(schemes.demo).toBe(schemes.root);
        });
    }

    test("les tokens light-dark() des démos suivent le menu de thème, pas l'OS", async ({
        browser,
    }) => {
        const probeBackground = async (site: 'light' | 'dark') => {
            // OS identique pour les deux sites : seul le menu de thème peut faire varier le fond.
            const context = await browser.newContext({ colorScheme: 'light' });
            const page = await context.newPage();
            await page.addInitScript((mode) => localStorage.setItem('ariane-theme', mode), site);
            await page.goto('/components/alert/');
            await page.waitForLoadState('networkidle');
            const background = await page.evaluate(() => {
                const probe = document.createElement('div');
                probe.style.background = 'var(--ar-color-bg)';
                document.querySelector('.doc-demo')!.appendChild(probe);
                return getComputedStyle(probe).backgroundColor;
            });
            await context.close();
            return background;
        };
        expect(await probeBackground('dark')).not.toBe(await probeBackground('light'));
    });

    test("page d'accueil : les démos sont dans un conteneur .doc-demo", async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        expect(await page.locator('.try-preview-stage.doc-demo').count()).toBeGreaterThan(0);
    });
});
