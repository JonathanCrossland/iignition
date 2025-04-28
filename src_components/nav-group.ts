class NavGroup extends HTMLElement {
    private header: HTMLElement;
    private content: HTMLElement;
    private collapsed: boolean = false;
    private iconContainer: HTMLElement;

    static get observedAttributes() {
        return ['label', 'collapsed'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.textContent = this.getStyles();
        this.shadowRoot!.appendChild(style);

        // Create header
        this.header = document.createElement('div');
        this.header.className = 'nav-group-header';
        this.shadowRoot!.appendChild(this.header);

        // Create icon container with slot for SVG
        this.iconContainer = document.createElement('div');
        this.iconContainer.className = 'nav-group-icon';
        const iconSlot = document.createElement('slot');
        iconSlot.name = 'icon';
        this.iconContainer.appendChild(iconSlot);
        this.header.appendChild(this.iconContainer);

        // Create content container
        this.content = document.createElement('div');
        this.content.className = 'nav-group-content';
        const contentSlot = document.createElement('slot');
        this.content.appendChild(contentSlot);
        this.shadowRoot!.appendChild(this.content);

        // Add click handler to header
        this.header.addEventListener('click', () => {
            this.toggleCollapse();
        });
    }

    connectedCallback() {
        this.renderHeader();
        this.updateCollapsed();
        
        if (this.hasAttribute('collapsed')) {
            this.collapsed = true;
            this.updateCollapsed();
        }
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'label') {
            this.renderHeader();
        } else if (name === 'collapsed') {
            this.collapsed = this.hasAttribute('collapsed');
            this.updateCollapsed();
        }
    }

    private renderHeader() {
        // Set tooltip from label
        const label = this.getAttribute('label') || '';
        if (label) {
            this.header.setAttribute('title', label);
        } else {
            this.header.removeAttribute('title');
        }
    }

    private toggleCollapse() {
        this.collapsed = !this.collapsed;
        this.updateCollapsed();
        
        // Toggle collapsed attribute for external state tracking
        if (this.collapsed) {
            this.setAttribute('collapsed', '');
        } else {
            this.removeAttribute('collapsed');
        }
        
        // Dispatch event
        this.dispatchEvent(new CustomEvent('nav-group-toggle', {
            detail: { collapsed: this.collapsed },
            bubbles: true,
            composed: true
        }));
    }

    private updateCollapsed() {
        if (this.collapsed) {
            this.content.style.display = 'none';
            this.header.classList.add('collapsed');
            this.iconContainer.classList.add('collapsed');
        } else {
            this.content.style.display = 'block';
            this.header.classList.remove('collapsed');
            this.iconContainer.classList.remove('collapsed');
        }
    }

    private getStyles(): string {
        return `
            :host {
                display: block;
                width: 100%;
                color: var(--nav-item-color, #ffffff);
                margin: 0;
                padding: 0;
                overflow: hidden;
            }
            .nav-group-header {
                display: flex;
                align-items: center;
                justify-content: center;
                height: var(--nav-item-height, 50px);
                cursor: pointer;
                position: relative;
                transition: background var(--nav-transition-duration, 0.2s) ease;
                margin: 0;
                padding: 0;
            }
            .nav-group-header:hover {
                background: var(--nav-item-hover-bg, #333333);
            }
            .nav-group-icon {
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.2s ease;
            }
            .nav-group-icon.collapsed {
                transform: rotate(-90deg);
            }
            ::slotted(svg[slot="icon"]) {
                width: var(--nav-icon-size, 24px);
                height: var(--nav-icon-size, 24px);
                display: block;
            }
            .nav-group-content {
                padding: 0;
                width: 100%;
                box-sizing: border-box;
                transition: height 0.2s ease;
            }
            /* Custom tooltip using ::after, VSCode style */
            .nav-group-header[title]:hover::after {
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

customElements.define('nav-group', NavGroup); 