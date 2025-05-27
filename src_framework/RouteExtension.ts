namespace iignition
{
    export class RouteExtension extends Extension
    {
        public Selector: string;
        public Pipeline: Extension;
        private _Pipeline: Extension[] = [];

        constructor(ctx:any=null){
            super(ctx);
            this.Selector = '';
            this.Pipeline = new Extension();
         
            this.clickHandler = this.clickHandler.bind(this); 
            this.popstateHandler = this.popstateHandler.bind(this);
            this.hashChangeHandler = this.hashChangeHandler.bind(this);

            window.removeEventListener('popstate', this.popstateHandler);
            window.addEventListener('popstate', this.popstateHandler);
            window.removeEventListener('hashchange', this.hashChangeHandler);
            window.addEventListener('hashchange', this.hashChangeHandler);

            this.Selector = ctx.selector;
        }

        add(extension: Extension) {
            if (this._Pipeline.length > 0) {
                let index = this._Pipeline.length - 1;
                this._Pipeline[index].Next = extension;
            }

            this._Pipeline.push(extension);
            this.Pipeline = this._Pipeline[0];
        }

        handle(ctx:any){
            console.log('Route Extension')
            return new Promise<void>((resolve,reject) =>{
                
                let elements = document.querySelectorAll(this.Selector);
                if (elements) {
                    elements.forEach(element => {
                        console.log('Click Event Handlers wired')
                        element.removeEventListener('click', this.clickHandler, true);
                        element.addEventListener('click', this.clickHandler, true);
                    });
                }

                // Set initial state if none exists
                if (!history.state && location.hash) {
                    const initialState = this.createStateFromHash(location.hash);
                    history.replaceState(initialState, document.title, location.href);
                }
               
                resolve();
            })
        }

        private createStateFromHash(hash: string): any {
            const view = hash || '#!index.html';
            return {
                view: view,
                data: {},
                container: '',
                spa: $i.Options.spa,
                controllerPath: $i.Options.controllerPath,
                controller: $i.Options.controller,
                timestamp: Date.now()
            };
        }

        clickHandler(event) {
            const link = event.target.closest('a[href], [data-link]');
            if (!link) return;

            var url = link.getAttribute('href') || link.getAttribute('data-link');
            var container = link.getAttribute('data-container');

            let dataset = {data:{}};

            if (url.includes('?')) {
                const [baseUrl, queryString] = url.split('?');
                const params = new URLSearchParams(queryString);
                params.forEach((value, key) => {
                    dataset.data[key] = value;
                });
                url = baseUrl;
            }

            Object.assign(dataset, link.dataset);
            if (link.dataset.data){
                dataset.data = JSON.parse(link.dataset.data);
            }

            if (!container) {
                container = '';
            }
            
            const stateObj = {
                view: url,
                data: dataset.data,
                container: container,
                spa: $i.Options.spa,
                controllerPath: $i.Options.controllerPath,
                controller: $i.Options.controller,
                timestamp: Date.now()
            };

            // Update URL hash to match the view for consistency
            const newHash = url.startsWith('#!') ? url : `#!${url}`;
            
            // Only update URL if loading into root container
            if (container === '' || !container) {
                history.pushState(stateObj, document.title, newHash);
            } else {
                // For non-root containers, just update state without changing URL
                const currentState = history.state || this.createStateFromHash(location.hash);
                const updatedState = { ...currentState, timestamp: Date.now() };
                history.replaceState(updatedState, document.title, location.href);
            }

            console.info(`Route is ${url}`);
            console.group(`Route State is`);
            console.dir(stateObj);
            console.groupEnd();
          
            $i.ControllerHandler.run(stateObj);
            $i.RouteHandler.run(stateObj);
            event.preventDefault();
        }

        hashChangeHandler() {
            // Only handle hash changes that aren't from pushState
            if (history.state && history.state.timestamp && (Date.now() - history.state.timestamp) < 100) {
                return; // Skip if this was triggered by our own pushState
            }

            const stateObj = this.createStateFromHash(location.hash);
            history.replaceState(stateObj, document.title, location.href);
            
            console.info('Route Hash Change');
            console.group(`Route State is`);
            console.dir(stateObj);
            console.groupEnd();

            $i.ControllerHandler.run(stateObj);
            $i.RouteHandler.run(stateObj);
        }

        popstateHandler(event) {
            console.info('Route PopState Change');
            console.group(`Route State is`);
            console.dir(event.state);
            console.groupEnd();

            let stateObj;
            
            if (event.state) {
                // Use the stored state
                stateObj = event.state;
            } else {
                // Fallback: create state from current hash
                const hash = document.location.hash;
                const view = hash || '#!index.html';
                stateObj = {
                    spa: $i.Options.spa,
                    view: view,
                    container: '',
                    controllerPath: $i.Options.controllerPath,
                    controller: $i.Options.controller,
                    data: {}
                };
            }

            $i.ControllerHandler.run(stateObj);
            $i.RouteHandler.run(stateObj);
        }
    }
}
