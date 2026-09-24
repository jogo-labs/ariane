# ar-alert — généricisation des tokens de variant + correction du mapping role

## Contexte

Soulevé pendant la revue finale de PR #142 (lot #129, token-vs-`::part()` sur ar-alert) : le
composant expose 4 `variant` fermés (`info`/`warning`/`error`/`success`), chacun avec son propre
jeu de 3 tokens CSS nommés (`--ar-alert-{variant}-{bg,border,icon}`, 12 tokens au total). Le
`role` ARIA posé sur l'hôte ne dépend aujourd'hui que d'un test binaire sur une seule valeur
(`variant === 'info' ? 'status' : 'alert'`, `alert.ts:110`), qui ne généralise pas à un variant
custom (ex. un `variant="promo"` ou `variant="neutral"` hériterait d'un `role="alert"` par
accident).

Ariane se veut headless (aucun fallback cosmétique dans les composants, cf. CLAUDE.md) — les 12
tokens nommés sont un cas où le composant impose une structure de style fermée plutôt que de la
déléguer au thème.

## Décisions

### 1. `variant` : conservé tel quel, pas de renommage

Le nom `variant` reste inchangé. Un renommage (`type` envisagé puis écarté) aurait été un
changement cosmétique sans gain fonctionnel, et `type` est un terme déjà surchargé en HTML/JS
(`input.type`, `event.type`…).

**Typage** — élargi pour accepter tout string tout en gardant l'auto-complétion des 4 presets
connus :

```ts
export type ArAlertVariant = 'success' | 'warning' | 'error' | 'info';

@property({ reflect: true, type: String })
variant: ArAlertVariant | (string & {}) = 'error';
```

Les 4 valeurs connues restent documentées en JSDoc comme presets fournis par défaut par
`default.css`. Toute autre valeur est acceptée sans contrainte TS (HTML n'a de toute façon aucune
notion de type sur les attributs — restreindre le type TS n'empêche jamais un consommateur non-TS
de poser `variant="promo"` dans le markup).

### 2. Rôle ARIA : table de correspondance + override explicite optionnel

Le test binaire actuel est remplacé par une table couvrant les 4 variants connus, plus un défaut
sûr pour tout variant custom, plus une prop d'override pour le cas rare où ce défaut ne convient
pas.

```ts
const ROLE_BY_VARIANT: Record<string, 'alert' | 'status'> = {
    error: 'alert',
    warning: 'alert',
    success: 'status',
    info: 'status',
};
```

Nouvelle prop optionnelle :

```ts
/**
 * Force le niveau d'urgence ARIA (role="alert" si true, role="status" si false),
 * indépendamment de `variant`. Non défini : déduit de `variant` via une table de
 * correspondance interne (error/warning → alert, success/info → status, tout autre
 * variant → status).
 * @attr urgent
 * @default undefined
 */
@property({ type: Boolean })
urgent?: boolean;
```

Logique dans `updated()` :

```
withoutNotification === true         → pas de role (inchangé)
urgent !== undefined                 → role = urgent ? 'alert' : 'status'
variant connu dans ROLE_BY_VARIANT   → role = ROLE_BY_VARIANT[variant]
variant custom inconnu               → role = 'status' (défaut sûr, pas de sur-interruption)
```

