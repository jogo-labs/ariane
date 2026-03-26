# Spec — Refonte page Design Tokens

**Date :** 2026-03-25
**Branche cible :** `fix/docs`
**Fichiers principaux :** `apps/docs/src/pages/foundations/tokens.astro`, `apps/docs/src/utils/parse-tokens.ts`

---

## Contexte

La page Design Tokens actuelle affiche tous les tokens dans une seule section "Couleurs" sans distinction de type. Depuis la refonte de `default.css` (palette 05→95 oklch, tokens sémantiques structurés), la page a deux régressions :

1. **Swatches cassés** — `parse-tokens.ts` détecte les couleurs avec `/^#[0-9a-fA-F]{3,8}$/`, mais les valeurs ont désormais la forme `#hex /* oklch(...) */` : le regex ne matche plus.
2. **Pas de rendu dédié pour la palette brute** — 11 hues × 11 stops s'affichent comme un tableau de tokens ordinaires, sans identité visuelle.

---

## Structure de la page

Sections séquentielles, navigation via le TOC latéral existant :

| #   | Section                | Rendu                                |
| --- | ---------------------- | ------------------------------------ |
| 1   | **Palette brute**      | Grille de swatches (voir ci-dessous) |
| 2   | **Interaction**        | Table tokens + swatches              |
| 3   | **Texte & Surface**    | Table tokens + swatches              |
| 4   | **États**              | Table tokens + swatches              |
| 5   | **Focus**              | Table tokens                         |
| 6   | **Typographie**        | Table tokens                         |
| 7   | **Espacement & Forme** | Table tokens                         |
| 8   | **Tokens composants**  | Table tokens + swatches si couleur   |

---

## Corrections `parse-tokens.ts`

### 1. Nettoyage de la valeur au moment du parse

Dans la boucle `parseTokens()`, après avoir capturé la valeur brute, extraire la partie avant le premier `/*` :

```ts
const rawValue = match[2].trim();
const value = rawValue.split('/*')[0].trim();
// Exemples :
// "#283276 /* oklch(35.06% 0.116 272.63) */" → "#283276"
// "oklch(18.82% 0.061 55)"                   → "oklch(18.82% 0.061 55)"  (inchangé)
// "var(--ar-color-primary-40)"               → "var(--ar-color-primary-40)"  (inchangé)
```

`token.value` est **toujours** la valeur nettoyée. Le template ne doit jamais recevoir de valeur brute avec commentaire.

### 2. `isColor()` — supporter oklch

```ts
export function isColor(value: string): boolean {
    return /^#[0-9a-fA-F]{3,8}$/.test(value) || /^rgba?\(/.test(value) || /^oklch\(/.test(value);
}
```

### 3. Refonte complète de `categorize()` et de l'ordre de présentation

L'ancienne règle catch-all `--ar-?-?color-` → "Couleurs" est **supprimée**. Elle est remplacée par des règles granulaires à correspondance exclusive (premier match gagne, ordre critique) :

```ts
const CATEGORY_RULES: { pattern: RegExp; label: string }[] = [
    // Palette brute — stops numériques uniquement (incl. neutral-0 et neutral-100)
    {
        pattern:
            /^--ar-color-(primary|neutral|green|yellow|red|blue|orange|cyan|indigo|purple|pink)-\d+$/,
        label: 'Palette brute',
    },
    // Tokens sémantiques de couleur
    { pattern: /^--ar-color-interactive/, label: 'Interaction' },
    { pattern: /^--ar-color-(text|bg|border)/, label: 'Texte & Surface' },
    { pattern: /^--ar-color-(success|warning|danger|info)-(bg|text)$/, label: 'États' },
    { pattern: /^--ar-focus-/, label: 'Focus' },
    // Autres
    { pattern: /^--ar-font-/, label: 'Typographie' },
    { pattern: /^--ar-spacing-/, label: 'Espacement & Forme' },
    { pattern: /^--ar-border-radius/, label: 'Espacement & Forme' },
];
// Fallback : 'Tokens composants'
```

**Ordre de présentation** mis à jour dans `parseTokens()` :

