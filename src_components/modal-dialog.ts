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
            z-index: 1000;
        }
        .modal-container{
            background-color: var(--modal-bg, #fff);
            color: var(--modal-color, #333333);
            max-width: 600px;
            width: calc(100% - 30px);
            border-radius: var(--modal-border-radius, 5px);
            position: absolute;
            left: 0;
            top: 0;
            transform: none;
            transition: left 0.1s ease, top 0.1s ease;
            will-change: left, top, transform, opacity;
            box-shadow: var(--modal-shadow, 0 4px 6px rgba(0, 0, 0, 0.1));
        }
        .modal-content {
            display: flex;
            flex-direction: column;
            padding: var(--modal-padding, 10px);
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
        }
        .title {
            font-weight: bold;
            color: var(--modal-title-color, var(--modal-color, #333333));
        }
        .footer {
            border-top: 1px solid var(--modal-border-color, var(--modal-header-bg, #363636));
            padding: 10px 20px;
            border-bottom-left-radius: var(--modal-border-radius, 5px);
            border-bottom-right-radius: var(--modal-border-radius, 5px);
            display: flex;
            justify-content: flex-end;
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
            padding: 10px 20px;
            margin-left: 10px;
            border-radius: var(--modal-button-border-radius, 5px);
            font-size: 1rem;
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
        this._cancelButton.textContent = 'Cancel';
        this._cancelButton.onclick = () => {
            this.dispatchEvent(new CustomEvent('cancel'));
            this.hide();
        };

        // OK button in footer
        this._okButton = document.createElement('button');
        this._okButton.classList.add('action-button');
        this._okButton.textContent = 'OK';
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
    }

    private startDragging(e: MouseEvent) {
        if (e.target === this._closeButton) return; // Don't drag if clicking close button
        
        this._isDragging = true;
        
        // Get the position of the click relative to the modal container
        const modalRect = this._modalContainer.getBoundingClientRect();
        this._dragOffsetX = e.clientX - modalRect.left;
        this._dragOffsetY = e.clientY - modalRect.top;
        
        // Store the initial mouse position
        this._dragStartX = e.clientX;
        this._dragStartY = e.clientY;
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
        this._isDragging = false;
        // Restore the transition when dragging stops
        this._modalContainer.style.transition = 'left 0.1s ease, top 0.1s ease';
    }

    static get observedAttributes() {
        return ['visible', 'buttons'];
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
        }
    }

    updateButtons() {
        const buttons = this.getAttribute('buttons');
        this._okButton.style.display = buttons?.includes('ok') ? 'block' : 'none';
        this._cancelButton.style.display = buttons?.includes('cancel') ? 'block' : 'none';
    }

    show() {
        // Reset any previous transform/opacity
        this._modalContainer.style.opacity = '0';
        this._modalContainer.style.transform = 'translateY(-20px)';
        
        // Center the modal first
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const modalRect = this._modalContainer.getBoundingClientRect();
        const modalWidth = modalRect.width;
        const modalHeight = modalRect.height;
        
        this._modalContainer.style.left = `${(viewportWidth - modalWidth) / 2}px`;
        this._modalContainer.style.top = `${(viewportHeight - modalHeight) / 2}px`;
        
        // Make visible after positioning
        this._modal.style.visibility = 'visible';

        // Trigger the opening animation
        requestAnimationFrame(() => {
            this._modalContainer.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            this._modalContainer.style.opacity = '1';
            this._modalContainer.style.transform = 'translateY(0)';
        });
    }

    hide() {
        // Start the closing animation
        this._modalContainer.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        this._modalContainer.style.opacity = '0';
        this._modalContainer.style.transform = 'translateY(-20px)';

        // Wait for the animation to complete before hiding
        setTimeout(() => {
            this._modal.style.visibility = 'hidden';
            // Reset the modal position and styles for next open
            this._modalContainer.style.opacity = '1';
            this._modalContainer.style.transform = 'none';
            this._modalContainer.style.transition = 'left 0.1s ease, top 0.1s ease';
        }, 200);
    }
}

customElements.define('modal-dialog', ModalDialog);
