/**
 * App Footer Component
 * A customizable footer bar resembling VS Code's status bar
 * with support for status items, buttons, and indicators.
 */
class AppFooter extends HTMLElement {
    private container: HTMLElement;
    private leftSection: HTMLElement;
    private rightSection: HTMLElement;
    private styleElement: HTMLStyleElement;
    private itemHandlers: WeakMap<HTMLElement, boolean> = new WeakMap();

    constructor() {
        super();
        
        // Create scoped styles instead of using Shadow DOM
        this.styleElement = document.createElement('style');
        this.styleElement.textContent = this.getStyles();
        this.appendChild(this.styleElement);

        // Create main container
        this.container = document.createElement('div');
        this.container.className = 'app-footer-container';
        this.appendChild(this.container);

        // Create left section (primary/default side)
        this.leftSection = document.createElement('div');
        this.leftSection.className = 'app-footer-section app-footer-left';
        this.container.appendChild(this.leftSection);

        // Create right section (secondary side)
        this.rightSection = document.createElement('div');
        this.rightSection.className = 'app-footer-section app-footer-right';
        this.container.appendChild(this.rightSection);
    }

    static get observedAttributes() {
        return ['theme'];
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'theme' && oldValue !== newValue) {
            this.classList.remove('light', 'dark');
            if (newValue) {
                this.classList.add(newValue);
            }
        }
    }

    connectedCallback() {
        // Add a class to indicate the element has been connected and styles loaded from CSS
        requestAnimationFrame(() => {
            this.classList.add('styled');
        });
        
        // Process existing footer items
        this.processFooterItems();
        
        // Add mutation observer to handle dynamically added items
        const observer = new MutationObserver((mutations) => {
            let needsProcessing = false;
            
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    needsProcessing = true;
                    break;
                }
            }
            
            if (needsProcessing) {
                this.processFooterItems();
            }
        });
        
        observer.observe(this, { childList: true, subtree: false });
    }

    /**
     * Creates a new footer item and adds it to the footer
     * @param text Text content for the item
     * @param icon Optional icon class or HTML for the item
     * @param position Position of the item ('left' or 'right')
     * @param type Type of item ('button', 'info', 'warning', 'error')
     * @returns The created footer item element
     */
    public addItem(text: string, icon?: string, position: 'left' | 'right' = 'left', type: 'button' | 'info' | 'warning' | 'error' = 'info'): HTMLElement {
        const item = document.createElement('div');
        item.className = `app-footer-item app-footer-${type}`;
        item.setAttribute('position', position);
        
        if (icon) {
            // Check if icon is HTML or just a class name
            if (icon.includes('<') && icon.includes('>')) {
                // It's HTML
                const iconContainer = document.createElement('span');
                iconContainer.className = 'app-footer-icon';
                iconContainer.innerHTML = icon;
                item.appendChild(iconContainer);
            } else {
                // It's a class name, create an icon element
                const iconElement = document.createElement('span');
                iconElement.className = `app-footer-icon ${icon}`;
                item.appendChild(iconElement);
            }
        }
        
        const textElement = document.createElement('span');
        textElement.className = 'app-footer-text';
        textElement.textContent = text;
        item.appendChild(textElement);
        
        // Add the item to the appropriate section
        if (position === 'right') {
            this.rightSection.appendChild(item);
        } else {
            this.leftSection.appendChild(item);
        }
        
        // Make button items clickable
        if (type === 'button') {
            item.setAttribute('role', 'button');
            item.setAttribute('tabindex', '0');
            
            item.addEventListener('click', (e) => {
                this.dispatchEvent(new CustomEvent('app-footer-item-click', {
                    detail: {
                        text: text,
                        element: item
                    },
                    bubbles: true,
                    composed: true
                }));
            });
            
            // Add keyboard accessibility
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    item.click();
                }
            });
        }
        
        return item;
    }

    /**
     * Updates an existing footer item's text and/or icon
     */
    public updateItem(item: HTMLElement, text?: string, icon?: string): void {
        if (!item.classList.contains('app-footer-item')) {
            console.warn('Element is not a valid footer item');
            return;
        }
        
        if (text !== undefined) {
            const textElement = item.querySelector('.app-footer-text');
            if (textElement) {
                textElement.textContent = text;
            }
        }
        
        if (icon !== undefined) {
            let iconElement = item.querySelector('.app-footer-icon');
            
            // Remove existing icon if there is one
            if (iconElement) {
                iconElement.remove();
            }
            
            // Add new icon if provided
            if (icon) {
                // Create new icon element
                iconElement = document.createElement('span');
                iconElement.className = 'app-footer-icon';
                
                if (icon.includes('<') && icon.includes('>')) {
                    // It's HTML
                    iconElement.innerHTML = icon;
                } else {
                    // It's a class name
                    iconElement.classList.add(icon);
                }
                
                // Insert at beginning of item
                if (item.firstChild) {
                    item.insertBefore(iconElement, item.firstChild);
                } else {
                    item.appendChild(iconElement);
                }
            }
        }
    }

    private processFooterItems() {
        // Clear sections first
        this.leftSection.innerHTML = '';
        this.rightSection.innerHTML = '';
        
        // Process child elements with app-footer-item class or footer-item attribute
        const items = Array.from(this.querySelectorAll('[footer-item], .app-footer-item'))
            .filter(el => el.parentElement === this); // Only direct children
        
        items.forEach(item => {
            if (item instanceof HTMLElement) {
                // Skip if already processed and in the correct container
                if (item.parentElement === this.leftSection || item.parentElement === this.rightSection) {
                    return;
                }
                
                // Determine position
                const position = item.getAttribute('position') || 'left';
                
                // Add class if not present
                if (!item.classList.contains('app-footer-item')) {
                    item.classList.add('app-footer-item');
                }
                
                // Determine type
                const type = item.getAttribute('type') || 'info';
                item.classList.add(`app-footer-${type}`);
                
                // Make button items interactive
                if (type === 'button' || item.getAttribute('role') === 'button') {
                    this.makeItemInteractive(item);
                }
                
                // Move to the appropriate section
                if (position === 'right') {
                    this.rightSection.appendChild(item);
                } else {
                    this.leftSection.appendChild(item);
                }
            }
        });
    }
    
    private makeItemInteractive(item: HTMLElement) {
        if (!item.getAttribute('role')) {
            item.setAttribute('role', 'button');
        }
        
        if (!item.getAttribute('tabindex')) {
            item.setAttribute('tabindex', '0');
        }
        
        // Add click handler if not already present
        if (!this.itemHandlers.has(item)) {
            item.addEventListener('click', (e) => {
                this.dispatchEvent(new CustomEvent('app-footer-item-click', {
                    detail: {
                        text: item.textContent?.trim() || '',
                        element: item
                    },
                    bubbles: true,
                    composed: true
                }));
            });
            
            // Add keyboard accessibility
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    item.click();
                }
            });
            
            // Mark as having a click handler
            this.itemHandlers.set(item, true);
        }
    }

    private getStyles(): string {
        return `
            /* Scoped styles for app-footer */
            app-footer:not([style*='--app-footer-height']):not(.styled) {
                --app-footer-height: 22px;
                --app-footer-bg: #007acc;
                --app-footer-color: #ffffff;
                --app-footer-hover-bg: rgba(255, 255, 255, 0.12);
                --app-footer-active-bg: rgba(255, 255, 255, 0.18);
                --app-footer-item-padding: 0 8px;
                --app-footer-icon-margin: 0 5px 0 0;
                --app-footer-icon-size: 14px;
                --app-footer-font-size: 12px;
                --app-footer-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                --app-footer-border-top: none;
                --app-footer-info-bg: transparent;
                --app-footer-button-bg: transparent;
                --app-footer-warning-bg: #f3bc36;
                --app-footer-error-bg: #e51400;
                --app-footer-warning-color: #000000;
                --app-footer-error-color: #ffffff;
            }
            
            app-footer {
                display: block;
                height: var(--app-footer-height);
                background-color: var(--app-footer-bg);
                color: var(--app-footer-color);
                font-family: var(--app-footer-font-family);
                font-size: var(--app-footer-font-size);
                border-top: var(--app-footer-border-top);
                user-select: none;
                overflow: hidden;
            }
            
            app-footer.light {
                --app-footer-bg: #f3f3f3;
                --app-footer-color: #333333;
                --app-footer-hover-bg: rgba(0, 0, 0, 0.08);
                --app-footer-active-bg: rgba(0, 0, 0, 0.12);
                --app-footer-border-top: 1px solid #dddddd;
                --app-footer-warning-bg: #f9cc9d;
                --app-footer-error-bg: #f48771;
                --app-footer-warning-color: #5d5d5d;
                --app-footer-error-color: #ffffff;
            }
            
            app-footer .app-footer-container {
                display: flex;
                justify-content: space-between;
                width: 100%;
                height: 100%;
                overflow: hidden;
            }
            
            app-footer .app-footer-section {
                display: flex;
                align-items: center;
                height: 100%;
                overflow: hidden;
            }
            
            app-footer .app-footer-left {
                flex: 1;
                justify-content: flex-start;
            }
            
            app-footer .app-footer-right {
                justify-content: flex-end;
            }
            
            app-footer .app-footer-item {
                display: flex;
                align-items: center;
                height: 100%;
                padding: var(--app-footer-item-padding);
                white-space: nowrap;
                cursor: default;
            }
            
            app-footer .app-footer-item[role="button"] {
                cursor: pointer;
            }
            
            app-footer .app-footer-item[role="button"]:hover {
                background-color: var(--app-footer-hover-bg);
            }
            
            app-footer .app-footer-item[role="button"]:active {
                background-color: var(--app-footer-active-bg);
            }
            
            app-footer .app-footer-icon {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                margin: var(--app-footer-icon-margin);
                width: var(--app-footer-icon-size);
                height: var(--app-footer-icon-size);
            }
            
            app-footer .app-footer-text {
                line-height: var(--app-footer-height);
            }
            
            app-footer .app-footer-info {
                background-color: var(--app-footer-info-bg);
            }
            
            app-footer .app-footer-button {
                background-color: var(--app-footer-button-bg);
            }
            
            app-footer .app-footer-warning {
                background-color: var(--app-footer-warning-bg);
                color: var(--app-footer-warning-color);
            }
            
            app-footer .app-footer-error {
                background-color: var(--app-footer-error-bg);
                color: var(--app-footer-error-color);
            }
        `;
    }
}

// Register the custom element
customElements.define('app-footer', AppFooter); 