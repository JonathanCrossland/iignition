class QuestionList extends HTMLElement {
    private container: HTMLElement;
    private readonly order: string[] = ["A", "Mi", "M", "E", "R", "S", "Ex"];

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        const template = document.createElement('template');
        template.innerHTML = `
            <style>
                :host {
                    display: block;
                    overflow-y: auto;
                    max-height: 100%;
                    background-color: var(--question-list-background-color, #fff);
                    color: var(--question-list-color, #000);
                    font-family: var(--question-list-font-family, Arial, sans-serif);
                    padding: var(--question-list-padding, 10px);
                    border: var(--question-list-border, 1px solid #ddd);
                    border-radius: var(--question-list-border-radius, 4px);
                }
                .question-item {
                    display: flex;
                    align-items: center;
                    padding: var(--question-item-padding, 10px);
                    margin-bottom: var(--question-item-margin-bottom, 10px);
                    border: var(--question-item-border, 1px solid #ddd);
                    border-radius: var(--question-item-border-radius, 4px);
                    background-color: var(--question-item-background-color, #f9f9f9);
                    transition: background-color 0.3s;
                }
                .question-item:hover {
                    background-color: var(--question-item-hover-background-color, #eee);
                }
                .symbol {
                    font-size: var(--symbol-font-size, 24px);
                    margin-right: var(--symbol-margin-right, 10px);
                    color: var(--symbol-color, #333);
                }
                .question {
                    flex: 1;
                    font-size: var(--question-font-size, 14px);
                }
            </style>
            <div class="container"></div>
        `;

        this.shadowRoot!.appendChild(template.content.cloneNode(true));
        this.container = this.shadowRoot!.querySelector('.container') as HTMLElement;
    }

    connectedCallback() {
        const data = this.getAttribute('data');
        if (data) {
            this.renderQuestions(JSON.parse(data));
        }
    }

    static get observedAttributes() {
        return ['data'];
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'data' && newValue) {
            this.renderQuestions(JSON.parse(newValue));
        }
    }

    renderQuestions(questions: Array<{ value: string, question: string }>) {
        this.container.innerHTML = '';

        // Sort questions according to the order defined by AMMERSE
        questions.sort((a, b) => {
            const indexA = this.order.indexOf(a.value);
            const indexB = this.order.indexOf(b.value);
            return indexA - indexB;
        });

        questions.forEach(({ value, question }) => {
            const item = document.createElement('div');
            item.className = 'question-item';
            item.innerHTML = `
                <div class="symbol">${value}</div>
                <div class="question">${question}</div>
            `;
            this.container.appendChild(item);
        });
    }

    set data(questions: Array<{ value: string, question: string }>) {
        this.renderQuestions(questions);
    }
}

customElements.define('question-list', QuestionList);
