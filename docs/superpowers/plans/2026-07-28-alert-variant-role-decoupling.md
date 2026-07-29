# ar-alert — découplage variant/role Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le mapping binaire `variant === 'info' ? 'status' : 'alert'` par une table de
correspondance à 4 entrées + un override explicite (`urgent`), et remplacer les 12 tokens CSS
nommés par variant par 3 tokens génériques + presets dans le thème.

**Architecture:** `alert.ts` gagne une table `ROLE_BY_VARIANT` (private static) et une nouvelle
prop `urgent?: boolean` consultée en priorité dans la logique de rôle déjà présente dans
`updated()`. `variant` est retypé en union ouverte (`ArAlertVariant | (string & {})`) sans
changer son nom ni son comportement par défaut. `alert.styles.ts` n'a plus qu'un seul bloc de
règles CSS consommant 3 tokens génériques ; `default.css` porte la logique de sélection par
variant via des sélecteurs d'attribut (`ar-alert[variant='...']`).

**Tech Stack:** Lit 3, TypeScript, Vitest (tests unitaires jsdom/happy-dom), Web Test Runner
(tests navigateur/a11y), `warn()` (infra `__DEV__` existante).

## Global Constraints

- Prettier : 100 caractères, 4 espaces, quotes simples.
- Toujours `import type` pour les imports de types.
- Conventional Commits (commitlint + Husky) — préfixe `refactor(alert):` pour ce chantier.
- Aucun fallback cosmétique dans les composants (`var(--token)` sans valeur par défaut) —
  `packages/core` reste headless, les valeurs vont dans `themes/default.css`.
- `exactOptionalPropertyTypes: true` — toute prop optionnelle réassignable à `undefined` se
  déclare `?: T` sans valeur par défaut sur le champ de classe (pas de fallback implicite `T
| undefined`).
- Tout nouveau token `--ar-*` doit avoir son entrée `@cssprop` dans le JSDoc du composant.
- Breaking change assumé sans `warnDeprecated` (alpha, aucun consommateur réel).
- Spec source : `docs/superpowers/specs/2026-07-28-alert-variant-role-decoupling-design.md`.

---

## Fichiers concernés

- Modifier : `packages/core/src/components/alert/alert.ts` — typage `variant`, table
  `ROLE_BY_VARIANT`, prop `urgent`, logique de rôle, fallback icône + warn.
- Modifier : `packages/core/src/components/alert/alert.styles.ts` — 3 tokens génériques au lieu
  des 4 blocs `:host([variant='...'])`.
- Modifier : `packages/core/src/styles/themes/default.css` — presets par attribut de variant
  (light + dark).
- Modifier : `packages/core/src/components/alert/alert.test.ts` — tests existants à corriger
  (mapping success/warning) + nouveaux tests (table, `urgent`, warn icône).
- Modifier : `apps/docs/src/content/components/ar-alert.mdx` — doc `variant`/`role`/`urgent`.

---

### Task 1: Créer la branche de travail

**Files:** aucun.

- [ ] **Step 1: Créer et basculer sur la branche depuis `dev`**

```bash
cd /Users/jon/Code/Active_projects/ariane
git checkout dev
git pull
git checkout -b refactor/alert-variant-role-decoupling
```

Expected: la branche `refactor/alert-variant-role-decoupling` est active
(`git branch --show-current` → `refactor/alert-variant-role-decoupling`).

---

### Task 2: Élargir le typage de `variant` et introduire `ROLE_BY_VARIANT`

**Files:**

- Modify: `packages/core/src/components/alert/alert.ts:18` (type `ArAlertVariant`), `:82-83`
  (prop `variant`)
- Test: `packages/core/src/components/alert/alert.test.ts`

**Interfaces:**

- Produces: `ArAlertVariant` (union `'success'|'warning'|'error'|'info'`, inchangée en tant que
  type nommé), prop `variant: ArAlertVariant | (string & {})` (comportement par défaut
  inchangé : `'error'`), constante privée statique
  `ArAlert._ROLE_BY_VARIANT: Record<string, 'alert' | 'status'>`.

