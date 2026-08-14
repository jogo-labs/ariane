import type { Translation as BaseTranslation } from '@shoelace-style/localize';
import type { TableSortType, TableSortOrder } from '../components/table-sort/table-sort.js';

/**
 * Contrat de traduction d'Ariane — étend le type de base de @shoelace-style/localize.
 * Un seul type plat regroupant les termes de tous les composants traduits (pas d'augmentation
 * par composant), à l'image du modèle Shoelace/WebAwesome.
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
    openCalendar: string;
    selectDate: string;
    previousYear: string;
    previousMonth: string;
    nextMonth: string;
    nextYear: string;
    daySelected: (formattedDate: string) => string;
}
