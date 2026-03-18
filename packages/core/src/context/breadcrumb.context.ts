import { createContext } from '@lit/context';
import { type ArBreadcrumbItem } from '../components/breadcrumb-item/breadcrumb-item.js';

export interface BreadcrumbRegistry {
    registerItem(item: ArBreadcrumbItem): void;
    unregisterItem(item: ArBreadcrumbItem): void;
    notifyItemChanged(item: ArBreadcrumbItem): void;
}

// Clé unique par instance de module → pas de collision entre composants
export const breadcrumbContext = createContext<BreadcrumbRegistry>(Symbol('ar-breadcrumb'));
