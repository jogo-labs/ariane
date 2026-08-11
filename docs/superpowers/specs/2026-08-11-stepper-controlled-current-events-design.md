# Design — `ar-stepper` : deux événements demande/confirmation

**Statut :** Validé (en attente de plan d'implémentation)
**Date :** 2026-08-11
**Contexte :** issue [#174](https://github.com/jogo-labs/ariane/issues/174) — suivi identifié en marge de
#161 (`ar-pagination`, PR #173)

## Contexte

`ar-stepper.currentPath` est déjà un modèle contrôlé : le composant ne le mute jamais lui-même
(sauf via `follow-scroll`, qui le fait pour une raison différente — synchronisation avec le
scroll, pas une action de clic). Le focus (`_pendingFocusPath`, `stepper.ts:158,462,258-263`)
est déjà correctement gardé par confirmation.

Le trou réel : `onClickLink` (`stepper.ts:458-491`) dispatche `ar-stepper-step-change` (non
annulable aujourd'hui) **et** appelle `announceA11y(node?.label ?? path, 'polite')`
immédiatement au clic (ligne 490), sans attendre que le consommateur confirme la navigation en
réassignant `currentPath`. Si le stepper pilote un contenu chargé de façon asynchrone et que ce
chargement échoue, l'annonce a déjà eu lieu alors que le contenu réel n'a pas changé.

## Décisions issues du brainstorming

### 1. Deux événements, même détail `{ path }`

- **`ar-stepper-step-change`** (devient `cancelable: true`, inchangé sinon) — dispatché au clic
  depuis `onClickLink`, avant toute confirmation. `detail: { path }`.
- **`ar-stepper-step-changed`** (nouveau, `cancelable: false`) — dispatché depuis `updated()`
  quand `currentPath` a réellement transitionné, quelle qu'en soit la source (réassignation
  externe suite à confirmation, ou `follow-scroll`). `detail: { path }`.

Pas de renommage vers `{ from, to }` façon `ar-pagination` — `path` est déjà la terminologie
établie de `ar-stepper` (propriété unique, pas de position numérique), pas de valeur ajoutée à
aligner la forme du détail entre les deux composants.

### 2. Annonce a11y déplacée vers la confirmation, résolue à ce moment-là

L'appel à `announceA11y` sort de `onClickLink` et se fait depuis le bloc `updated()` qui gère
`changed.has('currentPath')`, une fois la transition confirmée réelle. Le label annoncé est
résolu à ce moment via `this.navigation.currentNode?.label` (état vivant de l'arbre après
`willUpdate()` → `this.navigation.setCurrentPath(...)`), pas figé sur le `node` trouvé au clic —
plus correct si l'arbre a changé entre temps, et cohérent avec le principe "rien n'est affirmé
avant confirmation".

### 3. Focus : mécanisme `_pendingFocusPath` conservé, unifié dans le même bloc

Pas de changement de logique : `_pendingFocusPath` n'est posé que dans `onClickLink`, jamais dans
`handleScrollChange` — le scroll ne vole donc toujours pas le focus. Le check
`this.currentPath === this._pendingFocusPath` et le focus qui en découle sont simplement
regroupés dans le même bloc `updated()` que le dispatch de `-changed` et l'annonce, plutôt que
dispersés — un seul point d'entrée pour "la transition est confirmée, voici les 3 conséquences
(event, annonce, focus éventuel)".

**Precision technique actée en discussion** (à ne pas perdre en implémentation) : le gate sur la
confirmation n'est pas un délai arbitraire imposé au focus — c'est une nécessité mécanique. Le
lien cliqué reste un `<a>` focalisable tant que `currentPath` n'est pas confirmé (aucun re-rendu
ne le remplace), donc le focus n'a _jamais quitté_ l'élément cliqué dans ce cas : rien à faire.
Sans le gate, `focusAfterUpdate` ciblerait `[part~="current"]` qui pointerait encore vers
l'**ancienne** étape active, arrachant le focus du lien cliqué pour le renvoyer en arrière — le
contraire de l'effet recherché. Le gate garantit que le focus ne bouge que quand il y a
effectivement un nouvel élément vers lequel aller.

### 4. `_pendingFocusPath` vidé immédiatement si `-change` est annulé

Amélioration mineure : si `event.preventDefault()` est appelé sur `ar-stepper-step-change`,
`_pendingFocusPath` est remis à `undefined` tout de suite après le `dispatchEvent` plutôt que
d'attendre l'expiration naturelle en fin de cycle — pas d'intention de focus à conserver pour une
navigation refusée.

### 5. Flag `_hasRenderedOnce`

Ajouté (comme sur `ar-pagination`) pour ne déclencher ni `-changed`, ni l'annonce, ni le focus au
tout premier rendu — évite un faux positif quand `currentPath` "change" par rapport à sa valeur
pré-upgrade non définie.

## Impact

**Composant** (`packages/core/src/components/stepper/stepper.ts`) :

- `onClickLink` (:458-491) : ajoute `cancelable: true` au dispatch de `ar-stepper-step-change` ;
  retire l'appel `announceA11y` (ligne 490) ; vide `_pendingFocusPath` si l'event est annulé.
- `updated()` (:240-264) : bloc `changed.has('currentPath')` existant étendu pour dispatcher
  `ar-stepper-step-changed`, annoncer (label résolu via `this.navigation.currentNode`), et
  effectuer le focus déjà prévu — guardé par le nouveau `_hasRenderedOnce`.
- JSDoc `@event` mis à jour (deux entrées, `@cancelable` sur la première — cf. régression trouvée
  en revue finale sur #161, à ne pas reproduire ici).
- Nouvelle méthode privée `_emitChanged({ path })` (miroir de `_emitChanged` sur `ArPagination`).

**Docs** (`apps/docs/src/content/components/ar-stepper.mdx`) :

- Section "Utilisation" à vérifier/enrichir avec le nouvel event `ar-stepper-step-changed` et sa
  relation avec l'annonce a11y.

**Tests** (`stepper.test.ts`, `stepper.browser.test.ts`, `stepper.a11y.test.ts`) :

- Nouveaux cas : `ar-stepper-step-change` est `cancelable` ; `preventDefault()` bloque tout (pas
  de `-changed`, pas d'annonce, pas de focus, `_pendingFocusPath` vidé) ; `-changed` ne fire
  qu'après réassignation externe de `currentPath` (ou via `follow-scroll`) ; annonce n'a lieu
  qu'après confirmation, avec le bon label.
- Vérifier qu'aucun test existant ne dépendait de l'annonce immédiate au clic (à adapter sinon).

## Hors scope

- Démos live de `ar-stepper.mdx` non câblées (pas d'équivalent `pageScript`) — trou similaire à
  celui identifié et corrigé sur `ar-pagination.mdx`, mentionné dans l'issue #174 mais traité
  séparément si besoin.
- Retouche du mécanisme `_pendingFocusPath` lui-même (structure arbre/desktop-mobile) — il
  fonctionne déjà correctement, seul son point de déclenchement est regroupé avec les deux autres
  conséquences de la confirmation.
