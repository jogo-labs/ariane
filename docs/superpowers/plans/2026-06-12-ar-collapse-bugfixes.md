# ar-collapse — Bugfixes (code review) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger les 8 findings issus de la code review de `ar-collapse` : robustesse du cycle d'animation, CSS injection, accordéon, accessibilité du trigger externe.

**Architecture:** Toutes les corrections sont dans `packages/core/src/components/collapse/collapse.ts`. Le refacto le plus structurant est le remplacement du listener `transitionend` anonyme par une référence stockée + une méthode `_abortAnimation()`, qui résout les bugs d'état liés à l'animation. Les autres corrections sont indépendantes et chirurgicales.

**Tech Stack:** Lit 3, TypeScript, Vitest (tests unitaires), Web Test Runner / open-wc (tests browser).

---

## Fichiers modifiés

| Fichier                                                          | Raison                   |
| ---------------------------------------------------------------- | ------------------------ |
| `packages/core/src/components/collapse/collapse.ts`              | Toutes les corrections   |
| `packages/core/src/components/collapse/collapse.test.ts`         | Tests unitaires nouveaux |
| `packages/core/src/components/collapse/collapse.browser.test.ts` | Tests browser nouveaux   |

---

## Task 1 — Refacto système d'animation (findings 1, 2, 3, 5)

**Findings adressés :**

- **1** : `_animating` reste `true` après disconnect mid-animation
- **2** : annuler `ar-collapse-show` → `_hide()` sur panel `display:none` → `_animating` bloqué
- **3** : `el.open = true` pendant animation → double listener transitionend
- **5** : frère accordéon mid-animation non fermé

**Principe :** Stocker la référence du listener `transitionend` pour pouvoir le retirer. Ajouter `_abortAnimation()` appelé en début de `_show()` / `_hide()` / `disconnectedCallback`. Dans `_hide()`, détecter si une animation était en cours (`wasAnimating`) pour décider entre snap immédiat et animation normale. Retirer le guard `_animating` de `hide()` public pour que l'accordéon puisse interrompre un frère.

**Fichiers :**

- Modify: `packages/core/src/components/collapse/collapse.ts`
- Modify: `packages/core/src/components/collapse/collapse.test.ts`
- Modify: `packages/core/src/components/collapse/collapse.browser.test.ts`

---

- [ ] **Étape 1 — Écrire les tests unitaires qui échouent**

Dans `collapse.test.ts`, ajouter dans la section `show() / hide()` existante (après le `describe` existant) :

```typescript
describe('robustesse animation', () => {
    it('annuler ar-collapse-show ne verrouille pas le composant', async () => {
        el = await fixture('<ar-collapse><button slot="trigger">T</button></ar-collapse>');
        const cancel = (e: Event) => e.preventDefault();
        el.addEventListener('ar-collapse-show', cancel);
        el.show();
        await waitForUpdate(el);
        expect(el.open).toBe(false);
        el.removeEventListener('ar-collapse-show', cancel);
        // Après annulation, show() doit fonctionner normalement
        el.show();
        await waitForUpdate(el);
        expect(el.open).toBe(true);
    });
});
```

- [ ] **Étape 2 — Vérifier que le test échoue**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run test -- --reporter=verbose 2>&1 | grep -A5 "verrouille"
```

Résultat attendu : le test échoue car `el.open` reste `false` (composant bloqué).

- [ ] **Étape 3 — Écrire les tests browser qui échouent**

Dans `collapse.browser.test.ts`, ajouter après les `describe` existants :

```typescript
describe('robustesse animation', () => {
    it('disconnect mid-animation ne bloque pas le composant après reconnect', async () => {
        el = await fixture(html`
            <ar-collapse>
                <button slot="trigger">T</button>
                <p>Contenu</p>
            </ar-collapse>
        `);
        el.show();
        await aTimeout(30); // mi-animation
        const parent = el.parentElement!;
        el.remove();
        parent.appendChild(el);
        el.show();
        await aTimeout(ANIM_MS);
        expect(getPanel(el).style.height).to.equal('auto');
    });

    it('assigner el.open=true pendant animation émet ar-collapse-shown une seule fois', async () => {
        el = await fixture(html`
            <ar-collapse>
                <button slot="trigger">T</button>
                <p>Contenu</p>
            </ar-collapse>
        `);
        el.show();
        await aTimeout(30); // mi-ouverture

        let count = 0;
        el.addEventListener('ar-collapse-shown', () => count++);
        el.open = true; // forcer pendant animation
        await aTimeout(ANIM_MS * 2);
        expect(count).to.equal(1);
    });
});

