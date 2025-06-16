/**
 * FolderItem Web Component
 * 
 * A simple item that can be placed inside folder-group components.
 * Handles click events and provides proper event bubbling through the component hierarchy.
 * 
 * @element folder-item
 * @fires folder-item-click - When the item is clicked, with text content in the detail
 * @fires folder-item-menu-click - When an action slot item is clicked
 * @fires folder-item-connected - When the component is connected to the DOM
 * @slot action - Optional slot for action icons/buttons that appear on the right side
 */
class FolderItem extends HTMLElement {
    private clickHandler: (e: Event) => void;
    private actionClickHandler: (e: Event) => void;
    
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Setup the shadow DOM with HTML template for better performance
        this.shadowRoot!.innerHTML = `
            <style>${this.getStyles()}</style>
            <div class="item-content">
                <span class="item-text"><slot></slot></span>
                <span class="item-actions"><slot name="action"></slot></span>
            </div>
        `;
        
        // Store event handler references for proper cleanup
        this.clickHandler = (e: Event) => {
            // Don't trigger item click when clicking actions
            if ((e.target as Element)?.closest('.item-actions')) {
                return;
            }
            this.handleClick(e);
        };

        // Handle action slot clicks
        this.actionClickHandler = (e: Event) => {
            e.stopPropagation(); // Prevent triggering the main item click
            this.handleActionClick(e);
        };
    }
    
    connectedCallback() {
        console.log('FolderItem connected:', this.textContent?.trim());
        
        // Add event listeners
        this.addEventListener('click', this.clickHandler);
        const actionsContainer = this.shadowRoot!.querySelector('.item-actions');
        if (actionsContainer) {
            actionsContainer.addEventListener('click', this.actionClickHandler);
        }
        
        // Set role for accessibility
        if (!this.hasAttribute('role')) {
            this.setAttribute('role', 'listitem');
        }
        
        // Setup tabindex for keyboard navigation if not already set
        if (!this.hasAttribute('tabindex')) {
            this.setAttribute('tabindex', '0');
        }
        
        // Dispatch connected event
        this.dispatchEvent(new CustomEvent('folder-item-connected', {
            detail: {
                text: this.textContent?.trim() || ''
            },
            bubbles: true,
            composed: true
        }));
    }
    
    disconnectedCallback() {
        console.log('FolderItem disconnected:', this.textContent?.trim());
        
        // Clean up event listeners
        this.removeEventListener('click', this.clickHandler);
        const actionsContainer = this.shadowRoot!.querySelector('.item-actions');
        if (actionsContainer) {
            actionsContainer.removeEventListener('click', this.actionClickHandler);
        }
    }
    
    /**
     * Handle click events on the item
     * @private
     */
    private handleClick(e: Event) {
        console.log('FolderItem clicked:', this.textContent?.trim());
        
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

    /**
     * Handle click events on action slot items
     * @private
     */
    private handleActionClick(e: Event) {
        console.log('FolderItem action clicked:', this.textContent?.trim());
        
        // Dispatch menu click event with item details
        this.dispatchEvent(new CustomEvent('folder-item-menu-click', {
            detail: { 
                text: this.textContent?.trim() || '',
                element: this,
                action: (e.target as Element)?.closest('[slot="action"]')
            },
            bubbles: true,
            composed: true
        }));
    }
    
    /**
     * Get the text content of the item
     * @public
     * @returns {string} The trimmed text content of the item
     */
    public getItemText(): string {
        return this.textContent?.trim() || '';
    }

    /**
     * Define the component styles
     * @private
     */
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
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: var(--folder-item-padding, 0.35rem 0.5rem);
                padding-left: var(--folder-item-left-margin, 1.5rem);
                box-sizing: border-box;
                width: 100%;
            }

            .item-text {
                flex: 1;
                min-width: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .item-actions {
                display: none;
                align-items: center;
                gap: 4px;
                margin-left: 8px;
                opacity: 0.7;
                transition: opacity 0.2s;
            }

            .item-actions:not(:empty) {
                display: flex;
            }

            .item-actions:hover {
                opacity: 1;
            }
            
            :host(:hover) {
                background: var(--folder-item-hover-bg, #23272e);
            }
            
            :host(:focus-visible) {
                outline: 2px solid var(--folder-item-focus-color, #007fd4);
                outline-offset: -2px;
            }

            /* Style slotted action elements */
            ::slotted([slot="action"]) {
                cursor: pointer;
                opacity: 0.7;
                transition: opacity 0.2s;
            }

            ::slotted([slot="action"]:hover) {
                opacity: 1;
            }
        `;
    }
}

customElements.define('folder-item', FolderItem); 