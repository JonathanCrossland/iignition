class PasswordStrengthChecker extends HTMLElement {
    private _meter: HTMLElement;
    private _input: HTMLInputElement;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._input = document.createElement('input');
        this._input.type = 'password';
        this._input.placeholder = 'Enter your password';

        // Event listeners for various input changes
        this._input.addEventListener('input', this.checkStrength.bind(this));
        this._input.addEventListener('paste', this.checkStrength.bind(this));
        this._input.addEventListener('cut', this.checkStrength.bind(this));
        this._input.addEventListener('keyup', this.checkStrength.bind(this));

        this._meter = document.createElement('div');
        this._meter.setAttribute('role', 'meter');

        this.shadowRoot!.appendChild(this._input);
        this.shadowRoot!.appendChild(this._meter);

        const style = document.createElement('style');
        style.textContent = `
            input {
                width: 100%;
                padding: 8px;
                margin: 8px 0;
            }
            div[role="meter"] {
                height: 10px;
                background: #dddddd;
                border-radius: 5px;
                margin: 5px 0;
                width:0%;
                transition: width 0.35s ease-in-out; // Smooth transition for width change
            }
            div[role="meter"].weak {
                background: red;
                width: 33%;
            }
            div[role="meter"].medium {
                background: yellow;
                width: 66%;
            }
            div[role="meter"].strong {
                background: green;
                width: 100%;
            }
        `;
        this.shadowRoot!.appendChild(style);
    }

    checkStrength() {
        const value = this._input.value;
        let charTypesCount = 0;
    
        // Define regex for different character types
        const hasUppercase = /[A-Z]/.test(value);
        const hasLowercase = /[a-z]/.test(value);
        const hasNumbers = /[0-9]/.test(value);
        const hasSpecialChars = /[^A-Za-z0-9]/.test(value);
    
        // Count the number of character types present
        if (hasUppercase || hasLowercase) charTypesCount += 1; // Treat all letters as one type
        if (hasNumbers) charTypesCount += 1;
        if (hasSpecialChars) charTypesCount += 1;
    
        let strength = '';
        if (value.length >= 8 && charTypesCount >= 3) {
            strength = 'strong';
        } else if (value.length > 6 && charTypesCount >= 2) {
            strength = 'medium';
        } else if (value.length > 0) { // Any non-empty input is weak
            strength = 'weak';
        }
        
        this._meter.className = strength;
    }
    
    
}

customElements.define('password-strength-checker', PasswordStrengthChecker);
