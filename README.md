# nativescript-google-maps-sdk

Read Google Maps ApI Documentation at https://developers.google.com/maps/documentation/android-api/intro

Atention!!!! Don't forget of add google-service.json at platforms/android app folder and update you android api, because gradle plugin
and dependencies use local libs

## Dependencies

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

Add in dependencies 

```
  // run tns install, add this line before compile
  compile "com.android.support:recyclerview-v7:$suppotVer"

  compile "com.google.android.gms:play-services-maps:8.3.0"
```

## Android configuration

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

## Layout

```
<Page loaded="loaded" xmlns="http://www.nativescript.org/tns.xsd" 
  xmlns:maps="/modules/nativescript-google-maps-sdk"
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

## Use plugin

```
var mapView, gMap

var mapa = {
  latitude: -29.1819607,
  longitude: -51.4926093,
  title: "Default Location",
  snippet: "Default Location"
} 

// init map
exports.OnMapReady =  function(args) {
  mapView = args.object;
  gMap = mapView.gMap;

  mapView.enableDefaultFullOptions()
  mapView.addMarker(mapa)  
  
  mapView.setInicialPositionEstou(function(){
    // initial position ok  
  })
  
  // update map position each 1 min
  //mapView.enableOndeEstouListener(function(){
  //})
  
}
```
```
// update map

    var mapa = {
      clear: true,
      latitude: latitude,
      longitude: longitude,
      title: "",
      snippet: ""
    }
    
    mapView.addMarker(mapa)
```
