import { html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { type NavigationNode, type NavigationMode } from '../../types/navigation-nodes.js';

/* ------------------------------------------------ */
/* TYPES                                            */
/* ------------------------------------------------ */

// Contexte nécessaire au rendu mobile, fourni par ft-stepper.
// Séparé des params communs pour que renderDesktop reste minimal.
export interface MobileRenderContext {
    isOpen: boolean;
    currentStepIndex: number;
    currentStepLabel: string | undefined;
    currentSubStepLabel: string | undefined;
    onToggle: () => void;
}

/* ------------------------------------------------ */
/* SHARED HELPERS                                   */
/* ------------------------------------------------ */

// Un parent est "actif" si lui-même OU l'un de ses enfants est current.
// Le state engine aplatit les noeuds en DFS et marque le parent 'completed'
// dès qu'un enfant est current → on ne peut pas se fier uniquement à step.state.
function isGroupActive(node: NavigationNode, mode: NavigationMode): boolean {
    return (
        node.state === 'current' ||
        mode === 'edit' ||
        node.children.some((child) => child.state === 'current')
    );
}

function renderStepText(label: string, order: number, isSubstep = false): TemplateResult {
    return html`
        <span class="stepper-item-bullet" aria-hidden="true"></span>
        <span class="sr-only">${isSubstep ? 'sous-' : ''}étape ${order}:</span>
        <span class="stepper-item-label">${label}</span>
    `;
}

/* ------------------------------------------------ */
/* STEP / SUBSTEP                                   */
/* ------------------------------------------------ */

function renderSubStep(
    sub: NavigationNode,
    index: number,
    mode: NavigationMode,
    onClickLink: (e: MouseEvent) => void,
): TemplateResult {
    const order = index + 1;
    const isActive = sub.state === 'current';
    const isCompleted = sub.state === 'completed';
    const isEditMode = mode === 'edit';

    return html`
        <li
            class="stepper-item${isActive ? ' active' : ''}"
            aria-current=${isActive ? 'step' : nothing}
        >
            ${isCompleted || isEditMode
                ? html`
                      <a
                          class="stepper-item-inner stepper-link"
                          data-substep-order=${order}
                          data-path=${sub.path}
                          href=${sub.href ?? 'javascript:;'}
                          @click=${onClickLink}
                      >
                          ${renderStepText(sub.label, order, true)}
                      </a>
                  `
                : html`
                      <div class="stepper-item-inner">
                          ${renderStepText(sub.label, order, true)}
                      </div>
                  `}
        </li>
    `;
}

function renderStep(
    step: NavigationNode,
    index: number,
    mode: NavigationMode,
    onClickLink: (e: MouseEvent) => void,
): TemplateResult {
    const order = index + 1;
    const active = isGroupActive(step, mode);
    // Un parent complété dont le groupe est actif ne doit pas être rendu comme lien
    const isCompleted =
        (mode === 'edit' && step.state !== 'current') || (step.state === 'completed' && !active);

    return html`
        <li
            class="stepper-item${active ? ' active' : ''}"
            aria-current=${active ? 'step' : nothing}
        >
            ${isCompleted
                ? html`
                      <a
                          class="stepper-item-inner stepper-link"
                          data-path=${step.path}
                          href=${step.href ?? '#'}
                          @click=${onClickLink}
                      >
                          ${renderStepText(step.label, order)}
                      </a>
                  `
                : html`
                      <div class="stepper-item-inner">${renderStepText(step.label, order)}</div>
                  `}
            ${(active || mode === 'edit') && step.children.length
                ? html`
                      <ol class="list-unstyled stepper-list">
                          ${step.children.map((sub, i) => renderSubStep(sub, i, mode, onClickLink))}
                      </ol>
                  `
                : nothing}
        </li>
    `;
}

/* ------------------------------------------------ */
/* STEP LIST (shared between desktop and mobile)    */
/* ------------------------------------------------ */

function renderStepList(
    steps: NavigationNode[],
    cssClass: string,
    mode: NavigationMode,
    onClickLink: (e: MouseEvent) => void,
): TemplateResult {
    return html`
        <ol class="stepper-list list-unstyled ${cssClass}">
            ${repeat(
                steps,
                (step) => step.path,
                (step, index) => renderStep(step, index, mode, onClickLink),
            )}
        </ol>
    `;
}

/* ------------------------------------------------ */
/* DESKTOP                                          */
/* ------------------------------------------------ */

export function renderDesktop(
    steps: NavigationNode[],
    mode: NavigationMode,
    onClickLink: (e: MouseEvent) => void,
): TemplateResult {
    return renderStepList(steps, 'stepper-desktop', mode, onClickLink);
}

/* ------------------------------------------------ */
/* MOBILE                                           */
/* ------------------------------------------------ */

export function renderMobile(
    steps: NavigationNode[],
    ctx: MobileRenderContext,
    mode: NavigationMode,
    onClickLink: (e: MouseEvent) => void,
): TemplateResult {
    const subLabel = ctx.currentSubStepLabel ? ` | ${ctx.currentSubStepLabel}` : '';

    return html`
        <div class="dropdown stepper-dropdown${ctx.isOpen ? ' show' : ''}">
            <button
                type="button"
                class="btn btn-secondary dropdown-toggle btn-block btn-stepper-mobile"
                aria-expanded=${ctx.isOpen}
                aria-controls="stepper-dropdown-menu"
                @click=${ctx.onToggle}
            >
                <span class="btn-content d-inline-flex flex-column">
                    <span> Étape ${ctx.currentStepIndex + 1} / ${steps.length} (en cours) </span>
                    <span class="text-primary emphasis"> ${ctx.currentStepLabel}${subLabel} </span>
                </span>
            </button>

            <div
                id="stepper-dropdown-menu"
                class="stepper-dropdown-menu dropdown-menu${ctx.isOpen ? ' show' : ''}"
            >
                ${renderStepList(steps, 'stepper-mobile', mode, onClickLink)}
            </div>
        </div>
    `;
}