Ce task ne change pas encore le calcul du `role` dans `updated()` (fait au Task 3) — il prépare
juste le typage et la table, avec un test qui vérifie que la table est correctement consultable
en interne via son effet observable (le futur calcul de rôle). Comme la table seule n'a pas
d'effet observable sans être branchée, ce task et le Task 3 sont fusionnés en pratique : écrire
le test du Task 3 d'abord (rouge), introduire la table + le branchement en une fois.

- [ ] **Step 1: Écrire les tests rouges pour le nouveau mapping role/variant**

Dans `packages/core/src/components/alert/alert.test.ts`, remplacer le bloc
`describe('accessibilité ARIA', ...)` (lignes 68-94 actuelles) par :

```ts
describe('accessibilité ARIA', () => {
    it('variant="error" donne role="alert" au host', async () => {
        el = await fixture('<ar-alert variant="error"></ar-alert>');
        expect(el.getAttribute('role')).toBe('alert');
    });

    it('variant="warning" donne role="alert" au host', async () => {
        el = await fixture('<ar-alert variant="warning"></ar-alert>');
        expect(el.getAttribute('role')).toBe('alert');
    });

    it('variant="success" donne role="status" au host', async () => {
        el = await fixture('<ar-alert variant="success"></ar-alert>');
        expect(el.getAttribute('role')).toBe('status');
    });

    it('variant="info" donne role="status" au host', async () => {
        el = await fixture('<ar-alert variant="info"></ar-alert>');
        expect(el.getAttribute('role')).toBe('status');
    });

    it('un variant custom inconnu donne role="status" (défaut sûr)', async () => {
        el = await fixture('<ar-alert variant="promo"></ar-alert>');
        expect(el.getAttribute('role')).toBe('status');
    });

    it('without-notification supprime le role du host', async () => {
        el = await fixture('<ar-alert without-notification></ar-alert>');
        expect(el.hasAttribute('role')).toBe(false);
    });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier l'échec sur success/promo**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run test --workspace=packages/core -- alert.test.ts`
Expected: FAIL sur `variant="success" donne role="status"` et `variant custom inconnu` (le code
actuel donne encore `role="alert"` pour ces deux cas).

- [ ] **Step 3: Élargir le typage de `variant` et brancher la table de correspondance**

Dans `packages/core/src/components/alert/alert.ts`, le type nommé `ArAlertVariant` (ligne 18)
reste inchangé — il continue de documenter les 4 presets connus pour l'autocomplétion :

```ts
export type ArAlertVariant = 'success' | 'warning' | 'error' | 'info';
```

Remplacer les lignes 82-83 :

```ts
    @property({ reflect: true, type: String })
    variant: 'success' | 'warning' | 'error' | 'info' = 'error';
```

par :

```ts
    @property({ reflect: true, type: String })
    variant: ArAlertVariant | (string & {}) = 'error';
```

Ajouter, juste avant `_ICON_PATHS` (ligne 109 actuelle), la table de correspondance :

```ts
    private static readonly _ROLE_BY_VARIANT: Record<string, 'alert' | 'status'> = {
        error: 'alert',
        warning: 'alert',
        success: 'status',
        info: 'status',
    };
```

Remplacer le bloc `updated()` (lignes 99-107 actuelles) :

```ts
    override updated(changed: Map<string, unknown>) {
        if (changed.has('variant') || changed.has('withoutNotification')) {
            if (this.withoutNotification) {
                this.removeAttribute('role');
                return;
            }
            this.role = this.variant === 'info' ? 'status' : 'alert';
        }
    }
```

par :

```ts
    override updated(changed: Map<string, unknown>) {
        if (changed.has('variant') || changed.has('withoutNotification')) {
            this._updateRole();
        }
    }

    private _updateRole(): void {
        if (this.withoutNotification) {
            this.removeAttribute('role');
            return;
        }
        this.role = ArAlert._ROLE_BY_VARIANT[this.variant] ?? 'status';
    }
```

(la gestion de `urgent` est ajoutée au Task 3 — ce step isole le passage de la table).

