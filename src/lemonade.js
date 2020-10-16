/**
 * lemonadejs v1.0.2
 *
 * Author: Paul Hodel <paul.hodel@gmail.com>
 * Website: https://bossanova.uk/lemonadejs/
 * Description: Create amazing web based reusable components.
 *
 * This software is distribute under MIT License
 */

;(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    global.lemonade = factory();
}(this, (function () {

    'use strict';

    var lemonadejs = {};

    lemonadejs.render = function(o, el, self) {
        if (! (el instanceof Element || el instanceof HTMLDocument)) {
            console.log('DOM element given is not valid')
            return false;
        }

        if (! self) {
            self = {};
        }

        if (o instanceof Element || o instanceof HTMLDocument) {
            el.appendChild(o);
        } else {
            if (lemonadejs.isClass(o)) {
                var o = new o();
                el.appendChild(o.create());
            } else {
                el.appendChild(o(self));
            }
        }

        if (self && self.queue) {
            for (var i = 0; i < self.queue.length; i++) {
                self.queue[i].onload();
            }
        }

        return o;
    }

    lemonadejs.element = (function() {
        /**
         * Create a new component
         * @param html - template
         * @param s - self component object
         */
        var obj = function(html, s) {
            // Self
            var self = s ? s : {};
            // Create only if is a new self
            if (! self.state) {
                self.state = {};
            }
            if (! self.tracking) {
                self.tracking = {};
            }
            // Queue
            self.queue = [];

            // Create the root element
            var div = document.createElement('div');

            // Get the DOM content
            div.innerHTML = html.trim();

            // Already single DOM, do not need a container
            if (div.children.length == 1) {
                div = div.children[0];
            }

            // Parse the content
            parse(div.children.length > 1 ? div : div.children[0], self);

            return div;
        }

        /**
         * Bind an property to one action and start tracking
         */
        var bind = function(property, self) {
            // If exists get the current value
            var tmp = self[property] || '';

            // Refresh
            var refreshProperty = function() {
                // Tracking
                if (self.tracking[property]) {
                    for (var i = 0; i < self.tracking[property].length; i++) {
                        var value = eval(self.tracking[property][i].v);
                        if (self.tracking[property][i].property == 'html') {
                            self.tracking[property][i].element.innerHTML = value;
                        } else if (self.tracking[property][i].property == 'textContent') {
                            self.tracking[property][i].element.textContent = value;
                        } else if (self.tracking[property][i].property == 'value') {
                            if (typeof(self.tracking[property][i].element.change) == 'function') {
                                if (self.tracking[property][i].element.value != value) {
                                    self.tracking[property][i].element.change(value);
                                }
                            } else {
                                self.tracking[property][i].element.value = value;
                            }
                        } else if (self.tracking[property][i].property == 'checked') {
                            if (self.tracking[property][i].element.type == 'radio') {
                                self.tracking[property][i].element.checked = false;
                                if (self.tracking[property][i].element.value == value) {
                                    self.tracking[property][i].element.checked = true;
                                }
                            } else {
                                self.tracking[property][i].element.checked = value ? true : false;
                            }
                        } else {
                            self.tracking[property][i].element.setAttribute(self.tracking[property][i].property, value);
                        }
                    }
                }
            }

            // Save as state
            if (Array.isArray(self[property])) {
                Array.prototype.refresh = refreshProperty;
            } else {
                Object.defineProperty(self, property, {
                    set: function(val) {
                        // Update val
                        self.state[property] = val;
                        // Refresh binded elements
                        refreshProperty(val);
                    },
                    get: function() {
                        // Get value
                        return self.state[property];
                    }
                });
            }

            // Set valuke
            self[property] = tmp;

            // Create tracking container for the property
            self.tracking[property] = [];
        }

        var create = function(element, res, type, self) {
            var tokens = res.v.match(/self\.([a-zA-Z0-9_].*?)*/g);
            if (tokens.length) {
                // Value
                var value = eval(res.v);
                // Create text node
                if (type == 'textContent') {
                    var e = document.createTextNode(value);
                    if (element.childNodes[0]) {
                        element.insertBefore(e, element.childNodes[0].splitText(res.p));
                    } else {
                        element.appendChild(e);
                    }
                } else {
                    if (typeof(element[type]) !== 'undefined') {
                        e = element;
                        e[type] = value;
                    }
                }

                if (! e) {
                    return;
                }

                for (var i = 0; i < tokens.length; i++) {
                    // Get property name
                    var token = tokens[i].replace('self.', '');

                    if (! self.tracking[token]) {
                        // Create tracker
                        bind(token, self);
                    }

                    // Add to the tracking
                    self.tracking[token].push({
                        element: e,
                        property: type,
                        v: res.v
                    });
                }
            }
        }

        var attributes = function(element, attr, type, self) {
            // Content
            var result = [];
            var index = 0;

            if (element.getAttribute && element.getAttribute(type)) {
                element.setAttribute(type, element.getAttribute(type).replace(/\{\{(.*?)\}\}/g, function (a,b,c,d) {
                    result.push({ p: c - index, v: b });
                    index = index + a.length;
                    return '';
                }));
            } else {
                if (typeof(element[type]) == 'string') {
                    element[type] = element[type].replace(/\{\{(.*?)\}\}/g, function (a,b,c,d) {
                        result.push({ p: c - index, v: b });
                        index = index + a.length;
                        return '';
                    });
                }
            }

            if (result.length) {
                for (var i = result.length - 1; i >= 0; i--) {
                    create(element, result[i], type, self);
                }
            }
        }

        var parse = function(element, self) {
            // Attributes
            var attr = {};

            if (element.attributes.length) {
                for (var i = 0; i < element.attributes.length; i++) {
                    attr[element.attributes[i].name] = element.attributes[i].value;
                }
            }

            // Keys
            var k = Object.keys(attr);

            if (k.length) {
                for (var i = 0; i < k.length; i++) {
                    // Parse events
                    if (k[i].substring(0,2) == 'on') {
                        // Get event
                        var event = k[i].toLowerCase();
                        var value = attr[k[i]];

                        // Get action
                        element.removeAttribute(event);
                        if (! element.events) {
                            element.events = []
                        }
                        element.events[event.substring(2)] = value;
                        element[event] = function(e) {
                            eval(this.events[e.type]);
                        }
                        // Other properties
                    } else {
                        // Events
                        if (! element.events) {
                            element.events = []
                        }
                        if (k[i] == '@ready') {
                            self.queue.push(element);
                            element.events.load = attr[k[i]];
                            element.onload = function(e) {
                                eval(this.events.load);
                            }
                            // Remove attribute
                            element.removeAttribute(k[i]);
                        } else if (k[i] == '@ref') {
                            eval(attr[k[i]] + ' = element');
                            // Remove attribute
                            element.removeAttribute(k[i]);
                        } else if (k[i] == '@bind') {
                            // Onchange event for the element
                            element.onchange = function(e) {
                                eval(this.events.change);
                            }
                            // Based on the element
                            if (element.type == 'checkbox') {
                                element.events.change = attr[k[i]] + ' = this.checked';
                                var property = 'checked';
                            } else if (element.type == 'radio') {
                                element.events.change = attr[k[i]] + ' = this.value;';
                                var property = 'checked';
                            } else {
                                // TODO: multiple select
                                element.events.change = attr[k[i]] + ' = this.value';
                                var property = 'value';
                            }
                            // Way back
                            create(element, { p:0, v:attr[k[i]] }, property, self);
                            // Remove attribute
                            element.removeAttribute(k[i]);
                        } else {
                            attributes(element, attr[k[i]], k[i], self);
                        }
                    }
                }
            }

            // Check the children
            if (element.children.length) {
                for (var i = 0; i < element.children.length; i++) {
                    parse(element.children[i], self);
                }
            } else {
                attributes(element, 'innerText', 'textContent', self);
            }

            // Create instances
            if (element.constructor == HTMLUnknownElement) {
                var m = element.tagName;
                m = m.charAt(0).toUpperCase() + m.slice(1).toLowerCase();
                m = eval(m);
                if (typeof(m) == 'function') {
                    if (element.getAttribute('extended') == 'true') {
                        var e = self;
                    } else {
                        var e = {};
                    }

                    for (var i = 0; i < element.attributes.length; i++) {
                        e[element.attributes[i].name] = element.attributes[i].value;
                    }
                    if (lemonadejs.isClass(m)) {
                        var instance = new m();
                        element.appendChild(instance.create());
                    } else {
                        element.appendChild(m(e));
                    }
                }
            }
        }

        return obj;
    })();

    lemonadejs.isClass = function(func) {
        return typeof func === 'function' && /^class\s/.test(Function.prototype.toString.call(func));
    }

    lemonadejs.component = class {
        constructor() {
        }

        create() {
            var element = lemonadejs.element(this.render(), this);

            if (typeof(this.onload) == 'function') {
                this.onload(element, this);
            }

            return element;
        }
    }

    return lemonadejs;
})));