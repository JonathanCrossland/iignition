// character-plot.ts
// CharacterPlot Web Component
// Designer for character relationship graphs (no shadow DOM, custom properties, loads from JSON)

class CharacterPlot extends HTMLElement {
    private characters: any[] = [];
    private relationships: any[] = [];
    private selectedCharId: string | null = null;
    private relationshipMode: boolean = false;
    private relationshipStartId: string | null = null;
    private dragId: string | null = null;
    private dragOffset: { x: number, y: number } = { x: 0, y: 0 };
    private toolbar: HTMLElement;
    private canvas: HTMLElement;
    private svg: SVGSVGElement;
    private tempLineEnd: { x: number, y: number } | null = null;
    private relationshipDrag: { fromId: string, start: { x: number, y: number } } | null = null;
    private isCharacterDragging: boolean = false;
    private isEditingName: boolean = false;
    private paletteOpen: boolean = false;
    private isToolbarOrPaletteActive: boolean = false;
    private inner: HTMLElement;
    private isPanning = false;
    private isMouseDown = false;
    private isCtrlDown = false;
    private panStart = { x: 0, y: 0 };
    private panX = 0;
    private panY = 0;
    private innerStart = { x: 0, y: 0 };
    private MIN_KINGPIN_RELATIONS = 3;

