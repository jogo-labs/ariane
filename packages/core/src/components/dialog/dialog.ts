import { nothing, type TemplateResult, html, type CSSResultGroup, type PropertyValues } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import utilitiesStyles from '../../styles/utilities.styles.js';
import resetStyles from '../../styles/components/reset.styles.js';
import styles from './dialog.styles.js';
import { announceA11y, popAnnounceHost, pushAnnounceHost } from '../../a11y/announce-a11y.js';
import { HasSlotController } from '../../controllers/has-slot.controller.js';
import { prefersReducedMotion } from '../../utils/media.js';
import { acquireScrollLock, releaseScrollLock } from '../../utils/scroll-lock.js';
import { warn } from '../../utils/warn.js';
import { emitEvent, type ArEventDetail } from '../../utils/emit-event.js';
import { LocalizeController } from '../../controllers/localize.controller.js';
import { ArianeElement } from '../../base/ariane-element.js';

/** Evènements envoyés par le webcomposant ArDialog */
export type ArDialogEvents =
    | 'ar-dialog-show'
    | 'ar-dialog-show-prevented'
    | 'ar-dialog-shown'
    | 'ar-dialog-hide'
    | 'ar-dialog-hide-prevented'
    | 'ar-dialog-hidden';

/** `detail` de tous les événements du dialog : l'élément à l'origine du changement et la valeur de retour. */
export type ArDialogDetail = ArEventDetail & { source: Element; returnValue: string };

/** Les seuls événements annulables, `@cancelable` dans le JSDoc de `ArDialog`. */
const CANCELABLE_EVENTS = new Set<ArDialogEvents>(['ar-dialog-show', 'ar-dialog-hide']);

const _dialogStack: ArDialog[] = [];

/**
 * Dernière cible d'un `pointerdown`. Safari ne donne pas le focus à un bouton cliqué :
 * `document.activeElement` vaut alors `body` à l'ouverture, et le focus ne retournerait nulle part
 * à la fermeture.
 */
let _lastPointerTarget: Element | null = null;
let _trackingPointer = false;

function trackPointerTarget(): void {
    if (_trackingPointer || typeof document === 'undefined') return;
    _trackingPointer = true;
    document.addEventListener(
        'pointerdown',
        (event) => {
            const target = event.composedPath()[0];
            _lastPointerTarget = target instanceof Element ? target : null;
        },
        true,
    );
}

/** Élément à refocaliser à la fermeture : celui qui a le focus, à défaut la cible du dernier clic. */
function focusReturnTarget(): Element | null {
    const active = document.activeElement;
    if (active && active !== document.body) return active;
    const clicked = _lastPointerTarget?.closest(
        'button, a[href], input, select, textarea, summary, [tabindex]',
    );
    return clicked?.isConnected ? clicked : active;
}

/** Élément (bouton, soumetteur) à l'origine de l'ouverture ou de la fermeture à venir, lu par le dialog. */
const _commandSource = new WeakMap<ArDialog, Element>();

/** `verbe` ou `verbe#id` : on coupe au premier `#`, l'id peut donc contenir `#` ou `:` (ex. `:r0:`). */
function parseCommand(value: string): { verb: string; id: string } {
    const i = value.indexOf('#');
    return i < 0
        ? { verb: value.trim(), id: '' }
        : { verb: value.slice(0, i).trim(), id: value.slice(i + 1).trim() };
}

/** Ouvre ou ferme `dialog` au nom de `source`, comme une assignation de `open` qui saurait qui la demande. */
function runCommand(dialog: ArDialog, verb: 'open' | 'close', source: Element, value = ''): void {
    if (verb === 'open') {
        if (dialog.open) return;
        _commandSource.set(dialog, source);
        dialog.open = true;
        return;
    }
    // Une réponse est déjà attendue : la nouvelle tentative est ignorée en silence.
    if (!dialog.open || dialog.pending) return;
    _commandSource.set(dialog, source);
    dialog.returnValue = value;
    dialog.open = false;
}

