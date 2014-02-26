/*jslint browser: true*/

(function (tangelo, d3, $) {
    'use strict';

    function makeMap(map) {
        map.on(['load', 'zoom'], function () {
            var pt0, pt1;
            pt0 = new map.Point(250, 250);
            pt1 = new map.LatLng(42.8667, -73.8167);
            var msvg = d3.select(map.getInnerDiv()).selectAll('#movingsvg')
                    .data([0]);
        // svg needs to be bigger because overflow doesn't seem to work always
        // see: http://stackoverflow.com/questions/11909099/overlay-d3-paths-onto-google-maps
            msvg.enter()
                        .append('svg')
                            .attr('width', 8000)
                            .attr('height', 8000)
                            .style('position', 'absolute')
                            .style('top', -4000)
                            .style('left', -4000)
                        .append('g')
                            .attr('id', 'movingsvg')
                            .attr('transform', 'translate(4000, 4000)')
                            .style('overflow', 'visible');
            var ssvg = d3.select(map.getInnerDiv({moving: false})).selectAll('#staticsvg')
                    .data([0]);
            ssvg.enter()
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
                  .data([pt1]);
            moving.enter()
                .append('circle')
                .attr('id', 'moving')
                .attr('r', 20)
                .style('fill', 'blue');
            moving
                .attr('cx', function (d) { return d.x(); })
                .attr('cy', function (d) { return d.y(); });
            moving = msvg.selectAll('#rect')
                    .data([0]);
            moving.enter().append('rect')
                .style('fill', 'black')
                .style('fill-opacity', '0.1')
                .attr('id', 'rect')
                .attr('x', 0)
                .attr('y', 0)
                .attr('width', 500)
                .attr('height', 500);
        });
    }

    window.onload = function () {
        var openLayersMap = new tangelo.OpenLayersMapLayer($('#openlayersdiv')[0], { zoom: 2 }),
            googleMap = new tangelo.GoogleMapLayer($('#googlediv')[0], { zoom: 2 });

        makeMap(openLayersMap);
        makeMap(googleMap);
        
        function syncZoom(evt) {
            if (evt.newZoom !== openLayersMap.getZoom()) {
                openLayersMap.setZoom(evt.newZoom);
            }
            if (evt.newZoom !== googleMap.getZoom()) {
                googleMap.setZoom(evt.newZoom);
            }
        }

        openLayersMap.on(['drag', 'zoom'], function () {
            var center = openLayersMap.getCenter();
            googleMap.setCenter(center);
        });

        googleMap.on(['drag','zoom'], function () {
            var center = googleMap.getCenter();
            openLayersMap.setCenter(center);
        });
        
        openLayersMap.on('zoom', syncZoom);
        googleMap.on('zoom', syncZoom);

    };

}(window.tangelo, window.d3, window.$));
