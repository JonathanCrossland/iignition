class FolderTree extends HTMLElement {
    private outer: HTMLElement;
    private mainContainer: HTMLElement;
    private bottomContainer: HTMLElement;
    private mutationObserver: MutationObserver | null = null;
    private slotChangeHandler: ((e: Event) => void) | null = null;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Create the base structure with slots for proper light DOM projection
        this.shadowRoot!.innerHTML = `
            <style>${this.getStyles()}</style>
            <div class="folder-outer">
                <div class="folder-main-container">
                    <slot name="top-groups"></slot>
                </div>
                <div class="folder-bottom-container">
                    <slot name="bottom-groups"></slot>
                </div>
            </div>
        `;
        
        // Store references to important elements
        this.outer = this.shadowRoot!.querySelector('.folder-outer')!;
        this.mainContainer = this.shadowRoot!.querySelector('.folder-main-container')!;
        this.bottomContainer = this.shadowRoot!.querySelector('.folder-bottom-container')!;
        
        // Create handler for slot changes - store reference for cleanup
        this.slotChangeHandler = (e: Event) => {
            this.handleSlotChange(e);
        };
    }

    connectedCallback() {
        // Process existing children
        this.processChildren();
        
        // Setup mutation observer to handle dynamic changes to children
        this.setupMutationObserver();
        
        // Listen for slot changes
        this.setupSlotListeners();
        
        // Dispatch connected event
        this.dispatchEvent(new CustomEvent('folder-tree-connected', { 
            bubbles: true, 
            composed: true 
        }));
    }
    
    disconnectedCallback() {
        // Clean up observers and listeners
        this.cleanupMutationObserver();
        this.cleanupSlotListeners();
    }
    
    private setupMutationObserver() {
        // Clear any existing observer first
        this.cleanupMutationObserver();
        
        // Create and setup the mutation observer
        this.mutationObserver = new MutationObserver((mutations) => {
            let needsProcessing = false;
            
            // Only process if we have child list changes
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    needsProcessing = true;
                    break;
                }
            }
            
            if (needsProcessing) {
                this.processChildren();
            }
        });
        
        // Observe child list changes
        this.mutationObserver.observe(this, { 
            childList: true,
            subtree: false
        });
    }
    
    private cleanupMutationObserver() {
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
            this.mutationObserver = null;
        }
    }
    
    private setupSlotListeners() {
        if (this.slotChangeHandler) {
            const topSlot = this.shadowRoot!.querySelector('slot[name="top-groups"]');
            const bottomSlot = this.shadowRoot!.querySelector('slot[name="bottom-groups"]');
            
            if (topSlot) {
                topSlot.addEventListener('slotchange', this.slotChangeHandler);
            }
            
            if (bottomSlot) {
                bottomSlot.addEventListener('slotchange', this.slotChangeHandler);
            }
        }
    }
    
    private cleanupSlotListeners() {
        if (this.slotChangeHandler) {
            const topSlot = this.shadowRoot!.querySelector('slot[name="top-groups"]');
            const bottomSlot = this.shadowRoot!.querySelector('slot[name="bottom-groups"]');
            
            if (topSlot) {
                topSlot.removeEventListener('slotchange', this.slotChangeHandler);
            }
            
            if (bottomSlot) {
                bottomSlot.removeEventListener('slotchange', this.slotChangeHandler);
            }
        }
    }
    
    private handleSlotChange(e: Event) {
        // For debugging
        console.log('Slot changed:', e.target);
        
        // Additional handling can be added here if needed
        this.validateSlottedContent();
    }
    
    private validateSlottedContent() {
        // Ensure slotted content is valid - can add validation logic here
        const topSlot = this.shadowRoot!.querySelector('slot[name="top-groups"]') as HTMLSlotElement;
        const bottomSlot = this.shadowRoot!.querySelector('slot[name="bottom-groups"]') as HTMLSlotElement;
        
        if (topSlot && bottomSlot) {
            const topElements = topSlot.assignedElements();
            const bottomElements = bottomSlot.assignedElements();
            
            // Validate if needed - e.g. check that only folder-group elements are present
            console.log(`Folder tree has ${topElements.length} top groups and ${bottomElements.length} bottom groups`);
        }
    }
    
    private processChildren() {
        // Get all child elements
        const children = Array.from(this.children);
        
        // Process each child, assigning slot attributes based on their properties
        children.forEach(child => {
            if (child instanceof HTMLElement && child.tagName.toLowerCase() === 'folder-group') {
                if (child.getAttribute('dock') === 'bottom') {
                    // Only set slot if needed to avoid unnecessary DOM operations
                    if (child.getAttribute('slot') !== 'bottom-groups') {
                        child.setAttribute('slot', 'bottom-groups');
                    }
                } else {
                    // Only set slot if needed to avoid unnecessary DOM operations
                    if (child.getAttribute('slot') !== 'top-groups') {
                        child.setAttribute('slot', 'top-groups');
                    }
                }
            }
        });
    }
    
    // Rerender method can be called externally if needed
    public rerender() {
        this.processChildren();
    }

    private getStyles(): string {
        return `
            :host {
                display: block;
                width: 100%;
                height: 100%;
                background: var(--folder-bg, #181818);
                overflow: hidden;
                box-sizing: border-box;
            }
            .folder-outer {
                display: grid;
                grid-template-rows: 1fr auto;
                height: 100%;
                width: 100%;
                overflow: hidden;
                box-sizing: border-box;
            }
            .folder-main-container {
                display: flex;
                flex-direction: column;
                overflow-y: auto;
                overflow-x: hidden;
                width: 100%;
                box-sizing: border-box;
            }
            .folder-bottom-container {
                display: flex;
                flex-direction: column;
                justify-content: flex-end;
                border-top: 1px solid var(--folder-divider, #222);
                overflow-y: auto;
                overflow-x: hidden;
                width: 100%;
                box-sizing: border-box;
            }
            
            /* Hide empty container to avoid unnecessary spacing */
            .folder-bottom-container:empty {
                display: none;
            }
            
            /* Ensure slots work correctly */
            slot {
                display: contents;
            }
        `;
    }
}

customElements.define('folder-tree', FolderTree); 