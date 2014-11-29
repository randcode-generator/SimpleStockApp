var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var databaseUrl = "mongodb://eric:eric@localhost:27017/stocks";
var collections = ["stocks", "stockHistory"];
var db = require("mongojs").connect(databaseUrl, collections);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.get('/add/:symbol', function(req, res){
  db.stocks.save({symbol: req.params.symbol});
  res.send(req.params.symbol + " added.");
});

app.get('/delete/:symbol', function(req, res){
  db.stocks.remove({symbol: req.params.symbol});
  db.stockHistory.remove({symbol: req.params.symbol});
  io.emit('delete', {symbol: req.params.symbol});
  res.send(req.params.symbol + " removed.");
});

db.stockHistory.remove({});
db.stocks.remove({});

var stockLoop = function(symbol) {
  var stock = {
    symbol: symbol.symbol,
    price: 30
  }
  if(counter % 2 == 0) {
    stock.price = stock.price + Math.random();
  } else {
    stock.price = stock.price - Math.random();
  }
  counter++;
  stock.price = Math.round(stock.price*100)/100;
  db.stockHistory.save(stock);
  stockHistoryProcess(stock);
}

var stockFind = function(err, stock) {
  if(err)
    console.log("Error: " + err);
  else
    stock.forEach(stockLoop);
}

var stockProcess = function(){
  db.stocks.find({},stockFind);
}

var stockHistoryProcess = function(stock){
  db.stockHistory.find(
    {symbol: stock.symbol},
    {limit: 10, sort:{_id:-1}},
    function(err, stockHistory) {
      if( err )
        console.log("Error: " + err);
      else {
        var h = "";
        stockHistory.forEach(function(history) {
          h += history.price + ", ";
        });
        stock.history = h.slice(0, -2);
        io.emit('message', stock);
      }
    }
  );
}

var counter = 0;
setInterval(function(){
  stockProcess();
}, 1000);

http.listen(3000, function(){
  console.log('listening on *:3000');
});
