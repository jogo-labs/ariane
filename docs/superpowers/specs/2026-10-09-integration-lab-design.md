# Laboratoire d'intégration framework — design

Date : 2026-10-09. Statut : brouillon validé en conversation, en attente de relecture écrite.

## Objectif

Avant le lancement de la beta, vérifier en conditions de projet réel que les composants Ariane fonctionnent dans Angular, React, Vue et Next.js. Corriger avant la beta ce qui est critique, ouvrir des issues `après-beta` pour le reste, et **éviter un breaking change juste après l'annonce de la beta**.

Critère de réussite : une liste triée de constats reproductibles, chacun avec sa gravité et son origine. Le point central est de savoir si un constat implique un changement d'API publique.

## Décisions

| Sujet               | Décision                                                                                                                                     |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Livrable des agents | Rapport seul. Les issues sont ouvertes ensemble après tri. Aucun correctif, aucune issue, aucun commit ni push par les agents.               |
| Exécution           | Un agent Opus par framework, en parallèle, même grille de scénarios, même format de rapport. Synthèse et dédoublonnage ensuite.              |
| Couverture          | Smoke sur tous les composants dans chaque framework, puis scénarios approfondis sur 9 composants ciblés.                                     |
| Source du paquet    | Tarball local `npm pack` depuis `dev` (identique à `0.1.0-alpha.14` à la date de rédaction). Après un correctif, on repackage et on relance. |
| Emplacement         | `~/Code/Active_projects/ariane-integration-lab/`, dossier frère hors dépôt. `git init` local sans remote.                                    |

## Structure du laboratoire

- `angular/`, `react/`, `vue/`, `next/` : chaque app est générée avec le scaffolder officiel du framework, dans sa dernière version stable. Les agents vérifient la doc via Context7, pas de mémoire.
- `tarball/` : le `npm pack` de `packages/core`.
- `SCENARIOS.md` : grille commune, écrite avant le lancement, identique pour les 4 agents.
- `reports/<framework>.md` : un rapport par agent.

## Contrat de chaque agent

- Installer le tarball, monter chaque composant (smoke : rendu, import, événements de base, absence d'erreur console).
- Dérouler les scénarios approfondis sur : `ar-pagination`, `ar-stepper`, `ar-table-sort`, `ar-datepicker`, `ar-dialog`, `ar-dropdown`, `ar-tab-group`, `ar-collapse`, `ar-alert`.
- Tester dans un vrai navigateur (Playwright installé dans le laboratoire, pas dans Ariane).
- Interdit : modifier le dépôt Ariane, créer des issues, commit, push.
- Format d'un constat :
    - reproduction minimale ;
    - comportement observé et attendu ;
    - origine : défaut du composant, spécifique au framework, ou lacune de doc ;
    - gravité (grille ci-dessous) ;
    - piste de correctif, non implémentée.

## Scénarios approfondis

- **Pilotés par le serveur** : pagination, stepper, table-sort, datepicker, dialog, avec réponse tardive, en erreur ou hors ordre. Le consommateur doit pouvoir refuser ou différer la transition, l'affichage ne doit pas diverger de la vérité serveur, et l'état d'attente doit être exprimable. À défaut, c'est un constat « correctif avant beta ».
- **Formulaires** : datepicker et charcounter avec la liaison de données propre au framework.
- **Événements** : `detail` accessible et typé côté framework.
- **Typage** : JSX, schéma Angular, `isCustomElement` Vue.
- **SSR (Next)** : hydratation, `'use client'`, enregistrement des éléments.
- **Thème du starter-kit** appliqué dans l'app.
- **Traductions** : `registerTranslation`.
- **Préfixe personnalisé** de tags.

## Grille de gravité

1. **Bloquant** : inutilisable dans ce framework.
2. **Correctif avant beta** : toute correction qui changerait l'API publique (attribut, événement, slot, part, token). Corriger après la beta serait un breaking change.
3. **Après beta** : corrigeable sans changer l'API.
4. **Doc / guide d'intégration** : la configuration framework existe mais n'est pas documentée.

## Synthèse

Après les 4 rapports : dédoublonnage et matrice composant × framework. Un constat présent dans plusieurs frameworks pointe vers le composant ; un constat dans un seul pointe vers l'intégration. Tri en commun, ouverture des issues, puis tâche de préparation du passage en beta (bandeau alpha→beta, badges des pages composant, mentions « alpha », dist-tag npm, avertissements de dépréciation, README/package.json du starter-kit).

## Hors périmètre

- Apps de test permanentes : sujet séparé, à rouvrir comme issue après l'analyse si elles s'avèrent utiles (dépôt frère ou `examples/` avec smoke Playwright par framework).
- Correctifs.
- Chargement CDN seul (sauf le scénario du thème du starter-kit).
