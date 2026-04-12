/* pixel-pager.ts
   TypeScript web component — no external libs.
   Usage examples shown after the class.
*/

type PageSizeKey = 'A4' | 'A5' | 'US-Letter' | 'Legal' | 'Tabloid' | 'US-Trade-Paperback';
type MarginKey = '0.25' | '0.5' | '0.75' | '1' | '1.25' | '1.5';
type DPIMode = 'screen' | 'fixed72';
type PrintStyleKey = 'US Paperback' | 'A4 Manuscript' | '';
type HeaderFooterOption = 'page-title-chapter' | 'title-chapter' | 'none';

const PAGE_SIZES_IN: Record<PageSizeKey, { w: number; h: number }> = {
  'A4': { w: 8.27, h: 11.69 },
  'A5': { w: 5.83, h: 8.27 },
  'US-Letter': { w: 8.5, h: 11 },
  'Legal': { w: 8.5, h: 14 },
  'Tabloid': { w: 11, h: 17 },
  'US-Trade-Paperback': { w: 6, h: 9 },
};

const MARGINS_IN: Record<MarginKey, number> = {
  '0.25': 0.25,   // 0.25 inch
  '0.5': 0.5,     // 0.5 inch
  '0.75': 0.75,   // 0.75 inch
  '1': 1,         // 1 inch (default)
  '1.25': 1.25,   // 1.25 inch
  '1.5': 1.5,     // 1.5 inch
};

/** Style preset name -> CSS class (e.g. "US Paperback" -> "us_paperback") */
function styleKeyToClass(name: PrintStyleKey): string {
  if (!name) return '';
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

const PRINT_STYLE_PRESETS: Record<Exclude<PrintStyleKey, ''>, { size: PageSizeKey; margin: MarginKey }> = {
  'US Paperback': { size: 'US-Trade-Paperback', margin: '0.75' },
  'A4 Manuscript': { size: 'A4', margin: '1' },
};

/** Computed style for precise layout calculations */
interface TextLayoutStyle {
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeightPx: number;
  letterSpacing: string;
}

/** Canvas-based precise text measurement - avoids DOM layout drift */
class PrecisionTextMeasurer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private glyphCache: Map<string, number> = new Map();

  constructor() {
    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2d context unavailable');
    this.ctx = ctx;
  }

  measureText(text: string, style: TextLayoutStyle): number {
    this.ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    return this.ctx.measureText(text).width;
  }

  getWordWidth(word: string, style: TextLayoutStyle): number {
    const cacheKey = `${word}|${style.fontFamily}|${style.fontSize}|${style.fontWeight}`;
    if (!this.glyphCache.has(cacheKey)) {
      this.glyphCache.set(cacheKey, this.measureText(word, style));
    }
    return this.glyphCache.get(cacheKey)!;
  }

  getSpaceWidth(style: TextLayoutStyle): number {
    return this.getWordWidth(' ', style);
  }

  wrapTextToLines(text: string, availableWidthPx: number, style: TextLayoutStyle): string[] {
    return this.wrapTextToLinesCanvas(text, availableWidthPx, style);
  }

  private wrapTextToLinesCanvas(text: string, availableWidthPx: number, style: TextLayoutStyle): string[] {
    const lines: string[] = [];
    const spaceWidth = this.getSpaceWidth(style);
    const words = text.split(/(\s+)/);
    let currentLine = '';
    let currentWidth = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const isSpace = /^\s+$/.test(word);
      const wordWidth = isSpace ? spaceWidth * word.length : this.getWordWidth(word, style);

      if (currentWidth + wordWidth <= availableWidthPx) {
        currentLine += word;
        currentWidth += wordWidth;
      } else {
        if (currentLine.trim().length > 0) {
          lines.push(currentLine.replace(/\s+$/, ''));
        }
        if (isSpace) {
          currentLine = '';
          currentWidth = 0;
        } else {
          if (wordWidth > availableWidthPx) {
            const chars = word.split('');
            let chunk = '';
            let chunkWidth = 0;
            for (const c of chars) {
              const cw = this.getWordWidth(c, style);
              if (chunkWidth + cw <= availableWidthPx) {
                chunk += c;
                chunkWidth += cw;
              } else {
                if (chunk) lines.push(chunk);
                chunk = c;
                chunkWidth = cw;
              }
            }
            currentLine = chunk;
            currentWidth = chunkWidth;
          } else {
            currentLine = word;
            currentWidth = wordWidth;
          }
        }
      }
    }
    if (currentLine.trim().length > 0) {
      lines.push(currentLine.replace(/\s+$/, ''));
    }
    return lines;
  }
}

