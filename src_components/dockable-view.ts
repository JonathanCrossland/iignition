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
    private dragStartState: {
        nextSibling: Element | null;
        width: string;
        height: string;
        position: string;
        left: string;
        top: string;
        flex: string;
    } | null = null;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = this.getStyles();
        this.shadowRoot!.appendChild(style);

        // Create main container
        this.container = document.createElement('div');
        this.container.className = 'dock-container';
        this.shadowRoot!.appendChild(this.container);

        // Create dock preview element
        this.dockPreview = document.createElement('div');
        this.dockPreview.className = 'dock-preview';
        this.dockPreview.style.display = 'none';
        this.shadowRoot!.appendChild(this.dockPreview);

        // Add resize event listeners
        document.addEventListener('mousemove', this.handleResize.bind(this));
        document.addEventListener('mouseup', this.endResize.bind(this));
    }

    connectedCallback() {
        // Move all direct children to the container in shadow DOM
        const children = Array.from(this.children).filter(child => child instanceof HTMLElement) as HTMLElement[];
        
        // First ensure all windows have IDs and are made dockable
        children.forEach((child, index) => {
            if (!child.id) {
                child.id = `dock-window-${index + 1}`;
            }
            this.makeDockable(child);
        });
        
        // Calculate total width and set initial widths
        const totalWidth = 100;
        let remainingWidth = totalWidth;
        let windowsWithWidth = 0;
        
        // First pass: count windows with explicit width
        children.forEach(child => {
            const width = child.getAttribute('width');
            if (width) {
                windowsWithWidth++;
                remainingWidth -= parseFloat(width);
            }
        });
        
        // Second pass: set widths
        children.forEach(child => {
            const width = child.getAttribute('width');
            if (width) {
                child.style.width = width;
                child.style.flex = '0 0 auto';
            } else {
                // Make windows without explicit width flexible to fill remaining space
                child.style.width = 'auto';
                child.style.flex = '1 1 auto';
            }
            
            // Add to container
            this.container.appendChild(child);
            
            // Add splitter after each window except the last one
            if (child !== children[children.length - 1]) {
                this.addSplitter(child);
            }
        });
        
        // Add global event listeners
        document.addEventListener('mousemove', this.handleDrag.bind(this));
        document.addEventListener('mouseup', this.handleDrop.bind(this));
    }

    disconnectedCallback() {
        document.removeEventListener('mousemove', this.handleDrag.bind(this));
        document.removeEventListener('mouseup', this.handleDrop.bind(this));
    }

    private makeDockable(element: HTMLElement) {
        // Add window class and make draggable
        element.classList.add('dock-window');
        
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
        
        // Create header if not exists
        if (!element.querySelector('.window-header')) {
            const header = document.createElement('div');
            header.className = 'window-header';
            header.innerHTML = `
                <span class="window-title">${element.getAttribute('title') || 'Window'}</span>
                <span class="window-controls">
                    <button class="maximize">□</button>
                    <button class="close">×</button>
                </span>
            `;
            element.insertBefore(header, element.firstChild);
        }

        // Make header draggable
        const header = element.querySelector('.window-header')!;
        header.addEventListener('mousedown', (e: MouseEvent) => this.startDrag(e, element));
        
        // Add control handlers
        this.addWindowControls(element);
    }

    private startDrag(e: MouseEvent, window: HTMLElement) {
        if (e.target instanceof HTMLElement && 
            (e.target.classList.contains('maximize') || 
             e.target.classList.contains('close'))) {
            return;
        }

        this.draggingWindow = window;
        const containerRect = this.container.getBoundingClientRect();
        const windowRect = window.getBoundingClientRect();
        
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
        
        // Calculate offset from mouse to window edges
        this.dragOffset = {
            x: e.clientX - windowRect.left,
            y: e.clientY - windowRect.top
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
        
        // Make original window semi-transparent during drag only
        window.style.opacity = '0.3';
        
        // Set initial ghost position
        const x = e.clientX - containerRect.left - this.dragOffset.x;
        const y = e.clientY - containerRect.top - this.dragOffset.y;
        this.dragGhost.style.transform = `translate(${x}px, ${y}px)`;
    }

    private handleDrag(e: MouseEvent) {
        if (!this.draggingWindow || !this.dragGhost) return;

        const containerRect = this.container.getBoundingClientRect();
        
        // Update ghost position
        const x = e.clientX - containerRect.left - this.dragOffset.x;
        const y = e.clientY - containerRect.top - this.dragOffset.y;
        this.dragGhost.style.transform = `translate(${x}px, ${y}px)`;

        // Show dock preview if near edges
        this.updateDockPreview(e);
    }

    private updateDockPreview(e: MouseEvent) {
        if (!this.draggingWindow || !this.dockPreview) return;

        const containerRect = this.getBoundingClientRect();
        
        // Check if near left or right edge
        const nearLeft = e.clientX < containerRect.left + 50;
        const nearRight = e.clientX > containerRect.right - 50;
        
        // Find if we're near a splitter
        const splitters = Array.from(this.container.children).filter(
            child => child instanceof HTMLElement && child.classList.contains('window-splitter')
        ) as HTMLElement[];

        let targetSplitter: HTMLElement | null = null;
        let leftWindow: HTMLElement | null = null;
        let rightWindow: HTMLElement | null = null;

        for (const splitter of splitters) {
            const splitterRect = splitter.getBoundingClientRect();
            // Check if mouse is within 25px of splitter center
            if (Math.abs(e.clientX - (splitterRect.left + splitterRect.width / 2)) < 25) {
                targetSplitter = splitter;
                // Get the windows on either side of the splitter
                let current = splitter.previousElementSibling;
                while (current && (!(current instanceof HTMLElement) || !current.classList.contains('dock-window'))) {
                    current = current.previousElementSibling;
                }
                leftWindow = current as HTMLElement;

                current = splitter.nextElementSibling;
                while (current && (!(current instanceof HTMLElement) || !current.classList.contains('dock-window'))) {
                    current = current.nextElementSibling;
                }
                rightWindow = current as HTMLElement;
                break;
            }
        }
        
        if (nearLeft || nearRight || targetSplitter) {
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
                delete this.dockPreview.dataset.leftWindowId;
                delete this.dockPreview.dataset.rightWindowId;
            } else if (nearRight) {
                this.dockPreview.style.width = `${widthPercent}%`;
                const previewWidthPixels = containerRect.width * (widthPercent / 100);
                this.dockPreview.style.left = `${containerRect.width - previewWidthPixels}px`;
                this.dockPreview.dataset.dockPosition = 'right';
                delete this.dockPreview.dataset.leftWindowId;
                delete this.dockPreview.dataset.rightWindowId;
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
                
                console.log('Dock preview between windows:', {
                    leftWindowId: leftWindow.id,
                    rightWindowId: rightWindow.id,
                    draggingWindowId: this.draggingWindow.id
                });
            }
        } else {
            this.dockPreview.style.display = 'none';
            delete this.dockPreview.dataset.dockPosition;
            delete this.dockPreview.dataset.leftWindowId;
            delete this.dockPreview.dataset.rightWindowId;
        }
    }

    private addSplitter(window: HTMLElement) {
        const splitter = document.createElement('div');
        splitter.className = 'window-splitter';
        splitter.addEventListener('mousedown', (e: MouseEvent) => this.startResize(e, splitter));
        window.insertAdjacentElement('afterend', splitter);
    }

    private startResize(e: MouseEvent, splitter: HTMLElement) {
        e.preventDefault();
        this.resizingSplitter = splitter;
        
        // Store the mouse position with a 19px offset to the right
        this.resizeStartX = e.clientX + 19;

        // Find the windows immediately before and after the splitter
        const leftWindow = splitter.previousElementSibling as HTMLElement;
        const rightWindow = splitter.nextElementSibling as HTMLElement;

        this.adjacentWindows = {
            left: leftWindow?.classList.contains('dock-window') ? leftWindow : null,
            right: rightWindow?.classList.contains('dock-window') ? rightWindow : null
        };

        // Store initial positions and widths in pixels
        if (this.adjacentWindows.left) {
            const leftRect = this.adjacentWindows.left.getBoundingClientRect();
            this.adjacentWindows.left.dataset.initialWidth = leftRect.width.toString();
        }
        if (this.adjacentWindows.right) {
            const rightRect = this.adjacentWindows.right.getBoundingClientRect();
            this.adjacentWindows.right.dataset.initialWidth = rightRect.width.toString();
        }

        document.body.style.cursor = 'ew-resize';
    }

    private handleResize(e: MouseEvent) {
        if (!this.resizingSplitter || !this.adjacentWindows.left || !this.adjacentWindows.right) return;

        const containerWidth = this.container.offsetWidth;
        const deltaX = e.clientX - this.resizeStartX;

        // Get initial widths in pixels
        const leftInitialWidth = parseInt(this.adjacentWindows.left.dataset.initialWidth || '0');
        const rightInitialWidth = parseInt(this.adjacentWindows.right.dataset.initialWidth || '0');
        const totalInitialWidth = leftInitialWidth + rightInitialWidth;

        // Get min widths from attributes or use default
        const leftMinWidth = parseInt(this.adjacentWindows.left.getAttribute('min-width') || '200');
        const rightMinWidth = parseInt(this.adjacentWindows.right.getAttribute('min-width') || '200');

        // Calculate new widths in pixels
        let newLeftWidth = leftInitialWidth + deltaX;
        let newRightWidth = rightInitialWidth - deltaX;

        // Ensure we don't go below min widths
        if (newLeftWidth < leftMinWidth) {
            newLeftWidth = leftMinWidth;
            newRightWidth = totalInitialWidth - leftMinWidth;
        } else if (newRightWidth < rightMinWidth) {
            newRightWidth = rightMinWidth;
            newLeftWidth = totalInitialWidth - rightMinWidth;
        }

        // Convert to percentages
        const leftPercent = (newLeftWidth / containerWidth) * 100;
        const rightPercent = (newRightWidth / containerWidth) * 100;

        // Update window widths
        this.adjacentWindows.left.style.width = `${leftPercent}%`;
        this.adjacentWindows.right.style.width = `${rightPercent}%`;
        this.adjacentWindows.left.style.flex = '0 0 auto';
        this.adjacentWindows.right.style.flex = '0 0 auto';

        // Remove all existing splitters
        Array.from(this.container.children).forEach(child => {
            if (child instanceof HTMLElement && child.classList.contains('window-splitter')) {
                child.remove();
            }
        });

        // Get updated list of all windows in order
        const allWindows = Array.from(this.container.children).filter(
            child => child instanceof HTMLElement && child.classList.contains('dock-window')
        ) as HTMLElement[];

        // Add splitters between all windows
        allWindows.forEach((window, index) => {
            if (index < allWindows.length - 1) {
                this.addSplitter(window);
            }
        });
    }

    private endResize() {
        if (!this.resizingSplitter) return;
        
        // Clear stored data
        if (this.adjacentWindows.left) {
            delete this.adjacentWindows.left.dataset.initialWidth;
        }
        if (this.adjacentWindows.right) {
            delete this.adjacentWindows.right.dataset.initialWidth;
        }
        
        this.resizingSplitter = null;
        this.adjacentWindows = { left: null, right: null };
        document.body.style.cursor = '';
    }

    private handleDrop(e: MouseEvent) {
        if (!this.draggingWindow || !this.dockPreview) return;

        // Remove ghost element
        this.dragGhost?.remove();
        this.dragGhost = null;

        // Always restore opacity first
        this.draggingWindow.style.opacity = '';

        const dockPosition = this.dockPreview.dataset.dockPosition;
        
        if (dockPosition) {
            // Get all current windows
            const allWindows = Array.from(this.container.children).filter(
                child => child instanceof HTMLElement && 
                child.classList.contains('dock-window')
            ) as HTMLElement[];

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
                        if (window.id === leftWindowId) {
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

            // Set final positions for all windows simultaneously
            newWindowOrder.forEach((window, index) => {
                const finalLeft = (index * 100) / newWindowOrder.length;
                window.style.left = `${finalLeft}%`;
                window.style.position = 'absolute'; // Ensure absolute positioning during transition
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
            }, durationMs);
        } else if (this.dragStartState) {
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

            // Restore the window to its exact original state
            this.draggingWindow.style.position = this.dragStartState.position;
            this.draggingWindow.style.width = this.dragStartState.width;
            this.draggingWindow.style.height = this.dragStartState.height;
            this.draggingWindow.style.left = this.dragStartState.left;
            this.draggingWindow.style.top = this.dragStartState.top;
            this.draggingWindow.style.flex = this.dragStartState.flex;
            this.draggingWindow.style.transform = 'none';

            // Restore the window to its original position in the DOM
            if (this.dragStartState.nextSibling) {
                this.container.insertBefore(this.draggingWindow, this.dragStartState.nextSibling);
            } else {
                this.container.appendChild(this.draggingWindow);
            }

            // Remove transitioning class after animation
            setTimeout(() => {
                this.draggingWindow?.classList.remove('transitioning');
                if (this.draggingWindow) {
                    this.draggingWindow.style.opacity = ''; // Ensure opacity is cleared
                }
            }, durationMs);
        }

        // Clean up dragging state
        this.dragStartState = null;
        this.draggingWindow = null;
        this.dockPreview.style.display = 'none';
        delete this.dockPreview.dataset.dockPosition;
        delete this.dockPreview.dataset.leftWindowId;
        delete this.dockPreview.dataset.rightWindowId;
    }

    private addWindowControls(window: HTMLElement) {
        const maximize = window.querySelector('.maximize') as HTMLElement;
        const close = window.querySelector('.close') as HTMLElement;

        maximize?.addEventListener('click', () => {
            if (window.classList.contains('maximized')) {
                // Restoring from maximized
                window.classList.remove('maximized');
                window.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
                window.style.opacity = '0';
                window.style.transform = 'translateY(-20px)';

                setTimeout(() => {
                    window.style.transition = 'none';
                    window.style.opacity = '1';
                    window.style.transform = 'none';
                }, 200);
            } else {
                // Maximizing
                window.classList.add('maximized');
                window.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
                window.style.opacity = '0';
                window.style.transform = 'translateY(-20px)';

                requestAnimationFrame(() => {
                    window.style.opacity = '1';
                    window.style.transform = 'translateY(0)';
                });
            }
        });

        close?.addEventListener('click', () => {
            // Find the window's current width before removing it
            const windowWidth = window.offsetWidth;
            const containerWidth = this.container.offsetWidth;
            const widthPercent = (windowWidth / containerWidth) * 100;

            // Find the nearest window to resize, skipping splitters
            let windowToResize: HTMLElement | null = null;
            let currentElement = window.previousElementSibling;
            
            // Look for previous window
            while (currentElement) {
                if (currentElement.classList.contains('dock-window')) {
                    windowToResize = currentElement as HTMLElement;
                    break;
                }
                currentElement = currentElement.previousElementSibling;
            }

            // If no previous window found, look for next window
            if (!windowToResize) {
                currentElement = window.nextElementSibling;
                while (currentElement) {
                    if (currentElement.classList.contains('dock-window')) {
                        windowToResize = currentElement as HTMLElement;
                        break;
                    }
                    currentElement = currentElement.nextElementSibling;
                }
            }

            // Add transitioning class to all windows
            const allWindows = Array.from(this.container.children).filter(
                child => child instanceof HTMLElement && child.classList.contains('dock-window')
            ) as HTMLElement[];
            allWindows.forEach(w => w.classList.add('transitioning'));

            // Remove the window
            window.remove();

            // If we found a window to resize, increase its width
            if (windowToResize) {
                const currentWidth = windowToResize.offsetWidth;
                const newWidthPercent = ((currentWidth + windowWidth) / containerWidth) * 100;
                windowToResize.style.width = `${newWidthPercent}%`;
            }

            // Clean up any orphaned splitters
            const firstChild = this.container.firstElementChild;
            const lastChild = this.container.lastElementChild;
            
            if (firstChild?.classList.contains('window-splitter')) {
                firstChild.remove();
            }
            if (lastChild?.classList.contains('window-splitter')) {
                lastChild.remove();
            }

            // Recreate splitters between remaining windows
            const remainingWindows = Array.from(this.container.children).filter(
                child => child instanceof HTMLElement && child.classList.contains('dock-window')
            ) as HTMLElement[];

            // Remove all existing splitters
            Array.from(this.container.children).forEach(child => {
                if (child instanceof HTMLElement && child.classList.contains('window-splitter')) {
                    child.remove();
                }
            });

            // Add new splitters between remaining windows
            remainingWindows.forEach((window, index) => {
                if (index < remainingWindows.length - 1) {
                    this.addSplitter(window);
                }
            });

            // Remove transitioning class after animation completes
            setTimeout(() => {
                remainingWindows.forEach(w => {
                    w.classList.remove('transitioning');
                });
            }, 250);
        });
    }

    private getStyles(): string {
        return `
            :host {
                /* Default custom properties */
                --dockable-bg: #1e1e1e;
                --dockable-window-bg: #2d2d2d;
                --dockable-window-border: #404040;
                --dockable-header-bg: #333333;
                --dockable-header-border: #555555;
                --dockable-preview-bg: rgba(0, 120, 215, 0.2);
                --dockable-preview-border: 2px dashed #0078d7;
                --dockable-text-color: #ffffff;
                --dockable-spacing: 10px;
                --dockable-border-radius: 4px;
                --dockable-min-width: 200px;
                --dockable-min-height: 150px;
                --dockable-z-index: 1000;
                --dockable-splitter-size: 4px;
                --dockable-splitter-hover-size: 6px;
                --dockable-scrollbar-width: 12px;
                --dockable-transition-duration: inherit;
                --dockable-transition-timing: ease-out;
                --dockable-splitter-transition-duration: 0.1s;
                
                display: flex;
                flex-direction: column;
                width: 100%;
                height: 100%;
                position: relative;
                overflow: hidden;
                background: var(--dockable-bg);
                box-sizing: border-box;
            }

            .dock-container {
                display: flex;
                flex: 1;
                width: 100%;
                position: relative;
                overflow: hidden;
                gap: 0;
                box-sizing: border-box;
            }

            .dock-window {
                flex: 1;
                display: flex;
                flex-direction: column;
                background: var(--dockable-window-bg);
                border: 1px solid var(--dockable-window-border);
                border-radius: var(--dockable-border-radius);
                overflow: auto;
                min-width: var(--dockable-min-width);
                min-height: var(--dockable-min-height);
                padding: var(--dockable-spacing);
                box-sizing: border-box;
                scrollbar-width: thin;
                scrollbar-color: var(--dockable-window-border) var(--dockable-window-bg);
                will-change: transform, width, height, left, top, opacity;
                transition: none;
            }

            .dock-window.transitioning {
                transition: all var(--dockable-transition-duration) var(--dockable-transition-timing) !important;
            }

            .dock-window.maximized {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                width: 100% !important;
                height: 100% !important;
                z-index: var(--dockable-z-index) !important;
                border-radius: 0 !important;
                transform: translateY(0) !important;
                opacity: 1 !important;
            }

            .dock-window.dragging {
                position: absolute;
                transition: none !important;
                pointer-events: none;
            }

            .dock-window.dragging.initial {
                left: 0;
                top: 0;
            }

            .dock-window::-webkit-scrollbar {
                width: var(--dockable-scrollbar-width);
                height: var(--dockable-scrollbar-width);
            }

            .dock-window::-webkit-scrollbar-track {
                background: var(--dockable-window-bg);
            }

            .dock-window::-webkit-scrollbar-thumb {
                background-color: var(--dockable-window-border);
                border-radius: var(--dockable-border-radius);
                border: 3px solid var(--dockable-window-bg);
            }

            .window-header {
                padding: var(--dockable-spacing);
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
                z-index: 1;
                opacity: 0;
                transition: opacity 0.2s ease;
                pointer-events: none;
            }

            .dock-window:hover .window-header {
                opacity: 1;
                pointer-events: auto;
            }

            .window-title {
                font-weight: bold;
                color: var(--dockable-text-color);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .window-controls button {
                background: none;
                border: none;
                padding: 2px 5px;
                cursor: pointer;
                font-size: 16px;
                line-height: 1;
                color: var(--dockable-text-color);
            }

            .window-controls button:hover {
                background: var(--dockable-window-border);
            }

            .dock-preview {
                position: absolute;
                background: var(--dockable-preview-bg);
                border: var(--dockable-preview-border);
                pointer-events: none;
                z-index: var(--dockable-z-index);
                box-sizing: border-box;
            }

            .window-splitter {
                width: var(--dockable-splitter-size);
                background: var(--dockable-window-border);
                cursor: ew-resize;
                flex: 0 0 auto;
                transition: width var(--dockable-splitter-transition-duration) ease,
                           background var(--dockable-splitter-transition-duration) ease;
            }

            .window-splitter:hover {
                width: var(--dockable-splitter-hover-size);
                background: var(--dockable-header-border);
            }

            .drag-ghost {
                position: absolute;
                pointer-events: none;
                opacity: 0.6;
                z-index: var(--dockable-z-index);
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }
        `;
    }
}

// Register the custom element
customElements.define('dockable-view', DockableView); 