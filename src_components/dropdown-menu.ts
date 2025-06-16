class DropdownMenu extends HTMLElement {
    private menuId: string | null = null;
    private position: 'left' | 'center' | 'right' = 'left';
    private handleOpenMenu: (e: Event) => void;
    private handleCloseMenu: (e: Event) => void;
    private handleDocumentClick: (e: MouseEvent) => void;
    private container: HTMLElement;
    private itemClickHandler: (e: Event) => void;
    private contentWrapper: HTMLElement;
    private currentTrigger: HTMLElement | null = null;

    constructor() {
        super();
        
        // Create container that will be moved to body
        this.container = document.createElement('div');
        this.container.className = 'dropdown-wrapper';
        
        // Create content wrapper to hold the slot
        this.contentWrapper = document.createElement('div');
        this.contentWrapper.className = 'dropdown-menu-content';
        this.container.appendChild(this.contentWrapper);
        
        // Add styles to container
        const style = document.createElement('style');
        style.textContent = this.getStyles();
        this.container.appendChild(style);

        this.handleOpenMenu = this.onOpenMenu.bind(this);
        this.handleCloseMenu = this.onCloseMenu.bind(this);
        this.handleDocumentClick = this.onDocumentClick.bind(this);
        this.itemClickHandler = this.onItemClick.bind(this);

        // Hide container initially
        this.container.style.display = 'none';
    }

    static get observedAttributes() {
        return ['menu-id', 'position'];
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'menu-id') {
            this.menuId = newValue;
        } else if (name === 'position' && ['left', 'center', 'right'].includes(newValue)) {
            this.position = newValue as 'left' | 'center' | 'right';
            if (this.style.display !== 'none') {
                // Reposition if already visible
                this.show();
            }
        }
    }

    connectedCallback() {
        this.menuId = this.getAttribute('menu-id');
        const position = this.getAttribute('position');
        if (position && ['left', 'center', 'right'].includes(position)) {
            this.position = position as 'left' | 'center' | 'right';
        }

        // Add event listeners
        window.addEventListener('open-menu', this.handleOpenMenu);
        window.addEventListener('close-menu', this.handleCloseMenu);
        
        // Move container to body and transfer content
        document.body.appendChild(this.container);
        this.transferContent();
        
        // Add click listeners to items
        this.addItemClickListeners();
    }

    disconnectedCallback() {
        window.removeEventListener('open-menu', this.handleOpenMenu);
        window.removeEventListener('close-menu', this.handleCloseMenu);
        this.removeDocumentClick();
        this.removeItemClickListeners();
        
        // Remove container from body
        if (this.container.parentElement) {
            this.container.parentElement.removeChild(this.container);
        }
    }

    private transferContent() {
        // Move all child nodes to the content wrapper
        while (this.firstChild) {
            const child = this.firstChild;
            if (child instanceof HTMLElement) {
                // Clone the element to maintain original styling
                const clone = child.cloneNode(true) as HTMLElement;
                if (child.classList.contains('dropdown-item')) {
                    clone.addEventListener('click', this.itemClickHandler);
                }
                this.contentWrapper.appendChild(clone);
            }
            this.removeChild(child);
        }
    }

    private addItemClickListeners() {
        const items = this.contentWrapper.querySelectorAll('.dropdown-item');
        items.forEach(item => {
            item.addEventListener('click', this.itemClickHandler);
        });
    }

    private removeItemClickListeners() {
        const items = this.contentWrapper.querySelectorAll('.dropdown-item');
        items.forEach(item => {
            item.removeEventListener('click', this.itemClickHandler);
        });
    }

    private onOpenMenu(e: Event) {
        const detail = (e as CustomEvent).detail;
        if (detail && detail.id === this.menuId) {
            const triggerEl = detail.trigger as HTMLElement | undefined;
            if (triggerEl) {
                this.currentTrigger = triggerEl;
                this.show(triggerEl);
            }
        } else {
            this.hide();
        }
    }

    private onCloseMenu() {
        this.hide();
    }

    private onDocumentClick(e: MouseEvent) {
        // Check if click is outside both the menu and the trigger
        const detail = (e as any).detail;
        const trigger = detail?.trigger as HTMLElement | undefined;
        
        if (!this.container.contains(e.target as Node) && 
            (!trigger || !trigger.contains(e.target as Node))) {
            this.hide();
        }
    }

    private show(triggerEl?: HTMLElement) {
        if (!triggerEl) return;

        // Make the menu visible but hidden for measurements
        this.container.style.display = 'block';
        this.container.style.visibility = 'hidden';

        const triggerRect = triggerEl.getBoundingClientRect();
        const menuRect = this.container.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        // Calculate vertical position
        const spaceBelow = viewportHeight - triggerRect.bottom;
        const spaceAbove = triggerRect.top;
        const showBelow = spaceBelow >= menuRect.height || spaceBelow >= spaceAbove;

        // Get horizontal position based on alignment
        let left = triggerRect.left;
        let transform = '';

        switch (this.position) {
            case 'center': {
                left = triggerRect.left + (triggerRect.width / 2);
                transform = 'translateX(-50%)';
                break;
            }
            case 'right': {
                left = triggerRect.right;
                transform = 'translateX(-100%)';
                break;
            }
        }

        // Apply initial position
        this.container.style.position = 'fixed';
        this.container.style.left = `${left}px`;
        this.container.style.transform = transform;

        // Ensure menu stays within viewport
        const adjustedRect = this.container.getBoundingClientRect();
        
        if (adjustedRect.right > viewportWidth) {
            const overflow = adjustedRect.right - viewportWidth;
            left -= overflow;
            this.container.style.left = `${left}px`;
        }
        
        if (adjustedRect.left < 0) {
            left -= adjustedRect.left;
            this.container.style.left = `${left}px`;
        }

        // Set vertical position
        if (showBelow) {
            this.container.style.top = `${triggerRect.bottom}px`;
            this.container.style.bottom = 'auto';
        } else {
            this.container.style.bottom = `${viewportHeight - triggerRect.top}px`;
            this.container.style.top = 'auto';
        }

        // Make visible
        this.container.style.visibility = 'visible';

        // Add click handler with delay to prevent immediate closing
        setTimeout(() => {
            document.addEventListener('mousedown', this.handleDocumentClick);
        }, 0);
    }

    private hide() {
        this.container.style.display = 'none';
        this.removeDocumentClick();
        this.currentTrigger = null;
    }

    private removeDocumentClick() {
        document.removeEventListener('mousedown', this.handleDocumentClick);
    }

    private onItemClick(e: Event) {
        const item = e.currentTarget as HTMLElement;
        this.dispatchEvent(new CustomEvent('dropdown-menu-item-click', {
            detail: {
                item,
                menu: this,
                trigger: this.currentTrigger,
                attributes: Array.from(item.attributes).reduce((acc, attr) => {
                    acc[attr.name] = attr.value;
                    return acc;
                }, {} as Record<string, string>)
            },
            bubbles: true,
            composed: true
        }));
        this.hide();
    }

    private getStyles(): string {
        return `
            .dropdown-wrapper {
                position: fixed;
                z-index: 99999;
                min-width: 180px;
                max-width: 90vw;
                max-height: 80vh;
                background: var(--dropdown-menu-bg, #252525);
                color: var(--dropdown-menu-color, #fff);
                border: 1px solid var(--dropdown-menu-border, #444);
                border-radius: 4px;
                box-shadow: var(--dropdown-menu-shadow, 0 4px 8px rgba(0,0,0,0.3));
                box-sizing: border-box;
                overflow-y: auto;
                pointer-events: all;
            }

            .dropdown-menu-content {
                display: flex;
                flex-direction: column;
                width: 100%;
                box-sizing: border-box;
            }

            .dropdown-item {
                padding: 8px 16px;
                cursor: pointer;
                background: var(--dropdown-menu-item-bg, transparent);
                color: inherit;
                transition: all 0.2s ease;
                user-select: none;
            }

            .dropdown-item:hover {
                background: var(--dropdown-menu-item-hover-bg, rgba(255,255,255,0.1));
            }

            .dropdown-separator {
                height: 1px;
                background: var(--dropdown-menu-separator-color, var(--dropdown-menu-border, #444));
                margin: 4px 0;
                pointer-events: none;
            }
        `;
    }
}

customElements.define('dropdown-menu', DropdownMenu); 