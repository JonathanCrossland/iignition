module iignition
{
   

    export class RoutingUtility {
        //public viewPath = 'views';
        public ControllerPath = '';
        public originalUrl;
        public root;
        public domainRoot;
        public view;
        public hash;
        public isHash;
        public parts;
        public controller;
        public controllerjs;
        public container: string;
        public data: any;

        constructor(url, controllerPath, domainRoot) {
         
            if (controllerPath){
                if (!controllerPath.endsWith('/')){
                    controllerPath+='/';
                }
                this.ControllerPath = controllerPath;
            }
          
           this.domainRoot = domainRoot;

            if (url && url != '') {
                this.processUrl(url)
            }
           
        }

        processUrl(url) {

            
            var stdReg = /\/$/
            this.originalUrl = url;
            


            url = url.replace('.html', '');
            this.root = url.split('#')[0].replace(stdReg, '/');
            this.root = this.root.replace($i.Options.domainRoot, '')
            this.root = this.root.substr(0, this.root.lastIndexOf('/') + 1);

            if ($i.Options.controllerjs == ''){
                this.controller = url.substr(url.lastIndexOf('/') + 1)
                this.controller = this.controller.replace('.html', '');
                
                if (this.ControllerPath==''){
                    this.controllerjs = url.replace('#!', '').replace('.html', '.js');
                }else{
                    this.controllerjs = this.controller.replace('#!', '').replace('.html', '.js');
                }

                this.controllerjs = `${this.domainRoot}${this.ControllerPath}${this.root}${this.controllerjs}`;

                if (!this.controllerjs.includes('.js')) {
                    this.controllerjs = `${this.controllerjs}.js`;
                }
                else {
                    this.controllerjs = `${this.controllerjs}`;
                }


            }
            else{
                this.controllerjs = $i.Options.controllerjs;
                this.controller = this.controllerjs.substr(this.controllerjs.lastIndexOf('/') + 1);
                this.controller =  this.controller.replace('.js', '');
            }

         

            
         

            if (url.includes('#') && !url.includes('#!')) {
                this.isHash = true
                this.view = ''
                return
            }
            this.isHash = false
            if (url.includes('#!')) {
                this.hash = '#!' + url.split('#!')[1].replace(stdReg, '/')
            } else {
                this.hash = '#!' + this.root
            }
            this.parts = this.hash.replace('#!', '').split('/')
            if (this.parts[0] != $i.Options.viewPath) {
                this.parts.splice(0, 0, $i.Options.viewPath)
            }
			if (this.parts[this.parts.length - 1] == "") this.parts[this.parts.length - 1] = "index";
			
            if (!this.parts[this.parts.length - 1].toLowerCase().includes('.html')) {
                this.parts.push('.html')
            }
            this.view = this.parts.join('/').replace(stdReg, '/').replace(/\/\./, '.')
            console.info(this)
        }
    }
}
