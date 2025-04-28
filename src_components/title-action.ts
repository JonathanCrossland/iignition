class TitleAction extends HTMLElement {
    private iconContainer: HTMLElement;
    private labelContainer: HTMLElement;

    static get observedAttributes() {
        return ['label'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = this.getStyles();
        this.shadowRoot!.appendChild(style);

        // Create container
        const container = document.createElement('div');
        container.className = 'title-action-container';
        this.shadowRoot!.appendChild(container);

        // Create icon container with slot
        this.iconContainer = document.createElement('div');
        this.iconContainer.className = 'title-action-icon';
        const iconSlot = document.createElement('slot');
        this.iconContainer.appendChild(iconSlot);
        container.appendChild(this.iconContainer);

        // Create label container
        this.labelContainer = document.createElement('div');
        this.labelContainer.className = 'title-action-label';
        container.appendChild(this.labelContainer);

        // Add click handler
        this.addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('title-action-click', {
                detail: {
                    id: this.id || '',
                    label: this.getAttribute('label') || ''
                },
                bubbles: true,
                composed: true
            }));
        });
    }

    connectedCallback() {
        this.renderAction();
        
        // Generate an ID if none exists
        if (!this.id) {
            this.id = `title-action-${Math.random().toString(36).substr(2, 9)}`;
        }
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'label') {
            this.renderAction();
        }
    }

    private renderAction() {
        const label = this.getAttribute('label');
        if (label) {
            this.labelContainer.textContent = label;
            this.labelContainer.style.display = 'block';
        } else {
            this.labelContainer.style.display = 'none';
        }
    }

    private getStyles() {
        return `
            :host {
                display: inline-flex;
                align-items: center;
                cursor: pointer;
                user-select: none;
                box-sizing: border-box;
                max-width: 100%;
                overflow: hidden;
            }
            
            .title-action-container {
                display: flex;
                align-items: center;
                gap: 5px;
                max-width: 100%;
                overflow: hidden;
            }
            
            .title-action-icon {
                display: flex;
                align-items: center;
                justify-content: center;
                flex: 0 0 auto;
                width: var(--titlebar-action-icon-size, 16px);
                height: var(--titlebar-action-icon-size, 16px);
                overflow: hidden;
                position: relative;
            }
            
            .title-action-label {
                font-size: var(--titlebar-action-label-size, 12px);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 120px;
            }
            
            ::slotted(svg) {
                width: var(--titlebar-action-icon-size, 16px) !important;
                height: var(--titlebar-action-icon-size, 16px) !important;
                display: block;
                flex-shrink: 0;
                max-width: 100%;
                overflow: visible;
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
            }
            
            /* Force viewBox to be constrained */
            ::slotted(svg *) {
                transform-box: fill-box;
                transform-origin: center;
                max-width: 100%;
                max-height: 100%;
                vector-effect: non-scaling-stroke;
            }
        `;
    }
}

customElements.define('title-action', TitleAction); 