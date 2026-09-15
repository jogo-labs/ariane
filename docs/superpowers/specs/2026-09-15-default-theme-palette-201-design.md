# Palette du thème publié `default.css` — issue #201

## Contexte

Le chantier #110 a donné à la home et au reste de la doc (`apps/docs`) une
nouvelle identité visuelle : direction claire inspirée Rivian (ambre
`#FFAA00`, neutres stone/forest, rayons 4/12/20/40px) pour la home et le
contenu narratif, palette sombre « Voûte » (indigo nuit) pour le mode
sombre du site — cf. `docs/design/charte-graphique.md`.

Le thème publié de la librairie (`packages/core/src/styles/themes/default.css`,
consommé par tout premier utilisateur réel d'Ariane) n'a pas suivi : il reste
sur son ancienne identité (`--ar-color-interactive` = violet/cobalt
`#283276`). Toutes les démos live de la doc (pages composant, quickstart)
chargent ce thème — le décalage entre la vitrine (home, ambre) et les
composants démontrés partout ailleurs est visible.

Ce chantier retravaille la palette de couleurs de `default.css` pour
l'aligner sur l'identité définie par #110, sans réécrire l'architecture
existante (rampe 11 paliers → variantes d'état → tokens sémantiques →
tokens composants) ni changer un seul nom de token — seuls les **valeurs**
de couleur changent, plus une extension ciblée (nouveaux primitifs
`vault`/`vault-deep`).

## Hors scope

- Toute réorganisation des noms de tokens ou de la structure du fichier.
- Les rampes `green`/`yellow`/`red`/`orange`/`cyan`/`indigo`/`purple`/`pink`/`blue` :
  couleurs de feedback fonctionnel (succès/alerte/danger/info + hues
  disponibles pour remapping), sans charge identitaire — inchangées.
- Un token `--ar-ease` global : aucun composant du thème publié n'a
  aujourd'hui de transition pilotée par un token de courbe — sujet séparé
  si un besoin réel émerge.
- Les autres fichiers de doc (`Layout.astro`, `HomeLayout.astro`,
  `index.astro`, `appliquer-un-theme.astro`) : ils référencent déjà le
  thème par son nom de fichier (`/themes/default.css`) — aucun changement
  requis, le nouveau contenu est chargé automatiquement.

## 1. Fichiers

- `packages/core/src/styles/themes/default.css` (contenu actuel, violet/cobalt)
  → renommé `default-old.css`, **contenu strictement inchangé** — conservé
  pour réemploi futur (le mainteneur envisage de le réutiliser ailleurs),
  mais retiré du périmètre de validation CEM (`cem.config.js` — couverture
  `@cssprop`, tokens codés en dur, ordre des parts d'état) : ce n'est plus
  le thème actif, on ne le maintient plus, on le gèle en l'état.
- Nouveau `packages/core/src/styles/themes/default.css` créé avec la
  palette retravaillée — mêmes 7 sections, mêmes noms de tokens, même
  mécanique `light-dark()`/`[data-theme]`. `cem.config.js` pointe déjà en
  dur sur ce chemin (`src/styles/themes/default.css`) : aucun changement
  de config nécessaire, la validation s'applique naturellement au nouveau
  contenu.

## 2. Format des couleurs

Toute nouvelle valeur de couleur s'écrit en `oklch()` natif CSS, pas en hex
avec commentaire oklch (convention actuelle des rampes `primary`/`neutral`/
`green`/etc.). Précédent déjà présent dans le fichier : la rampe `orange`
est déjà entièrement en `oklch()` natif. Cohérent avec le reste du fichier,
qui utilise déjà `light-dark()`/`color-mix()` — pas de rupture de cible
navigateurs. Les rampes existantes non retouchées (`green`, `yellow`,
`red`, etc.) gardent leur format hex+commentaire actuel — pas de
reformatage de ce qui n'est pas modifié.

## 3. Rampe `primary` → ambre

Rampe OKLCH à 11 paliers (même convention que les hues existantes :
05 = sombre → 95 = clair), construite autour de l'ambre `#FFAA00`
(`oklch(84% 0.17 76)` environ, à affiner) :

- **Paliers clairs (70-80)** : proches de l'ambre brut de la doc
  (`--doc-ember` / `--doc-ember-hi`) — utilisés en mode sombre comme
  couleur interactive (`--ar-color-interactive` = `light-dark(primary-40,
primary-70)`).
- **Paliers médians (30-40)** : assombris/désaturés façon `--doc-accent`
  clair (`#8f5f00`) — c'est cette zone qui sert de fond de bouton avec
  texte blanc et de couleur de texte interactif en mode clair ; contrainte
  dure : contraste AA (4.5:1) du texte blanc dessus, et du texte ambre sur
  fond blanc.
- **Paliers sombres (05-20)** : quasi noirs, légèrement chauds (teinte
  ambre à faible chroma) plutôt que neutres — cohérence avec le reste de
  la rampe.

`--ar-color-interactive`/`-hover`/`-active`/`-subtle` continuent de
dériver de `primary-*` exactement comme aujourd'hui (mêmes paliers
référencés) — aucun composant ne change.

## 4. `neutral` + nouveaux primitifs `vault`/`vault-deep`

- `neutral` : retrait de la teinte froide actuelle (hue ~270-280°, héritée
  du bleu France Travail) vers un gris plus neutre/légèrement chaud (stone)
  — ajustement de teinte sur la rampe existante, pas de réécriture des 11
  paliers depuis zéro. Reste la rampe utilisée par bordures, texte-muted,
  états désactivés, secondaire de bouton — usages où une teinte indigo
  marquée serait superflue.
- Nouveaux primitifs `--ar-color-vault: oklch(...)` /
  `--ar-color-vault-deep: oklch(...)` (indigo nuit, valeurs proches de
  `--doc-vault` `#191d2e` / `--doc-vault-deep` `#10131f`, converties en
  oklch natif) — utilisés **uniquement** pour :
    - `--ar-color-bg` côté sombre (`light-dark(white, vault)` au lieu de
      `light-dark(white, neutral-10)`)
    - `--ar-color-bg-subtle` côté sombre (`light-dark(neutral-95,
vault-deep)` ou équivalent — à vérifier en contraste avec les
      surfaces empilées, ex. panel sur bg)

Le reste des tokens sémantiques (`--ar-color-text`, `--ar-color-border`,
`--ar-color-text-muted`, etc.) continue de dériver de `neutral-*` sans
changement de structure — seule la valeur des paliers `neutral` change
légèrement (retrait de teinte).

## 5. Rayons

`--ar-border-radius-sm/md/lg/xl` retouchés dans l'esprit de la progression
généreuse de la doc (4/12/20/40px) sans copier les valeurs telles quelles :
calage composant par composant pendant l'implémentation (ex. un bouton de
`--ar-button-height: 2.5rem` avec un rayon de 40px devient une pilule —
pas toujours voulu ; un input ou un badge n'a pas besoin d'autant). Valeurs
cibles à trancher pendant l'implémentation avec vérification visuelle,
pas figées dans cette spec.

