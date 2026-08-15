import { html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { type NavigationNode, type NavigationMode } from '../../types/navigation-nodes.js';

/* ------------------------------------------------ */
/* TYPES                                            */
/* ------------------------------------------------ */

// Contexte nécessaire au rendu mobile, fourni par ft-stepper.
// Séparé des params communs pour que renderDesktop reste minimal.
export interface MobileRenderContext {
    currentStepIndex: number;
    currentStepLabel: string | undefined;
    currentSubStepLabel: string | undefined;
    onToggle: () => void;
}

/* ------------------------------------------------ */
/* SHARED HELPERS                                   */
/* ------------------------------------------------ */

// Un groupe est "courant" si lui-même OU l'un de ses enfants l'est.
// Le state engine aplatit les noeuds en DFS et marque le parent 'completed'
// dès qu'un enfant est current → on ne peut pas se fier uniquement à step.state.
function isGroupCurrent(node: NavigationNode, mode: NavigationMode): boolean {
    return (
        node.state === 'current' ||
        mode === 'edit' ||
        node.children.some((child) => child.state === 'current')
    );
}

/** Compose la valeur `part=` d'un élément avec son rôle transverse et sa variante d'état "current" (convention BEM `--`). */
function withCurrentPart(base: string, isCurrent: boolean, role: string): string {
    return isCurrent ? `${base} ${role} ${base}--current` : `${base} ${role}`;
}

function renderStepText(
    label: string,
    order: number,
    isCurrent: boolean,
    isSubstep: boolean,
    stepLabel: (order: number, isSubstep: boolean) => string,
): TemplateResult {
    const bulletPart = withCurrentPart('bullet', isCurrent, 'indicator');
    return html`
        <span part=${bulletPart} aria-hidden="true"></span>
        <span class="sr-only">${stepLabel(order, isSubstep)}</span>
        <span class="item-label">${label}</span>
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
    stepLabel: (order: number, isSubstep: boolean) => string,
): TemplateResult {
    const order = index + 1;
    const isCurrent = sub.state === 'current';
    const isCompleted = sub.state === 'completed';
    const isEditMode = mode === 'edit';

    return html`
        <li
            class="item${isCurrent ? ' current' : ''}"
            part="substep"
            aria-current=${isCurrent ? 'step' : nothing}
        >
            ${isCompleted || isEditMode
                ? html`
                      <a
                          class="item-header"
                          part=${withCurrentPart('step-link', isCurrent, 'control')}
                          data-substep-order=${order}
                          data-path=${sub.path}
                          href=${sub.href ?? '#'}
                          @click=${onClickLink}
                      >
                          ${renderStepText(sub.label, order, isCurrent, true, stepLabel)}
                      </a>
                  `
                : html`
                      <div class="item-header" data-path=${sub.path} tabindex="-1">
                          ${renderStepText(sub.label, order, isCurrent, true, stepLabel)}
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
    stepLabel: (order: number, isSubstep: boolean) => string,
): TemplateResult {
    const order = index + 1;
    const isCurrent = isGroupCurrent(step, mode);
    // Un parent complété dont le groupe est courant ne doit pas être rendu comme lien
    const isCompleted =
        (mode === 'edit' && step.state !== 'current') || (step.state === 'completed' && !isCurrent);

    return html`
        <li
            class="item${isCurrent ? ' current' : ''}"
            part="step"
            aria-current=${isCurrent ? 'step' : nothing}
        >
            ${isCompleted
                ? html`
                      <a
                          class="item-header"
                          part=${withCurrentPart('step-link', isCurrent, 'control')}
                          data-path=${step.path}
                          href=${step.href ?? '#'}
                          @click=${onClickLink}
                      >
                          ${renderStepText(step.label, order, isCurrent, false, stepLabel)}
                      </a>
                  `
                : html`
                      <div class="item-header" data-path=${step.path} tabindex="-1">
                          ${renderStepText(step.label, order, isCurrent, false, stepLabel)}
                      </div>
                  `}
            ${(isCurrent || mode === 'edit') && step.children.length
                ? html`
                      <ol class="list-unstyled" part="list list--substep">
                          ${step.children.map((sub, i) =>
                              renderSubStep(sub, i, mode, onClickLink, stepLabel),
                          )}
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
    stepLabel: (order: number, isSubstep: boolean) => string,
): TemplateResult {
    return html`
        <ol class="list-unstyled ${cssClass}" part="list">
            ${repeat(
                steps,
                (step) => step.path,
                (step, index) => renderStep(step, index, mode, onClickLink, stepLabel),
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
    stepLabel: (order: number, isSubstep: boolean) => string,
): TemplateResult {
    return renderStepList(steps, 'desktop', mode, onClickLink, stepLabel);
}

/* ------------------------------------------------ */
/* MOBILE                                           */
/* ------------------------------------------------ */

export function renderMobile(
    steps: NavigationNode[],
    ctx: MobileRenderContext,
    mode: NavigationMode,
    onClickLink: (e: MouseEvent) => void,
    stepLabel: (order: number, isSubstep: boolean) => string,
): TemplateResult {
    const subLabel = ctx.currentSubStepLabel ? ` | ${ctx.currentSubStepLabel}` : '';

    return html`
        <div class="dropdown">
            <button
                type="button"
                part="trigger"
                aria-controls="stepper-dropdown-menu"
                @click=${ctx.onToggle}
            >
                <span> Étape ${ctx.currentStepIndex + 1} / ${steps.length} (en cours) </span>
                <span class="text-primary emphasis"> ${ctx.currentStepLabel}${subLabel} </span>
            </button>

            <div id="stepper-dropdown-menu" part="panel">
                ${renderStepList(steps, 'mobile', mode, onClickLink, stepLabel)}
            </div>
        </div>
    `;
}
