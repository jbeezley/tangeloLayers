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

    tangelo.GoogleMapLayer = function (element, options) {
        // create a google map inside `element`
        var map, mapOpts, ready, view, that, dragStart, 
            dragNow, oldZoom, oldTranslate, movingDiv, staticDiv;
        
        that = this;
        dragStart = null;
        oldTranslate = [0, 0];
        movingDiv = null;
        staticDiv = null;

        // implementing abstract methods
        this.pointToLatLng = function (x, y) {
            var proj, pt, latlng;
            proj = view.getProjection();
            pt = new google.maps.Point(x, y);
            latlng = proj.fromDivPixelToLatLng(pt);
            return [latlng.lat(), latlng.lng()];
        };

        this.latLngToPoint = function (lat, lng) {
            var proj, pt, latlng;
            proj = view.getProjection();
            latlng = new google.maps.LatLng(lat, lng);
            pt = proj.fromLatLngToContainerPixel(latlng);
            return [pt.x, pt.y];
        };

        this.bounds = function () {
            var bds, sw, ne;
            bds = map.getBounds();
            sw = bds.getSouthWest();
            ne = bds.getNorthEast();
            return new that.LatLngBounds(
                        new that.LatLng(sw.lat(), sw.lng()),
                        new that.LatLng(ne.lat(), ne.lng())
                    );
        };

        this.getInnerDiv = function (options) {
            if (!ready) {
                tangelo.fatalError('GoogleMapLayer', 'getSVGLayer called before map was loaded');
            }
            options = options || { };
            if (options.moving === undefined || options.moving) {
                if (!movingDiv) {
                    movingDiv = document.createElement('div');
                    view.getPanes().overlayLayer.appendChild(movingDiv);
                }
                return movingDiv;
            }
            if (!staticDiv) {
                staticDiv = document.createElement('div');
                view.getPanes().overlayLayer.appendChild(staticDiv);
            }
            return staticDiv;
        };

        this.loaded = function () {
            return ready;
        };

        // I don't like this part, but I need to give subclasses access to the projection methods
        // there is probably a better way
        this.Point.prototype.pointToLatLng = this.pointToLatLng;
        this.LatLng.prototype.latLngToPoint = this.latLngToPoint;

        // implement LatLngBounds abstract methods here...

        // all methods are implemented, now start creating the layer
        
        // flag to throw an error if any draw events are fired
        // before the layer is ready
        ready = false;
        
        // convert map options for google interface
        mapOpts = options;

        // generate the map object
        map = new google.maps.Map(element, mapOpts);

        // construct an overly and attach it to the map
        function OverlayView() {
            this.setMap(map);
        }
        OverlayView.prototype = new google.maps.OverlayView();
        OverlayView.prototype.onAdd = function () {
            ready = true;
            that.getEvent('load').trigger(map, { load: true });
        };

        function updateTranslate() {
            if (!staticDiv) {
                return;
            }
            var idiv, pos;
            idiv = $(staticDiv);
            pos = idiv.offset();
            
            oldTranslate[0] += -pos.left;
            oldTranslate[1] += -pos.top;

            idiv.css({transform: 'matrix(1,0,0,1,' + oldTranslate.join() + ')'});

        }
        
        // attach the overlayView to event callbacks to update embedded layers
        OverlayView.prototype.draw = function () {
            updateTranslate();
            that.getEvent('draw').trigger(map, { draw: true });
        };


        view = new OverlayView();
        
        // implement event handling
        google.maps.event.addListenerOnce(map, 'idle', function () {
            updateTranslate();
            that.getEvent('load').trigger(map, { load: true });
        });

        google.maps.event.addListener(map, 'dragstart', function () {
            var mouse = map.getCenter();
            // get the mouse position
            dragNow = new that.LatLng(mouse.lat(), mouse.lng());
            dragStart = new that.Point(dragNow.x(), dragNow.y());
        });
        
        google.maps.event.addListener(map, 'dragend', function (evt) {
            dragStart = null;

            // keep retranslating after the drag stops because
            // google maps adds momentum to the drag
            // this still isn't perfect because the layer skips around
            //
            // maybe use WebKitMutationObserver, etc... to watch
            // for transform changes in the parent div?
            var timer = window.setInterval(updateTranslate, 10);
            window.setTimeout(function () {
                window.clearInterval(timer);
            }, 1000);
        });
        
        google.maps.event.addListener(map, 'drag', function (evt) {
            var dragDelta;
            updateTranslate();
            dragStart.reproject();
            dragNow.reproject();
            dragDelta = [ dragNow.x() - dragStart.x(), dragNow.y() - dragStart.y() ];
            that.getEvent('drag').trigger(map, { 
                drag: true,
                mouseStart: dragStart,
                mouseNow: dragNow,
                dragDelta: dragDelta });
        });

        google.maps.event.addListener(map, 'zoom_changed', function () {
            // wait until bounds is updated before triggering
            var listener = google.maps.event.addListener(map, 'bounds_changed', function () {
                updateTranslate();
                that.getEvent('zoom').trigger(map, { zoom: true, oldZoom: oldZoom, newZoom: map.getZoom() });
                oldZoom = map.getZoom();
                google.maps.event.removeListener(listener);
            });
        });

        this.dragging = function () {
            return !!dragStart;
        };

        oldZoom = map.getZoom();

        this.on('drag', function (evt) {
            evt.draw = true;
            that.getEvent('draw').trigger(map, evt);
        });
        this.on('zoom', function (evt) {
            evt.draw = true;
            that.getEvent('draw').trigger(map, evt);
        });

    };
    tangelo.GoogleMapLayer.prototype = new tangelo.AbstractMapLayer();

}(window.tangelo, window.$, window.google));
