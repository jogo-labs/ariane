# ADR-008 : Messages de validation — traduits et propres au composant, pas recopiés du navigateur

**Statut :** Adopté
**Date :** 2026-10-30

## Contexte

Un composant de formulaire d'Ariane (`ar-datepicker` aujourd'hui, d'autres demain) déclare sa validité à `ElementInternals` avec `setValidity(drapeaux, message)`. La spécification exige un message non vide dès qu'un drapeau est levé. Pour un `<input>` natif, le navigateur fournit lui-même ce message, dans sa langue. Pour un élément personnalisé, il n'en fournit aucun : `validationMessage` et la bulle de `reportValidity()` affichent exactement le texte passé à `setValidity()`.

`ar-datepicker` lève cinq drapeaux : `valueMissing` (`required`), `rangeUnderflow` (`min`), `rangeOverflow` (`max`), `badInput` (texte non reconnu) et, depuis #408, `stepMismatch` (date refusée par `isDateDisabled`, qu'elle soit saisie à la main ou posée par `value`). `customError` appartient à l'application (`setCustomValidity()`).

La question posée : traduire ces messages est-il pertinent, alors qu'un consommateur qui s'appuie sur la validation native attend les messages de son navigateur ? Notre mécanisme de traduction n'aurait de sens que pour des textes que le navigateur ne fournit pas (hint, message du slot `error`).

## Options étudiées

**Recopier les messages natifs (approche de `wa-known-date`, WebAwesome).** Leur composant contient un `<input type="date">` caché avec `min`, `max` et `required`. Un `MirrorValidator` appelle `checkValidity()` sur cet input et recopie `validationMessage` et les drapeaux vers l'hôte, sans traduction à maintenir. Seul le message d'une date partielle ou impossible (`badInput`) est traduit par eux (terme `incompleteDate`, présent dans leurs fichiers de langue) ; celui du champ obligatoire est aussi le texte natif (commentaire « @TODO: Add a translation »).

Ce qui a été mesuré dans Chromium (Playwright, input natif temporaire) :

- `valueMissing`, `rangeUnderflow` et `rangeOverflow` donnent un message, par exemple « Value must be 06/10/2026 or later. ».
- La langue des messages n'a pas suivi la locale du contexte de test (`fr-FR` a donné de l'anglais) ; on ne sait pas si c'est propre au test ou général.
- La borne est écrite dans le format de la locale du navigateur (`06/10/2026`), qui peut contredire le `format` du champ affiché et rester ambigu : 6 octobre ou 10 juin ?
- `badInput` ne peut pas être produit par script : un `<input type="date">` assainit une valeur impossible en chaîne vide. Il n'existe que pour la saisie dans l'interface à segments du navigateur (« Please enter a valid value. The field is incomplete or has an invalid date. »).
- L'input interne d'Ariane est de type texte et son `format` est libre : le navigateur ne peut pas évaluer ni la borne ni la forme de la date.

**Déléguer seulement `valueMissing`** (`required` sur l'input interne). Le message suivrait la langue du navigateur, pas notre `lang`, pour un seul message sur quatre ; il faut un terme à nous pour `badInput` de toute façon.

**Garder des messages traduits par le composant, qui suivent `lang`.**

## Décision

Le composant fournit ses messages de validation, traduits, qui suivent l'attribut `lang` (ou `<html lang>`) comme le reste de ses textes.

- **Portée par composant.** `Translation` est partagé par tous les composants. Un terme n'est sans préfixe que si son texte vaut pour tout champ (`validationValueMissing`, « Veuillez renseigner ce champ. »). Tout message propre à un composant porte son nom : `datepickerValidationRangeUnderflow`, `datepickerValidationRangeOverflow`, `datepickerValidationBadInput`, `datepickerValidationStepMismatch`. Un futur composant de formulaire ajoute ses propres termes sans conflit et sans rien renommer. Ce choix, à contre-courant du YAGNI, est volontaire : renommer un terme de traduction casse les applications qui l'ont surchargé, alors qu'en ajouter ne casse rien, et d'autres champs de formulaire sont très probables.
- **Drapeau de `isDateDisabled`.** `stepMismatch`, le plus proche des drapeaux natifs (valeur hors de l'ensemble des valeurs permises). `customError` reste réservé à l'application. Hors plage, `min` et `max` priment.
- **Langues non fournies.** Une langue sans traduction retombe sur l'anglais. L'application ajoute sa langue ou reformule un message avec `registerTranslation` (documenté dans la page Traductions) ; la page Formulaires précise que le message d'un champ personnalisé vient des traductions du composant et que le navigateur ne le localise pas.
- **Pas de doc supplémentaire sur l'autofill ni sur `inputmode`.** Ces attributs se comportent comme ceux d'un champ natif ; seule la ligne d'API de `inputmode` (#409) sera ajoutée.

## Conséquences

- Les termes `validationRangeUnderflow` et `validationRangeOverflow` sont renommés ; `datepickerValidationBadInput` et `datepickerValidationStepMismatch` sont ajoutés au type `Translation` (changement incompatible, alpha.18).
- Pour que les textes suivent un changement dynamique de langue, `ArianeElement` déclare un `lang` réactif et réfléchi (#407), et le message de validité est recalculé à chaque mise à jour tant que le champ est invalide (le message est posé à `ElementInternals` et ne se met pas à jour tout seul).
- Écart accepté : dans un formulaire qui mêle champs natifs et composants Ariane, sur une page ni en français ni en anglais, les natifs parlent la langue du navigateur et les composants Ariane parlent leur langue de repli (anglais) tant que l'application n'a pas enregistré sa traduction.
- Les quatre messages couvrent tous les drapeaux que `ar-datepicker` peut lever. Un futur composant avec `pattern`, `minlength` ou `step` aura ses propres termes.

## À réexaminer

- Si les navigateurs exposent un jour les messages natifs par drapeau, sans qu'il faille créer un état de validité pour les lire, une recopie redeviendrait attractive : tous les messages cesseraient d'avoir un coût de traduction. `badInput` resterait propre au composant tant que l'input interne est un champ texte avec un `format` libre.
- Si la recopie du format de borne du navigateur cesse d'être ambiguë avec le `format` du champ.