if (typeof document !== 'undefined') {
    document.addEventListener(
        'click',
        (e: MouseEvent) => {
            const path = e.composedPath();
            const at = path.findIndex(
                (n) => n instanceof Element && n.hasAttribute('data-ar-dialog'),
            );
            if (at < 0) return;
            const trigger = path[at] as Element;
            const attr = trigger.getAttribute('data-ar-dialog') ?? '';
            const { verb, id } = parseCommand(attr);
            if (verb !== 'open' && verb !== 'close') {
                warn(
                    'ar-dialog',
                    `data-ar-dialog="${attr}" : verbe inconnu (attendu : open ou close).`,
                );
                return;
            }
            let dialog: unknown;
            if (id) {
                const root = trigger.getRootNode() as Document | ShadowRoot;
                dialog = root.getElementById?.(id) ?? document.getElementById(id);
            } else if (verb === 'close') {
                // Le plus proche dialog qui contient le bouton (le bouton d'un dialog imbriqué ne ferme que lui).
                dialog = path.slice(at + 1).find((n) => n instanceof ArDialog);
            }
            if (!(dialog instanceof ArDialog)) {
                warn(
                    'ar-dialog',
                    id
                        ? `data-ar-dialog="${attr}" : aucun ar-dialog avec l'id "${id}".`
                        : `data-ar-dialog="${attr}" : ${verb === 'open' ? 'open demande un id (open#id)' : "le bouton n'est dans aucun ar-dialog"}.`,
                );
                return;
            }
            runCommand(dialog, verb, trigger, (trigger as HTMLButtonElement).value ?? '');
        },
        { capture: true },
    );
}

