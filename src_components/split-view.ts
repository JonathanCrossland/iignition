class SplitView extends HTMLElement {
    private _leftWindow: HTMLElement;
    private _rightWindow: HTMLElement;
    private _splitter: HTMLElement;
    private _dragging: boolean = false;
    private readonly SPLITTER_WIDTH = 8;
    private readonly DEFAULT_MIN_WIDTH = 100;
    private _orientation: string;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        // Initialize windows and splitter
        this._leftWindow = this.createWindow('left');
        this._rightWindow = this.createWindow('right');
        this._splitter = this.createSplitter();

        // Set initial orientation
        const initialOrientation = this.getAttribute('orientation') || 'row';
        this.setAttribute('orientation', initialOrientation);

        // Set initial min-width if provided
        const minWidth = this.getAttribute('min-width');
        if (minWidth) {
            this.style.minWidth = minWidth;
        }

        // Append to shadow DOM
        this.shadowRoot!.append(this._leftWindow, this._splitter, this._rightWindow);

        // Styling
        const style = document.createElement('style');
        style.textContent = this.getStyle();
        this.shadowRoot!.appendChild(style);

        // Set initial styles based on orientation
        this.updateOrientation(initialOrientation);

        // Dragging event listeners
        this._splitter.addEventListener('mousedown', this.startDragging.bind(this));
        document.addEventListener('mousemove', this.dragSplitter.bind(this));
        document.addEventListener('mouseup', this.stopDragging.bind(this));
    }

    static get observedAttributes() {
        return ['window-padding', 'orientation'];
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'orientation' && newValue !== oldValue) {
            this.updateOrientation(newValue);
        } else if (name === 'window-padding') {
            this.updatePadding(newValue);
        }
    }

    private getMinWidth(side: 'left' | 'right'): number {
        // Get the slotted element
        const slotted = this.querySelector(`[slot="${side}"]`);
        if (slotted) {
            const minWidth = slotted.getAttribute('min-width');
            if (minWidth) {
                // Remove 'px' and parse as number
                return parseInt(minWidth.replace('px', ''), 10);
            }
        }
        
        // Fall back to default if not set
        return this.DEFAULT_MIN_WIDTH;
    }

    private updateMinWidth(window: HTMLElement, value: string) {
        const minWidth = Math.max(parseInt(value, 10), this.SPLITTER_WIDTH);
        window.style.minWidth = `${minWidth}px`;
    }

    updateOrientation(orientation: string) {
        // Store the orientation without triggering attributeChangedCallback
        this._orientation = orientation;
        
        // Update styles directly
        this.style.flexDirection = orientation === 'row' ? 'row' : 'column';
    
        // Remove any inline styles from the splitter that might interfere
        this._splitter.style.removeProperty('width');
        this._splitter.style.removeProperty('height');
    
        if (orientation === 'column') {
            this._leftWindow.style.height = '100%';
            this._rightWindow.style.height = '100%';
            this._leftWindow.style.width = '100%';
            this._rightWindow.style.width = '100%';
        } else {
            this._leftWindow.style.width = '100%';
            this._rightWindow.style.width = '100%';
            this._leftWindow.style.height = '100%';
            this._rightWindow.style.height = '100%';
        }
    }

    updatePadding(paddingValue: string) {
        const contentAreas = this.shadowRoot!.querySelectorAll('.content');
        contentAreas.forEach(area => {
            (area as HTMLElement).style.padding = paddingValue;
        });
    }

    startVerticalDragging(event: MouseEvent): void {
        this._dragging = true;
        event.preventDefault();
        document.addEventListener('mousemove', this.dragVerticalSplitter.bind(this));
        document.addEventListener('mouseup', this.stopDragging.bind(this));
    }

    dragVerticalSplitter(event: MouseEvent): void {
        if (!this._dragging || this.style.flexDirection !== 'column') return;

        const rect = this.getBoundingClientRect();
        const newTopHeight = event.clientY - rect.top;
        this._leftWindow.style.width = `100%`;
        this._rightWindow.style.width = `100%`;
        this._rightWindow.style.height = `${rect.height - newTopHeight}px`;
        this._leftWindow.style.height = `${newTopHeight}px`;
        this._rightWindow.style.height = `${rect.height - newTopHeight}px`;
    }

    startHorizontalDragging(event: MouseEvent): void {
        this._dragging = true;
        this.classList.add('dragging');
        event.preventDefault();
        document.addEventListener('mousemove', this.dragHorizontalSplitter.bind(this));
        document.addEventListener('mouseup', this.stopDragging.bind(this));
    }

    dragHorizontalSplitter(event: MouseEvent): void {
        if (!this._dragging || this.style.flexDirection !== 'row') return;

        const rect = this.getBoundingClientRect();
        const totalWidth = rect.width;
        const mouseX = event.clientX - rect.left;
        
        const leftMinWidth = this.getMinWidth('left');
        const rightMinWidth = this.getMinWidth('right');

        // Get the current order of panels
        const leftOrder = parseInt(this._leftWindow.style.order);
        const rightOrder = parseInt(this._rightWindow.style.order);
        const isLeftFirst = leftOrder < rightOrder;

        let leftWidth, rightWidth;
        if (isLeftFirst) {
            leftWidth = mouseX;
            rightWidth = totalWidth - mouseX - this.SPLITTER_WIDTH;
        } else {
            rightWidth = mouseX;
            leftWidth = totalWidth - mouseX - this.SPLITTER_WIDTH;
        }

        // Enforce minimum widths
        if (leftWidth < leftMinWidth) {
            leftWidth = leftMinWidth;
            rightWidth = totalWidth - leftWidth - this.SPLITTER_WIDTH;
        }
        if (rightWidth < rightMinWidth) {
            rightWidth = rightMinWidth;
            leftWidth = totalWidth - rightWidth - this.SPLITTER_WIDTH;
        }

        // Only update if both panels meet minimum width requirements
        if (leftWidth >= leftMinWidth && rightWidth >= rightMinWidth) {
            const leftRatio = leftWidth / totalWidth;
            const rightRatio = rightWidth / totalWidth;

            this._leftWindow.style.flexGrow = String(leftRatio);
            this._rightWindow.style.flexGrow = String(rightRatio);
        }
    }

    dragSplitter(event: MouseEvent): void {
        if (!this._dragging) return;
        
        if (this.style.flexDirection === 'row') {
            this.dragHorizontalSplitter(event);
        } else {
            this.dragVerticalSplitter(event);
        }
    }

    startDragging(event: MouseEvent): void {
        this._dragging = true;
        event.preventDefault();
    }

    stopDragging(): void {
        this._dragging = false;
        this.classList.remove('dragging');
        document.removeEventListener('mousemove', this.dragHorizontalSplitter);
        document.removeEventListener('mouseup', this.stopDragging);
    }

    connectedCallback() {
        // Ensure orientation is set when element is connected
        const orientation = this.getAttribute('orientation') || 'row';
        this.updateOrientation(orientation);
        this.assignTitles();
        
        // Check for hidden slots on initialization
        const leftSlot = this.querySelector('[slot="left"]');
        const rightSlot = this.querySelector('[slot="right"]');
        
        if (leftSlot?.hasAttribute('hidden')) {
            this.closePanel('left');
        } else {
            this.showPanel('left');
        }
        
        if (rightSlot?.hasAttribute('hidden')) {
            this.closePanel('right');
        } else {
            this.showPanel('right');
        }

        // Add mutation observer to watch for hidden attribute changes
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'hidden') {
                    const target = mutation.target as HTMLElement;
                    const slot = target.getAttribute('slot');
                    if (slot === 'left' || slot === 'right') {
                        // Only process if the attribute actually changed
                        const isHidden = target.hasAttribute('hidden');
                        const window = slot === 'left' ? this._leftWindow : this._rightWindow;
                        if (isHidden && window.style.display !== 'none') {
                            this.closePanel(slot as 'left' | 'right');
                        } else if (!isHidden && window.style.display === 'none') {
                            this.showPanel(slot as 'left' | 'right');
                        }
                    }
                }
            }
        });

        // Observe both slots for hidden attribute changes
        if (leftSlot) observer.observe(leftSlot, { attributes: true });
        if (rightSlot) observer.observe(rightSlot, { attributes: true });
    }

    private createWindow(slotName: 'left' | 'right'): HTMLElement {
        const windowEl = document.createElement('div');
        windowEl.className = 'window';
        windowEl.id = slotName;
        windowEl.style.order = slotName === 'left' ? '1' : '3';
        windowEl.innerHTML = `
            <div class="header" hidden><span class="title"></span><span class="close">×</span></div>
            <div class="content"><slot name="${slotName}"></slot></div>
        `;

        // Add click handler for header
        const header = windowEl.querySelector('.header')!;
        header.addEventListener('click', () => {
            const leftOrder = this._leftWindow.style.order;
            const rightOrder = this._rightWindow.style.order;
            this._leftWindow.style.order = rightOrder;
            this._rightWindow.style.order = leftOrder;
        });

        // Add click handler for close icon
        const closeIcon = windowEl.querySelector('.close')!;
        closeIcon.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event bubbling
            this.closePanel(slotName);
        });

        // Observe changes to justify-content attribute
        const slot = this.querySelector(`[slot="${slotName}"]`) as HTMLElement;
        if (slot) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'justify-content') {
                        this.updateJustifyContent(slot);
                    }
                });
            });
            observer.observe(slot, { attributes: true });
            
            // Initial update
            this.updateJustifyContent(slot);
        }

        return windowEl;
    }

    createSplitter(): HTMLElement {
        const splitter = document.createElement('div');
        splitter.className = 'splitter';
        splitter.setAttribute('part', 'splitter');
        splitter.style.order = '2'; // Always keep splitter in the middle
        splitter.addEventListener('mousedown', () => this._dragging = true);
        return splitter;
    }

    assignTitles() {
        const leftSlot = this.querySelector('[slot="left"]');
        const rightSlot = this.querySelector('[slot="right"]');

        if (leftSlot) {
            const title = leftSlot.getAttribute('title') || '';
            const header = this._leftWindow.querySelector('.header')!;
            const titleEl = header.querySelector('.title')!;
            
            titleEl.textContent = title;
            if (title) {
                header.removeAttribute('hidden');
            } else {
                header.setAttribute('hidden', '');
            }
        }

        if (rightSlot) {
            const title = rightSlot.getAttribute('title') || '';
            const header = this._rightWindow.querySelector('.header')!;
            const titleEl = header.querySelector('.title')!;
            
            titleEl.textContent = title;
            if (title) {
                header.removeAttribute('hidden');
            } else {
                header.setAttribute('hidden', '');
            }
        }
    }

    getStyle(): string {
        return `
            :host {
                display: flex;
                width: 100%;
                height: fit-content;
                min-height: 100%;
                overflow: hidden;
                background: var(--split-view-bg);
                color: var(--split-view-text);
                z-index:1;
            }

            .window {
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                background: var(--split-view-bg);
                min-width: ${this.DEFAULT_MIN_WIDTH}px;
                min-height: 100%;
            }

            .header {
                padding: 5px 10px;
                background: var(--split-view-bg-light);
                border-bottom: 1px solid var(--split-view-border);
                user-select: none;
                display: flex;
                justify-content: space-between;
                align-items: center;
                opacity: 0;
                transition: opacity 0.2s ease-in-out;
                cursor: pointer;
            }

            .window:hover .header {
                opacity: 1;
            }

            .header[hidden] {
                display: none;
            }

            .content {
                flex: 1;
                overflow: overlay;
                position: relative;
                min-height: 50px;
                display: flex;
                padding: 0;
                margin: 0;
            }

            ::slotted(*) {
                flex: 1;
                min-height: inherit;
                display: flex;
                padding: 0;
                margin: 0;
                width: 100%;
                min-height: 100%;
                height: fit-content;
            }

            ::slotted(*) > div {
                flex: 1;
                display: flex;
                width: 100%;
                height: 100%;
                padding: 0;
                margin: 0;
            }

            /* Hide scrollbars by default */
            .content::-webkit-scrollbar {
               width: 12px;
               height: 10px;
               background: transparent;
            }

            /* Show scrollbars on hover */
            .content:hover::-webkit-scrollbar {
                width: 12px;
                height: 10px;
                transition: background 0.3s ease-in-out;
            }

            .content::-webkit-scrollbar-track {
                 background: rgba(0,0,0,0.01);
              
            }

            .content::-webkit-scrollbar-thumb {
                transition: background 0.3s ease-in-out;
                border-radius: 0;
                background: transparent;
            }

            .content::-webkit-scrollbar-thumb:hover {
                background: var(--split-view-scrollbar-thumb-hover);
            }

            .splitter {
                background: var(--split-view-splitter);
                transition: width 0.2s ease-in-out, height 0.2s ease-in-out, background-color 0.2s ease-in-out;
                position: relative;
                z-index: 10;
            }

            /* Horizontal splitter (for row orientation) */
            :host([orientation="row"]) .splitter {
                width: var(--split-view-splitter-size);
                height: 100%;
                cursor: col-resize !important;
            }

            :host([orientation="row"]) .splitter:hover,
            :host([orientation="row"].dragging) .splitter {
                width: var(--split-view-splitter-hover-size);
                background: var(--split-view-splitter-hover);
            }

            /* Vertical splitter (for column orientation) */
            :host([orientation="column"]) .splitter {
                width: 100%;
                height: var(--split-view-splitter-size);
                cursor: row-resize !important;
            }

            :host([orientation="column"]) .splitter:hover,
            :host([orientation="column"].dragging) .splitter {
                height: var(--split-view-splitter-hover-size);
                background: var(--split-view-splitter-hover);
            }
        `;
    }

    private updateSplitterVisibility() {
        // Hide splitter if either panel is hidden
        if (this._leftWindow.style.display === 'none' || this._rightWindow.style.display === 'none') {
            this._splitter.style.display = 'none';
        } else {
            this._splitter.style.display = 'block';
        }
    }

    private showPanel(side: 'left' | 'right'): void {
        const window = side === 'left' ? this._leftWindow : this._rightWindow;
        const otherWindow = side === 'left' ? this._rightWindow : this._leftWindow;
        
        // Show the window
        window.style.display = 'flex';
        window.style.flex = '1';
        
        // Adjust the other window's flex
        if (otherWindow.style.display !== 'none') {
            otherWindow.style.flex = '1';
        }
        
        this.updateSplitterVisibility();
    }

    private closePanel(side: 'left' | 'right'): void {
        const window = side === 'left' ? this._leftWindow : this._rightWindow;
        const otherWindow = side === 'left' ? this._rightWindow : this._leftWindow;
        
        // Hide the window and show the other window
        window.style.display = 'none';
        otherWindow.style.flex = '1';
        
        this.updateSplitterVisibility();
    }

    private updateJustifyContent(slot: HTMLElement) {
        const justifyContent = slot.getAttribute('justify-content');
        if (justifyContent) {
            // Find the first child div inside the slot and apply the style
            const content = slot.querySelector('div');
            if (content) {
                content.style.display = 'flex';
                content.style.justifyContent = justifyContent;
                content.style.alignItems = 'stretch';
                content.style.width = '100%';
                content.style.height = '100%';
                content.style.margin = '0';
                content.style.padding = '0';
            }
        }
    }
}

// Register the custom element
customElements.define('split-view', SplitView);
