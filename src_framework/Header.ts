
module iignition {

    export enum info{
        version = '4.0'
    }

    export enum LogLevel {
		Off = 0,
        Minimal = 1,
        Standard = 2,
        Verbose = 3
    }
   
    export interface IExtension{
        handle(ctx);
    }

    export class Extension {
       
        public Context;
        
        constructor(ctx:any=null){
            this.Context = ctx;
        }

        handle(ctx) : Promise<void>{ 
            return new Promise((resolve,reject) =>{
                resolve();
            })
        }
    }

    export class DataComponent {
        fetch(input: RequestInfo, init?: RequestInit): Promise<any> {
            return new Promise((resolve, reject) => {
                resolve(null);
            });
        }
    }

    export class RouteComponent {
        protected _Pipeline : any[] = [];
        public Pipeline;
        
        add(extension:Extension){
            this._Pipeline.push(extension);
        }

        async run(ctx:any){
            //lets not use await here if possible,
            for (let idx = 0; idx < this._Pipeline.length; idx++) {
                this._Pipeline[idx].handle(ctx);
            }
        }
    }
    export type Component = DataComponent | RouteComponent;
    //export type Extension = RouteExtension | SplashExtension | ViewExtension;

   
}
