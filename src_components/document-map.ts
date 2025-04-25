interface Manuscript {
    schema: string;
    contenteditable: string;
    authordetails?: {
        author: string;
        phone: string;
        email: string;
    };
    wordcount?: string;
    titledetails?: {
        chapter: string;
        author: string;
    };
    copyright?: string;
}

interface Page {
    chapter?: string;
    paragraphs: string[];
}

interface PageConfig {
    selector: string;
    titleSelector?: string;
    contentSelector: string;
}

interface DocumentMapConfig {
    pageConfig: PageConfig;
    onPageClick?: (pageData: any) => void;
}

class DocumentMap extends HTMLElement {
    private _shadowRoot: ShadowRoot;
    private _pages: any[] = [];
    private _config: DocumentMapConfig;
    private _isLoading: boolean = false;
    private _error: string | null = null;

    static get observedAttributes() {
        return ['show-title', 'size'];
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'show-title' || name === 'size') {
            this.render();
        }
    }

    constructor() {
        super();
        this._shadowRoot = this.attachShadow({ mode: 'open' });
        this._shadowRoot.innerHTML = this.getStyle();
        // Don't show loading state on initial load
        this.renderEmpty();

        // Default configuration
        this._config = {
            pageConfig: {
                selector: 'page',
                titleSelector: 'chapter',
                contentSelector: 'paragraph'
            }
        };
    }

    public configure(config: Partial<DocumentMapConfig>): void {
        this._config = {
            ...this._config,
            ...config
        };
    }

    public async loadData(xmlDoc: XMLDocument): Promise<void> {
        try {
            this._isLoading = true;
            this._error = null;
            this.renderLoading();
            
            // Parse pages using first and second child nodes
            this._pages = Array.from(xmlDoc.querySelectorAll('page')).map(pageNode => {
                const children = Array.from(pageNode.children);
                const pageData: any = {
                    content: children.length > 1 ? [children[1].textContent || ''] : ['']
                };

                if (children.length > 0) {
                    pageData.title = children[0].textContent || '';
                }

                return pageData;
            });

            this.render();
        } catch (error) {
            this._error = error instanceof Error ? error.message : 'Failed to load document data';
            this.renderError();
        } finally {
            this._isLoading = false;
        }
    }

    private renderEmpty() {
        const container = document.createElement('div');
        container.className = 'document-map';
        this._shadowRoot.innerHTML = this.getStyle();
        this._shadowRoot.appendChild(container);
    }

    private renderLoading() {
        const container = document.createElement('div');
        container.className = 'document-map loading';
        container.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">Loading document...</div>
        `;
        this._shadowRoot.innerHTML = this.getStyle();
        this._shadowRoot.appendChild(container);
    }

    private renderError() {
        const container = document.createElement('div');
        container.className = 'document-map error';
        container.innerHTML = `
            <div class="error-icon">⚠️</div>
            <div class="error-text">${this._error}</div>
        `;
        this._shadowRoot.innerHTML = this.getStyle();
        this._shadowRoot.appendChild(container);
    }

    private render() {
        const container = document.createElement('div');
        container.className = 'document-map';

        if (this._pages.length === 0) {
            container.innerHTML = '<div class="empty-state">No pages to display</div>';
        } else {
            this._pages.forEach((page, index) => {
                const pageElement = document.createElement('div');
                pageElement.className = 'page';
                
                if (page.title && this.hasAttribute('show-title')) {
                    const titleElement = document.createElement('div');
                    titleElement.className = 'title';
                    titleElement.textContent = page.title;
                    pageElement.appendChild(titleElement);
                }

                const contentElement = document.createElement('div');
                contentElement.className = 'content';
                contentElement.textContent = page.content.join('\n');
                pageElement.appendChild(contentElement);

                if (this._config.onPageClick) {
                    pageElement.style.cursor = 'pointer';
                    pageElement.addEventListener('click', () => this._config.onPageClick?.(page));
                }

                container.appendChild(pageElement);
            });
        }

        this._shadowRoot.innerHTML = this.getStyle();
        this._shadowRoot.appendChild(container);
    }

    private getStyle(): string {
        const size = this.getAttribute('size') || '100';
        const scale = parseFloat(size) / 100;
        return `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    height: fit-content;
                    min-height: 100%;
                    overflow: hidden;
                    background: var(--document-map-bg, #1e1e1e);
                    color: var(--document-map-text, #cccccc);
                    user-select: none;
                    outline: none;
                }

                .document-map {
                    display: flex;
                    flex-wrap: wrap;
                    gap: calc(var(--document-map-gap, 20px) * ${scale});
                    padding: calc(var(--document-map-padding, 20px) * ${scale});
                    justify-content: flex-start;
                    align-items: flex-start;
                    width: 100%;
                    height: fit-content;
                    min-height: 100%;
                    user-select: none;
                    outline: none;
                }

                .empty-state {
                    width: 100%;
                    text-align: center;
                    color: var(--document-map-text-muted, #666);
                    padding: var(--document-map-padding, 20px);
                }

                .document-map.loading,
                .document-map.error {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 200px;
                }

                .loading-spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid var(--document-map-bg-light, #252526);
                    border-top: 4px solid var(--document-map-accent, #3498db);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                .loading-text {
                    margin-top: 10px;
                    color: var(--document-map-text-muted, #666);
                }

                .error-icon {
                    font-size: 40px;
                    margin-bottom: 10px;
                }

                .error-text {
                    color: var(--document-map-error, #e74c3c);
                    text-align: center;
                }

                .page {
                    width: calc(var(--document-map-page-width, 200px) * ${scale});
                    height: calc(var(--document-map-page-height, 300px) * ${scale});
                    background: var(--document-map-page-bg, white);
                    border: 1px solid var(--document-map-page-border, #3c3c3c);
                    border-radius: var(--document-map-border-radius, 4px);
                    box-shadow: var(--document-map-shadow, 0 2px 4px rgba(0,0,0,0.1));
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    transition: transform 0.2s ease, border-color 0.2s ease;
                    user-select: none;
                    outline: none;
                }

                .page:hover {
                    transform: scale(1.02);
                    box-shadow: var(--document-map-shadow-hover, 0 4px 8px rgba(0,0,0,0.2));
                    border-color: var(--document-map-page-border-hover, #4c4c4c);
                }

                .title {
                    padding: var(--document-map-title-padding, 8px);
                    background: var(--document-map-bg-light, #252526);
                    border-bottom: 1px solid var(--document-map-page-border, #3c3c3c);
                    font-weight: bold;
                    text-align: center;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    user-select: none;
                    outline: none;
                }

                .content {
                    flex: 1;
                    padding: var(--document-map-content-padding, 8px);
                    overflow: hidden;
                    font-size: var(--document-map-font-size, 10px);
                    line-height: var(--document-map-line-height, 1.4);
                    color: var(--document-map-text, #cccccc);
                    background: var(--document-map-content-bg, white);
                    user-select: none;
                    outline: none;
                    border: 1px solid var(--document-map-page-border, #3c3c3c);
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
    }
}

customElements.define('document-map', DocumentMap); 