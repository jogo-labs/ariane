# Stepper — Téléportation DOM adaptive

## Contexte

Le composant `ar-stepper` expose aujourd'hui une prop `version="mobile"` qui force
l'intégrateur à dupliquer le composant dans sa page (une fois sans `version`, une
fois avec), puis à gérer lui-même le CSS `display: none` selon le viewport.

Ce pattern est une mauvaise DX : il crée deux sources de vérité, deux instances à
synchroniser, et expose un détail d'implémentation (la mécanique de rendu) au lieu
d'exprimer l'intention (où le composant doit se trouver selon le viewport).

Le composant est en alpha, non utilisé en production — pas de processus de
dépréciation nécessaire.

---

## Objectif

L'intégrateur instancie `<ar-stepper>` **une seule fois** à son emplacement mobile
(mobile-first, dans le header ou au-dessus du contenu). Il fournit un ID pointant
vers le conteneur desktop. Le composant se téléporte automatiquement selon la
largeur du viewport — sans duplication, sans JS côté intégrateur.

---

## Props publiques

| Attribut         | Type     | Défaut      | Description                                                                                          |
| ---------------- | -------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| `desktop-target` | `string` | `undefined` | ID (sans `#`) du conteneur desktop vers lequel se téléporter. Sans cette prop, pas de téléportation. |
| `desktop-from`   | `number` | `992`       | Largeur en px à partir de laquelle le composant est en mode desktop.                                 |

Les props existantes (`current-path`, `mode`, `follow-scroll`) sont inchangées.

La prop `version` est **supprimée** (alpha, aucun utilisateur externe).

### Pourquoi un ID et non un sélecteur CSS arbitraire

Un sélecteur de classe (`'.sidebar'`) peut matcher plusieurs éléments — le comportement
serait ambigu. Un ID garantit une cible unique et une erreur claire si absente.
L'API reste simple et découvrable dans la doc sans magie implicite.

---

## State interne

| Champ                  | Type                     | Description                                                                                      |
| ---------------------- | ------------------------ | ------------------------------------------------------------------------------------------------ |
| `_originalParent`      | `Element \| null`        | Parent au moment du premier `connectedCallback`. Mémorisé une seule fois.                        |
| `_originalNextSibling` | `Node \| null`           | Nœud suivant au moment du premier `connectedCallback`. Permet de réinsérer au bon endroit.       |
| `_isDesktop`           | `boolean` (state Lit)    | `true` quand le composant est téléporté. Pilote `renderDesktop()` vs `renderMobile()`.           |
| `_mq`                  | `MediaQueryList \| null` | Instance `matchMedia` créée à l'initialisation.                                                  |
| `_mqListener`          | function                 | Listener branché sur `_mq`. Stocké pour pouvoir être débranché.                                  |
| `_positioned`          | `boolean`                | Flag — `true` dès que `_originalParent` est mémorisé. Évite de re-mémoriser après téléportation. |

---

## Cycle de vie

### `connectedCallback()`

```
1. super.connectedCallback()
2. Si !_positioned :
   - mémoriser _originalParent = this.parentElement
   - mémoriser _originalNextSibling = this.nextSibling
   - _positioned = true
3. Si desktopTarget est défini ET typeof window !== 'undefined' :
   - créer _mq = window.matchMedia(`(min-width: ${desktopFrom}px)`)
   - créer _mqListener = (e) => this._onBreakpointChange(e.matches)
   - _mq.addEventListener('change', _mqListener)
   - appel immédiat : _onBreakpointChange(_mq.matches)
4. Logique existante (scroll-follow, collectExistingItems…)
```

### `disconnectedCallback()`

```
1. Si _mq : _mq.removeEventListener('change', _mqListener)
2. super.disconnectedCallback()
3. Logique existante
```

### `_onBreakpointChange(matches: boolean)`

```
Si matches && !_isDesktop :
  - cible = document.getElementById(desktopTarget)
  - si cible introuvable : console.warn('[ar-stepper] desktop-target: aucun élément trouvé avec l\'id "…"')
  - si cible trouvée : cible.appendChild(this)
  - _isDesktop = true  → requestUpdate()

Si !matches && _isDesktop :
  - si _originalNextSibling && _originalNextSibling.isConnected :
      _originalParent.insertBefore(this, _originalNextSibling)
  - sinon :
      _originalParent.appendChild(this)
  - _isDesktop = false  → requestUpdate()
```

> **Note :** `appendChild` et `insertBefore` déclenchent `disconnectedCallback` +
> `connectedCallback`. Le flag `_positioned` empêche de re-mémoriser le parent
> après téléportation.

### `updated(changed)`

Quand `desktopTarget` ou `desktopFrom` change (rare mais possible via JS) :

- Déconnecter l'ancien `_mq` listener
- Recréer `_mq` avec le nouveau breakpoint
- Appeler `_onBreakpointChange(_mq.matches)` immédiatement