    constructor() {
        super();
        // Main container
        this.style.position = 'relative';
        this.style.display = 'block';
        this.style.overflow = 'hidden';
        this.style.background = 'var(--character-plot-bg, #f8f8f8)';

        // Toolbar
        this.toolbar = document.createElement('div');
        this.toolbar.className = 'character-plot-toolbar';
        this.toolbar.style.position = 'absolute';
        this.toolbar.style.top = '10px';
        this.toolbar.style.left = '10px';
        this.toolbar.style.zIndex = '2';
        this.toolbar.style.display = 'flex';
        this.toolbar.style.gap = '8px';
        this.appendChild(this.toolbar);

        // Canvas for circles
        this.canvas = document.createElement('div');
        this.canvas.className = 'character-plot-canvas';
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.overflow = 'visible';
        this.canvas.style.zIndex = '1';
        this.appendChild(this.canvas);

        // Inner scalable container
        this.inner = document.createElement('div');
        this.inner.className = 'character-plot-inner';
        this.inner.style.position = 'absolute';
        this.inner.style.top = '0';
        this.inner.style.left = '0';
        this.inner.style.transition = 'width 0.2s, height 0.2s';
        this.canvas.appendChild(this.inner);

        // SVG for lines
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
        this.svg.setAttribute('class', 'character-plot-svg');
        this.svg.style.position = 'absolute';
        this.svg.style.top = '0';
        this.svg.style.left = '0';
        this.svg.style.width = '100%';
        this.svg.style.height = '100%';
        this.svg.style.zIndex = '0';
        this.inner.appendChild(this.svg);

        this.renderToolbar();
        this.render();
        
        // Event listeners
        this.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        this.addEventListener('mouseup', (e) => {
            if (!this.isCharacterDragging) {
                e.stopPropagation();
            }
            this.handleMouseUp(e);
        });
        
        // Ensure the component has a high z-index during dragging
        this.addEventListener('mousedown', () => {
            if (this.isCharacterDragging) {
                this.style.zIndex = '1000';
                this.canvas.style.zIndex = '1001'; // Make canvas capture all mouse events
            }
        });
        
        // Reset z-index when mouse released
        document.addEventListener('mouseup', () => {
            this.style.zIndex = '';
            this.canvas.style.zIndex = '1'; // Reset to normal
        });

        // Keyboard shortcut for auto-layout (Ctrl+L)
        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key.toLowerCase() === 'l') {
                e.preventDefault();
                this.autoLayout();
            }
        });
    }

    connectedCallback() {
        // Load initial data if provided
        if (this.hasAttribute('data')) {
            try {
                const data = JSON.parse(this.getAttribute('data')!);
                this.load(data);
            } catch {}
        }
        this.render();
    }

    // Public API
    public load(data: { characters: any[], relationships: any[] }) {
        this.characters = data.characters || [];
        this.relationships = data.relationships || [];
        this.render();
    }
    public getData() {
        return { characters: this.characters, relationships: this.relationships };
    }
    public addCharacter(name = '') {
        const id = Math.random().toString(36).slice(2, 10);
        const x = 100 + Math.random() * (this.offsetWidth - 200);
        const y = 100 + Math.random() * (this.offsetHeight - 200);
        this.characters.push({ id, name, x, y });
        this.fireChange();
        this.render();
    }
    public addRelationship(from: string, to: string, type = 'relation') {
        if (from === to) return;
        if (this.relationships.find(r => r.from === from && r.to === to)) return;
        this.relationships.push({ from, to, type });
        this.fireChange();
        this.render();
    }
    public removeCharacter(id: string) {
        this.characters = this.characters.filter(c => c.id !== id);
        this.relationships = this.relationships.filter(r => r.from !== id && r.to !== id);
        this.fireChange();
        this.render();
    }
    public removeRelationship(from: string, to: string) {
        this.relationships = this.relationships.filter(r => !(r.from === from && r.to === to));
        this.fireChange();
        this.render();
    }

    private fireChange() {
        this.dispatchEvent(new CustomEvent('change', {
            detail: this.getData(),
            bubbles: true,
            composed: true
        }));
    }

    private renderToolbar() {
        this.toolbar.innerHTML = '';
        // Delete Tool (select then delete)
        // (Old delete button removed; only toolbar-based delete remains)
    }

    private setupCanvasDblClick() {
        this.canvas.ondblclick = (e: MouseEvent) => {
            // Only add if not clicking on a character
            if ((e.target as HTMLElement).classList.contains('character-plot-circle')) return;
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.addCharacterAt(x, y);
        };
    }

    private addCharacterAt(x: number, y: number, name = '') {
        const id = Math.random().toString(36).slice(2, 10);
        this.characters.push({ id, name, x, y });
        this.fireChange();
        this.render();
    }

    private handleMouseMove(e: MouseEvent) {
        
        if (this.isPanning) {
            return;
        }
        // Only stop propagation if not dragging - allows document mousemove to work during drags
        if (!this.isCharacterDragging) {
            e.stopPropagation();
        }
        
        if (this.relationshipDrag) {
            const rect = this.getBoundingClientRect();
            this.tempLineEnd = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            this.render();
        }
    }
    private handleMouseLeave() {
        if (this.tempLineEnd) {
            this.tempLineEnd = null;
            this.relationshipDrag = null;
            this.render();
        }
    }
    private handleMouseUp(e: MouseEvent) {
        if (!this.relationshipDrag) return;
        const rect = this.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        // Find character under mouse
        const toChar = this.characters.find(c => {
            const dx = c.x - mouseX;
            const dy = c.y - mouseY;
            const r = parseInt(getComputedStyle(this).getPropertyValue('--character-plot-circle-radius').trim() || '40', 10);
            return dx * dx + dy * dy <= r * r;
        });
        if (toChar && toChar.id !== this.relationshipDrag.fromId) {
            this.addRelationship(this.relationshipDrag.fromId, toChar.id);
        }
        this.relationshipDrag = null;
        this.tempLineEnd = null;
        this.render();
    }

    private render() {
        // Calculate bounding box for all characters
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        const padding = 300;
        for (const char of this.characters) {
            minX = Math.min(minX, char.x);
            minY = Math.min(minY, char.y);
            maxX = Math.max(maxX, char.x);
            maxY = Math.max(maxY, char.y);
        }
        if (!isFinite(minX)) minX = 0;
        if (!isFinite(minY)) minY = 0;
        if (!isFinite(maxX)) maxX = 1000;
        if (!isFinite(maxY)) maxY = 1000;
        // Set inner container size to fit all nodes
        const innerWidth = Math.max(2000, maxX + padding, padding - minX);
        const innerHeight = Math.max(2000, maxY + padding, padding - minY);
        this.inner.style.width = `${innerWidth}px`;
        this.inner.style.height = `${innerHeight}px`;
        // Always anchor inner at top-left
        this.inner.style.left = '0px';
        this.inner.style.top = '0px';
        this.inner.style.transform = `translate(${this.panX}px, ${this.panY}px)`;
        // Clear SVG and inner
        this.svg.innerHTML = '';
        this.inner.querySelectorAll('.character-plot-circle, .character-toolbar').forEach(el => el.remove());
        this.inner.querySelectorAll('.relationship-label').forEach(el => el.remove());
        // Get computed styles for custom properties
        const styles = getComputedStyle(this);
        const lineColor = styles.getPropertyValue('--character-plot-line').trim() || '#444';
        const lineWidth = styles.getPropertyValue('--character-plot-line-width').trim() || '2px';
        const lineStyle = styles.getPropertyValue('--character-plot-line-style').trim() || 'solid';
        const fontFamily = styles.getPropertyValue('--character-plot-font-family').trim() || 'inherit';
        const fontSize = styles.getPropertyValue('--character-plot-font-size').trim() || '1rem';
        const selectedBorder = styles.getPropertyValue('--character-plot-selected-border').trim() || '3px solid #ff6b00';
        const selectedBg = styles.getPropertyValue('--character-plot-selected-bg').trim() || '';
        const draggingBorder = styles.getPropertyValue('--character-plot-dragging-border').trim() || '3px solid #e74c3c';
        const circleRadius = parseInt(styles.getPropertyValue('--character-plot-circle-radius').trim() || '40', 10); // default 40px
        const circleDiameter = circleRadius * 2;
        const relationshipStartBorder = styles.getPropertyValue('--character-plot-relationship-start-border').trim() || '3px dashed #ff9800';
        const relationshipStartBg = styles.getPropertyValue('--character-plot-relationship-start-bg').trim() || '';
        const selectedRelationshipLine = styles.getPropertyValue('--character-plot-selected-relationship-line').trim() || '#00e0ff';
        // Draw relationships (lines)
        for (const rel of this.relationships) {
            const from = this.characters.find(c => c.id === rel.from);
            const to = this.characters.find(c => c.id === rel.to);
            if (!from || !to) continue;
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', String(from.x));
            line.setAttribute('y1', String(from.y));
            line.setAttribute('x2', String(to.x));
            line.setAttribute('y2', String(to.y));
            line.setAttribute('stroke', lineColor);
            line.setAttribute('stroke-width', lineWidth.replace('px',''));
            if (lineStyle !== 'solid') {
                // SVG dasharray for dashed/dotted
                line.setAttribute('stroke-dasharray', lineStyle === 'dashed' ? '8,4' : lineStyle === 'dotted' ? '2,4' : '');
            } else {
                line.removeAttribute('stroke-dasharray');
            }
            this.svg.appendChild(line);

            // --- Relationship label ---
            const mx = (from.x + to.x) / 2;
            const my = (from.y + to.y) / 2;
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const len = Math.sqrt(dx*dx + dy*dy);
            // Perpendicular offset (above the line)
            const offset = 18; // px
            const perpX = -dy / len * offset;
            const perpY = dx / len * offset;
            const angleRad = Math.atan2(dy, dx);
            let angleDeg = angleRad * 180 / Math.PI;
            // Keep text upright
            if (angleDeg > 90 || angleDeg < -90) angleDeg += 180;
            const labelDiv = document.createElement('div');
            labelDiv.className = 'relationship-label';
            labelDiv.textContent = rel.type;
            labelDiv.style.position = 'absolute';
            labelDiv.style.left = `${mx + perpX}px`;
            labelDiv.style.top = `${my + perpY}px`;
            labelDiv.style.transform = `translate(-50%, -50%) rotate(${angleDeg}deg)`;
            labelDiv.style.fontSize = '0.85em';
            labelDiv.style.fontFamily = fontFamily;
            labelDiv.style.pointerEvents = 'none';
            labelDiv.style.userSelect = 'none';
            labelDiv.style.whiteSpace = 'nowrap';
            labelDiv.style.fontWeight = 'bold';
            labelDiv.style.color = '#333';
            this.inner.appendChild(labelDiv);
        }
        // Draw temporary relationship line
        if (this.relationshipDrag && this.tempLineEnd) {
            const fromId = this.relationshipDrag?.fromId;
            if (!fromId) return;
            const from = this.characters.find(c => c.id === fromId);
            if (from) {
                const tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                tempLine.setAttribute('x1', String(from.x));
                tempLine.setAttribute('y1', String(from.y));
                tempLine.setAttribute('x2', String(this.tempLineEnd.x));
                tempLine.setAttribute('y2', String(this.tempLineEnd.y));
                tempLine.setAttribute('stroke', styles.getPropertyValue('--character-plot-temp-line').trim() || '#ff9800');
                tempLine.setAttribute('stroke-width', lineWidth.replace('px',''));
                tempLine.setAttribute('stroke-dasharray', '4,4');
                this.svg.appendChild(tempLine);
            }
        }
        // Draw characters (circles)
        for (const char of this.characters) {
            const charDiv = document.createElement('div');
            charDiv.className = 'character-plot-circle';
            charDiv.style.position = 'absolute';
            // Use pill/rounded-rect: width = circleDiameter, height = 0.6 * circleDiameter
            const rectWidth = circleDiameter;
            const rectHeight = Math.round(circleDiameter * 0.6);
            charDiv.style.left = `${char.x - rectWidth / 2}px`;
            charDiv.style.top = `${char.y - rectHeight / 2}px`;
            charDiv.style.width = `130px`;
            charDiv.style.height = `${rectHeight}px`;
            charDiv.style.textAlign = 'center';
            // Reduce border radius for less pill-like look
            charDiv.style.borderRadius = `${Math.round(rectHeight * 0.35)}px`;
            charDiv.style.background = char.bgColor || 'var(--character-plot-circle, #b2e3ff)';
            // Border and background logic
            if (this.dragId === char.id) {
                charDiv.style.border = draggingBorder;
            } else if (this.selectedCharId === char.id) {
                charDiv.style.border = selectedBorder;
                if (selectedBg) charDiv.style.background = selectedBg;
            } else {
                charDiv.style.border = '2px solid #888';
            }
            charDiv.style.display = 'flex';
            charDiv.style.alignItems = 'center';
            charDiv.style.justifyContent = 'center';
            charDiv.style.cursor = 'pointer';
            charDiv.style.userSelect = 'none';
            charDiv.style.fontWeight = 'bold';
            charDiv.style.fontSize = fontSize;
            charDiv.style.fontFamily = fontFamily;
            charDiv.style.color = '#222';
            // Display character name (always text by default)
            charDiv.textContent = char.name || 'Character';
            
            // Track last click time to implement our own click delay
            let lastClickTime = 0;
            const DOUBLE_CLICK_THRESHOLD = 300; // ms
            
            // Select character on click (and stop propagation)
            charDiv.onclick = (e) => {
                if (this.isPanning) {
                    e.stopPropagation();
                    e.preventDefault();
                    return;
                }
                // Only stop propagation if not editing, not dragging, not palette open
                if (!this.isEditingName && !this.isCharacterDragging && !this.paletteOpen) {
                e.stopPropagation(); // Prevent canvas click from firing
                }
                // Don't respond to the second click of a double-click
                if (e.detail === 2) {
                    return;
                }
                // Check if we might be part of a double-click sequence
                const now = Date.now();
                if (now - lastClickTime < DOUBLE_CLICK_THRESHOLD) {
                    // This might be part of a double-click, so don't process yet
                    return;
                }
                // Set a small delay to make sure we're not interfering with a potential double-click
                lastClickTime = now;
                setTimeout(() => {
                    // Make sure we didn't get a double-click in the meantime
                    if (Date.now() - lastClickTime >= DOUBLE_CLICK_THRESHOLD) {
                        // No double-click happened, so process the single click
                        e.preventDefault(); // Prevent click from passing through
                        this.selectedCharId = char.id;
                        this.renderToolbar();
                        this.render(); // Re-render to show selection highlight
                    }
                }, DOUBLE_CLICK_THRESHOLD);
            };
            
            // Double click to edit name
            charDiv.ondblclick = (e) => {
                if (this.isPanning) {
                    e.stopPropagation();
                    e.preventDefault();
                    return;
                }
                e.stopPropagation();
                e.preventDefault(); // Prevent any default behaviors
                this.isEditingName = true;
                // Cancel any ongoing drag operations
                if (this.dragId) {
                    this.dragId = null;
                    this.isCharacterDragging = false;
                    document.onmousemove = null; 
                    document.onmouseup = null;
                }
                // Create an input element
                const input = document.createElement('input');
                input.type = 'text';
                input.value = char.name || '';
                input.style.width = '80%';
                input.style.fontSize = fontSize;
                input.style.fontFamily = fontFamily;
                input.style.textAlign = 'center';
                input.style.border = 'none';
                input.style.background = 'rgba(255,255,255,0.8)';
                input.style.outline = 'none';
                input.style.padding = '2px';
                // Replace the character name with the input field
                charDiv.innerHTML = '';
                charDiv.appendChild(input);
                // Focus the input field
                input.focus();
                input.select();
                // Handle events to save the new name
                const saveNewName = () => {
                    char.name = input.value;
                    this.fireChange();
                    charDiv.innerHTML = '';
                    charDiv.textContent = char.name || 'Character';
                    this.isEditingName = false;
                };
                input.addEventListener('blur', saveNewName);
                input.addEventListener('keydown', (ev) => {
                    if (ev.key === 'Enter') {
                        saveNewName();
                    }
                });
                // Prevent this from triggering mouse events
                input.addEventListener('mousedown', (ev) => {
                    ev.stopPropagation();
                });
            };
            
            charDiv.onmousedown = (e) => {
                if (this.isPanning) {
                    e.stopPropagation();
                    e.preventDefault();
                    return;
                }
                // Don't stop propagation if this is part of a double-click
                if (e.detail === 2) {
                    return;
                }
                // Only skip drag if clicking inside the toolbar
                if ((e.target as HTMLElement).closest('.character-toolbar')) {
                    return;
                }
                e.stopPropagation(); // Prevent event from reaching dockable-view
                if (this.relationshipDrag) return;
                if (e.target && (e.target as HTMLElement).classList.contains('relationship-handle')) return;
                this.dragId = char.id;
                this.isCharacterDragging = true;
                this.dragOffset = {
                    x: e.clientX - char.x,
                    y: e.clientY - char.y
                };
                document.onmousemove = (ev) => {
                    if (!this.dragId) return;
                    const c = this.characters.find(c => c.id === this.dragId);
                    if (!c) return;
                    let newX = ev.clientX - this.dragOffset.x;
                    let newY = ev.clientY - this.dragOffset.y;
                    let shiftX = 0, shiftY = 0;
                    if (newX < 0) shiftX = -newX;
                    if (newY < 0) shiftY = -newY;
                    if (shiftX > 0 || shiftY > 0) {
                        // Shift all nodes and pan offset
                        for (const node of this.characters) {
                            node.x += shiftX;
                            node.y += shiftY;
                        }
                        this.panX -= shiftX;
                        this.panY -= shiftY;
                        // Clamp panX/panY to 0 (never positive)
                        this.panX = Math.min(this.panX, 0);
                        this.panY = Math.min(this.panY, 0);
                        newX += shiftX;
                        newY += shiftY;
                    }
                    c.x = newX;
                    c.y = newY;
                    this.inner.style.transform = `translate(${this.panX}px, ${this.panY}px)`;
                    this.render();
                };
                document.onmouseup = () => {
                    if (this.dragId) this.fireChange();
                    this.dragId = null;
                    this.isCharacterDragging = false;
                    // After drag ends, re-render to restore correct border
                    this.render();
                    document.onmousemove = null;
                    document.onmouseup = null;
                };
            };
            // Relationship handle (diamond), only on hover, positioned by entry quadrant
            const handle = document.createElement('div');
            handle.className = 'relationship-handle';
            handle.style.position = 'absolute';
            handle.style.width = '18px';
            handle.style.height = '18px';
            handle.style.background = 'var(--character-plot-handle, #ff9800)';
            handle.style.border = '2px solid #fff';
            handle.style.cursor = 'crosshair';
            handle.style.display = 'none';
            handle.style.zIndex = '10';
            handle.style.transform = 'rotate(45deg)';
            handle.onpointerdown = (e) => {
                if (this.isPanning) {
                    e.stopPropagation();
                    e.preventDefault();
                    return;
                }
                e.stopPropagation();
                this.relationshipDrag = { fromId: char.id, start: { x: char.x, y: char.y } };
                this.isCharacterDragging = true;
                this.tempLineEnd = null;
                this.isToolbarOrPaletteActive = true;
                // Ensure we reset the drag state on mouseup
                document.onpointerup = () => {
                    this.isCharacterDragging = false;
                    this.isToolbarOrPaletteActive = false;
                    document.onpointerup = null;
                };
            };
            charDiv.appendChild(handle);
            // --- Character Toolbar (on hover) ---
            const toolbar = document.createElement('div');
            toolbar.className = 'character-toolbar';
            toolbar.style.position = 'absolute';
            toolbar.style.top = '-32px'; // between previous and large
            toolbar.style.right = '8px';
            toolbar.style.display = 'none';
            toolbar.style.flexDirection = 'row';
            toolbar.style.gap = '6px';
            toolbar.style.borderRadius = '8px';
            toolbar.style.boxShadow = '0 2px 7px rgba(0,0,0,0.09)';
            toolbar.style.padding = '4px 7px';
            toolbar.style.zIndex = '20';
            toolbar.style.alignItems = 'center';
            toolbar.style.transition = 'opacity 0.15s';

            // Color palette
            const palette = ['#b2e3ff','#ffd6a5','#fdffb6','#caffbf','#9bf6ff','#a0c4ff','#ffc6ff','#ffadad','#d0f4de','#fff'];

            // Color palette popup
            let palettePopup: HTMLDivElement | null = null;
            let hoverOnToolbarOrPalette = false;
            const closePalette = () => {
                this.paletteOpen = false;
                if (palettePopup) {
                    if (palettePopup.parentNode) {
                        palettePopup.parentNode.removeChild(palettePopup);
                    }
                    palettePopup = null;
                    document.removeEventListener('mousedown', handleOutsideClick);
                }
            };
            function handleOutsideClick(e: MouseEvent) {
                const popup = palettePopup;
                if (popup && !popup.contains(e.target as Node) && e.target !== colorBtn) {
                    closePalette();
                }
            }

            // Color icon (palette icon, click to expand colors)
            const colorBtn = document.createElement('button');
            colorBtn.title = 'Change color';
            colorBtn.style.width = '22px';
            colorBtn.style.height = '22px';
            colorBtn.style.border = 'none';
            colorBtn.style.background = 'none';
            colorBtn.style.cursor = 'pointer';
            colorBtn.style.padding = '0';
            colorBtn.style.display = 'flex';
            colorBtn.style.alignItems = 'center';
            colorBtn.style.justifyContent = 'center';
            colorBtn.innerHTML = `<svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='#888' stroke-width='2'><circle cx='12' cy='12' r='10' fill='#eee'/><circle cx='8' cy='10' r='1.5' fill='#b2e3ff'/><circle cx='16' cy='10' r='1.5' fill='#ffd6a5'/><circle cx='9' cy='15' r='1.5' fill='#fdffb6'/><circle cx='15' cy='15' r='1.5' fill='#caffbf'/></svg>`;
            colorBtn.onclick = (e) => {
                if (this.isPanning) {
                    e.stopPropagation();
                    e.preventDefault();
                    return;
                }
                e.stopPropagation();
                if (palettePopup) {
                    closePalette();
                    return;
                }
                this.paletteOpen = true;
                palettePopup = document.createElement('div');
                palettePopup.style.position = 'absolute';
                // Center the palette horizontally over the character div
                const charRect = charDiv.getBoundingClientRect();
                const toolbarRect = toolbar.getBoundingClientRect();
                // Estimate palette width (minWidth is 140px, but could be wider)
                const paletteWidth = 160; // px, adjust if needed
                palettePopup.style.top = `${charRect.bottom - toolbarRect.top + 4}px`;
                palettePopup.style.left = `${charRect.left - toolbarRect.left + (charRect.width / 2) - (paletteWidth / 2)}px`;
                palettePopup.style.display = 'flex';
                palettePopup.style.flexWrap = 'wrap';
                palettePopup.style.gap = '6px';
                palettePopup.style.background = 'rgba(255,255,255,0.98)';
                palettePopup.style.border = '1.5px solid #ddd';
                palettePopup.style.borderRadius = '8px';
                palettePopup.style.padding = '8px 10px';
                palettePopup.style.boxShadow = '0 2px 8px rgba(0,0,0,0.10)';
                palettePopup.style.zIndex = '100';
                palettePopup.style.minWidth = '140px';
                palettePopup.style.width = `${paletteWidth}px`;
                palettePopup.style.justifyContent = 'center';
                const popup = palettePopup;
                palette.forEach(color => {
                    const colorOption = document.createElement('button');
                    colorOption.style.width = '22px';
                    colorOption.style.height = '22px';
                    colorOption.style.borderRadius = '50%';
                    colorOption.style.border = color === (char.bgColor || palette[0]) ? '2.5px solid #444' : '1.5px solid #bbb';
                    colorOption.style.background = color;
                    colorOption.style.cursor = 'pointer';
                    colorOption.style.margin = '0';
                    colorOption.style.padding = '0';
                    colorOption.title = color;
                    colorOption.onmousedown = (ev) => {
                        ev.stopPropagation();
                        char.bgColor = color;
                        this.fireChange();
                        this.render();
                        closePalette();
                    };
                    if (popup) popup.appendChild(colorOption);
                });
                // Palette hover logic: only close if mouse leaves both toolbar and palette
                let paletteOrToolbarHovered = true;
                palettePopup.onmouseenter = () => { paletteOrToolbarHovered = true; };
                palettePopup.onmouseleave = () => {
                    paletteOrToolbarHovered = false;
                    setTimeout(() => {
                        if (!paletteOrToolbarHovered) closePalette();
                    }, 120);
                };
                toolbar.onmouseenter = () => { paletteOrToolbarHovered = true; showToolbar(); };
                toolbar.onmouseleave = () => {
                    paletteOrToolbarHovered = false;
                    setTimeout(() => {
                        if (!paletteOrToolbarHovered) {
                            hideToolbar();
                            closePalette();
                        }
                    }, 120);
                };
                toolbar.appendChild(palettePopup);
                setTimeout(() => {
                    document.addEventListener('mousedown', handleOutsideClick);
                }, 0);
            };
            toolbar.appendChild(colorBtn);

            // Delete icon (trash)
            const deleteBtn = document.createElement('button');
            deleteBtn.title = 'Delete character';
            deleteBtn.style.width = '22px';
            deleteBtn.style.height = '22px';
            deleteBtn.style.border = 'none';
            deleteBtn.style.background = 'none';
            deleteBtn.style.cursor = 'pointer';
            deleteBtn.style.padding = '0';
            deleteBtn.style.display = 'flex';
            deleteBtn.style.alignItems = 'center';
            deleteBtn.style.justifyContent = 'center';
            deleteBtn.innerHTML = `<svg width='16' height='16' viewBox='0 0 20 20' fill='none' stroke='#e74c3c' stroke-width='2'><rect x='6' y='8' width='8' height='7' rx='2' fill='#e74c3c' opacity='0.15'/><path d='M8 8v5m4-5v5M3 6h14M8 3h4a1 1 0 0 1 1 1v2H7V4a1 1 0 0 1 1-1z'/></svg>`;
            deleteBtn.onmousedown = (e) => {
                if (this.isPanning) {
                    e.stopPropagation();
                    e.preventDefault();
                    return;
                }
                e.stopPropagation();
                this.removeCharacter(char.id);
                this.selectedCharId = null;
                this.renderToolbar();
                this.render();
            };
            toolbar.appendChild(deleteBtn);

            charDiv.appendChild(toolbar);
            // Show/hide toolbar on hover (character or toolbar)
            const showToolbar = () => {
                toolbar.style.display = 'flex';
            };
            const hideToolbar = () => {
                toolbar.style.display = 'none';
            };
            charDiv.onpointerenter = () => {
                handle.style.display = 'block';
                showToolbar();
                this.isToolbarOrPaletteActive = true;
            };
            charDiv.onpointerleave = () => {
                if (handle) handle.style.display = 'none';
                this.isToolbarOrPaletteActive = false;
                setTimeout(() => {
                    if (!this.isToolbarOrPaletteActive && !this.isEditingName && !this.paletteOpen && !this.isCharacterDragging) {
                        hideToolbar();
                        closePalette();
                    }
                }, 120);
            };
            toolbar.onpointerenter = () => {
                this.isToolbarOrPaletteActive = true;
                showToolbar();
            };
            toolbar.onpointerleave = () => {
                this.isToolbarOrPaletteActive = false;
                setTimeout(() => {
                    if (!this.isToolbarOrPaletteActive && !this.isEditingName && !this.paletteOpen && !this.isCharacterDragging) {
                        hideToolbar();
                        closePalette();
                    }
                }, 120);
            };
            toolbar.onpointerdown = () => {
                this.isToolbarOrPaletteActive = true;
            };
            toolbar.onpointerup = () => {
                this.isToolbarOrPaletteActive = false;
            };
            this.inner.appendChild(charDiv);
        }
        // Deselect on canvas click
        this.canvas.onclick = () => {
            this.selectedCharId = null;
            this.renderToolbar();
        };
        this.setupCanvasDblClick();

    
        // Listen on the whole character-plot container
        this.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.isMouseDown = true;
            }
            // Only start panning if Ctrl is held and not on an input/textarea
            if (e.button === 0 && this.isCtrlDown && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
                this.isPanning = true;
                this.panStart = { x: e.clientX, y: e.clientY };
                this.innerStart = { x: this.panX, y: this.panY };
                this.style.cursor = 'grabbing';
                e.preventDefault();
            }
        });
        this.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.isMouseDown = false;
                this.isPanning = false;
                this.style.cursor = '';
            }
        });
        this.addEventListener('mouseleave', () => {
            this.isMouseDown = false;
            this.isPanning = false;
            this.style.cursor = '';
        });
        window.addEventListener('mousemove', (e) => {
            if (this.isPanning && this.isMouseDown && this.isCtrlDown) {
                const dx = e.clientX - this.panStart.x;
                const dy = e.clientY - this.panStart.y;
                this.panX = this.innerStart.x + dx;
                this.panY = this.innerStart.y + dy;
                // Clamp so inner never moves right or down past the viewport
                this.panX = Math.min(this.panX, 0);
                this.panY = Math.min(this.panY, 0);
                this.inner.style.transform = `translate(${this.panX}px, ${this.panY}px)`;
            } else if (this.isPanning) {
                // If either mouse or ctrl is not down, stop panning
                this.isPanning = false;
                this.style.cursor = '';
            }
        });
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Control') {
                this.isCtrlDown = true;
            }
        });
        window.addEventListener('keyup', (e) => {
            if (e.key === 'Control') {
                this.isCtrlDown = false;
                this.isPanning = false;
                this.style.cursor = '';
            }
        });
    }

    // --- AUTO LAYOUT ---
    private autoLayout() {
        // --- Layout constants for spacing ---
        const centerX = 1000, centerY = 1000; // Center of the canvas
        const nodeRadius = 90; // Minimum distance between nodes (increased)
        const kingpinBaseRadius = 600; // Distance from center to other kingpins (increased)
        const leafBaseRadius = nodeRadius * 3.2; // Base radius for leaves (increased)
        const leafRadiusPerLeaf = nodeRadius * 0.25; // Extra radius per leaf
        const ringStep = nodeRadius * 2.5; // Distance between each ring level
        // 1. Count relationships for each character
        const relCount: Record<string, number> = {};
        for (const c of this.characters) relCount[c.id] = 0;
        for (const r of this.relationships) {
            relCount[r.from] = (relCount[r.from] || 0) + 1;
            relCount[r.to] = (relCount[r.to] || 0) + 1;
        }
        // 2. Find kingpins
        const kingpins = this.characters
            .filter(c => relCount[c.id] >= this.MIN_KINGPIN_RELATIONS)
            .sort((a, b) => relCount[b.id] - relCount[a.id]);
        if (kingpins.length === 0) return;
        // 3. Place kingpins radially (largest at center, others around)
        const kingpinPos: Record<string, {x: number, y: number}> = {};
        if (kingpins.length === 1) {
            kingpinPos[kingpins[0].id] = {x: centerX, y: centerY};
        } else {
            kingpinPos[kingpins[0].id] = {x: centerX, y: centerY};
            for (let i = 1; i < kingpins.length; ++i) {
                const angle = (2 * Math.PI * (i-1)) / (kingpins.length-1);
                kingpinPos[kingpins[i].id] = {
                    x: centerX + kingpinBaseRadius * Math.cos(angle),
                    y: centerY + kingpinBaseRadius * Math.sin(angle)
                };
            }
        }
        // 4. Place leaves and recursively place their children
        const placed: Record<string, {x: number, y: number}> = {...kingpinPos};
        const visited = new Set<string>();
        function placeChildren(parentId: string, parentX: number, parentY: number, parentAngle: number, level: number) {
            // Find unplaced children (not kingpins, not already placed, not parent)
            const children = [] as string[];
            for (const r of (this as any).relationships) {
                if (r.from === parentId && !kingpins.some(kp => kp.id === r.to) && !placed[r.to] && r.to !== parentId) children.push(r.to);
                if (r.to === parentId && !kingpins.some(kp => kp.id === r.from) && !placed[r.from] && r.from !== parentId) children.push(r.from);
            }
            if (children.length === 0) return;
            const wheelRadius = leafBaseRadius + ringStep * (level - 1) + leafRadiusPerLeaf * Math.max(0, children.length - 1);
            const angleStep = (2 * Math.PI) / Math.max(children.length, 1);
            for (let i = 0; i < children.length; ++i) {
                // Center the child on the parent's angle
                const angle = parentAngle + (i - (children.length - 1) / 2) * angleStep;
                const x = parentX + wheelRadius * Math.cos(angle);
                const y = parentY + wheelRadius * Math.sin(angle);
                placed[children[i]] = {x, y};
                // Recursively place this child's children
                placeChildren.call(this, children[i], x, y, angle, level + 1);
            }
        }
        for (const kingpin of kingpins) {
            // Leaves: directly connected, not a kingpin, not already placed
            const leaves = this.relationships
                .filter(r => r.from === kingpin.id || r.to === kingpin.id)
                .map(r => r.from === kingpin.id ? r.to : r.from)
                .filter(id => !kingpins.some(kp => kp.id === id) && !placed[id]);
            // Increase wheel radius if there are many leaves
            const wheelRadius = leafBaseRadius + leafRadiusPerLeaf * Math.max(0, leaves.length - 1);
            const angleStep = (2 * Math.PI) / Math.max(leaves.length, 1);
            const kp = kingpinPos[kingpin.id];
            for (let i = 0; i < leaves.length; ++i) {
                const angle = i * angleStep;
                const x = kp.x + wheelRadius * Math.cos(angle);
                const y = kp.y + wheelRadius * Math.sin(angle);
                placed[leaves[i]] = {x, y};
                // Recursively place children of this leaf
                placeChildren.call(this, leaves[i], x, y, angle, 2);
            }
        }
        // 5. Place shared characters (connected to multiple kingpins)
        for (const c of this.characters) {
            if (placed[c.id]) continue;
            // Find all kingpins this character is connected to
            const connectedKingpins = kingpins.filter(kp =>
                this.relationships.some(r => (r.from === c.id && r.to === kp.id) || (r.to === c.id && r.from === kp.id))
            );
            if (connectedKingpins.length >= 2) {
                // Place between kingpins (average their positions)
                let x = 0, y = 0;
                for (const kp of connectedKingpins) {
                    x += kingpinPos[kp.id].x;
                    y += kingpinPos[kp.id].y;
                }
                x /= connectedKingpins.length;
                y /= connectedKingpins.length;
                placed[c.id] = {x, y};
            }
        }
        // 6. Apply positions
        for (const c of this.characters) {
            if (placed[c.id]) {
                c.x = placed[c.id].x;
                c.y = placed[c.id].y;
            }
        }
        // 7. Reset pan to center the layout
        this.panX = 0;
        this.panY = 0;
        this.render();
    }
}

customElements.define('character-plot', CharacterPlot); 