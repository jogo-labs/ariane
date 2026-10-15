# ar-alert : rôle écrit en attribut sans écraser celui de l'application, suppression d'`urgent` (#334)

Issue : jogo-labs/ariane#334. Constats du laboratoire d'intégration : S-014 (`urgent` booléen à trois états inexprimable en HTML et mal converti par Vue), S-034 (écriture de `role` avant l'hydratation React). Décisions du tri : `ariane-integration-lab/reports/SYNTHESIS.md` §6.

## Révision du 2026-10-15

La première conception posait le rôle par défaut dans `ElementInternals.role` (l'attribut `role` n'étant plus écrit par le composant). Le test avec de vrais lecteurs d'écran, demandé comme condition de fusion, a montré que **les lecteurs d'écran ne prennent pas en compte `ElementInternals.role`** : ils s'appuient sur l'attribut `role` du DOM. Les exemples où `role` était écrit en attribut fonctionnaient, les autres non. VoiceOver s'est comporté différemment selon le navigateur, Safari étant moins accessible que Chrome. Les tests automatiques ne pouvaient pas le détecter : l'arbre d'accessibilité de Chromium exposait pourtant bien le rôle. Cette conception est abandonnée ; la voie de repli du premier spec devient la voie retenue, avec une règle de propriété de l'attribut plus précise.

## Objectif

Le composant écrit lui-même l'attribut `role` selon `variant`, sans jamais écraser un `role` posé par l'application, et `urgent` disparaît : l'application écrit simplement `role`.

## Contexte vérifié

- Dans le code d'origine, `_updateRole()` écrivait `this.role` (donc l'attribut) en écrasant toute valeur de l'auteur, avec un avertissement de développement (`_hadAuthoredRole`) ; `urgent?: boolean` servait à forcer le rôle. `urgent` a trois états mais l'attribut n'exprime que deux d'entre eux, et Vue lui affecte `""` par propriété : `<ar-alert urgent>` donnait `status`.
- Lecteurs d'écran : l'attribut `role` du DOM est la source ; `ElementInternals.role` n'est pas pris en compte (test du mainteneur, VoiceOver avec Safari et Chrome ; le détail des autres combinaisons n'a pas été consigné).
- Les outils qui calculent le rôle depuis le DOM (Playwright `getByRole`, `ariaSnapshot`, Testing Library) ne voyaient pas un rôle venu des internals ; avec l'attribut, ils le voient.
- Seul `role="alert"` est annoncé de façon fiable à l'insertion dynamique (TetraLogical) : indépendant du mécanisme, suivi dans #346.

## Décisions

