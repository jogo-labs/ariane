# ar-dropdown : renommage `trigger` → `for` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Renommer l'attribut `trigger` en `for` sur `ar-dropdown` pour aligner l'API avec `ar-tooltip`, et ajouter un avertissement `__DEV__` quand `for` et `slot="trigger"` sont définis simultanément.

**Architecture:** Renommage de propriété Lit pur + ajout d'un `warn()` dans `_handleTriggerSlotChange`. Les deux mécanismes de résolution du trigger (slot et attribut `for`) sont conservés — `for` garde la priorité sur le slot.

**Tech Stack:** Lit 3, TypeScript, Vitest (tests unitaires), @web/test-runner (tests browser)

---

## Fichiers concernés

| Fichier                                                          | Action                                              |
| ---------------------------------------------------------------- | --------------------------------------------------- |
| `packages/core/src/components/dropdown/dropdown.ts`              | Modifier — renommage + warn conflit                 |
| `packages/core/src/components/dropdown/dropdown.test.ts`         | Modifier — renommage + nouveau test warn            |
| `packages/core/src/components/dropdown/dropdown.browser.test.ts` | Aucun changement nécessaire                         |
| `packages/core/src/components/dropdown/dropdown.a11y.test.ts`    | Aucun changement nécessaire                         |
| `apps/docs/src/content/components/ar-dropdown.mdx`               | Modifier — variante external-trigger + section a11y |
| `custom-elements.json`                                           | Régénérer via `npm run build:manifest`              |

---

## Task 1 : RED — mettre à jour les tests pour `for`

**Files:**

- Modify: `packages/core/src/components/dropdown/dropdown.test.ts`

- [ ] **Étape 1 : Mettre à jour les tests dans `dropdown.test.ts`**

Appliquer les remplacements suivants dans `packages/core/src/components/dropdown/dropdown.test.ts` :

**Section "valeurs par défaut" (ligne ~51) :**

```ts
// AVANT
it('trigger=""', () => expect(el.trigger).toBe(''));

// APRÈS
it('for=""', () => expect(el.for).toBe(''));
```

**Section "attributs reflect" (lignes ~98-102) :**

```ts
// AVANT
it('trigger reflète en attribut', async () => {
    el.trigger = 'mon-btn';
    await waitForUpdate(el);
    expect(el.getAttribute('trigger')).toBe('mon-btn');
});

// APRÈS
it('for reflète en attribut', async () => {
    el.for = 'mon-btn';
    await waitForUpdate(el);
    expect(el.getAttribute('for')).toBe('mon-btn');
});
```

**Section "trigger externe" — describe title et tous les fixtures (lignes ~219-262) :**

```ts
// AVANT
describe('trigger externe', () => {
    ...
    it('pose aria-haspopup et aria-expanded sur le trigger externe', async () => {
        el = await fixture('<ar-dropdown trigger="test-ext-trigger"></ar-dropdown>');
        ...
    });

    it('le clic sur le trigger externe ouvre le dropdown', async () => {
        el = await fixture('<ar-dropdown trigger="test-ext-trigger"></ar-dropdown>');
        ...
    });

    it('le slot trigger est ignoré quand trigger est défini', async () => {
        el = await fixture(`
            <ar-dropdown trigger="test-ext-trigger">
                <button slot="trigger" id="slot-btn">Slot</button>
            </ar-dropdown>
        `);
        ...
    });

    it("affiche un warn si l'ID est introuvable", async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        el = await fixture('<ar-dropdown trigger="id-qui-nexiste-pas"></ar-dropdown>');
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('id-qui-nexiste-pas'));
        warnSpy.mockRestore();
    });
});

// APRÈS
describe('for — trigger externe', () => {
    ...
    it('pose aria-haspopup et aria-expanded sur le trigger externe', async () => {
        el = await fixture('<ar-dropdown for="test-ext-trigger"></ar-dropdown>');
        ...
    });

    it('le clic sur le trigger externe ouvre le dropdown', async () => {
        el = await fixture('<ar-dropdown for="test-ext-trigger"></ar-dropdown>');
        ...
    });

    it('le slot trigger est ignoré quand for est défini', async () => {
        el = await fixture(`
            <ar-dropdown for="test-ext-trigger">
                <button slot="trigger" id="slot-btn">Slot</button>
            </ar-dropdown>
        `);
        ...
    });

    it("affiche un warn si l'ID est introuvable", async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        el = await fixture('<ar-dropdown for="id-qui-nexiste-pas"></ar-dropdown>');
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('id-qui-nexiste-pas'));
        warnSpy.mockRestore();
    });
});
```

