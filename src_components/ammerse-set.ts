class AmmerseSet extends HTMLElement {
    static get observedAttributes() {
        return ['title', 'values'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.render();
    }

    attributeChangedCallback(name: string, oldValue: any, newValue: any) {
        if (oldValue !== newValue) {
            this.render();
        }
    }

    render() {
        const title = this.getAttribute('title');
        const values = this.getAttribute('values') || '0,0,0,0,0,0,0';
        const symbols = ['A', 'Mi', 'M', 'E', 'R', 'S', 'Ex'];
        const valueArray = values.split(',').map(Number);

        this.shadowRoot!.innerHTML = `
            <style>
                :host {
                    display: block;
                    max-width: 500px;
                    margin: 0;
                    --container-gap: 0px;
                    --header-font-size: 1em;
                    --header-font-weight: bold;
                    --header-padding: .5em;
                    --header-border-color: #444;
                    --header-color: #888;
                    --header-height: auto;
                    --header-line-height: 1.4em;
                    --header-margin-bottom: 0.5em; /* Added margin to create space below header */
                    --box-border-color: #444;
                    --box-padding: 10px;
                    --symbol-font-size: 1.2em;
                    --symbol-font-weight: bold;
                    --symbol-color: #444;
                    --symbol-hover-color: #666;
                    --value-font-size: 1em;
                    --value-color: #ddd;
                    --value-hover-color: #fff;
                }
                .container {
                    display: grid;
                    grid-template-rows: ${title ? 'auto 1fr' : '1fr'};
                    gap: var(--container-gap);
                }
                .header {
                    text-align: left;
                    font-size: var(--header-font-size);
                    font-weight: var(--header-font-weight);
                    padding: var(--header-padding);
                    border: 1px solid var(--header-border-color);
                    color: var(--header-color);
                    margin-bottom: var(--header-margin-bottom); /* Apply margin-bottom to the header */
                    line-height: var(--header-line-height);
                }
                .row {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: var(--container-gap);
                }
                .box {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid var(--box-border-color);
                    padding: var(--box-padding);
                    text-align: center;
                    border-collapse: collapse;
                }
                .symbol {
                    font-size: var(--symbol-font-size);
                    font-weight: var(--symbol-font-weight);
                    color: var(--symbol-color);
                }
                .symbol:hover {
                    color: var(--symbol-hover-color);
                }
                .value {
                    font-size: var(--value-font-size);
                    color: var(--value-color);
                }
                .value:hover {
                    color: var(--value-hover-color);
                }
            </style>
            <div class="container">
                ${title ? `<div class="header">${title}</div>` : ''}
                <div class="row">
                    ${symbols.map((symbol, index) => `
                        <div class="box">
                            <div class="symbol">${symbol}</div>
                            <div class="value">${valueArray[index]}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
}

customElements.define('ammerse-set', AmmerseSet);