**Pourquoi cette forme et pas un découplage total (prop `urgent` obligatoire, sans dérivation) :**
un rôle 100% explicite avait été envisagé puis écarté — dans la pratique, la quasi-totalité des
consommateurs ne pense pas à la sémantique ARIA `alert`/`status` et laisserait le défaut, donc
rendre la décision obligatoire n'aurait rien amélioré, juste ajouté une prop ignorée. La table de
correspondance garde le bénéfice "zéro configuration pour le cas courant" tout en corrigeant le
mapping (warning et success n'étaient pas traités correctement par le test binaire précédent), et
l'override reste disponible pour la minorité de cas qui en a réellement besoin.

`withoutNotification` n'est pas modifié : il continue à supprimer entièrement l'attribut `role`,
prioritaire sur `urgent` et sur la table.

**Nuance d'implémentation — sémantique de présence, asymétrie assumée** : `urgent` est un
booléen Lit standard, sans valeur par défaut sur le champ de classe (`urgent?: boolean;`, pas de
`= false`). Ça donne exactement la même convention que `without-notification` : la seule
présence de l'attribut (`<ar-alert urgent>`, pas besoin de `="true"`) force `role="alert"` ; en
son absence, la propriété JS reste `undefined` et retombe sur `ROLE_BY_VARIANT` — elle n'est
jamais forcée à `false`.

Limite assumée : la convention HTML "attribut booléen" ne permet pas d'encoder un `false`
explicite via le markup (`urgent="false"` serait traité comme présent donc `true`, comme
n'importe quel attribut booléen HTML). Forcer explicitement `role="status"` sur un variant dont
le défaut de la table est `alert` (ex. `variant="error"`) n'est donc possible que par affectation
JS (`el.urgent = false`), pas via un attribut posé dans le markup. Asymétrie jugée acceptable —
cas rare, et cohérente avec le comportement déjà en place pour `without-notification`.

### 3. Tokens CSS : 3 génériques au lieu de 12 nommés

`alert.styles.ts` — remplace les 4 blocs `:host([variant='...'])` par un bloc unique :

```css
:host {
    background-color: var(--ar-alert-bg);
    border-color: var(--ar-alert-border);
}

[part='icon'] {
    color: var(--ar-alert-icon);
}
```

`default.css` — fournit les 4 presets connus via sélecteurs d'attribut (remplace les 12 tokens
`--ar-alert-{variant}-{bg,border,icon}` actuels) :

```css
ar-alert[variant='info'] {
    --ar-alert-bg: var(--ar-color-info-bg);
    --ar-alert-border: var(--ar-color-info-bg);
    --ar-alert-icon: var(--ar-color-info-text);
}
/* idem warning / error / success, + surcharges dark mode existantes (border uniquement) */
```

`--ar-alert-color` (texte) et `--ar-alert-close-size`/`--ar-alert-*-transition-duration`
inchangés — déjà génériques, hors périmètre.

Un consommateur qui étend `variant` avec une valeur custom définit simplement
`ar-alert[variant='promo'] { --ar-alert-bg: ...; }` dans son propre thème, sans toucher au
composant.

### 4. Icônes : conservées pour les 4 presets, pas de défaut pour le custom

`_ICON_PATHS` reste en l'état pour les 4 variants connus (contenu/comportement, pas un token CSS
— la règle headless "pas de fallback cosmétique" s'applique aux tokens, pas au contenu par
défaut, au même titre que l'icône de fermeture par défaut déjà slot-able).

Pour un `variant` custom sans preset connu :

- pas d'icône par défaut affichée (évite d'afficher une icône trompeuse ou vide de sens),
- avertissement dev via l'infrastructure `warn()` existante, invitant à fournir `slot="icon"` —
  rationale WCAG 1.4.1 (ne pas coder une information uniquement par la couleur).

```ts
if (!(this.variant in ArAlert._ICON_PATHS) && __DEV__) {
    warn(
        'ar-alert',
        `variant="${this.variant}" n'a pas d'icône par défaut, fournissez un contenu via slot="icon".`,
    );
}
```

## Hors périmètre

- Pas de wrapper/preset supplémentaire fourni pour un cas custom (ex. "promo", "neutral") — YAGNI,
  aucun besoin concret actuellement, seulement le mécanisme générique qui le permettrait le jour
  où le besoin apparaît.
- Pas d'échappatoire pour forcer une icône par défaut sur un variant custom autrement que via
  `slot="icon"`.
- `ArAlertConfig.variant` (classe de config) suit le même typage élargi, sans changement de nom.

## Impact périphérique (à couvrir dans le plan d'implémentation)

- `alert.ts` : JSDoc `@cssprop` (3 tokens génériques au lieu de 12), nouvelle prop `urgent`
  documentée, table `ROLE_BY_VARIANT`, logique `updated()`.
- `alert.styles.ts` : suppression des 4 blocs `:host([variant='...'])`, ajout des 3 tokens
  génériques.
- `packages/core/src/styles/themes/default.css` : réécriture des presets (light + dark mode).
- `apps/docs/src/content/components/ar-alert.mdx` : documentation `variant` (presets vs custom),
  nouvelle prop `urgent`, nouveaux tokens.
- `alert.test.ts` / `alert.a11y.test.ts` : couverture de la table de correspondance, de l'override
  `urgent`, du warning dev sur variant custom sans icône.
- Breaking change assumé sans dépréciation (alpha, aucun consommateur réel — cf. mémoire projet).
