class Typewriter extends HTMLElement {
    private styleElement: HTMLStyleElement;
    private wrapperElement: HTMLElement;
    private textElement: HTMLElement;
    private cursorElement: HTMLElement;
    private currentText: string = '';
    private targetText: string = '';
    private currentIndex: number = 0;
    private typingTimer: number | null = null;
    private isTyping: boolean = false;

    constructor() {
        super();
        this.styleElement = document.createElement('style');
        this.styleElement.textContent = this.getStyles();
        this.appendChild(this.styleElement);
        this.createElements();
    }

    static get observedAttributes() {
        return ['content', 'cursor', 'tag', 'speed'];
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue !== newValue) {
            if (name === 'content') {
                this.setContent(newValue || '');
            } else if (name === 'cursor') {
                this.updateCursor();
            } else if (name === 'tag') {
                this.recreateWrapper();
            } else if (name === 'speed') {
                // If currently typing, restart with new speed
                if (this.isTyping) {
                    this.startTyping();
                }
            }
        }
    }

    connectedCallback() {
        this.setContent(this.getAttribute('content') || '');
        this.applyCSSVariables();
    }

    disconnectedCallback() {
        this.stopTyping();
    }

    private createElements() {
        this.recreateWrapper();
    }

    private recreateWrapper() {
        // Remove existing wrapper if it exists
        if (this.wrapperElement) {
            this.removeChild(this.wrapperElement);
        }

        // Create wrapper element based on tag attribute
        const tagName = this.getAttribute('tag') || 'span';
        const validTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'p'];
        const tag = validTags.includes(tagName.toLowerCase()) ? tagName.toLowerCase() : 'span';
        
        this.wrapperElement = document.createElement(tag);
        this.wrapperElement.className = 'typewriter-wrapper';
        
        // Create text element
        this.textElement = document.createElement('span');
        this.textElement.className = 'typewriter-text';
        this.wrapperElement.appendChild(this.textElement);
        
        // Create cursor element
        this.cursorElement = document.createElement('span');
        this.cursorElement.className = 'typewriter-cursor';
        this.cursorElement.textContent = '|';
        this.wrapperElement.appendChild(this.cursorElement);
        
        this.appendChild(this.wrapperElement);
        this.updateCursor();
        this.applyCSSVariables();
    }

    private updateCursor() {
        const showCursor = this.getAttribute('cursor') !== 'false';
        this.cursorElement.style.display = showCursor ? 'inline' : 'none';
    }

    public setContent(content: string) {
        this.targetText = content;
        this.reset();
        this.startTyping();
    }

    public startTyping() {
        this.stopTyping();
        this.isTyping = true;
        this.typeNextCharacter();
    }

    public stopTyping() {
        if (this.typingTimer) {
            clearTimeout(this.typingTimer);
            this.typingTimer = null;
        }
        this.isTyping = false;
    }

    public reset() {
        this.stopTyping();
        this.currentText = '';
        this.currentIndex = 0;
        this.updateDisplay();
    }

    public complete() {
        this.stopTyping();
        this.currentText = this.targetText;
        this.currentIndex = this.targetText.length;
        this.updateDisplay();
        this.dispatchEvent(new CustomEvent('typewriter-complete', {
            detail: { text: this.currentText },
            bubbles: true,
            composed: true
        }));
    }

    private typeNextCharacter() {
        if (this.currentIndex < this.targetText.length) {
            this.currentText += this.targetText[this.currentIndex];
            this.currentIndex++;
            this.updateDisplay();
            
            // Dispatch progress event
            this.dispatchEvent(new CustomEvent('typewriter-progress', {
                detail: { 
                    text: this.currentText,
                    progress: this.currentIndex / this.targetText.length,
                    index: this.currentIndex
                },
                bubbles: true,
                composed: true
            }));
            
            // Schedule next character
            const speed = parseInt(this.getAttribute('speed') || '50');
            this.typingTimer = window.setTimeout(() => {
                this.typeNextCharacter();
            }, speed);
        } else {
            // Typing complete
            this.isTyping = false;
            this.dispatchEvent(new CustomEvent('typewriter-complete', {
                detail: { text: this.currentText },
                bubbles: true,
                composed: true
            }));
        }
    }

    private updateDisplay() {
        if (this.textElement) {
            this.textElement.textContent = this.currentText;
        }
    }

    private getStyles(): string {
        return `
            typewriter-component {
                display: inline-block;
            }
            
            .typewriter-wrapper {
                font-family: var(--typewriter-font-family, inherit);
                font-size: var(--typewriter-font-size, inherit);
                color: var(--typewriter-color, inherit);
                line-height: var(--typewriter-line-height, inherit);
                font-weight: var(--typewriter-font-weight, inherit);
            }
            
            .typewriter-text {
                display: inline;
            }
            
            .typewriter-cursor {
                display: inline;
                color: var(--typewriter-cursor-color, currentColor);
                -webkit-text-fill-color: var(--typewriter-cursor-color, currentColor);
                animation: typewriter-blink 1s infinite alternate;
                animation-duration: var(--typewriter-cursor-speed, 1s);
                font-weight: var(--typewriter-cursor-weight, normal);
                opacity: var(--typewriter-cursor-opacity, 1);
            }
            
            @keyframes typewriter-blink {
                from {
                    opacity: 1;
                }
                to {
                    opacity: 0;
                }
            }
        `;
    }

    private applyCSSVariables() {
        // Ensure CSS custom properties are applied by reading them from the component
        if (this.cursorElement) {
            const computedStyle = getComputedStyle(this);
            const cursorColor = computedStyle.getPropertyValue('--typewriter-cursor-color').trim();
            const cursorOpacity = computedStyle.getPropertyValue('--typewriter-cursor-opacity').trim();
            
            console.log('Debug - cursorColor:', cursorColor);
            console.log('Debug - cursorOpacity:', cursorOpacity);
            
            if (cursorColor) {
                this.cursorElement.style.setProperty('color', cursorColor);
                console.log('Applied color:', cursorColor);
            }
            if (cursorOpacity) {
                this.cursorElement.style.setProperty('opacity', cursorOpacity);
                console.log('Applied opacity:', cursorOpacity);
            }
        }
    }
}

customElements.define('typewriter-component', Typewriter); 