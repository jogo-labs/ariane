/* eslint-disable */
// AUTO-GÉNÉRÉ par scripts/generate-types.js depuis custom-elements.json — ne pas modifier.
// Régénérer : npm run build:manifest && npm run generate:types
import type { ArAlert } from '../components/alert/alert.js';
import type { ArBreadcrumbItem } from '../components/breadcrumb-item/breadcrumb-item.js';
import type { ArBreadcrumb } from '../components/breadcrumb/breadcrumb.js';
import type { ArCharcounter } from '../components/charcounter/charcounter.js';
import type { ArCollapse } from '../components/collapse/collapse.js';
import type { ArDatepicker } from '../components/datepicker/datepicker.js';
import type { ArDialog } from '../components/dialog/dialog.js';
import type { ArDropdownItem } from '../components/dropdown-item/dropdown-item.js';
import type { ArDropdown } from '../components/dropdown/dropdown.js';
import type { ArPagination } from '../components/pagination/pagination.js';
import type { ArProgressbar } from '../components/progressbar/progressbar.js';
import type { ArSpinner } from '../components/spinner/spinner.js';
import type { ArStepperItem } from '../components/stepper-item/stepper-item.js';
import type { ArStepper } from '../components/stepper/stepper.js';
import type { ArTabGroup } from '../components/tab-group/tab-group.js';
import type { ArTabPanel } from '../components/tab-panel/tab-panel.js';
import type { ArTab } from '../components/tab/tab.js';
import type {
    ArTableSort,
    TableSortOrder,
    TableSortType,
} from '../components/table-sort/table-sort.js';
import type { ArTooltip } from '../components/tooltip/tooltip.js';

/** Instance de chaque élément, par balise. */
export interface ArianeElements {
    'ar-alert': ArAlert;
    'ar-breadcrumb': ArBreadcrumb;
    'ar-breadcrumb-item': ArBreadcrumbItem;
    'ar-charcounter': ArCharcounter;
    'ar-collapse': ArCollapse;
    'ar-datepicker': ArDatepicker;
    'ar-dialog': ArDialog;
    'ar-dropdown': ArDropdown;
    'ar-dropdown-item': ArDropdownItem;
    'ar-pagination': ArPagination;
    'ar-progressbar': ArProgressbar;
    'ar-spinner': ArSpinner;
    'ar-stepper': ArStepper;
    'ar-stepper-item': ArStepperItem;
    'ar-tab': ArTab;
    'ar-tab-group': ArTabGroup;
    'ar-tab-panel': ArTabPanel;
    'ar-table-sort': ArTableSort;
    'ar-tooltip': ArTooltip;
}

/** Événements publics de tous les composants, `detail` compris. */
export interface ArianeEventMap {
    'ar-alert-close': CustomEvent<{ id: string | undefined }>;
    'ar-breadcrumb-show': CustomEvent<{ id: string | undefined }>;
    'ar-breadcrumb-show-prevented': CustomEvent<{ id: string | undefined }>;
    'ar-breadcrumb-shown': CustomEvent<{ id: string | undefined }>;
    'ar-breadcrumb-hide': CustomEvent<{ id: string | undefined }>;
    'ar-breadcrumb-hide-prevented': CustomEvent<{ id: string | undefined }>;
    'ar-breadcrumb-hidden': CustomEvent<{ id: string | undefined }>;
    'ar-collapse-show': CustomEvent<{ id: string | undefined }>;
    'ar-collapse-show-prevented': CustomEvent<{ id: string | undefined }>;
    'ar-collapse-shown': CustomEvent<{ id: string | undefined }>;
    'ar-collapse-hide': CustomEvent<{ id: string | undefined }>;
    'ar-collapse-hide-prevented': CustomEvent<{ id: string | undefined }>;
    'ar-collapse-hidden': CustomEvent<{ id: string | undefined }>;
    'ar-datepicker-input-change': CustomEvent<{
        id: string | undefined;
        value: string | null;
        valueAsDate: Date | null;
        valid: boolean;
    }>;
    'ar-datepicker-input-complete': CustomEvent<{
        id: string | undefined;
        value: string | null;
        valueAsDate: Date | null;
        valid: boolean;
    }>;
    'ar-datepicker-show': CustomEvent<{ id: string | undefined }>;
    'ar-datepicker-shown': CustomEvent<{ id: string | undefined }>;
    'ar-datepicker-hide': CustomEvent<{ id: string | undefined }>;
    'ar-datepicker-hidden': CustomEvent<{ id: string | undefined }>;
    'ar-datepicker-view-change': CustomEvent<{
        id: string | undefined;
        year: number;
        month: number;
    }>;
    'ar-dialog-show': CustomEvent<{ id: string | undefined }>;
    'ar-dialog-show-prevented': CustomEvent<{ id: string | undefined }>;
    'ar-dialog-shown': CustomEvent<{ id: string | undefined }>;
    'ar-dialog-hide': CustomEvent<{ id: string | undefined }>;
    'ar-dialog-hide-prevented': CustomEvent<{ id: string | undefined }>;
    'ar-dialog-hidden': CustomEvent<{ id: string | undefined }>;
    'ar-dialog-dismissed': CustomEvent<{ id: string | undefined }>;
    'ar-dialog-dismissed-prevented': CustomEvent<{ id: string | undefined }>;
    'ar-dialog-accepted': CustomEvent<{ id: string | undefined }>;
    'ar-dialog-accepted-prevented': CustomEvent<{ id: string | undefined }>;
    'ar-dropdown-show': CustomEvent<{ id: string | undefined }>;
    'ar-dropdown-show-prevented': CustomEvent<{ id: string | undefined }>;
    'ar-dropdown-shown': CustomEvent<{ id: string | undefined }>;
    'ar-dropdown-hide': CustomEvent<{ id: string | undefined }>;
    'ar-dropdown-hide-prevented': CustomEvent<{ id: string | undefined }>;
    'ar-dropdown-hidden': CustomEvent<{ id: string | undefined }>;
    'ar-dropdown-select': CustomEvent<{ id: string | undefined; item: ArDropdownItem }>;
    'ar-pagination-page-change': CustomEvent<{ id: string | undefined; from: number; to: number }>;
    'ar-pagination-page-changed': CustomEvent<{ id: string | undefined; from: number; to: number }>;
    'ar-stepper-step-change': CustomEvent<{ id: string | undefined; from: string; to: string }>;
    'ar-stepper-step-changed': CustomEvent<{ id: string | undefined; from: string; to: string }>;
    'ar-tab-group-change': CustomEvent<{ id: string | undefined; active: string }>;
    'ar-table-sort-change': CustomEvent<{
        id: string | undefined;
        type: TableSortType;
        currentOrder: TableSortOrder;
        requestedOrder: TableSortOrder;
        columnLabel: string;
    }>;
    'ar-tooltip-shown': CustomEvent<{ id: string | undefined }>;
    'ar-tooltip-hidden': CustomEvent<{ id: string | undefined }>;
}

