# ar-dialog : personnalisation du header — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter à `ar-dialog` un slot `header-actions`, un attribut `without-header` (avec bascule `aria-labelledby`/`aria-label`), et des garde-fous dev pour garantir un nom accessible et un moyen de fermeture même sans header — cf. spec `docs/superpowers/specs/2026-08-11-dialog-header-customization-design.md` (issue [#145](https://github.com/jogo-labs/ariane/issues/145)).

**Architecture:** Un seul composant `ar-dialog` (pas de séparation dialog/drawer — tranchée dans le spec). Toutes les modifications sont contenues dans `dialog.ts` (property + `render()` + warnings), `dialog.styles.ts` (ajustement CSS mineur pour le nouveau slot), et la doc `ar-dialog.mdx`. Aucune nouvelle dépendance, aucun nouveau token CSS.

**Tech Stack:** Lit 3, TypeScript, Vitest (`dialog.test.ts`), @web/test-runner + @open-wc/testing (`dialog.a11y.test.ts`, `dialog.browser.test.ts`), Astro/MDX (doc).

## Global Constraints

- Prettier : 100 caractères, 4 espaces, quotes simples (`npx prettier --write` avant chaque commit si besoin).
- `import type` pour tous les imports de types.
- Conventional Commits (validé par commitlint/Husky au commit).
- Aucun fallback cosmétique (`var(--token, valeur)`) à ajouter — le composant reste headless ; les fallbacks structurels existants (`DEFAULT_DIALOG_LABEL`, tailles `--ar-dialog-width` littérales) ne sont pas touchés par ce chantier.
- Pattern de warning dev existant à réutiliser tel quel : `warn(tag, message)` de `src/utils/warn.ts`, gardé par un flag privé `_hasWarnedX` pour ne déclencher qu'une fois par instance (cf. `_hasWarnedMissingLabel` déjà en place).
- `getPart(el, part)` (test-utils.ts) : toujours passer un seul token exact — piège `~=` de happy-dom documenté dans `test-utils.ts`.
- Branche depuis `dev`, PR vers `dev` — jamais de push direct sur `main`.

---

## File Structure

- `packages/core/src/components/dialog/dialog.ts` — property `withoutHeader`, `render()` (header conditionnel, slot `header-actions`, bascule ARIA), deux nouvelles méthodes privées de warning, JSDoc `@attr`/`@slot`/`@csspart`.
- `packages/core/src/components/dialog/dialog.styles.ts` — retire `justify-content: space-between` sur `header`, ajoute `margin-inline-end: auto` sur `h1` (regroupe `header-actions` + close à droite sans wrapper dédié).
- `packages/core/src/components/dialog/dialog.test.ts` — tests unitaires Vitest (structure, attributs, warnings).
- `packages/core/src/components/dialog/dialog.a11y.test.ts` — tests ARIA (bascule `aria-labelledby`/`aria-label`).
- `packages/core/src/components/dialog/dialog.browser.test.ts` — test focus management (vrai `showModal()`).
- `apps/docs/src/content/components/ar-dialog.mdx` — deux nouveaux variants, sections a11y et utilisation mises à jour.

---

### Task 1: Créer la branche de travail

**Files:** aucun.

- [ ] **Step 1: Créer et basculer sur la branche**

```bash
cd /Users/jon/Code/Active_projects/ariane
git checkout dev
git pull
git checkout -b feat/dialog-header-customization
```

- [ ] **Step 2: Vérifier l'état propre**

Run: `git status`
Expected: `On branch feat/dialog-header-customization`, working tree clean.

---

### Task 2: `without-header` + slot `header-actions` + bascule ARIA

**Files:**

- Modify: `packages/core/src/components/dialog/dialog.ts:87-286` (property, JSDoc, `render()`)
- Modify: `packages/core/src/components/dialog/dialog.styles.ts:124-135` (header/h1)
- Test: `packages/core/src/components/dialog/dialog.test.ts`
- Test: `packages/core/src/components/dialog/dialog.a11y.test.ts`

