import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

interface HeaderRule {
    source: string;
    has?: { type: string; key?: string; value?: string | { eq?: string } }[];
    headers: { key: string; value: string }[];
}

const config = JSON.parse(
    readFileSync(fileURLToPath(new URL('../../../../vercel.json', import.meta.url)), 'utf8'),
) as { headers?: HeaderRule[] };

const NEXT_HOST = 'next.ariane-ui.com';
const noindexRules = (config.headers ?? []).filter((rule) =>
    rule.headers.some((h) => h.key.toLowerCase() === 'x-robots-tag' && /noindex/i.test(h.value)),
);

describe('vercel.json — noindex du domaine de dev', () => {
    it('pose X-Robots-Tag noindex sur next.ariane-ui.com', () => {
        const forNext = noindexRules.filter((rule) =>
            rule.has?.some(
                (cond) =>
                    cond.type === 'host' &&
                    (cond.value === NEXT_HOST ||
                        (typeof cond.value === 'object' && cond.value.eq === NEXT_HOST)),
            ),
        );
        expect(forNext).toHaveLength(1);
        expect(forNext[0]?.source).toBe('/(.*)');
    });

    it("n'applique jamais noindex sans condition d'hôte (la production reste indexable)", () => {
        for (const rule of noindexRules) {
            expect(rule.has?.some((cond) => cond.type === 'host')).toBe(true);
        }
    });

    it("la condition d'hôte est une égalité stricte (le point d'une regex matcherait n'importe quel caractère)", () => {
        for (const rule of noindexRules) {
            const hostConditions = (rule.has ?? []).filter((cond) => cond.type === 'host');
            for (const cond of hostConditions) {
                expect(typeof cond.value === 'object' && cond.value.eq).toBe(NEXT_HOST);
            }
        }
    });
});
