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
    private isProcessing: boolean = false;
    private languageItem: HTMLElement | null = null;
    private availableLanguages = [
        { code: 'en-us', name: 'English (US)', flag: '🇺🇸' },
        { code: 'en-gb', name: 'English (UK)', flag: '🇬🇧' },
        { code: 'es-es', name: 'Español (España)', flag: '🇪🇸' },
        { code: 'fr-fr', name: 'Français (France)', flag: '🇫🇷' },
        { code: 'de-de', name: 'Deutsch (Deutschland)', flag: '🇩🇪' },
        { code: 'it-it', name: 'Italiano (Italia)', flag: '🇮🇹' },
        { code: 'ja-jp', name: '日本語 (日本)', flag: '🇯🇵' },
        { code: 'ko-kr', name: '한국어 (대한민국)', flag: '🇰🇷' },
        { code: 'zh-cn', name: '中文 (简体)', flag: '🇨🇳' },
        { code: 'pt-br', name: 'Português (Brasil)', flag: '🇧🇷' }
    ];
    private currentLanguage = 'en-us';

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

        // Initialize language selection
        this.initializeLanguageSelection();
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
        
        // Restore saved language from localStorage
        const savedLanguage = localStorage.getItem('app-footer-language');
        if (savedLanguage && this.availableLanguages.find(lang => lang.code === savedLanguage)) {
            this.currentLanguage = savedLanguage;
            // Update the language item if it exists
            if (this.languageItem) {
                const lang = this.availableLanguages.find(l => l.code === savedLanguage);
                if (lang) {
                    const flag = this.languageItem.querySelector('.language-flag');
                    const code = this.languageItem.querySelector('.language-code');
                    if (flag) flag.textContent = lang.flag;
                    if (code) code.textContent = lang.code.toUpperCase();
                }
            }
        }
        
        // Process existing footer items
        this.processFooterItems();
        
        // Simple observer for child list changes only
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    this.processFooterItems();
                    break;
                }
            }
        });
        
        observer.observe(this, { 
            childList: true, 
            subtree: false
        });
        
        // Observe attribute changes on footer items using event delegation
        this.addEventListener('DOMAttrModified', this.handleAttributeChange.bind(this));
        
        // For modern browsers, use MutationObserver on footer items specifically
        this.observeFooterItemAttributes();
    }

    private observeFooterItemAttributes() {
        const footerItems = this.querySelectorAll('[footer-item], .app-footer-item');
        
        footerItems.forEach(item => {
            if (item instanceof HTMLElement && !item.hasAttribute('data-observed')) {
                const observer = new MutationObserver((mutations) => {
                    for (const mutation of mutations) {
                        if (mutation.type === 'attributes' && mutation.attributeName === 'type') {
                            this.updateFooterItemType(item as HTMLElement);
                        }
                    }
                });
                
                observer.observe(item, {
                    attributes: true,
                    attributeFilter: ['type']
                });
                
                item.setAttribute('data-observed', 'true');
            }
        });
    }

    private updateFooterItemType(item: HTMLElement) {
        const newType = item.getAttribute('type') || 'info';
        
        // Remove all type classes
        item.classList.remove('app-footer-info', 'app-footer-button', 'app-footer-warning', 'app-footer-error');
        
        // Add the new type class
        item.classList.add(`app-footer-${newType}`);
        
        // Handle button-specific behavior
        if (newType === 'button' && !this.itemHandlers.has(item)) {
            this.makeItemInteractive(item);
        }
    }

    private handleAttributeChange(event: any) {
        // Fallback for older browsers
        if (event.attrName === 'type') {
            this.updateFooterItemType(event.target);
        }
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

    /**
     * Public method to re-process footer items (useful after manual DOM changes)
     */
    public refreshItems(): void {
        this.processFooterItems();
    }

    private processFooterItems() {
        // Process child elements with app-footer-item class or footer-item attribute
        // Collect items from both direct children AND items already in sections
        const directChildren = Array.from(this.querySelectorAll('[footer-item], .app-footer-item'))
            .filter(el => el.parentElement === this);
        
        const sectionItems = Array.from(this.querySelectorAll('[footer-item], .app-footer-item'))
            .filter(el => el.parentElement === this.leftSection || el.parentElement === this.rightSection);
        
        // Combine both sets, avoiding duplicates
        const allItems = [...directChildren, ...sectionItems.filter(item => !directChildren.includes(item))];
        
        // Clear sections only if we have items to process
        if (allItems.length > 0) {
            this.leftSection.innerHTML = '';
            this.rightSection.innerHTML = '';
        }
        
        allItems.forEach(item => {
            if (item instanceof HTMLElement) {
                // Determine position
                const position = item.getAttribute('position') || 'left';
                
                // Add class if not present
                if (!item.classList.contains('app-footer-item')) {
                    item.classList.add('app-footer-item');
                }
                
                // Determine type and only add class if not already present
                const type = item.getAttribute('type') || 'info';
                const typeClass = `app-footer-${type}`;
                if (!item.classList.contains(typeClass)) {
                    // Remove other type classes first
                    item.classList.remove('app-footer-info', 'app-footer-button', 'app-footer-warning', 'app-footer-error');
                    item.classList.add(typeClass);
                }
                
                // Make button items interactive - but only if not already interactive
                if ((type === 'button' || item.getAttribute('role') === 'button') && !this.itemHandlers.has(item)) {
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
        
        // Set up attribute observation for newly processed items
        this.observeFooterItemAttributes();
    }
    
    private makeItemInteractive(item: HTMLElement) {
        // Prevent processing the same item multiple times
        if (this.itemHandlers.has(item)) {
            return;
        }
        
        if (!item.getAttribute('role')) {
            item.setAttribute('role', 'button');
        }
        
        if (!item.getAttribute('tabindex')) {
            item.setAttribute('tabindex', '0');
        }
        
        // Add click handler
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
        
        // Mark as having a click handler (this prevents re-processing)
        this.itemHandlers.set(item, true);
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
            
            /* Language selector specific styles */
            app-footer .language-selector {
                display: flex;
                align-items: center;
                gap: 6px;
                min-width: 60px;
                cursor: pointer;
                user-select: none;
            }
            
            app-footer .language-selector .language-flag {
                font-size: 14px;
                width: auto;
                height: auto;
                margin: 0;
            }
            
            app-footer .language-selector .language-code {
                font-size: 11px;
                font-weight: 500;
                letter-spacing: 0.5px;
                text-transform: uppercase;
            }
            
            app-footer .language-selector:hover {
                background-color: var(--app-footer-hover-bg);
            }
            
            /* Dropdown menu language item styles */
            .dropdown-item .language-flag {
                margin-right: 8px;
                font-size: 16px;
            }
            
            /* Active language item in dropdown */
            .dropdown-item.active {
                background-color: rgba(0, 150, 255, 0.2);
                border-left: 3px solid #0096ff;
                font-weight: 600;
            }
            
            .dropdown-item.active .language-flag {
                opacity: 1;
            }
        `;
    }

    private initializeLanguageSelection() {
        // Just create the language display item in the footer
        // The dropdown will be built dynamically when needed
        this.createLanguageItem();
    }

    private createLanguageItem() {
        const currentLang = this.availableLanguages.find(lang => lang.code === this.currentLanguage);
        if (!currentLang) return;

        this.languageItem = document.createElement('div');
        this.languageItem.className = 'app-footer-item app-footer-button language-selector';
        this.languageItem.setAttribute('position', 'right');
        this.languageItem.setAttribute('type', 'button');
        this.languageItem.setAttribute('role', 'button');
        this.languageItem.setAttribute('tabindex', '0');
        this.languageItem.title = 'Select Language';

        // Add flag and language code
        const icon = document.createElement('span');
        icon.className = 'app-footer-icon language-flag';
        icon.textContent = currentLang.flag;
        this.languageItem.appendChild(icon);

        const text = document.createElement('span');
        text.className = 'app-footer-text language-code';
        text.textContent = currentLang.code.toUpperCase();
        this.languageItem.appendChild(text);

        // Add click handler to build and open dropdown dynamically
        this.languageItem.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            this.openLanguageDropdown();
        });

        // Add keyboard accessibility
        this.languageItem.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.openLanguageDropdown();
            }
        });

        // Add to right section
        this.rightSection.appendChild(this.languageItem);
        this.itemHandlers.set(this.languageItem, true);
    }

    /**
     * Dynamically creates and opens the language dropdown menu
     */
    private openLanguageDropdown() {
        // Check if dropdown already exists and remove it
        const existingDropdown = document.querySelector('dropdown-menu[menu-id="language-menu"]');
        if (existingDropdown) {
            existingDropdown.remove();
        }

        // Create the language dropdown menu dynamically
        const languageDropdown = document.createElement('dropdown-menu');
        languageDropdown.setAttribute('menu-id', 'language-menu');
        languageDropdown.setAttribute('position', 'center');

        // Build language options dynamically
        this.availableLanguages.forEach(lang => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.setAttribute('data-action', 'select-language');
            item.setAttribute('data-language', lang.code);
            
            // Add active state for current language
            if (lang.code === this.currentLanguage) {
                item.classList.add('active');
            }
            
            item.innerHTML = `<span class="language-flag">${lang.flag}</span> ${lang.name}`;
            languageDropdown.appendChild(item);
        });

        // Add to page
        document.body.appendChild(languageDropdown);

        // Listen for language selection (one-time listener)
        const handleLanguageSelect = (e: any) => {
            const { item, attributes } = e.detail;
            if (attributes['data-action'] === 'select-language') {
                const languageCode = attributes['data-language'];
                this.setLanguage(languageCode);
                
                // Remove the dropdown after selection
                setTimeout(() => {
                    if (languageDropdown.parentElement) {
                        languageDropdown.remove();
                    }
                }, 100);
            }
            
            // Remove the event listener
            languageDropdown.removeEventListener('dropdown-menu-item-click', handleLanguageSelect);
        };

        languageDropdown.addEventListener('dropdown-menu-item-click', handleLanguageSelect);

        // Open the dropdown
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('open-menu', {
                detail: { 
                    id: 'language-menu', 
                    trigger: this.languageItem 
                }
            }));
        }, 10);
    }

    /**
     * Sets the current language and updates the display
     * @param languageCode The language code to set (e.g., 'en-us', 'fr-fr')
     */
    public setLanguage(languageCode: string) {
        const lang = this.availableLanguages.find(l => l.code === languageCode);
        if (!lang) return;

        this.currentLanguage = languageCode;
        
        // Update the language item display
        if (this.languageItem) {
            const flag = this.languageItem.querySelector('.language-flag');
            const code = this.languageItem.querySelector('.language-code');
            
            if (flag) flag.textContent = lang.flag;
            if (code) code.textContent = lang.code.toUpperCase();
        }

        // Dispatch language change event
        this.dispatchEvent(new CustomEvent('language-changed', {
            detail: {
                language: languageCode,
                languageName: lang.name,
                previousLanguage: this.currentLanguage
            },
            bubbles: true,
            composed: true
        }));

        // Store in localStorage for persistence
        localStorage.setItem('app-footer-language', languageCode);
    }

    /**
     * Gets the current language code
     */
    public getCurrentLanguage(): string {
        return this.currentLanguage;
    }

    /**
     * Gets the current language object
     */
    public getCurrentLanguageInfo() {
        return this.availableLanguages.find(lang => lang.code === this.currentLanguage);
    }

    /**
     * Adds a new language option to the available languages
     */
    public addLanguage(code: string, name: string, flag: string) {
        if (!this.availableLanguages.find(lang => lang.code === code)) {
            this.availableLanguages.push({ code, name, flag });
            // No need to update dropdown since it's built dynamically
        }
    }

    /**
     * Removes a language option from available languages
     */
    public removeLanguage(code: string) {
        const index = this.availableLanguages.findIndex(lang => lang.code === code);
        if (index > -1) {
            this.availableLanguages.splice(index, 1);
            // If removing current language, default to first available
            if (this.currentLanguage === code && this.availableLanguages.length > 0) {
                this.setLanguage(this.availableLanguages[0].code);
            }
        }
    }
}

// Register the custom element
customElements.define('app-footer', AppFooter); 