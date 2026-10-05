---
name: ariane-write-tests
description: Helpers de test maison et commandes spécifiques au projet Ariane. À utiliser quand on écrit des tests Vitest ou browser (WTR) pour un composant ar-*.
---

# Tests Ariane

## Helpers maison (copier dans chaque `.test.ts`)

Requis par `lint-staged --max-warnings=0` — évite les non-null assertions `!` :

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

async function fixture<T extends HTMLElement>(html: string): Promise<T> {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const el = template.content.firstElementChild as T;
    document.body.appendChild(el);
    await (el as any).updateComplete;
    await (el as any).updateComplete;
    return el;
}

async function waitForUpdate(el: HTMLElement): Promise<void> {
    await (el as any).updateComplete;
    await (el as any).updateComplete;
}

function getPart(el: Element, name: string): Element | null {
    return el.shadowRoot?.querySelector(`[part="${name}"]`) ?? null;
}

describe('ArMyComponent', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });
});
```

## Browser / a11y tests

Fichiers nommés `*.browser.test.ts` ou `*.a11y.test.ts` :

```typescript
import { expect, fixture, html } from '@open-wc/testing';
import { checkAccessibility } from '../../test-utils.js';

it('passe axe-core', async () => {
    const el = await fixture(html`<ar-alert>Message</ar-alert>`);
    await checkAccessibility(el);
});
```

## Commandes

```bash
npm run test             # Vitest passe unique (racine)
npm run test:watch       # Vitest interactif (packages/core)
npm run test:coverage    # Rapport de couverture
npm run test:browser     # WTR + Playwright + axe-core
npm run test:all         # Vitest + WTR
```
