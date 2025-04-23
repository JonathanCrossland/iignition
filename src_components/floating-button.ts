class FloatingButton extends HTMLElement {
    private _button: HTMLButtonElement;
    private _vertical: string = 'bottom';
    private _horizontal: string = 'right';

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Create button element
        this._button = document.createElement('button');
        this._button.className = 'floating-button';
        
        // Create slot for icon
        const slot = document.createElement('slot');
        slot.setAttribute('name', 'icon');
        this._button.appendChild(slot);
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: block;
                position: fixed;
                z-index: 9999;
                opacity: 0;
                transform: translateY(20px);
                transition: opacity 0.3s ease, transform 0.3s ease;
            }

            :host([visible]) {
                opacity: 1;
                transform: translateY(0);
            }

            .floating-button {
                width: var(--floating-button-size, 56px);
                height: var(--floating-button-size, 56px);
                border-radius: var(--floating-button-radius, 50%);
                border: var(--floating-button-border, none);
                background: var(--floating-button-bg, var(--color-primary));
                color: var(--floating-button-color, var(--color-text-inverse));
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: var(--floating-button-shadow, 0 2px 5px rgba(0,0,0,0.2));
                transition: all var(--floating-button-transition, 0.2s) ease;
                padding: 0;
                font-size: var(--floating-button-font-size, 1rem);
            }

            .floating-button:hover {
                transform: scale(var(--floating-button-hover-scale, 1.05));
                box-shadow: var(--floating-button-hover-shadow, 0 4px 8px rgba(0,0,0,0.3));
                background: var(--floating-button-hover-bg, var(--color-primary-dark));
            }

            .floating-button:active {
                transform: scale(var(--floating-button-active-scale, 0.95));
            }

            ::slotted(*) {
                width: var(--floating-button-icon-size, 24px);
                height: var(--floating-button-icon-size, 24px);
                fill: currentColor;
            }

            :host([vertical="top"]) {
                top: var(--floating-button-margin, 20px);
            }

            :host([vertical="bottom"]) {
                bottom: var(--floating-button-margin, 20px);
            }

            :host([horizontal="left"]) {
                left: var(--floating-button-margin, 20px);
            }

            :host([horizontal="right"]) {
                right: var(--floating-button-margin, 20px);
            }
        `;

        this.shadowRoot!.appendChild(style);
        this.shadowRoot!.appendChild(this._button);
    }

    static get observedAttributes() {
        return ['vertical', 'horizontal', 'visible'];
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'vertical' && newValue !== oldValue) {
            this._vertical = newValue;
        } else if (name === 'horizontal' && newValue !== oldValue) {
            this._horizontal = newValue;
        }
    }

    private updatePosition() {
        // Only update if the values are different from current attributes
        const currentVertical = this.getAttribute('vertical');
        const currentHorizontal = this.getAttribute('horizontal');
        
        if (currentVertical !== this._vertical) {
            if (currentVertical) {
                this.removeAttribute('vertical');
            }
            this.setAttribute('vertical', this._vertical);
        }
        
        if (currentHorizontal !== this._horizontal) {
            if (currentHorizontal) {
                this.removeAttribute('horizontal');
            }
            this.setAttribute('horizontal', this._horizontal);
        }
    }

    connectedCallback() {
        // Set initial positions
        this._vertical = this.getAttribute('vertical') || 'bottom';
        this._horizontal = this.getAttribute('horizontal') || 'right';
        this.updatePosition();

        // Add visible attribute after a short delay to trigger animation
        setTimeout(() => {
            this.setAttribute('visible', '');
        }, 50);
    }

    disconnectedCallback() {
        this.removeAttribute('visible');
    }
}

customElements.define('floating-button', FloatingButton); 