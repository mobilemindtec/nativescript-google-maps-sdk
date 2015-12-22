var application = require("application");
var common = require("./map-view-common");
require("utils/module-merge").merge(common, module.exports);

var onlyInitialPosition = false
var initialPositionUpdated = false
var updatePositionAllways = false
var _ondeEstouCallback 
var _onMarkerDragListener
var _cameraPosition
var _locationListener
var mLocationManager

var MapView = (function (_super) {
  __extends(MapView, _super);
  function MapView() {
    _super.apply(this, arguments);
  }

  var _onMarkerDragListener = new com.google.android.gms.maps.GoogleMap.OnMarkerDragListener({
    
    onMarkerDrag: function(marker){

    },

    onMarkerDragEnd: function(marker){
      var position = marker.getPosition()
      this.latitude = position.latitude
      this.longitude = position.longitude
      console.log("############## onMarkerDragEnd")
    },

    onMarkerDragStart: function(marker){

    },

  })

  var _onCameraChangeListener = new com.google.android.gms.maps.GoogleMap.OnCameraChangeListener({
    
     onCameraChange: function(position){
      console.log("############## onCameraChange")
      this.zoom = position.zoom
      _cameraPosition = position.target
    }

  })

  Object.defineProperty(MapView.prototype, "android", {
    get: function () {
      return this._android;
    },
    enumerable: true,
    configurable: true
  });

  Object.defineProperty(MapView.prototype, "gMap", {
    get: function () {
      return this._gMap;
    },
    enumerable: true,
    configurable: true
  });

  MapView.prototype.onActivityPaused = function (args) {
    if(!this.android || this._context != args.activity) return;
    this.android.onPause();
  }

  MapView.prototype.onActivityResumed = function (args) {
    if(!this.android || this._context != args.activity) return;
    this.android.onResume();
  }

  MapView.prototype.onActivitySaveInstanceState = function (args) {
    if(!this.android || this._context != args.activity) return;
    this.android.onSaveInstanceState(args.bundle);
  }

  MapView.prototype.onActivityDestroyed = function (args) {
    if(!this.android || this._context != args.activity) return;
    this.android.onDestroy();
  }

  MapView.prototype.onLoaded = function () {
    _super.prototype.onLoaded.apply(this, arguments);

    application.android.on(application.AndroidApplication.activityPausedEvent, this.onActivityPaused, this);
    application.android.on(application.AndroidApplication.activityResumedEvent, this.onActivityResumed, this);
    application.android.on(application.AndroidApplication.saveActivityStateEvent, this.onActivitySaveInstanceState, this);
    application.android.on(application.AndroidApplication.activityDestroyedEvent, this.onActivityDestroyed, this);

  }

  MapView.prototype.onUnloaded = function () {
    _super.prototype.onUnloaded.apply(this, arguments);

    application.android.off(application.AndroidApplication.activityPausedEvent, this.onActivityPaused, this);
    application.android.off(application.AndroidApplication.activityResumedEvent, this.onActivityResumed, this);
    application.android.off(application.AndroidApplication.saveActivityStateEvent, this.onActivitySaveInstanceState, this);
    application.android.off(application.AndroidApplication.activityDestroyedEvent, this.onActivityDestroyed, this);
  }

  MapView.prototype._createUI = function () {
    var that = new WeakRef(this);

    var cameraPosition = this._createCameraPosition();

    var options = new com.google.android.gms.maps.GoogleMapOptions();

    if(!_cameraPosition)
      cameraPosition = _cameraPosition

    if(cameraPosition) options = options.camera(cameraPosition);

    this._android = new com.google.android.gms.maps.MapView(this._context, options);

    this._android.onCreate(null);
    this._android.onResume();
    var self = this

    var mapReadyCallback = new com.google.android.gms.maps.OnMapReadyCallback({
      onMapReady: function (gMap) {
        var mView = that.get();
        mView._gMap = gMap;
        if(mView._pendingCameraUpdate) {
          mView.updateCamera();
        }

        if(self.draggable)
          mView._gMap.setOnMarkerDragListener(_onMarkerDragListener)

        mView._emit(MapView.mapReadyEvent);
        console.log("############### mapReadyCallback=" + mapReadyCallback)
      }
    });

    this._android.getMapAsync(mapReadyCallback);
  };

  MapView.prototype._createCameraPosition = function() {
    var cpBuilder = new com.google.android.gms.maps.model.CameraPosition.Builder();
    var update = false;

    if(!isNaN(this.latitude) && !isNaN(this.longitude)) {
      update = true;
      cpBuilder.target(new com.google.android.gms.maps.model.LatLng(this.latitude, this.longitude));
    }

    if(!isNaN(this.bearing)) {
      update = true;
      cpBuilder.bearing(this.bearing);
    }

    if(!isNaN(this.zoom)) {
      update = true;
      cpBuilder.zoom(this.zoom);
    }

    if(!isNaN(this.tilt)) {
      update = true;
      cpBuilder.tilt(this.tilt);
    }

    return (update) ? cpBuilder.build() : null;
  }

  MapView.prototype.updateCamera = function() {
    var cameraPosition = this._createCameraPosition();
    if(!cameraPosition) return;

    if(!this._gMap) {
      this._pendingCameraUpdate = true
      return;
    }

    this._pendingCameraUpdate = false;

    var cameraUpdate = com.google.android.gms.maps.CameraUpdateFactory.newCameraPosition(cameraPosition);
    this.gMap.moveCamera(cameraUpdate);
  }

  MapView.prototype.enableDefaultFullOptions = function() {
      var uiSettings = this._gMap.getUiSettings();
      uiSettings.setZoomControlsEnabled(true);
      uiSettings.setZoomGesturesEnabled(true);
      uiSettings.setScrollGesturesEnabled(true);
      uiSettings.setTiltGesturesEnabled(true);
      uiSettings.setRotateGesturesEnabled(true);
      uiSettings.setCompassEnabled(true);
  };

  MapView.prototype.addMarker = function(opts) {

    if(this.draggable == undefined || this.draggable == null)
      this.draggable = false

    if(opts.latitude)
      this.latitude = opts.latitude
    
    if(opts.longitude)
      this.longitude = opts.longitude

    if(opts.title)
      this.title = opts.title

    if(opts.snippet)
      this.snippet = opts.snippet

    if(!this.defaultIcon)
      this.defaultIcon = com.google.android.gms.maps.model.BitmapDescriptorFactory.defaultMarker(com.google.android.gms.maps.model.BitmapDescriptorFactory.HUE_AZURE)

    if(!this.mapType)
      this.mapType = com.google.android.gms.maps.GoogleMap.MAP_TYPE_HYBRID

    if(opts.clear)
      this._gMap.clear()

    console.log("################ this.title=" + this.title)
    console.log("################ this.snippet=" + this.snippet)

    var markerOptions = new com.google.android.gms.maps.model.MarkerOptions();
    markerOptions.title(this.title);
    markerOptions.snippet(this.snippet);
    var latLng = new com.google.android.gms.maps.model.LatLng(this.latitude, this.longitude);
    markerOptions.position(latLng);
    markerOptions.draggable(this.draggable);
    markerOptions.icon(this.defaultIcon);
    this._gMap.addMarker(markerOptions);
    this._gMap.setMapType(this.mapType);

    if(this.draggable)
      this._gMap.setOnMarkerDragListener(_onMarkerDragListener)    

    this.updateCamera()
  };

  MapView.prototype.enableOndeEstouListener = function(ondeEstouCallback) {
    mLocationManager =  application.android.context.getSystemService(android.content.Context.LOCATION_SERVICE);
    _locationListener = this.createLocationListener()

    mLocationManager.requestLocationUpdates(android.location.LocationManager.GPS_PROVIDER, 60000,
            10, _locationListener);   

    _ondeEstouCallback = ondeEstouCallback
    updatePositionAllways = true 
  };  

  MapView.prototype.setInicialPositionEstou = function(ondeEstouCallback) {
    onlyInitialPosition = true
    this.enableOndeEstouListener(ondeEstouCallback)
  };  

  MapView.prototype.disableOndeEstouListener = function(){
    updatePositionAllways = false
    onlyInitialPosition = false

    if(_locationListener && mLocationManager)
      mLocationManager.removeUpdates(_locationListener)
  }

  MapView.prototype.createLocationListener = function(){
    
    var self = this

    var locationListener = new android.location.LocationListener({
      onLocationChanged: function(location){
        console.log("############# location updated to " + location)


          if((onlyInitialPosition && !initialPositionUpdated) || updatePositionAllways){
            initialPositionUpdated = true

            

            console.log("################### location.getLatitude()=" + location.getLatitude())
            console.log("################### location.getLongitude()=" + location.getLongitude())


            self.addMarker({
              latitude: location.getLatitude(), 
              longitude: location.getLongitude(),
              clear: true
            })

            if(_ondeEstouCallback)
              _ondeEstouCallback()
          }
      },

      onProviderDisabled: function(provider){},
      onProviderEnabled: function(provider){},
      onStatusChanged: function(provider, status, extras){}

    })   

    return locationListener 
  };


  MapView.prototype.getLocationFromLocationName = function(args){

    return new Promise(function(resolve, reject){
      
      var geoCoder = new android.location.Geocoder(application.android.context, java.util.Locale.getDefault())
      
      args.value = capitalize(args.value).replace(new RegExp(" ", 'g'), "");

      console.log("###################################")
      console.log("##### find by " + args.value)
      console.log("###################################")

      var limit = args.limit || 5
      var addresses = geoCoder.getFromLocationName(args.value, limit);   

      resolve(addresses)

    }).then(function(addresses){
      
      var result  = []
      console.log("################")
      console.log("### addresses="+addresses.size())
      console.log("### addresses="+addresses)
      console.log("################")

      if(addresses && addresses.size() > 0){      
        for(var i = 0; i < addresses.size(); i++){

          var ad = addresses.get(i)

          result.push({
            rua: ad.getAddressLine(0),
            numero: ad.getSubThoroughfare(),
            bairro: ad.getSubLocality(),
            cidade: ad.getLocality(), 
            estado: ad.getAdminArea(),
            pais: ad.getCountryCode(),
            latitude: ad.getLatitude(),
            longitude: ad.getLongitude(),
            telefone: ad.getPhone(),
            cap: ad.getPostalCode(),
            name: ad.getFeatureName(),
            endereco: ad.toString()
          })
        }
      }        

      return result
      
    })  
  };


  function capitalize(text) {
    return text.replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
  };

  return MapView;

})(common.MapView);

exports.MapView = MapView;