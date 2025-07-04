class DockableView extends HTMLElement {
    private draggingWindow: HTMLElement | null = null;
    private dragGhost: HTMLElement | null = null;
    private dragOffset: { x: number, y: number } = { x: 0, y: 0 };
    private dockPreview: HTMLElement | null = null;
    private container: HTMLElement;
    private resizingSplitter: HTMLElement | null = null;
    private resizeStartX: number = 0;
    private adjacentWindows: { left: HTMLElement | null; right: HTMLElement | null } = { left: null, right: null };
    private readonly DOCK_PREVIEW_COLOR = 'rgba(0, 150, 255, 0.2)';
    private readonly DOCK_PREVIEW_BORDER = '2px dashed #0096ff';
    private readonly STACK_HIGHLIGHT_COLOR = 'rgba(0, 150, 255, 0.2)';
    private readonly STACK_HIGHLIGHT_BORDER = '2px dashed #0096ff';
    private dragStartState: {
        nextSibling: Element | null;
        width: string;
        height: string;
        position: string;
        left: string;
        top: string;
        flex: string;
    } | null = null;
    private stackedWindows: Map<string, HTMLElement[]> = new Map();
    private activeStackedWindow: HTMLElement | null = null;
    private locked: boolean = false;
    private allowStacking: boolean = true;
    private dropZone: HTMLElement | null = null;
    private draggedWindow: HTMLElement | null = null;
    private dropTarget: HTMLElement | null = null;
    private dropSide: 'left' | 'right' | 'over' | null = null;
    private dragPreview: HTMLElement | null = null;
    private isResizing: boolean = false;

    constructor() {
        super();
        // No shadow DOM - render directly in light DOM
        
        // Add scoped styles
        const style = document.createElement('style');
        style.textContent = this.getStyles();
        this.appendChild(style);

        // Create main container in light DOM
        this.container = document.createElement('div');
        this.container.className = 'dockable-view-container';
        this.appendChild(this.container);

        // Create dock preview element in light DOM
        this.dockPreview = document.createElement('div');
        this.dockPreview.className = 'dockable-view-preview';
        this.dockPreview.style.display = 'none';
        this.appendChild(this.dockPreview);

        // Add resize event listeners
        document.addEventListener('mousemove', this.handleResize.bind(this));
        document.addEventListener('mouseup', this.endResize.bind(this));
        
        // Add touch resize event listeners
        document.addEventListener('touchmove', this.handleResize.bind(this), { passive: false });
        document.addEventListener('touchend', this.endResize.bind(this));
    }

    static get observedAttributes() {
        return ['locked', 'allow-stacking', 'title'];
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'locked') {
            this.locked = newValue !== null && newValue !== 'false' && newValue !== '0';
            this.updateLockedState();
        } else if (name === 'allow-stacking') {
            this.allowStacking = !(newValue === 'false' || newValue === '0');
        } else if (name === 'title') {
            // Update title in window header and stack tabs if this is a window
            const header = this.querySelector('.dockable-view-window-header');
            if (header) {
                // Update title in header
                const titleElement = header.querySelector('.dockable-view-window-title');
                if (titleElement) {
                    titleElement.textContent = newValue;
                }
                
                // Update title in stack tabs if they exist
                const stackTabs = header.querySelector('.dockable-view-stack-tabs');
                if (stackTabs) {
                    // Update both the window title and stack tab if they exist
                    const windowTitle = stackTabs.querySelector('.dockable-view-window-title');
                    if (windowTitle) {
                        windowTitle.textContent = newValue;
                    }
                    
                    const stackTab = stackTabs.querySelector('.dockable-view-stack-tab');
                    if (stackTab) {
                        stackTab.textContent = newValue;
                    }
                }
            }
            
            // If this window is stacked, also update its tab in the parent window
            if (this.hasAttribute('stacked')) {
                const parentId = this.getAttribute('stacked');
                const parentWindow = this.parentElement?.querySelector(`#${parentId}`);
                if (parentWindow) {
                    const parentTabs = parentWindow.querySelector('.dockable-view-stack-tabs');
                    if (parentTabs) {
                        const tabs = parentTabs.querySelectorAll('.dockable-view-stack-tab');
                        tabs.forEach(tab => {
                            if (tab.textContent === oldValue) {
                                tab.textContent = newValue;
                            }
                        });
                    }
                }
            }
        }
    }

    private updateLockedState() {
        if (this.locked) {
            // Add locked class to container
            this.classList.add('locked');
            
            // Apply locked styles to all windows
            const windows = Array.from(this.container.querySelectorAll('.dockable-view-window')) as HTMLElement[];
            windows.forEach(window => {
                window.classList.add('locked');
                
                // Remove draggable functionality from headers
                const header = window.querySelector('.dockable-view-window-header') as HTMLElement;
                if (header) {
                    header.style.cursor = 'default';
                }
            });
            
            // Do NOT disable splitters anymore
        } else {
            // Remove locked class from container
            this.classList.remove('locked');
            
            // Remove locked styles from all windows
            const windows = Array.from(this.container.querySelectorAll('.dockable-view-window')) as HTMLElement[];
            windows.forEach(window => {
                window.classList.remove('locked');
                
                // Restore draggable functionality to headers
                const header = window.querySelector('.dockable-view-window-header') as HTMLElement;
                if (header) {
                    header.style.cursor = 'move';
                }
            });
        }
    }

    connectedCallback() {
        // Check if locked attribute is set
        this.locked = this.hasAttribute('locked') && 
                     this.getAttribute('locked') !== 'false' && 
                     this.getAttribute('locked') !== '0';
        
        // MutationObserver to watch for title changes on child windows
        const observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'title') {
                    const target = mutation.target as HTMLElement;
                    if (target.classList.contains('dockable-view-window')) {
                        // Update header and stack tabs for this window
                        const newValue = target.getAttribute('title') || '';
                        const header = target.querySelector('.dockable-view-window-header');
                        if (header) {
                            // Update title in header
                            const titleElement = header.querySelector('.dockable-view-window-title');
                            if (titleElement) {
                                titleElement.textContent = newValue;
                            }
                            // Update title in stack tabs if they exist
                            const stackTabs = header.querySelector('.dockable-view-stack-tabs');
                            if (stackTabs) {
                                // Update both the window title and stack tab if they exist
                                const windowTitle = stackTabs.querySelector('.dockable-view-window-title');
                                if (windowTitle) {
                                    windowTitle.textContent = newValue;
                                }
                                const stackTab = stackTabs.querySelector('.dockable-view-stack-tab');
                                if (stackTab) {
                                    stackTab.textContent = newValue;
                                }
                            }
                        }
                        // If this window is stacked, also update its tab in the parent window
                        if (target.hasAttribute('stacked')) {
                            const parentId = target.getAttribute('stacked');
                            const parentWindow = this.container.querySelector(`#${parentId}`);
                            if (parentWindow) {
                                const parentTabs = parentWindow.querySelector('.dockable-view-stack-tabs');
                                if (parentTabs) {
                                    const tabs = parentTabs.querySelectorAll('.dockable-view-stack-tab');
                                    tabs.forEach(tab => {
                                        if (tab.textContent === mutation.oldValue) {
                                            tab.textContent = newValue;
                                        }
                                    });
                                }
                            }
                        }
                        // Save state after title changes
                        this.saveState();
                    }
                }
            }
        });
        observer.observe(this.container, {
            subtree: true,
            attributes: true,
            attributeFilter: ['title'],
            attributeOldValue: true
        });
        
        // Move all direct children to the container (still in light DOM)
        const children = Array.from(this.children).filter(child => 
            child instanceof HTMLElement && 
            !child.classList.contains('dockable-view-container') && 
            !child.classList.contains('dockable-view-preview') &&
            !(child instanceof HTMLStyleElement)
        ) as HTMLElement[];
        
        // First pass: identify stacked windows and their parents
        const stackedWindows = new Map<string, HTMLElement[]>();
        
        children.forEach(child => {
            const stackedId = child.getAttribute('stacked');
            if (stackedId) {
                if (!stackedWindows.has(stackedId)) {
                    stackedWindows.set(stackedId, []);
                }
                stackedWindows.get(stackedId)!.push(child);
            }
        });
        
        // Second pass: process windows in order (parents first, then stacked)
        children.forEach((child, index) => {
            if (!child.id) {
                child.id = `dock-window-${index + 1}`;
            }
            
            // Skip stacked windows for now
            if (child.hasAttribute('stacked')) {
                return;
            }
            
            this.makeDockable(child);
            
            // Add to container
            this.container.appendChild(child);
            
            // If this window has stacked children, process them
            const stackedChildren = stackedWindows.get(child.id);
            if (stackedChildren) {
                stackedChildren.forEach(stackedChild => {
                    this.makeDockable(stackedChild);
                    // Add to container before stacking
                    this.container.appendChild(stackedChild);
                });
            }
        });
        
        // Get non-stacked windows for width calculation
        const nonStackedWindows = children.filter(child => !child.hasAttribute('stacked'));
        
        // Calculate container width in pixels (for pixel-based width conversion)
        const containerWidth = this.container.offsetWidth;
        
        // First pass: collect width information and categorize windows
        const windowWidths = new Map<HTMLElement, { 
            value: number, 
            unit: 'px' | '%', 
            isExplicit: boolean,
            type: 'none' | 'fixed' | 'percent'
        }>();
        
        let totalPercentage = 0;
        let totalFixedPixels = 0;
        let windowsWithoutWidth: HTMLElement[] = [];
        let windowsWithPercentWidth: HTMLElement[] = [];
        let allWindows: HTMLElement[] = [];
        
        nonStackedWindows.forEach(child => {
            const width = child.getAttribute('width');
            const minWidth = parseInt(child.getAttribute('min-width') || '200');
            
            allWindows.push(child);
            
            if (width) {
                // Check if it's a percentage or pixel value
                if (width.endsWith('%')) {
                    const percentage = parseFloat(width);
                    windowWidths.set(child, { 
                        value: percentage, 
                        unit: '%', 
                        isExplicit: true,
                        type: 'percent'
                    });
                    totalPercentage += percentage;
                    windowsWithPercentWidth.push(child);
                } else {
                    // Convert to pixels
                    let pixels = parseFloat(width);
                    if (width.endsWith('px')) {
                        pixels = parseFloat(width.slice(0, -2));
                    }
                    windowWidths.set(child, { 
                        value: pixels, 
                        unit: 'px', 
                        isExplicit: true,
                        type: 'fixed'
                    });
                    totalFixedPixels += pixels;
                }
            } else {
                // Windows without explicit width
                windowWidths.set(child, { 
                    value: 0, 
                    unit: '%', 
                    isExplicit: false,
                    type: 'none'
                });
                windowsWithoutWidth.push(child);
            }
        });
        
        // Convert fixed pixels to percentage
        const fixedPixelsAsPercentage = (totalFixedPixels / containerWidth) * 100;
        const totalInitialPercentage = totalPercentage + fixedPixelsAsPercentage;
        
        // Distribute remaining space to windows without explicit width
        if (windowsWithoutWidth.length > 0) {
            const remainingPercentage = Math.max(0, 100 - totalInitialPercentage);
            const percentPerWindow = remainingPercentage / windowsWithoutWidth.length;
            
            windowsWithoutWidth.forEach(window => {
                const widthInfo = windowWidths.get(window);
                if (widthInfo) {
                    widthInfo.value = percentPerWindow;
                }
            });
        }
        
        // Calculate the total percentage after distributing to windows without width
        let totalCalculatedPercentage = 0;
        windowWidths.forEach((widthInfo) => {
            if (widthInfo.unit === '%') {
                totalCalculatedPercentage += widthInfo.value;
            } else {
                totalCalculatedPercentage += (widthInfo.value / containerWidth) * 100;
            }
        });
        
        // Adjust to reach exactly 100% based on priority
        if (Math.abs(totalCalculatedPercentage - 100) > 0.01) { // Allow small rounding errors
            const diff = 100 - totalCalculatedPercentage;
            let adjusted = false;
            
            // First priority: Adjust window without width attribute
            if (windowsWithoutWidth.length > 0 && !adjusted) {
                const window = windowsWithoutWidth[0];
                const widthInfo = windowWidths.get(window);
                if (widthInfo) {
                    widthInfo.value += diff;
                    adjusted = true;
                }
            }
            
            // Second priority: Adjust window with percentage width
            if (windowsWithPercentWidth.length > 0 && !adjusted) {
                const window = windowsWithPercentWidth[0];
                const widthInfo = windowWidths.get(window);
                if (widthInfo) {
                    widthInfo.value += diff;
                    adjusted = true;
                }
            }
            
            // Third priority: Adjust first window regardless of attributes
            if (allWindows.length > 0 && !adjusted) {
                const window = allWindows[0];
                const widthInfo = windowWidths.get(window);
                if (widthInfo) {
                    widthInfo.value += diff;
                    if (widthInfo.unit === 'px') {
                        // Convert the adjustment to pixels and add it
                        const pixelDiff = (diff / 100) * containerWidth;
                        widthInfo.value += pixelDiff;
                    } else {
                        widthInfo.value += diff;
                    }
                    adjusted = true;
                }
            }
        }
        
        // Apply calculated widths, ensuring min-width is respected
        nonStackedWindows.forEach(child => {
            const widthInfo = windowWidths.get(child);
            const minWidth = parseInt(child.getAttribute('min-width') || '200');
            
            if (widthInfo) {
                let finalWidthPercent;
                
                if (widthInfo.unit === '%') {
                    finalWidthPercent = widthInfo.value;
                } else {
                    finalWidthPercent = (widthInfo.value / containerWidth) * 100;
                }
                
                // Ensure min-width is respected
                const minWidthPercent = (minWidth / containerWidth) * 100;
                finalWidthPercent = Math.max(finalWidthPercent, minWidthPercent);
                
                // Apply the width
                child.style.width = `${finalWidthPercent}%`;
                
                // Set flex property based on type
                if (widthInfo.type === 'none') {
                    child.style.flex = '1 1 auto'; // Allow growing/shrinking for windows without explicit width
                } else {
                    child.style.flex = '0 0 auto'; // Fixed size for windows with explicit width
                }
            }
            
            // Add splitter after each window except the last one
            if (child !== nonStackedWindows[nonStackedWindows.length - 1]) {
                this.addSplitter(child);
            }
        });

        // Wait for layout to be stable before stacking windows and restoring state
        requestAnimationFrame(() => {
            // Process stacked relationships
            children.forEach(child => {
                if (!child.hasAttribute('stacked')) {
                    const stackedChildren = stackedWindows.get(child.id);
                    if (stackedChildren) {
                        stackedChildren.forEach(stackedChild => {
                            this.stackWindow(stackedChild, child);
                        });
                    }
                }
            });
            
            // Apply locked state if needed
            if (this.locked) {
                this.updateLockedState();
            }
            
            // Restore state AFTER everything is set up and stable
            setTimeout(() => {
                this.restoreState();
            }, 100);
        });
        
        // Add global event listeners
        document.addEventListener('mousemove', this.handleDrag.bind(this));
        document.addEventListener('mouseup', this.handleDrop.bind(this));
        
        // Add touch event listeners
        document.addEventListener('touchmove', this.handleDrag.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleDrop.bind(this));
    }

    disconnectedCallback() {
        document.removeEventListener('mousemove', this.handleDrag.bind(this));
        document.removeEventListener('mouseup', this.handleDrop.bind(this));
        document.removeEventListener('touchmove', this.handleDrag.bind(this));
        document.removeEventListener('touchend', this.handleDrop.bind(this));
    }

    private makeDockable(element: HTMLElement) {
        // Add window class and make draggable
        element.classList.add('dockable-view-window');
        
        // Ensure window has an ID
        if (!element.id) {
            element.id = `dock-window-${Math.random().toString(36).substr(2, 9)}`;
        }
        
        // Set min-width and width from attributes or use defaults
        const minWidth = element.getAttribute('min-width') || '200px';
        const width = element.getAttribute('width') || '33.33%';
        element.style.minWidth = minWidth;
        element.style.width = width;
        element.style.flex = '0 0 auto';
        
        // Check for controlbox attribute
        const controlbox = element.getAttribute('controlbox');
        const showControls = !(controlbox === 'false' || controlbox === '0');
        
        // Create header if not exists
        if (!element.querySelector('.dockable-view-window-header')) {
            const header = document.createElement('div');
            header.className = 'dockable-view-window-header';
            header.innerHTML = `
                <div class="dockable-view-stack-tabs">
                    <div class="dockable-view-window-title">${element.getAttribute('title') || ''}</div>
                </div>
                <div class="dockable-view-window-controls">
                    ${showControls ? '<button class="dockable-view-maximize">□</button><button class="dockable-view-close">×</button>' : ''}
                </div>
            `;
            element.insertBefore(header, element.firstChild);
        }

        // Create .window-content wrapper if not exists
        if (!element.querySelector('.dockable-view-window-content')) {
            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'dockable-view-window-content';
            
            // Store references to any shadow DOM components before moving them
            const shadowComponents = Array.from(element.children)
                .filter(child => 
                    !(child as HTMLElement).classList.contains('dockable-view-window-header') && 
                    (child instanceof HTMLElement) && 
                    (child.shadowRoot !== null)
                ) as HTMLElement[];
            
            // Move all children except .window-header into .window-content
            Array.from(element.children).forEach(child => {
                if (!(child as HTMLElement).classList.contains('dockable-view-window-header')) {
                    contentWrapper.appendChild(child);
                }
            });
            element.appendChild(contentWrapper);
            
            // Force re-render of shadow DOM components that were moved
            setTimeout(() => {
                shadowComponents.forEach(component => {
                    // Force a DOM reconnection to trigger connectedCallback
                    const temp = document.createElement('div');
                    contentWrapper.insertBefore(temp, component);
                    contentWrapper.removeChild(component);
                    contentWrapper.insertBefore(component, temp);
                    contentWrapper.removeChild(temp);
                });
            }, 50);
        }

        // Make header draggable if not locked
        const header = element.querySelector('.dockable-view-window-header') as HTMLElement;
        if (header) {
            header.addEventListener('mousedown', (e: MouseEvent) => {
                // Don't start drag if locked
                if (this.locked) return;
                this.startDrag(e, element);
            });
            
            // Add touch support
            header.addEventListener('touchstart', (e: TouchEvent) => {
                // Don't start drag if locked
                if (this.locked) return;
                // Prevent default to avoid scrolling
                e.preventDefault();
                this.startDrag(e, element);
            }, { passive: false });
        }
        
        // Add control handlers
        if (showControls) {
            this.addWindowControls(element);
        }
        
        // Add locked class if needed
        if (this.locked) {
            element.classList.add('locked');
            if (header) {
                header.style.cursor = 'default';
            }
        }
    }

    private getEventCoordinates(e: MouseEvent | TouchEvent): { clientX: number, clientY: number } {
        if ('touches' in e && e.touches.length > 0) {
            return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
        }
        return { clientX: (e as MouseEvent).clientX, clientY: (e as MouseEvent).clientY };
    }

    private startDrag(e: MouseEvent | TouchEvent, window: HTMLElement) {
        // Don't start drag if locked
        if (this.locked) return;
        
        // Prevent dragging if window is maximized
        if (window.classList.contains('maximized')) {
            return;
        }

        if (e.target instanceof HTMLElement && 
            (e.target.classList.contains('dockable-view-maximize') || 
             e.target.classList.contains('dockable-view-close') ||
             e.target.classList.contains('dockable-view-stack-tab'))) {
            return;
        }

        this.draggingWindow = window;
        const containerRect = this.container.getBoundingClientRect();
        const windowRect = window.getBoundingClientRect();
        const coords = this.getEventCoordinates(e);
        
        // Save the exact state of the window
        this.dragStartState = {
            nextSibling: window.nextElementSibling,
            width: window.style.width,
            height: window.style.height,
            position: window.style.position,
            left: window.style.left,
            top: window.style.top,
            flex: window.style.flex
        };
        
        // Calculate offset from mouse/touch to window edges
        this.dragOffset = {
            x: coords.clientX - windowRect.left,
            y: coords.clientY - windowRect.top
        };

        // Remove any existing transition class before starting drag
        window.classList.remove('transitioning');

        // Create ghost element
        this.dragGhost = window.cloneNode(true) as HTMLElement;
        this.dragGhost.classList.add('drag-ghost');
        this.dragGhost.style.position = 'absolute';
        this.dragGhost.style.width = `${windowRect.width}px`;
        this.dragGhost.style.height = `${windowRect.height}px`;
        this.dragGhost.style.zIndex = 'var(--dockable-z-index)';
        this.dragGhost.style.pointerEvents = 'none';
        this.dragGhost.style.opacity = '0.6';
        
        // Add ghost to container
        this.container.appendChild(this.dragGhost);
        
        // Make original window semi-transparent but keep content visible
        window.style.opacity = '0.3';
        window.style.position = this.dragStartState.position;
        window.style.left = this.dragStartState.left;
        window.style.top = this.dragStartState.top;
        
        // Ensure window content stays visible during drag
        const contentEl = window.querySelector('.dockable-view-window-content') as HTMLElement;
        if (contentEl) {
            contentEl.style.visibility = 'visible';
            contentEl.style.display = 'block';
            contentEl.style.opacity = '1';
        }
        
        // Set initial ghost position
        const x = coords.clientX - containerRect.left - this.dragOffset.x;
        const y = coords.clientY - containerRect.top - this.dragOffset.y;
        this.dragGhost.style.transform = `translate(${x}px, ${y}px)`;
    }

    private findWindowUnderCursor(e: MouseEvent | TouchEvent): HTMLElement | null {
        // If stacking is not allowed, return null to prevent stacking
        if (!this.allowStacking) return null;

        const coords = this.getEventCoordinates(e);
        const elements = document.elementsFromPoint(coords.clientX, coords.clientY);
        for (const element of elements) {
            // Check specifically for header elements
            if (element instanceof HTMLElement && 
                element.classList.contains('dockable-view-window-header')) {
                // Get the parent window containing this header
                const parentWindow = element.closest('.dockable-view-window') as HTMLElement;
                if (parentWindow && 
                    parentWindow !== this.draggingWindow &&
                    !parentWindow.hasAttribute('stacked')) {
                    return parentWindow;
                }
            }
        }
        return null;
    }

    private stackWindow(window: HTMLElement, parentWindow: HTMLElement) {
        // Remove any existing stacked relationship
        if (window.hasAttribute('stacked')) {
            const oldParentId = window.getAttribute('stacked');
            if (oldParentId) {
                const oldParent = this.container.querySelector(`#${oldParentId}`);
                if (oldParent) {
                    const oldStack = this.stackedWindows.get(oldParentId);
                    if (oldStack) {
                        const index = oldStack.indexOf(window);
                        if (index > -1) {
                            oldStack.splice(index, 1);
                        }
                        if (oldStack.length === 0) {
                            this.stackedWindows.delete(oldParentId);
                            const tabs = oldParent.querySelector('.dockable-view-stack-tabs');
                            if (tabs) {
                                tabs.remove();
                            }
                        } else {
                            this.updateStackTabs(oldParent as HTMLElement);
                        }
                    }
                }
            }
        }

        // Set up new stacked relationship
        window.setAttribute('stacked', parentWindow.id);
        window.classList.add('stacked-window');
        
        // Position the window exactly over its parent
        const parentRect = parentWindow.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();
        
        window.style.position = 'absolute';
        window.style.left = `${parentRect.left - containerRect.left}px`;
        window.style.top = `${parentRect.top - containerRect.top}px`;
        window.style.width = `${parentRect.width}px`;
        window.style.height = `${parentRect.height}px`;
        window.style.margin = '0';
        window.style.padding = 'var(--dockable-spacing)';
        window.style.zIndex = '-1';
        window.style.pointerEvents = 'none';
        window.style.flex = '0 0 auto';
        window.style.opacity = '0';
        
        // Ensure the window is in the container, not nested
        if (window.parentElement !== this.container) {
            this.container.appendChild(window);
        }
        
        // Add to parent's stacked windows list
        if (!this.stackedWindows.has(parentWindow.id)) {
            this.stackedWindows.set(parentWindow.id, []);
        }
        this.stackedWindows.get(parentWindow.id)!.push(window);
        
        // Add stack tabs to parent if not already present
        this.addStackTabs(parentWindow);
        
        // Update stack tabs
        this.updateStackTabs(parentWindow);

        // Ensure parent window is visible initially
        parentWindow.style.zIndex = '1';
        parentWindow.style.pointerEvents = 'auto';
        parentWindow.style.opacity = '1';

        // Set initial positions for all windows in the stack
        const stackedWindows = this.stackedWindows.get(parentWindow.id) || [];
        stackedWindows.forEach(w => {
            w.style.position = 'absolute';
            w.style.left = `${parentRect.left - containerRect.left}px`;
            w.style.top = `${parentRect.top - containerRect.top}px`;
            w.style.width = `${parentRect.width}px`;
            w.style.height = `${parentRect.height}px`;
            w.style.margin = '0';
            w.style.padding = 'var(--dockable-spacing)';
            w.style.zIndex = '-1';
            w.style.pointerEvents = 'none';
            w.style.opacity = '0';
        });
        
        // Reclaim space by redistributing widths and removing splitters
        this.recalculateLayout();
    }

    private recalculateLayout() {
        // Step 1: Identify all visible windows (non-stacked)
        const visibleWindows = Array.from(this.container.children).filter(
            child => child instanceof HTMLElement && 
            child.classList.contains('dockable-view-window') &&
            !child.hasAttribute('stacked')
        ) as HTMLElement[];
        
        // Step 2: Remove all splitters
        Array.from(this.container.children).forEach(child => {
            if (child instanceof HTMLElement && child.classList.contains('window-splitter')) {
                child.remove();
            }
        });
        
        // If no visible windows, nothing more to do
        if (visibleWindows.length === 0) return;
        
        // Step 3: Recalculate widths - respecting width attributes
        const containerWidth = this.container.offsetWidth;
        
        // Check if any windows have width attribute
        const windowsWithWidth = visibleWindows.filter(window => 
            window.hasAttribute('width') || 
            window.style.width && !window.style.width.includes('auto')
        );
        
        if (windowsWithWidth.length > 0) {
            // Some windows have width - respect those widths
            let remainingWidth = 100; // Percentage
            let windowsWithoutWidth = 0;
            
            // Calculate total width specified by attributes
            for (const window of visibleWindows) {
                const widthAttr = window.getAttribute('width');
                const styleWidth = window.style.width;
                
                if (widthAttr) {
                    // Process attribute width
                    if (widthAttr.endsWith('%')) {
                        const percent = parseFloat(widthAttr);
                        if (!isNaN(percent)) {
                            window.style.width = `${percent}%`;
                            window.style.flex = '0 0 auto';
                            remainingWidth -= percent;
                        } else {
                            windowsWithoutWidth++;
                        }
                    } else if (widthAttr.endsWith('px')) {
                        const pixels = parseFloat(widthAttr);
                        if (!isNaN(pixels)) {
                            const percent = (pixels / containerWidth) * 100;
                            window.style.width = `${percent}%`;
                            window.style.flex = '0 0 auto';
                            remainingWidth -= percent;
                        } else {
                            windowsWithoutWidth++;
                        }
                    } else {
                        // Try to parse as number (pixels)
                        const pixels = parseFloat(widthAttr);
                        if (!isNaN(pixels)) {
                            const percent = (pixels / containerWidth) * 100;
                            window.style.width = `${percent}%`;
                            window.style.flex = '0 0 auto';
                            remainingWidth -= percent;
                        } else {
                            windowsWithoutWidth++;
                        }
                    }
                } else if (styleWidth && !styleWidth.includes('auto') && parseFloat(styleWidth) > 0) {
                    // Keep existing style width if valid
                    // Convert to percentage if needed
                    if (styleWidth.endsWith('px')) {
                        const pixels = parseFloat(styleWidth);
                        const percent = (pixels / containerWidth) * 100;
                        window.style.width = `${percent}%`;
                    }
                    window.style.flex = '0 0 auto';
                    
                    // Extract percent value
                    const stylePercent = parseFloat(window.style.width);
                    if (!isNaN(stylePercent)) {
                        remainingWidth -= stylePercent;
                    }
                } else {
                    windowsWithoutWidth++;
                }
            }
            
            // Distribute remaining width to windows without width
            if (windowsWithoutWidth > 0 && remainingWidth > 0) {
                const percentPerWindow = remainingWidth / windowsWithoutWidth;
                
                for (const window of visibleWindows) {
                    if (!window.hasAttribute('width') && 
                        (!window.style.width || window.style.width.includes('auto') || parseFloat(window.style.width) <= 0)) {
                        window.style.width = `${percentPerWindow}%`;
                        window.style.flex = '1 1 0';
                    }
                }
            }
        } else {
            // No widths specified - distribute evenly
            const widthPercent = 100 / visibleWindows.length;
            
            visibleWindows.forEach(window => {
                window.style.width = `${widthPercent}%`;
                window.style.flex = '1 1 0';
            });
        }
        
        // Step 4: Add splitters between visible windows
        visibleWindows.forEach((window, index) => {
            if (index < visibleWindows.length - 1) {
                this.addSplitter(window);
            }
        });
        
        // Step 5: Update any stacked windows to match their parent dimensions
        visibleWindows.forEach(window => {
            // Update stacked windows if any
            this.updateStackedWindowSizes(window);
        });
    }

    private addStackTabs(window: HTMLElement) {
        // Add tabs to both the parent and stacked window
        const windows = [window, ...this.stackedWindows.get(window.id) || []];
        
        windows.forEach(w => {
            const header = w.querySelector('.dockable-view-window-header');
            if (!header) return;

            // Remove existing tabs and title
            const existingTabs = header.querySelector('.dockable-view-stack-tabs');
            const existingTitle = header.querySelector('.dockable-view-window-title');
            if (existingTabs) {
                existingTabs.remove();
            }
            if (existingTitle) {
                existingTitle.remove();
            }

            const tabs = document.createElement('div');
            tabs.className = 'dockable-view-stack-tabs';
            header.insertBefore(tabs, header.firstChild);
        });
    }

    private updateStackTabs(window: HTMLElement) {
        // Update tabs in both the parent and stacked windows
        const stackedWindows = this.stackedWindows.get(window.id) || [];
        const windows = [window, ...stackedWindows];
        
        windows.forEach(w => {
            const tabs = w.querySelector('.dockable-view-stack-tabs');
            if (!tabs) return;

            // Clear existing tabs
            tabs.innerHTML = '';
            
            // Add tab for main window
            const mainTab = document.createElement('div');
            mainTab.className = stackedWindows.length > 0 ? 'dockable-view-stack-tab' : 'dockable-view-window-title';
            mainTab.textContent = window.getAttribute('title') || '';
            mainTab.onclick = () => {
                if (stackedWindows.length > 0) {
                    this.activateStackedWindow(window, null);
                    
                    // Force immediate style update
                    mainTab.classList.add('active');
                    const stackTabs = tabs.querySelectorAll('.dockable-view-stack-tab');
                    stackTabs.forEach(tab => {
                        if (tab !== mainTab) tab.classList.remove('active');
                    });
                }
            };
            tabs.appendChild(mainTab);
            
            // Add tabs for stacked windows
            stackedWindows.forEach(stackedWindow => {
                const tab = document.createElement('div');
                tab.className = 'dockable-view-stack-tab';
                tab.textContent = stackedWindow.getAttribute('title') || '';
                tab.onclick = () => {
                    this.activateStackedWindow(window, stackedWindow);
                    
                    // Force immediate style update
                    tab.classList.add('active');
                    const stackTabs = tabs.querySelectorAll('.dockable-view-stack-tab');
                    stackTabs.forEach(t => {
                        if (t !== tab) t.classList.remove('active');
                    });
                };
                tabs.appendChild(tab);
            });

            // Set initial active tab
            if (stackedWindows.length > 0) {
                if (this.activeStackedWindow) {
                    const activeTab = Array.from(tabs.children).find(tab => 
                        tab.textContent === this.activeStackedWindow?.getAttribute('title')
                    );
                    if (activeTab) {
                        activeTab.classList.add('active');
                        // Force a reflow to ensure the class is applied
                        void (activeTab as HTMLElement).offsetWidth;
                    }
                } else {
                    const firstTab = tabs.children[0];
                    if (firstTab) {
                        firstTab.classList.add('active');
                        // Force a reflow to ensure the class is applied
                        void (firstTab as HTMLElement).offsetWidth;
                    }
                }
            }
        });
    }

    private activateStackedWindow(parentWindow: HTMLElement, window: HTMLElement | null, skipAnimation: boolean = false) {
        // Update active state
        this.activeStackedWindow = window;
        
        // Get all windows in the stack
        const stackedWindows = this.stackedWindows.get(parentWindow.id) || [];
        
        // Calculate base z-index and offset
        const isMaximized = parentWindow.classList.contains('maximized');
        const baseZIndex = parseInt(getComputedStyle(this).getPropertyValue('--dockable-z-index')) || 1000;
        const maxOffset = parseInt(getComputedStyle(this).getPropertyValue('--dockable-maximized-offset')) || 1000;
        const zIndexBase = isMaximized ? (baseZIndex + maxOffset) : baseZIndex;
        
        // First, set parent window to base z-index
        parentWindow.style.zIndex = `${zIndexBase}`;
        parentWindow.style.pointerEvents = 'none';
        if (!skipAnimation) {
            parentWindow.style.opacity = '0';
        }
        
        // Update all stacked windows to match parent's maximized state
        stackedWindows.forEach(w => {
            if (isMaximized) {
                w.style.position = 'fixed';
                w.style.inset = '0';
                w.style.width = '100%';
                w.style.height = '100%';
                w.style.margin = '0';
                w.style.padding = 'var(--dockable-spacing)';
            } else {
                const parentRect = parentWindow.getBoundingClientRect();
                const containerRect = this.container.getBoundingClientRect();
                w.style.position = 'absolute';
                w.style.inset = '';
                w.style.left = `${parentRect.left - containerRect.left}px`;
                w.style.top = `${parentRect.top - containerRect.top}px`;
                w.style.width = parentWindow.style.width || `${parentRect.width}px`;
                w.style.height = `${parentRect.height}px`;
                w.style.margin = '';
                w.style.padding = '';
                w.style.flex = parentWindow.style.flex || '0 0 auto';
            }
            w.style.zIndex = `${zIndexBase - 1}`;
            w.style.pointerEvents = 'none';
            if (!skipAnimation) {
                w.style.opacity = '0';
            }
        });
        
        // Then show the selected window with highest z-index
        if (window) {
            if (isMaximized) {
                window.style.position = 'fixed';
                window.style.inset = '0';
                window.style.width = '100%';
                window.style.height = '100%';
                window.style.margin = '0';
                window.style.padding = 'var(--dockable-spacing)';
            } else {
                // Ensure the active window exactly matches the parent's size and position
                const parentRect = parentWindow.getBoundingClientRect();
                const containerRect = this.container.getBoundingClientRect();
                window.style.position = 'absolute';
                window.style.inset = '';
                window.style.left = `${parentRect.left - containerRect.left}px`;
                window.style.top = `${parentRect.top - containerRect.top}px`;
                window.style.width = parentWindow.style.width || `${parentRect.width}px`;
                window.style.height = `${parentRect.height}px`;
                window.style.flex = parentWindow.style.flex || '0 0 auto';
            }
            window.style.zIndex = `${zIndexBase + 1}`;
            window.style.pointerEvents = 'auto';
            if (!skipAnimation) {
                window.style.opacity = '1';
            }
        } else {
            parentWindow.style.zIndex = `${zIndexBase + 1}`;
            parentWindow.style.pointerEvents = 'auto';
            if (!skipAnimation) {
                parentWindow.style.opacity = '1';
            }
        }
        
        // Update tab states - get all tabs in all windows in the stack
        const allWindows = [parentWindow, ...stackedWindows];
        const windowTitle = window ? window.getAttribute('title') : parentWindow.getAttribute('title');
        
        // First, ensure we remove active class from all tabs in all windows
        allWindows.forEach(w => {
            const tabs = w.querySelectorAll('.dockable-view-stack-tab');
            tabs.forEach(tab => tab.classList.remove('active'));
        });
        
        // Then set active class on the matching tab in all windows
        allWindows.forEach(w => {
            const tabs = Array.from(w.querySelectorAll('.dockable-view-stack-tab'));
            const activeTab = tabs.find(tab => tab.textContent?.trim() === windowTitle?.trim());
            if (activeTab) {
                activeTab.classList.add('active');
                // Force a DOM reflow to ensure the class change takes effect
                void (activeTab as HTMLElement).offsetWidth;
            }
        });
    }

    private handleDrag(e: MouseEvent | TouchEvent) {
        if (!this.draggingWindow || !this.dragGhost) return;

        const containerRect = this.container.getBoundingClientRect();
        const coords = this.getEventCoordinates(e);
        
        // Update ghost position
        const x = coords.clientX - containerRect.left - this.dragOffset.x;
        const y = coords.clientY - containerRect.top - this.dragOffset.y;
        this.dragGhost.style.transform = `translate(${x}px, ${y}px)`;

        // Show dock preview if near edges
        this.updateDockPreview(e);
        
        // Only check for stacking if it's allowed
        if (this.allowStacking) {
            // Check for potential stacking
            const potentialStack = this.findWindowUnderCursor(e);
            
            // Remove highlight from all windows and headers first
            this.container.querySelectorAll('.stack-highlight').forEach(el => {
                el.classList.remove('stack-highlight');
            });
            
            // If hovering over a window header, highlight only the header
            if (potentialStack && potentialStack !== this.draggingWindow) {
                const header = potentialStack.querySelector('.dockable-view-window-header');
                if (header) {
                    header.classList.add('stack-highlight');
                }
            }
        }
    }

    private updateDockPreview(e: MouseEvent | TouchEvent) {
        if (!this.draggingWindow || !this.dockPreview) return;

        const containerRect = this.getBoundingClientRect();
        const coords = this.getEventCoordinates(e);
        
        // Check if near left or right edge
        const nearLeft = coords.clientX < containerRect.left + 50;
        const nearRight = coords.clientX > containerRect.right - 50;
        
        // Find if we're near a splitter
        const splitters = Array.from(this.container.children).filter(
            child => child instanceof HTMLElement && child.classList.contains('window-splitter')
        ) as HTMLElement[];

        let targetSplitter: HTMLElement | null = null;
        let leftWindow: HTMLElement | null = null;
        let rightWindow: HTMLElement | null = null;

        // Only check for splitters if we're not near edges
        if (!nearLeft && !nearRight) {
            for (const splitter of splitters) {
                const splitterRect = splitter.getBoundingClientRect();
                // Check if mouse/touch is within 25px of splitter center
                if (Math.abs(coords.clientX - (splitterRect.left + splitterRect.width / 2)) < 25) {
                    targetSplitter = splitter;
                    // Get the windows on either side of the splitter
                    let current = splitter.previousElementSibling;
                    while (current && (!(current instanceof HTMLElement) || 
                           (!current.classList.contains('dockable-view-window') || 
                            (current.hasAttribute('stacked') && current !== this.draggingWindow)))) {
                        current = current.previousElementSibling;
                    }
                    leftWindow = current as HTMLElement;

                    current = splitter.nextElementSibling;
                    while (current && (!(current instanceof HTMLElement) || 
                           (!current.classList.contains('dockable-view-window') || 
                            (current.hasAttribute('stacked') && current !== this.draggingWindow)))) {
                        current = current.nextElementSibling;
                    }
                    rightWindow = current as HTMLElement;
                    break;
                }
            }
        }

        // Hide preview by default
        this.dockPreview.style.display = 'none';
        delete this.dockPreview.dataset.dockPosition;
        delete this.dockPreview.dataset.leftWindowId;
        delete this.dockPreview.dataset.rightWindowId;
        
        // Only show preview if we're in a valid docking position
        if (nearLeft || nearRight || (targetSplitter && leftWindow && rightWindow)) {
            // Get the dragged window's current width as a percentage of container
            const draggingRect = this.draggingWindow.getBoundingClientRect();
            const widthPercent = (draggingRect.width / containerRect.width) * 100;
            
            this.dockPreview.style.display = 'block';
            this.dockPreview.style.height = '100%';
            this.dockPreview.style.top = '0';
            
            if (nearLeft) {
                this.dockPreview.style.width = `${widthPercent}%`;
                this.dockPreview.style.left = '0';
                this.dockPreview.dataset.dockPosition = 'left';
            } else if (nearRight) {
                this.dockPreview.style.width = `${widthPercent}%`;
                const previewWidthPixels = containerRect.width * (widthPercent / 100);
                this.dockPreview.style.left = `${containerRect.width - previewWidthPixels}px`;
                this.dockPreview.dataset.dockPosition = 'right';
            } else if (targetSplitter && leftWindow && rightWindow) {
                // Use half the dragged window's width for between-window docking
                const halfWidthPercent = widthPercent / 2;
                this.dockPreview.style.width = `${halfWidthPercent}%`;
                const splitterRect = targetSplitter.getBoundingClientRect();
                const previewWidthPixels = containerRect.width * (halfWidthPercent / 100);
                this.dockPreview.style.left = `${splitterRect.left - containerRect.left - (previewWidthPixels / 2)}px`;
                this.dockPreview.dataset.dockPosition = 'between';
                this.dockPreview.dataset.leftWindowId = leftWindow.id;
                this.dockPreview.dataset.rightWindowId = rightWindow.id;
            }
        }
    }

    private addSplitter(window: HTMLElement) {
        const splitter = document.createElement('div');
        splitter.className = 'window-splitter';
        
        // Always add resize functionality regardless of locked state
        splitter.addEventListener('mousedown', (e: MouseEvent) => this.startResize(e, splitter));
        
        // Add touch support for resizing
        splitter.addEventListener('touchstart', (e: TouchEvent) => {
            e.preventDefault(); // Prevent scrolling
            this.startResize(e, splitter);
        }, { passive: false });
        
        window.insertAdjacentElement('afterend', splitter);
    }

    private startResize(e: MouseEvent | TouchEvent, splitter: HTMLElement) {
        e.preventDefault();
        
        this.isResizing = true;
        this.resizingSplitter = splitter;
        this.resizeStartX = this.getEventCoordinates(e).clientX;
        
        splitter.classList.add('resizing');
        document.body.style.cursor = 'col-resize';

        // Find adjacent windows
        let leftWindow: HTMLElement | null = null;
        let rightWindow: HTMLElement | null = null;
        
        const allChildren = Array.from(this.container.children);
        const splitterIndex = allChildren.indexOf(splitter);
        
        // Look backwards for the left window
        for (let i = splitterIndex - 1; i >= 0; i--) {
            const child = allChildren[i] as HTMLElement;
            if (child.classList.contains('dockable-view-window') && !child.hasAttribute('stacked')) {
                leftWindow = child;
                break;
            }
        }
        
        // Look forwards for the right window
        for (let i = splitterIndex + 1; i < allChildren.length; i++) {
            const child = allChildren[i] as HTMLElement;
            if (child.classList.contains('dockable-view-window') && !child.hasAttribute('stacked')) {
                rightWindow = child;
                break;
            }
        }
        
        if (leftWindow && rightWindow) {
            this.adjacentWindows = { left: leftWindow, right: rightWindow };
            
            // Store initial dimensions
            leftWindow.dataset.initialWidth = leftWindow.getBoundingClientRect().width.toString();
            rightWindow.dataset.initialWidth = rightWindow.getBoundingClientRect().width.toString();
            
            // Mark that these windows have active stacked windows (if applicable)
            const leftStacked = this.stackedWindows.get(leftWindow.id);
            const rightStacked = this.stackedWindows.get(rightWindow.id);
            
            if (leftStacked && leftStacked.length > 0) {
                leftWindow.dataset.hasActiveStacked = 'true';
                const activeStacked = leftStacked.find(win => 
                    win.style.opacity === '1' && win.style.pointerEvents === 'auto'
                );
                if (activeStacked) {
                    leftWindow.dataset.activeStackedId = activeStacked.id;
                }
            }
            
            if (rightStacked && rightStacked.length > 0) {
                rightWindow.dataset.hasActiveStacked = 'true';
                const activeStacked = rightStacked.find(win => 
                    win.style.opacity === '1' && win.style.pointerEvents === 'auto'
                );
                if (activeStacked) {
                    rightWindow.dataset.activeStackedId = activeStacked.id;
                }
            }
        }
    }

    private handleResize(e: MouseEvent | TouchEvent) {
        if (!this.resizingSplitter || !this.adjacentWindows.left || !this.adjacentWindows.right) return;

        const containerWidth = this.container.offsetWidth;
        // Use the correct delta calculation
        const coords = this.getEventCoordinates(e);
        const deltaX = coords.clientX - this.resizeStartX;

        // Get all non-stacked windows in order
        const allWindows = Array.from(this.container.children).filter(
            child => child instanceof HTMLElement && 
            child.classList.contains('dockable-view-window') &&
            !child.hasAttribute('stacked')
        ) as HTMLElement[];

        // Find the index of the left and right windows
        const leftIndex = allWindows.indexOf(this.adjacentWindows.left);
        const rightIndex = allWindows.indexOf(this.adjacentWindows.right);

        // Get initial widths in pixels for the two windows
        const leftInitialWidth = parseFloat(this.adjacentWindows.left.dataset.initialWidth || '0');
        const rightInitialWidth = parseFloat(this.adjacentWindows.right.dataset.initialWidth || '0');
        const minWidths = allWindows.map(w => parseInt(w.getAttribute('min-width') || '200'));

        // Only adjust the two adjacent windows
        let newLeftWidth = leftInitialWidth + deltaX;
        let newRightWidth = rightInitialWidth - deltaX;
        const totalWidth = leftInitialWidth + rightInitialWidth;

        // Clamp to min-widths
        if (newLeftWidth < minWidths[leftIndex]) {
            newLeftWidth = minWidths[leftIndex];
            newRightWidth = totalWidth - newLeftWidth;
        }
        if (newRightWidth < minWidths[rightIndex]) {
            newRightWidth = minWidths[rightIndex];
            newLeftWidth = totalWidth - newRightWidth;
        }
        // Clamp so neither window exceeds the container
        if (newLeftWidth < 0) newLeftWidth = 0;
        if (newRightWidth < 0) newRightWidth = 0;
        if (newLeftWidth + newRightWidth > containerWidth) {
            const overflow = newLeftWidth + newRightWidth - containerWidth;
            // Reduce the larger window by the overflow
            if (newLeftWidth > newRightWidth) {
                newLeftWidth -= overflow;
            } else {
                newRightWidth -= overflow;
            }
        }

        // Convert to percentages and apply
        const newWidths = allWindows.map((w, i) => {
            if (i === leftIndex) return newLeftWidth;
            if (i === rightIndex) return newRightWidth;
            return w.getBoundingClientRect().width;
        });
        for (let i = 0; i < allWindows.length; i++) {
            const percent = (newWidths[i] / containerWidth) * 100;
            allWindows[i].style.width = `${percent}%`;
            allWindows[i].style.flex = '0 0 auto';
            this.updateStackedWindowSizes(allWindows[i]);
            allWindows[i].dataset.needsSyncAfterResize = 'true';
        }

        // Remove all existing splitters
        Array.from(this.container.children).forEach(child => {
            if (child instanceof HTMLElement && child.classList.contains('window-splitter')) {
                child.remove();
            }
        });

        // Add splitters between all windows
        allWindows.forEach((window, index) => {
            if (index < allWindows.length - 1) {
                this.addSplitter(window);
            }
        });
    }

    private updateStackedWindowSizes(window: HTMLElement) {
        // First, find all stacked windows for this window
        const stackedWindows = this.stackedWindows.get(window.id) || [];
        if (stackedWindows.length === 0) return;
        
        // If we're not maximized, update stacked windows based on parent window dimensions
        if (!window.classList.contains('maximized')) {
            const parentRect = window.getBoundingClientRect();
            const containerRect = this.container.getBoundingClientRect();
            
            // Update all stacked windows to match parent dimensions exactly
            stackedWindows.forEach(stackedWindow => {
                // Match width explicitly using both style width and exact pixel dimensions
                stackedWindow.style.width = window.style.width;
                stackedWindow.style.flex = window.style.flex;
                
                // Set correct position (needed for stack display)
                stackedWindow.style.position = 'absolute';
                stackedWindow.style.left = `${parentRect.left - containerRect.left}px`;
                stackedWindow.style.top = `${parentRect.top - containerRect.top}px`;
                stackedWindow.style.height = `${parentRect.height}px`;
                
                // Ensure the dimensions match exactly by setting boxSizing and other properties
                stackedWindow.style.boxSizing = 'border-box';
                stackedWindow.style.margin = '0';
                stackedWindow.style.padding = 'var(--dockable-spacing)';
            });
            
            // If any stacked window is currently active, ensure it stays visible
            const activeStackedWindow = stackedWindows.find(win => 
                win.style.opacity === '1' && win.style.pointerEvents === 'auto'
            );
            
            if (activeStackedWindow) {
                // Ensure the active window remains properly positioned and sized
                activeStackedWindow.style.width = window.style.width;
                activeStackedWindow.style.position = 'absolute';
                activeStackedWindow.style.left = `${parentRect.left - containerRect.left}px`;
                activeStackedWindow.style.top = `${parentRect.top - containerRect.top}px`;
                activeStackedWindow.style.height = `${parentRect.height}px`;
                activeStackedWindow.style.zIndex = (parseInt(window.style.zIndex || '1') + 1).toString();
                activeStackedWindow.style.boxSizing = 'border-box';
                activeStackedWindow.style.margin = '0';
                activeStackedWindow.style.padding = 'var(--dockable-spacing)';
            }
        }
    }

    private endResize() {
        if (!this.resizingSplitter) return;

        this.resizingSplitter.classList.remove('resizing');
        this.resizingSplitter = null;
        this.adjacentWindows = { left: null, right: null };

        // Remove the resize cursor from the document
        document.body.style.cursor = '';

        // Update stacked window sizes if any windows are stacked
        const windows = Array.from(this.container.children).filter(
            child => child instanceof HTMLElement && 
            child.classList.contains('dockable-view-window')
        ) as HTMLElement[];

        windows.forEach(window => {
            this.updateStackedWindowSizes(window);
        });

        // Remove transitioning class from all windows after animation completes
        setTimeout(() => {
            const allWindows = Array.from(this.container.children).filter(
                child => child instanceof HTMLElement && child.classList.contains('dockable-view-window')
            ) as HTMLElement[];
            allWindows.forEach(window => {
                window.classList.remove('transitioning');
            });
        }, 250);

        // DON'T recalculate layout after resize - it overrides the manual resize results
        // Just ensure splitters are in the right places
        this.recreateSplitters();

        // Clear the resizing flag before saving state
        this.isResizing = false;

        // Save state after resizing to preserve splitter positions
        this.saveState();
    }

    private unstackWindow(window: HTMLElement) {
        if (!window.hasAttribute('stacked')) return;

        const oldParentId = window.getAttribute('stacked');
        if (!oldParentId) return;

        const oldParent = this.container.querySelector(`#${oldParentId}`) as HTMLElement;
        if (!oldParent) return;

        // Remove from stacked windows collection
        const stackedWindows = this.stackedWindows.get(oldParentId);
        if (stackedWindows) {
            const index = stackedWindows.indexOf(window);
            if (index > -1) {
                stackedWindows.splice(index, 1);
            }
            // Clean up if this was the last stacked window
            if (stackedWindows.length === 0) {
                this.stackedWindows.delete(oldParentId);
                // Reset parent window to show just its title
                const parentHeader = oldParent.querySelector('.dockable-view-window-header');
                if (parentHeader) {
                    const stackTabs = parentHeader.querySelector('.dockable-view-stack-tabs');
                    if (stackTabs) {
                        stackTabs.innerHTML = '';
                        const title = document.createElement('div');
                        title.className = 'dockable-view-window-title';
                        title.textContent = oldParent.getAttribute('title') || '';
                        stackTabs.appendChild(title);
                    }
                }
            } else {
                // Update tabs in parent if other windows remain stacked
                this.updateStackTabs(oldParent);
            }
        }

        // Reset the window's attributes and styles
        window.removeAttribute('stacked');
        window.classList.remove('stacked-window');
        window.style.position = 'relative';
        window.style.left = '';
        window.style.top = '';
        window.style.zIndex = '';
        window.style.pointerEvents = 'auto';
        window.style.opacity = '1';
        
        // Reset unstacked window to show just its title
        const header = window.querySelector('.dockable-view-window-header');
        if (header) {
            const stackTabs = header.querySelector('.dockable-view-stack-tabs');
            if (stackTabs) {
                stackTabs.innerHTML = '';
                const title = document.createElement('div');
                title.className = 'dockable-view-window-title';
                title.textContent = window.getAttribute('title') || '';
                stackTabs.appendChild(title);
            }
        }
        
        // Recalculate layout to properly distribute space
        this.recalculateLayout();
    }

    private handleDrop(e: MouseEvent | TouchEvent) {
        if (!this.draggingWindow || !this.dockPreview) return;

        // Always restore opacity first
        this.draggingWindow.style.opacity = '1';

        // Remove ghost element and ensure it's cleaned up
        if (this.dragGhost) {
            this.dragGhost.remove();
            this.dragGhost = null;
        }

        // Check for stacking only if it's allowed
        if (this.allowStacking) {
            const targetWindow = this.findWindowUnderCursor(e);
            if (targetWindow) {
                // Remove the dragging window from its current parent if it's stacked
                if (this.draggingWindow.parentElement !== this.container) {
                    this.container.appendChild(this.draggingWindow);
                }
                targetWindow.classList.remove('stack-highlight');
                this.stackWindow(this.draggingWindow, targetWindow);
                // Save state after stacking
                this.saveState();
                return;
            }
        }

        const dockPosition = this.dockPreview.dataset.dockPosition;
        const wasStacked = this.draggingWindow.hasAttribute('stacked');
        const hasStackedWindows = this.stackedWindows.has(this.draggingWindow.id);

        // If no docking position is shown, restore to original state
        if (!dockPosition) {
            // Get the transition duration from the CSS variable
            const style = getComputedStyle(this);
            const transitionDuration = style.getPropertyValue('--dockable-transition-duration');
            const durationMs = parseInt(transitionDuration) || 0;

            // Remove any existing transition class
            this.draggingWindow.classList.remove('transitioning');
            
            // Force a reflow
            void this.draggingWindow.offsetWidth;
            
            // Add transitioning class
            this.draggingWindow.classList.add('transitioning');

            if (this.dragStartState) {
                // Restore the window to its exact original state
                this.draggingWindow.style.position = this.dragStartState.position;
                this.draggingWindow.style.width = this.dragStartState.width;
                this.draggingWindow.style.height = this.dragStartState.height;
                this.draggingWindow.style.left = this.dragStartState.left;
                this.draggingWindow.style.top = this.dragStartState.top;
                this.draggingWindow.style.flex = this.dragStartState.flex;
                this.draggingWindow.style.transform = 'none';
                this.draggingWindow.style.opacity = '1';
                this.draggingWindow.style.pointerEvents = 'auto';
                this.draggingWindow.style.zIndex = '1';

                // Ensure window content is visible
                const contentEl = this.draggingWindow.querySelector('.dockable-view-window-content') as HTMLElement;
                if (contentEl) {
                    contentEl.style.display = '';
                    contentEl.style.visibility = 'visible';
                    contentEl.style.opacity = '1';
                }

                // Restore the window to its original position in the DOM
                if (this.dragStartState.nextSibling) {
                    this.container.insertBefore(this.draggingWindow, this.dragStartState.nextSibling);
                } else {
                    this.container.appendChild(this.draggingWindow);
                }

                // If this window has stacked windows, restore the stack state
                if (hasStackedWindows) {
                    const stackedWindows = this.stackedWindows.get(this.draggingWindow.id) || [];
                    stackedWindows.forEach(window => {
                        window.style.opacity = '0';
                        window.style.pointerEvents = 'none';
                        window.style.zIndex = '-1';
                        
                        // Ensure stacked window content remains visible
                        const stackedContentEl = window.querySelector('.dockable-view-window-content') as HTMLElement;
                        if (stackedContentEl) {
                            stackedContentEl.style.display = '';
                            stackedContentEl.style.visibility = 'visible';
                        }
                    });

                    // Show the active window or the first stacked window
                    const activeWindow = this.activeStackedWindow || stackedWindows[0];
                    if (activeWindow) {
                        activeWindow.style.opacity = '1';
                        activeWindow.style.pointerEvents = 'auto';
                        activeWindow.style.zIndex = '1';
                        
                        // Ensure active stacked window content is visible
                        const activeContentEl = activeWindow.querySelector('.dockable-view-window-content') as HTMLElement;
                        if (activeContentEl) {
                            activeContentEl.style.display = '';
                            activeContentEl.style.visibility = 'visible';
                            activeContentEl.style.opacity = '1';
                        }
                    }

                    // Update the tabs to reflect the current state
                    this.updateStackTabs(this.draggingWindow);
                }
            }

            // Remove transitioning class after animation
            const draggingWindow = this.draggingWindow;
            setTimeout(() => {
                if (draggingWindow) {
                    draggingWindow.classList.remove('transitioning');
                }
            }, durationMs);

            // Clean up
            this.dragStartState = null;
            this.draggingWindow = null;
            this.dockPreview.style.display = 'none';
            delete this.dockPreview.dataset.dockPosition;
            delete this.dockPreview.dataset.leftWindowId;
            delete this.dockPreview.dataset.rightWindowId;
            return;
        }

        // Handle stack restructuring for main window with stacked windows
        if (hasStackedWindows) {
            const stackedWindows = this.stackedWindows.get(this.draggingWindow.id) || [];
            if (stackedWindows.length > 0) {
                // Promote the first stacked window to be the new main
                const newMainWindow = stackedWindows[0];
                const remainingWindows = stackedWindows.slice(1);

                // Remove the old stack
                this.stackedWindows.delete(this.draggingWindow.id);

                // Set up the new stack under the new main window if there are remaining windows
                if (remainingWindows.length > 0) {
                    this.stackedWindows.set(newMainWindow.id, remainingWindows);
                    remainingWindows.forEach(w => {
                        w.setAttribute('stacked', newMainWindow.id);
                    });
                }

                // Set up the new main window
                newMainWindow.removeAttribute('stacked');
                newMainWindow.classList.remove('stacked-window');
                newMainWindow.style.position = 'relative';
                newMainWindow.style.inset = '';
                newMainWindow.style.zIndex = '1';
                newMainWindow.style.pointerEvents = 'auto';
                newMainWindow.style.opacity = '1';

                // Update tabs if there are remaining windows
                if (remainingWindows.length > 0) {
                    this.addStackTabs(newMainWindow);
                    this.updateStackTabs(newMainWindow);
                } else {
                    // Reset to simple title if no remaining windows
                    const header = newMainWindow.querySelector('.dockable-view-window-header');
                    if (header) {
                        const stackTabs = header.querySelector('.dockable-view-stack-tabs');
                        if (stackTabs) {
                            stackTabs.innerHTML = '';
                            const title = document.createElement('div');
                            title.className = 'dockable-view-window-title';
                            title.textContent = newMainWindow.getAttribute('title') || '';
                            stackTabs.appendChild(title);
                        }
                    }
                }
            }
        }

        // Only unstack if we're actually docking somewhere
        if (wasStacked) {
            this.unstackWindow(this.draggingWindow);
        }

        // Reset the dragged window's header to show just its title
        const header = this.draggingWindow.querySelector('.dockable-view-window-header');
        if (header) {
            const stackTabs = header.querySelector('.dockable-view-stack-tabs');
            if (stackTabs) {
                stackTabs.innerHTML = '';
                const title = document.createElement('div');
                title.className = 'dockable-view-window-title';
                title.textContent = this.draggingWindow.getAttribute('title') || '';
                stackTabs.appendChild(title);
            }
        }

        // Get all current windows (excluding stacked ones)
        const allWindows = Array.from(this.container.children).filter(
            child => child instanceof HTMLElement && 
            child.classList.contains('dockable-view-window') &&
            !child.hasAttribute('stacked')
        ) as HTMLElement[];

        // Calculate new window width percentage
        const totalWindows = allWindows.length + (allWindows.includes(this.draggingWindow) ? 0 : 1);
        const newWidthPercent = 100 / totalWindows;

        // Store current positions and widths
        const windowStates = new Map<HTMLElement, { width: string, left: string }>();
        allWindows.forEach(window => {
            const rect = window.getBoundingClientRect();
            const containerRect = this.container.getBoundingClientRect();
            windowStates.set(window, {
                width: window.style.width || `${(rect.width / containerRect.width) * 100}%`,
                left: `${(rect.left - containerRect.left) / containerRect.width * 100}%`
            });
        });

        // Remove any existing transition classes
        allWindows.forEach(window => window.classList.remove('transitioning'));

        // Force a reflow to ensure transitions are reset
        void this.container.offsetWidth;

        // Add transitioning class to all windows
        allWindows.forEach(window => window.classList.add('transitioning'));

        // Create new window order based on dock position
        let newWindowOrder: HTMLElement[] = [];
        
        if (dockPosition === 'left') {
            newWindowOrder = [
                this.draggingWindow,
                ...allWindows.filter(w => w !== this.draggingWindow)
            ];
        } else if (dockPosition === 'right') {
            newWindowOrder = [
                ...allWindows.filter(w => w !== this.draggingWindow),
                this.draggingWindow
            ];
        } else if (dockPosition === 'between') {
            const leftWindowId = this.dockPreview.dataset.leftWindowId;
            const rightWindowId = this.dockPreview.dataset.rightWindowId;
            
            if (leftWindowId && rightWindowId) {
                newWindowOrder = allWindows.reduce((acc: HTMLElement[], window) => {
                    if (window === this.draggingWindow) return acc;
                    
                    acc.push(window);
                    if (window.id === leftWindowId && this.draggingWindow) {
                        acc.push(this.draggingWindow);
                    }
                    return acc;
                }, []);
            }
        }

        // First, update DOM order without changing positions
        newWindowOrder.forEach((window, index) => {
            const currentIndex = Array.from(this.container.children).indexOf(window);
            if (currentIndex !== index) {
                const nextWindow = newWindowOrder[index + 1];
                if (nextWindow) {
                    this.container.insertBefore(window, nextWindow);
                } else {
                    this.container.appendChild(window);
                }
            }
        });

        // Set initial positions and widths for all windows
        newWindowOrder.forEach((window, index) => {
            const state = windowStates.get(window);
            if (state) {
                window.style.width = state.width;
                window.style.left = state.left;
            }
        });

        // Force a reflow
        void this.container.offsetWidth;

        // Set final positions and widths for all windows simultaneously
        newWindowOrder.forEach((window, index) => {
            const finalLeft = index * newWidthPercent;
            window.style.left = `${finalLeft}%`;
            window.style.width = `${newWidthPercent}%`;
            window.style.position = 'absolute'; // Ensure absolute positioning during transition
            window.style.flex = '0 0 auto';
        });

        // Remove existing splitters
        Array.from(this.container.children).forEach(child => {
            if (child instanceof HTMLElement && child.classList.contains('window-splitter')) {
                child.remove();
            }
        });

        // Add new splitters
        newWindowOrder.forEach((window, index) => {
            if (index < newWindowOrder.length - 1) {
                this.addSplitter(window);
            }
        });

        // Get the transition duration from the CSS variable
        const style = getComputedStyle(this);
        const transitionDuration = style.getPropertyValue('--dockable-transition-duration');
        const durationMs = parseInt(transitionDuration) || 0;

        // After transition completes, reset positioning
        setTimeout(() => {
            newWindowOrder.forEach(window => {
                window.classList.remove('transitioning');
                window.style.opacity = ''; // Ensure opacity is cleared
                window.style.left = ''; // Clear left position
                window.style.position = ''; // Reset position to relative
            });
            // Save state after drop is complete
            this.saveState();
        }, durationMs);

        // Clean up dragging state
        this.dragStartState = null;
        this.draggingWindow = null;
        this.dockPreview.style.display = 'none';
        delete this.dockPreview.dataset.dockPosition;
        delete this.dockPreview.dataset.leftWindowId;
        delete this.dockPreview.dataset.rightWindowId;
        
        // Recalculate layout to ensure proper spacing and remove unnecessary splitters
        this.recalculateLayout();

        // Handle drop on the drop zone
        if (this.dropZone && this.draggedWindow && this.dropTarget) {
            this.dropZone.style.display = 'none';
            
            // Get the original position
            const draggedIndex = Array.from(this.container.children).indexOf(this.draggedWindow);
            const targetIndex = Array.from(this.container.children).indexOf(this.dropTarget);
            
            // Only move if not dropping on itself
            if (draggedIndex !== targetIndex) {
                // Check if drop target has stacked windows
                if (this.dropSide === 'over' && this.allowStacking && this.dropTarget.classList.contains('dockable-view-window')) {
                    // Stack the dragged window on the drop target
                    this.stackWindow(this.draggedWindow, this.dropTarget);
                } else {
                    // Unstack if needed
                    if (this.draggedWindow.hasAttribute('stacked')) {
                        this.unstackWindow(this.draggedWindow);
                    }
                    
                    // Regular repositioning
                    if (this.dropSide === 'left') {
                        this.container.insertBefore(this.draggedWindow, this.dropTarget);
                    } else if (this.dropSide === 'right') {
                        this.container.insertBefore(this.draggedWindow, this.dropTarget.nextSibling);
                    }
                    
                    // Recreate splitters
                    this.recreateSplitters();
                }
                
                // Save state after reordering
                this.saveState();
            }
        }

        // Clear the drop zone and preview
        if (this.dropZone) {
            this.dropZone.remove();
            this.dropZone = null;
        }

        if (this.dragPreview) {
            this.dragPreview.remove();
            this.dragPreview = null;
        }

        this.draggedWindow = null;
        this.dropTarget = null;
        this.dropSide = null;
    }

    updateWindowOrder() {
        // Get all non-stacked windows and their current order
        const windows = Array.from(this.container.children).filter(child => 
            child instanceof HTMLElement && 
            child.classList.contains('dockable-view-window') &&
            !child.hasAttribute('stacked')
        ) as HTMLElement[];

        // Ensure splitters are correct
        this.recreateSplitters();
        
        // Save state to preserve the new order
        this.saveState();
    }

    private setStackMaximizedState(window: HTMLElement, maximized: boolean) {
        // Find all windows in the stack
        let stackedWindows: HTMLElement[] = [];
        let parentWindow: HTMLElement | null = null;

        if (window.hasAttribute('stacked')) {
            // This is a stacked window, get its parent and siblings
            const parentId = window.getAttribute('stacked');
            if (parentId) {
                parentWindow = this.container.querySelector(`#${parentId}`) as HTMLElement;
                if (parentWindow) {
                    stackedWindows = this.stackedWindows.get(parentId) || [];
                }
            }
        } else {
            // This is a parent window, get its stacked children
            parentWindow = window;
            stackedWindows = this.stackedWindows.get(window.id) || [];
        }

        if (!parentWindow) return;

        // Update maximized state for parent and all stacked windows
        const allWindows = [parentWindow, ...stackedWindows];
        allWindows.forEach(w => {
            if (maximized) {
                w.classList.add('maximized');
                const maximizeBtn = w.querySelector('.dockable-view-maximize') as HTMLElement;
                const closeBtn = w.querySelector('.dockable-view-close') as HTMLElement;
                if (maximizeBtn) {
                    maximizeBtn.textContent = '_';
                }
                if (closeBtn) {
                    closeBtn.style.display = 'none';
                }
            } else {
                w.classList.remove('maximized');
                const maximizeBtn = w.querySelector('.dockable-view-maximize') as HTMLElement;
                const closeBtn = w.querySelector('.dockable-view-close') as HTMLElement;
                if (maximizeBtn) {
                    maximizeBtn.textContent = '□';
                }
                if (closeBtn) {
                    closeBtn.style.display = '';
                }
            }
        });

        // Re-activate the current window to update positions and z-indices
        const activeWindow = this.activeStackedWindow || parentWindow;
        this.activateStackedWindow(parentWindow, activeWindow === parentWindow ? null : activeWindow);
    }

    private addWindowControls(window: HTMLElement) {
        const maximize = window.querySelector('.dockable-view-maximize') as HTMLElement;
        const close = window.querySelector('.dockable-view-close') as HTMLElement;

        maximize?.addEventListener('click', () => {
            const isMaximized = window.classList.contains('maximized');
            
            // Update button text based on maximized state
            if (maximize) {
                maximize.textContent = isMaximized ? '□' : '_';
            }
            
            // Show/hide close button based on maximized state
            if (close) {
                close.style.display = isMaximized ? '' : 'none';
            }
            
            // Set maximized state for all windows in the stack
            this.setStackMaximizedState(window, !isMaximized);

            // Apply transition effects
            window.style.transition = 'all 0.2s ease';
            window.style.opacity = '0';
            window.style.transform = 'translateY(-20px)';

            requestAnimationFrame(() => {
                window.style.opacity = '1';
                window.style.transform = 'none';
            });

            setTimeout(() => {
                window.style.transition = '';
            }, 200);
        });

        close?.addEventListener('click', () => {
            // If maximized, restore first
            if (window.classList.contains('maximized')) {
                this.setStackMaximizedState(window, false);
                // Wait for restore animation to complete before closing
                setTimeout(() => this.closeWindow(window), 200);
                return;
            }
            this.closeWindow(window);
        });
    }

    private closeWindow(window: HTMLElement) {
        // Find the window's current width before removing it
        const windowWidth = window.offsetWidth;
        const containerWidth = this.container.offsetWidth;
        const widthPercent = (windowWidth / containerWidth) * 100;

        // Add transitioning class to all windows
        const allWindows = Array.from(this.container.children).filter(
            child => child instanceof HTMLElement && child.classList.contains('dockable-view-window')
        ) as HTMLElement[];
        allWindows.forEach(w => w.classList.add('transitioning'));

        // Check if this window has stacked windows and handle them
        const stackedWindows = this.stackedWindows.get(window.id) || [];
        if (stackedWindows.length > 0) {
            // Promote first stacked window to replace this one
            const newMainWindow = stackedWindows[0];
            stackedWindows.forEach(w => {
                // If this is the first window, promote it, otherwise stack it with the first one
                if (w === newMainWindow) {
                    w.removeAttribute('stacked');
                    w.classList.remove('stacked-window');
                    w.style.position = 'relative';
                    w.style.left = '';
                    w.style.top = '';
                    w.style.zIndex = '';
                    w.style.pointerEvents = 'auto';
                    w.style.opacity = '1';
                    w.style.width = window.style.width;
                    w.style.flex = window.style.flex;
                } else {
                    w.setAttribute('stacked', newMainWindow.id);
                }
            });
            
            // Create new stack under promoted window
            this.stackedWindows.delete(window.id);
            if (stackedWindows.length > 1) {
                const remainingWindows = stackedWindows.slice(1);
                this.stackedWindows.set(newMainWindow.id, remainingWindows);
                this.updateStackTabs(newMainWindow);
            }
        }

        // Remove the window
        window.remove();

        // Remove transitioning class after animation completes
        setTimeout(() => {
            Array.from(this.container.children).forEach(child => {
                if (child instanceof HTMLElement && child.classList.contains('dockable-view-window')) {
                    child.classList.remove('transitioning');
                }
            });
        }, 250);
        
        // Recalculate layout to properly redistribute space
        this.recalculateLayout();
    }

    private getStyles(): string {
        return `
            dockable-view {
                /* Default custom properties */
                --dockable-bg: #1e1e1e;
                --dockable-window-bg: #2d2d2d;
                --dockable-window-border: #404040;
                --dockable-header-bg: #333333;
                --dockable-header-border: #555555;
                --dockable-preview-bg: rgba(0, 150, 255, 0.2);
                --dockable-preview-border: 2px dashed #0096ff;
                --dockable-text-color: #ffffff;
                --dockable-header-padding: 10px;
                --dockable-content-padding: 0;
                --dockable-border-radius: 4px;
                --dockable-min-width: 200px;
                --dockable-min-height: 150px;
                --dockable-z-index: 1000;
                --dockable-maximized-offset: 1000;
                --dockable-splitter-size: 4px;
                --dockable-splitter-hover-size: 6px;
                --dockable-scrollbar-width: 12px;
                --dockable-transition-duration: inherit;
                --dockable-transition-timing: ease-out;
                --dockable-splitter-transition-duration: 0.1s;
                --dockable-stacked-z-index: 1;
                --dockable-inactive-z-index: -1;
                
                /* Tab styling properties */
                --dockable-tab-bg: rgba(255,255,255,0.1);
                --dockable-tab-hover-bg: rgba(255,255,255,0.15);
                --dockable-active-tab-bg: rgba(0, 150, 255, 0.2);
                --dockable-active-tab-border: 1px solid rgba(0, 150, 255, 0.5);
                --dockable-active-tab-indicator: 2px solid #0096ff;
                
                display: flex;
                flex-direction: column;
                width: 100%;
                height: 100%;
                position: relative;
                overflow: hidden;
                background: var(--dockable-bg);
                box-sizing: border-box;
            }

            /* Locked state styles - only affect headers, not splitters */
            dockable-view.locked .dockable-view-window-header {
                cursor: default !important;
            }
            
            /* Existing styles */
            .dockable-view-container {
                display: flex;
                flex: 1;
                width: 100%;
                position: relative;
                overflow: hidden;
                gap: 0;
                box-sizing: border-box;
            }

            .dockable-view-window {
                flex: 1;
                display: flex;
                flex-direction: column;
                background: var(--dockable-window-bg);
                border: 1px solid var(--dockable-window-border);
                border-radius: var(--dockable-border-radius);
                overflow: auto;
                min-width: var(--dockable-min-width);
                min-height: var(--dockable-min-height);
                box-sizing: border-box;
                scrollbar-width: thin;
                scrollbar-color: var(--dockable-window-border) var(--dockable-window-bg);
                will-change: transform, width, height, left, top, opacity;
                transition: all var(--dockable-transition-duration) var(--dockable-transition-timing);
                position: relative;
            }

            /* Add class to disable transitions during resize */
            .dockable-view-window.resizing {
                transition: none !important;
                will-change: width;
            }

            .dockable-view-window.transitioning {
                transition: all var(--dockable-transition-duration) var(--dockable-transition-timing) !important;
            }

            .dockable-view-window.maximized {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                width: 100% !important;
                height: 100% !important;
                border-radius: 0 !important;
                transform: none !important;
                opacity: 1 !important;
                margin: 0 !important;
                padding: var(--dockable-content-padding) !important;
            }

            .dockable-view-window.maximized .dockable-view-window-header {
                position: sticky;
                top: 0;
                margin: calc(var(--dockable-spacing) * -1);
                margin-bottom: var(--dockable-spacing);
                cursor: default;
            }

            .dockable-view-window.maximized ~ .stacked-window {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                width: 100% !important;
                height: 100% !important;
                margin: 0 !important;
                padding: var(--dockable-content-padding) !important;
            }

            .dockable-view-window.maximized .dockable-view-maximize {
                content: '_';
            }

            .dockable-view-window.maximized .dockable-view-close {
                display: none;
            }

            .dockable-view-window.dragging {
                position: absolute;
                transition: none !important;
                pointer-events: none;
            }

            .dockable-view-window.dragging.initial {
                left: 0;
                top: 0;
            }

            .dockable-view-window::-webkit-scrollbar {
                width: var(--dockable-scrollbar-width);
                height: var(--dockable-scrollbar-width);
            }

            .dockable-view-window::-webkit-scrollbar-track {
                background: var(--dockable-window-bg);
            }

            .dockable-view-window::-webkit-scrollbar-thumb {
                background-color: var(--dockable-window-border);
                border-radius: var(--dockable-border-radius);
                border: 3px solid var(--dockable-window-bg);
            }

            .dockable-view-window-header {
                padding: var(--dockable-header-padding);
                background: var(--dockable-header-bg);
                border-bottom: 1px solid var(--dockable-header-border);
                cursor: move;
                display: flex;
                justify-content: space-between;
                align-items: center;
                user-select: none;
                margin: calc(var(--dockable-spacing) * -1);
                margin-bottom: var(--dockable-spacing);
                position: sticky;
                top: calc(var(--dockable-spacing) * -1);
                z-index: 2;
                transition: opacity 0.2s ease;
                gap: var(--dockable-spacing);
                height: 40px;
                box-sizing: border-box;
            }

            .dockable-view-window:hover .dockable-view-window-header {
                opacity: 1;
                pointer-events: auto;
            }

            .dockable-view-window-title {
                font-weight: bold;
                color: var(--dockable-text-color);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                padding: 0;
                pointer-events: none;
                height: 28px;
                display: flex;
                align-items: center;
                box-sizing: border-box;
                font-size: 12px;
            }

            .dockable-view-window-controls button {
                background: none;
                border: none;
                padding: 2px 5px;
                cursor: pointer;
                font-size: 16px;
                line-height: 1;
                color: var(--dockable-text-color);
            }

            .dockable-view-window-controls button:hover {
                background: var(--dockable-window-border);
            }

            .dockable-view-preview {
                position: absolute;
                background: var(--dockable-preview-bg);
                border: var(--dockable-preview-border);
                pointer-events: none;
                z-index: calc(var(--dockable-z-index) + var(--dockable-maximized-offset) + 50);
                box-sizing: border-box;
            }

            .window-splitter {
                width: var(--dockable-splitter-size);
                background: var(--dockable-splitter-color);
                cursor: ew-resize;
                flex: 0 0 auto;
                /* Remove transition from width to make drag more responsive */
                transition: background var(--dockable-splitter-transition-duration) ease;
                will-change: width;
            }

            .window-splitter:hover {
                width: var(--dockable-splitter-hover-size);
                background: var(--dockable-splitter-hover-color);
            }

            .drag-ghost {
                position: absolute;
                pointer-events: none;
                opacity: 0.6;
                z-index: calc(var(--dockable-z-index) + var(--dockable-maximized-offset) + 100);
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                background: var(--dockable-window-bg);
            }

            .stack-highlight {
                box-shadow: 0 0 0 2px var(--dockable-preview-border);
                background: var(--dockable-preview-bg) !important;
            }

            .stacked-window {
                position: absolute !important;
                pointer-events: none !important;
                margin: 0 !important;
                padding: var(--dockable-spacing) !important;
                box-sizing: border-box !important;
                transition: all var(--dockable-transition-duration) var(--dockable-transition-timing) !important;
                background: var(--dockable-window-bg) !important;
                border: 1px solid var(--dockable-window-border) !important;
                border-radius: var(--dockable-border-radius) !important;
                opacity: 0;
                z-index: -1;
            }

            .stacked-window .dockable-view-window-header {
                opacity: 1 !important;
                pointer-events: auto !important;
            }

            .stacked-window.active {
                pointer-events: auto !important;
                opacity: 1 !important;
            }

            .dockable-view-stack-tabs {
                display: flex;
                gap: 4px;
                align-items: center;
                pointer-events: auto !important;
                z-index: 2;
                opacity: 1 !important;
                flex: 1;
                overflow-x: auto;
                scrollbar-width: none;
                -ms-overflow-style: none;
                height: 28px;
                min-width: 100px;
            }

            .dockable-view-stack-tabs::-webkit-scrollbar {
                display: none;
            }

            .dockable-view-stack-tab {
                padding: 0 12px;
                cursor: pointer;
                background: var(--dockable-tab-bg);
                border-radius: 3px;
                font-size: 12px;
                color: var(--dockable-text-color);
                user-select: none;
                transition: all 0.2s ease;
                pointer-events: auto !important;
                white-space: nowrap;
                border: 1px solid transparent;
                font-weight: bold;
                height: 28px;
                display: flex;
                align-items: center;
                box-sizing: border-box;
                position: relative;
            }

            .dockable-view-stack-tab:hover {
                background: var(--dockable-tab-hover-bg);
            }

            .dockable-view-stack-tab.active {
                background: var(--dockable-active-tab-bg) !important;
                border: var(--dockable-active-tab-border) !important;
                position: relative;
                box-shadow: 0 0 4px rgba(0, 150, 255, 0.3);
            }
            
            .dockable-view-stack-tab.active::after {
                content: '';
                position: absolute;
                bottom: -1px;
                left: 0;
                right: 0;
                height: 2px;
                background: #0096ff;
                background: linear-gradient(to right, transparent 0%, #0096ff 20%, #0096ff 80%, transparent 100%);
            }

            .dockable-view-window-controls {
                display: flex;
                gap: 4px;
                align-items: center;
                height: 28px;
            }

            .dockable-view-window-controls button {
                height: 28px;
                width: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 3px;
            }

            .dockable-view-window-content {
                flex: 1 1 auto;
                width: 100%;
                box-sizing: border-box;
                padding: var(--dockable-content-padding);
            }

            /* Removing the locked style for splitters since they should always be functional */
        `;
    }

    /**
     * Get the state key for this dockable-view instance
     */
    private getStateKey(): string {
        return `dockable-view-state-${this.id || 'default'}`;
    }

    /**
     * Save current state to localStorage
     */
    private saveState() {
        const state = this.getState();
        localStorage.setItem(this.getStateKey(), JSON.stringify(state));
        console.log('DockableView: State saved', state);
    }

    /**
     * Get the current state of all windows
     */
    public getState(): any {
        const windows = Array.from(this.container.children).filter(
            child => child instanceof HTMLElement && 
            child.classList.contains('dockable-view-window')
        ) as HTMLElement[];

        const windowStates = windows.map((window, index) => {
            // Get the computed width as a percentage for better restoration
            const computedWidth = window.getBoundingClientRect().width;
            const containerWidth = this.container.getBoundingClientRect().width;
            const widthPercent = containerWidth > 0 ? (computedWidth / containerWidth) * 100 : 0;
            
            return {
                id: window.id,
                title: window.getAttribute('title') || '',
                width: `${widthPercent}%`, // Store as percentage for responsive restoration
                minWidth: window.getAttribute('min-width') || '200px',
                controlbox: window.getAttribute('controlbox'),
                maximized: window.classList.contains('maximized'),
                stacked: window.getAttribute('stacked') || null,
                order: index // Use the actual current DOM order
            };
        });

        // Convert Map to plain object, storing element IDs instead of HTMLElements
        const stackedWindowsObj: any = {};
        this.stackedWindows.forEach((windowArray, key) => {
            stackedWindowsObj[key] = windowArray.map(window => window.id);
        });

        return {
            windows: windowStates,
            stackedWindows: stackedWindowsObj,
            activeStackedWindow: this.activeStackedWindow?.id || null,
            locked: this.locked,
            allowStacking: this.allowStacking
        };
    }

    /**
     * Restore state from saved data
     */
    public restoreState(state?: any) {
        // Don't restore state during active resize operations
        if (this.isResizing) {
            console.log('DockableView: Skipping state restoration during resize');
            return;
        }

        if (!state) {
            const saved = localStorage.getItem(this.getStateKey());
            if (!saved) {
                console.log('DockableView: No saved state found');
                return;
            }
            
            try {
                state = JSON.parse(saved);
                console.log('DockableView: Restoring state', state);
            } catch (e) {
                console.warn('Failed to parse saved dockable-view state:', e);
                return;
            }
        }

        if (!state.windows) {
            console.log('DockableView: No windows in saved state');
            return;
        }

        // Restore component-level properties
        if (typeof state.locked === 'boolean') {
            this.locked = state.locked;
            if (state.locked) {
                this.setAttribute('locked', '');
            } else {
                this.removeAttribute('locked');
            }
        }

        if (typeof state.allowStacking === 'boolean') {
            this.allowStacking = state.allowStacking;
            if (!state.allowStacking) {
                this.setAttribute('allow-stacking', 'false');
            } else {
                this.removeAttribute('allow-stacking');
            }
        }

        // Find existing windows and update their attributes
        const existingWindows = Array.from(this.container.children).filter(
            child => child instanceof HTMLElement && 
            child.classList.contains('dockable-view-window')
        ) as HTMLElement[];

        console.log('DockableView: Found existing windows', existingWindows.map(w => w.id));

        // Create a map of existing windows by ID
        const windowMap = new Map<string, HTMLElement>();
        existingWindows.forEach(window => {
            if (window.id) {
                windowMap.set(window.id, window);
            }
        });

        // Sort state windows by their saved order
        const sortedStateWindows = state.windows.sort((a: any, b: any) => a.order - b.order);
        console.log('DockableView: Restoring window order', sortedStateWindows.map((w: any) => ({ id: w.id, order: w.order })));

        // Apply state to existing windows
        sortedStateWindows.forEach((windowState: any) => {
            const window = windowMap.get(windowState.id);
            if (window) {
                // Update attributes
                if (windowState.title) {
                    window.setAttribute('title', windowState.title);
                }
                if (windowState.width) {
                    window.setAttribute('width', windowState.width);
                    window.style.width = windowState.width;
                }
                if (windowState.minWidth) {
                    window.setAttribute('min-width', windowState.minWidth);
                }
                if (windowState.controlbox !== undefined) {
                    window.setAttribute('controlbox', windowState.controlbox);
                }
                if (windowState.stacked) {
                    window.setAttribute('stacked', windowState.stacked);
                }

                // Apply maximized state
                if (windowState.maximized) {
                    window.classList.add('maximized');
                    // Update maximize button
                    const maximizeBtn = window.querySelector('.dockable-view-maximize') as HTMLElement;
                    if (maximizeBtn) {
                        maximizeBtn.textContent = '_';
                    }
                    // Hide close button when maximized
                    const closeBtn = window.querySelector('.dockable-view-close') as HTMLElement;
                    if (closeBtn) {
                        closeBtn.style.display = 'none';
                    }
                } else {
                    window.classList.remove('maximized');
                    // Update maximize button
                    const maximizeBtn = window.querySelector('.dockable-view-maximize') as HTMLElement;
                    if (maximizeBtn) {
                        maximizeBtn.textContent = '□';
                    }
                    // Show close button when not maximized
                    const closeBtn = window.querySelector('.dockable-view-close') as HTMLElement;
                    if (closeBtn) {
                        closeBtn.style.display = '';
                    }
                }
            }
        });

        // Restore window order by reordering DOM elements
        const orderedWindows: HTMLElement[] = [];
        sortedStateWindows.forEach((windowState: any) => {
            const window = windowMap.get(windowState.id);
            if (window && !window.hasAttribute('stacked')) {
                orderedWindows.push(window);
            }
        });

        console.log('DockableView: Reordering windows to', orderedWindows.map(w => w.id));

        // Remove all splitters first
        Array.from(this.container.children).forEach(child => {
            if (child instanceof HTMLElement && child.classList.contains('window-splitter')) {
                child.remove();
            }
        });

        // Reorder windows in the container
        orderedWindows.forEach((window, index) => {
            this.container.appendChild(window);
        });

        // Add splitters between windows
        orderedWindows.forEach((window, index) => {
            if (index < orderedWindows.length - 1) {
                this.addSplitter(window);
            }
        });

        // Restore stacked windows relationships without using Object.entries
        if (state.stackedWindows) {
            this.stackedWindows = new Map();
            for (const key in state.stackedWindows) {
                if (state.stackedWindows.hasOwnProperty(key)) {
                    const windowIds = state.stackedWindows[key];
                    if (Array.isArray(windowIds)) {
                        const windowElements = windowIds.map((id: string) => windowMap.get(id)).filter(Boolean) as HTMLElement[];
                        this.stackedWindows.set(key, windowElements);
                    }
                }
            }
        }

        // Restore active stacked window
        if (state.activeStackedWindow) {
            this.activeStackedWindow = windowMap.get(state.activeStackedWindow) || null;
        }

        // Restore stacked window relationships by calling stackWindow
        if (state.stackedWindows) {
            for (const parentId in state.stackedWindows) {
                if (state.stackedWindows.hasOwnProperty(parentId)) {
                    const parentWindow = windowMap.get(parentId);
                    const stackedWindowIds = state.stackedWindows[parentId];
                    
                    if (parentWindow && Array.isArray(stackedWindowIds)) {
                        stackedWindowIds.forEach((stackedId: string) => {
                            const stackedWindow = windowMap.get(stackedId);
                            if (stackedWindow) {
                                // Re-stack the window to ensure proper setup
                                this.stackWindow(stackedWindow, parentWindow);
                            }
                        });
                    }
                }
            }
        }

        // Force a re-layout to apply the restored state
        requestAnimationFrame(() => {
            this.updateLockedState();
            this.recalculateLayout();
            console.log('DockableView: State restoration complete');
        });
    }

    /**
     * Recreate splitters between windows
     */
    private recreateSplitters() {
        // Remove existing splitters
        Array.from(this.container.children).forEach(child => {
            if (child instanceof HTMLElement && child.classList.contains('window-splitter')) {
                child.remove();
            }
        });

        // Get non-stacked windows
        const windows = Array.from(this.container.children).filter(child => 
            child instanceof HTMLElement && 
            child.classList.contains('dockable-view-window') &&
            !child.hasAttribute('stacked')
        ) as HTMLElement[];

        // Add splitters between windows
        windows.forEach((window, index) => {
            if (index < windows.length - 1) {
                this.addSplitter(window);
            }
        });
    }
}

// Register the custom element
customElements.define('dockable-view', DockableView); 