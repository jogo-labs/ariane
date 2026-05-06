# ar-dropdown : renommage `trigger` → `for`

**Date :** 2026-05-05
**Issue :** backlog — cohérence API avec `ar-tooltip`
**Scope :** `packages/core` uniquement

---

## Contexte

`ar-dropdown` expose deux mécanismes pour résoudre son trigger :

1. `slot="trigger"` — trigger slotté, vit à l'intérieur du composant (cas courant)
2. attribut `trigger="btn-id"` — trigger externe par ID (cas toolbar, composant parent)

`ar-tooltip` utilise `for="btn-id"` pour le même mécanisme d'ID externe. Le renommage aligne les deux composants sur la même convention, cohérente avec `<label for>`.

Les deux cas d'usage sont conservés : le slot pour le cas "trigger créé pour le dropdown", `for` pour le cas "trigger préexistant". La complexité de gestion est déjà en place.

---

## Décisions

### `trigger` → `for`

L'attribut `trigger` est renommé `for` dans `ar-dropdown`. Même comportement, même priorité : si `for` est défini, il prend la priorité sur le slot.

On est en alpha — pas de période de dépréciation, pas d'alias.

### Slot `"trigger"` conservé

Le slot `slot="trigger"` reste le mécanisme principal pour le cas courant. Le retirer forcerait un ID sur chaque trigger, ce qui est du bruit pour la majorité des usages.

### `warn()` sur conflit

Si `for` est défini **et** qu'un élément est assigné au slot `"trigger"`, un avertissement `__DEV__` est émis :

```
[ar-dropdown] for et slot="trigger" sont tous les deux définis — for prend la priorité.
```

Aligné avec l'infra `warn()` existante (`src/utils/warn.ts`).

---

## Changements

### `packages/core/src/components/dropdown/dropdown.ts`

- `@property trigger` → `@property for` (même options : `reflect: true`)
- `this.trigger` → `this.for` partout
- `changed.has('trigger')` → `changed.has('for')`
- Warn ID introuvable : `"l'id \"${this.trigger}\""` → `"l'id \"${this.for}\""`
- `_resolvedTrigger` : ajouter le warn conflit quand `this.for` est défini et slot non vide
- JSDoc `@slot trigger` : mettre à jour la mention de `trigger` → `for`

### `packages/core/src/components/dropdown/dropdown.test.ts`

- Renommer les occurrences de l'attribut `trigger` → `for`
- Ajouter un test : warn émis quand `for` + slot `"trigger"` sont tous les deux actifs

### `packages/core/src/components/dropdown/dropdown.browser.test.ts`

- Renommer les occurrences de l'attribut `trigger` → `for`

### `packages/core/src/components/dropdown/dropdown.a11y.test.ts`

- Renommer les occurrences de l'attribut `trigger` → `for`

### `apps/docs/src/content/components/ar-dropdown.mdx`

- Variante `external-trigger` : `trigger="ar-doc-ext-trigger"` → `for="ar-doc-ext-trigger"`
- Description de la variante : mettre à jour la mention de l'attribut
- Section accessibilité : retirer la mention de `aria-controls` (supprimé en #69)

### `custom-elements.json`

- Régénérer via `npm run build:manifest`

---

## Comportement résolu inchangé

| Cas              | `for`  | Slot    | Trigger résolu                                          |
| ---------------- | ------ | ------- | ------------------------------------------------------- |
| Slot uniquement  | vide   | présent | premier élément du slot                                 |
| `for` uniquement | défini | vide    | `document.getElementById(for)` — warn si ID introuvable |
| Les deux         | défini | présent | `document.getElementById(for)` + warn conflit           |
| Aucun            | vide   | vide    | `null` — silencieux                                     |

---

## Tests à écrire / mettre à jour

| Fichier                    | Action                                                 |
| -------------------------- | ------------------------------------------------------ |
| `dropdown.test.ts`         | renommer `trigger` → `for` ; ajouter test warn conflit |
| `dropdown.browser.test.ts` | renommer `trigger` → `for`                             |
| `dropdown.a11y.test.ts`    | renommer `trigger` → `for`                             |

---

## Hors scope

- Renommer le slot `"trigger"` (conservé tel quel)
- Modifier `ar-dropdown-item`
- Modifier `AnchoredController`
- Changelog, release notes (gérés à la prochaine release)
