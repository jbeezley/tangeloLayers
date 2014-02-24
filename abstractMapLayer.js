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
        
        var layers = {}; // all existing internal layers
        
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
    };

}(window.tangelo, window.$));
