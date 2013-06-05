var serverPort=8011 
var http=require('http') 
var sockjs=require('sockjs') 
var httpStatic=require('node-static') 
var Game=require('./game').Game 
var game = new Game() 
var lastObserverId=0 
var socket = sockjs.createServer(); 

/*Obsługa zdarzenia połączenia SockJS
*/
socket.on('connection', function(conn) { 
  var send=function(msg) { conn.write(JSON.stringify(msg)) } 
  var controlledSnakeId = null 
  var observerId=++lastObserverId 
  game.addObserver(observerId,function(ev) { 

    if(ev.type=="removeSnake" && ev.snakeId==controlledSnakeId) { 
      controlledSnakeId=null 
    }
    send(ev) 
  })

/* Obsługa zdarzenia odebrania danych od klienta
*/
  conn.on('data', function(message) { 
    try { 

      var obj=JSON.parse(message); 

      if(!controlledSnakeId) { 
        switch(obj.type) { 
          case 'joinGame' : 
            controlledSnakeId=game.addRandomSnake() 
            send({type:'joined', snakeId:controlledSnakeId}) 
          break;
        }
      } else { 
        switch(obj.type) {
          case 'setDirection' : 
            game.snakes[controlledSnakeId].setDirection(obj.dir) 
          break;
        }
      }
    } catch(err) { 
      console.log(err); 
      // throw err //ta linia może być odkomentowana do debugowania komunikacji klient-server
    }
  });
  conn.on('close', function() {  
    game.removeObserver(observerId) 
    if(controlledSnakeId) { 
      game.killSnake(controlledSnakeId) 
    }
  });
});

var file = new(httpStatic.Server)('../client'); 

var server = http.createServer(function (request, response) { 
  request.addListener('end', function () { 
    file.serve(request, response); 
  });
  request.resume() 
});

socket.installHandlers(server, { 
  websocket:false, 
  prefix:'/ws' 
});

server.listen(serverPort); 
console.log('SNAKE SERVER STARTED! port: '+serverPort)

setInterval(function() { 
  game.processFrame() 
},150)