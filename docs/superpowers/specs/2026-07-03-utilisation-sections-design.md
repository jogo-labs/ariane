# Spec — Sections "Utilisation" pour 6 composants

**Date :** 2026-07-03
**Scope :** `apps/docs/src/content/components/{ar-tab-group,ar-stepper,ar-pagination,ar-breadcrumb,ar-dialog,ar-alert}.mdx`
**Approche :** Subagent-driven, un agent par fichier (contenu indépendant par composant)

---

## Contexte

`ar-datepicker.mdx` a une section `## Utilisation` couvrant du contenu non trivial au-delà de l'API auto-générée et de l'accessibilité : events custom avec `detail`, comportements avec état/mémoire, patterns d'intégration. Les 18 autres pages composant n'ont que `## Accessibilité` (± `## Comportement responsive`).

Un audit des 13 composants restants (hors datepicker) a établi qu'ils n'ont pas tous besoin d'une telle section — plusieurs ont déjà un contenu équivalent documenté ailleurs (ex. `ar-table-sort` sous Accessibilité), ou sont trop simples pour en justifier une (`ar-progressbar`, `ar-spinner`, `ar-tooltip`, `ar-dropdown`, `ar-collapse`, `ar-charcounter`).

**Critère retenu** : une section Utilisation est justifiée si le composant a du contenu non-évident au-delà de l'API auto-générée et de l'accessibilité — events custom à écouter, comportement avec état/mémoire, patterns d'intégration, ou props qui interagissent entre elles.

6 composants passent ce critère (voir détail par composant ci-dessous). Les 13 autres restent inchangés — aucune section Utilisation forcée.

---

## Contenu par composant

### ar-tab-group

- **### Écouter le changement d'onglet** — documenter `ar-tab-group-change` (`detail: { active: string }`), émis via `activate()` du registre. Préciser qu'il se déclenche aussi quand l'onglet actif est retiré du DOM et qu'un autre est réélu automatiquement.
- **### Activation manuelle vs automatique** — clarifier l'interaction entre `manual-activation` et le moment exact où l'event se déclenche (Entrée/Espace vs flèches).

### ar-stepper (+ ar-stepper-item)

- **### Écouter le changement d'étape** — documenter `ar-stepper-step-changed` (`detail: { path }`). Ne pas documenter l'event interne non préfixé `step-changed` — usage interne uniquement, pas une garantie d'API publique.
- **### Mode `create` vs `edit`** — expliquer comment `mode` détermine quelles étapes sont cliquables/navigables (actuellement seulement suggéré via deux variants quasi identiques).
- **### Navigation synchronisée au scroll (`follow-scroll`)** — documenter que `ScrollFollowController` met à jour `current-path` automatiquement pendant le scroll utilisateur.
- **### Navigation programmatique** — mettre à jour `current-path` depuis l'extérieur (vs clic utilisateur), et son interaction avec `mode`.

### ar-pagination

- **### Écouter le changement de page** — documenter `ar-pagination-page-change` (`detail: { from, to }`) et le pattern d'intégration typique (fetch de données, mise à jour de `total`/`current`). Une seule section, contenu court.

### ar-breadcrumb (+ ar-breadcrumb-item)

- **### Écouter l'ouverture/fermeture du dropdown mobile** — documenter `ar-breadcrumb-open` / `ar-breadcrumb-close` (pas de `detail`), en précisant qu'ils se déclenchent identiquement que l'origine soit le bouton toggle, la prop `open`, ou une fermeture externe (clic extérieur/Escape).

### ar-dialog

- **### Déclaration via `data-ar-dialog-open`** — expliquer le mécanisme d'écoute globale au niveau document qui ouvre un dialog par id (actuellement seulement démontré via des snippets de variants, jamais expliqué en prose).
- **### Cycle d'événements** — catalogue complet (`show` / `shown` / `hide` / `hide-prevented` / `hidden` / `dismissed` / `dismissed-prevented` / `accepted` / `accepted-prevented`), leur `detail: { id }` commun, et la distinction dismissed/accepted vs hide (convention des boutons `data-ar-dismiss` / `data-ar-accept`).
- **### Dialogs empilés** — comportement de la pile (`_dialogStack`) au-delà de ce qui est dit en Accessibilité : seul le dialog du dessus intercepte Escape, le verrou de scroll est partagé/comptabilisé par référence.

### ar-alert

- **### Fermeture et cycle de vie** — expliquer que l'alerte se retire elle-même du DOM (`this.remove()`) à la fin de la transition de fermeture, pas seulement masquée — impossible de la ré-afficher ensuite. Documenter que `ar-alert-close` (sans `detail`) signale cette fermeture, et que `next-focus` conditionne l'affichage même du bouton de fermeture (`canBeHidden` : sans `next-focus`, pas de bouton, donc l'alerte est de fait permanente).

---

## Conventions de rédaction

- Titre de section : `## Utilisation`, sous-titres `### <sujet>` — même niveau que dans `ar-datepicker.mdx`.
- Placée après `## Accessibilité` (et après `## Comportement responsive` quand présent), à la fin de la page — ordre identique au datepicker.
- Exemples de code (`html`/`js`) quand un event ou un pattern d'intégration est documenté — cohérent avec le style du datepicker (snippets courts, ciblés).
- Ton : adresse directe au lecteur (tutoiement / "vous"), cf. [[project_docs_architecture]] et la revue de terminologie déjà faite sur ces pages.
- Ne pas dupliquer du contenu déjà présent ailleurs sur la page (Accessibilité, variants) — la section Utilisation comble uniquement les trous identifiés ci-dessus.

---

## Hors scope

- Les 13 autres composants (dont `ar-table-sort`, dont le contenu équivalent existe déjà sous Accessibilité) — pas de section Utilisation ajoutée.
- Toute refonte de la structure Accessibilité existante.
- Le travail de layout (scroll de page / TOC), qui fait l'objet d'un spec séparé ([[2026-07-03-docs-layout-scroll-toc-design]]).

---

## Tests / vérification

- Chaque page modifiée build sans erreur MDX (`npm run build` côté `apps/docs`).
- Les events documentés correspondent exactement aux noms et `detail` réels déclarés dans le JSDoc du composant source.
- Relecture : pas de contenu dupliqué avec les sections Accessibilité existantes.
