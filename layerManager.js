/*jslint browser: true, unparam: true*/

(function (tangelo, $) {
    'use strict';

    if ( !$ ) {
        tangelo.LayerManager = tangelo.unavailable({
            plugin: "LayerManager",
            required: ["JQuery"]
        });
        return;
    }
    
    
    function attachEvents(layer, events) {

        // attach all events (if present) to a new layer
        var eventType;
        layer.handlers = layer.handlers || {};
        for (eventType in events) {
            if (events.hasOwnProperty(eventType)) {
                events[eventType].on(layer.handlers[eventType]);
            }
        }

        // attach triggers from the layer to automatically trigger events
        layer.attachEvents(events);
    }

    // create a new layer manager inside the given dom element
    tangelo.LayerManager = function (element) {
        
        // private variables
        var events, layers, div, id, dragging;
        
        // generate a unique id
        id = 'layerManager-' + tangelo.uniqueID();

        // create a div inside the DOM element where the layers 
        // will be inserted
        div = $(document.createElement('div'))
                    .attr('id', id)
                    .attr('class', 'layarManager');
        $(element).append(div);

        div.width('100%');
        div.height('100%');

        // events handled by the layer manager
        // and propagated to individual layers
        events = {
            draw: new this.Event(),
            zoom: new this.Event(),
            idle: new this.Event(),
            drag: new this.Event(),
            dragstart: new this.Event(),
            dragend: new this.Event(),
            mouseenter: new this.Event(),
            mouseleave: new this.Event(),
            mousemove: new this.Event(),
            mousedown: new this.Event(),
            mouseup: new this.Event()
        };

        layers = {};

        // attach jquery events
        dragging = false;
        div.mousedown(function (evt) {
            events.mousedown.trigger(evt);
        });
        div.mouseup(function (evt) {
            events.mouseup.trigger(evt);
        });
        div.mouseenter(function (evt) {
            events.mouseenter.trigger(evt);
        });
        div.mouseleave(function (evt) {
            events.mouseleave.trigger(evt);
        });
        div.mousemove(function (evt) {
            events.mousemove.trigger(evt);
        });
        div.mousedown(function (evt) {
            dragging = [ evt.pageX, evt.pageY ];
            events.dragstart.trigger(evt);
        });
        div.mouseup(function (evt) {
            dragging = false;
            events.dragend.trigger(evt);
        });
        div.mousemove(function (evt) {
            var x = evt.pageX - dragging[0],
                y = evt.pageY - dragging[1];
            if (dragging) {
                evt.delta = { x: x, y: y };
                events.drag.trigger(evt);
            }
        });

        // register a new layer with the manager and attach events
        this.addLayer =  function (name, LayerClass, options) {
            if (layers.hasOwnProperty(name)) {
                throw new Error('A layer named ' + name + ' already exists');
            }
            
            var layerDiv, layer;
            
            // create a div for the layer
            layerDiv = $(document.createElement('div'))
                            .attr('class', 'layer')
                            .css('pointer-events', 'none');
            div.append(layerDiv);

            // set div size and position so that all layers overlap
            layerDiv.css('position', 'absolute');
            layerDiv.css(div.offset());
            layerDiv.width(div.width());
            layerDiv.height(div.height());
            
            // create the layer object
            layer = new LayerClass(layerDiv[0], options);

            layers[name] = layer;
            attachEvents(layer, events);

            return layer;
        };
        
        // return a managed layer by name
        this.getLayer = function (name) {
            return layers[name];
        };

        // return an event object
        this.getEvent = function (eventType) {
            return events[eventType];
        };
        
        // create a new event category
        this.addEvent = function (eventType, eventObj) {
            if (events.hasOwnProperty(eventType)) {
                throw new Error('An event named ' + eventType + ' already exists');
            }
            eventObj = eventObj || new this.Event();
            events[eventType] = eventObj;
            
            return eventObj;
        };
        
        // manually trigger an event
        this.trigger = function (eventType) {
            events[eventType].trigger();
        };
    };


    // class for events
    tangelo.LayerManager.prototype.Event = function (options) {
        var callbacks = [],
            callbackOnce = [];
        
        this.on = function (handler) {
            if (handler) {
                callbacks.push(handler);
            }
        };

        this.onceOn = function (handler) {
            if (handler) {
                callbackOnce.push(handler);
            }
        };

        this.trigger = function (evt) {
            callbacks.forEach(function (c) {
                c(evt); // add event information to argments
            });
            callbackOnce.forEach(function (c) {
                c(evt); // add event information to argments
            });
            callbackOnce = [];
        };
    };
    
}(window.tangelo, window.$));
