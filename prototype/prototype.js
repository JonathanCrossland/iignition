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
    $i.Data.getData('https://jsonplaceholder.typicode.com/posts', null, function (data) {
        $i.Splash.map('#splashExample1', data, null, function () {
            updateStatus('data splashed');
        })
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
    $i.Data.getData('../prototype/countries.json', null, function(data){
        $i.Splash.map('#selectCountry', data, null, function(){
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
    updateStatus(href + 'was clicked');
    $i.show('[data-viewContainer]', href);

    bindLinks();
    event.preventDefault();
    event.stopPropagation();
    return false;
}