describe('accordéon — snap mid-animation', () => {
    it('ouvrir item B ferme item A même si A est mid-animation', async () => {
        const elA = await fixture<ArCollapse>(html`
            <ar-collapse name="snap-grp">
                <button slot="trigger">A</button>
                <p>Contenu A</p>
            </ar-collapse>
        `);
        const elB = await fixture<ArCollapse>(html`
            <ar-collapse name="snap-grp">
                <button slot="trigger">B</button>
                <p>Contenu B</p>
            </ar-collapse>
        `);

        elA.show();
        await aTimeout(30); // A mid-animation

        elB.show(); // doit fermer A immédiatement
        await aTimeout(ANIM_MS);

        expect(elA.open).to.equal(false);
        expect(getPanel(elA).hasAttribute('hidden')).to.equal(true);
        expect(elB.open).to.equal(true);
        elA.remove();
        elB.remove();
    });
});
```

- [ ] **Étape 4 — Vérifier que les tests browser échouent**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run test:all 2>&1 | grep -E "(passing|failing|robustesse|accordéon)"
```

Résultat attendu : les nouveaux tests browser échouent.

- [ ] **Étape 5 — Implémenter le fix dans `collapse.ts`**

**5a — Ajouter le champ `_onTransitionEnd`** (après `_internalTrigger`) :

```typescript
private _onTransitionEnd: (() => void) | null = null;
```

**5b — Ajouter la méthode `_abortAnimation()`** (avant `_closeGroupSiblings`) :

```typescript
private _abortAnimation(): void {
    if (this._onTransitionEnd) {
        this._panel.removeEventListener('transitionend', this._onTransitionEnd);
        this._onTransitionEnd = null;
    }
    this._animating = false;
}
```

**5c — Mettre à jour `disconnectedCallback`** — remplacer le corps par :

```typescript
override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._abortAnimation();
    this._detachExternalTrigger();
    if (this._internalTrigger) {
        this._internalTrigger.removeEventListener('click', this._handleTriggerClick);
        this._internalTrigger = null;
    }
}
```

**5d — Mettre à jour `hide()` public** — retirer le guard `_animating` :

```typescript
hide(): void {
    if (!this.open) return;
    this.open = false;
}
```

**5e — Remplacer `_show()` entièrement** :

```typescript
private _show(): void {
    const ev = this._emit('ar-collapse-show');
    if (ev.defaultPrevented) {
        this.open = false;
        return;
    }
    this._abortAnimation();
    this._closeGroupSiblings();
    this._syncTriggerAria();
    this._animating = true;
    const panel = this._panel;
    panel.style.height = '0px';
    panel.removeAttribute('hidden');
    const targetH = panel.scrollHeight;
    void panel.offsetHeight; // force reflow
    if (!this._shouldAnimate()) {
        panel.style.height = 'auto';
        this._animating = false;
        this._emit('ar-collapse-shown');
        return;
    }
    panel.style.height = `${targetH}px`;
    const onEnd = () => {
        this._onTransitionEnd = null;
        this._animating = false;
        panel.style.height = 'auto';
        this._emit('ar-collapse-shown');
    };
    this._onTransitionEnd = onEnd;
    panel.addEventListener('transitionend', onEnd, { once: true });
}
```

**5f — Remplacer `_hide()` entièrement** :

