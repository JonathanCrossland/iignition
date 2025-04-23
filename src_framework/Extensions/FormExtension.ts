
module iignition {

    export class FormExtension extends Extension {
        public Selector:string;
        public Form:HTMLFormElement;
        
        constructor(ctx:any=null) {
            super(ctx);
            if (ctx && ctx.selector) this.Selector = ctx.selector;
            this.formSubmitHandler = this.formSubmitHandler.bind(this); 
           // this.formSubmitHandler = this.formSubmitHandler.bind(this); 
        }

        public handle(ctx:any) {
            console.info('Form Extension')
            return new Promise<void>((resolve,reject)=>{
             
                this.Form = document.querySelector(this.Selector) as HTMLFormElement;
                if (this.Form) {
                    this.Form.addEventListener('submit', this.formSubmitHandler, true);
                }
                resolve();
            });
           
        }

        formSubmitHandler(event){
            
            event.preventDefault();
            event.stopImmediatePropagation();
            
            var formData = this.serialize(this.Form);
           
            let ctx = { form : this.Form, data: formData};  
            
            $i.ControllerHandler.run(ctx);
            Events.raiseEvent('onFormSubmitted', formData);
        }

        serialize(form:HTMLFormElement){
            var formData = new FormData(form);
            var object = {};
            formData.forEach((value, key) => {
                if(!object.hasOwnProperty(key)){
                    object[key] = value;
                    return;
                }
                if(!Array.isArray(object[key])){
                    object[key] = [object[key]];    
                }
                object[key].push(value);
            });
            return object;
        }
    }
}
