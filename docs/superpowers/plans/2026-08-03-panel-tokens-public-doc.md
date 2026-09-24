# Documentation publique des tokens panel partagés Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Documenter publiquement les 9 tokens `--ar-panel-*` (source `panel.styles.ts`) sur les 4
pages composant qui consomment le panel partagé (`ar-dropdown`, `ar-breadcrumb`, `ar-stepper`,
`ar-datepicker`), avec un bloc dédié affiché en premier illustrant les deux techniques de
personnalisation — conformément à
`docs/superpowers/specs/2026-08-03-panel-tokens-public-doc-design.md`.

**Architecture:** Aucun changement de structure DOM, aucun nouveau `part`, aucune nouvelle
propriété CSS custom. Deux surfaces modifiées : (1) JSDoc `@cssprop` des 4 composants
(`packages/core`), simple ajout de 9 lignes identiques chacun ; (2) rendu de la section « CSS
Custom Properties » dans `ComponentApi.astro` (`apps/docs`), partition + bloc conditionnel. Les
composants qui ne consomment pas `panel.styles.ts` (tous les autres) ne sont pas affectés.

**Tech Stack:** Lit 3, TypeScript, Astro, Custom Elements Manifest (`@custom-elements-manifest/analyzer`),
Prettier, garde-fous CI (`validate-cssprop-defaults.js`).

## Global Constraints

- Prettier : 100 char, 4 spaces, single quotes (CLAUDE.md).
- Les 9 lignes `@cssprop --ar-panel-*` doivent être **texte identique** dans les 4 composants
  (pas de dérivation automatique — convention déjà actée sur ce projet).
- Ne jamais merger sur `dev` sans confirmation explicite de l'utilisateur
  (feedback_merge_after_autonomous_fix).
- `npm run dev --workspace=apps/docs` seul ne reconstruit pas le JS de `packages/core/dist` —
  rebuild explicite (`npm run build:dev --workspace=packages/core`) requis avant toute
  vérification Playwright (feedback_docs_dev_stale_dist).
- `--tag-name>` dans les exemples de code doit être dynamique (`component.tagName`), jamais en
  dur — sinon les 4 pages afficheraient le même nom de composant dans leur exemple.

---

## Task 1: Créer la branche de travail

**Files:** aucun.

- [ ] **Step 1: Créer la branche depuis `dev`**

```bash
git checkout dev
git pull origin dev
git checkout -b docs/panel-tokens-public-doc
```

- [ ] **Step 2: Vérifier l'état propre**

Run: `git status`
Expected: `On branch docs/panel-tokens-public-doc`, `nothing to commit, working tree clean`.

- [ ] **Step 3: Commit de la spec et du plan**

```bash
git add docs/superpowers/specs/2026-08-03-panel-tokens-public-doc-design.md docs/superpowers/plans/2026-08-03-panel-tokens-public-doc.md
git commit -m "docs(panel): spec + plan documentation publique des tokens --ar-panel-*"
```

---

## Task 2: JSDoc `@cssprop` — `ar-dropdown`

**Files:**

- Modify: `packages/core/src/components/dropdown/dropdown.ts`

**Interfaces:**

- Consumes: rien (JSDoc uniquement, pas de code exécuté).
- Produces: 9 nouvelles entrées `cssProperties` dans le CEM manifest pour `ar-dropdown`,
  consommées par `ComponentApi.astro` (Task 6).

- [ ] **Step 1: Insérer les 9 lignes après le dernier `@cssprop` existant**

Contenu actuel (`dropdown.ts:34-37`) :

```
 * @cssprop --ar-dropdown-bg - Fond du panel (cascade vers --ar-panel-bg, repli système `Canvas` si aucun thème n'est chargé).
 * @cssprop --ar-dropdown-border-color - Bordure (cascade vers --ar-panel-border-color, repli système `ButtonBorder` si aucun thème n'est chargé).
 * @cssprop --ar-dropdown-distance - Espacement entre le trigger et le panel (axe principal).
 * @cssprop --ar-dropdown-offset - Décalage latéral du panel (axe transversal).
```

