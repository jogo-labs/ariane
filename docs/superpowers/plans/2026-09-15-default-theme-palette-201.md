# Palette du thème publié `default.css` (#201) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retravailler la palette de couleurs de `packages/core/src/styles/themes/default.css` (thème publié, consommé par tout utilisateur réel d'Ariane) pour l'aligner sur l'identité visuelle ambre/Voûte définie par le chantier #110, sans changer un seul nom de token ni l'architecture existante.

**Architecture:** Le fichier `default.css` actuel (violet/cobalt) est renommé `default-old.css` et gelé. Un nouveau `default.css`, identique au départ, reçoit ensuite trois retouches de valeurs successives (rampe `primary` → ambre, rampe `neutral` → quasi-achromatique, nouveaux primitifs `vault`/`vault-deep` pour les surfaces sombres), puis un ajustement des rayons — chaque étape validée par un script de contraste WCAG dédié avant d'être commitée.

**Tech Stack:** CSS natif (`oklch()`, `light-dark()`, `color-mix()`), Node.js (script de vérification de contraste, aucune dépendance externe), Playwright (revue visuelle), Vitest/@web/test-runner (suite existante).

**Spec:** `docs/superpowers/specs/2026-09-15-default-theme-palette-201-design.md`

## Global Constraints

- Aucun nom de token `--ar-*` ne change — seules les valeurs de couleur (et 4 tokens de rayon) changent.
- Toute nouvelle valeur de couleur s'écrit en `oklch()` natif CSS (pas de hex + commentaire) — précédent déjà présent dans le fichier (rampe `orange`).
- Contraste WCAG AA (4.5:1 texte, 3:1 UI/large texte) vérifié par calcul réel (script dédié), jamais à l'œil, pour chaque paire touchée.
- `default-old.css` : contenu strictement inchangé, gelé, hors périmètre de validation CEM.
- `git commit` uniquement quand une étape le demande explicitement ; jamais de push sans confirmation (cf. CLAUDE.md du projet).
- Jamais de worktree isolé — travail direct sur la branche `fix/default-theme-palette-201` (créée Task 1).

---

## Task 1: Renommage mécanique — `default.css` → `default-old.css` + nouveau `default.css` (baseline identique)

**Files:**

- Create branch: `fix/default-theme-palette-201` (depuis `dev`)
- Rename (git mv): `packages/core/src/styles/themes/default.css` → `packages/core/src/styles/themes/default-old.css`
- Create: `packages/core/src/styles/themes/default.css` (copie exacte du contenu original, avant toute retouche)

**Interfaces:**

- Produces: le fichier `packages/core/src/styles/themes/default.css` existe et contient, à l'issue de cette tâche, EXACTEMENT le même contenu que l'ancien fichier — c'est la baseline sur laquelle les tâches 3/4/5/6 vont appliquer des diffs ciblés.

- [ ] **Step 1: Créer la branche**

```bash
cd /Users/jon/Code/Active_projects/ariane
git status --short   # doit être propre ; sinon s'arrêter et demander avant de continuer
git checkout dev
git pull --ff-only origin dev
git checkout -b fix/default-theme-palette-201
```

- [ ] **Step 2: Renommer l'ancien fichier et créer le nouveau avec le même contenu**

```bash
git mv packages/core/src/styles/themes/default.css packages/core/src/styles/themes/default-old.css
cp packages/core/src/styles/themes/default-old.css packages/core/src/styles/themes/default.css
git add packages/core/src/styles/themes/default.css
```

- [ ] **Step 3: Ajouter un en-tête de gel en haut de `default-old.css`**

