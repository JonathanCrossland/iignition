class KnobComponent extends HTMLElement {
    private static readonly START_ANGLE = 40;
    private static readonly END_ANGLE = 310;
    private static readonly ANGLE_RANGE = KnobComponent.END_ANGLE - KnobComponent.START_ANGLE;
    private static readonly DETECTION_FENCE_MULTIPLIER = 2;

    private _min: number;
    private _max: number;
    private _step: number;
    private _value: number;
    private _size: number;
    private knob: HTMLElement;
    private currentValueLabel: HTMLElement;
    private isDragging: boolean = false;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._min = parseFloat(this.getAttribute('min')!) || 0;
        this._max = parseFloat(this.getAttribute('max')!) || 100;
        this._step = parseFloat(this.getAttribute('step')!) || 1;
        this._value = parseFloat(this.getAttribute('value')!) || this._min;
        this._size = parseFloat(this.getAttribute('size')!) || 100;

        this.shadowRoot!.innerHTML = `
            <style>
                .knob-container {
                    display: inline-flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    width: var(--size, 100px);
                    height: calc(var(--size, 100px) + 40px);
                    position: relative;
                    user-select: none;
                    font-family: Arial, sans-serif;
                }
                .knob-wrapper {
                    position: relative;
                    width: calc(var(--size, 100px) * 0.8);
                    height: calc(var(--size, 100px) * 0.8);
                    border: 4px solid #ccccccdd;
                    border-radius: 50%;
                    background: radial-gradient(transparent 55%, #ccccccdd) 50% calc(50% + 2em);
                    box-shadow: 3px 5px 4px 0px #e5e5e5;
                }
                .knob {
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: radial-gradient(transparent 25%, #ccc) 50% calc(50% + 2em);
                    transform: rotate(0deg);
                    transition: transform 0.2s ease-out;
                }
                .indicator {
                    width: 3px;
                    height: 50%;
                    background: #000;
                    position: absolute;
                    bottom: 0;
                    left: 50%;
                    transform: translateX(-50%);
                    transform-origin: bottom center;
                    box-shadow: 0px 2px 3px 0px #888;
                    transition: all 0.2s ease-in;
                    border-top-left-radius: 35%;
                    border-bottom: 2px solid red;
                }
                .label {
                    position: absolute;
                    font-size: calc(var(--size, 100px) * 0.15);
                    user-select: none;
                }
                .label.min {
                    bottom: 10px;
                    left: 10px;
                }
                .label.max {
                    bottom: 10px;
                    right: 10px;
                }
                .label.current {
                    top: 15px;
                    left: 50%;
                    transform: translate(-50%, -50%);
                }
            </style>
            <div class="knob-container" style="--size: ${this._size}px">
                <div class="label current">${this._value}</div>
                <div class="knob-wrapper">
                    <div class="knob">
                        <div class="indicator"></div>
                    </div>
                </div>
                <div class="label min">${this._min}</div>
                <div class="label max">${this._max}</div>
            </div>
        `;

        this.knob = this.shadowRoot!.querySelector('.knob') as HTMLElement;
        this.currentValueLabel = this.shadowRoot!.querySelector('.label.current') as HTMLElement;
        this.knob.addEventListener('mousedown', this.startRotate.bind(this));

        this.setRotation(this._value);
    }

    private startRotate(event: MouseEvent) {
        event.preventDefault();
        this.isDragging = true;
        window.addEventListener('mousemove', this.onMouseMove);
        window.addEventListener('mouseup', this.stopRotate);
    }

    private stopRotate = (event: MouseEvent) => {
        this.isDragging = false;
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('mouseup', this.stopRotate);
    }

    private onMouseMove = (event: MouseEvent) => {
        if (!this.isDragging) return;

        const rect = this.knob.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const fenceRadius = rect.width / 2 * KnobComponent.DETECTION_FENCE_MULTIPLIER;

        const dx = event.clientX - centerX;
        const dy = event.clientY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > fenceRadius) return;

        let angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;

        if (angle < 0) angle += 360;

        if (angle < KnobComponent.START_ANGLE) angle = KnobComponent.START_ANGLE;
        if (angle > KnobComponent.END_ANGLE) angle = KnobComponent.END_ANGLE;

        const range = this._max - this._min;
        let value = ((angle - KnobComponent.START_ANGLE) / KnobComponent.ANGLE_RANGE) * range + this._min;
        value = Math.round(value / this._step) * this._step;
        value = Math.max(this._min, Math.min(this._max, value));

        this.setRotation(value);
    }

    private setRotation(value: number) {
        this._value = value;
        const range = this._max - this._min;
        const rotation = ((this._value - this._min) / range) * KnobComponent.ANGLE_RANGE + KnobComponent.START_ANGLE;
        this.knob.style.transform = `rotate(${rotation}deg)`;
        this.currentValueLabel.textContent = this._value.toFixed(1);
    }

    get min() {
        return this._min;
    }

    set min(value: number) {
        this._min = value;
    }

    get max() {
        return this._max;
    }

    set max(value: number) {
        this._max = value;
    }

    get step() {
        return this._step;
    }

    set step(value: number) {
        this._step = value;
    }

    get value() {
        return this._value;
    }

    set value(value: number) {
        this.setRotation(value);
    }

    get size() {
        return this._size;
    }

    set size(value: number) {
        this._size = value;
        this.updateSize();
    }

    private updateSize() {
        const container = this.shadowRoot!.querySelector('.knob-container') as HTMLElement;
        container.style.setProperty('--size', `${this._size}px`);
    }

    static get observedAttributes() {
        return ['min', 'max', 'value', 'step', 'size'];
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'min') {
            this.min = parseFloat(newValue);
        } else if (name === 'max') {
            this.max = parseFloat(newValue);
        } else if (name === 'value') {
            this.value = parseFloat(newValue);
        } else if (name === 'step') {
            this.step = parseFloat(newValue);
        } else if (name === 'size') {
            this.size = parseFloat(newValue);
        }
    }
}

customElements.define('knob-component', KnobComponent);
