# Personnalisation de thème — version allégée (#120)

## Contexte et pivot

Ce document **remplace** `docs/superpowers/specs/2026-07-22-theme-configurator-design.md` (configurateur interactif : contrôles par token, preview live, export CSS, persistance `localStorage`).

Cette version a été entièrement implémentée sur la branche `feat/theme-configurator-120` (11 tâches, revue finale "Ready to merge"), puis testée en conditions réelles. L'usage réel a révélé un volume important de défauts structurels :

- Contrôles inadaptés (select à un seul choix pour `currentColor`/easing, color picker qui ne gère ni les références `var()` ni `oklch()`/`color-mix()`).
- Preview par composant insuffisante (un seul variant statique, pas de vraie interactivité) ou carrément dégradée (`dropdown` moche vs sa démo, `dialog` visible seulement en modal).
- Mode dark non éditable dans l'UI malgré sa présence dans le modèle de données.
- Reset qui recharge la page entière au lieu d'un reset ciblé.
- Tokens documentés mais sans effet visuel réel, ou tokens d'un composant référencés directement par un autre sans être exposés dans son propre groupe.

En creusant ces symptômes, un **bug critique indépendant** a aussi été trouvé et corrigé séparément (PR #124) : le garde-fou CI `validateCssPropertyCoverage` était silencieusement désactivé depuis son introduction (un commentaire de `default.css` contenait littéralement le marqueur regex recherché) — cf. mémoire projet `project_dark_mode_marker_bug`.

Face à ce volume de défauts, la question posée n'était plus "comment corriger l'éditeur" mais "l'éditeur interactif est-il la bonne réponse". Comparaison avec **Lion** (ing-bank), librairie headless proche philosophiquement : Lion ne fournit ni thème de démo, ni tokens de design par défaut, ni aucun outil de configuration interactif — le theming y est **entièrement** la responsabilité du consommateur, documenté comme référence statique (vérifié sur leur documentation actuelle, y compris la version `/next`). Ariane va déjà plus loin que Lion en fournissant `default.css` comme thème de démo complet ; la question n'est pas d'aller plus loin (éditeur visuel) mais de documenter clairement ce point de départ.

**Décision** : abandonner l'éditeur interactif. Le besoin réel ("partir de `default.css` pour construire son propre thème") est satisfait par une simple documentation + un lien de téléchargement, pas par un outil.

## Périmètre

- **Suppression** de `apps/docs/src/pages/foundations/tokens.astro` (déjà prévue dans la version précédente, toujours pertinente : présentait `default.css` comme LE thème du composant, contraire au headless).
- **Suppression** de la section nav "Fondations" dans `SiteNav.astro` (elle n'hébergeait que cette page).
- **Pas de nouvelle page, pas de nouveau lien de nav.** La page `apps/docs/src/pages/getting-started/utilisation.astro` a déjà une section "Design Tokens" (`id="tokens"`, lignes 133-147) qui pointait vers la page supprimée — elle est modifiée sur place :
    - Le texte est enrichi pour rappeler explicitement que `default.css` est un thème de démo remplaçable (même registre que la section "Modèle headless" juste au-dessus dans la même page), pas des valeurs par défaut intrinsèques aux composants.
    - Le lien mort vers l'ancienne page est remplacé par un bouton/lien **"Télécharger default.css"**.
- **Mécanisme de téléchargement** : un endpoint statique Astro (`apps/docs/src/pages/downloads/default.css.ts`, export `GET`) lit `packages/core/src/styles/themes/default.css` au moment du build et le sert tel quel à l'URL `/downloads/default.css` (`Content-Type: text/css`) — pattern Astro standard pour générer un asset statique depuis une source de données au build (déjà utilisé ailleurs pour des sitemaps/flux RSS), plus robuste qu'une copie manuelle vers `public/` (pas de dépendance à l'ordre d'exécution des étapes de build). Toujours synchronisé avec le code source local, sans dépendre d'une publication npm ni d'un CDN externe.
- **Aucun contrôle interactif, aucune fusion CEM ∙ default.css, aucun color picker, aucune preview live, aucune persistance, aucun export généré côté client.** Tout ce qui a été construit pour la version interactive (`build-theme-manifest.ts`, `ThemeTokenControl.astro`, le script client, etc., sur `feat/theme-configurator-120`) est abandonné avec cette branche.

## Hors périmètre (tracé séparément)

- **Audit des tokens exposés par composant** (tokens sans effet visuel réel, dépendances croisées non documentées entre composants) — issue GitHub [#125](https://github.com/jogo-labs/ariane/issues/125), chantier futur indépendant.
- Le bug du garde-fou CI (`validateCssPropertyCoverage` désactivé) — déjà corrigé, PR [#124](https://github.com/jogo-labs/ariane/pull/124), indépendant de ce chantier.

## Devenir de la branche `feat/theme-configurator-120`

Abandonnée (à discarder) une fois ce document validé — son contenu (spec, plan, implémentation) reste consultable dans l'historique git mais n'est plus le chantier actif. Le refactor `buildPlaygroundHtml`/`[slug].astro` qu'elle contenait (comportement préservé, testé, revu) n'a plus de consommateur une fois l'éditeur abandonné — non repris ici (YAGNI : pas de justification à le maintenir sans usage).

## Tests

- Vérification manuelle du build docs (`npm run build --workspace=@ariane-ui/docs`) : page `utilisation` généré correctement, asset `downloads/default.css` présent et son contenu correspond à `packages/core/src/styles/themes/default.css`.
- Pas de test automatisé dédié : changement de contenu statique (Astro + un fichier copié au build), pas de logique à tester unitairement.