**Interfaces:**

- Produces: `ArDialog.withoutHeader: boolean` (propriété publique, attribut réfléchi `without-header`, défaut `false`). Utilisée par Task 3 (warnings).

- [ ] **Step 1: Écrire les tests unitaires (échec attendu)**

Dans `packages/core/src/components/dialog/dialog.test.ts`, ajouter un nouveau describe juste après le bloc `describe('footer conditionnel', ...)` (après la ligne 158) :

```ts
// ── without-header ───────────────────────────────────────────────────────

describe('without-header', () => {
    it('withoutHeader vaut false par défaut', async () => {
        el = await fixture('<ar-dialog></ar-dialog>');
        expect(el.withoutHeader).toBe(false);
    });

    it('without-header reflète en attribut', async () => {
        el = await fixture('<ar-dialog without-header label="Titre"></ar-dialog>');
        expect(el.hasAttribute('without-header')).toBe(true);
        expect(el.withoutHeader).toBe(true);
    });

    it('le header est présent par défaut', async () => {
        el = await fixture('<ar-dialog></ar-dialog>');
        expect(getPart(el, 'header')).not.toBeNull();
    });

    it('le header est absent du DOM quand without-header est actif', async () => {
        el = await fixture('<ar-dialog without-header label="Titre"></ar-dialog>');
        expect(getPart(el, 'header')).toBeNull();
        expect(getPart(el, 'title')).toBeNull();
        expect(getPart(el, 'close')).toBeNull();
        expect(requireShadow(el).querySelector('[data-ar-dismiss]')).toBeNull();
    });

    it('le dialog et le body restent présents quand without-header est actif', async () => {
        el = await fixture('<ar-dialog without-header label="Titre"></ar-dialog>');
        expect(getPart(el, 'dialog')).not.toBeNull();
        expect(getPart(el, 'body')).not.toBeNull();
    });
});

// ── header-actions ───────────────────────────────────────────────────────

describe('slot header-actions', () => {
    it('le slot header-actions est rendu dans le header', async () => {
        el = await fixture('<ar-dialog></ar-dialog>');
        const header = getPart(el, 'header') as HTMLElement;
        expect(header.querySelector('slot[name="header-actions"]')).not.toBeNull();
    });

    it('le contenu slot="header-actions" est assigné', async () => {
        el = await fixture(`
                <ar-dialog label="Titre">
                    <button slot="header-actions" id="action-btn">Plein écran</button>
                </ar-dialog>
            `);
        const slotEl = requireShadow(el).querySelector<HTMLSlotElement>(
            'slot[name="header-actions"]',
        );
        expect(slotEl).not.toBeNull();
        const assigned = slotEl!.assignedElements();
        expect(assigned).toHaveLength(1);
        expect((assigned[0] as HTMLElement).id).toBe('action-btn');
    });

    it('le slot header-actions est positionné avant le bouton close', async () => {
        el = await fixture(`
                <ar-dialog label="Titre">
                    <button slot="header-actions">Action</button>
                </ar-dialog>
            `);
        const header = getPart(el, 'header') as HTMLElement;
        const slot = header.querySelector('slot[name="header-actions"]');
        const closeBtn = header.querySelector('[data-ar-dismiss]');
        expect(slot).not.toBeNull();
        expect(closeBtn).not.toBeNull();
        const position = slot!.compareDocumentPosition(closeBtn!);
        expect(Boolean(position & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    });

    it('le slot header-actions est absent du DOM quand without-header est actif', async () => {
        el = await fixture('<ar-dialog without-header label="Titre"></ar-dialog>');
        expect(requireShadow(el).querySelector('slot[name="header-actions"]')).toBeNull();
    });
});
```

Dans `packages/core/src/components/dialog/dialog.a11y.test.ts`, ajouter avant la dernière accolade fermante du `describe('ar-dialog — accessibilité', ...)` (après le test `'le drawer conserve les attributs ARIA du dialog'`) :

