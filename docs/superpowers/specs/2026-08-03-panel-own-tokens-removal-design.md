# Retrait des tokens panel redondants (`--ar-dropdown-bg`, `--ar-breadcrumb-panel-bg`, `--ar-stepper-panel-bg` et leurs `-border-color`)

**Date :** 2026-08-03
**Statut :** Brouillon — à valider avant plan

## Contexte

Suite au chantier de documentation publique des tokens `--ar-panel-*` (PR #151), la revue finale
de branche a trouvé que l'exemple « surcharger un token panel scopé au composant » était un
no-op sur `ar-dropdown`/`ar-breadcrumb`/`ar-stepper` : ces 3 composants exposent leur propre
token (`--ar-dropdown-bg`, `--ar-breadcrumb-panel-bg`, `--ar-stepper-panel-bg`, et leurs pendants
`-border-color`), réaliasé à `:root` vers `--ar-panel-bg`/`--ar-panel-border-color`
(`default.css:366-367, 393-394, 438-439`) mais qui prend le pas dans la cascade dès qu'un
consommateur scope `--ar-panel-bg` directement sur le composant.

**Discussion de fond (session courante)** : maintenant que la doc publique explique explicitement
la technique de surcharge scopée d'un token `--ar-panel-*` existant, ces 6 tokens n'apportent plus
rien — la portée par sélecteur (`ar-dropdown { --ar-panel-bg: ...; }`) est déjà nativement fournie
par les custom properties CSS, sans avoir besoin d'un token intermédiaire dédié. Vérifié : ces 6
tokens sont de purs alias 1:1, ne divergent jamais en valeur du thème par défaut, et n'ont aucune
calibration dark-mode indépendante — ils tombent exactement sous la règle déjà actée au chantier
#129 lot 5 (« un token qui duplique un fallback déjà garanti par une feuille de style partagée,
sans jamais diverger, se supprime plutôt que se migre » — déjà appliquée à `--ar-dropdown-color`
à l'époque, mais pas à `-bg`/`-border-color`, faute de justification de retrait suffisante avant
que la doc publique n'existe).

**Impact API publique** : ce sont des tokens documentés (`@cssprop`), leur retrait est un
changement d'API. Projet en alpha (`0.1.0-alpha.8`) → retrait direct sans dépréciation, conforme à
CLAUDE.md (« pas nécessaire en alpha »).

## Décision retenue

Retirer entièrement les 6 tokens : `--ar-dropdown-bg`, `--ar-dropdown-border-color`,
`--ar-breadcrumb-panel-bg`, `--ar-breadcrumb-panel-border-color`, `--ar-stepper-panel-bg`,
`--ar-stepper-panel-border-color`. Les 3 composants héritent alors directement de
`background-color: var(--ar-panel-bg, Canvas)` / `border: 1px solid var(--ar-panel-border-color,
ButtonBorder)` posés par `panel.styles.ts` (déjà le cas pour `ar-datepicker`, seul composant qui
n'a jamais eu ce niveau d'indirection).

## Changements

### 1. Composants — retrait du bloc `[part='panel']` devenu vide de sens

Dans chacun des 3 fichiers `.styles.ts`, le bloc ne contient que ces 2 déclarations — le retirer
entièrement (accolades incluses) :

- `packages/core/src/components/dropdown/dropdown.styles.ts:8-12`
- `packages/core/src/components/breadcrumb/breadcrumb.styles.ts:103-106`
- `packages/core/src/components/stepper/stepper.styles.ts:25-28`

Vérifié : chacun de ces blocs ne contient **que** `background-color`/`border-color` — aucune autre
propriété à préserver ou à redistribuer ailleurs.

### 2. JSDoc — retrait des `@cssprop` correspondants

- `dropdown.ts:34-35` (`--ar-dropdown-bg`, `--ar-dropdown-border-color`)
- `breadcrumb.ts:50-51` (`--ar-breadcrumb-panel-bg`, `--ar-breadcrumb-panel-border-color`)
- `stepper.ts:58-59` (`--ar-stepper-panel-bg`, `--ar-stepper-panel-border-color`)

Ne pas toucher aux autres `@cssprop` du même bloc (ex. `--ar-dropdown-distance`/`-offset` restent).
Les 9 lignes `@cssprop --ar-panel-*` ajoutées en PR #151 restent inchangées.

### 3. `default.css` — retrait des 6 déclarations

- `:366-367` (`ar-breadcrumb-panel-bg`/`-border-color`)
- `:393-394` (`ar-stepper-panel-bg`/`-border-color`)
- `:438-439` (`ar-dropdown-bg`/`-border-color`)

Vérifier après coup qu'aucun autre endroit de `default.css` ne référence ces 6 noms (ex. dans un
`calc()` ou un alias d'un autre composant) — un `grep` avant de conclure au retrait propre.

### 4. Tests — commentaires à corriger, pas de logique cassée

`dropdown.browser.test.ts:211-217`, `stepper.browser.test.ts:92-98`,
`breadcrumb.browser.test.ts:105-111` vérifient que le panel a un `background-color`/
`border-top-color` non vide/non transparent **sans thème chargé** (fallback système). Ces
assertions restent vraies après le retrait — le fallback (`Canvas`/`ButtonBorder`) est désormais
posé directement par `panel.styles.ts` au lieu de transiter par le token du composant, mais le
résultat calculé est identique. **Seul le commentaire est à corriger** (il attribue actuellement
le fallback à `dropdown.styles.ts`/`stepper.styles.ts`/`breadcrumb.styles.ts` — devenu inexact,
remplacer par `panel.styles.ts`).

### 5. `ComponentApi.astro` / doc générée

Aucun changement de code nécessaire — la table « CSS Custom Properties propres » (PR #151) est
entièrement pilotée par le JSDoc `@cssprop` du composant ; retirer les entrées côté JSDoc suffit à
les faire disparaître de la doc générée. Les 3 composants gardent d'autres tokens propres
(`--ar-dropdown-distance`/`-offset`, tokens `toggle-*` de breadcrumb, tokens `bullet`/`connector`
de stepper) donc la table ne devient jamais vide.

## Vérification

- `npm run build:manifest --workspace=packages/core` (garde-fous CI, notamment
  `validate-cssprop-defaults` qui ne doit plus rien trouver à valider pour ces 6 noms).
- `npm run test` (suite complète — en particulier les 3 tests de fallback panel ci-dessus, dont
  seul le commentaire change).
- `npm run build --workspace=apps/docs` (build Astro complet, vérifier que les 3 pages composant
  affichent toujours une table « CSS Custom Properties propres » non vide, sans les 6 tokens
  retirés).
- Vérification visuelle Playwright (desktop) sur `ar-dropdown`/`ar-breadcrumb`/`ar-stepper`, avec
  et sans thème chargé (comparer le rendu du panel avant/après — aucune différence attendue, les
  valeurs de repli et thémées sont strictement identiques par construction).
- Grep final sur les 6 noms de tokens dans `packages/core/src/` pour confirmer zéro référence
  résiduelle (hors historique `docs/superpowers/`, qui n'est jamais modifié après coup).

## Résultat attendu

- 6 tokens publics retirés, aucune perte de capacité de personnalisation réelle (déjà démontré :
  la technique de surcharge scopée d'un token `--ar-panel-*` documentée en PR #151 couvre le même
  besoin, de façon plus simple et sans le piège du no-op).
- `ar-dropdown`/`ar-breadcrumb`/`ar-stepper` deviennent alignés sur `ar-datepicker` : aucun des 4
  composants ne référence plus de token `--ar-panel-*` intermédiaire dans son propre CSS, ils
  héritent tous directement de `panel.styles.ts`.
- La phrase de mise en garde sur les tokens spécifiques par composant (ajoutée en fix de revue
  finale PR #151, puis déjà retirée par la réécriture manuelle de `ComponentApi.astro` faite en
  parallèle de ce chantier) n'a plus lieu d'être réintroduite — ce retrait la rend définitivement
  correcte plutôt que simplement simplifiée.

## Hors scope

- Les tokens `--ar-dropdown-distance`/`-offset` et équivalents (positionnement du panel, pas sa
  couleur) — non concernés, pas de redondance avec `--ar-panel-*`.
- Toute réflexion sur `--ar-datepicker-panel-max-width` (déjà tranchée comme exception assumée,
  valeur fonctionnelle propre, cf. mémoire `project_token_vs_part_generalization_129`) — non
  concernée par ce chantier.
- Autres composants du chantier #129 (`pagination`, `tooltip`, etc.) — non consommateurs de
  `panel.styles.ts`, hors périmètre.
