class ProgressPill extends HTMLElement {
    private _shadowRoot: ShadowRoot;

    static get observedAttributes() {
        return ['title', 'target', 'value', 'show-title', 'size'];
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue !== newValue) {
            this.render();
        }
    }

    constructor() {
        super();
        this._shadowRoot = this.attachShadow({ mode: 'open' });
        this._shadowRoot.innerHTML = this.getStyle();
        this.render();
    }

    private render() {
        const title = this.getAttribute('title') || '';
        const target = parseFloat(this.getAttribute('target') || '0');
        const value = parseFloat(this.getAttribute('value') || '0');
        const showTitle = this.getAttribute('show-title') === 'true';
        const size = this.getAttribute('size') || '100';
        const scale = parseFloat(size) / 100;

        // Calculate percentage for width
        const percentage = target > 0 ? Math.min((value / target) * 100, 100) : 0;

        const container = document.createElement('div');
        container.className = 'progress-pill';

        // Create the pill container
        const pillContainer = document.createElement('div');
        pillContainer.className = 'pill-container';

        // Create the target bar
        const targetBar = document.createElement('div');
        targetBar.className = 'target-bar';
        targetBar.style.width = '100%';

        // Create the value bar
        const valueBar = document.createElement('div');
        valueBar.className = 'value-bar';
        valueBar.style.width = `${percentage}%`;

        // Create the value label
        const valueLabel = document.createElement('div');
        valueLabel.className = 'value-label';
        valueLabel.textContent = value.toString();

        // Create the target label
        const targetLabel = document.createElement('div');
        targetLabel.className = 'target-label';
        targetLabel.textContent = target.toString();

        // Create the title
        const titleElement = document.createElement('div');
        titleElement.className = 'title';
        titleElement.textContent = title;

        // Assemble the component
        pillContainer.appendChild(targetBar);
        pillContainer.appendChild(valueBar);
        pillContainer.appendChild(valueLabel);
        pillContainer.appendChild(targetLabel);
        container.appendChild(pillContainer);
        
        if (showTitle) {
            container.appendChild(titleElement);
        }

        this._shadowRoot.innerHTML = this.getStyle();
        this._shadowRoot.appendChild(container);
    }

    private getStyle(): string {
        const size = this.getAttribute('size') || '100';
        const scale = parseFloat(size) / 100;

        return `
            <style>
                :host {
                    display: block;
                    width: 100%;
                }

                .progress-pill {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: calc(10px * ${scale});
                    width: 100%;
                }

                .pill-container {
                    position: relative;
                    width: 100%;
                    height: calc(var(--progress-pill-height, 120px) * ${scale});
                    background: transparent;
                    border-radius: calc(60px * ${scale});
                    overflow: hidden;
                }

                .target-bar {
                    position: absolute;
                    top: 50%;
                    left: 0;
                    transform: translateY(-50%);
                    height: calc(40px * ${scale});
                    background-color: var(--progress-pill-target-color, #0f0f0f);
                    border-radius: calc(20px * ${scale});
                    transition: width 0.3s ease;
                }

                .value-bar {
                    position: absolute;
                    top: 50%;
                    left: 0;
                    transform: translateY(-50%);
                    height: calc(60px * ${scale});
                    background-color: var(--progress-pill-value-color, #367900);
                    border-radius: calc(30px * ${scale});
                    transition: width 0.3s ease;
                }

                .value-label {
                    position: absolute;
                    top: 50%;
                    left: calc(10px * ${scale});
                    transform: translateY(-50%);
                    color: var(--progress-pill-value-text-color, #ffffff);
                    font-size: calc(14px * ${scale});
                    z-index: 1;
                }

                .target-label {
                    position: absolute;
                    top: 50%;
                    right: calc(10px * ${scale});
                    transform: translateY(-50%);
                    color: var(--progress-pill-target-text-color, #cccccc);
                    font-size: calc(14px * ${scale});
                    z-index: 1;
                }

                .title {
                    color: var(--progress-pill-target-text-color, #cccccc);
                    font-size: calc(16px * ${scale});
                    text-align: center;
                }
            </style>
        `;
    }
}

customElements.define('progress-pill', ProgressPill); 