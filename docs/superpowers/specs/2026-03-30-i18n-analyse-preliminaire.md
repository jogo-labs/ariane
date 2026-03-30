# Analyse préliminaire — Site de documentation bilingue (FR/EN)

**Date :** 2026-03-30
**Statut :** Exploration — aucune décision prise
**Scope :** Documentation Astro (`apps/docs/`) uniquement

---

## Contexte

Évaluation de la complexité d'une migration vers un site de documentation bilingue
français / anglais, couvrant à la fois les pages statiques Astro et la documentation
des composants (MDX + données CEM).

---

## État actuel

- ~5 pages statiques Astro entièrement hardcodées en français
- 8 fichiers MDX (un par composant) avec frontmatter et narrative prose
- Navigation générée dynamiquement depuis le CEM + frontmatter MDX
- ~250 strings UI réparties dans les layouts et composants
- Aucune infrastructure i18n existante

---

## Zones à traiter

### 1. Strings UI — Complexité faible

Labels statiques dans les layouts et composants (`Layout.astro`, `SiteNav.astro`,
`Playground.astro`, `TableOfContents.astro`) : titres de sections, aria-labels,
tooltips, alpha banner, badges.

**Approche :** extraction dans des fichiers `src/i18n/fr.json` / `en.json` +
helper `t(key, lang)`. L'i18n intégré d'Astro (disponible depuis la v4, présent
en v6) couvre cette partie nativement.

**Volume :** ~250 clés.

---

### 2. Pages statiques — Complexité moyenne

Pages getting-started, foundations/tokens et index (landing) contiennent du texte
hardcodé mélangé à de la logique Astro.

**Approche :** routing `[lang]/` natif Astro (`/fr/getting-started/quickstart`,
`/en/getting-started/quickstart`). Les pages partagent un template commun qui
reçoit `lang` comme prop et délègue les strings aux fichiers de traduction.

**Impact :** refactorisation mécanique du routing — toutes les routes actuelles
changent de forme, les liens internes et externes existants sont cassés.

---

### 3. Documentation des composants (MDX) — Complexité moyenne

8 fichiers MDX contenant le frontmatter (title, description, variant labels) et
la narrative prose.

**Approche retenue : frontmatter multilingue dans un seul fichier MDX.**
Chaque champ traduit est décliné en sous-clés `fr`/`en` :

```yaml
title:
    fr: Bouton
    en: Button
description:
    fr: Déclenche une action au clic.
    en: Triggers an action on click.
variants:
    - name: default
      label:
          fr: Par défaut
          en: Default
      html: '<ar-button>Label</ar-button>'
```

Un helper de lecture sélectionne la valeur selon la langue active, avec fallback
sur la langue disponible si la clé est absente, et une alerte build-time pour
signaler les traductions manquantes.

**Avantage vs deux collections séparées :** un seul fichier à maintenir par
composant, pas de risque de divergence structurelle entre langues.

**Contrainte :** le schéma Zod de `src/content/config.ts` doit accepter les
champs en `string | { fr: string; en: string }`. Le helper de lecture
(`t(field, lang)`) normalise les deux formes.

---

### 4. Navigation générée depuis le CEM — Point d'attention

La navigation utilise le frontmatter MDX comme source de labels
(`mdxByTag[tagName]?.data.title`). Avec le frontmatter multilingue, cette
logique est étendue pour passer `lang` et extraire la bonne valeur via le helper.

Ce point est le plus couplé à l'architecture actuelle et doit être tranché en
premier lors de l'implémentation.

---

### 5. JSDoc des composants (CEM) — Question ouverte

Les descriptions JSDoc dans `packages/core/src/` alimentent le CEM
(`custom-elements.json`) qui est utilisé pour générer les tables API dans la doc.

**Options :**

| Option                                                                   | Avantage                   | Inconvénient                                                            |
| ------------------------------------------------------------------------ | -------------------------- | ----------------------------------------------------------------------- |
| JSDoc en anglais uniquement (langue technique de référence)              | Code source propre         | Tables API non traduites                                                |
| Clé custom `@description-fr` / `@description-en` lue par le CEM analyzer | Traduction complète        | Overhead visuel dans les fichiers source, config CEM analyzer à étendre |
| Traduction côté MDX seulement (surcharge dans le frontmatter)            | Séparation claire code/doc | Duplication partielle avec le JSDoc                                     |

**Aucune décision prise.** L'option JSDoc anglais uniquement est la plus légère
à court terme.

---

### 6. Détection et sélection de langue — Complexité faible

**Détection initiale :** header `Accept-Language` du navigateur à la première
visite, via middleware Astro ou redirection depuis `/`.

**Choix manuel :** toggle langue dans le header (à côté du theme toggle actuel).
Préférence enregistrée en localStorage (`ariane-lang`), logique identique au
thème actuel.

**Fallback :** si la langue détectée n'est pas supportée → `fr` par défaut
(langue d'origine du projet).

---

## Structure cible (esquisse)

```
src/
├── i18n/
│   ├── fr.json          ← strings UI statiques
│   ├── en.json
│   └── index.ts         ← helper t(key, lang) + détection
├── pages/
│   ├── index.astro      ← redirection vers /fr/ ou /en/
│   └── [lang]/
│       ├── index.astro
│       ├── getting-started/
│       │   ├── quickstart.astro
│       │   └── utilisation.astro
│       ├── foundations/tokens.astro
│       └── components/[slug].astro
└── content/
    └── components/      ← MDX existants avec frontmatter multilingue
        ├── ar-alert.mdx
        └── …
```

---

## Estimation d'effort

| Phase                    | Contenu                                                  | Effort |
| ------------------------ | -------------------------------------------------------- | ------ |
| Infrastructure           | Routing `[lang]/`, helper i18n, schéma Zod, config Astro | 1 jour |
| Strings UI               | Extraction + traduction des ~250 clés                    | 1 jour |
| Pages statiques          | Refactorisation + traduction (5 pages)                   | 1 jour |
| Documentation composants | Migration frontmatter multilingue (8 composants)         | 1 jour |

**Total estimé : 3-4 jours de développement**, hors révision du contenu traduit
et décision sur le JSDoc.

---

## Risques et points de vigilance

- **Routes cassées :** la migration du routing impacte tous les liens internes
  et externes existants (`/components/…`, `/getting-started/…`, etc.).
- **Maintenance du contenu :** tout ajout de composant ou de page implique une
  traduction. À peser selon le rythme de croissance de la doc.
- **SEO :** balises `hreflang` à ajouter dans le `<head>` pour chaque paire de
  pages.
- **Traductions manquantes :** le mécanisme de fallback + alerte build-time est
  indispensable pour éviter les trous silencieux.

---

## Questions ouvertes

- [ ] JSDoc bilingue ou anglais uniquement pour les tables API ?
- [ ] Langue par défaut du routing racine (`/` → `/fr/` ou `/en/`) ?
- [ ] Faut-il conserver les URLs sans préfixe de langue comme alias (`/components/ar-button` → `/fr/components/ar-button`) pour ne pas casser les liens existants ?

---

## Ressources

- [Astro i18n intégré](https://docs.astro.build/en/guides/internationalization/)
  — routing, détection de langue et fallback sans librairie externe (Astro 4+).
