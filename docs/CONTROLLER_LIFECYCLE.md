# Controller Lifecycle Management

This document explains the enhanced controller lifecycle management system in iignition that prevents memory leaks and unwanted event subscriptions in your SPA.

## The Problem

In Single Page Applications (SPAs), when you navigate between views:
1. New controllers are loaded and subscribe to events (`onStateChanged`, DOM events, intervals, etc.)
2. Old controllers remain in memory with active event subscriptions
3. State changes trigger events in **all** loaded controllers (old and new)
4. This causes memory leaks, duplicate processing, and unexpected behavior

## The Solution: Enhanced Lifecycle Management

The framework now implements automatic controller cleanup using the **onUnload lifecycle method** combined with tracking mechanisms.

### Container-Based Lifecycle Flow

iignition supports multiple simultaneous controllers across different containers:

```
Main Container (data-viewcontainer=""):
  Controller A: onInit() → onLoad() → [active]
                              ↓
Header Container (data-viewcontainer="header"):  
  Controller B: onInit() → onLoad() → [active]
                              ↓
                    User navigates MAIN container
                              ↓
Main Container:
  Controller A: onUnload() → [cleanup] → [deactivated]
  Controller C: onInit() → onLoad() → [active]
                              ↓
Header Container:
  Controller B: [STILL ACTIVE - unchanged]
```

**Key Points:**
- Controllers are isolated **per container**
- Navigation in one container doesn't affect controllers in other containers
- Each container maintains its own controller lifecycle

## Implementation Details

### 1. Base Controller Class

The base `Controller` class now includes the `onUnload()` method:

```typescript
export class Controller {
    onInit() { }
    onLoad(data: any): Promise<Boolean> { }
    onUnload(): Promise<Boolean> { }  // NEW: Cleanup hook
    onRefresh() { }
    onSubmit(form: HTMLFormElement, data: any): Promise<any> { }
}
```

### 2. ControllerExtension Enhancement

The `ControllerExtension` automatically:
- **Awaits** `onUnload()` on the controller for the **specific container** before loading a new one
- Tracks controllers per container (`Map<container, controller>`)
- Provides timeout protection (5 seconds) for cleanup operations
- Supports multiple simultaneous controllers across different containers
- Only unloads controllers when their specific container is being navigated
- Provides force cleanup methods for emergencies

### 3. Controller Implementation Pattern

Your controllers should follow this pattern for proper cleanup:

```javascript
class MyController extends iignition.Controller {
    constructor() {
        super();
        this.eventHandlers = new Map();
        this.intervalIds = [];
        this.timeoutIds = [];
    }

    async onLoad(data) {
        // Subscribe to events with tracking
        this.subscribeToEvent('onStateSaved', this.handleStateSaved.bind(this));
        this.setupDOMEvents();
        this.startPeriodicTasks();
        return true;
    }

    async onUnload() {
        // Clean up everything
        this.unsubscribeFromAllEvents();
        this.clearPeriodicTasks();
        this.removeDOMEvents();
        this.cancelPendingRequests();
        return true;
    }

    // Helper methods for tracking subscriptions
    subscribeToEvent(eventName, handler) {
        window.addEventListener(eventName, handler);
        this.eventHandlers.set(eventName, handler);
    }

    unsubscribeFromAllEvents() {
        for (let [eventName, handler] of this.eventHandlers) {
            window.removeEventListener(eventName, handler);
        }
        this.eventHandlers.clear();
    }
}
```

## Best Practices

### 1. Always Track Subscriptions

```javascript
// ❌ BAD: No cleanup tracking
window.addEventListener('onStateSaved', this.handleState.bind(this));

// ✅ GOOD: Track for cleanup
this.subscribeToEvent('onStateSaved', this.handleState.bind(this));
```

### 2. Clean Up Intervals and Timeouts

```javascript
// ❌ BAD: Intervals continue after view change
setInterval(() => this.autoSave(), 30000);

// ✅ GOOD: Track and clean up
const id = setInterval(() => this.autoSave(), 30000);
this.intervalIds.push(id);

// In onUnload():
this.intervalIds.forEach(id => clearInterval(id));
```

### 3. Cancel Pending Requests

```javascript
async onLoad(data) {
    this.currentRequest = fetch('/api/data');
    const response = await this.currentRequest;
    // ...
}

async onUnload() {
    if (this.currentRequest) {
        this.currentRequest.abort();
        this.currentRequest = null;
    }
}
```

### 4. Close External Connections

