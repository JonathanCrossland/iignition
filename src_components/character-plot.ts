// character-plot.ts
// CharacterPlot Web Component
// Designer for character relationship graphs (no shadow DOM, custom properties, loads from JSON)

interface Character {
    id: string | number;
    name: string;
    x?: number | null;
    y?: number | null;
    bgColor?: string;
    [key: string]: any; // Allow additional fields for duck typing
}

interface Relationship {
    from: string | number;
    to: string | number;
    type: string;
    [key: string]: any; // Allow additional fields for duck typing
}

// Internal normalized types (always strings for consistency)
interface NormalizedCharacter {
    id: string;
    name: string;
    x?: number;
    y?: number;
    bgColor?: string;
    [key: string]: any;
}

interface NormalizedRelationship {
    from: string;
    to: string;
    type: string;
    [key: string]: any;
}

class CharacterPlot extends HTMLElement {
    private characters: NormalizedCharacter[] = [];
    private relationships: NormalizedRelationship[] = [];
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
    private zoom = 1;
    private MIN_KINGPIN_RELATIONS = 3;
    private resizeObserver: ResizeObserver | null = null;
    private _lastViewSettings = { panX: 0, panY: 0, zoom: 1 };
    private _settingsChangedQueued = false;
    private minimapContainer: HTMLElement | null = null;
    private minimapViewport: HTMLElement | null = null;
    private minimapCanvas: HTMLElement | null = null;
    private _hasRestoredView = false;

