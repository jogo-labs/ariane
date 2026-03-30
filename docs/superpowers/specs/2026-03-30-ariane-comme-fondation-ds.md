# Analyse préliminaire — Ariane comme fondation de Design System

**Date :** 2026-03-30
**Statut :** Exploration — aucune décision prise
**Scope :** `packages/core/` — mode d'intégration pour les équipes qui construisent un DS sur Ariane

---

## Contexte

Exploration des mécanismes à mettre en place pour qu'une équipe puisse utiliser
Ariane comme fondation de son propre Design System, sans forker le dépôt.

L'idée initiale était de rendre les préfixes (`ar-`, `Ar`, `--ar-`) configurables
au build. Cette piste a été écartée après analyse — voir section "Piste écartée".

---

## Piste écartée — Préfixes configurables au build

**Idée :** permettre à une équipe de générer une version d'Ariane avec ses propres
préfixes (`acme-button` au lieu de `ar-button`) via une config de build.

**Pourquoi c'est écarté :**

- Coût élevé : build system, maintenance, documentation — pour un bénéfice cosmétique
- Coupe le cordon avec upstream : un fork renommé ne peut plus recevoir les correctifs
  et évolutions d'Ariane sans merge manuel
- Le problème est résolu en 3 lignes par la réexportation native Web Components :

```ts
import { ArAlert } from '@ariane-ui/core';
customElements.define('acme-alert', ArAlert);
```

---

## Ce qui serait réellement utile

### 1. Pattern de réexportation — Documentation

Documenter officiellement comment utiliser Ariane comme fondation :

- Réexporter les classes avec un tag custom (`customElements.define`)
- Surcharger les CSS custom properties `--ar-*` dans un thème propre
- Publier le résultat sous `@mon-ds/core` tout en restant à jour sur Ariane

Ce pattern permet de rester synchronisé avec les correctifs et évolutions d'Ariane
sans maintenance de fork.

---

### 2. Mode headless — Idée à creuser

**Problème actuel :** Ariane enregistre automatiquement ses composants via
`@customElement('ar-alert')` à l'import. Une équipe qui voudrait choisir
elle-même ses noms de tags ne peut pas l'éviter.

**Idée :** exposer un point d'entrée alternatif qui exporte les classes Lit
**sans** déclencher `customElements.define()`, laissant l'équipe libre de
les enregistrer sous les tags de son choix :

```ts
// Entrée standard (comportement actuel)
import '@ariane-ui/core'; // enregistre ar-spinner, ar-alert, etc.

// Entrée headless (à créer)
import { ArSpinner, ArAlert } from '@ariane-ui/core/headless';
customElements.define('acme-spinner', ArSpinner);
customElements.define('acme-alert', ArAlert);
```

**Questions ouvertes :**

- Les décorateurs Lit `@customElement()` appellent `customElements.define()`
  au moment de la définition de classe — comment les contourner proprement ?
  (option : remplacer `@customElement` par `customElements.define()` explicite
  dans un fichier d'entrée séparé, les classes restant non-enregistrées dans
  le barrel headless)
- Les CSS custom properties `--ar-*` restent liées au tag `ar-*` dans les
  styles des composants — faut-il les neutraliser en headless ou laisser
  l'équipe surcharger ?
- Impact sur le CEM et la doc ?

**Complexité estimée :** moyenne — principalement un second barrel export +
ajustement du build, pas de réécriture des composants.

---

## Résumé

| Piste                               | Valeur               | Effort  | Décision   |
| ----------------------------------- | -------------------- | ------- | ---------- |
| Préfixes configurables au build     | Faible (cosmétique)  | Élevé   | Écartée    |
| Documentation pattern réexportation | Élevée               | Faible  | À faire    |
| Mode headless (`/headless` export)  | Élevée pour DS tiers | Moyenne | À explorer |

---

## Questions ouvertes

- [ ] Le décorateur `@customElement` de Lit peut-il être contourné proprement
      sans réécrire les composants ?
- [ ] Faut-il un export headless par composant (`@ariane-ui/core/headless/button`)
      ou un barrel global (`@ariane-ui/core/headless`) ?
- [ ] Les CSS custom properties `--ar-*` sont-elles un problème en headless,
      ou l'équipe peut-elle simplement les surcharger ?
