namespace iignition {

    export class ControllerExtension extends Extension {
        private _ControllerCache: Map<string, Controller> = new Map();
        private _CurrentController: Controller | null = null;
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

            executeForm(ctx): Promise<any> {
                if (!this._CurrentController) {
                    return Promise.reject(new Error('No controller is currently active'));
                }
                return this._CurrentController.onSubmit(ctx.form, ctx.data);
            }

            executeController(ctx): Promise<void> {
                return new Promise<void>((resolve, reject) => {
                    let link = document.location.href; 
                    if (ctx.link) {
                        link = ctx.link;
                    }
                 
                    var promises: Promise<Controller>[] = [];

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
            }

		public loadScript(routing: RoutingUtility): Promise<Controller> {
			return new Promise((resolve, reject) => {
				// Generate a unique id and class name based on the controllerjs path
				const scriptId = routing.controllerjs!.replace(/[\/.]/g, '_'); // e.g. foldera_dashboard_js
				const baseClassName = routing.controller; // e.g. dashboard
				const uniqueClassName = routing.controllerjs.replace(/[^a-zA-Z0-9_$]/g, '_');

				// Check if the script is already loaded
				if (document.getElementById(scriptId)) {
					// If already loaded, instantiate using the unique class name
					const controller = eval(`new ${uniqueClassName}()`);
					resolve(controller);
					return;
				}

				if (!routing.controllerjs) {
					reject(new Error('No controller script path provided'));
					return;
				}

				$i.Data.fetch(routing.controllerjs).then((html: string) => {
					let scriptElement: HTMLScriptElement = document.getElementsByTagName("script")[0] as HTMLScriptElement;
					let script: HTMLScriptElement = document.createElement("script") as HTMLScriptElement;
					// Replace the class name with the unique class name
					let classRegex = new RegExp(`class\\s+${baseClassName}\\b`);
					let modifiedScript = html.replace(classRegex, `class ${uniqueClassName}`);
					script.textContent = modifiedScript;
					script.id = scriptId;

					if (!scriptElement.parentNode) {
						reject(new Error('No parent node found for script element'));
						return;
					} else {
						scriptElement.parentNode.insertBefore(script, scriptElement);
					}

					var controller = eval(`new ${uniqueClassName}()`);
					resolve(controller);
				}).catch((error) => {
					reject(error);
				});
			});
		}


    }

}