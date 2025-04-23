
module iignition {

    export class ControllerExtension extends Extension {
        private _ControllerCache: Map<string, Controller> = new Map();
        private _CurrentController: Controller = null;
        public ControllerPath: string = '';
        constructor(ctx: any = null) {
            super(ctx);
        }

        handle(ctx){

                console.info('Controller Extension')
                return new Promise<void>((resolve, reject) => {
                   
                    if (ctx && ctx.controllerjs) {
                        this.executeController(ctx).then(() => {
                            resolve();
                      
                        }).catch((error) => {
                            
                            resolve();
                        });
                    }
                    else if (ctx && ctx.form) {
                        return this.executeForm(ctx).then((returnedctx) => {
                            resolve();
                        });
                    }
                    else {
                     
                        resolve();
                    }
                })
            }

            executeForm(ctx): Promise < any > {
                return this._CurrentController.onSubmit(ctx.form, ctx.data);
            }

            executeController(ctx){
                return new Promise<void>((resolve, reject) => {
                
                    let link = document.location.href; 
                    if (ctx.link) {
                        link = ctx.link;
                    }
                 
                    var promises = []

                    promises.push(this.loadScript(ctx))

                    Promise.all(promises)
                        .then((results) => {
                            let controller = results[0] as iignition.Controller;

                            controller.onInit();

                            controller.onLoad(ctx.data).then((ret) => {
                                
                                this._ControllerCache[controller.constructor.name] = controller;
                                this._CurrentController = controller;
                                console.dir(this._ControllerCache);
                                console.log('Controller Loaded');
                                resolve();
                            }).catch((error) => {
                                console.error('error', error);
                            });
                            
                        }).catch((error) => {
                            reject(error);
                        })  ;

                });
                return;
            }

		public loadScript(routing: RoutingUtility): Promise<Controller> {
			return new Promise((resolve, reject) => {
				
				// Check if the script is already loaded
				if (document.getElementById(routing.controller)) {
					// If the script is already loaded, resolve immediately
					const existingController = eval(`new ${routing.controller}()`) as Controller;
					resolve(existingController);
					return;
				}
				
				$i.Data.fetch(routing.controllerjs).then((html: string) => {
					let scriptElement: HTMLScriptElement = document.getElementsByTagName("script")[0] as HTMLScriptElement;
					let script: HTMLScriptElement = document.createElement("script") as HTMLScriptElement;
					script.textContent = html;
					script.id = routing.controllerjs;

					scriptElement.parentNode.insertBefore(script, scriptElement);

					var controller = eval(`new ${routing.controller}()`) as Controller;

					resolve(controller);
				}).catch((error) => {
					reject(error);
				});
			});
		}


    }

}