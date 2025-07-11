/*
    (c) Jonathan Crossland

    Splash is a utility class that allows you to map data to a template and apply it to an element.

    */
namespace iignition {

    export class Splash {
        constructor() {
        }

        handleRowBind<T extends object>(rowbind: (el: Element, item: T) => void, clone: Element, obj: T) {
            if (rowbind) {
                rowbind(clone, obj);
            }
        }

        private prepareTemplate<T extends object>(obj: T, clone: Element) {
            let dataElements = clone.querySelectorAll('[data-splash]:not([data-splashtemplate])');

            this.applyTemplate(obj, clone);

            dataElements.forEach(dataElement => {
                this.applyTemplate(obj, dataElement);
            });
        }

        applyTemplate<T extends object>(obj: T, dataElement: Element) {
            let splashAttr = dataElement.getAttribute('data-splash');
            if (splashAttr == null) return;
            let splashArr = splashAttr.split(',');
            for (var i = 0; i < splashArr.length; i++) {
                var item = splashArr[i];
                var attr: string | null = null;

                var property = item;
                if (item.includes('=')) {
                    var arr = item.split('=');
                    property = arr[1];
                    attr = arr[0];
                } else {
                    attr = null;
                }

                if (property in obj) {
                    let value = obj[property as keyof T];
                    
                    let nodeName = dataElement.nodeName.toLowerCase();
                    if (attr) {
                        // Special handling for value attribute on input/textarea/select elements
                        if (attr === 'value' && ['input', 'textarea', 'select'].includes(nodeName)) {
                            (dataElement as HTMLInputElement).value = String(value);
                        } else {
                            dataElement.setAttribute(attr, String(value));
                        }
                    } else {
                        let valueNodes = ['input', 'textarea'];
                        if (valueNodes.includes(nodeName)) {
                            let inputElement: HTMLInputElement = dataElement as HTMLInputElement;
                            if (inputElement.type == 'checkbox') {
                                inputElement.checked = (value == true || value == 1) ? true : false;
                            } else {
                                inputElement.value = String(value);
                            }
                        } else {
                            dataElement.textContent = String(value);
                        }
                    }
                }
            }
        }

        map<T extends object = any>(element: string, data: T[], rowbind?: (el: Element, item: T) => void, callback?: () => void) {
            return new Promise<void>((resolve, reject) => {
                try {
                    let container = document.querySelector(element);
                    if (!container) {
                        reject(new Error(`Element not found: ${element}`));
                        return;
                    }

                    let splashtemplate = container.querySelector('[data-splashtemplate]');
                    data.forEach(obj => {
                        let clone: Element = container;
                        let mustClone: boolean = false;

                        if (splashtemplate) {
                            clone = <Element>splashtemplate.cloneNode(true);
                            clone.setAttribute('data-clone', '');
                            mustClone = true;
                        }

                        if (rowbind) {
                            this.handleRowBind(rowbind, clone, obj);
                        }

                        this.prepareTemplate(obj, clone);

                        if (mustClone) {
                            container.appendChild(clone);
                        }
                        else{
                            container?.setAttribute('data-splashtemplate', 'splashed');
                        }
                    });

                    if (container.nodeName.toLowerCase() == 'select') {
                        const template = container.querySelector('[data-splashtemplate]:not([data-clone])');
                        if (template) {
                            template.remove();
                        }
                    }
                    
                    if (callback) {
                        callback();
                    }
                    resolve();
                    Events.raiseEvent('onDataSplashed', { element: element, data: data });
                } catch (error) {
                    reject(error);
                }
            });
        }
    }
}