```ts
const order = [
    'Palette brute',
    'Interaction',
    'Texte & Surface',
    'États',
    'Focus',
    'Typographie',
    'Espacement & Forme',
    'Tokens composants',
];
```

### 4. Filtrage des variantes sémantiques d'alias palette

Les tokens `--ar-color-{success|warning|danger|info}-05` … `-95` sont des alias internes vers la palette brute (ex: `--ar-color-success-05: var(--ar-color-green-05)`). Ils ne doivent **pas** apparaître dans la page. Les filtrer **avant** `categorize()` dans la boucle `parseTokens()` :

```ts
const ALIAS_FILTER = /^--ar-color-(success|warning|danger|info)-\d+$/;

// Dans la boucle :
if (ALIAS_FILTER.test(name)) continue;
```

---

## Rendu palette brute

### Données : `parsePalette()`

Nouvelle fonction exportée depuis `parse-tokens.ts` qui construit la structure pour la grille :

```ts
export interface PaletteHue {
    name: string; // ex: "primary"
    stops: { stop: string; value: string }[]; // arrêtés dans l'ordre 0, 05, 10, 20…100
}

export function parsePalette(css: string): PaletteHue[] { ... }
```

La fonction :

1. Extrait tous les tokens `--ar-color-{hue}-{stop}` (même logique que `parseTokens` avec nettoyage `/*`)
2. Regroupe par hue dans un `Map<string, { stop: string; value: string }[]>`
3. Trie les stops numériquement (0 < 5 < 10 < 20 … < 95 < 100)
4. Retourne un tableau de `PaletteHue` dans l'ordre déclaré des hues

**Hues reconnues (dans l'ordre) :** primary · neutral · green · yellow · red · blue · orange · cyan · indigo · purple · pink

### Colonne header — stops

Les stops affichés en en-tête sont **extraits dynamiquement** des tokens réels (union de tous les stops de toutes les hues), pas une liste fixe. Cela gère correctement neutral-0 et neutral-100 qui ont des stops supplémentaires (0 et 100 en plus de 05→95).

En pratique cela donnera : `0 | 05 | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | 95 | 100`

Les hues sans certains stops (ex: primary n'a pas de stop 0 ou 100) affichent une **cellule vide** à cet emplacement.

### Rendu HTML (grille CSS)

```
       0    05    10    20   ...   95   100
neutral [██] [██] [██] [██] ... [██] [██]
primary      [██] [██] [██] ... [██]
green        [██] [██] [██] ... [██]
...
```

Chaque cellule non-vide : swatch (`width: 3.5rem; height: 2rem; border-radius: 4px`) + valeur hex ou oklch en dessous (`font-size: 0.6rem; font-family: monospace`).

Le conteneur utilise `overflow-x: auto` pour les petits écrans.

### Composant `PaletteGrid.astro`

Nouveau composant dans `apps/docs/src/components/PaletteGrid.astro`. Reçoit `hues: PaletteHue[]` et `allStops: string[]` (calculés dans `tokens.astro`). Rend la grille statiquement côté serveur (pas de JS).

---

## Template `tokens.astro`

- Importe `parsePalette` en plus de `parseTokens`
- Appelle `parsePalette(css)` pour la section palette brute → passe à `<PaletteGrid>`
- Appelle `parseTokens(css)` pour les sections sémantiques → itère sur les catégories comme avant
- TOC mis à jour avec les nouvelles sections

---

## Hors périmètre

- Swatches pour `@cssprop var()` dans `ComponentApi.astro` (backlog existant)
- Mode sombre des swatches palette (les swatches restent en light, indépendant du thème de la doc)

---

## Fichiers à créer / modifier

| Fichier                                        | Action                                                                                  |
| ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| `apps/docs/src/utils/parse-tokens.ts`          | Nettoyage valeur, `isColor()`, `categorize()` refonte, `ALIAS_FILTER`, `parsePalette()` |
| `apps/docs/src/pages/foundations/tokens.astro` | Template : `PaletteGrid` + sous-sections sémantiques + TOC                              |
| `apps/docs/src/components/PaletteGrid.astro`   | Nouveau composant grille palette                                                        |
