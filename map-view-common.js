var view = require("ui/core/view");
var dObservable = require("ui/core/dependency-observable");
var proxy = require("ui/core/proxy");

var MAPVIEW = "MapView";
var CAMERA_PROPERTIES = [ "latitude", "longitude", "bearing", "zoom", "tilt", "draggable", "title", "snippet", "defaultIcon", "mapType", "zoonMargin", "useCustonWindow"];

var MapView = (function (_super) {
  __extends(MapView, _super);
  function MapView() {
    _super.apply(this, arguments);
  }

  this._onInfoWindowClickCallback = null;
  this._onInfoWindowCloseCallback = null;
  this._onInfoWindowLongCallback = null;
  this._onMarkerDragCallback = null;
  this._onMarkerClickCallback = null;
  this._custonWindowMarkerCreator = null;

  MapView.prototype.enableDefaultFullOptions = function() {};

  MapView.prototype.addMarker = function(opts) {};

  MapView.prototype.enableMyLocationUpdateListener = function(myLocationUpdateCallback) {};  

  MapView.prototype.disableMyLocationUpdateListener = function() {};  

  MapView.prototype.addMyLocationMarker = function(myLocationUpdateCallback) {};  

  MapView.prototype.updateCamera = function() {};

  MapView.prototype.getLocationFromLocationName = function(args){ };

  MapView.prototype.closeMarker = function(){}

  MapView.prototype.showWindow = function(){}

  MapView.prototype.hideWindow = function(){}

  MapView.prototype.setOnInfoWindowClickListener = function(onInfoWindowClickCallback){
    this._onInfoWindowClickCallback = onInfoWindowClickCallback;
  };

  MapView.prototype.setOnInfoWindowCloseListener = function(onInfoWindowCloseCallback){
    this._onInfoWindowCloseCallback = onInfoWindowCloseCallback;
  };

  MapView.prototype.setOnInfoWindowLongClickListener = function(onInfoWindowLongCallback){
    this._onInfoWindowLongCallback = onInfoWindowLongCallback;
  };

  MapView.prototype.setOnInfoWindowLongClickListener = function(onInfoWindowLongCallback){
    this._onInfoWindowLongCallback = onInfoWindowLongCallback;
  };

  MapView.prototype.setCameraPositionChangeListener = function(onCameraPositionChangeCallback){
    this._onCameraPositionChangeCallback = onCameraPositionChangeCallback;
  };

  MapView.prototype.setOnMarkerDragListener = function(onMarkerDragCallback){
    this._onMarkerDragCallback = onMarkerDragCallback;
  }; 

  MapView.prototype.setOnMarkerClickListener = function(onMarkerClickCallback){
    this._onMarkerClickCallback = onMarkerClickCallback;
  }; 

  MapView.prototype.setCustonWindowMarkerCreator = function(custonWindowMarkerCreator){
    this._custonWindowMarkerCreator = custonWindowMarkerCreator
  }

  MapView.prototype.notifyMapReady = function() {
    this.notify({
      eventName: MapView.mapReadyEvent,
      object: this,
      gMap: this.gMap
    });
  };

  MapView.mapReadyEvent = "mapReady";

  var onCameraPropertiesChanged = function(data) {
    var mapView = data.object;
    mapView.updateCamera(data);
  }

  CAMERA_PROPERTIES.forEach(function( name ) {
    var metadata = new dObservable.PropertyMetadata(0, dObservable.PropertyMetadataSettings.None, onCameraPropertiesChanged);
    var property = new dObservable.Property(name, MAPVIEW, metadata);
    exports[ name + "Property" ] = property;

    Object.defineProperty( MapView.prototype, name, {
      get: function() {
        return this._getValue( property );
      },
      set: function( value ) {
        var parsedValue = value

        if(value && (name == 'latitude' || name == 'longitude')){

          if(value && !isNaN(value) && value.length > 16)
            parsedValue = Number(value.substring(0, 16))
          else
            parsedValue = Number(value);

        }

        this._setValue( property, parsedValue);
      }
    });
  });

  return MapView;
})(view.View);


exports.MapView = MapView;