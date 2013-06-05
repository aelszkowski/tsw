/*
  Funkcja konwertująca kolory HSL na kolory RGB
  Została wykorzystana do wyliczania losowych kolorów węży
 */
function hslToRgb(h, s, l){
  var r, g, b;
  if(s == 0){
    r = g = b = l;
  }else{
    function hue2rgb(p, q, t){
      if(t < 0) t += 1;
      if(t > 1) t -= 1;
      if(t < 1/6) return p + (q - p) * 6 * t;
      if(t < 1/2) return q;
      if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255)];
}

var dirVec=[{x:0, y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}] // Tablica wektorów ruchu odpowiadających kierunkom: n,e,s,w

/*
  Klasa węża
 */
var Snake = function(game,id,sx,sy,dir,len,color) {
  this.game=game 
  this.id=id 
  this.x=sx 
  this.y=sy
  this.dir=dir 
  this.length=len 
  this.segments=[{x:sx,y:sy}] 
  this.color=color 
  this.lastDir=dir 
}

/* Metoda do zmiany kierunku węża
 */
Snake.prototype.setDirection = function(dir) {
  if(Math.abs(this.lastDir-dir)==2) return; 
  this.dir=dir 
}

/* Metoda wydłużająca węża od zadaną liczbę jabłek
 */
Snake.prototype.incraseLength = function(by) {
  this.length+=by 
}

/* Metoda wykonująca ruch węża, wykonywana co klatkę gry
 */
Snake.prototype.move = function() {
  this.x+=dirVec[this.dir].x 
  this.y+=dirVec[this.dir].y 

  if(this.game.getSegment(this.x,this.y)) { 
    this.game.killSnake(this.id) 
    return; 
  }
  if(this.game.getApple(this.x,this.y)){ 
    this.game.removeApple(this.x,this.y) 
    this.length+=1 
  }
  var newSegment={x:this.x,y:this.y} 
  this.game.addSegment(newSegment.x,newSegment.y,this.id) 
  this.segments.push(newSegment) 

  if(this.segments.length>this.length) { 
    var segment=this.segments[0] 
    this.game.removeSegment(segment.x,segment.y,this.id) 
    this.segments.shift() 
  }

  this.lastDir=this.dir 
}

/* Metoda zwraca dane węża które są przydatne dla klienta do wyświetlenia go
 */
Snake.prototype.getNetInfo = function() {
  return {
    id:this.id, 
    color:this.color, 
    segments:this.segments 
  }
}

/* Metoda po cichu usuwa węża z gry
 */
Snake.prototype.remove = function() {
  this.segments.forEach((function(segment) { 
    this.game.removeSegment(segment.x,segment.y,this.id,true) 
  }).bind(this))
}

/*
  Klasa gry, zawiera wszystkie węże i wszystkie jabłka i wszystkich obserwatorów
 */
var Game = function() {
  this.snakes={} 
  this.deadSnakes={} 
  this.newSegments={} 
  this.oldSegments={} 
  this.lastSnakeId=0 
  this.observers={} 
  this.apples={} 
  this.applesPerSnake=2 

  for(var i=0; i<10; i++) this.addRandomApple() 
}    

/* Metoda dodaje segment do gry i wysyła informacje o nim do obserwatorów
 */
Game.prototype.addSegment = function(x,y,snakeId) {
  this.broadcastEvent({type:"addSegment", snakeId:snakeId, segment:{x:x,y:y}}) 
  this.newSegments[x+'_'+y]=snakeId 
}

/* Metoda usuwa segment z gry i wysyła informacje o tym do obserwatorów
 */
Game.prototype.removeSegment = function(x,y,snakeId,quiet) {
  if(!quiet) this.broadcastEvent({type:"removeSegment", snakeId:snakeId, segment:{x:x,y:y}}) 
  delete this.newSegments[x+'_'+y] 
}

/* Metoda do pobierania segmentów wg. pozycji, jest wykorzystywana do wykrywania kolizji
 */
Game.prototype.getSegment = function(x,y) {
  return this.oldSegments[x+'_'+y] 
}

/* Metoda wyliczająca rozrzucenie pojawiąjących się węży - zależy ono od ilości węży w grze
 */
