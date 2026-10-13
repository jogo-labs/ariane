# ar-alert : rôle par défaut via `ElementInternals`, suppression d'`urgent` (#334)

Issue : jogo-labs/ariane#334. Constat du laboratoire d'intégration : S-014 (`urgent` booléen à trois états inexprimable en HTML et mal converti par Vue), S-034 (écriture de `role` sur l'hôte avant l'hydratation React). Décisions du tri : `ariane-integration-lab/reports/SYNTHESIS.md` §6.

## Objectif

Remplacer le contrôle propriétaire `urgent` par le mécanisme natif de la plateforme : le composant pose un rôle **par défaut** dans `ElementInternals.role`, et l'auteur du HTML peut le remplacer avec l'attribut `role` standard. Plus de vocabulaire propre à Ariane, plus d'écriture d'attribut par le composant, donc plus d'ambiguïté en Vue, Angular ou React.

## Contexte vérifié

- Dans `alert.ts`, `_updateRole()` écrit `this.role` (donc l'attribut `role` de l'hôte). Le composant ne peut pas distinguer un `role` écrit par l'auteur de celui qu'il a posé : la refonte #143 s'est contentée d'un avertissement de développement (`_hadAuthoredRole`) et a créé `urgent`.
- `urgent?: boolean` a trois états (`undefined` = déduit de `variant`, `true` = `alert`, `false` = `status`). Par attribut, seuls `undefined` et `true` sont exprimables. Vue affecte la propriété `el.urgent = ""` (le type de départ est `undefined`, pas booléen), donc `<ar-alert urgent>` donne `status`.
- Mesuré dans Chromium (arbre d'accessibilité réel via CDP, composant factice) : avec `internals.role = 'alert'`, l'arbre expose `alert` ; un attribut `role="status"` l'emporte ; son retrait restaure le défaut ; `role="none"` l'emporte aussi. Documentation MDN : `ElementInternals.role` est disponible dans tous les navigateurs majeurs depuis octobre 2023.
- **Non vérifié** : l'annonce effective par les lecteurs d'écran d'un rôle posé par `ElementInternals` (VoiceOver, NVDA, JAWS), et le comportement dans l'arbre d'accessibilité de WebKit et de Firefox (Playwright ne l'expose pas ; `ariaSnapshot` est calculé depuis le DOM et ne voit pas les internals). Un expert en accessibilité confirme, de mémoire, que les lecteurs d'écran le prennent en compte ; il veut le vérifier sur le composant. D'où la page de test manuel `apps/docs/public/manual-tests/alert-role.html` (temporaire, servie par le déploiement Vercel de la branche) et la condition d'acceptation ci-dessous.
- Pour une alerte insérée dynamiquement, seul `role="alert"` est annoncé de façon fiable à l'insertion (TetraLogical). Ce point est indépendant du mécanisme (attribut ou internals) : suivi dans #346.

## Décisions

