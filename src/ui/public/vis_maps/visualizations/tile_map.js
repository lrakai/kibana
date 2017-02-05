/*global mapboxgl*/
import _ from 'lodash';
import $ from 'jquery';
require("script!node_modules/mapbox-gl/dist/mapbox-gl.js");
import VislibVisualizationsChartProvider from './_chart';
import VislibVisualizationsMapProvider from './_map';
export default function TileMapFactory(Private) {

  const Chart = Private(VislibVisualizationsChartProvider);
  const TileMapMap = Private(VislibVisualizationsMapProvider);

  /**
   * Tile Map Visualization: renders maps
   *
   * @class TileMap
   * @constructor
   * @extends Chart
   * @param handler {Object} Reference to the Handler Class Constructor
   * @param chartEl {HTMLElement} HTML element to which the map will be appended
   * @param chartData {Object} Elasticsearch query results for this map
   */
  class TileMap extends Chart {
    constructor(handler, chartEl, chartData) {
      super(handler, chartEl, chartData);

      // track the map objects
      this.maps = [];
      this._chartData = chartData || {};
      _.assign(this, this._chartData);

      this._appendGeoExtents();
    }

    /**
     * Draws tile map, called on chart render
     *
     * @method draw
     * @return {Function} - function to add a map to a selection
     */
    draw() {
      const self = this;

      return function (selection) {
        selection.each(function () {
          self._appendMap(this);
        });
      };
    };

    /**
     * Invalidate the size of the map, so that leaflet will resize to fit.
     * then moves to center
     *
     * @method resizeArea
     * @return {undefined}
     */
    resizeArea() {
      this.maps.forEach(function (map) {
        map.updateSize();
      });
    };

    /**
     * clean up the maps
     *
     * @method destroy
     * @return {undefined}
     */
    destroy() {
      this.maps = this.maps.filter(function (map) {
        map.destroy();
      });
    };

    /**
     * Adds allmin and allmax properties to geoJson data
     *
     * @method _appendMap
     * @param selection {Object} d3 selection
     */
    _appendGeoExtents() {
      // add allmin and allmax to geoJson
      const geoMinMax = this.handler.data.getGeoExtents();
      this.geoJson.properties.allmin = geoMinMax.min;
      this.geoJson.properties.allmax = geoMinMax.max;
    };

    /**
     * Renders map
     *
     * @method _appendMap
     * @param selection {Object} d3 selection
     */
    _appendMap(selection) {
      this._appendGlMap(selection);

      const container = $(selection).addClass('tilemap')
        .css('display', 'none');
      const uiStateParams = {
        mapCenter: this.handler.uiState.get('mapCenter'),
        mapZoom: this.handler.uiState.get('mapZoom')
      };

      const params = _.assign({}, _.get(this._chartData, 'geoAgg.vis.params'), uiStateParams);

      const map = new TileMapMap(container, this._chartData, {
        center: params.mapCenter,
        zoom: params.mapZoom,
        events: this.events,
        markerType: this.handler.visConfig.get('mapType'),
        tooltipFormatter: this.tooltipFormatter,
        valueFormatter: this.valueFormatter,
        attr: this.handler.visConfig._values
      });

      // add title for splits
      if (this.title) {
        map.addTitle(this.title);
      }

      // add fit to bounds control
      if (_.get(this.geoJson, 'features.length') > 0) {
        map.addFitControl();
        map.addBoundingControl();
      }

      this.maps.push(map);
    };

    /**
     * Render WebGL map
     *
     * @method _appendGlMap
     * @param selection {Object} d3 selection
     */
    _appendGlMap(selection) {
      $(selection).parent().append('<div id="gl-map" style="width:100%;height:100%"></div>');
      const glMap = new mapboxgl.Map({
        container: 'gl-map',
        style: 'https://localhost:8080/styles/kibana.json',
        center: [-86.7816, 36.1627],
        zoom: 2
      });

      glMap.addControl(new mapboxgl.NavigationControl());

      glMap.on('load', function () {

        glMap.addSource("nashville-tour", {
          type: "geojson",
          data: {
            "type": "FeatureCollection",
            "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },

            "features": [
              {
                "type": "Feature", "properties": { "id": "1", "label": "Tennessee State Capitol" },
                "geometry": { "type": "Point", "coordinates": [-86.784336, 36.165762] }
              },
              {
                "type": "Feature", "properties": { "id": "2", "label": "Historical War Memorial Auditorium" },
                "geometry": { "type": "Point", "coordinates": [-86.783735, 36.164368] }
              },
              {
                "type": "Feature", "properties": { "id": "3", "label": "Tennessee Performing Arts Center" },
                "geometry": { "type": "Point", "coordinates": [-86.782250, 36.164512] }
              },
              {
                "type": "Feature", "properties": { "id": "4", "label": "Frothy Monkey" },
                "geometry": { "type": "Point", "coordinates": [-86.780954, 36.164125] }
              },
              {
                "type": "Feature", "properties": { "id": "5", "label": "The Music City Rollin' Jamboree" },
                "geometry": { "type": "Point", "coordinates": [-86.777335, 36.163164] }
              },
              {
                "type": "Feature", "properties": { "id": "6", "label": "Johnny Cash Museum" },
                "geometry": { "type": "Point", "coordinates": [-86.775828, 36.160876] }
              },
              {
                "type": "Feature", "properties": { "id": "7", "label": "Museum City Walk of Fame Park" },
                "geometry": { "type": "Point", "coordinates": [-86.776805, 36.159403] }
              },
              { "type": "Feature", "properties": { "id": "8", "label": "Bridgestone Arena" },
                "geometry": { "type": "Point", "coordinates": [-86.777879, 36.159339] }
              },
              {
                "type": "Feature", "properties": { "id": "9", "label": "Joe's Crabshack Nashville" },
                "geometry": { "type": "Point", "coordinates": [-86.774695, 36.160895] }
              },
              {
                "type": "Feature", "properties": { "id": "10", "label": "Nissan Stadium" },
                "geometry": { "type": "Point", "coordinates": [-86.771372, 36.166359] }
              }
            ]
          },
          cluster: true,
          clusterMaxZoom: 20, // Max zoom to cluster points on
          clusterRadius: 50 // Radius of each cluster when clustering points (defaults to 50)
        });

        // Use the nashville-tour source to create five layers:
        // One for unclustered points, three for each cluster category,
        // and one for cluster labels.
        glMap.addLayer({
          "id": "unclustered-points",
          "type": "symbol",
          "source": "nashville-tour",
          "filter": ["!has", "point_count"],
          "layout": {
            "icon-image": "marker-15"
          },
          "paint": {
            "icon-color": "#ff95c1", // only impacts sdf icons...
            "icon-halo-color": "#ff95c1" // only impacts sdf icons...
          }
        });

        // Display the earthquake data in three layers, each filtered to a range of
        // count values. Each range gets a different fill color.
        var layers = [
          [150, '#f28cb1'],
          [20, '#f1f075'],
          [0, '#51bbd6']
        ];

        layers.forEach(function (layer, i) {
          glMap.addLayer({
            "id": "cluster-" + i,
            "type": "circle",
            "source": "nashville-tour",
            "paint": {
              "circle-color": layer[1],
              "circle-radius": 18
            },
            "filter": i === 0 ?
              [">=", "point_count", layer[0]] :
              ["all",
                [">=", "point_count", layer[0]],
                ["<", "point_count", layers[i - 1][0]]]
          });
        });

        // Add a layer for the clusters' count labels
        glMap.addLayer({
          "id": "cluster-count",
          "type": "symbol",
          "source": "nashville-tour",
          "layout": {
            "text-field": "{point_count}",
            "text-font": [
              "Open Sans Regular"
            ],
            "text-size": 12
          }
        });
      });
    };
  }

  return TileMap;
};