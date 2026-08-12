# ar-dialog : wrapper part="header-actions" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Amender la PR #179 (encore ouverte, pas mergée) : entourer `<slot name="header-actions">` d'un wrapper `<div part="header-actions">` rendu conditionnellement, pour permettre au thème/consommateur de piloter `gap`/`flex-wrap` des actions indépendamment du layout titre/close — cf. amendement du 2026-08-12 dans `docs/superpowers/specs/2026-08-11-dialog-header-customization-design.md`.

**Architecture:** Un seul fichier de logique (`dialog.ts`), un ajout CSS ciblé (`dialog.styles.ts`), extension des tests existants (`dialog.test.ts`), mise à jour doc (`ar-dialog.mdx`). Branche existante `feat/dialog-header-customization` (PR #179 déjà ouverte) — ce plan ajoute un commit à cette même branche, pas une nouvelle branche.

**Tech Stack:** Lit 3, TypeScript, Vitest.

## Global Constraints

- Prettier : 100 caractères, 4 espaces, quotes simples.
- Pattern de rendu conditionnel à répliquer : celui du `footer` existant (`dialog.ts:324-328`) —
  `${this._slotController.test('X') ? html\`...\` : nothing}`.
- `HasSlotController` (`packages/core/src/controllers/has-slot.controller.ts`) : le constructeur
  prend une liste de noms de slots à surveiller (`new HasSlotController(this, 'footer', 'label')`,
  `dialog.ts:195`) — ajouter `'header-actions'` à cette liste, ne pas créer un second controller.
- Pas de nouveau token CSS (`--ar-*`) — le wrapper n'a pas de valeur de design imposée par défaut
  (pas de `gap` par défaut, cohérent avec l'absence de gap sur `footer` aujourd'hui).
- Branche : `feat/dialog-header-customization` (déjà checked out, ne pas créer de nouvelle branche).
  PR existante : #179. Ce plan ajoute un commit à cette branche, poussé sur la même PR.

---

## File Structure

- `packages/core/src/components/dialog/dialog.ts` — `_slotController` étend sa liste surveillée ;
  `render()` enveloppe le slot `header-actions` dans un wrapper conditionnel ; JSDoc `@csspart
header-actions`.
- `packages/core/src/components/dialog/dialog.styles.ts` — nouvelle règle `[part='header-actions']`.
- `packages/core/src/components/dialog/dialog.test.ts` — étend le describe `'slot header-actions'`
  existant avec les tests de rendu conditionnel (absent/présent/disparition dynamique).
- `apps/docs/src/content/components/ar-dialog.mdx` — note sur `::part(header-actions)` dans la
  section "Personnaliser le header".

---

### Task 1 : wrapper `part="header-actions"` conditionnel

**Files:**

- Modify: `packages/core/src/components/dialog/dialog.ts:195` (liste `HasSlotController`),
  `dialog.ts:50-64` (JSDoc), `dialog.ts:293-320` (`render()`)
- Modify: `packages/core/src/components/dialog/dialog.styles.ts:124-135` (section Header)
- Test: `packages/core/src/components/dialog/dialog.test.ts`
- Modify: `apps/docs/src/content/components/ar-dialog.mdx`

**Interfaces:**

- Ne change aucune API publique existante (pas de nouvel attribut/propriété) — uniquement la
  structure interne du DOM rendu (nouveau wrapper `part="header-actions"`) et son CSS associé.

- [ ] **Step 1 : écrire les tests (échec attendu)**

Le describe `'slot header-actions'` existe déjà dans `dialog.test.ts` (ajouté par une tâche
précédente). Remplacer entièrement son contenu par :

```ts
describe('slot header-actions', () => {
    it('le wrapper part="header-actions" est absent du DOM sans contenu assigné', async () => {
        el = await fixture('<ar-dialog></ar-dialog>');
        expect(getPart(el, 'header-actions')).toBeNull();
    });

    it('le wrapper part="header-actions" est présent si un enfant slot="header-actions" est fourni', async () => {
        el = await fixture(`
                <ar-dialog label="Titre">
                    <button slot="header-actions">Action</button>
                </ar-dialog>
            `);
        expect(getPart(el, 'header-actions')).not.toBeNull();
    });

    it('le wrapper disparaît dynamiquement si le slot="header-actions" est retiré', async () => {
        el = await fixture(`
                <ar-dialog label="Titre">
                    <button slot="header-actions" id="a">Action</button>
                </ar-dialog>
            `);
        expect(getPart(el, 'header-actions')).not.toBeNull();

        (el.querySelector('#a') as Element).remove();
        await waitForUpdate(el);

        expect(getPart(el, 'header-actions')).toBeNull();
    });

    it('le slot header-actions est rendu dans le wrapper', async () => {
        el = await fixture(`
                <ar-dialog label="Titre">
                    <button slot="header-actions">Action</button>
                </ar-dialog>
            `);
        const wrapper = getPart(el, 'header-actions') as HTMLElement;
        expect(wrapper.querySelector('slot[name="header-actions"]')).not.toBeNull();
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

    it('le wrapper header-actions est positionné avant le bouton close', async () => {
        el = await fixture(`
                <ar-dialog label="Titre">
                    <button slot="header-actions">Action</button>
                </ar-dialog>
            `);
        const header = getPart(el, 'header') as HTMLElement;
        const wrapper = getPart(el, 'header-actions');
        const closeBtn = header.querySelector('[data-ar-dismiss]');
        expect(wrapper).not.toBeNull();
        expect(closeBtn).not.toBeNull();
        const position = wrapper!.compareDocumentPosition(closeBtn!);
        expect(Boolean(position & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    });

    it('le wrapper header-actions est absent du DOM quand without-header est actif', async () => {
        el = await fixture(`
                <ar-dialog without-header label="Titre">
                    <button slot="header-actions">Action</button>
                </ar-dialog>
            `);
        expect(getPart(el, 'header-actions')).toBeNull();
        expect(requireShadow(el).querySelector('slot[name="header-actions"]')).toBeNull();
    });
});
```

Cela remplace les anciens tests `'le slot header-actions est rendu dans le header'` et `'le slot
header-actions est positionné avant le bouton close'` (qui vérifiaient l'ancien DOM sans wrapper)
par les nouveaux ci-dessus. Chercher `describe('slot header-actions'` dans `dialog.test.ts` pour
localiser le bloc à remplacer intégralement.

- [ ] **Step 2 : vérifier que les tests échouent**

Run: `cd packages/core && npx vitest run src/components/dialog/dialog.test.ts -t "header-actions"`
Expected: FAIL — `getPart(el, 'header-actions')` retourne toujours `null` même avec du contenu
slotté (pas encore de wrapper avec ce `part`), et le test "absent sans contenu" échoue aussi
puisqu'aujourd'hui le `<slot>` est toujours rendu sans condition.

- [ ] **Step 3 : étendre `_slotController`**

Dans `dialog.ts:195`, remplacer :

```ts
    private readonly _slotController = new HasSlotController(this, 'footer', 'label');
```

par :

```ts
    private readonly _slotController = new HasSlotController(this, 'footer', 'label', 'header-actions');
```

- [ ] **Step 4 : envelopper le slot dans `render()`**

Dans `dialog.ts`, remplacer la ligne (actuelle ligne 301) :

```ts
                          <slot name="header-actions"></slot>
```

par :

```ts
                          ${this._slotController.test('header-actions')
                              ? html`<div part="header-actions">
                                    <slot name="header-actions"></slot>
                                </div>`
                              : nothing}
```

- [ ] **Step 5 : ajouter le CSS du wrapper**

Dans `dialog.styles.ts`, dans la section `/* ── Header ── */` (après le bloc `header { ... }` /
`h1 { ... }`, avant `[part='close'] { ... }`), ajouter :

```css
[part='header-actions'] {
    display: flex;
    align-items: center;
}
```

- [ ] **Step 6 : mettre à jour le JSDoc**

Dans `dialog.ts`, remplacer la ligne `@csspart header` existante et ajouter une nouvelle ligne
juste après (dans le bloc JSDoc de la classe, section `@csspart`) :

```ts
 * @csspart header - L'en-tête contenant le titre et le bouton de fermeture. Absent du DOM si `without-header` est actif.
 * @csspart header-actions - Le conteneur des actions additionnelles du header (slot `header-actions`). Absent du DOM si le slot est vide ou si `without-header` est actif.
```

- [ ] **Step 7 : mettre à jour la doc Astro**

Dans `apps/docs/src/content/components/ar-dialog.mdx`, section "Personnaliser le header", juste
après le premier exemple de code (le snippet illustrant `header-actions`), ajouter un paragraphe :

````md
Le conteneur des actions expose son propre `::part(header-actions)`, indépendant du layout
titre/fermeture — utile pour définir un espacement entre plusieurs actions sans affecter le reste
du header :

```css
ar-dialog::part(header-actions) {
    gap: 0.5rem;
}
```
````

````

- [ ] **Step 8 : vérifier que les tests passent**

Run: `cd packages/core && npx vitest run src/components/dialog/dialog.test.ts`
Expected: PASS (ensemble du fichier).

Run: `cd packages/core && npx web-test-runner 'src/components/dialog/dialog.a11y.test.ts' 'src/components/dialog/dialog.browser.test.ts'`
Expected: PASS (aucune régression — ces fichiers ne testent pas directement `header-actions` mais
partagent le même `render()`).

- [ ] **Step 9 : prettier/eslint**

Run: `npx prettier --check packages/core/src/components/dialog/dialog.ts packages/core/src/components/dialog/dialog.styles.ts packages/core/src/components/dialog/dialog.test.ts apps/docs/src/content/components/ar-dialog.mdx`
Run: `npx eslint packages/core/src/components/dialog/dialog.ts`
Expected: clean. `--write` puis re-vérifier si Prettier signale un écart.

- [ ] **Step 10 : commit**

```bash
git add packages/core/src/components/dialog/dialog.ts packages/core/src/components/dialog/dialog.styles.ts packages/core/src/components/dialog/dialog.test.ts apps/docs/src/content/components/ar-dialog.mdx
git commit -m "fix(dialog): wrapper part=\"header-actions\" pour un contrôle flex indépendant (#145)"
````

---

## Self-Review

**Couverture** : les 3 aspects de l'amendement (wrapper conditionnel, CSS indépendant, doc
`::part(header-actions)`) sont couverts par les steps 1-7. Rendu conditionnel testé dans les 3 cas
(absent/présent/disparition dynamique), cohérent avec le pattern `footer` déjà en place et déjà
testé de la même façon ailleurs dans ce fichier.

**Placeholders** : aucun — code exact fourni à chaque step.

**Cohérence des noms** : `part="header-actions"` (wrapper) et `slot="header-actions"` (nom du
slot, inchangé) sont deux concepts distincts qui partagent intentionnellement le même nom (décidé
dans l'amendement du spec) — pas une incohérence, un choix assumé documenté.
