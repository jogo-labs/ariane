# Design : ar-th-sort

**Date :** 2026-06-02  
**Statut :** Approuvé

## Résumé

`ar-th-sort` est un composant placé à l'intérieur d'un `<th>` natif. Il enrichit les entêtes de tableau triables en restituant correctement l'intention de tri aux lecteurs d'écran et en fournissant des indicateurs visuels clairs. Il ne trie pas les données — il délègue au code consommateur.

## Usage

```html
<th>
    <ar-th-sort type="numeric">Prix</ar-th-sort>
</th>
```

```js
const el = document.querySelector('ar-th-sort');

el.addEventListener('ar-th-sort-change', async (e) => {
    const ok = await sortData(e.detail.requestedOrder);
    if (ok) el.confirm();
    else el.reject();
});
```

## API

### Attributs / Propriétés

| Attribut  | Type                             | Défaut    | Notes             |
| --------- | -------------------------------- | --------- | ----------------- |
| `type`    | `"alpha" \| "numeric" \| "date"` | `"alpha"` |                   |
| `order`   | `"none" \| "asc" \| "desc"`      | `"none"`  | Reflect           |
| `pending` | `boolean`                        | `false`   | Readonly, reflect |

### Méthodes

**`confirm()`** — Applique le pending order (avance le cycle), met à jour `aria-sort` sur le `<th>` parent, efface `pending`. Sans effet si `pending` est `false`.

**`reject()`** — Annule le pending order, efface `pending`. Le composant revient à l'état `order` précédent. Sans effet si `pending` est `false`.

### Événement

**`ar-th-sort-change`** — Émis au clic ou entrée clavier. Non émis si `pending` est `true`.

```ts
detail: {
    type: 'alpha' | 'numeric' | 'date';
    currentOrder: 'none' | 'asc' | 'desc';
    requestedOrder: 'asc' | 'desc' | 'none';
    columnLabel: string; // textContent du slot — utile pour distinguer les colonnes dans un handler partagé
}
```

### Cycle d'états

Cycle fixe : `none → asc → desc → none`

```
[clic]                  → _pendingOrder = nextInCycle(order), pending = true, émet ar-th-sort-change
[confirm()]             → order = _pendingOrder, pending = false, met à jour aria-sort
[reject()]              → order inchangé, pending = false
[clic pendant pending]  → ignoré
```

## Effets de bord sur le `<th>` parent

Au `connectedCallback` et à chaque `confirm()`, le composant met à jour le `<th>` ancêtre le plus proche via `this.closest('th')` — plus robuste que `parentElement` si un élément wrapper est intercalé.

**`aria-sort`**

| `order` | `aria-sort`    |
| ------- | -------------- |
| `none`  | `"none"`       |
| `asc`   | `"ascending"`  |
| `desc`  | `"descending"` |

**`scope`**

Si `scope` est absent sur le `<th>`, le composant pose `scope="col"`. Un `scope` déjà présent n'est jamais écrasé.

## Accessibilité

### Structure Shadow DOM

```html
<button part="button" title="[label courant]" aria-disabled="[pending]">
    <slot></slot>
    <span class="sr-only">, [label courant]</span>
    <span part="indicator" aria-hidden="true"></span>
</button>
<span class="sr-only" aria-live="polite" aria-atomic="true"></span>
```

Le slot fournit le nom de colonne (ex. "Prix"). Le `sr-only` ajoute la description de l'action suivante. Lecture SR : _"Prix, trier croissant, bouton"_.

`aria-disabled="true"` (pas `disabled`) pendant `pending` — le bouton reste focusable mais bloque l'interaction.

La région `aria-live` est vide au repos. Après `confirm()`, elle reçoit le label d'annonce, puis est vidée via `setTimeout(..., 150)` pour permettre une ré-annonce si l'utilisateur confirme deux fois le même ordre.

### Labels (français hardcodés)

Le label affiché dans `title`, `sr-only` et `aria-live` est dérivé de `type` et `order` :

**Action suivante** (title + sr-only bouton) :

