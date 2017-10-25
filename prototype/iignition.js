/* 
 * iIgnition, Copyright 2017 Lucid Ocean
 * License: MIT see http://www.iignition.com/#!license.html
 * Version 01
 */
var $i = iignition = (function () {

    var onReadyCallbacks = [];
    var onViewChangedCallbacks = [];
    var consoleLines = [];
    var fireReady = false;
    var options = { preventDoublePosting: true };
    fireOnReady = function () {
        for (var item in onReadyCallbacks) {
            if (onReadyCallbacks[item]) {
                onReadyCallbacks[item].callback();
            }
        }
        fireReady = true;
    };
    fireOnViewChanged = function (view) {
        for (var item in onViewChangedCallbacks) {
            if (onViewChangedCallbacks[item]) {
                onViewChangedCallbacks[item].callback(view);
            }
        }
    };

    // window.consoleSuppress = window.console;
    $(function () {

        //_init();
        _preventDoublePosting();
        _hashbang();
        fireOnReady();

        $(window).on('hashchange', function () {
            _hashbang();
            fireOnViewChanged($i.options.view);
        });
    });


    function _init() {

        if ($i.Cache) {
            $.ajaxSetup({ cache: $i.options.enablecache, preventDoublePosting: true });
        }

        //if ($i.options.debug === false) {
        //    window.console = {};
        //    window.console.log = function () {
        //         consoleLines.push(arguments);
        //    };
        //}
        //else {
        //    window.console = window.consoleSuppress;
        //}



    }

    function _preventDoublePosting() {
        if ($i.options.preventDoublePosting === true) {
            $("form").each(function () {
                $(this).on('submit', function (e) {
                    var $form = $(this);
                    if ($form.attr('data-submitted') === true) {
                        e.preventDefault();
                    } else {
                        $form.attr('data-submitted', true);
                        document.title = "submitting";
                    }
                });
            });
        }
    }
    function _hashbang() {
        if (document.location.hash) {
            if (document.location.hash.startsWith("#!")) {
                var v = document.location.hash.replace("#!", "");

                if ($i.options.view === v) {
                    $i.options.view = undefined;
                }
                else {
                    $i.options.view = v;
                }
                return;
            }
        }
        $i.options.view = undefined;
    }

    /** needed for IE **///
    if (typeof String.prototype.endsWith !== 'function') {
        String.prototype.endsWith = function (suffix) {
            return this.indexOf(suffix, this.length - suffix.length) !== -1;
        };
    }

    if (typeof String.prototype.startsWith !== 'function') {
        String.prototype.startsWith = function (suffix) {
            return this.indexOf(suffix, 0) === 0;
        };
    }

    function _load(container, view, callback) {

        $(container).load(view, function (responseText, textStatus, XMLHttpRequest) {
            if (textStatus === "success") {
                if (callback)
                    callback(responseText);

            }
        });
    }

    function _show(container, view, data, rowbindcallback, callback) {


        var $view = $(view);
        $view.appendTo($(container));

        _bind(container, data, rowbindcallback, function () {
            _constructor(view, callback);
        });
    }

    function _bind(container, data, rowbindcallback, callback) {

        var $container = $(container);

        if (data != undefined && data != null) {
            $i.Splash.map($container, data, rowbindcallback, function () {
                if (callback) callback();
            });
        }
        else {
            if (callback) callback();
        }
    };;

    function _constructor(view, callback) {
        view = view.substr(view.lastIndexOf("/") + 1);
        view = view.replace(".html", "");
        view = view.replace(".xml", "");

        if (window[view]) {
            if (typeof window[view] === 'function') {
                window[view]();
            }
        };
        if (callback) {
            callback();
        }
    };

    /***end of IE *****/
    return {
        options: { debug: false, enablecache: false, preventDoublePosting: true },
        ready: function (options, callback) {
            /// <summary>
            /// When the page is ready and $i is ready to be used.
            /// </summary>
            /// <arg name="options">pass in options { debug: true/false, enablecache: true/false }</arg>
            /// <arg name="callback">when the page is ready, the callback is fired.</arg>

            var o = { debug: false, enablecache: false, preventDoublePosting: true };
            if (typeof options === 'function') {
                $i.options = o;
                callback = options;
            }
            else {
                $i.options = $.extend(o, options);
            }
            _init();
            if (callback != undefined) {
                if (fireReady == false) {
                    onReadyCallbacks.push({ callback: callback });
                } else {
                    callback();
                }
            }

            $("a").css({ "pointer-events": "auto" });

        },

        show: function (container, view, data, rowbindcallback, callback) {
            /// <summary>
            /// Show a view in a container, optionally splashing data
            /// </summary>
            /// <arg name="container">the selector to the element that will be the container for the view</arg>
            /// <arg name="view">the selector to the view, or the html file to load as a view</arg>
            /// <arg name="data">the JSON data, array or single object to splash onto the view</arg>
            /// <arg name="rowbindcallback">a callback that will be called when each row binds to the template</arg>
            /// <arg name="callback">the callback to execute once the view is loaded</arg>

            if (view == undefined) { console.log("No View Specified"); return; };

            if (view.endsWith(".html") || view.endsWith(".xml")) {
                _load(container, view, function (viewhtml) {
                    _bind(container, data, rowbindcallback, function () {
                        _constructor(view, callback);
                        _preventDoublePosting();
                    });
                });
            }
            else {
                _show(container, view, data, rowbindcallback, function () {
                    _constructor(view, callback);
                    _preventDoublePosting();
                });
            }

            if (window["_gaq"]) {
                _gaq.push(['_trackPageview', "#!" + view]);
            }
            $i.options.view = view;
            document.location.hash = "#!" + view;

        }
        ,
        lock: function () {
            $("a,input,button").attr("disabled", "disabled");
        },
        viewChanged: function (callback) {
            /// <summary>
            /// When the #! url changes in the URL, the viewChanged event fires
            /// </summary>
            /// <arg name="callback"></arg>
            onViewChangedCallbacks.push({ callback: callback });
        },
        length: function (data) {
            if (data.length) {
                return data.length;
            }
            else {
                var size = 0, key;
                for (key in data) {
                    if (data.hasOwnProperty(key)) size++;
                }
                return size;
            }
        },
        isMsg: function (obj) {
            if (typeof obj === "object") {
                if (obj !== undefined) {
                    if (obj.Message !== undefined) {
                        if (obj.MessageId) {
                            return true;
                        }
                    }
                }
            }
            return false;
        },
        silentConsole: consoleLines

    }

})();