Game.prototype.getSnakeSpread = function() {
  return Object.keys(this.snakes).length*7+5
}

/* Metoda wyliczająca rozrzucenie pojawiąjących się jabłek - zależy ono od ilości węży w grze
 */
Game.prototype.getAppleSpread = function() {
  return Object.keys(this.snakes).length*15+25
}

/* Metoda dodająca losowe jabłko
 */
Game.prototype.addRandomApple = function() {
  var x, y, rc=0 
  var as=this.getAppleSpread() 
  do { 
    x=Math.floor(Math.random()*(as*2+1))-as 
    y=Math.floor(Math.random()*(as*2+1))-as
    rc++ 
    if(rc>1000) return; 
  } while(this.getSegment(x,y) || this.apples[x+'_'+y]) 
  this.broadcastEvent({type:"addApple", x:x, y:y}) 
  this.apples[x+'_'+y]=true 
}

/* Metoda usuwająca jabłko o podanej pozycji
 */
Game.prototype.removeApple = function(x,y) {
  this.broadcastEvent({type:"removeApple", x:x, y:y}) 
  delete this.apples[x+'_'+y] 
}

/* Metoda pobierająca jabłko o podanej pozycji - służy do wykrywania jabłek na drodze węża
 */
Game.prototype.getApple = function(x,y) {
  return this.apples[x+'_'+y] 
}

/* Metoda do generowania kolejnych unikalnych ID węży
 */
Game.prototype.nextSnakeId = function() {
  return ++this.lastSnakeId 
}

/* Metoda dodająca losowego węża i zwracająca jego ID
 */
Game.prototype.addRandomSnake = function() {
  var ss=this.getSnakeSpread() 
  var x=Math.floor(Math.random()*(ss*2+1))-ss 
  var y=Math.floor(Math.random()*(ss*2+1))-ss

  var rgb=hslToRgb(Math.random(),0.5,0.5) 
  var color='rgb('+rgb.join(',')+')' 

  var snake=new Snake(this,this.nextSnakeId(),x,y,Math.floor(Math.random()*4),5,color) 
  this.snakes[snake.id]=snake 
  this.broadcastEvent({type:"addSnake", snake:snake.getNetInfo()}) 
  return snake.id 
}

/* Metoda zabijająca węża z opóźnieniem.
   Konieczne jest usuwanie węża po zakończeniu klatki gry, a nie w czasie jej trwania.
 */
Game.prototype.killSnake = function(id) {
  this.deadSnakes[id]=true 
}

/* Metoda przetwarzająca klatkę logiki gry
 */
Game.prototype.processFrame = function() {
  this.oldSegments=this.newSegments 
  this.newSegments=JSON.parse(JSON.stringify(this.oldSegments)) 

  for(var id in this.snakes) { 
    this.snakes[id].move() 
  }
  for(var id in this.deadSnakes) { 
    this.broadcastEvent({type:"removeSnake", snakeId:id, segments:this.snakes[id].segments}) /
    this.snakes[id].remove() 
    delete this.snakes[id] 
  }
  this.deadSnakes={} 

  if(Object.keys(this.apples).length<Object.keys(this.snakes).length*this.applesPerSnake) { 
    this.addRandomApple()
  }
}

/* Metoda rozsyłająca zdarzenie do wszystkich obserwatorów
 */
Game.prototype.broadcastEvent=function(ev) {
  for(var id in this.observers) { 
    this.observers[id](ev) 
  }
}

/* Metoda dodająca obseratora i wysyłająca mu stan gry
 */
Game.prototype.addObserver=function(id,ob) {
  this.observers[id]=ob 
  var snakeInfo={} 
  var appleInfo=[] 
  for(var k in this.snakes) { 
    snakeInfo[k]=this.snakes[k].getNetInfo() 
  }
  for(var k in this.apples) { 
    appleInfo.push(k.split('_')) 
  }
  ob({ 
    type:'gameState', 
    snakes:snakeInfo, 
    apples:appleInfo 
  })
}

/* Metoda usuwająca obseratora
 */
Game.prototype.removeObserver=function(id) {
  delete this.observers[id] 
}

exports.Game=Game