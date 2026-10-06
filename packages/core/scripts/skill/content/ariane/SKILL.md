---
name: ariane
description: "Dans un projet qui utilise Ariane (`@ariane-ui/core`, balises `ar-*`), à utiliser dès qu'on ajoute, modifie ou thème un composant d'interface : alert, breadcrumb (fil d'ariane), charcounter (compteur de caractères), collapse (accordéon), datepicker (date), dialog (modale, drawer), dropdown (menu), pagination, progressbar, spinner, stepper (étapes), tabs (tab-group, onglets), table-sort (tri de colonne), tooltip (infobulle) ; ou pour installer et charger la lib (CDN, npm, Vue/React), la thémer (tokens `--ar-*`, `::part()`), traduire ses libellés ou changer le préfixe des tags."
---

# Ariane

Web components accessibles (Custom Elements natifs, Lit 3), tags préfixés `ar-`, paquet `@ariane-ui/core` en alpha. Headless : aucun style visuel par défaut, l'apparence vient d'un thème CSS. Conçu mobile-first.

## Règles qui évitent les erreurs fréquentes

- Aucun style sans thème : charger un thème (copié du starter-kit, ou le vôtre) ; un composant d'apparence brute : vérifier d'abord que le thème est chargé.
- Attendre la définition du composant (`customElements.whenDefined`, `whenAllDefined`) avant de lire une propriété, d'appeler une méthode ou de poser une propriété JavaScript.
- `window.ARIANE_CONFIG.prefix` doit exister avant l'évaluation de la librairie : npm, le poser dans un module importé avant la librairie ; CDN, dans un `<script>` classique placé avant le script Ariane.
- N'inventer aucun attribut, slot, événement, token ou part : lire `references/components/<tag>.md` avant d'écrire.
- Fonction, objet ou tableau : propriété JavaScript, jamais attribut. Attribut booléen : seule sa présence compte (`="false"` l'active).

## Quel fichier ouvrir

| Tâche                                                                                | Fichier                                                                |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Choisir un composant                                                                 | [references/choosing-components.md](references/choosing-components.md) |
| Détail d'un composant (API, exemples, accessibilité)                                 | [references/components/index.md](references/components/index.md)       |
| Installer, charger, préfixe, compatibilité, frameworks (React, Vue, Angular, Svelte) | [references/installation.md](references/installation.md)               |
| Attendre le chargement, attributs, slots, événements, méthodes, autocomplétion IDE   | [references/usage.md](references/usage.md)                             |
| Thème, tokens, parts, presets, shadow DOM applicatif                                 | [references/theming.md](references/theming.md)                         |
| Traductions                                                                          | [references/i18n.md](references/i18n.md)                               |
