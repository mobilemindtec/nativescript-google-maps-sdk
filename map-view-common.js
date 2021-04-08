var view = require("@nativescrit/core/ui/core/view");

var MAPVIEW = "MapView";

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



  return MapView;
})(view.View);


exports.latitudeProperty = new view.Property({
    name: "latitude",
    valueChanged: function (target, oldValue, newValue) {
        
        if(newValue && !isNaN(newValue) && newValue.length > 16)
          target.latitude = Number(newValue.substring(0, 16))
        else
          target.latitude = Number(newValue);

        target.updateCamera()
    }
});

exports.longitudeProperty = new view.Property({
    name: "longitude",
    valueChanged: function (target, oldValue, newValue) {
        
        if(newValue && !isNaN(newValue) && newValue.length > 16)
          target.longitude = Number(newValue.substring(0, 16))
        else
          target.longitude = Number(newValue);

        target.updateCamera()
    }
});



exports.bearingProperty = new view.Property({
    name: "bearing",
    valueChanged: function (target, oldValue, newValue) {        
        target.bearing = parseInt(newValue) || 0
        target.updateCamera()
    }
});

exports.zoomProperty = new view.Property({
    name: "zoom",
    valueChanged: function (target, oldValue, newValue) {        
        target.zoom = parseInt(newValue) || 0
        target.updateCamera()
    }
});

exports.tiltProperty = new view.Property({
    name: "tilt",
    valueChanged: function (target, oldValue, newValue) {        
        target.tilt = newValue || ""
        target.updateCamera()
    }
});

exports.draggableProperty = new view.Property({
    name: "draggable",
    valueChanged: function (target, oldValue, newValue) {        
        target.draggable = newValue == true || newValue == 'true'
        target.updateCamera()
    }
});

exports.titleProperty = new view.Property({
    name: "title",
    valueChanged: function (target, oldValue, newValue) {        
        target.title = newValue || ""
        target.updateCamera()
    }
});

exports.snippetProperty = new view.Property({
    name: "snippet",
    valueChanged: function (target, oldValue, newValue) {        
        target.snippet = newValue || ""
        target.updateCamera()
    }
});

exports.defaultIconProperty = new view.Property({
    name: "defaultIcon",
    valueChanged: function (target, oldValue, newValue) {        
        target.defaultIcon = newValue
        target.updateCamera()
    }
});

exports.mapTypeProperty = new view.Property({
    name: "mapType",
    valueChanged: function (target, oldValue, newValue) {        
        target.mapType = newValue
        target.updateCamera()
    }
});

exports.zoonMarginProperty = new view.Property({
    name: "zoonMargin",
    valueChanged: function (target, oldValue, newValue) {        
        target.zoonMargin = parseInt(newValue) || 0
        target.updateCamera()
    }
});

exports.zoomPositionProperty = new view.Property({
    name: "zoomPosition",
    valueChanged: function (target, oldValue, newValue) {        
        target.zoomPosition = newValue
        target.updateCamera()
    }
});

exports.navigationControlMarginProperty = new view.Property({
    name: "navigationControlMargin",
    valueChanged: function (target, oldValue, newValue) {        
        target.navigationControlMargin = parseInt(newValue) || 0
        target.updateCamera()
    }
});


exports.navigationControlPositionProperty = new view.Property({
    name: "navigationControlPosition",
    valueChanged: function (target, oldValue, newValue) {        
        target.navigationControlPosition = newValue
        target.updateCamera()
    }
});

exports.useCustonWindowProperty = new view.Property({
    name: "useCustonWindow",
    valueChanged: function (target, oldValue, newValue) {        
        target.useCustonWindow = newValue == true || newValue == 'true'
        target.updateCamera()
    }
});


exports.bearingProperty.register(MapView);
exports.zoomProperty.register(MapView);
exports.tiltProperty.register(MapView);
exports.draggableProperty.register(MapView);
exports.titleProperty.register(MapView);
exports.snippetProperty.register(MapView);
exports.defaultIconProperty.register(MapView);
exports.mapTypeProperty.register(MapView);
exports.zoonMarginProperty.register(MapView);
exports.zoomPositionProperty.register(MapView);
exports.navigationControlMarginProperty.register(MapView);
exports.navigationControlPositionProperty.register(MapView);
exports.useCustonWindowProperty.register(MapView);


exports.MapView = MapView;