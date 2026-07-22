# Personnalisation de thème allégée (#120) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supprimer `/foundations/tokens` et sa section de nav, et remplacer le lien mort de la page "Utilisation" par un bouton de téléchargement de `default.css` (déjà servi par un mécanisme existant), avec un texte qui rappelle que `default.css` est un thème de démo remplaçable.

**Architecture:** Aucune nouvelle page, aucun nouveau mécanisme technique. Modification de trois fichiers Astro statiques existants. Le téléchargement réutilise `/themes/default.css`, déjà servi par `apps/docs/astro.config.mjs` (middleware Vite en dev, hook `generateBundle` au build) — vérifié présent dans `apps/docs/dist/themes/default.css` après un build.

**Tech Stack:** Astro 6 (fichiers `.astro` statiques, pas de script client).

## Global Constraints

- Prettier : 100 caractères, 4 espaces, guillemets simples (non appliqué automatiquement aux `.astro`, `.prettierignore` les exclut — vérifier la cohérence visuelle avec le reste du fichier à la place).
- Conventional Commits pour les messages de commit.
- Branches `feat/<desc>`/`fix/<desc>` créées depuis `dev` ; PR vers `dev`.
- Ne pas committer de fichiers dans `/dist`.
- Ne toucher que les fichiers explicitement listés dans chaque tâche.

---

### Task 1: Créer la branche et supprimer `/foundations/tokens`

**Files:**

- Create branch: `docs/theme-personalization-lite` (depuis `dev`)
- Delete: `apps/docs/src/pages/foundations/tokens.astro`
- Modify: `apps/docs/src/components/SiteNav.astro:38-43` (retrait de `foundationsLinks`), `apps/docs/src/components/SiteNav.astro:109-119` (retrait de la section nav "Fondations")

**Interfaces:** Aucune — modification de données statiques et de template, pas de nouvelle fonction/type.

- [ ] **Step 1: Créer la branche depuis `dev`**

```bash
cd /Users/jon/Code/Active_projects/ariane
git checkout dev
git pull
git checkout -b docs/theme-personalization-lite dev
```

- [ ] **Step 2: Supprimer l'ancienne page**

```bash
git rm apps/docs/src/pages/foundations/tokens.astro
```

- [ ] **Step 3: Retirer `foundationsLinks` de `SiteNav.astro`**

Dans `apps/docs/src/components/SiteNav.astro`, supprimer entièrement ce bloc (actuellement lignes 38-43) :

```ts
const foundationsLinks: NavLink[] = [
    { href: '/foundations/tokens', label: 'Design Tokens', ariaCurrent: undefined },
].map((link) => ({
    ...link,
    ariaCurrent: currentPath === link.href ? ('page' as const) : undefined,
}));
```

Le bloc `gettingStartedLinks` juste au-dessus reste inchangé (pas de nouveau lien à ajouter — pas de nouvelle page cette fois).

- [ ] **Step 4: Retirer la section nav "Fondations" du template**

Dans le même fichier, supprimer ce bloc (actuellement lignes 109-119, entre la section "Bien démarrer" et la section "Composants") :

```astro
        <div class="nav-section">
            <h2>Fondations</h2>
            <ul class="nav-list">
                {foundationsLinks.map((link) => (
                    <li>
                        <a href={link.href} aria-current={link.ariaCurrent}>{link.label}</a>
                    </li>
                ))}
            </ul>
        </div>

```

(le bloc entier, y compris la ligne vide qui suit — la section "Composants" qui suit reste inchangée, avec une seule ligne vide entre "Bien démarrer" et "Composants").

- [ ] **Step 5: Vérifier qu'aucune référence à `/foundations/tokens` ou `foundationsLinks` ne subsiste**

Run: `cd /Users/jon/Code/Active_projects/ariane && grep -rn "foundations/tokens\|foundationsLinks" apps/docs/src`
Expected: aucun résultat (la mise à jour du lien dans `utilisation.astro` se fait en Task 2).

- [ ] **Step 6: Build**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run build --workspace=@ariane-ui/docs`
Expected: échec attendu à ce stade si `utilisation.astro` référence encore `/foundations/tokens` en dur dans un lien `<a>` (Astro ne valide pas les liens morts au build, donc le build devrait en réalité réussir même avec un lien mort résiduel — pas d'erreur de compilation attendue). Confirmer simplement que le build passe et que la page `/foundations/tokens` n'est plus générée :

Run: `ls apps/docs/dist/foundations 2>&1`
Expected: `No such file or directory`

- [ ] **Step 7: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add apps/docs/src/components/SiteNav.astro
git commit -m "feat(docs): supprime la page foundations/tokens et sa section de nav (#120)"
```

---

### Task 2: Enrichir la section "Design Tokens" de la page Utilisation

**Files:**

- Modify: `apps/docs/src/pages/getting-started/utilisation.astro:133-147`

**Interfaces:** Aucune — contenu statique.

- [ ] **Step 1: Remplacer la section "Design Tokens"**

Dans `apps/docs/src/pages/getting-started/utilisation.astro`, remplacer (lignes 133-147) :

```astro
        <section id="tokens" class="main-section">
            <div>
                <h3 class="section-title">Design Tokens</h3>
                <p>
                    Les valeurs globales (couleurs, espacements, typographie) viennent du fichier
                    de thème <code>themes/default.css</code>. Surchargez-les via <code>:root</code>
                    pour modifier l'ensemble de la librairie :
                </p>
            </div>
            <pre><code class="language-css" set:text={codeTokens} /></pre>
            <p>
                Consultez la page <a href="/getting-started/personnalisation">Personnalisation</a> pour la liste
                complète des variables disponibles.
            </p>
        </section>
```