- [ ] **Step 4: Relancer les tests pour vérifier qu'ils passent**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run test --workspace=packages/core -- alert.test.ts`
Expected: PASS sur les 6 tests du bloc `accessibilité ARIA`.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/components/alert/alert.ts packages/core/src/components/alert/alert.test.ts
git commit -m "refactor(alert): remplace le mapping binaire variant/role par une table de correspondance"
```

---

### Task 3: Ajouter la prop `urgent` (override explicite du rôle)

**Files:**

- Modify: `packages/core/src/components/alert/alert.ts`
- Test: `packages/core/src/components/alert/alert.test.ts`

**Interfaces:**

- Consumes: `ArAlert._ROLE_BY_VARIANT`, `_updateRole()` (Task 2).
- Produces: prop `urgent?: boolean` (pas de valeur par défaut sur le champ de classe — reste
  `undefined` tant que l'attribut n'est jamais posé).

- [ ] **Step 1: Écrire les tests rouges pour `urgent`**

Dans `packages/core/src/components/alert/alert.test.ts`, ajouter un nouveau bloc `describe`
après `describe('accessibilité ARIA', ...)` :

```ts
// ── Prop urgent (override du rôle) ──────────────────────────────────────

describe('prop urgent', () => {
    it('urgent est undefined par défaut', async () => {
        el = await fixture('<ar-alert></ar-alert>');
        expect(el.urgent).toBeUndefined();
    });

    it('la seule présence de l\'attribut urgent force role="alert"', async () => {
        el = await fixture('<ar-alert variant="success" urgent></ar-alert>');
        expect(el.getAttribute('role')).toBe('alert');
    });

    it('urgent en absence ne force pas role="status" (retombe sur la table)', async () => {
        el = await fixture('<ar-alert variant="error"></ar-alert>');
        expect(el.getAttribute('role')).toBe('alert');
    });

    it('urgent=false (JS) force role="status" même sur un variant "error"', async () => {
        el = await fixture('<ar-alert variant="error"></ar-alert>');
        el.urgent = false;
        await waitForUpdate(el);
        expect(el.getAttribute('role')).toBe('status');
    });

    it("urgent est prioritaire sur withoutNotification=false mais pas l'inverse", async () => {
        el = await fixture('<ar-alert variant="success" urgent without-notification></ar-alert>');
        expect(el.hasAttribute('role')).toBe(false);
    });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier l'échec**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run test --workspace=packages/core -- alert.test.ts`
Expected: FAIL — `el.urgent` n'existe pas encore (erreur TypeScript à la compilation du test, ou
`undefined` non typé selon le runner ; en tout cas les assertions sur `role="alert"`/`role="status"`
forcés échouent puisque la prop n'existe pas).

- [ ] **Step 3: Ajouter la prop `urgent` et la brancher dans `_updateRole()`**

Dans `packages/core/src/components/alert/alert.ts`, ajouter après la prop `withoutNotification`
(après la ligne 76 actuelle) :

```ts
    /**
     * Force le niveau d'urgence ARIA indépendamment de `variant` : `role="alert"` si présent,
     * sinon déduit de `variant` via une table de correspondance interne (`error`/`warning` →
     * `alert`, `success`/`info` → `status`, tout autre variant → `status`).
     * @attr urgent
     * @default undefined
     */
    @property({ type: Boolean })
    urgent?: boolean;
```

Modifier `_updateRole()` (ajoutée au Task 2) :

```ts
    private _updateRole(): void {
        if (this.withoutNotification) {
            this.removeAttribute('role');
            return;
        }
        if (this.urgent !== undefined) {
            this.role = this.urgent ? 'alert' : 'status';
            return;
        }
        this.role = ArAlert._ROLE_BY_VARIANT[this.variant] ?? 'status';
    }
```

Et étendre la condition dans `updated()` pour réagir aux changements de `urgent` :

```ts
    override updated(changed: Map<string, unknown>) {
        if (changed.has('variant') || changed.has('withoutNotification') || changed.has('urgent')) {
            this._updateRole();
        }
    }
```

- [ ] **Step 4: Relancer les tests**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run test --workspace=packages/core -- alert.test.ts`
Expected: PASS sur tout `alert.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/components/alert/alert.ts packages/core/src/components/alert/alert.test.ts
git commit -m "feat(alert): ajoute la prop urgent pour surcharger le role indépendamment de variant"
```

---

### Task 4: Icône par défaut absente + warning dev pour variant custom

**Files:**

- Modify: `packages/core/src/components/alert/alert.ts`
- Test: `packages/core/src/components/alert/alert.test.ts`

**Interfaces:**

- Consumes: `warn` depuis `../../utils/warn.js` (déjà importé), `_ICON_PATHS`.
- Produces: `_defaultIcon()` retourne `TemplateResult | typeof nothing`.

- [ ] **Step 1: Écrire les tests rouges**

Dans `packages/core/src/components/alert/alert.test.ts`, dans le bloc `describe('icône', ...)`,
ajouter :

```ts
it("n'affiche pas d'icône par défaut pour un variant custom inconnu", async () => {
    el = await fixture('<ar-alert variant="promo"></ar-alert>');
    expect(requireShadow(el).querySelector('slot[name="icon"] svg')).toBeNull();
});

it('logue un avertissement pour un variant custom inconnu', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    el = await fixture('<ar-alert variant="promo"></ar-alert>');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('promo'));
    spy.mockRestore();
});

