# State Management

The `State` class provides a simple shared state management system that can be accessed globally through `$i.State`. It allows you to store and retrieve values across different parts of your application.

## Usage

### Basic Operations

```javascript
// Store a value
$i.State.add('key', value);

// Retrieve a value
const value = $i.State.get('key');

// Check if a key exists
if ($i.State.has('key')) {
    // Do something
}

// Remove a value
$i.State.remove('key');

// Clear all values
$i.State.clear();
```

### Examples

#### Storing and Retrieving Objects
```javascript
// Store an object
$i.State.add('user', {
    name: 'John',
    age: 30,
    preferences: {
        theme: 'dark',
        language: 'en'
    }
});

// Retrieve and use the object
const user = $i.State.get('user');
console.log(user.name); // Output: John
```

#### Storing and Retrieving Elements
```javascript
// Store a DOM element
const element = document.getElementById('myElement');
$i.State.add('mainElement', element);

// Retrieve and use the element
const storedElement = $i.State.get('mainElement');
storedElement.classList.add('active');
```

#### Checking and Removing Values
```javascript
// Check if a value exists
if ($i.State.has('config')) {
    const config = $i.State.get('config');
    // Use config
}

// Remove a value when no longer needed
$i.State.remove('tempData');
```

## API Reference

### Methods

#### `add(key: string, value: any): void`
Stores a value with the specified key.

#### `get(key: string): any`
Retrieves the value associated with the specified key.

#### `remove(key: string): void`
Removes the value associated with the specified key.

#### `has(key: string): boolean`
Returns `true` if the specified key exists in the state.

#### `clear(): void`
Removes all values from the state.

## Best Practices

1. Use descriptive keys to avoid naming conflicts
2. Remove values when they are no longer needed
3. Check if a key exists before retrieving its value
4. Use TypeScript for better type safety when possible

## Notes

- The state is shared across all files that have access to the `$i` object
- Values can be of any type (objects, arrays, elements, primitives)
- The state persists until explicitly cleared or the page is reloaded 