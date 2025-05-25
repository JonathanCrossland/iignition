namespace iignition {

    export class Events {
        static raiseEvent(name:string, data) : void{
          
            console.info(`%c Event ${name}`, 'background: #000; color: #ffff00');
            console.dir(data);
            
            var evt = new CustomEvent(name, { detail: data });
            window.dispatchEvent(evt);
            $i.RouteHandler.run(null);
        }

    }
}