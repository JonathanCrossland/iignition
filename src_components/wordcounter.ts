class WordCounter extends HTMLElement {
    private _target: HTMLElement | null = null;
    private _count: number = 0;
    private _observer: MutationObserver | null = null;
    private _inputHandler: (() => void) | null = null;
    private _display: HTMLElement;
    private _pollInterval: number | null = null;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._display = document.createElement('span');
        this._display.className = 'word-count';
        this.shadowRoot!.innerHTML = `
            <style>
                :host {
                    display: inline-block;
                    font-family: inherit;
                    font-size: var(--wordcounter-font-size, 1rem);
                    color: var(--wordcounter-color, #333);
                    background: var(--wordcounter-bg, transparent);
                    padding: var(--wordcounter-padding, 0.25em 0.5em);
                    border-radius: var(--wordcounter-radius, 4px);
                }
                .word-count {
                    font-weight: 600;
                }
            </style>
        `;
        this.shadowRoot!.appendChild(this._display);
    }

    static get observedAttributes() {
        return ['document'];
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'document' && oldValue !== newValue) {
            this.detach();
            this.attachToTarget();
        }
    }

    connectedCallback() {
        this.attachToTarget();
    }

    disconnectedCallback() {
        this.detach();
    }

    private attachToTarget() {
        const docId = this.getAttribute('document');
        if (!docId) return;
        const el = document.getElementById(docId);
        if (!el) return;
        this._target = el;
        this.subscribe();
        this.updateCount();
    }

    private detach() {
        if (this._target && this._inputHandler) {
            this._target.removeEventListener('input', this._inputHandler);
            this._target.removeEventListener('keyup', this._inputHandler);
        }
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }
        if (this._pollInterval) {
            clearInterval(this._pollInterval);
            this._pollInterval = null;
        }
        this._target = null;
        this._inputHandler = null;
    }

    private subscribe() {
        if (!this._target) return;
        if (this._target instanceof HTMLInputElement || this._target instanceof HTMLTextAreaElement) {
            this._inputHandler = () => this.updateCount();
            this._target.addEventListener('input', this._inputHandler);
            this._observer = new MutationObserver(() => this.updateCount());
            this._observer.observe(this._target, { attributes: true, attributeFilter: ['value'] });
            let lastValue = (this._target as HTMLInputElement | HTMLTextAreaElement).value;
            this._pollInterval = window.setInterval(() => {
                const current = this._target as HTMLInputElement | HTMLTextAreaElement;
                if (current && current.value !== lastValue) {
                    lastValue = current.value;
                    this.updateCount();
                }
            }, 200);
        } else {
            this._inputHandler = () => this.updateCount();
            this._target.addEventListener('keyup', this._inputHandler);
            this._observer = new MutationObserver(() => this.updateCount());
            this._observer.observe(this._target, { childList: true, subtree: true, characterData: true });
        }
    }

    private updateCount() {
        if (!this._target) {
            this._count = 0;
        } else if (this._target instanceof HTMLInputElement || this._target instanceof HTMLTextAreaElement) {
            this._count = WordCounter.countWords(this._target.value);
        } else {
            this._count = WordCounter.countWords(this._target.textContent || '');
        }
        this._display.textContent = `${this._count} word${this._count === 1 ? '' : 's'}`;
        this.style.display = this._count === 0 ? 'none' : '';
    }

    static countWords(text: string): number {
        return (text.trim().match(/\b\w+\b/g) || []).length;
    }
}

customElements.define('word-counter', WordCounter); 