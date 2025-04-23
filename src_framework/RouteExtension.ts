module iignition
{
    export class RouteExtension extends Extension
    {

        public Selector:string;
        public Pipeline: Extension;
        private _Pipeline = [];

        constructor(ctx:any=null){
            
            super(ctx);
         
            this.clickHandler = this.clickHandler.bind(this); 
            this.popstateHandler = this.popstateHandler.bind(this);
            this.hashChangeHandler = this.hashChangeHandler.bind(this);

            window.removeEventListener('popstate', this.popstateHandler);
            window.addEventListener('popstate', this.popstateHandler);
            window.removeEventListener('hashchange', this.hashChangeHandler);
            window.addEventListener('hashchange', this.hashChangeHandler);

            var stateObj = { view: "index" };
            history.pushState(stateObj, "index", location.hash);
            
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
               
                resolve();

            })
        }

        clickHandler(event){
            console.info('Route Click Handler')
          
            var url = event.target.getAttribute('href')
            if (url==null){
                let node = event.target.closest('[data-link]');
                url = node.getAttribute('data-link');
            }
            var container = event.target.getAttribute('data-container')
          

            let dataset = {data:{}};
            Object.assign(dataset, event.target.dataset);
            if (event.target.dataset.data){
                dataset.data = JSON.parse(event.target.dataset.data);
            }

            const stateObj = { view: url, data: dataset.data, container: container };
            history.pushState(stateObj, document.title, location.hash);

            console.info(`Route is ${url}`);
            console.group(`Route State is`);
            console.dir(stateObj);
            console.groupEnd();
          
            $i.ControllerHandler.run(stateObj);

            event.preventDefault();

        }

        hashChangeHandler() {
            
            const stateObj = { view: location.hash };
            history.pushState(stateObj, document.title, location.hash);
            
            console.info('Route Hash Change');
            console.group(`Route State is`);
            console.dir(stateObj);
            console.groupEnd();
        }

        popstateHandler(event) {
            console.info('Route PopState Change');
            console.group(`Route State is`);
            console.dir(event.state);
            console.groupEnd();

            const stateObj = event.state;
        
        }
    }
}
