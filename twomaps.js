/*jslint browser: true*/

(function (tangelo, d3, $) {
    'use strict';

    function makeMap(map) {
        map.on(['load', 'zoom'], function () {
            var pt0, pt1;
            pt0 = new map.Point(250, 250);
            pt1 = new map.LatLng(42.8667, -73.8167);
        // svg needs to be bigger because overflow doesn't seem to work always
        // see: http://stackoverflow.com/questions/11909099/overlay-d3-paths-onto-google-maps
            d3.select(map.getInnerDiv()).selectAll('#movingsvg')
                    .data([0]).enter()
                        .append('svg')
                            .attr('id', 'movingsvg')
                            .style('overflow', 'visible')
                            .attr('width', '8000px')
                            .attr('height', '8000px')
                            .style('position', 'absolute')
                            .style('top', '-4000px')
                            .style('left', '-4000px')
                        .append('g')
                            .attr('id', 'translategroup')
                            .attr('transform', 'translate(4000, 4000)');
            var msvg = d3.select(map.getInnerDiv()).select('#translategroup');
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
