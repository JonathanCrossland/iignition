module iignition {


    export class Runtime
    {
        constructor(route: iignition.RouteExtension){

            console.log('constructor loaded')
            this.load();
        }

        load(){
            document.addEventListener('DOMContentLoaded', () => {
                var statusSelector: string = 'span[data-iistatus]';
                var statusEl = document.querySelector(statusSelector)
                statusEl.innerHTML = 'loaded from load';
            })
        }
        

    }

}