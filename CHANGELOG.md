# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et ce projet adhère au [Versionnage Sémantique](https://semver.org/lang/fr/).

> **Note** : Les versions `0.x.x-alpha.x` sont des pré-versions instables.
> L'API publique peut changer sans préavis avant la version `1.0.0`.

> **Historique** : les sections à partir de la prochaine release sont générées depuis les
> Conventional Commits (`npm run changelog`). Les versions `0.1.0-alpha.4` à `0.1.0-alpha.11`
> ne sont pas détaillées ici : voir les [GitHub Releases](https://github.com/jogo-labs/ariane/releases).

---

## [0.1.0-alpha.18](https://github.com/jogo-labs/ariane/compare/v0.1.0-alpha.17...v0.1.0-alpha.18) (2026-10-30)

### Changements incompatibles

- **core:** l'attribut has-error n'est plus reflété (utiliser :state(has-error)) et has-error ne s'applique plus à un champ invalide sans slot error (utiliser :state(user-invalid)). Le conteneur du slot error n'a plus role alert et n'existe que quand le slot est rempli. detail.valid vaut true pour une date plausible hors de min et max, il valait false. Un texte non reconnu rend le champ invalide (badInput) et n'est plus effacé quand le champ avait une valeur.
- **core:** les propriétés CSS --ar-datepicker-input-error-border-color et --ar-datepicker-error-color sont supprimées, remplacées par --ar-input-error-border-color et --ar-input-error-color. Sans thème, un champ en erreur n'a plus de bordure colorée.
- **core:** les termes de traduction validationRangeUnderflow et validationRangeOverflow sont renommés datepickerValidationRangeUnderflow et datepickerValidationRangeOverflow ; les termes datepickerValidationBadInput et datepickerValidationStepMismatch sont ajoutés au type Translation. Une date refusée par isDateDisabled rend maintenant le champ invalide (stepMismatch), saisie à la main ou posée par value ; elle était valide.

### Ajouté

- **core:** ar-datepicker, has-error signale un champ en erreur, badInput et aria-invalid ([#404](https://github.com/jogo-labs/ariane/issues/404))

### Corrigé

- **core:** ar-datepicker, une date refusée par isDateDisabled rend le champ invalide ([#408](https://github.com/jogo-labs/ariane/issues/408))
- **core:** lang réactif sur la base, les textes traduits suivent l'attribut du composant ([#407](https://github.com/jogo-labs/ariane/issues/407)) ([4aafead](https://github.com/jogo-labs/ariane/commit/4aafeada0dc86d1b071bc5f08497b0bef7d913bb))

### Modifié

- **core:** preset fields, un champ aria-invalid prend les tokens d'erreur des composants ([#404](https://github.com/jogo-labs/ariane/issues/404)) ([0137808](https://github.com/jogo-labs/ariane/commit/0137808be77d67136a8ba6949b7066ad3889c488))
- **core:** présentation d'erreur des champs portée par le thème ([#405](https://github.com/jogo-labs/ariane/issues/405)) ([7cd7683](https://github.com/jogo-labs/ariane/commit/7cd7683392f3135c297be251db34740b0f16fe42)), references [#404](https://github.com/jogo-labs/ariane/issues/404)

## [0.1.0-alpha.17](https://github.com/jogo-labs/ariane/compare/v0.1.0-alpha.16...v0.1.0-alpha.17) (2026-10-23)

### Corrigé

- **core:** ar-charcounter restaure son id dans aria-describedby quand le gabarit le réécrit ([#395](https://github.com/jogo-labs/ariane/issues/395)) ([7420e9a](https://github.com/jogo-labs/ariane/commit/7420e9aec9d7fad0d92e74996814c50f11adce70)), closes [#394](https://github.com/jogo-labs/ariane/issues/394)

## [0.1.0-alpha.16](https://github.com/jogo-labs/ariane/compare/v0.1.0-alpha.15...v0.1.0-alpha.16) (2026-10-22)

### Corrigé

- **core:** le paquet publié contient ses déclarations TypeScript (l'alpha.15 en était dépourvue), garde-fou check:package ([#391](https://github.com/jogo-labs/ariane/issues/391)) ([#392](https://github.com/jogo-labs/ariane/issues/392)) ([9da33a3](https://github.com/jogo-labs/ariane/commit/9da33a3ecdfd84d2c388436378b7b72075723daf))

## [0.1.0-alpha.15](https://github.com/jogo-labs/ariane/compare/v0.1.0-alpha.14...v0.1.0-alpha.15) (2026-10-22)

### Changements incompatibles

- **core:** l'attribut `for` de ar-tooltip, ar-dropdown et ar-collapse est renommé `trigger-id` (propriété `triggerId`) ; les propriétés `for` d'ar-charcounter et `readonly` d'ar-datepicker deviennent `htmlFor` et `readOnly` (leurs attributs ne changent pas).
- **core:** l'attribut et la propriété urgent d'ar-alert sont supprimés ; utiliser
  l'attribut role standard (role="alert" ou role="status"). Un role posé par l'application n'est
  plus écrasé par le composant.
- **core:** la langue de repli passe du français à l'anglais : une langue sans traduction
  s'affiche en anglais.
- **core:** la part sort-button--pending d'ar-table-sort est retirée, cibler :state(pending)::part(sort-button) à la place.
- **core:** le champ dialog d'ar-dialog devient privé (_dialog), il n'est plus exposé.
  Les événements shown, hidden et les -prevented ne sont plus annulables.
- **core:** Translation est désormais partiel (lire un terme d'un objet Translation donne
  string | undefined) ; utiliser FullTranslation pour des termes toujours présents.
- **core:** les exports `./themes/*.css` et `./themes/*.js` sont retirés du paquet npm (thème interne), ainsi que les utilitaires de test ; le thème de départ est celui du starter-kit.
- **core:** l'export `./presets/*.css` est retiré du paquet npm ; les presets (`buttons.css`, `fields.css`) sont distribués par le starter-kit.

### Ajouté

- **core:** ar-alert écrit role sans écraser celui de l'application, urgent supprimé ([#334](https://github.com/jogo-labs/ariane/issues/334)), references [#143](https://github.com/jogo-labs/ariane/issues/143) [#352](https://github.com/jogo-labs/ariane/issues/352)
- **core:** ar-datepicker, pending et événement view-change ([#330](https://github.com/jogo-labs/ariane/issues/330)) ([#364](https://github.com/jogo-labs/ariane/issues/364)) ([99b427a](https://github.com/jogo-labs/ariane/commit/99b427ad01019b37a45614ad523afa5efb7d5a19))
- **core:** ar-dialog, pending, report de fermeture et réouverture ([#329](https://github.com/jogo-labs/ariane/issues/329)) ([#368](https://github.com/jogo-labs/ariane/issues/368)) ([43aa4f2](https://github.com/jogo-labs/ariane/commit/43aa4f2e9d873473956c4050783955094b9284f6))
- **core:** ar-dropdown, événement ar-dropdown-select ([#333](https://github.com/jogo-labs/ariane/issues/333)) ([#367](https://github.com/jogo-labs/ariane/issues/367)) ([4bbea0c](https://github.com/jogo-labs/ariane/commit/4bbea0cf4bea5881e399aac80474bc9e1094431d))
- **core:** ar-pagination, pending et corrections d'intégration framework ([#327](https://github.com/jogo-labs/ariane/issues/327)) ([#361](https://github.com/jogo-labs/ariane/issues/361)) ([fd2b707](https://github.com/jogo-labs/ariane/commit/fd2b707007085bdf0deb3f85ff7bac1828d34f5f))
- **core:** ar-stepper, attente automatique et corrections d'intégration framework ([#328](https://github.com/jogo-labs/ariane/issues/328)) ([#363](https://github.com/jogo-labs/ariane/issues/363)) ([7aea39e](https://github.com/jogo-labs/ariane/commit/7aea39e07307669bc7d12d9e54c522ec1f6b0e9e))
- **core:** ar-table-sort, modèle contrôlé et reset() ([#331](https://github.com/jogo-labs/ariane/issues/331)) ([#365](https://github.com/jogo-labs/ariane/issues/365)) ([2015b22](https://github.com/jogo-labs/ariane/commit/2015b220033e3853a196e255cde997ea7d342b09))
- **core:** ArianeFormElement porte propriétés, validation et réinitialisation ([#325](https://github.com/jogo-labs/ariane/issues/325)) ([7e7966e](https://github.com/jogo-labs/ariane/commit/7e7966ea12ba0a41d53413d299db415a0476c603))
- **core:** états required, optional, user-invalid et user-valid des champs ([#360](https://github.com/jogo-labs/ariane/issues/360)) ([#384](https://github.com/jogo-labs/ariane/issues/384)) ([9383f70](https://github.com/jogo-labs/ariane/commit/9383f70a54d8d7e70efaba55be490899251ec87c))
- **core:** reflète en attribut 14 réglages primitifs ([#374](https://github.com/jogo-labs/ariane/issues/374)) ([#375](https://github.com/jogo-labs/ariane/issues/375)) ([a5c7f49](https://github.com/jogo-labs/ariane/commit/a5c7f4938ee6c379ba2848829fff888bc2e2c669))
- **core:** Translation tolérant, repli en anglais et message de validité localisé ([#335](https://github.com/jogo-labs/ariane/issues/335))
- **core:** trigger-id, htmlFor et readOnly, tableau d'API à deux noms ([#380](https://github.com/jogo-labs/ariane/issues/380)) ([#383](https://github.com/jogo-labs/ariane/issues/383))
- **core:** types générés depuis le CEM, sous-chemins react et vue, ARIANE_CONFIG ([#336](https://github.com/jogo-labs/ariane/issues/336)) ([#371](https://github.com/jogo-labs/ariane/issues/371)) ([e8d44b9](https://github.com/jogo-labs/ariane/commit/e8d44b9d4f9a18fc13b4085e010e2136dd19d407))

### Corrigé

- **core:** ar-charcounter suit les valeurs posées par programme, refresh(), reset ([#332](https://github.com/jogo-labs/ariane/issues/332)) ([997ed1e](https://github.com/jogo-labs/ariane/commit/997ed1eb2d7edbd6847823645dde594f3fcb5ebe)), references [#339](https://github.com/jogo-labs/ariane/issues/339) [#341](https://github.com/jogo-labs/ariane/issues/341)
- **core:** ar-datepicker, événements natifs et corrections de comportement ([#326](https://github.com/jogo-labs/ariane/issues/326)) ([#359](https://github.com/jogo-labs/ariane/issues/359)) ([d5d091f](https://github.com/jogo-labs/ariane/commit/d5d091f5c323411a1c3a867b3448035b06875a94))
- **core:** ar-tab-group rattache les onglets existants, respecte les id de l'application ([#324](https://github.com/jogo-labs/ariane/issues/324)) ([41e329b](https://github.com/jogo-labs/ariane/commit/41e329bfa758a27aa5f2d29b2a79f66ed47797a2))
- **core:** l'autoloader CDN charge les éléments imbriqués dans un nœud ajouté ([#386](https://github.com/jogo-labs/ariane/issues/386)) ([#387](https://github.com/jogo-labs/ariane/issues/387)) ([b6c7c14](https://github.com/jogo-labs/ariane/commit/b6c7c14a17b58893e497cd6281257d6db2602272))
- **core:** l'import de la librairie ne lève plus côté serveur ([#323](https://github.com/jogo-labs/ariane/issues/323)) ([2093c93](https://github.com/jogo-labs/ariane/commit/2093c9355bd0310e2c0516b0e41847359ed18134))
- **core:** paquet npm sans thème interne ni utilitaires de test ([#337](https://github.com/jogo-labs/ariane/issues/337)) ([8aab50c](https://github.com/jogo-labs/ariane/commit/8aab50ceaf4c450ccc36be8100f41896fb5f5df9))
- **core:** presets CSS retirés du paquet npm, distribués par le starter-kit ([#355](https://github.com/jogo-labs/ariane/issues/355)) ([b7544dc](https://github.com/jogo-labs/ariane/commit/b7544dc81c916276552bdb06b1e5940a95d20eef))

## [0.1.0-alpha.14](https://github.com/jogo-labs/ariane/compare/v0.1.0-alpha.13...v0.1.0-alpha.14) (2026-10-09)

### Ajouté

- **core:** detail typé avec id sur les 43 événements, affiché dans la doc ([#308](https://github.com/jogo-labs/ariane/issues/308)) ([#316](https://github.com/jogo-labs/ariane/issues/316)) ([0159224](https://github.com/jogo-labs/ariane/commit/01592248cb4a63ee3703b8ce8006d0322af48d02))
- **core:** entrées CDN utils pour whenAllDefined et registerTranslation ([#305](https://github.com/jogo-labs/ariane/issues/305)) ([#315](https://github.com/jogo-labs/ariane/issues/315)) ([297633e](https://github.com/jogo-labs/ariane/commit/297633e8a09b0fe7c0216b0b37c4c7fad8a2c407))
- **core:** skill ariane et llms.txt pour consommer Ariane ([#264](https://github.com/jogo-labs/ariane/issues/264)) ([#303](https://github.com/jogo-labs/ariane/issues/303)) ([558785c](https://github.com/jogo-labs/ariane/commit/558785c33607b0b0a04344ce292ad43e4795c7ce))
- **core:** token --ar-color-border-strong pour les contours de contrôles (3:1), bordure d'erreur du datepicker ([#310](https://github.com/jogo-labs/ariane/issues/310), [#312](https://github.com/jogo-labs/ariane/issues/312)) ([#311](https://github.com/jogo-labs/ariane/issues/311)) ([707d851](https://github.com/jogo-labs/ariane/commit/707d851bb822d467e59ae8ad099e82095b01e66f))

### Corrigé

- **core:** build:bundles ne retire plus custom-elements.json, build:types après les bundles ([#313](https://github.com/jogo-labs/ariane/issues/313)) ([#314](https://github.com/jogo-labs/ariane/issues/314)) ([423142a](https://github.com/jogo-labs/ariane/commit/423142a9258254e7b214a2529a22fc36486a4809))
- **core:** manifest déterministe, check:cdn plus strict ([#321](https://github.com/jogo-labs/ariane/issues/321)) ([d0ff0ef](https://github.com/jogo-labs/ariane/commit/d0ff0efe14d94e9975d5ab031618588b2613f0c3))

## [0.1.0-alpha.13](https://github.com/jogo-labs/ariane/compare/v0.1.0-alpha.12...v0.1.0-alpha.13) (2026-10-01)

### Corrigé

- **core:** les points d'entrée qui enregistrent honorent ARIANE_CONFIG.prefix ([#296](https://github.com/jogo-labs/ariane/issues/296)) ([#299](https://github.com/jogo-labs/ariane/issues/299)) ([00aae44](https://github.com/jogo-labs/ariane/commit/00aae4431d10350f866478b3494c2e1908596b4a))
- **table-sort:** tooltip interne sous un tag privé, plus d'ar-tooltip enregistré à l'import ([#295](https://github.com/jogo-labs/ariane/issues/295)) ([#298](https://github.com/jogo-labs/ariane/issues/298)) ([3765f3f](https://github.com/jogo-labs/ariane/commit/3765f3feafa1ef715f3a3afdf078dc8da4e6d345))

## [0.1.0-alpha.12](https://github.com/jogo-labs/ariane/compare/v0.1.0-alpha.11...v0.1.0-alpha.12) (2026-09-30)

### Ajouté

- **core:** sous-path @ariane-ui/core/utils sans effet de bord ([#272](https://github.com/jogo-labs/ariane/issues/272)) ([e86f3a9](https://github.com/jogo-labs/ariane/commit/e86f3a9969ba538951d1e4c7390a1af03a44b697)), references [#267](https://github.com/jogo-labs/ariane/issues/267)

### Corrigé

- **ci:** validate-no-hardcoded-tokens détecte les fallbacks var() à imbrication profonde ([#274](https://github.com/jogo-labs/ariane/issues/274)) ([7d5ed67](https://github.com/jogo-labs/ariane/commit/7d5ed67d6d10f9da46d171cb0e90ce39dc5c75d2))
- **core:** whenAllDefined accepte { prefix, root } et parcourt les shadow roots ([#271](https://github.com/jogo-labs/ariane/issues/271)) ([b496d61](https://github.com/jogo-labs/ariane/commit/b496d618c8bad7e82787e6e34f02616bbb7fd1c3))
- **panel:** masque les panneaux flottants par défaut, sans dépendre de :popover-open ([#283](https://github.com/jogo-labs/ariane/issues/283)) ([#290](https://github.com/jogo-labs/ariane/issues/290)) ([810c634](https://github.com/jogo-labs/ariane/commit/810c6348d29cf03b8197337c749f5e2a912b9033))
- **popover:** ferme le panneau au tap extérieur sur Safari iOS < 18.3 ([#283](https://github.com/jogo-labs/ariane/issues/283)) ([#289](https://github.com/jogo-labs/ariane/issues/289)) ([d007add](https://github.com/jogo-labs/ariane/commit/d007addfca6f21ed40ce790ee2755dae1bd692f1))
- rend ar-breadcrumb importable sans window et tolère les états sans tirets ([#282](https://github.com/jogo-labs/ariane/issues/282)) ([#286](https://github.com/jogo-labs/ariane/issues/286)) ([a75ebc8](https://github.com/jogo-labs/ariane/commit/a75ebc8e637acf56420867525a67c7d423b7f6d4))

## [0.1.0-alpha.3] — 2026-03-26

### Supprimé

- **`ar-button`** — retiré de la librairie (réplique un natif `<button>` sans apport a11y)

### Modifié

- **Tokens CSS** — refonte complète du système de design tokens :
    - Palette brute unifiée sur des stops `05→95` en oklch (`--ar-color-primary-*`, `--ar-color-neutral-*`, etc.)
    - Ajout des palettes orange, cyan, indigo, purple, pink
    - Tokens sémantiques d'état (`--ar-color-info-bg`, `--ar-color-success-text`…)
    - Migration de tous les composants vers les tokens sémantiques (plus de couleurs hardcodées)
    - Attribut `dark` supprimé de `ar-breadcrumb` — les composants suivent désormais le mode système

### Ajouté (documentation)

- Landing page avec hero, motif de fond et deux CTA
- Section "Bien démarrer" : pages Installation et Utilisation
- Page Design Tokens : grille palette complète + sous-sections sémantiques avec swatches
- Swatches couleur dans la référence API des composants et la page Design Tokens
- Migration Astro 6 + Node 22

### Corrigé

- Playground interactif non fonctionnel (script exécuté avant le DOM)
- Liens vers composant parent (`ar-stepper-item` → `ar-stepper`) cassés dans la doc
- Dark mode : couleurs hardcodées remplacées par des variables `--doc-*`
- Spinner : hérite de `currentColor` par défaut

---

## [0.1.0-alpha.1] — 2026-03-17

Première pré-version publique de Ariane. Les composants sont fonctionnels
mais l'API n'est pas encore stabilisée.

### Ajouté

- **`ar-alert`** — Composant d'alerte avec variants `info`, `success`, `warning`, `error`
- **`ar-breadcrumb`** — Fil d'Ariane avec support mobile (collapse), slotté via `<ar-breadcrumb-item>`
- **`ar-breadcrumb-item`** — Élément enfant de `ar-breadcrumb`
- **`ar-button`** — Bouton avec variants `primary`, `secondary`, `outline`, `ghost`, `danger` et tailles `sm`, `md`, `lg`
- **`ar-pagination`** — Composant de pagination avec navigation par pages
- **`ar-progressbar`** — Barre de progression avec valeur et label accessibles
- **`ar-spinner`** — Indicateur de chargement animé
- **`ar-stepper`** — Étapes de progression avec contexte parent/enfant
- **`ar-stepper-item`** — Étape individuelle enfant de `ar-stepper`
- Site de documentation Astro avec playground interactif, référence API et design tokens
- Distribution CDN (bundle auto-contenu) et npm (ESM tree-shakeable)
- Thème CSS personnalisable via CSS Custom Properties (`--mr-color-*`, `--mr-*`)

### Infrastructure

- Monorepo npm workspaces + Turborepo
- Build dual : ESM (`dist/`) + CDN bundle (`cdn/`)
- Génération automatique du Custom Elements Manifest (CEM)
- Tests unitaires Vitest + happy-dom
- CI GitHub Actions (lint, build, test) ; release déclenchée par tag `v*.*.*`
- Conventional Commits + commitlint + Husky

---

<!-- Les versions futures seront ajoutées ici, en tête de fichier. -->