| Sujet                   | Décision                                                                                                                                                              |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rôle par défaut         | `this.internals.role` : `error` et `warning` → `alert`, `success`, `info` et tout autre variant → `status`.                                                           |
| Surcharge               | L'attribut `role` standard écrit par l'auteur remplace le défaut (règle de la plateforme). Le composant n'écrit plus jamais l'attribut `role`.                        |
| `without-notification`  | Conservé : met `internals.role` à `null` (aucun rôle par défaut). Un attribut `role` écrit par l'auteur reste de sa responsabilité.                                   |
| `urgent`                | **Supprimé** : propriété, attribut, converter, documentation. Pas de `warnDeprecated` (alpha, `CLAUDE.md`).                                                           |
| Avertissement de #143   | Retiré (`_hadAuthoredRole` et son `warn`).                                                                                                                            |
| Changement incompatible | Oui (retrait d'`urgent`). Footer `BREAKING CHANGE` dans le message de squash.                                                                                         |
| Repli                   | Si la vérification manuelle montre que l'annonce échoue, **ne pas supprimer `urgent`** : revenir à l'accesseur qui traite `""` comme `true` et abandonner cette voie. |

## Conception

### `src/components/alert/alert.ts`

- `_updateRole()` : `if (this.withoutNotification) { this.internals.role = null; return; }` puis `this.internals.role = ArAlert._ROLE_BY_VARIANT[this.variant] ?? 'status'`. Tolère `this.internals` absent (happy-dom n'implémente pas `attachInternals`), comme `toggleState`.
- Déclenchement : `variant` et `withoutNotification` changent (`updated`/`willUpdate`), plus le premier rendu. `internals` est créé dans `connectedCallback` de `ArianeElement`, avant le premier `updated`.
- Suppression : `urgent`, son `@property` et son converter, `_hadAuthoredRole`, le `warn` associé, la constante de message.
- JSDoc de classe : documenter le rôle par défaut, la surcharge par `role`, `without-notification`.

### Documentation et skill

- `apps/docs/src/content/components/ar-alert.mdx` : remplacer la section `urgent` (lignes 47 à 53) par la règle « rôle par défaut selon `variant`, remplaçable par l'attribut `role` standard (`alert` ou `status`) ».
- `packages/core/scripts/skill/content/ariane/references/choosing-components.md` (mention d'`urgent`) puis `npm run build:skill`.
- Le tableau d'API généré suit seul le CEM (`urgent` disparaît de `custom-elements.json` à la regénération).
- Vérifié : aucune occurrence d'`urgent` dans le starter-kit ni dans les thèmes (`ar-alert[role…]`).

### Page de test manuel (`apps/docs/public/manual-tests/alert-role.html`)

Page statique autonome, servie telle quelle par le site de doc (`public/`, hors sitemap, `noindex`), qui charge `/cdn/index.js` du déploiement (le site expose déjà `/cdn/`, construit par `build:bundles` dans `vercel.json`), ou un autre bundle via `?bundle=` et propose : alertes présentes au chargement (les quatre variantes, `role` écrit par l'auteur dans les deux sens, `without-notification`), alertes insérées dynamiquement, alertes modifiées en place, témoins natifs (`<div role="alert">` et `status`), et un tableau de résultats copiable en Markdown. Mode d'emploi dans la page. **Temporaire** : elle sert au déploiement de branche (aperçu Vercel de la PR, en `noindex`) et est retirée dans un dernier commit avant la fusion dans `dev`.

## Tests

- Vitest (happy-dom, faux `ElementInternals` sur le modèle du datepicker) : le rôle par défaut posé dans `internals.role` pour chaque variante ; `without-notification` donne `null` ; plus aucun attribut `role` écrit par le composant ; `variant` changé à chaud met à jour le rôle ; les tests existants sur l'attribut `role` (36 occurrences de `role` dans `alert.test.ts`) sont réécrits ou supprimés ; `urgent` n'existe plus.
- Navigateur (Web Test Runner, Chromium au minimum) : arbre d'accessibilité réel par CDP : `alert` pour `error` et `warning`, `status` pour `success` et `info`, `role="status"` écrit sur une `error` donne `status`, retrait de l'attribut restaure `alert`, `without-notification` donne un rôle générique. Si le lanceur ne permet pas CDP, le test passe par `page.accessibility` de Playwright ou est écrit en script Node hors lanceur ; le choix est tranché au plan.
- Rejeu du lab : l'exemple Vue `<ar-alert variant="error">` n'a plus besoin d'`urgent`.

## Critères d'acceptation

1. Aucun attribut `role` écrit par le composant ; rôle par défaut visible dans l'arbre d'accessibilité de Chrome.
2. Un `role` écrit par l'auteur remplace le défaut, dans les deux sens (`error` + `status`, `info` + `alert`).
3. `urgent` supprimé du code, du CEM, de la doc et du skill ; `npm run check:skill` passe.
4. **Vérification manuelle VoiceOver et NVDA** sur la page de test (alerte présente au chargement et insérée dynamiquement, comparée aux témoins natifs), résultats consignés dans la PR. Tant qu'elle n'est pas faite, la PR reste en brouillon.
5. La page de test est retirée de la branche avant la fusion.
6. Message de squash avec le footer `BREAKING CHANGE: l'attribut et la propriété urgent d'ar-alert sont supprimés ; utiliser l'attribut role standard (role="alert" ou role="status") pour remplacer le rôle par défaut`.

## Hors périmètre

- Garantie d'annonce à l'insertion dynamique (#346).
- Refonte des attributs hydratés d'`ar-tab` et `ar-tab-panel` (#345).
- Attribut énuméré (`politeness`, `urgency`) : écarté, le vocabulaire ARIA est déjà `role`.
- Rôles autres que `alert` et `status` (`alertdialog`, `log`…) : l'auteur les écrit lui-même avec `role`.

## Risques

- L'annonce effective par les lecteurs d'écran est le point non vérifié ; le repli est décrit ci-dessus.
- Comportement de l'arbre d'accessibilité de WebKit et Firefox pour un rôle venu des internals : à observer pendant la vérification manuelle (Safari et Firefox y sont inclus).
- Les consommateurs qui lisent `getAttribute('role')` sur `ar-alert` (tests, sélecteurs CSS) ne le trouvent plus : à signaler dans le message de squash.
