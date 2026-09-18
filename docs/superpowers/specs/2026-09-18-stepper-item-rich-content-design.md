# Design — Contenu riche dans `ar-stepper-item` (`after-label`)

**Statut :** Validé (en attente de plan d'implémentation)
**Date :** 2026-09-18
**Contexte :** issue [#226](https://github.com/jogo-labs/ariane/issues/226), découverte en marge de #201/#222

## Problème

Référence visuelle partagée en session (DS France Travail) : certaines sous-étapes affichent une icône de
statut contextuelle (ex. alerte) à côté du label, avec un tooltip au survol. `ar-stepper-item`
n'offre aujourd'hui aucun moyen d'ajouter du contenu à côté de son label — seul l'attribut `label`
(texte simple) est disponible.

## Architecture actuelle (rappel)

- `ar-stepper-item` n'a **pas** de shadow DOM (`createRenderRoot() { return this; }`) — pur
  conteneur de données (`path`/`label`/`href`), enregistré auprès d'`ar-stepper` via le pattern
  registry (`stepperContext`).
- `ar-stepper` (`NavigationTreeController` + `computeNavigationStates`) construit un
  `NavigationNode[]` aplati (DFS) depuis les items enregistrés, calcule `current`/`completed`
  globalement à partir de `currentPath`.
- `stepper.renderer.ts` reconstruit **tout** le HTML de chaque étape (bullet, `<a>`/`<div>`, ARIA)
  depuis ces données, **en double** : un arbre pour le rendu desktop, un pour le dropdown mobile.
- `ar-breadcrumb-item` a exactement la même anatomie qu'`ar-stepper-item` aujourd'hui (même
  absence de shadow DOM, même pattern registry) — même famille de problème, hors périmètre ici
  (voir Hors périmètre).

## Contraintes de plateforme vérifiées empiriquement

Deux hypothèses de conception ont été testées et invalidées avant de converger sur la décision
retenue — consignées ici pour ne pas les retenter :

- **Assignation de slot (déclarative ou manuelle) à travers plusieurs frontières de custom
  elements ne fonctionne pas.** Testé sur Chromium et WebKit réels (Playwright) : un nœud imbriqué
  dans le light DOM d'`ar-stepper-item` n'est jamais assignable à un `<slot>` du shadow DOM
  d'`ar-stepper` — `slot.assign()` ne cible que les enfants **directs** du host shadow, même en
  mode `slotAssignment: 'manual'`. Aucune mécanique native de projection ne peut traverser la
  frontière `ar-stepper` → `ar-stepper-item` → contenu.
- **Le déplacement impératif (`appendChild`) fonctionne techniquement** (pas de restriction
  « enfant direct », testé et validé avec persistance après re-render Lit complet), mais casse la
  réactivité aux mutations du DOM léger après le montage initial (capture unique, pas de
  `MutationObserver`) et n'élimine pas le risque de flash de contenu non stylé avant upgrade.
  Écarté au profit de la décision ci-dessous, plus cohérente avec l'existant.
- **Le retargeting d'événement à travers une frontière shadow DOM est réel.** Testé : un clic sur
  du contenu situé dans le shadow DOM d'un élément imbriqué se retargete sur l'élément hôte quand
  observé par un listener délégué situé en dehors de cette frontière — `event.target.closest('a')`
  renvoie `null`. Le mécanisme de clic actuel (délégation + `closest`) ne survit pas tel quel à
  l'ajout d'un shadow DOM sur `ar-stepper-item`, quelle que soit l'option retenue par ailleurs.

## Décision retenue : `ar-stepper-item` porte son propre rendu

Précédent direct dans la lib : `ar-dropdown-item` (shadow DOM, `:host { display: contents }`,
`<slot>` par défaut) laisse son contenu participer réellement au rendu ; `ar-dropdown` ne
reconstruit rien, se contente d'un `<slot>` de projection et interroge le shadow DOM de chaque item
pour le focus/ARIA (`item.shadowRoot?.querySelector('slot').assignedElements()`). C'est un pattern
déjà éprouvé en production dans ce code, pas une technique nouvelle à risque.

**Le calcul d'état reste centralisé et inchangé.** `computeNavigationStates` a besoin de la liste
aplatie complète pour déterminer current/completed — calcul intrinsèquement global, qui reste porté
par `ar-stepper` seul. Ce qui change, c'est uniquement la _livraison_ : au lieu d'alimenter
`stepper.renderer.ts` pour reconstruire du HTML, `ar-stepper` pousse le render-state calculé
directement sur chaque instance `ArStepperItem`, via les références déjà détenues par le registry
(`registerItem`/`unregisterItem`) — aucun nouveau canal de communication nécessaire.

## Contrat de slot : `after-label` uniquement, additif

Décision explicitement **différente** du pattern `slot="label"` déjà utilisé sur `ar-datepicker`
(qui _remplace_ l'attribut `label`, avec repli texte). Ce pattern a été envisagé puis écarté ici :
il forcerait soit une duplication (attribut `label` **et** slot peuplés simultanément), soit la
perte de la version texte nécessaire au résumé du dropdown mobile (`currentStepLabel`, une chaîne).

Retenu à la place :

- `label` (attribut) reste l'**unique source de texte**, obligatoire, utilisée partout — desktop,
  mobile, `aria-current`, texte `sr-only`. Aucun changement de contrat sur cet attribut.
- Nouveau slot nommé **`after-label`** — purement additif, jamais de remplacement. Précédent direct
  sur `ar-datepicker` (`@slot after-label - Éléments après le label`), même principe.
- `before-label` explicitement **hors périmètre** pour ce chantier — seul `after-label` est
  implémenté.
- Positionné en **sibling, hors du `<a>`/`<div>` cliquable** — jamais à l'intérieur, qu'il s'agisse
  d'une étape cliquable ou non :
    - évite de polluer le nom accessible du lien avec le contenu d'`after-label` ;
    - évite l'interactif-dans-interactif si le consommateur place un élément interactif (ex. bouton
      de tooltip) dans `after-label` — invalide en HTML si imbriqué dans un `<a>` ;
    - un clic sur `after-label` ne déclenche jamais la navigation de l'étape.
- **`aria-describedby` conditionnel** du `<a>`/`<div>` vers le conteneur `after-label`, posé
  uniquement si le slot est peuplé (détecté via `slotchange`, `assignedNodes().length > 0` —
  évite de référencer un id vide). Améliore l'accessibilité par rapport à la référence visuelle
  d'origine (icône + tooltip au survol, donc invisible au clavier) : le focus du contrôle de
  l'étape annonce désormais aussi la description portée par `after-label`, sans dépendre du survol
  souris. Le conteneur porte un id stable par instance (même principe que `_uid` sur
  `ar-datepicker`, généré une fois à la construction — stable dans le temps, pas littéralement
  global).

## Structure DOM — avant/après

Avant (aujourd'hui) :

```html
<ar-stepper-item path="etape-1" label="Mes informations" href="#">
    <ar-stepper-item path="etape-1-1" label="Mon état civil" href="#"></ar-stepper-item>
    <ar-stepper-item path="etape-1-2" label="Mes coordonnées" href="#"></ar-stepper-item>
</ar-stepper-item>
```

Après, avec contenu additif sur l'étape 1 :

```
<ar-stepper-item path="etape-1" label="Mes informations" href="#">
    <span slot="after-label"><!-- icône de statut, éventuellement avec son propre ar-tooltip --></span>

    <ar-stepper-item path="etape-1-1" label="Mon état civil" href="#"></ar-stepper-item>
    <ar-stepper-item path="etape-1-2" label="Mes coordonnées" href="#"></ar-stepper-item>
</ar-stepper-item>
```

Les sous-`ar-stepper-item` n'ont besoin d'aucun attribut `slot` : n'ayant pas de `slot="after-label"`,
ils tombent naturellement dans le slot par défaut (non nommé) du parent, réservé aux sous-étapes —
c'est ce slot qui assure le forwarding récursif à travers les niveaux d'imbrication.

## `ar-stepper-item` — nouveau shadow DOM

Gabarit (pseudo-code, détails d'implémentation laissés au plan) :

```
<!-- <a> si isLink (poussé par ar-stepper), sinon <div tabindex="-1"> -->
<a part="step-link control"
   aria-describedby=${hasAfterLabel ? afterLabelId : nothing}
   @click=${...}>
    <span part=${bulletPart} aria-hidden="true">${order}</span>
    <span class="sr-only">${srLabel}</span>
    <span class="item-label" part=${labelPart}>${label}</span>
</a>
<span id=${afterLabelId}>
    <slot name="after-label" @slotchange=${this._handleAfterLabelSlotChange}></slot>
</span>
${showSubsteps ? html`<slot></slot>` : nothing}  <!-- slot par défaut, forward des sous-items -->
```

`:host { display: contents }` (précédent `ar-dropdown-item`) — élimine le risque de flash de
contenu non stylé avant upgrade du custom element, qui existerait sans shadow DOM.

## `ar-stepper` — livraison du render-state

- Le registry garde ses méthodes actuelles (`registerItem`/`unregisterItem`/`notifyItemChanged`)
  inchangées côté enregistrement.
- Après calcul d'état (`computeNavigationStates`), `ar-stepper` pousse sur chaque instance
  `ArStepperItem` concernée : `order`, `bulletState` (`current`/`completed`/`default`), `isLink`,
  `showSubsteps`, `srLabel` (texte localisé déjà calculé, ex. « Étape 2 sur 4 ») — via une méthode
  dédiée (ex. `_setRenderState(...)`) stockant ces valeurs en `@state()` sur l'item, qui se
  re-render lui-même.
- `stepper.renderer.ts` se réduit fortement : il ne construit plus le HTML par étape (bullet, lien,
  ARIA) — cette responsabilité migre entièrement vers `ar-stepper-item`. Il conserve uniquement le
  « chrome » du dropdown mobile (bouton trigger, résumé `currentStepLabel`/`currentSubStepLabel`).
- Rendu desktop et mobile : un seul `<slot></slot>` (non nommé) projetant les vrais
  `<ar-stepper-item>` du light DOM, restylé en CSS selon le breakpoint — remplace les deux arbres
  actuellement reconstruits en parallèle (`renderDesktop`/`renderMobile` appelant chacun
  `renderStepList` sur les mêmes données). Réduction de duplication, pas juste un ajout.

## Gestion du clic

Le listener actuel (délégué sur le shadow root d'`ar-stepper`, `event.target.closest('a')`) ne
survit pas à la frontière shadow introduite par `ar-stepper-item` (vérifié, voir plus haut).

Remplacé par un appel de méthode direct via le registry, pas par un `CustomEvent` interne —
réutilise le canal de communication déjà établi pour `notifyItemChanged`, plutôt que d'introduire
un second mécanisme pour un besoin de même nature (item → parent, jamais destiné à être intercepté
par un consommateur). Nouvelle méthode sur `StepperRegistry` : `notifyItemActivated(item:
ArStepperItem, event: MouseEvent): void` — distincte de `notifyItemChanged` (changement d'état vs.
interaction), même mécanique.

- `ar-stepper-item` gère son propre `preventDefault()` conditionnel localement au clic sur son
  `<a>` interne (sa prop `href` est déjà disponible en local — plus besoin, comme aujourd'hui, de
  chercher `node.href` dans l'arbre aplati), puis appelle
  `this._registry?.notifyItemActivated(this, event)`.
- `ar-stepper` implémente `notifyItemActivated` avec la logique actuellement dans `onClickLink` :
  fixe `_pendingFocusPath`, dispatch `ar-stepper-step-change` (cancelable, inchangé — c'est
  l'événement public consommateur, sans rapport avec ce canal interne), et si la navigation est
  annulée, appelle `event.preventDefault()` sur l'event natif reçu et réinitialise
  `_pendingFocusPath`.

## Gestion du focus

`this.shadowRoot.querySelector('[data-path="..."]').focus()` (utilisé aujourd'hui pour rendre le
focus après une navigation confirmée) ne fonctionne plus : l'élément focusable vit désormais dans
le shadow root de l'item, pas celui d'`ar-stepper`. Remplacé par une méthode publique
`focusControl()` sur `ArStepperItem` — encapsulation-friendly, ne dépend pas de la structure interne
du shadow DOM de l'item côté `ar-stepper` (préféré à `item.shadowRoot?.querySelector(...)` direct,
même si ce dernier a un précédent sur `ar-dropdown`).

## Impact API CSS publique (`::part()`) — cassant, accepté

- `bullet`, `indicator`, `label`, `step-link`, `control` migrent du shadow DOM d'`ar-stepper` vers
  celui d'`ar-stepper-item`. Un consommateur cible désormais `ar-stepper-item::part(bullet)`
  directement (élément normal du light DOM, pas de `exportparts` nécessaire) plutôt que
  `ar-stepper::part(bullet)`.
- `list`, `list--substep`, `step`, `substep` restent portés par `ar-stepper` (structure de liste,
  inchangée).
- Changement cassant assumé sans mesure de migration : alpha non utilisée en production à ce jour,
  c'est le moment le moins coûteux pour le faire (cohérent avec la préoccupation
  `priority:avant-beta` déjà actée sur ce chantier).

## Hors périmètre

- `before-label` : seul `after-label` est implémenté pour ce chantier.
- `ar-breadcrumb-item` : même famille de problème (anatomie identique à `ar-stepper-item`
  aujourd'hui), candidat naturel au même traitement — plus simple, pas d'imbrication à gérer.
  Décision explicite du mainteneur : à reprendre **une fois le mécanisme rodé sur `ar-stepper`**,
  pas dans ce chantier.
- `ar-datepicker` : son couple `slot="label"`/`after-label` existant pourrait bénéficier du même
  lien `aria-describedby` conditionnel entre label et `after-label`. Même décision : à évaluer
  après retour d'expérience sur `ar-stepper`, pas ici.
- Custom States / `:state()` (#229) : indépendant de ce chantier.

## Suivi

Deux issues à ouvrir **après** la mise en production et le rodage du mécanisme sur `ar-stepper`
(pas immédiatement) : alignement `ar-breadcrumb-item`, et amélioration `aria-describedby` sur
`ar-datepicker` (`label`/`after-label`). Étiquette `priority:avant-beta` a priori pour les deux,
à confirmer au moment de leur ouverture.
