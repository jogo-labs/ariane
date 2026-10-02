# Agent Skill `ariane` + `llms.txt` pour consommer Ariane (#264)

**Date :** 2026-10-02
**Statut :** Spec validée par le mainteneur (2026-10-02), prête pour le plan d'implémentation
**Issue :** #264 (`scope:docs`, `type:feat`, `priority:après-beta`)
**Analyse préliminaire :** `docs/superpowers/specs/2026-09-12-llms-txt-agent-skill-analyse-preliminaire.md`

## Objectif

Permettre à un LLM (Claude Code en priorité, tout outil compatible Agent Skills ensuite, tout outil lisant du texte en repli) d'utiliser correctement Ariane dans le projet d'un consommateur externe. Ce n'est pas une aide à la contribution : les skills de `.claude/skills/` (`ariane-new-component`, `ariane-write-docs`…) restent séparées.

- **Livrable principal :** une Agent Skill `ariane`, à chargement progressif : un `SKILL.md` court toujours chargé, des références lues à la demande, pour ne pas saturer le contexte.
- **Repli :** `llms.txt` (index) et `llms-full.txt` (tout inliné) pour les outils sans skills.
- **Première version :** synthèse de ce qui est connu du projet aujourd'hui, écrite à la main à partir de sources lues, plus une référence par composant générée.
- **Maintenance continue :** intégrée au process de développement (voir « Maintenance »).

## Décisions (et ce qui est écarté)

