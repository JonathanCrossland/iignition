class AccordionComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot!.innerHTML = `
            <style>
                :host {
                    display: block;
                    margin-bottom: 1rem;
                    border-radius: var(--accordion-radius);
                    overflow: hidden;
                    background: var(--accordion-bg);
                    box-shadow: var(--accordion-shadow);
                    transition: var(--accordion-transition);
                    border: var(--accordion-border);
                }

                :host(:hover) {
                    box-shadow: var(--accordion-hover-shadow);
                }

                .accordion {
                    width: 100%;
                    padding: var(--accordion-padding);
                    background: var(--accordion-header-bg);
                    color: var(--accordion-header-text);
                    cursor: pointer;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-weight: 600;
                    transition: var(--accordion-transition);
                    border: none;
                    outline: none;
                    font-size: var(--accordion-header-font-size);
                }

                .accordion:hover {
                    background: var(--accordion-header-bg);
                    opacity: 0.9;
                }

                .panel {
                    padding: 0;
                    background: var(--accordion-bg);
                    color: var(--accordion-text);
                    max-height: 0;
                    overflow: hidden;
                    transition: max-height var(--accordion-transition);
                }

                .panel.open {
                    padding: var(--accordion-padding);
                    max-height: 1000px;
                }

                .icon {
                    transition: transform var(--accordion-transition);
                }

                .active .icon {
                    transform: rotate(180deg);
                }
            </style>
            <button class="accordion">
                <span>${this.getAttribute('title') || 'Section 1'}</span>
                <span class="icon">▼</span>
            </button>
            <div class="panel">
                <slot name="content">Default content</slot>
            </div>
        `;

        const accordion = this.shadowRoot!.querySelector(".accordion")!;
        const panel = this.shadowRoot!.querySelector(".panel")!;

        // Set initial state based on open attribute
        const openValue = this.getAttribute('open');
        if (openValue !== null && openValue !== 'false') {
            accordion.classList.add('active');
            panel.classList.add('open');
        }

        accordion.addEventListener("click", () => {
            accordion.classList.toggle("active");
            panel.classList.toggle("open");
            // Update the open attribute to reflect the state
            if (panel.classList.contains('open')) {
                this.setAttribute('open', 'true');
            } else {
                this.setAttribute('open', 'false');
            }
        });
    }

    get title() {
        return this.getAttribute('title') || '';
    }

    set title(value) {
        if (value !== this.title) {
            this.setAttribute('title', value);
            this.shadowRoot!.querySelector('.accordion span:first-child')!.textContent = value;
        }
    }

    get open() {
        const value = this.getAttribute('open');
        return value !== null && value !== 'false';
    }

    set open(value) {
        this.setAttribute('open', value ? 'true' : 'false');
    }

    static get observedAttributes() {
        return ['title', 'open'];
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'title') {
            this.title = newValue;
        } else if (name === 'open') {
            const accordion = this.shadowRoot!.querySelector(".accordion")!;
            const panel = this.shadowRoot!.querySelector(".panel")!;
            if (newValue !== null && newValue !== 'false') {
                accordion.classList.add('active');
                panel.classList.add('open');
            } else {
                accordion.classList.remove('active');
                panel.classList.remove('open');
            }
        }
    }
}

customElements.define('accordion-component', AccordionComponent);