---

## Rendu

Le `render()` remplace `this.version === 'mobile'` par `!this._isDesktop` :

```typescript
const content = this._isDesktop
    ? renderDesktop(steps, this.mode, this.onClickLink)
    : renderMobile(steps, { … }, this.mode, this.onClickLink);
```

Sans `desktop-target`, `_isDesktop` reste `false` → rendu mobile uniquement
(comportement utile si l'intégrateur n'a pas besoin de téléportation).

---

## Suppression de `version`

- Supprimer la prop `@property version` dans `stepper.ts`
- Supprimer la condition `this.version === 'mobile'` dans `render()`
- Supprimer la variante `mobile` dans `ar-stepper.mdx`
- Mettre à jour le JSDoc `@summary`

---

## Cas limites

| Cas                                           | Comportement attendu                                                                   |
| --------------------------------------------- | -------------------------------------------------------------------------------------- |
| `desktop-target` pointe vers un ID inexistant | `console.warn`, pas de téléportation. Le composant reste à sa position mobile.         |
| `desktop-target` non fourni                   | Pas de `matchMedia`, rendu mobile fixe.                                                |
| `_originalParent` supprimé du DOM entre-temps | `appendChild` sur `_originalParent` — comportement natif. `console.warn`.              |
| SSR / pas de `window`                         | Guarde `typeof window !== 'undefined'` avant `matchMedia`. `_isDesktop` reste `false`. |

---

## Tests (TDD)

Les tests existants référençant `version` sont à supprimer ou adapter.
Nouveaux cas à couvrir dans `stepper.test.ts` :

### Props

- `desktopTarget` vaut `undefined` par défaut
- `desktopFrom` vaut `992` par défaut
- `version` n'existe plus (pas de prop)

### Téléportation

Setup commun : `matchMedia` mocké (pattern existant dans la codebase) :

```typescript
vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
} as unknown as MediaQueryList);
```

- **Sans `desktop-target`** : `_isDesktop` reste `false`, rendu mobile, pas de `matchMedia` créé
- **Avec `desktop-target` valide + viewport desktop** : le composant est déplacé dans la cible, `_isDesktop === true`, rendu desktop
- **Avec `desktop-target` valide + viewport mobile** : le composant reste à sa position d'origine, `_isDesktop === false`, rendu mobile
- **Passage desktop → mobile** : le composant revient dans `_originalParent` avant `_originalNextSibling`
- **`desktop-target` pointe vers un ID inexistant** : `console.warn` appelé, composant non déplacé
- **`disconnectedCallback`** : le listener `matchMedia` est bien débranché

### Rendu conditionnel

- `_isDesktop === true` → `ol.stepper-desktop` présent dans le shadow DOM
- `_isDesktop === false` → `.dropdown` présent dans le shadow DOM (rendu mobile)

---

## Documentation MDX (`ar-stepper.mdx`)

- Supprimer la variante `name: mobile`
- Mettre à jour la variante `default` : ajouter `desktop-target="stepper-sidebar"` et un `<div id="stepper-sidebar" style="min-height: 200px; border: 1px dashed #ccc; padding: 1rem;">` dans le HTML de démonstration du playground
- Ajouter la section `## Comportement responsive` (dans cette même PR) :

```markdown
## Comportement responsive

En dessous de **992px** (configurable via `desktop-from`), le composant affiche un dropdown
condensé — l'étape courante et son numéro sont visibles sans déployer la liste.

Au-dessus du breakpoint, le composant se **téléporte automatiquement** dans l'élément
identifié par `desktop-target` et affiche la liste verticale complète.

### À la charge de l'auteur

- **Fournir `desktop-target`** pour activer la téléportation. Sans cet attribut, le composant
  reste à sa position d'origine et affiche toujours le rendu mobile.
- **Placer le composant à l'emplacement mobile** dans le HTML (mobile-first). C'est depuis
  cette position qu'il se téléporte vers le desktop.
- **S'assurer que l'élément `desktop-target` existe dans le DOM** au moment où le composant
  se connecte. Un ID manquant laisse le composant à sa position mobile sans erreur visible
  pour l'utilisateur (seul un `console.warn` est émis).
```

---

## Fichiers modifiés

| Fichier                                                | Action                                                                                              |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `packages/core/src/components/stepper/stepper.ts`      | Supprimer `version`, ajouter `desktopTarget`, `desktopFrom`, state interne, cycle de vie            |
| `packages/core/src/components/stepper/stepper.test.ts` | Supprimer tests `version`, ajouter tests téléportation                                              |
| `apps/docs/src/content/components/ar-stepper.mdx`      | Supprimer variante `mobile`, mettre à jour variante `default`, ajouter `## Comportement responsive` |

`stepper.renderer.ts` et `stepper.styles.ts` ne sont pas modifiés.
