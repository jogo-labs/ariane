# Design : Architecture de l'information du projet Ariane

**Date :** 2026-03-27
**Statut :** Approuvé

---

## Contexte

L'organisation actuelle de la documentation souffre de deux problèmes principaux :

- **Pas de règle claire sur où mettre une nouvelle information** — le contenu atterrit là où ça tombe (CLAUDE.md, CONTRIBUTING.md, README)
- **Duplication et dérive** — les mêmes informations existent à plusieurs endroits et se désynchronisent

Le projet anticipe deux profils d'utilisateurs principaux : des développeurs qui évaluent la librairie pour l'intégrer (profil dominant), et des développeurs qui souhaitent contribuer. Les deux peuvent se succéder pour la même personne.

---

## Architecture cible

Cinq couches, chacune avec une audience unique et une responsabilité unique.

```text
┌─────────────────────────────────────────────────────┐
│  GITHUB VISITOR / INTÉGRATEUR                       │
│  README.md                                          │
├─────────────────────────────────────────────────────┤
│  CONTRIBUTEUR EXTERNE                               │
│  CONTRIBUTING.md                                    │
├─────────────────────────────────────────────────────┤
│  DÉVELOPPEUR INTERNE                                │
│  DEVELOPMENT.md                                     │
├─────────────────────────────────────────────────────┤
│  DÉCISIONS TECHNIQUES                               │
│  docs/decisions/                                    │
├─────────────────────────────────────────────────────┤
│  CONTEXTE CLAUDE                                    │
│  CLAUDE.md (allégé)                                 │
└─────────────────────────────────────────────────────┘
```

---

## Règle de routage

Avant d'ajouter une information, une seule question suffit :

| Question                                                                | Fichier           |
| ----------------------------------------------------------------------- | ----------------- |
| Un utilisateur a besoin de ça pour intégrer la lib ?                    | `README.md`       |
| C'est la philosophie ou le processus de contribution ?                  | `CONTRIBUTING.md` |
| C'est du setup, une commande, ou une convention technique interne ?     | `DEVELOPMENT.md`  |
| C'est une décision avec un contexte et des alternatives rejetées ?      | `docs/decisions/` |
| C'est une règle que Claude doit appliquer activement à chaque session ? | `CLAUDE.md`       |

---

## Contenu de chaque fichier

### `README.md` — Intégrateur/évaluateur

**Contient :**

- Pitch (2-3 lignes) : ce que c'est, pourquoi ça existe
- Exemple de code immédiat
- Installation rapide (CDN + npm)
- Personnalisation (CSS custom properties)
- Tableau stack technique (court)
- Liens : site de documentation, `CONTRIBUTING.md`

**Ne contient plus :** structure du monorepo, commandes de dev, conventions internes.

---

### `CONTRIBUTING.md` — Contributeur externe

GitHub affiche ce fichier en lien prioritaire dans les formulaires d'issue et de PR — son audience naturelle est le contributeur externe qui découvre le projet.

**Contient :**

- **Positionnement explicite** — ce qu'Ariane est et n'est pas, avec des références concrètes :
    - _Web Awesome / Shoelace_ → design system complet et opiniaté, l'intégrateur adopte le look
    - _Radix UI / Headless UI_ → composants sans style, l'intégrateur apporte tout le CSS
    - _Ariane_ → entre les deux : comportement accessible + tokens thémables, aucune opinion visuelle forte — la fondation sur laquelle construire son propre design system