```ts
it('sans without-header, aria-labelledby est utilisé (pas aria-label)', () => {
    const dialogEl = requireDialog(el);
    expect(dialogEl.hasAttribute('aria-labelledby')).to.equal(true);
    expect(dialogEl.hasAttribute('aria-label')).to.equal(false);
});

it('avec without-header, aria-label remplace aria-labelledby', async () => {
    el.remove();
    el = await fixture(html`<ar-dialog without-header label="Titre sans header"></ar-dialog>`);
    const dialogEl = requireDialog(el);
    expect(dialogEl.hasAttribute('aria-labelledby')).to.equal(false);
    expect(dialogEl.getAttribute('aria-label')).to.equal('Titre sans header');
});

it('avec without-header, le header est absent du DOM', async () => {
    el.remove();
    el = await fixture(html`<ar-dialog without-header label="Titre"></ar-dialog>`);
    expect(requireShadow(el).querySelector('header')).to.equal(null);
});
```

- [ ] **Step 2: Vérifier que les tests échouent**

Run: `cd packages/core && npx vitest run src/components/dialog/dialog.test.ts`
Expected: FAIL — `el.withoutHeader` n'existe pas encore sur le type `ArDialog` (erreur de compilation TypeScript).

- [ ] **Step 3: Ajouter la propriété `withoutHeader`**

Dans `dialog.ts`, insérer juste après la propriété `label` (après la ligne `@property({ reflect: true }) label = '';` — actuelle ligne 115) :

```ts
    /**
     * Si présent, retire entièrement le header (titre, actions, bouton de fermeture) du DOM.
     * La propriété `label` devient alors le seul nom accessible du dialog (`aria-label`) —
     * elle est requise dans ce mode, le slot `label` (HTML) est sans effet.
     *
     * @attr without-header
     * @default false
     */
    @property({ reflect: true, type: Boolean, attribute: 'without-header' })
    withoutHeader: boolean = false;
```

- [ ] **Step 4: Réécrire `render()`**

Remplacer entièrement le corps de `render()` (`dialog.ts:235-286`) par :

```ts
    override render(): TemplateResult {
        const headingLabel = this._getHeadingLabel();

        return html`
            <dialog
                part="dialog"
                role="dialog"
                aria-labelledby=${this.withoutHeader ? nothing : 'dialog-heading'}
                aria-label=${this.withoutHeader ? headingLabel : nothing}
                aria-describedby="dialog-body"
                aria-modal="true"
                ?inert=${!this.open || this._isClosing}
                @cancel=${this._handleDialogCancel}
                @click=${this._handleDialogClick}
                @pointerdown=${this._handleDialogPointerDown}
                @pointerup=${this._handleDialogPointerUp}
            >
                ${this.withoutHeader
                    ? nothing
                    : html`<header part="header">
                          <h1 part="title" id="dialog-heading">
                              ${this._slotController.test('label')
                                  ? html`<slot name="label"></slot>`
                                  : headingLabel}
                          </h1>
                          <slot name="header-actions"></slot>
                          <button part="close" type="button" data-ar-dismiss>
                              <slot name="close-icon">
                                  <svg
                                      aria-hidden="true"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke-width="1.5"
                                      stroke="currentColor"
                                  >
                                      <path
                                          stroke-linecap="round"
                                          stroke-linejoin="round"
                                          d="M6 18 18 6M6 6l12 12"
                                      ></path>
                                  </svg>
                              </slot>
                              <span class="sr-only">${this.closeLabel}</span>
                          </button>
                      </header>`}
                <div part="body" id="dialog-body">
                    <slot></slot>
                </div>
                ${this._slotController.test('footer')
                    ? html`<footer part="footer">
                          <slot name="footer"></slot>
                      </footer>`
                    : nothing}
            </dialog>
        `;
    }
```

- [ ] **Step 5: Ajuster le CSS du header**

