namespace iignition
{

    export class ControllerHandler extends RouteComponent
    {
        public ControllerPath: string = '';

        constructor(ctx:any){
            super();

            if (ctx && ctx.controllerPath){
                this.ControllerPath = ctx.controllerPath;
            }
        }
 
        async run(ctx: any) {
           
            let routing: RoutingUtility = ctx;


            if (ctx.view){
                routing = new iignition.RoutingUtility(ctx.view, $i.Options.controllerPath, $i.Options.domainRoot);
            }

            if (ctx.spa == false && ctx.container == undefined && routing) {
                delete routing.view;
            }

            if (ctx.controller == false && routing) {
                delete routing.controllerjs;
            }
            
            if (routing && ctx.container) {
                routing.container = `[data-viewcontainer="${ctx.container}"]`;
            } else if (routing) {
                routing.container = `[data-viewcontainer=""]`;
            }

            if (!ctx.data){
                ctx.data = history.state;
            }

            routing.data = ctx.data;
        
            //using await, because we need the view and the controller loaded.
            for(let idx=0; idx< this._Pipeline.length; idx++ ){
                await this._Pipeline[idx].handle(routing);
            }

            console.info('Run Route Handler for new context')
            $i.RouteHandler.run(routing);
        }

    }
}