# i18n : type `Translation` tolérant, repli prévisible et message de validation (#335)

Issue : jogo-labs/ariane#335. Constats du laboratoire d'intégration : S-012 (type fermé, message de validation en dur), S-018 (langue de repli dépendante de l'ordre d'enregistrement). Décisions du tri : `ariane-integration-lab/reports/SYNTHESIS.md` §6.

## Objectif

Permettre d'ajouter des termes de traduction après la beta sans casser les traductions des consommateurs, rendre la langue de repli prévisible, et supprimer la dernière chaîne destinée à l'utilisateur codée en dur (le message de validité du datepicker).

Compréhension validée avec le mainteneur le 2026-10-13 : le tolérant est ce qui permet de **ne pas anticiper** les termes (les termes `pending` arrivent avec #327 à #331, les messages de plage avec #326) sans risque de casse.

## Décisions

| Sujet                 | Décision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Type public           | `Translation` : `$code`, `$name`, `$dir` obligatoires, tous les termes optionnels.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Type strict opt-in    | `FullTranslation` (tous les termes requis), **exporté** (`index.ts`, `utils/index.ts`). Pour qui veut que le compilateur garantisse une traduction complète et signale les termes ajoutés. Utilisé aussi par `fr.ts`, `en.ts` et le `LocalizeController` (vérification des clés à chaque appel `term()`). Documenté comme strict : un terme ajouté dans une version mineure devient une erreur de compilation pour ceux qui l'ont choisi.                                                                                                                                                                                                                                                                               |
| Surcharge             | `registerTranslation` fusionne par code de langue et par terme (comportement de `@shoelace-style/localize`, vérifié dans `node_modules/@shoelace-style/localize/dist/index.js`) : une surcharge partielle de `fr` ou `en` est légitime.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Repli                 | `registerTranslation` exporté par `/utils` (et par le barrel) est un enrobage typé qui importe `translations/en.js` puis `translations/fr.js` : `en` est enregistré avant toute traduction de l'utilisateur, donc c'est toujours le repli, et il est complet ; `fr` est enregistré aussi pour qu'une surcharge de `fr` ne soit pas écrasée par les composants chargés ensuite. **Langue de repli : l'anglais** (décision du mainteneur, 2026-10-13, après la revue : l'anglais est la convention du web et le plus largement compris ; le changer plus tard serait un changement de comportement silencieux pour tous les sites concernés). Les neuf composants importent `en` avant `fr`. Pas de test « `fr` absent ». |
| Nouveau terme         | `validationValueMissing` : fr « Veuillez renseigner ce champ. », en « Please fill out this field. ».                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Schéma de nommage     | Les messages de validité native se nomment `validation` + drapeau de `ValidityState` avec majuscule initiale (`validationValueMissing`, `validationRangeUnderflow`…). Un seul terme livré maintenant.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Autres chaînes en dur | Balayage fait : aucune autre chaîne destinée à l'utilisateur. Les messages de `warn()` sont des diagnostics de développement, hors i18n.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

## Conception

### Types (`src/types/translation.ts`)

- `FullTranslation extends BaseTranslation` : l'interface actuelle, plus `validationValueMissing: string` sous un commentaire « Validation des formulaires ». Exporté.
- `Translation = Pick<BaseTranslation, '$code' | '$name' | '$dir'> & Partial<Omit<FullTranslation, keyof BaseTranslation>>`. Exporté sous son nom actuel, devenu tolérant : c'est le type que `registerTranslation` accepte, et tout code existant qui écrit une traduction continue de compiler ; le code qui lit un terme d'un objet `Translation` obtient `string | undefined` (changement de type, signalé par un `BREAKING CHANGE` dans le message de squash). Choix du nom : garder `Translation` pour la voie par défaut évite que les exemples de la doc et les traductions déjà écrites restent sur le type strict (ce qui laisserait le risque de casse de S-012 entier).
- Les deux types guident l'auteur : `Translation` complète les noms de termes dans l'éditeur sans les imposer ; `FullTranslation` impose la liste entière. Une traduction `FullTranslation` est assignable à `Translation`.
- Le JSDoc de `Translation` explique : termes optionnels, repli par terme sur la langue de base puis sur l'anglais intégré, schéma de nommage de la validation, et que `validation*` désigne le message de validité native (bulle du navigateur, `validationMessage`), pas le slot `error`. Celui de `FullTranslation` explique le contrat strict et son effet à la montée de version.

### Contrôleur (`src/controllers/localize.controller.ts`)

`LocalizeController extends BaseLocalizeController<FullTranslation>` : les composants gardent des clés vérifiées. Aucun changement de leur code.

### Traductions internes (`src/translations/fr.ts`, `en.ts`)

Typées `FullTranslation` (le compilateur exige donc tout terme ajouté dans les deux langues). Ajout de `validationValueMissing`. Le test existant « fr et en implémentent les mêmes termes » reste.

### Enrobage de `registerTranslation` (`src/utils/register-translation.ts`)

```ts
import '../translations/en.js'; // enregistre en en premier : repli complet
import { registerTranslation as register } from '@shoelace-style/localize';
import type { Translation } from '../types/translation.js';

export function registerTranslation(...translations: Translation[]): void {
    register(...translations);
}
```

`utils/index.ts` ré-exporte cet enrobage au lieu du ré-export direct. `index.ts` le reprend via `utils/index.ts` (déjà le cas). Le commentaire d'en-tête de `utils/index.ts` précise que l'import enregistre la traduction `fr` intégrée (effet de bord limité au registre de traductions, aucun `customElements.define`).

Conséquences attendues, à prouver par tests :

1. `en.ts` et `fr.ts` ne s'évaluent qu'une fois : `/utils` et les composants partagent le module, y compris dans le bundle CDN (chunk partagé de `build-bundles.js`).
2. Une surcharge de `fr` ou de `en` enregistrée avant les composants n'est plus écrasée, la règle d'ordre d'`i18n.md` se simplifie.
3. `<html lang="de">` sans traduction `de`, avec `es` enregistré par l'utilisateur : les termes s'affichent en `en`.

Hors périmètre : un `registerTranslation` importé directement de `@shoelace-style/localize` n'a pas ces garanties ; la doc le dit.

### Datepicker (`src/components/datepicker/datepicker.ts`)

Le message passé à `internals.setValidity({ valueMissing: true }, …)` devient `this.localize.term('validationValueMissing')`. Il suit un changement de `lang` : le message est recalculé tant que le champ est obligatoire et vide (le mécanisme exact est laissé au plan). Aucune autre modification de comportement.

### Documentation et skill

- `skills/ariane/references/i18n.md` (source : `packages/core/scripts/skill/content/ariane/references/i18n.md`) : exemple avec traduction partielle, « le type impose de fournir tous les termes » remplacé par la règle de tolérance et de repli par terme, ligne « Validation des formulaires » dans le tableau avec la mise en garde sur le slot `error`, règle d'ordre réécrite (voir conséquences 1 à 3). Régénération avec `npm run build:skill`.
- Page `traductions` du site de doc et JSDoc : mêmes énoncés.
- L'API publique change (type, terme, comportement) : mise à jour du skill obligatoire (`CLAUDE.md`).

## Tests

- Type : une traduction `Translation` avec `$code`, `$name`, `$dir` seuls compile ; une clé inconnue est rejetée ; une traduction `FullTranslation` sans un terme ne compile pas ; une `FullTranslation` est acceptée par `registerTranslation`.
- `register-translation` : enregistrer `es` d'abord → le repli est `en` (terme `en` pour une langue sans traduction) ; surcharge partielle de `fr` avant et après l'import des composants → la valeur de l'utilisateur gagne, les autres termes restent ceux de `fr`.
- CDN : `cdn/utils` et l'autoloader partagent le registre, avec l'enrobage (étendre les tests `cdn-utils-*.browser.test.ts`).
- Datepicker : `validationMessage` suit `lang` (`fr`, `en`) ; message d'une langue sans traduction → `en`.
- Navigateur réel pour les cas dépendant de `document.documentElement.lang` (WTR : Chromium, WebKit, Firefox en CI ; localement `ARIANE_BROWSERS=chromium,webkit`).

## Critères d'acceptation

1. Une traduction fournie avec seulement `$code`, `$name`, `$dir` et un terme compile ; `FullTranslation` et `Translation` sont exportés.
2. Ajouter un terme à `FullTranslation` ne casse pas la compilation d'une traduction typée `Translation` ; elle ne casse que celles typées `FullTranslation`, par choix de leur auteur.
3. `en` est toujours la langue de repli quand `registerTranslation` vient de `/utils`.
4. Mesure du surcoût de `dist/utils/index.js` et de `cdn/utils.js` (référence : 962 o pour `utils/index.js`, #267) consignée dans la PR ; surcoût accepté.
5. Le message de validité du datepicker est localisé et n'existe plus en dur.
6. `i18n.md` (skill, doc) et le JSDoc reflètent le comportement ; `npm run check:skill` passe.

## Hors périmètre

- Termes `pending` : dans #327 à #331.
- Messages de plage (`validationRangeUnderflow`, `validationRangeOverflow`) : avec S-024 dans #326.
- Attribut `required-message` : abandonné (slot `error` et `setCustomValidity` de #325).
- `inputmode` du datepicker : abandonné.
- Traductions supplémentaires au-delà de `fr`/`en` : #190.
- Avertissement de développement pour un terme manquant : non prévu (la bibliothèque sous-jacente journalise déjà `No translation found` si un terme manque partout).

## Risques

- Le surcoût de taille de `/utils` (embarquement de `en` et `fr`, environ 5 Ko de source chacun).
- L'hypothèse « `en.ts` et `fr.ts` évalués une seule fois » dans tous les bundles (npm, CDN, headless) : couverte par les tests ci-dessus.
- Le typage de `Translation` côté consommateurs qui déstructurent ou étendent le type : à vérifier dans le lab après livraison.
- `FullTranslation` est une promesse de strictesse : documentée comme telle pour ne pas être prise pour un contrat de non-régression.
