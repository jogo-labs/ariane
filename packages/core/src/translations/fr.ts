import { registerTranslation } from '@shoelace-style/localize';
import type { Translation } from '../types/translation.js';

const translation: Translation = {
    $code: 'fr',
    $name: 'Français',
    $dir: 'ltr',

    // ── ar-table-sort ────────────────────────────────────────────────────
    sortAscending: (type) =>
        ({
            alpha: 'Trier de A à Z',
            numeric: 'Trier par ordre croissant',
            date: 'Trier du plus ancien au plus récent',
        })[type],
    sortDescending: (type) =>
        ({
            alpha: 'Trier de Z à A',
            numeric: 'Trier par ordre décroissant',
            date: 'Trier du plus récent au plus ancien',
        })[type],
    sortReset: (type) =>
        ({
            alpha: 'Supprimer le tri alphabétique',
            numeric: 'Supprimer le tri numérique',
            date: 'Supprimer le tri chronologique',
        })[type],
    sortPending: 'Tri en cours…',
    sortInProgress: 'Tri en cours, veuillez patienter.',
    sortApplied: (columnLabel, order) => {
        const suffix =
            order === 'none'
                ? 'tri supprimé'
                : order === 'asc'
                  ? 'tri croissant appliqué'
                  : 'tri décroissant appliqué';
        return `${columnLabel} : ${suffix}`;
    },
    sortFailed: (columnLabel) => `${columnLabel} : échec du tri.`,

    // ── ar-datepicker ────────────────────────────────────────────────────
    today: "Aujourd'hui",
    close: 'Fermer',
    openCalendar: 'Ouvrir le calendrier',
    selectDate: 'Sélectionner une date',
    previousYear: 'Année précédente',
    previousMonth: 'Mois précédent',
    nextMonth: 'Mois suivant',
    nextYear: 'Année suivante',
    daySelected: (formattedDate) => `${formattedDate}, sélectionné`,
    expectedFormat: (fmt, example) => `Format attendu : ${fmt} (ex. ${example})`,
    availableDates: (range) => `Dates disponibles : ${range}`,
    dateRangeBetween: (from, to) => `entre le ${from} et le ${to}`,
    dateRangeFrom: (from) => `à partir du ${from}`,
    dateRangeUntil: (to) => `jusqu'au ${to}`,
    formatOrdinalDate: (date, monthYearText, fullDateText) =>
        date.getDate() === 1 ? `1er ${monthYearText}` : fullDateText,
};

registerTranslation(translation);

export default translation;