| `order` | `type="alpha"`   | `type="numeric"`  | `type="date"`        |
| ------- | ---------------- | ----------------- | -------------------- |
| `none`  | Trier A → Z      | Trier croissant   | Trier du plus ancien |
| `asc`   | Trier Z → A      | Trier décroissant | Trier du plus récent |
| `desc`  | Supprimer le tri | Supprimer le tri  | Supprimer le tri     |
| pending | Tri en cours…    | Tri en cours…     | Tri en cours…        |

**Annonce après confirm()** (aria-live) :

Les régions `aria-live` sont lues en isolation — sans contexte DOM automatique. L'annonce inclut donc le nom de colonne lu depuis le slot :

| `order` après confirm | Message (exemple colonne "Prix") |
| --------------------- | -------------------------------- |
| `asc`                 | Prix : tri croissant appliqué    |
| `desc`                | Prix : tri décroissant appliqué  |
| `none`                | Prix : tri supprimé              |

Le nom de colonne est obtenu via `slot.assignedNodes({ flatten: true })` au moment de l'annonce.

> **Note :** L'infrastructure de localisation (pour surcharger ces labels) est hors scope.
> Voir issue GitHub à créer : "Infrastructure i18n — `setLocale()` + locales CDN".

### Clavier

Entrée / Espace sur le bouton : même comportement que le clic.

### Couverture WCAG

| Critère                       | Niveau | Couvert par                                                                           |
| ----------------------------- | ------ | ------------------------------------------------------------------------------------- |
| 1.3.1 Info and Relationships  | A      | `aria-sort` + `scope="col"` encodent la relation entête/données et l'état de tri      |
| 1.3.3 Sensory Characteristics | A      | `sr-only` + `aria-sort` — direction non communiquée uniquement par la flèche visuelle |
| 2.1.1 Keyboard                | A      | `<button>` interne — Enter / Espace                                                   |
| 2.4.6 Headings and Labels     | AA     | Nom accessible du bouton (slot + sr-only) décrit l'action suivante                    |
| 2.4.7 Focus Visible           | AA     | `:focus-visible` sur le bouton (couche 1 fixe, ADR-004)                               |
| 4.1.2 Name, Role, Value       | A      | Name : slot + sr-only / Role : button / State : `aria-sort`, `aria-disabled`          |
| 4.1.3 Status Messages         | AA     | Région `aria-live="polite"` annonce le résultat après `confirm()`                     |

## Structure interne

### Indicateur visuel

L'`indicator` est piloté par CSS via les attributs reflétés sur l'hôte — aucun JS supplémentaire :

| État           | Visuel     | Sélecteur CSS           |
| -------------- | ---------- | ----------------------- |
| `order="none"` | ↑↓ neutre  | `:host([order="none"])` |
| `order="asc"`  | ↑ actif    | `:host([order="asc"])`  |
| `order="desc"` | ↓ actif    | `:host([order="desc"])` |
| `pending=true` | ↑↓ atténué | `:host([pending])`      |

L'état neutre (↑↓) indique que la colonne est triable mais non triée. L'implémentation concrète de l'icône (SVG inline ou pseudo-éléments CSS) est laissée à l'implémentation.

### CSS Tokens

| Token                                  | Rôle                            |
| -------------------------------------- | ------------------------------- |
| `--ar-th-sort-gap`                     | Espacement label / indicateur   |
| `--ar-th-sort-indicator-size`          | Taille de l'icône               |
| `--ar-th-sort-indicator-color`         | Couleur état neutre             |
| `--ar-th-sort-indicator-active-color`  | Couleur état actif (asc / desc) |
| `--ar-th-sort-indicator-pending-color` | Couleur état pending            |

### CSS Parts

| Part        | Élément              |
| ----------- | -------------------- |
| `button`    | Le bouton complet    |
| `indicator` | L'icône de direction |

## Ce que le composant ne fait pas

- Trier les données du tableau
- Coordonner plusieurs colonnes triables (désactiver les autres — responsabilité du consommateur)
- Gérer la localisation des labels

## Approche retenue vs alternatives

**Approche A retenue** — `ar-th-sort` avec bouton interne + tooltip `title` natif. Autonome, zéro dépendance inter-composants.

**Approche B (évolution possible)** — Remplacer le `title` natif par `ar-tooltip` pour un tooltip stylisable. Ne casse pas l'API.

**Approche C écartée** — Light DOM (pas de Shadow DOM). Brise l'encapsulation et les conventions du projet.
