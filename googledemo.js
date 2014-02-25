
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
        var svg, pt0, pt1;
        // need to provide a way for layers to report if they are ready or not
        //google.maps.event.addDomListener(window, 'load', function () {
        //
        gmap.on('load', function () {
            svg = d3.select(gmap.addLayer('d3svg'))
                          .append('svg')
                            .style('overflow', 'visible');
                
            pt0 = new gmap.LatLng(0, 0);
            pt0 = new gmap.Point(pt0.x(), pt0.y());
            svg.selectAll('#stationary')
                .data([pt0]).enter()
              .append('circle')
                .attr('id', 'stationary')
                .attr('cx', function (d) { return d.x(); })
                .attr('cy', function (d) { return d.y(); })
                .attr('r', 20)
                .style('fill', 'red');
            pt1 = new gmap.LatLng(42.8667, -73.8167);
            svg.selectAll('#moving')
                  .data([pt1]).enter()
                .append('circle')
                .attr('id', 'moving')
                .attr('cx', function (d) { return d.x(); })
                .attr('cy', function (d) { return d.y(); })
                .attr('r', 20)
                .style('fill', 'blue');
        });

        gmap.on('drag', function (evt) {
            pt1.reproject();
            svg.selectAll('#moving')
                .data([pt1])
              .attr('transform', 'translate(' + evt.dragDelta.join() + ')');
        });
        /*
        gmap.on('drag', function (evt) {
            console.log('start: ' + evt.mouseStart.toString() + ' now: ' + evt.mouseNow.toString() + ' delta: ' + evt.dragDelta.join());
        });
        */
    };

}(window.tangelo, window.google, window.d3, window.$));