Dans `dialog.styles.ts`, remplacer (section `/* ── Header ── */`, lignes 126-135) :

```css
header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
}

h1 {
    margin: 0;
}
```

par :

```css
header {
    display: flex;
    align-items: center;
    flex-shrink: 0;
}

h1 {
    margin: 0;
    margin-inline-end: auto;
}
```

(`margin-inline-end: auto` sur le titre reproduit l'effet visuel de l'ancien `justify-content: space-between` — titre à gauche, reste du contenu du header groupé à droite — mais garde `header-actions` collé au bouton close plutôt que centré dans l'espace disponible.)

- [ ] **Step 6: Mettre à jour le JSDoc de la classe**

Dans le bloc JSDoc au-dessus de `export class ArDialog` (`dialog.ts:50-86`), remplacer les lignes `@slot` et `@csspart` existantes par :

```ts
 * @slot label - Titre du dialog. Remplace la propriété `label` si du HTML est nécessaire. Sans effet si `without-header` est actif.
 * @slot header-actions - Actions additionnelles dans le header, positionnées avant le bouton de fermeture (ex. bouton plein écran, menu). Retiré du DOM si `without-header` est actif.
 * @slot - Contenu principal du dialog.
 * @slot footer - Actions du dialog (boutons). Absent du DOM si non fourni.
 * @slot close-icon - Icône du bouton de fermeture. Remplace le SVG "×" par défaut. Retiré du DOM si `without-header` est actif.
 *
 * @csspart dialog - L'élément <dialog> racine.
 * @csspart header - L'en-tête contenant le titre et le bouton de fermeture. Absent du DOM si `without-header` est actif.
 * @csspart title - Le titre du dialog.
 * @csspart close - Le bouton de fermeture dans l'en-tête. Absent du DOM si `without-header` est actif.
 * @csspart body - La zone de contenu principale.
 * @csspart footer - La zone d'actions (absente du DOM si slot non utilisé).
```

- [ ] **Step 7: Vérifier que les tests passent**

Run: `cd packages/core && npx vitest run src/components/dialog/dialog.test.ts`
Expected: PASS (tous les tests, y compris les nouveaux describe `without-header` et `slot header-actions`).

Run: `cd packages/core && npx web-test-runner 'src/components/dialog/dialog.a11y.test.ts'`
Expected: PASS (7 tests existants + 3 nouveaux).

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/components/dialog/dialog.ts packages/core/src/components/dialog/dialog.styles.ts packages/core/src/components/dialog/dialog.test.ts packages/core/src/components/dialog/dialog.a11y.test.ts
git commit -m "feat(dialog): ajoute without-header et le slot header-actions (#145)"
```

---

### Task 3: Warnings dev — slot label ignoré et absence de moyen de fermeture

**Files:**

- Modify: `packages/core/src/components/dialog/dialog.ts:166-231` (champs privés, méthodes, `updated()`)
- Test: `packages/core/src/components/dialog/dialog.test.ts`

**Interfaces:**

- Consumes: `ArDialog.withoutHeader` (Task 2), `ArDialog.closeOnBackdrop`, `ArDialog._slotController.test('label')` (existants).
- Produces: aucune nouvelle API publique — comportement observable via `console.warn` uniquement.

- [ ] **Step 1: Écrire les tests (échec attendu)**

Dans `dialog.test.ts`, ajouter après le describe `'warn() — label manquant et placement/modal'` (avant la dernière accolade fermante du fichier) :

```ts
describe('warn() — slot label ignoré en mode without-header', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('émet un warn si slot="label" est fourni sans la prop label et without-header actif', async () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await fixture(`
                <ar-dialog without-header>
                    <span slot="label">Titre riche</span>
                </ar-dialog>
            `);

        const slotWarns = spy.mock.calls.filter((c) => String(c[0]).includes('slot="label"'));
        expect(slotWarns.length).toBeGreaterThan(0);
    });

    it("n'émet pas ce warn si la prop label est fournie en plus du slot", async () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await fixture(`
                <ar-dialog without-header label="Titre">
                    <span slot="label">Titre riche</span>
                </ar-dialog>
            `);

        const slotWarns = spy.mock.calls.filter((c) => String(c[0]).includes('slot="label"'));
        expect(slotWarns).toHaveLength(0);
    });

    it("n'émet pas ce warn hors mode without-header", async () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await fixture(`
                <ar-dialog>
                    <span slot="label">Titre riche</span>
                </ar-dialog>
            `);

        const slotWarns = spy.mock.calls.filter((c) => String(c[0]).includes('slot="label"'));
        expect(slotWarns).toHaveLength(0);
    });
});

