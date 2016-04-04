var application = require("application");
var common = require("./map-view-common");
var platformModule = require("platform");
var dialogs = require("ui/dialogs");
var route = require("./route");
require("utils/module-merge").merge(common, module.exports);

var onlyInitialPosition = false
var _myLocationUpdateCallback 
var _myLocationUpdateRouteCallback 
var _onMarkerDragListener
var _onMarkerClickListener
var _cameraPosition
var _locationListener
var mLocationManager
var isNetworkEnabled
var isProviderEnabled

var markersWindowImages = {}
var openedMarker
var routeTask = new route.RouteTask();   

var MapView = (function (_super) {
  __extends(MapView, _super);
  function MapView() {
    _super.apply(this, arguments);
  }

  var self = this

  var _onMarkerDragListener = new com.google.android.gms.maps.GoogleMap.OnMarkerDragListener({
    
    onMarkerDrag: function(marker){
      if(self._onMarkerDragCallback && self._onMarkerDragCallback.onMarkerDrag){
        self._onMarkerDragCallback.onMarkerDrag({
                'marker': marker,
                'markerKey': markersWindowImages[marker] ? markersWindowImages[marker].markerKey : null
              })
      }
    },

    onMarkerDragEnd: function(marker){
      var position = marker.getPosition()
      this.latitude = position.latitude
      this.longitude = position.longitude
      console.log("############## onMarkerDragEnd")

      if(self._onMarkerDragCallback && self._onMarkerDragCallback.onMarkerDragEnd){
        self._onMarkerDragCallback.onMarkerDragEnd({
                'marker': marker,
                'markerKey': markersWindowImages[marker] ? markersWindowImages[marker].markerKey : null
              })
      }
    },

    onMarkerDragStart: function(marker){
      if(self._onMarkerDragCallback && self._onMarkerDragCallback.onMarkerDragStart){
        self._onMarkerDragCallback.onMarkerDragStart({
                'marker': marker,
                'markerKey': markersWindowImages[marker] ? markersWindowImages[marker].markerKey : null
              })
      }
    },

  })

  var _onCameraChangeListener = new com.google.android.gms.maps.GoogleMap.OnCameraChangeListener({
    
     onCameraChange: function(position){      
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

    /*
    var zoomParams = new android.widget.RelativeLayout.LayoutParams(
            android.widget.RelativeLayout.LayoutParams.FILL_PARENT, android.widget.RelativeLayout.LayoutParams.FILL_PARENT);
    var controlls = this._android.findViewById(0x1);
  
    controlls.setGravity(android.view.Gravity.BOTTOM | android.view.Gravity.LEFT);


    zoomParams.addRule(android.widget.RelativeLayout.ALIGN_PARENT_BOTTOM);
    zoomParams.addRule(android.widget.RelativeLayout.ALIGN_PARENT_LEFT);

    var margin = android.util.TypedValue.applyDimension(android.util.TypedValue.COMPLEX_UNIT_DIP, 10,
            this._context.getResources().getDisplayMetrics());
    zoomParams.setMargins(margin, margin, margin, margin);
    controlls.setLayoutParams(zoomParams);


    var controll2 = this._android.findViewById(0x4);
    console.log("#################### >>> " + controll2)
    */
    
    if(this.zoonMargin){
      var zoomControls = this._android.findViewById(0x1);        
      var params = zoomControls.getLayoutParams();
      var margin = android.util.TypedValue.applyDimension(android.util.TypedValue.COMPLEX_UNIT_DIP, this.zoonMargin,
              this._context.getResources().getDisplayMetrics());
      params.setMargins(margin, margin, margin, margin);
      zoomControls.setLayoutParams(params)      
    }
    


    var mapReadyCallback = new com.google.android.gms.maps.OnMapReadyCallback({
      onMapReady: function (gMap) {
        var mView = that.get();

        mView._gMap = gMap;
        if(mView._pendingCameraUpdate) {          
          mView.updateCamera();
        }

        if(self.draggable)
          mView._gMap.setOnMarkerDragListener(_onMarkerDragListener)


        if(self.useCustonWindow && self.useCustonWindow == true){
          mView._gMap.setInfoWindowAdapter(createCustonWindowMarker());           
        }

        mView._gMap.setOnInfoWindowClickListener(new com.google.android.gms.maps.GoogleMap.OnInfoWindowClickListener({
           onInfoWindowClick: function(marker){
            if(self._onInfoWindowClickCallback && markersWindowImages[marker].openOnClick)
              self._onInfoWindowClickCallback({
                'marker': marker,
                'markerKey': markersWindowImages[marker] ? markersWindowImages[marker].markerKey : null
              })
           }
        }))
        
        mView._gMap.setOnInfoWindowCloseListener(new com.google.android.gms.maps.GoogleMap.OnInfoWindowCloseListener({
           onInfoWindowClose: function(marker){
            if(self._onInfoWindowCloseCallback) 
              self._onInfoWindowCloseCallback({
                'marker': marker,
                'markerKey': markersWindowImages[marker] ? markersWindowImages[marker].markerKey : null
              })
           }
        }))

        mView._gMap.setOnInfoWindowLongClickListener(new com.google.android.gms.maps.GoogleMap.OnInfoWindowLongClickListener({
           onInfoWindowLongClick: function(marker){
            if(self._onInfoWindowLongCallback && markersWindowImages[marker].openOnClick)
              self._onInfoWindowLongCallback({
                'marker': marker,
                'markerKey': markersWindowImages[marker] ? markersWindowImages[marker].markerKey : null
              })
           }
        }))


        mView._gMap.setOnMarkerClickListener(new com.google.android.gms.maps.GoogleMap.OnMarkerClickListener({
           onMarkerClick: function(marker){

            if(_onMarkerClickListener)
              _onMarkerClickListener(marker)

            if(self._onMarkerClickCallback)
              self._onMarkerClickCallback({
                'marker': marker,
                'markerKey': markersWindowImages[marker] ? markersWindowImages[marker].markerKey : null
              })
            
            marker.showInfoWindow()

            return true
 
           }
        }))

        mView._gMap.setOnMapClickListener(new com.google.android.gms.maps.GoogleMap.OnMapClickListener({
          onMapClick: function(point){
            //self.createLooperAnimateCamera(point)
          }
        }))
        
        if(mView._gMap.draggable)
          mView._gMap.setOnMarkerDragListener(_onMarkerDragListener) 

        if(!self.mapType)
          self.mapType = com.google.android.gms.maps.GoogleMap.MAP_TYPE_NORMAL
        
        mView._gMap.setMapType(self.mapType);


        _onMarkerClickListener = function(marker){
          self.updateCameraToMarker(marker)
        }

        mView._emit(MapView.mapReadyEvent);
        
      }
    });

    this._android.getMapAsync(mapReadyCallback);
  };


  MapView.prototype.loopAnimateCamera = function(updates) {
    var update = updates.pop()
    var self = this

    if(!update)
      return

    this.gMap.animateCamera(update, 1000, new com.google.android.gms.maps.GoogleMap.CancelableCallback({
      
      onFinish: function() {
        self.loopAnimateCamera(updates)
      },
      
      onCancel: function() {
        console.log("camera animation cancelled")
      }
    }))
  }

  MapView.prototype.createLooperAnimateCamera = function(position){
      var updates = []
      var builder = com.google.android.gms.maps.model.CameraPosition.builder()
      builder.target(position)
      updates.push(com.google.android.gms.maps.CameraUpdateFactory.newCameraPosition(builder.build()))
      builder.target(new com.google.android.gms.maps.model.LatLng(position.latitude + 20, position.longitude))
      updates.push(com.google.android.gms.maps.CameraUpdateFactory.newCameraPosition(builder.build()))
      builder.bearing(90)
      updates.push(com.google.android.gms.maps.CameraUpdateFactory.newCameraPosition(builder.build()))
      builder.target(new com.google.android.gms.maps.model.LatLng(position.latitude + 20, position.longitude + 40))
      updates.push(com.google.android.gms.maps.CameraUpdateFactory.newCameraPosition(builder.build()))
      builder.bearing(180)
      updates.push(com.google.android.gms.maps.CameraUpdateFactory.newCameraPosition(builder.build()))
      builder.target(new com.google.android.gms.maps.model.LatLng(position.latitude, position.longitude + 40))
      updates.push(com.google.android.gms.maps.CameraUpdateFactory.newCameraPosition(builder.build()))
      builder.bearing(270)
      updates.push(com.google.android.gms.maps.CameraUpdateFactory.newCameraPosition(builder.build()))
      builder.target(position)
      updates.push(com.google.android.gms.maps.CameraUpdateFactory.newCameraPosition(builder.build()))
      this.loopAnimateCamera(updates)
  }

  MapView.prototype.navigateEnable = function(params){

         

    var self = this
    var origin = params.origin
    var destination = params.destination

    var overlayAction = function(args){      
      self.addMarker(args.origin)
      self.addMarker(args.destination)
    }

    if(origin && origin.latitude && origin.longitude){

      overlayAction({
        origin: origin,
        destination: destination
      })

      var builder = new com.google.android.gms.maps.model.LatLngBounds.Builder();
      builder.include(new com.google.android.gms.maps.model.LatLng(origin.latitude, origin.longitude))
      builder.include(new com.google.android.gms.maps.model.LatLng(parseFloat(destination.latitude), parseFloat(destination.longitude)))
      var bounds = builder.build();
      var padding = 50
      var camUpdate = com.google.android.gms.maps.CameraUpdateFactory.newLatLngBounds(bounds, padding);
      /// move the camera
      this._gMap.moveCamera(camUpdate);
      //or animate the camera...
      this._gMap.animateCamera(camUpdate)

      routeTask.execute({origin: origin, destination: destination, mapView: this._gMap})
    }

    if(params.doneFirstRote)
      params.doneFirstRote()


    this.enableMyLocationUpdateListener({
      minTime: 60000,
      minDistance: 10,
      myLocationRouteCallback: function(args){

        console.log("### myLocationRouteCallback")

        origin.latitude = args.latitude
        origin.longitude = args.longitude


        overlayAction({
          origin: origin,
          destination: destination
        })


        
        routeTask.execute({origin: origin, destination: destination, mapView: self._gMap})
      }
    })   
  }

  MapView.prototype.navigateDisable = function(){
    _myLocationUpdateCallback = null
    routeTask.remove()
  }

  MapView.prototype._createCameraPosition = function() {

    if(isNaN(this.latitude) || isNaN(this.longitude)){
      console.log("## not latitude or longitude")
      return
    }

    if(this.latitude == 0 || this.longitude == 0){
      console.log("## latitude or longitude equals 0")
      return
    }

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

    if(this.latitude && this.longitude && this.latitude != 0 && this.longitude != 0){

      var cameraPosition = this._createCameraPosition();
      if(!cameraPosition) return;

      if(!this._gMap) {
        this._pendingCameraUpdate = true
        return;
      }

      this._pendingCameraUpdate = false;

      var cameraUpdate = com.google.android.gms.maps.CameraUpdateFactory.newCameraPosition(cameraPosition);
      this.gMap.moveCamera(cameraUpdate);

      //console.log('## updateCamera')

    }
  }

  MapView.prototype.updateCameraToMarker = function(marker){   

    //console.log("## updateCameraToMarker " + this.gMap)

    var self = this
    var position = marker.getPosition()
    var newLatLngZoom = com.google.android.gms.maps.CameraUpdateFactory.newLatLngZoom(position, 14)
    this.gMap.animateCamera(newLatLngZoom, 1000, new com.google.android.gms.maps.GoogleMap.CancelableCallback({

      onFinish: function() {
        var projection = self.gMap.getProjection()
        var point = projection.toScreenLocation(position)
        point.x -= 100
        point.y -= 100
        var offsetPosition = projection.fromScreenLocation(point)
        var newLatLng = com.google.android.gms.maps.CameraUpdateFactory.newLatLng(offsetPosition)
        self.gMap.animateCamera(newLatLng, 300, null)
      },

      onCancel: function() {
      }

    }))
  }

  MapView.prototype.fitBounds = function(centerMarker){
    var builder = new com.google.android.gms.maps.model.LatLngBounds.Builder();
    
    for (var marker in markersWindowImages) {
        builder.include(marker.getPosition());
    }
    
    var bounds = builder.build();    

    var padding = 0; // offset from edges of the map in pixels
    var cu = com.google.android.gms.maps.CameraUpdateFactory.newLatLngBounds(bounds, padding);
    this.gMap.animateCamera(cu);
  }

  MapView.prototype.enableDefaultFullOptions = function() {
      var uiSettings = this._gMap.getUiSettings();
      uiSettings.setZoomControlsEnabled(true);
      uiSettings.setZoomGesturesEnabled(true);
      uiSettings.setScrollGesturesEnabled(true);
      uiSettings.setTiltGesturesEnabled(true);
      uiSettings.setRotateGesturesEnabled(true);
      uiSettings.setCompassEnabled(true);
      uiSettings.setIndoorLevelPickerEnabled(true);
  };

  MapView.prototype.addMarker = function(opts) {

    
    /*
    console.log("####################### MapView.prototype.addMarker")
    console.log(JSON.stringify(opts))
    console.log("####################### MapView.prototype.addMarker")
    */

    var self = this

    if(this.draggable == undefined || this.draggable == null)
      this.draggable = false

    if(opts.latitude && opts.longitude){
      this.latitude = undefined
      this.longitude = undefined
      
      this.latitude = opts.latitude
      this.longitude = opts.longitude
    }    

    if(opts.title)
      this.title = opts.title

    if(opts.snippet)
      this.snippet = opts.snippet

    if(!this.snippet || this.snippet === 0)
      this.snippet = ""

    if(!this.title || this.title === 0)
      this.title = ""

    var iconToUse = null

    if(!opts.iconPath){
      iconToUse = com.google.android.gms.maps.model.BitmapDescriptorFactory.defaultMarker(com.google.android.gms.maps.model.BitmapDescriptorFactory.HUE_AZURE)
    }else{
      if(opts.iconPath.indexOf('res://') > -1){
        var ctx = application.android.context
        var resName = opts.iconPath.substring('res://'.length, opts.iconPath.length)
        console.log("#### resName=" + resName)
        var restId = ctx.getResources().getIdentifier(resName, "drawable", ctx.getPackageName());
        console.log("#### restId=" + restId)
        iconToUse  = com.google.android.gms.maps.model.BitmapDescriptorFactory.fromResource(restId)
      }else{
        iconToUse  = com.google.android.gms.maps.model.BitmapDescriptorFactory.fromPath(opts.iconPath)        
      }
    }

    if(opts.clear)
      this.clear()


    var markerOptions = new com.google.android.gms.maps.model.MarkerOptions();
    var latLng = new com.google.android.gms.maps.model.LatLng(this.latitude, this.longitude);
    
    markerOptions.title(this.title);
    markerOptions.snippet(this.snippet);    
    markerOptions.position(latLng);
    markerOptions.draggable(this.draggable);
    markerOptions.icon(iconToUse);

    openedMarker = this._gMap.addMarker(markerOptions);

    if(opts.openOnClick == undefined || opts.openOnClick == null)
      opts.openOnClick = true

    
    markersWindowImages[openedMarker] = {
      'markerKey': opts.markerKey,
      'windowImgPath': opts.windowImgPath,
      'phone': opts.phone || "",
      'email': opts.email || "",
      'openOnClick': opts.openOnClick
    }
  

    if(opts.showWindow){
      openedMarker.showInfoWindow()
    }   

    if(opts.updateCamera){
      console.log("## opts.updateCamera=" + opts.updateCamera)
      this.updateCamera()
    }

    return openedMarker
  };

  MapView.prototype.clear = function(){
    this._gMap.clear()
  }

  MapView.prototype.closeMarker = function(){
    if(openedMarker){
      openedMarker.setVisible(true)
    }
  }

  MapView.prototype.hideWindow = function(){
    if(openedMarker){
      openedMarker.hideInfoWindow()
    }    
  }

  MapView.prototype.showWindow = function(){
    if(openedMarker){
      openedMarker.showInfoWindow()
    }
  }


  MapView.prototype.enableMyLocationUpdateListener = function(params) {
    
    mLocationManager =  application.android.context.getSystemService(android.content.Context.LOCATION_SERVICE);

    var isGPSEnabled = mLocationManager
            .isProviderEnabled(android.location.LocationManager.GPS_PROVIDER);

    // getting network status
    var isNetworkEnabled = mLocationManager
            .isProviderEnabled(android.location.LocationManager.NETWORK_PROVIDER);


    _locationListener = this.createLocationListener()

    params.minTime = params.minTime ? params.minTime : 60000
    params.minDistance = params.minDistance ? params.minDistance : 10

    if(isNetworkEnabled){
      mLocationManager.requestLocationUpdates(android.location.LocationManager.NETWORK_PROVIDER, params.minTime,
              params.minDistance, _locationListener);   
    }
    else if(isGPSEnabled){
      mLocationManager.requestLocationUpdates(android.location.LocationManager.GPS_PROVIDER, params.minTime,
              params.minDistance, _locationListener);   
    }
    else{
      showProvedorDisabledAlert()
    }

    _myLocationUpdateCallback = params.myLocationUpdateCallback
    _myLocationUpdateRouteCallback = params.myLocationUpdateRouteCallback

  };  

  function getLastLocalization(){

    mLocationManager =  application.android.context.getSystemService(android.content.Context.LOCATION_SERVICE);

    var lastLocation
    var isGPSEnabled = mLocationManager
            .isProviderEnabled(android.location.LocationManager.GPS_PROVIDER);

    // getting network status
    var isNetworkEnabled = mLocationManager
            .isProviderEnabled(android.location.LocationManager.NETWORK_PROVIDER);


    if(isNetworkEnabled)
      lastLocation = mLocationManager.getLastKnownLocation(android.location.LocationManager.NETWORK_PROVIDER)    

    if(isGPSEnabled && !lastLocation)
      lastLocation = mLocationManager.getLastKnownLocation(android.location.LocationManager.GPS_PROVIDER)    

    return lastLocation
  }

  MapView.prototype.addMyLocationMarker = function(args) {

    args = args || {}
    var lastLocation = getLastLocalization()

    if(lastLocation){
      console.log('############## has lastLocation')
        
      args.slatitude =  lastLocation.getLatitude() 
      args.longitude = lastLocation.getLongitude()
      
      this.addMarker(args)

    }else{
      console.log('############## not has lastLocation')
      onlyInitialPosition = true    
      this.enableMyLocationUpdateListener({
      minTime: 10, 
      minDistance: 1,
      myLocationUpdateCallback:  function(location){
          args.latitude = location.latitude
          args.longitude = location.longitude
          self.addMarker(args)
        }
      })
    }
  };  

  MapView.prototype.getMyLocationMarker = function(myLocationUpdateCallback) {    
    var self = this
    onlyInitialPosition = true    
    this.enableMyLocationUpdateListener({
      minTime: 10, 
      minDistance: 1,
      myLocationUpdateCallback:  myLocationUpdateCallback
    })
  };   

  MapView.prototype.disableMyLocationUpdateListener = function(){
    if(_locationListener && mLocationManager)
      mLocationManager.removeUpdates(_locationListener)

    onlyInitialPosition = false
  }

  MapView.prototype.createLocationListener = function(){
    
    var self = this

    console.log("############# createLocationListener")

    var locationListener = new android.location.LocationListener({
      onLocationChanged: function(location){

        console.log("############# location updated to " + location)


          if(onlyInitialPosition){
            self.disableMyLocationUpdateListener()
          }
          

          var args = {
            latitude: location.getLatitude(), 
            longitude: location.getLongitude(),
          }

          if(_myLocationUpdateRouteCallback)
            _myLocationUpdateRouteCallback(args)

          if(_myLocationUpdateCallback)
            _myLocationUpdateCallback(args)

          
      },

      onProviderDisabled: function(provider){ 
        console.log("############# locationListener.onProviderDisabled ")     
        showGpsDisabledAlert()
      },
      onProviderEnabled: function(provider){ 
        console.log("############# locationListener.onProviderEnabled ") 
      },
      onStatusChanged: function(provider, status, extras){ 
        console.log("############# locationListener.onStatusChanged ") 
      }

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

  function showGpsDisabledAlert(){
    var intent = new android.content.Intent(android.provider.Settings.ACTION_LOCATION_SOURCE_SETTINGS);

    dialogs.confirm({
      title: "Aviso",
      message: "Seu GPS está desabilitado!",
      okButtonText: "Configurações",
      cancelButtonText: "Cancelar"
    }).then(function (result) {                          
        if(result)
          application.android.currentContext.startActivity(intent);
    });        
  }

  function showProvedorDisabledAlert(){
    var intent = new android.content.Intent(android.provider.Settings.ACTION_LOCATION_SOURCE_SETTINGS);

    dialogs.confirm({
      title: "Aviso",
      message: "Nenhum provedor GPS ativo. Habilite seu GPS ou conecte sua internet.",
      okButtonText: "Configurações",
      cancelButtonText: "Cancelar"
    }).then(function (result) {                          
        if(result)
          application.android.currentContext.startActivity(intent);
    });        
  }  


  function capitalize(text) {
    return text.replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
  };

  function createCustonWindowMarker(){

    return new com.google.android.gms.maps.GoogleMap.InfoWindowAdapter({
        
          
        getInfoWindow: function(marker) {
            var ctx = application.android.context
            var custom_info_window = ctx.getResources().getIdentifier('custom_info_window', "layout", ctx.getPackageName());
            var mWindow = application.android.foregroundActivity.getLayoutInflater().inflate(custom_info_window, null);
            this.render(marker, mWindow);
            return mWindow;
        },

        getInfoContents: function(marker) {
          var ctx = application.android.context
            var custom_info_contents = ctx.getResources().getIdentifier('custom_info_contents', "layout", ctx.getPackageName());
            var mContents = application.android.foregroundActivity.getLayoutInflater().inflate(custom_info_contents, null);
            this.render(marker, mContents);
            return mContents;
        },

        render: function(marker, view) {

            var ctx = application.android.context
            var width = platformModule.screen.mainScreen.widthPixels

            var badge = null

            if(markersWindowImages[marker] && markersWindowImages[marker].windowImgPath)
              badge = markersWindowImages[marker].windowImgPath
            else
              console.log('## not has image to custon window')
                  
            if(badge){
              var bitmap = android.graphics.BitmapFactory.decodeFile(badge);
              var badge_id = ctx.getResources().getIdentifier('badge', "id", ctx.getPackageName());
              view.findViewById(badge_id).setImageBitmap(bitmap);                            
            } 

            var title = marker.getTitle();
            var title_id = ctx.getResources().getIdentifier('title', "id", ctx.getPackageName());
            var titleUi = view.findViewById(title_id);

            if (title != null) {
                var titleText = new android.text.SpannableString(title);
                titleUi.setText(titleText);
            } else {
                titleUi.setText("");
            }

            var snippet = marker.getSnippet();
            var snippet_id = ctx.getResources().getIdentifier('snippet', "id", ctx.getPackageName());
            var snippetUi = view.findViewById(snippet_id);

            if (snippet) {
                var snippetText = new android.text.SpannableString(snippet);
                snippetUi.setText(snippetText);
            } else {
                snippetUi.setText("");
            }

            var phone = markersWindowImages[marker].phone;
            var phone_id = ctx.getResources().getIdentifier('phone', "id", ctx.getPackageName());
            var phoneUi = view.findViewById(phone_id);

            if (phone) {
                var phoneText = new android.text.SpannableString(phone);
                phoneUi.setText(phoneText);
            } else {
                phoneUi.setVisibility(android.view.View.GONE);
            }

            var email = markersWindowImages[marker].email;
            var email_id = ctx.getResources().getIdentifier('email', "id", ctx.getPackageName());
            var emailUi = view.findViewById(email_id);

            if (email) {
                var emailText = new android.text.SpannableString(email);
                emailUi.setText(emailText);
            } else {
                emailUi.setVisibility(android.view.View.GONE);
            }
            
            var btnMarkerOpen_id = ctx.getResources().getIdentifier('btnMarkerOpen', "id", ctx.getPackageName());
            var btnMarkerOpenUi = view.findViewById(btnMarkerOpen_id)
 
            if(markersWindowImages[marker].openOnClick){
              btnMarkerOpenUi.setOnClickListener(new android.view.View.OnClickListener({
                onClick: function(view){
                  
                  if(self._onInfoWindowClickCallback) 
                    self._onInfoWindowClickCallback({                    
                      'markerKey': markersWindowImages[marker] ? markersWindowImages[marker].markerKey : null
                    }) 
                }
              }))
            }else{
                btnMarkerOpenUi.setVisibility(android.view.View.GONE)
            }
        },
    })    
  }

  function radians(degrees){
      return degrees * java.lang.Math.PI / 180.0
  }

  MapView.prototype.distance = function(params){
    // let's give those values meaningful variable names

    var _lat  = isNaN(params.lat) ? radians(java.lang.Double.parseDouble(params.lat)) : radians(params.lat)
    var _lng  = isNaN(params.lng) ? radians(java.lang.Double.parseDouble(params.lng)) : radians(params.lng)
    var _lat2 = isNaN(params.lat2) ? radians(java.lang.Double.parseDouble(params.lat2)) : radians(params.lat2)
    var _lng2 = isNaN(params.lng2) ? radians(java.lang.Double.parseDouble(params.lng2)) : radians(params.lng2)

    _lat  = isNaN(_lat) ? 0 : _lat
    _lng  = isNaN(_lng) ? 0 : _lng
    _lat2  = isNaN(_lat2) ? 0 : _lat2
    _lng2  = isNaN(_lng2) ? 0 : _lng2


    // calculate the distance
    var result = 6371.0 * java.lang.Math.acos(java.lang.Math.cos(_lat2) * java.lang.Math.cos(_lat) * java.lang.Math.cos(_lng - _lng2) + java.lang.Math.sin(_lat2) * java.lang.Math.sin(_lat))
    return result
  }  

  return MapView;

})(common.MapView);

exports.MapView = MapView;


