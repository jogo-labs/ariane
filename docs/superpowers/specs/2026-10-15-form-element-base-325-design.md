# ArianeFormElement : propriétés réfléchies, API de validation, réinitialisation (#325)

Issue : jogo-labs/ariane#325. Constats du laboratoire d'intégration : S-003 (`name` non réfléchi), S-011 (API de validation absente de l'hôte), S-023 (`form.reset()` sans effet). Décisions du tri : `ariane-integration-lab/reports/SYNTHESIS.md` §6.

## Objectif

Faire de `ArianeFormElement` la base qui donne à **tout** composant de formulaire, présent et futur, le comportement d'un contrôle natif : s'inscrire dans `FormData` quel que soit le framework, exposer l'API de validation standard, se réinitialiser avec `form.reset()`. Le datepicker, seul utilisateur aujourd'hui, en hérite et perd le code qu'il portait seul.

Les trois décisions de conception ont été validées avec le mainteneur le 2026-10-15 :

1. périmètre de la base : `name`, `disabled`, `required` et la cascade `<fieldset disabled>` ;
2. réinitialisation : retour à la valeur **initiale au premier rendu** ; `formStateRestoreCallback` différé ;
3. erreur personnalisée : comme un `<input>` natif, elle persiste jusqu'à `setCustomValidity('')`.

## Contexte vérifié

- **`name` est la seule propriété à corriger pour S-003.** Dans le datepicker, `disabled` et `required` sont déjà `reflect: true` ; `name` est `@property() name = ''` sans réflexion. Un contrôle associé à un formulaire n'entre dans `FormData` que par son **attribut** `name` : React 19 pose `name` comme propriété, donc la date n'est jamais soumise (C-react-004).
- **`value` est réfléchi** (`reflect: true`) : l'attribut `value` suit la valeur courante, la valeur initiale n'existe plus nulle part. Une réinitialisation « comme un `<input>` » exige de la mémoriser à part.
- **`internals.setValidity` remplace tous les drapeaux.** `_syncFormValue()` du datepicker l'appelle à chaque mise à jour : un `setCustomValidity` appliqué directement serait écrasé à la validation suivante. Une fusion explicite est nécessaire.
- **`ArianeFormElement` ne contient que `formAssociated = true`**, et `internals` n'est créé qu'au `connectedCallback` (`ArianeElement`) : avant la connexion, `this.internals` est `undefined`. Happy-dom n'implémente pas `attachInternals`.
- Le CEM de `ar-datepicker` liste aujourd'hui `disabled`, `required` et `name` comme membres publics propres ; sa `superclass` pointe sur `ArianeFormElement`.

## Décisions

