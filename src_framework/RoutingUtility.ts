namespace iignition
{
   

    export class RoutingUtility {
        
        public ControllerPath = '';
        public originalUrl: string;
        public root: string;
        public domainRoot: string;
        public view?: string;
        public hash: string;
        public isHash: boolean;
        public parts: string[];
        public controller: string;
        public controllerjs?: string;
        public container?: string;
        public data?: any;

        constructor(url: string, controllerPath: string, domainRoot: string) {
            if (controllerPath) {
                if (!controllerPath.endsWith('/')) {
                    controllerPath += '/';
                }
                this.ControllerPath = controllerPath;
            }
          
            this.domainRoot = domainRoot;

            if (url && url != '') {
                this.processUrl(url);
            }
        }

        private processUrl(url: string): void {
            this.originalUrl = url;

          

            url = url.replace('.html', '');
            
            this.processRoot(url);
           
            this.processViewAndHash(url);

            if ($i.Options.controllerjs == '') {
                this.controllerjs = this.view?.replace($i.Options.viewPath, $i.Options.controllerPath);
                this.controllerjs = this.controllerjs?.replace(/\.html$/, '.js');
            }
            else{
                this.controllerjs = $i.Options.controllerjs;
            }
            this.controllerjs = `${this.domainRoot}${this.controllerjs}`;
            this.controller = this.controllerjs.substr(this.controllerjs.lastIndexOf('/') + 1).replace('.js', '');

            //this.processController(url);
        }

        private processRoot(url: string): void {
            const stdReg = /\/$/;
            url = url.split('?')[0];
            this.root = url.split('#')[0].replace(stdReg, '/');
            this.root = this.root.replace($i.Options.domainRoot, '');
            this.root = this.root.substr(0, this.root.lastIndexOf('/') + 1);
        }

        private processController(url: string): void {
            if ($i.Options.controllerjs == '') {
                // Get the full view path (relative to domain root)
                const viewPath = $i.Options.viewPath;
                const controllerPath = this.ControllerPath.replace(/\/$/, ''); // remove trailing slash if any
                let viewRelativePath = url.split(this.domainRoot)[1] || url;

                // Remove any hash and query
                viewRelativePath = viewRelativePath.split('#')[0].split('?')[0];

                // Replace viewPath with controllerPath and .html with .js
                let controllerJsPath = viewRelativePath.replace(viewPath, controllerPath).replace(/\.html$/, '.js');
                // Remove any leading slash
                controllerJsPath = controllerJsPath.replace(/^\//, '');
                this.controllerjs = `${this.domainRoot}${controllerJsPath}`;

                // Set controller name
                this.controller = this.controllerjs.substr(this.controllerjs.lastIndexOf('/') + 1).replace('.js', '');
            } else {
                this.controllerjs = $i.Options.controllerjs;
                this.controller = this.controllerjs.substr(this.controllerjs.lastIndexOf('/') + 1);
                this.controller = this.controller.replace('.js', '');
            }
        }

        private processViewAndHash(url: string): void {
            const stdReg = /\/$/;
            
            debugger;

            if (url.includes('?')) {
                const [baseUrl, queryString] = url.split('?');
                const params = new URLSearchParams(queryString);
                if (this.data==undefined) { this.data = {}; }
                params.forEach((value, key) => {
                    this.data[key] = value;
                });
            }

            url = url.split('?')[0]; // Remove querystring

            if (url.includes('#') && !url.includes('#!')) {
                this.isHash = true;
                this.view = '';
                return;
            }

            this.isHash = false;
            if (url.includes('#!')) {
                this.hash = '#!' + url.split('#!')[1].replace(stdReg, '/');
            } else {
                this.hash = '#!' + this.root;
            }

            this.parts = this.hash.replace('#!', '').split('/');
            if (this.parts[0] != $i.Options.viewPath) {
                this.parts.splice(0, 0, $i.Options.viewPath);
            }
            
            if (this.parts[this.parts.length - 1] == "") {
                this.parts[this.parts.length - 1] = "index";
            }
            
            if (!this.parts[this.parts.length - 1].toLowerCase().includes('.html')) {
                this.parts.push('.html');
            }
            
            this.view = this.parts.join('/').replace(stdReg, '/').replace(/\/\./, '.');


           


            console.info(this);
        }
    }
}
