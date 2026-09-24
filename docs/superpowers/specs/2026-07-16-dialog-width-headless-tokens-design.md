# Migration `--ar-dialog-width`/`--ar-dialog-spacing` vers `default.css` + garde-fou anti-régression

**Contexte** : suite directe de [PR #114](https://github.com/jogo-labs/ariane/pull/114) (#111 item 2, validation `@cssprop` vs `default.css`). Pendant la revue humaine, question posée sur le seul cas restant de « JSDoc a une valeur mais le token est absent de `default.css` » : `dialog.styles.ts` code en dur des valeurs directement sur `:host` (`--ar-dialog-width`, `--ar-dialog-spacing`), en contradiction avec la philosophie headless du projet (« aucun fallback cosmétique dans les composants — toutes les valeurs de design vont dans `themes/default.css` », CLAUDE.md).

Audit du repo (2026-07-16) : `dialog.styles.ts` est le **seul** fichier composant avec des valeurs `--ar-*` littérales assignées sur `:host` — aucun autre composant (`datepicker` compris) n'est concerné.

## Problème

Deux sous-cas distincts dans `dialog.styles.ts` :

1. **`--ar-dialog-spacing: 1.25rem;`** — token de design statique, sans logique conditionnelle. Devrait vivre dans `default.css` comme tous les autres tokens du même type.
2. **`--ar-dialog-width`** — valeur pilotée par les attributs `size` (`sm`/`md`/`lg`/`xl`) et `mode` (`modal`/`drawer`), 9 valeurs différentes selon la combinaison (4 tailles modal + 4 tailles drawer + 1 valeur de base identique à `md`). Ne peut pas migrer tel quel : `default.css` n'a aucun moyen d'exprimer une logique conditionnelle par attribut.

## Solution retenue

### 1. `--ar-dialog-spacing` → migration directe

Retiré de `dialog.styles.ts` (`:host { ... }`), ajouté à `default.css` (`:root`) avec sa valeur actuelle (`1.25rem`). Hérité par cascade normale — aucune référence `var()` supplémentaire nécessaire dans le composant, le token n'étant pas conditionnel.

### 2. `--ar-dialog-width` → 8 tokens preset dans `default.css`, sélection par `var()`

`default.css` gagne 8 nouveaux tokens, valeurs identiques à celles actuellement codées en dur dans `dialog.styles.ts` :

```
--ar-dialog-width-sm: 360px;
--ar-dialog-width-md: 500px;
--ar-dialog-width-lg: 800px;
--ar-dialog-width-xl: 1140px;
--ar-dialog-drawer-width-sm: 360px;
--ar-dialog-drawer-width-md: 720px;
--ar-dialog-drawer-width-lg: 960px;
--ar-dialog-drawer-width-xl: 1440px;
```

Tokens indépendants (pas de fallback chaîné entre `-width-sm` et `-drawer-width-sm` même si leur valeur coïncide aujourd'hui à 360px) — un consommateur peut retheme les tailles drawer sans affecter les tailles modal, et inversement.

`dialog.styles.ts` : chaque valeur littérale devient une référence `var()` vers le preset correspondant. **Un seul token** `--ar-dialog-width` continue de jouer le double rôle qu'il joue déjà aujourd'hui : sélectionné par les règles `:host([size=...])`/`:host([mode='drawer']...)`, ET reste directement surchargeable sur une instance (`<ar-dialog style="--ar-dialog-width: 650px">`) via la cascade CSS normale — comportement strictement inchangé, seule la source des valeurs par défaut change (littéral → `var()` vers `default.css`). **Pas de token interne séparé** : envisagé puis écarté pendant le brainstorming, aucune nécessité structurelle (le mécanisme actuel de cascade suffit déjà), et pas de cas d'usage concret ailleurs dans la lib pour justifier une convention de nommage "tokens internes non documentés" (YAGNI — à documenter le jour où un vrai besoin apparaît).

```css
:host {
    display: block;
    --ar-dialog-width: var(--ar-dialog-width-md);
}

:host([size='sm']) {
    --ar-dialog-width: var(--ar-dialog-width-sm);
}
:host([size='md']) {
    --ar-dialog-width: var(--ar-dialog-width-md);
}
:host([size='lg']) {
    --ar-dialog-width: var(--ar-dialog-width-lg);
}
:host([size='xl']) {
    --ar-dialog-width: var(--ar-dialog-width-xl);
}

:host([mode='drawer']) {
    --ar-dialog-width: var(--ar-dialog-drawer-width-md);
}
:host([mode='drawer'][size='sm']) {
    --ar-dialog-width: var(--ar-dialog-drawer-width-sm);
}
:host([mode='drawer'][size='md']) {
    --ar-dialog-width: var(--ar-dialog-drawer-width-md);
}
:host([mode='drawer'][size='lg']) {
    --ar-dialog-width: var(--ar-dialog-drawer-width-lg);
}
:host([mode='drawer'][size='xl']) {
    --ar-dialog-width: var(--ar-dialog-drawer-width-xl);
}
```

### 3. JSDoc `dialog.ts`

Ajout de 8 `@cssprop` pour les nouveaux tokens preset (description type « Largeur du dialog modal/drawer, taille sm/md/lg/xl. »), avec leur `=valeur` correspondant à `default.css` — automatiquement couverts par les deux checks de [PR #114](https://github.com/jogo-labs/ariane/pull/114) (`validateCssPropertyDefaults` pour la cohérence, `validateCssPropertyCoverage` pour la complétude) dès qu'ils existent des deux côtés.

`--ar-dialog-width` et `--ar-dialog-spacing` gardent leur documentation actuelle inchangée (`--ar-dialog-width` reste « hors thème » au sens de la PR #114 : sa valeur affichée dépend de `size`/`mode`, pas comparable à un token `default.css` unique — `--ar-dialog-spacing`, lui, devient un token normal comparable puisqu'il migre dans `default.css`).

### 4. Garde-fou automatique — nouveau fichier `validate-no-hardcoded-tokens.js`

Nouveau fichier `packages/core/scripts/validate-no-hardcoded-tokens.js`, séparé de `validate-cssprop-defaults.js` : préoccupation différente (détection directe d'une violation de la règle headless, pas une comparaison de deux sources documentées).

Fonction exportée `findHardcodedTokenAssignments(componentSources)` où `componentSources` est une `Map<string, string>` chemin de fichier → contenu brut, préalablement lue par `cem.config.js` pour chaque `*.styles.ts` du package. Regex détecte toute assignation `--ar-[\w-]+:\s*<valeur>` où `<valeur>` ne commence pas par `var(` — une valeur littérale posée directement sur un token `--ar-*`, peu importe le sélecteur (`:host`, `:host([...])`, ou tout autre). Retourne une liste d'erreurs `chemin:ligne — --ar-xxx codé en dur, doit référencer un token default.css via var()`.

Branché dans `cem.config.js` au même point que les autres checks (`packageLinkPhase`), `throw` combiné avec les deux autres si non vide. Après le correctif ci-dessus, 0 occurrence dans le repo — le check passe au vert immédiatement et bloque toute réintroduction future du même problème.

Portée volontairement étroite : ne vérifie que les assignations de custom properties (`--ar-xxx: valeur;`), jamais les usages en consommation (`var(--ar-xxx, fallback)`) — les fallbacks structurels du type `var(--ar-xxx, 0px)` restent autorisés par CLAUDE.md et ne sont pas concernés par ce nouveau check.

### 5. ADR-005 — formalisation du principe

Nouvel ADR (`docs/decisions/ADR-005-tokens-pilotes-par-attribut.md`), sans modifier ADR-004 (immuable une fois adopté) :

- Note qu'ADR-004 (« Philosophie de style des composants ») est partiellement dépassé sur un point précis : l'exemple `color: var(--ar-tab-color, currentColor)` (fallback fonctionnel inline dans le composant) ne reflète plus la pratique depuis le chantier headless (#47) — `default.css` est désormais la source unique des valeurs de design, sans fallback dans le composant. Le reste d'ADR-004 (répartition en 3 couches : styles internes fixes / tokens `--ar-*` / `::part()`) reste valide.
- Règle pour les valeurs pilotées par état/attribut (cas `--ar-dialog-width`) : un token `default.css` nommé par état (`--ar-<composant>-<propriété>-<état>`), le composant sélectionne la valeur via `var()` dans ses règles `:host([attr='...'])` — jamais de valeur littérale codée en dur, même conditionnelle. Le token « consolidé » que sélectionnent ces règles (ex. `--ar-dialog-width`) reste public et documenté s'il sert aussi de point de surcharge direct pour un consommateur.

## Hors scope

- Convention de nommage pour des tokens véritablement internes/non documentables (`--ar-internal-*` ou équivalent) — écartée pour ce chantier, aucun cas concret ne la justifie (YAGNI).
- Tout autre composant que `dialog` — audit confirmé qu'aucun autre fichier n'a de valeur `--ar-*` codée en dur sur `:host`.
- Résolution récursive de `var()`, portée déjà actée par la PR #114.

## Vérification attendue

- `npm run build:manifest` (`packages/core`) passe sans erreur sur l'état final (les 3 checks : cohérence, complétude, absence de valeurs codées en dur).
- Test délibéré : réintroduire temporairement une valeur littérale dans `dialog.styles.ts`, confirmer que `build:manifest` échoue avec un message clair (fichier, ligne, token), puis annuler.
- Vérification visuelle : les tailles de dialog rendues ne changent pas (valeurs identiques, juste la source qui change) — à confirmer via `apps/docs` sur au moins une taille modal et une taille drawer.
- Vitest core (aucune régression attendue, changement de configuration/CSS uniquement) + `tsc --noEmit` + lint clean.
- `npm run build` (racine) reste vert en CI.