/**
 * @summary Apparaît au-dessus de la page (modal) ou glisse depuis le bord de l'écran (drawer) pour capter l'attention de l'utilisateur. À utiliser pour des confirmations, formulaires, menus de navigation, ou toute tâche focalisée qui interrompt le flux principal.
 * @localized
 *
 * @slot label - Titre du dialog. Remplace la propriété `label` si du HTML est nécessaire. Sans effet si `without-header` est actif.
 * @slot header-actions - Actions additionnelles dans le header, positionnées avant le bouton de fermeture (ex. bouton plein écran, menu). Retiré du DOM si `without-header` est actif.
 * @slot - Contenu principal du dialog.
 * @slot footer - Actions du dialog (boutons). Absent du DOM si non fourni.
 * @slot close-icon - Icône du bouton de fermeture. Remplace le SVG "×" par défaut. Retiré du DOM si `without-header` est actif.
 *
 * @csspart dialog - L'élément <dialog> racine.
 * @csspart header - L'en-tête contenant le titre et le bouton de fermeture. Absent du DOM si `without-header` est actif.
 * @csspart header-actions - Le conteneur des actions additionnelles du header (slot `header-actions`). Absent du DOM si le slot est vide ou si `without-header` est actif.
 * @csspart title - Le titre du dialog.
 * @csspart close-button - Le bouton de fermeture dans l'en-tête. Absent du DOM si `without-header` est actif.
 * @csspart action-button - Porté par `close-button` : bouton qui déclenche une action ponctuelle.
 * @csspart body - La zone de contenu principale.
 * @csspart footer - La zone d'actions (absente du DOM si slot non utilisé).
 *
 * @cssprop --ar-dialog-width - Largeur du dialog. Prend le pas sur la largeur d'une taille prédéfinie (`size`) tant que la règle qui la pose l'emporte dans la cascade (spécificité, ordre, couches `@layer`) sur celle qui définit cette taille.
 * @cssprop --ar-dialog-spacing - Padding interne (block et inline) de la zone de contenu.
 * @cssprop --ar-dialog-spacing-block - Padding haut/bas. Prend le pas sur `--ar-dialog-spacing` si défini.
 * @cssprop --ar-dialog-spacing-inline - Padding gauche/droite. Prend le pas sur `--ar-dialog-spacing` si défini.
 * @cssprop --ar-dialog-backdrop - Couleur de fond du voile derrière le dialog (mode modal).
 * @cssprop --ar-dialog-close-size - Taille (width/height) du bouton de fermeture.
 * @cssprop --ar-dialog-close-transition-duration - Durée de la transition (background-color) du bouton de fermeture au survol.
 * @cssprop --ar-dialog-bg - Fond du dialog (cascade vers --ar-color-bg). Repli `Canvas` si aucun thème n'est chargé — sans thème et sans bordure (le dialog natif perd son style UA par défaut), le contenu flotte sinon sans surface visible.
 * @cssprop --ar-dialog-color - Couleur du texte du dialog (cascade vers --ar-color-text). Repli `CanvasText` si aucun thème n'est chargé.
 * @cssprop --ar-dialog-shake-outline-color - Couleur de l'anneau de mise en évidence (`outline`) affiché à la place du shake en `prefers-reduced-motion: reduce` (cascade vers --ar-color-danger-text).
 *
 * @cssState open - Le dialog est ouvert.
 * @cssState pending - L'application a posé l'attribut `pending` : une réponse est attendue avant de fermer.
 *
 * @event {CustomEvent<{ id: string | undefined; source: Element; returnValue: string }>} ar-dialog-show - Émis avant l'ouverture. `detail.source` : le bouton `data-ar-dialog="open#id"` cliqué, sinon le dialog. @cancelable
 * @event {CustomEvent<{ id: string | undefined; source: Element; returnValue: string }>} ar-dialog-show-prevented - Émis si ar-dialog-show est annulé.
 * @event {CustomEvent<{ id: string | undefined; source: Element; returnValue: string }>} ar-dialog-shown - Émis après l'ouverture (après updateComplete).
 * @event {CustomEvent<{ id: string | undefined; source: Element; returnValue: string }>} ar-dialog-hide - Émis avant la fermeture. `detail.source` : le bouton `data-ar-dialog="close"` cliqué (ou le bouton qui a soumis un `<form method="dialog">`), sinon le dialog (Échap, backdrop, `open = false`) ; `detail.returnValue` : sa `value`, sinon `''`. @cancelable
 * @event {CustomEvent<{ id: string | undefined; source: Element; returnValue: string }>} ar-dialog-hide-prevented - Émis si ar-dialog-hide est annulé, ou si `open` repasse à `true` pendant l'animation de fermeture (la fermeture est alors abandonnée). Sauf report par `pending`, le composant secoue le dialog et annonce `prevented-message` aux lecteurs d'écran.
 * @event {CustomEvent<{ id: string | undefined; source: Element; returnValue: string }>} ar-dialog-hidden - Émis après la fermeture (après animation).
 *
 * @tagname ar-dialog
 */
export class ArDialog extends ArianeElement {
    static override styles: CSSResultGroup = [utilitiesStyles, resetStyles, styles];

    // ── Public properties ──────────────────────────────────────────────────────

    private readonly localize = new LocalizeController(this);

    /**
     * Visibilité du composant.
     */
    @property({ reflect: true, type: Boolean }) open: boolean = false;

    /**
     * Si présent, un clic sur le backdrop ferme le dialog.
     * Par défaut, le backdrop est statique et ne déclenche pas la fermeture.
     */
    @property({ reflect: true, type: Boolean, attribute: 'close-on-backdrop' })
    closeOnBackdrop: boolean = false;

    /**
     * Titre affiché dans le header. Pour du HTML, utiliser `slot="label"`.
     */
    @property({ reflect: true }) label = '';

    /**
     * Si présent, retire entièrement le header (titre, actions, bouton de fermeture) du DOM.
     * La propriété `label` devient alors le seul nom accessible du dialog (`aria-label`) —
     * elle est requise dans ce mode, le slot `label` (HTML) est sans effet.
     */
    @property({ reflect: true, type: Boolean, attribute: 'without-header' })
    withoutHeader: boolean = false;