/** Noms des événements de chaque composant, par balise. */
export interface ArianeElementEventNames {
    'ar-alert': 'ar-alert-close';
    'ar-breadcrumb':
        | 'ar-breadcrumb-show'
        | 'ar-breadcrumb-show-prevented'
        | 'ar-breadcrumb-shown'
        | 'ar-breadcrumb-hide'
        | 'ar-breadcrumb-hide-prevented'
        | 'ar-breadcrumb-hidden';
    'ar-breadcrumb-item': never;
    'ar-charcounter': never;
    'ar-collapse':
        | 'ar-collapse-show'
        | 'ar-collapse-show-prevented'
        | 'ar-collapse-shown'
        | 'ar-collapse-hide'
        | 'ar-collapse-hide-prevented'
        | 'ar-collapse-hidden';
    'ar-datepicker':
        | 'ar-datepicker-input-change'
        | 'ar-datepicker-input-complete'
        | 'ar-datepicker-show'
        | 'ar-datepicker-shown'
        | 'ar-datepicker-hide'
        | 'ar-datepicker-hidden'
        | 'ar-datepicker-view-change';
    'ar-dialog':
        | 'ar-dialog-show'
        | 'ar-dialog-show-prevented'
        | 'ar-dialog-shown'
        | 'ar-dialog-hide'
        | 'ar-dialog-hide-prevented'
        | 'ar-dialog-hidden'
        | 'ar-dialog-dismissed'
        | 'ar-dialog-dismissed-prevented'
        | 'ar-dialog-accepted'
        | 'ar-dialog-accepted-prevented';
    'ar-dropdown':
        | 'ar-dropdown-show'
        | 'ar-dropdown-show-prevented'
        | 'ar-dropdown-shown'
        | 'ar-dropdown-hide'
        | 'ar-dropdown-hide-prevented'
        | 'ar-dropdown-hidden'
        | 'ar-dropdown-select';
    'ar-dropdown-item': never;
    'ar-pagination': 'ar-pagination-page-change' | 'ar-pagination-page-changed';
    'ar-progressbar': never;
    'ar-spinner': never;
    'ar-stepper': 'ar-stepper-step-change' | 'ar-stepper-step-changed';
    'ar-stepper-item': never;
    'ar-tab': never;
    'ar-tab-group': 'ar-tab-group-change';
    'ar-tab-panel': never;
    'ar-table-sort': 'ar-table-sort-change';
    'ar-tooltip': 'ar-tooltip-shown' | 'ar-tooltip-hidden';
}

