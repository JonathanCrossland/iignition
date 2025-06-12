/**
 * FolderTree Web Component
 * 
 * A vertical folder tree UI component for organizing content into collapsible groups.
 * Supports top and bottom docked groups, with automatic event delegation from child components.
 * 
 * @element folder-tree
 * @attr {boolean} hidden - Controls visibility of the folder tree
 * @fires folder-group-menu-click - When the menu button in a folder group is clicked
 * @fires folder-item-click - When an item within a folder group is clicked
 * @fires folder-tree-connected - When the folder tree is connected to the DOM
 * @csspart bottom-container - The container for bottom-docked folder groups
 * @property {string} --folder-bg - Background color of the folder tree (default: #181818)
 * @property {string} --folder-bottom-border-color - Color of the border above bottom-docked groups (default: #222)
 */
class FolderTree extends HTMLElement {
    private outer: HTMLElement;
    private mainContainer: HTMLElement;
    private bottomContainer: HTMLElement;
    private mutationObserver: MutationObserver | null = null;
    private slotChangeHandler: ((e: Event) => void) | null = null;
    
    // Define attributes to observe
    static get observedAttributes() {
        return ['hidden'];
    }

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

    // Handle attribute changes
    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'hidden') {
            this.updateVisibility();
        }
    }

    // Update visibility based on hidden attribute
    private updateVisibility() {
        if (this.hasAttribute('hidden')) {
            this.style.display = 'none';
        } else {
            this.style.display = '';
        }
    }

    connectedCallback() {
        console.log('FolderTree connected to DOM');
        
        // Process existing children
        this.processChildren();
        
        // Setup mutation observer to handle dynamic changes to children
        this.setupMutationObserver();
        
        // Listen for slot changes
        this.setupSlotListeners();

        // Add event listeners for child component events
        this.setupEventListeners();
        
        // Initial visibility setup
        this.updateVisibility();
        
        // Dispatch connected event
        this.dispatchEvent(new CustomEvent('folder-tree-connected', { 
            bubbles: true, 
            composed: true 
        }));
    }
    
    disconnectedCallback() {
        console.log('FolderTree disconnected from DOM');
        
        // Clean up observers and listeners
        this.cleanupMutationObserver();
        this.cleanupSlotListeners();
        this.cleanupEventListeners();
    }

    /**
     * Sets up event listeners to handle events from child components
     * This is crucial for event delegation through the shadow DOM
     */
    private setupEventListeners() {
        console.log('Setting up FolderTree event listeners');
        
        // Listen for folder-group-menu-click events using event delegation
        this.addEventListener('folder-group-menu-click', (e: Event) => {
            console.log('Folder tree received group menu click:', (e as CustomEvent).detail);
            
            // Don't stop propagation - let the event bubble naturally
            // Events already have bubbles:true and composed:true set by the originating components
        });

        // Listen for folder-item-click events using event delegation 
        this.addEventListener('folder-item-click', (e: Event) => {
            console.log('Folder tree received item click:', (e as CustomEvent).detail);
            
            // Don't stop propagation - let the event bubble naturally
        });

        // Enable direct event access from slots for shadow DOM boundaries
        this.setupSlotEvents();
    }

    /**
     * Sets up additional event listeners on slots to ensure events can cross shadow DOM boundaries
     * This is especially important for deeply nested components
     */
    private setupSlotEvents() {
        const topSlot = this.shadowRoot!.querySelector('slot[name="top-groups"]') as HTMLSlotElement;
        const bottomSlot = this.shadowRoot!.querySelector('slot[name="bottom-groups"]') as HTMLSlotElement;
        
        if (topSlot) {
            // Forward all relevant events from the slotted elements
            ['folder-group-menu-click', 'folder-item-click'].forEach(eventName => {
                topSlot.addEventListener(eventName, (e: Event) => {
                    console.log(`FolderTree: ${eventName} from top slot`, (e as CustomEvent).detail);
                    // Allow event to bubble naturally
                });
            });
        }
        
        if (bottomSlot) {
            // Forward all relevant events from the slotted elements
            ['folder-group-menu-click', 'folder-item-click'].forEach(eventName => {
                bottomSlot.addEventListener(eventName, (e: Event) => {
                    console.log(`FolderTree: ${eventName} from bottom slot`, (e as CustomEvent).detail);
                    // Allow event to bubble naturally
                });
            });
        }
    }

    private cleanupEventListeners() {
        // No explicit cleanup needed for events attached directly to this element
        // They'll be garbage collected when the element is removed
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
        console.log('FolderTree: Slot changed:', e.target);
        
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
            console.log(`FolderTree: ${topElements.length} top groups and ${bottomElements.length} bottom groups`);
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
    
    /**
     * Manually trigger re-processing of children and updating of the component
     * @public
     */
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
                border-top: 1px solid var(--folder-bottom-border-color, var(--folder-divider, #222));
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