describe('warn() — aucun moyen de fermeture en mode without-header', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('émet un warn si without-header sans close-on-backdrop ni data-ar-dismiss/accept', async () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await fixture('<ar-dialog without-header label="Titre"></ar-dialog>');

        const closeWarns = spy.mock.calls.filter((c) => String(c[0]).includes('Échap'));
        expect(closeWarns.length).toBeGreaterThan(0);
    });

    it("n'émet pas ce warn si close-on-backdrop est actif", async () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await fixture('<ar-dialog without-header close-on-backdrop label="Titre"></ar-dialog>');

        const closeWarns = spy.mock.calls.filter((c) => String(c[0]).includes('Échap'));
        expect(closeWarns).toHaveLength(0);
    });

    it("n'émet pas ce warn si un élément data-ar-dismiss est présent dans le contenu", async () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await fixture(`
                <ar-dialog without-header label="Titre">
                    <button data-ar-dismiss>Fermer</button>
                </ar-dialog>
            `);

        const closeWarns = spy.mock.calls.filter((c) => String(c[0]).includes('Échap'));
        expect(closeWarns).toHaveLength(0);
    });

    it("n'émet pas ce warn hors mode without-header", async () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await fixture('<ar-dialog></ar-dialog>');

        const closeWarns = spy.mock.calls.filter((c) => String(c[0]).includes('Échap'));
        expect(closeWarns).toHaveLength(0);
    });
});
```

- [ ] **Step 2: Vérifier que les tests échouent**

Run: `cd packages/core && npx vitest run src/components/dialog/dialog.test.ts -t "without-header"`
Expected: FAIL — les warnings attendus ('slot="label"', 'Échap') ne sont jamais émis (méthodes pas encore implémentées).

- [ ] **Step 3: Ajouter les champs privés**

Dans `dialog.ts`, juste après `private _hasWarnedMissingLabel = false;` (ligne 184), ajouter :

```ts
    private _hasWarnedSlotLabelIgnored = false;
    private _hasWarnedNoCloseMechanism = false;
```

- [ ] **Step 4: Ajouter les deux méthodes de warning**

Juste après la méthode `_warnIfMissingLabel` (après la ligne 199, avant `// ── Lifecycle ──`), ajouter :

```ts
    private _warnIfSlotLabelIgnored(): void {
        if (this._hasWarnedSlotLabelIgnored) return;
        if (!this.withoutHeader) return;
        if ((this.label ?? '').trim()) return;
        if (!this._slotController.test('label')) return;

        this._hasWarnedSlotLabelIgnored = true;
        warn(
            'ar-dialog',
            'slot="label" est ignoré quand without-header est actif (aria-label ne peut contenir que du texte brut). Utilisez la propriété "label".',
        );
    }

    private _warnIfNoCloseMechanism(): void {
        if (this._hasWarnedNoCloseMechanism) return;
        if (!this.withoutHeader) return;
        if (this.closeOnBackdrop) return;
        if (this.querySelector('[data-ar-dismiss], [data-ar-accept]')) return;

        this._hasWarnedNoCloseMechanism = true;
        warn(
            'ar-dialog',
            'without-header est actif sans close-on-backdrop ni élément [data-ar-dismiss]/[data-ar-accept] dans le contenu : seule la touche Échap permet de fermer ce dialog.',
        );
    }
```

