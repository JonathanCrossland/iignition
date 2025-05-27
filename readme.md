# iignition

A minimal, maintainable TypeScript framework for building single-page applications with component-based architecture and dynamic view loading.

## Features

- **SPA Navigation**: Hash-based routing with automatic view loading
- **View Containers**: Dynamic content loading into designated containers
- **View Controllers**: Logic handlers for view initialization and interaction
- **Component System**: Reusable UI components with built-in functionality
- **Data Management**: Built-in fetch utilities with automatic content-type handling
- **Data Templating**: Dynamic content binding and template rendering
- **Custom Folder Structures**: Flexible project organization and configurable paths
- **Event System**: Framework-wide event handling and communication
- **State Management**: Automatic state tracking and URL synchronization
- **TypeScript**: Full TypeScript support with strong typing

## Build the framework

```
 tsc -p tsconfig-framework.json --watch
 tsc -p tsconfig-components.json --watch
 ```

## Navigation

The framework supports two types of navigation:

1. Click-based navigation using links with `href="#!view.html"` or `data-link="view.html"` attributes
2. Direct URL navigation using hash-based URLs (e.g., `#!view.html`)

When a hash-based URL is used (either through direct navigation or clicking a link), the framework:
- Creates a state object with the view and any associated data
- Runs the controller handler with this state
- Updates the URL only when loading into the root container (`[data-viewcontainer=""]`)

