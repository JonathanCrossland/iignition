# iignition Reference

## iignition base functions
## ```$i.ready = function(options,callback)```
When the page is ready and $i is ready to be used.
- options   
    ```javascript
        {
            'debug': true/false,            
            'enablecache' : true/false 
            'preventDoublePosting' : true/false
        }
    ``` 
- callback
    - This will fire when the entire DOM has loaded and is ready.
    - Replacement to ```$(function(){ });```

## ```$i.show = function (container, view, data, rowbindcallback, callback)```
Show a view in a container, optionally splashing data
- container
    - The selector to the element that will be the container for the view.     
- view
    - The selector to the view, or the html file to load as a view.
- data
    - The JSON data,array or single object to splash onto the view.
- rowbindcallback
    - A callback that will be called when each row binds to the template.
- callback
    - Callback to execute once the view is loaded.

## ```$i.viewChanged: function (callback)```
When the #! url changes in the URL, the viewChanged event fires
- callback
    - Callback to fire when view changes

## iignition cache component

## ```$i.cache.clear = function(key)```
Clears localstorage of all cache inserted with iignition. Other localStorage will be unaffected.
- key
    - The key to clear. If not supplied, all keys will be removed        