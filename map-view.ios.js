var common = require("./map-view-common");
var application = require('application')
var route = require("./route");
var colorModule = require("color");
var Color = colorModule.Color;

require("utils/module-merge").merge(common, module.exports);

var onlyInitialPosition = false
var _myLocationUpdateCallback 
var _myLocationUpdateRouteCallback 
var _onMarkerDragListener
var _onMarkerClickListener
var _cameraPosition
var _locationListener
var _custonWindowMarkerCreator
var mLocationManager
var isNetworkEnabled
var isProviderEnabled

var markersWindowImages = {}
var openedMarker
var routeTask = new route.RouteTask();  


var MapView = (function (_super) {
  global.__extends(MapView, _super);
  function MapView() {
    _super.apply(this, arguments);
    this._ios = GMSMapView.mapWithFrameCamera(CGRectZero, this._createCameraPosition());
    this._ios.delegate = this.createMapViewDelegate() 

    if(!this.mapType)
      this.mapType = kGMSTypeNormal
    
    this._ios.mapType = this.mapType;


    var self = this
    _onMarkerClickListener = function(marker){
      console.log("## this.zoom=" + self.zoom)
      console.log("## marker.position=" + marker.position)
      var update = GMSCameraUpdate.setTargetZoom(marker.position, self.zoom);
      self._ios.animateWithCameraUpdate(update);        
    }

    console.log("## application.resumeEvent=" + application.resumeEvent)
    application.on(application.resumeEvent, function(){
      console.log("## onresume")

      if(self.locationManager){
        self.locationManager.stopMonitoringSignificantLocationChanges();
        self.locationManager.startUpdatingLocation();
      }

    })

    application.on(application.suspendEvent, function(){
      console.log("## onsuspend")

      if(self.locationManager){
        self.locationManager.stopUpdatingLocation();
        self.locationManager.startMonitoringSignificantLocationChanges();
      }

    })

  }

  MapView.prototype.onLoaded = function () {
    _super.prototype.onLoaded.apply(this, arguments);
    this.notifyMapReady();
  }

  Object.defineProperty(MapView.prototype, "ios", {
    get: function () {
      return this._ios;
    }
  });

  Object.defineProperty(MapView.prototype, "gMap", {
    get: function () {
      return this._ios;
    },
    enumerable: true,
    configurable: true
  });

  Object.defineProperty(MapView.prototype, "zoon", {
    get: function () {
      return this._zoom;
    },
    set: function(value){
      this._zoom = value
    },
    enumerable: true,
    configurable: true
  });

  MapView.prototype.updateCamera = function() {
    if(!this.ios) return;
    var cameraUpdate = GMSCameraUpdate.setCamera(this._createCameraPosition());
    this.ios.moveCamera(cameraUpdate);
  };

  MapView.prototype.updateCameraToMarker = function(marker){   

    //console.log("## updateCameraToMarker " + this.gMap)

    var self = this
    var position = marker.position


    var camPosition = GMSCameraPosition.cameraWithTargetZoom(position, this.zoom)
    this._ios.animateToLocation(camPosition)
  }  

  MapView.prototype._createCameraPosition = function() {
    return GMSCameraPosition.cameraWithLatitudeLongitudeZoomBearingViewingAngle(
        this.latitude,
        this.longitude,
        this.zoom,
        this.bearing,
        this.tilt
    );
  };

  MapView.prototype.enableDefaultFullOptions = function() {
      var uiSettings = this._ios.settings;
      uiSettings.zoomGestures = true;
      uiSettings.setAllGesturesEnabled = true;
      uiSettings.scrollGestures = true;      
      uiSettings.rotateGestures = true;
      uiSettings.compassButton = true;
      uiSettings.indoorPicker = true;      
      //uiSettings.myLocationButton = true;            
  };

  MapView.prototype.fitBounds = function(centerMarker){

    var bounds = GMSCoordinateBounds.alloc().init()


    for(var marker in markersWindowImages){  

      console.log("## marker=" + marker)
      console.log("## marker=" + markersWindowImages[marker].position)

      var position = markersWindowImages[marker].position

      bounds = bounds.includingCoordinate(position)
      
    }

    var update = GMSCameraUpdate.fitBoundsWithPadding(bounds, 100.0)
    //this._ios.animateWithCameraUpdate(update);
    //this._ios.moveCamera(update);
    //this._ios.animateToViewingAngle(50);

    if(centerMarker){
      console.log("## center 1")
      var center = GMSCameraUpdate.setTargetZoom(centerMarker.position, this.zoom);
      //var center = GMSCameraPosition.cameraWithLatitudeLongitudeZoom(centerMarker.position.latitude, centerMarker.position.longitude, this.zoom)
      console.log("## center 2")
      this._ios.moveCamera(center)
      console.log("## center 3")
      this._ios.animateWithCameraUpdate(update);  
      console.log("## center 4")
    }else{
      this._ios.animateWithCameraUpdate(update);  
    }    
  }

  MapView.prototype.addMarker = function(opts) {

    
    
    console.log("####################### MapView.prototype.addMarker")
    console.log(JSON.stringify(opts))
    console.log("####################### MapView.prototype.addMarker")
    

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

    if(opts.iosPinColor){
      iconToUse = GMSMarker.markerImageWithColor(new Color(opts.iosPinColor).ios);
    }else if(!opts.iconPath){
      iconToUse = GMSMarker.markerImageWithColor(UIColor.blueColor());
    }else{
      if(opts.iconPath.indexOf('res://') > -1){      
        var resName = opts.iconPath.substring('res://'.length, opts.iconPath.length)
        iconToUse  = UIImage.imageNamed(resName)
      }else{
        iconToUse  = UIImage.imageWithContentsOfFile(opts.iconPath);
      }
    }

    if(opts.clear)
      this.clear()

    var latLng = CLLocationCoordinate2DMake(this.latitude, this.longitude)//.takeRetainedValue();
    openedMarker = GMSMarker.alloc().init()
    openedMarker.position = latLng;    
    openedMarker.title = this.title;
    openedMarker.snippet = this.snippet;    
    openedMarker.draggable = this.draggable;
    openedMarker.icon  = iconToUse;

    openedMarker.tracksInfoWindowChanges = true    
    openedMarker.infoWindowAnchor = CGPointMake(0.5, 0.5);

    openedMarker.map = this._ios;
    

    if(opts.openOnClick == undefined || opts.openOnClick == null)
      opts.openOnClick = true

    
    markersWindowImages[openedMarker] = {
      'markerKey': opts.markerKey,
      'windowImgPath': opts.windowImgPath,
      'phone': opts.phone || "",
      'email': opts.email || "",
      'openOnClick': opts.openOnClick,
      'position': latLng
    }
  

    if(opts.showWindow){
      this.showWindow()
    }   

    if(opts.updateCamera)      
      this.fitBounds(openedMarker)

    console.log("## addMarker end")

    return openedMarker
  };

  MapView.prototype.selectMarker = function(marker){
    openedMarker = marker
  }

  MapView.prototype.clear = function(){
    this._ios.clear();

    for(marker in markersWindowImages)
      marker.map = null;

    markersWindowImages = {}
  }

  MapView.prototype.closeMarker = function(){
    if(openedMarker){
      this._ios.selectedMarker =null
    }
  }

  MapView.prototype.hideWindow = function(){
    if(openedMarker){
      this._ios.selectedMarker = null
    }    
  }

  MapView.prototype.showWindow = function(){
    if(openedMarker){
      this._ios.selectedMarker = openedMarker
    }
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

      var bounds = GMSCoordinateBounds.alloc().init()
      
      bounds = bounds.includingCoordinate(CLLocationCoordinate2DMake(origin.latitude, origin.longitude))
      bounds = bounds.includingCoordinate(CLLocationCoordinate2DMake(parseFloat(destination.latitude), parseFloat(destination.longitude)))      
      
      var update = GMSCameraUpdate.fitBoundsWithPadding(bounds, 100.0)
      //this._ios.animateWithCameraUpdate(update);
      this._ios.moveCamera(update);
      this._ios.animateToViewingAngle(50);
      

      console.log("routeTask.execute")
      routeTask.execute({origin: origin, destination: destination, mapView: this._ios})
    }

    if(params.doneFirstRote)
      params.doneFirstRote()

    console.log("## goto enableMyLocationListener")
    onlyInitialPosition = false
    this.enableMyLocationUpdateListener({
      minTime: 60000,
      minDistance: 10,
      myLocationUpdateRouteCallback: function(args){

        console.log("### myLocationUpdateRouteCallback")

        self.clear()
        origin.latitude = args.latitude
        origin.longitude = args.longitude


        overlayAction({
          origin: origin,
          destination: destination
        })


        
        routeTask.execute({origin: origin, destination: destination, mapView: self._ios})
      }
    })   
  }

  MapView.prototype.navigateDisable = function(){
    _myLocationUpdateRouteCallback = null
    routeTask.remove()
  }  

  MapView.prototype.enableMyLocationUpdateListener = function(params) {
    
    params.minTime = params.minTime ? params.minTime : 60000
    params.minDistance = params.minDistance ? params.minDistance : 10
    var self = this
    var MyLocationDelegate = (function (_super) {
        __extends(MyLocationDelegate, _super);
        function MyLocationDelegate() {
            _super.apply(this, arguments);
        }

        MyLocationDelegate.prototype.locationManagerDidUpdateLocations = function(manager, locations){
          

          var location = locations.lastObject


            var args = {
              latitude: location.coordinate.latitude, 
              longitude: location.coordinate.longitude,
            }

            console.log("## locationManagerDidUpdateLocations args=" + JSON.stringify(args))

            if(_myLocationUpdateRouteCallback)
              _myLocationUpdateRouteCallback(args)

            if(_myLocationUpdateCallback)
              _myLocationUpdateCallback(args)

            if(onlyInitialPosition && self.locationManager){
              self.locationManager.stopUpdatingLocation()     
              onlyInitialPosition = false         
            }

        }

        MyLocationDelegate.prototype.locationManagerDidPauseLocationUpdates = function(manager){
          console.log("### locationManagerDidPauseLocationUpdates")
        }

        MyLocationDelegate.prototype.locationManagerDidFinishDeferredUpdatesWithError = function(manager, error){
          console.log("### locationManagerDidFinishDeferredUpdatesWithError error=" + error)
        }

        MyLocationDelegate.prototype.locationManagerDidFailWithError = function(manager, error){
          console.log("### locationManagerDidFailWithError error=" + error) 
        }

        MyLocationDelegate.ObjCProtocols = [CLLocationManagerDelegate];
        return MyLocationDelegate;
    }(NSObject));

    if(!this.locationManagerDelegate)
      this.locationManagerDelegate = new MyLocationDelegate();

    if(!this.locationManager){
      this.locationManager = CLLocationManager.alloc().init();
      this.locationManager.delegate = this.locationManagerDelegate;
    }

    this.locationManager.distanceFilter = kCLDistanceFilterNone;
    this.locationManager.desiredAccuracy = kCLLocationAccuracyBest;

    if (parseFloat(UIDevice.currentDevice().systemVersion) >= 8.0){
        console.log("## requestWhenInUseAuthorization") 
        this.locationManager.requestWhenInUseAuthorization();
    }else{
      console.log("## not requestWhenInUseAuthorization " + UIDevice.currentDevice().systemVersion) 
    }

    if(onlyInitialPosition){            
      this.locationManager.startUpdatingLocation();
      console.log("## startUpdatingLocation")
    }else{

      this.locationManager.desiredAccuracy = kCLLocationAccuracyBest;

      // Only report to location manager if the user has traveled 1000 meters
      this.locationManager.distanceFilter = params.minDistance;      
      this.locationManager.activityType = CLActivityTypeAutomotiveNavigation;      
      this.locationManager.startMonitoringSignificantLocationChanges()
      console.log("## startMonitoringSignificantLocationChanges")
    }


    _myLocationUpdateCallback = params.myLocationUpdateCallback
    _myLocationUpdateRouteCallback = params.myLocationUpdateRouteCallback
  };  

  MapView.prototype.addMyLocationMarker = function(args) {
    args = args || {}
    var self = this
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

    this.locationManager.stopMonitoringSignificantLocationChanges()
    this.locationManager.stopUpdatingLocation()
    this.locationManager = null

    onlyInitialPosition = false
  }

  MapView.prototype.navigateWithGoogleNavigator = function(args){    
    if (UIApplication.sharedApplication().canOpenURL(NSURL.URLWithString("comgooglemaps://"))) {
      var url = "comgooglemaps://?saddr=&daddr=" + args.latitude + "," + args.longitude
      UIApplication.sharedApplication().openURL(NSURL.URLWithString(url));
    } else {
      var iTunesLink = "itms://itunes.apple.com/us/app/apple-store/id585027354?mt=8";
      UIApplication.sharedApplication().openURL(NSURL.URLWithString(iTunesLink));      
    }    
  }

  MapView.prototype.openGoogleStreetView = function(args){    
    if (UIApplication.sharedApplication().canOpenURL(NSURL.URLWithString("comgooglemaps://"))) {
      var url = "comgooglemaps://?center=" + args.latitude + "," + args.longitude + "&mapmode=streetview"
      UIApplication.sharedApplication().openURL(NSURL.URLWithString(url));
    } else {
      var iTunesLink = "itms://itunes.apple.com/us/app/apple-store/id585027354?mt=8";
      UIApplication.sharedApplication().openURL(NSURL.URLWithString(iTunesLink));      
    }    
  }  

  function radians(degrees){
      return degrees * 3.14 / 180.0
  }

  MapView.prototype.distance = function(params){
    // let's give those values meaningful variable names

    var _lat  = isNaN(params.lat) ? radians(NSString.stringWithString(params.lat).doubleValue) : radians(params.lat)
    var _lng  = isNaN(params.lng) ? radians(NSString.stringWithString(params.lng).doubleValue) : radians(params.lng)
    var _lat2 = isNaN(params.lat2) ? radians(NSString.stringWithString(params.lat2).doubleValue) : radians(params.lat2)
    var _lng2 = isNaN(params.lng2) ? radians(NSString.stringWithString(params.lng2).doubleValue) : radians(params.lng2)

    _lat  = isNaN(_lat) ? 0 : _lat
    _lng  = isNaN(_lng) ? 0 : _lng
    _lat2  = isNaN(_lat2) ? 0 : _lat2
    _lng2  = isNaN(_lng2) ? 0 : _lng2


    // calculate the distance
    var result = 6371.0 * acos(cos(_lat2) * cos(_lat) * cos(_lng - _lng2) + sin(_lat2) * sin(_lat))
    return result
  }  


  MapView.prototype.createMapViewDelegate = function(){
        
    var self = this
    var MyMapViewDelegate = (function (_super) {
        __extends(MyMapViewDelegate, _super);
        function MyMapViewDelegate() {
            _super.apply(this, arguments);
        }

        MyMapViewDelegate.prototype.mapViewWillMove = function(mapView, gesture){

        }

        MyMapViewDelegate.prototype.mapViewDidChangeCameraPosition = function(mapView, position){
          self._zoom = position.zoom
          _cameraPosition = position.target // CLLocationCoordinate2D
        }

        MyMapViewDelegate.prototype.mapViewIdleAtCameraPosition = function(mapView, position){

          if(self._onCameraPositionChangeCallback){
            self._onCameraPositionChangeCallback({
              latitude: position.target.latitude,
              longitude: position.target.longitude
            })
          }              
        }

        MyMapViewDelegate.prototype.mapViewDidTapAtCoordinate = function(mapView, coordinate){

        }

        MyMapViewDelegate.prototype.mapViewDidLongPressAtCoordinate = function(mapView, coordinate){

        }

        // return boolean
        MyMapViewDelegate.prototype.mapViewDidTapMarker = function(mapView, marker){
          if(_onMarkerClickListener)
            _onMarkerClickListener(marker)

          if(self._onMarkerClickCallback){
            self._onMarkerClickCallback({
              'marker': marker,
              'markerKey': markersWindowImages[marker] ? markersWindowImages[marker].markerKey : null
            })
          }
          
          //marker.showInfoWindow()
          self._ios.selectedMarker = marker;
          return true

        }

        MyMapViewDelegate.prototype.mapViewDidTapInfoWindowOfMarker = function(mapView, marker){
          if(self._onInfoWindowClickCallback && markersWindowImages[marker].openOnClick){
            self._onInfoWindowClickCallback({
              'marker': marker,
              'markerKey': markersWindowImages[marker] ? markersWindowImages[marker].markerKey : null
            })
          }
        }

        MyMapViewDelegate.prototype.mapViewDidLongPressInfoWindowOfMarker = function(mapView, marker){
          if(self._onInfoWindowLongCallback && markersWindowImages[marker].openOnClick){
            self._onInfoWindowLongCallback({
              'marker': marker,
              'markerKey': markersWindowImages[marker] ? markersWindowImages[marker].markerKey : null
            })
          }
        }

        MyMapViewDelegate.prototype.mapViewDidTapOverlay = function(mapView, overlay){

        }

        // return UIView
        MyMapViewDelegate.prototype.mapViewMarkerInfoWindow = function(mapView, marker){
          
          if(self.useCustonWindow && self.useCustonWindow == true){
            console.log("## use custon window")
            return self.defaultWindowMarkerCreator(marker)
          }

          return null
        }

        // return UIView
        MyMapViewDelegate.prototype.mapViewMarkerInfoContents = function(mapView, marker){
          if(self.useCustonWindow && self.useCustonWindow == true){
           
            if(markersWindowImages[marker] && markersWindowImages[marker].windowImgPath)
              badge = markersWindowImages[marker].windowImgPath
            else
              console.log('## not has image to custon window')


          }

          return null
        }

        MyMapViewDelegate.prototype.mapViewDidCloseInfoWindowOfMarker = function(mapView, marker){
          if(self._onInfoWindowCloseCallback){
            self._onInfoWindowCloseCallback({
              'marker': marker,
              'markerKey': markersWindowImages[marker] ? markersWindowImages[marker].markerKey : null
            })
          }
        }

        MyMapViewDelegate.prototype.mapViewDidBeginDraggingMarker = function(mapView, marker){

          if(self.draggable){
            if(self._onMarkerDragCallback && self._onMarkerDragCallback.onMarkerDragStart){
              self._onMarkerDragCallback.onMarkerDragStart({
                      'marker': marker,
                      'markerKey': markersWindowImages[marker] ? markersWindowImages[marker].markerKey : null
                    })
            }
          }
        }

        MyMapViewDelegate.prototype.mapViewDidEndDraggingMarker = function(mapView, marker){

          if(self.draggable){
            var position = marker.position
            self.latitude = position.latitude
            self.longitude = position.longitud
            console.log("############## onMarkerDragEnd")

            if(self._onMarkerDragCallback && self._onMarkerDragCallback.onMarkerDragEnd){
              self._onMarkerDragCallback.onMarkerDragEnd({
                      'marker': marker,
                      'markerKey': markersWindowImages[marker] ? markersWindowImages[marker].markerKey : null
                    })
            }
          }
        }

        MyMapViewDelegate.prototype.mapViewDidDragMarker = function(mapView, marker){
          if(self.draggable){
            if(self._onMarkerDragCallback && self._onMarkerDragCallback.onMarkerDrag){
              self._onMarkerDragCallback.onMarkerDrag({
                      'marker': marker,
                      'markerKey': markersWindowImages[marker] ? markersWindowImages[marker].markerKey : null
                    })
            }
          }
        }

        // return boolean
        MyMapViewDelegate.prototype.didTapMyLocationButtonForMapView = function(mapView){

        }

        MyMapViewDelegate.prototype.mapViewDidStartTileRendering = function(mapView){

        }

        MyMapViewDelegate.prototype.mapViewDidFinishTileRendering = function(mapView){

        }

        MyMapViewDelegate.prototype.mapViewSnapshotReady = function(mapView){

        }        

        MyMapViewDelegate.ObjCProtocols = [GMSMapViewDelegate];

        return MyMapViewDelegate;
    }(NSObject));    

    return new MyMapViewDelegate()
  }

  MapView.prototype.defaultWindowMarkerCreator = function(marker){

    if(this._custonWindowMarkerCreator)
      return this._custonWindowMarkerCreator({
        'marker': marker,
        'markerKey': markersWindowImages[marker] ? markersWindowImages[marker].markerKey : null
      })

    var anchor = marker.position            
    var point = this._ios.projection.pointForCoordinate(anchor);

    var badge;

    if(markersWindowImages[marker] && markersWindowImages[marker].windowImgPath)
      badge = markersWindowImages[marker].windowImgPath
    else
      console.log('## not has image to custon window')


    var outerView = UIImageView.alloc().initWithFrame(CGRectMake(0, 0, 270, 155))
    outerView.contentMode = UIViewContentModeScaleToFill
    outerView.image = UIImage.imageNamed("bubble")
    //outerView.backgroundColor = UIColor.whiteColor()


    var title = UILabel.alloc().initWithFrame(CGRectMake(10, 10, 170, 10))
    title.font = UIFont.systemFontOfSize(14)
    title.text = marker.title
    title.textColor = UIColor.blueColor()
    outerView.addSubview(title)



    var snippet = UILabel.alloc().initWithFrame(CGRectMake(10, 30, 170, 10))
    snippet.font = UIFont.systemFontOfSize(12)
    snippet.text = marker.snippet
    outerView.addSubview(snippet)

    if(markersWindowImages[marker].phone){
      var phone = UILabel.alloc().initWithFrame(CGRectMake(10, 45, 170, 10))
      phone.font = UIFont.systemFontOfSize(12)
      phone.text = markersWindowImages[marker].phone
      outerView.addSubview(phone)
    }

    if(markersWindowImages[marker].email){
      var email = UILabel.alloc().initWithFrame(CGRectMake(10, 60, 170, 10))
      email.font = UIFont.systemFontOfSize(12)
      email.text = markersWindowImages[marker].email
      outerView.addSubview(email)
    }
    
    var btn = UIImageView.alloc().initWithImage(UIImage.imageNamed("btn_marker_open"))
    btn.frame = CGRectMake(10, 80, 80, 30)
    btn.contentMode = UIViewContentModeScaleAspectFit
    outerView.addSubview(btn)

    if(badge){              
      var image 
      if(badge.indexOf('res://') > -1){      
        var resName = badge.substring('res://'.length, badge.length)
        console.log("#### resName=" + resName)
        image = UIImage.imageNamed(resName)
      }else{
        image = UIImage.imageWithContentsOfFile(badge);
      }

      console.log("## image=" + image)

      var imageView = UIImageView.alloc().initWithImage(image)
      imageView.frame = CGRectMake(170, 10, 100, 80)
      imageView.contentMode = UIViewContentModeScaleAspectFit
      outerView.addSubview(imageView)
    }

    return outerView
  }  

  return MapView;
})(common.MapView);


exports.MapView = MapView;