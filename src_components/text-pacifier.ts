class TextPacifier extends HTMLElement {
    private _container: HTMLElement;
    private _spinner: HTMLElement;
    private _interval: number | null = null;
    private _characters = ['/', '-', '\\', '|'];
    private _currentIndex = 0;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: inline-block;
                font-family: monospace;
                font-size: var(--pacifier-font-size, 1rem);
                color: var(--pacifier-color, #333);
                background: var(--pacifier-bg, transparent);
                padding: var(--pacifier-padding, 0.5rem);
                border-radius: var(--pacifier-radius, 4px);
                line-height: 1;
            }

            .container {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .spinner {
                display: inline-block;
                min-width: 1ch;
                text-align: center;
            }

            .text {
                display: inline-block;
            }
        `;

        this._container = document.createElement('div');
        this._container.classList.add('container');

        this._spinner = document.createElement('span');
        this._spinner.classList.add('spinner');
        this._spinner.textContent = this._characters[0];

        const text = document.createElement('span');
        text.classList.add('text');
        text.textContent = this.getAttribute('text') || 'Loading';

        this._container.appendChild(this._spinner);
        this._container.appendChild(text);

        this.shadowRoot!.appendChild(style);
        this.shadowRoot!.appendChild(this._container);

        // Set initial visibility
        this.style.display = this.getAttribute('visible') === 'true' ? 'inline-block' : 'none';
        
        // Start spinning if visible attribute is true
        if (this.getAttribute('visible') === 'true') {
            this.start();
        }
    }

    get visible(): boolean {
        return this.getAttribute('visible') === 'true';
    }

    set visible(value: boolean) {
        this.setAttribute('visible', value ? 'true' : 'false');
    }

    get speed(): number {
        return parseInt(this.getAttribute('speed') || '200', 10);
    }

    set speed(value: number) {
        this.setAttribute('speed', value.toString());
    }

    get text(): string {
        return this.getAttribute('text') || 'Loading';
    }

    set text(value: string) {
        this.setAttribute('text', value);
    }

    private start() {
        if (this._interval) return;

        const speed = this.speed;
        this._interval = window.setInterval(() => {
            this._currentIndex = (this._currentIndex + 1) % this._characters.length;
            this._spinner.textContent = this._characters[this._currentIndex];
        }, speed);
    }

    private stop() {
        if (this._interval) {
            clearInterval(this._interval);
            this._interval = null;
        }
    }

    static get observedAttributes() {
        return ['visible', 'speed', 'text'];
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'visible') {
            if (newValue === 'true') {
                this.style.display = 'inline-block';
                this.start();
            } else {
                this.style.display = 'none';
                this.stop();
            }
        } else if (name === 'speed') {
            if (this._interval) {
                this.stop();
                this.start();
            }
        } else if (name === 'text') {
            const textElement = this.shadowRoot!.querySelector('.text');
            if (textElement) {
                textElement.textContent = newValue || 'Loading';
            }
        }
    }

    disconnectedCallback() {
        this.stop();
    }
}

customElements.define('text-pacifier', TextPacifier); 