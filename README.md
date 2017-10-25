# iignition.js

## Loading iignition.js
Instead of using jquery ready use iignition. Iignition must be loaded before you can call any of its functions. Iignition will load after jquery

```javascript
    // Use this instead of 
    // $(function(){ // jquery loaded });
    $i.ready(function(){
        console.log('ignition has loaded');
        // Your iignition code goes here
    });
```

## Get JSON from an API then display it on screen in a template of your choice

In this example ```#splashExample1``` refers to a predesigned 'template' that will be cloned and 'splashed' with data.

### Example - table
### HTML
This shows a simple Bootstrap table that will be splashed with the needed data being each new ```tr```
```html
    <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>id</th>
                            <th>title</th>
                            <th>body</th>
                        </tr>
                    </thead>
                    <tbody id="splashExample1">
                        <tr data-splashtemplate="">
                            <td scope="row" data-splash="id"></td>
                            <td data-splash="title"></td>
                            <td data-splash="body"></td>
                        </tr>
                    </tbody>
                </table>
            </div>
```
### Javascript
```javascript
function splashExample1() {
    $i.Data.getData('https://jsonplaceholder.typicode.com/posts', null, function (data) {
        $i.Splash.map('#splashExample1', data, null, function () {
            /// Onsuccess of splash this is called
        })
    });
}
```
### Output
| id   |      title      |  body |
|----------|:-------------:|------:|
| 1 | my title | sunt aut facere repellat provident occaecati |
| 2 | my title | sunt aut facere repellat provident occaecati |
| 3 | my title | sunt aut facere repellat provident occaecati |

### Example - Select(dropdown)

### HTML

```html
       <select class="form-control" id="selectCountry" name="selectCountry" aria-describedby="countryHelp">
            <option value="0">Select an option</option>
            <option data-splashtemplate="" data-splash="value=code, name"></option>
        </select>
        <small id="countryHelp" class="form-text text-muted">Select your country from the list</small>
```
### Javascript
```javascript 
    // load data using iignition
    $i.Data.getData('../prototype/countries.json', null, function(data){
        // use splash to 'template' the <option> in the select
        $i.Splash.map('#selectCountry', data, null, function()
        {            
            // if you need to set a particular option as the selected by default
            $i.Splash.setSelected('#selectCountry', 'DZ');
        });
    });
```

## Loading views

In iignition you can dynamically load views into your html. The URL stays the same but the content changes. We utilize a rule that is recognized by Google and its crawler to still allow pages to be crawled. In the url the view gets appended to the url with an hashbang(#!) google recognizes this as a dynamic view and crawls it.

### Example
Create a section in your html with an attribute ```data-viewContainer``` this tells iignition which element is your main container and all views will be loaded into it. In the following example, the view: [viewname] will be loaded from disk and injected into the ```data-viewContainer```.
### HTML 
```html

    <!-- This goes into your main webpage where you want to load your views -->
    <div data-viewContainer>
        // Your view will go in here
        // Any html in this element will be removed and replaced with your actual view.
    </div>

    <!-- 
        - This goes into your view in a seperate html file on your disk.
        - [viewname] in this context is your name for this particular view or page.
        - These views must go into a folder named views on the root of your project by convention. 
        - When a view is being loaded, iignition looks for a file on your disk in the directory: ~/views/[viewname].html    
    -->
    <div data-view='viewname'>
        <script>
            function viewname()
            {
                // called when view is loaded
            }
            
            function _viewname()
            {
                // called when view is unload and removed from [data-viewContainer]
            }
        </script>
    </div>
```
### Javascript

```javascript    
        $i.ready(function () { // use instead of jquery ready
            $i.show("[data-viewContainer]", "views/home.html"); // this will load home.html from the disk and inject its html into [data-viewContainer] and call home() on the home.html view.            
        });    
```

## Navigation and Routing

Iignition has a sense of navigation and routing which you can use through the use of displaying views in a ```data-viewContainer```.

On an anchor tag you have to create a ```click``` event in javascript and then override what the click does.

### Example
### HTML 
In the following example the we used [data-link] to distinguish which links are routing/redirection links.

```html
    <a class="navbar-brand" href="views/home.html" data-link>iignition</a>
    <ul class="navbar-nav mr-auto">
        <li class="nav-item">
            <a class="nav-link" href="views/form.html" data-link>Form example</a>
        </li>
        <li class="nav-item">
            <a class="nav-link" href="views/about.html" data-link>About page</a>
        </li>
        <li class="nav-item">
            <a class="nav-link" href="views/help.html" data-link>Help page</a>
        </li>
    </ul>       
```

### Javascript
```javascript
    // Bind elements with [data-link] to load a specific view into the viewContainer when clicked.
    // This will load a particular page from the 'views' folder based on a link that was clicked.
    // This will not redirect the page away. Just the html will change.
    function bindLinks() {
        var links = document.querySelectorAll('a[data-link]');
        if (links.length > 1) {
            updateStatus('binding links');
            for (var i = 0; i < links.length; i++) {
                var element = links[i];
                updateStatus('binding link for ' + element.getAttribute('href'));
                element.removeEventListener('click', bindLink, false);

                element.addEventListener('click', bindLink);
            }
            return false;
        }
    }

    // bind a click event to each anchor with a [data-link] attribute to load a particular page
    function bindLink(event) {
        var href = this.getAttribute('href');
        updateStatus(href + 'was clicked');
        $i.show('[data-viewContainer]', href);

        bindLinks();
        event.preventDefault();
        event.stopPropagation();
        return false;
    }
```

--- 