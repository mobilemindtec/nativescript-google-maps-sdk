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

var MARKER_WINDOW_IMAGES = {}
var openedMarker
var routeTask = new route.RouteTask();   
var markerIconsCache = {}
var navigationOriginMarker

var MapView = (function (_super) {
  __extends(MapView, _super);
  function MapView() {
    _super.apply(this, arguments);
  }

  var self = this

  var createMarkerEventData = function(marker){
    return {
      'marker': marker,
      'markerKey': MARKER_WINDOW_IMAGES[marker] ? MARKER_WINDOW_IMAGES[marker].markerKey : null
    }
  }

  var _onMarkerDragListener = new com.google.android.gms.maps.GoogleMap.OnMarkerDragListener({
    
    onMarkerDrag: function(marker){
      if(self._onMarkerDragCallback && self._onMarkerDragCallback.onMarkerDrag)
        self._onMarkerDragCallback.onMarkerDrag(createMarkerEventData(marker))      
    },

    onMarkerDragEnd: function(marker){
      var position = marker.getPosition()
      self.latitude = position.latitude
      self.longitude = position.longitude
      if(self._onMarkerDragCallback && self._onMarkerDragCallback.onMarkerDragEnd)
        self._onMarkerDragCallback.onMarkerDragEnd(createMarkerEventData(marker))      
    },

    onMarkerDragStart: function(marker){
      if(self._onMarkerDragCallback && self._onMarkerDragCallback.onMarkerDragStart)
        self._onMarkerDragCallback.onMarkerDragStart(createMarkerEventData(marker))      
    },

  })

  var _onCameraChangeListener = new com.google.android.gms.maps.GoogleMap.OnCameraChangeListener({
    
     onCameraChange: function(position){      
      //console.log("OnCameraChangeListener position.zoom=" + position.zoom)
      self._zoom = position.zoom
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

  Object.defineProperty(MapView.prototype, "zoom", {
    get: function () {
      return this._zoom;
    },
    set: function(value){
      this._zoom = value
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
    var self = this

    var cameraPosition = this._createCameraPosition();

    var options = new com.google.android.gms.maps.GoogleMapOptions();

    if(!_cameraPosition)
      cameraPosition = _cameraPosition

    if(cameraPosition) options = options.camera(cameraPosition);

    var MapViewWrapper = com.google.android.gms.maps.MapView.extend({

      onInterceptTouchEvent: function(ev){

        if(ev.getAction() == android.view.MotionEvent.ACTION_DOWN)
          self._mapIsTouched = true
        else if(ev.getAction() ==   android.view.MotionEvent.ACTION_UP){
          self._mapIsTouched = false        
        
          if(self.gMap){

            var camPos = self.gMap.getCameraPosition()
            self._zoom = camPos.zoom

            if(self._onCameraPositionChangeCallback){
              self._onCameraPositionChangeCallback({
                latitude: camPos.target.latitude,
                longitude: camPos.target.longitude
              })
            }
          }
        }        

        return this.super.onInterceptTouchEvent(ev);
      }

    })  

    this._android = new MapViewWrapper(this._context, options);
    this._android.onCreate(null);
    this._android.onResume();
    var self = this

    var displayMetrics = this._context.getResources().getDisplayMetrics()
    var COMPLEX_UNIT_DIP = android.util.TypedValue.COMPLEX_UNIT_DIP
    /*
      @LayoutRes final int ZOOM_CONTROL_ID = 0x1;
      @LayoutRes final int MY_LOCATION_CONTROL_ID = 0x2;
      @LayoutRes final int NAVIGATION_CONTROL_ID = 0x4;      
    */

    if(this.zoonMargin || this.zoomPosition){
      

      var zoomControls = this._android.findViewById(0x1);     
      var params = zoomControls.getLayoutParams();

      if(this.zoonMargin)   {
        var margins = android.util.TypedValue.applyDimension(COMPLEX_UNIT_DIP, this.zoonMargin, displayMetrics);
        params.setMargins(margins, margins, margins, margins);
      }

      if(this.zoomPosition == 'left'){
        params.addRule(android.widget.RelativeLayout .ALIGN_PARENT_BOTTOM);
        params.addRule(android.widget.RelativeLayout .ALIGN_PARENT_LEFT);      
      }

      zoomControls.setLayoutParams(params)          
    }    
 
    if(this.navigationControlMargin || this.navigationControlPosition){
      var navigationButtons = this._android.findViewById(0x4);        
      var params = navigationButtons.getLayoutParams();

      if(this.navigationControlMargin){
        var margins = android.util.TypedValue.applyDimension(COMPLEX_UNIT_DIP, this.navigationControlMargin, displayMetrics);
        params.setMargins(margins, margins, margins, margins);
      }

      if(this.navigationControlPosition == 'left'){
        params.addRule(android.widget.RelativeLayout .ALIGN_PARENT_BOTTOM);
        params.addRule(android.widget.RelativeLayout .ALIGN_PARENT_LEFT);      
      }

      navigationButtons.setLayoutParams(params)          
    }

     
    var mapReadyCallback = new com.google.android.gms.maps.OnMapReadyCallback({
      onMapReady: function (gMap) {
        var mView = that.get();

        mView._gMap = gMap;
        if(mView._pendingCameraUpdate)      
          mView.updateCamera();        

        if(self.draggable)
          mView._gMap.setOnMarkerDragListener(_onMarkerDragListener)


        if(self.useCustonWindow && self.useCustonWindow == true)
          mView._gMap.setInfoWindowAdapter(createCustonWindowMarker());                   

        mView._gMap.setOnInfoWindowClickListener(new com.google.android.gms.maps.GoogleMap.OnInfoWindowClickListener({
           onInfoWindowClick: function(marker){
            if(self._onInfoWindowClickCallback && MARKER_WINDOW_IMAGES[marker].openOnClick)
              self._onInfoWindowClickCallback(createMarkerEventData(marker))
           }
        }))
        
        mView._gMap.setOnInfoWindowCloseListener(new com.google.android.gms.maps.GoogleMap.OnInfoWindowCloseListener({
           onInfoWindowClose: function(marker){
            if(self._onInfoWindowCloseCallback) 
              self._onInfoWindowCloseCallback(createMarkerEventData(marker))
           }
        }))

        mView._gMap.setOnInfoWindowLongClickListener(new com.google.android.gms.maps.GoogleMap.OnInfoWindowLongClickListener({
           onInfoWindowLongClick: function(marker){
            if(self._onInfoWindowLongCallback && MARKER_WINDOW_IMAGES[marker].openOnClick)
              self._onInfoWindowLongCallback(createMarkerEventData(marker))
           }
        }))


        mView._gMap.setOnMarkerClickListener(new com.google.android.gms.maps.GoogleMap.OnMarkerClickListener({
          onMarkerClick: function(marker){

            if(_onMarkerClickListener)
              _onMarkerClickListener(marker)

            if(self._onMarkerClickCallback)
              self._onMarkerClickCallback(createMarkerEventData(marker))

            marker.showInfoWindow()

            return false
 
          }
        }))

        mView._gMap.setOnMapClickListener(new com.google.android.gms.maps.GoogleMap.OnMapClickListener({
          onMapClick: function(point){
            //self.createLooperAnimateCamera(point)
          }
        }))

        
        mView._gMap.setOnCameraChangeListener(_onCameraChangeListener);
        
        
        
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

      if(navigationOriginMarker){
        navigationOriginMarker.remove()
        navigationOriginMarker = undefined
      }

      navigationOriginMarker = self.addMarker(args.origin)
      //var exists = false

      /*
      if(args.destination.markerKey){      
        for(var marker in MARKER_WINDOW_IMAGES){

          if(MARKER_WINDOW_IMAGES[marker].markerKey == args.destination.markerKey){
            exists = true;
            break
          }
        }
      }*/
      
      if(!hasMarkerLocation(args.destination))
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
      var padding = 100
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
    this.disableMyLocationUpdateListener()
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
    }
  }

  MapView.prototype.updateCameraToMarker = function(marker){   

    //console.log("## updateCameraToMarker this._zoom=" + this._zoom)

    var self = this
    var position = marker.getPosition()
    var newLatLngZoom = com.google.android.gms.maps.CameraUpdateFactory.newLatLngZoom(position, this._zoom)
    this.gMap.animateCamera(newLatLngZoom, 1000, new com.google.android.gms.maps.GoogleMap.CancelableCallback({

      onFinish: function() {
        var projection = self.gMap.getProjection()
        var point = projection.toScreenLocation(position)
        //point.x -= 100
        //point.y -= 100
        var offsetPosition = projection.fromScreenLocation(point)
        var newLatLng = com.google.android.gms.maps.CameraUpdateFactory.newLatLngZoom(offsetPosition, self._zoom)
        self.gMap.animateCamera(newLatLng, 300, null)
      },

      onCancel: function() {
      }

    }))
  }

  MapView.prototype.fitBounds = function(centerMarker){
    var builder = new com.google.android.gms.maps.model.LatLngBounds.Builder();
    
    for (var marker in MARKER_WINDOW_IMAGES) {            
        builder = builder.include(MARKER_WINDOW_IMAGES[marker].latLng);
    }

    var bounds = builder.build();    
    var padding = 100; // offset from edges of the map in pixels
    var cu = com.google.android.gms.maps.CameraUpdateFactory.newLatLngBounds(bounds, padding);

    if(centerMarker){
      var center = com.google.android.gms.maps.CameraUpdateFactory.newLatLngZoom(centerMarker.getPosition(), this._zoom);
      this.gMap.moveCamera(cu)
      this.gMap.animateCamera(center);  
    }else{
      this.gMap.animateCamera(cu);  
    } 
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
      uiSettings.setAllGesturesEnabled(true);
      uiSettings.setMyLocationButtonEnabled(true);      
      uiSettings.setMapToolbarEnabled(true);
  };

  MapView.prototype.getImageLoader = function(){
    if(!this.imageLoader)
      this.imageLoader = new WeakRef(com.nostra13.universalimageloader.core.ImageLoader.getInstance())

    if(this.imageLoader.get())
      return this.imageLoader.get()

    this.imageLoader = new WeakRef(com.nostra13.universalimageloader.core.ImageLoader.getInstance())
    return this.imageLoader.get()
  }

  MapView.prototype.addMarker = function(opts) {
      
    //console.log("####################### MapView.prototype.addMarker start")
    //console.log(JSON.stringify(opts))
    //console.log("####################### MapView.prototype.addMarker end")

    var self = this

    if(this.draggable == undefined || this.draggable == null)
      this.draggable = false


    if(opts.latitude){
      if(isNaN(opts.latitude) && opts.latitude.length > 16)
        opts.latitude = Number(opts.latitude.substring(0, 16))
      else
        opts.latitude = Number(opts.latitude);
    }

    if(opts.longitude){
      if(isNaN(opts.longitude) && opts.longitude.length > 16)
        opts.longitude = Number(opts.longitude.substring(0, 16))
      else
        opts.longitude = Number(opts.longitude);
    }    

    if(!opts.title)
      opts.title = ""

    if(!opts.snippet)
      opts.snippet = ""


    var iconToUse = null

    if(opts.iconPath){      
        
      if(markerIconsCache[opts.iconPath]){
        iconToUse =   markerIconsCache[opts.iconPath]
      }else if(opts.iconPath.indexOf('res://') > -1){
        var ctx = application.android.context
        var resName = opts.iconPath.substring('res://'.length, opts.iconPath.length)          
        var restId = ctx.getResources().getIdentifier(resName, "drawable", ctx.getPackageName());          
        iconToUse  = com.google.android.gms.maps.model.BitmapDescriptorFactory.fromResource(restId)

        markerIconsCache[opts.iconPath] = iconToUse
      
      }else{

        if(markerIconsCache[opts.iconPath]){          
          iconToUse = markerIconsCache[opts.iconPath]                    
        }else{

          var loaded = false

          try{

            var full_path = 'file://' + opts.iconPath
            var bitmap = this.getImageLoader().loadImageSync(full_path)
            
            //console.log("####################")
            //console.log("### full_path=" + full_path)
            //console.log("### bitmap=" + bitmap)
            //console.log("####################")            

            iconToUse = com.google.android.gms.maps.model.BitmapDescriptorFactory.fromBitmap(bitmap)
            markerIconsCache[opts.iconPath] = iconToUse

          }catch(error){
            console.log("## addMarker error: " + error)
          }

          if(!iconToUse){
            //var iconGenerator = new com.google.maps.android.ui.IconGenerator(this._context)

            var options = new android.graphics.BitmapFactory.Options()
            //options.inSampleSize = 3;
            options.inDither = false;                     //Disable Dithering mode
            options.inPurgeable = true;                   //Tell to gc that whether it needs free memory, the Bitmap can be cleared
            options.inInputShareable = true;              //Which kind of reference will be used to recover the Bitmap data after being clear, when it will be used in the future
            //options.inTempStorage = new byte[16 * 1024];                 
            options.inJustDecodeBounds = false            
            var bitmap = android.graphics.BitmapFactory.decodeFile(opts.iconPath, options)

            iconToUse = com.google.android.gms.maps.model.BitmapDescriptorFactory.fromBitmap(bitmap)
            markerIconsCache[opts.iconPath] = iconToUse
          }
        }
      }

    }else if(opts.androidPinColor != undefined){         
      iconToUse = com.google.android.gms.maps.model.BitmapDescriptorFactory.defaultMarker(opts.androidPinColor)
    }else{      
      iconToUse = com.google.android.gms.maps.model.BitmapDescriptorFactory.defaultMarker(com.google.android.gms.maps.model.BitmapDescriptorFactory.HUE_AZURE)
    }

    if(opts.clear)
      this.clear()

    var markerOptions = new com.google.android.gms.maps.model.MarkerOptions();
    var latLng = new com.google.android.gms.maps.model.LatLng(opts.latitude, opts.longitude);
    
    markerOptions.title(opts.title);
    markerOptions.snippet(opts.snippet);    
    markerOptions.position(latLng);
    markerOptions.draggable(this.draggable);
    markerOptions.icon(iconToUse);

    openedMarker = this._gMap.addMarker(markerOptions);

    if(opts.openOnClick == undefined || opts.openOnClick == null)
      opts.openOnClick = true
    
    MARKER_WINDOW_IMAGES[openedMarker] = {
      'markerKey': opts.markerKey,
      'windowImgPath': opts.windowImgPath,
      'phone': opts.phone || "",
      'email': opts.email || "",
      'openOnClick': opts.openOnClick,
      'latLng': latLng,
      'latitude': opts.latitude,
      'longitude': opts.longitude,
    }
  

    if(opts.showWindow)
      openedMarker.showInfoWindow()  

    if(opts.updateCamera){
      this.latitude = undefined
      this.longitude = undefined
      this.latitude = opts.latitude
      this.longitude = opts.longitude
      this.fitBounds(openedMarker)      
    }

    return openedMarker
  };

  MapView.prototype.hasMarkerLocation = function(args){

    for(var marker in MARKER_WINDOW_IMAGES){
      var it = MARKER_WINDOW_IMAGES[marker]
      if(it.latitude == args.latitude && it.longitude == args.longitude)
        return true
    }    

    return false

  }

  MapView.prototype.selectMarker = function(marker){
    openedMarker = marker
  }

  MapView.prototype.clear = function(){
    this._gMap.clear()

    try{
      Runtime.getRuntime().gc()
      System.gc()
    }catch(e){
      console.log("## clear")
    }
  }

  MapView.prototype.closeMarker = function(){
    if(openedMarker)
      openedMarker.setVisible(true)    
  }

  MapView.prototype.removeMarker = function(marker){
    marker.remove()
  }

  MapView.prototype.hideWindow = function(){
    if(openedMarker)
      openedMarker.hideInfoWindow()  
  }

  MapView.prototype.showWindow = function(){
    if(openedMarker)
      openedMarker.showInfoWindow()    
  }


  MapView.prototype.enableMyLocationUpdateListener = function(params) {
    
    console.log("### enableOndeEstouListener")

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
      var self = this

      if(lastLocation){
        console.log('############## has lastLocation')
          
        args.latitude =  lastLocation.getLatitude() 
        args.longitude = lastLocation.getLongitude()      
        args.marker = this.addMarker(args)

        if(args.doneCallback)
          args.doneCallback(args)

      }else{
        console.log('############## not has lastLocation')
        onlyInitialPosition = true    
        this.enableMyLocationUpdateListener({
        minTime: 10, 
        minDistance: 1,
        myLocationUpdateCallback:  function(location){
            args.latitude = location.latitude
            args.longitude = location.longitude          
            args.marker = self.addMarker(args)

            if(args.doneCallback)
              args.doneCallback(args)
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

  MapView.prototype.navigateWithGoogleNavigator = function(args){
      
    var mapsPkg = "com.google.android.apps.maps"
    var gmmIntentUri = android.net.Uri.parse("google.navigation:q=" + args.latitude + "," + args.longitude);
    var mapIntent = new android.content.Intent(android.content.Intent.ACTION_VIEW, gmmIntentUri);
    mapIntent.setFlags(android.content.Intent.FLAG_ACTIVITY_NO_HISTORY);
    mapIntent.setPackage(mapsPkg);

    if(mapIntent.resolveActivity(application.android.context.getPackageManager()) != null){      
      application.android.currentContext.startActivity(mapIntent)
    }else{
      var browserIntent = new android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse("market://details?id=" + mapsPkg));        
      application.android.currentContext.startActivity(browserIntent);              
    }
  }

  MapView.prototype.openGoogleStreetView = function(args){

    var mapsPkg = "com.google.android.apps.maps"
    var gmmIntentUri = android.net.Uri.parse("google.streetview:cbll=" + args.latitude + "," + args.longitude);
    var mapIntent = new android.content.Intent(android.content.Intent.ACTION_VIEW, gmmIntentUri);
    
    mapIntent.setPackage(mapsPkg);

    if(mapIntent.resolveActivity(application.android.context.getPackageManager()) != null){
      var act = application.android.foregroundActivity || application.android.startActivity;
      act.startActivity(mapIntent)
    }else{
      var browserIntent = new android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse("market://details?id=" + mapsPkg));        
      application.android.currentContext.startActivity(browserIntent);              
    }
  }

  MapView.prototype.getLocationFromLocationName = function(args){

    return new Promise(function(resolve, reject){
      
      var geoCoder = new android.location.Geocoder(application.android.context, java.util.Locale.getDefault())
      
      args.value = capitalize(args.value).replace(new RegExp(" ", 'g'), "");



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
      message: "Nenhum provedor GPS ativo. Habilite seu GPS ou sua internet.",
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

          if(MARKER_WINDOW_IMAGES[marker] && MARKER_WINDOW_IMAGES[marker].windowImgPath)
            badge = MARKER_WINDOW_IMAGES[marker].windowImgPath

                
          if(badge){

            var bitmap

            try{
              var full_path = 'file://' + badge
              bitmap = this.getImageLoader().loadImageSync(full_path)
            }catch(error){
              console.log("## render windows error: " + error)
            } 

            if(!bitmap){
              var options = new android.graphics.BitmapFactory.Options()
              options.inDither = false;                     //Disable Dithering mode
              options.inPurgeable = true;                   //Tell to gc that whether it needs free memory, the Bitmap can be cleared
              options.inInputShareable = true;              //Which kind of reference will be used to recover the Bitmap data after being clear, when it will be used in the future
              options.inJustDecodeBounds = false
              bitmap = android.graphics.BitmapFactory.decodeFile(badge, options);   
            }


            var badge_id = ctx.getResources().getIdentifier('badge', "id", ctx.getPackageName());
            view.findViewById(badge_id).setImageBitmap(bitmap);          
          } 

          var title = marker.getTitle();
          var title_id = ctx.getResources().getIdentifier('title', "id", ctx.getPackageName());
          var titleUi = view.findViewById(title_id);

          if (title != null)               
            titleUi.setText(new android.text.SpannableString(title));
          else 
            titleUi.setText("");
          
          var snippet = marker.getSnippet();
          var snippet_id = ctx.getResources().getIdentifier('snippet', "id", ctx.getPackageName());
          var snippetUi = view.findViewById(snippet_id);

          if (snippet)
            snippetUi.setText(new android.text.SpannableString(snippet));
          else
            snippetUi.setText("");          

          var phone = MARKER_WINDOW_IMAGES[marker].phone;
          var phone_id = ctx.getResources().getIdentifier('phone', "id", ctx.getPackageName());
          var phoneUi = view.findViewById(phone_id);

          if (phone)
            phoneUi.setText(new android.text.SpannableString(phone));
          else
            phoneUi.setVisibility(android.view.View.GONE);
          
          var email = MARKER_WINDOW_IMAGES[marker].email;
          var email_id = ctx.getResources().getIdentifier('email', "id", ctx.getPackageName());
          var emailUi = view.findViewById(email_id);

          if (email)
            emailUi.setText(new android.text.SpannableString(email));
          else
            emailUi.setVisibility(android.view.View.GONE);          
          
          var btnMarkerOpen_id = ctx.getResources().getIdentifier('btnMarkerOpen', "id", ctx.getPackageName());
          var btnMarkerOpenUi = view.findViewById(btnMarkerOpen_id)

          if(MARKER_WINDOW_IMAGES[marker].openOnClick){
            btnMarkerOpenUi.setOnClickListener(new android.view.View.OnClickListener({
              onClick: function(view){                
                if(self._onInfoWindowClickCallback) 
                  self._onInfoWindowClickCallback(createMarkerEventData(marker)) 
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