    /**
     * Mode d'affichage : `modal` (centré avec backdrop) ou `drawer` (panneau latéral).
     */
    @property({ reflect: true, type: String })
    mode: 'modal' | 'drawer' = 'modal';

    /**
     * Côté d'affichage du drawer. Sans effet en mode `modal`.
     */
    @property({ reflect: true, type: String })
    placement: 'left' | 'right' = 'right';

    /**
     * Taille du dialog. Les paliers `sm`/`lg`/`xl` sont définis par le thème —
     * sans thème chargé, seule la taille par défaut du composant s'applique.
     * Utilisez `--ar-dialog-width` pour une valeur personnalisée : elle prend le pas sur le palier
     * tant que la règle qui la pose l'emporte dans la cascade (spécificité, ordre, couches
     * `@layer`) sur celle qui définit le palier.
     */
    @property({ reflect: true, type: String })
    size: 'sm' | 'md' | 'lg' | 'xl' = 'md';

    /**
     * Attente d'une réponse, pilotée par l'application : posé dans le gestionnaire d'un
     * `ar-dialog-hide` annulé, il reporte la fermeture au lieu de la
     * bloquer. Le composant n'agit alors ni par secousse ni par annonce de blocage, ignore en silence
     * les nouvelles tentatives de fermeture (clic, Échap, backdrop) et pose `aria-busy="true"` sur le
     * dialogue, l'état `:state(pending)` et une annonce polie de l'attente. L'application le lève
     * (`pending = false`) puis ferme (`open = false`) ou laisse le dialog ouvert. Le composant ne le
     * pose ni ne le retire jamais. Non bloquant pour le contenu : seules les fermetures sont ignorées.
     */
    @property({ reflect: true, type: Boolean }) pending = false;

    /**
     * Message annoncé aux lecteurs d'écran quand une fermeture est bloquée
     * (événement `ar-dialog-hide-prevented`).
     * Traduit automatiquement selon `lang` si non personnalisé.
     */
    @property({ reflect: true, useDefault: true, attribute: 'prevented-message' })
    preventedMessage: string | undefined = undefined;

    /**
     * Label accessible du bouton de fermeture. Traduit automatiquement selon `lang` si non
     * personnalisé.
     */
    @property({ reflect: true, useDefault: true, attribute: 'close-label' })
    closeLabel: string | undefined = undefined;

    /**
     * Valeur de retour de la dernière fermeture, comme `HTMLDialogElement.returnValue` : la `value`
     * du bouton `data-ar-dialog="close"` cliqué ou du bouton qui a soumis un `<form method="dialog">`,
     * sinon `''` (Échap, backdrop, `open = false`). Remise à `''` à l'ouverture.
     */
    returnValue = '';

    // ── Private state ──────────────────────────────────────────────────────────

    @query('dialog', true)
    private _dialog!: HTMLDialogElement;

    /** Élément à l'origine de l'ouverture ou de la fermeture en cours (`detail.source`). */
    private _source: Element = this;

    /** Cible du dernier pointerdown, pour distinguer un vrai clic backdrop d'un drag. */
    private _pointerDownTarget: EventTarget | null = null;

    /** Évite de lancer la fermeture pendant le cycle `updated()` de Lit. */
    private _closePending = false;

    /** Vrai pendant l'animation de fermeture — bloque les interactions et les double-appels. */
    @state() private _isClosing = false;

    /** Interrompt l'animation de fermeture en cours (timer de repli et écouteur `animationend`). */
    private _cancelCloseAnimation: (() => void) | null = null;

    /** Élément qui avait le focus avant l'ouverture — pour le restaurer à la fermeture. */
    private _triggerElement: Element | null = null;