$i.Cache = (function () {
    var o = {};

    o.clear = function (key) {
        /// <summary>
        /// Clears localstorage of all cache inserted with iignition. Other localStorage will be unaffected.
        /// </summary>
        /// <arg name="key">The key to clear. If not supplied, all keys will be removed</arg>
        if (key) {
            localStorage.removeItem(["iCache_" + key]);
        }
        else {
            if ('localStorage' in window && window['localStorage'] !== null) {
                localStorage.clear();
            }
        }
    };

    o.Data = function (key, data) {
        /// <summary>
        /// Sets/Gets data from the localStorage based on a key.
        /// </summary>
        /// <arg name="key">The key</arg>
        /// <arg name="data">opyional. If not provided, the data is returned for the given key. if the key is provided, the data is inserted into localStorage with the key.</arg>
        /// <returns type=""></returns>
        if ('localStorage' in window && window['localStorage'] !== null) {
            if (data) {
                localStorage["iCache_" + key] = JSON.stringify(data);
            }
            else {
                if (localStorage["iCache_" + key]) {
                    return JSON.parse(localStorage["iCache_" + key]);
                } else {
                    return undefined;
                }
            }

            return true;
        }

        return false;
    };

    return o;
})();



$i.Data = (function () {
    var o = {};

    o.getData = function (url, data, successCallback, errorCallback) {
        /// <summary>
        /// Uses jQuery.ajax to make data calls. Expects JSON
        /// </summary>
        /// <arg name="url">The URL to JSON. prefixing the URL with cache: will attempt to load the JSON from cache if it is available.</arg>
        /// <arg name="data">Post Variables. If not defined, a HTTP GET is issued </arg>
        /// <arg name="successCallback">callback once data is successfully returned</arg>
        /// <arg name="errorCallback">callback if error on attempt to retrieve data</arg>
        /// <returns type="">the JSON</returns>

        //load from cache -this needs to be tightened up, but getData should read cache:DATAKEY and get the data as below
        if (url.indexOf("cache:") >= 0) {

            var s = url.split("cache:");

            if ($i.Cache && $i.options.enablecache) {

                var d = $i.Cache.Data(s[1]);
                console.log("loading cache: " + s[1]);

                if (d) {
                    if (successCallback)
                        successCallback(d);

                    return;
                }
                else {
                    url = s[1];
                }
            }
            else {
                url = s[1];
            }
        }

        function onSuccess(data) {
            if ($i.Cache) {
                $i.Cache.Data(url, data);
            }

            if (successCallback)
                successCallback(data);

        }


        function onError(xhr, status, error) {

            if (status === "timeout") {
                var ret = confirm("Timeout out occurred when trying to retrieve data. Would you like to retry?");
                console.log(ret);
                if (ret === true) {
                    o.getData(url, data, successCallback, errorCallback, fullmsg);
                    return;
                }
            }

            if (errorCallback)
                errorCallback(xhr.responseText, error);
        }

        var httptype = "get";


        var contentType = "text/javascript";
        var jsonp = true;

        var dataType = "jsonp";
        if (url.endsWith(".json")) {
            dataType = "json";
            contentType = "application/json";
            jsonp = false;
        }
        if (data) {
            if (data.DataUrl)
                data.DataUrl = "";
            if (data.ModelData)
                data.ModelData = "";
        }


        var processData = true;

        var hasFiles = false;
        var files = null;
        if (data) {
            httptype = "post";
            contentType = "application/json";

            if (data.viewName) {
                if ($("#" + data.ViewName + " input:file").length > 0) {
                    hasFiles = true;
                    $("#" + data.ViewName + " input:file")[0].files;
                }
            } else {
                if ($("input:file").length > 0) {
                    files = $("input:file")[0].files;
                    if (files.length > 0) {
                        hasFiles = true;
                    }
                }

            }
        }

        if (hasFiles === true) {
            contentType = "application/x-www-form-urlencoded";
            var formData = new FormData();
            processData = false;
            $.each(data, function (
                key,
                value) {
                formData.append(key, value);
            });

            $.each(files, function (
                key,
                value) {
                formData.append(key, value);
            });
        } else {
            formData = JSON.stringify(data);
        }


        console.log("fetching url: " + url);
        console.log(processData);
        console.log(formData);
        console.log(httptype);

        if ($i.Cache) {
            if ($i.options.enablecache === false) {
                url += "?icache=" + new Date().getTime();
            }
        }

        $.ajax({
            url: url,
            data: formData,
            type: httptype,
            dataType: dataType,
            success: onSuccess,
            error: onError,
            timeout: 1000 * 60, //1 minute
            cache: false,
            contentType: contentType,
            processData: processData,
            beforeSend: function (xhr) {

            }
        });

    };

    return o;
})();

