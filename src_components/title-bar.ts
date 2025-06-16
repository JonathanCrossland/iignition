class TitleBar extends HTMLElement {
    private leftSection: HTMLElement;
    private centerSection: HTMLElement;
    private rightSection: HTMLElement;
    private dropdown: HTMLElement;
    private dropdownButton: HTMLElement;
    private dropdownArrow: HTMLElement;
    private menuId: string;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = this.getStyles();
        this.shadowRoot!.appendChild(style);

        // Add light DOM styles for dropdown items
        const lightStyles = document.createElement('style');
        lightStyles.textContent = `
            title-bar .dropdown-item {
                padding: 8px 16px;
                cursor: pointer;
                background: var(--titlebar-dropdown-item-bg, transparent);
                color: var(--titlebar-color, var(--titlebar-color-fallback));
                transition: var(--titlebar-transition, all 0.2s ease);
            }

            title-bar .dropdown-item:hover {
                background: var(--titlebar-dropdown-item-hover-bg, rgba(255, 255, 255, 0.1));
            }

            title-bar .dropdown-separator {
                height: 1px;
                background: var(--titlebar-dropdown-border, var(--titlebar-dropdown-border-fallback));
                margin: 6px 0;
            }
        `;
        document.head.appendChild(lightStyles);

        // Create main container
        const container = document.createElement('div');
        container.className = 'titlebar-container';
        this.shadowRoot!.appendChild(container);

        // Create left section (app name)
        this.leftSection = document.createElement('div');
        this.leftSection.className = 'titlebar-left';
        const nameSlot = document.createElement('slot');
        nameSlot.name = 'app-name';
        this.leftSection.appendChild(nameSlot);
        container.appendChild(this.leftSection);

        // Create center section (dropdown)
        this.centerSection = document.createElement('div');
        this.centerSection.className = 'titlebar-center';
        container.appendChild(this.centerSection);

        // Create dropdown
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'titlebar-dropdown';
        this.centerSection.appendChild(this.dropdown);

        // Create dropdown button
        this.dropdownButton = document.createElement('div');
        this.dropdownButton.className = 'titlebar-dropdown-button';
        this.dropdown.appendChild(this.dropdownButton);

        // Create dropdown label
        const dropdownLabel = document.createElement('span');
        dropdownLabel.className = 'titlebar-dropdown-label';
        this.dropdownButton.appendChild(dropdownLabel);

        // Create dropdown arrow
        this.dropdownArrow = document.createElement('span');
        this.dropdownArrow.className = 'titlebar-dropdown-arrow';
        this.dropdownArrow.innerHTML = '▼';
        this.dropdownButton.appendChild(this.dropdownArrow);

        // Determine menu id (use attribute or generate)
        this.menuId = this.getAttribute('menu-id') || ('titlebar-menu-' + Math.random().toString(36).substr(2, 9));
        // If attribute not set, set it for reference
        if (!this.hasAttribute('menu-id')) {
            this.setAttribute('menu-id', this.menuId);
        }

        // Create right section (actions)
        this.rightSection = document.createElement('div');
        this.rightSection.className = 'titlebar-right';
        const actionsSlot = document.createElement('slot');
        actionsSlot.name = 'actions';
        this.rightSection.appendChild(actionsSlot);
        container.appendChild(this.rightSection);

        // Track open state
        let menuOpen = false;

        // Add event listener to trigger menu
        this.dropdownButton.addEventListener('click', (ev) => {
            ev.stopPropagation();
            if (menuOpen) {
                window.dispatchEvent(new CustomEvent('close-menu'));
                this.dropdownButton.classList.remove('active');
                menuOpen = false;
            } else {
                window.dispatchEvent(new CustomEvent('open-menu', {
                    detail: { id: this.menuId, trigger: this.dropdownButton }
                }));
                this.dropdownButton.classList.add('active');
                menuOpen = true;
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (event) => {
            if (!this.contains(event.target as Node)) {
                window.dispatchEvent(new CustomEvent('close-menu'));
                this.dropdownButton.classList.remove('active');
                menuOpen = false;
            }
        });
    }

    static get observedAttributes() {
        return ['title'];
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'title' && oldValue !== newValue) {
            const dropdownLabel = this.shadowRoot!.querySelector('.titlebar-dropdown-label');
            if (dropdownLabel) {
                dropdownLabel.textContent = newValue;
            }
        }
    }

    connectedCallback() {
        // Set dropdown label from title attribute
        const title = this.getAttribute('title');
        if (title) {
            const dropdownLabel = this.shadowRoot!.querySelector('.titlebar-dropdown-label');
            if (dropdownLabel) {
                dropdownLabel.textContent = title;
            }
        }

        // Add title-action class to direct title-action elements
        Array.from(this.children).forEach(child => {
            if (child instanceof HTMLElement && child.slot === 'actions' && child.tagName.toLowerCase() === 'title-action') {
                child.classList.add('title-action');
            }
        });

        // (No internal dropdown items; external component will define menu)
    }

    private getStyles(): string {
        return `
            :host {
                --titlebar-height-fallback: 40px;
                --titlebar-bg-fallback: #1f1f1f;
                --titlebar-border-fallback: #333;
                --titlebar-color-fallback: #fff;
                --titlebar-font-size-fallback: 14px;
                --titlebar-padding-fallback: 0 16px;
                --titlebar-dropdown-bg-fallback: #252525;
                --titlebar-dropdown-hover-bg-fallback: #333;
                --titlebar-dropdown-border-fallback: #444;
                --titlebar-dropdown-shadow-fallback: 0 4px 8px rgba(0, 0, 0, 0.3);
                --titlebar-action-size-fallback: 32px;
                --titlebar-action-spacing-fallback: 8px;
                --titlebar-action-hover-bg-fallback: rgba(255, 255, 255, 0.1);
                --titlebar-transition-fallback: all 0.2s ease;
                --titlebar-dropdown-item-bg-fallback: transparent;
                --titlebar-dropdown-item-hover-bg-fallback: rgba(255, 255, 255, 0.1);
                
                display: flex;
                align-items: center;
                width: 100%;
                max-width: 100%;
                height: var(--titlebar-height, var(--titlebar-height-fallback));
                min-height: var(--titlebar-height, var(--titlebar-height-fallback));
                max-height: var(--titlebar-height, var(--titlebar-height-fallback));
                background: var(--titlebar-bg, var(--titlebar-bg-fallback));
                border-bottom: 1px solid var(--titlebar-border, var(--titlebar-border-fallback));
                color: var(--titlebar-color, var(--titlebar-color-fallback));
                font-size: var(--titlebar-font-size, var(--titlebar-font-size-fallback));
                box-sizing: border-box !important;
                user-select: none;
                z-index: 100;
                overflow: visible;
                flex-shrink: 0;
                contain: none;
            }
            
            .titlebar-container {
                display: flex;
                align-items: center;
                justify-content: space-between;
                height: 100%;
                width: 100%;
                max-width: 100%;
                box-sizing: border-box !important;
                padding: var(--titlebar-padding, var(--titlebar-padding-fallback));
                overflow: visible;
            }
            
            .titlebar-left {
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 500;
                flex: 0 0 auto;
                min-width: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                margin-right: 8px;
                height: 100%;
            }
            
            .titlebar-center {
                display: flex;
                align-items: center;
                justify-content: center;
                flex: 1 1 auto;
                min-width: 0;
                max-width: 50%;
                overflow: visible;
                height: 100%;
                position: relative;
            }
            
            .titlebar-right {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                gap: var(--titlebar-action-spacing, var(--titlebar-action-spacing-fallback));
                flex: 0 0 auto;
                min-width: 0;
                margin-left: 8px;
                height: 100%;
            }
            
            .titlebar-dropdown {
                position: relative;
                display: inline-flex;
                align-items: center;
                max-width: 100%;
                height: 100%;
            }
            
            .titlebar-dropdown-button {
                display: flex;
                align-items: center;
                gap: 6px;
                cursor: pointer;
                padding: 5px 10px;
                border-radius: 4px;
                transition: var(--titlebar-transition, var(--titlebar-transition-fallback));
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 100%;
                box-sizing: border-box;
                height: calc(var(--titlebar-action-size, var(--titlebar-action-size-fallback)) + 8px);
            }
            
            .titlebar-dropdown-button:hover {
                background: var(--titlebar-dropdown-hover-bg, var(--titlebar-dropdown-hover-bg-fallback));
            }
            
            .titlebar-dropdown-button.active {
                background: var(--titlebar-dropdown-hover-bg, var(--titlebar-dropdown-hover-bg-fallback));
            }
            
            .titlebar-dropdown-label {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                flex: 1;
                min-width: 0;
                max-width: 100%;
            }
            
            .titlebar-dropdown-arrow {
                font-size: 10px;
                transition: var(--titlebar-transition, var(--titlebar-transition-fallback));
                flex: 0 0 auto;
            }
            
            .titlebar-dropdown-button.active .titlebar-dropdown-arrow {
                transform: rotate(180deg);
            }
            
            /* Style for title-action elements */
            ::slotted([slot="actions"]) {
                display: flex;
                align-items: center;
                justify-content: center;
                height: var(--titlebar-action-size, var(--titlebar-action-size-fallback));
                min-width: var(--titlebar-action-size, var(--titlebar-action-size-fallback));
                padding: 0 6px;
                cursor: pointer;
                border-radius: 4px;
                transition: var(--titlebar-transition, var(--titlebar-transition-fallback));
                overflow: hidden;
                box-sizing: border-box;
                margin: auto 0;
            }
            
            ::slotted([slot="actions"]:hover) {
                background: var(--titlebar-action-hover-bg, var(--titlebar-action-hover-bg-fallback));
            }

            /* Ensure app name slot content doesn't break layout */
            ::slotted([slot="app-name"]) {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                max-width: 100%;
                box-sizing: border-box;
                display: flex;
                align-items: center;
                height: 100%;
            }
            
            /* Style for proper containment */
            ::slotted(*) {
                box-sizing: border-box;
                max-width: 100%;
            }
        `;
    }
}

customElements.define('title-bar', TitleBar); 