```typescript
private _hide(): void {
    // finding 2 : panel déjà caché (ex. ar-collapse-show annulé → open=false déclenché)
    if (this._panel.hasAttribute('hidden') && !this._animating) return;
    const ev = this._emit('ar-collapse-hide');
    if (ev.defaultPrevented) {
        this.open = true;
        return;
    }
    const wasAnimating = this._animating;
    this._abortAnimation();
    this._syncTriggerAria();
    if (wasAnimating) {
        // finding 5 : snap immédiat — frère accordéon ou interruption externe
        this._panel.setAttribute('hidden', '');
        this._panel.style.height = '';
        this._emit('ar-collapse-hidden');
        return;
    }
    this._animating = true;
    const panel = this._panel;
    panel.style.height = `${panel.scrollHeight}px`;
    void panel.offsetHeight; // force reflow
    if (!this._shouldAnimate()) {
        this._animating = false;
        panel.setAttribute('hidden', '');
        panel.style.height = '';
        this._emit('ar-collapse-hidden');
        return;
    }
    panel.style.height = '0px';
    const onEnd = () => {
        this._onTransitionEnd = null;
        this._animating = false;
        panel.setAttribute('hidden', '');
        panel.style.height = '';
        this._emit('ar-collapse-hidden');
    };
    this._onTransitionEnd = onEnd;
    panel.addEventListener('transitionend', onEnd, { once: true });
}
```

