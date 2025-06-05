interface DayCell {
    level?: number;
    dateLabel: string;
    inMonth: boolean;
}

interface Week {
    days: Array<DayCell | null>;
}

interface Month {
    label: string;
    weeks: Week[];
    year: number;
    month: number;
}

class ContributionCalendar extends HTMLElement {
    private data: Array<{ year: number; month: number; dayOfWeek: number; level: number }> = [];
    private styleElement: HTMLStyleElement;
    private container: HTMLElement;
    private resizeObserver?: ResizeObserver;

    constructor() {
        super();
        this.styleElement = document.createElement('style');
        this.styleElement.textContent = this.getStyles();
        this.appendChild(this.styleElement);
        this.container = document.createElement('div');
        this.container.className = 'contribution-calendar-container';
        this.appendChild(this.container);
    }

    setData(data: Array<{ year: number; month: number; dayOfWeek: number; level: number }>) {
        this.data = data;
        this.render();
    }

    static get observedAttributes() {
        return ['data', 'displaymonths', 'responsive'];
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'data' && newValue) {
            try {
                const parsed = JSON.parse(newValue);
                if (Array.isArray(parsed)) {
                    this.setData(parsed);
                }
            } catch {}
        } else if (name === 'displaymonths' && oldValue !== newValue) {
            this.render();
        } else if (name === 'responsive' && oldValue !== newValue) {
            this.setupResponsive();
        }
    }

    connectedCallback() {
        if (this.hasAttribute('data')) {
            try {
                const parsed = JSON.parse(this.getAttribute('data') || '[]');
                if (Array.isArray(parsed)) {
                    this.setData(parsed);
                }
            } catch {}
        } else {
            this.render();
        }
        this.setupResponsive();
    }

    disconnectedCallback() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }

    private setupResponsive() {
        console.log('setupResponsive called, responsive attribute:', this.hasAttribute('responsive'));
        
        if (this.resizeObserver) {
            console.log('Disconnecting existing ResizeObserver');
            this.resizeObserver.disconnect();
        }
        
        if (this.hasAttribute('responsive')) {
            console.log('Setting up new ResizeObserver');
            this.resizeObserver = new ResizeObserver((entries) => {
                console.log('🔄 ResizeObserver fired! Entries:', entries.length);
                entries.forEach((entry, index) => {
                    console.log(`  Entry ${index}:`, {
                        target: entry.target,
                        contentRect: entry.contentRect,
                        borderBoxSize: entry.borderBoxSize,
                        contentBoxSize: entry.contentBoxSize
                    });
                });
                
                requestAnimationFrame(() => {
                    console.log('📐 Triggering hideMonthsIfNeeded after resize');
                    this.hideMonthsIfNeeded('ResizeObserver');
                });
            });
            
            console.log('📊 Starting to observe element:', this);
            console.log('Element dimensions at setup:', {
                offsetWidth: this.offsetWidth,
                offsetHeight: this.offsetHeight,
                clientWidth: this.clientWidth,
                clientHeight: this.clientHeight,
                getBoundingClientRect: this.getBoundingClientRect()
            });
            
            this.resizeObserver.observe(this);
            console.log('✅ ResizeObserver setup complete');
        } else {
            console.log('❌ Responsive attribute not set, skipping ResizeObserver setup');
        }
    }

    private hideMonthsIfNeeded(source: string = 'unknown') {
        console.log(`🔍 hideMonthsIfNeeded called from: ${source}, responsive attribute:`, this.hasAttribute('responsive'));
        
        if (!this.hasAttribute('responsive')) {
            console.log('Not responsive, exiting');
            return;
        }
        
        const monthElements = Array.from(this.container.children) as HTMLElement[];
        console.log('Month elements found:', monthElements.length);
        
        if (monthElements.length === 0) {
            console.log('No month elements found, exiting');
            return;
        }

        // Show all months first and force reflow
        monthElements.forEach((month, i) => {
            month.style.display = 'flex';
            console.log(`Showing month ${i}`);
        });
        
        // Force reflow to ensure measurements are accurate
        this.container.offsetHeight;

        // Get actual container dimensions
        const containerRect = this.container.getBoundingClientRect();
        const containerStyles = getComputedStyle(this.container);
        const paddingLeft = parseFloat(containerStyles.paddingLeft) || 0;
        const paddingRight = parseFloat(containerStyles.paddingRight) || 0;
        const availableWidth = containerRect.width - paddingLeft - paddingRight;

        console.log('Container rect:', containerRect);
        console.log('Container width:', containerRect.width, 'Available width:', availableWidth);
        console.log('Padding left:', paddingLeft, 'Padding right:', paddingRight);

        if (availableWidth <= 0) {
            console.log('Available width is 0 or negative, exiting');
            return;
        }

        // Measure each month's actual width including margins
        const monthWidths: number[] = [];
        let totalWidth = 0;
        
        monthElements.forEach((month, index) => {
            const monthRect = month.getBoundingClientRect();
            const monthStyles = getComputedStyle(month);
            const marginLeft = parseFloat(monthStyles.marginLeft) || 0;
            const marginRight = parseFloat(monthStyles.marginRight) || 0;
            const fullWidth = monthRect.width + marginLeft + marginRight;
            monthWidths.push(fullWidth);
            totalWidth += fullWidth;
            console.log(`Month ${index} (${month.querySelector('.contribution-calendar-month-label')?.textContent}) width:`, fullWidth, 'rect:', monthRect);
        });

        // Add gaps between months (from CSS gap property)
        const gap = parseFloat(getComputedStyle(this.container).gap) || 8;
        totalWidth += gap * Math.max(0, monthElements.length - 1);

        console.log('Total width needed:', totalWidth, 'Available:', availableWidth, 'Gap:', gap);
        console.log('Overflow?', totalWidth > availableWidth);

        // FORCE HIDING FOR TESTING - always hide first 2 months if we have more than 2
        if (monthElements.length > 2) {
            console.log('FORCE TEST: Hiding first 2 months for testing');
            monthElements[0].style.display = 'none';
            monthElements[1].style.display = 'none';
            return;
        }

        // If content fits, show all months
        if (totalWidth <= availableWidth) {
            console.log('All content fits, no hiding needed');
            return;
        }

        console.log('Content overflow detected, calculating visible months...');

        // Calculate how many months can fit, starting from the current month (rightmost)
        let currentWidth = 0;
        let visibleMonths = 0;

        // Work backwards from the last month (current month)
        for (let i = monthElements.length - 1; i >= 0; i--) {
            const monthWidth = monthWidths[i];
            const widthWithGap = monthWidth + (visibleMonths > 0 ? gap : 0);
            
            console.log(`Checking month ${i}, width: ${monthWidth}, with gap: ${widthWithGap}, current total: ${currentWidth}`);
            
            if (currentWidth + widthWithGap <= availableWidth) {
                currentWidth += widthWithGap;
                visibleMonths++;
                console.log(`Month ${i} fits, visible months now: ${visibleMonths}`);
            } else {
                console.log(`Month ${i} doesn't fit, stopping`);
                break;
            }
        }

        // Hide months from the left that don't fit
        const monthsToHide = monthElements.length - visibleMonths;
        console.log(`Hiding ${monthsToHide} months from the left`);
        
        for (let i = 0; i < monthsToHide; i++) {
            console.log(`Hiding month ${i}`);
            monthElements[i].style.display = 'none';
        }
    }

    // Add a public method to manually trigger responsiveness for testing
    public triggerResponsive() {
        console.log('Manual trigger responsive');
        this.hideMonthsIfNeeded('manual-trigger');
    }

    // Test method to always hide first 3 months to verify hiding mechanism works
    public testHide() {
        console.log('Test hide - forcing hide of first 3 months');
        const monthElements = Array.from(this.container.children) as HTMLElement[];
        console.log('Found', monthElements.length, 'month elements');
        
        for (let i = 0; i < Math.min(3, monthElements.length); i++) {
            console.log(`Force hiding month ${i}:`, monthElements[i]);
            monthElements[i].style.display = 'none';
        }
    }

    // Test method to artificially constrain width and trigger responsive behavior
    public testResponsiveWidth(maxWidth: number = 600) {
        console.log(`Testing responsive with max width: ${maxWidth}px`);
        const originalWidth = this.container.style.maxWidth;
        this.container.style.maxWidth = `${maxWidth}px`;
        
        // Force layout recalculation
        this.container.offsetHeight;
        
        // Trigger responsive calculation
        this.hideMonthsIfNeeded('testResponsiveWidth');
        
        // Restore original width after a delay for testing
        setTimeout(() => {
            this.container.style.maxWidth = originalWidth;
            console.log('Restored original width');
        }, 3000);
    }

    private render() {
        this.container.innerHTML = '';
        const displayMonths = parseInt(this.getAttribute('displaymonths') || '12');
        const months = this.buildMonths(displayMonths);
        
        months.forEach((month) => {
            const monthContainer = document.createElement('div');
            monthContainer.className = 'contribution-calendar-month';
            
            // Month label
            const monthLabel = document.createElement('div');
            monthLabel.className = 'contribution-calendar-month-label';
            monthLabel.textContent = month.label;
            monthContainer.appendChild(monthLabel);
            
            // Month grid
            const monthGrid = document.createElement('div');
            monthGrid.className = 'contribution-calendar-month-grid';
            monthGrid.style.gridTemplateColumns = `repeat(${month.weeks.length}, 1fr)`;
            
            // Create 7 rows (days of week), each with cells for each week
            for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
                month.weeks.forEach((week) => {
                    const cell = week.days[dayOfWeek];
                    const cellDiv = document.createElement('div');
                    cellDiv.className = 'contribution-calendar-cell';
                    cellDiv.setAttribute('data-level', String(cell?.level ?? ''));
                    cellDiv.title = cell?.dateLabel || '';
                    
                    if (cell?.level === undefined) {
                        cellDiv.classList.add('no-data');
                    }
                    
                    monthGrid.appendChild(cellDiv);
                });
            }
            
            monthContainer.appendChild(monthGrid);
            this.container.appendChild(monthContainer);
        });

        // Apply responsive behavior after rendering
        if (this.hasAttribute('responsive')) {
            // Use multiple frame delays to ensure all styles are applied
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this.hideMonthsIfNeeded('render');
                });
            });
        }
    }

    private buildMonths(displayMonths: number = 12): Month[] {
        const now = new Date();
        const months: Month[] = [];
        
        // Map data by key
        const byDate = new Map<string, { year: number; month: number; dayOfWeek: number; level: number }>();
        this.data.forEach(item => {
            byDate.set(`${item.year}-${item.month}-${item.dayOfWeek}`, item);
        });
        
        // Build months, ending with current month
        for (let i = displayMonths - 1; i >= 0; i--) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const year = monthDate.getFullYear();
            const month = monthDate.getMonth() + 1;
            const monthLabel = monthDate.toLocaleString(undefined, { month: 'short' });
            
            // Get first and last day of month
            const firstDay = new Date(year, month - 1, 1);
            const lastDay = new Date(year, month, 0);
            
            // Start from Sunday of the week containing the first day
            const startDate = new Date(firstDay);
            startDate.setDate(startDate.getDate() - startDate.getDay());
            
            // End on Saturday of the week containing the last day
            const endDate = new Date(lastDay);
            endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
            
            const weeks: Week[] = [];
            let currentDate = new Date(startDate);
            
            while (currentDate <= endDate) {
                const week: Week = { days: [] };
                
                for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
                    const y = currentDate.getFullYear();
                    const m = currentDate.getMonth() + 1;
                    const d = currentDate.getDate();
                    const dow = currentDate.getDay();
                    const inMonth = m === month && y === year;
                    
                    if (inMonth) {
                        const key = `${y}-${m}-${dow}`;
                        const item = byDate.get(key);
                        const level = item ? item.level : undefined;
                        const dateLabel = currentDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) + (level !== undefined ? `: Level ${level}` : '');
                        
                        week.days.push({ level, dateLabel, inMonth });
                    } else {
                        week.days.push(null);
                    }
                    
                    currentDate.setDate(currentDate.getDate() + 1);
                }
                
                weeks.push(week);
            }
            
            months.push({ label: monthLabel, weeks, year, month });
        }
        
        return months;
    }

    private getStyles(): string {
        return `
            :host {
                display: block;
                width: 100%;
                min-width: 0;
            }
            .contribution-calendar-container {
                display: flex;
                flex-direction: row;
                gap: var(--contribution-calendar-month-gap, 8px);
                background: var(--contribution-calendar-bg, #161b22);
                padding: var(--contribution-calendar-padding, 8px);
                border-radius: var(--contribution-calendar-radius, 6px);
                width: 100%;
                min-width: 0;
                overflow: hidden;
            }
            .contribution-calendar-month {
                display: flex;
                flex-direction: column;
                gap: var(--contribution-calendar-label-gap, 4px);
                flex-shrink: 0;
            }
            .contribution-calendar-month-label {
                text-align: center;
                color: var(--contribution-calendar-label-color, #cccccc);
                font-size: var(--contribution-calendar-label-font-size, 12px);
                min-width: var(--contribution-calendar-month-min-width, 100px);
            }
            .contribution-calendar-month-grid {
                display: grid;
                grid-template-rows: repeat(7, 1fr);
                gap: var(--contribution-calendar-cell-gap, 2px);
                grid-auto-flow: column;
            }
            .contribution-calendar-cell {
                width: var(--contribution-calendar-cell-size, 14px);
                height: var(--contribution-calendar-cell-size, 14px);
                border-radius: var(--contribution-calendar-cell-radius, 3px);
                background: var(--contribution-calendar-level-0, #21262d);
                transition: background 0.2s;
            }
            .contribution-calendar-cell[data-level="1"] { background: var(--contribution-calendar-level-1, #0e4429); }
            .contribution-calendar-cell[data-level="2"] { background: var(--contribution-calendar-level-2, #006d32); }
            .contribution-calendar-cell[data-level="3"] { background: var(--contribution-calendar-level-3, #26a641); }
            .contribution-calendar-cell[data-level="4"] { background: var(--contribution-calendar-level-4, #39d353); }
            .contribution-calendar-cell[data-level="5"] { background: var(--contribution-calendar-level-5, #a6f6a6); }
            .contribution-calendar-cell.no-data {
                background: transparent;
                border: 1px solid var(--contribution-calendar-level-0, #21262d);
            }
        `;
    }
}

customElements.define('contribution-calendar', ContributionCalendar); 