class EditorMDPreview extends HTMLElement {
  static get observedAttributes() { return ['size', 'margin', 'dpi-mode', 'markdown', 'print-style', 'header-option', 'footer-option']; }

  private pagesPanel!: HTMLElement;
  private _size: PageSizeKey = 'A4';
  private _margin: MarginKey = '1';
  private _dpiMode: DPIMode = 'screen';
  private _isPrinting = false;
  private _markdown: string = '';
  private _printStyle: PrintStyleKey = '';
  private _headerOption: HeaderFooterOption = 'none';
  private _footerOption: HeaderFooterOption = 'none';
  private measurementBox: HTMLElement | null = null;
  private _printStyleEl: HTMLStyleElement | null = null;
  private textMeasurer: PrecisionTextMeasurer = new PrecisionTextMeasurer();

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
          all: initial;
          display: block;
          box-sizing: border-box;
          font-family: Georgia, "Times New Roman", serif;
          --preview-line-height: 1.5;
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
          width: 100%;
        }
        editor-md-preview .page {
          background: var(--preview-page-bg, #ffffff);
          box-shadow: 0 8px 22px var(--preview-shadow, rgba(0,0,0,0.12));
          border: 1px solid var(--preview-border, rgba(0,0,0,0.06));
                position: relative;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }
        editor-md-preview .page-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow: hidden;
        }
        editor-md-preview .page-header,
        editor-md-preview .page-footer {
          flex-shrink: 0;
          font-size: 0.85em;
          line-height: 1.4;
          color: var(--preview-text, #333);
          font-family: var(--preview-font-family, inherit);
          padding: 0.25em 0;
          border-bottom: 1px solid var(--preview-border, rgba(0,0,0,0.1));
        }
        editor-md-preview .page[data-page-side="left"] .page-header,
        editor-md-preview .page[data-page-side="left"] .page-footer {
          text-align: left;
        }
        editor-md-preview .page[data-page-side="right"] .page-header,
        editor-md-preview .page[data-page-side="right"] .page-footer {
          text-align: right;
        }
        editor-md-preview .page-footer {
          border-bottom: none;
          border-top: 1px solid var(--preview-border, rgba(0,0,0,0.1));
        }
        editor-md-preview .page-header {
          border-top: none;
        }
        editor-md-preview .preview-content {
          all: unset;
          display: block;
          flex: 1;
          box-sizing: border-box;
          overflow: hidden;
          color: var(--preview-text, #333333);
          font-family: var(--preview-font-family, 'Times New Roman', serif);
          font-size: var(--preview-font-size, 12pt);
          line-height: var(--preview-line-height, 1.5);
        }
        editor-md-preview .preview-content * { 
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

        /* --- Print style presets (pixel-perfect for Affinity/print) --- */

        /* US Trade Paperback 6x9: professional novel typography, ~36 lines per page */
        editor-md-preview.us_paperback {
          --preview-font-family: Garamond, "EB Garamond", "Cormorant Garamond", Georgia, serif;
          --preview-font-size: 11pt;
          --preview-line-height: 1.43;
          --preview-text-align: justify;
          --preview-paragraph-indent: 1em;
        }
        editor-md-preview.us_paperback .preview-content {
          font-family: var(--preview-font-family);
          font-size: var(--preview-font-size);
          line-height: var(--preview-line-height);
          text-align: var(--preview-text-align);
        }
        editor-md-preview.us_paperback .preview-content p {
          text-indent: var(--preview-paragraph-indent);
        }

        /* A4 Manuscript: 12pt Times, double-spaced, 0.5in paragraph indent */
        editor-md-preview.a4_manuscript {
          --preview-font-family: "Times New Roman", Times, serif;
          --preview-font-size: 12pt;
          --preview-line-height: 2;
          --preview-text-align: left;
          --preview-paragraph-indent: 0.5in;
        }
        editor-md-preview.a4_manuscript .preview-content {
          font-family: var(--preview-font-family);
          font-size: var(--preview-font-size);
          line-height: var(--preview-line-height);
          text-align: var(--preview-text-align);
        }
        editor-md-preview.a4_manuscript .preview-content p {
          text-indent: var(--preview-paragraph-indent);
        }
      `;
      document.head.appendChild(style);
    }
    this.pagesPanel = this.querySelector('.pages') as HTMLElement;
    if (!this.pagesPanel) {
      console.error('Could not find .pages element in component');
    }
  }

  private applyPrintStyleClass() {
    this.classList.remove('us_paperback', 'a4_manuscript');
    const cls = styleKeyToClass(this._printStyle);
    if (cls) this.classList.add(cls);
  }

  connectedCallback() {
    console.log('ConnectedCallback called');
    console.log('Element:', this);
    console.log('Text content:', this.textContent);
    
    const sizeAttr = this.getAttribute('size');
    const marginAttr = this.getAttribute('margin');
    const dpiAttr = this.getAttribute('dpi-mode');
    const mdAttr = this.getAttribute('markdown');
    const printStyleAttr = this.getAttribute('print-style');

    console.log('Attributes:', { sizeAttr, marginAttr, dpiAttr, mdAttr, printStyleAttr });

    if (printStyleAttr && printStyleAttr in PRINT_STYLE_PRESETS) {
      this._printStyle = printStyleAttr as Exclude<PrintStyleKey, ''>;
      const preset = PRINT_STYLE_PRESETS[this._printStyle];
      this._size = preset.size;
      this._margin = preset.margin;
      this.applyPrintStyleClass();
    } else {
      if (sizeAttr && (sizeAttr in PAGE_SIZES_IN)) this._size = sizeAttr as PageSizeKey;
      if (marginAttr && (marginAttr in MARGINS_IN)) this._margin = marginAttr as MarginKey;
    }
    if (dpiAttr && (dpiAttr === 'screen' || dpiAttr === 'fixed72')) this._dpiMode = dpiAttr as DPIMode;
    if (mdAttr) this._markdown = mdAttr;
    const headerAttr = this.getAttribute('header-option');
    const footerAttr = this.getAttribute('footer-option');
    if (headerAttr === 'page-title-chapter' || headerAttr === 'title-chapter' || headerAttr === 'none') this._headerOption = headerAttr;
    if (footerAttr === 'page-title-chapter' || footerAttr === 'title-chapter' || footerAttr === 'none') this._footerOption = footerAttr;

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
    if (name === 'print-style') {
      if (newV && newV in PRINT_STYLE_PRESETS) {
        this._printStyle = newV as Exclude<PrintStyleKey, ''>;
        const preset = PRINT_STYLE_PRESETS[this._printStyle];
        this._size = preset.size;
        this._margin = preset.margin;
      } else {
        this._printStyle = '';
      }
      this.applyPrintStyleClass();
    } else if (name === 'size' && newV && (newV in PAGE_SIZES_IN) && !this._printStyle) {
      this._size = newV;
    } else if (name === 'margin' && newV && (newV in MARGINS_IN) && !this._printStyle) {
      this._margin = newV;
    } else if (name === 'dpi-mode' && (newV === 'screen' || newV === 'fixed72')) {
      this._dpiMode = newV;
    } else if (name === 'markdown') {
      this._markdown = newV || '';
    } else if (name === 'header-option' && (newV === 'page-title-chapter' || newV === 'title-chapter' || newV === 'none')) {
      this._headerOption = newV as HeaderFooterOption;
    } else if (name === 'footer-option' && (newV === 'page-title-chapter' || newV === 'title-chapter' || newV === 'none')) {
      this._footerOption = newV as HeaderFooterOption;
    }
    this.render();
  }

  // ---------- Utilities ----------
  private getCSSPxPerInch(): number {
    // Printing is defined in browsers as 1in = 96 CSS px. Force that for pagination so the
    // generated page pixel sizes match the print engine and don't get auto-shrunk (~50% on retina).
    if (this._isPrinting) return 96;
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
    const num = parseFloat(value);
    if (value.includes('em')) {
      const fontSize = this.parseCSSValue(getComputedStyle(this).getPropertyValue('--preview-font-size') || '12pt');
      return num * fontSize;
    } else if (value.includes('pt')) {
      return num * 1.33;
    } else if (value.includes('px')) {
      return num;
    } else {
      const fontSize = this.parseCSSValue(getComputedStyle(this).getPropertyValue('--preview-font-size') || '12pt');
      return num * fontSize;
    }
  }

  private getTextLayoutStyleForNode(node: HTMLElement, measurementBox: HTMLElement): TextLayoutStyle {
    const clone = node.cloneNode(false) as HTMLElement;
    clone.textContent = 'M';
    measurementBox.innerHTML = '';
    measurementBox.appendChild(clone);
    const style = this.getTextLayoutStyleFromElement(clone);
    measurementBox.removeChild(clone);
    return style;
  }

  private getTextLayoutStyleFromElement(el: HTMLElement): TextLayoutStyle {
    const cs = getComputedStyle(el);
    const fontFamily = cs.fontFamily || 'Georgia, "Times New Roman", serif';
    const fontSize = cs.fontSize || '12pt';
    const fontWeight = cs.fontWeight || '400';
    const lineHeightVal = (cs.lineHeight || '1.5').trim();
    let lineHeightPx: number;
    if (lineHeightVal === 'normal') {
      lineHeightPx = this.parseCSSValue(fontSize) * 1.2;
    } else if (/^\d+(\.\d+)?(px|pt|em)$/.test(lineHeightVal)) {
      lineHeightPx = this.parseCSSValue(lineHeightVal);
    } else {
      lineHeightPx = this.parseCSSValue(fontSize) * (parseFloat(lineHeightVal) || 1.5);
    }
    return {
      fontFamily,
      fontSize,
      fontWeight,
      lineHeightPx: Math.ceil(lineHeightPx),
      letterSpacing: cs.letterSpacing || 'normal',
    };
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
    box.className = 'preview-content';
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
    this.appendChild(box);
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
    // When node is detached, its computed typography is wrong (browser defaults). Skip typography
    // so clone inherits from parent (measurement box or preview-content) which has correct styles.
    const useTypography = node.isConnected;

    // Essential typography styles (skip when detached - inherit from parent)
    if (useTypography) {
      clone.style.fontFamily = cs.fontFamily;
      clone.style.fontSize = cs.fontSize;
      clone.style.fontWeight = cs.fontWeight;
      clone.style.fontStyle = cs.fontStyle;
      clone.style.lineHeight = cs.lineHeight;
      clone.style.letterSpacing = cs.letterSpacing;
      clone.style.wordSpacing = cs.wordSpacing;
      clone.style.whiteSpace = cs.whiteSpace;
      clone.style.textIndent = cs.textIndent;
    }
    
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

  /**
   * Wrap text to lines using DOM layout so wrapping matches the browser exactly.
   * Uses a clone of the node so text-indent, margins, and all inherited styles match.
   * Avoids canvas measurement drift that causes short last lines.
   */
  private wrapTextToLinesDOM(node: HTMLElement, text: string, availableWidthPx: number, style: TextLayoutStyle): string[] {
    if (!this.measurementBox) return this.textMeasurer.wrapTextToLines(text, availableWidthPx, style);
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];
    const lineHeightPx = style.lineHeightPx;
    const lines: string[] = [];
    const probe = this.cloneWithSameStyles(node);
    probe.style.width = `${availableWidthPx}px`;
    probe.style.maxWidth = `${availableWidthPx}px`;
    probe.style.boxSizing = 'border-box';
    probe.style.position = 'absolute';
    probe.style.left = '-99999px';
    probe.style.top = '-99999px';
    probe.style.visibility = 'hidden';
    this.measurementBox.appendChild(probe);
    let currentWords: string[] = [];
    for (const word of words) {
      const testWords = currentWords.length ? [...currentWords, word] : [word];
      const testText = testWords.join(' ');
      probe.textContent = testText;
      // text-indent only applies to the first line of the paragraph; we replace content each
      // iteration so the probe always shows "first line" - must disable indent for lines 2+
      if (lines.length > 0) probe.style.textIndent = '0';
      const h = probe.getBoundingClientRect().height;
      if (h > lineHeightPx && currentWords.length > 0) {
        lines.push(currentWords.join(' '));
        currentWords = [word];
      } else {
        currentWords = testWords;
      }
    }
    if (currentWords.length > 0) lines.push(currentWords.join(' '));
    this.measurementBox.removeChild(probe);
    return lines;
  }

  /**
   * Split text block using DOM-based line wrapping (matches browser layout).
   * Uses wrapTextToLinesDOM for accurate wrapping, then takes lines that fit.
   */
  private splitTextNodeByWords(node: HTMLElement, availableHeightPx: number, pageContentPx: number): { taken: HTMLElement | null; remainder: HTMLElement | null } {
    const text = node.textContent || '';
    if (!text.trim()) {
      const emptyClone = this.cloneWithSameStyles(node);
      emptyClone.textContent = '';
      return { taken: emptyClone, remainder: null };
    }

    const isPre = node.tagName.toLowerCase() === 'pre' || node.querySelector('code');
    const words = isPre ? text.split('') : text.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      const clone = this.cloneWithSameStyles(node);
      clone.textContent = text;
      return { taken: clone, remainder: null };
    }

    const build = (countWords: number) => {
      const el = this.cloneWithSameStyles(node);
      if (isPre) {
        el.textContent = words.slice(0, countWords).join('');
      } else {
        const slice = words.slice(0, countWords).join(' ');
        el.textContent = slice + (countWords < words.length ? ' ' : '');
      }
      return el;
    };

    if (isPre) {
      return this.splitPreBlock(node, text, words, availableHeightPx, pageContentPx, build);
    }

    this.ensureMeasurementBox(pageContentPx);
    const style = this.measurementBox
      ? this.getTextLayoutStyleForNode(node, this.measurementBox)
      : this.getTextLayoutStyleFromElement(this);
    const lines = this.wrapTextToLinesDOM(node, text, pageContentPx, style);
    const lineHeightPx = style.lineHeightPx;
    const safeAvailable = Math.max(0, availableHeightPx - lineHeightPx);
    const maxLines = Math.floor(safeAvailable / lineHeightPx);
    if (maxLines <= 0) {
      const remainderEl = this.cloneWithSameStyles(node);
      remainderEl.textContent = text;
      remainderEl.style.marginTop = '0';
      return { taken: null, remainder: remainderEl };
    }

    let takeCountLines = Math.min(lines.length, maxLines);
    const remainderLineCount = lines.length - takeCountLines;

    if (remainderLineCount === 1 && takeCountLines > 1) {
      takeCountLines -= 1;
    } else if (takeCountLines > 1) {
      const lastLineWordCount = lines[takeCountLines - 1].split(/\s+/).filter(Boolean).length;
      if (lastLineWordCount <= 2 && remainderLineCount > 0) {
        takeCountLines -= 1;
      }
    }
    if (takeCountLines === 1 && remainderLineCount > 1) {
      const remainderEl = this.cloneWithSameStyles(node);
      remainderEl.textContent = text;
      remainderEl.style.marginTop = '0';
      return { taken: null, remainder: remainderEl };
    }

    const linesForPage = lines.slice(0, takeCountLines);
    const remainderLines = lines.slice(takeCountLines);
    const takenText = linesForPage.join(' ');
    const remainderText = remainderLines.join(' ');

    const takenEl = this.cloneWithSameStyles(node);
    takenEl.textContent = takenText;
    const remainderEl = remainderText.trim() ? this.cloneWithSameStyles(node) : null;
    if (remainderEl) {
      remainderEl.textContent = remainderText.trim();
      remainderEl.style.marginTop = '0';
    }
    return { taken: takenEl, remainder: remainderEl };
  }

  private splitPreBlock(
    node: HTMLElement,
    text: string,
    words: string[],
    availableHeightPx: number,
    pageContentPx: number,
    build: (n: number) => HTMLElement
  ): { taken: HTMLElement | null; remainder: HTMLElement | null } {
    if (!this.measurementBox) throw new Error('measurementBox missing');
    this.ensureMeasurementBox(pageContentPx);
    const safeAvailable = Math.max(0, availableHeightPx - 2);
    this.measurementBox.innerHTML = '';
    const fullNode = build(words.length);
    fullNode.textContent = text;
    this.measurementBox.appendChild(fullNode);
    if (this.measurementBox.getBoundingClientRect().height <= safeAvailable) {
      return { taken: fullNode, remainder: null };
    }
    let low = 0, high = words.length, best = 0;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (mid === 0) { low = mid + 1; continue; }
      const candidate = build(mid);
      this.measurementBox.innerHTML = '';
      this.measurementBox.appendChild(candidate);
      if (this.measurementBox.getBoundingClientRect().height <= safeAvailable) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    const takeCount = best > 0 ? best : 1;
    const takenEl = build(takeCount);
    const remainderText = words.slice(takeCount).join('');
    const remainderEl = remainderText ? this.cloneWithSameStyles(node) : null;
    if (remainderEl) {
      remainderEl.textContent = remainderText;
      remainderEl.style.marginTop = '0';
    }
    return { taken: takenEl, remainder: remainderEl };
  }

  private async paginateAndRenderFromDom(domRoot: HTMLElement) {
    const pxPerInch = this.getCSSPxPerInch();
    const pageDims = PAGE_SIZES_IN[this._size];
    const pageW = this.inToPx(pageDims.w);
    const pageH = this.inToPx(pageDims.h);
    const marginPx = this.inToPx(MARGINS_IN[this._margin]);
    const lineHeightPx = this.getTextLayoutStyleFromElement(this).lineHeightPx;
    const bottomPadding = Math.max(marginPx - lineHeightPx, marginPx / 2);

    const contentW = pageW - marginPx * 2;
    const contentH = pageH - marginPx - bottomPadding;
    
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

    const makeVisiblePage = () => {
      const page = document.createElement('div');
      page.className = 'page';
      page.style.width = `${pageW}px`;
      page.style.height = `${pageH}px`;
      page.style.padding = `${marginPx}px ${marginPx}px ${bottomPadding}px ${marginPx}px`;
      page.style.boxSizing = 'border-box';
      const content = document.createElement('div');
      content.className = 'preview-content';
      content.style.width = '100%';
      content.style.height = '100%';
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
                if (!taken) {
                  pushNewPage();
                  remainderLi = remainder;
                  continue;
                }
                const wrapList = document.createElement(tag);
                const takenLi = document.createElement('li');
                takenLi.innerHTML = taken.innerHTML || taken.textContent || '';
                wrapList.appendChild(takenLi);
                currentContentEl.appendChild(wrapList);
                const hTaken = measureHeight(wrapList);
                const takenCs = getComputedStyle(taken);
                const takenMarginTop = parseFloat(takenCs.marginTop) || 0;
                const takenMarginBottom = parseFloat(takenCs.marginBottom) || 0;
                const totalTakenH = hTaken + takenMarginTop + takenMarginBottom;
                usedHeightOnPage += totalTakenH;

                remainderLi = remainder;
                if (remainderLi) pushNewPage();
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
            if (!taken) {
              pushNewPage();
              remainder = r;
              continue;
            }
            currentContentEl.appendChild(taken.cloneNode(true));
            const hTaken = measureHeight(taken);
            const takenCs = getComputedStyle(taken);
            const takenMarginTop = parseFloat(takenCs.marginTop) || 0;
            const takenMarginBottom = parseFloat(takenCs.marginBottom) || 0;
            const totalTakenH = hTaken + takenMarginTop + takenMarginBottom;
            usedHeightOnPage += totalTakenH;

            remainder = r;
            if (remainder) { pushNewPage(); continue; }
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
    this.pagesPanel.innerHTML = '';
    const lineHeightPx = this.getTextLayoutStyleFromElement(this).lineHeightPx;
    const bottomPadding = Math.max(marginPx - lineHeightPx, marginPx / 2);
    const headerFooterHeight = this._headerOption !== 'none' || this._footerOption !== 'none' ? Math.ceil(lineHeightPx * 1.5) : 0;
    const headerHeight = this._headerOption !== 'none' ? headerFooterHeight : 0;
    const footerHeight = this._footerOption !== 'none' ? headerFooterHeight : 0;
    const contentHeight = pageHeight - marginPx - bottomPadding - headerHeight - footerHeight;
    const contentWidth = pageWidth - marginPx * 2;

    const title = (() => {
      const h1 = domRoot.querySelector('h1');
      return h1 ? (h1.textContent || '').trim() : '';
    })();

    // Ensure measurement box for accurate measurements
    this.ensureMeasurementBox(contentWidth);
    if (!this.measurementBox) throw new Error('measurement box creation failed');

    let pageNumber = 0;

    // Page 1 = title page = first right page. Odd = right (chapter | page), even = left (page | title).
    const formatHeaderFooter = (opt: HeaderFooterOption, pageNum: number, chapter: string, isHeader: boolean): string => {
      if (opt === 'none') return '';
      if (isHeader && pageNum === 1) return ''; // Title page never has header
      const isRight = pageNum % 2 === 1;
      if (isRight) return chapter ? `${chapter} | ${pageNum}` : String(pageNum);
      return title ? `${pageNum} | ${title}` : String(pageNum);
    };

    const createNewPage = (chapter: string): { content: HTMLElement; page: HTMLElement; headerEl: HTMLElement | null; footerEl: HTMLElement | null } => {
      pageNumber += 1;
      const page = document.createElement('div');
      page.className = 'page';
      page.dataset.pageSide = pageNumber % 2 === 1 ? 'right' : 'left'; // Page 1 = title page = right
      page.style.width = `${pageWidth}px`;
      page.style.height = `${pageHeight}px`;
      page.style.padding = `${marginPx}px ${marginPx}px ${bottomPadding}px ${marginPx}px`;
      page.style.boxSizing = 'border-box';

      const headerText = formatHeaderFooter(this._headerOption, pageNumber, chapter, true);
      const headerEl = this._headerOption !== 'none' && headerText
        ? (() => { const h = document.createElement('div'); h.className = 'page-header'; h.textContent = headerText; return h; })()
        : null;
      const footerText = formatHeaderFooter(this._footerOption, pageNumber, chapter, false);
      const footerEl = this._footerOption !== 'none' && footerText
        ? (() => { const f = document.createElement('div'); f.className = 'page-footer'; f.textContent = footerText; return f; })()
        : null;

      const body = document.createElement('div');
      body.className = 'page-body';
      body.style.flex = '1';
      body.style.minHeight = '0';
      body.style.display = 'flex';
      body.style.flexDirection = 'column';
      body.style.overflow = 'hidden';

      if (headerEl) page.appendChild(headerEl);
      const content = document.createElement('div');
      content.className = 'preview-content';
      content.style.flex = '1';
      content.style.minHeight = '0';
      content.style.overflow = 'hidden';
      content.style.boxSizing = 'border-box';
      body.appendChild(content);
      page.appendChild(body);
      if (footerEl) page.appendChild(footerEl);

      this.pagesPanel.appendChild(page);
      return { content, page, headerEl, footerEl };
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

    let currentChapter = '';
    let result = createNewPage(currentChapter);
    let currentContent = result.content;
    let currentHeaderEl = result.headerEl;
    let currentFooterEl = result.footerEl;
    let currentPageNumber = pageNumber;
    let usedHeight = 0;

    const updateHeaderFooter = (chapter: string) => {
      if (currentHeaderEl) currentHeaderEl.textContent = formatHeaderFooter(this._headerOption, currentPageNumber, chapter, true);
      if (currentFooterEl) currentFooterEl.textContent = formatHeaderFooter(this._footerOption, currentPageNumber, chapter, false);
    };

    // Process block elements (not individual text nodes)
    const blocks = Array.from(domRoot.children) as HTMLElement[];

    for (const block of blocks) {
      const tag = block.tagName.toLowerCase();
      if (tag === 'h2') currentChapter = (block.textContent || '').trim();

      // Test if adding this block would cause overflow
      if (!wouldCauseOverflow(block, currentContent, contentHeight)) {
        // Block fits - add it to current page
        const clone = this.cloneWithSameStyles(block);
        clone.innerHTML = block.innerHTML;
        currentContent.appendChild(clone);
        if (tag === 'h2') updateHeaderFooter(currentChapter);
        usedHeight = measureContentHeight(currentContent);
      } else {
        // Block doesn't fit - need to handle splitting
        console.log('Block does not fit, checking if splittable:', tag);
        if (this.isTextLike(tag)) {
          console.log('Splitting text-like block:', block.textContent?.substring(0, 50) + '...');
          let remainder: HTMLElement | null = block;

          while (remainder) {
            const availableHeight = contentHeight - usedHeight;
            if (availableHeight <= 0) {
              result = createNewPage(currentChapter);
              currentContent = result.content;
              currentHeaderEl = result.headerEl;
              currentFooterEl = result.footerEl;
              currentPageNumber = pageNumber;
              usedHeight = 0;
              continue;
            }

            const { taken, remainder: newRemainder } = this.splitTextNodeByWords(remainder, availableHeight, contentWidth);
            if (!taken) {
              result = createNewPage(currentChapter);
              currentContent = result.content;
              currentHeaderEl = result.headerEl;
              currentFooterEl = result.footerEl;
              currentPageNumber = pageNumber;
              usedHeight = 0;
              remainder = newRemainder;
              continue;
            }
            const takenClone = this.cloneWithSameStyles(taken);
            takenClone.innerHTML = taken.innerHTML || taken.textContent || '';
            currentContent.appendChild(takenClone);
            usedHeight = measureContentHeight(currentContent);
            remainder = newRemainder;
            if (remainder) {
              result = createNewPage(currentChapter);
              currentContent = result.content;
              currentHeaderEl = result.headerEl;
              currentFooterEl = result.footerEl;
              currentPageNumber = pageNumber;
              usedHeight = 0;
            }
          }
        } else {
          console.log('Non-splittable block, forcing to new page:', tag);
          result = createNewPage(currentChapter);
          currentContent = result.content;
          currentHeaderEl = result.headerEl;
          currentFooterEl = result.footerEl;
          currentPageNumber = pageNumber;
          usedHeight = 0;

          const clone = this.cloneWithSameStyles(block);
          clone.innerHTML = block.innerHTML;
          currentContent.appendChild(clone);
          if (tag === 'h2') updateHeaderFooter(currentChapter);
          usedHeight = measureContentHeight(currentContent);
        }
      }
    }
    
    // Cleanup measurement box
    this.cleanupMeasurementBox();
  }

  /** Print only the pages. Hides other content, sets @page size. Print uses display px/in (e.g. 192 on retina), so scale up by pxPerInch/96 to match paper. */
  public print() {
    const dims = PAGE_SIZES_IN[this._size]; // e.g., { w: 8.5, h: 11 } for letter
    const sizeCss = `${dims.w}in ${dims.h}in`;
    
    const cleanup = () => {
        document.body.classList.remove('editor-md-preview-printing');
        this.classList.remove('editor-md-preview-print-target');
        if (this._printStyleEl && this._printStyleEl.parentNode) {
            this._printStyleEl.parentNode.removeChild(this._printStyleEl);
            this._printStyleEl = null;
        }
        this._isPrinting = false;
        // Restore on-screen pagination after printing.
        this.render();
    };

    window.addEventListener('afterprint', cleanup, { once: true });

    document.body.classList.add('editor-md-preview-printing');
    this.classList.add('editor-md-preview-print-target');

    // Re-paginate specifically for print at 96 CSS px/in.
    this._isPrinting = true;
    this.render();

    this._printStyleEl = document.createElement('style');
    this._printStyleEl.id = 'editor-md-preview-print-styles';
    this._printStyleEl.textContent = `
        @media print {
            /* Set the physical page size */
            @page { 
                size: ${sizeCss};
                margin: 0 !important;
            }
            
            /* Hide everything except our preview */
            html, body { 
                margin: 0 !important; 
                padding: 0 !important; 
                background: white;
                overflow: visible !important;
            }
            
            body.editor-md-preview-printing * { 
                visibility: hidden !important; 
            }
            
            /* Show only the preview component */
            body.editor-md-preview-printing editor-md-preview.editor-md-preview-print-target,
            body.editor-md-preview-printing editor-md-preview.editor-md-preview-print-target .viewport,
            body.editor-md-preview-printing editor-md-preview.editor-md-preview-print-target .pages,
            body.editor-md-preview-printing editor-md-preview.editor-md-preview-print-target .page,
            body.editor-md-preview-printing editor-md-preview.editor-md-preview-print-target .page * {
                visibility: visible !important;
                background: white;
            }
            
            /* Position the preview for printing */
            body.editor-md-preview-printing editor-md-preview.editor-md-preview-print-target {
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            
            /* Viewport becomes a simple block container */
            body.editor-md-preview-printing editor-md-preview.editor-md-preview-print-target .viewport {
                display: block !important;
                overflow: visible !important;
                margin: 0 !important;
                padding: 0 !important;
                background: none !important;
            }
            
            /* Pages container stacks pages (no scaling) */
            body.editor-md-preview-printing editor-md-preview.editor-md-preview-print-target .pages {
                margin: 0 !important;
                padding: 0 !important;
                display: block !important;
                gap: 0 !important;
                transform: none !important;
            }
            
            /* Each page prints on its own sheet */
            body.editor-md-preview-printing editor-md-preview.editor-md-preview-print-target .page {
                page-break-after: always;
                page-break-inside: avoid;
                overflow: hidden;
                margin: 0 !important;
                box-sizing: border-box !important;
                box-shadow: none !important;
                border: none !important;
                outline: none !important;
            }

            /* Hide any “page surround” frame in print */
            body.editor-md-preview-printing editor-md-preview.editor-md-preview-print-target,
            body.editor-md-preview-printing editor-md-preview.editor-md-preview-print-target .viewport,
            body.editor-md-preview-printing editor-md-preview.editor-md-preview-print-target .pages,
            body.editor-md-preview-printing editor-md-preview.editor-md-preview-print-target .page {
                box-shadow: none !important;
                border: none !important;
                outline: none !important;
                background: white !important;
            }
            
            /* Last page doesn't force a break */
            body.editor-md-preview-printing editor-md-preview.editor-md-preview-print-target .page:last-child {
                page-break-after: auto;
            }
            
            /* Ensure content stays within margins */
            body.editor-md-preview-printing editor-md-preview.editor-md-preview-print-target .page * {
                max-width: 100%;
                word-wrap: break-word;
            }
        }
    `;
    
    document.head.appendChild(this._printStyleEl);
    
    // Force a reflow before printing
    window.setTimeout(() => {
        window.print();
    }, 100);
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

  /** Set print style preset: 'US Paperback', 'A4 Manuscript', or '' for custom. */
  set printStyle(name: PrintStyleKey) {
    this._printStyle = name;
    if (name && name in PRINT_STYLE_PRESETS) {
      const preset = PRINT_STYLE_PRESETS[name as Exclude<PrintStyleKey, ''>];
      this._size = preset.size;
      this._margin = preset.margin;
      this.setAttribute('print-style', name);
    } else {
      this.removeAttribute('print-style');
    }
    this.applyPrintStyleClass();
    this.render();
  }

  get printStyle(): PrintStyleKey {
    return this._printStyle;
  }

  /** Header content: 'page-title-chapter' | 'title-chapter' | 'none' */
  get headerOption(): HeaderFooterOption {
    return this._headerOption;
  }
  set headerOption(v: HeaderFooterOption) {
    this._headerOption = v;
    this.setAttribute('header-option', v);
    this.render();
  }

  /** Footer content: 'page-title-chapter' | 'title-chapter' | 'none' */
  get footerOption(): HeaderFooterOption {
    return this._footerOption;
  }
  set footerOption(v: HeaderFooterOption) {
    this._footerOption = v;
    this.setAttribute('footer-option', v);
    this.render();
  }

}

customElements.define('editor-md-preview', EditorMDPreview);
console.log('EditorMDPreview component registered');