| Sujet                     | Décision                                                                                                                                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rôle écrit                | Attribut `role` sur l'hôte : `error` et `warning` → `alert`, `success`, `info` et tout autre variant → `status`. Aucun usage d'`ElementInternals` pour le rôle.                                                                                         |
| Propriété de l'attribut   | Le composant écrit `role` **seulement si l'attribut est absent ou égal à la dernière valeur qu'il a lui-même écrite**. Sinon le `role` appartient à l'application (posé avant ou après la connexion) et n'est plus touché, même quand `variant` change. |
| Premier calcul            | À la connexion, de façon synchrone : l'alerte insérée dynamiquement a son rôle dès l'insertion, avant le premier rendu.                                                                                                                                 |
| Recalcul                  | À chaque changement de `variant` ou de `without-notification`.                                                                                                                                                                                          |
| `without-notification`    | Retire le `role` écrit par le composant (aucune annonce). Un `role` de l'application reste de sa responsabilité.                                                                                                                                        |
| Rôle d'application retiré | À la mise à jour suivante (changement de `variant` ou de `without-notification`), l'attribut redevient absent donc au composant.                                                                                                                        |
| `urgent`                  | **Supprimé** (propriété, attribut, converter, doc). Pas de `warnDeprecated` (alpha, `CLAUDE.md`).                                                                                                                                                       |
| Avertissement de #143     | Retiré : un `role` d'application est désormais respecté, plus écrasé.                                                                                                                                                                                   |
| Changement incompatible   | Oui (retrait d'`urgent`, et un `role` d'application n'est plus écrasé). Footer `BREAKING CHANGE` dans le message de squash.                                                                                                                             |
| Hydratation               | L'écriture de `role` à la connexion peut déclencher l'avertissement d'hydratation React / Next.js en développement (S-034, même arbitrage qu'`ar-tab`, #345). Écrire `role` dans le markup l'évite ; à consigner dans le guide Next.js (#341).          |

## Conception

### `src/components/alert/alert.ts`

- Champ privé `_writtenRole: string | null` : dernière valeur écrite.
- `_updateRole()` : `current = getAttribute('role')` ; si `current !== null && current !== _writtenRole` → `return` (appartient à l'application). Sinon `wanted` = `null` avec `without-notification`, sinon `_ROLE_BY_VARIANT[variant] ?? 'status'` ; écrire (`setAttribute`) ou retirer (`removeAttribute`) ; `_writtenRole = wanted`.
- `connectedCallback()` : `super` puis `_updateRole()`. `updated()` : `_updateRole()` quand `variant` ou `withoutNotification` change.
- Suppression : `urgent` (propriété, converter), `_hadAuthoredRole`, `firstUpdated`, l'avertissement associé, tout usage de `internals.role`.

### Documentation et skill

- `ar-alert.mdx` : rôle écrit par le composant selon `variant`, remplaçable par l'attribut `role`, règle de propriété, `without-notification`, rendu serveur, annonce dynamique.
- `choosing-components.md` (skill) : une phrase ; `build:manifest` puis `build:skill`.

### Page de test manuel (`apps/docs/public/manual-tests/alert-role.html`)

Temporaire, servie par le déploiement Vercel de la branche (`noindex`, retirée avant la fusion). Elle attend maintenant l'attribut `role` dans le DOM, écrit par le composant.

## Tests

- **Vitest (happy-dom)** : rôle par variante (attribut) ; rôle dès l'insertion avant le premier rendu ; changement de `variant` ; `without-notification` dans les deux sens ; `urgent` n'existe plus ; `role` d'application présent au chargement jamais modifié (changement de `variant`, `without-notification`), sans avertissement ; `role` posé après la connexion respecté ; `role` d'application retiré rendu au composant à la mise à jour suivante ; `role="banner"` respecté.
- **Navigateur (Web Test Runner)** : mêmes cas dans un vrai DOM, avec le rôle calculé lu dans l'arbre d'accessibilité réel (Chromium, par CDP) ; sélecteur `ar-alert[role]`.
- **Manuel** : VoiceOver (Safari et Chrome), NVDA (Firefox et Chrome) sur la page de test, résultats consignés dans la PR.

## Critères d'acceptation

1. L'attribut `role` est écrit par le composant selon `variant`, dès l'insertion.
2. Un `role` d'application, présent avant ou posé après la connexion, n'est jamais modifié.
3. `urgent` est supprimé du code, du manifeste, de la doc et du skill ; `npm run check:skill` passe.
4. **Vérification manuelle VoiceOver et NVDA** sur la page de test, résultats dans la PR. Tant qu'elle n'est pas faite, la décision de fusion est reportée.
5. La page de test est retirée de la branche avant la fusion.
6. Message de squash avec le footer `BREAKING CHANGE` : l'attribut et la propriété `urgent` d'`ar-alert` sont supprimés ; utiliser l'attribut `role` standard.

## Hors périmètre

- Garantie d'annonce à l'insertion dynamique (#346).
- Refonte des attributs hydratés d'`ar-tab` et `ar-tab-panel` (#345).
- Détecter une modification de `role` par un observateur : écarté, la règle de comparaison suffit.
- Rôles autres que `alert` et `status` : l'application les écrit elle-même.

## Risques

- Safari avec VoiceOver est moins accessible que Chrome (constat du mainteneur) : à comprendre avec le test manuel, il peut relever de la limite générale de l'annonce dynamique (#346) plutôt que du composant.
- Avertissement d'hydratation en développement avec Next.js / React (voir Décisions).
- Une application qui posait `role` en comptant sur l'écrasement par le composant voit désormais son `role` conservé : changement de comportement, signalé par le `BREAKING CHANGE`.