**Section "warn() — trigger introuvable" (lignes ~320-346) :**

```ts
// AVANT
describe('warn() — trigger introuvable', () => {
    ...
    it('émet un warn si trigger pointe vers un ID inexistant (firstUpdated)', async () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        el = await fixture('<ar-dropdown trigger="id-qui-nexiste-pas"></ar-dropdown>');
        expect(spy).toHaveBeenCalledOnce();
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('[ar-dropdown]'));
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('id-qui-nexiste-pas'));
    });

    it('émet un warn si trigger est mis à jour vers un ID inexistant', async () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        el = await fixture<ArDropdown>('<ar-dropdown></ar-dropdown>');
        el.trigger = 'id-inconnu';
        await waitForUpdate(el);
        expect(spy).toHaveBeenCalledOnce();
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('[ar-dropdown]'));
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('id-inconnu'));
    });
});

// APRÈS
describe('warn() — for introuvable', () => {
    ...
    it('émet un warn si for pointe vers un ID inexistant (firstUpdated)', async () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        el = await fixture('<ar-dropdown for="id-qui-nexiste-pas"></ar-dropdown>');
        expect(spy).toHaveBeenCalledOnce();
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('[ar-dropdown]'));
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('id-qui-nexiste-pas'));
    });

    it('émet un warn si for est mis à jour vers un ID inexistant', async () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        el = await fixture<ArDropdown>('<ar-dropdown></ar-dropdown>');
        el.for = 'id-inconnu';
        await waitForUpdate(el);
        expect(spy).toHaveBeenCalledOnce();
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('[ar-dropdown]'));
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('id-inconnu'));
    });
});
```

- [ ] **Étape 2 : Vérifier que les tests échouent**

```bash
npm run test
```

Résultat attendu : plusieurs tests échouent — `el.for` vaut `undefined` (propriété pas encore renommée dans l'implémentation), et les fixtures `for="..."` ne sont pas reconnues par Lit.

---

## Task 2 : GREEN — renommer la propriété dans `dropdown.ts`

**Files:**

- Modify: `packages/core/src/components/dropdown/dropdown.ts`

- [ ] **Étape 1 : Renommer la propriété et toutes ses références**

Dans `packages/core/src/components/dropdown/dropdown.ts`, apporter les modifications suivantes :

**JSDoc `@slot` (ligne ~27) :**

```ts
// AVANT
 * @slot trigger  - Le bouton déclencheur (ignoré si `trigger` est défini).

// APRÈS
 * @slot trigger  - Le bouton déclencheur (ignoré si `for` est défini).
```

**Propriété (ligne ~75) :**

```ts
// AVANT
    @property({ reflect: true }) trigger = '';

// APRÈS
    @property({ reflect: true }) for = '';
```

**`firstUpdated` (lignes ~91-101) :**

```ts
// AVANT
    override firstUpdated(): void {
        const trigger = this._resolvedTrigger;
        if (trigger && this._panel) {
            this._popover.attach(trigger, this._panel);
            if (this.trigger) {
                trigger.addEventListener('click', this._handleTriggerClick);
                this._externalTrigger = trigger;
            }
        }
        if (this.open) this._show();
    }

// APRÈS
    override firstUpdated(): void {
        const trigger = this._resolvedTrigger;
        if (trigger && this._panel) {
            this._popover.attach(trigger, this._panel);
            if (this.for) {
                trigger.addEventListener('click', this._handleTriggerClick);
                this._externalTrigger = trigger;
            }
        }
        if (this.open) this._show();
    }
```

**`updated` — bloc `changed.has('trigger')` (lignes ~116-130) :**

```ts
// AVANT
if (changed.has('trigger')) {
    this._externalTrigger?.removeEventListener('click', this._handleTriggerClick);
    this._externalTrigger = null;
    const newTrigger = this._resolvedTrigger;
    if (this.trigger && !newTrigger) {
        warn('ar-dropdown', `Aucun élément trouvé avec l'id "${this.trigger}".`);
    }
    if (newTrigger && this._panel) {
        this._popover.attach(newTrigger, this._panel);
        if (this.trigger) {
            newTrigger.addEventListener('click', this._handleTriggerClick);
            this._externalTrigger = newTrigger;
        }
    }
}