it("n'avertit pas pour un variant connu", async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    el = await fixture('<ar-alert variant="success"></ar-alert>');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
});
```

- [ ] **Step 2: Lancer les tests pour vérifier l'échec**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run test --workspace=packages/core -- alert.test.ts`
Expected: FAIL — un `<svg>` est actuellement toujours rendu (fallback `DEFAULT_VARIANT`), et
aucun `warn()` n'est émis pour un variant inconnu.

- [ ] **Step 3: Implémenter le fallback + le warning**

Dans `packages/core/src/components/alert/alert.ts`, remplacer `_defaultIcon()` (lignes 117-129
actuelles) :

```ts
    protected _defaultIcon(): TemplateResult {
        const path = ArAlert._ICON_PATHS[this.variant ?? ArAlert.DEFAULT_VARIANT];
        return html` <svg
            aria-hidden="true"
            part="icon-svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
        >
            <path stroke-linecap="round" stroke-linejoin="round" d=${path}></path>
        </svg>`;
    }
```

par :

```ts
    protected _defaultIcon(): TemplateResult | typeof nothing {
        const path = ArAlert._ICON_PATHS[this.variant];
        if (path === undefined) return nothing;
        return html` <svg
            aria-hidden="true"
            part="icon-svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
        >
            <path stroke-linecap="round" stroke-linejoin="round" d=${path}></path>
        </svg>`;
    }
```

Étendre `updated()` pour émettre le warning quand `variant` change vers une valeur inconnue :

```ts
    override updated(changed: Map<string, unknown>) {
        if (changed.has('variant') || changed.has('withoutNotification') || changed.has('urgent')) {
            this._updateRole();
        }
        if (changed.has('variant') && !(this.variant in ArAlert._ICON_PATHS)) {
            warn(
                'ar-alert',
                `variant="${this.variant}" n'a pas d'icône par défaut, fournissez un contenu via slot="icon".`,
            );
        }
    }
```

- [ ] **Step 4: Relancer les tests**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run test --workspace=packages/core -- alert.test.ts`
Expected: PASS sur tout `alert.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/components/alert/alert.ts packages/core/src/components/alert/alert.test.ts
git commit -m "feat(alert): supprime l'icône par défaut sur un variant custom inconnu, ajoute un warning dev"
```

---

### Task 5: Génériciser les tokens CSS (styles.ts + default.css)

**Files:**

- Modify: `packages/core/src/components/alert/alert.styles.ts:13-47`
- Modify: `packages/core/src/styles/themes/default.css:294-310` (light), `:600-604` (dark
  override globale), `:660-664` (dark média query)
- Modify: `packages/core/src/components/alert/alert.ts` (JSDoc `@cssprop`, lignes 34-45)

**Interfaces:** aucune (changement purement CSS/documentation, pas de nouvelle interface JS).

- [ ] **Step 1: Remplacer les 4 blocs `:host([variant='...'])` par un bloc générique**

Dans `packages/core/src/components/alert/alert.styles.ts`, remplacer les lignes 13-47 :

```css
:host([variant='info']) {
    background-color: var(--ar-alert-info-bg);
    border-color: var(--ar-alert-info-border);

    [part='icon'] {
        color: var(--ar-alert-info-icon);
    }
}

:host([variant='error']) {
    background-color: var(--ar-alert-error-bg);
    border-color: var(--ar-alert-error-border);

    [part='icon'] {
        color: var(--ar-alert-error-icon);
    }
}

