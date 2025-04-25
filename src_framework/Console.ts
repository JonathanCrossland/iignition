module iignition
{
    export class Console{

        private static _props: Function[] = [];
        private static _console: typeof console;

        static disable() {
            Console._console = Object.assign({}, console);
            for (let prop in console) {
                Console._props.push(console[prop]);
                console[prop] = function () {  };
            }
        }

        static enable() {
            Object.assign(console, Console._console);
            console.log = function (msg, ...optionalParams: any[]) :void {
				if ($i.Options.debug > (typeof this.debug === 'number' && this.debug > LogLevel.Off)) {
                    Console._console.log(`%c ${msg}`, 'background: #ffeeee; color: #000', ...optionalParams);
                }
            };

            console.dir = function (value?: any, ...optionalParams: any[]) :void {
				if (value != false && $i.Options.debug > (typeof this.debug === 'number' && this.debug > LogLevel.Off)) {
                    Console._console.dir(value, ...optionalParams);
                }
            };

            console.info = function (message?: any, ...optionalParams: any[]): void {
				if ($i.Options.debug > (typeof this.debug === 'number' && this.debug > LogLevel.Off)) {
                    Console._console.info(message, ...optionalParams);
                }
            };

            console.group = function (groupTitle?: string, ...optionalParams: any[]): void {
				if ($i.Options.debug > (typeof this.debug === 'number' && this.debug > LogLevel.Off)) {
                    Console._console.group(groupTitle, ...optionalParams);
                }
            };

            console.groupEnd = function (): void {
				if ($i.Options.debug > (typeof this.debug === 'number' && this.debug > LogLevel.Off)) {
                    Console._console.groupEnd();
                }
            };

           
        }
    }
}