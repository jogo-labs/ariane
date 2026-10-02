---
name: ariane
description: "À utiliser dès qu'il faut écrire ou modifier du HTML contenant des balises `ar-*` (web components Ariane, paquet `@ariane-ui/core`), installer ou charger Ariane (CDN, npm, headless), thémer ses composants (tokens `--ar-*`, `::part()`), personnaliser le préfixe des tags, ou brancher Ariane sur un design system existant."
---

# Ariane

Web components accessibles (Custom Elements natifs, Lit 3), tags préfixés `ar-`, paquet `@ariane-ui/core` en alpha. Headless : aucun style visuel par défaut, l'apparence vient d'un thème CSS. Mobile-first : le comportement par défaut vise le mobile, le desktop est une amélioration.

## Règles qui évitent les erreurs fréquentes

- Aucun style sans thème : charger `ariane.css` ou un thème propre ; un composant d'apparence brute signale un thème absent.
- Attendre la définition du composant (`customElements.whenDefined`, `whenAllDefined`) avant de lire une propriété, d'appeler une méthode ou de poser une propriété JavaScript.
- `window.ARIANE_CONFIG.prefix` doit exister avant l'évaluation de la librairie : le poser après l'import, dans le même module, n'a aucun effet.
- N'inventer aucun attribut, slot, événement, token ou part : lire `references/components/<tag>.md` avant d'écrire.
- Fonction, objet ou tableau : propriété JavaScript, jamais attribut. Attribut booléen : seule sa présence compte (`="false"` l'active).

## Quel fichier ouvrir

| Tâche                                                | Fichier                                                                |
| ---------------------------------------------------- | ---------------------------------------------------------------------- |
| Choisir un composant                                 | [references/choosing-components.md](references/choosing-components.md) |
| Détail d'un composant (API, exemples, accessibilité) | [references/components/index.md](references/components/index.md)       |
| Installer, charger, préfixe, compatibilité           | [references/installation.md](references/installation.md)               |
| Attributs, slots, événements, méthodes               | [references/usage.md](references/usage.md)                             |
| Thème, tokens, parts                                 | [references/theming.md](references/theming.md)                         |
| Traductions                                          | [references/i18n.md](references/i18n.md)                               |
