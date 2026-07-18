# Fusion du tableau Événements (doc) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Éliminer le doublon entre le tableau "Cycle d'événements" écrit à la main dans
`ar-dialog.mdx` et le tableau "Événements" auto-généré par `ComponentApi.astro`, en enrichissant
ce dernier d'une colonne "Annulable" dérivée du JSDoc `@event`, et en supprimant le tableau manuel.

**Architecture:** Le JSDoc `@event {CustomEvent} nom - description` est la seule source de
vérité. Un marqueur `@cancelable` ajouté en fin de description (sur la même ligne `@event`, pas un
tag séparé) signale qu'un événement est annulable — vérifié empiriquement (2026-07-17) : un `@mot`
au milieu d'un commentaire JSDoc n'est jamais interprété comme un nouveau tag par le compilateur
TypeScript ni par l'analyseur CEM, le marqueur survit intact dans `custom-elements.json`. Ce choix
(plutôt qu'un tag `@cancelable <event>` séparé) évite d'avoir deux sources à maintenir en
synchronisation par événement. Trois composants utilisent déjà une convention textuelle
("Annulable.") qui sera remplacée par ce marqueur ; deux autres (`ar-dropdown`, `ar-datepicker`)
ne l'ont pas du tout ou l'expriment différemment — les cinq sont alignés dans ce plan.
`ComponentApi.astro` dérive une colonne booléenne "Annulable" via deux fonctions pures testées
(`isCancelableEvent`, `stripCancelableMarker`), et perd la colonne "Type" (toujours `CustomEvent`,
non informative). Le tableau manuel de `ar-dialog.mdx` est ensuite retiré ; la prose explicative
(structure `detail`, distinction `data-ar-dismiss`/`data-ar-accept`, exemple de code) est
conservée avec un renvoi vers la Référence API.

**Tech Stack:** TypeScript, Lit 3 (JSDoc `@event`), Astro 6 + MDX, Vitest.

## Global Constraints

- Prettier : 100 caractères, 4 espaces, guillemets simples (CLAUDE.md).
- `import type` pour tous les imports de types.
- Conventional Commits (commitlint + Husky) — scope `(core)` pour les fichiers `packages/core`,
  scope `(docs)` pour les fichiers `apps/docs`.
- `npm run build:manifest` (racine `packages/core`) doit régénérer `custom-elements.json` sans
  erreur après tout changement de JSDoc `@event`.
- `npm run build:manifest` (racine `packages/core`) doit être relancé après le Task 1 avant de
  travailler sur `apps/docs`, sinon `apps/docs` verrait l'ancien manifest.
- Le marqueur `@cancelable` s'ajoute **en fin de la phrase de description**, séparé par un espace,
  jamais sur sa propre ligne JSDoc (ce serait alors interprété comme un tag séparé par TypeScript).

---

### Task 1: Introduire le marqueur `@cancelable` dans le JSDoc `@event`

**Files:**

- Modify: `packages/core/src/components/dialog/dialog.ts:82,85,88,90`
- Modify: `packages/core/src/components/collapse/collapse.ts:24,27`
- Modify: `packages/core/src/components/breadcrumb/breadcrumb.ts:51,54`
- Modify: `packages/core/src/components/dropdown/dropdown.ts:45,48`
- Modify: `packages/core/src/components/datepicker/datepicker.ts:96,98`

**Interfaces:**

- Produces: descriptions JSDoc `@event` se terminant par le marqueur exact `@cancelable` (précédé
  d'un espace) pour tout événement réellement annulable
  (`dispatchEvent(new CustomEvent(..., { cancelable: true }))` dans le composant). Les tasks 2/3
  dépendent de cette exactitude textuelle.

**Contexte** : trois composants utilisent déjà la convention textuelle `"... Annulable."` (à
remplacer par `"... @cancelable"`) : `dialog.ts`, `collapse.ts`, `breadcrumb.ts`. `dropdown.ts`
l'exprime différemment (`"(annulable)"` entre parenthèses, au milieu de la phrase). `datepicker.ts`
a des événements `ar-datepicker-show`/`ar-datepicker-hide` réellement `cancelable: true` dans le
code (vérifié aux lignes 556-563 et 601-608) mais ne le mentionne pas du tout dans le JSDoc.

- [ ] **Step 0: Créer la branche**

```bash
git checkout dev
git pull
git checkout -b docs/event-table-merge
```

- [ ] **Step 1: Corriger `dialog.ts`**

Dans `packages/core/src/components/dialog/dialog.ts`, remplacer :

```ts
 * @event {CustomEvent} ar-dialog-show - Émis avant l'ouverture. Annulable.
 * @event {CustomEvent} ar-dialog-show-prevented - Émis si ar-dialog-show est annulé.
 * @event {CustomEvent} ar-dialog-shown - Émis après l'ouverture (après updateComplete).
 * @event {CustomEvent} ar-dialog-hide - Émis avant la fermeture. Annulable.
 * @event {CustomEvent} ar-dialog-hide-prevented - Émis si ar-dialog-hide est annulé. Le composant secoue le dialog et annonce `prevented-message` aux lecteurs d'écran.
 * @event {CustomEvent} ar-dialog-hidden - Émis après la fermeture (après animation).
 * @event {CustomEvent} ar-dialog-dismissed - Émis lors d'un clic sur data-ar-dismiss. Annulable.
 * @event {CustomEvent} ar-dialog-dismissed-prevented - Émis si ar-dialog-dismissed est annulé.
 * @event {CustomEvent} ar-dialog-accepted - Émis lors d'un clic sur data-ar-accept. Annulable.
 * @event {CustomEvent} ar-dialog-accepted-prevented - Émis si ar-dialog-accepted est annulé.
```

par :

```ts
 * @event {CustomEvent} ar-dialog-show - Émis avant l'ouverture. @cancelable
 * @event {CustomEvent} ar-dialog-show-prevented - Émis si ar-dialog-show est annulé.
 * @event {CustomEvent} ar-dialog-shown - Émis après l'ouverture (après updateComplete).
 * @event {CustomEvent} ar-dialog-hide - Émis avant la fermeture. @cancelable
 * @event {CustomEvent} ar-dialog-hide-prevented - Émis si ar-dialog-hide est annulé. Le composant secoue le dialog et annonce `prevented-message` aux lecteurs d'écran.
 * @event {CustomEvent} ar-dialog-hidden - Émis après la fermeture (après animation).
 * @event {CustomEvent} ar-dialog-dismissed - Émis lors d'un clic sur data-ar-dismiss. @cancelable
 * @event {CustomEvent} ar-dialog-dismissed-prevented - Émis si ar-dialog-dismissed est annulé.
 * @event {CustomEvent} ar-dialog-accepted - Émis lors d'un clic sur data-ar-accept. @cancelable
 * @event {CustomEvent} ar-dialog-accepted-prevented - Émis si ar-dialog-accepted est annulé.
```

- [ ] **Step 2: Corriger `collapse.ts`**

Dans `packages/core/src/components/collapse/collapse.ts`, remplacer :

```ts
 * @event {CustomEvent} ar-collapse-show           - Avant l'ouverture. Annulable.
 * @event {CustomEvent} ar-collapse-show-prevented - Émis si ar-collapse-show est annulé.
 * @event {CustomEvent} ar-collapse-shown          - Après la fin de l'animation d'ouverture.
 * @event {CustomEvent} ar-collapse-hide           - Avant la fermeture. Annulable.
```

par :

```ts
 * @event {CustomEvent} ar-collapse-show           - Avant l'ouverture. @cancelable
 * @event {CustomEvent} ar-collapse-show-prevented - Émis si ar-collapse-show est annulé.
 * @event {CustomEvent} ar-collapse-shown          - Après la fin de l'animation d'ouverture.
 * @event {CustomEvent} ar-collapse-hide           - Avant la fermeture. @cancelable
```

(`ar-collapse-hide-prevented` et `ar-collapse-hidden` ne changent pas.)

- [ ] **Step 3: Corriger `breadcrumb.ts`**

Dans `packages/core/src/components/breadcrumb/breadcrumb.ts`, remplacer :

```ts
 * @event {CustomEvent} ar-breadcrumb-show           - Émis avant l'ouverture du dropdown mobile. Annulable.
 * @event {CustomEvent} ar-breadcrumb-show-prevented - Émis si ar-breadcrumb-show est annulé.
 * @event {CustomEvent} ar-breadcrumb-shown          - Émis après l'ouverture du dropdown mobile.
 * @event {CustomEvent} ar-breadcrumb-hide           - Émis avant la fermeture du dropdown mobile. Annulable.
```

par :

```ts
 * @event {CustomEvent} ar-breadcrumb-show           - Émis avant l'ouverture du dropdown mobile. @cancelable
 * @event {CustomEvent} ar-breadcrumb-show-prevented - Émis si ar-breadcrumb-show est annulé.
 * @event {CustomEvent} ar-breadcrumb-shown          - Émis après l'ouverture du dropdown mobile.
 * @event {CustomEvent} ar-breadcrumb-hide           - Émis avant la fermeture du dropdown mobile. @cancelable
```

(`ar-breadcrumb-hide-prevented` et `ar-breadcrumb-hidden` ne changent pas.)

- [ ] **Step 4: Corriger `dropdown.ts`**

Dans `packages/core/src/components/dropdown/dropdown.ts`, remplacer :

```ts
 * @event {CustomEvent} ar-dropdown-show           - Émis avant l'ouverture (annulable).
 * @event {CustomEvent} ar-dropdown-show-prevented - Émis si ar-dropdown-show est annulé.
 * @event {CustomEvent} ar-dropdown-shown          - Émis après l'ouverture.
 * @event {CustomEvent} ar-dropdown-hide           - Émis avant la fermeture (annulable).
```

par :

```ts
 * @event {CustomEvent} ar-dropdown-show           - Émis avant l'ouverture. @cancelable
 * @event {CustomEvent} ar-dropdown-show-prevented - Émis si ar-dropdown-show est annulé.
 * @event {CustomEvent} ar-dropdown-shown          - Émis après l'ouverture.
 * @event {CustomEvent} ar-dropdown-hide           - Émis avant la fermeture. @cancelable
```

(`ar-dropdown-hide-prevented` et `ar-dropdown-hidden` ne changent pas.)

- [ ] **Step 5: Compléter `datepicker.ts`**

Dans `packages/core/src/components/datepicker/datepicker.ts`, remplacer :

```ts
 * @event {CustomEvent} ar-datepicker-show           - Avant ouverture du popover.
 * @event {CustomEvent} ar-datepicker-shown          - Après ouverture.
 * @event {CustomEvent} ar-datepicker-hide           - Avant fermeture.
```

par :

```ts
 * @event {CustomEvent} ar-datepicker-show           - Avant ouverture du popover. @cancelable
 * @event {CustomEvent} ar-datepicker-shown          - Après ouverture.
 * @event {CustomEvent} ar-datepicker-hide           - Avant fermeture. @cancelable
```

(`ar-datepicker-hidden`, `ar-datepicker-input-change`, `ar-datepicker-input-complete` ne changent
pas — aucun n'est `cancelable: true` dans le code.)

- [ ] **Step 6: Régénérer le manifest et vérifier**

Run: `cd packages/core && npm run build:manifest`
Expected: pas d'erreur.

Run:

```bash
python3 -c "
import json
m = json.load(open('packages/core/dist/custom-elements.json'))
names = {'ar-dialog-show','ar-dialog-hide','ar-dialog-dismissed','ar-dialog-accepted',
         'ar-collapse-show','ar-collapse-hide','ar-breadcrumb-show','ar-breadcrumb-hide',
         'ar-dropdown-show','ar-dropdown-hide','ar-datepicker-show','ar-datepicker-hide'}
found = set()
for mod in m['modules']:
    for decl in mod.get('declarations', []):
        for e in decl.get('events', []):
            if e['name'] in names:
                found.add(e['name'])
                assert e['description'].rstrip().endswith('@cancelable'), e
print('OK', len(found), '/', len(names))
"
```

Expected: `OK 12 / 12` (aucune `AssertionError`).

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/components/dialog/dialog.ts \
        packages/core/src/components/collapse/collapse.ts \
        packages/core/src/components/breadcrumb/breadcrumb.ts \
        packages/core/src/components/dropdown/dropdown.ts \
        packages/core/src/components/datepicker/datepicker.ts
git commit -m "docs(core): introduit le marqueur @cancelable dans le JSDoc @event"
```

---

### Task 2: Fonctions pures de détection de l'annulabilité (`apps/docs`)

**Files:**

- Create: `apps/docs/src/utils/events.ts`
- Test: `apps/docs/src/utils/events.test.ts`

**Interfaces:**

- Produces:
    - `isCancelableEvent(description: string | undefined): boolean`
    - `stripCancelableMarker(description: string | undefined): string`
- Consumed par Task 3 (`ComponentApi.astro`).

- [ ] **Step 1: Écrire le test qui échoue**

Créer `apps/docs/src/utils/events.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { isCancelableEvent, stripCancelableMarker } from './events.js';

describe('isCancelableEvent', () => {
    it('détecte le marqueur "@cancelable" en fin de description', () => {
        expect(isCancelableEvent("Émis avant l'ouverture. @cancelable")).toBe(true);
    });

    it('détecte le marqueur même sur une description sans point avant', () => {
        expect(isCancelableEvent('Avant fermeture. @cancelable')).toBe(true);
    });

    it('retourne false sans le marqueur', () => {
        expect(isCancelableEvent('Émis si ar-dialog-show est annulé.')).toBe(false);
    });

    it('retourne false si "cancelable" apparaît sans le marqueur exact', () => {
        expect(isCancelableEvent("Ceci n'est pas cancelable.")).toBe(false);
    });

    it('retourne false pour une description undefined', () => {
        expect(isCancelableEvent(undefined)).toBe(false);
    });

    it('retourne false pour une chaîne vide', () => {
        expect(isCancelableEvent('')).toBe(false);
    });
});

describe('stripCancelableMarker', () => {
    it('retire le marqueur "@cancelable" et l\'espace précédent', () => {
        expect(stripCancelableMarker("Émis avant l'ouverture. @cancelable")).toBe(
            "Émis avant l'ouverture.",
        );
    });

    it('laisse la description inchangée sans marqueur', () => {
        expect(stripCancelableMarker('Émis si ar-dialog-show est annulé.')).toBe(
            'Émis si ar-dialog-show est annulé.',
        );
    });

    it('retourne une chaîne vide pour une description undefined', () => {
        expect(stripCancelableMarker(undefined)).toBe('');
    });
});
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

Run: `cd apps/docs && npx vitest run src/utils/events.test.ts`
Expected: FAIL — `Cannot find module './events.js'`

- [ ] **Step 3: Implémenter**

Créer `apps/docs/src/utils/events.ts` :

```ts
/**
 * events.ts
 *
 * Dérive l'annulabilité d'un événement CEM depuis la convention JSDoc `@event` : toute
 * description qui se termine par le marqueur "@cancelable" (précédé d'un espace, en fin de
 * ligne — jamais un tag JSDoc séparé) décrit un événement
 * `dispatchEvent(..., { cancelable: true })`.
 *
 * Convention appliquée dans tous les composants Lit concernés — cf.
 * packages/core/src/components/dialog/dialog.ts, collapse.ts, breadcrumb.ts, dropdown.ts,
 * datepicker.ts.
 */

const CANCELABLE_MARKER_RE = /\s*@cancelable\s*$/;

/** Retourne true si la description JSDoc d'un event se termine par le marqueur "@cancelable". */
export function isCancelableEvent(description: string | undefined): boolean {
    if (description === undefined) return false;
    return CANCELABLE_MARKER_RE.test(description);
}

/** Retire le marqueur "@cancelable" (et l'espace précédent) d'une description, si présent. */
export function stripCancelableMarker(description: string | undefined): string {
    if (description === undefined) return '';
    return description.replace(CANCELABLE_MARKER_RE, '');
}
```

- [ ] **Step 4: Lancer le test pour vérifier le succès**

Run: `cd apps/docs && npx vitest run src/utils/events.test.ts`
Expected: PASS — 9 tests verts.

- [ ] **Step 5: Commit**

```bash
git add apps/docs/src/utils/events.ts apps/docs/src/utils/events.test.ts
git commit -m "feat(docs): ajoute isCancelableEvent/stripCancelableMarker"
```

---

### Task 3: Enrichir le tableau Événements généré (`ComponentApi.astro`)

**Files:**

- Modify: `apps/docs/src/components/ComponentApi.astro:64-89`

**Interfaces:**

- Consumes: `isCancelableEvent`, `stripCancelableMarker` de `../utils/events.ts` (Task 2).

**Contexte** : le bloc actuel (lignes 64-89) affiche `Nom | Type | Description`, `Type` valant
toujours `CustomEvent` (aucune valeur informative). On le remplace par `Nom | Description |
Annulable`, où `Description` a le marqueur `@cancelable` retiré (porté par la nouvelle colonne) et
`Annulable` affiche `Oui`/`Non`.

- [ ] **Step 1: Ajouter l'import**

Dans `apps/docs/src/components/ComponentApi.astro`, en haut du frontmatter, à la suite des imports
existants :

```astro
import { isCancelableEvent, stripCancelableMarker } from '../utils/events.ts';
```

- [ ] **Step 2: Remplacer le bloc Événements**

Remplacer :

```astro
    {/* ── Événements ── */}
    {component.events && component.events.length > 0 && (
        <section>
            <h4 id="api-evenements" class="subsection-title">Événements</h4>
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Nom</th>
                            <th>Type</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        {component.events.map((event) => (
                            <tr>
                                <td><code>{event.name}</code></td>
                                <td><code>{event.type?.text ?? 'CustomEvent'}</code></td>
                                <td>{event.description ?? ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    )}
```

par :

```astro
    {/* ── Événements ── */}
    {component.events && component.events.length > 0 && (
        <section>
            <h4 id="api-evenements" class="subsection-title">Événements</h4>
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Nom</th>
                            <th>Description</th>
                            <th>Annulable</th>
                        </tr>
                    </thead>
                    <tbody>
                        {component.events.map((event) => (
                            <tr>
                                <td><code>{event.name}</code></td>
                                <td>{stripCancelableMarker(event.description)}</td>
                                <td>{isCancelableEvent(event.description) ? 'Oui' : 'Non'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    )}
```

- [ ] **Step 3: Régénérer le manifest si besoin et builder la doc**

Run: `cd packages/core && npm run build:manifest && cd ../../apps/docs && npm run build`
Expected: build complet sans erreur.

- [ ] **Step 4: Vérifier le rendu généré**

Run: `grep -A3 'ar-dialog-show<' dist/components/dialog/index.html | head -10`
Expected: la ligne `ar-dialog-show` a une cellule `Oui` (annulable) juste après sa description,
sans le texte `@cancelable` visible.

Run: `grep -A3 'ar-dialog-shown<' dist/components/dialog/index.html | head -10`
Expected: la ligne `ar-dialog-shown` a une cellule `Non`.

- [ ] **Step 5: Lancer la suite de tests docs**

Run: `cd apps/docs && npm run test`
Expected: tous les tests passent (le nombre total inclut désormais les 9 nouveaux tests de Task 2).

- [ ] **Step 6: Commit**

```bash
git add apps/docs/src/components/ComponentApi.astro
git commit -m "feat(docs): ajoute la colonne Annulable au tableau Événements généré"
```

---

### Task 4: Retirer le tableau manuel "Cycle d'événements" de `ar-dialog.mdx`

**Files:**

- Modify: `apps/docs/src/content/components/ar-dialog.mdx:138-160`

**Interfaces:**

- Consumes : rien de code — dépend seulement que Task 3 soit fusionnée en premier (le tableau
  généré doit déjà porter l'information "Annulable" avant de retirer le tableau manuel, sinon la
  page perd temporairement cette info).

**Contexte** : la section actuelle (lignes 138-160) contient un tableau
`Événement | Moment | Annulable` redondant avec le tableau généré (maintenant enrichi par Task 3),
suivi d'un paragraphe explicatif sur `detail: { id }` et la distinction `data-ar-dismiss`/
`data-ar-accept`, puis un exemple de code. On garde le paragraphe et l'exemple, on retire le
tableau, et on ajoute un renvoi explicite vers la Référence API.

- [ ] **Step 1: Remplacer la section**

Dans `apps/docs/src/content/components/ar-dialog.mdx`, remplacer :

````mdx
### Cycle d'événements

| Événement                       | Moment                                                | Annulable |
| ------------------------------- | ----------------------------------------------------- | --------- |
| `ar-dialog-show`                | Avant l'ouverture                                     | Oui       |
| `ar-dialog-show-prevented`      | Si `ar-dialog-show` est annulé                        | Non       |
| `ar-dialog-shown`               | Après l'ouverture (post-render)                       | Non       |
| `ar-dialog-hide`                | Avant la fermeture (Escape, backdrop, `open = false`) | Oui       |
| `ar-dialog-hide-prevented`      | Si `ar-dialog-hide` est annulé                        | Non       |
| `ar-dialog-hidden`              | Après la fermeture (post-animation)                   | Non       |
| `ar-dialog-dismissed`           | Clic sur un élément `data-ar-dismiss`                 | Oui       |
| `ar-dialog-dismissed-prevented` | Si `ar-dialog-dismissed` est annulé                   | Non       |
| `ar-dialog-accepted`            | Clic sur un élément `data-ar-accept`                  | Oui       |
| `ar-dialog-accepted-prevented`  | Si `ar-dialog-accepted` est annulé                    | Non       |

Tous portent `detail: { id }` (l'id du dialog). `data-ar-dismiss` et `data-ar-accept` sont deux conventions distinctes de `ar-dialog-hide` : elles permettent de distinguer une annulation ("Annuler") d'une confirmation ("Confirmer") sur le même geste de fermeture.

```js
document.getElementById('confirm-dialog').addEventListener('ar-dialog-accepted', (e) => {
    if (e.defaultPrevented) return;
    console.log('Confirmé, dialog :', e.detail.id);
});
```
````

````

par :

```mdx
### Cycle d'événements

Tous les événements portent `detail: { id }` (l'id du dialog). `data-ar-dismiss` et `data-ar-accept` sont deux conventions distinctes de `ar-dialog-hide` : elles permettent de distinguer une annulation ("Annuler") d'une confirmation ("Confirmer") sur le même geste de fermeture. La liste complète des événements, avec leur annulabilité, est dans la [Référence API](#reference-api) ci-dessous.

```js
document.getElementById('confirm-dialog').addEventListener('ar-dialog-accepted', (e) => {
    if (e.defaultPrevented) return;
    console.log('Confirmé, dialog :', e.detail.id);
});
````

````

- [ ] **Step 2: Builder la doc et vérifier**

Run: `cd apps/docs && npm run build`
Expected: build complet sans erreur, 23 pages générées.

Run: `grep -c 'Moment' dist/components/dialog/index.html`
Expected: `0` (le tableau manuel a bien disparu).

Run: `grep -o 'href="#reference-api"' dist/components/dialog/index.html | head -1`
Expected: au moins une occurrence (le lien vers la Référence API fonctionne, l'ancre `id="reference-api"` existe déjà sur `<section id="reference-api">` dans `Playground.astro`).

- [ ] **Step 3: Vérifier la hiérarchie de titres (non régressée par PR #116)**

Run:
```bash
python3 - apps/docs/dist/components/dialog/index.html <<'EOF'
import re, sys
html = open(sys.argv[1]).read()
main = html.split('id="main-content"', 1)[1]
levels = [int(t) for t in re.findall(r'<h([1-6])[ >]', main)]
skips = [(levels[i], levels[i+1]) for i in range(len(levels)-1) if levels[i+1] - levels[i] > 1]
print("SKIPS:", skips)
EOF
````

Expected: `SKIPS: []`

- [ ] **Step 4: Commit**

```bash
git add apps/docs/src/content/components/ar-dialog.mdx
git commit -m "docs(docs): retire le tableau Cycle d'événements dupliqué de ar-dialog"
```

---

### Task 5: Vérification finale et documentation

**Files:**

- Modify: aucun fichier de code (vérification uniquement)

- [ ] **Step 1: Lancer la suite complète**

Run: `npm run test` (racine du monorepo)
Expected: tous les tests passent (core + docs).

Run: `npm run lint` (racine du monorepo)
Expected: 0 erreur.

Run: `npm run build --workspace=packages/core && npm run build --workspace=apps/docs`
Expected: les deux builds passent.

- [ ] **Step 2: Vérifier qu'aucun autre composant n'a de tableau narratif dupliquant les événements**

Run: `grep -rln 'Annulable\|@cancelable' apps/docs/src/content/components/*.mdx`
Expected: seul `ar-dialog.mdx` peut apparaître, pour la phrase explicative de Task 4 (pas un
tableau). Aucun autre fichier MDX ne doit contenir de tableau `Événement | Moment | Annulable`
équivalent. Si un autre fichier en contient un, le signaler dans le rapport de fin de tâche sans
le modifier (hors scope de ce plan).

- [ ] **Step 3: Commit final si des ajustements ont été faits**

Si Step 1 ou Step 2 a nécessité une correction, committer normalement avec un message décrivant
le correctif. Sinon, ne rien committer (rien à committer si tout était déjà vert).

- [ ] **Step 4: Pousser la branche et ouvrir la PR**

```bash
git push -u origin docs/event-table-merge
gh pr create --base dev --head docs/event-table-merge \
  --title "docs: fusionne le tableau Événements généré et le tableau manuel de ar-dialog" \
  --body "Introduit le marqueur JSDoc @cancelable (dialog, collapse, breadcrumb, dropdown, datepicker), ajoute une colonne Annulable au tableau Événements généré (ComponentApi.astro) et retire le tableau manuel dupliqué de ar-dialog.mdx. Issue #109."
```

Expected: la commande affiche l'URL de la PR créée vers `dev`.