    private readonly _slotController = new HasSlotController(
        this,
        'footer',
        'label',
        'header-actions',
    );
    private _hasWarnedMissingLabel = false;
    private _hasWarnedSlotLabelIgnored = false;
    private _hasWarnedNoCloseMechanism = false;

    private _getHeadingLabel(): string {
        return (this.label ?? '').trim() || this.localize.term('dialogDefaultLabel');
    }

    private _warnIfMissingLabel(): void {
        if (this._hasWarnedMissingLabel) return;
        if ((this.label ?? '').trim() || this._slotController.test('label')) return;

        this._hasWarnedMissingLabel = true;
        warn(
            'ar-dialog',
            'Aucun libellé accessible fourni. Ajoutez la propriété "label" ou un enfant direct avec slot="label".',
        );
    }

    private _warnIfSlotLabelIgnored(): void {
        if (this._hasWarnedSlotLabelIgnored) return;
        if (!this.withoutHeader) return;
        if ((this.label ?? '').trim()) return;
        if (!this._slotController.test('label')) return;

        this._hasWarnedSlotLabelIgnored = true;
        warn(
            'ar-dialog',
            'slot="label" est ignoré quand without-header est actif (aria-label ne peut contenir que du texte brut). Utilisez la propriété "label".',
        );
    }

    private _warnIfNoCloseMechanism(): void {
        if (this._hasWarnedNoCloseMechanism) return;
        if (!this.withoutHeader) return;
        if (this.closeOnBackdrop) return;
        if (this.querySelector('[data-ar-dialog^="close"], form[method="dialog"]')) return;

        this._hasWarnedNoCloseMechanism = true;
        warn(
            'ar-dialog',
            'without-header est actif sans close-on-backdrop ni élément [data-ar-dialog="close"] ou <form method="dialog"> dans le contenu : seule la touche Échap permet de fermer ce dialog.',
        );
    }

    // ── Lifecycle ──────────────────────────────────────────────────────────────

    override connectedCallback(): void {
        super.connectedCallback();
        trackPointerTarget();
        this.addEventListener('submit', this._handleSubmit);
        // Reconnexion d'un dialog ouvert (élément déplacé) : le <dialog> natif reste ouvert mais
        // sort de la couche modale (Échap inerte, scroll libre). On le rouvre en modal, sans
        // ré-émettre ar-dialog-show ni ar-dialog-shown.
        if (this.hasUpdated && this.open && this._dialog?.open) {
            this._dialog.close();
            this._dialog.showModal();
            this._addOpenListeners();
            this._freezeScroll();
        }
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        this.removeEventListener('submit', this._handleSubmit);
        this._removeOpenListeners();
        if (this.open || this._isClosing) this._unfreezeScroll();
    }

    override firstUpdated(): void {
        if (this.open && !this._dialog?.open) {
            this._show();
        }
    }

    override willUpdate(changedProperties: PropertyValues<this>): void {
        // `open` repassé à vrai pendant l'animation de fermeture : la fermeture est abandonnée,
        // sans rejouer d'animation. Le `hide` déjà émis reste donc sans `hidden` : `hide-prevented`.
        if (changedProperties.has('open') && this.open && this._isClosing) {
            this._cancelCloseAnimation?.();
            this._cancelCloseAnimation = null;
            this._dialog.classList.remove('closing');
            this._isClosing = false;
            void this.updateComplete.then(() => {
                this._emit('ar-dialog-hide-prevented');
                this._focusInitial();
            });
        }
    }

    override updated(changedProperties: PropertyValues<this>): void {
        this._warnIfMissingLabel();
        this._warnIfSlotLabelIgnored();
        if (
            (changedProperties.has('placement') || changedProperties.has('mode')) &&
            this.mode === 'modal' &&
            this.placement !== 'right'
        ) {
            warn('ar-dialog', 'placement n\'a aucun effet en mode "modal".');
        }
        if (changedProperties.has('open')) {
            if (this.open && !this._dialog?.open) {
                this._show();
            } else if (!this.open && this._dialog?.open) {
                this._scheduleClose();
            }
            this.toggleState('open', this.open);
        }
        if (changedProperties.has('pending')) {
            this.toggleState('pending', this.pending);
            // `get` indéfini au montage : pas d'annonce pour un `pending` posé dès le départ.
            if (this.pending && changedProperties.get('pending') !== undefined) {
                announceA11y(this.localize.term('dialogPending'), 'polite');
            }
        }
    }

