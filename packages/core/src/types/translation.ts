import type { Translation as BaseTranslation } from '@shoelace-style/localize';
import type { TableSortType, TableSortOrder } from '../components/table-sort/table-sort.js';

/**
 * Contrat strict de traduction d'Ariane — étend le type de base de @shoelace-style/localize.
 * Un seul type plat regroupant les termes de tous les composants traduits (pas d'augmentation
 * par composant), à l'image du modèle Shoelace/WebAwesome. Groupé par composant en commentaire
 * ci-dessous (et dans src/translations/{fr,en}.ts) — si des termes finissent par être partagés
 * entre plusieurs composants, les regrouper sous un commentaire dédié plutôt que de les dupliquer.
 *
 * Exigeant : tout terme ajouté dans une version ultérieure devient une erreur de compilation
 * pour qui type sa traduction avec `FullTranslation`. À choisir pour que le compilateur
 * garantisse une traduction complète ; sinon utiliser `Translation`, qui tolère les termes absents
 * (le terme manquant se replie sur la langue de base, puis sur l'anglais intégré).
 */
export interface FullTranslation extends BaseTranslation {
    // ar-table-sort
    sortAscending: (type: TableSortType) => string;
    sortDescending: (type: TableSortType) => string;
    sortReset: (type: TableSortType) => string;
    sortPending: string;
    sortInProgress: string;
    sortApplied: (columnLabel: string, order: TableSortOrder) => string;
    sortFailed: (columnLabel: string) => string;

    // ar-datepicker
    today: string;
    close: string;
    closeCalendar: string;
    openCalendar: string;
    selectDate: string;
    previousYear: string;
    previousMonth: string;
    nextMonth: string;
    nextYear: string;
    daySelected: (formattedDate: string) => string;
    expectedFormat: (format: string, example: string) => string;
    availableDates: (range: string) => string;
    dateRangeBetween: (from: string, to: string) => string;
    dateRangeFrom: (from: string) => string;
    dateRangeUntil: (to: string) => string;
    /** `monthYearText`/`fullDateText` sont déjà formatés via Intl (locale-aware) — le terme
     *  décide seulement s'il faut un marqueur ordinal (ex. « 1er » en français). */
    formatOrdinalDate: (date: Date, monthYearText: string, fullDateText: string) => string;

    // ar-pagination
    previousPage: (page: number, total: number) => string;
    nextPage: (page: number, total: number) => string;
    pageStatus: (page: number, total: number) => string;
    compactPageStatus: (current: number, total: number) => string;
    goToPage: string;
    paginationLandmark: (page: number, total: number) => string;

    // ar-stepper
    stepperNavLabel: string;
    stepLabel: (order: number, isSubstep: boolean) => string;
    currentStepStatus: (current: number, total: number) => string;

    // ar-breadcrumb
    breadcrumbNavLabel: string;
    showBreadcrumb: string;

    // ar-charcounter
    remainingLabel: string;
    excessMessage: (count: number) => string;

    // ar-spinner
    loading: string;
    loadingDone: string;

    // ar-dialog
    closeDialog: string;
    closingBlocked: string;
    dialogDefaultLabel: string;

    // ar-alert
    closeAlert: string;
    // Validation des formulaires — messages de validité native (`validationMessage`, bulle du
    // navigateur), pas le contenu du slot `error`. Nom = `validation` + drapeau de ValidityState
    // avec majuscule initiale (`validationValueMissing`, `validationRangeUnderflow`…).
    validationValueMissing: string;
}

/**
 * Traduction fournie à `registerTranslation` : `$code`, `$name` et `$dir` obligatoires, tous les
 * termes optionnels. Un terme absent se replie sur la langue de base (`en` pour `en-GB`), puis sur
 * la traduction anglaise intégrée. Enregistrer une traduction d'un code déjà connu (`fr`, `en`)
 * fusionne ses termes par-dessus ceux déjà enregistrés : une surcharge partielle suffit. Pour
 * obtenir une vérification d'exhaustivité du compilateur, typer avec `FullTranslation`. Lire un
 * terme d'un objet `Translation` donne `string | undefined` : utiliser `FullTranslation` pour des
 * termes toujours présents.
 */
export type Translation = Pick<BaseTranslation, '$code' | '$name' | '$dir'> &
    Partial<Omit<FullTranslation, keyof BaseTranslation>>;
