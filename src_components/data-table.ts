class DataTable extends HTMLElement {
    private _data: Array<{[key: string]: any}> = [];
    private _columns: Array<string> = [];

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.render();
    }

    static get observedAttributes() {
        return ['data'];
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'data') {
            this._data = JSON.parse(newValue);
            this.updateColumnsAndRender();
        }
    }

    updateColumnsAndRender() {
        this._columns = this._data.length > 0 ? Object.keys(this._data[0]) : [];
        this.render();
    }

    render() {
        const table = document.createElement('table');
        const thead = table.createTHead();
        const tbody = document.createElement('tbody');
        table.appendChild(tbody);

        // Header row
        const headerRow = thead.insertRow();
        this._columns.forEach(column => {
            const th = document.createElement('th');
            th.textContent = column;
            headerRow.appendChild(th);
        });

        // Data rows
        this._data.forEach(item => {
            const row = tbody.insertRow();
            this._columns.forEach(column => {
                const cell = row.insertCell();
                cell.textContent = item[column].toString();
            });
        });

        // Clear and append the new table
        if (this.shadowRoot) {
            this.shadowRoot.innerHTML = '';
            this.shadowRoot.appendChild(table);
        }
    }
}

customElements.define('data-table', DataTable);
