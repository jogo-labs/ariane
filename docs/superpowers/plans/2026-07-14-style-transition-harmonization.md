# Passe style v1 — PR (c) : Harmonisation durées d'animation/transition

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trancher les 2 incohérences de durée d'animation/transition identifiées par l'audit du 2026-07-13 et validées par décision utilisateur le 2026-07-14 : harmoniser la durée d'apparition des popovers (`panel.styles.ts` vs `tooltip.styles.ts`), et ajouter une transition standard sur les boutons partagés qui n'en ont aucune. Contrairement aux PR (a)/(b), ce chantier **change le rendu visuel** (c'est son objet).

**Architecture:** Les durées ciblées sont actuellement des littéraux `0.2s`/`0.15s` codés en dur directement dans les `*.styles.ts` (aucune n'était tokenisée, y compris avant cet audit) — chaque tâche introduit un token `--ar-*` dans `default.css` ET l'applique aux fichiers concernés dans le même mouvement, plutôt que de re-séparer tokenisation et harmonisation.

## Décisions utilisateur (2026-07-14)

1. **Durée d'apparition des popovers** : harmoniser sur **0.2s** partout (aligner `tooltip.styles.ts`, actuellement 0.15s, sur `panel.styles.ts`/`arPanelShow`, actuellement 0.2s — utilisé par dropdown/breadcrumb/stepper mobile/datepicker). Changement visuel assumé : la tooltip apparaît 50ms plus lentement qu'avant.
2. **Radius non systématisé** (alert-close=7px, dialog/pagination=0.5rem, stepper-trigger=0.75rem) : **aucune action** — variation jugée intentionnelle (cf. [[project_style_audit_radius_decision]] en mémoire projet). Ce plan ne touche à aucun radius.
3. **Transitions hover/press absentes sur les boutons partagés** : ajouter une transition standard `background-color`/`color`/`border-color` à **0.15s** (valeur alignée sur la transition déjà existante du bouton de fermeture `alert`) sur `.btn` dans `button.styles.ts` — hérité par tous les variants (`.btn-secondary`, `.btn-tertiary`, `.btn-ratio-square`, etc.) et donc par tous les composants qui l'importent (pagination, stepper, dialog, breadcrumb). Changement visuel assumé : ces boutons passent d'un changement d'état instantané à une transition douce de 0.15s.

## Global Constraints

- Les 2 nouveaux tokens de durée doivent être utilisés via `var(--token)` dans les composants — aucune valeur de durée codée en dur ne doit rester après ce plan dans les fichiers touchés.
- Ne pas toucher aux radius (`--ar-alert-close-radius`, `--ar-pagination-radius`, `--ar-stepper-trigger-radius`, dialog modal) — décision explicite de ne rien changer sur ce point (cf. ci-dessus).
- Prettier : 100 caractères, 4 espaces, guillemets simples (`npm run format` ou le hook `lint-staged` au commit s'en charge).
- Branche `fix/<desc>` créée depuis la pointe de `fix/vendor-prefix-cleanup` (PR (b) du même chantier, pas encore mergée — évite tout conflit sur `button.styles.ts`, déjà modifié par PR (a) et (b)). La PR GitHub ciblera `fix/vendor-prefix-cleanup` comme base (PR empilée sur (a) et (b)), à retargeter vers `dev` une fois (a) et (b) mergées.
- `prefers-reduced-motion: reduce` est déjà géré pour l'animation des popovers (`animation: none`) — vérifier qu'il continue à s'appliquer correctement après le passage au token. La nouvelle transition des boutons n'a PAS de bloc `prefers-reduced-motion` existant dans `button.styles.ts` — ne pas en ajouter un dans ce plan (hors scope, à traiter séparément si besoin).

---

### Task 1: Créer la branche de travail

**Files:** aucun.

- [ ] **Step 1: Créer et checkout la branche depuis la pointe de `fix/vendor-prefix-cleanup`**

```bash
cd /Users/jon/Code/Active_projects/ariane
git checkout fix/vendor-prefix-cleanup
git pull
git checkout -b fix/style-transition-harmonization
```

Expected: la branche `fix/style-transition-harmonization` est active (`git branch --show-current`), basée sur le dernier commit de `fix/vendor-prefix-cleanup`.

---

### Task 2: Harmoniser la durée d'apparition des popovers sur 0.2s

**Contexte :** `panel.styles.ts` (dropdown/breadcrumb/stepper mobile panel/datepicker) utilise déjà `arPanelShow 0.2s ease-out`. `tooltip.styles.ts` utilise le même keyframe mais avec `0.15s ease-out`. On introduit un token partagé `--ar-panel-show-duration` et on aligne les deux fichiers dessus.

**Files:**

- Modify: `packages/core/src/styles/themes/default.css` (section panel, après `--ar-panel-max-width`)
- Modify: `packages/core/src/styles/shared/panel.styles.ts`
- Modify: `packages/core/src/components/tooltip/tooltip.styles.ts`

**Interfaces:**

- Consumes: rien
- Produces: `--ar-panel-show-duration` (consommé par `panel.styles.ts` ET `tooltip.styles.ts`)

- [ ] **Step 1: Ajouter le token dans `default.css`**

Dans la section `/* panel (shared — dropdown, breadcrumb, stepper) */`, après `--ar-panel-max-width: 18rem;` :

```css
--ar-panel-show-duration: 0.2s;
```

- [ ] **Step 2: Utiliser le token dans `panel.styles.ts`**

Remplacer :

```css
[part='panel']:popover-open {
    animation: arPanelShow 0.2s ease-out;
}
```

par :

```css
[part='panel']:popover-open {
    animation: arPanelShow var(--ar-panel-show-duration) ease-out;
}
```

- [ ] **Step 3: Utiliser le token dans `tooltip.styles.ts`**

Remplacer :

```css
[part='bubble']:popover-open {
    animation: arPanelShow 0.15s ease-out;
}
```

par :

```css
[part='bubble']:popover-open {
    animation: arPanelShow var(--ar-panel-show-duration) ease-out;
}
```

- [ ] **Step 4: Vérifier**

```bash
grep -n "arPanelShow" packages/core/src/styles/shared/panel.styles.ts packages/core/src/components/tooltip/tooltip.styles.ts
```

Expected: les 2 lignes utilisent `var(--ar-panel-show-duration)`, aucune ne contient plus `0.2s` ou `0.15s` en dur.

- [ ] **Step 5: Vérifier que `prefers-reduced-motion` est intact dans les 2 fichiers**

```bash
grep -n "prefers-reduced-motion" -A3 packages/core/src/styles/shared/panel.styles.ts packages/core/src/components/tooltip/tooltip.styles.ts
```

Expected: les 2 blocs `@media (prefers-reduced-motion: reduce) { ... animation: none; ... }` sont toujours présents et inchangés.

- [ ] **Step 6: Lancer les tests des composants concernés**

```bash
npx vitest run packages/core/src/components/tooltip packages/core/src/components/dropdown packages/core/src/components/breadcrumb packages/core/src/components/stepper packages/core/src/components/datepicker --root packages/core
```

Expected: tous les tests passent (tous les composants qui importent `panel.styles.ts` ou le keyframe `arPanelShow` via `tooltip.styles.ts`).

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/styles/themes/default.css packages/core/src/styles/shared/panel.styles.ts packages/core/src/components/tooltip/tooltip.styles.ts
git commit -m "fix(core): harmonise la durée d'apparition des popovers sur 0.2s"
```

---

### Task 3: Ajouter une transition standard sur les boutons partagés

**Contexte :** `button.styles.ts` (`.btn` et ses variants) n'a aucune transition sur `background-color`/`color`/`border-color` — les changements d'état (hover, active, focus) sont instantanés. `alert.styles.ts` a déjà une transition `0.15s` sur son bouton de fermeture (`[part='close']`) ; on aligne la nouvelle transition des boutons partagés sur cette même durée, et on retokenise au passage la valeur déjà présente dans `alert.styles.ts` pour qu'elle utilise le même token (au lieu de son littéral `0.15s` actuel).

**Files:**

- Modify: `packages/core/src/styles/themes/default.css` (section button, après `--ar-button-ratio-square-width`)
- Modify: `packages/core/src/styles/components/button.styles.ts`
- Modify: `packages/core/src/components/alert/alert.styles.ts`

**Interfaces:**

- Consumes: rien
- Produces: `--ar-button-transition-duration` (consommé par `button.styles.ts` ET `alert.styles.ts`)

- [ ] **Step 1: Ajouter le token dans `default.css`**

Dans la section `/* button */`, après `--ar-button-ratio-square-width: 2.5rem;` :

```css
--ar-button-transition-duration: 0.15s;
```

- [ ] **Step 2: Ajouter la transition à `.btn` dans `button.styles.ts`**

Remplacer :

```css
.btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 var(--ar-button-padding-x);
    min-height: var(--ar-button-height);
    border-color: transparent;
    border-radius: var(--ar-button-border-radius-pill);
    text-decoration: none;
    border: 1px solid transparent;
    font-size: var(--ar-font-size-md);
    line-height: 1;
    font-weight: 500;
}
```

par :

```css
.btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 var(--ar-button-padding-x);
    min-height: var(--ar-button-height);
    border-color: transparent;
    border-radius: var(--ar-button-border-radius-pill);
    text-decoration: none;
    border: 1px solid transparent;
    font-size: var(--ar-font-size-md);
    line-height: 1;
    font-weight: 500;
    transition:
        background-color var(--ar-button-transition-duration),
        color var(--ar-button-transition-duration),
        border-color var(--ar-button-transition-duration);
}
```

- [ ] **Step 3: Retokeniser la transition existante dans `alert.styles.ts`**

Remplacer :

```css
transition:
    opacity 0.15s,
    background-color 0.15s;
```

par :

```css
transition:
    opacity var(--ar-button-transition-duration),
    background-color var(--ar-button-transition-duration);
```

- [ ] **Step 4: Vérifier**

```bash
grep -n "transition" packages/core/src/styles/components/button.styles.ts
grep -n "0.15s" packages/core/src/components/alert/alert.styles.ts
```

Expected: la 1ère commande montre la nouvelle transition sur 3 lignes utilisant `var(--ar-button-transition-duration)`. La 2e ne retourne rien (plus de littéral `0.15s` dans ce fichier — la transition `:host([hiding])` utilise `0.33s`, une durée différente et volontairement non concernée par ce plan).

- [ ] **Step 5: Lancer la suite de tests core**

```bash
npm run test --workspace=@ariane-ui/core
```

Expected: tous les tests passent (`.btn` est la classe de base partagée par tous les boutons — pagination, stepper, dialog, breadcrumb, alert).

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/styles/themes/default.css packages/core/src/styles/components/button.styles.ts packages/core/src/components/alert/alert.styles.ts
git commit -m "fix(button): ajoute une transition standard sur les boutons partagés"
```

---

### Task 4: Validation finale et ouverture de la PR

**Files:** aucun.

- [ ] **Step 1: Lancer la suite complète**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run test
```

Expected: tous les tests passent (658+ tests, aucune régression).

- [ ] **Step 2: Lancer les tests navigateur (WTR)**

```bash
npm run test:all
```

Expected: tous les tests passent (220+ tests).

- [ ] **Step 3: Sweep final**

```bash
grep -rn "arPanelShow 0\.\|arPanelShow.*ease-out" packages/core/src/styles/shared/panel.styles.ts packages/core/src/components/tooltip/tooltip.styles.ts
grep -n "0.15s" packages/core/src/styles/components/button.styles.ts packages/core/src/components/alert/alert.styles.ts
```

Expected: la 1ère commande montre les 2 fichiers utilisant `var(--ar-panel-show-duration)`, aucun littéral. La 2e ne retourne rien.

- [ ] **Step 4: Push et ouvrir la PR vers `fix/vendor-prefix-cleanup` (PR empilée sur (a) et (b), à retargeter vers `dev` une fois les deux mergées)**

```bash
git push -u origin fix/style-transition-harmonization
gh pr create --base fix/vendor-prefix-cleanup --title "fix(core): harmonise les durées d'animation/transition des popovers et boutons" --body "$(cat <<'EOF'
## Summary
- Harmonise la durée d'apparition des popovers sur 0.2s (tooltip alignée sur panel.styles.ts, était 0.15s) via le nouveau token `--ar-panel-show-duration`
- Ajoute une transition standard (0.15s, background-color/color/border-color) sur `.btn` dans button.styles.ts — hérité par tous les boutons partagés (pagination, stepper, dialog, breadcrumb) — via le nouveau token `--ar-button-transition-duration`
- Retokenise au passage la transition déjà existante du bouton de fermeture `alert` sur ce même token
- Radius non harmonisés (alert-close/dialog/pagination/stepper-trigger) : décision explicite de ne pas y toucher, cf. plan

⚠️ PR empilée sur #98 (PR (a)) et #99 (PR (b)), pas encore mergées — base à retargeter vers `dev` une fois les deux mergées.

**Changement visuel assumé** (contrairement aux PR (a)/(b) qui étaient à parité stricte) :
- La tooltip apparaît 50ms plus lentement (0.15s → 0.2s)
- Les boutons partagés passent d'un changement d'état instantané à une transition douce de 0.15s sur hover/active/focus

Suite de l'audit style global du 2026-07-13, décisions de design tranchées le 2026-07-14.

## Test plan
- [x] \`npm run test\` (vitest)
- [x] \`npm run test:all\` (WTR navigateur)
- [x] Sweep grep confirmant l'absence de chaque littéral de durée ciblé
- [x] Chaque tâche relue par un subagent indépendant (spec + qualité)
EOF
)"
```

Expected: PR créée, URL retournée.
