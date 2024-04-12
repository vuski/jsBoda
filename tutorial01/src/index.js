// source: Natural Earth http://www.naturalearthdata.com/ via geojson.xyz
const WORLD =
  'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_0_scale_rank.geojson'; //eslint-disable-line
const bbox__ = "https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_wgs84_bounding_box.geojson";
const COUNTRIES =
  './emd_single2.geojson'; //eslint-disable-line
const COUNTRIES_5179 =
  './emd_utmk.geojson'; //eslint-disable-line
const AIR_PORTS =
  './ne_10m_airports.geojson';
const ACDNT = './13세이하항목축소.tsv';
const SECURE_AREA = './어린이보호구역_20220428.geojson';

import {COORDINATE_SYSTEM, Deck, _GlobeView as GlobeView, WebMercatorViewport,MapView}  from '@deck.gl/core';
import {ScatterplotLayer, SolidPolygonLayer, GeoJsonLayer, ArcLayer, BitmapLayer} from '@deck.gl/layers';
import { MVTLayer } from "@deck.gl/geo-layers";
import { TileLayerCustom } from './tileLayerCustom/tile-layer-custom';
import {CSVLoader} from '@loaders.gl/csv';
import {JSONLoader} from '@loaders.gl/json';
import GL from '@luma.gl/constants';
import {load} from '@loaders.gl/core';
import proj4 from 'proj4';

const deckgl = new Deck({
  parent: document.getElementById('container'),
  // views: new MapView({
  //   width : '50%',
  //   padding: {top: '50%', bottom: 0, left: 0, right: 0},
  //   controller: true,
  // }),
  initialViewState: {
    latitude: 36.686033, 
    longitude: 127.938015,
    zoom: 10,
    bearing: 0,
    pitch: 0
  },
  controller: true,
  //padding: {top: 500, bottom: 500, left: 500, right: 500}
  // getTooltip: ({object}) => object && {
  //   html: `<h2>${object.acdnt_dd_dc}</h2><div>${object.acdnt_age_2_dc}</div>`,
  //   style: {
  //     backgroundColor: '#ffff00',
  //     fontSize: '0.8em'
  //   }
  // }
  
 
});

let size = 1;

let visible00 = true;
let visible01 = true;
let visible02 = true;
 
let vv = 19.0;

let vworld = "https://api.vworld.kr/req/wmts/1.0.0/43991A6F-BAEB-3623-B24F-451FCDBBF7A4/Satellite/{z}/{y}/{x}.jpeg";
let ktmap = "https://tile.gis.kt.com/current/base.default/{z}/{y}/{x}.png";

const translate_x = -1000000;
const translate_y = -2000000;
const scale = 0.9996;

