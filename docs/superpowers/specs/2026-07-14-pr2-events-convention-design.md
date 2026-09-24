# PR2 — Convention unifiée des events de cycle de vie

Date : 2026-07-14
Contexte : suite de l'audit technique v1.0-beta (`docs/superpowers/specs/2026-07-14-audit-technique-v1-beta.md`), transversal #3 ("Conventions d'events incohérentes"). PR1 (transversaux mécaniques) est mergée en amont côté branche mais pas encore mergée sur `dev` au moment de la rédaction de ce document — voir section "Dépendance de branche" plus bas.

## Objectif

Aligner tous les composants de disclosure (ouverture/fermeture) sur le pattern déjà majoritaire dans la librairie (`ar-dropdown`, `ar-dialog`, `ar-collapse`) : `<composant>-show` (annulable) → `<composant>-shown` (non annulable) / `<composant>-hide` (annulable) → `<composant>-hidden` (non annulable), avec `detail: { id: this.id || undefined }` systématique. Et unifier le suffixe des events de changement de valeur sur `-change` (pas `-changed`).

## Composants impactés

### `ar-breadcrumb`

**État actuel** : `ar-breadcrumb-open`/`ar-breadcrumb-close` émis directement dans `updated()` en réaction au changement de la propriété `open`, sans possibilité d'annulation, sans `detail`.

**Cible** : extraire deux méthodes privées `_show()`/`_hide()`, miroir du pattern déjà utilisé par `dropdown.ts` :

- `_show()` : émet `ar-breadcrumb-show` (`cancelable: true`). Si `defaultPrevented`, revient sur `this.open = false` sans appeler `_popover.show()`. Sinon, appelle `this._popover.show()` puis émet `ar-breadcrumb-shown` (non annulable) une fois la promesse résolue.
- `_hide()` : même structure symétrique avec `ar-breadcrumb-hide`/`ar-breadcrumb-hidden` et `_popover.hide()` (synchrone, contrairement à `show()`).
- `updated()` appelle `this._show()`/`this._hide()` au lieu d'émettre les events directement.
- `detail: { id: this.id || undefined }` sur les 4 events.
- JSDoc `@event` mis à jour (4 entrées au lieu de 2).

**Breaking change assumé (alpha)** : `ar-breadcrumb-open`/`ar-breadcrumb-close` disparaissent, remplacés par `ar-breadcrumb-show`/`ar-breadcrumb-shown`/`ar-breadcrumb-hide`/`ar-breadcrumb-hidden`.

### `ar-tooltip`

**État actuel** : aucun `CustomEvent` émis.

**Cible** : ajout de `ar-tooltip-shown`/`ar-tooltip-hidden` uniquement — **pas** de paire annulable `ar-tooltip-show`/`ar-tooltip-hide`. C'est un choix volontaire (un tooltip n'a pas de raison métier de bloquer son ouverture, contrairement à un dialog ou un menu), à documenter explicitement dans le JSDoc juste au-dessus du bloc `@event` pour qu'un futur lecteur ne le lise pas comme un oubli. `detail: { id: this.id || undefined }` pour cohérence avec les autres composants.

Émission : `shown` après que `this._tooltip.show()` (le `TooltipController`) a résolu ; `hidden` après `this._tooltip.hide()` (synchrone).

### `ar-stepper`

**État actuel** (`stepper.ts`, méthode `onClickLink`) : double dispatch — `step-changed` (interne, `composed: true`, non documenté, fuite hors shadow DOM) **et** `ar-stepper-step-changed` (documenté, `detail: { path }`).

**Cible** : suppression du dispatch `step-changed`. Vérifié (`grep -rn "step-changed"` sur `packages/core/src`) : ce nom court n'est consommé nulle part ailleurs dans la librairie — seul `stepper.test.ts:152-169` le teste directement (test dédié à supprimer avec le dispatch, pas de migration nécessaire). Un seul event reste, renommé `ar-stepper-step-changed` → `ar-stepper-step-change`. `detail: { path }` inchangé.

### `ar-dropdown`

Déjà conforme depuis PR1 (`ar-dropdown-show`/`-shown`/`-hide`/`-hidden`, `detail: { id }`). **Aucun changement dans PR2.**

## Tests

Pour chaque composant avec une paire annulable (`breadcrumb`) : test qu'appeler `preventDefault()` sur `show`/`hide` bloque bien l'ouverture/fermeture et restaure `this.open` à sa valeur précédente — même pattern que les tests existants sur `ar-dropdown`/`ar-collapse`.

Pour `breadcrumb` et `tooltip` : test que `shown`/`hidden` portent `detail: { id }` avec l'id de l'hôte.

Pour `stepper` : test négatif — `step-changed` (sans préfixe `ar-`) n'est plus émis du tout (regression guard direct sur le bug corrigé, remplace le test dédié supprimé de `stepper.test.ts:152-169`).

## Documentation

JSDoc `@event` mis à jour dans les 3 fichiers composants. Pour `ar-tooltip`, un commentaire explicite au-dessus du bloc `@event` justifie l'absence de `show`/`hide` annulables.

## Dépendance de branche

PR1 (`fix/audit-technical-transversal-mechanics`, PR GitHub #103) n'est pas encore mergée sur `dev` au moment de la rédaction. PR2 touche `ar-dropdown` seulement en lecture (aucun changement prévu) mais partage `AnchoredController`/`Popover` (déjà stables, non modifiés par PR2) avec `ar-breadcrumb` et `ar-tooltip`. Pas de conflit de fichier direct attendu avec PR1 (qui ne touche ni `breadcrumb.ts`, ni `tooltip.ts`, ni `stepper.ts` sur le plan des events). Décision : la branche PR2 peut être créée depuis `dev` sans attendre le merge de PR1 — à rebaser si PR1 merge avant PR2, sans conflit prévu vu l'absence de recouvrement de fichiers sur les zones modifiées.

## Hors scope

- `ar-dialog` : déjà conforme, `detail: { id }` déjà présent (précédent posé avant l'audit).
- `ar-collapse` : déjà conforme.
- `ar-table-sort` (`ar-table-sort-change`, déjà suffixe `-change`, pas de `-changed` à corriger) : hors scope, déjà conforme.
- Décision de convention `aria-disabled`/préfixage CSS/etc. : traités en PR1, hors scope ici.
