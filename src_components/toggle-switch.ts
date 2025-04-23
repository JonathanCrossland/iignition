class ToggleSwitch extends HTMLElement {
    private _checkbox: HTMLInputElement;
    private _label: HTMLLabelElement;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this._checkbox = document.createElement('input');
        this._checkbox.type = 'checkbox';

        this._label = document.createElement('label');
        this._label.appendChild(this._checkbox);
        this._label.style.cursor = 'pointer';
        this._label.style.display = 'inline-block';
        this._label.style.position = 'relative';
        this._label.style.width = '40px';
        this._label.style.height = '25px';
        this._label.style.backgroundColor = 'radial-gradient(transparent 55%, #ccccccdd) 50% calc(50% + 2em);';
        this._label.style.borderRadius = '25px';
        this._label.style.transition = 'background-color 0.2s';

        this._checkbox.style.opacity = '0';
        this._checkbox.style.width = '0';
        this._checkbox.style.height = '0';

        const slider = document.createElement('span');
        slider.style.position = 'absolute';
        slider.style.cursor = 'pointer';
        slider.style.top = '0';
        slider.style.left = '0';
        slider.style.right = '0';
        slider.style.bottom = '0';
        slider.style.backgroundColor = '#ccc';
        slider.style.borderRadius = '25px';
        slider.style.transition = '.4s';
        slider.style.boxShadow = '0 0 1px #2196F3'; // Corrected line

        this._checkbox.addEventListener('change', () => {
            if (this._checkbox.checked) {
                this._label.style.backgroundColor = '#fff';
                slider.style.transform = 'translateX(16px)';
            } else {
                this._label.style.backgroundColor = '#ccc';
                slider.style.transform = 'translateX(0)';
            }
        });

        this._label.appendChild(slider);
        this.shadowRoot!.appendChild(this._label); // Corrected line with non-null assertion
    }
}

customElements.define('toggle-switch', ToggleSwitch);
