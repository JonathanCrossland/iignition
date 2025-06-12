namespace iignition {

    export class State {
        private static instance: State;
        private state: Map<string, any> = new Map();
        private storageKey: string = 'iignition_state';

        private constructor() {
            // Ensure events are dispatched after the window object is fully available
            setTimeout(() => {
                this.loadFromStorage();
            }, 0);
        }

        public static getInstance(): State {
            if (!State.instance) {
                State.instance = new State();
            }
            return State.instance;
        }

        private dispatchStateEvent(eventName: string, detail: any): void {
            // Remove the 'on' prefix for the event name as per DOM conventions
            const eventNameWithoutOn = eventName.replace(/^on/, '');
            const event = new CustomEvent(eventNameWithoutOn, {
                detail,
                bubbles: true,
                cancelable: true
            });
            window.dispatchEvent(event);
            // Also dispatch with 'on' prefix for backward compatibility
            const eventWithOn = new CustomEvent(eventName, {
                detail,
                bubbles: true,
                cancelable: true
            });
            window.dispatchEvent(eventWithOn);
        }

        public add(key: string, value: any, silent: boolean = false): void {
            this.state.set(key, value);
            this.saveToStorage(silent);
        }

        public get(key: string): any {
            return this.state.get(key);
        }

        public remove(key: string, silent: boolean = false): void {
            const value = this.state.get(key);
            this.state.delete(key);
            this.saveToStorage(silent);
        }

        public clear(silent: boolean = false): void {
            this.state.clear();
            this.saveToStorage(silent);
        }

        public has(key: string): boolean {
            return this.state.has(key);
        }

        private saveToStorage(silent: boolean = false): void {
            try {
                const stateObj: any = {};
                this.state.forEach((value, key) => {
                    stateObj[key] = value;
                });
                localStorage.setItem(this.storageKey, JSON.stringify(stateObj));
                if (!silent) {
                    this.dispatchStateEvent('onStateSaved', stateObj);
                }
            } catch (e) {
                console.warn('Failed to save state to localStorage:', e);
                if (!silent) {
                    this.dispatchStateEvent('onStateError', { error: e, operation: 'save' });
                }
            }
        }

        private loadFromStorage(): void {
            try {
                const stored = localStorage.getItem(this.storageKey);
                let stateObj = {};
                
                if (stored) {
                    stateObj = JSON.parse(stored);
                    this.state = new Map();
                    Object.keys(stateObj).forEach(key => {
                        this.state.set(key, stateObj[key]);
                    });
                } else {
                    this.state = new Map();
                }
                
                this.dispatchStateEvent('onStateLoaded', stateObj);
            } catch (e) {
                console.warn('Failed to load state from localStorage:', e);
                this.dispatchStateEvent('onStateError', { error: e, operation: 'load' });
                this.state = new Map();
                this.dispatchStateEvent('onStateLoaded', {});
            }
        }

        public flush(silent: boolean = false): void {
            this.saveToStorage(silent);
        }
    }

    // Create global $i object if it doesn't exist
    if (!window.hasOwnProperty('$i')) {
        (window as any).$i = {};
    }

    // Add State to $i
    (window as any).$i.State = State.getInstance();
}
