var application = require("application");

var polyline

function GoogleParser(params) {

    this.feedUrl = params.feedUrl,

    this.parse = function() {



        // Cria uma rota vazia
        var route = new Route()
        var self = this

        return fetch(this.feedUrl, {
          method: "GET",   
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },                     
        }).then(function(response){
              if (!response.ok) {
                console.log(JSON.stringify(response));
                throw "Ocorreu um erro desconhecido ao conectar com o servidor. Detalhes: " + response.statusText    
              }

              return response;

        }).then(function(response) {


            var result = JSON.parse(response._bodyText)

            //console.log("###########")
            //console.log(JSON.stringify(result.routes[0]))
            //console.log("###########")

            // Transforma a string em JSON
            //var json = new JSONObject(result);
            // Pega a primeira rota retornada
            var jsonRoute = result.routes[0]                                    
            var leg = jsonRoute.legs[0]
                    

            // Obtém os passos do caminho
            var steps = leg.steps

            var numSteps = steps.length
            /*
             * Itera através dos passos, decodificando 
             * a polyline e adicionando à rota.
             */
            var step
            for (var i = 0; i < numSteps; i++) {
                // Obtém o passo corrente
                step = steps[i]
                // Decodifica a polyline e adiciona à rota
                route.addPoints(self.decodePolyLine(step.polyline.points));                
            }

            //console.log("### route.getPoints().length()=" + route.getPoints().length)

            return route
        })

    }

    this.decodePolyLine = function(poly) {
        var len = poly.length
        var index = 0, lat = 0, lng = 0;
        var decoded = []


        while (index < len) {

            var b, shift = 0, result = 0
            
            do {
                b = poly.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20 && index < len);

            if(index >= len)
                break

            var dlat = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
            lat += dlat;

            shift = 0;
            result = 0;

            do {
                b = poly.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);

            if(index >= len)
                break


            var dlng = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
            lng += dlng;          
            

            //console.log("{ lat: " + (lat / 1E5) + ", lng: " + (lng / 1E5) + "},")

            decoded.push(new com.google.android.gms.maps.model.LatLng(lat / 1E5, lng / 1E5));

        }

        return decoded;
    }
};

function Route() {

    this.points = [],
    this.polyline,

    this.addPoints = function(pts) {
        for(var i = 0; i < pts.length; i++)
            this.points.push(pts[i])
    },

    this.getPoints = function() {
        return this.points;
    },

    this.setPolyline = function(p) {
        this.polyline = p;
    },

    this.getPolyline = function() {
        return this.polyline;
    }
};



function RouteTask(){


    this.execute = function(params){


        this.directions(params.origin, params.destination, function(route){


            var options = new com.google.android.gms.maps.model
                .PolylineOptions()
                .width(12)
                .color(android.graphics.Color.parseColor("#05b1fb")) 
                .geodesic(true)

            
            for(var i = 0; i < route.getPoints().length; i++){                    
                options.add(route.getPoints()[i]);                
            }           

            if(polyline)
                polyline.remove()

            polyline = params.mapView.addPolyline(options); 

            polyline.setClickable(true)

            params.mapView.invalidate()

            console.log("### add points end")

        })            
    },

    this.directions = function(start, dest, done) {


        // Formatando a URL com a latitude e longitude  
        // de origem e destino.  
        var urlRota =  "http://maps.googleapis.com/maps/api/"
                + "directions/json?origin=" + start.latitude + "," + start.longitude + "&"
                + "destination=" + dest.latitude + "," + dest.longitude + "&"
                + "sensor=true&mode=driving"

        console.log(urlRota)

        new GoogleParser({'feedUrl': urlRota})
        .parse()
        .then(function(rota){
            console.log("### rota=" +rota.getPoints().length)
                done(rota)
        });
    },

    this.remove = function(){
        if(polyline)
            polyline.remove()
    }

}


exports.RouteTask = RouteTask;