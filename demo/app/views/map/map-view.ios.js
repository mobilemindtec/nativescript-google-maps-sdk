var common = require("./map-view-common");
var application = require('application')
var route = require("./route");
var colorModule = require("color");
var Color = colorModule.Color;
var platform = require('platform')
var utils = require("utils/utils")

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
var IMAGE_CACHE = {}
var MARKER_WINDOW_IMAGES = {}
var openedMarker
var routeTask = new route.RouteTask();  
var navigationOriginMarker

var sharedApplication = utils.ios.getter(UIApplication, UIApplication.sharedApplication)
var mainScreen = utils.ios.getter(UIScreen, UIScreen.mainScreen)

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
        //self.locationManager.startMonitoringSignificantLocationChanges();
        self.locationManager.startUpdatingLocation();
      }

    })

    application.on(application.suspendEvent, function(){
      console.log("## onsuspend")

      if(self.locationManager){
        self.locationManager.stopUpdatingLocation();
        //self.locationManager.stopMonitoringSignificantLocationChanges();
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
    var position = marker.position
     //var camPosition = GMSCameraPosition.cameraWithTargetZoom(position, 14)
    var center = GMSCameraUpdate.setTargetZoom(position, this._zoom);
    //this._ios.moveCamera(center)
    this._ios.animateWithCameraUpdate(center)
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


    for(var marker in MARKER_WINDOW_IMAGES){  
      var position = MARKER_WINDOW_IMAGES[marker].position
      bounds = bounds.includingCoordinate(position)      
    }

    var update = GMSCameraUpdate.fitBoundsWithPadding(bounds, 100.0)

    if(centerMarker){
      var center = GMSCameraUpdate.setTargetZoom(centerMarker.position, this._zoom);
      this._ios.moveCamera(center)
      this._ios.animateWithCameraUpdate(update);  
    }else{
      this._ios.animateWithCameraUpdate(update);  
    }    
  }

  MapView.prototype.addMarker = function(opts) {

    
    
    //console.log("####################### MapView.prototype.addMarker")
    //console.log(JSON.stringify(opts))
    //console.log("####################### MapView.prototype.addMarker")
    

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

    if(opts.iosPinColor){
      iconToUse = GMSMarker.markerImageWithColor(new Color(opts.iosPinColor).ios);
    }else if(!opts.iconPath){
      iconToUse = GMSMarker.markerImageWithColor(UIColor.blueColor());
    }else{

      if(IMAGE_CACHE[opts.iconPath]){
        iconToUse = IMAGE_CACHE[opts.iconPath]
      }else{
        if(opts.iconPath.indexOf('res://') > -1){      
          var resName = opts.iconPath.substring('res://'.length, opts.iconPath.length)
          iconToUse  = UIImage.imageNamed(resName)
        }else{
          var imageData = NSData.dataWithContentsOfFile(opts.iconPath)
          iconToUse  = UIImage.imageWithDataScale(imageData, mainScreen.scale)
        }
      }
    }

    if(opts.clear)
      this.clear()

    var latLng = CLLocationCoordinate2DMake(opts.latitude, opts.longitude)//.takeRetainedValue();
    openedMarker = GMSMarker.alloc().init()
    openedMarker.position = latLng;    
    openedMarker.title = opts.title;
    openedMarker.snippet = opts.snippet;    
    

    if (typeof this.draggable === 'boolean')
      openedMarker.draggable = this.draggable
    else if (typeof this.draggable === 'string')
      openedMarker.draggable = this.draggable == 'true'
    else 
      openedMarker.draggable = false


    openedMarker.icon  = iconToUse;

    openedMarker.tracksInfoWindowChanges = true    
    openedMarker.infoWindowAnchor = CGPointMake(0.5, 0.5);

    openedMarker.map = this._ios;
    

    if(opts.openOnClick == undefined || opts.openOnClick == null)
      opts.openOnClick = true

    
    MARKER_WINDOW_IMAGES[openedMarker] = {
      'markerKey': opts.markerKey,
      'windowImgPath': opts.windowImgPath,
      'phone': opts.phone || "",
      'email': opts.email || "",
      'openOnClick': opts.openOnClick,
      'position': latLng,
      'latitude': opts.latitude,
      'longitude': opts.longitude,      
      'marker': openedMarker
    }
  

    if(opts.showWindow){
      this.showWindow()
    }   

    if(opts.updateCamera){
      this.latitude = undefined
      this.longitude = undefined
      this.latitude = opts.latitude
      this.longitude = opts.longitude
      this.fitBounds(openedMarker)      
    }
  

    return openedMarker
  };

  MapView.prototype.selectMarker = function(marker){
    openedMarker = marker
  }

  MapView.prototype.clear = function(){
    this._ios.clear();

    for(marker in MARKER_WINDOW_IMAGES)
      marker.map = null;

    MARKER_WINDOW_IMAGES = {}
  }

  MapView.prototype.closeMarker = function(){
    if(openedMarker){
      this._ios.selectedMarker =null
    }
  }

  MapView.prototype.removeMarker = function(marker){
    marker.map = null
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
    var firstRouteIsDone = false

    var overlayAction = function(args){     

      if(navigationOriginMarker){
        navigationOriginMarker.map = undefined
        navigationOriginMarker = undefined
      }

      navigationOriginMarker = self.addMarker(args.origin)

      if(!this.hasMarkerLocation(args.destination))
        self.addMarker(args.destination)
      else
        console.log("## not add destination to route")
    
      if(args.origin && args.origin.latitude && args.origin.longitude){
        var bounds = GMSCoordinateBounds.alloc().init()        
        bounds = bounds.includingCoordinate(CLLocationCoordinate2DMake(origin.latitude, origin.longitude))
        bounds = bounds.includingCoordinate(CLLocationCoordinate2DMake(getCoordenates(destination.latitude), getCoordenates(destination.longitude)))      

        var coordenates = routeTask.getCoordenates()      
        
        for(var i in coordenates)
          bounds = bounds.includingCoordinate(coordenates[i])

        var update = GMSCameraUpdate.fitBoundsWithPadding(bounds, 100.0)      
        this._ios.moveCamera(update);
        this._ios.animateToViewingAngle(50);
        
      }
    }

    if(origin && origin.latitude && origin.longitude){          
      routeTask.execute({
        origin: origin, 
        destination: destination, 
        mapView: this._ios,
        doneCallback: function(attrs){
          overlayAction({
            origin: attrs.origin,
            destination: attrs.destination
          })       
        }
      })

      if(params.notUpdateRoute){
        params.doneFirstRote()
        return
      } 

      if(params.doneFirstRote){
        firstRouteIsDone = true
        params.doneFirstRote()
      }
    }

    onlyInitialPosition = false
    this.enableMyLocationUpdateListener({
      minTime: 60000,
      minDistance: 10,
      myLocationUpdateRouteCallback: function(args){

        console.log("### myLocationUpdateRouteCallback")

        self.clear()
        origin.latitude = args.latitude
        origin.longitude = args.longitude


        
        routeTask.execute({
          origin: origin, 
          destination: destination, 
          mapView: self._ios,
          doneCallback: function(arrts){
            overlayAction({
              origin: attrs.origin,
              destination: attrs.destination
            })       
          }
        })

        if(params.doneFirstRote && !firstRouteIsDone){
          firstRouteIsDone = true
          params.doneFirstRote()
        }

      }
    })   
  }

  MapView.prototype.hasMarkerLocation = function(args){

    for(var marker in MARKER_WINDOW_IMAGES){
      var it = MARKER_WINDOW_IMAGES[marker]
      if(it.latitude == getCoordinate(args.latitude) && it.longitude == getCoordinate(args.longitude))         
        return true
    }    

    return false

  }  

  MapView.prototype.getMarkerFromLocation = function(args){
    for(var marker in MARKER_WINDOW_IMAGES){
      var it = MARKER_WINDOW_IMAGES[marker]
      if(it.latitude == getCoordinate(args.latitude) && it.longitude == getCoordinate(args.longitude))         
        return it.marker            
    }    
    return undefined
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

    if(!this.locationManager || !this.locationManager.delegate){
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


      // Only report to location manager if the user has traveled 1000 meters
      this.locationManager.activityType = CLActivityTypeOtherNavigation //CLActivityTypeAutomotiveNavigation; 
      this.locationManager.requestAlwaysAuthorization()    
      //this.locationManager.startMonitoringSignificantLocationChanges()
      this.locationManager.startUpdatingLocation();
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

    //this.locationManager.stopMonitoringSignificantLocationChanges()
    if(this.locationManager){
      this.locationManager.stopUpdatingLocation()
      this.locationManager = undefined
    }

    onlyInitialPosition = false
  }

  MapView.prototype.navigateWithGoogleNavigator = function(args){    
    if (sharedApplication.canOpenURL(NSURL.URLWithString("comgooglemaps://"))) {
      var url = "comgooglemaps://?saddr=&daddr=" + args.latitude + "," + args.longitude
      sharedApplication.openURL(NSURL.URLWithString(url));
    } else {
      var iTunesLink = "itms://itunes.apple.com/us/app/apple-store/id585027354?mt=8";
      sharedApplication.openURL(NSURL.URLWithString(iTunesLink));      
    }    
  }

  MapView.prototype.openGoogleStreetView = function(args){    
    if (sharedApplication.canOpenURL(NSURL.URLWithString("comgooglemaps://"))) {
      var url = "comgooglemaps://?center=" + args.latitude + "," + args.longitude + "&mapmode=streetview"
      sharedApplication.openURL(NSURL.URLWithString(url));
    } else {
      var iTunesLink = "itms://itunes.apple.com/us/app/apple-store/id585027354?mt=8";
      sharedApplication.openURL(NSURL.URLWithString(iTunesLink));      
    }    
  }  

  function radians(degrees){
      return degrees * 3.14 / 180.0
  }

  MapView.prototype.distance = function(params){
    // let's give those values meaningful variable names

    var origin = params.origin
    var destination = params.destination

    var _lat  = radians(getCoordinate(origin.latitude)) 
    var _lng  = radians(getCoordinate(origin.longitude))
    var _lat2 = radians(getCoordinate(destination.latitude))
    var _lng2 = radians(getCoordinate(destination.longitude))


    // calculate the distance
    var result = 6371.0 * acos(cos(_lat2) * cos(_lat) * cos(_lng - _lng2) + sin(_lat2) * sin(_lat))
    return result
  }  

  function getCoordinate(coordinate){

    if(!coordinate)
      return 0.0

    if(typeof coordinate == 'number')
      return coordinate  

    if(isNaN(coordinate) && coordinate.length > 16)      
      return NSString.stringWithString(coordinate.substring(0, 16)).doubleValue    
    else
      return NSString.stringWithString(coordinate).doubleValue

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

          self._zoom = position.zoom

          if(self._ios){
            var visibleRegion = self._ios.projection.visibleRegion();
            
            if(self._onCameraPositionChangeCallback){
              self._onCameraPositionChangeCallback({
                latitude: position.target.latitude,
                longitude: position.target.longitude,
                visibleRegion:  {
                  left: visibleRegion.nearLeft.longitude,
                  top: visibleRegion.nearRight.latitude,
                  right: visibleRegion.farLeft.longitude,
                  bottom: visibleRegion.farRight.latitude,
                }              
              })
            }             
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
              'markerKey': MARKER_WINDOW_IMAGES[marker] ? MARKER_WINDOW_IMAGES[marker].markerKey : null
            })
          }
          
          //marker.showInfoWindow()
          self._ios.selectedMarker = marker;
          return true

        }

        MyMapViewDelegate.prototype.mapViewDidTapInfoWindowOfMarker = function(mapView, marker){
          if(self._onInfoWindowClickCallback && MARKER_WINDOW_IMAGES[marker].openOnClick){
            self._onInfoWindowClickCallback({
              'marker': marker,
              'markerKey': MARKER_WINDOW_IMAGES[marker] ? MARKER_WINDOW_IMAGES[marker].markerKey : null
            })
          }
        }

        MyMapViewDelegate.prototype.mapViewDidLongPressInfoWindowOfMarker = function(mapView, marker){
          if(self._onInfoWindowLongCallback && MARKER_WINDOW_IMAGES[marker].openOnClick){
            self._onInfoWindowLongCallback({
              'marker': marker,
              'markerKey': MARKER_WINDOW_IMAGES[marker] ? MARKER_WINDOW_IMAGES[marker].markerKey : null
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
           
            if(MARKER_WINDOW_IMAGES[marker] && MARKER_WINDOW_IMAGES[marker].windowImgPath)
              badge = MARKER_WINDOW_IMAGES[marker].windowImgPath
            else
              console.log('## not has image to custon window')
          }

          return null
        }

        MyMapViewDelegate.prototype.mapViewDidCloseInfoWindowOfMarker = function(mapView, marker){
          if(self._onInfoWindowCloseCallback){
            self._onInfoWindowCloseCallback({
              'marker': marker,
              'markerKey': MARKER_WINDOW_IMAGES[marker] ? MARKER_WINDOW_IMAGES[marker].markerKey : null
            })
          }
        }

        MyMapViewDelegate.prototype.mapViewDidBeginDraggingMarker = function(mapView, marker){

          if(self.draggable){
            if(self._onMarkerDragCallback && self._onMarkerDragCallback.onMarkerDragStart){
              self._onMarkerDragCallback.onMarkerDragStart({
                'marker': marker,
                'markerKey': MARKER_WINDOW_IMAGES[marker] ? MARKER_WINDOW_IMAGES[marker].markerKey : null
              })
            }
          }
        }

        MyMapViewDelegate.prototype.mapViewDidEndDraggingMarker = function(mapView, marker){

          if(self.draggable){
            var position = marker.position
            self.latitude = position.latitude
            self.longitude = position.longitude

            if(self._onMarkerDragCallback && self._onMarkerDragCallback.onMarkerDragEnd){
              self._onMarkerDragCallback.onMarkerDragEnd({
                'marker': marker,
                'markerKey': MARKER_WINDOW_IMAGES[marker] ? MARKER_WINDOW_IMAGES[marker].markerKey : null
              })
            }
          }
        }

        MyMapViewDelegate.prototype.mapViewDidDragMarker = function(mapView, marker){
          if(self.draggable){
            if(self._onMarkerDragCallback && self._onMarkerDragCallback.onMarkerDrag){
              self._onMarkerDragCallback.onMarkerDrag({
                'marker': marker,
                'markerKey': MARKER_WINDOW_IMAGES[marker] ? MARKER_WINDOW_IMAGES[marker].markerKey : null
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
        'markerKey': MARKER_WINDOW_IMAGES[marker] ? MARKER_WINDOW_IMAGES[marker].markerKey : null
      })

    var anchor = marker.position            
    var point = this._ios.projection.pointForCoordinate(anchor);

    var badge;

    if(MARKER_WINDOW_IMAGES[marker] && MARKER_WINDOW_IMAGES[marker].windowImgPath)
      badge = MARKER_WINDOW_IMAGES[marker].windowImgPath
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

    if(MARKER_WINDOW_IMAGES[marker].phone){
      var phone = UILabel.alloc().initWithFrame(CGRectMake(10, 45, 170, 10))
      phone.font = UIFont.systemFontOfSize(12)
      phone.text = MARKER_WINDOW_IMAGES[marker].phone
      outerView.addSubview(phone)
    }

    if(MARKER_WINDOW_IMAGES[marker].email){
      var email = UILabel.alloc().initWithFrame(CGRectMake(10, 60, 170, 10))
      email.font = UIFont.systemFontOfSize(12)
      email.text = MARKER_WINDOW_IMAGES[marker].email
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
      imageView.frame = CGRectMake(170, 10, 90, 80)
      imageView.contentMode = UIViewContentModeScaleAspectFit
      outerView.addSubview(imageView)
    }

    return outerView
  }  

  return MapView;
})(common.MapView);


exports.MapView = MapView;