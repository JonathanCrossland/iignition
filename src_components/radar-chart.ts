class RadarChart extends HTMLElement {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D | null;
    private data: number[];
    private labels: string[];
    private labelPositions: { x: number, y: number }[];

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');

        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: block;
                width: 100%;
                height: 100%;
                position: relative;
            }
            canvas {
                display: block;
                width: 100%;
                height: 100%;
                background-color: var(--radar-bg);
            }
        `;

        this.shadowRoot!.append(style, this.canvas);

        this.data = [0.5, 1, 0.5, 1, 1, 1, -1];
        this.labels = [
            "Agile",
            "Minimal",
            "Maintainable",
            "Environmental",
            "Reachable",
            "Solvable",
            "Extensible"
        ];

        // Default positions which you can tweak as needed
        this.labelPositions = [
            { x: 1.04, y: 0 },  // Agile
            { x: -1, y: -0.4 },  // Minimal
            { x: -0.80, y: 0.5 },  // Maintainable
            { x: -0.03, y: 1 },  // Environmental
            { x: 0.74, y: 0.75 },  // Reachable
            { x: 0.55, y: -0.85 },  // Solvable
            { x: -0.05, y: -1 }  // Extensible
        ];

        window.addEventListener('resize', () => this.drawChart());
    }

    static get observedAttributes() {
        return ['data'];
    }

    attributeChangedCallback(name: string, oldValue: any, newValue: any) {
        if (name === 'data' && oldValue !== newValue) {
            this.data = newValue.split(',').map(Number); //JSON.parse(newValue);
            this.drawChart();
        }
    }

    connectedCallback() {
        this.drawChart();
    }

    drawChart() {
        if (!this.ctx) return;

        this.canvas.width = this.clientWidth;
        this.canvas.height = this.clientHeight;

        const ctx = this.ctx;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 40;
        const angleStep = (2 * Math.PI) / this.data.length;

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Get root element styles
        const rootStyles = getComputedStyle(document.documentElement);
        
        // Draw grid
        ctx.strokeStyle = rootStyles.getPropertyValue('--radar-grid').trim();
        ctx.lineWidth = 1;
        
        for (let i = 1; i <= 5; i++) {
            ctx.beginPath();
            for (let j = 0; j < this.data.length; j++) {
                const x = centerX + radius * (i / 5) * Math.cos(j * angleStep);
                const y = centerY + radius * (i / 5) * Math.sin(j * angleStep);
                if (j === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.setLineDash([1, 3]);
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.stroke();
        }

        // Draw axes
        ctx.strokeStyle = rootStyles.getPropertyValue('--radar-axis').trim();
        for (let i = 0; i < this.data.length; i++) {
            const x = centerX + radius * Math.cos(i * angleStep);
            const y = centerY + radius * Math.sin(i * angleStep);
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x, y);
            ctx.stroke();
        }

        // Draw labels with explicit positions
        ctx.fillStyle = rootStyles.getPropertyValue('--radar-label').trim();
        this.labels.forEach((label, i) => {
            const posX = centerX + radius * this.labelPositions[i].x;
            const posY = centerY + radius * this.labelPositions[i].y;
            ctx.textAlign = this.labelPositions[i].x === 0 ? 'center' : this.labelPositions[i].x > 0 ? 'left' : 'right';
            ctx.textBaseline = this.labelPositions[i].y === 0 ? 'middle' : this.labelPositions[i].y > 0 ? 'top' : 'bottom';
            ctx.fillText(label, posX, posY);
        });

        // Draw data
        ctx.strokeStyle = rootStyles.getPropertyValue('--radar-line').trim();
        ctx.fillStyle = rootStyles.getPropertyValue('--radar-fill').trim();
        ctx.beginPath();
        for (let i = 0; i < this.data.length; i++) {
            const value = (this.data[i] + 1) / 2; // Convert range from [-1, 1] to [0, 1]
            const x = centerX + radius * value * Math.cos(i * angleStep);
            const y = centerY + radius * value * Math.sin(i * angleStep);
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.stroke();
        ctx.fill();
    }
}

customElements.define('radar-chart', RadarChart);