Ouvrir `packages/core/src/styles/themes/default-old.css` et remplacer les 10 premières lignes (le bloc de commentaire d'en-tête existant) par :

```css
/**
 * Thème "default-old" — GELÉ (issue #201, 2026-09-15).
 *
 * Ancienne palette (violet/cobalt) du thème par défaut, avant le
 * retravail de #201 qui l'a alignée sur l'identité visuelle ambre/Voûte
 * du chantier #110. Conservé tel quel pour réemploi futur — ce fichier
 * n'est PLUS maintenu : la validation CEM (`cem.config.js`) ne le
 * couvre pas (elle pointe explicitement sur `default.css`), et aucun
 * nouveau token --ar-* introduit après le 2026-09-15 n'y sera ajouté.
 * Le thème actif est désormais `default.css`.
 *
 * Utilise @layer pour éviter les conflits de spécificité avec les styles utilisateur.
 * Le bloc `:root` de base doit être déclaré avant les règles `[data-theme='dark']`/`[data-theme='light']` qui suivent (voir plus bas).
 *
 * Usage :
 *   <link rel="stylesheet" href="https://unpkg.com/@ariane-ui/core/dist/styles/themes/default-old.css">
 *   ou
 *   import '@ariane-ui/core/themes/default-old.css'; // via bundler
 */
```

- [ ] **Step 4: Vérifier que le build et la suite de tests passent (baseline neutre — aucun changement visuel)**

```bash
npm run build --workspace=packages/core
npm run test
```

Expected: build sans erreur, `dist/styles/themes/default.css` ET `dist/styles/themes/default-old.css` tous deux générés, 989/989 tests passent (aucune régression — le contenu de `default.css` est encore identique à l'ancien à ce stade).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/styles/themes/default-old.css packages/core/src/styles/themes/default.css
git commit -m "$(cat <<'EOF'
chore(core): geler l'ancien thème par défaut sous default-old.css (#201)

Renommage mécanique, aucun changement de valeur — prépare le terrain
pour retravailler la palette de default.css (ambre/Voûte, #201) sans
perdre l'ancienne identité (violet/cobalt), que le mainteneur souhaite
réutiliser ailleurs.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DBWvASBNGXKCie9vdzdJYf
EOF
)"
```

---

## Task 2: Script de vérification de contraste OKLCH

**Files:**

- Create: `packages/core/scripts/tmp-color-contrast-check.mjs` (outil de développement temporaire, committé pour rester disponible aux tâches suivantes de ce plan, supprimé en Task 8)

**Interfaces:**

- Produces: le module exporte `hexToOklch(hex) -> [L, C, H]` (L en 0-1, H en degrés), `oklchToHex([L, C, H]) -> hex`, `contrast(colorA, colorB) -> number` (colorA/colorB : hex string OU triplet `[L, C, H]`, retourne le ratio WCAG, la plus grande valeur divisée par la plus petite selon la formule officielle).
- Consumes: rien (fonctions pures, aucune dépendance externe).

- [ ] **Step 1: Écrire le script**

```javascript
#!/usr/bin/env node
/**
 * Outil de développement TEMPORAIRE (#201) — conversions sRGB <-> OKLCH
 * (matrices de référence Björn Ottosson) + calcul de contraste WCAG.
 * Supprimé en fin de chantier (cf. Task 8 du plan #201).
 *
 * Usage : import { hexToOklch, oklchToHex, contrast } from './tmp-color-contrast-check.mjs';
 */

function hexToSrgb(hex) {
    hex = hex.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    return [r, g, b];
}

function srgbToLinear(c) {
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c) {
    c = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return Math.min(1, Math.max(0, c));
}

function srgbToOklab([r, g, b]) {
    const [lr, lg, lb] = [r, g, b].map(srgbToLinear);
    const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
    const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
    const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
    const l_ = Math.cbrt(l),
        m_ = Math.cbrt(m),
        s_ = Math.cbrt(s);
    return [
        0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
        1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
        0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
    ];
}

function oklabToOklch([L, a, b]) {
    const C = Math.sqrt(a * a + b * b);
    let H = (Math.atan2(b, a) * 180) / Math.PI;
    if (H < 0) H += 360;
    return [L, C, H];
}

function oklchToOklab([L, C, H]) {
    const h = (H * Math.PI) / 180;
    return [L, C * Math.cos(h), C * Math.sin(h)];
}

function oklabToSrgb([L, a, b]) {
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.291485548 * b;
    const l = l_ ** 3,
        m = m_ ** 3,
        s = s_ ** 3;
    const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
    return [r, g, bl].map(linearToSrgb);
}

function relLuminance([r, g, b]) {
    const [R, G, B] = [r, g, b].map(srgbToLinear);
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function hexToOklch(hex) {
    return oklabToOklch(srgbToOklab(hexToSrgb(hex)));
}

export function oklchToHex([L, C, H]) {
    const [r, g, b] = oklabToSrgb(oklchToOklab([L, C, H]));
    const to2 = (c) =>
        Math.round(c * 255)
            .toString(16)
            .padStart(2, '0');
    return `#${to2(r)}${to2(g)}${to2(b)}`;
}

function toSrgbTriplet(color) {
    return typeof color === 'string' ? hexToSrgb(color) : oklabToSrgb(oklchToOklab(color));
}

export function contrast(colorA, colorB) {
    const L1 = relLuminance(toSrgbTriplet(colorA));
    const L2 = relLuminance(toSrgbTriplet(colorB));
    const [hi, lo] = [L1, L2].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}
```

- [ ] **Step 2: Vérifier que le script est correct en le rejouant sur des paires connues (déjà vérifiées côté doc)**

```bash
node --input-type=module -e "
import { hexToOklch, contrast } from './packages/core/scripts/tmp-color-contrast-check.mjs';
console.log(contrast('#e8eaf2', '#191d2e').toFixed(2), '(attendu ~13.91, doc-chalk/doc-vault)');
console.log(contrast('#a2a7bd', '#191d2e').toFixed(2), '(attendu ~7.00, doc-chalk-muted/doc-vault)');
console.log(contrast('#ffaa00', '#191d2e').toFixed(2), '(attendu ~8.76, doc-ember/doc-vault)');
"
```

Expected: les trois valeurs affichées correspondent (± 0.05) aux ratios déjà publiés dans `docs/design/charte-graphique.md` — confirme que le script est fiable avant de l'utiliser pour valider les nouvelles couleurs.

- [ ] **Step 3: Commit**

```bash
git add packages/core/scripts/tmp-color-contrast-check.mjs
git commit -m "$(cat <<'EOF'
chore(core): script temporaire de vérification de contraste OKLCH (#201)

Outil de développement pour calculer les ratios WCAG des nouvelles
couleurs (ambre, vault) avant de les figer dans default.css — retiré
en fin de chantier (cf. tâche de nettoyage finale).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DBWvASBNGXKCie9vdzdJYf
EOF
)"
```

---

## Task 3: Rampe `primary` → ambre

**Files:**

- Modify: `packages/core/src/styles/themes/default.css:26-36` (bloc `--ar-color-primary-05` à `-95`)

**Interfaces:**

- Consumes: `contrast`, `hexToOklch` de `packages/core/scripts/tmp-color-contrast-check.mjs` (Task 2).
- Produces: aucun changement de nom de token — `--ar-color-interactive`/`-hover`/`-active`/`-subtle` (section 3 du fichier) continuent de référencer `primary-40`/`-30`/`-20`/`-95`/`-70`/`-80` sans modification, seules les valeurs sous-jacentes changent.

- [ ] **Step 1: Vérifier les contrastes AVANT d'écrire les valeurs finales**

```bash
node --input-type=module -e "
import { contrast } from './packages/core/scripts/tmp-color-contrast-check.mjs';
// Ancre 40 = #8f5f00 (--doc-accent clair, déjà vérifié AA côté doc)
console.log('primary-40 bg bouton (texte blanc dessus):', contrast('#8f5f00', '#ffffff').toFixed(2), '>= 4.5 requis');
// Ancre 70 = #ffaa00 (--doc-ember, déjà vérifié côté doc)
console.log('primary-70 texte sur vault #191d2e:', contrast('#ffaa00', '#191d2e').toFixed(2), '>= 4.5 requis');
"
```

Expected: `5.52 >= 4.5 requis` et `8.76 >= 4.5 requis` — les deux passent.

- [ ] **Step 2: Remplacer le bloc `--ar-color-primary-*` dans `default.css`**

Le bloc actuel (lignes 25-36) :

```css
/* Primary (bleu France Travail) — 05=sombre → 95=clair */
--ar-color-primary-05: #010105 /* oklch(7.47% 0.022 279.71) */;
--ar-color-primary-10: #04071c /* oklch(14.05% 0.046 270.71) */;
--ar-color-primary-20: #0f1438 /* oklch(21.15% 0.070 272.98) */;
--ar-color-primary-30: #1b2256 /* oklch(27.98% 0.094 273.00) */;
--ar-color-primary-40: #283276 /* oklch(35.06% 0.116 272.63) */;
--ar-color-primary-50: #434fa7 /* oklch(46.62% 0.141 273.80) */;
--ar-color-primary-60: #707bcd /* oklch(61.04% 0.125 276.28) */;
--ar-color-primary-70: #a1abf9 /* oklch(76.33% 0.112 277.78) */;
--ar-color-primary-80: #cdd2ff /* oklch(87.46% 0.062 280.03) */;
--ar-color-primary-90: #eaecfb /* oklch(94.60% 0.020 279.87) */;
--ar-color-primary-95: #f4f5ff /* oklch(97.50% 0.012 280.00) */;
```

Le remplacer par :

```css
/* Primary (ambre — identité #110) — 05=sombre → 95=clair.
           Ancré sur deux valeurs déjà vérifiées AA côté doc (charte-graphique.md) :
           40 = #8f5f00 (--doc-accent clair), 70 = #ffaa00 (--doc-ember brut).
           Contraste vérifié (packages/core/scripts/tmp-color-contrast-check.mjs) :
           primary-40 vs blanc (fond de bouton, texte blanc dessus) = 5.52:1 (>=4.5)
           primary-70 vs vault #191d2e (texte interactif en sombre) = 8.76:1 (>=4.5) */
--ar-color-primary-05: oklch(16.5% 0.035 70);
--ar-color-primary-10: oklch(22.5% 0.05 71);
--ar-color-primary-20: oklch(31% 0.075 72);
--ar-color-primary-30: oklch(41.5% 0.095 73);
--ar-color-primary-40: oklch(52.43% 0.1108 74.71);
--ar-color-primary-50: oklch(60.5% 0.13 74.5);
--ar-color-primary-60: oklch(70.5% 0.155 74);
--ar-color-primary-70: oklch(80.16% 0.1705 73.27);
--ar-color-primary-80: oklch(86.5% 0.13 78);
--ar-color-primary-90: oklch(92.5% 0.075 83);
--ar-color-primary-95: oklch(96.5% 0.038 87);
```

- [ ] **Step 2b: Retirer le fallback `#71747f`/`#9ea2b3` obsolète (aucun lien avec cette tâche, laisser tel quel)**

Rien à faire — `--ar-button-disabled-color`/`-icon-color` (lignes 342-343) ne dérivent pas de `primary`, hors scope de cette tâche.

- [ ] **Step 3: Build + vérification visuelle rapide**

```bash
npm run build --workspace=packages/core
```

Expected: build sans erreur (les 3 fonctions CSS `oklch()`/`light-dark()`/`color-mix()` sont déjà utilisées ailleurs dans ce même fichier — pas de nouvelle dépendance de build).

- [ ] **Step 4: Suite de tests**

```bash
npm run test
```

Expected: 989/989 tests passent (aucun test n'assert de valeur de couleur exacte — à confirmer par la lecture du résultat, pas supposé).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/styles/themes/default.css
git commit -m "$(cat <<'EOF'
feat(core): rampe primary → ambre dans le thème par défaut (#201)

Remplace le violet/cobalt (bleu France Travail) par une rampe ambre
alignée sur l'identité visuelle #110, ancrée sur deux valeurs déjà
vérifiées AA côté doc (--doc-accent clair #8f5f00, --doc-ember #ffaa00).
Aucun nom de token ne change — --ar-color-interactive et dérivés
continuent de référencer les mêmes paliers primary-*.

Contraste vérifié (packages/core/scripts/tmp-color-contrast-check.mjs) :
primary-40 (fond bouton) vs blanc = 5.52:1, primary-70 (texte sombre)
vs vault #191d2e = 8.76:1 — les deux passent AA (>=4.5:1).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DBWvASBNGXKCie9vdzdJYf
EOF
)"
```

---

## Task 4: Rampe `neutral` → quasi-achromatique

**Files:**

- Modify: `packages/core/src/styles/themes/default.css:41-52` (bloc `--ar-color-neutral-05` à `-95`, numérotation de ligne pré-Task-3 — relire le fichier avant d'éditer, les lignes ont pu décaler)

**Interfaces:**

- Consumes: `contrast` de `tmp-color-contrast-check.mjs`.
- Produces: aucun changement de nom de token, aucun changement des valeurs `L` (luminosité) par palier — seule la chrominance change (réduite), donc la luminance relative (et tout contraste calculé dessus) reste quasiment identique.

- [ ] **Step 1: Vérifier empiriquement le vocabulaire visuel cible AVANT de choisir les valeurs**

Les primitifs neutres de la doc (`--doc-paper #ffffff`, `--doc-slate #f5f5f5`, `--doc-ink #141414`, `--doc-ink-muted #565656`) sont en réalité **purement achromatiques** (chroma = 0 en oklch — vérifié) : pas de teinte "stone/chaude" comme le laissait supposer la spec, un gris neutre pur. La rampe `neutral` actuelle du thème publié a une chrominance faible mais réelle (0.000 à 0.021) et une teinte froide (hue ~259-286°, héritée du bleu France Travail). Objectif révisé, plus fidèle à l'identité réelle : réduire la chrominance vers ~0 plutôt que d'introduire une nouvelle teinte chaude.

```bash
node --input-type=module -e "
import { hexToOklch } from './packages/core/scripts/tmp-color-contrast-check.mjs';
for (const hex of ['#ffffff', '#f5f5f5', '#141414', '#565656']) {
  const [L,C,H] = hexToOklch(hex);
  console.log(hex, '-> L=' + (L*100).toFixed(2) + '% C=' + C.toFixed(4));
}
"
```

Expected: chroma affichée à `0.0000` pour les 4 valeurs — confirme le constat ci-dessus.

- [ ] **Step 2: Remplacer le bloc `--ar-color-neutral-*` dans `default.css`**

Chercher le bloc commençant par `/* Neutral — 05=sombre → 95=clair` et le remplacer par (mêmes `L` que l'original, chroma réduite à 0.002 — perceptuellement neutre tout en évitant un noir/blanc pur qui banderait visuellement, hue arbitraire à 90 puisque non perceptible à si faible chroma) :

```css
/* Neutral — 05=sombre → 95=clair (même convention que les autres hues).
           Chroma quasi nulle (0.002, contre 0.000-0.021 dans l'ancienne rampe
           teintée bleu froid) — aligné sur le gris pur des primitifs --doc-*
           (--doc-paper/--doc-ink mesurés à chroma=0 exactement). Luminosité (L)
           inchangée par rapport à l'ancienne rampe : le contraste de tout token
           qui en dérive (bordures, texte muté, désactivé) n'est pas affecté,
           seule la teinte perceptible change. */
--ar-color-neutral-05: oklch(15.79% 0.002 90);
--ar-color-neutral-10: oklch(20.46% 0.002 90);
--ar-color-neutral-20: oklch(29.82% 0.002 90);
--ar-color-neutral-30: oklch(39.17% 0.002 90);
--ar-color-neutral-40: oklch(47.94% 0.002 90);
--ar-color-neutral-50: oklch(63.89% 0.002 90);
--ar-color-neutral-60: oklch(71.11% 0.002 90);
--ar-color-neutral-70: oklch(78.34% 0.002 90);
--ar-color-neutral-80: oklch(85.56% 0.002 90);
--ar-color-neutral-90: oklch(92.86% 0.002 90);
--ar-color-neutral-95: oklch(97.1% 0.002 90);
```

- [ ] **Step 3: Vérifier qu'aucun contraste ne régresse (comparaison avant/après sur les paires réellement consommées)**

```bash
node --input-type=module -e "
import { contrast, oklchToHex } from './packages/core/scripts/tmp-color-contrast-check.mjs';
const before = { 40: '#5b5d65', 90: '#e6e7ec', 95: '#f5f5f8', 10: '#171717' };
const after = {
  40: oklchToHex([0.4794, 0.002, 90]),
  90: oklchToHex([0.9286, 0.002, 90]),
  95: oklchToHex([0.9710, 0.002, 90]),
  10: oklchToHex([0.2046, 0.002, 90]),
};
console.log('texte (neutral-40) vs blanc — avant:', contrast(before[40], '#ffffff').toFixed(2), 'après:', contrast(after[40], '#ffffff').toFixed(2));
console.log('bordure (neutral-90) vs blanc — avant:', contrast(before[90], '#ffffff').toFixed(2), 'après:', contrast(after[90], '#ffffff').toFixed(2));
"
```

Expected: les deux paires « avant »/« après » sont quasi identiques (écart < 0.02) — confirme que le changement de teinte n'affecte pas le contraste.

- [ ] **Step 4: Build + tests**

```bash
npm run build --workspace=packages/core
npm run test
```

Expected: build OK, 989/989 tests passent.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/styles/themes/default.css
git commit -m "$(cat <<'EOF'
feat(core): rampe neutral quasi-achromatique dans le thème par défaut (#201)

Réduit la chrominance de la rampe neutral (0.000-0.021 → 0.002 fixe),
qui portait une teinte froide héritée du bleu France Travail (hue
~259-286°). Aligné sur les primitifs --doc-paper/--doc-ink de la doc,
mesurés à chroma=0 exactement (gris pur, pas de teinte "stone" comme
envisagé dans la spec — corrigé après vérification empirique).

Luminosité (L) inchangée par palier — contraste de tout token dérivé
(bordures, texte muté, désactivé) non affecté, vérifié par comparaison
avant/après (écart < 0.02 sur les paires texte/bordure vs blanc).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DBWvASBNGXKCie9vdzdJYf
EOF
)"
```

---

## Task 5: Primitifs `vault`/`vault-deep` + fonds sombres

**Files:**

- Modify: `packages/core/src/styles/themes/default.css` (ajout de 2 primitifs section 1 « PALETTE BRUTE », modification de `--ar-color-bg`/`--ar-color-bg-subtle` section 3 « TOKENS SÉMANTIQUES »)

**Interfaces:**

- Consumes: `contrast` de `tmp-color-contrast-check.mjs`.
- Produces: deux nouveaux tokens `--ar-color-vault`, `--ar-color-vault-deep` (primitifs bruts, jamais consommés directement par un composant — seulement via `--ar-color-bg`/`-bg-subtle`, même règle que les autres primitifs de section 1).

- [ ] **Step 1: Vérifier les contrastes clés AVANT d'écrire les valeurs**

```bash
node --input-type=module -e "
import { contrast } from './packages/core/scripts/tmp-color-contrast-check.mjs';
const vault = '#191d2e', vaultDeep = '#10131f';
const neutral95 = '#f5f5f8', neutral80 = '#cdcfd8', neutral40 = '#5b5d65', oldBg = '#171717';
console.log('texte (neutral-95) vs vault:', contrast(neutral95, vault).toFixed(2), '(>=4.5 requis, texte principal)');
console.log('texte muté (neutral-80) vs vault:', contrast(neutral80, vault).toFixed(2), '(>=4.5 requis)');
console.log('bordure (neutral-40) vs vault:', contrast(neutral40, vault).toFixed(2), '(référence AVANT ce changement, neutral-40 vs ancien bg neutral-10:', contrast(neutral40, oldBg).toFixed(2), ')');
console.log('vault vs vault-deep (bg vs bg-subtle):', contrast(vault, vaultDeep).toFixed(2), '(référence AVANT, ancien bg-subtle neutral-30 vs ancien bg neutral-10:', contrast('#44454b', oldBg).toFixed(2), ')');
"
```

Expected :

- `texte (neutral-95) vs vault: 15.36` et `texte muté (neutral-80) vs vault: 10.75` — largement AA.
- `bordure (neutral-40) vs vault: 2.55` contre une référence déjà à `2.73` avant ce changement — **condition préexistante** (déjà sous le seuil UI de 3:1 avant #201), pas une régression introduite ici. Ne pas chercher à la corriger dans cette tâche (hors scope, cf. section « Risques » de la spec).
- `vault vs vault-deep: 1.11` contre une référence déjà à `1.88` avant ce changement — également une distinction déjà faible avant #201 (bg/bg-subtle n'a jamais été conçu comme une paire à 3:1, ce sont deux fonds pleins, pas un texte sur fond). Pas une régression à corriger ici.

- [ ] **Step 2: Ajouter les primitifs `vault`/`vault-deep` (section 1, juste après le bloc `primary`)**

Après le bloc `--ar-color-primary-95` (modifié en Task 3) et avant `/* White — blanc pur... */`, insérer :

```css
/* Vault (surfaces sombres dédiées — identité "Voûte", #110) — utilisé
           uniquement par --ar-color-bg/-bg-subtle côté sombre, jamais par un
           composant directement. Valeurs alignées sur --doc-vault/-vault-deep
           (apps/docs/src/styles/doc-tokens.css), converties en oklch natif. */
--ar-color-vault: oklch(23.54% 0.0334 273.44);
--ar-color-vault-deep: oklch(18.99% 0.0249 273.04);
```

- [ ] **Step 3: Rebrancher `--ar-color-bg`/`-bg-subtle` (section 3) sur `vault`/`vault-deep` côté sombre**

Remplacer :

```css
/* Surface */
--ar-color-bg: light-dark(var(--ar-color-white), var(--ar-color-neutral-10));
--ar-color-bg-subtle: light-dark(var(--ar-color-neutral-95), var(--ar-color-neutral-30));
```

par :

```css
/* Surface */
--ar-color-bg: light-dark(var(--ar-color-white), var(--ar-color-vault));
--ar-color-bg-subtle: light-dark(var(--ar-color-neutral-95), var(--ar-color-vault-deep));
```

- [ ] **Step 4: Build + tests**

```bash
npm run build --workspace=packages/core
npm run test
```

Expected: build OK, 989/989 tests passent.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/styles/themes/default.css
git commit -m "$(cat <<'EOF'
feat(core): fond sombre Voûte (vault/vault-deep) dans le thème par défaut (#201)

Ajoute --ar-color-vault/-vault-deep (indigo nuit, alignés sur
--doc-vault/-vault-deep) et rebranche --ar-color-bg/-bg-subtle côté
sombre dessus, au lieu de neutral-10/neutral-30 — cohérence visuelle
avec le mode sombre "Voûte" du site de doc (#110).

Contraste vérifié : texte principal vs vault 15.36:1, texte muté vs
vault 10.75:1 (largement AA). Deux paires déjà sous le seuil UI (3:1)
AVANT ce changement — bordure vs bg (2.73:1 → 2.55:1) et bg-subtle vs
bg (1.88:1 → 1.11:1) — confirmées comme conditions préexistantes, pas
des régressions introduites ici (hors scope #201, cf. spec).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DBWvASBNGXKCie9vdzdJYf
EOF
)"
```

---

## Task 6: Rayons — ajustement vers une échelle plus généreuse

**Files:**

- Modify: `packages/core/src/styles/themes/default.css` (bloc `--ar-border-radius-*`, section 5)

**Interfaces:**

- Consumes: rien de nouveau.
- Produces: aucun changement de nom de token — `--ar-border-radius-sm/md/lg/xl` gardent leurs noms, seules les valeurs changent ; tous les tokens composants qui en dérivent (`--ar-button-border-radius`, `--ar-panel-radius`, etc.) héritent automatiquement du changement sans modification.

- [ ] **Step 1: Remplacer les valeurs**

Remplacer :

```css
--ar-border-radius-sm: 0.25rem;
--ar-border-radius-md: 0.375rem;
--ar-border-radius-lg: 0.5rem;
--ar-border-radius-xl: 0.75rem;
```

par :

```css
/* Progression plus généreuse (identité #110), sans copier telle quelle
           l'échelle 4/12/20/40 de la doc (--doc-radius-*) : un bouton de
           --ar-button-height (2.5rem=40px) avec un rayon de 40px deviendrait
           une pilule complète, pas toujours voulu. Valeurs à confirmer par
           revue visuelle (Task 7 de ce plan) — ajustable par paliers de 2px
           si un composant semble disproportionné après capture. */
--ar-border-radius-sm: 0.25rem; /* 4px, inchangé */
--ar-border-radius-md: 0.5rem; /* 8px (était 6px) */
--ar-border-radius-lg: 0.875rem; /* 14px (était 8px) */
--ar-border-radius-xl: 1.5rem; /* 24px (était 12px) */
```

- [ ] **Step 2: Build**

```bash
npm run build --workspace=packages/core
```

Expected: build sans erreur.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/styles/themes/default.css
git commit -m "$(cat <<'EOF'
feat(core): rayons plus généreux dans le thème par défaut (#201)

--ar-border-radius-md/lg/xl passent de 6/8/12px à 8/14/24px (sm
inchangé à 4px) — progression dans l'esprit de l'échelle 4/12/20/40 de
la doc sans la copier telle quelle (un bouton de 40px de haut avec
40px de rayon deviendrait une pilule complète). Valeurs à confirmer
par revue visuelle (tâche suivante) — ajustables si un composant
semble disproportionné.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DBWvASBNGXKCie9vdzdJYf
EOF
)"
```

---

## Task 7: Revue visuelle Playwright (light + dark) et ajustement final des rayons

**Files:**

- Modify (potentiellement, si un ajustement de rayon est nécessaire): `packages/core/src/styles/themes/default.css:` bloc `--ar-border-radius-*` (Task 6)
- Create (temporaire, supprimé en fin de tâche): `apps/docs/visual-check-201.mjs`

**Interfaces:**

- Consumes: le serveur `astro preview` de `apps/docs` (démarré Step 1), servant les composants avec le nouveau `default.css` (les pages de doc chargent `/themes/default.css` par nom de fichier — aucune modif nécessaire côté doc, cf. spec section « Hors scope »).

- [ ] **Step 1: Builder la doc et démarrer un serveur de preview**

```bash
npm run build --workspace=apps/docs
pkill -f "astro preview" 2>/dev/null
nohup npx astro preview --root apps/docs --port 4322 > /tmp/astro-preview-201.log 2>&1 &
sleep 2
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4322/components/dialog/
```

Expected: `200`.

- [ ] **Step 2: Écrire le script de capture (pages composant représentatives, light + dark)**

```javascript
import { chromium } from 'playwright';

const pages = [
    { path: '/components/dialog/', name: 'dialog' },
    { path: '/components/alert/', name: 'alert' },
    { path: '/components/stepper/', name: 'stepper' },
    { path: '/components/pagination/', name: 'pagination' },
    { path: '/components/breadcrumb/', name: 'breadcrumb' },
    { path: '/components/datepicker/', name: 'datepicker' },
    { path: '/getting-started/quickstart/', name: 'quickstart-buttons' },
];

const browser = await chromium.launch();
for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
    await page.emulateMedia({ colorScheme: theme });
    for (const { path, name } of pages) {
        await page.goto(`http://localhost:4322${path}`);
        await page.waitForTimeout(500);
        await page.screenshot({ path: `/tmp/201-${name}-${theme}.png`, fullPage: false });
    }
    await page.close();
}
await browser.close();
console.log('Captures écrites dans /tmp/201-*.png');
```

- [ ] **Step 3: Exécuter et lire chaque capture**

```bash
node apps/docs/visual-check-201.mjs
```

Puis lire chacune des 14 captures produites (`/tmp/201-dialog-light.png`, `/tmp/201-dialog-dark.png`, etc.) avec l'outil de lecture d'image.

Pour chaque capture, vérifier :

1. L'accent ambre remplace bien le violet/cobalt sur tous les éléments interactifs (boutons, liens, focus, bullet de stepper, current de pagination).
2. Le fond sombre est bien le "vault" indigo (pas un gris neutre) sur les pages en dark.
3. Les rayons (boutons, dialog, alert, chips breadcrumb) semblent proportionnés — pas de pilule non désirée, pas de coin visuellement "cassé" (rayon plus grand que la moitié de la hauteur d'un petit élément).
4. Le texte reste lisible dans les deux modes (contrôle visuel grossier — le contrôle chiffré a déjà été fait aux tâches précédentes).

- [ ] **Step 4: Si un rayon semble disproportionné, ajuster**

Si un composant précis (ex. `ar-alert` avec `--ar-border-radius-xl`) semble trop arrondi ou pas assez à la lecture des captures : rouvrir `packages/core/src/styles/themes/default.css`, réduire (ou augmenter) la valeur concernée par paliers de `2px`, relancer `npm run build --workspace=packages/core` puis `npm run build --workspace=apps/docs`, recapturer uniquement la page concernée (adapter le tableau `pages` du Step 2 pour ne garder que l'entrée à revérifier), et rejouer le Step 3 jusqu'à un résultat satisfaisant. Committer l'ajustement séparément si un changement a eu lieu :

```bash
git add packages/core/src/styles/themes/default.css
git commit -m "$(cat <<'EOF'
fix(core): ajustement visuel des rayons après revue Playwright (#201)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DBWvASBNGXKCie9vdzdJYf
EOF
)"
```

Si aucun ajustement n'est nécessaire, ne rien committer à cette étape (les valeurs de Task 6 restent définitives).

- [ ] **Step 5: Nettoyage**

```bash
pkill -f "astro preview" 2>/dev/null
rm -f apps/docs/visual-check-201.mjs /tmp/201-*.png /tmp/astro-preview-201.log
git status --short   # confirmer qu'aucun résidu (script de capture, dist docs) n'est resté en staging
```

---

## Task 8: Nettoyage du script temporaire + suite de tests complète

**Files:**

- Delete: `packages/core/scripts/tmp-color-contrast-check.mjs`

**Interfaces:**

- Consumes: rien.

- [ ] **Step 1: Supprimer le script de vérification temporaire (Task 2)**

```bash
git rm packages/core/scripts/tmp-color-contrast-check.mjs
```

- [ ] **Step 2: Suite de tests complète (core + docs)**

```bash
npm run test
npm run test --workspace=apps/docs
```

Expected: 989/989 tests core, 67/67 tests docs — tous verts.

- [ ] **Step 3: Vérifier qu'aucun autre fichier ne référence encore le script supprimé**

```bash
grep -rn "tmp-color-contrast-check" --include="*.ts" --include="*.js" --include="*.mjs" --include="*.json" packages apps 2>/dev/null
```

Expected: aucun résultat.

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
chore(core): retirer le script temporaire de vérification de contraste (#201)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DBWvASBNGXKCie9vdzdJYf
EOF
)"
```

---

## Task 9: Créer la Pull Request

**Files:** aucun (tâche de process uniquement)

- [ ] **Step 1: Pousser la branche**

```bash
git push -u origin fix/default-theme-palette-201
```

- [ ] **Step 2: Créer la PR vers `dev`**

```bash
gh pr create --base dev --head fix/default-theme-palette-201 \
  --title "feat(core): retravailler la palette de default.css — identité ambre/Voûte (#201)" \
  --body "$(cat <<'EOF'
## Contexte

Suite à #110 (refonte visuelle de la doc) : la home et le reste du site
ont basculé sur l'identité ambre (`#FFAA00`) / palette sombre "Voûte"
(indigo nuit). Le thème publié de la librairie (`default.css`, chargé
par toutes les démos live de la doc et par tout premier consommateur
réel d'Ariane) restait sur son ancienne identité (violet/cobalt).

## Changements

- Ancien `default.css` renommé `default-old.css`, contenu inchangé,
  conservé pour réemploi futur, gelé (hors validation CEM).
- Nouveau `default.css` : rampe `primary` → ambre (ancrée sur des
  valeurs déjà vérifiées AA côté doc), rampe `neutral` → quasi
  achromatique (alignée sur le gris pur des primitifs `--doc-*`,
  corrigé après vérification empirique — pas de teinte "stone" comme
  envisagé initialement), nouveaux primitifs `vault`/`vault-deep` pour
  les fonds sombres, rayons plus généreux (`--ar-border-radius-*`).
- Aucun nom de token ne change — uniquement des valeurs.

## Vérification

- Contraste WCAG recalculé (script dédié, converti en oklch natif —
  cf. `docs/superpowers/specs/2026-09-15-default-theme-palette-201-design.md`)
  pour chaque paire touchée, dans les deux modes.
- Deux paires déjà sous le seuil UI (3:1) **avant** ce changement
  (bordure vs bg sombre, bg-subtle vs bg sombre) confirmées comme
  conditions préexistantes, pas des régressions introduites ici.
- 989/989 tests core, 67/67 tests docs.
- Revue visuelle Playwright (light + dark) sur dialog/alert/stepper/
  pagination/breadcrumb/datepicker/quickstart.

Spec : \`docs/superpowers/specs/2026-09-15-default-theme-palette-201-design.md\`

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01DBWvASBNGXKCie9vdzdJYf
EOF
)"
```

- [ ] **Step 3: Rapporter l'URL de la PR à l'utilisateur et attendre sa review — pas de merge automatique**
