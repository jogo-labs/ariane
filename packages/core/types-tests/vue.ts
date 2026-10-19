// Typage Vue : `@ariane-ui/core/vue` augmente `GlobalComponents`.
import '@ariane-ui/core/vue';
import type { GlobalComponents } from 'vue';

type Props<Tag extends keyof GlobalComponents> = InstanceType<GlobalComponents[Tag]>['$props'];

export const dialog: Props<'ar-dialog'> = {
    open: true,
    label: 'Titre',
    mode: 'drawer',
    onArDialogHide: (e) => {
        const id: string | undefined = e.detail.id;
        void id;
    },
};

export const pagination: Props<'ar-pagination'> = {
    current: 2,
    onArPaginationPageChange: (e) => void e.detail.to,
};

// Attributs HTML globaux permis, comme sur un élément natif (`strictTemplates`).
export const globalAttributes: Props<'ar-alert'> = {
    id: 'a',
    class: 'b',
    role: 'alert',
    'aria-live': 'polite',
    variant: 'success',
};

// @ts-expect-error valeur hors de l'union
export const badMode: Props<'ar-dialog'> = { mode: 'nope' };

// @ts-expect-error détail inexistant
export const badDetail: Props<'ar-dialog'> = { onArDialogHide: (e) => void e.detail.bogus };
