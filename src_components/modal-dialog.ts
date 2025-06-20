class ModalDialog extends HTMLElement {
    private _modal: HTMLElement;
    private _modalContainer: HTMLElement;
    private _header: HTMLElement;
    private _title: HTMLElement;
    private _content: HTMLElement;
    private _footer: HTMLElement;
    private _closeButton: HTMLButtonElement;
    private _okButton: HTMLButtonElement;
    private _cancelButton: HTMLButtonElement;
    private _isDragging: boolean = false;
    private _dragStartX: number = 0;
    private _dragStartY: number = 0;
    private _modalStartX: number = 0;
    private _modalStartY: number = 0;
    private _dragOffsetX: number = 0;
    private _dragOffsetY: number = 0;
    private _originalParent: Element | null = null;
    private _resizeObserver: ResizeObserver;
    private _boundHandleResize: () => void;


    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        const style = document.createElement('style');
     
        // Modal container styles
        style.textContent = `
         .modal {
            display: flex;
            flex-direction: column;
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: var(--modal-overlay-bg, rgba(0, 0, 0, 0.5));
            justify-content: center;
            align-items: center;
            visibility: hidden;
            z-index: var(--modal-z-index, 1500);
        }
        .modal-container {
            background-color: var(--modal-bg, #fff);
            color: var(--modal-color, #333333);
            max-width: var(--modal-max-width, min(90%, 600px));
            max-height: var(--modal-max-height, 80vh);
            width: calc(100% - 30px);
            border-radius: var(--modal-border-radius, 5px);
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            transition: left 0.1s ease, top 0.1s ease;
            will-change: left, top, transform, opacity;
            box-shadow: var(--modal-shadow, 0 4px 6px rgba(0, 0, 0, 0.1));
            display: flex;
            flex-direction: column;
            min-width: min(300px, 90vw);
            min-height: min(200px, 90vh);
            overflow: hidden;
        }
        .modal-content {
            display: flex;
            flex-direction: column;
            padding: var(--modal-padding, 10px);
            overflow-y: auto;
            overflow-x: hidden;
            flex: 1 1 auto;
            min-height: 0;
            scrollbar-width: thin;
            scrollbar-color: var(--modal-scroll-thumb, #888) var(--modal-scroll-track, #f1f1f1);
        }
        .modal-content::-webkit-scrollbar {
            width: 8px;
        }
        .modal-content::-webkit-scrollbar-track {
            background: var(--modal-scroll-track, #f1f1f1);
        }
        .modal-content::-webkit-scrollbar-thumb {
            background-color: var(--modal-scroll-thumb, #888);
            border-radius: 4px;
        }
        .header {
            background-color: var(--modal-header-bg, var(--modal-bg, #f1f1f1));
            padding: 10px 20px;
            border-top-left-radius: var(--modal-border-radius, 5px);
            border-top-right-radius: var(--modal-border-radius, 5px);
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: move;
            user-select: none;
            flex: 0 0 auto;
            min-height: 40px;
        }
        .title {
            font-weight: bold;
            color: var(--modal-title-color, var(--modal-color, #333333));
        }
        .footer {
            border-top: 1px solid var(--modal-border-color, var(--modal-header-bg, #363636));
            padding: 12px 20px;
            border-bottom-left-radius: var(--modal-border-radius, 5px);
            border-bottom-right-radius: var(--modal-border-radius, 5px);
            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: 10px;
            flex: 0 0 auto;
            min-height: 64px;
            box-sizing: border-box;
            background-color: var(--modal-bg, #fff);
        }
        .close-button {
            cursor: pointer;
            border: none;
            background: transparent;
            font-size: 1.5rem;
            color: var(--modal-close-color, var(--modal-color, #333333));
            padding: 0;
            line-height: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
        }
        .close-button:hover {
            color: var(--modal-close-hover-color, var(--modal-button-hover-bg, #1976D2));
        }
        .action-button {
            cursor: pointer;
            border: 1px solid var(--modal-button-border-color, transparent);
            background: var(--modal-button-bg, #f8f8f8);
            color: var(--modal-button-color, #333333);
            padding: 8px 16px;
            border-radius: var(--modal-button-border-radius, 5px);
            font-size: 0.9rem;
            height: 36px;
            min-width: 80px;
            line-height: 1;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            white-space: nowrap;
            flex-shrink: 0;
            box-sizing: border-box;
        }
        .action-button:hover {
            background: var(--modal-button-hover-bg, #e0e0e0);
            border-color: var(--modal-button-hover-border-color, var(--modal-button-border-color, transparent));
        }
        .action-button.cancel {
            background: var(--modal-button-cancel-bg, #f44336);
            color: var(--modal-button-cancel-color, #ffffff);
            border-color: var(--modal-button-cancel-border-color, var(--modal-button-border-color, transparent));
        }
        .action-button.cancel:hover {
            background: var(--modal-button-cancel-hover-bg, #d32f2f);
            border-color: var(--modal-button-cancel-hover-border-color, var(--modal-button-cancel-border-color, var(--modal-button-border-color, transparent)));
        }
    `;

        this._modal = document.createElement('div');
        this._modal.classList.add('modal');

        // Header section
        this._header = document.createElement('div');
        this._header.classList.add('header');

        // Title
        this._title = document.createElement('div');
        this._title.classList.add('title');
        this._title.textContent = this.getAttribute('title') || 'Modal Title';

        // Close button in header
        this._closeButton = document.createElement('button');
        this._closeButton.classList.add('close-button');
        this._closeButton.innerHTML = '&times;';
        this._closeButton.onclick = () => {
            this.hide();
        };

        // Append title and close button to header
        this._header.appendChild(this._title);
        this._header.appendChild(this._closeButton);

        // Content section
        this._content = document.createElement('div');
        this._content.classList.add('modal-content');
        this._content.innerHTML = '<slot></slot>';

        // Footer section with action buttons
        this._footer = document.createElement('div');
        this._footer.classList.add('footer');

        // Cancel button in footer
        this._cancelButton = document.createElement('button');
        this._cancelButton.classList.add('action-button');
        this._cancelButton.textContent = this.getAttribute('cancel-text') || 'Cancel';
        this._cancelButton.onclick = () => {
            this.dispatchEvent(new CustomEvent('cancel'));
            this.hide();
        };

        // OK button in footer
        this._okButton = document.createElement('button');
        this._okButton.classList.add('action-button');
        this._okButton.textContent = this.getAttribute('ok-text') || 'OK';
        this._okButton.onclick = () => {
            this.dispatchEvent(new CustomEvent('ok'));
            this.hide();
        };

        // Append action buttons to footer
        this._footer.appendChild(this._cancelButton);
        this._footer.appendChild(this._okButton);

        this._modalContainer = document.createElement('div');
        this._modalContainer.classList.add('modal-container');

        // Build up the main modal structure
        this._modalContainer.appendChild(this._header);
        this._modalContainer.appendChild(this._content);
        this._modalContainer.appendChild(this._footer);

        this._modal.appendChild(this._modalContainer);

        // Append the style and the modal structure to the shadow DOM
        this.shadowRoot!.appendChild(style);
        this.shadowRoot!.appendChild(this._modal);

        // Add drag event listeners
        this._header.addEventListener('mousedown', this.startDragging.bind(this));
        document.addEventListener('mousemove', this.drag.bind(this));
        document.addEventListener('mouseup', this.stopDragging.bind(this));

        // Bind the resize handler once
        this._boundHandleResize = this.handleResize.bind(this);

        // Initialize resize observer
        this._resizeObserver = new ResizeObserver(this._boundHandleResize);
    }

    private startDragging(e: MouseEvent) {
        if (e.target === this._closeButton) return; // Don't drag if clicking close button
        
        this._isDragging = true;
        
        // Get the position of the click relative to the modal container
        const modalRect = this._modalContainer.getBoundingClientRect();
        this._dragOffsetX = e.clientX - modalRect.left;
        this._dragOffsetY = e.clientY - modalRect.top;
        
        // Store the current position exactly without changing it
        // This preserves the exact modal position relative to the cursor
        this._modalContainer.style.left = `${modalRect.left}px`;
        this._modalContainer.style.top = `${modalRect.top}px`;
        
        // Disable transform but maintain the modal's current visual position
        this._modalContainer.style.transform = 'none';
        this._modalContainer.style.transition = 'none';
        
        // Force a reflow to ensure changes take effect immediately
        void this._modalContainer.offsetHeight;
    }

    private drag(e: MouseEvent) {
        if (!this._isDragging) return;

        // Calculate new position based on the mouse position minus the offset
        let newX = e.clientX - this._dragOffsetX;
        let newY = e.clientY - this._dragOffsetY;

        // Get viewport dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Get modal dimensions
        const modalRect = this._modalContainer.getBoundingClientRect();
        const modalWidth = modalRect.width;
        const modalHeight = modalRect.height;

        // Keep modal within viewport bounds with a small margin
        const margin = 20;
        newX = Math.max(margin, Math.min(newX, viewportWidth - modalWidth - margin));
        newY = Math.max(margin, Math.min(newY, viewportHeight - modalHeight - margin));

        // Apply the new position immediately without transition
        this._modalContainer.style.transition = 'none';
        this._modalContainer.style.left = `${newX}px`;
        this._modalContainer.style.top = `${newY}px`;
        
        // Force a reflow to ensure the transition is reset
        this._modalContainer.offsetHeight;
    }

    private stopDragging() {
        if (!this._isDragging) return;
        
        this._isDragging = false;
        
        // Add a gentle transition after dragging ends
        this._modalContainer.style.transition = 'left 0.1s ease, top 0.1s ease';
    }

    static get observedAttributes() {
        return ['visible', 'buttons', 'width', 'height', 'ok-text', 'cancel-text'];
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'visible') {
            if (newValue === 'true') {
                this.show();
            } else {
                this.hide();
            }
        } else if (name === 'buttons') {
            this.updateButtons();
        } else if (name === 'width' || name === 'height') {
            this.updateDimensions();
        } else if (name === 'ok-text' || name === 'cancel-text') {
            this.updateButtonText();
        }
    }

    updateDimensions() {
        // Trigger resize handler to update dimensions properly
        this.handleResize();
    }

    updateButtons() {
        const buttons = this.getAttribute('buttons');
        this._okButton.style.display = buttons?.includes('ok') ? 'block' : 'none';
        this._cancelButton.style.display = buttons?.includes('cancel') ? 'block' : 'none';
    }

    updateButtonText() {
        const okText = this.getAttribute('ok-text') || 'OK';
        const cancelText = this.getAttribute('cancel-text') || 'Cancel';
        
        this._okButton.textContent = okText;
        this._cancelButton.textContent = cancelText;
    }

    connectedCallback() {
        // When initially connected, set the modal to zero size to avoid scrollbars
        this._modal.style.visibility = 'hidden';
        this._modal.style.width = '0';
        this._modal.style.height = '0';
        this._modal.style.overflow = 'hidden';
    }

    private handleResize() {
        if (!this._modal.style.visibility || this._modal.style.visibility === 'hidden') return;
        
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Calculate maximum allowed dimensions
        const maxAllowedWidth = Math.min(viewportWidth * 0.9, 1200);
        const maxAllowedHeight = Math.min(viewportHeight * 0.9, 800);
        
        // Get requested dimensions from attributes
        const requestedWidth = this.getAttribute('width');
        const requestedHeight = this.getAttribute('height');
        
        // Calculate final dimensions
        const finalWidth = requestedWidth 
            ? Math.min(parseInt(requestedWidth, 10), maxAllowedWidth)
            : maxAllowedWidth;
            
        const finalHeight = requestedHeight
            ? Math.min(parseInt(requestedHeight, 10), maxAllowedHeight)
            : maxAllowedHeight;
        
        // Apply dimensions with smooth transition
        this._modalContainer.style.transition = 'width 0.3s ease, height 0.3s ease, max-width 0.3s ease, max-height 0.3s ease';
        this._modalContainer.style.width = `${finalWidth}px`;
        this._modalContainer.style.height = `${finalHeight}px`;
        this._modalContainer.style.maxWidth = `${maxAllowedWidth}px`;
        this._modalContainer.style.maxHeight = `${maxAllowedHeight}px`;
        
        // Ensure modal stays centered and within viewport
        this._modalContainer.style.left = '50%';
        this._modalContainer.style.top = '50%';
        this._modalContainer.style.transform = 'translate(-50%, -50%)';
    }

    show() {
        // Store the original parent to restore later
        this._originalParent = this.parentElement;
        
        // Move to body for proper viewport positioning
        document.body.appendChild(this);

        // Reset any previous transform/opacity
        this._modalContainer.style.opacity = '0';
        
        // Initial positioning
        this._modalContainer.style.left = '50%';
        this._modalContainer.style.top = '50%';
        this._modalContainer.style.transform = 'translate(-50%, -50%)';
        
        // Start observing resize
        this._resizeObserver.observe(this._modalContainer);
        window.addEventListener('resize', this._boundHandleResize);
        
        // Make visible and restore full size
        this._modal.style.visibility = 'visible';
        this._modal.style.width = '100vw';
        this._modal.style.height = '100vh';
        this._modal.style.overflow = 'hidden';

        // Handle initial sizing
        this.handleResize();

        // Trigger the opening animation
        requestAnimationFrame(() => {
            this._modalContainer.style.transition = 'opacity 0.3s ease';
            this._modalContainer.style.opacity = '1';
        });
    }

    hide() {
        // Stop observing resize
        this._resizeObserver.unobserve(this._modalContainer);
        
        // Remove window resize listener
        window.removeEventListener('resize', this._boundHandleResize);
        
        // Start the closing animation
        this._modalContainer.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        this._modalContainer.style.opacity = '0';
        this._modalContainer.style.transform = 'translate(-50%, -50%) translateY(-20px)';

        // Wait for the animation to complete before hiding
        setTimeout(() => {
            // Set to zero size to avoid scrollbars
            this._modal.style.visibility = 'hidden';
            this._modal.style.width = '0';
            this._modal.style.height = '0';
            this._modal.style.overflow = 'hidden';
            
            // Reset the modal position and styles for next open
            this._modalContainer.style.opacity = '1';
            this._modalContainer.style.left = '50%';
            this._modalContainer.style.top = '50%';
            this._modalContainer.style.transform = 'translate(-50%, -50%)';
            this._modalContainer.style.transition = '';
            
            // Move back to original parent if it exists
            if (this._originalParent) {
                this._originalParent.appendChild(this);
            }
        }, 200);
    }

    disconnectedCallback() {
        // Clean up event listeners when element is removed
        this._resizeObserver.disconnect();
        window.removeEventListener('resize', this._boundHandleResize);
    }
}

customElements.define('modal-dialog', ModalDialog);
