interface EditorMDOptions {
    fontFamily?: string;
    fontSize?: string;
    lineHeight?: string;
    onChange?: (content: string) => void;
    onSave?: (content: string) => void;
    autoSave?: boolean;
    autoSaveInterval?: number;
}

class EditorMD extends HTMLElement {
    private _shadowRoot: ShadowRoot;
    private _textarea: HTMLDivElement;
    private _options: EditorMDOptions = {};
    private _autoSaveTimer: number | null = null;
    private _lastContent: string = '';
    private _lastCursorPosition: number = 0;
    private _undoStack: Array<{content: string, cursorOffset: number}> = [];
    private _redoStack: Array<{content: string, cursorOffset: number}> = [];
    private _maxUndoStackSize: number = 50;

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

        // Create contenteditable div
        this._textarea = document.createElement('div');
        this._textarea.setAttribute('contenteditable', 'true');
        this._textarea.setAttribute('spellcheck', 'false');
        this._textarea.setAttribute('autocomplete', 'off');
        this._textarea.setAttribute('autocorrect', 'off');
        this._textarea.setAttribute('autocapitalize', 'off');
        this._textarea.className = 'editor-md-textarea';
        this._shadowRoot.appendChild(this._textarea);

        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Handle input changes
        this._textarea.addEventListener('input', () => {
            this.handleContentChange();
        });

