# Sections "Utilisation" (6 composants) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une section `## Utilisation` à 6 pages de documentation composant (`ar-tab-group`, `ar-stepper`, `ar-pagination`, `ar-breadcrumb`, `ar-dialog`, `ar-alert`), documentant les events custom et comportements non triviaux absents de l'API auto-générée et de la section Accessibilité.

**Architecture:** Chaque page `.mdx` est modifiée indépendamment — un ajout de contenu en fin de fichier, aucune dépendance entre les 6 tâches de contenu (peuvent être exécutées par des agents en parallèle).

**Tech Stack:** Astro 6, MDX.

## Global Constraints

- Section `## Utilisation`, sous-titres `### <sujet>` — même niveau que `ar-datepicker.mdx`.
- Placée en fin de page, après `## Accessibilité` et après `## Comportement responsive` quand elle existe.
- Ton : adresse directe au lecteur (tutoiement / "vous"), cohérent avec la revue de terminologie déjà faite sur ces pages.
- Ne pas dupliquer de contenu déjà présent ailleurs sur la page (Accessibilité, variants).
- Les noms d'événements et la forme du `detail` doivent correspondre exactement au JSDoc du composant source (vérifié pendant le brainstorming — voir table ci-dessous).
- Ne pas ajouter `<WcagRef>` dans ces sections — elles ne couvrent pas des critères d'accessibilité, seulement du comportement/API.

## Table de référence événements (vérifiée dans le code source)

| Composant       | Événement                                                                                                   | `detail`                       |
| --------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `ar-tab-group`  | `ar-tab-group-change`                                                                                       | `{ active: string }`           |
| `ar-stepper`    | `ar-stepper-step-changed`                                                                                   | `{ path: string }`             |
| `ar-pagination` | `ar-pagination-page-change`                                                                                 | `{ from: number, to: number }` |
| `ar-breadcrumb` | `ar-breadcrumb-open` / `ar-breadcrumb-close`                                                                | aucun                          |
| `ar-dialog`     | `ar-dialog-show/shown/hide/hide-prevented/hidden/dismissed/dismissed-prevented/accepted/accepted-prevented` | `{ id: string }`               |
| `ar-alert`      | `ar-alert-close`                                                                                            | aucun                          |

---

## Spec de référence

`docs/superpowers/specs/2026-07-03-utilisation-sections-design.md`

---

## Task 0: Créer la branche de travail

**Files:** aucun

- [ ] **Step 1: Créer et basculer sur la branche**

```bash
cd /Users/jon/Code/Active_projects/ariane && git checkout dev && git pull && git checkout -b docs/utilisation-sections
```

Expected: `Switched to a new branch 'docs/utilisation-sections'`

---

## Task 1: ar-tab-group

**Files:**

- Modify: `apps/docs/src/content/components/ar-tab-group.mdx` (fin de fichier)

- [ ] **Step 1: Ajouter la section Utilisation en fin de fichier**

Le fichier se termine actuellement par (section `### À votre charge`) :

```mdx
### À votre charge

- **Nommer le tablist** : si la page contient plusieurs `ar-tab-group`, ajoutez l'attribut `label` sur chacun — il devient l'`aria-label` du tablist, permettant aux lecteurs d'écran de les distinguer.
- **Libellés des onglets** : le texte visible de l'onglet est son nom accessible. Évitez les onglets avec des icônes seules sans texte alternatif (`aria-label` sur `ar-tab`).
```

Ajouter à la suite :

````mdx
## Utilisation

### Écouter le changement d'onglet

`ar-tab-group` émet `ar-tab-group-change` à chaque changement d'onglet actif, avec le nom du panel dans `detail` :

```js
document.querySelector('ar-tab-group').addEventListener('ar-tab-group-change', (e) => {
    console.log('Onglet actif :', e.detail.active);
});
```

L'événement se déclenche aussi automatiquement quand l'onglet actif est retiré du DOM : un autre onglet est réélu et `ar-tab-group-change` est émis avec son nom, sans action de votre part.

### Activation manuelle vs automatique

