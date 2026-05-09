# ADR-004 : Philosophie de style des composants

**Statut :** Adopté  
**Date :** 2026-05-08

## Contexte

Ariane se positionne comme une fondation pour construire un design system, pas comme un
design system prêt à l'emploi. La question du niveau de style à embarquer dans les
composants n'avait pas été tranchée formellement. En pratique, certains composants
(dropdown, breadcrumb, stepper) embarquaient des styles visuels complets, tandis que
d'autres (ar-tab-group) restaient quasi headless. Cette incohérence rendait les attentes
des intégrateurs floues.

La revue du composant ar-tab-group (PR #73) a mis en évidence la nécessité de formaliser
cette décision.

### Repères dans l'écosystème

- **Lion (ING)** — headless radical, zéro style visuel, fondation pure. Trop bas niveau
  pour Ariane : les intégrateurs doivent tout styler de zéro, y compris les signaux a11y.
- **Web Awesome / Shoelace** — styles complets, CSS custom properties, `::part()`. Prêt
  à l'emploi mais trop opinionné : impose une identité visuelle que les design systems
  construits sur Ariane devront surcharger intégralement.
- **Spectrum (Adobe), Clarity (VMware)** — styles complets portés par des tokens de design
  system. Modèle adapté à un design system maison, pas à une fondation générique.

Ariane vise la voie intermédiaire : fournir les styles qui ne devraient pas être
modifiés (structure, accessibilité) et exposer le reste via des tokens CSS et des `::part()`.

## Décision

Les styles d'un composant Ariane sont répartis en trois couches.

### Couche 1 — Styles internes fixes

Styles embarqués dans le Shadow DOM et non exposés à la customisation. Ils garantissent
le bon fonctionnement structurel et les signaux d'accessibilité obligatoires.

Exemples : `display`, `overflow`, `position` pour le layout ; présence de l'indicateur
actif sur un tab ; traitement visuel `[aria-disabled]` ; outline de focus.

Ces styles ne sont pas surchargeables via des tokens. Si un intégrateur doit les modifier,
c'est un signal que le composant doit évoluer.

### Couche 2 — Tokens CSS `--ar-*`

Les propriétés visuelles légitimement variables (couleur, padding, typographie, taille de
l'indicateur, etc.) sont exposées sous forme de CSS custom properties préfixées `--ar-`.

Les tokens sont déclarés avec une valeur par défaut fonctionnelle dans le Shadow DOM :

```css
color: var(--ar-tab-color, currentColor);
```

Ils constituent le contrat de personnalisation principal pour les consommateurs qui
construisent un thème. Un fichier `default.css` au niveau du package fournit des valeurs
de thème de base.

### Couche 3 — `::part()` stratégiques

Des attributs `part` sont posés sur les éléments internes clés pour permettre un accès
direct au Shadow DOM via CSS externe, au-delà de ce que couvrent les tokens.

Les parts sont documentés sur chaque composant (`@csspart` en JSDoc). Ils sont choisis
avec parcimonie : uniquement les éléments sur lesquels un intégrateur aura légitimement
besoin d'intervenir (fond, bordure, typographie avancée, états hover/focus custom).

## Règle de tri

| Nature du style                             | Couche         |
| ------------------------------------------- | -------------- |
| Layout structurel (`display`, `overflow`…)  | Interne fixe   |
| Signal a11y obligatoire (indicator, focus…) | Interne fixe   |
| Couleur, padding, typographie, espacement   | Token `--ar-*` |
| Accès direct à un élément interne           | `::part()`     |

## Conséquences

- Les composants existants (dropdown, breadcrumb, stepper) devront être auditées pour
  vérifier que leurs styles respectent ce découpage. Les styles visuels non exposés via
  token sont à migrer progressivement.
- Chaque nouveau composant doit documenter ses tokens (`@cssprop`) et ses parts
  (`@csspart`) dans le JSDoc, qui alimente le Custom Elements Manifest et la doc générée.
- Les styles de démo dans `apps/docs/` peuvent aller au-delà des tokens pour illustrer
  des cas d'usage (ex. scroll hints avec `mask-image`), mais ne doivent jamais être
  confondus avec le style du composant.
