namespace iignition {

    export class Controller {
        constructor() {
        }

        onInit(){
        }

        onRefresh() {
        }

        onLoad(data:any=null):Promise<Boolean>{
			return new Promise<Boolean>((resolve, reject) => { resolve(true);});
        }
        
        onUnload():Promise<Boolean>{
            return new Promise<Boolean>((resolve, reject) => { resolve(true);});
        }
        
        onSubmit(form:HTMLFormElement,data:any=null) : Promise<any>{
            return new Promise<any>((resolve, reject) => { resolve(true); });
        }

    }
}
