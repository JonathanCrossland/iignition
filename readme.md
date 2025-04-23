# Readme

Build the framework

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

