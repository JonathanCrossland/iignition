/**
 * FolderGroup Web Component
 * 
 * A collapsible group container for folder items that can be docked at the top or bottom of a folder tree.
 * Handles click events and manages the collapsed state of its content.
 * 
 * @element folder-group
 * @attr {string} label - The text label for the group header
 * @attr {boolean} collapsed - Controls whether the group is collapsed
 * @attr {string} dock - When set to "bottom", docks the group at the bottom of a folder-tree
 * @fires folder-group-menu-click - When the menu button in the header is clicked
 * @fires folder-group-connected - When the component is connected to the DOM
 * @slot menu - Optional slot for custom menu content. If not provided, no menu will be shown.
 */


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
                <span class="folder-group-menu" title="Group menu">
                    <slot name="menu"></slot>
                </span>
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
            if (target.closest('.folder-group-menu')) return;
            this.toggleCollapse();
        };
        
        this.menuClickHandler = (e: Event) => {
            e.stopPropagation();
            const originalTarget = e.target as HTMLElement;
            const currentTarget = e.currentTarget as HTMLElement;
            
            console.log('=== FOLDER GROUP MENU CLICK DEBUG ===');
            console.log('Group label:', this.getAttribute('label'));
            console.log('Original target:', originalTarget);
            console.log('Current target:', currentTarget);
            console.log('Original target tagName:', originalTarget.tagName);
            console.log('Original target id:', originalTarget.id);
            console.log('Original target className:', originalTarget.className);
            console.log('Original target dataset:', originalTarget.dataset);
            console.log('Original target attributes:', Array.from(originalTarget.attributes).map(a => `${a.name}="${a.value}"`));
            
            // Check if we need to walk up to find the actual menu item
            let actualMenuElement = originalTarget;
            let walkElement = originalTarget;
            
            // Walk up the DOM tree to find an element with data-action or id
            while (walkElement && walkElement !== currentTarget) {
                if (walkElement.hasAttribute('data-action') || walkElement.id) {
                    actualMenuElement = walkElement;
                    console.log('Found menu element with data-action/id:', actualMenuElement);
                    break;
                }
                walkElement = walkElement.parentElement as HTMLElement;
            }
            
            console.log('Final menu element:', actualMenuElement);
            console.log('Final element id:', actualMenuElement.id);
            console.log('Final element dataset:', actualMenuElement.dataset);
            console.log('Final element data-action:', actualMenuElement.getAttribute('data-action'));
            console.log('=====================================');
            
            // Dispatch the menu click event
            const event = new CustomEvent('folder-group-menu-click', { 
                detail: { 
                    label: this.getAttribute('label'),
                    element: this,
                    clickedElement: actualMenuElement
                }, 
                bubbles: true, 
                composed: true 
            });
            
            console.log('Dispatching folder-group-menu-click event with detail:', event.detail);
            this.dispatchEvent(event);
        };
    }

    connectedCallback() {
        console.log('FolderGroup connected:', this.getAttribute('label'));
        
        // Set initial label
        this.updateLabel();
        
        // Add event listeners
        this.header.addEventListener('click', this.headerClickHandler);
        const menuButton = this.shadowRoot!.querySelector('.folder-group-menu');
        if (menuButton) {
            menuButton.addEventListener('click', this.menuClickHandler);
        }

        // Listen for folder-item-click events from child folder-items
        this.addEventListener('folder-item-click', (e: Event) => {
            console.log('Folder group received item click:', (e as CustomEvent).detail);
            // We don't stop propagation - this is crucial for event bubbling to work
        });
        
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
            detail: {
                label: this.getAttribute('label')
            },
            bubbles: true,
            composed: true
        }));

        // Add slotchange listener to handle dynamically added children
        const slot = this.shadowRoot!.querySelector('slot');
        if (slot) {
            slot.addEventListener('slotchange', () => {
                console.log('Folder group slot changed:', this.getAttribute('label'));
                this.processChildren();
            });
        }

        // Minimal drag-and-drop handlers
        this.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        this.addEventListener('drop', (e) => {
            e.preventDefault();
            const dragged = FolderItem.draggedItem;
            if (!dragged) return;
            let target = e.target as HTMLElement;
            const item = target.closest('folder-item');
            if (item && item !== dragged) {
                this.insertBefore(dragged, item);
            } else {
                this.appendChild(dragged);
            }
            // Dispatch reorder event with only the group node in detail
            this.dispatchEvent(new CustomEvent('folder-group-items-reordered', {
                detail: { group: this },
                bubbles: true,
                composed: true
            }));
        });
    }
    
    disconnectedCallback() {
        console.log('FolderGroup disconnected:', this.getAttribute('label'));
        
        // Remove event listeners
        this.header.removeEventListener('click', this.headerClickHandler);
        const menuButton = this.shadowRoot!.querySelector('.folder-group-menu');
        if (menuButton) {
            menuButton.removeEventListener('click', this.menuClickHandler);
        }

        // Remove slot change listener
        const slot = this.shadowRoot!.querySelector('slot');
        if (slot) {
            slot.removeEventListener('slotchange', () => {});
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
        // Ensure all items have unique, sequential order attributes
        const items = Array.from(this.querySelectorAll('folder-item'));
        const FolderItemCtor = customElements.get('folder-item');
        items.forEach((item, idx) => {
            if (FolderItemCtor && item instanceof FolderItemCtor && typeof (item as any).setOrder === 'function' && !item.hasAttribute('order')) {
                (item as any).setOrder(idx);
            }
        });
        // Sort children by order attribute if present
        if (items.length > 1 && items[0].hasAttribute('order')) {
            items.sort((a, b) => {
                const ao = (FolderItemCtor && a instanceof FolderItemCtor && typeof (a as any).getOrder === 'function') ? (a as any).getOrder() : 0;
                const bo = (FolderItemCtor && b instanceof FolderItemCtor && typeof (b as any).getOrder === 'function') ? (b as any).getOrder() : 0;
                return ao - bo;
            });
            items.forEach(item => this.appendChild(item));
        }
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
    
    /**
     * Toggle the collapsed state of the group
     * @public
     */
    public toggle() {
        this.toggleCollapse();
    }
    
    /**
     * Expand the group by removing the collapsed attribute
     * @public
     */
    public expand() {
        this.collapsed = false;
        this.removeAttribute('collapsed');
        this.updateCollapse();
    }
    
    /**
     * Collapse the group by setting the collapsed attribute
     * @public
     */
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
                display: flex;
                align-items: center;
            }
            .folder-group-menu:empty {
                display: none;
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
            
            /* Style for slotted menu content */
            ::slotted([slot="menu"]) {
                display: flex;
                align-items: center;
                justify-content: center;
                min-width: 1em;
                min-height: 1em;
            }
        `;
    }
}

customElements.define('folder-group', FolderGroup); 