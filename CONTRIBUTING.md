# Contribuer à Ariane

Ce guide s'adresse aux contributeurs externes qui souhaitent proposer une amélioration,
signaler un bug ou soumettre un nouveau composant.

Pour le setup technique et les commandes de développement : voir [DEVELOPMENT.md](DEVELOPMENT.md).

---

## Qu'est-ce qu'Ariane ?

Ariane se positionne entre deux extrêmes du marché des composants web :

- **Web Awesome / Shoelace** — design system complet et opiniaté : l'intégrateur adopte le look de la librairie.
- **Radix UI / Headless UI** — composants sans style : l'intégrateur apporte tout le CSS.

**Ariane** : comportement accessible + tokens thémables, aucune opinion visuelle forte.
C'est la **fondation** sur laquelle construire son propre design system — pas un design system en soi.

---

## Philosophie

### Mission

Ariane prend en charge les patterns dont la complexité d'implémentation correcte est un obstacle
à l'accessibilité dans les projets réels. Elle ne réécrit pas les éléments natifs qui fonctionnent bien.

### Critères d'inclusion d'un composant

Un composant intègre Ariane si au moins l'une de ces conditions est vraie :

1. **Complexité a11y non triviale** — implémenter correctement le comportement accessible est difficile (stepper, datepicker, dialog, tabs).
2. **Absent des projets par difficulté d'implémentation** — le composant améliorerait l'UX mais est rarement bien fait (datepicker).
3. **Extension d'un natif insuffisant** — `<dialog>` → `<ar-dialog>` qui l'étend.

Un composant est **exclu** si :

- Il réplique un natif qui fait déjà bien le job (`<button>`, `<input>`, `<select>` de base).
- Sa valeur ajoutée est purement graphique sans apport a11y ou comportemental.

### Ergonomie de l'API

Intuitive par rapport aux natifs : un breadcrumb se compose comme un `<ul>/<li>`,
pas comme un JSON stringifié. Préférer des éléments enfants slottés aux props complexes.

### Thémabilité et accessibilité

- Les aspects visuels sont exposés via CSS custom properties (`--ar-*`).
- Les aspects qui garantissent l'accessibilité (focus management, bouton de fermeture) sont non négociables.
- Le thème par défaut satisfait les ratios de contraste **WCAG 2.2 AA** sans configuration supplémentaire.

---

## Proposer un nouveau composant

1. **Ouvrir une issue** en expliquant le besoin, les critères d'inclusion satisfaits, et une esquisse d'API.
2. **Discussion** — attendre un retour avant de commencer l'implémentation.
3. **PR sur `dev`** une fois l'issue validée.

---

## Workflow PR

Toutes les contributions passent par une Pull Request sur la branche `dev`.

```bash
git clone https://github.com/jogo-labs/ariane
cd ariane
nvm use
npm install
git checkout -b feat/mon-composant
```

---

## Conventions de commit

Les commits suivent **Conventional Commits**, vérifiés automatiquement par commitlint + Husky.

```
feat(button): ajoute la prop `loading`
fix(stepper): corrige la navigation au clavier
docs(alert): met à jour les exemples
test(button): ajoute les cas disabled
chore(deps): met à jour esbuild
```

Types autorisés : `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `ci`.