:host([variant='warning']) {
    background-color: var(--ar-alert-warning-bg);
    border-color: var(--ar-alert-warning-border);

    [part='icon'] {
        color: var(--ar-alert-warning-icon);
    }
}

:host([variant='success']) {
    background-color: var(--ar-alert-success-bg);
    border-color: var(--ar-alert-success-border);

    [part='icon'] {
        color: var(--ar-alert-success-icon);
    }
}
```

par :

```css
:host {
    background-color: var(--ar-alert-bg);
    border-color: var(--ar-alert-border);
}

[part='icon'] {
    color: var(--ar-alert-icon);
}
```

(la déclaration `display: flex; ... color: var(--ar-alert-color);` du premier bloc `:host { ... }`,
lignes 4-11, reste inchangée et fusionne avec les deux nouvelles lignes `background-color`/
`border-color` — un seul bloc `:host { ... }` au total dans le fichier).

Note : `[part='icon']` existe déjà plus bas dans le fichier (lignes 92-96, règles `flex`/
`display`/`align-items`) — fusionner la couleur dans ce bloc existant plutôt que d'en créer un
second :

```css
[part='icon'] {
    color: var(--ar-alert-icon);
    flex: 0 0 auto;
    display: flex;
    align-items: center;
}
```

- [ ] **Step 2: Réécrire les tokens dans `default.css` avec sélecteurs d'attribut**

Dans `packages/core/src/styles/themes/default.css`, remplacer les lignes 294-308 :

```css
/* alert */
--ar-alert-color: var(--ar-color-text);
--ar-alert-close-size: 2rem;
--ar-alert-info-bg: var(--ar-color-info-bg);
--ar-alert-info-border: var(--ar-color-info-bg);
--ar-alert-info-icon: var(--ar-color-info-text);
--ar-alert-warning-bg: var(--ar-color-warning-bg);
--ar-alert-warning-border: var(--ar-color-warning-bg);
--ar-alert-warning-icon: var(--ar-color-warning-text);
--ar-alert-error-bg: var(--ar-color-danger-bg);
--ar-alert-error-border: var(--ar-color-danger-bg);
--ar-alert-error-icon: var(--ar-color-danger-text);
--ar-alert-success-bg: var(--ar-color-success-bg);
--ar-alert-success-border: var(--ar-color-success-bg);
--ar-alert-success-icon: var(--ar-color-success-text);
```

par :

```css
/* alert */
--ar-alert-color: var(--ar-color-text);
--ar-alert-close-size: 2rem;
```

`--ar-alert-close-transition-duration` et `--ar-alert-hide-transition-duration` (lignes 309-310)
restent inchangés à leur emplacement.

Ajouter, après le bloc `:root { ... }` où vivaient ces tokens (donc toujours à l'intérieur de
`:root`, à la suite de la ligne `--ar-alert-hide-transition-duration: 0.33s;`), les presets par
sélecteur d'attribut — chercher le point d'insertion le plus proche possible du reste des
tokens `alert` pour rester lisible :

```css
        /* alert — presets par variant */
    }

    ar-alert[variant='info'] {
        --ar-alert-bg: var(--ar-color-info-bg);
        --ar-alert-border: var(--ar-color-info-bg);
        --ar-alert-icon: var(--ar-color-info-text);
    }

    ar-alert[variant='warning'] {
        --ar-alert-bg: var(--ar-color-warning-bg);
        --ar-alert-border: var(--ar-color-warning-bg);
        --ar-alert-icon: var(--ar-color-warning-text);
    }

    ar-alert[variant='error'] {
        --ar-alert-bg: var(--ar-color-danger-bg);
        --ar-alert-border: var(--ar-color-danger-bg);
        --ar-alert-icon: var(--ar-color-danger-text);
    }

    ar-alert[variant='success'] {
        --ar-alert-bg: var(--ar-color-success-bg);
        --ar-alert-border: var(--ar-color-success-bg);
        --ar-alert-icon: var(--ar-color-success-text);
    }
