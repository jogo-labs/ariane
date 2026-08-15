import type { Translation as BaseTranslation } from '@shoelace-style/localize';
import type { TableSortType, TableSortOrder } from '../components/table-sort/table-sort.js';

/**
 * Contrat de traduction d'Ariane — étend le type de base de @shoelace-style/localize.
 * Un seul type plat regroupant les termes de tous les composants traduits (pas d'augmentation
 * par composant), à l'image du modèle Shoelace/WebAwesome. Groupé par composant en commentaire
 * ci-dessous (et dans src/translations/{fr,en}.ts) — si des termes finissent par être partagés
 * entre plusieurs composants, les regrouper sous un commentaire dédié plutôt que de les dupliquer.
 */
export interface Translation extends BaseTranslation {
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
}
