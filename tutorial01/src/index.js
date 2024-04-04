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

import {COORDINATE_SYSTEM, Deck, _GlobeView as GlobeView}  from '@deck.gl/core';
import {ScatterplotLayer, SolidPolygonLayer, GeoJsonLayer, ArcLayer, BitmapLayer} from '@deck.gl/layers';
import { TileLayer, MVTLayer } from "@deck.gl/geo-layers";
import {CSVLoader} from '@loaders.gl/csv';
import {JSONLoader} from '@loaders.gl/json';
import GL from '@luma.gl/constants';
import {load} from '@loaders.gl/core';
import proj4 from 'proj4';

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
    new TileLayer({
      id: "background-map",
      data:   "./test1.png",//
      // coordinateSystem: COORDINATE_SYSTEM.METER_OFFSETS,
      // coordinateOrigin: [127.5, 38, 0],  
      // modelMatrix : [
      //   1, 0, 0, 0,  
      //     0, 1, 0, 0,  
      //     0, 0, 1, 0,      
      //     -1000000, -2000000, 0, 1   
      // ],
      // minZoom: Screen.zoom.MAP_MIN,
      // maxZoom: Screen.zoom.MAP_MAX,
      tileSize: 256,
      renderSubLayers: (props) => {
        const {
          bbox: { west, south, east, north },
        } = props.tile;
        console.log("props",props);
        const epsg4326 = 'EPSG:4326';
        const epsg3857 = 'EPSG:3857';
        const epsg5179 = '+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
        
        // const [_west, _north] = proj4(epsg4326, epsg3857, [west, north]);
        // const [_east, _south] = proj4(epsg4326, epsg3857, [east, south]);
        // console.log(_west, _south, _east, _north);

        const base = {minx:171162, miny:1214781, maxx:1744026, maxy:2787645};
        console.log(west, south, east, north);
        const adjustedZ = props.tile.zoom - 6;

        const tilexy = proj4(epsg4326, epsg5179, [(west+east)/2, (south+north)/2]);
        const diff = {x:tilexy[0]- base.minx, y:base.maxy - tilexy[1]};
        
        const tileSize = 256;//px
        const res = 2048 / Math.pow(2,adjustedZ);
        const xx = parseInt(diff.x / (res * tileSize)) * (res * tileSize) + base.minx;
        const yy = base.maxy - (parseInt(diff.y / (res * tileSize)) * (res * tileSize));

        const tile5179 = {
          xmin : xx,
          xmax : xx  + (res * tileSize),
          ymin : yy  - (res * tileSize),
          ymax : yy,
        };

        const [x0,y0] = proj4(epsg5179, epsg4326, [tile5179.xmin, tile5179.ymin]);
        const [x1,y1] = proj4(epsg5179, epsg4326, [tile5179.xmin, tile5179.ymax]);
        const [x2,y2] = proj4(epsg5179, epsg4326, [tile5179.xmax, tile5179.ymax]);
        const [x3,y3] = proj4(epsg5179, epsg4326, [tile5179.xmax, tile5179.ymin]);
        console.log([ [x0,y0], [x1,y1],[x2,y2],[x3,y3] ]);


        return new BitmapLayer(props, {

          data: null,
          image: props.data,
          // coordinateSystem: COORDINATE_SYSTEM.METER_OFFSETS,
          // coordinateOrigin: [127.5, 38, 0],  
          // modelMatrix : [
          //   1, 0, 0, 0,  
          //     0, 1, 0, 0,  
          //     0, 0, 1, 0,      
          //     -1000000, -2000000, 0, 1   
          // ],
          //bounds: [west, south, east, north],
          bounds: [ [x0,y0], [x1,y1],[x2,y2],[x3,y3] ],
          //_imageCoordinateSystem :COORDINATE_SYSTEM.CARTESIAN,

          desaturate: 0.7,
          //transparentColor: [255, 0, 0, 255],
        });
      },
      //zoomOffset : -6,
      //extent: [117, 28, 133, 44],
      //refinementStrategy : 'no-overlap',
      onTileError: (error, tile) => {},
      onHover: ({ lngLat }) => {
        //console.log(`Longitude: ${lngLat[0]}, Latitude: ${lngLat[1]}`);
      },
      parameters: {
        depthTest: false,
      },

      // extensions: [new MaskExtension()],
      getTileData: ({index, url, signal, bbox }) => {

        console.log("bbox",bbox);  
        if (signal.aborted) {
          console.log("signal.aborted:",signal);
          return null;
        }

        const base = {minx:171162, miny:1214781, maxx:1744026, maxy:2787645};
        //base.minx = (base.maxx-base.minx)*0.1667+base.minx;
        //base.maxy = (base.maxy - base.miny)*0.83333 + base.miny;
        //const base = {minx:117.05424125914848, miny:30.68592024862086, maxx:135.25684899655164, maxy:44.614222462039535};
        // EPSG:4326과 EPSG:5179의 정의
        const epsg4326 = 'EPSG:4326';
        const epsg3857 = 'EPSG:3857';
        const epsg5179 = '+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
        //(30.63029097235253, 118.86697148373719)
        // 좌표 변환 함수
        function convert4326to5179(lat, lon) {
          // proj4를 사용하여 좌표 변환
          const [x, y] = proj4(epsg4326, epsg5179, [lon, lat]);
          return {x, y};
        }
        
        //console.log("proj4",proj4(epsg5179, epsg4326, [base.minx, base.maxy]));
        
        const basexy = proj4(epsg4326, epsg3857, [base.minx, base.maxy]);

        
        
        //base.minx = 119;
        //base.maxy = 44;

        function calculateTileXY(latitude, longitude, zoom) {
          var latRad = latitude * Math.PI / 180;
          var n = Math.pow(2, zoom);
          var xTile = Math.floor((longitude + 180) / 360 * n);
          var yTile = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
          return {x: xTile, y: yTile};
        }

        const adjustedZ = index.z - 6; // 서버가 일반적인 줌 레벨보다 6만큼 작게 처리

        //일단, 현재 타일의 위경도 중심점을 찾는다.
        const tilexy = proj4(epsg4326, epsg5179, [(bbox.west+bbox.east)/2, (bbox.south+bbox.north)/2]);
        const diff = {x:tilexy[0]- base.minx, y:base.maxy - tilexy[1]};
        
        const tileSize = 256;//px
        const res = 2048 / Math.pow(2,adjustedZ);
        const xx = parseInt(diff.x / (res * tileSize));
        const yy = parseInt(diff.y / (res * tileSize));
        //console.log(tilexy, diff, xx, yy);

        const offset = calculateTileXY(base.maxy/1, base.minx/1, index.z);
        //const offset = calculateTileXY(44, 120, index.z);
        //30.68592024862086, 135.25684899655164
        var tileXY = calculateTileXY((bbox.north+bbox.south)/2, (bbox.east+bbox.west)/2, index.z);
        //var tileXY = calculateTileXY(base.maxy-bbox.north, base.minx-bbox.west, index.z);
        //console.log(bbox, index, url, );
        //console.log(offset, tileXY); // {x: 301, y: 385}
        // const data = fetch(url, {signal});


        const url_renew = `https://tile.gis.kt.com/current/base.default/${adjustedZ}/${yy}/${xx}.png`;
        // 수정된 z 값을 사용하여 타일 URL 생성
        //const url_renew = `https://tile.gis.kt.com/current/base.default/${adjustedZ}/${tileXY.y-offset.y}/${tileXY.x-offset.x}.png`;
        //console.log(url_renew);
        // 타일 데이터를 반환하기 위한 fetch 호출
        return fetch(url_renew)
          .then(response => response.blob())
          .then(blob => createImageBitmap(blob));

        // Expensive computation on returned data
      },
      // maskId: "map-mask",
      //tintColor: [200, 180, 180],
      visible: true, //(!State.onUpdating) && (!State.onQuerying)
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