## 6. Vérification

- **Contraste AA** : recalcul WCAG (comme pour l'opacité `HeadingAnchor`,
  cf. PR #220) sur chaque paire texte/fond touchée par le changement de
  `primary`/`neutral`/`vault`, dans les deux modes — en particulier texte
  blanc sur fond de bouton ambre médian, et texte ambre sur fond blanc.
- **Suite de tests existante** : 989 tests core (dont plusieurs
  `*.browser.test.ts` import déjà `default.css` — `dialog`, `dropdown`,
  `pagination`, `tooltip`, `datepicker`, `stepper`, `breadcrumb`,
  `alert`, presets `buttons`/`fields`) doivent rester verts. Ces tests ne
  vérifient a priori pas de couleurs précises, mais à confirmer pendant
  l'implémentation — un échec inattendu signalerait une dépendance cachée
  à une valeur de couleur exacte.
- **Revue visuelle Playwright** : chaque composant démontré sur les pages
  `/components/*` de la doc, light + dark, avant/après — captures
  d'écran comparatives, pas de golden-image automatisé (pas d'infra
  existante pour ça).

## Risques / points d'attention

- Le fond Voûte (`vault`) n'a été vérifié en contraste que pour du texte
  sur fond plein côté doc (`charte-graphique.md` : chalk/vault 13,91:1,
  chalk-muted/vault 7,00:1, ember/vault 8,76:1) — jamais pour l'usage
  dense d'un thème de composants (bordures fines, surfaces empilées comme
  un panel de dropdown sur le fond de page, focus ring). À revérifier
  spécifiquement pendant l'implémentation, pas une simple reprise des
  ratios déjà validés côté doc.
- `default-old.css` gelé hors validation CEM : si un composant futur
  introduit un nouveau token `--ar-*`, la validation de couverture
  `@cssprop` ne le réclamera plus dans `default-old.css` — attendu et
  voulu (fichier figé), mais à documenter clairement en tête du fichier
  renommé pour éviter toute confusion future.