const update = () => {

  const layers =  [
    // new SolidPolygonLayer({
    //   id: 'background',
    //   data: [
    //     [[-180, 90], [180, 90], [180, -90], [-180, -90]]
    //   ],
    //   opacity: 0.5,
    //   getPolygon: datum => datum,
    //   stroked: false,
    //   filled: true,
    //   getFillColor: [5, 10, 40]
    // }),


    // kt map은 epsg5179에서 정사각형으로 제작됨(인덱스도 epsg5179기준으로 부여됨)
    // deckgl은 epsg4326기준 정사각형 타일맵을 불러올 수 있으므로,
    // epsg5179 타일의 정사각형 네 꼭지점을 epsg4326으로 변환(->부정형이 됨)하여 타일 이미지를 텍스쳐 매핑함

    new TileLayerCustom({
      id: "background-map",
      //data:   "./test1.png",

      tileSize: 256,      

      // 먼저 getTileLayer가 작동하고
      // 그 후에 renderSubLayer가 작동함
      getTileData: ({index,  signal, bbox }) => {
        //console.log(bbox);
        if (signal.aborted) {
          console.log("signal.aborted:",signal);
          return null;
        }

        const ktmapExtent = {minx:171162, miny:1214781, maxx:1744026, maxy:2787645};

        // EPSG:4326과 EPSG:5179의 정의
        const epsg4326 = 'EPSG:4326';
        const epsg5179 = '+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';

        const adjustedZ = index.z - 6; // 서버가 일반적인 줌 레벨보다 6만큼 작게 처리

        //일단, 현재 타일의 위경도 중심점을 찾는다.
        const tileCenter5179 = proj4(epsg4326, epsg5179, [(bbox.west+bbox.east)/2, (bbox.south+bbox.north)/2]);
        const diff = {x:tileCenter5179[0]- ktmapExtent.minx, y:ktmapExtent.maxy - tileCenter5179[1]};
        
        const tileSize = 256;//px
        const res = 2048 / Math.pow(2,adjustedZ);
        const tile_x_index = parseInt(diff.x / (res * tileSize));
        const tile_y_index = parseInt(diff.y / (res * tileSize));

        const newUrl = `https://tile.gis.kt.com/current/base.default/${adjustedZ}/${tile_y_index}/${tile_x_index}.png`;

        // 타일 데이터를 반환하기 위한 fetch 호출
        return fetch(newUrl)
          .then(response => response.blob())
          .then(blob => createImageBitmap(blob));
      },

      renderSubLayers: (props) => {
        const {
          bbox: { west, south, east, north },
        } = props.tile;
        //console.log(props.tile);
        const epsg4326 = 'EPSG:4326';
        const epsg5179 = '+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
        //props.tile.visible = true;
        //kt map 한계범위(epsg5179 좌표계)
        const ktmapExtent = {minx:171162, miny:1214781, maxx:1744026, maxy:2787645};

        const adjustedZ = props.tile.zoom - 6; //ktmap은 표준과 6 차이남

        //현재 처리하는 타일의 기준 좌표는 epsg4326 기준.
        //처리하는 타일의 사각형 네 꼭지점  [x0,y0], [x1,y1],[x2,y2],[x3,y3] 을 구한다.
        //구하는 사각형은 우선 epsg5179 기준으로 구하고(tile5179) - epsg5179에서 정사각형임
        //좌표계 변환하여 epsg4326의 네 꼭지점( [x0,y0], [x1,y1],[x2,y2],[x3,y3])으로 변환한다. - epsg4326에서 부정형의 사각형이 됨
        //그 부정형의 사각형에 epsg5179의 정사각형 타일맵을 텍스쳐로 입힘
        //텍스쳐 변환은 gpu에서 이루어짐
        const tileCenter5179 = proj4(epsg4326, epsg5179, [(west+east)/2, (south+north)/2]);
        const diff = {x:tileCenter5179[0]- ktmapExtent.minx, y:ktmapExtent.maxy - tileCenter5179[1]};
        
        const tileSize = 256;//px
        const res = 2048 / Math.pow(2,adjustedZ);
        const tile5179_xmin = parseInt(diff.x / (res * tileSize)) * (res * tileSize) + ktmapExtent.minx;
        const tile5179_ymax = ktmapExtent.maxy - (parseInt(diff.y / (res * tileSize)) * (res * tileSize));

        const tile5179 = {
          xmin : tile5179_xmin,
          xmax : tile5179_xmin  + (res * tileSize),
          ymin : tile5179_ymax  - (res * tileSize),
          ymax : tile5179_ymax,
        };

        const [x0,y0] = proj4(epsg5179, epsg4326, [tile5179.xmin, tile5179.ymin]);
        const [x1,y1] = proj4(epsg5179, epsg4326, [tile5179.xmin, tile5179.ymax]);
        const [x2,y2] = proj4(epsg5179, epsg4326, [tile5179.xmax, tile5179.ymax]);
        const [x3,y3] = proj4(epsg5179, epsg4326, [tile5179.xmax, tile5179.ymin]);

        return new BitmapLayer(props, {
          data: null,
          image: props.data,
          bounds: [ [x0,y0], [x1,y1],[x2,y2],[x3,y3] ],
          desaturate: 0.7,

          //transparentColor: [255, 0, 0, 255],
        });
      },
      // filterSubLayer : (layer, cullRect) => {
      //   console.log(layer, cullRect)
      //   return true;
      // },

      //extent: [117, 28, 133, 44],
      refinementStrategy : 'no-overlap',
      onTileError: (error, tile) => {},
      onHover: ({ lngLat }) => {
        //console.log(`Longitude: ${lngLat[0]}, Latitude: ${lngLat[1]}`);
      },
      parameters: {
        depthTest: false,
      },

      onTileLoad : (tile) => {
        //tile.isVisible = true;
        //tile.isSelected = true;
        //이미 컬링된 결과가 올라오기 때문에, 여기서는 제어할 수가 없다.
        //컬링 이전을 건드려야 가장자리 잘리는 것들을 제어가능함
        //console.log("onTileLoad",tile);
      },
      onTileUnload : (tile) => {
        //console.log("onTileUnload", tile);
      },
      // modelMatrix : [
      //       0.5, 0, 0, 0,  
      //       0, 0.5, 0, 0,  
      //       0, 0, 0.5, 0,      
      //       0, 0, 0, 1   
      //     ],
      //tintColor: [200, 180, 180],
      visible: true, 
    }),


    // new GeoJsonLayer({
    //   id: 'bbox',
    //   data: bbox__,
    //   // Styles
    //   stroked: false,
    //   filled: true,
    //   // lineWidthMinPixels: 2,
    //   // getLineColor: [5, 10, 40],
    //   getFillColor: [5*10, 10*10, 40*10]
    // }),
    // new GeoJsonLayer({
    //   id: 'base-world',
    //   data: WORLD,
    //   // Styles
    //   stroked: true,
    //   filled: true,
    //   lineWidthMinPixels: 2,
    //   getLineColor: [5, 10, 40],
    //   getFillColor: [15, 40, 80]
    // }),
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
    // new GeoJsonLayer({
    //   id: 'base-map-5179',
    //   data: COUNTRIES_5179,
    //   // Styles
    //   coordinateSystem: COORDINATE_SYSTEM.METER_OFFSETS,
    //   coordinateOrigin: [127.5, 38, 0],  
    //   modelMatrix : [
    //     1, 0, 0, 0,  
    //       0, 1, 0, 0,  
    //       0, 0, 1, 0,      
    //       -1000000, -2000000, 0, 1   
    //   ],
 
    //   stroked: true,
    //   filled: true,
    //   lineWidthMinPixels: 1,
    //   opacity: 0.4,
    //   getLineColor: [60, 60, 60],
    //   getFillColor: [200, 200, 200],
    //   visible : visible00
    // }),
    // new GeoJsonLayer({
    //   id: 'secure-area',
    //   data: SECURE_AREA,
    //   // Styles
    //   stroked: false,
    //   filled: true,
    //   //lineWidthMinPixels: 1,
    //   opacity: 0.7,
    //   pickable: true,
    //   //getLineColor: [60, 60, 60],
    //   getFillColor: [200, 100, 100],
    //   visible : visible01
    // }),
    new ScatterplotLayer({
      id: 'accident123',
      data: ACDNT,
      loaders: CSVLoader,
      loadOptions: {
        csv: {
          delimiter: '\t',
          // dynamicTyping: true,
          // skipEmptyLines: true
        }
      },
      // Styles
      filled: true,
      //stroked : true,
      
      radiusMinPixels: 2,
      radiusScale: 1,
      getPosition: d => [d.lon,d.lat],
      getRadius: 50,
      //sizeUnits: 'pixels',
      getFillColor: [200, 0, 80, 180],
      // Interactive props
      pickable: true,
      //autoHighlight: true,
      onHover: ({object}) => {
        if (object) {
          //console.log(`${object.acdnt_dd_dc} (${object.acdnt_age_2_dc})`);
        }
      },

      // updateTriggers: {
      //   // This tells deck.gl to recalculate radius when `currentYear` changes
      //   radiusMinPixels: size,
      // },
      // visible : visible02
  
    }),
    // new ArcLayer({
    //   id: 'arcs',
    //   data: AIR_PORTS,
    //   dataTransform: d => d.features.filter(f => f.properties.scalerank < 10000),
    //   //Styles
    //   parameters: {
    //     blendFunc:[GL.SRC_ALPHA, GL.ONE, GL.ONE_MINUS_DST_ALPHA, GL.ONE],
    //     blendEquation: GL.FUNC_ADD,
    //     depthTest: false,
    //   },
    //   getSourcePosition: [-0.4531566,51.4709959], // London
    //   getTargetPosition: f => f.geometry.coordinates,
    //   getSourceColor: [0, 128, 200],
    //   getTargetColor: [200, 0, 80],
    //   getWidth: 3,
    //   getHeight : 0.3,
    //   getTilt : 90
    // })
  
  ];

  //console.log(layers);
  deckgl.setProps({layers});
};

update();

window.addEventListener("keydown", (e) => {
  console.log(e);
  if (e.key=='1') vv += 0.1;
  if (e.key=='2') vv -= 0.2;
  console.log(vv);
  update();
});