    // ── Render ─────────────────────────────────────────────────────────────────

    override render(): TemplateResult {
        const headingLabel = this._getHeadingLabel();
        const closeButtonLabel = this.closeLabel?.trim() || this.localize.term('closeDialog');

        return html`
            <dialog
                part="dialog"
                role="dialog"
                aria-labelledby=${this.withoutHeader ? nothing : 'dialog-heading'}
                aria-label=${this.withoutHeader ? headingLabel : nothing}
                aria-modal="true"
                aria-busy=${this.pending ? 'true' : nothing}
                ?inert=${!this.open || this._isClosing}
                @cancel=${this._handleDialogCancel}
                @click=${this._handleDialogClick}
                @pointerdown=${this._handleDialogPointerDown}
                @pointerup=${this._handleDialogPointerUp}
            >
                ${
                    this.withoutHeader
                        ? nothing
                        : html`<header part="header">
                              <h1 part="title" id="dialog-heading">
                                  ${
                                      this._slotController.test('label')
                                          ? html`<slot name="label"></slot>`
                                          : headingLabel
                                  }
                              </h1>
                              ${
                                  this._slotController.test('header-actions')
                                      ? html`<div part="header-actions">
                                            <slot name="header-actions"></slot>
                                        </div>`
                                      : nothing
                              }
                              <button
                                  part="close-button action-button"
                                  type="button"
                                  data-ar-dialog="close"
                              >
                                  <slot name="close-icon">
                                      <svg
                                          aria-hidden="true"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke-width="1.5"
                                          stroke="currentColor"
                                      >
                                          <path
                                              stroke-linecap="round"
                                              stroke-linejoin="round"
                                              d="M6 18 18 6M6 6l12 12"
                                          ></path>
                                      </svg>
                                  </slot>
                                  <span class="sr-only">${closeButtonLabel}</span>
                              </button>
                          </header>`
                }
                <div part="body">
                    <slot></slot>
                </div>
                ${
                    this._slotController.test('footer')
                        ? html`<footer part="footer">
                              <slot name="footer"></slot>
                          </footer>`
                        : nothing
                }
            </dialog>
        `;
    }

    // ── Scroll management ──────────────────────────────────────────────────────

    /** Bloque le scroll du body. */
    private _freezeScroll() {
        if (!_dialogStack.includes(this)) {
            _dialogStack.push(this);
            acquireScrollLock(document.body);
            pushAnnounceHost(this._dialog);
        }
    }

    /** Restaure le scroll du body, seulement quand aucun autre dialog n'est ouvert. */
    private _unfreezeScroll() {
        const idx = _dialogStack.indexOf(this);
        if (idx === -1) return;
        _dialogStack.splice(idx, 1);
        releaseScrollLock(document.body);
        popAnnounceHost(this._dialog);
    }

    // ── Events ─────────────────────────────────────────────────────────────────

    private _emit(name: ArDialogEvents): CustomEvent<ArDialogDetail> {
        return emitEvent(this, name, {
            cancelable: CANCELABLE_EVENTS.has(name),
            detail: { source: this._source, returnValue: this.returnValue },
        });
    }

    /** Reprend l'élément posé par `runCommand` pour cette ouverture ou fermeture, sinon le dialog. */
    private _takeSource(): void {
        this._source = _commandSource.get(this) ?? this;
        _commandSource.delete(this);
    }

    private _announcePrevented(): void {
        const message = this.preventedMessage?.trim() || this.localize.term('closingBlocked');
        announceA11y(message, 'assertive');
    }

