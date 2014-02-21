/*jslint browser: true, unparam: true*/

(function (tangelo, $, d3) {
    'use strict';

    if (!($ && d3)) {
        tangelo.GoogleMapLayer = tangelo.unavailable({
            plugin: "GoogleMapLayer",
            required: ["JQuery", "d3"]
        });
        return;
    }

    tangelo.D3Layer = function (elem, options) {

        var svg = d3.select(elem).append('svg');
        
        this.getSVG = function () {
            return svg;
        };

        this.handlers = {
            dragStart: function (evt) {
            },
            dragEnd: function (evt) {
            },
            drag: function (evt) {
            }
        };

        this.attachEvents = function (events) {
        };
    };

}(window.tangelo, window.$, window.d3));
