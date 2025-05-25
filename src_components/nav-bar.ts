class NavBar extends HTMLElement {
    private outer: HTMLElement;
    private container: HTMLElement;
    private bottomContainer: HTMLElement;
    private header: HTMLElement;
    private styleElement: HTMLStyleElement;

    constructor() {
        super();
        
        // Create scoped styles instead of using Shadow DOM
        this.styleElement = document.createElement('style');
        this.styleElement.textContent = this.getStyles();
        this.appendChild(this.styleElement);

        // Create outer grid container
        this.outer = document.createElement('div');
        this.outer.className = 'nav-bar-outer';
        this.appendChild(this.outer);

        // Create header section
        this.header = document.createElement('div');
        this.header.className = 'nav-bar-header';
        this.outer.appendChild(this.header);
        
        // Create main container (top items)
        this.container = document.createElement('div');
        this.container.className = 'nav-bar-container';
        this.outer.appendChild(this.container);

        // Create bottom container (bottom-docked items)
        this.bottomContainer = document.createElement('div');
        this.bottomContainer.className = 'nav-bar-bottom-container';
        this.outer.appendChild(this.bottomContainer);
    }

    static get observedAttributes() {
        return ['header-icon'];
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'header-icon' && oldValue !== newValue) {
            this.renderHeader();
        }
    }

    private renderHeader() {
        // Clear header
        this.header.innerHTML = '';
        // Check for custom logo URL via CSS custom property
        const logoUrl = getComputedStyle(this).getPropertyValue('--nav-bar-header-logo-url').trim();
        if (logoUrl) {
            const img = document.createElement('img');
            img.className = 'nav-bar-header-logo';
            img.src = logoUrl.replace(/^['"]|['"]$/g, ''); // Remove quotes if present
            img.alt = 'Logo';
            this.header.appendChild(img);
        }
        // Separator
        const sep = document.createElement('div');
        sep.className = 'nav-bar-header-separator';
        this.header.appendChild(sep);
    }

    connectedCallback() {
        // Process any slotted header content
        const headerContent = this.querySelector('[slot="header"]');
        if (headerContent) {
            this.header.appendChild(headerContent);
            headerContent.removeAttribute('slot'); // No longer needed
        }
        
        // Clear containers
        this.container.innerHTML = '';
        this.bottomContainer.innerHTML = '';
        
        // Separate nav-items and nav-groups into top and bottom
        const topItems: HTMLElement[] = [];
        const bottomItems: HTMLElement[] = [];
        
        // Find direct child nav-items and nav-groups
        const navElements = Array.from(this.querySelectorAll('nav-item, nav-group'));
        
        navElements.forEach(child => {
            if (child instanceof HTMLElement) {
                // Skip if it's a descendant of another nav component
                const parent = child.parentElement;
                if (parent !== this && parent?.closest('nav-group') !== null) {
                    return;
                }
                
                // Add nav-item class for consistent styling
                if (child.tagName.toLowerCase() === 'nav-item') {
                    this.makeNavItem(child as HTMLElement);
                }
                
                // Sort into top or bottom containers
                if (child.getAttribute('dock') === 'bottom') {
                    bottomItems.push(child as HTMLElement);
                } else {
                    topItems.push(child as HTMLElement);
                }
            }
        });
        
        // Append top items
        topItems.forEach(item => this.container.appendChild(item));
        // Append bottom items
        bottomItems.forEach(item => this.bottomContainer.appendChild(item));
    }

    private makeNavItem(element: HTMLElement) {
        // Add nav-bar-item class
        element.classList.add('nav-bar-item');
        
        // Ensure item has an ID
        if (!element.id) {
            element.id = `nav-item-${Math.random().toString(36).substr(2, 9)}`;
        }

        // Set title attribute for accessibility and custom tooltip
        const tooltip = element.getAttribute('tooltip') || element.getAttribute('label') || '';
        if (tooltip) {
            element.setAttribute('title', tooltip);
        } else {
            element.removeAttribute('title');
        }

        // Add click handler
        element.addEventListener('click', () => {
            // Remove active class from all items
            document.querySelectorAll('.nav-bar-item').forEach(item => {
                item.classList.remove('active');
            });
            // Add active class to clicked item
            element.classList.add('active');
            
            // Dispatch custom event
            const event = new CustomEvent('nav-item-clicked', {
                detail: {
                    id: element.id,
                    tooltip: element.getAttribute('tooltip') || element.getAttribute('label') || ''
                },
                bubbles: true,
                composed: true
            });
            this.dispatchEvent(event);
        });
    }

    private getStyles(): string {
        return `
            /* Scoped styles for nav-bar element with class prefixes */
            nav-bar {
                --nav-bg-fallback: #1e1e1e;
                --nav-width-fallback: 60px;
                --nav-item-height-fallback: 50px;
                --nav-item-color-fallback: #ffffff;
                --nav-item-hover-bg-fallback: #333333;
                --nav-item-active-bg-fallback: #404040;
                --nav-item-active-indicator-fallback: #0078d7;
                --nav-transition-duration-fallback: 0.2s;
                --nav-icon-size-fallback: 24px;
                --nav-tooltip-bg-fallback: #23272e;
                --nav-tooltip-color-fallback: #fff;
                --nav-tooltip-shadow-fallback: 0 2px 8px rgba(0,0,0,0.25);
                --nav-tooltip-radius-fallback: 6px;
                --nav-tooltip-padding-fallback: 6px 14px;
                --nav-tooltip-font-size-fallback: 13px;
                
                display: block;
                width: var(--nav-bar-width, var(--nav-width-fallback));
                height: 100%;
                background: var(--nav-bar-bg, var(--nav-bg-fallback));
                transition: none;
                overflow: hidden;
                z-index: var(--nav-bar-z-index, 1000);
            }
            nav-bar .nav-bar-outer {
                display: grid;
                grid-template-rows: auto 1fr auto;
                height: 100%;
            }
            nav-bar .nav-bar-header {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: flex-start;
                padding: 16px 0 8px 0;
            }
            /* Style for header separator if present */
            nav-bar .nav-bar-header-separator {
                width: 60%;
                height: 1px;
                background: var(--nav-bar-item-hover-bg, var(--nav-item-hover-bg-fallback));
                margin: 8px 0;
                border-radius: 1px;
            }
            nav-bar .nav-bar-container {
                display: flex;
                flex-direction: column;
                padding: 8px 0 0 0;
                box-sizing: border-box;
            }
            nav-bar .nav-bar-bottom-container {
                display: flex;
                flex-direction: column;
                justify-content: flex-end;
                padding-bottom: 8px;
                box-sizing: border-box;
            }
            /* Style for nav-items (not nav-groups) */
            nav-bar .nav-bar-item {
                display: flex;
                align-items: center;
                justify-content: center;
                height: var(--nav-bar-item-size, var(--nav-item-height-fallback));
                color: var(--nav-bar-item-color, var(--nav-item-color-fallback));
                cursor: pointer;
                transition: background var(--nav-bar-transition, var(--nav-transition-duration-fallback)) ease;
                position: relative;
                white-space: nowrap;
                overflow: hidden;
            }
            nav-bar .nav-bar-item:hover {
                background: var(--nav-bar-item-hover-bg, var(--nav-item-hover-bg-fallback));
            }
            nav-bar .nav-bar-item.active {
                background: var(--nav-bar-item-active-bg, var(--nav-item-active-bg-fallback));
            }
            nav-bar .nav-bar-item.active::before {
                content: '';
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 3px;
                background: var(--nav-bar-item-active-indicator, var(--nav-item-active-indicator-fallback));
            }
            /* Custom tooltip using ::after, VSCode style */
            nav-bar .nav-bar-item[title]:hover::after {
                content: attr(title);
                position: absolute;
                left: 100%;
                top: 50%;
                transform: translateY(-50%);
                background: var(--nav-bar-tooltip-bg, var(--nav-tooltip-bg-fallback));
                color: var(--nav-bar-tooltip-color, var(--nav-tooltip-color-fallback));
                box-shadow: var(--nav-tooltip-shadow-fallback);
                border-radius: var(--nav-tooltip-radius-fallback);
                padding: var(--nav-tooltip-padding-fallback);
                font-size: var(--nav-tooltip-font-size-fallback);
                pointer-events: none;
                z-index: 9999;
                white-space: nowrap;
                opacity: 0.98;
                margin-left: 8px;
                transition: opacity 0.15s;
                border: 1px solid var(--nav-bar-tooltip-border, transparent);
            }
        `;
    }
}

// Register the custom element
customElements.define('nav-bar', NavBar); 