Nouveau contenu — ajouter les 9 lignes juste après (avant la ligne vide qui précède `@event`) :

```
 * @cssprop --ar-dropdown-bg - Fond du panel (cascade vers --ar-panel-bg, repli système `Canvas` si aucun thème n'est chargé).
 * @cssprop --ar-dropdown-border-color - Bordure (cascade vers --ar-panel-border-color, repli système `ButtonBorder` si aucun thème n'est chargé).
 * @cssprop --ar-dropdown-distance - Espacement entre le trigger et le panel (axe principal).
 * @cssprop --ar-dropdown-offset - Décalage latéral du panel (axe transversal).
 * @cssprop --ar-panel-bg - Fond du panel partagé. Repli système `Canvas` si aucun thème n'est chargé.
 * @cssprop --ar-panel-text - Couleur du texte du panel partagé. Repli système `CanvasText` si aucun thème n'est chargé.
 * @cssprop --ar-panel-border-color - Couleur de bordure du panel partagé. Repli système `ButtonBorder` si aucun thème n'est chargé.
 * @cssprop --ar-panel-radius - Rayon de bordure du panel partagé.
 * @cssprop --ar-panel-shadow - Ombre portée du panel partagé.
 * @cssprop --ar-panel-padding - Espacement interne du panel partagé.
 * @cssprop --ar-panel-min-width - Largeur minimale du panel partagé.
 * @cssprop --ar-panel-max-width - Largeur maximale du panel partagé.
 * @cssprop --ar-panel-show-duration - Durée de l'animation d'ouverture du panel partagé (respecte `prefers-reduced-motion`).
```

- [ ] **Step 2: Vérifier le format**

Run: `npx prettier --check packages/core/src/components/dropdown/dropdown.ts`
Expected: pas d'erreur.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/components/dropdown/dropdown.ts
git commit -m "docs(dropdown): documente les 9 tokens --ar-panel-* hérités"
```

---

## Task 3: JSDoc `@cssprop` — `ar-breadcrumb`

**Files:**

- Modify: `packages/core/src/components/breadcrumb/breadcrumb.ts`

**Interfaces:**

- Consumes: rien.
- Produces: 9 nouvelles entrées `cssProperties` dans le CEM manifest pour `ar-breadcrumb`.

- [ ] **Step 1: Insérer les 9 lignes après le dernier `@cssprop` existant**

Contenu actuel (`breadcrumb.ts:47-57`, dernière ligne) :

```
 * @cssprop --ar-breadcrumb-toggle-transition-duration - Durée de la transition (background-color) des boutons retour/trigger mobile.
```

Ajouter juste après (avant la ligne vide qui précède `@event`) :

```
 * @cssprop --ar-panel-bg - Fond du panel partagé. Repli système `Canvas` si aucun thème n'est chargé.
 * @cssprop --ar-panel-text - Couleur du texte du panel partagé. Repli système `CanvasText` si aucun thème n'est chargé.
 * @cssprop --ar-panel-border-color - Couleur de bordure du panel partagé. Repli système `ButtonBorder` si aucun thème n'est chargé.
 * @cssprop --ar-panel-radius - Rayon de bordure du panel partagé.
 * @cssprop --ar-panel-shadow - Ombre portée du panel partagé.
 * @cssprop --ar-panel-padding - Espacement interne du panel partagé.
 * @cssprop --ar-panel-min-width - Largeur minimale du panel partagé.
 * @cssprop --ar-panel-max-width - Largeur maximale du panel partagé.
 * @cssprop --ar-panel-show-duration - Durée de l'animation d'ouverture du panel partagé (respecte `prefers-reduced-motion`).
