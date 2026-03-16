import { createContext } from '@lit/context';
import { type MrStepperItem } from '../components/stepper-item/stepper-item.js';

export type StepperItemAttribute = 'path' | 'label' | 'href';

export interface StepperRegistry {
    registerItem(item: MrStepperItem): void;
    unregisterItem(item: MrStepperItem): void;

    notifyItemChanged(item: MrStepperItem, attribute: StepperItemAttribute): void;
}

// Clé unique par instance de module → pas de collision entre composants
export const stepperContext = createContext<StepperRegistry>(Symbol('mt-stepper'));
