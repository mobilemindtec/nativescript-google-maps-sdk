# nativescript-google-maps-sdk

Read Google Maps ApI Documentation at https://developers.google.com/maps/documentation/android-api/intro

Atention!!!! Don't forget of add google-service.json at platforms/android app folder and update you android api, because gradle plugin
and dependencies use local libs

## Android 

### Android Dependencies

Add in classpath 'com.google.gms:google-services:1.5.0' in buildScript dependencies
```
buildscript {
    repositories {
        jcenter()
    }

    dependencies {
        classpath "com.android.tools.build:gradle:1.3.1"
        classpath 'com.google.gms:google-services:1.5.0'
    }
}
```

### Android configuration

Create a new entry at App_Resources/values/strings.xml with a api key value
```
<string name="nativescript_google_maps_api_key">your api key</string>
```
Change the AndroidManifest.xml to add in 

```
  <uses-permission android:name="android.permission.INTERNET"/>
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>  
  <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
  <uses-permission android:name="com.google.android.providers.gsf.permission.READ_GSERVICES"/>
  
<application>
   <meta-data android:name="com.google.android.geo.API_KEY" android:value="@string/nativescript_google_maps_api_key"/>
</application>
```

## IOS

### Info.plist

```
<key>NSLocationWhenInUseUsageDescription</key>
<string></string>	

<key>NSAppTransportSecurity</key>
<dict>
	<key>NSAllowsArbitraryLoads</key>
	<true/>
</dict>
```

### app.ios.js

```
var application = require("application");
var GOOGLE_MAPS_API_KEY = "your api key"
var MyDelegate = (function (_super) {
    __extends(MyDelegate, _super);
    function MyDelegate() {
        _super.apply(this, arguments);
    }
    MyDelegate.prototype.applicationDidFinishLaunchingWithOptions = function (application, launchOptions) {
    	GMSServices.provideAPIKey(GOOGLE_MAPS_API_KEY);
        return true
    };
    MyDelegate.prototype.applicationOpenURLSourceApplicationAnnotation = function (application, url, sourceApplication, annotation) {
        return false
    };
    MyDelegate.prototype.applicationDidBecomeActive = function (application) {
        
    };
    MyDelegate.prototype.applicationWillTerminate = function (application) {
        //Do something you want here
    };
    MyDelegate.prototype.applicationDidEnterBackground = function (application) {
        //Do something you want here
    };
    MyDelegate.ObjCProtocols = [UIApplicationDelegate];
    return MyDelegate;
}(UIResponder));
application.ios.delegate = MyDelegate;
application.start({ moduleName: "main-page" });
```

### Layout

```
<Page loaded="loaded" xmlns="http://www.nativescript.org/tns.xsd" 
  xmlns:maps="nativescript-google-maps-sdk"
  actionBarHidden="true">
  <Page.actionBar>
    <ActionBar title="Map"></ActionBar>
  </Page.actionBar>

  <GridLayout id='layout' rows="*, auto">


      <maps:mapView id="mapView" 
          latitude="{{ mapa.latitude }}" 
          longitude="{{ mapa.longitude }}"                                 
          zoom="18" 
          row="0"
          verticalAlignment="stretch"
          horizontalAlignment="stretch"
          draggable="true"
          mapReady="OnMapReady" />
  </GridLayout>
</Page>

```

## Use plugin  - implament map init on callback

```
var mapView, gMap
var viewModel = new observableModule.Observable({
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

// init map
exports.OnMapReady =  function(args) {
  mapView = args.object;
  gMap = mapView.gMap;
  mapView.enableDefaultFullOptions() 
  mapView.setOnInfoWindowClickListener(mapCallback.onInfoWindowClickCallback)
  mapView.setOnInfoWindowCloseListener(mapCallback.onInfoWindowCloseCallback)    
  mapView.setOnMarkerClickListener(mapCallback.onMarkerClickCallback)
  mapView.setCameraPositionChangeListener(mapCallback.onCameraPositionChange)
}
```

### Features

* Add markers / custon icon pin
* Trace route / navigate
* Fit bounds
* Custon window marker
* Events - marker click, marker drag, window marker click, map postion change
* Get/add my location
* Clear markers
* Fit Bounds
* Distance between two coordenates: 
* Open Google Navigator
* Open Google Street View

```
var distance = mapView.distance({
	origin: {latitude: 0, longitude: 0},
	destination: {latitude: 0, longitude: 0}
})
```

```
var MapCallback = function(){

  MapCallback.onInfoWindowClickCallback = function(args, notShowInfo) {  
    console.log("### onInfoWindowClickCallback")
  }

  MapCallback.onMarkerClickCallback = function(args){
    console.log("### onMarkerClickCallback")
  }

  MapCallback.onInfoWindowCloseCallback = function(args) {
  }
  
  MapCallback.onCameraPositionChange = function(args){
      // args= { latitude: 0, longitude: 0, visibleRegion: { left: 0, top: 0, right: 0, bottom: 0, } }
  }
  
  MapCallback.prototype.openGoogleNavigator = function(){
	mapView.navigateWithGoogleNavigator({
		latitude: 0,
		longitude: 0      
	})      
  }
  
  MapCallback.prototype.openGoogleStreetView = function(){
	mapView.openGoogleStreetView({
		latitude: 0,
		longitude: 0      
	})      
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
      // iconPath
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
```
