/*jslint browser: true*/

(function (tangelo, d3, $) {
    'use strict';

    function makeMap(map) {
        map.on(['load', 'zoom'], function () {
            console.log('callback');
            var pt0, pt1;
            pt0 = new map.Point(250, 250);
            pt1 = new map.LatLng(42.8667, -73.8167);
            var msvg = d3.select(map.getInnerDiv()).selectAll('#movingsvg')
                    .data([0]).enter()
                        .append('svg')
                            .attr('id', 'movingsvg')
                            .style('overflow', 'visible');
            var ssvg = d3.select(map.getInnerDiv({moving: false})).selectAll('#staticsvg')
                    .data([0]).enter()
                        .append('svg')
                            .attr('id', 'staticsvg')
                            .style('overflow', 'visible');
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
    }

    window.onload = function () {
        var openLayersMap = new tangelo.OpenLayersMapLayer($('#openlayersdiv')[0], { zoom: 2 }),
            googleMap = new tangelo.GoogleMapLayer($('#googlediv')[0], { zoom: 2 });

        makeMap(openLayersMap);
        makeMap(googleMap);

        openLayersMap.on(['drag', 'zoom'], function () {
            var center = openLayersMap.getCenter();
            googleMap.setCenter(center);
        });

        googleMap.on(['drag','zoom'], function () {
            var center = googleMap.getCenter();
            openLayersMap.setCenter(center);
        });
    };

}(window.tangelo, window.d3, window.$));
