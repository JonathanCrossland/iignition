/**
 * MenuDropdown Web Component
 * 
 * A reusable dropdown menu component that can be used across the application.
 * Supports custom trigger content, menu items, and separators.
 * 
 * @element menu-dropdown
 * @slot trigger - The content that triggers the dropdown (button, icon, etc.)
 * @slot items - The menu items to show in the dropdown
 * @fires menu-item-click - When a menu item is clicked
 * @fires dropdown-toggle - When the dropdown is opened or closed
 */
class MenuDropdown extends HTMLElement {
    private dropdown: HTMLElement;
    private content: HTMLElement;
    
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Create the base structure
        this.shadowRoot!.innerHTML = `
            <style>${this.getStyles()}</style>
            <div class="menu-dropdown">
                <div class="menu-trigger">
                    <slot name="trigger"></slot>
                </div>
                <div class="menu-content">
                    <slot name="items"></slot>
                </div>
            </div>
        `;
        
        // Store references
        this.dropdown = this.shadowRoot!.querySelector('.menu-dropdown')!;
        this.content = this.shadowRoot!.querySelector('.menu-content')!;
        
        // Add event listeners
        const trigger = this.shadowRoot!.querySelector('.menu-trigger');
        trigger?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown();
        });
        
        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.contains(e.target as Node)) {
                this.closeDropdown();
            }
        });
        
        // Handle menu item clicks
        this.addEventListener('click', (e) => {
            const menuItem = (e.target as HTMLElement).closest('.menu-item');
            if (menuItem) {
                e.stopPropagation();
                this.dispatchEvent(new CustomEvent('menu-item-click', {
                    detail: {
                        text: menuItem.textContent?.trim(),
                        value: menuItem.getAttribute('value'),
                        element: menuItem
                    },
                    bubbles: true,
                    composed: true
                }));
                this.closeDropdown();
            }
        });
    }
    
    toggleDropdown() {
        const isOpen = this.content.classList.toggle('show');
        this.dispatchEvent(new CustomEvent('dropdown-toggle', {
            detail: { open: isOpen },
            bubbles: true,
            composed: true
        }));
        
        if (isOpen) {
            // Position the dropdown
            const rect = this.dropdown.getBoundingClientRect();
            this.content.style.left = '0';
            this.content.style.top = rect.height + 'px';
            
            // Adjust if it would go off screen
            const contentRect = this.content.getBoundingClientRect();
            if (contentRect.right > window.innerWidth) {
                this.content.style.left = 'auto';
                this.content.style.right = '0';
            }
        }
    }
    
    closeDropdown() {
        this.content.classList.remove('show');
        this.dispatchEvent(new CustomEvent('dropdown-toggle', {
            detail: { open: false },
            bubbles: true,
            composed: true
        }));
    }
    
    private getStyles(): string {
        return `
            :host {
                display: inline-block;
                position: relative;
            }
            
            .menu-dropdown {
                position: relative;
                display: inline-flex;
                align-items: center;
            }
            
            .menu-trigger {
                cursor: pointer;
                display: flex;
                align-items: center;
            }
            
            .menu-content {
                display: none;
                position: absolute;
                min-width: 160px;
                background: var(--menu-dropdown-bg, var(--titlebar-dropdown-bg, #252525));
                border: 1px solid var(--menu-dropdown-border, var(--titlebar-dropdown-border, #444));
                border-radius: 4px;
                box-shadow: var(--menu-dropdown-shadow, var(--titlebar-dropdown-shadow, 0 4px 8px rgba(0, 0, 0, 0.3)));
                z-index: 1000;
                margin-top: 5px;
                color: var(--menu-dropdown-color, var(--titlebar-color, #d4d4d4));
            }
            
            .menu-content.show {
                display: block;
            }
            
            ::slotted([slot="items"]) {
                display: block;
            }
            
            ::slotted(.menu-item) {
                padding: 8px 16px;
                cursor: pointer;
                white-space: nowrap;
                transition: background 0.2s;
            }
            
            ::slotted(.menu-item:hover) {
                background: var(--menu-dropdown-hover-bg, var(--titlebar-dropdown-hover-bg, #333));
            }
            
            ::slotted(.menu-separator) {
                height: 1px;
                background: var(--menu-dropdown-border, var(--titlebar-dropdown-border, #444));
                margin: 6px 0;
            }
        `;
    }
}

customElements.define('menu-dropdown', MenuDropdown); 