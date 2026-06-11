# Design — `ar-charcounter`

Date : 2026-06-10  
Statut : validé  
Auteur : Jon + Claude

---

## Contexte

`ar-charcounter` est un composant standalone qui observe un champ texte (`<textarea>` ou `<input>`) et affiche le nombre de caractères restants. Il fait partie de la roadmap composants v1 (issue #13).

---

## Décisions de design

### Structure : standalone avec `for`

Le composant suit le pattern `ar-tooltip` — il est indépendant du champ et s'y lie via l'attribut `for="id"`. Pas de wrapper, le consumer place le counter où il le souhaite dans son HTML.

### Format d'affichage : décompte inversé

Affiche `"{remaining} restants"` (ex : "158 restants"). L'attribut `max` est requis — sans lui, le composant émet un `warn()` en dev et ne rend rien.

### États : 3 niveaux

| État      | Condition                 | Signal SR               |
| --------- | ------------------------- | ----------------------- |
| `normal`  | remaining > seuil warning | —                       |
| `warning` | 0 ≤ remaining ≤ seuil     | `aria-live="polite"`    |
| `error`   | remaining < 0             | `aria-live="assertive"` |

Le seuil warning est calculé : `Math.floor(max * warnThreshold / 100)` caractères restants.

---

## API publique

```html
<ar-charcounter for="field-id" max="200" warn-threshold="20" label="restants" state="normal">
    <svg slot="icon-warning" aria-hidden="true">…</svg>
    <svg slot="icon-error" aria-hidden="true">…</svg>
</ar-charcounter>
```

| Attribut         | Type     | Défaut       | Requis | Description                                                    |
| ---------------- | -------- | ------------ | ------ | -------------------------------------------------------------- |
| `for`            | `string` | —            | ✅     | ID du champ observé                                            |
| `max`            | `number` | —            | ✅     | Limite de caractères. Warn dev + rendu vide si absent.         |
| `warn-threshold` | `number` | `20`         | ❌     | % restant déclenchant le warning                               |
| `label`          | `string` | `"restants"` | ❌     | Texte affiché après le chiffre                                 |
| `state`          | `string` | `"normal"`   | —      | **Readonly, réfléchi.** `"normal"` \| `"warning"` \| `"error"` |

**Slots :**

| Slot           | Description                                   |
| -------------- | --------------------------------------------- |
| `icon-warning` | Icône affichée en état warning (cachée sinon) |
| `icon-error`   | Icône affichée en état error (cachée sinon)   |

---

## Structure shadow DOM

```html
<span part="container">
    <slot name="icon-warning"></slot>
    <slot name="icon-error"></slot>
    <span part="count">
        <span part="remaining">158</span>
        <span part="label"> restants</span>
    </span>
</span>
```

**Parts exposés** : `container`, `count`, `remaining`, `label`

Les slots d'icônes sont gérés par le composant :

```css
slot[name='icon-warning'],
slot[name='icon-error'] {
    display: none;
}
:host([state='warning']) slot[name='icon-warning'] {
    display: contents;
}
:host([state='error']) slot[name='icon-error'] {
    display: contents;
}
```

---

## Hooks CSS externes

À chaque changement d'état, le composant pose `data-ar-char-state` sur :

- l'élément lié (`for` → `document.getElementById`)
- tous ses labels associés (`HTMLInputElement.labels`)

L'attribut est retiré au retour à `"normal"` et dans `disconnectedCallback`.

```css
/* Exemples consumer */
textarea[data-ar-char-state='warning'] {
    border-color: var(--color-warning);
}
textarea[data-ar-char-state='error'] {
    border-color: var(--color-error);
}
label[data-ar-char-state='warning'] {
    color: var(--color-warning);
}

/* Icône dans le label — montée/cachée via CSS */
label[data-ar-char-state='warning'] .icon-warn {
    display: inline;
}
label[data-ar-char-state='error'] .icon-err {
    display: inline;
}
```

---

## Accessibilité

### Pattern recommandé

Lier le counter au champ via `aria-describedby` — le SR annonce le count au focus :

```html
<label for="field">Commentaire</label>
<textarea id="field" aria-describedby="field-counter"></textarea>
<ar-charcounter id="field-counter" for="field" max="200"></ar-charcounter>
```

### Annonces SR aux transitions

Le composant appelle `announceA11y()` uniquement lors des **transitions d'état** (pas à chaque frappe) :

- Normal → Warning : `"${remaining} restants"` (polite)
- Tout → Error : `"Limite dépassée"` (assertive)
- Error → Normal/Warning : pas d'annonce

### `aria-invalid` — responsabilité consumer

Le composant ne pose pas `aria-invalid` automatiquement — le poser pendant la frappe est désastreux pour les SR (annonce "entrée non valide" en boucle). La gestion se fait côté consumer, sur blur ou submit :

```js
field.addEventListener('blur', () => {
    field.ariaInvalid = String(field.value.length > 200);
});
```

### WCAG 1.4.1 — signal non-couleur

Le composant fournit deux mécanismes pour éviter que la couleur soit le seul signal :

1. **Slots `icon-warning` / `icon-error`** — icône SVG à côté du count
2. **`data-ar-char-state`** — permet au consumer d'afficher une icône dans le label ou sur le champ via CSS externe

La page de doc montre un exemple WCAG-compliant (couleur + icône + annonce SR).

## Validation en dev

Si `max` est absent au `connectedCallback`, le composant appelle `warn('ar-charcounter', "l'attribut max est requis")` et ne rend rien. Pattern identique à `ar-progressbar` pour les attributs requis.

---

## Composants de référence dans Ariane

- **Pattern `for`** : `ar-tooltip`
- **`data-*` sur éléments externes** : `ar-table-sort` (pose `aria-sort` sur les `<th>`)
- **`announceA11y()`** : `ar-table-sort`
- **Valeur numérique bornée** : `ar-progressbar`