    private _scheduleClose(): void {
        if (this._closePending) return;
        this._closePending = true;

        void this.updateComplete.then(() => {
            this._closePending = false;
            if (this.isConnected && !this.open && this._dialog?.open) {
                this._close();
            }
        });
    }

    // `window` et non `document` : l'écouteur passe après ceux de `document`, dont ceux des popups
    // ouverts dans le dialog, qui consomment Échap avec `preventDefault()` (voir `Popover`).
    private _addOpenListeners() {
        window.addEventListener('keydown', this._handleWindowKeyDown);
    }

    private _removeOpenListeners() {
        window.removeEventListener('keydown', this._handleWindowKeyDown);
    }

    // ── Interaction handlers ───────────────────────────────────────────────────

    private _handleDialogClick = (event: MouseEvent) => {
        // Fallback backdrop close for Safari iOS (WebKit #267688 — pointerdown absent sur backdrop).
        // Sur desktop, _handleDialogPointerUp déjà traité ; _close() est idempotent via _isClosing.
        if (this.closeOnBackdrop && event.target === this._dialog) {
            this._requestClose();
        }
    };

    private _handleWindowKeyDown = (event: KeyboardEvent) => {
        if (event.defaultPrevented) return;
        if (event.key === 'Escape' && this.open && !this._isClosing) {
            // N'intercepte Escape que si ce dialog est au sommet de la pile (dialogs empilés)
            if (_dialogStack[_dialogStack.length - 1] !== this) return;
            event.preventDefault();
            event.stopPropagation();
            this._requestClose();
        }
    };

    private _handleDialogCancel = (event: Event) => {
        // Toujours annulé : la gestion Escape est déléguée à _handleWindowKeyDown pour
        // respecter la pile de dialogs (_dialogStack) et les animations de fermeture.
        event.preventDefault();
    };

    // Le <form> est dans le DOM léger : pour le navigateur il n'a pas de <dialog> ancêtre, et
    // `method="dialog"` ne ferme rien. Le dialog le plus proche du formulaire s'en charge.
    private _handleSubmit = (event: SubmitEvent) => {
        const form = event.target;
        if (!(form instanceof HTMLFormElement)) return;
        const submitter = event.submitter as HTMLButtonElement | null;
        if ((submitter?.formMethod || form.method) !== 'dialog') return;
        if (event.composedPath().find((n) => n instanceof ArDialog) !== this) return;
        event.preventDefault();
        runCommand(this, 'close', submitter ?? form, submitter?.value ?? '');
    };

    private _handleDialogPointerDown = (event: PointerEvent) => {
        this._pointerDownTarget = event.target;
    };

    private _handleDialogPointerUp = (event: PointerEvent) => {
        if (!this.closeOnBackdrop) return;
        if (this._pointerDownTarget === this._dialog && event.target === this._dialog) {
            this._requestClose();
        }
        this._pointerDownTarget = null;
    };

    // ── Open / Close ───────────────────────────────────────────────────────────

    /** Ouvre le dialog natif, gèle le scroll et enregistre le listener clavier. */
    private _show(): void {
        this._warnIfNoCloseMechanism();
        this._takeSource();
        this.returnValue = '';
        this._triggerElement = focusReturnTarget();
        const showEvent = this._emit('ar-dialog-show');
        if (showEvent.defaultPrevented) {
            this._triggerElement = null;
            this._emit('ar-dialog-show-prevented');
            void this.updateComplete.then(() => {
                if (this.isConnected && this.open && !this._dialog?.open) {
                    this.open = false;
                }
            });
            return;
        }

        this._addOpenListeners();
        this._dialog?.showModal();
        this._freezeScroll();

        if (!prefersReducedMotion()) {
            this._dialog.classList.add('opening');
            const onOpenEnd = (e: AnimationEvent) => {
                if (e.target !== this._dialog) return;
                this._dialog.classList.remove('opening');
                this._dialog.removeEventListener('animationend', onOpenEnd);
            };
            this._dialog.addEventListener('animationend', onOpenEnd);
        }

        this.updateComplete.then(() => {
            this._focusInitial();
            this._emit('ar-dialog-shown');
        });
    }

