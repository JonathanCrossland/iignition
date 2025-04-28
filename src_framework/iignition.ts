/// <reference path="Options.ts" />
/// <reference path="Header.ts" />
/// <reference path="RouteExtension.ts" />
/// <reference path="Extensions/FormExtension.ts" />
/// <reference path="Extensions/ControllerExtension.ts" />
/// <reference path="ControllerHandler.ts" />
/// <reference path="RouteHandler.ts" />
/// <reference path="Data.ts" />
/// <reference path="Splash.ts" />  
/// <reference path="Extensions/ViewExtension.ts" />
namespace iignition{
    export class Core
    {
       
        private _onReadyCallbacks: Array<{ callback: () => void}> = new Array();
        private _onViewChangedCallbacks = [];

        private _fireReady = false
        
        public Options: Options;
        public Data: iignition.Data = new iignition.Data();
        public Splash: iignition.Splash = new iignition.Splash();
        public RouteHandler;
        public ControllerHandler;
      

        private _Pipeline = [];
        constructor(){

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
            
                // Get the view from URL hash if present, otherwise use default
                let view = "index.html";
                const hash = window.location.hash;
                if (hash && hash.startsWith('#!')) {
                    view = hash;
                    const stateObj = { view: view, data: {} };
                    this.ControllerHandler.run(stateObj);
                } else {
                    const stateObj = { view: view, data: {} };
                    this.ControllerHandler.run(stateObj);
                }
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