module iignition
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
            this.processController(url);
            this.processViewAndHash(url);
        }

        private processRoot(url: string): void {
            const stdReg = /\/$/;
            this.root = url.split('#')[0].replace(stdReg, '/');
            this.root = this.root.replace($i.Options.domainRoot, '');
            this.root = this.root.substr(0, this.root.lastIndexOf('/') + 1);
        }

        private processController(url: string): void {
            if ($i.Options.controllerjs == '') {
                // Get the full path after the view path
                const viewPath = $i.Options.viewPath;
                const pathAfterView = url.split(viewPath)[1] || '';
                
                // Remove .html and get the path parts
                const pathParts = pathAfterView.replace('.html', '').split('/').filter(Boolean);
                
                // The last part is the controller name
                this.controller = pathParts[pathParts.length - 1];
                
                // Build the controller path maintaining the folder structure
                if (this.ControllerPath == '') {
                    // If no specific controller path, use the same structure as views
                    this.controllerjs = pathAfterView.replace('.html', '.js');
                } else {
                    // If we have a controller path, maintain the folder structure
                    const folderPath = pathParts.slice(0, -1).join('/');
                    this.controllerjs = `${folderPath}/${this.controller}.js`;
                }

                // Combine with domain root and controller path
                this.controllerjs = `${this.domainRoot}${this.ControllerPath}${this.controllerjs}`;

                if (!this.controllerjs.includes('.js')) {
                    this.controllerjs = `${this.controllerjs}.js`;
                }
            } else {
                this.controllerjs = $i.Options.controllerjs;
                this.controller = this.controllerjs.substr(this.controllerjs.lastIndexOf('/') + 1);
                this.controller = this.controller.replace('.js', '');
            }
        }

        private processViewAndHash(url: string): void {
            const stdReg = /\/$/;

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