$i.Splash = (function () {
    var o = {};

    o.element = null;

    o.map = function (element, data, rowbindcallback, callback, options) {
        /// <summary>
        /// Maps data onto HTML (templating)
        /// </summary>
        /// <arg name="element">the parent element to splash</arg>
        /// <arg name="data">the JSON data to splash</arg>
        /// <arg name="rowbindcallback">a callback for each row bind as it happens. Useful for altering data or rows as they bind</arg>
        /// <arg name="callback">Once splashed, fires this callback</arg>
        /// <arg name="options">Reserved for future use</arg>
        if (data === undefined) {
            console.log("data is undefined. Splash aborted");
            return;
        }

        var datac = $.extend(true, {}, data);
        o.element = element;
        expandTemplate(element, datac);
        applyTemplate(element, datac, rowbindcallback, options);

        if (callback) {
            callback();
        }
    };

    o.setSelected = function (select, value) {
        $(select).val(value);
    };

    o.setRadio = function (radio, value) {
        $('input:radio#' + value).prop('checked', true);
    };

    o.setCheck = function (checkbox, value) {

        if (value) {
            if (value === 1 || value === "1" || value.toLowerCase() === "true") {
                $('input:checkbox#' + checkbox).attr('checked', 'checked');
                $('input:checkbox#' + checkbox).val('on');
            } else {
                $('input:checkbox#' + checkbox).removeAttr('checked');
                $('input:checkbox#' + checkbox).val('off');
            }
        }

        $('input:checkbox#' + checkbox).unbind("click");
        $('input:checkbox#' + checkbox).click(function () {
            if ($('input:checkbox#' + checkbox).is(':checked')) {
                $('input:checkbox#' + checkbox).val('on');
            }
            else {
                $('input:checkbox#' + checkbox).val('off');
            }
        });
    };

    function applyTemplate(element, data, rowbindcallback, options) {

        if (options && (options.append === true)) {
        }
        else {
            $(element).find("[data-templateclone]").not("[data-splashx]").remove();
        }

        $template = $(element).find("[data-splashtemplate]");

        if ($template.length === 0) {
            $template = $(element).filter("[data-splashtemplate]");

            if ($template.length === 0) {
                return;
            }
        }

        $cloneparent = $template.parent();

        if ($template.get(0).tagName === "TR") {
            $cloneparent = $template.parents("tbody");
            if ($cloneparent.length === 0) {
                $cloneparent = $template.parents("table");
            }
        } else if ($template.get(0).tagName === "FORM") {
            $cloneparent = $template.parents("[data-form]");
        }
        else if ($template.get(0).tagName === "DIV") {
            $cloneparent = $template.parent("div");
        }

        if (!$i.isMsg(data)) {

            var shouldRun = $i.length(data) > 0;
            shouldRun = options === undefined ? shouldRun : options.append === true;

            shouldRun = options === undefined ? shouldRun : options.action !== "edit";
            if (shouldRun) {
                var splashTemplate = $template.first();

                for (var d in data) {
                    if ($(splashTemplate).parent().attr("id") !== $(o.element).attr("id")) {
                        if ($(splashTemplate).get(0).tagName === "OPTION") {
                            continue;
                        }
                    }
                    var elementClone = $(splashTemplate).clone();

                    $cloneparent.append($(elementClone));

                    $(elementClone).attr("data-templateclone", "true");

                    if (rowbindcallback) {
                        var returneddata = undefined;
                        if (data[d]) {
                            returneddata = rowbindcallback(elementClone, data[d]);
                        }

                        if (returneddata !== undefined) {
                            data[d] = returneddata;
                        }
                    }

                    applyobject(elementClone, data[d]);
                    $(elementClone).show();
                }
                $(splashTemplate).hide();

                if (options) {
                    if (options.action == 'edit') {
                        if ($template.parents("[data-form]")) {
                            $template.first().remove();
                        }
                    }
                }
            }
            else {
                $template.each(function () {
                    elementClone = $(this);

                    if (rowbindcallback) {
                        var returneddata = undefined;
                        if (data[0]) {
                            returneddata = rowbindcallback(elementClone, data[0]);
                        }
                        if (returneddata !== undefined) {
                            data[0] = returneddata;
                        }
                    }
                    if (data[0]) {
                        applyobject(elementClone, data[0]);
                    }
                });
            }

        } else {
            if (options) {
                if (options.action == 'edit') {

                } else {
                    $template.hide();
                }
            }
        }
    }

    function applySplashx(element, data) {
        var $splashx = $(element).find("[data-splashx]");
        if ($splashx.length > 0) {
            $splashx.each(function () {
                var atts = $(this).attr("data-splashx");
                atts = atts.split("=");
                var name = "";
                if (atts.length === 2) {
                    name = atts[1];

                }

                _selectedValue = $(this).attr("value");
                if (_selectedValue === data[name]) {
                    $(this).attr("selected", "selected");
                }

            });

            $splashx.removeAttr("data-splashx");
            $splashx.removeAttr("data-splash");
        }
    }

    function expandTemplate(element, data) {

        $(element).find("*[data-splashscaffold]").each(function () {

            var elements = new Array();
            var $elementClone = "";
            $(this).find("*[data-splash^='\\[']").each(function () {
                $elementClone = $(this);
                var splashvalue = $(this).attr("data-splash").replace("[]", "");
                for (var d in data) {
                    if (data.length > 0) {
                        for (var col in data) {
                            for (var obj in data[col]) {
                                var $newtag = $elementClone.clone();

                                $newtag.attr("data-splash", obj + splashvalue);
                                elements.push($newtag);
                            }
                            break;//just do it once
                        }
                    }
                    break;//just do it once
                }
            });

            $(this).find("*[data-splash^='\\[']").first().remove();
            $(this).append(elements);
        });
    }
    ;

    function applyobject(element, data) {
        var atts = $(element).data("splash");
        var _selectedValue = -1;
        if (atts) {
            atts = atts.split(",");

            for (var att in atts) {
                var name = atts[att].replace(/^\s+|\s+$/g, '');
                var attribute = "data-";
                var namepair = [];
                if (name.indexOf("=") > -1) {
                    namepair = name.split("=");
                    name = namepair[1];
                    attribute = namepair[0];

                }
                else {
                    attribute += name;
                }
                var val = undefined;

                var namespaces = name.split(".");
                var context = data;

                for (var i = 0; i < namespaces.length - 1; i++) {
                    context = context[namespaces[i]];
                }

                if (namespaces.length > 0) {
                    val = context[namespaces[namespaces.length - 1]];
                }
                else {
                    if (data[name]) {
                        val = data[name];
                    }

                }

                if (namepair.length > 0) {
                    if (attribute === "value") {
                        if (val) {
                            _selectedValue = data[name];
                        }
                    }
                    if (attribute === "checked") {
                        if ($(element).attr("id")) {
                            o.setCheck($(element).attr("id"), val);
                        }
                    } else {
                        $(element).attr(attribute, val);
                    }

                }
                else {
                    if (val !== undefined) {
                        $(element).attr(attribute, val);

                        if ($(element).get(0).tagName !== "TR") {

                            if ($(element).attr("type") === "checkbox") {
                                if ($(element).attr("id")) {
                                    o.setCheck($(element).attr("id"), val);
                                }
                            } else {
                                var t = $(element).text();
                                $(element).text(t + val);
                            }
                        }
                    }
                }
            };
        }
        element.children().each(function () {
            if ($(this).attr("id") !== $(o.element).attr("id")) {
                if ($(this).get(0).tagName === "SELECT") {
                    return;
                }
            }
            applyobject($(this), data);
        });
        $(element).show();
    }
    return o;
})();