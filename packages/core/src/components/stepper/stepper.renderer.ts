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
    currentStepStatus: string;
    onToggle: () => void;
}

/* ------------------------------------------------ */
/* SHARED HELPERS                                   */
/* ------------------------------------------------ */

// Un groupe est "courant" si lui-même OU l'un de ses enfants l'est.
// Le state engine aplatit les noeuds en DFS et marque le parent 'completed'
// dès qu'un enfant est current → on ne peut pas se fier uniquement à step.state.
// Ne dépend PAS du mode : l'expansion des sous-étapes en mode edit (cf. appel
// séparé `isCurrent || mode === 'edit'` dans renderStep) est une préoccupation
// distincte du statut "courant" — les confondre ici marquait TOUS les groupes
// comme courants (aria-current + gras/primaire) en mode edit, pas seulement
// celui contenant réellement la sous-étape courante.
function isGroupCurrent(node: NavigationNode): boolean {
    return node.state === 'current' || node.children.some((child) => child.state === 'current');
}

type BulletState = 'current' | 'completed' | 'default';

/** Compose la valeur `part=` d'un élément avec son rôle transverse et sa variante d'état "current" (convention BEM `--`). */
function withCurrentPart(base: string, isCurrent: boolean, role: string): string {
    return isCurrent ? `${base} ${role} ${base}--current` : `${base} ${role}`;
}

/** Compose la valeur `part=` de la puce d'étape avec sa variante d'état (convention BEM `--`). */
function withBulletStatePart(state: BulletState): string {
    if (state === 'current') return 'bullet indicator bullet--current';
    if (state === 'completed') return 'bullet indicator bullet--completed';
    return 'bullet indicator';
}

function renderStepText(
    label: string,
    order: number,
    bulletState: BulletState,
    isSubstep: boolean,
    isLink: boolean,
    stepLabel: (order: number, isSubstep: boolean) => string,
): TemplateResult {
    const bulletPart = withBulletStatePart(bulletState);
    // Variante d'état dédiée (pas juste "label") : le thème ne peut pas cibler
    // "label à l'intérieur d'un step-link" via ::part() (chaîner deux ::part()
    // avec un combinateur est un sélecteur invalide) — nécessaire pour ne
    // souligner le texte que lorsqu'il s'agit réellement d'un lien.
    const labelPart = isLink ? 'label label--link' : 'label';
    return html`
        <span part=${bulletPart} aria-hidden="true"></span>
        <span class="sr-only">${stepLabel(order, isSubstep)}</span>
        <span class="item-label" part=${labelPart}>${label}</span>
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
    // La sous-étape courante ne doit jamais être un lien, y compris en mode edit
    // (on ne navigue pas vers la page où l'on se trouve déjà) — miroir de la
    // même exclusion déjà appliquée à l'étape de premier niveau (renderStep).
    const isEditableLink = mode === 'edit' && !isCurrent;
    const bulletState: BulletState = isCurrent ? 'current' : isCompleted ? 'completed' : 'default';

    return html`
        <li
            class="item${isCurrent ? ' current' : ''}"
            part="substep"
            aria-current=${isCurrent ? 'step' : nothing}
        >
            ${
                isCompleted || isEditableLink
                    ? html`
                          <a
                              class="item-header"
                              part=${withCurrentPart('step-link', isCurrent, 'control')}
                              data-substep-order=${order}
                              data-path=${sub.path}
                              href=${sub.href ?? '#'}
                              @click=${onClickLink}
                          >
                              ${renderStepText(sub.label, order, bulletState, true, true, stepLabel)}
                          </a>
                      `
                    : html`
                          <div class="item-header" data-path=${sub.path} tabindex="-1">
                              ${renderStepText(sub.label, order, bulletState, true, false, stepLabel)}
                          </div>
                      `
            }
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
    const isCurrent = isGroupCurrent(step);
    // Un parent dont le groupe est courant (une de ses sous-étapes est sélectionnée) ne
    // doit jamais être rendu comme lien, y compris en mode edit — miroir du mode create,
    // où cliquer l'étape sélectionne déjà sa première sous-étape : une fois une sous-étape
    // choisie, le label du parent n'est plus une destination de navigation à part entière.
    const isCompleted =
        !isCurrent && (mode === 'edit' ? step.state !== 'current' : step.state === 'completed');
    const bulletState: BulletState = isCurrent
        ? 'current'
        : step.state === 'completed'
          ? 'completed'
          : 'default';

    return html`
        <li
            class="item${isCurrent ? ' current' : ''}"
            part="step"
            aria-current=${isCurrent ? 'step' : nothing}
        >
            ${
                isCompleted
                    ? html`
                          <a
                              class="item-header"
                              part=${withCurrentPart('step-link', isCurrent, 'control')}
                              data-path=${step.path}
                              href=${step.href ?? '#'}
                              @click=${onClickLink}
                          >
                              ${renderStepText(step.label, order, bulletState, false, true, stepLabel)}
                          </a>
                      `
                    : html`
                          <div class="item-header" data-path=${step.path} tabindex="-1">
                              ${renderStepText(step.label, order, bulletState, false, false, stepLabel)}
                          </div>
                      `
            }
            ${
                (isCurrent || mode === 'edit') && step.children.length
                    ? html`
                          <ol class="list-unstyled" part="list list--substep">
                              ${step.children.map((sub, i) =>
                                  renderSubStep(sub, i, mode, onClickLink, stepLabel),
                              )}
                          </ol>
                      `
                    : nothing
            }
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
                <span> ${ctx.currentStepStatus} </span>
                <span class="text-primary emphasis"> ${ctx.currentStepLabel}${subLabel} </span>
            </button>

            <div id="stepper-dropdown-menu" part="panel">
                ${renderStepList(steps, 'mobile', mode, onClickLink, stepLabel)}
            </div>
        </div>
    `;
}
