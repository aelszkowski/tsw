/*
  Po stronie klienta jest użyta biblioteka requireJS do rozwiązywania zależności między plikami JS
 */
require(['jquery','sockjs'],function() { 

  var viewDiv=$('#view') 
  var worldDiv=$('#world') 
  var segments={} 
  var snakes={} 
  var apples={} 
  var segmentSize=11 
  var mySnakeId=null 
  var camX=0,camY=0; 

  /* Funkcja przesuająca kamere na zadaną pozycje
   */
  var moveCameraTo=function(x,y) {
    camX=x 
    camY=y
    var xc=viewDiv[0].offsetWidth/2 
    var yc=viewDiv[0].offsetHeight/2
    var xp=xc-x*segmentSize 
    var yp=yc-y*segmentSize
    worldDiv.css('left',xp+'px') 
    worldDiv.css('top',yp+'px')
  }

  /* Wrzuca element DOM pokazujący segment węża do elementu DOM świata gry
   */
  var putSegment=function(x,y,sid) {
    var color=snakes[sid].color 
    if(segments[x+'_'+y]) segments[x+'_'+y].remove() 
    var seg=$('<div class="snakeSegment"></div>') 
    seg.css('background-color',color) 
    seg.css('left',(x*segmentSize)+'px') 
    seg.css('top',(y*segmentSize)+'px')
    segments[x+'_'+y]=seg 
    worldDiv.append(seg) 
  }

  /* Funkcja usuwająca element DOM segmentu o podanej pozycji
   */
  var removeSegment=function(x,y) {
    if(segments[x+'_'+y]) { 
      segments[x+'_'+y].remove() 
      delete segments[x+'_'+y] 
    }
  }

  /* Funkcja dodająca jabłko do gry
   */
  var putApple = function(x,y) {
    if(apples[x+'_'+y]) apples[x+'_'+y].remove() 
    var a=$('<div class="apple"></div>') 
    a.css('left',(x*segmentSize)+'px') 
    a.css('top',(y*segmentSize)+'px')
    apples[x+'_'+y]=a 
    worldDiv.append(a) 
  }

  /* Funkcja usuwająca jabłko z gry
   */
  var removeApple=function(x,y) {
    if(apples[x+'_'+y]) { 
      apples[x+'_'+y].remove() 
      delete apples[x+'_'+y] 
    }
  }

  var send=null 

  /* Funkcja łącząca z serwerem
   */
  var connect=function() {
    var sock = new SockJS('/ws'); 

    sock.onopen = function() { 
      send=function(msg) { 
        sock.send(JSON.stringify(msg)) 
      }
      $('.loader').fadeOut() 
      $('.info').slideDown() 
      $('.info button').click(function() { 
        if(mySnakeId) return; 
        $('.info').fadeOut() 
        send({type:'joinGame'}) 
      })
    }
    /* Funkcja obsługująca zdarzenie otrzymania wiadomości od serwera
    */
    sock.onmessage = (function(data) { 
      var msg=JSON.parse(data.data) 
      switch(msg.type) { 
        case 'gameState' : 
          for(var id in msg.snakes) { 
            var snake=msg.snakes[id] 
            snakes[snake.id]=snake 
            var segments=snake.segments 
            segments.forEach(function(seg) { 
              putSegment(seg.x,seg.y,snake.id) 
            })
          }
          msg.apples.forEach(function(p) { 
            putApple(p[0],p[1]) 
          })
        break;
        case 'joined' : 
          mySnakeId=msg.snakeId 
        break;
        case 'addSnake' : 
          var segments=msg.snake.segments 
          snakes[msg.snake.id]=msg.snake 
          segments.forEach(function(seg) { 
            putSegment(seg.x,seg.y,msg.snake.id) 
          })
          if(msg.snake.id==mySnakeId) moveCameraTo(segments[segments.length-1].x,segments[segments.length-1].y)
        break;
        case 'addSegment' : 
          snakes[msg.snakeId].segments.push(msg.segment) 
          putSegment(msg.segment.x,msg.segment.y,msg.snakeId) 
          if(msg.snakeId==mySnakeId) moveCameraTo(msg.segment.x,msg.segment.y)
        break;
        case 'removeSegment' : 
          snakes[msg.snakeId].segments.shift() 
          removeSegment(msg.segment.x,msg.segment.y) 
        break;
        case 'removeSnake' : 
          var snake=snakes[msg.snakeId] 
          snake.segments.forEach(function(seg) { 
            removeSegment(seg.x,seg.y) 
          })
          delete snakes[msg.snakeId]
          if(msg.snakeId==mySnakeId) setTimeout(function() { 
            send({type:'joinGame'}) 
          },500)
        break;
        case 'addApple' : 
          putApple(msg.x,msg.y) 
        break;
        case 'removeApple' : 
          removeApple(msg.x,msg.y) 
        break;
      }
    }).bind(this)
    sock.onclose = function() { 
      document.location.reload() 
    }
  }

  $(window).keydown(function(ev) { 
    switch(ev.keyCode) { 
      case 37: send({type:'setDirection', dir:3}); break;
      case 38: send({type:'setDirection', dir:0}); break;
      case 39: send({type:'setDirection', dir:1}); break;
      case 40: send({type:'setDirection', dir:2}); break;
    }
  })

  moveCameraTo(camX,camY) 
  connect() 

  $(window).resize(function() { 
    moveCameraTo(camX,camY)
  })
})