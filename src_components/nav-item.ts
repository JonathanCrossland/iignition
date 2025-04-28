class NavItem extends HTMLElement {
    static get observedAttributes() {
        return ['tooltip', 'label', 'active'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        const style = document.createElement('style');
        style.textContent = this.getStyles();
        this.shadowRoot!.appendChild(style);
        
        // Create slot for SVG or custom content
        const slot = document.createElement('slot');
        this.shadowRoot!.appendChild(slot);
        
        // Listen for clicks
        this.addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('nav-item-click', {
                detail: {
                    id: this.id || '',
                    label: this.getAttribute('label') || '',
                    tooltip: this.getAttribute('tooltip') || this.getAttribute('label') || ''
                },
                bubbles: true,
                composed: true
            }));
        });
    }
    
    connectedCallback() {
        this.renderItem();
        
        // Generate an ID if none exists
        if (!this.id) {
            this.id = `nav-item-${Math.random().toString(36).substring(2, 9)}`;
        }
        
        // Set active state if attribute exists
        if (this.hasAttribute('active')) {
            this.classList.add('active');
        }
    }
    
    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'label' || name === 'tooltip') {
            this.renderItem();
        } else if (name === 'active') {
            if (this.hasAttribute('active')) {
                this.classList.add('active');
            } else {
                this.classList.remove('active');
            }
        }
    }
    
    private renderItem() {
        // Set tooltip from tooltip attribute or label if no tooltip
        const tooltip = this.getAttribute('tooltip') || this.getAttribute('label') || '';
        if (tooltip) {
            this.setAttribute('title', tooltip);
        } else {
            this.removeAttribute('title');
        }
    }
    
    private getStyles() {
        return `
            :host {
                display: flex;
                align-items: center;
                justify-content: center;
                height: var(--nav-item-height, 50px);
                color: var(--nav-item-color, #ffffff);
                cursor: pointer;
                transition: background var(--nav-transition-duration, 0.2s) ease;
                position: relative;
                width: 100%;
            }
            
            :host(:hover) {
                background: var(--nav-item-hover-bg, #333333);
            }
            
            :host(.active) {
                background: var(--nav-item-active-bg, #404040);
            }
            
            :host(.active)::before {
                content: '';
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 3px;
                background: var(--nav-item-active-indicator, #0078d7);
            }
            
            ::slotted(svg) {
                width: var(--nav-icon-size, 24px);
                height: var(--nav-icon-size, 24px);
                display: block;
            }
            
            /* Custom tooltip using ::after, VSCode style */
            :host([title]:hover)::after {
                content: attr(title);
                position: absolute;
                left: 100%;
                top: 50%;
                transform: translateY(-50%);
                background: var(--nav-tooltip-bg, #23272e);
                color: var(--nav-tooltip-color, #fff);
                box-shadow: var(--nav-tooltip-shadow, 0 2px 8px rgba(0,0,0,0.25));
                border-radius: var(--nav-tooltip-radius, 6px);
                padding: var(--nav-tooltip-padding, 6px 14px);
                font-size: var(--nav-tooltip-font-size, 13px);
                pointer-events: none;
                z-index: 9999;
                white-space: nowrap;
                opacity: 0.98;
                margin-left: 8px;
                transition: opacity 0.15s;
            }
        `;
    }
}

customElements.define('nav-item', NavItem); 