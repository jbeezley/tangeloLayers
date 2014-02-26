/*jslint browser: true, unparam: true*/

(function (tangelo, $, L) {
    'use strict';

    if (!($ && L)) {
        tangelo.LeafletMapLayer = tangelo.unavailable({
            plugin: "LeafletMapLayer",
            required: ["JQuery", "Leaflet"]
        });
        return;
    }



}(window.tangelo, window.$, window.L));
