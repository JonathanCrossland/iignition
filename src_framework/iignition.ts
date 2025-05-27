namespace iignition{
    export class Core
    {
       
        private _onReadyCallbacks: Array<{ callback: () => void}> = new Array();
        private _onViewChangedCallbacks = [];

        private _fireReady = false
        
        public Options: Options;
        public Data: iignition.Data = new iignition.Data();
        public Splash: iignition.Splash = new iignition.Splash();
        public State: iignition.State = iignition.State.getInstance();
        public SEO = iignition.SEO;
        public RouteHandler;
        public ControllerHandler;
        public Reloaded: boolean = false;

        private _Pipeline = [];
        constructor(){
            this.Reloaded = true;
            Console.disable();
            this.defaultOptions();
            this.RouteHandler = new iignition.RouteHandler()
            this.RouteHandler.add(new RouteExtension({ selector : 'a[href^="#!"],[data-link]'}))
            this.RouteHandler.add(new FormExtension({ selector: 'form:not([data-staticform])' }))
            
            this.ControllerHandler  = new iignition.ControllerHandler({});
            this.ControllerHandler.add(new ViewExtension({ container: '[data-viewContainer]' }))
            this.ControllerHandler.add(new ControllerExtension({}))

            if (document.readyState == 'loading') {
                let _This = this;
                document.addEventListener('DOMContentLoaded', function(){
                    _This.fireOnReady.call(_This);
                });
            } else {
                this.fireOnReady();
            }

        }

        defaultOptions():void{
            this.Options = new Options();
        }

        register(component:Component|Extension){
         
            if (component instanceof DataComponent)
            {
                this.Data = component as DataComponent;
            }

            if (component instanceof RouteComponent)
            {
               this.RouteHandler = component;
            }
           
           // this.RouteHandler.run();
        }

       
        fireOnReady():void{
            console.log(`debug is ${this.Options.debug}`);

            if (this._fireReady == false) {
                for (var item in this._onReadyCallbacks) {
                    if (this._onReadyCallbacks[item]) {
                        this._onReadyCallbacks[item].callback();
                    }
                }
                this._fireReady = true;
            }

            this.RouteHandler.run({});
            
            if (this.Options.spa == true) {
                const hash = document.location.hash;
                let view = "index.html";
                
                // Properly parse the hash to get the view
                if (hash && hash.startsWith('#!')) {
                    view = hash; // Keep the full hash format for routing
                } else if (hash) {
                    view = hash; // Use hash as-is if it exists
                }
                
                let stateObj;
                
                // Check if we have existing state (from back/forward navigation)
                if (history.state && history.state.view) {
                    stateObj = history.state;
                    // Ensure the view matches the current URL hash
                    if (hash && hash !== stateObj.view) {
                        stateObj.view = view;
                    }
                } else {
                    // Try to restore state from State class (for page refresh)
                    const storedState = $i.State.get(`view_${view}`);
                    if (storedState) {
                        stateObj = storedState;
                        console.info(`Restored state from State class on page load for view: ${view}`);
                    } else {
                        // Create new state for fresh page load
                        stateObj = {
                            spa: this.Options.spa,
                            view: view,
                            container: '',
                            controllerPath: this.Options.controllerPath,
                            controller: this.Options.controller,
                            data: {},
                            timestamp: Date.now()
                        };
                        console.info(`Created new state for fresh page load: ${view}`);
                    }
                    
                    // Set initial state
                    history.replaceState(stateObj, document.title, location.href);
                }
                
                console.info(`Initial view loading: ${view}`);
                console.group(`Initial State:`);
                console.dir(stateObj);
                console.groupEnd();
                
                // Load the view
                this.ControllerHandler.run(stateObj);
            }
        }

        ready(options, callback: () => void){
           
            if (typeof options === 'function') {
                callback = options
            } else {
                this.Options = Object.assign(this.Options, options) as Options;
                this.Options.apply();
            }

            this.init();

            if (callback != undefined) {
                if (this._fireReady == false) {
                    this._onReadyCallbacks.push({ callback: callback })
                } else {
                    callback();
                }
            }
        }

        init(){
           
        }

        async show(view:string, container:string, data: any, callback: () => void): Promise<void>
        {
            await this.ControllerHandler.run({ "spa": this.Options.spa, "view":view, "container":container , "controllerPath": this.Options.controllerPath, "controller": this.Options.controller, "data": data });

            if (callback != undefined) {
                callback();
            }
        }

        test():void{
            
            console.log('This is a test of the exploding sound system.');
            console.log(`iignition Version ${iignition.info.version}`);
        }

        
    }
}


let $i = new iignition.Core();
//$i.add(new iignition.ARouteExtension({selector:'a[href^="#!"],[data-link]'}));
//$i.add(new iignition.RouteExtension({selector:'a[href^="#!"],[data-link]'}));
//$i.add(new iignition.ViewExtension({ container: '[data-viewContainer]' }));
//$i.add(new iignition.FormExtension({ selector: 'form:not([data-staticform])' }));


//$i.add(new iignition.FormValidationExtension({ selector: 'form:not([data-staticform])' }));
//$i.add(new iignition.ControllerExtension({ })); // controllerPath:'controllers'

//$i.register(new iignition.RouteExtension());
//$i.register(new iignition.Data());