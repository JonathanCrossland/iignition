class FolderItem extends HTMLElement {
    private clickHandler: (e: Event) => void;
    
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Setup the shadow DOM with HTML template for better performance
        this.shadowRoot!.innerHTML = `
            <style>${this.getStyles()}</style>
            <div class="item-content">
                <slot></slot>
            </div>
        `;
        
        // Store event handler reference for proper cleanup
        this.clickHandler = (e: Event) => {
            this.handleClick(e);
        };
    }
    
    connectedCallback() {
        // Add event listeners
        this.addEventListener('click', this.clickHandler);
        
        // Set role for accessibility
        if (!this.hasAttribute('role')) {
            this.setAttribute('role', 'listitem');
        }
        
        // Dispatch connected event
        this.dispatchEvent(new CustomEvent('folder-item-connected', {
            bubbles: true,
            composed: true
        }));
    }
    
    disconnectedCallback() {
        // Clean up event listeners
        this.removeEventListener('click', this.clickHandler);
    }
    
    private handleClick(e: Event) {
        // Dispatch click event with item details
        this.dispatchEvent(new CustomEvent('folder-item-click', {
            detail: { 
                text: this.textContent?.trim() || '',
                element: this
            },
            bubbles: true,
            composed: true
        }));
    }
    
    // Expose a public method to get the item text
    public getItemText(): string {
        return this.textContent?.trim() || '';
    }

    private getStyles(): string {
        return `
            :host {
                display: block;
                width: 100%;
                box-sizing: border-box;
                background: var(--folder-item-bg, transparent);
                color: var(--folder-item-color, #d4d4d4);
                font-family: var(--folder-item-font-family, 'Inter', 'Segoe UI', 'Arial', sans-serif);
                font-size: var(--folder-item-font-size, 0.97rem);
                font-weight: var(--folder-item-font-weight, 400);
                margin: 0;
                padding: 0;
                cursor: pointer;
                transition: background 0.15s;
                user-select: none;
                line-height: 1.7;
            }
            
            .item-content {
                padding: var(--folder-item-padding, 0.35rem 0.5rem);
                padding-left: var(--folder-item-left-margin, 1.5rem);
                box-sizing: border-box;
                width: 100%;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            :host(:hover) {
                background: var(--folder-item-hover-bg, #23272e);
            }
            
            :host(:focus-visible) {
                outline: 2px solid var(--folder-item-focus-color, #007fd4);
                outline-offset: -2px;
            }
        `;
    }
}

customElements.define('folder-item', FolderItem); 