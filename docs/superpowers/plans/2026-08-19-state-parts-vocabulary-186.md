# Vocabulaire de parts d'état `::part()` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Documenter publiquement la convention de parts d'état (`<élément>--<état>`) déjà appliquée
en interne (ADR-005) sur `/getting-started/naming-conventions`, et détecter automatiquement leur
présence dans `ComponentApi.astro` pour y renvoyer un lien — sur le modèle exact du mécanisme déjà
en place pour les rôles transverses (#181, `transverse-roles.ts`).

**Architecture:** Documentation pure + un petit utilitaire de détection (`isStatePart`) réutilisé
par la page de doc générée par composant. Aucun code de `packages/core` ne change — tous les
composants existants suivent déjà la convention.

**Tech Stack:** Astro (apps/docs), Vitest.

## Global Constraints

- Spec source : `docs/superpowers/specs/2026-08-19-state-parts-vocabulary-186-design.md`.
- Aucun changement dans `packages/core` — issue #186 n'implique aucun retrofit de composant.
- Documentation publique strictement factuelle : pas de distinction état togglé vs sévérité, pas
  de référence à une issue GitHub ni à un détail d'implémentation interne.
- Prettier : 100 caractères, 4 espaces, quotes simples (cf. CLAUDE.md).
- Branche créée depuis `dev`, PR vers `dev` (jamais push direct sur `main`).

---

### Task 1: Créer la branche de travail

**Files:** aucun

- [ ] **Step 1: Créer et checkout la branche**

```bash
cd /Users/jon/Code/Active_projects/ariane
git checkout dev
git pull origin dev
git checkout -b feat/state-parts-vocabulary-186
```

- [ ] **Step 2: Vérifier l'état propre**

Run: `git status`
Expected: `On branch feat/state-parts-vocabulary-186`, working tree clean.

---

### Task 2: Utilitaire `isStatePart` + test unitaire

**Files:**

- Create: `apps/docs/src/utils/state-parts.ts`
- Test: `apps/docs/src/utils/state-parts.test.ts`

**Interfaces:**

- Produces: `isStatePart(partName: string): boolean` — détecte le motif `<élément>--<état>`
  (présence du séparateur `--` dans le nom du part). Consommé par Task 3 (`ComponentApi.astro`).

- [ ] **Step 1: Écrire le test qui échoue**

Créer `apps/docs/src/utils/state-parts.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { isStatePart } from './state-parts.js';

describe('isStatePart', () => {
    it("reconnaît un part d'état simple (élément)--(état)", () => {
        expect(isStatePart('bullet--current')).toBe(true);
        expect(isStatePart('count--warning')).toBe(true);
        expect(isStatePart('count--error')).toBe(true);
    });

    it("reconnaît un part d'état sur un élément dont le nom contient un tiret simple", () => {
        expect(isStatePart('step-link--current')).toBe(true);
        expect(isStatePart('nav-button--disabled')).toBe(true);
        expect(isStatePart('sort-button--pending')).toBe(true);
    });

    it('rejette un part sans séparateur --', () => {
        expect(isStatePart('bullet')).toBe(false);
        expect(isStatePart('action-button')).toBe(false);
        expect(isStatePart('step-link')).toBe(false);
    });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npm run test --workspace=apps/docs -- state-parts`
Expected: FAIL — `Cannot find module './state-parts.js'` (ou équivalent, le fichier n'existe pas
encore).

- [ ] **Step 3: Implémenter `isStatePart`**

Créer `apps/docs/src/utils/state-parts.ts` :

```ts
// utils/state-parts.ts

/**
 * Détecte si un nom de part est un part d'état (convention BEM double-tiret,
 * `<élément>--<état>`, ex. "bullet--current", "count--warning") — source de vérité
 * unique, à tenir synchronisée avec la table de /getting-started/naming-conventions.
 */
export function isStatePart(partName: string): boolean {
    return partName.includes('--');
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `npm run test --workspace=apps/docs -- state-parts`
Expected: PASS, 3 tests réussis.

- [ ] **Step 5: Commit**

```bash
git add apps/docs/src/utils/state-parts.ts apps/docs/src/utils/state-parts.test.ts
git commit -m "feat(docs): ajoute isStatePart pour détecter les parts d'état"
```

---

### Task 3: Hint « parts d'état » dans `ComponentApi.astro`

**Files:**

- Modify: `apps/docs/src/components/ComponentApi.astro`

**Interfaces:**

- Consumes: `isStatePart(partName: string): boolean` (Task 2).

- [ ] **Step 1: Importer `isStatePart` et calculer `hasStateParts`**

Dans `apps/docs/src/components/ComponentApi.astro`, à côté de l'import existant de
`isTransversePart` (ligne 12) :

```astro
import { isTransversePart } from '../utils/transverse-roles.ts';
import { isStatePart } from '../utils/state-parts.ts';
```

Juste après le calcul existant de `hasTransverseParts` (ligne ~32) :

```astro
const hasTransverseParts = (component.cssParts ?? []).some((p) =>
    isTransversePart(p.name, component.tagName ?? ''),
);
const hasStateParts = (component.cssParts ?? []).some((p) => isStatePart(p.name));
```

- [ ] **Step 2: Ajouter le hint dans le paragraphe d'aide de la section CSS Parts**

Repérer le bloc existant (section « CSS Parts », `<p class="hint">`) :

```astro
<p class="hint">
    Utilisez <code>::part(name)</code> pour styler ces éléments depuis l'extérieur.
    {hasTransverseParts && (
        <>
            <br>Certaines parts ci-dessous indiquent un rôle transverse, partagé avec
            d'autres composants — voir les <a href="/getting-started/naming-conventions">conventions de nommage</a>.
        </>
    )}
</p>
```

Ajouter un second bloc conditionnel juste après le premier, pointant vers l'ancre de la nouvelle
section (créée en Task 4) :

```astro
<p class="hint">
    Utilisez <code>::part(name)</code> pour styler ces éléments depuis l'extérieur.
    {hasTransverseParts && (
        <>
            <br>Certaines parts ci-dessous indiquent un rôle transverse, partagé avec
            d'autres composants — voir les <a href="/getting-started/naming-conventions">conventions de nommage</a>.
        </>
    )}
    {hasStateParts && (
        <>
            <br>Certaines parts ci-dessous portent un modificateur d'état (<code>--</code>) — voir
            les <a href="/getting-started/naming-conventions#state-parts">conventions de nommage</a>.
        </>
    )}
</p>
```

- [ ] **Step 3: Vérifier qu'aucun test existant ne casse**

Run: `npm run test --workspace=apps/docs`
Expected: PASS (aucun test n'exerçait ce hint auparavant — le fichier `.astro` n'est pas couvert
par un test unitaire direct, cf. constat de la spec).

- [ ] **Step 4: Commit**

```bash
git add apps/docs/src/components/ComponentApi.astro
git commit -m "feat(docs): affiche un renvoi vers les conventions de nommage pour les parts d'état"
```

---

### Task 4: Section « Parts d'état » sur `naming-conventions.astro`

**Files:**

- Modify: `apps/docs/src/pages/getting-started/naming-conventions.astro`

- [ ] **Step 1: Ajouter l'entrée de sommaire**

Dans `tocEntries` (ligne 5-8) :

```astro
const tocEntries = [
    { id: 'semantic-parts', label: 'CSS Part sémantiques', level: 1 as const },
    { id: 'state-parts', label: 'Parts d\'état', level: 1 as const },
    { id: 'slots', label: 'Conventions de slot', level: 1 as const },
];
```

- [ ] **Step 2: Insérer la nouvelle section entre `semantic-parts` et `slots`**

Juste après la fermeture de `</section>` de `id="semantic-parts"` (ligne 134) et avant
`<section id="slots" class="main-section">` (ligne 136) :

```astro
<section id="state-parts" class="main-section">
    <div>
        <h3 class="section-title">Parts d'état</h3>
        <p>
            Certains <code>::part()</code> portent en plus un <strong>modificateur d'état</strong>,
            selon la convention <code>&lt;élément&gt;--&lt;état&gt;</code> : l'élément de base
            reste présent, l'état s'ajoute en second part sur le même attribut (ex.
            <code>part="bullet bullet--current"</code>).
        </p>
        <p style="margin-top: 1rem">
            Une règle sur <code>::part(x--current)</code> écrite une seule fois s'applique à tout
            composant qui expose cet état, sans redécouvrir une convention différente à chaque
            composant.
        </p>
    </div>

    <section id="states-table" class="subsection">
        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th scope="col">État</th>
                        <th scope="col">Signification</th>
                        <th scope="col">Équivalent natif</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><code>--current</code></td>
                        <td>Position atteinte par navigation.</td>
                        <td><code>aria-current</code></td>
                    </tr>
                    <tr>
                        <td><code>--selected</code></td>
                        <td>Choix actif de l'utilisateur.</td>
                        <td><code>aria-selected</code></td>
                    </tr>
                    <tr>
                        <td><code>--disabled</code></td>
                        <td>Désactivé.</td>
                        <td><code>aria-disabled</code> / <code>:disabled</code></td>
                    </tr>
                    <tr>
                        <td><code>--pending</code></td>
                        <td>Traitement en cours.</td>
                        <td>—</td>
                    </tr>
                    <tr>
                        <td><code>--warning</code></td>
                        <td>État d'avertissement.</td>
                        <td>—</td>
                    </tr>
                    <tr>
                        <td><code>--error</code></td>
                        <td>État d'erreur.</td>
                        <td>—</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </section>
</section>
```

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/pages/getting-started/naming-conventions.astro
git commit -m "docs: ajoute la section Parts d'état aux conventions de nommage"
```

---

### Task 5: Vérification visuelle + build

**Files:** aucun

- [ ] **Step 1: Rebuild explicite de `packages/core`**

Run: `npm run build:dev --workspace=packages/core` (cf. `[[feedback_docs_dev_stale_dist]]` — le
dev server de `apps/docs` ne rebuild pas seul le JS de `packages/core/dist`).

- [ ] **Step 2: Lancer le dev server**

Run: `npm run dev --workspace=apps/docs`

- [ ] **Step 3: Vérifier la nouvelle section**

Ouvrir `http://localhost:4321/getting-started/naming-conventions` — la section « Parts d'état »
apparaît entre « CSS Part sémantiques » et « Conventions de slot », l'entrée de sommaire est
cliquable et scrolle correctement, la table affiche les 6 lignes.

- [ ] **Step 4: Vérifier le hint sur un composant avec part d'état**

Ouvrir la page composant `ar-pagination` — dans la section CSS Parts, le hint mentionne
« Certaines parts ci-dessous portent un modificateur d'état » avec un lien fonctionnel vers
`/getting-started/naming-conventions#state-parts`.

- [ ] **Step 5: Vérifier l'absence du hint sur un composant sans part d'état**

Ouvrir la page composant `ar-tooltip` — le hint « modificateur d'état » n'apparaît pas (le hint
« rôle transverse » peut apparaître ou non selon les parts de `ar-tooltip`, sans rapport avec ce
chantier).

- [ ] **Step 6: Build complet de la doc**

Run: `npm run build --workspace=apps/docs`
Expected: build réussi, sans erreur.

---

### Task 6: Ouvrir la Pull Request

**Files:** aucun

- [ ] **Step 1: Vérifier que tous les tests passent**

Run: `npm run test --workspace=apps/docs`
Expected: PASS, y compris les 3 nouveaux tests `isStatePart`.

- [ ] **Step 2: Push la branche**

```bash
git push -u origin feat/state-parts-vocabulary-186
```

- [ ] **Step 3: Créer la PR vers `dev`**

```bash
gh pr create --base dev --title "docs(core): vocabulaire de parts d'état ::part() (#186)" --body "$(cat <<'EOF'
## Summary
- Documente la convention de parts d'état (`<élément>--<état>`) déjà appliquée en interne (ADR-005) sur `/getting-started/naming-conventions`
- Détecte automatiquement leur présence dans `ComponentApi.astro` (même mécanisme que les rôles transverses, #181) et renvoie vers la nouvelle section
- Aucun changement dans `packages/core` — tous les composants existants suivent déjà la convention

Closes #186

## Test plan
- [x] `isStatePart` couvert par 3 tests unitaires
- [x] Vérification visuelle : section « Parts d'état » sur la page conventions de nommage
- [x] Vérification visuelle : hint présent sur `ar-pagination`, absent sur `ar-tooltip`
- [x] Build `apps/docs` réussi

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: URL de la PR retournée.
