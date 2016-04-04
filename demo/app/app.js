"use strict";
var application = require("application");

if(application.ios){
    var MyDelegate = (function (_super) {
        __extends(MyDelegate, _super);
        function MyDelegate() {
            _super.apply(this, arguments);
        }
        MyDelegate.prototype.applicationDidFinishLaunchingWithOptions = function (application, launchOptions) {
        	GMSServices.provideAPIKey("your key api");
            return true
        };
        MyDelegate.prototype.applicationOpenURLSourceApplicationAnnotation = function (application, url, sourceApplication, annotation) {
            return false
        };
        MyDelegate.prototype.applicationDidBecomeActive = function (application) {
            
        };
        MyDelegate.prototype.applicationWillTerminate = function (application) {
            //Do something you want here
        };
        MyDelegate.prototype.applicationDidEnterBackground = function (application) {
            //Do something you want here
        };
        MyDelegate.ObjCProtocols = [UIApplicationDelegate];
        return MyDelegate;
    }(UIResponder));

    application.ios.delegate = MyDelegate;
}

application.start({ moduleName: "main-page" });