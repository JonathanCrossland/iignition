class CountdownTimer extends HTMLElement {
    private _endTime: Date;
    private _timer: number | undefined;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._endTime = new Date(this.getAttribute('end-time') || Date.now());
    }

    connectedCallback() {
        this.updateTimer();
        this._timer = window.setInterval(() => this.updateTimer(), 1000);
    }

    disconnectedCallback() {
        if (this._timer) {
            window.clearInterval(this._timer);
        }
    }

    updateTimer() {
        const now = new Date();
        const distance = this._endTime.getTime() - now.getTime();
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        this.shadowRoot!.innerHTML = `
            <style>
                .countdown {
                    font-family: Arial, sans-serif;
                    color: #333;
                    display: inline-block;
                    padding: 10px;
                    background: #f0f0f0;
                    border-radius: 5px;
                }
            </style>
            <div class="countdown">
                ${days}d ${hours}h ${minutes}m ${seconds}s
            </div>
        `;

        if (distance < 0) {
            this.shadowRoot!.innerHTML = "Countdown finished";
        }
    }
}

customElements.define('countdown-timer', CountdownTimer);
