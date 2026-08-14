import { registerTranslation } from '@shoelace-style/localize';
import type { Translation } from '../types/translation.js';

const sortLabel = (
    type: 'alpha' | 'numeric' | 'date',
    labels: { alpha: string; numeric: string; date: string },
): string => labels[type];

const translation: Translation = {
    $code: 'en',
    $name: 'English',
    $dir: 'ltr',

    // ── ar-table-sort ────────────────────────────────────────────────────
    sortAscending: (type) =>
        sortLabel(type, {
            alpha: 'Sort A to Z',
            numeric: 'Sort in ascending order',
            date: 'Sort oldest to newest',
        }),
    sortDescending: (type) =>
        sortLabel(type, {
            alpha: 'Sort Z to A',
            numeric: 'Sort in descending order',
            date: 'Sort newest to oldest',
        }),
    sortReset: (type) =>
        sortLabel(type, {
            alpha: 'Remove alphabetical sort',
            numeric: 'Remove numeric sort',
            date: 'Remove chronological sort',
        }),
    sortPending: 'Sorting…',
    sortInProgress: 'Sorting in progress, please wait.',
    sortApplied: (columnLabel, order) => {
        const suffix =
            order === 'none'
                ? 'sort removed'
                : order === 'asc'
                  ? 'ascending sort applied'
                  : 'descending sort applied';
        return `${columnLabel}: ${suffix}`;
    },
    sortFailed: (columnLabel) => `${columnLabel}: sort failed.`,

    // ── ar-datepicker ────────────────────────────────────────────────────
    today: 'Today',
    close: 'Close',
    openCalendar: 'Open calendar',
    selectDate: 'Select a date',
    previousYear: 'Previous year',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    nextYear: 'Next year',
    daySelected: (formattedDate) => `${formattedDate}, selected`,
};

registerTranslation(translation);

export default translation;
