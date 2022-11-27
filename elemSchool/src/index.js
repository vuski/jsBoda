const schoolInfo = './학교정보.tsv';


import {Deck}  from '@deck.gl/core';
import {ScatterplotLayer, TextLayer, BitmapLayer, SolidPolygonLayer, GeoJsonLayer} from '@deck.gl/layers';
import {DataFilterExtension} from '@deck.gl/extensions';
import {CSVLoader} from '@loaders.gl/csv';
import {JSONLoader} from '@loaders.gl/json'
import {TileLayer} from '@deck.gl/geo-layers';
import {load} from '@loaders.gl/core';
import {MapboxOverlay} from '@deck.gl/mapbox';
//const {JSONLoader, load} = json; 

import ionRangeSlider from 'ion-rangeslider';

import mapboxgl from 'mapbox-gl';
import MapboxLanguage from '@mapbox/mapbox-gl-language';

mapboxgl.accessToken = 'pk.eyJ1Ijoic2JraW00MjciLCJhIjoiY2o4b3Q0aXd1MDdyMjMzbnRxYTdvdDZrbCJ9.GCHi6-mDGEkd3F-knzSfRQ';

let currentZoom = 6;
const map = createMap('container');
initMap(map);

const w0= window.innerWidth;
const h0= window.innerHeight;
d3.select("#bottomBar")
    .append("canvas")
    .attr("id", "textCanvas")
    .attr("width", w0)
    .attr("height", 100);  

const svg =d3.select("#container")
    .append("svg")
    .attr("id", "popupText")
    .attr("width", w0)
    .attr("height", h0)
    .style("pointer-events", "none");

const textFeature = svg.append("g");

const canvas1 = document.getElementById('textCanvas');
const context1 = canvas1.getContext("2d");

// const canvas2 = document.getElementById('popupText');
// const context2 = canvas2.getContext("2d");

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
  //map.dragRotate.disable(); 
  //map.touchZoomRotate.disableRotation();    
  map.addControl(new MapboxLanguage({
      defaultLanguage: 'ko'    
    },
 
  ));
// map.on('style.load', () => {
//     map.setFog({}); // Set the default atmosphere style
// });
}

const deckOverlay =  new MapboxOverlay({
  //interleaved: false,
  layers: []
}); 

let size = 1; 

let countFrom = 1;
let countTo = 2296;
let filteredCount = 6307;
let schoolData;

(async function loadData() {
  const schoolRaw = await load(schoolInfo, CSVLoader, {
    csv : {
      delimiter : '\t',
      header : true,
    }
  });
  
  schoolData = schoolRaw;
  console.log(schoolData.filter(d=>d.persons<=10));
  return schoolRaw;
})().then( (schoolData) => {
  //console.log("여ㅛ기");
  update();
}); 





