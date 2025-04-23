class DynamicProgressBar extends HTMLElement {
    private _progressBar: HTMLElement;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        // Embedding CSS styles
        const style = document.createElement('style');
        style.textContent = `
            .progress-container {
                width: 100%;
                height: 20px;
                background-color: #ddd;
                border-radius: 10px;
                overflow: hidden;
            }

            .progress-bar {
                height: 100%;
                background-color: green;
                width: 0%; /* Initial width */
                transition: width 0.5s ease-in-out;
            }
        `;

        // Progress container
        const container = document.createElement('div');
        container.className = 'progress-container';

        // Progress bar
        this._progressBar = document.createElement('div');
        this._progressBar.className = 'progress-bar';

        container.appendChild(this._progressBar);
        this.shadowRoot!.append(style, container);
    }

    static get observedAttributes() {
        return ['progress'];
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'progress') {
            this.setProgress(Number(newValue));
        }
    }

    setProgress(value: number) {
        const progress = Math.min(100, Math.max(0, value)); // Clamp between 0 and 100
        this._progressBar.style.width = `${progress}%`;
    }
}

customElements.define('dynamic-progress-bar', DynamicProgressBar);