```

Texte strictement identique à la Task 2 (invariant du plan — vérifié en Task 9).

- [ ] **Step 2: Vérifier le format**

Run: `npx prettier --check packages/core/src/components/breadcrumb/breadcrumb.ts`
Expected: pas d'erreur.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/components/breadcrumb/breadcrumb.ts
git commit -m "docs(breadcrumb): documente les 9 tokens --ar-panel-* hérités"
```

---

## Task 4: JSDoc `@cssprop` — `ar-stepper`

**Files:**

- Modify: `packages/core/src/components/stepper/stepper.ts`

**Interfaces:**

- Consumes: rien.
- Produces: 9 nouvelles entrées `cssProperties` dans le CEM manifest pour `ar-stepper`.

- [ ] **Step 1: Insérer les 9 lignes après le dernier `@cssprop` existant**

Contenu actuel (`stepper.ts:74`, dernière ligne) :

```
 * @cssprop --ar-stepper-link-focus-outline-color - Couleur de l'anneau de focus du lien d'étape (cascade vers --ar-color-interactive).
```

Ajouter juste après (avant la ligne vide qui précède `@event`), même 9 lignes que Tasks 2-3 :

```
 * @cssprop --ar-panel-bg - Fond du panel partagé. Repli système `Canvas` si aucun thème n'est chargé.
 * @cssprop --ar-panel-text - Couleur du texte du panel partagé. Repli système `CanvasText` si aucun thème n'est chargé.
 * @cssprop --ar-panel-border-color - Couleur de bordure du panel partagé. Repli système `ButtonBorder` si aucun thème n'est chargé.
 * @cssprop --ar-panel-radius - Rayon de bordure du panel partagé.
 * @cssprop --ar-panel-shadow - Ombre portée du panel partagé.
 * @cssprop --ar-panel-padding - Espacement interne du panel partagé.
 * @cssprop --ar-panel-min-width - Largeur minimale du panel partagé.
 * @cssprop --ar-panel-max-width - Largeur maximale du panel partagé.
 * @cssprop --ar-panel-show-duration - Durée de l'animation d'ouverture du panel partagé (respecte `prefers-reduced-motion`).
```

- [ ] **Step 2: Vérifier le format**

Run: `npx prettier --check packages/core/src/components/stepper/stepper.ts`
Expected: pas d'erreur.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/components/stepper/stepper.ts
git commit -m "docs(stepper): documente les 9 tokens --ar-panel-* hérités"
```

---

## Task 5: JSDoc `@cssprop` — `ar-datepicker`

**Files:**

- Modify: `packages/core/src/components/datepicker/datepicker.ts`

**Interfaces:**

- Consumes: rien.
- Produces: 9 nouvelles entrées `cssProperties` dans le CEM manifest pour `ar-datepicker`.

- [ ] **Step 1: Insérer les 9 lignes après le dernier `@cssprop` existant**

Contenu actuel (`datepicker.ts:71`, dernière ligne) :

```
 * @cssprop --ar-datepicker-footer-btn-focus-ring-color - Couleur de l'anneau de focus des boutons du footer (cascade vers --ar-focus-ring-color). Repli `ButtonText` si aucun thème n'est chargé (WCAG 2.4.7).
```

Ajouter juste après (avant la ligne vide qui précède `@event`), même 9 lignes que Tasks 2-4 :

```
 * @cssprop --ar-panel-bg - Fond du panel partagé. Repli système `Canvas` si aucun thème n'est chargé.
 * @cssprop --ar-panel-text - Couleur du texte du panel partagé. Repli système `CanvasText` si aucun thème n'est chargé.
 * @cssprop --ar-panel-border-color - Couleur de bordure du panel partagé. Repli système `ButtonBorder` si aucun thème n'est chargé.
 * @cssprop --ar-panel-radius - Rayon de bordure du panel partagé.
 * @cssprop --ar-panel-shadow - Ombre portée du panel partagé.
 * @cssprop --ar-panel-padding - Espacement interne du panel partagé.
 * @cssprop --ar-panel-min-width - Largeur minimale du panel partagé.
 * @cssprop --ar-panel-max-width - Largeur maximale du panel partagé.
 * @cssprop --ar-panel-show-duration - Durée de l'animation d'ouverture du panel partagé (respecte `prefers-reduced-motion`).
