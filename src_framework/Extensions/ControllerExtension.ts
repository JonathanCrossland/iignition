namespace iignition {

    export class ControllerExtension extends Extension {
        private _ControllerCache: Map<string, Controller> = new Map();
        private _ContainerControllers: Map<string, Controller> = new Map(); // Controllers by container
        private _ContainerControllerKeys: Map<string, string> = new Map(); // Controller keys by container
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
                // For forms, try to find the controller for the container the form is in
                const container = this.getContainerKey(ctx);
                const controller = this._ContainerControllers.get(container);
                
                if (!controller) {
                    return Promise.reject(new Error(`No controller is currently active for container: ${container || 'main'}`));
                }
                return controller.onSubmit(ctx.form, ctx.data);
            }

            async executeController(ctx): Promise<void> {
                let link = document.location.href; 
                if (ctx.link) {
                    link = ctx.link;
                }
                
                // Determine the container - default to empty string (main) if not specified
                const container = this.getContainerKey(ctx);
             
                try {
                    // Unload current controller for this specific container before loading new one
                    await this.unloadControllerForContainer(container);
                    
                    // Load new controller
                    const controller = await this.loadScript(ctx) as iignition.Controller;
                    const controllerKey = controller.constructor.name;

                    controller.onInit();

                    await controller.onLoad(ctx.data);
                    
                    // Store controller globally and by container
                    this._ControllerCache.set(controllerKey, controller);
                    this._ContainerControllers.set(container, controller);
                    this._ContainerControllerKeys.set(container, controllerKey);
                    
                    console.dir({
                        globalCache: this._ControllerCache,
                        containerControllers: this._ContainerControllers,
                        container: container
                    });
                    console.log(`Controller loaded for container: ${container || 'main'}`);
                } catch (error) {
                    console.error('Error in controller execution:', error);
                    throw error;
                }
            }

            private async unloadControllerForContainer(container: string): Promise<void> {
                const controller = this._ContainerControllers.get(container);
                const controllerKey = this._ContainerControllerKeys.get(container);
                
                if (!controller || !controllerKey) {
                    console.info(`No controller to unload for container: ${container || 'main'}`);
                    return;
                }

                console.info(`Unloading controller: ${controllerKey} from container: ${container || 'main'}`);
                
                try {
                    // Call onUnload lifecycle method with timeout protection
                    await Promise.race([
                        controller.onUnload(),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Controller unload timeout')), 5000)
                        )
                    ]);
                    
                    console.info(`Controller ${controllerKey} unloaded successfully from container: ${container || 'main'}`);
                } catch (error) {
                    console.error(`Error during controller unload for container ${container || 'main'}:`, error);
                } finally {
                    // Always clear references for this container regardless of success/failure
                    this._ContainerControllers.delete(container);
                    this._ContainerControllerKeys.delete(container);
                }
            }

            public async forceUnloadAll(): Promise<void> {
                console.info('Force unloading all controllers from all containers');
                
                // Try to unload all controllers gracefully with timeout
                const unloadPromises: Promise<void>[] = [];
                
                for (const [container, controller] of this._ContainerControllers) {
                    const controllerKey = this._ContainerControllerKeys.get(container);
                    console.info(`Force unloading controller ${controllerKey} from container: ${container || 'main'}`);
                    
                                         const unloadPromise = Promise.race([
                        controller.onUnload(),
                        new Promise<void>((_, reject) => 
                            setTimeout(() => reject(new Error('Force unload timeout')), 2000)
                        )
                    ]).catch((error) => {
                        console.error(`Error during force unload of ${controllerKey} from container ${container || 'main'}:`, error);
                    }) as Promise<void>;
                    
                    unloadPromises.push(unloadPromise);
                }
                
                // Wait for all unloads to complete (or timeout)
                await Promise.all(unloadPromises);
                
                // Clear all references
                this._ControllerCache.clear();
                this._ContainerControllers.clear();
                this._ContainerControllerKeys.clear();
                
                console.info('Force unload completed for all containers');
            }
            
            private getContainerKey(ctx: any): string {
                // Extract container from context - handle both direct container and routing object
                if (ctx.container !== undefined) {
                    return ctx.container || '';
                }
                
                // If ctx has a container selector like "[data-viewcontainer="header"]", extract the name
                if (ctx.container && typeof ctx.container === 'string' && ctx.container.includes('data-viewcontainer')) {
                    const match = ctx.container.match(/data-viewcontainer="([^"]*)"/);
                    return match ? match[1] : '';
                }
                
                return '';
            }
            
            public getCurrentControllerForContainer(container: string): Controller | null {
                return this._ContainerControllers.get(container || '') || null;
            }
            
            public getActiveContainers(): string[] {
                return Array.from(this._ContainerControllers.keys());
            }

		public loadScript(routing: any): Promise<Controller> {
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