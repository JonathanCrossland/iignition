class SuggestionTextarea extends HTMLElement {
    private _targetElement: HTMLTextAreaElement | HTMLInputElement | null = null;
    private _diffView: HTMLElement | null = null;
    private _acceptButton: HTMLButtonElement;
    private _declineButton: HTMLButtonElement;
    private _hasSuggestion: boolean = false;
    private _currentSuggestion: string = '';
    private _programmaticTarget: HTMLElement | null = null;
    private _originalParent: HTMLElement | null = null;
    private _originalNextSibling: Node | null = null;
    private _hiddenSuggestionTextarea: HTMLTextAreaElement;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Component is invisible by default
        this.style.display = 'none';
        
        // Create hidden textarea for suggestion storage (API compatibility)
        this._hiddenSuggestionTextarea = document.createElement('textarea');
        this._hiddenSuggestionTextarea.style.display = 'none';
        this.shadowRoot!.appendChild(this._hiddenSuggestionTextarea);
    }

    static get observedAttributes() {
        return ['target'];
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'target' && oldValue !== newValue) {
            this.detach();
            this.attachToTarget();
        }
    }

    connectedCallback() {
        this.attachToTarget();
    }

    disconnectedCallback() {
        this.detach();
    }

    /**
     * Programmatically set the target text input element to monitor
     * @param element The HTMLTextAreaElement or HTMLInputElement to attach to, or null to clear
     */
    public setTarget(element: HTMLTextAreaElement | HTMLInputElement | null) {
        this._programmaticTarget = element;
        this.detach();
        this.attachToTarget();
    }

    /**
     * Programmatically set the target element by ID
     * @param elementId The ID of the textarea or input to attach to, or null to clear
     */
    public setTargetById(elementId: string | null) {
        if (elementId) {
            const element = document.getElementById(elementId);
            if (element instanceof HTMLTextAreaElement || 
                (element instanceof HTMLInputElement && element.type === 'text')) {
                this.setTarget(element);
            } else {
                console.warn(`Element with ID '${elementId}' is not a textarea or text input`);
                this.setTarget(null);
            }
        } else {
            this.setTarget(null);
        }
    }

    private attachToTarget() {
        // Priority: programmatic target > attribute-based target
        if (this._programmaticTarget && 
            (this._programmaticTarget instanceof HTMLTextAreaElement || 
             (this._programmaticTarget instanceof HTMLInputElement && this._programmaticTarget.type === 'text'))) {
            this._targetElement = this._programmaticTarget;
            this.createDiffOverlay();
        } else {
            const targetId = this.getAttribute('target');
            if (targetId) {
                const el = document.getElementById(targetId);
                if (el instanceof HTMLTextAreaElement || 
                    (el instanceof HTMLInputElement && el.type === 'text')) {
                    this._targetElement = el;
                    this.createDiffOverlay();
                    return;
                } else if (el) {
                    console.warn(`Element with ID '${targetId}' is not a textarea or text input`);
                }
            }
        }
    }

    private detach() {
        if (this._diffView && this._originalParent) {
            // Remove diff view and restore original element
            this._diffView.remove();
            if (this._targetElement && this._originalNextSibling) {
                this._originalParent.insertBefore(this._targetElement, this._originalNextSibling);
            } else if (this._targetElement) {
                this._originalParent.appendChild(this._targetElement);
            }
            this._targetElement = null;
            this._diffView = null;
            this._originalParent = null;
            this._originalNextSibling = null;
        }
    }

    private createDiffOverlay() {
        if (!this._targetElement) return;

        // Store original position info
        this._originalParent = this._targetElement.parentElement;
        this._originalNextSibling = this._targetElement.nextSibling;

        // Create diff view container
        this._diffView = document.createElement('div');
        this._diffView.className = 'suggestion-diff-container';
        
                 // Copy element styling to diff view
         const computedStyle = window.getComputedStyle(this._targetElement);
         this._diffView.style.width = computedStyle.width;
         this._diffView.style.fontFamily = computedStyle.fontFamily;
         this._diffView.style.fontSize = computedStyle.fontSize;
         this._diffView.style.lineHeight = computedStyle.lineHeight;
         this._diffView.style.border = computedStyle.border;
         this._diffView.style.borderRadius = computedStyle.borderRadius;
         this._diffView.style.padding = '0';
         this._diffView.style.margin = computedStyle.margin;
         this._diffView.style.display = 'none'; // Hidden until suggestion is active
         
         // Let the component auto-size based on content
         this._diffView.style.height = 'auto';
         this._diffView.style.maxHeight = 'none';
         this._diffView.style.minHeight = 'auto';

        // Create diff view content
        this._diffView.innerHTML = `
            <style>
                .suggestion-diff-container {
                    font-family: Monaco, Menlo, 'Ubuntu Mono', monospace;
                    font-size: 14px;
                    line-height: 1.5;
                    background: var(--suggestion-diff-bg, #fff);
                    border: 1px solid var(--suggestion-diff-border, #e1e4e8);
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                    width: 100%;
                }

                 .diff-section {
                     display: flex;
                     flex-direction: column;
                 }

                 .diff-lines {
                     /* No height constraints - let content determine size */
                 }

                .diff-header {
                    background: var(--suggestion-diff-header-bg, #f6f8fa);
                    border-bottom: 1px solid var(--suggestion-diff-border, #e1e4e8);
                    padding: 8px 12px;
                    font-size: 12px;
                    color: var(--suggestion-diff-header-color, #586069);
                    font-weight: 600;
                    position: sticky;
                    top: 0;
                    z-index: 1;
                }

                .diff-line {
                    display: flex;
                    align-items: flex-start;
                    position: relative;
                    margin: 0;
                    padding: 0;
                    line-height: inherit;
                }

                .line-number {
                    background: var(--suggestion-line-number-bg, #fafbfc);
                    color: var(--suggestion-line-number-color, #586069);
                    padding: 2px 8px;
                    font-size: 11px;
                    min-width: 35px;
                    text-align: right;
                    user-select: none;
                    border-right: 1px solid var(--suggestion-diff-border, #e1e4e8);
                    font-family: inherit;
                }

                .line-content {
                    flex: 1;
                    padding: 2px 8px;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    font-family: inherit;
                    min-height: 21px;
                }

                .line-content.editable {
                    background: transparent;
                    border: none;
                    border-radius: 0;
                    outline: none;
                    cursor: text;
                }

                .line-content.editable:focus {
                    background: transparent;
                    border: none;
                    outline: none;
                    box-shadow: none;
                }

                /* Deletion (original text) */
                .diff-line.deletion {
                    background: var(--suggestion-deletion-bg, #ffeef0);
                }

                .diff-line.deletion .line-number {
                    background: var(--suggestion-deletion-line-bg, #fdb8c0);
                    color: var(--suggestion-deletion-color, #86181d);
                }

                .diff-line.deletion .line-content {
                    color: var(--suggestion-deletion-color, #86181d);
                    background: var(--suggestion-deletion-bg, #ffeef0);
                }

                /* Addition (suggested text) */
                .diff-line.addition {
                    background: var(--suggestion-addition-bg, #e6ffed);
                }

                .diff-line.addition .line-number {
                    background: var(--suggestion-addition-line-bg, #acf2bd);
                    color: var(--suggestion-addition-color, #28a745);
                }

                .diff-line.addition .line-content {
                    color: var(--suggestion-addition-color, #28a745);
                    background: var(--suggestion-addition-bg, #e6ffed);
                }

                /* Tab-like button container */
                .button-tabs {
                    background: var(--suggestion-tabs-bg, #f6f8fa);
                    border-top: 1px solid var(--suggestion-tabs-border, #e1e4e8);
                    padding: 8px 12px;
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    justify-content: flex-end;
                    position: sticky;
                    bottom: 0;
                    z-index: 1;
                }

                .tab-button {
                    cursor: pointer;
                    border: 1px solid var(--suggestion-button-border, #d1d5da);
                    padding: 6px 12px;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 500;
                    line-height: 1;
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    min-width: 70px;
                    height: 28px;
                    box-sizing: border-box;
                    transition: all 0.2s ease;
                    user-select: none;
                    background: var(--suggestion-button-bg, #fafbfc);
                    color: var(--suggestion-button-color, #24292e);
                }

                .tab-button:hover {
                    background: var(--suggestion-button-hover-bg, #f3f4f6);
                    color: var(--suggestion-button-hover-color, inherit);
                    border-color: var(--suggestion-button-border, #c8cbcf);
                }

                .tab-button:focus {
                    outline: none;
                    box-shadow: 0 0 0 2px rgba(3, 102, 214, 0.3);
                }

                .accept-button {
                    background: var(--suggestion-accept-bg, #28a745);
                    color: #fff;
                    border-color: var(--suggestion-accept-bg, #28a745);
                }

                .accept-button:hover {
                    background: var(--suggestion-accept-hover-bg, #22863a);
                    border-color: var(--suggestion-accept-hover-bg, #22863a);
                }

                .decline-button {
                    background: var(--suggestion-decline-bg, #d73a49);
                    color: #fff;
                    border-color: var(--suggestion-decline-bg, #d73a49);
                }

                .decline-button:hover {
                    background: var(--suggestion-decline-hover-bg, #cb2431);
                    border-color: var(--suggestion-decline-hover-bg, #cb2431);
                }

                /* Button icons */
                .button-icon {
                    width: 12px;
                    height: 12px;
                    fill: currentColor;
                }

                .diff-hint {
                    padding: 8px 12px;
                    background: var(--suggestion-hint-bg, #f6f8fa);
                    border-top: 1px solid var(--suggestion-tabs-border, #e1e4e8);
                    font-size: 11px;
                    color: var(--suggestion-hint-color, #586069);
                    text-align: center;
                    font-style: italic;
                }
            </style>
            
                         <div class="diff-section">
                 <div class="diff-header">Changes</div>
                 <div class="diff-lines"></div>
             </div>
            
            <div class="button-tabs">
                <button class="tab-button decline-button">
                    <svg class="button-icon" viewBox="0 0 16 16">
                        <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                    </svg>
                    Decline
                </button>
                <button class="tab-button accept-button">
                    <svg class="button-icon" viewBox="0 0 16 16">
                        <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                    </svg>
                    Accept
                </button>
            </div>
            
            <div class="diff-hint">Click on green lines to edit • Accept or decline when ready</div>
        `;

        // Get button references
        this._acceptButton = this._diffView.querySelector('.accept-button') as HTMLButtonElement;
        this._declineButton = this._diffView.querySelector('.decline-button') as HTMLButtonElement;
        
        // Set up button handlers
        this._acceptButton.onclick = () => this.acceptSuggestion();
        this._declineButton.onclick = () => this.declineSuggestion();

        // Apply custom properties from the component to the diff view
        this.applyCSSCustomProperties();

        // Insert diff view in place of textarea
        if (this._originalParent && this._originalNextSibling) {
            this._originalParent.insertBefore(this._diffView, this._originalNextSibling);
        } else if (this._originalParent) {
            this._originalParent.appendChild(this._diffView);
        }
    }

    /**
     * Set a suggestion for the text
     */
    setSuggestion(suggestionText: string) {
        if (!this._targetElement || !this._diffView) return;

        this._hiddenSuggestionTextarea.value = suggestionText;
        this._currentSuggestion = suggestionText;
        this._hasSuggestion = true;
        
        // Show diff view and hide original element
        this._diffView.style.display = 'block';
        this._targetElement.style.display = 'none';
        
        // Generate diff view - let CSS handle auto-sizing
        this.generateDiffView(this._targetElement.value, suggestionText);
        
        this.dispatchEvent(new CustomEvent('suggestion-set', {
            detail: { suggestion: suggestionText },
            bubbles: true
        }));
    }



    /**
     * Apply CSS custom properties from the component element to the diff view
     */
    private applyCSSCustomProperties() {
        if (!this._diffView) return;

        const computedStyle = window.getComputedStyle(this);
        const customProperties = [
            'suggestion-diff-bg',
            'suggestion-diff-border',
            'suggestion-diff-header-bg',
            'suggestion-diff-header-color',
            'suggestion-line-number-bg',
            'suggestion-line-number-color',
            'suggestion-deletion-bg',
            'suggestion-deletion-line-bg',
            'suggestion-deletion-color',
            'suggestion-addition-bg',
            'suggestion-addition-line-bg',
            'suggestion-addition-color',
            'suggestion-button-bg',
            'suggestion-button-color',
            'suggestion-button-border',
            'suggestion-button-hover-bg',
            'suggestion-button-hover-color',
            'suggestion-accept-bg',
            'suggestion-accept-hover-bg',
            'suggestion-decline-bg',
            'suggestion-decline-hover-bg',
            'suggestion-tabs-bg',
            'suggestion-tabs-border',
            'suggestion-hint-bg',
            'suggestion-hint-color'
        ];

        // Copy custom properties from the component to the diff view
        customProperties.forEach(prop => {
            const value = computedStyle.getPropertyValue(`--${prop}`);
            if (value) {
                this._diffView!.style.setProperty(`--${prop}`, value);
            }
        });
    }

    /**
     * Clear the current suggestion
     */
    clearSuggestion() {
        if (!this._targetElement || !this._diffView) return;

        this._hiddenSuggestionTextarea.value = '';
        this._currentSuggestion = '';
        this._hasSuggestion = false;
        
        // Hide diff view and show original element
        this._diffView.style.display = 'none';
        this._targetElement.style.display = '';
        
        this.dispatchEvent(new CustomEvent('suggestion-cleared', {
            bubbles: true
        }));
    }

    /**
     * Generate diff view lines
     */
    private generateDiffView(originalText: string, suggestedText: string) {
        if (!this._diffView) return;
        
        const diffLines = this._diffView.querySelector('.diff-lines');
        if (!diffLines) return;
        
        // Clear existing diff lines
        diffLines.innerHTML = '';
        
        const originalLines = originalText.split('\n');
        const suggestedLines = suggestedText.split('\n');
        
        // Show original as deletions
        originalLines.forEach((line, index) => {
            const diffLine = document.createElement('div');
            diffLine.className = 'diff-line deletion';
            
            const lineNumber = document.createElement('div');
            lineNumber.className = 'line-number';
            lineNumber.textContent = `-${index + 1}`;
            
            const lineContent = document.createElement('div');
            lineContent.className = 'line-content';
            lineContent.textContent = line || ' ';
            
            diffLine.appendChild(lineNumber);
            diffLine.appendChild(lineContent);
            diffLines.appendChild(diffLine);
        });
        
        // Show suggested as additions (editable)
        suggestedLines.forEach((line, index) => {
            const diffLine = document.createElement('div');
            diffLine.className = 'diff-line addition';
            
            const lineNumber = document.createElement('div');
            lineNumber.className = 'line-number';
            lineNumber.textContent = `+${index + 1}`;
            
            const lineContent = document.createElement('div');
            lineContent.className = 'line-content';
            lineContent.contentEditable = 'true';
            lineContent.textContent = line || ' ';
            
            // Add event listeners for inline editing
            lineContent.addEventListener('input', () => {
                this.updateSuggestionFromDiff();
            });
            
            lineContent.addEventListener('keydown', (e) => {
                // Handle Enter key to create new lines properly
                if (e.key === 'Enter') {
                    e.preventDefault();
                    
                    // Insert a line break at the cursor position
                    const selection = window.getSelection();
                    if (selection && selection.rangeCount > 0) {
                        const range = selection.getRangeAt(0);
                        const br = document.createElement('br');
                        range.deleteContents();
                        range.insertNode(br);
                        
                        // Move cursor after the br
                        range.setStartAfter(br);
                        range.setEndAfter(br);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                    
                    // Update the suggestion content
                    this.updateSuggestionFromDiff();
                }
                
                // Handle Tab key for indentation
                if (e.key === 'Tab') {
                    e.preventDefault();
                    
                    // Insert tab character at cursor position
                    const selection = window.getSelection();
                    if (selection && selection.rangeCount > 0) {
                        const range = selection.getRangeAt(0);
                        const textNode = document.createTextNode('    '); // 4 spaces
                        range.deleteContents();
                        range.insertNode(textNode);
                        
                        // Move cursor after the inserted text
                        range.setStartAfter(textNode);
                        range.setEndAfter(textNode);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                    
                    this.updateSuggestionFromDiff();
                }
            });
            
            // Add visual feedback on focus
            lineContent.addEventListener('focus', () => {
                lineContent.classList.add('editable');
            });
            
            lineContent.addEventListener('blur', () => {
                lineContent.classList.remove('editable');
            });
            
            diffLine.appendChild(lineNumber);
            diffLine.appendChild(lineContent);
            diffLines.appendChild(diffLine);
        });
    }

    /**
     * Update the suggestion from edited diff lines
     */
    private updateSuggestionFromDiff() {
        if (!this._diffView) return;
        
        const additionLines = this._diffView.querySelectorAll('.diff-line.addition .line-content');
        const lines: string[] = [];
        
        additionLines.forEach(lineContent => {
            // Convert HTML content to plain text, preserving line breaks
            let text = '';
            lineContent.childNodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE) {
                    text += node.textContent || '';
                } else if (node.nodeName === 'BR') {
                    text += '\n';
                } else {
                    text += node.textContent || '';
                }
            });
            
            // If no content and no breaks, use the textContent as fallback
            if (text === '' && lineContent.childNodes.length === 0) {
                text = lineContent.textContent || '';
            }
            
            lines.push(text);
        });
        
        this._hiddenSuggestionTextarea.value = lines.join('\n');
        this._currentSuggestion = this._hiddenSuggestionTextarea.value;
    }

    /**
     * Accept the current suggestion
     */
    acceptSuggestion() {
        if (!this._hasSuggestion || !this._targetElement) return;

        // Make sure we have the latest content from diff view
        this.updateSuggestionFromDiff();
        
        const oldValue = this._targetElement.value;
        const newValue = this._hiddenSuggestionTextarea.value;
        
        this._targetElement.value = newValue;
        this.clearSuggestion();
        
        // Trigger events on the target element
        this._targetElement.dispatchEvent(new Event('input', { bubbles: true }));
        this._targetElement.dispatchEvent(new Event('change', { bubbles: true }));
        
        this.dispatchEvent(new CustomEvent('suggestion-accepted', {
            detail: { 
                oldValue,
                newValue,
                suggestion: newValue
            },
            bubbles: true
        }));
    }

    /**
     * Decline the current suggestion
     */
    declineSuggestion() {
        if (!this._hasSuggestion) return;
        
        const suggestion = this._hiddenSuggestionTextarea.value;
        this.clearSuggestion();
        
        this.dispatchEvent(new CustomEvent('suggestion-declined', {
            detail: { suggestion },
            bubbles: true
        }));
    }

    /**
     * Check if there's currently a suggestion
     */
    get hasSuggestion(): boolean {
        return this._hasSuggestion;
    }

    /**
     * Get the current suggestion value
     */
    get suggestion(): string {
        return this._hiddenSuggestionTextarea.value;
    }

    /**
     * Get reference to the target element
     */
    get targetTextarea(): HTMLTextAreaElement | HTMLInputElement | null {
        return this._targetElement;
    }

    /**
     * Focus the target element
     */
    focus() {
        if (this._targetElement && !this._hasSuggestion) {
            this._targetElement.focus();
        }
    }
}

customElements.define('suggestion-textarea', SuggestionTextarea); 