/*jslint browser: true, unparam: true*/

(function (tangelo, $) {
    'use strict';

    if (!$) {
        tangelo.AbstractMapLayer = tangelo.unavailable({
            plugin: "AbstractMapLayer",
            required: ["JQuery"]
        });
        return;
    }
    
    function abstractFunction () {
        tangelo.fatalError('AbstractMapLayer', 'Unimplemented abstract method called');
    }

    // An abstract class defining a mapping layer interface
    tangelo.AbstractMapLayer = function () {
        
        var layers = {}, // all existing internal layers
            events = {}; // all events
        
        // an abstract representation of a position on the map
        // contains both pixel and gis coordinates with callbacks
        // for reprojecting... in the future, maybe add a means for
        // automatic reprojection based on map events
        this.Position = function () {
            this.x = abstractFunction;
            this.y = abstractFunction;
            this.lat = abstractFunction;
            this.lng = abstractFunction;
            this.reproject = abstractFunction;
            this.toString = function () {
                return 'Point(' + [this.x(), this.y()].join() + '), LatLng(' + [this.lng(), this.lat()].join() + ')';
            };
        };
        
        // a position which is tied to a pixel on the screen
        this.Point = function (x, y) {
            var latLng;
            this.x = function () { return x; };
            this.y = function () { return y; };
            this.lat = function () { return latLng[0]; };
            this.lng = function () { return latLng[1]; };
            this.reproject = function () {
                latLng = this.pointToLatLng(x, y);
                return this;
            };
            this.reproject();
        };
        this.Point.prototype = new this.Position();
        
        // a position which is tied to a point on the map
        this.LatLng = function (lat, lng) {
            var point;
            this.lat = function () { return lat; };
            this.lng = function () { return lng; };
            this.x = function () { return point[0]; };
            this.y = function () { return point[1]; };
            this.reproject = function () {
                point = this.latLngToPoint(lat, lng);
                return this;
            };
            this.reproject();
        };
        this.LatLng.prototype = new this.Position();
        
        // represents a rectangle on the screen, the way it is 
        // implemented the bounds of the map can returned by
        //
        // bds = new LatLngBounds( new Point(0, height), new Point(width, 0) );
        //
        // the gis coordinates can then be updated with bds.reproject()
        // on drags and zooms
        this.LatLngBounds = function (southWest, northEast) {
            this.southWest = function () { return southWest; };
            this.northEast = function () { return northEast; };
            this.reproject = function () {
                southWest.reproject();
                northEast.reproject();
                return this;
            };
            this.reproject();

            // other methods?
            // this are largely implemented by both google maps and openlayers
            this.contains = abstractFunction;
            this.extend = abstractFunction;
            this.getCenter = abstractFunction;
            this.intersects = abstractFunction;
            this.union = abstractFunction;
        };

        // event handling infrastructure exposed to allow the possibility to 
        // register new events inside individual layers
        this.Event = function (name) {
            var callbacks = $.Callbacks(),  // call backs are registered here
                evt = this;
            
            this.addCallback = function (f) {
                callbacks.add(f);
                return evt;
            };

            this.trigger = function (context, args) {
                callbacks.fireWith(context, [args]);
                return evt;
            };

            this.removeCallback = function (f) {
                callbacks.remove(f);
                return evt;
            };

        };

        // add standard events
        events = {
            drag: new this.Event('drag'), // fired continually during drag events
            zoom: new this.Event('zoom'), // fired on zoom out/in
            load: new this.Event('load')  // fired once, when the map is finished loading
        };

        // add a getter for events
        this.getEvent = function (eventType) {
            return events[eventType];
        };

        // standard mechanism for attaching callbacks to events
        //   eventType: the named event from the events object
        //   f: function to call
        this.on = function (eventType, f) {
            if (!events.hasOwnProperty(eventType)) {
                tangelo.fatalError('abstractMapLayer.on', 'Unknown eventType');
            }
            events[eventType].addCallback(f);
            return this;
        };

        // Create a new div element for a layer inside the map
        // Possibly add options to control creation of the div like z-index, etc.
        this.addLayer = function (name, options) {
            if (layers.hasOwnProperty(name)) {
                tangelo.fatalError('Trying to add a layer with a name that already exists');
            }
            layers[name] = this.getInnerDiv();
            return layers[name];
        };
        
        // Return a named layer
        this.layers = function (name) {
            return layers[name];
        };


        // methods to be implemented by inherited classes
        
        // Returns a pixel location from latitude/longitude:
        //   function (latitude, longitude) { ...; return [x, y]; }
        this.pointToLatLng = abstractFunction;

        // Returns a latitude/longitude from pixel coordinates
        //   function (x, y) { ...; return [latitude, longitude]; }
        this.latLngToPoint = abstractFunction;
        
        // Returns a LatLngBounds object representing the current map extent
        //   function () { ...; return new LatLngBounds(...); }
        // note: could be implemented here with callbacks for x/y offsets 
        //       and width/height of map
        this.bounds = abstractFunction;
        
        // For the following, svg/canvas layers need to come from the map
        // in order to properly handle mouse events.
        //   function () { ... return div; }
        this.getInnerDiv = abstractFunction;

        // Subclasses must also trigger the following events, with the
        // specified call signature:
        //
        //   load:  this.events.load.trigger(this, f)
        //      function f() { {load: true} }
        //
        //   zoom:  this.events.zoom.trigger(this, f)
        //      function f( {zoom: true, oldZoom: x, newZoom: y} )
        //          zoom factors are given as magnification factors from 
        //          the default map, so 2x zoomed in would be 2,
        //          2x zoomed out would be 0.5
        //
        //   drag:  this.events.drag.trigger(this, f)
        //      function f( {drag: true, mouseStart: Position, mouseNow: Position,
        //                   dragDelta: [dx, dy]} )
        //          gives the position at the start of the drag and the 
        //          current mouse position, dragDelta gives the number of pixels
        //          the map has moved during the drag
        
        // Allows layers to query whether a drag event is occuring.
        //   return true, if dragging
        //   return false, if not dragging
        this.dragging = abstractFunction;
    };

}(window.tangelo, window.$));