- Philosophie et critères d'inclusion d'un composant (source de vérité unique)
- Comment proposer un nouveau composant (issue d'abord, discussion, PR)
- Workflow PR (`dev` → review → merge)
- Conventions de commit (Conventional Commits)
- Lien vers `DEVELOPMENT.md` pour le setup technique

**Ne contient plus :** détails de build, patterns de test, commandes détaillées.

> Note : la philosophie vit ici. `DEVELOPMENT.md` et `CLAUDE.md` y pointent — ils ne la dupliquent pas.

---

### `DEVELOPMENT.md` _(nouveau)_ — Développeur interne

Fichier de référence pour toute personne qui travaille sur le code du projet (nouveau dans l'équipe ou expérimenté).

**Contient :**

- Lien vers `CONTRIBUTING.md` pour la philosophie (ne la duplique pas)
- Prérequis et setup complet (Node, npm, nvm, clone, install)
- Toutes les commandes racine et par workspace (build, test, dev, lint, format)
- Architecture du monorepo et conventions de fichiers
- Patterns de code : `reflect: true`, events, tests, CEM JSDoc
- Scaffolding d'un composant (`npm run create`)
- Mise à jour du CEM, outputs de build

---

### `docs/decisions/` _(nouveau)_ — Décisions techniques

Un fichier par décision. Nommage : `ADR-NNN-titre-court.md`.

**Format :**

```markdown
# ADR-NNN : Titre de la décision

**Statut :** Adopté | Déprécié | Remplacé par ADR-YYY
**Date :** YYYY-MM-DD

## Contexte

Pourquoi cette décision était nécessaire.

## Décision

Ce qu'on a choisi.

## Alternatives rejetées

- Option A — pourquoi non
- Option B — pourquoi non

## Conséquences

Ce que ça implique pour le projet.
```

Les premières ADRs sont issues des "Lessons" actuellement dans `CLAUDE.md`.

**Intégration context-mode :** le hook `SessionStart` est étendu pour auto-indexer `docs/decisions/`. Les ADRs sont accessibles via `ctx_search()` sans consommer de tokens au démarrage de chaque session.

---

### `CLAUDE.md` _(allégé)_ — Contexte Claude Code

**Contient :**

- Vue d'ensemble du projet (court — 5-10 lignes)
- Règles actives critiques : naming, `reflect: true`, events, tokens CSS, méthode de travail
- Pointeurs explicites vers les autres couches :
    - _"Philosophie et positionnement → `CONTRIBUTING.md`"_
    - _"Setup et commandes → `DEVELOPMENT.md`"_
    - _"Décisions techniques → `docs/decisions/` (indexé par context-mode)"_

**Ne contient plus :** les Lessons détaillées (→ ADRs), le contenu dupliqué dans DEVELOPMENT.md.

---

## Skill projet _(phase 2)_

Un skill `.claude/skills/project-context.md` chargera à la demande les ADRs pertinents et les sections clés de `DEVELOPMENT.md`. À créer quand le volume d'ADRs le justifie — pas dans la migration initiale.

---

## Plan de migration

Chaque étape est une PR indépendante sur `dev`.

| Étape | Action                                                              | Fichiers                   |
| ----- | ------------------------------------------------------------------- | -------------------------- |
| 1     | Créer `DEVELOPMENT.md` depuis CONTRIBUTING.md + CLAUDE.md           | `DEVELOPMENT.md` (nouveau) |
| 2     | Alléger `CONTRIBUTING.md` (positionnement + philosophie + workflow) | `CONTRIBUTING.md`          |
| 3     | Alléger `README.md` (retirer le contenu dev)                        | `README.md`                |
| 4     | Créer `docs/decisions/` + migrer les Lessons en ADRs                | `docs/decisions/*.md`      |
| 5     | Alléger `CLAUDE.md` (pointeurs + règles actives uniquement)         | `CLAUDE.md`                |
| 6     | Étendre le hook SessionStart pour indexer `docs/decisions/`         | `.github/hooks/`           |

---

## Ce qui ne change pas

- `CLAUDE.md` reste la source de vérité pour les règles que Claude doit appliquer activement
- Le memory system (`/memory/`) reste pour les informations inter-sessions sur l'utilisateur et le projet
- `apps/docs/CONTRIBUTING.md` reste en place pour les contributeurs de la doc Astro
