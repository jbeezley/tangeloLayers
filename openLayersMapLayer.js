/*jslint browser: true, unparam: true*/

(function (tangelo, $, OpenLayers) {
    'use strict';

    if (!($ && OpenLayers)) {
        tangelo.OpenLayersMapLayer = tangelo.unavailable({
            plugin: "OpenLayersMapLayer",
            required: ["JQuery", "OpenLayers API"]
        });
        return;
    }

    tangelo.OpenLayersMapLayer = function (element, options) {
        var map, wms, that,
            staticLayer, movingLayer, ready, oldZoom;
        
        staticLayer = null;
        movingLayer = null;
        ready = false;
        that = this;
        options = options || {};

        // implement abstract methods
        this.pointToLatLng = function (x, y) {
            var ll = movingLayer.getLonLatFromViewPortPx(new OpenLayers.Pixel(x, y));
            return [ll.lat, ll.lon];
        };

        this.latLngToPoint = function (lat, lng) {
            var pt = movingLayer.getViewPortPxFromLonLat(new OpenLayers.LonLat(lng, lat));
            return [pt.x, pt.y];
        };
        
        this.Point.prototype.pointToLatLng = this.pointToLatLng;
        this.LatLng.prototype.latLngToPoint = this.latLngToPoint;

        this.bounds = function () {
            var bds = map.getExtent(),
                sw = new that.LatLng(bds.left, bds.bottom),
                ne = new that.LatLng(bds.right, bds.top);
            return new that.LatLngBounds(sw, ne);
        };

        this.getInnerDiv = function (options) {
            if (!ready) {
                tangelo.fatalError('OpenLayersLayer', 'getInnerDiv was called before the layer was ready');
            }
            options = options || {};
            if (options.moving === undefined || options.moving) {
                return movingLayer.div;
            }
            return staticLayer.div;
        };

        this.loaded = function () {
            return ready;
        };

        this.setCenter = function (ll) {
            map.setCenter(new OpenLayers.LonLat(ll.lng(), ll.lat()));
        };

        this.getCenter = function() {
            var center = map.getCenter();
            return new that.LatLng(center.lat, center.lon);
        };
        
        // create map (following example: http://bl.ocks.org/mbertrand/5218300)

        map = new OpenLayers.Map(element, {
            numZoomLevels: 20,
            controls: [
                new OpenLayers.Control.Navigation(),
                new OpenLayers.Control.Zoom(),
                new OpenLayers.Control.ScaleLine(),
                new OpenLayers.Control.MousePosition(),
                new OpenLayers.Control.KeyboardDefaults()
            ]
        });
        wms = new OpenLayers.Layer.WMS(
                'OpenLayers WMS',
                "http://vmap0.tiles.osgeo.org/wms/vmap0", {
                    layers: 'basic'
                });
        map.addLayer(wms);
        //map.zoomToMaxExtent();
        oldZoom = options.zoom || 2;
        this.setCenter(options.center || { lat: function () { return 0; }, lng: function () { return 0; } });
        map.zoomTo(oldZoom);

        // create vector layers
        movingLayer = new OpenLayers.Layer.Vector('movingDiv');
        movingLayer.afterAdd = function () {
            var sz = map.getSize();
            staticLayer = new OpenLayers.Layer.Vector('staticDiv', {isFixed: true});
            movingLayer.div.children[0].remove();
            $(movingLayer.div).width(sz.w);
            $(movingLayer.div).height(sz.h);
            staticLayer.afterAdd = function () {
                staticLayer.div.children[0].remove();
                $(staticLayer.div).width(sz.w);
                $(staticLayer.div).height(sz.h);
                staticLayer.setZIndex(1000);
                ready = true;
                //that.getEvent('load').trigger(map, { load: true } );
            };
            map.addLayer(staticLayer);
            staticLayer.events.register('loadend', map, function () {
                that.getEvent('load').trigger(map, { load: true } );
            });
        
        };
        map.addLayer(movingLayer);
        
        // add event handlers
        map.events.register('zoomend', map, function () {
            that.getEvent('zoom').trigger(map, { zoom: true, oldZoom: oldZoom, newZoom: map.zoom });
            oldZoom = map.zoom;
        });

        map.events.register('move', map, function (evt) {
            if (that.dragging()) {
                that.getEvent('drag').trigger(map, { drag: true }); // need mouse position
            }
        });
        
        map.events.register('moveend', map, function (evt) {
            $(movingLayer.div).css({left:0, top:0});
            $(staticLayer.div).css({left:0, top:0});
        });

        this.dragging = function () {
            return map.dragging;
        };

    };
    tangelo.OpenLayersMapLayer.prototype = new tangelo.AbstractMapLayer();

}(window.tangelo, window.$, window.OpenLayers));