const update = () => {

  const layers =  [

    // new GeoJsonLayer({
    //   id: 'sgg-area',
    //   data: sggName,
    //   // Styles
    //   stroked: true,
    //   filled: false,
    //   lineWidthMinPixels: 1,
    //   opacity: 0.4,
    //   pickable: true,
    //   getLineColor: [60, 60, 60],
    //   //getFillColor: [200, 100, 100],
    //   visible : true
    // }),
    new ScatterplotLayer({
      id: 'school',
      data: schoolData,
      
      // Styles
      filled: true,
      getFilterValue: d => [d.persons],
      filterRange: [[countFrom, countTo]],
      radiusMinPixels: 2,
      //sizeMaxPixels: 10,
      radiusScale: 1,
      getPosition: d => [d.x,d.y],
      getRadius: d=> (currentZoom*currentZoom/100) * 1/Math.pow(d.persons,0.35) * 60,
      radiusUnits: 'pixels',
      getFillColor: d => {
        return d.persons>=120? [255,120,33,180] : [194, 3, 75, 180];
      },
      // Interactive props
      pickable: true,
      autoHighlight: true,
      onHover: (info) => {
        if (info.object) {
          console.log(info.object.name);
          console.log(info);

          textFeature.selectAll(".number").remove();

          textFeature.append("rect")
                    .attr("class", "number")
                    .attr("x", info.x-200)
                    .attr("y", info.y-115)
                    .attr("width", 400)
                    .attr("height", 100)
                    .style("fill", "black")
                    .style("opacity", 0.8);


          textFeature.append("text")
                    .attr("class", "number")
                    .attr("dx", info.x)
                    .attr("dy", info.y-80)
                    .style("fill", "white")
                    .attr("text-anchor", "middle")
                    .style("font-size", 30)
                    .style("opacity", 1)
                    .text(info.object.name);
           textFeature.append("text")
                    .attr("class", "number")
                    .attr("dx", info.x)
                    .attr("dy", info.y-55)
                    .style("fill", "white")
                    .attr("text-anchor", "middle")
                    .style("font-size", 20)
                    .style("opacity", 1)
                    .text("전교생 : "+info.object.persons+"명 | 학급수 : "+info.object.cls);
           textFeature.append("text")
                    .attr("class", "number")
                    .attr("dx", info.x)
                    .attr("dy", info.y-30)
                    .style("fill", "white")
                    .attr("text-anchor", "middle")
                    .style("font-size", 15)
                    .style("opacity", 1)
                    .text(info.object.addr);

        } else {
          textFeature.selectAll(".number").remove();
        }

        // 
        
      },
      onClick: (info) => {
        if (info.object) {
          console.log(info.object.name);
          console.log(info);

          textFeature.selectAll(".number").remove();

          textFeature.append("rect")
                    .attr("class", "number")
                    .attr("x", info.x-200)
                    .attr("y", info.y-115)
                    .attr("width", 400)
                    .attr("height", 100)
                    .style("fill", "black")
                    .style("opacity", 0.8);


          textFeature.append("text")
                    .attr("class", "number")
                    .attr("dx", info.x)
                    .attr("dy", info.y-80)
                    .style("fill", "white")
                    .attr("text-anchor", "middle")
                    .style("font-size", 30)
                    .style("opacity", 1)
                    .text(info.object.name);
           textFeature.append("text")
                    .attr("class", "number")
                    .attr("dx", info.x)
                    .attr("dy", info.y-55)
                    .style("fill", "white")
                    .attr("text-anchor", "middle")
                    .style("font-size", 20)
                    .style("opacity", 1)
                    .text("전교생 : "+info.object.persons+"명 | 학급수 : "+info.object.cls);
           textFeature.append("text")
                    .attr("class", "number")
                    .attr("dx", info.x)
                    .attr("dy", info.y-30)
                    .style("fill", "white")
                    .attr("text-anchor", "middle")
                    .style("font-size", 15)
                    .style("opacity", 1)
                    .text(info.object.addr);

        } else {
          textFeature.selectAll(".number").remove();
        }

        // 
        
      },

      updateTriggers: {
        // This tells deck.gl to recalculate radius when `currentYear` changes
        getRadius : [currentZoom]
       
      },
      visible : true,
      extensions: [new DataFilterExtension({filterSize: 1})]    
    }),
      new TextLayer({
        id: 'textPersons',
        data: schoolData,//.filter(d=>d.persons<=120),
                
        /* props from TextLayer class */
        
        // background: false,
        // backgroundPadding: [0, 0, 0, 0],
        // billboard: true,
        // characterSet: " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~",
        fontFamily: 'Malgun Gothic',
        // fontSettings: {},
        // fontWeight: 'normal',
        getAlignmentBaseline: 'center',
        getAngle: 0,
        // getBackgroundColor: [255, 255, 255, 255],
        // getBorderColor: [0, 0, 0, 255],
        // getBorderWidth: 0,
        // getColor: [0, 0, 0, 255],
        // getPixelOffset: [0, 0],
        getFilterValue: d => [d.persons],
        filterRange: [[countFrom, countTo]],
        getPosition: d => [d.x, d.y],
        getSize: d=> (currentZoom*currentZoom/100) *  1/Math.pow(d.persons,0.35) * 90,
        getText: d => ""+d.persons,
        getTextAnchor: 'middle',
        // lineHeight: 1,
        // maxWidth: -1,
        // outlineColor: [0, 0, 0, 255],
        // outlineWidth: 0,
        // sizeMaxPixels: Number.MAX_SAFE_INTEGER,
        // sizeMinPixels: 0,
        sizeScale: 1,
        // sizeUnits: 'pixels',
        // wordBreak: 'break-word',
        
        /* props inherited from Layer class */
        
        // autoHighlight: false,
        // coordinateOrigin: [0, 0, 0],
        // coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
        // highlightColor: [0, 0, 128, 128],
        // modelMatrix: null,
        // opacity: 1,
        //pickable: true,
        updateTriggers: {
          // This tells deck.gl to recalculate radius when `currentYear` changes
          getSize : [currentZoom]
         
        },
        extensions: [new DataFilterExtension({filterSize: 1})]    
        // visible: true,
        // wrapLongitude: false,
      })
    
  ];


  deckOverlay.setProps({
    layers : layers
  });  
  
  
  context1.clearRect(0, 0, canvas1.width, canvas1.height);

  context1.textBaseline = 'middle';
  context1.textAlign = 'center';
  context1.fillStyle = 'white';
  context1.font = 'bold 15px Arial';
  context1.fillText("데이터 : 학교알리미  |  전교생 120명 경계로 색상 구분 | 필터링 된 학교 수 : "+filteredCount+"개소", canvas1.width/2, canvas1.height-40);
  context1.font = 'bold 30px Arial';
  context1.fillText("2022년 전국 초등학교 학생 수", canvas1.width/2, canvas1.height-70);


};


map.on('zoom', () => {
  textFeature.selectAll(".number").remove();
  currentZoom = map.getZoom();
  update();

});
map.on('move', () => {
  textFeature.selectAll(".number").remove();
});

//document.getElementById("container").onclick = update;
map.addControl(deckOverlay);

window.addEventListener("keydown", (e) => {
  console.log(e);

  update();
});


const $rangeTime = $("#timeSlider");
$rangeTime.ionRangeSlider();
const sliderInstance = $rangeTime.data("ionRangeSlider");

sliderInstance.update({
  skin: "big",
  type: "double",
  //grid : true,
  min: 1,
  max: 2296,
  //values: valueGrid,
  from: 1,
  to : 2296,        
  step : 1,
  //prettify_enabled: true,
  //prettify_separator: ",",
  //prettify : (n) => ( Math.pow(Math.exp(1),n).toFixed(2)),
  postfix: "명",
  // onStart: (sliderData) => { 
  //   yearFrom = sliderData.from;
  //   yearTo = sliderData.to;
  //   update();
  // },
  onChange:  (sliderData) => { 
    countFrom = sliderData.from;
    countTo = sliderData.to;
    filteredCount = schoolData.filter(d=>d.persons<=countTo&& d.persons>=countFrom).length;
    update();
  }
});




window.addEventListener('resize', function() {
  const w = window.innerWidth, h = window.innerHeight;

  d3.select("#textCanvas")
      .attr("width", w)
      .attr("height", 100);  
  d3.select("#popupText")
      .attr("width", w)
      .attr("height", h);  
  update();
});