```

Rappel (déjà vérifié en amont de la spec) : `ar-datepicker` ne référence plus aucun token
`--ar-panel-*` dans son propre CSS interne (`datepicker.styles.ts`) depuis PR #150 — ces 9 lignes
documentent uniquement l'héritage du panel partagé, aucun cas particulier à gérer.

- [ ] **Step 2: Vérifier le format**

Run: `npx prettier --check packages/core/src/components/datepicker/datepicker.ts`
Expected: pas d'erreur.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/components/datepicker/datepicker.ts
git commit -m "docs(datepicker): documente les 9 tokens --ar-panel-* hérités"
```

---

## Task 6: Restructurer la section « CSS Custom Properties » dans `ComponentApi.astro`

**Files:**

- Modify: `apps/docs/src/components/ComponentApi.astro`

**Interfaces:**

- Consumes: `component.cssProperties` (peuplé par le CEM depuis les Tasks 2-5), `component.tagName`.
- Produces: rendu HTML restructuré pour les 4 composants avec tokens panel ; rendu strictement
  inchangé pour tous les autres composants (`panelProps.length === 0`).

- [ ] **Step 1: Remplacer le bloc « CSS Custom Properties » (lignes ~150-173)**

Contenu actuel :

```astro
    {/* ── CSS Custom Properties ── */}
    {component.cssProperties && component.cssProperties.length > 0 && (
        <section>
            <h4 id="api-css-props" class="subsection-title">CSS Custom Properties</h4>
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th scope="col">Nom</th>
                            <th scope="col">Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        {component.cssProperties.map((prop) => (
                            <tr>
                                <td><code>{prop.name}</code></td>
                                <td>{prop.description ?? ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    )}
```

Nouveau contenu — calculer la partition juste avant le bloc `<div class="component-api">`
(dans le frontmatter Astro, à la suite de `publicMethods`), puis remplacer le bloc JSX :

Ajouter dans le frontmatter (après la déclaration de `publicMethods`, avant le `---` de
fermeture) :

```astro
const panelProps = (component.cssProperties ?? []).filter((p) => p.name.startsWith('--ar-panel-'));
const ownProps = (component.cssProperties ?? []).filter((p) => !p.name.startsWith('--ar-panel-'));
```

Remplacer le bloc JSX par :