par :

```astro
        <section id="tokens" class="main-section">
            <div>
                <h3 class="section-title">Design Tokens</h3>
                <p>
                    Les valeurs globales (couleurs, espacements, typographie) viennent du fichier
                    de thème <code>themes/default.css</code>. Surchargez-les via <code>:root</code>
                    pour modifier l'ensemble de la librairie :
                </p>
            </div>
            <pre><code class="language-css" set:text={codeTokens} /></pre>
            <p>
                <code>themes/default.css</code> est un thème de démo fourni avec Ariane — pas les
                valeurs par défaut intrinsèques des composants (Ariane est headless, cf.
                <a href="#headless">Modèle headless</a> ci-dessus). Utilisez-le comme point de
                départ pour construire votre propre thème :
            </p>
            <p>
                <a class="download-theme" href="/themes/default.css" download>
                    Télécharger default.css
                </a>
            </p>
            <p>
                Les propriétés disponibles par composant sont listées dans la section
                <strong>Référence API</strong> de chaque page de composant.
            </p>
        </section>
```

- [ ] **Step 2: Ajouter le style du bouton de téléchargement**

Dans le même fichier, dans le bloc `<style>` en fin de fichier (après `.hint { ... }`), ajouter :

```css
.download-theme {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 1rem;
    border: 1px solid var(--doc-border);
    border-radius: 0.375rem;
    background: var(--doc-nav-bg);
    color: var(--doc-text);
    font-size: 0.85rem;
    font-weight: 600;
    text-decoration: none;
}

.download-theme:hover {
    background: var(--doc-accent-bg);
    color: var(--doc-accent);
}
```

- [ ] **Step 3: Build**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run build --workspace=@ariane-ui/docs`
Expected: build réussi, `apps/docs/dist/getting-started/utilisation/index.html` généré.

- [ ] **Step 4: Vérifier que le lien de téléchargement pointe vers un fichier réellement servi**

Run: `cd /Users/jon/Code/Active_projects/ariane && grep -o 'href="/themes/default.css"' apps/docs/dist/getting-started/utilisation/index.html && ls apps/docs/dist/themes/default.css`
Expected: les deux commandes réussissent (le lien est présent dans le HTML généré, et le fichier existe bien à l'emplacement pointé).

- [ ] **Step 5: Vérification manuelle en dev**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run dev --workspace=@ariane-ui/docs`

Ouvrir `http://localhost:<port>/getting-started/utilisation`, aller à la section "Design Tokens", cliquer sur "Télécharger default.css" et confirmer que le fichier téléchargé correspond à `packages/core/src/styles/themes/default.css` (ou sa version `dist/` si le build core a été lancé).

- [ ] **Step 6: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add apps/docs/src/pages/getting-started/utilisation.astro
git commit -m "feat(docs): remplace le lien vers l'ancienne page tokens par un telechargement de default.css (#120)"
```

---

### Task 3: Vérification finale et PR

**Files:** aucun nouveau — vérification transverse.

- [ ] **Step 1: Suite de tests complète**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run test`
Expected: tous les tests passent (aucun test ne couvre ces fichiers `.astro`, donc aucun changement de compte de tests attendu par rapport à l'état actuel de `dev`).

- [ ] **Step 2: Build complet**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run build --workspace=@ariane-ui/docs`
Expected: build réussi.

- [ ] **Step 3: Recherche de références résiduelles**

Run: `cd /Users/jon/Code/Active_projects/ariane && grep -rn "foundations/tokens\|getting-started/personnalisation" apps/docs/src`
Expected: aucun résultat.

- [ ] **Step 4: Push et création de la PR**

```bash
cd /Users/jon/Code/Active_projects/ariane
git push -u origin docs/theme-personalization-lite
gh pr create --base dev --title "docs: remplace la page tokens par un lien de téléchargement de default.css (#120)" --body "$(cat <<'EOF'
## Résumé

- Supprime \`/foundations/tokens\` (présentait \`default.css\` comme LE thème du composant, contraire au headless) et sa section de nav.
- La section "Design Tokens" de la page Utilisation est enrichie et propose désormais un bouton de téléchargement de \`default.css\` (réutilise \`/themes/default.css\`, déjà servi par le mécanisme existant d'\`astro.config.mjs\`).

Remplace l'éditeur interactif précédemment implémenté puis abandonné après usage réel (cf. \`docs/superpowers/specs/2026-07-21-theme-personalization-lite-design.md\`).

## Test plan

- [x] \`npm run test\` : aucune régression
- [x] \`npm run build --workspace=@ariane-ui/docs\` : build vert
- [x] Vérification manuelle : le bouton télécharge bien \`default.css\`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

**Couverture de la spec :** Suppression `/foundations/tokens` + nav (Task 1) ; enrichissement du texte + lien de téléchargement dans la section existante (Task 2) ; réutilisation du mécanisme `/themes/` déjà existant, aucun nouveau mécanisme construit (confirmé par la Task 2 Step 4, qui vérifie que le fichier pointé existe réellement après build) ; suppression de la branche `feat/theme-configurator-120` déjà faite hors plan (action destructive, confirmée séparément par l'utilisateur) ; audit des tokens et bug CI déjà tracés/corrigés séparément (issues #125, PR #124), non repris ici.

**Placeholders :** aucun.

**Cohérence :** le nom de branche (`docs/theme-personalization-lite`) suit la convention `<type>/<desc>` du projet (préfixe `docs` plutôt que `feat`, car il s'agit uniquement de contenu de documentation, pas d'une fonctionnalité du package `core`).
