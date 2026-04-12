# iignition Framework Reference

## Options

| Option | Default | Description |
|--------|---------|-------------|
| spa | true | Enable SPA mode |
| viewPath | "views" | Path to view HTML files |
| controllerPath | "viewControllers" | Path to controller JS files |
| domainRoot | "" | Prefix for asset URLs |
| controller | false | Disable controller loading |
| staticUrl | false | Strip query string from URL on navigation |
| preventDoublePosting | true | Form submission guard |
| enableCache | true | Cache settings |
| debug | false | LogLevel.Off, Minimal, Standard, Verbose |

## RoutingUtility

Parses URL into: `view`, `controllerjs`, `controller` (class name), `container`, `data` (query params). View path `views/x.html` maps to controller `viewControllers/views/x.js`.

## Controller Cleanup Pattern

```javascript
class MyController extends iignition.Controller {
    constructor() {
        super();
        this.eventHandlers = new Map();
        this.intervalIds = [];
    }
    async onLoad(data) {
        const handler = this.handleEvent.bind(this);
        window.addEventListener('onStateSaved', handler);
        this.eventHandlers.set('onStateSaved', handler);
        return true;
    }
    async onUnload() {
        for (const [name, handler] of this.eventHandlers) {
            window.removeEventListener(name, handler);
        }
        this.eventHandlers.clear();
        this.intervalIds.forEach(id => clearInterval(id));
        return true;
    }
}
```

## Multi-Container Example

```html
<header data-viewcontainer="header"></header>
<main data-viewcontainer=""></main>
```

```javascript
$i.show('#!views/nav.html', 'header');
$i.show('#!views/dashboard.html', '');
```

## Pipeline Order

ControllerHandler: AuthenticationHandler → ViewExtension → ControllerExtension
RouteHandler: AuthenticationHandler → RouteExtension → FormExtension → ImageErrorHandler

## State Events

State class dispatches: `onStateSaved`, `onStateLoaded`, `onStateError`. Use `State.add(key, value, true)` for silent save (no event).