```

Attention : ces 4 blocs sortent du bloc `:root { ... }` (les sélecteurs d'attribut ciblent
l'élément `ar-alert`, pas `:root`) — fermer `:root` juste avant (`}` ajouté ci-dessus) sans
perturber le reste des tokens qui suivent dans le fichier (vérifier après édition que le fichier
reste syntaxiquement valide : lancer `npm run build --workspace=packages/core` au Step 4 le
confirmera).

Ensuite, dans la section dark mode globale (lignes 600-604 actuelles) :

```css
/* Alert */
--ar-alert-info-border: var(--ar-color-info-40);
--ar-alert-warning-border: var(--ar-color-warning-40);
--ar-alert-error-border: var(--ar-color-danger-40);
--ar-alert-success-border: var(--ar-color-success-40);
```

remplacer par (les surcharges dark ciblent maintenant l'attribut, plus le suffixe nommé) :

```css
/* Alert : ces surcharges de bordure dark mode nécessitent un sélecteur d'attribut,
           déplacées hors de ce bloc — voir les 4 règles `ar-alert[variant='...']` dupliquées
           sous [data-theme='dark'] plus bas dans ce fichier. */
```

Puis, juste après la fermeture du bloc de sélecteur dark mode qui contenait ces 4 lignes (celui
qui commence par le sélecteur portant `--ar-alert-info-border` etc. à la ligne ~599 d'origine),
ajouter les 4 sélecteurs d'attribut équivalents pour le dark mode :

```css
ar-alert[variant='info'] {
    --ar-alert-border: var(--ar-color-info-40);
}
ar-alert[variant='warning'] {
    --ar-alert-border: var(--ar-color-warning-40);
}
ar-alert[variant='error'] {
    --ar-alert-border: var(--ar-color-danger-40);
}
ar-alert[variant='success'] {
    --ar-alert-border: var(--ar-color-success-40);
}
```

Faire la même opération pour le second bloc dark mode (média query, lignes 660-664 actuelles,
`--ar-alert-info-border: var(--ar-color-info-40);` etc.) : remplacer les 4 lignes de tokens
nommés par les 4 mêmes sélecteurs d'attribut `ar-alert[variant='...'] { --ar-alert-border: ...; }`
imbriqués dans la média query existante (`@media (prefers-color-scheme: dark)`), au même niveau
que les autres règles déjà présentes dans cette média query.

- [ ] **Step 2bis: Vérifier la syntaxe CSS du fichier après édition**

Ce fichier n'a pas de test automatisé ciblé — la vérification se fait par le build (voir Step 4)
et par une relecture manuelle : chaque accolade ouverte par `:root {` ou un sélecteur d'attribut
doit être refermée correctement, aucun token `--ar-alert-{variant}-*` nommé ne doit subsister
(vérifier avec `grep -n "\-\-ar-alert-\(info\|warning\|error\|success\)-" packages/core/src/styles/themes/default.css` — la commande doit ne rien retourner après l'édition).

- [ ] **Step 3: Mettre à jour le JSDoc `@cssprop` de `alert.ts`**

Dans `packages/core/src/components/alert/alert.ts`, remplacer les lignes 34-45 :

```ts
 * @cssprop --ar-alert-close-size - Taille (width/height) du bouton de fermeture.
 * @cssprop --ar-alert-info-bg - Fond de l'alerte "info".
 * @cssprop --ar-alert-info-border - Bordure de l'alerte "info".
 * @cssprop --ar-alert-info-icon - Couleur de l'icône "info".
 * @cssprop --ar-alert-warning-bg - Fond de l'alerte "warning".
 * @cssprop --ar-alert-warning-border - Bordure de l'alerte "warning".
 * @cssprop --ar-alert-warning-icon - Couleur de l'icône "warning".
 * @cssprop --ar-alert-error-bg - Fond de l'alerte "error".
 * @cssprop --ar-alert-error-border - Bordure de l'alerte "error".
 * @cssprop --ar-alert-error-icon - Couleur de l'icône "error".
 * @cssprop --ar-alert-success-bg - Fond de l'alerte "success".
 * @cssprop --ar-alert-success-border - Bordure de l'alerte "success".
 * @cssprop --ar-alert-success-icon - Couleur de l'icône "success".
```

par :

```ts
 * @cssprop --ar-alert-close-size - Taille (width/height) du bouton de fermeture.
 * @cssprop --ar-alert-bg - Fond de l'alerte. Valeur définie par `default.css` selon `variant`
 *   (`ar-alert[variant='...']`) pour les 4 presets connus ; à définir soi-même pour un variant
 *   custom.
 * @cssprop --ar-alert-border - Bordure de l'alerte. Même mécanisme que `--ar-alert-bg`.
 * @cssprop --ar-alert-icon - Couleur de l'icône de variant. Même mécanisme que `--ar-alert-bg`.
```

- [ ] **Step 4: Build pour valider la syntaxe CSS et le typecheck**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run build --workspace=packages/core`
Expected: le build se termine sans erreur (aucune erreur PostCSS/esbuild sur `default.css`,
aucune erreur `tsc` sur `alert.ts`).

- [ ] **Step 5: Relancer la suite de tests unitaires complète du composant**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run test --workspace=packages/core -- alert.test.ts`
Expected: PASS (les tests unitaires ne dépendent pas de `default.css`, ce changement CSS ne doit
rien casser côté jsdom/happy-dom).

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/components/alert/alert.ts packages/core/src/components/alert/alert.styles.ts packages/core/src/styles/themes/default.css
git commit -m "refactor(alert): généricise les tokens CSS de variant (12 tokens nommés -> 3 génériques)"
```

---

### Task 6: Mettre à jour la documentation `ar-alert.mdx`

**Files:**

- Modify: `apps/docs/src/content/components/ar-alert.mdx`

**Interfaces:** aucune.

- [ ] **Step 1: Mettre à jour la section Accessibilité**

Dans `apps/docs/src/content/components/ar-alert.mdx`, remplacer les lignes 43-54 :

```mdx
- `role="alert"` (interruption immédiate) ou `role="status"` (annonce polie) posé sur
  l'hôte selon le variant — `info` → `status`, tous les autres → `alert` — conforme
    <WcagRef
        criterion="4.1.3"
        summary="Status Messages : les messages de statut doivent être annoncés aux technologies d'assistance sans déplacer le focus."
    />
- L'icône est masquée aux lecteurs d'écran (`aria-hidden`). L'information de sévérité
  est portée par le `role`, pas par l'icône.
- Une icône par défaut est fournie pour chaque variant. Elle peut être remplacée via le
  slot `icon`, mais il est déconseillé de la supprimer : elle constitue un repère visuel
  non colorimétrique, important pour les utilisateurs daltoniens ou en environnement à
  faible contraste.
```

par :

```mdx
- `role="alert"` (interruption immédiate) ou `role="status"` (annonce polie) posé sur
  l'hôte selon `variant` — `error`/`warning` → `alert`, `success`/`info` → `status`, tout
  variant custom non reconnu → `status` (défaut sûr) — conforme
    <WcagRef
        criterion="4.1.3"
        summary="Status Messages : les messages de statut doivent être annoncés aux technologies d'assistance sans déplacer le focus."
    />
- La prop `urgent` permet de forcer ce niveau indépendamment de `variant` : sa seule
  présence (`<ar-alert urgent>`, pas besoin de `="true"`) force `role="alert"`. Elle
  n'est jamais forcée par son absence — sans elle, le rôle retombe sur la déduction
  ci-dessus.
- L'icône est masquée aux lecteurs d'écran (`aria-hidden`). L'information de sévérité
  est portée par le `role`, pas par l'icône.
- Une icône par défaut est fournie pour les 4 variants connus (`error`, `warning`,
  `success`, `info`). Elle peut être remplacée via le slot `icon`, mais il est
  déconseillé de la supprimer : elle constitue un repère visuel non colorimétrique,
  important pour les utilisateurs daltoniens ou en environnement à faible contraste. Un
  `variant` custom non reconnu par le composant n'affiche aucune icône par défaut (un
  avertissement en console le rappelle en dev) — fournissez `slot="icon"` dans ce cas.
```

- [ ] **Step 2: Ajouter une note sur les tokens génériques dans "À votre charge"**

Dans le même fichier, après la puce "Niveau de sévérité cohérent..." (ligne 63-65 actuelle),
ajouter une puce :

```mdx
- **Styliser un `variant` custom.** Au-delà des 4 presets fournis par `default.css`
  (`error`/`warning`/`success`/`info`), tout autre `variant` doit définir lui-même
  `--ar-alert-bg`, `--ar-alert-border` et `--ar-alert-icon` (ex.
  `ar-alert[variant='promo'] { --ar-alert-bg: ...; }`) et fournir une icône via
  `slot="icon"`.
```

- [ ] **Step 3: Vérifier visuellement que la doc build**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run build --workspace=apps/docs`
Expected: le build Astro se termine sans erreur (frontmatter MDX valide).

- [ ] **Step 4: Commit**

```bash
git add apps/docs/src/content/components/ar-alert.mdx
git commit -m "docs(alert): documente le nouveau mapping role/variant et la prop urgent"
```

---

### Task 7: Vérification finale et ouverture de la PR

**Files:** aucun nouveau fichier.

- [ ] **Step 1: Lancer la suite de tests complète (unitaires + navigateur)**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run test:all --workspace=packages/core`
Expected: tous les tests passent, y compris `alert.a11y.test.ts` (aucune régression axe-core
attendue — la structure DOM/role reste valide pour les 4 variants connus).

- [ ] **Step 2: Lancer le lint**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run lint --workspace=packages/core`
Expected: aucune erreur.

- [ ] **Step 3: Régénérer le manifest de composants**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run build:manifest --workspace=packages/core`
Expected: `custom-elements.json` est régénéré sans erreur, reflète la nouvelle prop `urgent` et
les nouveaux `@cssprop`.

- [ ] **Step 4: Vérifier qu'aucun fichier `dist/` n'est resté indexé**

Run: `cd /Users/jon/Code/Active_projects/ariane && git status`
Expected: seuls les fichiers source attendus (alert.ts, alert.styles.ts, alert.test.ts,
default.css, ar-alert.mdx, custom-elements.json le cas échéant) apparaissent — aucun fichier sous
`dist/` ou `cdn/` (cf. convention projet : ne jamais committer les artefacts de build).

- [ ] **Step 5: Push et ouverture de la PR vers `dev`**

```bash
git push -u origin refactor/alert-variant-role-decoupling
gh pr create --base dev --title "refactor(alert): découple variant et role, généricise les tokens CSS" --body "$(cat <<'EOF'
## Summary
- Remplace le mapping binaire `variant === 'info' ? status : alert` par une table de
  correspondance à 4 entrées (`error`/`warning` → alert, `success`/`info` → status).
- Ajoute une prop `urgent` pour surcharger explicitement ce mapping, y compris sur les
  4 variants connus.
- Remplace les 12 tokens CSS nommés par variant par 3 tokens génériques
  (`--ar-alert-bg`, `--ar-alert-border`, `--ar-alert-icon`), les 4 presets connus
  déplacés dans `default.css` via sélecteurs d'attribut.
- Un `variant` custom sans preset connu n'affiche plus d'icône par défaut et émet un
  avertissement dev invitant à fournir `slot="icon"` (WCAG 1.4.1).

Design détaillé : `docs/superpowers/specs/2026-07-28-alert-variant-role-decoupling-design.md`

## Test plan
- [ ] `npm run test:all --workspace=packages/core` (unitaires + a11y navigateur)
- [ ] `npm run lint --workspace=packages/core`
- [ ] Vérification manuelle dans `apps/docs` : les 4 variants existants s'affichent
      identiquement à avant (régression visuelle nulle attendue sur les presets connus).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: la commande retourne l'URL de la PR créée, base `dev`.

---

## Self-Review

**Couverture de la spec :**

- §1 (`variant` typage élargi, pas de rename) → Task 2, Step 3.
- §2 (table `ROLE_BY_VARIANT`, prop `urgent`, priorité, nuance présence/absence) → Task 2 + 3.
- §3 (tokens génériques, presets `default.css`) → Task 5.
- §4 (icônes conservées pour les 4 presets, fallback + warn pour custom) → Task 4.
- Impact périphérique (JSDoc, mdx, tests) → Task 5 Step 3, Task 6, Task 2-4 (tests).

**Pas de placeholder** : chaque step contient soit le diff complet, soit une commande exacte avec
sortie attendue.

**Cohérence des types/noms** : `variant: ArAlertVariant | (string & {})` (Task 2) ; `urgent?:
boolean` (Task 3) ; `_ROLE_BY_VARIANT` / `_updateRole()` réutilisés identiquement entre Task 2, 3
et 4 — noms vérifiés cohérents à travers les tasks.
