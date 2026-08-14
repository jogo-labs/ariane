import { registerTranslation } from '@shoelace-style/localize';
import type { Translation } from '../types/translation.js';

const sortLabel = (
    type: 'alpha' | 'numeric' | 'date',
    labels: { alpha: string; numeric: string; date: string },
): string => labels[type];

const translation: Translation = {
    $code: 'fr',
    $name: 'Français',
    $dir: 'ltr',

    // ── ar-table-sort ────────────────────────────────────────────────────
    sortAscending: (type) =>
        sortLabel(type, {
            alpha: 'Trier de A à Z',
            numeric: 'Trier par ordre croissant',
            date: 'Trier du plus ancien au plus récent',
        }),
    sortDescending: (type) =>
        sortLabel(type, {
            alpha: 'Trier de Z à A',
            numeric: 'Trier par ordre décroissant',
            date: 'Trier du plus récent au plus ancien',
        }),
    sortReset: (type) =>
        sortLabel(type, {
            alpha: 'Supprimer le tri alphabétique',
            numeric: 'Supprimer le tri numérique',
            date: 'Supprimer le tri chronologique',
        }),
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
};

registerTranslation(translation);

export default translation;
