namespace iignition {

    export class State {
        private static instance: State;
        private state: Map<string, any> = new Map();
        private storageKey: string = 'iignition_state';

        private constructor() {
            this.loadFromStorage();
        }

        public static getInstance(): State {
            if (!State.instance) {
                State.instance = new State();
            }
            return State.instance;
        }

        public add(key: string, value: any): void {
            this.state.set(key, value);
            this.saveToStorage();
        }

        public get(key: string): any {
            return this.state.get(key);
        }

        public remove(key: string): void {
            this.state.delete(key);
            this.saveToStorage();
        }

        public clear(): void {
            this.state.clear();
            this.saveToStorage();
        }

        public has(key: string): boolean {
            return this.state.has(key);
        }

        private saveToStorage(): void {
            try {
                const stateObj: any = {};
                this.state.forEach((value, key) => {
                    stateObj[key] = value;
                });
                localStorage.setItem(this.storageKey, JSON.stringify(stateObj));
            } catch (e) {
                console.warn('Failed to save state to localStorage:', e);
            }
        }

        private loadFromStorage(): void {
            try {
                const stored = localStorage.getItem(this.storageKey);
                if (stored) {
                    const stateObj = JSON.parse(stored);
                    this.state = new Map();
                    Object.keys(stateObj).forEach(key => {
                        this.state.set(key, stateObj[key]);
                    });
                }
            } catch (e) {
                console.warn('Failed to load state from localStorage:', e);
                this.state = new Map();
            }
        }

        public flush(): void {
            this.saveToStorage();
        }
    }

    // Create global $i object if it doesn't exist
    if (!window.hasOwnProperty('$i')) {
        (window as any).$i = {};
    }

    // Add State to $i
    (window as any).$i.State = State.getInstance();
}
