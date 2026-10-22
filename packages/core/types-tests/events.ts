// Typage des événements : le paquet publié (dist/*.d.ts) augmente `HTMLElementEventMap`.
import '@ariane-ui/core';
import type { ArDropdownItem } from '@ariane-ui/core/headless';

const el = document.createElement('div');

el.addEventListener('ar-dialog-hide', (e) => {
    const id: string | undefined = e.detail.id;
    e.preventDefault();
    void id;
});

el.addEventListener('ar-dropdown-select', (e) => {
    const item: ArDropdownItem = e.detail.item;
    void item;
});

el.addEventListener('ar-table-sort-change', (e) => {
    const next: 'none' | 'asc' | 'desc' = e.detail.requestedOrder;
    void next;
});

el.addEventListener('ar-datepicker-view-change', (e) => {
    const month: number = e.detail.month;
    void month;
});

el.addEventListener('ar-dialog-hide', (e) => {
    // @ts-expect-error `detail` n'a pas de champ `bogus`
    void e.detail.bogus;
});

// Les événements natifs restent typés par le DOM.
el.addEventListener('click', (e) => {
    const x: number = e.clientX;
    void x;
});