// APRÈS
if (changed.has('for')) {
    this._externalTrigger?.removeEventListener('click', this._handleTriggerClick);
    this._externalTrigger = null;
    const newTrigger = this._resolvedTrigger;
    if (this.for && !newTrigger) {
        warn('ar-dropdown', `Aucun élément trouvé avec l'id "${this.for}".`);
    }
    if (newTrigger && this._panel) {
        this._popover.attach(newTrigger, this._panel);
        if (this.for) {
            newTrigger.addEventListener('click', this._handleTriggerClick);
            this._externalTrigger = newTrigger;
        }
    }
}
```

**`_resolvedTrigger` (lignes ~153-159) :**

```ts
// AVANT
    private get _resolvedTrigger(): HTMLElement | null {
        if (this.trigger) {
            return document.getElementById(this.trigger);
        }
        const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]');
        return (slot?.assignedElements({ flatten: true })[0] as HTMLElement | undefined) ?? null;
    }

// APRÈS
    private get _resolvedTrigger(): HTMLElement | null {
        if (this.for) {
            return document.getElementById(this.for);
        }
        const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]');
        return (slot?.assignedElements({ flatten: true })[0] as HTMLElement | undefined) ?? null;
    }
```

**`_handleTriggerSlotChange` (lignes ~161-167) :**

```ts
// AVANT
    private _handleTriggerSlotChange(): void {
        if (this.trigger) return;
        const trigger = this._resolvedTrigger;
        if (!trigger || !this._panel) return;
        this._popover.attach(trigger, this._panel);
        trigger.addEventListener('click', this._handleTriggerClick);
    }

// APRÈS
    private _handleTriggerSlotChange(): void {
        if (this.for) return;
        const trigger = this._resolvedTrigger;
        if (!trigger || !this._panel) return;
        this._popover.attach(trigger, this._panel);
        trigger.addEventListener('click', this._handleTriggerClick);
    }
```

- [ ] **Étape 2 : Vérifier que les tests passent**

```bash
npm run test
```

Résultat attendu :

```
Test Files  21 passed (21)
Tests  401 passed (401)
```

- [ ] **Étape 3 : Commit**

```bash
git add packages/core/src/components/dropdown/dropdown.ts \
        packages/core/src/components/dropdown/dropdown.test.ts
git commit -m "refactor(dropdown): renomme l'attribut trigger → for"
```

---

## Task 3 : RED — test du warn de conflit `for` + slot

**Files:**

- Modify: `packages/core/src/components/dropdown/dropdown.test.ts`

- [ ] **Étape 1 : Ajouter le test de conflit dans la section `warn()`**

Dans `dropdown.test.ts`, dans le describe `'warn() — for introuvable'`, ajouter un troisième test **après** les deux tests existants :

```ts
it('émet un warn si for et slot="trigger" sont tous les deux définis', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const conflictBtn = document.createElement('button');
    conflictBtn.id = 'conflict-warn-btn';
    document.body.appendChild(conflictBtn);

    el = await fixture(`
        <ar-dropdown for="conflict-warn-btn">
            <button slot="trigger">Slot trigger</button>
        </ar-dropdown>
    `);

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[ar-dropdown]'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('for'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('priorité'));

    conflictBtn.remove();
    spy.mockRestore();
});
```

- [ ] **Étape 2 : Vérifier que le test échoue**

```bash
npm run test -- --reporter=verbose 2>&1 | grep -A5 "conflit\|conflict"
```

Résultat attendu : le test échoue car `spy` n'a pas encore été appelé avec ce message.

---

## Task 4 : GREEN — implémenter le warn de conflit

**Files:**

- Modify: `packages/core/src/components/dropdown/dropdown.ts`

- [ ] **Étape 1 : Ajouter le warn dans `_handleTriggerSlotChange`**

Dans `dropdown.ts`, remplacer `_handleTriggerSlotChange` par :

```ts
    private _handleTriggerSlotChange(): void {
        if (this.for) {
            const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]');
            if (slot?.assignedElements({ flatten: true }).length) {
                warn(
                    'ar-dropdown',
                    'for et slot="trigger" sont tous les deux définis — for prend la priorité.',
                );
            }
            return;
        }
        const trigger = this._resolvedTrigger;
        if (!trigger || !this._panel) return;
        this._popover.attach(trigger, this._panel);
        trigger.addEventListener('click', this._handleTriggerClick);
    }