/** Propriétés et attributs publics modifiables de chaque composant, par balise. */
export interface ArianeElementProps {
    'ar-alert': {
        nextFocus?: string | undefined;
        'next-focus'?: string | undefined;
        withoutNotification?: boolean | undefined;
        'without-notification'?: boolean | undefined;
        variant?: 'success' | 'warning' | 'error' | 'info' | undefined;
    };
    'ar-breadcrumb': {
        open?: boolean | undefined;
    };
    'ar-breadcrumb-item': {
        label?: string | undefined;
        href?: string | undefined;
    };
    'ar-charcounter': {
        for?: string | undefined;
        max?: number | undefined;
        warnThreshold?: number | undefined;
        'warn-threshold'?: number | undefined;
        label?: string | undefined;
    };
    'ar-collapse': {
        open?: boolean | undefined;
        for?: string | undefined;
        name?: string | undefined;
        triggerPosition?: 'before' | 'after' | undefined;
        'trigger-position'?: 'before' | 'after' | undefined;
        disabled?: boolean | undefined;
    };
    'ar-datepicker': {
        value?: string | undefined;
        format?: string | undefined;
        min?: string | undefined;
        max?: string | undefined;
        isDateDisabled?: (date: Date) => boolean | undefined;
        placeholder?: string | undefined;
        autocomplete?: string | undefined;
        label?: string | undefined;
        readonly?: boolean | undefined;
        open?: boolean | undefined;
        pending?: boolean | undefined;
        name?: string | undefined;
        disabled?: boolean | undefined;
        required?: boolean | undefined;
    };
    'ar-dialog': {
        open?: boolean | undefined;
        closeOnBackdrop?: boolean | undefined;
        'close-on-backdrop'?: boolean | undefined;
        label?: string | undefined;
        withoutHeader?: boolean | undefined;
        'without-header'?: boolean | undefined;
        mode?: 'modal' | 'drawer' | undefined;
        placement?: 'left' | 'right' | undefined;
        size?: 'sm' | 'md' | 'lg' | 'xl' | undefined;
        pending?: boolean | undefined;
        preventedMessage?: string | undefined;
        'prevented-message'?: string | undefined;
        closeLabel?: string | undefined;
        'close-label'?: string | undefined;
    };
    'ar-dropdown': {
        open?: boolean | undefined;
        placement?:
            | 'top'
            | 'top-start'
            | 'top-end'
            | 'right'
            | 'right-start'
            | 'right-end'
            | 'bottom'
            | 'bottom-start'
            | 'bottom-end'
            | 'left'
            | 'left-start'
            | 'left-end'
            | undefined;
        disabled?: boolean | undefined;
        noScrollLock?: boolean | undefined;
        'no-scroll-lock'?: boolean | undefined;
        for?: string | undefined;
    };
    'ar-dropdown-item': {};
    'ar-pagination': {
        current?: number | undefined;
        total?: number | undefined;
        compact?: boolean | undefined;
        pending?: boolean | undefined;
    };
    'ar-progressbar': {
        percent?: number | undefined;
    };
    'ar-spinner': {
        done?: boolean | undefined;
        loadingLabel?: string | undefined;
        'loading-label'?: string | undefined;
        doneLabel?: string | undefined;
        'done-label'?: string | undefined;
        size?: 'xs' | 'sm' | 'lg' | undefined;
    };
    'ar-stepper': {
        currentPath?: string | undefined;
        'current-path'?: string | undefined;
        pending?: boolean | undefined;
        mode?: 'create' | 'edit' | undefined;
        followScroll?: boolean | undefined;
        'follow-scroll'?: boolean | undefined;
        desktopTarget?: string | undefined;
        'desktop-target'?: string | undefined;
        desktopFrom?: number | undefined;
        'desktop-from'?: number | undefined;
        open?: boolean | undefined;
        reverseAlign?: boolean | undefined;
        'reverse-align'?: boolean | undefined;
    };
    'ar-stepper-item': {
        path?: string | undefined;
        label?: string | undefined;
        href?: string | undefined;
    };
    'ar-tab': {
        panel?: string | undefined;
        disabled?: boolean | undefined;
    };
    'ar-tab-group': {
        active?: string | undefined;
        label?: string | undefined;
        manualActivation?: boolean | undefined;
        'manual-activation'?: boolean | undefined;
    };
    'ar-tab-panel': {
        name?: string | undefined;
    };
    'ar-table-sort': {
        type?: 'alpha' | 'numeric' | 'date' | undefined;
        order?: 'none' | 'asc' | 'desc' | undefined;
        pending?: boolean | undefined;
    };
    'ar-tooltip': {
        for?: string | undefined;
        placement?:
            | 'top'
            | 'top-start'
            | 'top-end'
            | 'right'
            | 'right-start'
            | 'right-end'
            | 'bottom'
            | 'bottom-start'
            | 'bottom-end'
            | 'left'
            | 'left-start'
            | 'left-end'
            | undefined;
        showDelay?: number | undefined;
        'show-delay'?: number | undefined;
        hideDelay?: number | undefined;
        'hide-delay'?: number | undefined;
        withoutArrow?: boolean | undefined;
        'without-arrow'?: boolean | undefined;
        disabled?: boolean | undefined;
    };
}

declare global {
    interface HTMLElementEventMap extends ArianeEventMap {}
}
