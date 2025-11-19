/* pixel-pager.ts
   TypeScript web component — no external libs.
   Usage examples shown after the class.
*/

type PageSizeKey = 'A4' | 'A5' | 'US-Letter' | 'Legal' | 'Tabloid';
type MarginKey = '0.25' | '0.5' | '0.75' | '1' | '1.25' | '1.5';
type DPIMode = 'screen' | 'fixed72';

const PAGE_SIZES_IN: Record<PageSizeKey, { w: number; h: number }> = {
  'A4': { w: 8.27, h: 11.69 },
  'A5': { w: 5.83, h: 8.27 },
  'US-Letter': { w: 8.5, h: 11 },
  'Legal': { w: 8.5, h: 14 },
  'Tabloid': { w: 11, h: 17 },
};

const MARGINS_IN: Record<MarginKey, number> = {
  '0.25': 0.25,   // 0.25 inch
  '0.5': 0.5,     // 0.5 inch  
  '0.75': 0.75,   // 0.75 inch
  '1': 1,         // 1 inch (default)
  '1.25': 1.25,   // 1.25 inch
  '1.5': 1.5,     // 1.5 inch
};

class EditorMDPreview extends HTMLElement {
  static get observedAttributes() { return ['size', 'margin', 'dpi-mode', 'markdown']; }

  private pagesPanel!: HTMLElement;
  private _size: PageSizeKey = 'A4';
  private _margin: MarginKey = '1';
  private _dpiMode: DPIMode = 'screen';
  private _markdown: string = '';
  private measurementBox: HTMLElement | null = null;

    constructor() {
        super();
    
    // Read markdown content BEFORE setting innerHTML
    const rawContent = this.textContent || '';
    console.log('Raw content from constructor:', rawContent);
    
    // Store the markdown content
    this._markdown = rawContent
      .split('\n')
      .map(line => line.replace(/^\s+/, '')) // Remove leading whitespace
      .join('\n')
      .trim();
    
    console.log('Stored markdown:', this._markdown);
    
    this.innerHTML = `
      <div class="viewport">
        <div class="pages" part="pages"></div>
      </div>
    `;
    console.log('Component HTML set:', this.innerHTML);
    
    // Add CSS to document head instead of component
    if (!document.getElementById('editor-md-preview-styles')) {
        const style = document.createElement('style');
      style.id = 'editor-md-preview-styles';
      style.textContent = `
        editor-md-preview { 
          display: block; 
          box-sizing: border-box; 
          font-family: Georgia, "Times New Roman", serif;
          /* CSS isolation to prevent external style inheritance */
          all: initial;
          display: block;
          box-sizing: border-box;
          font-family: Georgia, "Times New Roman", serif;
        }
        editor-md-preview .viewport {
                width: 100%;
          min-height: 200px;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 24px;
          background: var(--preview-bg, #f8f9fa);
          overflow: auto;
        }
        editor-md-preview .pages {
                display: flex;
          flex-wrap: wrap;
          gap: 24px;
          justify-content: center;
          align-items: flex-start;
        }
        editor-md-preview .page {
          background: var(--preview-page-bg, #ffffff);
          box-shadow: 0 8px 22px var(--preview-shadow, rgba(0,0,0,0.12));
          border: 1px solid var(--preview-border, rgba(0,0,0,0.06));
                position: relative;
          box-sizing: border-box;
        }
        editor-md-preview .content {
                box-sizing: border-box;
                overflow: hidden;
          color: var(--preview-text, #333333);
                font-family: var(--preview-font-family, 'Times New Roman', serif);
                font-size: var(--preview-font-size, 12pt);
          /* line-height removed - controlled by external CSS */
          /* Complete style isolation for content area */
          all: unset;
          display: block;
          box-sizing: border-box;
          overflow: hidden;
          color: var(--preview-text, #333333);
          font-family: var(--preview-font-family, 'Times New Roman', serif);
          font-size: var(--preview-font-size, 12pt);
        }
        editor-md-preview .content * { 
          box-sizing: border-box; 
        }
        /* CSS isolation - prevent external style inheritance */
        editor-md-preview * {
          all: unset;
          display: revert;
          box-sizing: border-box;
        }
        
        /* Normalize styles for pixel-perfect pagination */
        editor-md-preview h1, editor-md-preview h2, editor-md-preview h3, 
        editor-md-preview h4, editor-md-preview h5, editor-md-preview h6, 
        editor-md-preview p, editor-md-preview ol, editor-md-preview ul, 
        editor-md-preview li, editor-md-preview blockquote, editor-md-preview pre {
          margin: 0;
          padding: 0;
          line-height: inherit;
          font-family: inherit;
          font-size: inherit;
          font-weight: inherit;
          color: inherit;
        }
        
        /* Reset any inherited styles that could affect pagination */
        editor-md-preview p {
          margin: 0;
          padding: 0;
          line-height: inherit;
          font-family: inherit;
          font-size: inherit;
          font-weight: inherit;
          color: inherit;
          text-indent: 0;
        }
      `;
      document.head.appendChild(style);
    }
    this.pagesPanel = this.querySelector('.pages') as HTMLElement;
    if (!this.pagesPanel) {
      console.error('Could not find .pages element in component');
    }
  }

