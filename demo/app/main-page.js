var frameModule = require("ui/frame");


exports.loaded = function(args) {
    
    
}

exports.goMap = function() {
  var topmost = frameModule.topmost() 
  topmost.navigate({
    moduleName: "views/home/home", 
    animated: true,
  }); 
}