var frameModule = require("ui/frame");
var permission = require("~/utils/permission");


exports.loaded = function(args) {
    
    
}

exports.goMap = function() {

  var successCallback = function(){
	  var topmost = frameModule.topmost() 
	  topmost.navigate({
	    moduleName: "views/home/home", 
	    animated: true,
	  });   	
  }
  	
  var failCallback = function(){
    dialogsModule.alert({
      title: config.appName,
      message: "Você deve liberar todas as permissões para continuar",
      okButtonText: "OK"
    }).then(function(){
      permission.checker(successCallback, failCallback)
    })             
  }

  permission.checker(successCallback, failCallback)	

}