  connectedCallback() {
    console.log('ConnectedCallback called');
    console.log('Element:', this);
    console.log('Text content:', this.textContent);
    
    const sizeAttr = this.getAttribute('size');
    const marginAttr = this.getAttribute('margin');
    const dpiAttr = this.getAttribute('dpi-mode');
    const mdAttr = this.getAttribute('markdown');

    console.log('Attributes:', { sizeAttr, marginAttr, dpiAttr, mdAttr });

    if (sizeAttr && (sizeAttr in PAGE_SIZES_IN)) this._size = sizeAttr as PageSizeKey;
    if (marginAttr && (marginAttr in MARGINS_IN)) this._margin = marginAttr as MarginKey;
    if (dpiAttr && (dpiAttr === 'screen' || dpiAttr === 'fixed72')) this._dpiMode = dpiAttr as DPIMode;
    if (mdAttr) this._markdown = mdAttr;

    // Read text content from inside the component tags (like the documentation)
    if (!this._markdown) {
      const rawContent = this.textContent || '';
      console.log('Raw text content from connectedCallback:', rawContent);
      // Clean up the markdown content by removing excessive indentation
      this._markdown = rawContent
        .split('\n')
        .map(line => line.replace(/^\s+/, '')) // Remove leading whitespace
        .join('\n')
        .trim();
      console.log('Processed markdown from connectedCallback:', this._markdown);
    } else {
      console.log('Markdown already set from constructor:', this._markdown);
    }

    // If a slotted source textarea exists inside host, read it
    const slotted = this.querySelector('[slot="source"], textarea, [data-markdown-source]');
    if (slotted) {
      if (slotted instanceof HTMLTextAreaElement || (slotted as HTMLInputElement).value !== undefined) {
        const v = (slotted as HTMLTextAreaElement).value || slotted.textContent || '';
        this._markdown = v;
        // watch input if it's a textarea
        if (slotted instanceof HTMLTextAreaElement) {
          slotted.addEventListener('input', () => { this._markdown = slotted.value; this.render(); });
        }
      } else {
        this._markdown = slotted.textContent || this._markdown;
      }
    }

    // initial render
    this.render();
  }

  disconnectedCallback() {
    this.cleanupMeasurementBox();
  }

  attributeChangedCallback(name: string, oldV: any, newV: any) {
    if (oldV === newV) return;
    if (name === 'size' && newV && (newV in PAGE_SIZES_IN)) this._size = newV;
    if (name === 'margin' && newV && (newV in MARGINS_IN)) this._margin = newV;
    if (name === 'dpi-mode' && (newV === 'screen' || newV === 'fixed72')) this._dpiMode = newV;
    if (name === 'markdown') this._markdown = newV || '';
    this.render();
  }

  // ---------- Utilities ----------
  private getCSSPxPerInch(): number {
    if (this._dpiMode === 'fixed72') return 72;
    // screen mode: create temporary element width:1in and read its offsetWidth (CSS pixels per inch)
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    el.style.top = '-9999px';
    el.style.width = '1in';
    document.body.appendChild(el);
    const px = el.getBoundingClientRect().width;
    document.body.removeChild(el);
    return px || 96; // fallback to 96 if something strange
  }

  private inToPx(inches: number) {
    return Math.round(inches * this.getCSSPxPerInch());
  }

  private parseCSSValue(value: string): number {
    // Parse CSS values like '2em', '12pt', '16px', '1.5'
    const num = parseFloat(value);
    if (value.includes('em')) {
      // Convert em to pixels (1em = font-size)
      const fontSize = this.parseCSSValue(getComputedStyle(this).getPropertyValue('--preview-font-size') || '12pt');
      return num * fontSize;
    } else if (value.includes('pt')) {
      // Convert points to pixels (1pt = 1.33px at 96 DPI)
      return num * 1.33;
    } else if (value.includes('px')) {
      return num;
    } else {
      // Assume it's a multiplier (like 1.5)
      const fontSize = this.parseCSSValue(getComputedStyle(this).getPropertyValue('--preview-font-size') || '12pt');
      return num * fontSize;
    }
  }

