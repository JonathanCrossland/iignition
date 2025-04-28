
namespace iignition {

    export class ViewPort {
        public el: any;

        constructor(el) {
            
            this.el = el;
            var elements = el.querySelectorAll('a[href^="#!"],[data-route]');
            if (elements) {
                elements.forEach(function (element) {
                    element.addEventListener('click', this.clickHandler);
                });
            }
        }

        clickHandler (event) {
            var x = event.target.getAttribute('href');
            if (x == null) {
                x = event.target.getAttribute('data-route');
            }
            var stateObj = { view: x };
            history.pushState(stateObj, document.title, location.hash);
            console.log(event.target);
            event.preventDefault();
        };
    }
}