| Sujet                   | Décision                                                                                                            | Écarté, avec déclencheur de réexamen                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Artefacts               | Skill + `llms.txt` + `llms-full.txt`, un seul générateur                                                            | —                                                                                                                                                                                                                                                                                                                                                                                                 |
| Génération              | Hybride : tableau d'API par composant généré (CEM + MDX), le reste écrit à la main                                  | Tout à la main : l'API serait dupliquée et dériverait                                                                                                                                                                                                                                                                                                                                             |
| Frontière               | Un seul auteur par fichier, deux zones disjointes                                                                   | Fichiers mixtes (prose + tableau généré) : risque d'écrasement                                                                                                                                                                                                                                                                                                                                    |
| Langue                  | Français partout                                                                                                    | Anglais : exige de traduire les JSDoc et les MDX (rouvre l'i18n de la doc). Réexamen si la doc devient bilingue : le tableau se régénère, seuls les fichiers écrits sont à traduire                                                                                                                                                                                                               |
| Distribution            | Dans `@ariane-ui/core`, installée avec `npx skills add ./node_modules/@ariane-ui/core/skills/ariane`                | Paquet npm dédié : n'enlève pas l'étape npm pour les utilisateurs CDN, casse l'alignement de version skill/bibliothèque, coûte une publication OIDC et un workflow de plus. Réexamen si des utilisateurs réels du CDN le demandent ou si la skill doit évoluer à un autre rythme que la bibliothèque. Plugin/marketplace Claude : canal et cycle de release en plus, public actuel trop restreint |
| Nombre de skills        | Une seule, `ariane`                                                                                                 | Skill séparée de création de thème (`ariane-theme`) : voir « Hors périmètre »                                                                                                                                                                                                                                                                                                                     |
| Emplacement des sources | `packages/core/scripts/skill/` (comme WebAwesome : le contenu écrit n'a de consommateur que le script qui le copie) | Dossier racine `skills-src/`                                                                                                                                                                                                                                                                                                                                                                      |

## Architecture

### Dossiers

```
packages/core/
  scripts/skill/
    README.md          règles de maintenance (non publié)
    content/ariane/    ZONE ÉCRITE : SKILL.md, references/*.md (versionnée)
    build-skill.js     générateur
    check-skill.js     contrôle
    *.test.js
  skills/ariane/       PUBLIÉ, ignoré par git, recréé à chaque build
    SKILL.md, references/*.md     copie à l'identique de content/ariane/
    references/components/        GÉNÉRÉ : index.md + <tag>.md par composant racine
  llms/
    llms.txt, llms-full.txt       GÉNÉRÉS, ignorés par git
```

Règles :

- Le générateur lit `content/ariane/` pour le copier, sans jamais l'écrire. Il n'écrit que dans `skills/` et `llms/`, qu'il vide avant.
- Aucun fichier n'a deux auteurs. Les fichiers générés portent un en-tête « généré, ne pas éditer ».
- `SKILL.md` ne contient pas de liste de composants : elle vit dans `components/index.md` (générée), vers laquelle il pointe.
- `skills` et `llms` sont ajoutés à `files` de `packages/core/package.json`. `skills/` et `llms/` sont ajoutés à `.gitignore`.
- `scripts/skill/README.md` n'est pas publié ; il documente ces règles et la procédure de mise à jour (comme celui de WebAwesome).

### Générateur (`build-skill.js`)

Entrées :

- CEM : `dist/custom-elements.json` (19 déclarations avec `tagName` ; `attributes`, `slots`, `events`, `cssProperties`, `cssParts`, `cssStates`, `members` ; `x-parent` pour les 5 sous-composants `ar-tab`, `ar-tab-panel`, `ar-dropdown-item`, `ar-breadcrumb-item`, `ar-stepper-item`).
- MDX : `apps/docs/src/content/components/<tag>.mdx`, lus avec `gray-matter` (déjà présent à la racine du monorepo ; à déclarer dans les `devDependencies` de `core` si l'installation l'exige).
- Zone écrite : `scripts/skill/content/ariane/`.

Un fichier `references/components/<tag>.md` par composant racine (14), contenant :

1. Titre et description du CEM.
2. Exemples : les `variants` du frontmatter MDX (libellé, description, HTML).
3. API en tableaux : attributs (type, défaut), slots, événements (marque « annulable » issue de `@cancelable`), propriétés CSS, parts, états CSS, méthodes publiques.
4. Accessibilité et usage : le corps du MDX converti.

Les sous-composants n'ont pas de fichier propre : ils sont des sections du fichier de leur parent (via `x-parent`).

Conversion du MDX (seul JSX présent aujourd'hui : `<WcagRef criterion summary />`, 22 usages, plus des `import`) :

- `import` en tête de fichier retirés, hors blocs de code (le `import IMask` d'`ar-datepicker` est dans un bloc de code et reste).
- `<WcagRef criterion="4.1.3" summary="…" />` remplacé par du texte, « WCAG 4.1.3 : … », sans lien.
- Tout autre composant JSX : le générateur échoue en nommant le fichier.

`components/index.md` liste les composants (sous-composants rattachés à leur parent) et porte une ligne « généré depuis @ariane-ui/core X ». Aucun champ de version n'est injecté dans le frontmatter de `SKILL.md` (champs reconnus par Claude Code : voir sa documentation, pas de champ `version` vu).

`llms.txt` : format llmstxt.org (H1, blockquote, sections H2 de liens `[titre](URL): description`). Les liens pointent vers les fichiers de la skill sur unpkg, versionnés : `https://unpkg.com/@ariane-ui/core@<version>/skills/ariane/references/…`. Ils ne dépendent pas du domaine public (#276). `llms-full.txt` : concaténation de `SKILL.md`, des références écrites puis des fichiers composants, avec un séparateur de fichier.

Propriétés : sortie déterministe (tri par tag), un composant du CEM sans MDX fait échouer le générateur avec un message clair (`create-component.js` génère le MDX, vérifié).

### Contrôle (`check-skill.js`)

Échoue avec fichier et ligne, sur le modèle des autres `validate-*`. Il vérifie :

1. Chaque `<ar-*>` cité dans la zone écrite existe dans le CEM.
2. Chaque attribut cité (`<ar-x attr>`, `<ar-x attr="v">`) existe pour ce tag dans le CEM.
3. Chaque composant du CEM apparaît dans une table de `choosing-components.md`.
4. Un fichier généré existe pour chaque composant racine, aucun pour un sous-composant.
5. Les liens Markdown relatifs se résolvent (liste blanche pour les fichiers générés visés par la zone écrite, p. ex. `components/index.md`).
6. Le frontmatter de `SKILL.md` a `name` et `description`, et `name` est égal au nom du dossier.
7. `package.json` liste `skills` et `llms` dans `files`.
8. Chaque token `--ar-*` cité dans `theming.md` existe dans les `cssProperties` du CEM ou dans les fragments du thème (`src/styles/themes/ariane/`).

Convention : les tags, attributs et tokens à contrôler figurent dans des tables ou du code inline.

Limites assumées (couvertes par la relecture à la release) : la vérité d'une phrase de conseil, les valeurs d'attribut (seulement les noms), la qualité de déclenchement du `description`.

### Branchement

- Scripts de `core` : `build:skill` (générateur) et `check:skill` (contrôle). `build` : `… build:manifest && build:skill && build:bundles && check:cdn && check:skill …` (ordre à ajuster à l'implémentation ; `build:skill` après le manifeste qu'il lit).
- Turbo : tâche `build:skill` dépendant de `build:manifest`, `inputs` : `scripts/skill/**` et `../../apps/docs/src/content/components/**`, `outputs` : `skills/**` et `llms/**` ; `build` en dépend.
- Tests Vitest dans `scripts/skill/*.test.js` (déjà couverts par l'`include` `scripts/**/*.test.js`, environnement `node`) : rendu pur d'un composant sur fixtures (tableaux, `@cancelable`, sous-composants, conversion MDX, JSX inconnu), test d'intégration sur le vrai CEM (14 fichiers racine, 5 sous-composants rattachés), tests du contrôle (un cas d'échec par règle).
- `npm run dev` ne régénère pas la skill à chaque modification de MDX (comme `dist/`) : `npm run build:skill` à la main.

## Contenu de la première version (zone écrite)

| Fichier                             | Contenu                                                                                                                                                                                                                                                                                                 | Sources lues                                                                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `SKILL.md`                          | Court : ce qu'est Ariane (web components Lit, préfixe `ar-`, alpha), headless et mobile-first, « aucun style sans thème », quel fichier ouvrir selon la tâche                                                                                                                                           | `CLAUDE.md`, `README.md`, `theming/overview`                                                                                                   |
| `references/choosing-components.md` | Arbre de décision par intention en tables (une ligne par composant racine). « Confusions fréquentes » : navigation (dropdown, tab-group, stepper, breadcrumb, pagination), retours (alert, tooltip, dialog), attente (spinner, progressbar), disclosure (collapse)                                      | CEM, MDX (« Utilisation »), jugement du rédacteur (à valider par le mainteneur)                                                                |
| `references/installation.md`        | CDN (`autoloader.js`/`index.js`, variantes `.dev.js`), npm (barrel, import par composant, `/headless`, sous-chemin `utils`), frameworks, préfixe (`ARIANE_CONFIG`, `defineComponent`, `whenAllDefined`), compatibilité (planchers, SSR, popover iOS)                                                    | `quickstart`, `frameworks`, `tag-customization`, `compatibilite`, notes #279/#296/#300                                                         |
| `references/usage.md`               | Attendre le chargement, attributs/propriétés, slots, événements (annulables), méthodes publiques, autocomplétion IDE                                                                                                                                                                                    | `utilisation.astro`                                                                                                                            |
| `references/theming.md`             | Appliquer un thème, tokens `--ar-*`, `::part()` et parts d'état, personnalisation avancée, shadow DOM applicatif (`defaultTheme`) ; structure du thème (`ariane.css` = `@import` de `_palette`, `_semantic-tokens`, `_global-tokens`, `shared/`, `components/`, dans `@layer ariane.theme`), `presets/` | `appliquer-un-theme`, `overview`, `personnalisation-avancee`, `shadow-dom`, `src/styles/themes/ariane.css` et fragments, `src/styles/presets/` |
| `references/i18n.md`                | Traductions, `registerTranslation`, composants localisés (`x-localized`)                                                                                                                                                                                                                                | `traductions.astro`, CEM                                                                                                                       |

Règles d'écriture :

- Tout est tiré d'une source lue. Ce qui relève du jugement (arbre de décision, confusions fréquentes) est signalé comme tel.
- `theming.md` décrit la structure et le contrat (les `cssProperties` des composants), jamais les valeurs de la palette du thème par défaut (choix de design, cf. règle des `@cssprop`). `default-old.css` est ignoré.
- Les `presets/` (`buttons.css`, `fields.css`, exportés via `./presets/*.css`) sont intégrés à `theming.md` après lecture ; leur couverture par la doc actuelle est à constater à l'écriture.
- Pas de lien vers le site de doc (pas de domaine public, #276) : les références pointent vers des fichiers de la skill.
- `description` du `SKILL.md` : situations concrètes en français (écrire ou modifier du HTML avec des balises `ar-*` ; installer ou charger Ariane en CDN, npm ou headless ; thémer des composants Ariane, personnaliser le préfixe) plus quelques termes anglais courants (`web components`, `design system`). Validé avec `skill-creator` sur des demandes en français et en anglais avant d'être figé. Le déclenchement de la skill repose sur le jugement du modèle à partir de la `description` ; aucune mesure de taux de déclenchement en français n'existe à ce jour.

Règles de rédaction (le lecteur est un agent, pas un humain) :

- **Compresser, ne pas recopier.** Les pages de doc sont pédagogiques et narratives, écrites pour un lecteur humain. Les fichiers de la skill en reprennent le contenu sous une forme dense : tables, listes, exemples HTML copiables, règles du type « si le besoin est X, utiliser Y », pièges énoncés directement. Pas de ton marketing, pas d'introduction ni de transition.
- **Concis ne veut pas dire lacunaire.** Un agent ne peut pas poser de question : noms d'attribut, valeurs par défaut et contraintes sont exacts et complets, une phrase vague coûte plus cher qu'une phrase de plus.
- **Un fichier, une tâche.** Chaque référence est chargée à la demande : elle peut être plus longue que `SKILL.md` mais traite un seul sujet. `SKILL.md` route vers les références et ne détaille rien.
- **Longueur.** Aucune cible chiffrée n'est fixée ici (la documentation consultée recommande la concision sans donner de seuil) ; elle est arrêtée à l'écriture avec les conseils des skills `skill-creator` et `writing-skills`.

## Maintenance (trois filets)

1. **Contrôle en CI** (`check:skill`, dans `build`) : dérive structurelle.
2. **Process** : une ligne dans `CLAUDE.md`, une case dans le modèle de PR, une étape dans les skills `ariane-new-component` et `ariane-write-docs` : « si l'API publique, un comportement ou une règle d'usage change, mettre à jour `packages/core/scripts/skill/content/` ».
3. **Relecture à la release** : étape ajoutée à `ariane-create-release` : relire le changelog et la skill, repérer ce que les deux premiers filets ont laissé passer.

## Hors périmètre

- **Skill `ariane-theme`** (création d'un thème ou d'un design system sur Ariane). Skill séparée et non un ajout à `ariane` : déclencheur différent, public différent (auteurs de design system), contenu volumineux (palette, jetons sémantiques et globaux, fragments par composant, règles headless, contraste). Aucune structure à prévoir : `content/` accepte un dossier voisin. Déclencheur : le besoin de rédiger cette skill. WebAwesome sépare de même `webawesome` et `webawesome-design`, mais sa skill de design porte surtout sur la mise en page (`<wa-page>`) qu'Ariane n'a pas. Nom envisagé : `ariane-theme`.
- **Page « Ariane pour les agents IA »** dans la section Ressources du site : relève du site, après la livraison du paquet.
- **Paquet npm dédié** : voir Décisions.
- **Guide formulaires** : la page « Utilisation » n'en traite pas, et seul `ar-datepicker` étend `ArianeFormElement`. Pas de matière à synthétiser aujourd'hui.
- **Plugin / marketplace Claude** : voir Décisions.

## Critères d'acceptation

- `npm run build` génère `skills/ariane/` et `llms/`, et `check:skill` passe.
- Les 14 fichiers composants racine existent, les 5 sous-composants sont des sections de leur parent.
- Ajouter un composant sans MDX fait échouer le générateur ; ajouter un composant sans ligne dans `choosing-components.md` fait échouer le contrôle ; citer un attribut inexistant fait échouer le contrôle.
- `npm pack --dry-run` dans `packages/core` liste `skills/` et `llms/`.
- Le `description` est testé avec `skill-creator` sur des demandes en français et en anglais.
- `CLAUDE.md`, le modèle de PR et les skills `ariane-new-component`, `ariane-write-docs`, `ariane-create-release` mentionnent la mise à jour de la skill.

## Non vérifié

- Que `npx skills add` installe correctement une skill dont le `SKILL.md` renvoie à des fichiers relatifs, et en lien symbolique depuis `node_modules` (annoncé par WebAwesome, pas testé ici). À tester sur un projet vierge avant la release.
- Le type MIME servi par unpkg pour les `.md` et que unpkg sert un dossier hors `dist` et `cdn` déclaré dans `files`.
- Que Turbo restaure `skills/**` et `llms/**` depuis son cache (le cas existe avec `cdn/**`).
- Quelle section de `package.json` porte `gray-matter` à la racine, et si `core` doit le déclarer.
- Taille cible du `SKILL.md` : à fixer à l'écriture (la documentation consultée recommande la concision, sans seuil).
- L'usage de `presets/` dans la doc actuelle.
- Le comportement de Cursor et d'autres outils avec ces skills (annoncé par WebAwesome pour Cursor, non testé).
