import { registerTranslation } from '@shoelace-style/localize';
import type { FullTranslation } from '../types/translation.js';

const translation: FullTranslation = {
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
    datepickerPending: 'Chargement en cours…',
    today: "Aujourd'hui",
    close: 'Fermer',
    closeCalendar: 'Fermer le calendrier',
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

    // ── ar-pagination ────────────────────────────────────────────────────
    previousPage: (page, total) => `Page précédente (page ${page} sur ${total})`,
    nextPage: (page, total) => `Page suivante (page ${page} sur ${total})`,
    pageStatus: (page, total) => `Page ${page} sur ${total}`,
    compactPageStatus: (current, total) => `Page ${current} / ${total}`,
    goToPage: 'Aller à la page',
    paginationPending: 'Chargement en cours…',
    paginationLandmark: (page, total) => `Pagination, page ${page} sur ${total}`,

    // ── ar-stepper ───────────────────────────────────────────────────────
    stepperNavLabel: 'Étapes du formulaire',
    stepperPending: 'Chargement en cours…',
    stepLabel: (order, isSubstep) => `${isSubstep ? 'sous-' : ''}étape ${order}:`,
    currentStepStatus: (current, total) => `Étape ${current} / ${total} (en cours)`,

    // ── ar-breadcrumb ────────────────────────────────────────────────────
    breadcrumbNavLabel: 'Vous êtes ici',
    showBreadcrumb: "Afficher le fil d'ariane",

    // ── ar-charcounter ───────────────────────────────────────────────────
    remainingLabel: 'caractère restant|caractères restants',
    excessMessage: (count) =>
        `Limite dépassée de ${count} ${count === 1 ? 'caractère' : 'caractères'}`,

    // ── ar-spinner ───────────────────────────────────────────────────────
    loading: 'Contenu en cours de chargement',
    loadingDone: 'Chargement terminé',

    // ── ar-dialog ────────────────────────────────────────────────────────
    closeDialog: 'Fermer la boîte de dialogue',
    closingBlocked: 'Fermeture bloquée.',
    dialogPending: 'Traitement en cours…',
    dialogDefaultLabel: 'Dialogue',

    // ── ar-alert ─────────────────────────────────────────────────────────
    closeAlert: "Fermer l'alerte",

    // ── Validation des formulaires ───────────────────────────────────────
    validationValueMissing: 'Veuillez renseigner ce champ.',
    datepickerValidationRangeUnderflow: (min) => `La date doit être au plus tôt le ${min}.`,
    datepickerValidationRangeOverflow: (max) => `La date doit être au plus tard le ${max}.`,
    datepickerValidationBadInput: (format, example) =>
        `Date non reconnue. Format attendu : ${format} (ex. ${example}).`,
    datepickerValidationStepMismatch: "Cette date n'est pas disponible.",
};

registerTranslation(translation);

export default translation;
