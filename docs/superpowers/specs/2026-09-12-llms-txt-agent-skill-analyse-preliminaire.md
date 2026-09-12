# Analyse préliminaire — `llms.txt` + Agent Skill pour consommer Ariane

**Date :** 2026-09-12
**Statut :** Exploration — aucune décision prise, aucune page/fichier livrable créé
**Scope :** Réflexion sur le contenu à générer, pas encore l'implémentation

---

## Contexte

Objectif : permettre à un LLM (Claude Code, Cursor, Copilot, agents génériques…) d'utiliser
correctement Ariane dans **le projet d'un consommateur externe** — pas dans ce monorepo.
C'est un artefact orienté "aide à l'intégration", à distinguer des skills déjà présentes dans
`.claude/skills/` (`ariane-new-component`, `ariane-write-docs`), qui aident à **contribuer à**
Ariane, pas à **consommer** Ariane.

Référence citée : [webawesome.com/docs/ai](https://webawesome.com/docs/ai) — Web Awesome
(ex-Shoelace) publie à la fois un `llms.txt` et un Agent Skill, avec cette note explicite :
« si votre outil IA supporte les Agent Skills, utilisez la skill pour une meilleure efficacité
de contexte ; sinon `llms.txt` fonctionne avec presque n'importe quel outil ». Leur `llms.txt`
est généré automatiquement (constaté sur la discussion GitHub qui a lancé le chantier côté
Web Awesome, cf. Sources) et couvre par composant : tag HTML, statut/version, slots, props/
attributs avec types et défauts, méthodes, événements, custom properties CSS, CSS parts,
composants dépendants, instructions d'import CDN/NPM/React.

Spec de référence pour le format : [llmstxt.org](https://llmstxt.org/) — un Markdown avec
un H1 (nom du projet), un blockquote de résumé, puis des sections H2 groupant des liens
`[Titre](URL): description`. Deux variantes normalisées :

- `/llms.txt` — index de navigation léger (structure du site).
- `/llms-full.txt` — toute la documentation inlinée dans un seul fichier.

---

## Ce qu'on a déjà, qui change la donne

Le CEM (`packages/core/dist/custom-elements.json`, généré par
`cem analyze --config cem.config.js`) est **déjà** la source de vérité pour la doc, les
intégrations IDE (VS Code/JetBrains) et les wrappers framework (React/Vue) — cf. l'en-tête de
`packages/core/cem.config.js`. Ajouter `llms.txt` comme un consommateur de plus de cette même
donnée est dans la continuité directe de ce qui existe, pas un nouveau chantier de collecte.

Pour un composant (`ar-alert` vérifié en exemple), le CEM contient déjà : `tagName`,
`description`/`summary`, `attributes` (type, défaut, description), `slots`, `events`,
`cssProperties`, `cssParts`, `members` publics (méthodes), plus des extensions maison :

- `x-display` (`demo`/`docs`, annotation `@display`)
- `x-parent` (annotation `@parent`, lien vers un composant parent — ex. `ar-dropdown-item`)
- `x-localized` (annotation `@localized`)

Le MDX par composant (`apps/docs/src/content/components/*.mdx`) ajoute ce que le CEM ne peut
pas exprimer : la prose (accessibilité — ce qui est pris en charge automatiquement vs à la
charge du consommateur, patterns d'usage, pièges), et surtout les **variantes** en
frontmatter (`variants: [{ name, label, description, html }]`) — des exemples HTML déjà
rédigés, testés, affichés dans le Playground. Ce sont des exemples "copier-coller" tout
trouvés pour un `llms.txt`/une skill, pas à réécrire.

Autrement dit : la donnée existe déjà à deux niveaux complémentaires —
**CEM = surface d'API factuelle**, **MDX = guidance d'usage + exemples**. Aucun des deux
seuls ne suffit à produire un contenu utile pour un LLM ; il faut les deux.

---

## Trois artefacts, pas un seul

### 1. `llms.txt` (index)

Un fichier léger, format `llmstxt.org` : présentation d'Ariane (philosophie headless,
mobile-first, naming `ar-*`), puis une liste de liens vers les pages de doc existantes
(`/getting-started/*`, `/theming/*`, une entrée par composant). Utile comme point d'entrée
pour un outil qui sait suivre des liens ; peu utile seul pour un outil qui ne peut faire
qu'une requête (la plupart des intégrations actuelles chargent le fichier une fois, sans
crawler les liens).

### 2. `llms-full.txt` (référence complète inlinée)

Un seul fichier avec, pour chaque composant : tag, statut de maturité (alpha/stable — donnée
déjà présente ailleurs dans le repo, cf. badges `.status-alpha`/`.status-stable`), résumé,
attributs/slots/events/CSS custom properties/CSS parts en tableau, méthodes publiques, 1-2
exemples HTML tirés des `variants` MDX, et les notes d'accessibilité clés (condensées, pas
la prose complète). C'est la partie **mécaniquement générable** depuis CEM + frontmatter MDX
— un script, pas de rédaction manuelle après la mise en place initiale.

Ce fichier doit aussi couvrir le **transversal**, qui n'existe dans aucune page composant
individuelle : comment charger un thème, comment installer (CDN vs npm vs framework),
convention de préfixe des tags personnalisable, mécanisme i18n/traductions, ce que "headless"
implique concrètement pour l'intégrateur (pas de style sans `themes/default.css`).