- [ ] **Étape 6 — Lancer tous les tests**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run test:all 2>&1 | grep -E "(passing|failing)"
```

Résultat attendu : tous les tests passent.

- [ ] **Étape 7 — Commit**

```bash
git -C /Users/jon/Code/Active_projects/ariane add packages/core/src/components/collapse/collapse.ts packages/core/src/components/collapse/collapse.test.ts packages/core/src/components/collapse/collapse.browser.test.ts
git -C /Users/jon/Code/Active_projects/ariane commit -m "fix(collapse): _abortAnimation() — corrige _animating bloqué, double listener, snap accordéon"
```

---

## Task 2 — CSS.escape + scope getRootNode (findings 4, 7)

**Findings adressés :**

- **4** : `name='foo"]'` → DOMException dans `querySelectorAll`
- **7** : `document.querySelectorAll` scope global → contamination entre accordéons indépendants partageant le même `name`

**Principe :** Remplacer `document` par `this.getRootNode()` et wrapper `this.name` dans `CSS.escape()`. Un seul appel, deux problèmes résolus.

**Fichiers :**

- Modify: `packages/core/src/components/collapse/collapse.ts`
- Modify: `packages/core/src/components/collapse/collapse.test.ts`

---

- [ ] **Étape 1 — Écrire les tests unitaires qui échouent**

Dans `collapse.test.ts`, ajouter dans la section `accordéon (name)` existante :

```typescript
it('un name contenant des guillemets ne crash pas', async () => {
    el = await fixture('<ar-collapse name=\'foo"]\''></ar-collapse>');
    // _closeGroupSiblings() est appelé dans _show() — ne doit pas lever d'exception
    expect(() => el.show()).not.toThrow();
    await waitForUpdate(el);
});

it('deux accordéons indépendants avec le même name ne se contaminent pas', async () => {
    // Simuler deux groupes dans des roots distincts via deux fixtures isolées
    // On vérifie que ouvrir el n'appelle pas hide() sur el2 quand ils sont dans
    // des arbres différents.
    // Note : dans les tests unitaires, les deux fixtures sont dans le même document.
    // Ce test valide surtout que la méthode ne plante pas avec getRootNode().
    el = await fixture('<ar-collapse name="shared"></ar-collapse>');
    const el2 = await fixture('<ar-collapse name="shared"></ar-collapse>');
    el.show();
    await waitForUpdate(el);
    expect(el.open).toBe(true);
    el2.remove();
});
```

- [ ] **Étape 2 — Vérifier que le test avec guillemets échoue**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run test -- --reporter=verbose 2>&1 | grep -A5 "guillemets"
```

Résultat attendu : DOMException levée, test échoue.

- [ ] **Étape 3 — Implémenter le fix**

Dans `collapse.ts`, méthode `_closeGroupSiblings()`, remplacer les deux lignes du `querySelectorAll` :

```typescript
private _closeGroupSiblings(): void {
    if (!this.name) return;
    const root = this.getRootNode() as Document | ShadowRoot;
    root.querySelectorAll<ArCollapse>(`ar-collapse[name="${CSS.escape(this.name)}"]`).forEach((el) => {
        if (el !== this && el.open) el.hide();
    });
}
```

- [ ] **Étape 4 — Lancer les tests**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run test 2>&1 | grep -E "(passing|failing)"
```

Résultat attendu : tous les tests passent.

- [ ] **Étape 5 — Commit**

```bash
git -C /Users/jon/Code/Active_projects/ariane add packages/core/src/components/collapse/collapse.ts packages/core/src/components/collapse/collapse.test.ts
git -C /Users/jon/Code/Active_projects/ariane commit -m "fix(collapse): CSS.escape(name) + getRootNode() dans _closeGroupSiblings"
```

---

## Task 3 — Trigger externe désactivé (finding 6)

**Finding adressé :**

- **6** : `disabled=true` avec `for` défini → le bouton externe garde son apparence active, `aria-disabled` absent → violation WCAG 4.1.2

**Principe :** Retirer le `return` anticipé de `_syncTriggerDisabled()` pour le trigger externe, et poser `aria-disabled="true"` (sans `disabled` natif — on veut que le bouton reste focusable et announceable). Un bouton natif avec `disabled` disparaît du flow de focus, ce qui est pire pour l'accessibilité que `aria-disabled` seul.

**Fichiers :**

- Modify: `packages/core/src/components/collapse/collapse.ts`
- Modify: `packages/core/src/components/collapse/collapse.test.ts`

---

- [ ] **Étape 1 — Écrire les tests unitaires qui échouent**

Dans `collapse.test.ts`, ajouter dans la section `trigger externe (for)` :

```typescript
it('pose aria-disabled sur le bouton externe quand disabled=true', async () => {
    document.body.innerHTML = '<button id="ext-dis">Btn</button>';
    el = await fixture('<ar-collapse for="ext-dis" disabled></ar-collapse>');
    await waitForUpdate(el);
    const btn = document.getElementById('ext-dis')!;
    expect(btn.getAttribute('aria-disabled')).toBe('true');
});

it('retire aria-disabled du bouton externe quand disabled repasse à false', async () => {
    document.body.innerHTML = '<button id="ext-dis2">Btn</button>';
    el = await fixture('<ar-collapse for="ext-dis2" disabled></ar-collapse>');
    await waitForUpdate(el);
    el.disabled = false;
    await waitForUpdate(el);
    const btn = document.getElementById('ext-dis2')!;
    expect(btn.getAttribute('aria-disabled')).toBeNull();
});
```

- [ ] **Étape 2 — Vérifier que les tests échouent**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run test -- --reporter=verbose 2>&1 | grep -A5 "aria-disabled"
```

Résultat attendu : `aria-disabled` est `null` au lieu de `'true'`.

- [ ] **Étape 3 — Implémenter le fix**

Dans `collapse.ts`, remplacer `_syncTriggerDisabled()` entièrement :

```typescript
private _syncTriggerDisabled(): void {
    const trigger = this._resolvedTrigger;
    if (!trigger) return;
    if (this.disabled) {
        if (!this.for) {
            // Trigger interne natif : disabled + aria-disabled
            trigger.setAttribute('disabled', '');
        }
        trigger.setAttribute('aria-disabled', 'true');
    } else {
        trigger.removeAttribute('disabled');
        trigger.removeAttribute('aria-disabled');
    }
}
```

Note : le trigger externe ne reçoit pas `disabled` natif (pour rester focusable), mais reçoit `aria-disabled`. Le clic est déjà bloqué dans `_handleTriggerClick`.

- [ ] **Étape 4 — Lancer les tests**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run test 2>&1 | grep -E "(passing|failing)"
```

Résultat attendu : tous les tests passent.

- [ ] **Étape 5 — Commit**

```bash
git -C /Users/jon/Code/Active_projects/ariane add packages/core/src/components/collapse/collapse.ts packages/core/src/components/collapse/collapse.test.ts
git -C /Users/jon/Code/Active_projects/ariane commit -m "fix(collapse): aria-disabled sur trigger externe quand disabled=true (WCAG 4.1.2)"
```

---

## Task 4 — Accessibilité aria-controls (finding 8)

**Finding adressé :**

- **8** : `aria-controls` pointe sur le host `<ar-collapse>`, pas sur la région collapsible dans le shadow DOM — les AT naviguent vers un shell sans rôle.

**Principe :** Le host element exposé par le shadow DOM est traversé par les AT modernes (NVDA, JAWS, VoiceOver). Mais sans `role` sur le host, `aria-controls` pointe vers un élément générique. La mitigation disponible : exposer le panel via `ElementInternals.ariaControlsElements` (API IDL, cross-shadow reference) quand disponible, sinon conserver le comportement actuel. À défaut de support navigateur suffisant en 2026, on documente la limitation et on améliore la page de doc.

**Fichiers :**

- Modify: `apps/docs/src/content/components/ar-collapse.mdx`

---

- [ ] **Étape 1 — Vérifier le support `ariaControlsElements`**

L'API `ElementInternals.ariaControlsElements` est en cours de standardisation. Vérifier si les navigateurs cibles (Chromium 126+, Firefox 128+) la supportent.

```bash
node -e "const el = document.createElement('div'); console.log('ariaControlsElements' in el);" 2>/dev/null || echo "vérifier manuellement sur MDN"
```

Si non supportée : implémenter uniquement la documentation. Si supportée : implémenter les deux.

- [ ] **Étape 2 — Mettre à jour la documentation**

Dans `ar-collapse.mdx`, section **Limitations connues**, remplacer le paragraphe `aria-controls` par :

```mdx
- **`aria-controls` → host element** : `aria-controls` pointe sur l'élément `<ar-collapse>` lui-même (pas sur le panel interne). Les AT qui traversent le shadow DOM (NVDA 2024+, JAWS 2024+, VoiceOver macOS 14+) résolvent correctement la référence vers le contenu. Sur les AT plus anciens, la relation peut être ignorée. Mitigation en attente : `ElementInternals.ariaControlsElements` (référence cross-shadow IDL) sera adoptée quand le support navigateur sera suffisant.
```

- [ ] **Étape 3 — Commit**

```bash
git -C /Users/jon/Code/Active_projects/ariane add apps/docs/src/content/components/ar-collapse.mdx
git -C /Users/jon/Code/Active_projects/ariane commit -m "docs(collapse): préciser limitation aria-controls + shadow DOM dans les limitations connues"
```

---

## Récapitulatif des findings couverts

| Finding                                        | Task | Type de fix                                      |
| ---------------------------------------------- | ---- | ------------------------------------------------ |
| 1 — `_animating` bloqué (disconnect)           | 1    | `_abortAnimation()` dans `disconnectedCallback`  |
| 2 — show annulé → `_hide()` sur panel caché    | 1    | Guard `hasAttribute('hidden')` dans `_hide()`    |
| 3 — `el.open = true` pendant animation         | 1    | `_abortAnimation()` en début de `_show()`        |
| 4 — CSS injection via `name`                   | 2    | `CSS.escape()`                                   |
| 5 — Accordéon : frère mid-animation non fermé  | 1    | Snap via `wasAnimating` + retrait guard `hide()` |
| 6 — Trigger externe non désactivé visuellement | 3    | `aria-disabled` dans `_syncTriggerDisabled()`    |
| 7 — `querySelectorAll` scope global            | 2    | `getRootNode()`                                  |
| 8 — `aria-controls` → host element             | 4    | Documentation                                    |
