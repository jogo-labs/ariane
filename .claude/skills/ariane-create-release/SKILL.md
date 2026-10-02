---
name: ariane-create-release
description: Use when creating a new release of @ariane-ui/core in the ariane project — version bump, release branch, PR to main, and tag on main after merge.
---

# ariane-create-release

Workflow complet de release pour `@ariane-ui/core`. Couvre la branche, le bump de version, la PR, et le tag post-merge.

## Étapes

### 1. Confirmer la version

Lire la version courante dans `packages/core/package.json`.  
Proposer la version suivante et demander confirmation :

> Version actuelle : `X.Y.Z-alpha.N`. Nouvelle version ? (proposition : `X.Y.Z-alpha.N+1`)

Le dist-tag npm est **inféré automatiquement** depuis la version :

- `-alpha.*` → `alpha`
- `-beta.*` → `beta`
- pas de suffixe → `latest`

Ne pas demander le type séparément — il est dans le numéro de version.

### 2. Créer la branche de release

Depuis `dev` (vérifier qu'on est à jour) :

```bash
git checkout dev && git pull origin dev
git checkout -b release/X.Y.Z
```

### 3. Bumper la version

Modifier `packages/core/package.json` : champ `"version"`.

Commiter :

```
chore(release): bump @ariane-ui/core to X.Y.Z
```

### 3 bis. Générer le changelog

Depuis la branche de release, une fois la version bumpée (le script refuse de tourner si le tag `vX.Y.Z` existe déjà) :

```bash
npm run changelog
```

Le script insère dans `CHANGELOG.md`, sous le préambule, la section de la version : commits Conventional Commits depuis le **dernier tag par version** (pas le dernier tag atteignable depuis `dev`), sections Ajouté / Corrigé / Performance / Modifié / Annulé, `docs`/`test`/`chore`/`ci` et le scope `docs` (site) masqués.

**Relire et corriger le brouillon avant de commiter** :

- « Changements incompatibles » : les messages de squash avalent parfois des lignes de commits (`* docs(plan): …`) après la note. Les retirer à la main.
- Vérifier qu'aucun breaking change ne manque : sans footer `BREAKING CHANGE:` (ou `!`) dans le message de squash, il n'apparaît pas. Le compléter à la main si besoin.

Commiter :

```
docs(release): changelog X.Y.Z
```

Pousser la branche :

```bash
git push -u origin release/X.Y.Z
```

### 3 ter. Relire la skill consommateur

Relire la section du changelog générée et `packages/core/scripts/skill/content/ariane/` : repérer ce que le contrôle ne voit pas (comportement changé, règle d'usage modifiée, phrase devenue fausse), corriger dans `content/ariane/`, `npm run build:skill && npm run check:skill`, et commiter sur la branche de release (`docs(core): met à jour la skill ariane`).

### 4. Créer la PR vers `main`

Via `mcp__github__create_pull_request` :

- **title** : `release: @ariane-ui/core vX.Y.Z`
- **head** : `release/X.Y.Z`
- **base** : `main`
- **body** : la section de `CHANGELOG.md` générée à l'étape 3 bis (relue)

### 5. Tag + nettoyage post-merge

Après que l'utilisateur ait confirmé le merge de la PR sur `main` :

```bash
git checkout main && git pull origin main
git tag vX.Y.Z
git push origin vX.Y.Z
git branch -d release/X.Y.Z
git push origin --delete release/X.Y.Z
```

Le CI prend le relais : publie sur npm avec le bon dist-tag et crée la GitHub Release.

Merger `main` dans `dev` pour que la branche de développement soit à jour avec le bump de version :

```bash
git checkout dev && git merge origin/main --no-edit && git push origin dev
```

## Points d'attention

- Ne jamais commiter le bump directement sur `dev` — toujours via branche `release/`
- Avant de créer la branche de release, vérifier que `main` a été mergé dans `dev` (`git log dev..origin/main --oneline` doit être vide). Sinon les tags de release ne sont pas ancêtres de `dev` : `npm run changelog` le tolère, mais `git log vX..HEAD` et `git describe` partent d'un tag trop ancien.
- Ne jamais tagger sur `dev` ou sur la branche release — uniquement sur `main` après merge
- Si le CI de publish échoue, vérifier les secrets OIDC dans les settings GitHub Actions
