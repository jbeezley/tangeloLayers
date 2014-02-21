/*jslint browser: true, unparam: true*/

(function (tangelo, $, google) {
    'use strict';

    if (!($ && google)) {
        tangelo.GoogleMapLayer = tangelo.unavailable({
            plugin: "GoogleMapLayer",
            required: ["JQuery", "Google Maps API"]
        });
        return;
    }

    tangelo.GoogleMapLayer = function (elem, options) {
        // create a google map inside `elem`
        var map, that, mapOpts;
        

        // translate options into mapOpts for google interface
        that = this;
        
        mapOpts = {};
        map = new google.maps.Map(elem, options);
        this.handlers = {
            dragstart: function (evt) {
                google.maps.event.trigger(map, 'dragstart', evt);
            },
            dragend: function (evt) {
                google.maps.event.trigger(map, 'dragend', evt);
            },
            drag: function (evt) {
                // need to save center a dragstart and use panTo
                //   -- or --
                // incrementally calculate pixels and use panBy
                google.maps.event.trigger(map, 'drag', evt);
                map.panBy(-evt.delta.x, -evt.delta.y);
            }
            /*
            mouseenter: function (evt) {
                console.log('mouseenter');
                google.maps.event.trigger(map, 'mouseenter', evt);
            },
            mousedown: function (evt) {
                console.log('mousedown');
                google.maps.event.trigger(map, 'mousedown', evt);
            },
            mouseup: function (evt) {
                console.log('mouseup');
                google.maps.event.trigger(map, 'mouseup', evt);
            },
            mousemove: function (evt) {
                console.log('mousemove');
                google.maps.event.trigger(map, 'mousemove', evt);
            },
            mouseleave: function (evt) {
                console.log('mouseleave');
                google.maps.event.trigger(map, 'mouseleave', evt);
            }
            */
        };
        
        this.attachEvents = function (events) {
            return;
            // trigger layer manager events
            google.maps.event.addListener(map, 'drag', function () {
                events.drag.trigger();
            });

            google.maps.event.addListener(map, 'idle', function () {
                events.idle.trigger();
            });

            google.maps.event.addListener(map, 'zoom_changed', function () {
                events.zoom.trigger();
            });
        };
    };
    
    var proto = tangelo.GoogleMapLayer.prototype;

    proto.pointToLatLng = function (point) {
        var lat, lng;
        return {
            lat: lat,
            lng: lng
        };
    };

    proto.latLngToPoint = function (latLng) {
        var x, y;
        return {
            x: x,
            y: y
        };
    };

}(window.tangelo, window.$, window.google));