```

- [ ] **Étape 2 : Vérifier que tous les tests passent**

```bash
npm run test
```

Résultat attendu :

```
Test Files  21 passed (21)
Tests  402 passed (402)
```

(+1 par rapport à avant : le nouveau test de conflit)

- [ ] **Étape 3 : Vérifier les tests browser**

```bash
npm run test:browser 2>&1 | tail -5
```

Résultat attendu : `117 passed, 0 failed`

- [ ] **Étape 4 : Commit**

```bash
git add packages/core/src/components/dropdown/dropdown.ts \
        packages/core/src/components/dropdown/dropdown.test.ts
git commit -m "feat(dropdown): warn __DEV__ quand for et slot=\"trigger\" sont tous les deux définis"
```

---

## Task 5 : Mettre à jour la documentation

**Files:**

- Modify: `apps/docs/src/content/components/ar-dropdown.mdx`

- [ ] **Étape 1 : Mettre à jour la variante `external-trigger`**

Dans `apps/docs/src/content/components/ar-dropdown.mdx`, localiser la section `name: external-trigger` (vers la ligne 67) et remplacer :

```yaml
- name: external-trigger
  label: Trigger externe
  description: "L'attribut `trigger` accepte l'ID d'un élément déclencheur situé en dehors du composant. Utile pour les boutons dans une barre d'outils ou une autre zone de la page."
  html: |
      <button class="btn btn-secondary" id="ar-doc-ext-trigger">Trigger externe ▾</button>
      <ar-dropdown trigger="ar-doc-ext-trigger">
          <ar-dropdown-item><button>Modifier</button></ar-dropdown-item>
          <ar-dropdown-item><button>Dupliquer</button></ar-dropdown-item>
          <ar-dropdown-item><button>Supprimer</button></ar-dropdown-item>
      </ar-dropdown>
```

par :

```yaml
- name: external-trigger
  label: Trigger externe
  description: "L'attribut `for` accepte l'ID d'un élément déclencheur situé en dehors du composant. Utile pour les boutons dans une barre d'outils ou une autre zone de la page."
  html: |
      <button class="btn btn-secondary" id="ar-doc-ext-trigger">Trigger externe ▾</button>
      <ar-dropdown for="ar-doc-ext-trigger">
          <ar-dropdown-item><button>Modifier</button></ar-dropdown-item>
          <ar-dropdown-item><button>Dupliquer</button></ar-dropdown-item>
          <ar-dropdown-item><button>Supprimer</button></ar-dropdown-item>
      </ar-dropdown>
```

- [ ] **Étape 2 : Mettre à jour la section accessibilité**

Localiser la ligne (vers la ligne 104) :

```markdown
- Le trigger reçoit `aria-haspopup="true"`, `aria-controls` (pointant vers le panel) et `aria-expanded` synchronisé à l'état ouvert/fermé.
```

et remplacer par :

```markdown
- Le trigger reçoit `aria-haspopup="true"` et `aria-expanded` synchronisé à l'état ouvert/fermé.
```

- [ ] **Étape 3 : Commit**

```bash
git add apps/docs/src/content/components/ar-dropdown.mdx
git commit -m "docs(dropdown): attribut trigger → for dans la doc et les démos"
```

---

## Task 6 : Régénérer le manifest

**Files:**

- Modify: `custom-elements.json`

- [ ] **Étape 1 : Régénérer**

```bash
npm run build:manifest
```

- [ ] **Étape 2 : Vérifier que `for` apparaît dans le manifest**

```bash
grep -A3 '"name": "for"' custom-elements.json | head -10
```

Résultat attendu : entrée `for` avec `"type": { "text": "string" }` et `"default": ""`.

Vérifier aussi que `trigger` n'apparaît plus :

```bash
grep '"name": "trigger"' custom-elements.json
```

Résultat attendu : aucune sortie.

- [ ] **Étape 3 : Commit**

```bash
git add custom-elements.json
git commit -m "chore(manifest): régénère custom-elements.json après renommage trigger → for"
```
