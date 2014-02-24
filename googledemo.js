
/*jslint browser: true*/

(function (tangelo, google, d3, $) {
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
        gmap.on('load', function () {
                var svg = d3.select(gmap.addLayer('d3svg'))
                            .append('svg');
                
                var pt = new gmap.LatLng(0, 0);
                svg.append('circle')
                    .attr('cx', pt.x())
                    .attr('cy', pt.y())
                    .attr('r', 50)
                    .style('fill', 'red')
                    .attr('id', 'd3circle');
        });

        gmap.on('drag', function (evt) {
            console.log('start: ' + evt.mouseStart.toString() + ' now: ' + evt.mouseNow.toString() + ' delta: ' + evt.dragDelta.join());
        });
    };

}(window.tangelo, window.google, window.d3, window.$));
