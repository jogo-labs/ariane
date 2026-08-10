# Design — Passage d'`ar-pagination.current` en modèle contrôlé

**Statut :** Validé (en attente de plan d'implémentation)
**Date :** 2026-08-10
**Contexte :** issue [#161](https://github.com/jogo-labs/ariane/issues/161) — découverte en
marge du fix de #154

## Contexte

Aujourd'hui, `ar-pagination.current` est une propriété interne mutée directement par le
composant au clic (`_onPageChange`/`_onPreviousPage`/`_onNextPage`/`_onSelectChange`,
`pagination.ts`), notifiée après coup via l'event `ar-pagination-page-change`. Ce n'est pas un
pattern contrôlé comme `ar-stepper.currentPath`, où c'est le consommateur qui décide de la
valeur en réponse à l'événement.

**Problème** : si la pagination pilote un contenu chargé de façon asynchrone (fetch, changement
de route, etc.) et que ce chargement échoue, le composant affiche déjà `current` mis à jour alors
que le contenu réel n'a pas changé — la pagination ment sur l'état visible.

**Décision actée en amont du brainstorming** : adopter le modèle contrôlé. Package en
`0.1.0-alpha.8` — breaking change direct, pas de dépréciation nécessaire (règle du CLAUDE.md).

## Décisions issues du brainstorming

### 1. Deux événements (inspiré du pattern déjà en place sur `ar-dialog`)

Plutôt qu'un simple event d'intention (façon `ar-stepper-step-change`), deux événements avec des
responsabilités distinctes — cohérent avec la convention verbe/participe passé déjà utilisée par
`ar-dialog` (`ar-dialog-show` → `ar-dialog-shown`, `ar-dialog-hide` → `ar-dialog-hidden`) :

- **`ar-pagination-page-change`** (`cancelable: true`, bubbles, composed) — dispatché **avant**
  tout changement, sur les 4 chemins d'interaction (clic page, précédent, suivant, `<select>`
  mobile). `detail: { from, to }`. `preventDefault()` bloque l'interaction : rien d'autre ne se
  passe (pas d'annonce a11y, pas de transfert de focus). Permet un veto synchrone côté
  consommateur (ex. confirmation bloquante avant de quitter une page).
- **`ar-pagination-page-changed`** (`cancelable: false`) — dispatché depuis `updated()` quand
  `current` a réellement transitionné, quelle qu'en soit la source (réassignation externe suite
  à la confirmation du consommateur, ou set programmatique indépendant d'un clic). `detail:
{ from, to }`. C'est ce dernier event — pas le clic — qui déclenche l'annonce aria-live et le
  focus, garantissant qu'aucun des deux ne se produit avant que `current` soit confirmé.

Pas de troisième event `ar-pagination-page-change-prevented` (existe sur `ar-dialog` pour
déclencher une réaction UI par défaut — secousse + annonce). Écarté : aucune réaction par défaut
équivalente n'a de sens ici ; le consommateur qui annule sait déjà pourquoi dans son propre
handler. YAGNI.

### 2. `current` devient purement contrôlé

Les 4 méthodes `_on*` ne mutent plus `current` — elles calculent la page cible et dispatchent
uniquement `ar-pagination-page-change`. Pas de mécanisme de fenêtre "un cycle"
(`_pendingFocusPath`) comme sur `ar-stepper` : ici un unique hook `changed.has('current')` dans
`updated()` suffit, la pagination n'ayant pas la structure arbre/desktop-mobile qui justifie la
complexité côté stepper.

Cas particulier `<select>` mobile : le `value` DOM est déjà muté nativement par le navigateur
avant que le handler `change` ne s'exécute. Si `ar-pagination-page-change` est annulé, le handler
revert explicitement `select.value` vers `current` — sans ça, rien ne déclencherait le sync
existant (`updated()`, lignes 194-198) puisque `current` lui-même ne change pas.

### 3. Annonce a11y et focus déplacés vers l'event `-changed`

`_announcePageChange` et `focusAfterUpdate(this, '[part~="current"]')` sont désormais appelés
depuis `updated()`, guardés par `changed.has('current')` **et** un flag `_hasRenderedOnce` (pour
ne pas se déclencher au premier rendu, où `current` "change" par rapport à sa valeur par défaut
non définie). Réutilisation telle quelle de `focusAfterUpdate` (déjà tolérant à un appel en
plein cycle `updated()`, cf. `await host.updateComplete`).

### 4. Démos live de la doc — rester interactives sans montrer le mécanisme

`Playground.astro` rend les `variants` du frontmatter MDX en SSR (`Fragment set:html`) — un
`<script>` inclus dans un champ `html:` de variante s'exécute normalement au chargement de la
page (vérifié : ce n'est pas une injection `innerHTML` côté client, donc pas soumis à
l'inertie des scripts injectés dynamiquement).

Un seul `<script>` ajouté une fois (dans le `html:` de la dernière variante) écoute
`ar-pagination-page-change` sur toutes les instances `ar-pagination` de la page et fait
`el.current = e.detail.to` — simule un consommateur qui confirme immédiatement, exactement le
pattern enseigné dans l'exemple de code de la section "Utilisation". Un seul script couvre les 4
variantes + la démo playground du bas (délégation `querySelectorAll`).

`ar-stepper.mdx` a le même trou (démos non câblées, `ar-stepper-step-change` déjà un modèle
contrôlé sans simulation live) — **hors scope de #161**, noté comme suivi séparé.

## Impact

**Composant** (`packages/core/src/components/pagination/pagination.ts`) :

- 4 handlers `_on*` : suppression de la mutation directe de `current`, dispatch de
  `ar-pagination-page-change` (cancelable) avec revert explicite du `<select>` si annulé.
- `updated()` : nouveau bloc guardé par `_hasRenderedOnce` + `changed.has('current')` qui
  dispatch `ar-pagination-page-changed`, annonce, et focus.
- JSDoc `@event` mis à jour (deux entrées au lieu d'une, `@cancelable` sur la première).

**Docs** (`apps/docs/src/content/components/ar-pagination.mdx`) :

- Section "Utilisation" réécrite : exemple avec les deux events, `current` ne bouge plus tout
  seul.
- "À votre charge" enrichi : mise à jour synchrone/quasi-synchrone requise pour focus/annonce
  (même esprit que l'avertissement équivalent sur `ar-stepper.mdx`).
- `<script>` de simulation ajouté à une variante pour garder les démos live interactives.

**Tests** (`pagination.test.ts`, `pagination.browser.test.ts`, `pagination.a11y.test.ts`) :

- Suppression des assertions sur mutation auto de `current`.
- Nouveaux cas : `preventDefault()` sur `page-change` bloque tout (pas de `-changed`, pas
  d'annonce, pas de focus, `<select>` reverté) ; `page-changed` ne fire qu'après réassignation
  externe de `current` ; `from`/`to` corrects sur les deux events.

## Hors scope

- Fix de la même faiblesse potentielle sur `ar-stepper` (annonce a11y immédiate au clic, non
  gated sur confirmation) — piste de suivi notée, pas traitée ici.
- Démos live non câblées sur `ar-stepper.mdx` — suivi séparé (backlog).