- [ ] **Step 5: Appeler les deux méthodes depuis `updated()`**

Dans `updated()` (`dialog.ts:215-231`), remplacer :

```ts
    override updated(changedProperties: PropertyValues<this>): void {
        this._warnIfMissingLabel();
```

par :

```ts
    override updated(changedProperties: PropertyValues<this>): void {
        this._warnIfMissingLabel();
        this._warnIfSlotLabelIgnored();
        this._warnIfNoCloseMechanism();
```

- [ ] **Step 6: Vérifier que les tests passent**

Run: `cd packages/core && npx vitest run src/components/dialog/dialog.test.ts`
Expected: PASS (ensemble du fichier, y compris les deux nouveaux describe de warnings).

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/components/dialog/dialog.ts packages/core/src/components/dialog/dialog.test.ts
git commit -m "feat(dialog): warnings dev pour slot label ignoré et fermeture inaccessible (#145)"
```

---

### Task 4: Vérifier le focus management sans bouton close (navigateur réel)

**Files:**

- Modify: `packages/core/src/components/dialog/dialog.browser.test.ts` (nouveau test uniquement — aucun changement de `dialog.ts` attendu, cf. spec section "Focus management").

**Interfaces:**

- Consumes: `ArDialog.withoutHeader` (Task 2), repli de focus existant `dialog.ts:441-454` (inchangé).

- [ ] **Step 1: Écrire le test**

Dans `dialog.browser.test.ts`, dans le describe `'focus'` (après le test existant `"retourne le focus à l'élément déclencheur à la fermeture"`, avant l'accolade fermante du describe), ajouter :

```ts
it('sans header (without-header) et sans contenu focalisable, le focus retombe sur le <dialog>', async () => {
    el = await fixture(html`
        <ar-dialog without-header label="Sans header">
            <p>Contenu non interactif.</p>
        </ar-dialog>
    `);
    el.open = true;
    await aTimeout(50);

    expect(document.activeElement).to.equal(getDialogEl(el));
});
```

- [ ] **Step 2: Lancer le test et vérifier qu'il passe déjà**

Run: `cd packages/core && npx web-test-runner 'src/components/dialog/dialog.browser.test.ts'`
Expected: PASS — le repli en cascade existant (`this.shadowRoot?.querySelector('[data-ar-dismiss]') ?? this.dialog`) gère déjà nativement l'absence du bouton close (querySelector renvoie `null`, le `??` tombe sur `this.dialog`). Si ce test échoue, c'est un signal que l'implémentation de la Task 2 a régressé le focus management — investiguer avant de continuer, ne pas modifier ce test pour le faire passer artificiellement.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/components/dialog/dialog.browser.test.ts
git commit -m "test(dialog): vérifie le repli de focus sans bouton close (without-header) (#145)"
```

---

### Task 5: Documentation (`ar-dialog.mdx`)

**Files:**

- Modify: `apps/docs/src/content/components/ar-dialog.mdx`

- [ ] **Step 1: Ajouter deux nouveaux variants**

Dans le frontmatter, après le variant `with-footer` (après la ligne se terminant par `</ar-dialog>` du variant `with-footer`, avant le variant `autofocus`), insérer :

```yaml
- name: header-actions
  label: Actions dans le header
  description: Le slot header-actions place des actions additionnelles avant le bouton de fermeture (ex. bouton plein écran).
  html: |
      <button class="btn btn-primary" data-ar-dialog-open="demo-header-actions">Ouvrir</button>
      <ar-dialog id="demo-header-actions" label="Rapport mensuel">
          <button slot="header-actions" aria-label="Plein écran" style="width:2rem;height:2rem;border:none;background:transparent;cursor:pointer;font-size:1rem;">⤢</button>
          <p>Contenu du dialog, avec une action additionnelle dans le header.</p>
      </ar-dialog>
- name: without-header
  label: Sans header
  description: 'without-header retire titre, actions et bouton de fermeture — label reste requis pour le nom accessible (aria-label). Prévoir un moyen de fermeture (ici close-on-backdrop).'
  html: |
      <button class="btn btn-primary" data-ar-dialog-open="demo-without-header">Ouvrir</button>
      <ar-dialog id="demo-without-header" label="Aperçu image" without-header close-on-backdrop>
          <img src="https://placehold.co/480x270" alt="Aperçu" style="display:block;width:100%;" />
      </ar-dialog>
```

