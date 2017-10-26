$i.ready({ 'preventDoublePosting': true }, function () {
    updateStatus('iignition.js loaded');
    bindLinks();
});

function updateStatus(msg) {
    console.log(msg);
    var element = document.getElementById('status');
    element.innerHTML = msg;
}

// Simple splash example using only a GET url
function splashExample1() {
    $i.Data.getData('https://jsonplaceholder.typicode.com/users', null, function (data) {
        $i.Splash.map('#splashExample1', data, null, function () {
            updateStatus('data splashed');

            // bind data-id links to open a detailed view of a particular row
            // this is to load a summary or edit for this particular row in the table
            // each table in the splashtemplate is marked with [data-id]
            // bind a click event to each and load the data for that particular id 
            // serve the view in the [data-viewContainer]
            var elements = document.querySelectorAll('tr[data-id]');

            elements.forEach(function (element) {

                element.addEventListener('click', function (event) {

                    var id = element.getAttribute('data-id');

                    updateStatus('data-id was clicked for id: ' + id);
                    $i.Data.getData('https://jsonplaceholder.typicode.com/users/' + id, null, function (data) {                                                
                        $i.show('[data-viewContainer]', 'views/splashDetail.html', [data]);
                    });
                });

            }, this);

        })

    });
}

function splashDetailExample() {
    updateStatus('init splashDetailExample');
    var form = document.querySelector('form');
    form.addEventListener('submit', function (event) {
        updateStatus('form submitted.');
        stopEvents(event);
    });
}

function formExample1() {
    updateStatus('init formExample1');
    var form = document.getElementById('formExample1');
    form.addEventListener('submit', function () {
        updateStatus('form submit was clicked');
        if (form.getAttribute('data-submitted')) {
            updateStatus('cannot submit form. already submitted.');
        }
    });
}

function formExample2() {
    updateStatus('init formExample2');
    $i.Data.getData('../prototype/countries.json', null, function (data) {
        $i.Splash.map('#selectCountry', data, null, function () {
            updateStatus('select was splashed');
            $i.Splash.setSelected('#selectCountry', 'DZ');
        });
    });
}

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
    updateStatus(href + ' was clicked');
    $i.show('[data-viewContainer]', href);

    bindLinks();
    stopEvents(event);
}

function stopEvents(event) {
    event.preventDefault();
    event.stopPropagation();
    return false;
}