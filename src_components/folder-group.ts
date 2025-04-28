class FolderGroup extends HTMLElement {
    private header: HTMLElement;
    private content: HTMLElement;
    private collapsed: boolean = false;
    private headerClickHandler: (e: Event) => void;
    private menuClickHandler: (e: Event) => void;
    
    static get observedAttributes() {
        return ['label', 'collapsed'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Setup shadow DOM with a template for better performance
        this.shadowRoot!.innerHTML = `
            <style>${this.getStyles()}</style>
            <div class="folder-group-header">
                <span class="folder-group-label"></span>
                <span class="folder-group-menu" title="Group menu">...</span>
            </div>
            <div class="folder-group-content">
                <slot></slot>
            </div>
        `;
        
        // Store element references
        this.header = this.shadowRoot!.querySelector('.folder-group-header')!;
        this.content = this.shadowRoot!.querySelector('.folder-group-content')!;
        
        // Store event handler references for proper cleanup
        this.headerClickHandler = (e: Event) => {
            // Only toggle if not clicking the menu
            const target = e.target as HTMLElement;
            if (target.classList.contains('folder-group-menu')) return;
            this.toggleCollapse();
        };
        
        this.menuClickHandler = (e: Event) => {
            e.stopPropagation();
            this.dispatchEvent(new CustomEvent('folder-group-menu-click', { 
                detail: { 
                    label: this.getAttribute('label'),
                    element: this
                }, 
                bubbles: true, 
                composed: true 
            }));
        };
    }

    connectedCallback() {
        // Set initial label
        this.updateLabel();
        
        // Add event listeners
        this.header.addEventListener('click', this.headerClickHandler);
        const menuButton = this.shadowRoot!.querySelector('.folder-group-menu');
        if (menuButton) {
            menuButton.addEventListener('click', this.menuClickHandler);
        }
        
        // Set initial collapsed state from attribute
        this.collapsed = this.hasAttribute('collapsed');
        this.updateCollapse();
        
        // Set role for accessibility
        if (!this.hasAttribute('role')) {
            this.setAttribute('role', 'group');
        }
        
        // Ensure all folder-items have proper slot
        this.processChildren();
        
        // Dispatch connected event
        this.dispatchEvent(new CustomEvent('folder-group-connected', {
            bubbles: true,
            composed: true
        }));
    }
    
    disconnectedCallback() {
        // Remove event listeners
        this.header.removeEventListener('click', this.headerClickHandler);
        const menuButton = this.shadowRoot!.querySelector('.folder-group-menu');
        if (menuButton) {
            menuButton.removeEventListener('click', this.menuClickHandler);
        }
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'label' && oldValue !== newValue) {
            this.updateLabel();
        } else if (name === 'collapsed') {
            this.collapsed = this.hasAttribute('collapsed');
            this.updateCollapse();
        }
    }
    
    private updateLabel() {
        const labelEl = this.shadowRoot!.querySelector('.folder-group-label');
        if (labelEl) {
            labelEl.textContent = this.getAttribute('label') || '';
        }
    }
    
    private processChildren() {
        // Ensure all direct children are slotted properly
        Array.from(this.children).forEach(child => {
            if (child instanceof HTMLElement && !child.slot) {
                // Default slot is used for folder-items
                if (child.tagName.toLowerCase() === 'folder-item') {
                    // No need to set slot as we're using default slot
                }
            }
        });
    }

    private toggleCollapse() {
        this.collapsed = !this.collapsed;
        
        if (this.collapsed) {
            this.setAttribute('collapsed', '');
        } else {
            this.removeAttribute('collapsed');
        }
        
        this.updateCollapse();
    }

    private updateCollapse() {
        if (this.collapsed) {
            this.content.style.display = 'none';
            this.header.classList.add('collapsed');
        } else {
            this.content.style.display = '';
            this.header.classList.remove('collapsed');
        }
    }
    
    // Public method to toggle collapse state
    public toggle() {
        this.toggleCollapse();
    }
    
    // Public method to expand the group
    public expand() {
        this.collapsed = false;
        this.removeAttribute('collapsed');
        this.updateCollapse();
    }
    
    // Public method to collapse the group
    public collapse() {
        this.collapsed = true;
        this.setAttribute('collapsed', '');
        this.updateCollapse();
    }

    private getStyles(): string {
        return `
            :host {
                display: block;
                width: 100%;
                box-sizing: border-box;
                margin-bottom: 0.5rem;
                border-radius: var(--folder-group-radius, 0);
                background: var(--folder-group-bg, #23272e);
                border: var(--folder-group-border, 1px solid #222);
                overflow: hidden;
            }
            .folder-group-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: var(--folder-group-header-bg, #23272e);
                color: var(--folder-group-header-color, #d4d4d4);
                padding: var(--folder-group-padding, 0.5rem 1.2rem);
                cursor: pointer;
                user-select: none;
                font-family: var(--folder-group-font-family, 'Segoe UI', 'Inter', Arial, sans-serif);
                font-size: var(--folder-group-font-size, 1rem);
                font-weight: var(--folder-group-font-weight, 600);
                color: var(--folder-group-color, #d7dae0);
                border-radius: var(--folder-group-radius, 0) var(--folder-group-radius, 0) 0 0;
                transition: background 0.2s;
                width: 100%;
                letter-spacing: 0.03em;
                box-sizing: border-box;
                overflow-x: hidden;
            }
            .folder-group-header:hover {
                background: var(--folder-group-header-hover-bg, #2c313a);
            }
            .folder-group-header.collapsed {
                opacity: 0.7;
            }
            .folder-group-label {
                flex: 1 1 auto;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .folder-group-menu {
                color: var(--folder-group-menu-color, #888);
                margin-left: 0.5rem;
                font-size: 1.2em;
                cursor: pointer;
                border-radius: 3px;
                padding: 0 0.25em;
                transition: background 0.2s;
            }
            .folder-group-menu:focus {
                outline: 2px solid var(--folder-group-header-color, #d4d4d4);
            }
            .folder-group-content {
                background: var(--folder-group-content-bg, #23272e);
                color: var(--folder-group-content-color, #d7dae0);
                padding: 0.25rem 0;
                border-radius: 0 0 var(--folder-group-radius, 0) var(--folder-group-radius, 0);
                width: 100%;
                box-sizing: border-box;
                overflow-x: hidden;
            }
            
            /* Style for slotted folder items */
            ::slotted(folder-item) {
                display: block;
                width: 100%;
            }
        `;
    }
}

customElements.define('folder-group', FolderGroup); 