---
name: iignition-framework
description: Understands the iignition TypeScript SPA framework including controllers, routing, state, views, extensions, and components. Use when working with iignition projects, building views/controllers, extending the framework, or when the user mentions iignition, view containers, or SPA navigation.
---

# iignition Framework

A minimal TypeScript SPA framework with component-based architecture, hash-based routing, and dynamic view loading. Source: `src_framework/`, docs: `docs/`.

## Global API

The framework exposes a global `$i` object (iignition.Core):

| Property | Purpose |
|----------|---------|
| `$i.Options` | Configuration (spa, viewPath, controllerPath, domainRoot, debug) |
| `$i.Data` | Fetch utility with automatic content-type handling |
| `$i.State` | Singleton state store (add, get, remove, has, clear) with localStorage persistence |
| `$i.Splash` | Data templating: `map()`, `applyTemplate()` with `data-splash`, `data-splashtemplate` |
| `$i.show(view, container, data, callback)` | Programmatic navigation |
| `$i.ControllerHandler` | Runs controller pipeline |
| `$i.RouteHandler` | Runs route pipeline |
| `$i.User` | User/auth (isAuthorised, isInRole) |

## Initialization

```javascript
$i.ready(options, callback);
// or
$i.ready(callback);
```

Options: `spa`, `view`, `viewPath`, `controllerPath`, `domainRoot`, `controller`, `debug`, `staticUrl`.

## Navigation

Hash-based URLs: `#!views/dashboard.html` or `#!views/dashboard.html?id=1`

Links: `href="#!views/dashboard.html"` or `data-link="views/dashboard.html"`. Use `data-container="header"` to target a specific view container.

Root container: `[data-viewcontainer=""]`. Named containers: `[data-viewcontainer="header"]`, `[data-viewcontainer="sidebar"]`.

## Controller Lifecycle

Controllers extend `iignition.Controller` and implement lifecycle methods:

```typescript
class MyController extends iignition.Controller {
    onInit() { }
    async onLoad(data): Promise<Boolean> { return true; }
    async onUnload(): Promise<Boolean> { return true; }
    onRefresh() { }
    async onSubmit(form, data): Promise<any> { return; }
}
```

**Critical**: Implement `onUnload()` to prevent memory leaks. Unsubscribe from events, clear intervals/timeouts, cancel fetch requests, close WebSockets. Controllers are isolated per container; navigation in one container does not unload controllers in others.

Controller path convention: `views/dashboard.html` → `viewControllers/views/dashboard.js`. Controller class name must match filename (e.g. `dashboard.js` → `class dashboard`).

## Extensions

Extensions implement `handle(ctx)` and are added to pipelines. Built-in extensions:

- **RouteExtension**: Wires click handlers for `a[href^="#!"],[data-link]`, handles popstate/hashchange
- **ViewExtension**: Fetches HTML, injects into container, executes inline scripts
- **ControllerExtension**: Loads controller script, calls onInit/onLoad, tracks per-container, awaits onUnload before loading new controller
- **FormExtension**: Intercepts form submit, serializes, delegates to controller.onSubmit
- **AuthenticationHandler**: Role-based visibility via `data-role`, `$i.User`
- **ImageErrorHandler**: Handles broken images

## State Management

`$i.State` persists to localStorage. Events: `onStateSaved`, `onStateLoaded`, `onStateError`. Use `view_${url}` keys for view state restoration on back/forward.

## Data Fetching

`$i.Data.fetch(url, init)` returns parsed response (JSON, text, blob) based on Content-Type. Raises `onDataRequested`, `onDataReceived`. Rejects with status 401 for unauthorized.

## Splash (Data Templating)

```html
<div data-splashtemplate>
  <span data-splash="name"></span>
  <img data-splash="src=imageUrl">
</div>
```

```javascript
$i.Splash.map('#container', dataArray, (el, item) => { /* rowbind */ });
```

`data-splash` syntax: `property` (textContent/value) or `attr=property` (e.g. `src=imageUrl`).

## Events

`iignition.Events.raiseEvent(name, data)` dispatches CustomEvent on window. Framework events: `onViewLoading`, `onViewLoaded`, `onViewUnauthorised`, `onFormSubmitted`, `onDataSplashed`, `onDataRequested`, `onDataReceived`, `authorise`.

## Components

Reusable UI in `src_components/`. Built as Web Components (extends HTMLElement) or framework components. Build: `tsc -p tsconfig-components.json --watch`.

## Build

```bash
tsc -p tsconfig-framework.json --watch
tsc -p tsconfig-components.json --watch
```

## Key Conventions

- Views: HTML files in `viewPath` (default `views/`)
- Controllers: JS in `controllerPath` (default `viewControllers/`)
- Root container has `data-viewcontainer=""` (empty string)
- URL updates only when loading into root container
- Query params in URL are merged into `ctx.data`

## Additional Resources

- For Options, cleanup patterns, and pipeline details, see [reference.md](reference.md)
- For controller lifecycle and memory management, see [docs/CONTROLLER_LIFECYCLE.md](../../../docs/CONTROLLER_LIFECYCLE.md)