- [ ] **Step 2: Mettre à jour la section "Pris en charge automatiquement"**

Après la ligne (`ar-dialog.mdx:96`) :

```md
- Élément `<dialog>` natif avec `role="dialog"`, `aria-labelledby`, `aria-describedby` et `aria-modal`.
```

ajouter juste en dessous :

```md
- Quand `without-header` est actif, `aria-label` (basé sur `label`) remplace `aria-labelledby` — le nom accessible reste garanti même sans header visible.
```

- [ ] **Step 3: Mettre à jour la section "À votre charge"**

Après la ligne (`ar-dialog.mdx:114`) sur le `label` descriptif, ajouter une nouvelle puce :

```md
- **`without-header` retire le bouton de fermeture.** `label` devient requis (le slot `label` HTML est sans effet dans ce mode), et un moyen de fermeture doit rester accessible — `close-on-backdrop`, ou une action `data-ar-dismiss`/`data-ar-accept` dans votre contenu. Un avertissement est émis en développement si aucun n'est détecté (Échap reste toujours disponible).
```

- [ ] **Step 4: Ajouter une section "Personnaliser le header"**

Dans le corps du MDX, après la section `### Déclaration via data-ar-dialog-open` et avant `### Cycle d'événements` (`ar-dialog.mdx:136-138`), insérer :

````md
### Personnaliser le header

Le slot `header-actions` place des actions additionnelles entre le titre et le bouton de fermeture :

```html
<ar-dialog label="Rapport mensuel">
    <button slot="header-actions" aria-label="Plein écran">⤢</button>
    <p>Contenu du dialog.</p>
</ar-dialog>
```

Pour masquer visuellement le titre sans casser le nom accessible du dialog, masquez `::part(title)` avec la technique sr-only standard — pas `display: none` ni `visibility: hidden`, qui peuvent faire perdre le nom accessible calculé via `aria-labelledby` dans certains navigateurs :

```css
ar-dialog::part(title) {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
}
```

Pour retirer entièrement le header (titre, actions, bouton de fermeture), utilisez `without-header`. `label` devient alors requis, et un moyen de fermeture doit rester disponible (ici `close-on-backdrop`) :

```html
<ar-dialog label="Aperçu image" without-header close-on-backdrop>
    <img src="/apercu.jpg" alt="Aperçu" />
</ar-dialog>
```
````

- [ ] **Step 5: Vérifier le rendu local**

Run: `cd apps/docs && npm run dev`
Ouvrir `http://localhost:4321/components/dialog` (ou le chemin affiché), vérifier visuellement les deux nouveaux variants dans le playground, puis arrêter le serveur (`Ctrl+C`).

- [ ] **Step 6: Commit**

```bash
git add apps/docs/src/content/components/ar-dialog.mdx
git commit -m "docs(dialog): documente header-actions, without-header et ::part(title) (#145)"
```

---

### Task 6: Vérification finale et Pull Request

**Files:** aucun nouveau — vérification globale.

- [ ] **Step 1: Régénérer le manifest CEM et vérifier l'absence de garde-fou en échec**

Run: `cd packages/core && npm run build:manifest`
Expected: succès, aucune erreur des scripts `validate-no-hardcoded-tokens.js` / `validate-cssprop-defaults.test.js` (aucun nouveau token introduit par ce chantier — attendu).

