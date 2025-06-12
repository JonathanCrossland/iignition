// Countdown Timer Component
class CountdownTimerElement extends HTMLElement {
    private _duration: number = 0;
    private _remainingSeconds: number = 0;
    private _timer: number | undefined;
    private _warningThreshold: number = 30;
    private _format: string = 'mm:ss';
    private _fontFamily: string = 'Arial, sans-serif';
    private _lastHourMark: number = 0;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() {
        return ['duration', 'warning-threshold', 'format', 'font-family'];
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'duration') {
            this._duration = this.parseTimeToSeconds(newValue);
            this._remainingSeconds = this._duration;
            this._lastHourMark = Math.ceil(this._remainingSeconds / 3600) * 3600;
            this.updateDisplay();
        } else if (name === 'warning-threshold') {
            this._warningThreshold = parseInt(newValue);
        } else if (name === 'format') {
            this._format = newValue;
        } else if (name === 'font-family') {
            this._fontFamily = newValue;
            this.updateDisplay();
        }
    }

    private parseTimeToSeconds(timeStr: string): number {
        const parts = timeStr.split(':').map(Number);
        if (parts.length === 3) { // HH:MM:SS
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) { // MM:SS
            return parts[0] * 60 + parts[1];
        }
        return parseInt(timeStr); // Assume seconds
    }

    private formatTime(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (this._format === 'HH:mm:ss') {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    connectedCallback() {
        this._duration = this.parseTimeToSeconds(this.getAttribute('duration') || '0');
        this._remainingSeconds = this._duration;
        this._lastHourMark = Math.ceil(this._remainingSeconds / 3600) * 3600;
        this._warningThreshold = parseInt(this.getAttribute('warning-threshold') || '30');
        this._format = this.getAttribute('format') || 'mm:ss';
        this._fontFamily = this.getAttribute('font-family') || 'Arial, sans-serif';
        this.updateDisplay();
    }

    disconnectedCallback() {
        if (this._timer) {
            window.clearInterval(this._timer);
        }
    }

    private updateDisplay() {
        const isWarning = this._remainingSeconds <= this._warningThreshold;
        const timeStr = this.formatTime(this._remainingSeconds);

        this.shadowRoot!.innerHTML = `
            <style>
                .countdown {
                    font-family: var(--timer-font, ${this._fontFamily});
                    display: inline-block;
                    padding: 10px;
                    background: var(--timer-bg, #1e1e1e);
                    border-radius: 5px;
                    color: ${isWarning ? 'var(--timer-warning, #FFC107)' : 'var(--timer-text, #cccccc)'};
                }
            </style>
            <div class="countdown">
                ${timeStr}
            </div>
        `;

        if (this._remainingSeconds <= 0) {
            if (this._timer) {
                window.clearInterval(this._timer);
                this.dispatchEvent(new CustomEvent('complete'));
            }
        }
    }

    private checkHourElapsed() {
        // Check if we've crossed an hour boundary
        const currentHourMark = Math.ceil(this._remainingSeconds / 3600) * 3600;
        
        if (currentHourMark < this._lastHourMark) {
            this._lastHourMark = currentHourMark;
            this.dispatchEvent(new CustomEvent('hourElapsed', {
                detail: {
                    hoursRemaining: Math.floor(this._remainingSeconds / 3600),
                    totalSecondsRemaining: this._remainingSeconds
                }
            }));
        }
    }

    public startCountdown() {
        if (this._timer) {
            window.clearInterval(this._timer);
        }
        
        // Initialize the last hour mark
        this._lastHourMark = Math.ceil(this._remainingSeconds / 3600) * 3600;
        
        this._timer = window.setInterval(() => {
            this._remainingSeconds--;
            this.checkHourElapsed();
            this.updateDisplay();
        }, 1000);
    }
}

customElements.define('countdown-timer', CountdownTimerElement);