  // ---------- Markdown -> DOM (lightweight, supports requested tags) ----------
  private parseMarkdown(md: string): HTMLElement {
    const container = document.createElement('div');
    if (!md) return container;
    console.log('Parsing markdown:', md);
    // normalize
    md = md.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // preserve fenced code blocks first
    const codeBlocks: string[] = [];
    md = md.replace(/```([\s\S]*?)```/g, (_m, inner) => {
      const id = codeBlocks.length;
      codeBlocks.push(inner);
      return `\n\n{{{CODEBLOCK_${id}}}}\n\n`;
    });

    // split blocks by blank lines
    const rawBlocks = md.split(/\n\s*\n/);
    console.log('Raw blocks:', rawBlocks);

    for (const raw of rawBlocks) {
      const block = raw.trim();
      if (!block) continue;

      // Heading
      const hMatch = block.match(/^(#{1,6})\s+(.*)$/);
      if (hMatch) {
        const lvl = Math.min(6, hMatch[1].length);
        const el = document.createElement(`h${lvl}`);
        el.innerHTML = this.inlineMarkdownToHtml(hMatch[2]);
        container.appendChild(el);
                continue;
            }
            
      // Code placeholder
      const cbMatch = block.match(/^\{\{\{CODEBLOCK_(\d+)\}\}\}$/);
      if (cbMatch) {
        const idx = Number(cbMatch[1]);
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.textContent = codeBlocks[idx] || '';
        pre.appendChild(code);
        container.appendChild(pre);
                continue;
            }
            
      // Chapter break - three asterisks on a line by themselves
      const chapterBreakMatch = block.match(/^\s*\*{3}\s*$/);
      if (chapterBreakMatch) {
        const chapterBreak = document.createElement('div');
        chapterBreak.className = 'chapter-break';
        chapterBreak.innerHTML = '***';
        chapterBreak.style.textAlign = 'center';
        chapterBreak.style.margin = '1em 0';
        chapterBreak.style.fontSize = '1.2em';
        chapterBreak.style.color = '#666';
        container.appendChild(chapterBreak);
                continue;
            }
            
      // List detection
      if (/^(\s*[-+*]\s+|\s*\d+\.\s+)/m.test(block)) {
        const lines = block.split('\n');
        // very simple: if first line starts with number -> ol else ul
        const first = lines[0].trim();
        const isOrdered = /^\d+\./.test(first);
        const list = document.createElement(isOrdered ? 'ol' : 'ul');
        for (const ln of lines) {
          const m = ln.match(/^\s*(?:[-+*]|\d+\.)\s+(.*)$/);
          if (m) {
            const li = document.createElement('li');
            li.innerHTML = this.inlineMarkdownToHtml(m[1]);
            list.appendChild(li);
          }
        }
        container.appendChild(list);
                continue;
            }
            
      // Blockquote
      if (/^>\s?/.test(block)) {
        const inner = block.replace(/^>\s?/gm, '');
        const bq = document.createElement('blockquote');
        bq.innerHTML = this.inlineMarkdownToHtml(inner);
        container.appendChild(bq);
                continue;
            }
            
      // Paragraph - handle markdown line breaks properly
      const lines = block.split(/\n/);
      const processedLines = lines.map(line => {
        // Check if line ends with two spaces (markdown line break)
        if (line.endsWith('  ')) {
          return line.slice(0, -2) + '<br>';
        }
        return line;
      });
      
      const paragraphText = processedLines.join(' ');
      const p = document.createElement('p');
      p.innerHTML = this.inlineMarkdownToHtml(paragraphText);
      container.appendChild(p);
    }

    return container;
  }

  private inlineMarkdownToHtml(text: string): string {
    // escape
    function esc(s: string) { return s.replace(/&/g, '&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    let s = esc(text);

    // images: ![alt](url) - not necessary but harmless
    s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, url) => `<img alt="${alt.replace(/"/g,'&quot;')}" src="${url}">`);

    // links
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, txt, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${txt}</a>`);

    // inline code
    s = s.replace(/`([^`]+)`/g, (_m, code) => `<code>${code}</code>`);

    // bold
    s = s.replace(/(\*\*|__)(.*?)\1/g, (_m, _p, inner) => `<strong>${inner}</strong>`);

    // italic (do after bold)
    s = s.replace(/(\*|_)(.*?)\1/g, (_m, _p, inner) => `<em>${inner}</em>`);

    return s;
  }

  // ---------- Measurement & Pagination (pixel-perfect using offscreen DOM) ----------
  private ensureMeasurementBox(pageContentWidthPx: number) {
    if (this.measurementBox) return;
    const box = document.createElement('div');
    box.style.position = 'absolute';
    box.style.left = '-99999px';
    box.style.top = '-99999px';
    box.style.visibility = 'hidden';
    box.style.width = `${pageContentWidthPx}px`;
    box.style.boxSizing = 'border-box';
    box.style.whiteSpace = 'normal';
    
    // Use actual CSS variables for measurement to match visible pages
    const computedStyle = getComputedStyle(this);
    box.style.fontFamily = computedStyle.getPropertyValue('--preview-font-family') || 'Georgia, "Times New Roman", serif';
    box.style.fontSize = computedStyle.getPropertyValue('--preview-font-size') || '12pt';
    box.style.lineHeight = computedStyle.getPropertyValue('--preview-line-height') || '2em';
    document.body.appendChild(box);
    this.measurementBox = box;
  }

  private cleanupMeasurementBox() {
    if (this.measurementBox && this.measurementBox.parentElement) {
      this.measurementBox.parentElement.removeChild(this.measurementBox);
    }
    this.measurementBox = null;
  }

  private cloneWithSameStyles(node: HTMLElement): HTMLElement {
    // shallow clone then copy inline styles we depend on (font-size, line-height, font-family, font-weight)
    const clone = node.cloneNode(false) as HTMLElement;
    // copy computed styles that affect layout (we will copy the most important ones)
    const cs = getComputedStyle(node);
    
    // Essential typography styles
    clone.style.fontFamily = cs.fontFamily;
    clone.style.fontSize = cs.fontSize;
    clone.style.fontWeight = cs.fontWeight;
    clone.style.fontStyle = cs.fontStyle;
    clone.style.lineHeight = cs.lineHeight;
    clone.style.letterSpacing = cs.letterSpacing;
    clone.style.wordSpacing = cs.wordSpacing;
    clone.style.whiteSpace = cs.whiteSpace;
    clone.style.textIndent = cs.textIndent;
    
    // All margin and padding properties
    clone.style.marginTop = cs.marginTop;
    clone.style.marginBottom = cs.marginBottom;
    clone.style.marginLeft = cs.marginLeft;
    clone.style.marginRight = cs.marginRight;
    clone.style.paddingTop = cs.paddingTop;
    clone.style.paddingBottom = cs.paddingBottom;
    clone.style.paddingLeft = cs.paddingLeft;
    clone.style.paddingRight = cs.paddingRight;
    
    // Border properties that could affect height
    clone.style.borderTop = cs.borderTop;
    clone.style.borderBottom = cs.borderBottom;
    clone.style.borderLeft = cs.borderLeft;
    clone.style.borderRight = cs.borderRight;
    
    // Display and positioning
    clone.style.display = cs.display;
    clone.style.position = cs.position;
    clone.style.verticalAlign = cs.verticalAlign;
    
    // Text properties
    clone.style.textAlign = cs.textAlign;
    clone.style.textDecoration = cs.textDecoration;
    clone.style.textTransform = cs.textTransform;
    
    // Box model
    clone.style.boxSizing = cs.boxSizing;
    clone.style.width = cs.width;
    clone.style.height = cs.height;
    
    return clone;
  }

  private isTextLike(tag: string) {
    return ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'pre'].includes(tag);
  }

  private splitTextNodeByWords(node: HTMLElement, availableHeightPx: number, pageContentPx: number): { taken: HTMLElement; remainder: HTMLElement | null } {
    // Build clones progressively adding words until adding one more word would overflow availableHeightPx
    if (!this.measurementBox) throw new Error('measurementBox missing');

    const text = node.textContent || '';
    console.log('Splitting text:', text.substring(0, 50) + '...', 'Available height:', availableHeightPx);
    if (!text.trim()) {
      // empty node
      const emptyClone = this.cloneWithSameStyles(node);
      emptyClone.textContent = '';
      return { taken: emptyClone, remainder: null };
    }

    // For code/pre blocks we must preserve whitespace - split by characters if necessary
    const isPre = node.tagName.toLowerCase() === 'pre' || node.querySelector('code');

    const words = isPre ? text.split('') : text.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      const clone = this.cloneWithSameStyles(node);
      clone.textContent = text;
      return { taken: clone, remainder: null };
    }

    // Function to build element from subset of words
    const build = (countWords: number) => {
      const el = this.cloneWithSameStyles(node);
      if (isPre) {
        el.textContent = words.slice(0, countWords).join('');
      } else {
        // reinsert spaces between words to approximate original spacing
        const slice = words.slice(0, countWords).join(' ');
        el.textContent = slice + (countWords < words.length ? ' ' : '');
      }
      return el;
    };

    // quick check: if whole node fits, return as taken
    this.measurementBox.innerHTML = '';
    const fullNode = this.cloneWithSameStyles(node);
    fullNode.textContent = text;
    this.measurementBox.appendChild(fullNode);
    const fullH = this.measurementBox.getBoundingClientRect().height;
    if (fullH <= availableHeightPx) {
      return { taken: fullNode, remainder: null };
    }

    // binary search the largest prefix that fits
    let low = 0, high = words.length, best = 0;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (mid === 0) { low = mid + 1; continue; }
      const candidate = build(mid);
      this.measurementBox.innerHTML = '';
      this.measurementBox.appendChild(candidate);
      const h = this.measurementBox.getBoundingClientRect().height;
      if (h <= availableHeightPx) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    // If best=0, nothing fits on an empty page (force at least 1 word to avoid infinite loop)
    const takeCount = best > 0 ? best : 1;
    const takenEl = build(takeCount);

    const remainderText = isPre
      ? words.slice(takeCount).join('')
      : words.slice(takeCount).join(' ');

    const remainderEl = remainderText ? this.cloneWithSameStyles(node) : null;
    if (remainderEl) {
      remainderEl.textContent = remainderText;
      // Reset margin-top for remainder since it continues on a new page
      remainderEl.style.marginTop = '0';
    }

    return { taken: takenEl, remainder: remainderEl };
  }

  private async paginateAndRenderFromDom(domRoot: HTMLElement) {
    // compute dimensions
    const pxPerInch = this.getCSSPxPerInch();
    const pageDims = PAGE_SIZES_IN[this._size];
    const pageW = this.inToPx(pageDims.w);
    const pageH = this.inToPx(pageDims.h);
    const marginPx = this.inToPx(MARGINS_IN[this._margin]);

    const contentW = pageW - marginPx * 2;
    const contentH = pageH - marginPx * 2;
    
    // Get actual CSS values for calculations
    const computedStyle = getComputedStyle(this);
    const actualLineHeight = this.parseCSSValue(computedStyle.getPropertyValue('--preview-line-height') || '2em');
    const actualFontSize = this.parseCSSValue(computedStyle.getPropertyValue('--preview-font-size') || '12pt');

    // ensure measurement box width equals content width
    this.ensureMeasurementBox(contentW);
    if (!this.measurementBox) throw new Error('measurement box creation failed');

    // Clear visible pages
    console.log('Clearing pages panel');
    this.pagesPanel.innerHTML = '';
    console.log('Pages panel after clearing:', this.pagesPanel.innerHTML);

    // create first visible page and its content container
    const makeVisiblePage = () => {
      const page = document.createElement('div');
      page.className = 'page';
      page.style.width = `${pageW}px`;
      page.style.height = `${pageH}px`;
      page.style.padding = `${marginPx}px`;
      page.style.boxSizing = 'border-box';
      const content = document.createElement('div');
      content.className = 'content';
      content.style.width = '100%';
      content.style.height = `calc(100% - ${marginPx/2}px)`;
      content.style.overflow = 'hidden';
      content.style.boxSizing = 'border-box';
      page.appendChild(content);
      return { page, content };
    };

    let { page: currentPageEl, content: currentContentEl } = makeVisiblePage();
    console.log('Created first page:', currentPageEl);
    console.log('Created first content:', currentContentEl);
    let usedHeightOnPage = 0; // track used height (in px) within content area

    // helper to measure an element's height when placed into measurementBox
    const measureHeight = (el: HTMLElement) => {
      if (!this.measurementBox) return 0;
      this.measurementBox.innerHTML = '';
      this.measurementBox.appendChild(el);
      return this.measurementBox.getBoundingClientRect().height;
    };

    // Walk blocks in order from domRoot
    const blocks = Array.from(domRoot.children) as HTMLElement[];
    
    console.log('Total blocks to process:', blocks.length);
    console.log('All blocks:', blocks.map(b => ({ tag: b.tagName, text: b.textContent?.substring(0, 30) + '...' })));

    const pushNewPage = () => {
      console.log('Pushing new page, current content:', currentContentEl.textContent?.substring(0, 50) + '...');
      console.log('Adding page to pages panel:', currentPageEl);
      this.pagesPanel.appendChild(currentPageEl);
      console.log('Pages panel after adding page:', this.pagesPanel.innerHTML.substring(0, 200) + '...');
      const next = makeVisiblePage();
      currentPageEl = next.page;
      currentContentEl = next.content;
      usedHeightOnPage = 0;
      console.log('New page created, ready for content');
      console.log('New currentContentEl:', currentContentEl);
      console.log('New currentContentEl children count:', currentContentEl.children.length);
    };

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const tag = block.tagName.toLowerCase();
      console.log(`Processing block ${i}:`, tag, block.textContent?.substring(0, 50) + '...');

      // We'll treat list containers by iterating li children
      if (tag === 'ul' || tag === 'ol') {
        // Measure the whole list first
        const cloneList = this.cloneWithSameStyles(block);
        // Need to clone children and keep structure
        cloneList.innerHTML = block.innerHTML;
        const listH = measureHeight(cloneList);
        const cs = getComputedStyle(block);
        const marginTop = parseFloat(cs.marginTop) || 0;
        const marginBottom = parseFloat(cs.marginBottom) || 0;
        const totalListH = listH + marginTop + marginBottom;

        if (usedHeightOnPage + totalListH <= contentH) {
          // fits wholly
          currentContentEl.appendChild(cloneList);
          usedHeightOnPage += totalListH;
        } else {
          // We must place list items individually, splitting across pages as needed
          const liNodes = Array.from(block.children) as HTMLElement[];
          for (let j = 0; j < liNodes.length; j++) {
            const li = liNodes[j] as HTMLElement;
            const cloneLiWrapper = document.createElement(tag);
            cloneLiWrapper.appendChild(this.cloneWithSameStyles(li));
            cloneLiWrapper.querySelector('li')!.innerHTML = li.innerHTML;

            let liH = measureHeight(cloneLiWrapper);
            const liCs = getComputedStyle(li);
            const liMarginTop = parseFloat(liCs.marginTop) || 0;
            const liMarginBottom = parseFloat(liCs.marginBottom) || 0;
            const totalLiH = liH + liMarginTop + liMarginBottom;
            
            if (totalLiH <= contentH - usedHeightOnPage) {
              currentContentEl.appendChild(cloneLiWrapper);
              usedHeightOnPage += totalLiH;
            } else if (liH > contentH) {
              // li itself longer than a page: split within li (word-by-word)
              let remainderLi: HTMLElement | null = li;
              while (remainderLi) {
                const available = contentH - usedHeightOnPage;
                const { taken, remainder } = this.splitTextNodeByWords(remainderLi, available, contentW);
                
                // wrap taken in list container
                const wrapList = document.createElement(tag);
                const takenLi = document.createElement('li');
                takenLi.innerHTML = taken.innerHTML || taken.textContent || '';
                wrapList.appendChild(takenLi);
                currentContentEl.appendChild(wrapList);
                const hTaken = measureHeight(wrapList);
                // Account for margins on the first part of split list item
                const takenCs = getComputedStyle(taken);
                const takenMarginTop = parseFloat(takenCs.marginTop) || 0;
                const takenMarginBottom = parseFloat(takenCs.marginBottom) || 0;
                const totalTakenH = hTaken + takenMarginTop + takenMarginBottom;
                usedHeightOnPage += totalTakenH;

                remainderLi = remainder;
                if (remainderLi) {
                  // new page
                  pushNewPage();
                }
              }
            } else {
              // doesn't fit current page but fits empty page
              pushNewPage();
              currentContentEl.appendChild(cloneLiWrapper);
              usedHeightOnPage += measureHeight(cloneLiWrapper);
            }
          }
        }
        continue;
      }

      // For other block elements:
      const blockClone = this.cloneWithSameStyles(block);
      blockClone.innerHTML = block.innerHTML; // copy children inline html (we rely on this being produced by markdown parser)

      const blockH = measureHeight(blockClone);
      const cs = getComputedStyle(block);
      const marginTop = parseFloat(cs.marginTop) || 0;
      const marginBottom = parseFloat(cs.marginBottom) || 0;
      const totalBlockH = blockH + marginTop + marginBottom;
      
      if (totalBlockH <= contentH - usedHeightOnPage) {
        // fits entirely
        console.log('Adding entire block to page:', block.textContent?.substring(0, 30) + '...');
        currentContentEl.appendChild(blockClone);
        console.log('Content after adding block:', currentContentEl.innerHTML.substring(0, 100) + '...');
        usedHeightOnPage += totalBlockH;
      } else {
        console.log('Block does not fit, attempting to split:', block.textContent?.substring(0, 30) + '...');
        // If the block is text-like, split it word-by-word until remainder is empty
        if (this.isTextLike(tag)) {
          let remainder: HTMLElement | null = blockClone;
          while (remainder) {
            const available = contentH - usedHeightOnPage;
            if (available <= 0) {
              pushNewPage();
              continue;
            }
            const { taken, remainder: r } = this.splitTextNodeByWords(remainder, available, contentW);
            // append taken
            console.log('Adding to page:', taken.textContent?.substring(0, 50) + '...');
            console.log('Taken element:', taken.outerHTML);
            console.log('currentContentEl before append:', currentContentEl);
            console.log('currentContentEl node type:', currentContentEl.nodeType);
            console.log('currentContentEl tag name:', currentContentEl.tagName);
            console.log('currentContentEl children count before:', currentContentEl.children.length);
            
            // Append the taken element to the DOM
            currentContentEl.appendChild(taken.cloneNode(true));
            const hTaken = measureHeight(taken);
            // Account for margins only on the first part of a split block
            const takenCs = getComputedStyle(taken);
            const takenMarginTop = parseFloat(takenCs.marginTop) || 0;
            const takenMarginBottom = parseFloat(takenCs.marginBottom) || 0;
            const totalTakenH = hTaken + takenMarginTop + takenMarginBottom;
            usedHeightOnPage += totalTakenH;
            
            console.log('currentContentEl children count after:', currentContentEl.children.length);
            console.log('Content after adding:', currentContentEl.innerHTML.substring(0, 200) + '...');
            
            // Verify the element is actually in the DOM
            const isInDOM = currentContentEl.contains(taken);
            console.log('Element is in DOM:', isInDOM);
            console.log('Element parent:', taken.parentElement);

            remainder = r;
            if (remainder) {
              console.log('Remainder exists, pushing new page:', remainder.textContent?.substring(0, 50) + '...');
              pushNewPage();
              console.log('After pushNewPage, remainder will be processed in next iteration');
              // Continue processing the remainder on the new page
              continue;
            } else {
              console.log('No remainder, splitting complete for this block');
            }
          }
        } else {
          // Non-splittable block (e.g. table in future): if it doesn't fit on empty page, we still append it to new page and allow overflow
          pushNewPage();
          currentContentEl.appendChild(blockClone);
          usedHeightOnPage += measureHeight(blockClone);
        }
      }
    }

    // push last page
    console.log('Final page content:', currentContentEl.textContent?.substring(0, 100) + '...');
    console.log('Final page HTML:', currentContentEl.innerHTML.substring(0, 300) + '...');
    this.pagesPanel.appendChild(currentPageEl);
    // cleanup measurement DOM
    this.cleanupMeasurementBox();
  }

