# Page "Personnalisation" — configurateur de thème (#120)

## Contexte

Suite à la suppression de la colonne « Défaut » du tableau CSS Custom Properties (PR #121, issue #109) : `default.css` est un thème de démo fourni avec la librairie, pas des valeurs par défaut intrinsèques aux composants (philosophie headless d'Ariane). Cette page remplace `/foundations/tokens` par une page qui présente `default.css` comme _un_ thème parmi d'autres, et fournit un outil pour en personnaliser les tokens et exporter un fichier de thème CSS prêt à l'emploi.

Milestone "Chantier post-beta : technique & doc" — issue #120, entre #109 (fermée) et #110.

## Emplacement & navigation

- Nouvelle page `apps/docs/src/pages/getting-started/personnalisation.astro`, titre **"Personnalisation"**.
- `apps/docs/src/pages/foundations/tokens.astro` est **supprimée**.
- `SiteNav.astro` : la section "Fondations" est retirée ; le lien "Personnalisation" rejoint la section "Bien démarrer" (après "Utilisation").
- Le code du configurateur vit entièrement côté `apps/docs` (script vanilla TS + page Astro). Ce n'est **pas** un nouveau composant public `ar-*` dans `packages/core` — c'est un outil de doc interne, pas un pattern destiné aux consommateurs de la librairie.

## Sources de données & fusion

Deux sources existantes, à ne pas dupliquer mais réutiliser :

1. **Manifeste CEM** (`@cem`, déjà consommé par `SiteNav.astro` et `Playground.astro`) : pour chaque déclaration de composant, `cssProperties` liste les `@cssprop` documentés dans le JSDoc — c'est la **liste maîtresse** des tokens personnalisables par composant. Le build échoue déjà (`cem.config.js` + `validate-cssprop-defaults.js`) si un token de `default.css` n'a pas d'entrée `@cssprop` correspondante ; on peut donc partir du manifeste CEM en sachant qu'il n'existe pas de token "caché" dans `default.css` qui en serait absent.
2. **`default.css`** : fournit la valeur claire (`:root`) et, quand elle existe, la valeur sombre (`[data-theme='dark']` ou `@media (prefers-color-scheme: dark)`) de chaque token.

La fusion se fait dans un nouvel utilitaire `apps/docs/src/utils/build-theme-manifest.ts` :

- Réutilise `extractThemeTokens(css)` de `packages/core/scripts/validate-cssprop-defaults.js` pour les tokens clairs (import direct depuis le workspace npm, pas de duplication de la regex).
- Ajoute une fonction symétrique `extractDarkThemeTokens(css)` (même regex, appliquée à la portion du fichier après le marqueur de surcharge dark) pour obtenir la map des valeurs sombres.
- Réutilise la logique de rattachement "préfixe de tag le plus long" (déjà écrite dans `validateCssPropertyCoverage`, à factoriser en fonction exportée `findTokenOwner(tokenName, declarations)` réutilisable des deux côtés) pour savoir à quel composant appartient un token composite.
- Pour les tokens **globaux** (pas de composant propriétaire — couleurs, focus, typographie, spacing/radius) : réutilise tel quel `parseTokens`/`parsePalette` de `parse-tokens.ts`, inchangés.
- Pour les tokens **par composant** : itère les `cssProperties` du manifeste CEM (regroupées par composant), enrichit chaque entrée avec `light`/`dark` trouvées dans `default.css` si présentes. **Un `@cssprop` documenté sans valeur dans `default.css` est affiché quand même**, avec un contrôle vide (pas de valeur par défaut, placeholder "hérite du navigateur / non défini dans le thème de démo") — c'est le trou que la fusion permet de couvrir, que `validateCssPropertyCoverage` ne détecte pas (il ne vérifie que le sens inverse).

### Inférence du type de contrôle

Les `@cssprop` n'ont pas d'annotation de type — le type de contrôle est inféré depuis la valeur CSS résolue (via `light` ?? `dark`, sinon `text` par défaut faute de valeur à analyser) :

- Couleur (hex, `rgb()`/`rgba()`, `oklch()`, `color-mix()`, ou `var()` qui se résout en couleur via `resolveColor`) → `control: 'color'`.
- Valeur numérique + unité reconnue (`rem`, `px`, `em`, `%`, `ms`) → `control: 'dimension'` (input numérique + select d'unité).
- Mot-clé CSS reconnu parmi un petit ensemble fermé observé dans `default.css` pour ce type de propriété (`solid`, `dashed`, `dotted`, `none` pour `border-style`) → `control: 'select'`, options collectées dynamiquement en scannant toutes les valeurs de ce token à travers le fichier (claire + sombre suffit, un seul token n'a que 2 valeurs possibles au plus dans `default.css`).
- Sinon → `control: 'text'` (fallback libre, ex. `calc(...)`, valeurs composées).

### Structure du manifeste (JSON injecté dans la page)

```ts
interface ThemeToken {
    name: string; // "--ar-alert-padding"
    group: 'global' | string; // 'global' ou tagName du composant ("ar-alert")
    category?: string; // tokens globaux uniquement : "Interaction", "Typographie"...
    description: string; // texte du @cssprop (tokens composant) ou libellé dérivé (globaux)
    control: 'color' | 'dimension' | 'select' | 'text';
    light?: string; // absent si non défini dans default.css
    dark?: string;
    options?: string[]; // control: 'select' uniquement
}
```

## UI & interaction

- **Section Global** toujours visible en haut de page : les catégories déjà affichées sur l'actuelle `/foundations/tokens` (Palette brute en lecture seule + Interaction, Texte & Surface, États, Focus, Typographie, Espacement & Forme en édition), un contrôle par token.
- **Accordéon par composant** en dessous : un item replié par composant ayant des `cssProperties`, libellé = titre de la page composant (comme `SiteNav.astro`). À l'ouverture : liste des tokens de ce composant avec leurs contrôles, et une **preview live** intégrée réutilisant le `playgroundHtml` déjà généré pour ce composant (même mécanisme que `Playground.astro` — pas de nouveau markup de démo à écrire par composant).
- **Preview Global** : un petit échantillon composite statique (quelques composants représentatifs : bouton, alert, input) affiché sous la section Global, pour visualiser l'effet des tokens sémantiques transversaux avant même d'ouvrir un accordéon.
- Bandeau `<ar-alert variant="info">` en tête de page rappelant que `default.css` est un thème de démo remplaçable (réutilise le pattern déjà en place sur `Playground.astro`).
- Bouton **"Réinitialiser"** par section (global / par composant) + un reset global en haut de page.
- Bouton **"Exporter"** : génère et télécharge un fichier `.css` complet (structure `:root { } [data-theme='dark'] { }` identique à `default.css`), avec **toutes** les valeurs connues (celles de `default.css` non modifiées + les overrides utilisateur). Les tokens sans valeur dans `default.css` et non renseignés par l'utilisateur sont omis de l'export (comme ils le sont aujourd'hui dans `default.css`).

## État & persistance

- État d'édition en mémoire : `Map<tokenName, { light?: string; dark?: string }>`, ne contient que les tokens modifiés (pas de duplication du manifeste complet).
- Persisté dans `localStorage` sous une clé versionnée `ariane-theme-config-v1` à chaque changement, rechargé au montage de la page. Si la clé existe mais ne correspond pas à la version attendue (évolution future de la structure), elle est ignorée (pas de migration automatique pour ce chantier).
- Si `localStorage` est indisponible (navigation privée stricte, quota dépassé) : dégradation silencieuse en mémoire de session uniquement (`try/catch` autour de `setItem`/`getItem`), aucun blocage de l'outil, aucun message d'erreur intrusif.
- Application live : `element.style.setProperty(name, value)` sur le conteneur de chaque preview (composant ou échantillon global), jamais sur `document.documentElement` — isolation stricte vis-à-vis du reste de la page de doc.

## Gestion des erreurs & cas limites

- Contrôle `text` (fallback libre) : validation best-effort via `CSS.supports('color', value)` ou `CSS.supports(propertyName, value)` selon le contexte avant application ; si invalide, la valeur n'est pas appliquée au preview et un message d'erreur inline s'affiche sous le champ, sans bloquer l'édition des autres tokens.
- Contrôle `dimension` : le select d'unité est limité aux unités déjà observées pour ce token (généralement une seule) — pas de conversion d'unité à la volée.
- Token affiché sans valeur claire ni sombre (documenté via `@cssprop` mais absent de `default.css`) : le champ dark n'est proposé que si une valeur sombre existe réellement pour ce token dans `default.css` (jamais suggérer une personnalisation dark qui n'existe pas dans le thème de démo).

## Tests

- `build-theme-manifest.test.ts` (Vitest, `apps/docs`) : couvre l'inférence de `control` sur des valeurs représentatives de chaque type, le rattachement par préfixe de tag le plus long (cas `ar-tab` vs `ar-tab-group`), la fusion CEM ∪ default.css (token documenté sans valeur, token avec valeur claire seule, avec claire+sombre).
- Pas de test E2E automatisé pour le flux interactif complet (édition → preview live → export → reset → persistance) — pas de précédent Playwright côté docs pour de l'état interactif de ce type (les tests a11y existants sont statiques). Validation manuelle documentée dans le plan d'implémentation.

## Hors périmètre

- Migration/versionning de la clé `localStorage` au-delà d'un simple mismatch de version ignoré.
- Édition live du document entier de la doc (seules les previews isolées sont affectées).
- Tout composant public `ar-*` réutilisable pour ce configurateur — reste un outil de doc.