```javascript
async onLoad(data) {
    this.websocket = new WebSocket('ws://example.com');
    // ...
}

async onUnload() {
    if (this.websocket) {
        this.websocket.close();
        this.websocket = null;
    }
}
```

## Event Types to Clean Up

### State Events
- `onStateSaved`
- `onStateLoaded`
- `onStateError`

### DOM Events
- Click handlers
- Form submissions
- Scroll listeners
- Resize handlers

### Custom Application Events
- `user:login`
- `data:refresh`
- Component-specific events

### Browser APIs
- `setInterval` / `setTimeout`
- WebSocket connections
- `addEventListener` on window/document
- AbortController for fetch requests

## Testing Your Implementation

### 1. Check Console Logs
Enable debug logging to see cleanup messages:
```
ExampleController: onLoad called
Subscribed to event: onStateSaved
ExampleController: onUnload called - cleaning up
Unsubscribed from event: onStateSaved
Cleanup completed successfully
```

### 2. Monitor Memory Usage
Use browser dev tools to check for:
- Memory leaks in Performance tab
- Event listener counts in Elements tab
- Network requests that should be cancelled

### 3. Test State Changes
1. Load View A (subscribes to state events)
2. Navigate to View B
3. Trigger state changes
4. Verify only View B controller responds

## Error Handling and Timeouts

The cleanup system is resilient and includes timeout protection:
- If `onUnload()` throws an error, cleanup continues
- **5-second timeout** prevents hanging on slow cleanup operations
- Framework-level cleanup happens regardless of controller errors
- Graceful fallback for controllers that don't implement `onUnload()`
- Force cleanup methods available for emergency situations

```javascript
async onUnload() {
    try {
        // Your cleanup code - must complete within 5 seconds
        await this.closeWebSocketConnections();
        await this.saveUnsavedData();
        this.unsubscribeFromAllEvents();
        return true;
    } catch (error) {
        console.error('Cleanup error:', error);
        return false; // Framework continues anyway
    }
}
```

### Timeout Behavior
- Normal cleanup: 5-second timeout
- Force cleanup: 2-second timeout
- After timeout: Framework proceeds with new controller loading
- Controllers should design cleanup to complete quickly

## Migration Guide

### For Existing Controllers

1. Add `onUnload()` method to your controllers
2. Move cleanup logic from destructors to `onUnload()`
3. Use tracking patterns for event subscriptions
4. Test navigation flows thoroughly

### Framework Integration

The framework handles this automatically:
- No changes needed to routing logic
- Existing controllers work without `onUnload()` (just no cleanup)
- Progressive enhancement - add cleanup as needed

## Performance Benefits

This system provides:
- **Memory leak prevention** - old controllers are properly cleaned up
- **Event isolation** - only active controller responds to events
- **Performance improvement** - fewer active event listeners
- **Predictable behavior** - clean separation between views
- **Developer experience** - clear lifecycle patterns

## Multi-Container Example

Consider this HTML structure:
```html
<header data-viewcontainer="header"></header>
<main data-viewcontainer=""></main>
<aside data-viewcontainer="sidebar"></aside>
```

With navigation:
```javascript
// Load header (stays persistent)
$i.show('#!views/navigation.html', 'header');

// Load main content
$i.show('#!views/dashboard.html', ''); // main container

// Load sidebar
$i.show('#!views/widgets.html', 'sidebar');

// Navigate main content (header and sidebar controllers remain active)
$i.show('#!views/reports.html', ''); // Only main container controller changes
```

## Example Scenarios

### Scenario 1: Multi-Container Dashboard
```javascript
// Header Controller (persistent)
class NavigationController extends iignition.Controller {
    async onLoad(data) {
        this.subscribeToEvent('user:logout', this.handleLogout.bind(this));
        return true;
    }

    async onUnload() {
        this.unsubscribeFromAllEvents();
        return true;
    }
}

// Main Content Controller (changes on navigation)
class DashboardController extends iignition.Controller {
    async onLoad(data) {
        this.subscribeToEvent('data:refresh', this.refreshData.bind(this));
        this.startDataPolling();
        return true;
    }

    async onUnload() {
        this.unsubscribeFromAllEvents();
        this.stopDataPolling();
        return true;
    }
}

// Sidebar Controller (persistent)
class WidgetController extends iignition.Controller {
    async onLoad(data) {
        this.subscribeToEvent('widget:update', this.updateWidget.bind(this));
        return true;
    }

    async onUnload() {
        this.unsubscribeFromAllEvents();
        return true;
    }
}
```

This lifecycle management system ensures your SPA remains performant and predictable as users navigate between views. 