| Sujet                      | Décision                                                                                                                                                                                                                                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Propriétés de la base      | `name` (réfléchi avec `useDefault: true` de Lit : l'attribut n'est pas écrit au premier rendu, ce qui évite un `name=""` absent du HTML serveur et un défaut d'hydratation ; Lit ≥ 3.3.0), `disabled` (booléen réfléchi), `required` (booléen réfléchi). `readonly` et `value` restent dans le datepicker. |
| Cascade fieldset           | `_formDisabled` (état), `formDisabledCallback(disabled)` et l'accesseur `effectiveDisabled` passent dans la base.                                                                                                                                                                                          |
| Délégués de validation     | `validity`, `validationMessage`, `willValidate`, `form`, `labels`, `checkValidity()`, `reportValidity()`, `setCustomValidity(message)`, publics, vers `ElementInternals`.                                                                                                                                  |
| Sans `ElementInternals`    | Valeurs de repli inoffensives (voir ci-dessous), aucune exception.                                                                                                                                                                                                                                         |
| Fusion de la validité      | `setComponentValidity(flags, message?, anchor?)`, protégé, remplace les appels directs à `internals.setValidity` ; ajoute `customError` tant qu'un message personnalisé existe.                                                                                                                            |
| Erreur personnalisée       | Persiste jusqu'à `setCustomValidity('')`, y compris après `form.reset()` et après une nouvelle saisie (comportement natif).                                                                                                                                                                                |
| Réinitialisation           | `formResetCallback()` de la base appelle le crochet protégé `formReset()` (sans effet par défaut). Aucun événement de valeur émis ; un panneau ouvert se ferme avec ses événements habituels `hide` / `hidden`. Sans effet avant le premier rendu.                                                         |
| Valeur initiale            | `value` au premier rendu (`firstUpdated`), mémorisée par le datepicker.                                                                                                                                                                                                                                    |
| `formStateRestoreCallback` | Différé : aucun constat ne le demande, ajout non cassant plus tard.                                                                                                                                                                                                                                        |
| Changement incompatible    | Aucun : ajouts seulement. Les noms (`name`, `disabled`, `required`) existent déjà sur le datepicker.                                                                                                                                                                                                       |

## Conception

### `ArianeFormElement` (`src/base/ariane-form-element.ts`)

```ts
export class ArianeFormElement extends ArianeElement {
    static formAssociated = true;

    @property({ reflect: true }) name = '';
    @property({ reflect: true, type: Boolean }) disabled = false;
    @property({ reflect: true, type: Boolean }) required = false;
    @state() protected _formDisabled = false;

    protected get effectiveDisabled(): boolean {
        return this.disabled || this._formDisabled;
    }

    formDisabledCallback(disabled: boolean): void {
        this._formDisabled = disabled;
    } // @internal
    formResetCallback(): void {
        this.formReset();
    } // @internal
    protected formReset(): void {}

    // délégués (public)
    get validity(): ValidityState;
    get validationMessage(): string;
    get willValidate(): boolean;
    get form(): HTMLFormElement | null;
    get labels(): NodeList;
    checkValidity(): boolean;
    reportValidity(): boolean;
    setCustomValidity(message: string): void;

    protected setComponentValidity(
        flags: ValidityStateFlags,
        message?: string,
        anchor?: HTMLElement,
    ): void;
}
```

- **Valeurs de repli** (sans `ElementInternals`, avant la connexion ou sous happy-dom) : `validity` renvoie un objet figé « valide » (`valid: true`, tous les drapeaux à `false`), `validationMessage` `''`, `willValidate` `false`, `form` `null`, `labels` une `NodeList` vide, `checkValidity()` et `reportValidity()` `true`. `setCustomValidity` mémorise le message ; il est appliqué dès que `internals` existe.
- **Fusion** : la base mémorise le dernier `(flags, message, anchor)` du composant et le message personnalisé. `_applyValidity()` appelle `internals.setValidity({ ...flags, customError: true }, customMessage, anchor)` quand un message personnalisé existe, sinon `setValidity(flags, message, anchor)`. `setCustomValidity` et `setComponentValidity` rappellent `_applyValidity()`. `connectedCallback` le rappelle aussi une fois `internals` attaché.
- Le garde de `setValidity` (message non vide dès qu'un drapeau est vrai) est respecté : le message personnalisé prime, sinon celui du composant.
- Les crochets et accesseurs protégés ne sont pas dans l'API publique ; `formDisabledCallback` et `formResetCallback` sont `@internal` (appelés par le navigateur).

### Datepicker (`src/components/datepicker/datepicker.ts`)

- Retire ses déclarations de `name`, `disabled`, `required`, `_formDisabled`, `_effectiveDisabled` et `formDisabledCallback` (désormais hérités) ; `_effectiveDisabled` devient `effectiveDisabled` partout. `readonly` et `value` restent.
- `_syncFormValue()` appelle `setComponentValidity` (au lieu de `internals.setValidity`) : `{}` quand valide ou désactivé, `{ valueMissing: true }` avec `validationValueMissing` sinon.
- Mémorise `_defaultValue = this.value` dans `firstUpdated`.
- Surcharge `formReset()` : `this.value = this._defaultValue`, texte de saisie remis en cohérence (`_syncInputFromValue()` ou vidé), sélection du calendrier alignée sur la valeur, panneau fermé. La valeur redevient « initiale » même si le texte saisi n'était pas encore validé.
- Aucun événement de valeur émis par la réinitialisation (comme un `<input>`) ; si le panneau est ouvert, il se ferme avec `hide` / `hidden` (ce qui peut être annulé par un écouteur). Avant le premier rendu, `formReset()` ne fait rien (la valeur courante est la valeur initiale).

### Documentation et skill

- `apps/docs/src/content/components/ar-datepicker.mdx` : section « Formulaires » : `name` (y compris posé en propriété), `form.reset()`, API de validation, exemple `setCustomValidity` pour une erreur serveur, persistance de l'erreur, lien avec le slot `error` (affichage) et `validationValueMissing` (message natif).
- `packages/core/scripts/skill/content/` : mention de l'API de validation et de la réinitialisation là où le datepicker est présenté ; `npm run build:skill` puis `check:skill`.
- Vérifier que `name`, `disabled`, `required` et les délégués apparaissent dans l'API du datepicker (CEM, tableau de la doc, skill) : voir Risques.

## Tests

- **Base, Vitest, faux `ElementInternals` sur un composant factice** : délégation de chaque membre, valeurs de repli sans `internals`, fusion (`setComponentValidity` puis `setCustomValidity`, puis nouvel appel du composant : `customError` conservé ; `setCustomValidity('')` le retire), `formResetCallback` appelle `formReset()`, cascade `formDisabledCallback`.
- **Datepicker, Vitest** : les tests existants restent verts (critère de déplacement) ; `formReset` restaure la valeur initiale et remet le texte et la sélection en cohérence.
- **Navigateur réel (Web Test Runner, Chromium et WebKit en local ; Firefox en CI)** : `name` posé en propriété → présent dans `FormData` ; `form.reset()` restaure la valeur initiale (attribut `value` et valeur posée par propriété avant le premier rendu) ; `checkValidity()` / `validationMessage` / `validity.valueMissing` d'un datepicker obligatoire vide ; `setCustomValidity('x')` rend le champ invalide (`validity.customError`), survit à une validation du composant, se retire avec `''` ; `<fieldset disabled>` désactive et exclut la valeur de `FormData` ; `labels` renvoie le `<label for>` associé.

## Critères d'acceptation

1. `<ar-datepicker name="date">` posé en propriété dans `FormData` (test navigateur).
2. `form.reset()` ramène le datepicker à sa valeur initiale, texte de saisie compris.
3. L'API de validation standard est disponible sur l'hôte du datepicker et de tout futur composant de `ArianeFormElement`.
4. Un `setCustomValidity` n'est pas écrasé par les validations du composant.
5. Les tests existants du datepicker passent sans modification de leurs assertions.
6. `custom-elements.json`, la doc et le skill listent toujours `name`, `disabled`, `required` pour `ar-datepicker`, plus les nouveaux membres publics ; `npm run check:skill` passe.

## Hors périmètre

- `formStateRestoreCallback` (restauration par le navigateur) : différé.
- Effacement automatique de l'erreur personnalisée à la saisie : écarté (comportement natif conservé).
- `readonly` et `value` dans la base.
- Événements natifs `input` / `change` et autres corrections de comportement du datepicker : #326. Messages de plage (`validationRangeUnderflow`…) : avec S-024 dans #326.
- Nouveaux termes i18n : aucun (le message `valueMissing` existe depuis #335).

## Risques

- **Membres hérités dans le CEM.** `ArianeFormElement` est `@internal`. Il faut vérifier que l'analyseur remonte `name`, `disabled`, `required` et les délégués dans l'API de `ar-datepicker` (champ `inheritedFrom`), et que la doc et le skill les affichent. Si l'analyseur les perd, la règle de repli est de garder les trois déclarations de propriétés dans les composants (le comportement partagé restant dans la base) ; la décision est prise au plan après mesure.
- **Décorateurs Lit dans la base** (`@property`, `@state`) : `useDefineForClassFields: false` et `experimentalDecorators` sont déjà la configuration du dépôt ; à confirmer par le build et les tests.
- **Valeur initiale pour React** : le `value` posé par propriété avant la connexion est capturé au premier rendu ; un `value` posé après le premier rendu devient la valeur courante, pas la valeur initiale (comme un `<input>` contrôlé). Le comportement est documenté.
- **Message personnalisé et `disabled`** : un champ désactivé n'est pas validé (`willValidate` faux) ; l'erreur personnalisée mémorisée reste appliquée si le champ est réactivé.