        // Handle keydown for markdown shortcuts
        this._textarea.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });

        // Handle paste to clean up HTML
        this._textarea.addEventListener('paste', (e) => {
            this.handlePaste(e);
        });

        // Track cursor position changes
        this._textarea.addEventListener('click', () => {
            this._lastCursorPosition = this.getTextPosition();
        });

        this._textarea.addEventListener('keyup', () => {
            this._lastCursorPosition = this.getTextPosition();
        });

        // Handle focus/blur for auto-save
        this._textarea.addEventListener('focus', () => {
            this._lastCursorPosition = this.getTextPosition();
            this.startAutoSave();
        });

        this._textarea.addEventListener('blur', () => {
            this.stopAutoSave();
            this.saveContent();
            this.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
        });
    }

    private handleKeydown(e: KeyboardEvent): void {
        // Handle Tab key for indentation
        if (e.key === 'Tab') {
            e.preventDefault();
            this.insertText('  '); // Two spaces for markdown indentation
        }

        // Handle Enter key for markdown line breaks
        if (e.key === 'Enter') {
            const textContent = this._textarea.textContent || '';
            const lines = textContent.split('\n');
            const lastLine = lines[lines.length - 1];
            
            
            // Check if we're at the beginning of a list item (empty list item)
            // This handles both "-" and "- " as well as "1." and "1. "
            if (lastLine.match(/^[\s]*[-*+]\s*$/) || lastLine.match(/^[\s]*\d+\.\s*$/)) {
                // Exit list mode - remove the list marker and add a blank line
                e.preventDefault();
                const indent = lastLine.match(/^([\s]*)/)?.[1] || '';
                this.insertText(`\n${indent}\n`);
            }
            // Check if we're in a numbered list
            else if (lastLine.match(/^[\s]*\d+\.\s/)) {
                e.preventDefault();
                const match = lastLine.match(/^([\s]*)(\d+)\.\s/);
                if (match) {
                    const indent = match[1];
                    const num = parseInt(match[2]) + 1;
                    this.insertText(`\n${indent}${num}. `);
                }
            }
            // Check if we're in a bullet list
            else if (lastLine.match(/^[\s]*[-*+]\s/)) {
                e.preventDefault();
                const match = lastLine.match(/^([\s]*)([-*+])\s/);
                if (match) {
                    const indent = match[1];
                    const marker = match[2];
                    this.insertText(`\n${indent}${marker} `);
                }
            }
            // Check if we're on an empty line after a list item
            else if (lastLine === '' && lines.length > 1) {
                const previousLine = lines[lines.length - 2];
                if (previousLine.match(/^[\s]*[-*+]\s/) || previousLine.match(/^[\s]*\d+\.\s/)) {
                    // We're on an empty line after a list item, exit list mode
                    e.preventDefault();
                    this.insertText('\n');
                }
            }
            // For all other cases, let browser handle Enter naturally
        }

        // Handle Ctrl/Cmd + Z for undo
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            this.undo();
        }

        // Handle Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y for redo
        if (((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) || 
            ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
            e.preventDefault();
            this.redo();
        }

        // Handle Ctrl/Cmd + B for bold
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            this.wrapSelection('**', '**');
        }

        // Handle Ctrl/Cmd + I for italic
        if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
            e.preventDefault();
            this.wrapSelection('*', '*');
        }

        // Handle Ctrl/Cmd + K for link
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            this.wrapSelection('[', '](url)');
        }
    }

    private handlePaste(e: ClipboardEvent): void {
        e.preventDefault();
        
        const clipboardData = e.clipboardData;
        if (!clipboardData) return;

        const text = clipboardData.getData('text/plain');
        if (text) {
            this.insertText(text);
        }
    }

    private insertText(text: string): void {
        const selection = window.getSelection();
        if (!selection) return;
        
        // Ensure we have a range to work with
        let range: Range;
        if (selection.rangeCount > 0) {
            range = selection.getRangeAt(0);
        } else {
            range = document.createRange();
            range.selectNodeContents(this._textarea);
            range.collapse(false);
        }
        
        // Make sure the range is within our textarea
        if (!this._textarea.contains(range.startContainer)) {
            range.selectNodeContents(this._textarea);
            range.collapse(false);
        }
        
        // Insert the text
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        range.collapse(false);
        
        // Update selection
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Ensure focus is maintained
        this._textarea.focus();
        
        // Let handleContentChange deal with saving to undo stack
        this.handleContentChange();
    }

    private wrapSelection(before: string, after: string): void {
        const selection = window.getSelection();
        if (!selection) return;
        
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const selectedText = range.toString();
            const wrappedText = before + selectedText + after;
            
            range.deleteContents();
            range.insertNode(document.createTextNode(wrappedText));
            
            // Set selection to the wrapped text
            range.setStart(range.startContainer, range.startOffset);
            range.setEnd(range.startContainer, range.startOffset + wrappedText.length);
            selection.removeAllRanges();
            selection.addRange(range);
        } else {
            this.insertText(before + after);
            return; // insertText will call handleContentChange
        }
        
        this._textarea.focus();
        
        // Let handleContentChange deal with saving to undo stack
        this.handleContentChange();
    }

    private handleContentChange(): void {
        const content = this._textarea.textContent || '';
        
        // Check if content actually changed from the last saved state
        if (content !== this._lastContent) {
            // Save the state *BEFORE* this change occurred
            // The last tracked content and cursor position is the state we want to undo TO
            this._saveToUndoStack(this._lastContent, this._lastCursorPosition);
            
            // Update to the new current state
            this._lastContent = content;
            
            // Update the cursor position tracker - this will be the state saved for the *next* change's undo
            this._lastCursorPosition = this.getTextPosition();
            
            if (this._options.onChange) {
                this._options.onChange(content);
            }
            
            this.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        }
    }

    private _saveToUndoStack(content: string, cursorPosition: number): void {
        // Don't save duplicate content
        if (content === this._undoStack[this._undoStack.length - 1]?.content) {
            return;
        }
        
        console.log('💾 Saving to undo:', {
            contentLength: content.length,
            cursorPosition: cursorPosition,
            preview: content.substring(Math.max(0, cursorPosition - 5), Math.min(content.length, cursorPosition + 5)),
            cursorChar: content[cursorPosition] || 'END'
        });
        
        this._undoStack.push({content, cursorOffset: cursorPosition});
        
        // Limit stack size
        if (this._undoStack.length > this._maxUndoStackSize) {
            this._undoStack.shift();
        }
        
        // Clear redo stack when new content is added
        this._redoStack = [];
    }

    private startAutoSave(): void {
        if (this._options.autoSave && this._options.autoSaveInterval) {
            this._autoSaveTimer = window.setInterval(() => {
                this.saveContent();
            }, this._options.autoSaveInterval);
        }
    }

    private stopAutoSave(): void {
        if (this._autoSaveTimer) {
            clearInterval(this._autoSaveTimer);
            this._autoSaveTimer = null;
        }
    }

    private saveContent(): void {
        if (this._options.onSave) {
            this._options.onSave(this._textarea.textContent || '');
        }
    }

    private getStyle(): string {
        return `
            :host {
                display: block;
                width: 100%;
                height: 100%;
                --editor-md-bg: var(--color-card-bg, #1e1e1e);
                --editor-md-text: var(--color-text, #cccccc);
                --editor-md-border: var(--color-border, #404040);
                --editor-md-focus-border: var(--color-primary, #007fd4);
                --editor-md-font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                --editor-md-font-size: 14px;
                --editor-md-line-height: 1.6;
                --editor-md-padding: 12px;
                --editor-md-border-radius: 4px;
            }

            .editor-md-textarea {
                display: block;
                width: 100%;
                height: 100%;
                min-height: 100%;
                background: var(--editor-md-bg);
                color: var(--editor-md-text);
                border: 1px solid var(--editor-md-border);
                border-radius: var(--editor-md-border-radius);
                padding: var(--editor-md-padding);
                font-family: var(--editor-md-font-family);
                font-size: var(--editor-md-font-size);
                line-height: var(--editor-md-line-height);
                resize: none;
                outline: none;
                box-sizing: border-box;
                font-variant-ligatures: none;
                tab-size: 2;
                white-space: pre-wrap;
                word-wrap: break-word;
                overflow-wrap: break-word;
                overflow-y: auto;
            }

            .editor-md-textarea:focus {
                border: 1px solid var(--editor-md-border);
                box-shadow: none;
            }


            /* Markdown syntax highlighting */
            .editor-md-textarea {
                white-space: pre-wrap;
                word-wrap: break-word;
                overflow-wrap: break-word;
            }

            /* Custom scrollbar */
            .editor-md-textarea::-webkit-scrollbar {
                width: 8px;
                height: 8px;
            }

            .editor-md-textarea::-webkit-scrollbar-track {
                background: var(--editor-md-bg);
            }

            .editor-md-textarea::-webkit-scrollbar-thumb {
                background: var(--editor-md-border);
                border-radius: 4px;
            }

            .editor-md-textarea::-webkit-scrollbar-thumb:hover {
                background: var(--editor-md-focus-border);
            }
        `;
    }

    // Public API
    public setContent(content: string): void {
        this._textarea.textContent = content;
        this._lastContent = content;
        this.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    }

    public getContent(): string {
        return this._textarea.textContent || '';
    }

    // Generic value property (like HTMLInputElement/HTMLTextAreaElement)
    public get value(): string {
        return this._textarea.textContent || '';
    }

    public set value(content: string) {
        this._textarea.textContent = content;
        this._lastContent = content;
        this.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    }

    // Expose textContent for compatibility with word-counter
    public get textContent(): string {
        return this._textarea.textContent || '';
    }

    public set textContent(content: string) {
        this._textarea.textContent = content;
        this._lastContent = content;
        this.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    }

    public configure(options: EditorMDOptions): void {
        this._options = { ...this._options, ...options };
        
        // Apply configuration
        if (options.fontFamily) {
            this._textarea.style.fontFamily = options.fontFamily;
        }
        
        if (options.fontSize) {
            this._textarea.style.fontSize = options.fontSize;
        }
        
        if (options.lineHeight) {
            this._textarea.style.lineHeight = options.lineHeight;
        }
    }

    public focus(): void {
        this._textarea.focus();
    }

    public blur(): void {
        this._textarea.blur();
    }

    public setSelection(start: number, end: number): void {
        const selection = window.getSelection();
        if (!selection) return;
        
        const range = document.createRange();
        const textNode = this._textarea.firstChild;
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            const maxLength = textNode.textContent?.length || 0;
            range.setStart(textNode, Math.min(start, maxLength));
            range.setEnd(textNode, Math.min(end, maxLength));
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }

    public getSelection(): { start: number; end: number; text: string } {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            return { start: 0, end: 0, text: '' };
        }
        
        const range = selection.getRangeAt(0);
        const text = range.toString();
        const content = this._textarea.textContent || '';
        const start = content.indexOf(text);
        const end = start + text.length;
        
        return { start, end, text };
    }

    private getTextPosition(): number {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return 0;
        
        const range = selection.getRangeAt(0);
        
        // Walk through all text nodes to find the cursor position
        let position = 0;
        const walker = document.createTreeWalker(
            this._textarea,
            NodeFilter.SHOW_TEXT,
            null
        );
        
        let currentNode: Node | null;
        while (currentNode = walker.nextNode()) {
            if (currentNode === range.startContainer) {
                position += range.startOffset;
                break;
            }
            position += currentNode.textContent?.length || 0;
        }
        
        return position;
    }

    private setCursorPosition(position: number): void {
        const selection = window.getSelection();
        if (!selection) {
            console.error('❌ No selection available');
            return;
        }
        
        const textContent = this._textarea.textContent || '';
        const maxPosition = textContent.length;
        const targetPosition = Math.min(Math.max(0, position), maxPosition);
        
        console.log('🔧 setCursorPosition called:', {
            requested: position,
            target: targetPosition,
            contentLength: textContent.length,
            hasTextNode: !!this._textarea.firstChild
        });
        
        try {
            // After setting textContent, there should be a single text node
            const textNode = this._textarea.firstChild;
            
            if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                const range = document.createRange();
                range.setStart(textNode, targetPosition);
                range.setEnd(textNode, targetPosition);
                selection.removeAllRanges();
                selection.addRange(range);
                console.log('✅ Cursor set successfully to:', targetPosition);
            } else {
                console.warn('⚠️ No text node found');
                // No text node, might be empty - try to add one
                if (textContent === '') {
                    const newTextNode = document.createTextNode('');
                    this._textarea.appendChild(newTextNode);
                    const range = document.createRange();
                    range.setStart(newTextNode, 0);
                    range.setEnd(newTextNode, 0);
                    selection.removeAllRanges();
                    selection.addRange(range);
                } else {
                    // Fallback: set cursor to end
                    const range = document.createRange();
                    range.selectNodeContents(this._textarea);
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }
        } catch (error) {
            // Fallback: set cursor to end
            const range = document.createRange();
            range.selectNodeContents(this._textarea);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }


    public insertMarkdown(markdown: string): void {
        this.insertText(markdown);
    }

    public insertHeading(level: number): void {
        const hashes = '#'.repeat(Math.min(level, 6));
        this.insertText(`${hashes} `);
    }

    public insertList(): void {
        this.insertText('- ');
    }

    public insertNumberedList(): void {
        this.insertText('1. ');
    }

    public insertCodeBlock(): void {
        this.insertText('```\n\n```');
        // Position cursor between the code block markers
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const textNode = range.startContainer;
            if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                const cursorPos = Math.max(0, range.startOffset - 4);
                range.setStart(textNode, cursorPos);
                range.setEnd(textNode, cursorPos);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
    }

    public insertQuote(): void {
        this.insertText('> ');
    }

    public insertHorizontalRule(): void {
        this.insertText('\n---\n');
    }

    public insertLink(text: string = 'link text', url: string = 'https://'): void {
        this.insertText(`[${text}](${url})`);
    }

    public insertImage(alt: string = 'alt text', url: string = 'https://'): void {
        this.insertText(`![${alt}](${url})`);
    }

    public insertTable(rows: number = 2, cols: number = 2): void {
        let table = '\n';
        
        // Header row
        table += '|';
        for (let i = 0; i < cols; i++) {
            table += ` Header ${i + 1} |`;
        }
        table += '\n';
        
        // Separator row
        table += '|';
        for (let i = 0; i < cols; i++) {
            table += ' --- |';
        }
        table += '\n';
        
        // Data rows
        for (let i = 0; i < rows; i++) {
            table += '|';
            for (let j = 0; j < cols; j++) {
                table += ` Cell ${i + 1},${j + 1} |`;
            }
            table += '\n';
        }
        
        this.insertText(table);
    }

    // Undo/Redo functionality
    public undo(): boolean {
        if (this._undoStack.length === 0) {
            return false;
        }
        
        // 1. Save current state to redo stack
        const currentContent = this._textarea.textContent || '';
        const currentCursorPosition = this.getTextPosition();
        // Only push if the content is different from the last redo state
        if (currentContent !== this._redoStack[this._redoStack.length - 1]?.content) {
            this._redoStack.push({content: currentContent, cursorOffset: currentCursorPosition});
        }
        
        // 2. Get previous state from undo stack
        const previousState = this._undoStack.pop();
        if (!previousState) return false;
        
        console.log('⏪ Undoing to:', {
            contentLength: previousState.content.length,
            cursorOffset: previousState.cursorOffset,
            preview: previousState.content.substring(Math.max(0, previousState.cursorOffset - 5), Math.min(previousState.content.length, previousState.cursorOffset + 5))
        });
        
        // 3. Update content and last tracked state
        this._textarea.textContent = previousState.content;
        this._lastContent = previousState.content; // Update internal tracker
        this._lastCursorPosition = previousState.cursorOffset; // Update internal cursor tracker
        
        this._textarea.focus();
        
        // 4. Restore cursor position after DOM updates
        requestAnimationFrame(() => {
            console.log('🎯 Setting cursor to offset:', previousState.cursorOffset);
            this.setCursorPosition(previousState.cursorOffset);
            const actualPosition = this.getTextPosition();
            console.log('✅ Actual cursor position after set:', actualPosition);
            if (actualPosition !== previousState.cursorOffset) {
                console.error('❌ MISMATCH! Expected:', previousState.cursorOffset, 'Got:', actualPosition);
            }
        });
        
        // Trigger change event
        if (this._options.onChange) {
            this._options.onChange(previousState.content);
        }
        
        this.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        
        return true;
    }

    public redo(): boolean {
        if (this._redoStack.length === 0) {
            return false;
        }
        
        // 1. Save current state to undo stack
        const currentContent = this._textarea.textContent || '';
        const currentCursorPosition = this.getTextPosition();
        // Only push if the content is different from the last undo state
        if (currentContent !== this._undoStack[this._undoStack.length - 1]?.content) {
            this._undoStack.push({content: currentContent, cursorOffset: currentCursorPosition});
        }
        
        // 2. Get next state from redo stack
        const nextState = this._redoStack.pop();
        if (!nextState) return false;
        
        // 3. Update content and last tracked state
        this._textarea.textContent = nextState.content;
        this._lastContent = nextState.content; // Update internal tracker
        this._lastCursorPosition = nextState.cursorOffset; // Update internal cursor tracker
        
        this._textarea.focus();
        
        // 4. Restore cursor position after DOM updates
        requestAnimationFrame(() => {
            this.setCursorPosition(nextState.cursorOffset);
        });
        
        // Trigger change event
        if (this._options.onChange) {
            this._options.onChange(nextState.content);
        }
        
        this.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        
        return true;
    }

    public canUndo(): boolean {
        return this._undoStack.length > 0;
    }

    public canRedo(): boolean {
        return this._redoStack.length > 0;
    }

    public clearHistory(): void {
        this._undoStack = [];
        this._redoStack = [];
    }

    // Static getter for observed attributes
    static get observedAttributes() {
        return ['font-family', 'font-size', 'line-height'];
    }

    // Attribute changed callback
    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue !== newValue) {
            switch (name) {
                case 'font-family':
                    this._textarea.style.fontFamily = newValue;
                    break;
                case 'font-size':
                    this._textarea.style.fontSize = newValue;
                    break;
                case 'line-height':
                    this._textarea.style.lineHeight = newValue;
                    break;
            }
        }
    }

    // Lifecycle callbacks
    connectedCallback() {
        // Initialize with any attributes
        const fontFamily = this.getAttribute('font-family');
        const fontSize = this.getAttribute('font-size');
        const lineHeight = this.getAttribute('line-height');

        if (fontFamily) this._textarea.style.fontFamily = fontFamily;
        if (fontSize) this._textarea.style.fontSize = fontSize;
        if (lineHeight) this._textarea.style.lineHeight = lineHeight;
    }

    disconnectedCallback() {
        this.stopAutoSave();
    }
}

customElements.define('editor-md', EditorMD);
