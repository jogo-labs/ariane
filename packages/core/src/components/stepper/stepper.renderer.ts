import { html, type TemplateResult } from 'lit';
import { type NavigationNode, type NavigationMode } from '../../types/navigation-nodes.js';
import type { IndicatorState } from '../stepper-item/stepper-item.js';

/* ------------------------------------------------ */
/* TYPES                                            */
/* ------------------------------------------------ */

// Contexte nécessaire au rendu mobile, fourni par ar-stepper.
export interface MobileRenderContext {
    currentStepLabel: string | undefined;
    currentSubStepLabel: string | undefined;
    currentStepStatus: string;
    onToggle: () => void;
}

/* ------------------------------------------------ */
/* RENDER-STATE — poussé sur chaque ArStepperItem   */
/* ------------------------------------------------ */

// Un groupe est "courant" si lui-même OU l'un de ses enfants l'est.
// Le state engine aplatit les noeuds en DFS et marque le parent 'completed'
// dès qu'un enfant est current → on ne peut pas se fier uniquement à step.state.
function isGroupCurrent(node: NavigationNode): boolean {
    return node.state === 'current' || node.children.some((child) => child.state === 'current');
}

/**
 * Calcule le render-state de chaque étape/sous-étape depuis l'arbre `NavigationNode` et le pousse
 * directement sur l'instance `ArStepperItem` correspondante (`node.item`). Remplace l'ancienne
 * reconstruction HTML — la logique de calcul (current/completed/lien/sous-étapes visibles) est
 * portée à l'identique depuis l'ancien `renderStep`/`renderSubStep`.
 */
export function pushItemRenderState(
    steps: NavigationNode[],
    mode: NavigationMode,
    stepLabel: (order: number, isSubstep: boolean) => string,
): void {
    steps.forEach((step, index) => {
        const order = index + 1;
        const isCurrent = isGroupCurrent(step);
        const isCompleted =
            !isCurrent && (mode === 'edit' ? step.state !== 'current' : step.state === 'completed');
        const indicatorState: IndicatorState = isCurrent
            ? 'current'
            : step.state === 'completed'
              ? 'completed'
              : 'default';
        const showSubsteps = (isCurrent || mode === 'edit') && step.children.length > 0;

        step.item.setRenderState({
            indicatorState,
            isLink: isCompleted,
            showSubsteps,
            srLabel: stepLabel(order, false),
        });

        step.children.forEach((sub, subIndex) => {
            const subOrder = subIndex + 1;
            const subIsCurrent = sub.state === 'current';
            const subIsCompleted = sub.state === 'completed';
            // La sous-étape courante ne doit jamais être un lien, y compris en mode edit
            // (on ne navigue pas vers la page où l'on se trouve déjà).
            const isEditableLink = mode === 'edit' && !subIsCurrent;
            const subIndicatorState: IndicatorState = subIsCurrent
                ? 'current'
                : subIsCompleted
                  ? 'completed'
                  : 'default';

            sub.item.setRenderState({
                indicatorState: subIndicatorState,
                isLink: subIsCompleted || isEditableLink,
                showSubsteps: false,
                srLabel: stepLabel(subOrder, true),
            });
        });
    });
}

/* ------------------------------------------------ */
/* CHROME — liste (desktop) et dropdown (mobile)    */
/* ------------------------------------------------ */

function renderStepList(cssClass: string): TemplateResult {
    return html`
        <ol part="list" class="list-unstyled ${cssClass}">
            <slot></slot>
        </ol>
    `;
}

export function renderDesktop(): TemplateResult {
    return renderStepList('desktop');
}

function defaultTriggerIcon(): TemplateResult {
    return html`<svg
        aria-hidden="true"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
    >
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"></path>
    </svg>`;
}

export function renderMobile(ctx: MobileRenderContext): TemplateResult {
    const subLabel = ctx.currentSubStepLabel ? ` | ${ctx.currentSubStepLabel}` : '';

    return html`
        <div class="dropdown">
            <button
                type="button"
                part="trigger"
                aria-controls="stepper-dropdown-menu"
                @click=${ctx.onToggle}
            >
                <span class="trigger-text">
                    <span part="trigger-status"> ${ctx.currentStepStatus} </span>
                    <span part="trigger-label"> ${ctx.currentStepLabel}${subLabel} </span>
                </span>
                <span part="trigger-icon" aria-hidden="true">
                    <slot name="trigger-icon">${defaultTriggerIcon()}</slot>
                </span>
            </button>

            <div id="stepper-dropdown-menu" part="panel">${renderStepList('mobile')}</div>
        </div>
    `;
}