### 3. Agent Skill (`SKILL.md` + fichiers de référence)

C'est là que la remarque de la discussion précédente prend tout son sens : **une skill est
plus utile que le fichier plat SEULEMENT si son contenu de référence est lui-même dans un
format réutilisable ailleurs.** Concrètement :

- `SKILL.md` : court, toujours chargé — philosophie du design system, conventions
  transversales, arbre de décision "quel composant pour quel besoin" (ex. `ar-dropdown` vs
  `ar-tab-group` vs `ar-stepper` pour de la navigation), pointeurs vers les fichiers de
  référence détaillés (progressive disclosure — c'est le pattern déjà utilisé par les skills
  installées dans cette session, ex. `artifact-capabilities`).
- `reference/<composant>.md` (un par composant, ou un fichier consolidé si le volume reste
  raisonnable) : chargé à la demande, généré depuis CEM + MDX — **le même contenu que
  `llms-full.txt`, juste découpé par fichier** plutôt qu'inliné en un bloc.

Un seul script de génération peut donc produire les deux sorties depuis la même donnée
intermédiaire (par composant : tag, description, attributs, slots, events, CSS props/parts,
exemples, notes a11y condensées) : assemblée en un featured "un seul fichier concaténé" →
`llms.txt`/`llms-full.txt` ; assemblée en "un fichier par composant" → `reference/` de la
skill. Écrire une fois, publier deux fois — pas de duplication de contenu à maintenir à la
main des deux côtés.

---

## Différences à ne pas gommer

|              | `llms.txt` / `llms-full.txt`                                                      | Agent Skill                                                                           |
| ------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Portabilité  | N'importe quel outil qui sait lire du texte/une URL                               | Claude Code / claude.ai uniquement (à ce jour)                                        |
| Distribution | Servi sur le site de doc (`/llms.txt`), potentiellement copié dans le package npm | Plugin/marketplace Claude, ou dossier à copier dans `.claude/skills/` du consommateur |
| Chargement   | Tout ou rien (un fichier, ou index + fetch des pages liées)                       | Progressif — `SKILL.md` léger toujours chargé, détails chargés à la demande           |
| Fraîcheur    | Doit être régénéré à chaque release et republié                                   | Idem, mais versionnable comme un plugin (le consommateur peut figer une version)      |

Le format "compatible multi-plateforme" mentionné dans l'échange précédent, c'est le contenu
intermédiaire par composant (Markdown structuré, sans rien de spécifique à Claude) — pas la
skill elle-même, qui reste un emballage propriétaire par-dessus.

---

## Pipeline de génération envisageable

```
custom-elements.json (CEM)  ─┐
                              ├─→ script de génération ─→ contenu intermédiaire par composant
*.mdx (frontmatter+prose)   ─┘         (Markdown structuré, un objet par composant)
                                              │
                                              ├─→ concaténation ─→ llms.txt / llms-full.txt
                                              └─→ un fichier par composant ─→ reference/*.md (skill)
```

S'accrocherait naturellement à `npm run build:manifest` (packages/core) ou à un script
dédié dans `apps/docs` qui tourne après le build du CEM — à l'image de
`apps/docs/scripts/check-manifest.js` (`predev`), qui lit déjà le CEM pour la doc.

---

## Questions ouvertes (à trancher avant toute implémentation)

1. **Langue.** Le CEM et les MDX sont entièrement en français aujourd'hui (cf. l'analyse i18n
   du 2026-03-30, toujours en l'état). Un `llms.txt` public, consommé par des outils IA
   majoritairement entraînés sur de la doc anglaise, gagnerait probablement à être en anglais
   — ce qui rouvre la question i18n, indépendamment de ce chantier.
2. **Où est servi `llms.txt`/`llms-full.txt`.** Racine du site de doc uniquement, ou aussi
   copié dans le package npm publié (utile pour un outil qui lit `node_modules` plutôt que le
   site web) ?
3. **Fraîcheur/versioning.** Ariane est en alpha, API instable (bandeau déjà présent sur le
   site) — `llms.txt` doit refléter la version publiée, pas `dev`. À arrimer au pipeline de
   release existant (tag `vX.Y.Z` → CI npm + GitHub Release, cf. `CLAUDE.md`).
4. **Granularité de la skill.** Un `reference/` par composant (progressive disclosure
   maximale) vs un seul fichier consolidé (plus simple à maintenir, mais moins économe en
   contexte si la skill grossit avec le nombre de composants — actuellement 14).
5. **Distribution de la skill.** Rien dans l'écosystème Claude ne documente encore un
   mécanisme de "skill publiée avec un package npm" comparable à un registre — à défaut,
   probablement un dossier versionné dans le repo (`.claude-plugin/` ou équivalent) que les
   consommateurs copient ou référencent manuellement, en attendant mieux.
6. **Contenu transversal vs par-composant.** Le "quel composant pour quel besoin" (arbre de
   décision) n'existe nulle part dans le repo aujourd'hui sous forme structurée — il faudra le
   rédiger à la main, ce n'est pas générable depuis le CEM/MDX existants.

---

## Sources

- [LLMs | Web Awesome](https://webawesome.com/docs/resources/llms)
- [Provide a `llms.txt` for code generation · shoelace-style/webawesome · Discussion #1100](https://github.com/shoelace-style/webawesome/discussions/1100)
- [The /llms.txt file, v2 – llms-txt](https://llmstxt.org/)
