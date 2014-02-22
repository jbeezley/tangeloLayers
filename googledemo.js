
/*jslint browser: true*/

(function (tangelo, google) {
    'use strict';
    
    window.onload = function () { 
        // google map options... need to abstract this later
        var options = {
            zoom: 2,
            center: new google.maps.LatLng(0, 0),
            mapTypeId: google.maps.MapTypeId.TERRAIN
        };

        var gmap = new tangelo.GoogleMapLayer($('#demoContent')[0], options);
        // need to provide a way for layers to report if they are ready or not
        //google.maps.event.addDomListener(window, 'load', function () {
        //
        window.setTimeout(function () {
            var svg = gmap.getSVGLayer();
            var pt = new gmap.LatLng(0, 0);
            d3.select(svg).append('circle')
                .attr('cx', pt.x())
                .attr('cy', pt.y())
                .attr('r', 20)
                .style('fill', 'red')
                .attr('id', 'd3circle');
        },
            500);
    };

}(window.tangelo, window.google));
