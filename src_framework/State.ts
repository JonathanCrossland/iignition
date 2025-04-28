namespace iignition {

    export class State {
        private static instance: State;
        private state: Map<string, any> = new Map();

        private constructor() {
            // Private constructor for singleton pattern
        }

        public static getInstance(): State {
            if (!State.instance) {
                State.instance = new State();
            }
            return State.instance;
        }

        public add(key: string, value: any): void {
            this.state.set(key, value);
        }

        public get(key: string): any {
            return this.state.get(key);
        }

        public remove(key: string): void {
            this.state.delete(key);
        }

        public clear(): void {
            this.state.clear();
        }

        public has(key: string): boolean {
            return this.state.has(key);
        }
    }

    // Create global $i object if it doesn't exist
    if (!window.hasOwnProperty('$i')) {
        (window as any).$i = {};
    }

    // Add State to $i
    (window as any).$i.State = State.getInstance();
}