  // ---------- Alternative rendering approach (improved) ----------
  private paginateAndRenderFromDomImproved(domRoot: HTMLElement, pageWidth: number, pageHeight: number, marginPx: number) {
    // Clear existing pages
    this.pagesPanel.innerHTML = '';
    
    const contentHeight = pageHeight - marginPx * 2;
    const contentWidth = pageWidth - marginPx * 2;
    
    // Ensure measurement box for accurate measurements
    this.ensureMeasurementBox(contentWidth);
    if (!this.measurementBox) throw new Error('measurement box creation failed');

    // Utility to create a new page
    const createNewPage = () => {
      const page = document.createElement('div');
      page.className = 'page';
      page.style.width = `${pageWidth}px`;
      page.style.height = `${pageHeight}px`;
      page.style.padding = `${marginPx}px`;
      page.style.boxSizing = 'border-box';
      
      const content = document.createElement('div');
      content.className = 'content';
      content.style.width = '100%';
    
      content.style.height = `calc(100% - ${marginPx/2}px)`;
      content.style.overflow = 'visible';
      content.style.boxSizing = 'border-box';
      page.appendChild(content);
      
      this.pagesPanel.appendChild(page);
      return content;
    };

    // Utility to measure content height accurately
    const measureContentHeight = (content: HTMLElement) => {
      if (!this.measurementBox) return 0;
      this.measurementBox.innerHTML = '';
      
      // Clone the content with all its children
      const clone = content.cloneNode(true) as HTMLElement;
      this.measurementBox.appendChild(clone);
      
      return this.measurementBox.getBoundingClientRect().height;
    };

    // Utility to measure a single element
    const measureElement = (element: HTMLElement) => {
      if (!this.measurementBox) return 0;
      this.measurementBox.innerHTML = '';
      
      const clone = this.cloneWithSameStyles(element);
      clone.innerHTML = element.innerHTML;
      this.measurementBox.appendChild(clone);
      
      const height = this.measurementBox.getBoundingClientRect().height;
      const cs = getComputedStyle(element);
      const marginTop = parseFloat(cs.marginTop) || 0;
      const marginBottom = parseFloat(cs.marginBottom) || 0;
      
      return height + marginTop + marginBottom;
    };

    // Utility to test if adding an element would cause overflow
    const wouldCauseOverflow = (element: HTMLElement, existingContent: HTMLElement, maxHeight: number) => {
      if (!this.measurementBox) return true;
      this.measurementBox.innerHTML = '';
      
      // Clone the existing content to simulate the current page state
      const existingClone = existingContent.cloneNode(true) as HTMLElement;
      this.measurementBox.appendChild(existingClone);
      
      // Measure current height before adding the element
      const currentHeight = this.measurementBox.getBoundingClientRect().height;
      
      // Add the element to the cloned content to test the actual combined height
      const elementClone = this.cloneWithSameStyles(element);
      elementClone.innerHTML = element.innerHTML;
      existingClone.appendChild(elementClone);
      
      // Measure the total height after adding the element
      const totalHeight = this.measurementBox.getBoundingClientRect().height;
      
      // Check if the total height would exceed the page limit
      // Add a small safety margin (1px) to account for sub-pixel rendering differences
      const safetyMargin = 1;
      const wouldOverflow = totalHeight > (maxHeight - safetyMargin);
      
      // Debug logging with more detailed information
      console.log('Element fit check:', {
        elementText: element.textContent?.substring(0, 50) + '...',
        elementTag: element.tagName.toLowerCase(),
        currentHeight: currentHeight,
        totalHeight: totalHeight,
        maxHeight: maxHeight,
        heightAdded: totalHeight - currentHeight,
        wouldOverflow: wouldOverflow
      });
      
      return wouldOverflow;
    };

    let currentContent = createNewPage();
    let usedHeight = 0;

    // Process block elements (not individual text nodes)
    const blocks = Array.from(domRoot.children) as HTMLElement[];
    
    for (const block of blocks) {
      // Test if adding this block would cause overflow
      if (!wouldCauseOverflow(block, currentContent, contentHeight)) {
        // Block fits - add it to current page
        const clone = this.cloneWithSameStyles(block);
        clone.innerHTML = block.innerHTML;
        currentContent.appendChild(clone);
        
        // Update used height by measuring the actual content
        usedHeight = measureContentHeight(currentContent);
      } else {
        // Block doesn't fit - need to handle splitting
        console.log('Block does not fit, checking if splittable:', block.tagName.toLowerCase());
        if (this.isTextLike(block.tagName.toLowerCase())) {
          // For text-like blocks, split by words
          console.log('Splitting text-like block:', block.textContent?.substring(0, 50) + '...');
          let remainder: HTMLElement | null = block;
          
          while (remainder) {
            const availableHeight = contentHeight - usedHeight;
            if (availableHeight <= 0) {
              // Need new page
              currentContent = createNewPage();
              usedHeight = 0;
              continue;
            }
            
            const { taken, remainder: newRemainder } = this.splitTextNodeByWords(remainder, availableHeight, contentWidth);
            
            // Add the taken portion
            const takenClone = this.cloneWithSameStyles(taken);
            takenClone.innerHTML = taken.innerHTML || taken.textContent || '';
            currentContent.appendChild(takenClone);
            
            // Update used height by measuring the actual content
            usedHeight = measureContentHeight(currentContent);
            
            remainder = newRemainder;
            if (remainder) {
              // Continue on new page
              currentContent = createNewPage();
              usedHeight = 0;
            }
          }
        } else {
          // Non-splittable block - force to new page
          console.log('Non-splittable block, forcing to new page:', block.tagName.toLowerCase());
          currentContent = createNewPage();
          usedHeight = 0;
          
          const clone = this.cloneWithSameStyles(block);
          clone.innerHTML = block.innerHTML;
          currentContent.appendChild(clone);
          usedHeight = measureContentHeight(currentContent);
        }
      }
    }
    
    // Cleanup measurement box
    this.cleanupMeasurementBox();
  }

  // ---------- Public render ----------
  public render() {
    console.log('Rendering with markdown:', this._markdown);
    console.log('Pages panel:', this.pagesPanel);
    
    if (!this.pagesPanel) {
      console.error('No pages panel found, cannot render');
      return;
    }
    
    // parse markdown to DOM
    const root = this.parseMarkdown(this._markdown);
    console.log('Parsed DOM root:', root);
    
    // paginate and render visible pages
    // Use improved approach for better performance and accuracy
    const pxPerInch = this.getCSSPxPerInch();
    const pageDims = PAGE_SIZES_IN[this._size];
    const pageW = this.inToPx(pageDims.w);
    const pageH = this.inToPx(pageDims.h);
    const marginPx = this.inToPx(MARGINS_IN[this._margin]);
    
    this.paginateAndRenderFromDomImproved(root, pageW, pageH, marginPx);
  }

  // allow setting markdown programmatically
  set markdown(md: string) {
    this._markdown = md;
    this.setAttribute('markdown', md);
    this.render();
  }

  get markdown() {
    return this._markdown;
    }
}

customElements.define('editor-md-preview', EditorMDPreview);
console.log('EditorMDPreview component registered');