- [ ] **Step 2: Lancer la suite de tests complète**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run test:all`
Expected: PASS — tous les tests Vitest et WTR (core + docs), y compris les nouveaux tests des Tasks 2-4.

- [ ] **Step 3: Lint et formatage**

Run:

```bash
npx eslint packages/core/src/components/dialog/dialog.ts
npx prettier --check packages/core/src/components/dialog/dialog.ts packages/core/src/components/dialog/dialog.styles.ts packages/core/src/components/dialog/dialog.test.ts packages/core/src/components/dialog/dialog.a11y.test.ts packages/core/src/components/dialog/dialog.browser.test.ts apps/docs/src/content/components/ar-dialog.mdx
```

Expected: aucune erreur ESLint, `All matched files use Prettier code style!`. Si Prettier signale un fichier, lancer `npx prettier --write <fichier>` puis re-commit.

- [ ] **Step 4: Build complet**

Run: `cd packages/core && npm run build`
Expected: succès (npm bundle + CDN dev/prod + CSS + types), aucune erreur TypeScript.

- [ ] **Step 5: Pousser la branche et ouvrir la Pull Request**

```bash
git push -u origin feat/dialog-header-customization
gh pr create --base dev --title "feat(dialog): personnalisation du header (header-actions, without-header)" --body "$(cat <<'EOF'
## Résumé

Implémente le design de `docs/superpowers/specs/2026-08-11-dialog-header-customization-design.md` pour #145 :

- Nouveau slot `header-actions` : actions additionnelles entre le titre et le bouton de fermeture.
- Nouvel attribut `without-header` : retire le header entièrement (titre, actions, close). `label` devient requis, `aria-label` remplace `aria-labelledby`.
- Titre visuellement masqué : aucun nouvel attribut nécessaire, `::part(title)` existant suffit (documenté).
- Deux nouveaux warnings dev : `slot="label"` ignoré en mode `without-header` sans prop `label`, et absence de moyen de fermeture détectable (`close-on-backdrop`/`data-ar-dismiss`/`data-ar-accept`) en mode `without-header`.
- Question préalable tranchée dans le spec : pas de séparation `ar-dialog`/`ar-drawer` (analyse du code source WebAwesome à l'appui — leur split est une duplication mécanique, pas une divergence architecturale).

## Test plan

- [x] Tests unitaires Vitest (`dialog.test.ts`) : structure `without-header`, slot `header-actions`, les deux nouveaux warnings.
- [x] Tests a11y WTR (`dialog.a11y.test.ts`) : bascule `aria-labelledby`/`aria-label`.
- [x] Test navigateur (`dialog.browser.test.ts`) : repli de focus sur `<dialog>` sans bouton close.
- [x] `npm run test:all`, lint, prettier, build : tous verts.
- [x] Doc Astro (`ar-dialog.mdx`) : deux nouveaux variants playground + sections a11y/utilisation.

Closes #145 (sera fermée à la release sur `main`, label `status:en-attente-release` entre-temps).
EOF
)"
```

---

## Self-Review

**Couverture du spec** : les 3 cas de l'issue sont couverts (Task 2 pour actions + `without-header`, doc Task 5 pour le titre masqué via `::part(title)` déjà existant) ; la question du split dialog/drawer est déjà tranchée dans le spec (aucune tâche d'implémentation requise). Bascule ARIA (Task 2), garde-fou fermeture (Task 3), vérification focus (Task 4) et doc (Task 5) tous couverts. Pas de gap identifié.

**Scan placeholders** : aucun "TBD"/"TODO" — toutes les steps contiennent le code exact à écrire.

**Cohérence des types/noms** : `withoutHeader`/`without-header` cohérent entre Task 2 (déclaration) et Task 3 (usage dans les warnings) et Task 4 (usage dans le test). `_warnIfSlotLabelIgnored`/`_warnIfNoCloseMechanism` déclarées et appelées avec les mêmes noms. `header-actions` (slot) cohérent entre Task 2 (render + JSDoc) et Task 5 (doc).
