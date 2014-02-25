
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

        //var gmap = new tangelo.GoogleMapLayer($('#demoContent')[0], options);
        var gmap = new tangelo.OpenLayersMapLayer($('#demoContent')[0]); 
        gmap.on(['load', 'zoom'], function () {
            console.log('callback');
            var ssvg, msvg, pt0, pt1;
            pt0 = new gmap.Point(250, 250);
            pt1 = new gmap.LatLng(42.8667, -73.8167);
            d3.select(gmap.getInnerDiv()).selectAll('#movingsvg')
                    .data([0]).enter()
                        .append('svg')
                            .attr('id', 'movingsvg')
                            .style('overflow', 'visible');
            d3.select(gmap.getInnerDiv({moving: false})).selectAll('#staticsvg')
                    .data([0]).enter()
                        .append('svg')
                            .attr('id', 'staticsvg')
                            .style('overflow', 'visible');
            msvg = d3.select('#movingsvg');
            ssvg = d3.select('#staticsvg');
            ssvg.selectAll('#stationary')
                .data([pt0]).enter()
              .append('circle')
                .attr('id', 'stationary')
                .attr('cx', function (d) { return d.x(); })
                .attr('cy', function (d) { return d.y(); })
                .attr('r', 20)
                .style('fill', 'red');
            var moving = msvg.selectAll('#moving')
                  .data([pt1.reproject()]);
            moving.enter()
                .append('circle')
                .attr('id', 'moving')
                .attr('r', 20)
                .style('fill', 'blue');
            moving
                .attr('cx', function (d) { return d.x(); })
                .attr('cy', function (d) { return d.y(); });
        });
    };

}(window.tangelo, window.google, window.d3, window.$));