    /** Focus initial : `[autofocus]`, sinon le premier élément focusable, sinon le bouton de fermeture. */
    private _focusInitial(): void {
        const autoFocused = this.querySelector<HTMLElement>('[autofocus]');
        const firstFocusable =
            autoFocused ??
            this.querySelector<HTMLElement>(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            );
        if (firstFocusable) {
            firstFocusable.focus();
        } else {
            (
                this.shadowRoot?.querySelector<HTMLElement>('[data-ar-dialog="close"]') ??
                this._dialog
            )?.focus();
        }
    }

    /** Fermeture demandée par l'utilisateur (Échap, backdrop) : ignorée en silence si `pending`. */
    private _requestClose(): void {
        if (this.pending) return;
        this._close();
    }

    /**
     * Fermeture annulée : blocage (secousse et annonce) ou, si l'application a posé `pending`
     * dans son gestionnaire, simple report.
     */
    private _signalBlocked(): void {
        if (this.pending) return;
        this._shake();
        this._announcePrevented();
    }

    /** Déclenche l'animation de fermeture et attend animationend avant de clore. */
    private _close(): void {
        if (this._isClosing) return;
        this._takeSource();
        const hideEvent = this._emit('ar-dialog-hide');
        if (hideEvent.defaultPrevented) {
            this.returnValue = '';
            this.open = true;
            this._emit('ar-dialog-hide-prevented');
            this._signalBlocked();
            return;
        }

        this._isClosing = true;
        this._dialog.classList.remove('opening', 'shake');
        this._dialog.classList.add('closing');

        if (prefersReducedMotion()) {
            this._finishClose();
            return;
        }

        const fallback = setTimeout(() => {
            this._dialog.removeEventListener('animationend', onEnd);
            this._finishClose();
        }, 500);

        const onEnd = (e: AnimationEvent) => {
            if (e.target !== this._dialog) return;
            clearTimeout(fallback);
            this._dialog.removeEventListener('animationend', onEnd);
            this._finishClose();
        };
        this._dialog.addEventListener('animationend', onEnd);
        this._cancelCloseAnimation = () => {
            clearTimeout(fallback);
            this._dialog.removeEventListener('animationend', onEnd);
        };
    }

    /** Animation de rejet — déclenche un shake (ou outline si prefers-reduced-motion) pour signaler que la fermeture est bloquée. */
    private _shake(): void {
        const dialog = this._dialog;
        dialog.classList.remove('shake');
        void dialog.offsetWidth; // force reflow pour redémarrer l'animation si déjà en cours
        dialog.classList.add('shake');

        if (prefersReducedMotion()) {
            setTimeout(() => dialog.classList.remove('shake'), 700);
        } else {
            const onShakeEnd = (e: AnimationEvent) => {
                if (e.animationName && e.animationName !== 'dialogShake') return;
                dialog.classList.remove('shake');
                dialog.removeEventListener('animationend', onShakeEnd);
            };
            dialog.addEventListener('animationend', onShakeEnd);
        }
    }

    /** Finalise la fermeture : ferme le dialog natif, restaure l'état et émet ar-dialog-hidden. */
    private _finishClose(): void {
        this._dialog.classList.remove('closing', 'opening', 'shake');
        this._dialog.close();
        this._unfreezeScroll();
        this._removeOpenListeners();
        this._isClosing = false;
        this._cancelCloseAnimation = null;
        this.open = false;
        const trigger = this._triggerElement;
        this._triggerElement = null;
        (trigger as HTMLElement | null)?.focus?.();
        this.updateComplete.then(() => this._emit('ar-dialog-hidden'));
    }
}
