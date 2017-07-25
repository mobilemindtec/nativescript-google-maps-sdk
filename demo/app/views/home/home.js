var observableModule = require("data/observable");
var frameModule = require("ui/frame");

var gMap, mapView
var currentPoint = 0

var points = [

	{latitude:    -29.46639709, longitude:    -51.34054359, title: 'Point A', snippet: 'Point A'}, 
	{latitude:    -29.04496162, longitude:    -51.59329193, title: 'Point B', snippet: 'Point B'}, 
	{latitude:    -28.9324832, longitude:    -51.27788887, title: 'Point C', snippet: 'Point C'}, 
	{latitude:    -29.2429772, longitude:    -51.57696499, title: 'Point D', snippet: 'Point D'}, 
	{latitude:    -29.18442059, longitude:    -51.39928032, title: 'Point E', snippet: 'Point E'}, 
	{latitude:    -29.01078565, longitude:    -51.66109675, title: 'Point F', snippet: 'Point F'}, 
	{latitude:    -29.23758643, longitude:    -51.80653517, title: 'Point G', snippet: 'Point G'}, 
	{latitude:    -29.41391057, longitude:    -51.61129757, title: 'Point H', snippet: 'Point H'}, 
	{latitude:    -29.24499528, longitude:    -51.95953908, title: 'Point I', snippet: 'Point I'}, 
	{latitude:    -29.32355482, longitude:   -51.45993464, title: 'Point J', snippet: 'Point J'}, 

]

for (var i = 0; i < points.length; i++) {
	var point = points[i]

	 point.rightControls = true           
    point.useCustonWindow = true
    point.email = "suporte@mobilemind.com.br"
    point.phone = "(54) 9976-7081"
    point.openOnClick = true
    point.windowImgPath = "res://icon"

};


var viewModel = new observableModule.fromObject({
  'mapa': {
    latitude: -29.1819607,
    longitude: -51.4926093,
    title: "Padrão",
    snippet: "Padrão"
  }
})

exports.loaded = function(args) {
  var page = args.object;  
  page.bindingContext = viewModel;
}

exports.onMarkerAdd = function(){
	mapCallback.addMarker()	
}

exports.onFitBounds = function(){
	mapCallback.onFitBounds()	
}

exports.onMyLocation = function(){
	mapCallback.onMyLocation()
}

exports.onClear = function(){
  mapCallback.clear()
}

exports.onRoute = function(){
  mapCallback.navigate()
}

exports.OnMapReady =  function(args) {
  mapView = args.object;
  gMap = mapView.gMap;
  mapView.enableDefaultFullOptions() 
  //mapView.setOnInfoWindowClickListener(mapCallback.onInfoWindowClickCallback)
  //mapView.setOnInfoWindowCloseListener(mapCallback.onInfoWindowCloseCallback)    
  //mapView.setOnMarkerClickListener(mapCallback.onMarkerClickCallback)
}

var MapCallback = function(){

  MapCallback.onInfoWindowClickCallback = function(args, notShowInfo) {  

    console.log("### onInfoWindowClickCallback")

  }

  MapCallback.onMarkerClickCallback = function(args){
    console.log("### onMarkerClickCallback")
    this.onInfoWindowClickCallback.call(this, args, true)
  }

  MapCallback.onInfoWindowCloseCallback = function(args) {

  }

  MapCallback.addMarker = function(){

  	if(currentPoint >= points.length){
  		this.clear()
  		currentPoint  = 0
  	}


  	var current = points[currentPoint++]

  	mapView.addMarker(current)  	
  	
  }  

  MapCallback.clear = function(){
    mapView.clear()
  }

  MapCallback.onFitBounds = function(){
  	mapView.fitBounds()
  }

  MapCallback.onMyLocation = function(){
  	mapView.clear()
  	mapView.addMyLocationMarker({
      updateCamera: true,
      title: "My Location",
      snippet: "My Location",
      rightControls: true,           
      useCustonWindow: true,
      email: "suporte@mobilemind.com.br",
      phone: "(54) 9976-7081",
      openOnClick: true,
      windowImgPath: "res://icon",
    })
  }

  MapCallback.navigate = function(){

  	mapView.getMyLocationMarker(function(args){
  	    
        console.log("## getMyLocationMarker is done")
        
  	    mapView.navigateEnable({

  	      doneFirstRote: function(){
  	        
  	        console.log("## done first route")
  	      },                

  	      origin: {
  	        title: 'My Location - Origin',
  	        snippet: 'My Location - Origin',      
  	        rightControls: true,      
  	        showWindow: false,
  	        windowImgPath:  "res://icon",      
  	        openOnClick: true,      
  	        latitude: args.latitude,
  	        longitude: args.longitude,
  	        updateCamera: true
  	      },
  	      
  	      destination: points[3]       
  	  
  		})
	})           
  }  

  return MapCallback
}

var mapCallback = new MapCallback()