import { createContext } from '@lit/context';
import { type ArStepperItem } from '../components/stepper-item/stepper-item.js';

export type StepperItemAttribute = 'path' | 'label' | 'href';

export interface StepperRegistry {
    registerItem(item: ArStepperItem): void;
    unregisterItem(item: ArStepperItem): void;

    notifyItemChanged(item: ArStepperItem, attribute: StepperItemAttribute): void;
}

// Clé unique par instance de module → pas de collision entre composants
export const stepperContext = createContext<StepperRegistry>(Symbol('mt-stepper'));
