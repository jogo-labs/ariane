import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { discoverPages } from './discover-pages.mjs';

const routes = discoverPages();

test.describe('a11y — pages du site de doc (axe-core)', () => {
    for (const route of routes) {
        test(`${route} ne remonte aucune violation`, async ({ page }) => {
            await page.goto(route);
            await page.waitForLoadState('networkidle');

            const results = await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
                .analyze();

            const summary = results.violations.map(
                (v) =>
                    `[${v.impact}] ${v.id} (${v.nodes.length} élément(s)) — ${v.help}\n` +
                    v.nodes.map((n) => `    ${n.target.join(' ')}`).join('\n'),
            );

            expect(summary, summary.join('\n\n')).toEqual([]);
        });
    }
});
