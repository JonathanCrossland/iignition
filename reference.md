# iignition Reference

## iignition base functions
### ```$i.ready = function(options,callback)```
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

### ```$i.show = function (container, view, data, rowbindcallback, callback)```
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

### ```$i.viewChanged: function (callback)```
When the #! url changes in the URL, the viewChanged event fires
- callback
    - Callback to fire when view changes

## iignition cache component

### ```$i.cache.clear = function(key)```
Clears localstorage of all cache inserted with iignition. Other localStorage will be unaffected.
- key [optional]
    - The key to clear. If not supplied, all keys will be removed 

### ```$i.cache.Data = function(key,data)```
Sets/Gets data from the localStorage based on a key.
- key
    - the key in localstorage    
- data [optional]
    - If not provided, the data is returned for the given key. if the key is provided, the data is inserted into localStorage with the key. 

returns => If data was not provided, returns the data if available. If data was provided returns result of adding data to localStorage

## iignition data component

### ```$i.Data.getData = function (url, data, successCallback, errorCallback) ```
Uses jQuery.ajax to make data calls. Expects JSON.
- url
    - The URL to JSON. prefixing the URL with cache: will attempt to load the JSON from cache if it is available.
- data [optional]
    - Post Variables. If not defined, a HTTP GET is issued 
- successCallback [optional]
    - Callback once data is successfully returned 
- errorCallback [optional]
    - Callback if error on attempt to retrieve data 

returns => the requested JSON object

```$ end of document```