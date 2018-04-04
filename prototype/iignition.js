/* 
 * iIgnition, Copyright 2017 Lucid Ocean
 * License: MIT see http://www.iignition.com/#!license.html
 * Version 01
 */
"use strict";

//plugin to give object back
jQuery.fn.serializeObject = function () {
    var o = {};
    var a = this.serializeArray();
    if (a.length == 0) {
        if (this.children.length > 0) {
            $i._logToConsole('You have not specified name attributes to the form inputs.');
        }
    }
    jQuery.each(a, function () {

        if (o[this.name] !== undefined) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
        } else {
            o[this.name] = this.value || '';
        }
    });
    return o;
};

var $i = iignition = (function () {

    var controllers = [];
    var onReadyCallbacks = [];
    var onViewChangedCallbacks = [];

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

    $(function () {

        history.replaceState({}, document.title, document.location.hash);

        fireOnReady();

        if (location.hash) {
            $i.show('[data-viewContainer]', location.hash);
        }

        $(window).on('hashchange', function () {
            fireOnViewChanged($i.options.view);
        });
        
    
        $(window).on('popstate', function (event) {
            $i._logToConsole('popstate');
            if (!$i.state.appNavigated) {
                var element = $('[href="' + document.location.hash + '"]');
                var viewPath = document.location.hash.replace('#!', '');

                var evt = new CustomEvent('beforeNavigation', { detail: { element: element, href: viewPath } });
                var ret = window.dispatchEvent(evt);
                href = evt.detail.href;

                if ($i.state.currentViewPath == viewPath || viewPath == '') {
                    history.back(-1);
                }
                else {
                    $i.show('[data-viewContainer]', href);
                }
            }
            history.replaceState({}, '', '');
            $i.state.appNavigated = false;
        });

        $(window).on('onDataSplashed', function (element, href) {
            $i._logToConsole('datasplashed');
            $i.bindLinks();
            _bindForm();

        });
    });

    function _init() {
        if ($i.Cache) {
            $.ajaxSetup({ cache: $i.options.enablecache, preventDoublePosting: true, async: true });
        }
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

        $i.state.lastView = $i.state.currentView;

        $c = $('<div>');
        //var random = Math.random(999,99999);//+'?'+random
        $c.load(view, function (responseText, textStatus, XMLHttpRequest) {

            $i.state.currentViewPath = view;
            view = view.substr(view.lastIndexOf('/') + 1);
            view = view.replace('.html', '');
            view = view.replace('.xml', '');
            $i.state.currentViewName = view;

            $(container).children().remove();
            $c.find('[data-view="' + view + '"]').appendTo($(container));

            $i.state.currentView = $('[data-view="' + view + '"]');

            _animateView();

            if (textStatus === 'success') {
                if (callback)
                    callback(responseText);
            }
        });
    }

    function _show(container, view, data, rowbindcallback, callback) {

        var scriptPath = view.replace('.html', '.js');
        scriptPath = scriptPath.replace('views/', 'viewcontrollers/');
        $.ajaxSetup({
            cache: true
        });
        if (eval('(typeof ' + $i.state.currentViewName + ' === "function")') === false) {

            $.getScript(scriptPath, function () {
                $.ajaxSetup({
                    cache: $i.options.enablecache
                });

                _innerBind()
            });
        } else {
            _innerBind()
        }

        function _innerBind() {
            _nameIds();
            _constructor($i.state.currentViewName, callback, data);

            _bindForm();
            _bindLinks();
        }
    }

    function _nameIds() {
        if ($i.state.currentView) {
            var $items = $i.state.currentView.find('[id]');
            if ($i.state.currentViewName) {
                for (i = 0; i < $items.length; i++) {
                    var id = $items[i].getAttribute('id');
                    $items[i].setAttribute('id', $i.state.currentViewName + '_' + id);
                };
            }
        }
        $i._logToConsole('ids changed');
    }

    function _bindLinks() {

        $('a[href], [data-link]').not('a[target]').off('click');
        $('a[href], [data-link] ').not('a[target]').on('click', function (e) {


            var href = this.getAttribute('href');
            if (href == undefined) {
                href = this.getAttribute('data-link');
            }
            var evt = new CustomEvent('beforeNavigation', { detail: { element: this, href: href } });
            var ret = window.dispatchEvent(evt);
            href = evt.detail.href;

            var data = $(this).data();

            $i.show('[data-viewContainer]', href, data);
            $('.button-collapse').sideNav('hide');

            e.stopPropagation();
            e.preventDefault();

            evt.stopPropagation();
            $i._logToConsole(evt);
        });
    }

    function _bindForm() {
        $('form').not('[data-staticform]').find('input[type=submit],button[type=submit]').bind('click.iignition', _handleSubmit);
    }

    function _handleSubmit(e) {

        var form = this.form;
        var $form = $(form);
        var url = $form.attr('action');

        if ($form.attr('data-submitted') === 'true') {
            e.preventDefault();
            return;
        } else {
            $form.attr('data-submitted', true);
        }

        var $submit = $(this);
        var originalval = $submit.val();

        if ($(form).validate !== undefined) {
            $(form).validate();
            canSubmit = $(form).valid();
        }
        else {
            $i._logToConsole('No validation script found. If you want to use validation, include validation libraries');
            canSubmit = true;
        }
        var data = $(form).serializeObject();

        for (f = 0; f < form.elements.length; f++) {

            field = form.elements[f];
            if (typeof field.willValidate !== 'undefined') {
            }
            else {
                field.validity = field.validity || {};
                field.setCustomValidity(_legacyValidation(field) ? '' : 'error');
            }

            field.checkValidity();

            if (!field.validity.valid) {
                canSubmit = false;

                $form.attr('data-submitted', false);
                _callController($i.state.currentViewName, 'onSubmitError', field.title); 
                return;
            }
        }

        if (canSubmit === false) {
            o.submitting = false;
            return true;
        }

        _callController($i.state.currentViewName, 'onSubmit', data);

        e.preventDefault();
        e.stopImmediatePropagation();
        return true;
    }

    function _legacyValidation(field) {

        var
            valid = true,
            val = field.value,
            type = field.getAttribute('type'),
            chkbox = (type === 'checkbox' || type === 'radio'),
            required = field.getAttribute('required'),
            minlength = field.getAttribute('minlength'),
            maxlength = field.getAttribute('maxlength'),
            pattern = field.getAttribute('pattern');

        // disabled fields should not be validated
        if (field.disabled) return valid;

        // value required?
        valid = valid && (!required ||
            (chkbox && field.checked) ||
            (!chkbox && val !== '')
        );

        // minlength or maxlength set?
        valid = valid && (chkbox || (
            (!minlength || val.length >= minlength) &&
            (!maxlength || val.length <= maxlength)
        ));

        // test pattern
        if (valid && pattern) {
            pattern = new RegExp(pattern);
            valid = pattern.test(val);
        }

        return valid;
    }

    function _callController(view, method, data) {

        controller = _getController(view);
        var ret = false;
        if (controller) {
            if (method) {
                if (controller[method]) {
                    ret = controller[method].call(controller, data);
                }
            }
        }
        return ret;
    }

    function _getController(view, method) {
        if (controllers[view] === undefined) {
            controller = eval('new ' + view + '()');
            controllers[view] = controller;
        }
        return controllers[view];
    }

    function _constructor(view, callback, data) {
        _callController(view, 'onLoad', data);
        if (callback) {
            callback();
        }
    };

    function _deconstructor(view, callback) {
        if (view) {
            _callController(view, 'onUnload');
        }

        if (callback) {
            callback();
        }
    };

    return {
        _logToConsole: function (val) { console.log(val); },
        options: { debug: false, enablecache: false, preventDoublePosting: true },
        state: {},
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

            $('a').css({ 'pointer-events': 'auto' });
        },
        bindLinks: _bindLinks,
        partial: function (container, view, data, rowbindcallback, callback) {
            $container = $(container);
            $container.load(view, function (responseText, textStatus, XMLHttpRequest) {
                $i.bindLinks();
                _bindForm();

                if (callback) {
                    callback();
                }

                var evt = new CustomEvent('onPartialLoaded');
                evt.state = { container: container };
                window.dispatchEvent(evt);
            });
        },
        refresh: function () {
            _callController($i.state.currentViewName, 'onRefresh');
        },
        back: function () {
            
            var back = _callController($i.state.currentViewName, 'onBack');
          
            if (back !== undefined) {
                if (back === false) {
                    history.back();
                    return;
                }
            }
           
            event.preventDefault();
            event.stopPropagation();
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

            if (view == undefined) { $i._logToConsole('No View Specified'); return; };
            view = view.replace('#!', '');
            //if ($i.state.currentViewPath == view) return;

            _deconstructor($i.state.currentViewName);
            var url = document.location.href;
            view = view.replace('#!', '');
            url = url.replace(document.location.hash, view);

            if (view.endsWith('.html') || view.endsWith('.xml')) {
                _load(container, view, function (viewhtml) {
                    _show(container, view, data, rowbindcallback, callback);
                });
            }
            else {
                _show(container, view, data, rowbindcallback, callback);
            }

            if (window['_gaq']) {
                _gaq.push(['_trackPageview', '#!' + view]);
            }

            $i.options.view = view;

            $i.state.appNavigated = true;
            document.location.hash = '#!' + view;

        },
        lock: function () {
            $('a,input,button').attr('disabled', 'disabled');
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
            if (typeof obj === 'object') {
                if (obj !== undefined) {
                    if (obj.Message !== undefined) {
                        if (obj.MessageId) {
                            return true;
                        }
                    }
                }
            }
            return false;
        }
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
            localStorage.removeItem(['iCache_' + key]);
        }
        else {
            if ('localStorage' in window && window['localStorage'] !== null) {
                localStorage.clear();
            }
        }
    };

    o.Data = function (key, data, errorCallback) {
        /// <summary>
        /// Sets/Gets data from the localStorage based on a key.
        /// </summary>
        /// <arg name="key">The key</arg>
        /// <arg name="data">opyional. If not provided, the data is returned for the given key. if the key is provided, the data is inserted into localStorage with the key.</arg>
        /// <returns type=""></returns>

        function onError(err) {
            if (errorCallback)
                errorCallback(err);
        }

        if ('localStorage' in window && window['localStorage'] !== null) {

            try {
                if (data) {
                    localStorage['iCache_' + key] = JSON.stringify(data);
                }
                else {
                    if (localStorage['iCache_' + key]) {
                        return JSON.parse(localStorage['iCache_' + key]);
                    } else {
                        return undefined;
                    }
                }
            } catch (e) {
                onError(e);
            }

            return true;
        }

        return false;
    };

    return o;
})();