Par défaut (`manual-activation` absent), les flèches déplacent le focus **et** activent immédiatement l'onglet ciblé — `ar-tab-group-change` se déclenche à chaque flèche. Avec `manual-activation`, les flèches ne font que déplacer le focus : l'activation (et l'événement) n'a lieu qu'à l'appui sur `Entrée` ou `Espace`.

```html
<ar-tab-group manual-activation>...</ar-tab-group>
```
````

- [ ] **Step 2: Build de vérification**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run build --workspace=@ariane-ui/docs
```

Expected: build réussi, pas d'erreur MDX.

- [ ] **Step 3: Vérifier le rendu du nouveau titre**

```bash
grep -o "Écouter le changement d'onglet" /Users/jon/Code/Active_projects/ariane/apps/docs/dist/components/ar-tab-group/index.html
```

Expected: au moins une occurrence.

- [ ] **Step 4: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add apps/docs/src/content/components/ar-tab-group.mdx && git commit -m "docs(ar-tab-group): ajoute la section Utilisation (event de changement, activation manuelle)"
```

---

## Task 2: ar-stepper

**Files:**

- Modify: `apps/docs/src/content/components/ar-stepper.mdx` (fin de fichier)

- [ ] **Step 1: Ajouter la section Utilisation en fin de fichier**

Le fichier se termine actuellement par (section `## Comportement responsive`) :

````mdx
Quand `desktop-target` est renseigné, la téléportation DOM est également activée : le composant
se déplace dans l'élément ciblé sur desktop, et revient à sa position d'origine sur mobile.

```html
<aside id="stepper-sidebar"></aside>
<ar-stepper desktop-target="stepper-sidebar" desktop-from="992"> ... </ar-stepper>
```
````

Ajouter à la suite :

````mdx
## Utilisation

### Écouter le changement d'étape

`ar-stepper` émet `ar-stepper-step-changed` au clic sur une étape, avec le `path` (le `href`) de l'étape sélectionnée dans `detail` :

```js
document.querySelector('ar-stepper').addEventListener('ar-stepper-step-changed', (e) => {
    console.log('Étape sélectionnée :', e.detail.path);
});
```

### Mode `create` vs `edit`

La prop `mode` détermine quelles étapes sont cliquables :

- **`create`** (défaut) : seules les étapes déjà **complétées** (avant l'étape courante) sont cliquables — navigation linéaire, cohérente avec un parcours de création où les étapes suivantes n'ont pas encore de contenu à afficher.
- **`edit`** : toutes les étapes sauf l'étape courante sont cliquables, y compris celles qui n'ont pas encore été visitées — adapté à un parcours de modification où tout le contenu existe déjà.

```html
<ar-stepper mode="edit">...</ar-stepper>
```

### Navigation synchronisée au scroll (`follow-scroll`)

Avec `follow-scroll`, la prop `current-path` se met à jour automatiquement pendant que l'utilisateur scrolle la page : le stepper détecte quelle section est visible et se synchronise sans action de votre part.

```html
<ar-stepper follow-scroll>...</ar-stepper>
```

### Navigation programmatique

Mettre à jour `current-path` depuis l'extérieur pilote le stepper comme un clic utilisateur :

```js
document.querySelector('ar-stepper').currentPath = '#etape-2';
```

En mode `create`, cette mise à jour ne rend pas les étapes suivantes cliquables pour autant — seul `mode="edit"` lève cette restriction.
````

- [ ] **Step 2: Build de vérification**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run build --workspace=@ariane-ui/docs
```

Expected: build réussi.

- [ ] **Step 3: Vérifier le rendu du nouveau titre**

```bash
grep -o "Écouter le changement d'étape" /Users/jon/Code/Active_projects/ariane/apps/docs/dist/components/ar-stepper/index.html
```

Expected: au moins une occurrence.

- [ ] **Step 4: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add apps/docs/src/content/components/ar-stepper.mdx && git commit -m "docs(ar-stepper): ajoute la section Utilisation (event, mode create/edit, follow-scroll, navigation programmatique)"
```

---

## Task 3: ar-pagination

**Files:**

- Modify: `apps/docs/src/content/components/ar-pagination.mdx` (fin de fichier)

- [ ] **Step 1: Ajouter la section Utilisation en fin de fichier**

Le fichier se termine actuellement par (section `## Comportement responsive`) :

```mdx
En dessous de **640px**, le composant réduit automatiquement le nombre de pages affichées :

- Seules les pages **précédente**, **active**, **suivante** et les deux voisines directes restent visibles.
- Les autres pages sont masquées — aucune configuration nécessaire.
```

Ajouter à la suite :

````mdx
## Utilisation

### Écouter le changement de page

`ar-pagination` émet `ar-pagination-page-change` à chaque changement de page (clic sur une page, précédent/suivant), avec `detail: { from, to }` :

```js
document.querySelector('ar-pagination').addEventListener('ar-pagination-page-change', (e) => {
    const { from, to } = e.detail;
    console.log(`Page ${from} → ${to}`);
    // Charger les données de la page `to`, puis mettre à jour `current` / `total` si besoin.
});
```
````

- [ ] **Step 2: Build de vérification**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run build --workspace=@ariane-ui/docs
```

Expected: build réussi.

- [ ] **Step 3: Vérifier le rendu du nouveau titre**

```bash
grep -o "Écouter le changement de page" /Users/jon/Code/Active_projects/ariane/apps/docs/dist/components/ar-pagination/index.html
```

Expected: au moins une occurrence.

- [ ] **Step 4: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add apps/docs/src/content/components/ar-pagination.mdx && git commit -m "docs(ar-pagination): ajoute la section Utilisation (event de changement de page)"
```

---

## Task 4: ar-breadcrumb

**Files:**

- Modify: `apps/docs/src/content/components/ar-breadcrumb.mdx` (fin de fichier)

- [ ] **Step 1: Ajouter la section Utilisation en fin de fichier**

Le fichier se termine actuellement par (section `## Comportement responsive`) :

```mdx
- Le dropdown expose son état via `aria-expanded` — le comportement clavier et vocal est géré automatiquement.

Pour observer ce rendu, utiliser les DevTools du navigateur en mode responsive.
```

Ajouter à la suite :

````mdx
## Utilisation

### Écouter l'ouverture/fermeture du dropdown mobile

En dessous de 768px, `ar-breadcrumb` émet `ar-breadcrumb-open` et `ar-breadcrumb-close` (sans `detail`) à chaque changement d'état du dropdown condensé :

```js
const breadcrumb = document.querySelector('ar-breadcrumb');
breadcrumb.addEventListener('ar-breadcrumb-open', () => console.log('Dropdown ouvert'));
breadcrumb.addEventListener('ar-breadcrumb-close', () => console.log('Dropdown fermé'));
```

Ces événements se déclenchent de la même façon quelle que soit l'origine du changement : clic sur le bouton toggle, mise à jour programmatique de la prop `open`, ou fermeture externe (clic en dehors, `Escape`) — pratique pour synchroniser un état d'UI externe ou pour de l'analytics.
````

- [ ] **Step 2: Build de vérification**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run build --workspace=@ariane-ui/docs
```

Expected: build réussi.

- [ ] **Step 3: Vérifier le rendu du nouveau titre**

```bash
grep -o "l'ouverture/fermeture du dropdown mobile" /Users/jon/Code/Active_projects/ariane/apps/docs/dist/components/ar-breadcrumb/index.html
```

Expected: au moins une occurrence.

- [ ] **Step 4: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add apps/docs/src/content/components/ar-breadcrumb.mdx && git commit -m "docs(ar-breadcrumb): ajoute la section Utilisation (events open/close du dropdown mobile)"
```

---

## Task 5: ar-dialog

**Files:**

- Modify: `apps/docs/src/content/components/ar-dialog.mdx` (fin de fichier)

- [ ] **Step 1: Ajouter la section Utilisation en fin de fichier**

Le fichier se termine actuellement par (section `### À votre charge`) :

```mdx
- **Adapter `close-label` à la langue de l'interface.** Par défaut `"Fermer"` — à remplacer si l'interface n'est pas en français (`close-label="Close"`, `close-label="Schließen"`, etc.).
```

Ajouter à la suite :

````mdx
## Utilisation

### Déclaration via `data-ar-dialog-open`

Plutôt que de piloter `open` en JavaScript, un élément cliquable peut ouvrir un dialog par son `id` via l'attribut `data-ar-dialog-open` — un écouteur global au niveau du document intercepte le clic :

```html
<button data-ar-dialog-open="confirm-dialog">Supprimer</button>

<ar-dialog id="confirm-dialog" label="Confirmer la suppression">
    Cette action est irréversible.
    <div slot="footer">
        <button data-ar-dismiss>Annuler</button>
        <button data-ar-accept>Confirmer</button>
    </div>
</ar-dialog>
```

### Cycle d'événements

| Événement                       | Moment                                                | Annulable |
| ------------------------------- | ----------------------------------------------------- | --------- |
| `ar-dialog-show`                | Avant l'ouverture                                     | Oui       |
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

### Dialogs empilés

Plusieurs `ar-dialog` peuvent être ouverts simultanément (un dialog ouvert depuis un autre, par exemple). Seul le dialog du dessus de la pile intercepte la touche `Escape` — les dialogs en dessous restent ouverts et inertes tant qu'il n'est pas fermé. Le verrouillage du scroll de la page est partagé entre tous les dialogs ouverts : il n'est relâché que lorsque le dernier dialog de la pile se ferme.
````

- [ ] **Step 2: Build de vérification**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run build --workspace=@ariane-ui/docs
```

Expected: build réussi.

- [ ] **Step 3: Vérifier le rendu du nouveau titre**

```bash
grep -o "Dialogs empilés" /Users/jon/Code/Active_projects/ariane/apps/docs/dist/components/ar-dialog/index.html
```

Expected: au moins une occurrence.

- [ ] **Step 4: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add apps/docs/src/content/components/ar-dialog.mdx && git commit -m "docs(ar-dialog): ajoute la section Utilisation (data-ar-dialog-open, cycle d'événements, dialogs empilés)"
```

---

## Task 6: ar-alert

**Files:**

- Modify: `apps/docs/src/content/components/ar-alert.mdx` (fin de fichier)

- [ ] **Step 1: Ajouter la section Utilisation en fin de fichier**

Le fichier se termine actuellement par (section `### À votre charge`) :

```mdx
- **`next-focus` obligatoire sur les alertes dismissibles.** Un bouton de fermeture sans
  destination de focus laisse l'utilisateur clavier sans repère.
```

Ajouter à la suite :

````mdx
## Utilisation

### Fermeture et cycle de vie

À la fermeture, `ar-alert` **se retire du DOM** (`this.remove()`) une fois la transition terminée — l'alerte n'est pas simplement masquée, elle disparaît définitivement de la page. Toute référence conservée à l'élément pointe alors vers un noeud détaché ; il n'existe pas de méthode pour la réafficher.

`ar-alert-close` (sans `detail`) est émis à ce moment-là, après la fin de la transition et juste avant le retrait du DOM :

```js
document.querySelector('ar-alert').addEventListener('ar-alert-close', () => {
    console.log('Alerte fermée et retirée du DOM');
});
```

Le bouton de fermeture n'est rendu que si `next-focus` est défini et non vide (`canBeHidden`) : sans `next-focus`, l'alerte n'a pas de bouton de fermeture et reste donc affichée en permanence — c'est voulu, pour éviter de fermer une alerte sans savoir où renvoyer le focus clavier.
````

- [ ] **Step 2: Build de vérification**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run build --workspace=@ariane-ui/docs
```

Expected: build réussi.

- [ ] **Step 3: Vérifier le rendu du nouveau titre**

```bash
grep -o "Fermeture et cycle de vie" /Users/jon/Code/Active_projects/ariane/apps/docs/dist/components/ar-alert/index.html
```

Expected: au moins une occurrence.

- [ ] **Step 4: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add apps/docs/src/content/components/ar-alert.mdx && git commit -m "docs(ar-alert): ajoute la section Utilisation (retrait DOM à la fermeture, next-focus)"
```

---

## Task 7: Créer la Pull Request

**Files:** aucun

- [ ] **Step 1: Pousser la branche**

```bash
cd /Users/jon/Code/Active_projects/ariane && git push -u origin docs/utilisation-sections
```

- [ ] **Step 2: Créer la PR vers `dev`**

```bash
cd /Users/jon/Code/Active_projects/ariane && gh pr create --base dev --title "docs: sections Utilisation pour 6 composants" --body "$(cat <<'EOF'
## Résumé

Ajoute une section `## Utilisation` (sur le modèle de `ar-datepicker`) à 6 pages de documentation, comblant les trous identifiés lors de l'audit (events custom non documentés, comportements non triviaux) :

- **ar-tab-group** — event `ar-tab-group-change`, activation manuelle vs automatique
- **ar-stepper** — event `ar-stepper-step-changed`, mode `create`/`edit`, `follow-scroll`, navigation programmatique
- **ar-pagination** — event `ar-pagination-page-change`
- **ar-breadcrumb** — events `ar-breadcrumb-open`/`ar-breadcrumb-close`
- **ar-dialog** — convention `data-ar-dialog-open`, catalogue d'événements, dialogs empilés
- **ar-alert** — retrait du DOM à la fermeture, condition `next-focus`/`canBeHidden`

Les 13 autres composants n'ont pas reçu de section Utilisation — soit un contenu équivalent existe déjà (`ar-table-sort`), soit rien de non-évident à ajouter au-delà de l'API et de l'accessibilité.

## Test plan

- [ ] `npm run build --workspace=@ariane-ui/docs` passe sur les 6 pages
- [ ] Relecture : pas de duplication avec les sections Accessibilité existantes
- [ ] Les noms d'événements et `detail` correspondent au JSDoc source

Spec : `docs/superpowers/specs/2026-07-03-utilisation-sections-design.md`
EOF
)"
```

Expected: URL de la PR affichée en sortie.
