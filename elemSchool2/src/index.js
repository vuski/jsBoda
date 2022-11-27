const schoolInfo = './학교정보.tsv';


import {ScatterplotLayer, TextLayer, BitmapLayer, SolidPolygonLayer, GeoJsonLayer} from '@deck.gl/layers';
import {CSVLoader} from '@loaders.gl/csv';
import {load} from '@loaders.gl/core';
import {MapboxOverlay} from '@deck.gl/mapbox';

import mapboxgl from 'mapbox-gl';
import MapboxLanguage from '@mapbox/mapbox-gl-language';
mapboxgl.accessToken = 'pk.eyJ1Ijoic2JraW00MjciLCJhIjoiY2o4b3Q0aXd1MDdyMjMzbnRxYTdvdDZrbCJ9.GCHi6-mDGEkd3F-knzSfRQ';


const map = createMap('container');
initMap(map);
const deckOverlay =  new MapboxOverlay({
  layers: []
}); 
map.addControl(deckOverlay);


let currentZoom = 6;
// const w0= window.innerWidth;
// const h0= window.innerHeight;


function createMap(containerID) {
  return  new mapboxgl.Map({
      container: containerID, // container ID
      //style: 'mapbox://styles/mapbox/streets-v11', // style URL
      style:  'mapbox://styles/sbkim427/cl6ool43r003o14kwmd8ogdwc',
      center: [ 127.6, 35.7], // starting position [lng, lat]
      zoom: 6, // starting zoom 
      //projection: 'globe' // display the map as a 3D globe
  });    
}

function initMap(map) {
  map.addControl(new MapboxLanguage({
      defaultLanguage: 'ko'    
    } 
  ));
}









let schoolData;

(async function loadData() {
  const schoolRaw = await load(schoolInfo, CSVLoader, {
    csv : {
      delimiter : '\t',
      header : true,
    }
  });
  
  schoolData = schoolRaw;
  //console.log(schoolData.filter(d=>d.persons<=10));
  return schoolRaw;
})().then( () => {
  update();
}); 





const update = () => {

  const layers =  [

    new ScatterplotLayer({
      id: 'school',
      data: schoolData,
      
      // Styles
      filled: true,
      // getFilterValue: d => [d.persons],
      // filterRange: [[countFrom, countTo]],
      radiusMinPixels: 2,
      radiusScale: 1,
      getPosition: d => [d.x,d.y],
      getRadius: d=> (currentZoom*currentZoom/100) * 1/Math.pow(d.persons,0.35) * 60,
      radiusUnits: 'pixels',
      // getFillColor: d => {
      //   return d.persons>=120? [255,120,33,180] : [194, 3, 75, 180];
      // },

      pickable: true,
      autoHighlight: true,
      // updateTriggers: {
      //   // This tells deck.gl to recalculate radius when `currentYear` changes
      //   getRadius : [currentZoom]
       
      // },
      visible : true,
      // extensions: [new DataFilterExtension({filterSize: 1})]    
    }),    
  ];


  deckOverlay.setProps({
    layers : layers
  });  

};


window.addEventListener('resize', function() {
  const w = window.innerWidth, h = window.innerHeight;

  update();
});
