import { registerTranslation } from '@shoelace-style/localize';
import type { Translation } from '../types/translation.js';

const translation: Translation = {
    $code: 'en',
    $name: 'English',
    $dir: 'ltr',

    // ── ar-table-sort ────────────────────────────────────────────────────
    sortAscending: (type) =>
        ({
            alpha: 'Sort A to Z',
            numeric: 'Sort in ascending order',
            date: 'Sort oldest to newest',
        })[type],
    sortDescending: (type) =>
        ({
            alpha: 'Sort Z to A',
            numeric: 'Sort in descending order',
            date: 'Sort newest to oldest',
        })[type],
    sortReset: (type) =>
        ({
            alpha: 'Remove alphabetical sort',
            numeric: 'Remove numeric sort',
            date: 'Remove chronological sort',
        })[type],
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
    closeCalendar: 'Close calendar',
    openCalendar: 'Open calendar',
    selectDate: 'Select a date',
    previousYear: 'Previous year',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    nextYear: 'Next year',
    daySelected: (formattedDate) => `${formattedDate}, selected`,
    expectedFormat: (fmt, example) => `Expected format: ${fmt} (e.g. ${example})`,
    availableDates: (range) => `Available dates: ${range}`,
    dateRangeBetween: (from, to) => `between ${from} and ${to}`,
    dateRangeFrom: (from) => `from ${from}`,
    dateRangeUntil: (to) => `until ${to}`,
    formatOrdinalDate: (_date, _monthYearText, fullDateText) => fullDateText,

    // ── ar-pagination ────────────────────────────────────────────────────
    previousPage: (page, total) => `Previous page (page ${page} of ${total})`,
    nextPage: (page, total) => `Next page (page ${page} of ${total})`,
    pageStatus: (page, total) => `Page ${page} of ${total}`,
    compactPageStatus: (current, total) => `Page ${current} / ${total}`,
    goToPage: 'Go to page',
    paginationLandmark: (page, total) => `Pagination, page ${page} of ${total}`,

    // ── ar-stepper ───────────────────────────────────────────────────────
    stepperNavLabel: 'Form steps',

    // ── ar-breadcrumb ────────────────────────────────────────────────────
    breadcrumbNavLabel: 'You are here',
    showBreadcrumb: 'Show breadcrumb',

    // ── ar-charcounter ───────────────────────────────────────────────────
    remainingLabel: 'character remaining|characters remaining',
    excessMessage: (count) =>
        `Limit exceeded by ${count} ${count === 1 ? 'character' : 'characters'}`,

    // ── ar-spinner ───────────────────────────────────────────────────────
    loading: 'Content is loading',
    loadingDone: 'Loading complete',

    // ── ar-dialog ────────────────────────────────────────────────────────
    closeDialog: 'Close dialog',
    closingBlocked: 'Closing blocked.',
    dialogDefaultLabel: 'Dialog',

    // ── ar-alert ─────────────────────────────────────────────────────────
    closeAlert: 'Close alert',
};

registerTranslation(translation);

export default translation;
