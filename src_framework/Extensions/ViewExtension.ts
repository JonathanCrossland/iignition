namespace iignition {

    export class ViewExtension extends Extension {
        public Controller:iignition.Controller;
        public Selector:string | Element;

        constructor(ctx:any=null) {
            super(ctx);

            if (ctx) {
                this.Selector = ctx.container;
            }
        }

        handle(ctx){
            console.info('View Extension');
            return new Promise<void>((resolve,reject) =>{
                
                this.show(ctx).then(()=>{
                    resolve();
                  });
            });
            
        }

        show( ctx) : Promise<void> {
           
            return new Promise<void>((resolve,reject) => {
              
                if (!ctx.view){
                    resolve();
                    return;
                }
                var promises = []
           
                $i.Data.fetch(ctx.view).then((html) => {
                    var container;

                    if (typeof this.Selector  === "string")
                    {
                        container = document.querySelector(this.Selector as string);
                    }

                    if (ctx.container)
                    {
                        container = document.querySelector(ctx.container as string);
                    }
                    
                    if (!container){
                        container = document.querySelector('body');
                    }
                   
                   
                    if (container instanceof Element){
                        container.innerHTML = html;
                        console.log('View Loaded');
                        Events.raiseEvent('onViewLoaded', { view: ctx.view })
                        
                        // Only update URL if loading into root container
                        if (container.getAttribute('data-viewcontainer') === '') {
                            history.pushState({}, '', `#!${ctx.view}`);
                        }
                        
                        resolve();
                    }

                })
                .catch((e) => {
                    reject();
                });
            });
        }
    }
}