```astro
    {/* ── Tokens du panel partagé (affiché en premier si présent) ── */}
    {panelProps.length > 0 && (
        <section>
            <h4 id="api-panel-tokens" class="subsection-title">Tokens du panel partagé</h4>
            <p class="hint">
                Ce composant utilise un panel flottant partagé avec d'autres composants de la
                librairie. Deux techniques de personnalisation sont possibles : redéfinir un ou
                plusieurs tokens ci-dessous, scopés à ce composant uniquement (n'affecte pas les
                autres consommateurs du panel partagé), ou surcharger n'importe quelle propriété
                CSS via <code>::part(panel)</code>, sans passer par les tokens — utile pour une
                propriété que le thème par défaut ne tokenise pas, ou pour un changement plus
                large que ce que les tokens exposent.
            </p>
            <div class="code-block">
                <p class="code-caption">Technique 1 — token scopé au composant :</p>
                <pre><code class="language-css">{`${component.tagName} {\n    --ar-panel-bg: #fff;\n}`}</code></pre>
            </div>
            <div class="code-block">
                <p class="code-caption">Technique 2 — <code>::part(panel)</code> :</p>
                <pre><code class="language-css">{`${component.tagName}::part(panel) {\n    background-color: #fff;\n}`}</code></pre>
            </div>
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th scope="col">Nom</th>
                            <th scope="col">Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        {panelProps.map((prop) => (
                            <tr>
                                <td><code>{prop.name}</code></td>
                                <td>{prop.description ?? ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    )}

    {/* ── CSS Custom Properties propres au composant ── */}
    {ownProps.length > 0 && (
        <section>
            <h4 id="api-css-props" class="subsection-title">CSS Custom Properties</h4>
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th scope="col">Nom</th>
                            <th scope="col">Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ownProps.map((prop) => (
                            <tr>
                                <td><code>{prop.name}</code></td>
                                <td>{prop.description ?? ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    )}
```

**Point d'attention** : pour un composant sans token panel, `panelProps.length === 0` (le premier
bloc ne rend rien) et `ownProps` contient la totalité de `component.cssProperties` (identique au
comportement actuel) — aucune régression pour les composants non concernés.

- [ ] **Step 2: Ajouter les styles `.code-block`/`.code-caption` dans le `<style>` du fichier**

Réutiliser le pattern de classe `.code-block` déjà présent dans `Playground.astro` (chercher
`.code-block` dans ce fichier pour copier les règles `padding`/`background`/`border-radius`/
`overflow-x` exactes, adaptées au contexte de `ComponentApi.astro` qui n'a pas de wrapper
`preview-wrap` autour). Ajouter aussi `.code-caption` (petit texte au-dessus de chaque exemple,
même traitement typographique que `.hint`) :

```css
.code-block {
    margin-bottom: 1rem;
}

.code-caption {
    font-size: 0.875rem;
    color: var(--doc-text-muted);
    margin-bottom: 0.375rem;
}

.code-block pre {
    margin: 0;
    overflow-x: auto;
}
```

Vérifier après coup dans le navigateur que le rendu ne casse pas la largeur de page sur mobile
(cf. philosophie mobile-first, CLAUDE.md) — `overflow-x: auto` sur le conteneur du `<pre>`, pas
sur la section entière.

- [ ] **Step 3: Vérifier le format**

Run: `npx prettier --check apps/docs/src/components/ComponentApi.astro`
Expected: pas d'erreur (confirmé : `.astro` fait partie du glob du script racine `npm run
format`, Prettier gère bien ce type de fichier dans ce projet).

- [ ] **Step 4: Commit**

```bash
git add apps/docs/src/components/ComponentApi.astro
git commit -m "feat(docs): affiche un bloc dédié aux tokens panel partagés, avant les tokens propres"
```

---

## Task 7: Rebuild manifeste + build Astro complet

**Files:** aucun fichier modifié — vérification uniquement.

- [ ] **Step 1: Rebuild le manifeste CEM (déclenche les garde-fous CI)**

Run: `npm run build:manifest --workspace=packages/core`
Expected: succès, aucune erreur `validate-cssprop-defaults.js` (les 3 tokens `bg`/`text`/
`border-color` avec repli système doivent matcher le format attendu par le script — mot-clé
`Canvas`/`CanvasText`/`ButtonBorder` sans commentaire `a11y-fallback` requis, cf. le comportement
déjà observé sur les tokens `--ar-dropdown-bg`/`--ar-breadcrumb-panel-bg` existants qui suivent
le même format).

- [ ] **Step 2: Build Astro complet (pas seulement dev)**

Run: `npm run build --workspace=apps/docs`
Expected: succès, aucune erreur de rendu sur les 4 pages composant concernées (le build statique
génère toutes les pages — une erreur de template JSX apparaîtrait ici, contrairement au dev
server qui peut masquer certaines erreurs).

- [ ] **Step 3: Lancer la suite de tests complète**

Run: `npm run test`
Expected: tous les tests passent (804 tests core + suite docs), aucune régression. Pas de test
dédié à `ComponentApi.astro` à ce jour (confirmé par grep en amont de la spec) — pas de nouveau
test à écrire pour ce chantier, la vérification passe par le build + Playwright (Task 8).

- [ ] **Step 4: Commit (uniquement si un fix a été nécessaire)**

Si les Steps 1-3 ont nécessité une correction, committer séparément avec un message décrivant le
problème trouvé. Sinon, passer directement à Task 8.

---

## Task 8: Vérification visuelle manuelle (Playwright)

**Files:** aucun fichier modifié — vérification uniquement.

- [ ] **Step 1: Rebuild explicite de `packages/core` avant toute vérification Playwright**

Run: `npm run build:dev --workspace=packages/core`
Expected: build réussi (piège connu, cf. Global Constraints).

- [ ] **Step 2: Lancer le serveur de doc**

Run: `npm run dev --workspace=apps/docs` (arrière-plan ou terminal dédié).

- [ ] **Step 3: Vérifier les 4 pages composant avec tokens panel**

Utiliser l'outillage Playwright déjà présent (`apps/docs/playwright.config.ts`,
`@playwright/test`) pour naviguer vers les pages `ar-dropdown`, `ar-breadcrumb`, `ar-stepper`,
`ar-datepicker`. Pour chacune, capturer la section « Tokens du panel partagé » et vérifier :

- Le bloc apparaît **avant** le tableau « CSS Custom Properties » habituel (ou le tableau habituel
  est absent si le composant n'a que des tokens panel — vérifier au cas par cas selon ce que
  chaque composant a réellement).
- Les deux exemples de code affichent le **bon nom de tag** (`ar-dropdown`, `ar-breadcrumb`,
  `ar-stepper`, `ar-datepicker` respectivement — pas de nom en dur copié-collé entre pages).
- Le tableau des 9 tokens panel s'affiche correctement (nom + description).
- Aucun débordement horizontal sur mobile (viewport réduit, cf. `overflow-x: auto` de la Task 6).

- [ ] **Step 4: Vérifier une page sans token panel (non-régression)**

Naviguer vers `ar-alert` (ou tout autre composant sans `panel.styles.ts`). Vérifier que la section
« CSS Custom Properties » s'affiche **exactement comme avant ce chantier** — un seul tableau,
aucun bloc « Tokens du panel partagé », aucun texte d'intro, aucun exemple de code.

- [ ] **Step 5: Consigner le résultat**

Si un écart est trouvé, corriger la Task concernée (2-6) et refaire les Steps concernés. Si rien
trouvé, continuer.

---

## Task 9: Revue finale de branche

**Files:** aucun — revue uniquement.

- [ ] **Step 1: Dispatcher une revue de branche complète sur un agent capable**

Comparer l'intégralité du diff `dev...docs/panel-tokens-public-doc` contre
`docs/superpowers/specs/2026-08-03-panel-tokens-public-doc-design.md`. Points d'attention
spécifiques :

- Les 9 lignes `@cssprop --ar-panel-*` sont **texte strictement identique** dans les 4 fichiers
  `.ts` (diff les 4 blocs entre eux pour confirmer — aucune coquille ni divergence de formulation
  introduite en copiant-collant).
- `ComponentApi.astro` : le `<tag-name>` des deux exemples de code est bien dynamique
  (`component.tagName`), aucune chaîne en dur du type `ar-dropdown` codée dans le template.
- Ordre du rendu : bloc panel avant le tableau des tokens propres, conforme à la spec (le
  brouillon initial avait l'ordre inverse — vérifier que la Task 6 a bien appliqué le changement
  demandé par l'utilisateur, pas l'ordre du premier brouillon de spec).
- Les deux techniques de personnalisation (token scopé vs `::part(panel)`) sont bien présentes et
  clairement distinguées dans le texte d'intro, pas juste un seul exemple.
- Composants sans token panel : `ownProps` couvre bien 100% de `component.cssProperties` dans ce
  cas (pas de token perdu silencieusement par la partition).
- Aucun changement dans `default.css`/`panel.styles.ts`/tests de composants (hors scope de ce
  chantier, JSDoc + rendu Astro uniquement).

- [ ] **Step 2: Corriger les findings en une vague unique**

Si des findings « Critical »/« Important » remontent, les corriger en un seul commit groupé, puis
relancer Task 7 et Task 8 Step 3-4 pour re-vérifier.

---

## Task 10: Créer la Pull Request

**Files:** aucun.

- [ ] **Step 1: Pousser la branche**

```bash
git push -u origin docs/panel-tokens-public-doc
```

- [ ] **Step 2: Créer la PR vers `dev`**

```bash
gh pr create --base dev --title "docs(panel): documente publiquement les tokens --ar-panel-* partagés" --body "$(cat <<'EOF'
## Summary
- Les 9 tokens `--ar-panel-*` (source `panel.styles.ts`) sont désormais documentés via `@cssprop` dans les 4 composants qui consomment le panel partagé (`ar-dropdown`, `ar-breadcrumb`, `ar-stepper`, `ar-datepicker`) — jusqu'ici invisibles sur la doc publique, seulement lisibles en fouillant les sources.
- `ComponentApi.astro` affiche désormais un bloc dédié « Tokens du panel partagé », affiché en premier (avant les tokens propres au composant), illustrant les deux techniques de personnalisation : token scopé au composant (`ar-<tag> { --ar-panel-bg: ...; }`) ou surcharge complète via `::part(panel)`.
- Aucun changement pour les composants qui ne consomment pas le panel partagé — rendu strictement inchangé.
- Confirme que la détection par préfixe de nom (`--ar-panel-`) est fiable pour les 4 composants, sans cas particulier à gérer (la nuance `ar-datepicker` avait été résolue en amont, PR #150).

Spec : `docs/superpowers/specs/2026-08-03-panel-tokens-public-doc-design.md`
Plan : `docs/superpowers/plans/2026-08-03-panel-tokens-public-doc.md`

## Test plan
- [x] `npm run build:manifest --workspace=packages/core` (garde-fous CI verts)
- [x] `npm run build --workspace=apps/docs` (build Astro complet)
- [x] `npm run test` (aucune régression)
- [x] Vérification visuelle Playwright sur les 4 pages concernées + 1 page non concernée (non-régression)
- [x] Revue finale de branche

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Confirmer avec l'utilisateur avant tout merge**

Ne pas merger sur `dev` sans confirmation explicite (feedback_merge_after_autonomous_fix).

---

## Self-Review (déjà appliqué en rédigeant ce plan)

1. **Couverture de la spec** : les 3 changements de la spec (JSDoc ×4, `ComponentApi.astro`,
   détection par préfixe) sont couverts par Tasks 2-6. Vérification et hors-scope couverts par
   Tasks 7-9. Branche + PR couvertes par Tasks 1 et 10.
2. **Retours de l'utilisateur intégrés** : ordre inversé (bloc panel en premier, Task 6) et deux
   techniques de personnalisation (Task 6, deux exemples de code distincts) — vérifiés
   explicitement en Task 9 Step 1 pour ne pas régresser vers le premier brouillon de spec.
3. **Scan placeholders** : aucun « TBD »/« à définir » — chaque step contient le texte exact à
   écrire, y compris les 9 lignes JSDoc répétées identiques dans Tasks 2-5.
4. **Cohérence des noms** : `--ar-panel-*` (9 tokens) identiques dans les Tasks 2-5 et dans le
   filtre de partition de la Task 6 (`p.name.startsWith('--ar-panel-')`) — même préfixe partout.
5. **Linter `.astro` confirmé** : `.astro` fait partie du glob `npm run format` racine — Prettier
   gère ce type de fichier dans ce projet, pas d'ambiguïté à lever pendant l'exécution.
