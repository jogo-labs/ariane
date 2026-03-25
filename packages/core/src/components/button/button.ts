import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './button.styles.js';

/**
 * @summary Bouton accessible et personnalisable.
 * @display demo
 *
 * @slot             - Contenu principal du bouton (label).
 * @slot prefix      - Icône ou élément avant le label.
 * @slot suffix      - Icône ou élément après le label.
 *
 * @csspart base     - L'élément `<button>` natif.
 * @csspart label    - Le conteneur du label.
 * @csspart prefix   - Le conteneur du slot prefix.
 * @csspart suffix   - Le conteneur du slot suffix.
 *
 * @cssprop [--ar-button-bg=var(--ar-color-interactive)]           - Fond du bouton (variants filled).
 * @cssprop [--ar-button-color=var(--ar-color-text-inverse)]       - Couleur du texte (variants filled/outlined/ghost).
 * @cssprop [--ar-button-border-color=var(--ar-color-interactive)] - Bordure (variant outlined).
 * @cssprop [--ar-button-danger-bg=var(--ar-color-danger-50)]      - Fond du bouton danger.
 * @cssprop [--ar-button-danger-color=var(--ar-color-text-inverse)] - Texte du bouton danger.
 * @cssprop --ar-button-font-size                                   - Taille de police.
 * @cssprop --ar-button-font-weight                                 - Graisse de police.
 * @cssprop --ar-button-border-radius                               - Arrondi des coins.
 * @cssprop --ar-button-padding-x                                   - Padding horizontal.
 * @cssprop --ar-button-padding-y                                   - Padding vertical.
 * @cssprop [--ar-focus-ring-color=var(--ar-color-interactive)]    - Couleur du focus ring (accessibilité).
 *
 * @event {CustomEvent} ar-click - Émis au clic. Pas émis si `disabled`.
 * @event {CustomEvent} ar-focus - Émis quand le bouton reçoit le focus.
 * @event {CustomEvent} ar-blur  - Émis quand le bouton perd le focus.
 */
@customElement('ar-button')
export class ArButton extends LitElement {
    static override styles = [styles];

    /** Variant visuel du bouton. */
    @property({ reflect: true })
    variant: 'filled' | 'outlined' | 'ghost' | 'danger' = 'filled';

    /** Taille du bouton. */
    @property({ reflect: true })
    size: 'small' | 'medium' | 'large' = 'medium';

    /** Désactive le bouton et prévient toute interaction. */
    @property({ type: Boolean, reflect: true })
    disabled = false;

    /** Type natif pour la soumission de formulaire. */
    @property()
    type: 'button' | 'submit' | 'reset' = 'button';

    private emit(eventName: string): void {
        this.dispatchEvent(new CustomEvent(eventName, { bubbles: true, composed: true }));
    }

    private handleClick(event: MouseEvent): void {
        // Un bouton disabled ne doit JAMAIS émettre d'événements applicatifs.
        // On stoppe aussi la propagation native pour éviter les soumissions de form accidentelles.
        if (this.disabled) {
            event.preventDefault();
            event.stopImmediatePropagation();
            return;
        }
        this.emit('ar-click');
    }

    override render() {
        return html`
            <button
                part="base"
                type=${this.type}
                ?disabled=${this.disabled}
                aria-disabled=${this.disabled ? 'true' : 'false'}
                @click=${this.handleClick}
                @focus=${() => this.emit('ar-focus')}
                @blur=${() => this.emit('ar-blur')}
            >
                <span part="prefix" class="prefix"><slot name="prefix"></slot></span>
                <span part="label" class="label"><slot></slot></span>
                <span part="suffix" class="suffix"><slot name="suffix"></slot></span>
            </button>
        `;
    }
}

// Typage global pour l'autocomplétion dans les projets consommateurs
declare global {
    interface HTMLElementTagNameMap {
        'ar-button': ArButton;
    }
}
