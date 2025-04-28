interface ExplorerItem {
    name: string;
    type: 'file' | 'folder';
    expanded?: boolean;
    children?: ExplorerItem[];
    path?: string;
    extension?: string;
    icon?: string;
    folderOpenIcon?: string;
    folderClosedIcon?: string;
}

interface ExplorerOptions {
    onSelected?: (node: ExplorerItem) => void;
    onSelectedChanged?: (node: ExplorerItem) => void;
    onChange?: (data: ExplorerItem[]) => void;
}

class Explorer extends HTMLElement {
    private _shadowRoot: ShadowRoot;
    private _data: ExplorerItem[] = [];
    private _options: ExplorerOptions = {};
    private _selectedItem: HTMLElement | null = null;
    private _editingInput: HTMLInputElement | null = null;

    constructor() {
        super();
        this._shadowRoot = this.attachShadow({ mode: 'open' });
        this.init();
    }

    private init(): void {
        // Add styles first
        const style = document.createElement('style');
        style.textContent = this.getStyle();
        this._shadowRoot.appendChild(style);

        // Create content container
        const container = document.createElement('div');
        container.className = 'explorer-container';
        this._shadowRoot.appendChild(container);

        this.render();
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Delegate click events from the root
        this._shadowRoot.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const item = target.closest('.explorer-item') as HTMLElement;
            if (!item) return;

            // Select the item when clicking anywhere on it
            this.selectItem(item);

            // Handle folder toggle separately
            if (target.classList.contains('folder-icon') || target.classList.contains('folder-name')) {
                const folderItem = target.closest('.explorer-item.folder') as HTMLElement;
                if (folderItem) {
                    this.toggleFolder(folderItem);
                }
            }
        });

        // Add F2 listener for renaming
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F2' && this._selectedItem) {
                this.startEditing(this._selectedItem);
            }
        });
    }

    private startEditing(element: HTMLElement): void {
        const nameElement = element.querySelector('.folder-name, .file-name') as HTMLElement;
        if (!nameElement || this._editingInput) return;

        const currentName = nameElement.textContent || '';
        const input = document.createElement('input');
        input.value = currentName;
        input.className = 'name-edit';
        
        // Position the input exactly where the name is
        const rect = nameElement.getBoundingClientRect();
        input.style.width = rect.width + 'px';
        
        // Hide the original name
        nameElement.style.display = 'none';
        nameElement.parentElement?.insertBefore(input, nameElement);
        
        this._editingInput = input;
        input.focus();
        input.select();

        const finishEditing = (save: boolean) => {
            if (!this._editingInput) return;
            
            const newName = this._editingInput.value;
            const explorerItem = element.closest('.explorer-item') as HTMLElement;
            
            // Clean up the input before any other operations
            nameElement.style.display = '';
            const inputToRemove = this._editingInput;
            this._editingInput = null;
            inputToRemove.remove();

            if (save && newName !== currentName && explorerItem) {
                const oldPath = explorerItem.dataset.path || '';
                const pathParts = oldPath.split('/');
                
                // Get the node before we rename it
                const nodeBeforeRename = this.findNodeByPath(pathParts);
                
                // Update the data structure
                this.renameItem(pathParts, newName);
                
                // Use the stored node for the callback
                if (nodeBeforeRename && this._options.onSelectedChanged) {
                    // Update the name in the node data
                    nodeBeforeRename.name = newName;
                    this._options.onSelectedChanged(nodeBeforeRename);
                }

                // Re-render to update all paths
                this.render();
            }
        };

        // Handle input events
        input.addEventListener('blur', () => finishEditing(true));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                finishEditing(true);
                e.preventDefault();
            } else if (e.key === 'Escape') {
                finishEditing(false);
                e.preventDefault();
            }
        });
    }

    private renameItem(path: string[], newName: string): void {
        const updateName = (items: ExplorerItem[]): boolean => {
            if (path.length === 0) return false;
            
            const currentName = path[0];
            const itemIndex = items.findIndex(i => i.name === currentName);
            
            if (itemIndex === -1) return false;
            
            if (path.length === 1) {
                items[itemIndex].name = newName;
                return true;
            } else {
                const item = items[itemIndex];
                if (item.children) {
                    return updateName(item.children);
                }
            }
            return false;
        };

        if (updateName(this._data)) {
            // Notify about data change
            this.triggerChange();
            
            // Force a complete re-render after data update
            requestAnimationFrame(() => {
                this.render();
                // Re-select the renamed item
                const newPath = path.slice(0, -1).concat(newName).join('/');
                const newElement = this._shadowRoot.querySelector(`[data-path="${newPath}"]`);
                if (newElement) {
                    this.selectItem(newElement as HTMLElement);
                }
            });
        }
    }

    private getFolderIcon(item: ExplorerItem, expanded: boolean): string {
        // No longer return emoji, icons are now styled via CSS
        return '';
    }

    private getFileIcon(item: ExplorerItem): string {
        // No longer return emoji, icons are now styled via CSS
        return '';
    }

    private findNodeByPath(path: string[]): ExplorerItem | null {
        if (path.length === 0) return null;
        
        let currentNode = this._data.find(item => item.name === path[0]);
        for (let i = 1; i < path.length && currentNode; i++) {
            currentNode = currentNode.children?.find(item => item.name === path[i]);
        }
        return currentNode || null;
    }

    private selectItem(element: HTMLElement): void {
        // Find the appropriate header element to select
        const headerElement = element.querySelector('.folder-header, .file') as HTMLElement;
        if (!headerElement) return;

        // Remove selection from previously selected item
        if (this._selectedItem) {
            this._selectedItem.classList.remove('selected');
        }

        // Select the new item
        headerElement.classList.add('selected');
        this._selectedItem = headerElement;

        // Get the path from the explorer item
        const path = element.dataset.path;
        if (!path) return;

        // Find the node data and notify
        const node = this.findNodeByPath(path.split('/'));
        if (node && this._options.onSelected) {
            this._options.onSelected(node);
        }
    }

    public toggleFolder(pathOrElement: string | HTMLElement): void {
        let folderElement: HTMLElement | null = null;
        
        if (typeof pathOrElement === 'string') {
            // If path is provided, find the element
            folderElement = this._shadowRoot.querySelector(`.explorer-item[data-path="${pathOrElement}"]`);
        } else {
            // If element is provided, use it directly
            folderElement = pathOrElement;
        }

        if (!folderElement) return;

        const content = folderElement.querySelector('.folder-content') as HTMLElement;
        const icon = folderElement.querySelector('.folder-icon') as HTMLElement;
        if (!content || !icon) return;

        const isExpanded = content.style.display !== 'none';
        content.style.display = isExpanded ? 'none' : 'block';
        // No icon.textContent logic here; icon is styled via CSS

        // Find the item in the data structure to get its icons
        const path = folderElement.dataset.path?.split('/') || [];
        this.updateItemExpanded(this._data, path, !isExpanded);
    }

    private updateItemExpanded(items: ExplorerItem[], path: string[], expanded: boolean): void {
        if (path.length === 0) return;
        
        const currentName = path[0];
        const item = items.find(i => i.name === currentName);
        
        if (!item) return;
        
        if (path.length === 1) {
            item.expanded = expanded;
            // Notify about data change when expanding/collapsing
            this.triggerChange();
        } else {
            this.updateItemExpanded(item.children || [], path.slice(1), expanded);
        }
    }

    private renderItem(item: ExplorerItem, parentPath: string = ''): string {
        const currentPath = parentPath ? `${parentPath}/${item.name}` : item.name;
        
        if (item.type === 'folder') {
            const folderContent = item.children?.map(child => this.renderItem(child, currentPath)).join('') || '';
            return `
                <div class="explorer-item folder" data-path="${currentPath}" data-type="folder">
                    <div class="folder-header">
                        <span class="folder-icon"></span>
                        <span class="folder-name">${item.name}</span>
                    </div>
                    <div class="folder-content" style="display: ${item.expanded ? 'block' : 'none'}">
                        ${folderContent}
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="explorer-item file" data-path="${currentPath}" data-type="file">
                    <div class="file">
                        <span class="file-icon"></span>
                        <span class="file-name">${item.name}</span>
                    </div>
                </div>
            `;
        }
    }

    private render(): void {
        const container = this._shadowRoot.querySelector('.explorer-container');
        if (!container) return;

        container.innerHTML = this._data.map(item => this.renderItem(item)).join('');
    }

    private triggerChange(): void {
        if (this._options.onChange) {
            this._options.onChange(this._data);
        }
    }

    private getStyle(): string {
        return `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    height: 100%;
                    --explorer-bg: var(--color-card-bg, #1e1e1e);
                    --explorer-text: var(--color-text, #cccccc);
                    --explorer-selected-bg: transparent;
                    --explorer-hover-bg: rgba(255, 255, 255, 0.1);
                    --explorer-indent: 20px;
                    --explorer-item-height: 22px;
                    /* No default icon values here; set in global CSS if desired */
                }

                .explorer-container {
                    background: var(--explorer-bg);
                    color: var(--explorer-text);
                    height: 100%;
                    overflow: auto;
                    padding: 4px;
                    user-select: none;
                }

                .explorer-item {
                    cursor: pointer;
                    min-height: var(--explorer-item-height);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .explorer-item .file {
                    height: var(--explorer-item-height);
                    line-height: var(--explorer-item-height);
                }

                .folder-header:hover, .file:hover {
                    background: var(--explorer-hover-bg);
                }

                .folder-header.selected, .file.selected {
                    background: var(--explorer-selected-bg);
                }

                .folder-content {
                    padding-left: var(--explorer-indent);
                }

                .folder-header, .file {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    padding: 0 4px;
                    border-radius: 3px;
                }

                .folder-icon, .file-icon {
                    width: 16px;
                    text-align: center;
                    display: inline-block;
                }

                /* Folder icon: closed by default, open if expanded */
                .folder > .folder-header > .folder-icon::before {
                    content: var(--explorer-folder-icon-closed);
                }
                .folder[expanded] > .folder-header > .folder-icon::before {
                    content: var(--explorer-folder-icon-open);
                }

                /* File icon */
                .file-icon::before {
                    content: var(--explorer-file-icon);
                }

                .folder-name, .file-name {
                    flex: 1;
                }

                .name-edit {
                    background: var(--explorer-bg);
                    color: var(--explorer-text);
                    border: 1px solid var(--color-primary, #007fd4);
                    outline: none;
                    padding: 0;
                    margin: 0;
                    height: calc(var(--explorer-item-height) - 2px);
                    font: inherit;
                }
            </style>
        `;
    }

    // Public API
    public load(data: ExplorerItem[]): void {
        this._data = data;
        this.render();
    }

    public configure(options: ExplorerOptions): void {
        this._options = { ...this._options, ...options };
    }

    public getData(): ExplorerItem[] {
        return this._data;
    }
}

customElements.define('explorer-component', Explorer); 