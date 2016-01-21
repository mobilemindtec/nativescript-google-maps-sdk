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

var markersWindowImages = {}
var openedMarker

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
          console.log("## use custon window")
        }else{
          console.log("## not use custon window")
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
            marker.showInfoWindow()
            return true
           }
        }))
        
        if(mView._gMap.draggable)
          mView._gMap.setOnMarkerDragListener(_onMarkerDragListener) 

        if(!self.mapType)
          self.mapType = com.google.android.gms.maps.GoogleMap.MAP_TYPE_HYBRID
        
        mView._gMap.setMapType(self.mapType);


        mView._emit(MapView.mapReadyEvent);


        console.log("############### mapReadyCallback=" + mapReadyCallback)
      }
    });

    this._android.getMapAsync(mapReadyCallback);
  };

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

    }else{
      console.log("## not updateCamera latitude=" + this.latitude + ", longitude=" + this.longitude)
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
  };

  MapView.prototype.addMarker = function(opts) {

    console.log("####################### maps.opts")
    console.log(JSON.stringify(opts))
    console.log("####################### maps.opts")

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

    if(!opts.iconPath)
      iconToUse = com.google.android.gms.maps.model.BitmapDescriptorFactory.defaultMarker(com.google.android.gms.maps.model.BitmapDescriptorFactory.HUE_AZURE)
    else
      iconToUse  = com.google.android.gms.maps.model.BitmapDescriptorFactory.fromPath(opts.iconPath)

    if(opts.clear)
      this._gMap.clear()

    console.log("###################################")
    console.log("################ this.latitude=" + this.latitude)
    console.log("################ this.longitude=" + this.longitude)
    console.log("################ this.title=" + this.title)
    console.log("################ this.snippet=" + this.snippet)
    console.log("################ opts.iconPath=" + opts.iconPath)
    console.log("###################################")

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

    this.updateCamera()
  };

  MapView.prototype.closeMarker = function(){
    if(openedMarker){
      openedMarker.setVisible(true)
    }

    console.log("## remove marker")
  }

  MapView.prototype.hideWindow = function(){
    if(openedMarker){
      openedMarker.hideInfoWindow()
    }

    console.log("## hideWindow marker")
  }

  MapView.prototype.showWindow = function(){
    if(openedMarker){
      openedMarker.showInfoWindow()
    }

    console.log("## showWindow marker")
  }

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
            
            var badge = null

            if(markersWindowImages[marker] && markersWindowImages[marker].windowImgPath)
              badge = markersWindowImages[marker].windowImgPath
          

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

  return MapView;

})(common.MapView);

exports.MapView = MapView;