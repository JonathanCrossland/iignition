
namespace iignition{

  export class Options
  {
		public preventDoublePosting: boolean=true;
		public enableCache: boolean=true;
		public debug: boolean | LogLevel = false;
		public spa: boolean = true;
		public controller: boolean = false;
		public domainRoot:string="";
		public viewPath:string = "views";
		public controllerPath:string = "viewControllers";
		public controllerjs: string = ""; // hard coded from client
		public view: string = "";
		//change the dynamic client side url?
		public staticUrl: boolean = false;

		apply(){
			if (this.debug === true || (typeof this.debug === 'number' && this.debug > LogLevel.Off)){
				iignition.Console.enable();
			}else{
				iignition.Console.disable();
			}
		}
	}
}