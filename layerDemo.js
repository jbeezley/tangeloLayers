/*jslint browser: true*/

(function (tangelo, d3, google) {
    'use strict';
    
    // need to provide a way for layers to report if they are ready or not
    //google.maps.event.addDomListener(window, 'load', function () {
    window.setTimeout(function () {
        var manager = new tangelo.LayerManager(d3.select('#demoContent').node());
        
        // google map options... need to abstract this later
        var options = {
            zoom: 2,
            center: new google.maps.LatLng(0, 0),
            mapTypeId: google.maps.MapTypeId.TERRAIN
        };

        var map = manager.addLayer('map', tangelo.GoogleMapLayer, options);
        var svg = manager.addLayer('svg', tangelo.D3Layer);

    },
        500);

}(window.tangelo, window.d3, window.google));
