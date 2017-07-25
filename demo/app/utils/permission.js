var permissions = require("nativescript-permissions");
var application = require('application')

function checker(successCallback, failCallback){
    if(application.android){

    var permissionList = [
      android.Manifest.permission.ACCESS_FINE_LOCATION
    ]

    permissions.requestPermission(permissionList).then(function(){
      successCallback()
    }).catch(function(message){

      if("not required" == message){
        successCallback()
      }else{
        console.log("## permission required not allowed")
        failCallback()      
      }      
    })

  } else {
    successCallback()
  }  
}

exports.checker = checker