$i.Data = (function () {
    var o = {};

    o.getData = function (url, data, successCallback, errorCallback, beforeSendCallback) {
        /// <summary>
        /// Uses jQuery.ajax to make data calls. Expects JSON
        /// </summary>
        /// <arg name="url">The URL to JSON. prefixing the URL with cache: will attempt to load the JSON from cache if it is available.</arg>
        /// <arg name="data">Post Variables. If not defined, a HTTP GET is issued </arg>
        /// <arg name="successCallback">callback once data is successfully returned</arg>
        /// <arg name="errorCallback">callback if error on attempt to retrieve data</arg>
        /// <returns type="">the JSON</returns>

        //load from cache -this needs to be tightened up, but getData should read cache:DATAKEY and get the data as below        

        var s = url.split('cache:');
        var d = $i.Cache.Data(s[1]);

        if (url.indexOf('cache:') >= 0) {

            if ($i.Cache && $i.options.enablecache == true) {

                // var d = $i.Cache.Data(s[1]);
                $i._logToConsole('loading cache: ' + s[1]);

                if (d) {
                    if (successCallback)
                        successCallback(d);
                    url = s[1];
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
            var error = $('[data-error]');
            error.hide();
            
            if ($i.options.enablecache == true) {
                $i.Cache.Data(url, data, function (err) {
                    if (err.code == 22) {
                        console.log(data.length);
                        console.log(data);
                        var user = $i.Cache.Data('arthurUser');
                        var theme = $i.Cache.Data('theme');
                        var account = $i.Cache.Data('accountDetails');

                        localStorage.clear();

                        $i.Cache.Data('arthurUser', user);
                        $i.Cache.Data('theme', theme);
                        $i.Cache.Data('accountDetails', account);
                    }
                });             
            }

            if (d) {
                return;
            }
            
            if ($i.options.enablecache == false || d === undefined) {
                if (successCallback)
                    successCallback(data);
            }
        }

        function onError(xhr, status, error) {
            if (status === 'timeout') {
                // var ret = confirm("Timeout out occurred when trying to retrieve data. Would you like to retry?");
                // _logToConsole(ret);
                // if (ret === true) {
                //     o.getData(url, data, successCallback, errorCallback, fullmsg);
                //     return;
                // }                    
            }

            if (errorCallback)
                errorCallback(xhr, xhr.statusText, url);
        }

        function onBeforeSend(xhr) {

            if (beforeSendCallback) {
                beforeSendCallback(xhr);
            }
        }

        var httptype = 'get';
        var contentType = 'text/javascript';
        var jsonp = true;

        var dataType = 'jsonp';
        if (url.endsWith('.json')) {
            dataType = 'json';
            contentType = 'application/json';
            jsonp = false;
        }
        if (data) {
            if (data.DataUrl)
                data.DataUrl = '';
            if (data.ModelData)
                data.ModelData = '';
        }

        var processData = true;
        var hasFiles = false;
        var files = null;
        if (data) {
            httptype = 'post';
            contentType = 'application/json';

            if (data.viewName) {
                if ($('#' + data.ViewName + ' input:file').length > 0) {
                    hasFiles = true;
                    $('#' + data.ViewName + ' input:file')[0].files;
                }
            } else {
                // TODO:: Need to refactor
                if ($('[data-file]').length > 0) {
                    hasFiles = true;
                    files = [];
                }
                // END

                if ($('input:file').length > 0) {
                    files = $('input:file')[0].files;
                    if (files.length > 0) {
                        hasFiles = true;
                    }
                }

                if (data.file) {
                    hasFiles = true;
                }

            }
        }

        if (hasFiles === true) {
            contentType = false;
            // contentType = "multipart/form-data";
            // contentType = "application/x-www-form-urlencoded";
            var formData = new FormData();
            processData = false;

            $.each(files, function (
                key,
                value) {
                formData.append('file', value);
            });

            // TODO:: Need to refactor
            $.each(data, function (
                key,
                value) {
                if (value.includes('base64')) {
                    var file = base64toblob(value);
                    formData.append("file", file, 'uploadedimage.jpg')

                } else {
                    formData.append(key, value);
                }
            });
            // END

        } else {
            if (_isJSON(data)) {
                dataType = 'json'
                formData = JSON.stringify(data);
                contentType = 'application/json';
            }
            else {
                dataType = 'json';
                contentType = 'application/x-www-form-urlencoded';
                formData = data
            }
        }
        // TODO:: Need to refactor
        if (url.includes('PUT:')) {
            httptype = 'PUT';
            url = url.replace('PUT:', '');
        }
        // END

        $.ajax({
            url: url,
            data: formData,
            type: httptype,
            dataType: dataType,
            success: onSuccess,
            error: onError,
            timeout: 1000 * 60, //1 minute
            cache: $i.options.enablecache,
            contentType: contentType,
            processData: processData,
            beforeSend: onBeforeSend
        });
    };

    // TODO:: Need to refactor
    function _isJSON(data) {
        var ret = true;
        try {
            if (typeof data === 'object') {
                data = JSON.stringify(data);
                JSON.parse(data);
            }
            else {
                ret = false;
            }
        } catch (e) {
            ret = false;
        }
        return ret;
    }

    /* this converts base64 into a binary blob to send via the ajax to the server */
    function base64toblob(dataURI) {
        var binary = atob(dataURI.split(',')[1]);
        var array = [];
        for (var i = 0; i < binary.length; i++) {
            array.push(binary.charCodeAt(i));
        }
        return new Blob([new Uint8Array(array)], { type: 'image/jpeg' });
    }
    // END

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
            $i._logToConsole('data is undefined. Splash aborted');
            return;
        }

        var datac = $.extend(true, {}, data);
        o.element = element;
        expandTemplate(element, datac);
        applyTemplate(element, datac, rowbindcallback, options);

        if (callback) {
            callback(element, data);
        }

        var evt = new CustomEvent('onDataSplashed');
        evt.state = { element: element };
        window.dispatchEvent(evt);
    };

    o.setSelected = function (select, value) {
        $(select).val(value);
    };

    o.setRadio = function (radio, value) {
        $('input:radio#' + value).prop('checked', true);
    };

    o.setCheck = function (checkbox, value) {
        if (value) {
            if (value === 1 || value === '1' || value.toString().toLowerCase() === 'true') {
                $('input:checkbox#' + checkbox).attr('checked', 'checked');
                $('input:checkbox#' + checkbox).val('on');
            } else {
                $('input:checkbox#' + checkbox).removeAttr('checked');
                $('input:checkbox#' + checkbox).val('off');
            }
        }

        $('input:checkbox#' + checkbox).unbind('click');
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
        var dontClone = false;
        var origElement = $(element);
        var elementName = origElement.attr('id');
        if (options && (options.append === true)) {
        }
        else {
            $(element).find('[data-templateclone]').not('[data-splashx]').remove();
        }

        $template = $(element).find('[data-splashtemplate]');

        // splashtemplate not found        
        // if ($template.get(0) == undefined) {
        //     _logToConsole("[data-splashtemplate] was not found, nothing to splash");
        //     return;
        // }

        if ($template.length === 0) {
            $template = $(element).filter('[data-splashtemplate="' + elementName + '"]');

            if ($template.length === 0) {

                $template = null;
                $template = origElement;
                dontClone = true;
            }
        }

        $cloneparent = $template.parent();
        if (origElement.length == 0 && $template.length == 0) {
            return;
        }

        if (origElement.get(0).tagName === 'FORM') {
            //$cloneparent = $template.parents("[data-form]");
            $cloneparent = $template;
            dontClone = true;
        }
        else if ($template.length > 0) {

            if ($template.get(0).tagName === 'TR') {
                $cloneparent = $template.parents('tbody');
                if ($cloneparent.length === 0) {
                    $cloneparent = $template.parents('table');
                }
            }
            else if ($template.get(0).tagName === 'DIV') {
                $cloneparent = $template.parent('div');
            }
        }



        if (!$i.isMsg(data)) {

            var shouldRun = $i.length(data) > 0;
            shouldRun = options === undefined ? shouldRun : options.append === true;

            shouldRun = options === undefined ? shouldRun : options.action !== 'edit';
            if (shouldRun) {
                var splashTemplate = $template.first();

                for (var d in data) {
                    if ($(splashTemplate).parent().attr('id') !== $(o.element).attr('id')) {
                        if ($(splashTemplate).get(0).tagName === 'OPTION') {
                            continue;
                        }
                    }
                    var elementClone;

                    if (dontClone) {
                        elementClone = $(element);
                    }
                    else {
                        elementClone = $(splashTemplate).clone();
                        $cloneparent.append($(elementClone));
                        $(elementClone).attr('data-templateclone', 'true');
                    }


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
                if (dontClone === false) {
                    $(splashTemplate).hide();
                }

                if (options) {
                    if (options.action == 'edit') {
                        if ($template.parents('[data-form]')) {
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
        var $splashx = $(element).find('[data-splashx]');
        if ($splashx.length > 0) {
            $splashx.each(function () {
                var atts = $(this).attr('data-splashx');
                atts = atts.split('=');
                var name = '';
                if (atts.length === 2) {
                    name = atts[1];

                }

                _selectedValue = $(this).attr('value');
                if (_selectedValue === data[name]) {
                    $(this).attr('selected', 'selected');
                }
            });

            $splashx.removeAttr('data-splashx');
            $splashx.removeAttr('data-splash');
        }
    }

    function expandTemplate(element, data) {

        $(element).find('*[data-splashscaffold]').each(function () {

            var elements = new Array();
            var $elementClone = "";
            $(this).find("*[data-splash^='\\[']").each(function () {
                $elementClone = $(this);
                var splashvalue = $(this).attr('data-splash').replace('[]', '');
                for (var d in data) {
                    if (data.length > 0) {
                        for (var col in data) {
                            for (var obj in data[col]) {
                                var $newtag = $elementClone.clone();

                                $newtag.attr('data-splash', obj + splashvalue);
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
    };

    function applyobject(element, data) {
        var atts = $(element).data('splash');
        var _selectedValue = -1;
        if (atts) {
            atts = atts.split(',');

            for (var att in atts) {
                var name = atts[att].replace(/^\s+|\s+$/g, '');
                var fieldName = name;
                var attribute = 'data-';
                var namepair = [];

                if (name.indexOf('=') > -1) {
                    namepair = name.split('=');
                    name = namepair[1];
                    attribute = namepair[0];
                }
                else {
                    attribute += name.replace(' ', '_');
                }

                var val = undefined;

                if (name.startsWith('field:')) {
                    name = name.replace('field:', '');
                }

                var namespaces = name.split('.');
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
                    if (attribute === 'value') {
                        if (val) {
                            _selectedValue = data[name];
                        }
                    }
                    if (attribute === 'checked') {
                        if ($(element).attr('id')) {
                            o.setCheck($(element).attr('id'), val);
                        }
                    } else {
                        //TODO: do we need to append what is already there?
                        //in cases of class - perhaps
                        var orig = $(element).attr(attribute) || '';
                        if (attribute !== 'value') {
                            val = orig + val;
                        }
                        $(element).attr(attribute, val)

                    }

                }
                else {
                    if (val !== undefined) {
                        var orig = $(element).attr(attribute) || '';
                        $(element).attr(attribute, val);

                        if ($(element).get(0).tagName !== 'TR') {

                            if ($(element).attr('type') === 'checkbox') {
                                if ($(element).attr('id')) {
                                    o.setCheck($(element).attr('id'), val);
                                }
                            } else {

                                if (fieldName.startsWith('field:')) {
                                    $(element).text(name);
                                }
                                else {
                                    var t = $(element).text();
                                    $(element).get(0).innerHTML = val;
                                }
                            }
                        }
                    }
                }
            };
        }
        element.children().each(function () {
            if ($(this).attr('id') !== $(o.element).attr('id')) {
                if ($(this).get(0).tagName === 'SELECT') {
                    return;
                }
            }
            applyobject($(this), data);
        });
        $(element).show();
    }
    return o;
})();
