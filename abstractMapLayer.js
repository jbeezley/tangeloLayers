/*jslint browser: true, unparam: true*/

(function (tangelo, $) {
    'use strict';

    if (!($ && $.widget)) {
        tangelo.AbstractMapLayer = tangelo.unavailable({
            plugin: "AbstractMapLayer",
            required: ["JQuery", "JQuery UI"]
        });
        return;
    }
    
    // A function that throws an error when called.
    // This is a placeholder for methods that should
    // be defined by inherited classes.
    function abstractFunction () {
        tangelo.fatalError('AbstractMapLayer', 'Unimplemented abstract method called');
    }
    
    // an abstract representation of a position on the map
    // contains both pixel and gis coordinates with callbacks
    // for reprojecting... in the future, maybe add a means for
    // automatic reprojection based on map events
    function Position () {
        this.x = abstractFunction;
        this.y = abstractFunction;
        this.lat = abstractFunction;
        this.lng = abstractFunction;
        this.reproject = abstractFunction;
        this.toString = function () {
            return 'Point(' + [this.x(), this.y()].join() + '), LatLng(' + [this.lng(), this.lat()].join() + ')';
        };
    }
    
    // class generators for nested Position classes
    function pointGenerator (mapObject) {

        // a position which is tied to a pixel on the screen
        function Point(x, y) {
            var latLng;
            this.x = function () { return x; };
            this.y = function () { return y; };
            this.lat = function () { return latLng[0]; };
            this.lng = function () { return latLng[1]; };
            this.reproject = function () {
                latLng = mapObject.pointToLatLng(x, y);
                return this;
            };
            this.reproject();
        }
        Point.prototype = new Position();
        return Point;
    }

    function latLngGenerator(mapObject) {

        // a position which is tied to a point on the map
        function LatLng(lat, lng) {
            var point;
            this.lat = function () { return lat; };
            this.lng = function () { return lng; };
            this.x = function () { return point[0]; };
            this.y = function () { return point[1]; };
            this.reproject = function () {
                point = mapObject.latLngToPoint(lat, lng);
                return this;
            };
            this.reproject();
        }
        LatLng.prototype = new Position();
        return LatLng;
    }
    
        function latLngBoundsGenerator() {
            // represents a rectangle on the screen, the way it is 
            // implemented the bounds of the map can returned by
            //
            // bds = new LatLngBounds( new Point(0, height), new Point(width, 0) );
            //
            // the gis coordinates can then be updated with bds.reproject()
            // on drags and zooms

            return function (southWest, northEast) {
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
        }

    // An abstract class defining a mapping layer interface
    tangelo.widget("tangelo._abstractMap", {
        
        // default map options
        options: {
            center: { latitude: 0, longitude: 0 },
            zoom: 2,
            // map type, projection, etc...
        },
        
        // constructor
        _create: function () {
            this.Point = pointGenerator(this);
            this.LatLng = latLngGenerator(this);
            this.LatLngBounds = latLngBoundsGenerator(this);
        },
            
        // methods to be implemented by inherited classes
        
        // Returns a pixel location from latitude/longitude:
        //   function (latitude, longitude) { ...; return [x, y]; }
        pointToLatLng: abstractFunction,

        // Returns a latitude/longitude from pixel coordinates
        //   function (x, y) { ...; return [latitude, longitude]; }
        latLngToPoint: abstractFunction,
        
        // Returns a LatLngBounds object representing the current map extent
        //   function () { ...; return new LatLngBounds(...); }
        // note: could be implemented here with callbacks for x/y offsets 
        //       and width/height of map
        bounds: abstractFunction,
        
        // For the following, svg/canvas layers need to come from the map
        // in order to properly handle mouse events.
        //   function (options) { ... return div; }
        //     options.moving: layer drags with the map [default: true]
        getInnerDiv: abstractFunction,

        // Subclasses must also trigger the following events when appropriate
        //
        //   load
        //   zoom
        //   drag
        //   ...   more? (start/end transition events, bounds_changed)...
        
        // Allows layers to query whether a drag event is occuring.
        //   return true, if dragging
        //   return false, if not dragging
        dragging: abstractFunction,

        // Returns true if the map is loaded and ready for interaction
        loaded: abstractFunction,

        // Pans the map to be centered at the indicated location
        // takes a this.LatLng object as an argument
        setCenter: abstractFunction,

        // Returns the coordinates of the center of the map as a
        // this.LatLng object.
        getCenter: abstractFunction,

        // Zooms the map to the indicated zoom level
        // takes an integer as input... the zoom level will be
        // truncated to the nearest valid zoom level
        setZoom: abstractFunction,

        // Returns the current zoom level of the map
        getZoom: abstractFunction,
    });

}(window.tangelo, window.$));
