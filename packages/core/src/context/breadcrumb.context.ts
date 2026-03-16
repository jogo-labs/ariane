import { createContext } from '@lit/context';
import { type MrBreadcrumbItem } from '../components/breadcrumb-item/breadcrumb-item.js';

export interface BreadcrumbRegistry {
    registerItem(item: MrBreadcrumbItem): void;
    unregisterItem(item: MrBreadcrumbItem): void;
    notifyItemChanged(item: MrBreadcrumbItem): void;
}

// Clé unique par instance de module → pas de collision entre composants
export const breadcrumbContext = createContext<BreadcrumbRegistry>(Symbol('mr-breadcrumb'));
