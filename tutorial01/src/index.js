// source: Natural Earth http://www.naturalearthdata.com/ via geojson.xyz
const WORLD =
  'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_0_scale_rank.geojson'; //eslint-disable-line

const COUNTRIES =
  './emd_single2.geojson'; //eslint-disable-line
const AIR_PORTS =
  './ne_10m_airports.geojson';
const ACDNT = './13세이하항목축소.tsv';
const SECURE_AREA = './어린이보호구역_20220428.geojson';

import {Deck, _GlobeView as GlobeView}  from '@deck.gl/core';
import {ScatterplotLayer, SolidPolygonLayer, GeoJsonLayer, ArcLayer} from '@deck.gl/layers';
import {CSVLoader} from '@loaders.gl/csv';
import {JSONLoader} from '@loaders.gl/json';
import GL from '@luma.gl/constants';
import {load} from '@loaders.gl/core';


const deckgl = new Deck({
  parent: document.getElementById('container'),
  //views: new GlobeView(),
  initialViewState: {
    latitude: 36.686033, 
    longitude: 127.938015,
    zoom: 10,
    bearing: 0,
    pitch: 0
  },
  controller: true,
  getTooltip: ({object}) => object && {
    html: `<h2>${object.acdnt_dd_dc}</h2><div>${object.acdnt_age_2_dc}</div>`,
    style: {
      backgroundColor: '#ffff00',
      fontSize: '0.8em'
    }
  }
  
 
});

let size = 1;

let visible00 = true;
let visible01 = true;
let visible02 = true;
 

const update = () => {

  const layers =  [
    new SolidPolygonLayer({
      id: 'background',
      data: [
        [[-180, 90], [180, 90], [180, -90], [-180, -90]]
      ],
      opacity: 0.5,
      getPolygon: d => d,
      stroked: false,
      filled: true,
      getFillColor: [5, 10, 40]
    }),
    new GeoJsonLayer({
      id: 'base-world',
      data: WORLD,
      // Styles
      stroked: true,
      filled: true,
      lineWidthMinPixels: 2,
      getLineColor: [5, 10, 40],
      getFillColor: [15, 40, 80]
    }),
    new GeoJsonLayer({
      id: 'base-map',
      data: COUNTRIES,
      // Styles
      stroked: true,
      filled: false,
      lineWidthMinPixels: 1,
      opacity: 0.4,
      getLineColor: [60, 60, 60],
      getFillColor: [200, 200, 200],
      visible : visible00
    }),
    new GeoJsonLayer({
      id: 'secure-area',
      data: SECURE_AREA,
      // Styles
      stroked: false,
      filled: true,
      //lineWidthMinPixels: 1,
      opacity: 0.7,
      pickable: true,
      //getLineColor: [60, 60, 60],
      getFillColor: [200, 100, 100],
      visible : visible01
    }),
    new ScatterplotLayer({
      id: 'accident',
      data: ACDNT,
      loaders: CSVLoader,
      loadOptions: {
        csv: {
          //delimiter: '\t',
          dynamicTyping: true,
          skipEmptyLines: true
        }
      },
      // Styles
      filled: true,
      
      radiusMinPixels: size,
      radiusScale: 1,
      getPosition: d => [d.lon,d.lat],
      getRadius: 50,
      //sizeUnits: 'pixels',
      getFillColor: [200, 0, 80, 180],
      // Interactive props
      pickable: true,
      autoHighlight: true,
      onHover: ({object}) => object && console.log(`${object.acdnt_dd_dc} (${object.acdnt_age_2_dc})`),

      updateTriggers: {
        // This tells deck.gl to recalculate radius when `currentYear` changes
        radiusMinPixels: size,
      },
      visible : visible02
  
    }),
    new ArcLayer({
      id: 'arcs',
      data: AIR_PORTS,
      dataTransform: d => d.features.filter(f => f.properties.scalerank < 4),
      // Styles
      // parameters: {
      //   blendFunc:[GL.SRC_ALPHA, GL.ONE, GL.ONE_MINUS_DST_ALPHA, GL.ONE],
      //   blendEquation: GL.FUNC_ADD,
      //   depthTest: false,
      // },
      getSourcePosition: f => [-0.4531566,51.4709959], // London
      getTargetPosition: f => f.geometry.coordinates,
      getSourceColor: [0, 128, 200],
      getTargetColor: [200, 0, 80],
      getWidth: 1,
      getHeight : 0.1,
      //getTilt : 90
    })
  
  ];


  deckgl.setProps({layers});
};

update();