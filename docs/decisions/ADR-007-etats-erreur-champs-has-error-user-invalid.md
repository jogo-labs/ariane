# ADR-007 : États d'erreur des champs — `has-error` détaché de `user-invalid`

**Statut :** Adopté
**Date :** 2026-10-30

## Contexte

`ar-datepicker` portait un attribut `has-error`, posé par l'application, qui colorait la bordure via une règle du composant (`:host([has-error])`, contraire au modèle headless) et affichait ou masquait le slot `error` en CSS. En parallèle, la base `ArianeFormElement` (#325, #360) expose déjà les états de validité du navigateur sous forme de `:state(required)`, `:state(optional)`, `:state(user-invalid)` et `:state(user-valid)`, car seuls `:invalid` et `:valid` s'appliquent nativement à un élément personnalisé associé à un formulaire.

Deux questions se sont posées pendant le chantier #404 :

- `has-error` fait-il doublon avec `:invalid` / `:user-invalid` ?
- Un composant de formulaire doit-il afficher un message d'erreur, annoncer l'erreur, et décider seul de ce qu'est « une erreur » ?

Constats vérifiés pendant les échanges :

- Sous `novalidate`, le navigateur continue d'évaluer la validité (`:invalid`, `checkValidity()`) ; seule la tentative de soumission ne marque plus les champs `user-invalid`. La sortie d'un champ après modification et `reportValidity()` les marquent encore (testé dans Chromium ; WebKit non testé).
- Une référence ARIA (`aria-describedby`) ne traverse pas la frontière d'un shadow DOM : un message placé dans le document ne peut pas être relié à l'`<input>` interne depuis l'extérieur. Un slot, lui, projette le message dans le shadow DOM et permet cette liaison.
- Un `role="alert"` posé par le composant sur chaque champ déclencherait, à la soumission d'un formulaire en erreur, autant d'annonces qui s'interrompent.
- Sans `aria-invalid`, un champ affiché en erreur ne l'est pas pour un lecteur d'écran ; un `<input>` natif invalide est exposé comme tel aux technologies d'assistance sans que l'application ait à le déclarer.

Deux modèles de validation coexistent chez les consommateurs : la validation du navigateur (contraintes, `reportValidity()`), et la validation applicative, avec `novalidate` et des messages affichés par l'application.

## Décision

**Deux signaux distincts, avec deux sources, sans dérivation de l'un à l'autre.**

- `:state(user-invalid)` reflète la validité du navigateur après interaction. C'est le miroir de `:user-invalid` ; le composant ne fait que l'exposer.
- `:state(has-error)` signifie « l'application affiche une erreur » : le slot `error` est rempli. Il ne dépend pas de la validité du champ. Ce n'est plus un attribut : c'est un état uniquement. Il ne se déduit pas de `user-invalid`, et `user-invalid` ne se déduit pas de lui.
- L'`<input>` interne porte `aria-invalid="true"` quand le slot `error` est rempli **ou** que le champ est `user-invalid`, comme un champ natif.

**Le composant n'invente pas de message d'erreur et ne l'annonce pas.**

- Le slot `error` est conservé : c'est le seul moyen déclaratif de relier un message de l'application à l'input interne (`aria-describedby`, après le hint).
- Le rendu est conditionnel : sans contenu, le slot est rendu nu, sans élément autour ; avec contenu, il est enveloppé dans `<p part="error" id>`. Cela évite d'avoir à masquer un conteneur vide et les espaces qui s'y attachent.
- Aucun `role="alert"` sur ce conteneur. Le message est lu quand le champ reçoit le focus. Pour annoncer un message dès son apparition (validation en direct), l'application pose le rôle sur son propre élément slotté. À la soumission, le motif recommandé est un récapitulatif des erreurs en tête de formulaire, annoncé une fois, avec le focus placé dessus ou sur le premier champ en erreur.

**Un seul état cible les styles du thème.**

- Le thème ne cible que `:state(has-error)` (bordure de l'input et couleur du label), via deux tokens génériques partagés par tous les champs, `--ar-input-error-border-color` et `--ar-input-error-color`. Pour un style piloté par la validation du navigateur, l'application cible `:state(user-invalid)` ; le thème ne le fait pas à sa place.
- Le preset `fields.css` (champs natifs) suit le même principe : `.ar-input[aria-invalid='true']` prend les mêmes tokens, et le label d'un `.ar-field-group` qui contient un champ en erreur aussi.

**Validité et événements.**

- `detail.valid` des événements de saisie vaut « date plausible » (pas le 32/01/2026). Les bornes `min` et `max` relèvent de la validité du champ (`rangeUnderflow`, `rangeOverflow`).
- Un texte non analysable est `badInput`, évalué à la sortie du champ ; le texte saisi est conservé au lieu d'être effacé.

## Alternatives écartées

- **`has-error` calculé à partir de `user-invalid`**, ou vrai dans l'un ou l'autre des deux cas : couple deux sources, et le thème ne sait plus qui a posé l'état. Un consommateur qui n'affiche aucun message verrait pourtant un état « erreur ».
- **Demander à l'application de poser `aria-invalid` elle-même** : le slot `error` nommé est déjà une déclaration d'erreur ; exiger un attribut en plus est redondant et facile à oublier.
- **Un message d'erreur produit par le composant** (propriété `error-text`, ou attribut `invalid` explicite) : le natif n'affiche pas non plus de message dans la page. Écarté faute de cas d'usage (YAGNI) ; à reconsidérer si un besoin réel apparaît.
- **`role="alert"` sur le conteneur de l'erreur** : annonces concurrentes à la soumission, comme indiqué plus haut.
- **Masquer le conteneur vide en CSS** (`hidden`, `display: none`) plutôt que le rendre à la demande : il faut alors gérer l'espacement et les marges du conteneur absent ; le rendu conditionnel les évite.
- **Inverser l'ordre hint / error** : l'ordre actuel (hint, puis erreur) est conservé.

Lectures comparatives (partielles) qui ont nourri le débat : un `invalid` explicite et un slot de texte d'erreur chez Spectrum Web Components ; `error` et `error-text` chez Material Web ; un `validationBehavior` natif ou ARIA chez React Aria ; pas de slot d'erreur chez WebAwesome (un hint et `setCustomValidity`).

## Conséquences

- **Changement incompatible** (alpha, #406) : l'attribut `has-error` n'est plus reflété, `has-error` ne s'applique plus à un champ invalide sans slot rempli, le conteneur d'erreur perd son `role="alert"` et n'existe que slot rempli, `detail.valid` change de sens, et deux propriétés CSS propres au datepicker sont remplacées par les tokens génériques (#405).
- La documentation décrit les deux modèles (page Formulaires) : quel état cibler selon que l'on utilise la validation du navigateur ou `novalidate` avec des messages applicatifs, et comment annoncer les erreurs.
- Tout futur champ de formulaire réutilise ces signaux et ces tokens : les règles du thème visent l'état, pas la balise, et couvrent donc un nouveau champ ou un préfixe de tags personnalisé sans réécriture.
- Non vérifié : le comportement réel des lecteurs d'écran (lecture du message au focus du champ), suivi en #352, et Firefox.
