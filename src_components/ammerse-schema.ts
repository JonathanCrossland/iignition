class AmmerseSchema extends HTMLElement {
    static get observedAttributes() {
        return ['data'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.render();
    }

    attributeChangedCallback(name: string, oldValue: any, newValue: any) {
        if (oldValue !== newValue) {
            this.render();
        }
    }

    getDefaultData() {
        return {
            groups: [
                {
                    name: "New Group",
                    columns: [
                        {
                            title: "New Set",
                            values: [0, 0, 0, 0, 0, 0, 0]
                        }
                    ]
                }
            ],
            rows: ["Agile", "Minimal", "Maintainable", "Environmental", "Reachable", "Solvable", "Extensible"]
        };
    }

    render() {
        const data = JSON.parse(this.getAttribute('data') || JSON.stringify(this.getDefaultData()));
        const groups: { name: string; columns: { title: string; values: number[] }[] }[] = data.groups || [];
        const rows: string[] = data.rows || ["Agile", "Minimal", "Maintainable", "Environmental", "Reachable", "Solvable", "Extensible"];

        this.shadowRoot!.innerHTML = `
            <style>
                :host {
                    --box-background-color: #121212;
                    --box-border-color: #444;
                    --box-color: #bbb;
                    --editable-color: #aaa;
                    --highlight-color: #aaa;
                    --add-delete-color: blue;
                    display: block;
                    max-width: 100%;
                    overflow-x: auto;
                }
                table {
                    width: max-content;
                    border-collapse: collapse;
                    table-layout: fixed;
                }
                th, td {
                    padding: 5px;
                    text-align: center;
                    min-width: 100px;
                    position:relative;
                }
                td.cell::before{
                    content: '';
                    position: absolute;
                    left: 50%;
                    top: 0;
                    transform: translateX(-50%);
                    width: 4px;
                    height: 100%;
                    background: #555;
                    z-index: 0;
                }
                th {
                }
                tr.schema{
                    height: 100px;
                }
                .value-name {
                    text-align: left;
                }
               .box {
                    border: 1px solid var(--box-border-color);
                    background: var(--box-background-color);
                    padding: 5px;
                    max-width: 30px;
                    height: 30px;
                    margin: auto;
                    display: flex;
                    align-items: center;
                    color: var(--box-color);
                    border-radius: 0.5em;
                    position: relative;
                    z-index: 1; /* Change the z-index to 1 to be above the ::before element */
                }

                .group-name, .set-name {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    width: 100%;
                }
                .editable {
                    outline: none;
                    border: none;
                    background: transparent;
                    flex: 1;
                    color: var(--editable-color);
                    width: 4em;
                }
                .add-button {
                    margin-top: 10px;
                    padding: 5px 10px;
                    cursor: pointer;
                }
                .add-column, .add-group, .delete-set, .delete-group {
                    color: var(--add-delete-color);
                    cursor: pointer;
                    text-decoration: none;
                    margin-left: 5px;
                    padding: .25em;
                    border: 1px solid var(--box-border-color);
                }
                .add-column:hover, .add-group:hover, .delete-set:hover, .delete-group:hover {
                    background-color: var(--highlight-color);
                }
                .column-title {
                    font-size: 10pt;
                }
            </style>
            <table>
                <thead>
                    <tr class="schema">
                        <th></th>
                        ${groups.map(group => `
                            <th colspan="${group.columns.length || 1}">
                                <div class="group-name">
                                    <div contenteditable="true" class="group-name" data-group-index="${groups.indexOf(group)}">${group.name}</div>
                                    <span class="add-group" data-group-index="${groups.indexOf(group)}">+</span>
                                    <span class="delete-group" data-group-index="${groups.indexOf(group)}">-</span>
                                </div>
                            </th>
                        `).join('')}
                    </tr>
                    <tr>
                        <th></th>
                        ${groups.map(group => group.columns.map((column, columnIndex) => `
                            <th>
                                <div class="set-name">
                                    <div contenteditable="true" class="column-title" data-group-index="${groups.indexOf(group)}" data-column-index="${columnIndex}">${column.title}</div>
                                    ${columnIndex === group.columns.length - 1 ? `
                                        <span class="add-column" data-group-index="${groups.indexOf(group)}">+</span>
                                    ` : ''}
                                    <span class="delete-set" data-group-index="${groups.indexOf(group)}" data-column-index="${columnIndex}">-</span>
                                </div>
                            </th>
                        `).join('')).join('') || `
                            <th>
                                <div class="set-name">
                                    <span class="add-column" data-group-index="0">+</span>
                                </div>
                            </th>
                        `}
                    </tr>
                </thead>
                <tbody>
                    ${rows.map((row, rowIndex) => `
                        <tr>
                            <td class="value-name">${row}</td>
                            ${groups.map(group => group.columns.map((column, columnIndex) => `
                                <td class="cell">
                                    <div class="box">
                                        <input class="editable" type="number" min="-1" max="1" step="0.1" value="${column.values[rowIndex]}" data-group-index="${groups.indexOf(group)}" data-column-index="${columnIndex}" data-row-index="${rowIndex}">
                                    </div>
                                </td>
                            `).join('')).join('') || `
                                <td>
                                    <div class="box"></div>
                                </td>
                            `}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <button class="export-button">Export to Console</button>
            ${groups.length === 0 ? `<span class="add-group" data-group-index="0">Add Group</span>` : ''}
        `;

        this.addEventListeners();
    }

    addEventListeners() {
        // Add event listeners for contenteditable changes
        this.shadowRoot!.querySelectorAll('.group-name').forEach((element) => {
            element.addEventListener('blur', (event) => {
                const target = event.target as HTMLElement;
                const groupIndex = parseInt(target.dataset.groupIndex!);
                this.updateGroupName(groupIndex, target.textContent!);
                this.emitSetFocusEvent(groupIndex, -1); // Pass -1 as columnIndex for group name changes
            });
        });

        this.shadowRoot!.querySelectorAll('.column-title').forEach((element) => {
            element.addEventListener('blur', (event) => {
                const target = event.target as HTMLElement;
                const groupIndex = parseInt(target.dataset.groupIndex!);
                const columnIndex = parseInt(target.dataset.columnIndex!);
                this.updateColumnTitle(groupIndex, columnIndex, target.textContent!);
                this.emitSetFocusEvent(groupIndex, columnIndex);
            });
        });

        this.shadowRoot!.querySelectorAll('.editable').forEach((element) => {
            element.addEventListener('input', (event) => {
                const target = event.target as HTMLInputElement;
                const groupIndex = parseInt(target.dataset.groupIndex!);
                const columnIndex = parseInt(target.dataset.columnIndex!);
                const rowIndex = parseInt(target.dataset.rowIndex!);
                let value = parseFloat(target.value);
                if (value > 1) value = 1;
                if (value < -1) value = -1;
                if (!isNaN(value)) {
                    this.updateValue(groupIndex, columnIndex, rowIndex, value);
                }
                target.value = value.toString(); // Ensure the value is set correctly if it's out of bounds
                this.emitSetChangedEvent(groupIndex, columnIndex);
                this.emitSetFocusEvent(groupIndex, columnIndex);
            });

            element.addEventListener('focus', (event) => {
                const target = event.target as HTMLInputElement;
                const groupIndex = parseInt(target.dataset.groupIndex!);
                const columnIndex = parseInt(target.dataset.columnIndex!);
                this.emitSetFocusEvent(groupIndex, columnIndex);
            });

            element.addEventListener('blur', (event) => {
                const target = event.target as HTMLInputElement;
                const groupIndex = parseInt(target.dataset.groupIndex!);
                const columnIndex = parseInt(target.dataset.columnIndex!);
                this.emitSetFocusEvent(groupIndex, columnIndex);
            });

            element.addEventListener('keydown', (event) => {
                const keyboardEvent = event as KeyboardEvent;
                const allowedKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-', '.', 'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight'];
                if (!allowedKeys.includes(keyboardEvent.key)) {
                    event.preventDefault();
                }
            });
        });

        this.shadowRoot!.querySelectorAll('.add-column').forEach((element) => {
            element.addEventListener('click', (event) => {
                const target = event.target as HTMLElement;
                const groupIndex = parseInt(target.dataset.groupIndex!);
                this.addColumn(groupIndex);
            });
        });

        this.shadowRoot!.querySelectorAll('.delete-set').forEach((element) => {
            element.addEventListener('click', (event) => {
                const target = event.target as HTMLElement;
                const groupIndex = parseInt(target.dataset.groupIndex!);
                const columnIndex = parseInt(target.dataset.columnIndex!);
                this.deleteSet(groupIndex, columnIndex);
            });
        });

        this.shadowRoot!.querySelectorAll('.delete-group').forEach((element) => {
            element.addEventListener('click', (event) => {
                const target = event.target as HTMLElement;
                const groupIndex = parseInt(target.dataset.groupIndex!);
                this.deleteGroup(groupIndex);
            });
        });

        this.shadowRoot!.querySelectorAll('.add-group').forEach((element) => {
            element.addEventListener('click', (event) => {
                const target = event.target as HTMLElement;
                const groupIndex = parseInt(target.dataset.groupIndex!);
                this.addGroup(groupIndex);
            });
        });

        const exportButton = this.shadowRoot!.querySelector('.export-button');
        if (exportButton) {
            exportButton.addEventListener('click', () => this.exportData());
        }
    }

    updateGroupName(groupIndex: number, name: string) {
        const data = JSON.parse(this.getAttribute('data') || JSON.stringify(this.getDefaultData()));
        data.groups[groupIndex].name = name;
        this.setAttribute('data', JSON.stringify(data));
    }

    updateColumnTitle(groupIndex: number, columnIndex: number, title: string) {
        const data = JSON.parse(this.getAttribute('data') || JSON.stringify(this.getDefaultData()));
        data.groups[groupIndex].columns[columnIndex].title = title;
        this.setAttribute('data', JSON.stringify(data));
    }

    updateValue(groupIndex: number, columnIndex: number, rowIndex: number, value: number) {
        const data = JSON.parse(this.getAttribute('data') || JSON.stringify(this.getDefaultData()));
        data.groups[groupIndex].columns[columnIndex].values[rowIndex] = value;
        this.setAttribute('data', JSON.stringify(data));
    }

    addColumn(groupIndex: number, title: string = 'New Column', values: number[] = [0, 0, 0, 0, 0, 0, 0]) {
        const data = JSON.parse(this.getAttribute('data') || JSON.stringify(this.getDefaultData()));
        if (!data.groups[groupIndex].columns) {
            data.groups[groupIndex].columns = [];
        }
        data.groups[groupIndex].columns.push({ title, values });
        this.setAttribute('data', JSON.stringify(data));
        this.render();
    }

    deleteSet(groupIndex: number, columnIndex: number) {
        if (confirm("Are you sure you want to delete this set?")) {
            const data = JSON.parse(this.getAttribute('data') || JSON.stringify(this.getDefaultData()));
            if (data.groups[groupIndex].columns.length > 1) {
                data.groups[groupIndex].columns.splice(columnIndex, 1);
            } else {
                data.groups[groupIndex].columns[columnIndex] = {
                    title: "New Set",
                    values: [0, 0, 0, 0, 0, 0, 0]
                };
            }
            this.setAttribute('data', JSON.stringify(data));
            this.render(); // Re-render to ensure event listeners are correctly set
        }
    }

    deleteGroup(groupIndex: number) {
        if (confirm("Are you sure you want to delete this group?")) {
            const data = JSON.parse(this.getAttribute('data') || JSON.stringify(this.getDefaultData()));
            if (data.groups.length > 1) {
                data.groups.splice(groupIndex, 1);
            } else {
                // Reset the last group instead of deleting it
                data.groups[groupIndex] = {
                    name: "New Group",
                    columns: [
                        {
                            title: "New Set",
                            values: [0, 0, 0, 0, 0, 0, 0]
                        }
                    ]
                };
            }
            this.setAttribute('data', JSON.stringify(data));
            this.render(); // Re-render to ensure event listeners are correctly set
        }
    }

    addGroup(index: number, name: string = 'New Group', columns: { title: string; values: number[] }[] = [{ title: 'New Set', values: [0, 0, 0, 0, 0, 0, 0] }]) {
        const data = JSON.parse(this.getAttribute('data') || JSON.stringify(this.getDefaultData()));
        data.groups.splice(index + 1, 0, { name, columns });
        this.setAttribute('data', JSON.stringify(data));
        this.render(); // Re-render to ensure event listeners are correctly set
    }

    findGroupIndex(columnIndex: number): number {
        const data = JSON.parse(this.getAttribute('data') || JSON.stringify(this.getDefaultData()));
        let offset = 0;
        for (let i = 0; i < data.groups.length; i++) {
            offset += data.groups[i].columns.length;
            if (columnIndex < offset) return i;
        }
        return -1;
    }

    calculateColumnOffset(groupIndex: number): number {
        const data = JSON.parse(this.getAttribute('data') || JSON.stringify(this.getDefaultData()));
        return data.groups.slice(0, groupIndex).reduce((sum: number, group: { columns: { title: string; values: number[] }[] }) => sum + group.columns.length, 0);
    }

    exportData() {
        const data = JSON.parse(this.getAttribute('data') || JSON.stringify(this.getDefaultData()));
        console.log(JSON.stringify(data, null, 2));
    }

    emitSetChangedEvent(groupIndex: number, columnIndex: number) {
        const data = JSON.parse(this.getAttribute('data') || JSON.stringify(this.getDefaultData()));
        const values = data.groups[groupIndex].columns[columnIndex].values;
        const event = new CustomEvent('setChanged', {
            detail: values.join(', ')
        });
        this.dispatchEvent(event);
    }

    emitSetFocusEvent(groupIndex: number, columnIndex: number) {
        const data = JSON.parse(this.getAttribute('data') || JSON.stringify(this.getDefaultData()));
        const values = columnIndex >= 0 ? data.groups[groupIndex].columns[columnIndex].values : [];
        const event = new CustomEvent('setFocus', {
            detail: values.join(', ')
        });
        this.dispatchEvent(event);
    }
}

customElements.define('ammerse-schema', AmmerseSchema);
