import { createContext } from '@lit/context';
import type { ArTab } from '../components/tab/tab.js';
import type { ArTabPanel } from '../components/tab-panel/tab-panel.js';

export interface TabGroupRegistry {
    registerTab(tab: ArTab): void;
    unregisterTab(tab: ArTab): void;
    registerPanel(panel: ArTabPanel): void;
    unregisterPanel(panel: ArTabPanel): void;
    activate(name: string): void;
}

export const tabGroupContext = createContext<TabGroupRegistry>(Symbol('ar-tab-group'));