    constructor() {
        super();
        // Main container - behave like a normal div that expands to fill container
        this.style.position = 'relative';
        this.style.display = 'block';
        this.style.overflow = 'hidden';
        this.style.background = 'var(--character-plot-bg, #f8f8f8)';
        this.style.width = 'var(--character-plot-width, 100%)';
        this.style.height = 'var(--character-plot-height, 100%)';
        this.style.minHeight = 'var(--character-plot-min-height, 300px)';
        this.style.boxSizing = 'border-box';

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

        // Canvas for circles - fills the entire component
        this.canvas = document.createElement('div');
        this.canvas.className = 'character-plot-canvas';
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.overflow = 'visible';
        this.canvas.style.zIndex = '1';
        this.canvas.style.boxSizing = 'border-box';
        this.appendChild(this.canvas);

        // Inner scalable container - large drawing area
        this.inner = document.createElement('div');
        this.inner.className = 'character-plot-inner';
        this.inner.style.position = 'absolute';
        this.inner.style.transition = 'width 0.2s, height 0.2s';
        this.inner.style.transformOrigin = '0 0';
        // (Revert) Remove pointer-events: none
        this.canvas.appendChild(this.inner);

        // SVG for lines
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
        this.svg.setAttribute('class', 'character-plot-svg');
        this.svg.style.position = 'absolute';
        this.svg.style.top = '0';
        this.svg.style.left = '0';
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
            if (e.ctrlKey && e.key.toLowerCase() === 'l' && !this.isEditingName) {
                e.preventDefault();
                console.log('Ctrl+L pressed, triggering auto-layout');
                this.autoLayout();
            }
        });

        // Mouse wheel zoom
        this.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = this.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Calculate zoom factor
            const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
            const newZoom = Math.max(0.1, Math.min(5, this.zoom * zoomFactor));
            
            // Calculate pan adjustment to zoom towards mouse position
            // Find the point in world coordinates under the mouse before zoom
            const worldX = (mouseX - this.panX) / this.zoom;
            const worldY = (mouseY - this.panY) / this.zoom;
            
            // After zoom, adjust pan so the same world point is under the mouse
            this.panX = mouseX - worldX * newZoom;
            this.panY = mouseY - worldY * newZoom;
            
            this.zoom = newZoom;
            this.updateTransform({ fireSettingsChanged: true });
        });

        // Panning event handlers (revert to original logic)
        this.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.isMouseDown = true;
            }
            // Only start panning if not on an input/textarea and not currently editing a name
            if (e.button === 0 && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement) && !this.isEditingName) {
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
        window.addEventListener('mouseup', (e) => {
            if (e.button === 0 && this.isPanning) {
                this.isMouseDown = false;
                this.isPanning = false;
                this.style.cursor = '';
            }
        });
        this.addEventListener('mouseleave', () => {
            if (!this.isPanning) {
                this.isMouseDown = false;
                this.style.cursor = '';
            }
        });
        window.addEventListener('mousemove', (e) => {
            if (this.isPanning && this.isMouseDown) {
                const dx = e.clientX - this.panStart.x;
                const dy = e.clientY - this.panStart.y;
                this.panX = this.innerStart.x + dx;
                this.panY = this.innerStart.y + dy;
                this.updateTransform({ fireSettingsChanged: true });
            } else if (this.isPanning) {
                this.isPanning = false;
                this.style.cursor = '';
            }
        });
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Control' && !this.isEditingName) {
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

        // Minimap container (created here, rendered in renderMinimap)
        this.minimapContainer = document.createElement('div');
        this.minimapContainer.className = 'character-plot-minimap';
        this.minimapContainer.style.position = 'absolute';
        this.minimapContainer.style.right = '18px';
        this.minimapContainer.style.bottom = '18px';
        this.minimapContainer.style.zIndex = '20';
        this.minimapContainer.style.pointerEvents = 'auto';
        this.minimapContainer.style.display = 'none';
        this.appendChild(this.minimapContainer);
    }

    connectedCallback() {
        // Load initial data if provided
        if (this.hasAttribute('data')) {
            try {
                const data = JSON.parse(this.getAttribute('data')!);
                this.load(data);
            } catch {}
        }
        
        // Set up ResizeObserver to update dimensions when container changes
        this.resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                this.updateDimensions();
            }
        });
        this.resizeObserver.observe(this);
        
        // Initial dimension update
        this.updateDimensions();
        this.render();
    }

    disconnectedCallback() {
        // Clean up ResizeObserver
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }

    // Public API
    public load(data: { characters: Character[], relationships: Relationship[] }) {
        try {
            // Validate input data
            if (!data) {
                throw new Error('CharacterPlot: No data provided to load()');
            }
            
            if (!Array.isArray(data.characters)) {
                throw new Error('CharacterPlot: data.characters must be an array');
            }
            
            if (!Array.isArray(data.relationships)) {
                throw new Error('CharacterPlot: data.relationships must be an array');
            }
            
            // Validate and normalize characters
            this.characters = data.characters.map((char, index) => {
                if (!char || typeof char !== 'object') {
                    throw new Error(`CharacterPlot: Character at index ${index} is not a valid object`);
                }
                
                if (char.id === undefined || char.id === null) {
                    throw new Error(`CharacterPlot: Character at index ${index} missing required 'id' field`);
                }
                
                if (!char.name && char.name !== '') {
                    throw new Error(`CharacterPlot: Character at index ${index} missing required 'name' field`);
                }
                
                return {
                    ...char, // Keep all fields for duck typing
                    id: String(char.id), // Normalize ID to string internally
                    name: String(char.name),
                    x: typeof char.x === 'number' ? char.x : undefined,
                    y: typeof char.y === 'number' ? char.y : undefined
                };
            });
            
            this.relationships = data.relationships.map((rel, index) => {
                if (!rel || typeof rel !== 'object') return null;
                if (rel.from === undefined || rel.from === null) return null;
                if (rel.to === undefined || rel.to === null) return null;
                const fromId = String(rel.from);
                const toId = String(rel.to);
                if (!this.characters.find(c => c.id === fromId)) return null;
                if (!this.characters.find(c => c.id === toId)) return null;
                return {
                    ...rel, // Keep all fields for duck typing
                    from: fromId, // Normalize to string internally
                    to: toId, // Normalize to string internally
                    type: rel.type || 'relation'
                };
            }).filter((rel): rel is NormalizedRelationship => rel !== null);
            
            this.updateDimensions();
            
            // Check if ALL characters have positions, if not apply auto-layout
            const charactersWithPositions = this.characters.filter(c => 
                c.x !== undefined && c.x !== null && typeof c.x === 'number' &&
                c.y !== undefined && c.y !== null && typeof c.y === 'number'
            ).length;
            const allHavePositions = charactersWithPositions === this.characters.length;
            
            console.log('CharacterPlot loaded successfully:', { 
                allHavePositions, 
                charactersCount: this.characters.length, 
                relationshipsCount: this.relationships.length,
                charactersWithPositions
            });
            
            if (!allHavePositions && this.characters.length > 0) {
                console.log('Some characters missing positions, applying selective layout...');
                this.positionNewCharacters();
            }
            
            this.render();
            
        } catch (error) {
            console.error('CharacterPlot load error:', error);
            
            // Dispatch error event for handling by parent
            this.dispatchEvent(new CustomEvent('error', {
                detail: {
                    message: error.message,
                    originalData: data
                },
                bubbles: true,
                composed: true
            }));
            
            // Re-throw to allow caller to handle
            throw error;
        }
    }
    public getData() {
        return { characters: this.characters, relationships: this.relationships };
    }
    public addCharacter(name = '') {
        const id = Math.random().toString(36).slice(2, 10);
        const rect = this.getBoundingClientRect();
        // Place at center of inner container
        const innerWidth = rect.width * 8;
        const innerHeight = rect.height * 8;
        const x = innerWidth / 2;
        const y = innerHeight / 2;
        const newChar: NormalizedCharacter = { id, name, x, y };
        this.characters.push(newChar);
        this.fireCharacterAdded(newChar);
        this.render();
    }
    public addRelationship(from: string, to: string, type = 'relation') {
        if (from === to) return;
        if (this.relationships.find(r => r.from === from && r.to === to)) return;
        this.relationships.push({ from, to, type });
        this.fireRelationshipAdded({ from, to, type });
        this.render();
    }
    public removeCharacter(id: string) {
        const characterToRemove = this.characters.find(c => c.id === id);
        // Fire beforedelete event
        const beforeDeleteEvent = new CustomEvent('beforedelete', {
            detail: { type: 'character', data: characterToRemove, allow: false },
            bubbles: true,
            cancelable: true
        });
        this.dispatchEvent(beforeDeleteEvent);
        // Only proceed if allow is set to true by a handler
        if (!beforeDeleteEvent.detail.allow) return;
        this.characters = this.characters.filter(c => c.id !== id);
        this.relationships = this.relationships.filter(r => r.from !== id && r.to !== id);
        this.fireCharacterRemoved(id, characterToRemove?.name || '');
        this.render();
    }
    public removeRelationship(from: string, to: string) {
        const relationshipToRemove = this.relationships.find(r => r.from === from && r.to === to);
        // Fire beforedelete event
        const beforeDeleteEvent = new CustomEvent('beforedelete', {
            detail: { type: 'relationship', data: relationshipToRemove, allow: false },
            bubbles: true,
            cancelable: true
        });
        this.dispatchEvent(beforeDeleteEvent);
        // Only proceed if allow is set to true by a handler
        if (!beforeDeleteEvent.detail.allow) return;
        this.relationships = this.relationships.filter(r => !(r.from === from && r.to === to));
        if (relationshipToRemove) {
            this.fireRelationshipRemoved(relationshipToRemove);
        }
        this.render();
    }

    private fireChange() {
        this.dispatchEvent(new CustomEvent('change', {
            detail: this.getData(),
            bubbles: true,
            composed: true
        }));
    }

    private fireCharacterAdded(character: Character) {
        this.dispatchEvent(new CustomEvent('change', {
            detail: {
                type: 'character_added',
                character: { ...character }
            },
            bubbles: true,
            composed: true
        }));
    }

    private fireCharacterRemoved(characterId: string, characterName: string) {
        this.dispatchEvent(new CustomEvent('change', {
            detail: {
                type: 'character_removed',
                character: { id: characterId, name: characterName }
            },
            bubbles: true,
            composed: true
        }));
    }

    private fireCharacterNameChanged(character: Character) {
        this.dispatchEvent(new CustomEvent('change', {
            detail: {
                type: 'character_name_changed',
                character: { ...character }
            },
            bubbles: true,
            composed: true
        }));
    }

    private fireCharacterColorChanged(character: Character) {
        this.dispatchEvent(new CustomEvent('change', {
            detail: {
                type: 'character_color_changed',
                character: { ...character }
            },
            bubbles: true,
            composed: true
        }));
    }

    private fireCharacterPositionChanged(character: Character) {
        this.dispatchEvent(new CustomEvent('change', {
            detail: {
                type: 'character_position_changed',
                character: { ...character }
            },
            bubbles: true,
            composed: true
        }));
    }

    private fireRelationshipAdded(relationship: Relationship) {
        this.dispatchEvent(new CustomEvent('change', {
            detail: {
                type: 'relationship_added',
                relationship: { ...relationship }
            },
            bubbles: true,
            composed: true
        }));
    }

    private fireRelationshipRemoved(relationship: Relationship) {
        this.dispatchEvent(new CustomEvent('change', {
            detail: {
                type: 'relationship_removed',
                relationship: { ...relationship }
            },
            bubbles: true,
            composed: true
        }));
    }

    private fireRelationshipTypeChanged(relationship: Relationship) {
        this.dispatchEvent(new CustomEvent('change', {
            detail: {
                type: 'relationship_type_changed',
                relationship: { ...relationship }
            },
            bubbles: true,
            composed: true
        }));
    }

    private updateDimensions() {
        const rect = this.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        console.log('UpdateDimensions:', { width, height });
        if (width === 0 || height === 0) {
            // Defer until container is laid out
            requestAnimationFrame(() => this.updateDimensions());
            return;
        }
        // Ensure canvas matches the component size
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        // Create a much larger inner drawing area (800% of viewport)
        const innerWidth = width * 8;
        const innerHeight = height * 8;
        // Position inner container at top-left, use transform for positioning
        this.inner.style.width = `${innerWidth}px`;
        this.inner.style.height = `${innerHeight}px`;
        this.inner.style.left = '0px';
        this.inner.style.top = '0px';
        // SVG should match the inner container
        this.svg.style.width = `${innerWidth}px`;
        this.svg.style.height = `${innerHeight}px`;
        this.svg.setAttribute('width', innerWidth.toString());
        this.svg.setAttribute('height', innerHeight.toString());
        // Only center on very first load (when panX and panY are both zero)
        if (this.panX === 0 && this.panY === 0) {
            this.panX = (width - innerWidth) / 2;
            this.panY = (height - innerHeight) / 2;
        }
        this.updateTransform({ fireSettingsChanged: true });
        console.log('Inner container setup:', { 
            innerWidth, 
            innerHeight, 
            panX: this.panX,
            panY: this.panY,
            viewportWidth: width,
            viewportHeight: height
        });
    }

    private updateTransform(opts?: { fireSettingsChanged?: boolean }) {
        this.inner.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
        if (opts && opts.fireSettingsChanged) {
            if (
                this._lastViewSettings.panX !== this.panX ||
                this._lastViewSettings.panY !== this.panY ||
                this._lastViewSettings.zoom !== this.zoom
            ) {
                this._lastViewSettings = { panX: this.panX, panY: this.panY, zoom: this.zoom };
                if (!this._settingsChangedQueued) {
                    this._settingsChangedQueued = true;
                    requestAnimationFrame(() => {
                        this.dispatchEvent(new CustomEvent('settings_changed', {
                            detail: { panX: this.panX, panY: this.panY, zoom: this.zoom },
                            bubbles: true,
                            composed: true
                        }));
                        this._settingsChangedQueued = false;
                    });
                }
            }
        }
        this.renderMinimap(); // Always update minimap after transform
    }

    // Public method to set pan/zoom from controller
    public setViewSettings(view: { panX?: number, panY?: number, zoom?: number }) {
        if (typeof view.panX === 'number') this.panX = view.panX;
        if (typeof view.panY === 'number') this.panY = view.panY;
        if (typeof view.zoom === 'number') this.zoom = view.zoom;
        this._hasRestoredView = true;
        this.updateTransform({ fireSettingsChanged: true });
    }

    private renderToolbar() {
        this.toolbar.innerHTML = '';
        // Delete Tool (select then delete)
        // (Old delete button removed; only toolbar-based delete remains)
    }

    private setupCanvasDblClick() {
        this.canvas.ondblclick = (e: MouseEvent) => {
            // Only add if not clicking on a character, label, or input
            const target = e.target as HTMLElement;
            if (
                target.classList.contains('character-plot-circle') ||
                target.classList.contains('relationship-label') ||
                target.tagName.toLowerCase() === 'input'
            ) return;
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const innerX = (mouseX - this.panX) / this.zoom;
            const innerY = (mouseY - this.panY) / this.zoom;
            this.addCharacterAt(innerX, innerY);
        };
    }

    private addCharacterAt(x: number, y: number, name = '') {
        const id = Math.random().toString(36).slice(2, 10);
        this.characters.push({ id, name, x, y });
        this.fireCharacterAdded({ id, name, x, y });
        this.render();
    }

    private handleMouseMove(e: MouseEvent) {
        // Only handle if panning or dragging a character
        if (this.isPanning || this.isCharacterDragging) {
            // Existing logic for relationship drag
            if (this.relationshipDrag) {
                const rect = this.getBoundingClientRect();
                // Convert mouse to inner container coordinates
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                const innerX = (mouseX - this.panX) / this.zoom;
                const innerY = (mouseY - this.panY) / this.zoom;
                this.tempLineEnd = { x: innerX, y: innerY };

                // Efficiently update only the temp relationship line
                let tempLine = this.svg.querySelector('#temp-relationship-line') as SVGLineElement;
                if (!tempLine) {
                    tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    tempLine.setAttribute('id', 'temp-relationship-line');
                    const styles = getComputedStyle(this);
                    const tempLineColor = styles.getPropertyValue('--character-plot-temp-line').trim() || '#ff9800';
                    tempLine.setAttribute('stroke', tempLineColor);
                    tempLine.setAttribute('stroke-width', '2');
                    tempLine.setAttribute('stroke-dasharray', '4,4');
                    this.svg.appendChild(tempLine);
                }
                const fromId = this.relationshipDrag?.fromId;
                const from = this.characters.find(c => c.id === fromId);
                if (from) {
                    tempLine.setAttribute('x1', String(from.x));
                    tempLine.setAttribute('y1', String(from.y));
                    tempLine.setAttribute('x2', String(innerX));
                    tempLine.setAttribute('y2', String(innerY));
                }
                // Do NOT call this.render() here!
            }
        }
        // Otherwise, do nothing and let the event propagate
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
        // Convert to inner container coordinates
        const innerX = (mouseX - this.panX) / this.zoom;
        const innerY = (mouseY - this.panY) / this.zoom;
        // Find character under mouse
        const toChar = this.characters.find(c => {
            if (typeof c.x !== 'number' || typeof c.y !== 'number') return false;
            const dx = c.x - innerX;
            const dy = c.y - innerY;
            const r = parseInt(getComputedStyle(this).getPropertyValue('--character-plot-circle-radius').trim() || '40', 10);
            return dx * dx + dy * dy <= r * r;
        });
        if (toChar && toChar.id !== this.relationshipDrag.fromId) {
            this.addRelationship(this.relationshipDrag.fromId, toChar.id);
        }
        this.relationshipDrag = null;
        this.tempLineEnd = null;
        // Remove the temp line and call render()
        const tempLine = this.svg.querySelector('#temp-relationship-line');
        if (tempLine) tempLine.remove();
        this.render();
    }

    private render() {
        // Calculate bounding box for all characters with valid positions
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        const padding = 300;
        for (const char of this.characters) {
            // Only include characters with valid positions in bounding box calculation
            if (typeof char.x === 'number' && typeof char.y === 'number') {
                minX = Math.min(minX, char.x);
                minY = Math.min(minY, char.y);
                maxX = Math.max(maxX, char.x);
                maxY = Math.max(maxY, char.y);
            }
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
        
        // Don't override positioning - let updateDimensions() handle it
        this.updateTransform({ fireSettingsChanged: false });
        
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
        const labelColor = styles.getPropertyValue('--character-plot-label-color').trim() || '#333';
        
        // Character border styling custom properties
        const characterDefaultBorder = styles.getPropertyValue('--character-plot-character-border').trim() || '2px solid #888';
        const characterBorderRadius = styles.getPropertyValue('--character-plot-character-border-radius').trim() || '';
        
        // Input styling custom properties
        const inputBackground = styles.getPropertyValue('--character-plot-input-bg').trim() || 'rgba(255,255,255,0.8)';
        const inputBorder = styles.getPropertyValue('--character-plot-input-border').trim() || 'none';
        // Handle transparent border - if border is set to transparent, use 'none'
        const finalInputBorder = inputBorder.includes('transparent') ? 'none' : inputBorder;
        const inputColor = styles.getPropertyValue('--character-plot-input-color').trim() || '#222';
        const inputOutline = styles.getPropertyValue('--character-plot-input-outline').trim() || 'none';
        const inputBoxShadow = styles.getPropertyValue('--character-plot-input-box-shadow').trim() || 'none';
        const inputPadding = styles.getPropertyValue('--character-plot-input-padding').trim() || '2px';
        const inputWidth = styles.getPropertyValue('--character-plot-input-width').trim() || '80%';
        const inputMinWidth = styles.getPropertyValue('--character-plot-input-min-width').trim() || '60px';
        const inputBorderRadius = styles.getPropertyValue('--character-plot-input-border-radius').trim() || '4px';
        const inputBoxSizing = styles.getPropertyValue('--character-plot-input-box-sizing').trim() || 'border-box';
        
        // Label input styling custom properties
        const labelInputBackground = styles.getPropertyValue('--character-plot-label-input-bg').trim() || '#fffbe6';
        const labelInputBorder = styles.getPropertyValue('--character-plot-label-input-border').trim() || '1px solid #ccc';
        const labelInputPadding = styles.getPropertyValue('--character-plot-label-input-padding').trim() || '2px 6px';
        const labelInputColor = styles.getPropertyValue('--character-plot-label-input-color').trim() || '#333';
        const labelInputBoxShadow = styles.getPropertyValue('--character-plot-input-box-shadow').trim() || 'none';
        
        // Icon button styling custom properties
        const iconButtonColor = styles.getPropertyValue('--character-plot-icon-color').trim() || '#e74c3c';
        const iconButtonBackground = styles.getPropertyValue('--character-plot-icon-bg').trim() || 'transparent';
        const iconButtonBorder = styles.getPropertyValue('--character-plot-icon-border').trim() || 'none';
        const iconButtonSize = styles.getPropertyValue('--character-plot-icon-size').trim() || '22px';
        const iconButtonFontSize = styles.getPropertyValue('--character-plot-icon-font-size').trim() || '1.1em';
        const iconButtonPadding = styles.getPropertyValue('--character-plot-icon-padding').trim() || '0';
        const iconButtonCursor = styles.getPropertyValue('--character-plot-icon-cursor').trim() || 'pointer';
        const iconButtonZIndex = styles.getPropertyValue('--character-plot-icon-z-index').trim() || '10';
        
        // Relationship delete button specific properties
        const relDeleteButtonColor = styles.getPropertyValue('--character-plot-rel-delete-color').trim() || '#e74c3c';
        const relDeleteButtonSize = styles.getPropertyValue('--character-plot-rel-delete-size').trim() || '18px';
        const relDeleteButtonFontSize = styles.getPropertyValue('--character-plot-rel-delete-font-size').trim() || '1.1em';
        
        // Color palette button styling custom properties
        const colorButtonWidth = styles.getPropertyValue('--character-plot-color-button-width').trim() || '32px';
        const colorButtonHeight = styles.getPropertyValue('--character-plot-color-button-height').trim() || '20px';
        const colorButtonBorderRadius = styles.getPropertyValue('--character-plot-color-button-border-radius').trim() || '8px';
        const colorButtonBorder = styles.getPropertyValue('--character-plot-color-button-border').trim() || '1.5px solid #e0e0e0';
        const colorButtonPadding = styles.getPropertyValue('--character-plot-color-button-padding').trim() || '0';
        const colorButtonTransition = styles.getPropertyValue('--character-plot-color-button-transition').trim() || 'box-shadow 0.12s cubic-bezier(.4,0,.2,1)';
        const colorButtonHoverShadow = styles.getPropertyValue('--character-plot-color-button-hover-shadow').trim() || '0 2px 8px rgba(25, 118, 210, 0.10)';
        
        // Color palette popup styling custom properties
        const palettePopupBackground = styles.getPropertyValue('--character-plot-palette-popup-bg').trim() || '#fff';
        const palettePopupShadow = styles.getPropertyValue('--character-plot-palette-popup-shadow').trim() || '0 4px 16px rgba(0,0,0,0.13)';
        const palettePopupBorderRadius = styles.getPropertyValue('--character-plot-palette-popup-border-radius').trim() || '10px';
        const palettePopupPadding = styles.getPropertyValue('--character-plot-palette-popup-padding').trim() || '16px';
        const palettePopupGap = styles.getPropertyValue('--character-plot-palette-popup-gap').trim() || '12px';
        const palettePopupZIndex = styles.getPropertyValue('--character-plot-palette-popup-z-index').trim() || '200';
        
        // Color option styling custom properties
        const colorOptionWidth = styles.getPropertyValue('--character-plot-color-option-width').trim() || '32px';
        const colorOptionHeight = styles.getPropertyValue('--character-plot-color-option-height').trim() || '20px';
        const colorOptionBorderRadius = styles.getPropertyValue('--character-plot-color-option-border-radius').trim() || '8px';
        const colorOptionBorder = styles.getPropertyValue('--character-plot-color-option-border').trim() || '1.5px solid #e0e0e0';
        const colorOptionSelectedBorder = styles.getPropertyValue('--character-plot-color-option-selected-border').trim() || '2px solid #1976d2';
        const colorOptionTransition = styles.getPropertyValue('--character-plot-color-option-transition').trim() || 'transform 0.12s cubic-bezier(.4,0,.2,1), box-shadow 0.12s cubic-bezier(.4,0,.2,1)';
        const colorOptionHoverShadow = styles.getPropertyValue('--character-plot-color-option-hover-shadow').trim() || '0 2px 8px rgba(25, 118, 210, 0.10)';
        
        // Prepare map for character divs for accurate line anchoring
        const charDivMap = new Map<string, HTMLDivElement>();
        // Draw characters (circles)
        for (const char of this.characters) {
            // Skip characters without valid positions
            if (typeof char.x !== 'number' || typeof char.y !== 'number') {
                console.warn('Character missing valid position:', char);
                continue;
            }
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
            charDiv.style.borderRadius = characterBorderRadius || `${Math.round(rectHeight * 0.35)}px`;
            // Gradient background custom properties
            const gradientBg = styles.getPropertyValue('--character-plot-gradient-bg').trim() || 'off';
            const gradientDarken = styles.getPropertyValue('--character-plot-gradient-darken').trim() || '10%';
            // Helper to darken a color by percent
            function darkenColor(color: string, percent: string): string {
                // Only supports hex and rgb(a)
                let amt = parseFloat(percent) / 100;
                if (color.startsWith('#')) {
                    let r = 0, g = 0, b = 0;
                    if (color.length === 4) {
                        r = parseInt(color[1] + color[1], 16);
                        g = parseInt(color[2] + color[2], 16);
                        b = parseInt(color[3] + color[3], 16);
                    } else if (color.length === 7) {
                        r = parseInt(color.slice(1, 3), 16);
                        g = parseInt(color.slice(3, 5), 16);
                        b = parseInt(color.slice(5, 7), 16);
                    }
                    r = Math.round(r * (1 - amt));
                    g = Math.round(g * (1 - amt));
                    b = Math.round(b * (1 - amt));
                    return `rgb(${r},${g},${b})`;
                } else if (color.startsWith('rgb')) {
                    const nums = color.match(/\d+/g);
                    if (!nums) return color;
                    let [r, g, b] = nums.map(Number);
                    r = Math.round(r * (1 - amt));
                    g = Math.round(g * (1 - amt));
                    b = Math.round(b * (1 - amt));
                    return `rgb(${r},${g},${b})`;
                }
                return color;
            }
            // Set background (solid or gradient)
            const baseColor = char.bgColor || 'var(--character-plot-circle, #b2e3ff)';
            if (gradientBg === 'on') {
                const darkColor = darkenColor(baseColor, gradientDarken);
                charDiv.style.background = `linear-gradient(180deg, ${baseColor}, ${darkColor})`;
            } else {
                charDiv.style.background = baseColor;
            }
            // Border and background logic
            if (this.dragId === char.id) {
                charDiv.style.border = draggingBorder;
            } else if (this.selectedCharId === char.id) {
                charDiv.style.border = selectedBorder;
                if (selectedBg) charDiv.style.background = selectedBg;
            } else {
                charDiv.style.border = characterDefaultBorder;
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
                input.style.width = inputWidth;
                input.style.fontSize = fontSize;
                input.style.fontFamily = fontFamily;
                input.style.textAlign = 'center';
                input.style.color = inputColor;
                input.style.border = finalInputBorder;
                input.style.background = 'var(--character-plot-input-bg)';
                input.style.outline = inputOutline;
                input.style.boxShadow = 'var(--character-plot-input-box-shadow)';
                input.style.padding = 'var(--character-plot-input-padding)';
                // Prevent inheritance from parent styles
                input.style.margin = '0';
                input.style.boxSizing = 'border-box';
                input.style.fontWeight = 'inherit';
                input.style.lineHeight = 'inherit';
                input.style.letterSpacing = 'inherit';
                input.style.textTransform = 'none';
                input.style.textDecoration = 'none';
                // Replace the character name with the input field
                charDiv.innerHTML = '';
                charDiv.appendChild(input);
                // Focus the input field
                input.focus();
                input.select();
                // Handle events to save the new name
                const saveNewName = () => {
                    char.name = input.value;
                    this.fireCharacterNameChanged(char);
                    charDiv.innerHTML = '';
                    charDiv.textContent = char.name || 'Character';
                    this.isEditingName = false;
                };
                input.addEventListener('blur', saveNewName);
                input.addEventListener('keydown', (ev) => {
                    if (ev.key === 'Enter') {
                        saveNewName();
                    }
                    // Allow all other keys including space to work normally
                    ev.stopPropagation();
                });
                // Prevent this from triggering mouse events
                input.addEventListener('mousedown', (ev) => {
                    ev.stopPropagation();
                });
                input.addEventListener('click', (ev) => {
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
                
                // Calculate drag offset in inner container coordinates
                const rect = this.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                const innerMouseX = (mouseX - this.panX) / this.zoom;
                const innerMouseY = (mouseY - this.panY) / this.zoom;
                if (typeof char.x === 'number' && typeof char.y === 'number') {
                    this.dragOffset = {
                        x: innerMouseX - char.x,
                        y: innerMouseY - char.y
                    };
                }
                // Store reference to this charDiv for direct DOM updates
                const thisCharDiv = charDiv;
                document.onmousemove = (ev) => {
                    if (!this.dragId) return;
                    const rect = this.getBoundingClientRect();
                    const mouseX = ev.clientX - rect.left;
                    const mouseY = ev.clientY - rect.top;
                    const newInnerX = (mouseX - this.panX) / this.zoom - this.dragOffset.x;
                    const newInnerY = (mouseY - this.panY) / this.zoom - this.dragOffset.y;
                    // Update DOM position directly for smooth drag
                    thisCharDiv.style.left = `${newInnerX - rectWidth / 2}px`;
                    thisCharDiv.style.top = `${newInnerY - rectHeight / 2}px`;
                    // Update the data model immediately so lines use the new center
                    char.x = newInnerX;
                    char.y = newInnerY;
                    // Efficiently update only the lines/labels connected to this character
                    for (const rel of this.relationships) {
                        if (rel.from === char.id || rel.to === char.id) {
                            const other = rel.from === char.id
                                ? this.characters.find(c => c.id === rel.to)
                                : this.characters.find(c => c.id === rel.from);
                            if (!other || typeof other.x !== 'number' || typeof other.y !== 'number') continue;
                            const fromX = rel.from === char.id ? newInnerX : other.x;
                            const fromY = rel.from === char.id ? newInnerY : other.y;
                            const toX = rel.to === char.id ? newInnerX : other.x;
                            const toY = rel.to === char.id ? newInnerY : other.y;
                            const relKey = `${rel.from}-${rel.to}`;
                            const line = this.svg.querySelector(`line[data-rel='${relKey}']`);
                            if (line) {
                                line.setAttribute('x1', String(fromX));
                                line.setAttribute('y1', String(fromY));
                                line.setAttribute('x2', String(toX));
                                line.setAttribute('y2', String(toY));
                            }
                            const label = this.inner.querySelector(`.relationship-label[data-rel='${relKey}']`) as HTMLElement;
                            if (label) {
                                // Update label position as in render()
                                const mx = (fromX + toX) / 2;
                                const my = (fromY + toY) / 2;
                                const dx = toX - fromX;
                                const dy = toY - fromY;
                                const len = Math.sqrt(dx*dx + dy*dy);
                                const offset = 18;
                                const perpX = -dy / len * offset;
                                const perpY = dx / len * offset;
                                const angleRad = Math.atan2(dy, dx);
                                let angleDeg = angleRad * 180 / Math.PI;
                                if (angleDeg > 90 || angleDeg < -90) angleDeg += 180;
                                label.style.left = `${mx + perpX}px`;
                                label.style.top = `${my + perpY}px`;
                                label.style.transform = `translate(-50%, -50%) rotate(${angleDeg}deg)`;
                            }
                        }
                    }
                };
                document.onmouseup = (ev) => {
                    if (!this.dragId) return;
                    // Calculate final position in inner container coordinates
                    const rect = this.getBoundingClientRect();
                    const mouseX = ev.clientX - rect.left;
                    const mouseY = ev.clientY - rect.top;
                    const finalInnerX = (mouseX - this.panX) / this.zoom - this.dragOffset.x;
                    const finalInnerY = (mouseY - this.panY) / this.zoom - this.dragOffset.y;
                    // Update the data model
                    char.x = finalInnerX;
                    char.y = finalInnerY;
                    this.isCharacterDragging = false;
                    this.dragId = null;
                    // Fire change event for user dragging action
                    this.fireCharacterPositionChanged(char);
                    // Now call render() once to update lines and everything else
                    this.render();
                    document.onmousemove = null;
                    document.onmouseup = null;
                };
            };
            // Relationship handle (diamond), only on hover, positioned by entry quadrant
            // Custom properties for handle
            const handleSize = styles.getPropertyValue('--character-plot-handle-size').trim() || '18px';
            const handleColor = styles.getPropertyValue('--character-plot-handle-color').trim() || '#ff9800';
            const handleBorder = styles.getPropertyValue('--character-plot-handle-border').trim() || '2px solid #fff';
            const handleBorderRadius = styles.getPropertyValue('--character-plot-handle-border-radius').trim() || '4px';
            const handleBoxShadow = styles.getPropertyValue('--character-plot-handle-box-shadow').trim() || 'none';
            const handle = document.createElement('div');
            handle.className = 'relationship-handle';
            handle.style.position = 'absolute';
            handle.style.width = handleSize;
            handle.style.height = handleSize;
            handle.style.background = handleColor;
            handle.style.border = handleBorder;
            handle.style.borderRadius = handleBorderRadius;
            handle.style.boxShadow = handleBoxShadow;
            handle.style.cursor = 'crosshair';
            handle.style.display = 'none';
            handle.style.zIndex = '100';
            handle.style.top = `${rectHeight - parseInt(handleSize, 10) / 2}px`; // Half on, half outside the bottom of the rect
            handle.style.left = `calc(50% - ${parseInt(handleSize, 10) / 2}px)`; // Centered horizontally
            handle.style.transform = 'rotate(45deg)'; // Keep diamond shape
            handle.onpointerdown = (e) => {
                e.stopPropagation(); // FIRST: Prevent canvas from seeing this event
                if (this.isPanning) {
                    e.preventDefault();
                    return;
                }
                if (typeof char.x === 'number' && typeof char.y === 'number') {
                    this.relationshipDrag = { fromId: char.id, start: { x: char.x, y: char.y } };
                }
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
            toolbar.style.pointerEvents = 'auto'; // Allow interaction

            // Color palette
            const palette = ['#b2e3ff','#ffd6a5','#fdffb6','#caffbf','#9bf6ff','#a0c4ff','#ffc6ff','#ffadad','#d0f4de','#fff'];

            // Color palette popup
            let palettePopup: HTMLDivElement | null = null;
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
                if (!charDiv.contains(e.target as Node)) {
                    closePalette();
                }
            }

            // Color icon (palette icon, click to expand colors)
            const colorBtn = document.createElement('button');
            colorBtn.style.width = colorButtonWidth;
            colorBtn.style.height = colorButtonHeight;
            colorBtn.style.borderRadius = colorButtonBorderRadius;
            colorBtn.style.border = colorButtonBorder;
            colorBtn.style.background = char.bgColor || palette[0];
            colorBtn.style.cursor = iconButtonCursor;
            colorBtn.style.padding = colorButtonPadding;
            colorBtn.style.display = 'block';
            colorBtn.style.transition = colorButtonTransition;
            colorBtn.onmouseenter = () => {
                colorBtn.style.boxShadow = colorButtonHoverShadow;
            };
            colorBtn.onmouseleave = () => {
                colorBtn.style.boxShadow = 'none';
            };
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
                // Use absolute positioning relative to the main component
                palettePopup.style.position = 'absolute';
                // Get icon position relative to the component
                const iconRect = colorBtn.getBoundingClientRect();
                const hostRect = this.getBoundingClientRect();
                palettePopup.style.left = `${iconRect.left - hostRect.left}px`;
                palettePopup.style.top = `${iconRect.bottom - hostRect.top + 8}px`;
                palettePopup.style.background = palettePopupBackground;
                palettePopup.style.boxShadow = palettePopupShadow;
                palettePopup.style.borderRadius = palettePopupBorderRadius;
                palettePopup.style.padding = palettePopupPadding;
                palettePopup.style.display = 'grid';
                palettePopup.style.gridTemplateColumns = `repeat(4, ${colorOptionWidth})`;
                palettePopup.style.gap = palettePopupGap;
                palettePopup.style.zIndex = palettePopupZIndex;
                const popup = palettePopup;
                palette.forEach(color => {
                    const colorOption = document.createElement('button');
                    // Use new width/height custom properties
                    colorOption.style.width = colorOptionWidth;
                    colorOption.style.height = colorOptionHeight;
                    colorOption.style.borderRadius = colorOptionBorderRadius;
                    colorOption.style.border = color === (char.bgColor || palette[0]) ? colorOptionSelectedBorder : colorOptionBorder;
                    colorOption.style.background = color;
                    colorOption.style.cursor = iconButtonCursor;
                    colorOption.style.margin = '0';
                    colorOption.style.padding = '0';
                    colorOption.style.transition = colorOptionTransition;
                    colorOption.onmouseenter = () => {
                        colorOption.style.transform = 'scale(1.12)';
                        colorOption.style.boxShadow = colorOptionHoverShadow;
                    };
                    colorOption.onmouseleave = () => {
                        colorOption.style.transform = 'scale(1)';
                        colorOption.style.boxShadow = 'none';
                    };
                    colorOption.onmousedown = (ev) => {
                        ev.stopPropagation();
                        char.bgColor = color;
                        this.fireCharacterColorChanged(char);
                        this.render();
                        closePalette();
                    };
                    if (popup) popup.appendChild(colorOption);
                });
                // Append to the main component, not the zoomed inner container
                this.appendChild(palettePopup);
                setTimeout(() => {
                    document.addEventListener('mousedown', handleOutsideClick);
                }, 0);
            };
            toolbar.appendChild(colorBtn);

            // Delete icon (trash)
            const deleteBtn = document.createElement('button');
            deleteBtn.title = 'Delete character';
            deleteBtn.style.width = iconButtonSize;
            deleteBtn.style.height = iconButtonSize;
            deleteBtn.style.border = iconButtonBorder;
            deleteBtn.style.background = iconButtonBackground;
            deleteBtn.style.cursor = iconButtonCursor;
            deleteBtn.style.padding = iconButtonPadding;
            deleteBtn.style.display = 'flex';
            deleteBtn.style.alignItems = 'center';
            deleteBtn.style.justifyContent = 'center';
            deleteBtn.innerHTML = `<svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='${iconButtonColor}' stroke-width='2'><path d='M6 6L18 18M6 18L18 6' stroke='${iconButtonColor}' stroke-width='2' stroke-linecap='round'/></svg>`;
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

            const showHandle = () => {
                handle.style.display = 'block';
            };
            const hideHandle = () => {
                handle.style.display = 'none';
            };

            charDiv.onpointerenter = () => {
                showHandle();
                showToolbar();
                this.isToolbarOrPaletteActive = true;
            };
            charDiv.onpointerleave = () => {
                setTimeout(() => {
                    if (!this.isEditingName && !this.paletteOpen && !this.isCharacterDragging && !this.relationshipDrag) {
                        hideHandle();
                        hideToolbar();
                        closePalette();
                    }
                }, 200); // Increased delay
                this.isToolbarOrPaletteActive = false;
            };
            // Keep handle visible when hovering over character or handle
            handle.onpointerenter = () => {
                showHandle();
                this.isToolbarOrPaletteActive = true;
            };
            // Don't hide handle when leaving handle - let character's onpointerleave handle it
            handle.onpointerleave = () => {
                // Only hide if we're not still hovering over the character
                setTimeout(() => {
                    if (!this.isEditingName && !this.paletteOpen && !this.isCharacterDragging && !this.relationshipDrag && !charDiv.matches(':hover')) {
                        hideHandle();
                        hideToolbar();
                        closePalette();
                    }
                }, 200);
                this.isToolbarOrPaletteActive = false;
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
            toolbar.onpointerdown = (e) => {
                e.stopPropagation(); // FIRST: Prevent canvas from seeing this event
                this.isToolbarOrPaletteActive = true;
                showToolbar();
            };
            toolbar.onpointerup = () => {
                this.isToolbarOrPaletteActive = false;
            };
            this.inner.appendChild(charDiv);
            charDivMap.set(char.id, charDiv);
        }
        // Now draw relationships (lines) AFTER all charDivs are in the DOM
        for (const rel of this.relationships) {
            const from = this.characters.find(c => c.id === rel.from);
            const to = this.characters.find(c => c.id === rel.to);
            if (!from || !to) continue;
            if (typeof from.x !== 'number' || typeof from.y !== 'number' || 
                typeof to.x !== 'number' || typeof to.y !== 'number') continue;
            // Draw line from center to center
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', String(from.x));
            line.setAttribute('y1', String(from.y));
            line.setAttribute('x2', String(to.x));
            line.setAttribute('y2', String(to.y));
            line.setAttribute('stroke', lineColor);
            line.setAttribute('stroke-width', lineWidth.replace('px',''));
            if (lineStyle !== 'solid') {
                line.setAttribute('stroke-dasharray', lineStyle === 'dashed' ? '8,4' : lineStyle === 'dotted' ? '2,4' : '');
            } else {
                line.removeAttribute('stroke-dasharray');
            }
            const relKey = `${from.id}-${to.id}`;
            line.setAttribute('data-rel', relKey);
            this.svg.appendChild(line);
            // --- BEGIN: Direct copy from compiled version ---
            // Relationship label (flex: label + delete button)
            const labelDiv = document.createElement('div');
            labelDiv.className = 'relationship-label';
            labelDiv.setAttribute('data-rel', relKey);
            labelDiv.style.position = 'absolute';
            labelDiv.style.fontSize = fontSize;
            labelDiv.style.fontFamily = fontFamily;
            labelDiv.style.color = labelInputColor;
            labelDiv.style.background = 'var(--character-plot-label-input-bg)';
            labelDiv.style.border = 'var(--character-plot-label-input-border)';
            labelDiv.style.borderRadius = 'var(--character-plot-input-border-radius)';
            labelDiv.style.padding = 'var(--character-plot-label-input-padding)';
            labelDiv.style.cursor = 'pointer';
            labelDiv.style.userSelect = 'none';
            labelDiv.style.minWidth = '20px';
            labelDiv.style.textAlign = 'center';
            labelDiv.style.whiteSpace = 'nowrap';
            labelDiv.style.boxShadow = 'var(--character-plot-input-box-shadow)';
            labelDiv.style.display = 'flex';
            labelDiv.style.alignItems = 'center';
            labelDiv.style.gap = '4px';
            labelDiv.style.zIndex = '5';
            // Label text span
            const labelText = document.createElement('span');
            labelText.textContent = rel.type || 'relation';
            labelText.style.flex = '1';
            labelText.style.display = 'inline-block';
            labelText.style.pointerEvents = 'auto';
            labelDiv.appendChild(labelText);
            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'relationship-delete-btn';
            deleteBtn.title = 'Delete relationship';
            deleteBtn.style.width = relDeleteButtonSize;
            deleteBtn.style.height = relDeleteButtonSize;
            deleteBtn.style.border = iconButtonBorder;
            deleteBtn.style.background = iconButtonBackground;
            deleteBtn.style.cursor = iconButtonCursor;
            deleteBtn.style.padding = iconButtonPadding;
            deleteBtn.style.display = 'flex';
            deleteBtn.style.alignItems = 'center';
            deleteBtn.style.justifyContent = 'center';
            deleteBtn.style.fontSize = relDeleteButtonFontSize;
            deleteBtn.style.color = relDeleteButtonColor;
            deleteBtn.style.borderRadius = '50%';
            deleteBtn.style.lineHeight = '1';
            deleteBtn.innerHTML = `<svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='${relDeleteButtonColor}' stroke-width='2'><path d='M6 6L18 18M6 18L18 6' stroke='${relDeleteButtonColor}' stroke-width='2' stroke-linecap='round'/></svg>`;
            deleteBtn.onmousedown = (e) => {
                e.stopPropagation();
                this.removeRelationship(rel.from, rel.to);
            };
            labelDiv.appendChild(deleteBtn);
            // Position label at midpoint of line
            const mx = (from.x + to.x) / 2;
            const my = (from.y + to.y) / 2;
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const len = Math.sqrt(dx*dx + dy*dy);
            const offset = 18;
            const perpX = -dy / len * offset;
            const perpY = dx / len * offset;
            const angleRad = Math.atan2(dy, dx);
            let angleDeg = angleRad * 180 / Math.PI;
            if (angleDeg > 90 || angleDeg < -90) angleDeg += 180;
            labelDiv.style.left = `${mx + perpX}px`;
            labelDiv.style.top = `${my + perpY}px`;
            labelDiv.style.transform = `translate(-50%, -50%) rotate(${angleDeg}deg)`;
            // Double click to edit label
            labelDiv.ondblclick = (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.editRelationshipLabel(rel, labelDiv);
            };
            this.inner.appendChild(labelDiv);
            // --- END: Direct copy from compiled version ---
        }
        // Deselect on canvas click
        this.canvas.onclick = () => {
            this.selectedCharId = null;
            this.renderToolbar();
        };
        
        // Ensure input blur when clicking on canvas background (not on input)
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.isEditingName && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
                // If we're editing and click on canvas background (not on input), blur any active input
                const activeElement = document.activeElement;
                if (activeElement instanceof HTMLInputElement) {
                    activeElement.blur();
                }
            }
        });
        this.setupCanvasDblClick();

        this.renderMinimap();
    }

    // --- SELECTIVE POSITIONING ---
    private positionNewCharacters() {
        const charactersWithoutPositions = this.characters.filter(c => 
            typeof c.x !== 'number' || typeof c.y !== 'number'
        );
        
        if (charactersWithoutPositions.length === 0) return;
        
        // Get viewport dimensions
        const rect = this.getBoundingClientRect();
        const viewportWidth = rect.width;
        const viewportHeight = rect.height;
        
        // Calculate center of inner container coordinates  
        const innerWidth = viewportWidth * 8;
        const innerHeight = viewportHeight * 8;
        const centerX = innerWidth / 2;
        const centerY = innerHeight / 2;
        
        // Find existing characters' bounding box to avoid overlap
        const existingChars = this.characters.filter(c => 
            typeof c.x === 'number' && typeof c.y === 'number'
        );
        
        let minX = centerX, maxX = centerX, minY = centerY, maxY = centerY;
        if (existingChars.length > 0) {
            minX = Math.min(...existingChars.map(c => c.x!));
            maxX = Math.max(...existingChars.map(c => c.x!));
            minY = Math.min(...existingChars.map(c => c.y!));
            maxY = Math.max(...existingChars.map(c => c.y!));
        }
        
        // Position new characters in a spiral around the existing characters
        const spiralRadius = Math.max(200, Math.max(maxX - minX, maxY - minY) / 2 + 150);
        let angle = 0;
        const angleStep = (2 * Math.PI) / Math.max(8, charactersWithoutPositions.length);
        
        charactersWithoutPositions.forEach((char, index) => {
            // Use spiral positioning to avoid overlaps
            const currentRadius = spiralRadius + (Math.floor(index / 8) * 100);
            char.x = centerX + currentRadius * Math.cos(angle);
            char.y = centerY + currentRadius * Math.sin(angle);
            angle += angleStep;
            
            // Fire position change event for new characters
            this.fireCharacterPositionChanged(char);
        });
        
        console.log(`Positioned ${charactersWithoutPositions.length} new characters while preserving ${existingChars.length} existing positions`);
        
        this.render();
    }

    // --- AUTO LAYOUT ---
    private autoLayout() {
        if (this.characters.length === 0) return;
        
        // Get viewport dimensions
        const rect = this.getBoundingClientRect();
        const viewportWidth = rect.width;
        const viewportHeight = rect.height;
        
        // Calculate center of inner container coordinates  
        const innerWidth = viewportWidth * 8;
        const innerHeight = viewportHeight * 8;
        const centerX = innerWidth / 2;
        const centerY = innerHeight / 2;
        
        // Find characters with most relationships (kingpins)
        const relationCounts = new Map();
        for (const rel of this.relationships) {
            relationCounts.set(rel.from, (relationCounts.get(rel.from) || 0) + 1);
            relationCounts.set(rel.to, (relationCounts.get(rel.to) || 0) + 1);
        }
        
        // Sort characters by relationship count
        const sortedChars = [...this.characters].sort((a, b) => 
            (relationCounts.get(b.id) || 0) - (relationCounts.get(a.id) || 0)
        );
        
        // Place kingpins in a circle around center
        const kingpins = sortedChars.filter(c => (relationCounts.get(c.id) || 0) >= this.MIN_KINGPIN_RELATIONS);
        const radius = Math.min(viewportWidth, viewportHeight) * 0.3; // Reduced radius to keep within viewport
        
        if (kingpins.length > 0) {
            // Place kingpins in a circle
            kingpins.forEach((char, i) => {
                const angle = (i * 2 * Math.PI) / kingpins.length;
                char.x = centerX + radius * Math.cos(angle);
                char.y = centerY + radius * Math.sin(angle);
            });
            
            // Place remaining characters around their most connected kingpin
            const remainingChars = sortedChars.filter(c => !kingpins.includes(c));
            for (const char of remainingChars) {
                // Find most connected kingpin
                let bestKingpin: Character | undefined = undefined;
                let maxConnections = 0;
                for (const kingpin of kingpins) {
                    const connections = this.relationships.filter(r => 
                        (r.from === char.id && r.to === kingpin.id) ||
                        (r.to === char.id && r.from === kingpin.id)
                    ).length;
                    if (connections > maxConnections) {
                        maxConnections = connections;
                        bestKingpin = kingpin;
                    }
                }
                
                if (bestKingpin && typeof bestKingpin.x === 'number' && typeof bestKingpin.y === 'number') {
                    // Place around kingpin
                    const angle = Math.random() * 2 * Math.PI;
                    const r = radius * 0.5; // Closer to kingpin
                    char.x = bestKingpin.x + r * Math.cos(angle);
                    char.y = bestKingpin.y + r * Math.sin(angle);
                } else {
                    // Place randomly around center
                    const angle = Math.random() * 2 * Math.PI;
                    const r = radius * 0.7;
                    char.x = centerX + r * Math.cos(angle);
                    char.y = centerY + r * Math.sin(angle);
                }
            }
        } else {
            // No kingpins, arrange all in a circle
            this.characters.forEach((char, i) => {
                const angle = (i * 2 * Math.PI) / this.characters.length;
                char.x = centerX + radius * Math.cos(angle);
                char.y = centerY + radius * Math.sin(angle);
            });
        }
        
        // Prevent overlaps with simple force-directed adjustment
        const iterations = 50;
        const minDistance = 100; // Minimum distance between characters
        
        for (let iter = 0; iter < iterations; iter++) {
            let moved = false;
            for (let i = 0; i < this.characters.length; i++) {
                for (let j = i + 1; j < this.characters.length; j++) {
                    const char1 = this.characters[i];
                    const char2 = this.characters[j];
                    if (typeof char1.x !== 'number' || typeof char1.y !== 'number' || 
                        typeof char2.x !== 'number' || typeof char2.y !== 'number') continue;
                    const dx = char2.x - char1.x;
                    const dy = char2.y - char1.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < minDistance) {
                        moved = true;
                        const force = (minDistance - distance) / distance;
                        const moveX = dx * force * 0.5;
                        const moveY = dy * force * 0.5;
                        
                        char1.x -= moveX;
                        char1.y -= moveY;
                        char2.x += moveX;
                        char2.y += moveY;
                    }
                }
            }
            if (!moved) break;
        }
        
        // Center the group of characters in the viewport
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const char of this.characters) {
            if (typeof char.x === 'number' && typeof char.y === 'number') {
                minX = Math.min(minX, char.x);
                minY = Math.min(minY, char.y);
                maxX = Math.max(maxX, char.x);
                maxY = Math.max(maxY, char.y);
            }
        }
        const groupCenterX = (minX + maxX) / 2;
        const groupCenterY = (minY + maxY) / 2;
        
        // Calculate pan needed to center the group in the viewport
        // The inner container starts at (0,0) and we use transform to position it
        const targetViewportCenterX = viewportWidth / 2;
        const targetViewportCenterY = viewportHeight / 2;
        
        // Pan so group center appears at viewport center
        this.panX = targetViewportCenterX - (groupCenterX * this.zoom);
        this.panY = targetViewportCenterY - (groupCenterY * this.zoom);
        this.updateTransform({ fireSettingsChanged: true });
        
        // Don't fire change events for auto-layout - this is not a user action
        this.render();
    }

    private editRelationshipLabel(rel: any, labelDiv: HTMLElement) {
        // Get computed styles for custom properties
        const styles = getComputedStyle(this);
        const inputMinWidth = styles.getPropertyValue('--character-plot-input-min-width').trim() || '60px';
        const labelInputBackground = styles.getPropertyValue('--character-plot-label-input-bg').trim() || '#fffbe6';
        const labelInputBorder = styles.getPropertyValue('--character-plot-label-input-border').trim() || '1px solid #ccc';
        const labelInputColor = styles.getPropertyValue('--character-plot-label-input-color').trim() || '#333';
        const inputBorderRadius = styles.getPropertyValue('--character-plot-input-border-radius').trim() || '4px';
        const labelInputPadding = styles.getPropertyValue('--character-plot-label-input-padding').trim() || '2px 6px';
        const inputBoxSizing = styles.getPropertyValue('--character-plot-input-box-sizing').trim() || 'border-box';
        // Handle transparent border for label inputs
        const finalLabelInputBorder = labelInputBorder.includes('transparent') ? 'none' : labelInputBorder;
        
        // Remove rotation for editing
        labelDiv.style.transform = 'translate(-50%, -50%)';
        const input = document.createElement('input');
        input.type = 'text';
        input.value = rel.type || '';
        input.style.position = 'absolute';
        input.style.left = '50%';
        input.style.top = '50%';
        input.style.transform = 'translate(-50%, -50%)'; // Always horizontal
        input.style.fontSize = labelDiv.style.fontSize;
        input.style.fontFamily = labelDiv.style.fontFamily;
        input.style.textAlign = 'center';
        input.style.color = labelInputColor;
        input.style.zIndex = '1000';
        input.style.minWidth = inputMinWidth;
        input.style.background = 'var(--character-plot-label-input-bg)';
        input.style.border = 'var(--character-plot-label-input-border)';
        input.style.color = 'var(--character-plot-label-input-color)';
        input.style.boxShadow = 'var(--character-plot-input-box-shadow)';
        input.style.borderRadius = 'var(--character-plot-input-border-radius)';
        input.style.padding = 'var(--character-plot-label-input-padding)';
        input.style.width = '100%';
        input.style.boxSizing = inputBoxSizing;
        // Prevent inheritance from parent styles
        input.style.margin = '0';
        input.style.fontWeight = 'inherit';
        input.style.lineHeight = 'inherit';
        input.style.letterSpacing = 'inherit';
        input.style.textTransform = 'none';
        input.style.textDecoration = 'none';
        // Fix: set boxShadow from local variable
        const labelInputBoxShadow = styles.getPropertyValue('--character-plot-input-box-shadow').trim() || 'none';
        input.style.boxShadow = labelInputBoxShadow;
        labelDiv.innerHTML = '';
        labelDiv.appendChild(input);
        input.focus();
        input.select();
        const save = () => {
            rel.type = input.value;
            this.fireRelationshipTypeChanged(rel);
            this.render();
        };
        input.addEventListener('blur', () => {
            document.removeEventListener('mousedown', handleOutsideClick, true);
            save();
        });
        input.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter') {
                input.blur();
            }
        });
        // Blur input if clicking outside
        function handleOutsideClick(e) {
            if (e.target !== input) {
                input.blur();
            }
        }
        document.addEventListener('mousedown', handleOutsideClick, true);
    }

    // Utility: Get intersection point from center to edge of a rounded rectangle (pill)
    private getRectEdgeIntersection(cx: number, cy: number, w: number, h: number, tx: number, ty: number, borderRadius: number = 0): { x: number, y: number } {
        // Vector from center to target
        const dx = tx - cx;
        const dy = ty - cy;
        if (dx === 0 && dy === 0) return { x: cx, y: cy };
        // Rectangle half-dimensions
        const hw = w / 2;
        const hh = h / 2;
        // Normalize direction
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        // Find intersection with rectangle edge (ignoring border radius for now)
        let scale = 1;
        if (absDx * hh > absDy * hw) {
            // Hits left/right
            scale = hw / absDx;
        } else {
            // Hits top/bottom
            scale = hh / absDy;
        }
        // Move from center towards target, but stop at edge
        let ex = cx + dx * scale;
        let ey = cy + dy * scale;
        // REMOVED: borderRadius inward offset (no gap)
        return { x: ex, y: ey };
    }

    // --- MINIMAP ---
    private renderMinimap() {
        if (!this.minimapContainer) return;
        this.minimapContainer.innerHTML = '';
        const minimapAttr = this.getAttribute('minimap') || 'none';
        if (minimapAttr === 'none') {
            this.minimapContainer.style.display = 'none';
            return;
        }
        const styles = getComputedStyle(this);
        const minimapColor = styles.getPropertyValue('--character-plot-minimap-color').trim() || '#888';
        const minimapBg = styles.getPropertyValue('--character-plot-minimap-bg').trim() || 'rgba(255,255,255,0.85)';
        const minimapBorder = styles.getPropertyValue('--character-plot-minimap-border').trim() || '1.5px solid #bbb';
        const minimapBorderRadius = styles.getPropertyValue('--character-plot-minimap-border-radius').trim() || '8px';
        const minimapShadow = styles.getPropertyValue('--character-plot-minimap-shadow').trim() || '0 2px 8px rgba(0,0,0,0.13)';
        const minimapRectBorder = styles.getPropertyValue('--character-plot-minimap-rect-border').trim() || '2px solid #444';
        const minimapRectRadius = styles.getPropertyValue('--character-plot-minimap-rect-radius').trim() || '4px';
        const minimapNodeColor = styles.getPropertyValue('--character-plot-minimap-node-color').trim() || minimapColor;
        const minimapEdgeColor = styles.getPropertyValue('--character-plot-minimap-edge-color').trim() || minimapColor;
        let minimapW = 160, minimapH = 120;
        if (minimapAttr === 'large') {
            minimapW = 240;
            minimapH = 180;
        } else if (minimapAttr === 'normal') {
            minimapW = 120;
            minimapH = 90;
        }
        this.minimapContainer.style.width = minimapW + 'px';
        this.minimapContainer.style.height = minimapH + 'px';
        this.minimapContainer.style.display = 'block';
        this.minimapContainer.style.background = minimapBg;
        this.minimapContainer.style.border = minimapBorder;
        this.minimapContainer.style.boxShadow = minimapShadow;
        this.minimapContainer.style.borderRadius = minimapBorderRadius;
        this.minimapContainer.style.overflow = 'hidden';
        // --- Logical canvas extents (bounding box of all nodes with padding) ---
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        const padding = 300;
        for (const char of this.characters) {
            if (typeof char.x === 'number' && typeof char.y === 'number') {
                minX = Math.min(minX, char.x);
                minY = Math.min(minY, char.y);
                maxX = Math.max(maxX, char.x);
                maxY = Math.max(maxY, char.y);
            }
        }
        if (!isFinite(minX)) minX = 0;
        if (!isFinite(minY)) minY = 0;
        if (!isFinite(maxX)) maxX = 1000;
        if (!isFinite(maxY)) maxY = 1000;
        minX -= padding;
        minY -= padding;
        maxX += padding;
        maxY += padding;
        const logicalW = maxX - minX;
        const logicalH = maxY - minY;
        // --- Minimap SVG ---
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', minimapW.toString());
        svg.setAttribute('height', minimapH.toString());
        svg.style.display = 'block';
        svg.style.width = '100%';
        svg.style.height = '100%';
        // Scale factors (logical canvas to minimap)
        const scaleX = minimapW / logicalW;
        const scaleY = minimapH / logicalH;
        // Draw all characters as circles/rects
        for (const char of this.characters) {
            if (typeof char.x !== 'number' || typeof char.y !== 'number') continue;
            const mx = (char.x - minX) * scaleX;
            const my = (char.y - minY) * scaleY;
            const r = 8;
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            circle.setAttribute('x', (mx - r/2).toString());
            circle.setAttribute('y', (my - r/2).toString());
            circle.setAttribute('width', r.toString());
            circle.setAttribute('height', (r * 0.6).toString());
            circle.setAttribute('rx', (r * 0.3).toString());
            circle.setAttribute('fill', minimapNodeColor);
            circle.setAttribute('opacity', '0.7');
            svg.appendChild(circle);
        }
        // Draw relationships as lines
        for (const rel of this.relationships) {
            const from = this.characters.find(c => c.id === rel.from);
            const to = this.characters.find(c => c.id === rel.to);
            if (!from || !to) continue;
            if (typeof from.x !== 'number' || typeof from.y !== 'number' || typeof to.x !== 'number' || typeof to.y !== 'number') continue;
            const x1 = (from.x - minX) * scaleX;
            const y1 = (from.y - minY) * scaleY;
            const x2 = (to.x - minX) * scaleX;
            const y2 = (to.y - minY) * scaleY;
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x1.toString());
            line.setAttribute('y1', y1.toString());
            line.setAttribute('x2', x2.toString());
            line.setAttribute('y2', y2.toString());
            line.setAttribute('stroke', minimapEdgeColor);
            line.setAttribute('stroke-width', '1.5');
            line.setAttribute('opacity', '0.5');
            svg.appendChild(line);
        }
        // --- Viewport rectangle (in logical canvas coordinates) ---
        const viewportW = this.getBoundingClientRect().width;
        const viewportH = this.getBoundingClientRect().height;
        // Top-left of visible area in logical canvas coordinates
        const viewX = (-this.panX / this.zoom);
        const viewY = (-this.panY / this.zoom);
        // Map to logical canvas
        const rectX = (viewX - minX) * scaleX;
        const rectY = (viewY - minY) * scaleY;
        const rectW = (viewportW / this.zoom) * scaleX;
        const rectH = (viewportH / this.zoom) * scaleY;
        // Clamp to minimap bounds
        const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
        const clampedX = clamp(rectX, 0, minimapW);
        const clampedY = clamp(rectY, 0, minimapH);
        const clampedW = clamp(rectW, 0, minimapW - clampedX);
        const clampedH = clamp(rectH, 0, minimapH - clampedY);
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', clampedX.toString());
        rect.setAttribute('y', clampedY.toString());
        rect.setAttribute('width', clampedW.toString());
        rect.setAttribute('height', clampedH.toString());
        rect.setAttribute('fill', 'none');
        // Use custom property for rect border
        const borderMatch = minimapRectBorder.match(/^(\d+(?:\.\d+)?)(px)?\s+solid\s+(#[0-9a-fA-F]{3,8}|rgba?\([^\)]+\)|[a-zA-Z]+)$/);
        if (borderMatch) {
            rect.setAttribute('stroke', borderMatch[3]);
            rect.setAttribute('stroke-width', borderMatch[1]);
        } else {
            rect.setAttribute('stroke', minimapColor);
            rect.setAttribute('stroke-width', '2');
        }
        rect.setAttribute('rx', minimapRectRadius);
        rect.setAttribute('ry', minimapRectRadius);
        rect.setAttribute('opacity', '0.9');
        rect.style.cursor = 'pointer';
        svg.appendChild(rect);
        this.minimapContainer.appendChild(svg);

        // --- Interactivity: Drag or click to pan ---
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };
        rect.addEventListener('mousedown', (e) => {
            isDragging = true;
            dragOffset = {
                x: e.offsetX - clampedX,
                y: e.offsetY - clampedY
            };
            e.stopPropagation();
            e.preventDefault();
        });
        svg.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const svgRect = svg.getBoundingClientRect();
            const mouseX = e.clientX - svgRect.left;
            const mouseY = e.clientY - svgRect.top;
            // Calculate new top-left in minimap coordinates
            let newX = mouseX - dragOffset.x;
            let newY = mouseY - dragOffset.y;
            newX = clamp(newX, 0, minimapW - clampedW);
            newY = clamp(newY, 0, minimapH - clampedH);
            // Map back to logical canvas coordinates
            const logicalX = newX / scaleX + minX;
            const logicalY = newY / scaleY + minY;
            // Set panX/panY so that top-left of viewport matches logicalX/logicalY
            this.panX = -logicalX * this.zoom;
            this.panY = -logicalY * this.zoom;
            this.updateTransform({ fireSettingsChanged: true });
            this.render();
        });
        window.addEventListener('mouseup', () => {
            isDragging = false;
        });
        // Click anywhere in minimap to jump viewport
        svg.addEventListener('mousedown', (e) => {
            if (e.target === rect) return; // Already handled by rect drag
            const svgRect = svg.getBoundingClientRect();
            const mouseX = e.clientX - svgRect.left;
            const mouseY = e.clientY - svgRect.top;
            // Center viewport on click position
            const logicalX = mouseX / scaleX + minX - (viewportW / this.zoom) / 2;
            const logicalY = mouseY / scaleY + minY - (viewportH / this.zoom) / 2;
            this.panX = -logicalX * this.zoom;
            this.panY = -logicalY * this.zoom;
            this.updateTransform({ fireSettingsChanged: true });
            this.render();
        });
    }
}

customElements.define('character-plot', CharacterPlot); 