var WebSocketServer = require('ws').Server,
    wss = new WebSocketServer({port: 8081})
var game = {
    curPlayer : 1,
    start : "INITIALIZE",
    curAction : "move1" // move1 - move2 - drawline
};
var arrayPath = [];//array to add used nodes
var node_1 = {x : -1, y :-1},// initial value of x and y to reset game outside the grid
    node_2 = {x : -1, y :-1};// initial value of x and y to reset game outside the grid
var game_over_obj = {};
function resetData(){
  game = {
    curPlayer : 1,
    start : "INITIALIZE",
    curAction : "move1" // move1 - move2 - drawline
  };
  arrayPath = [];
  node_1 = {x : -1, y :-1};
  node_2 = {x : -1, y :-1};
}
wss.on('connection', function (ws) {
  ws.on("error", function(error){
    console.log(error);
  });
  ws.on('message', function (message) {
    console.log('received: %s', message);
    var _objReceived = JSON.parse(message);
    if (_objReceived.msg == "INITIALIZE"){
      console.log('welcome');
      resetData();
      var _obj = {
        "id": _objReceived.id,
        "msg": "INITIALIZE",
        "body": {
            "newLine": null,
            "heading": "Player "+game.curPlayer,
            "message": "Awaiting Player "+game.curPlayer+"'s Move"
        }
      };
      var _strSend = JSON.stringify(_obj);
      ws.send(_strSend);
    }
    if (_objReceived.msg == "NODE_CLICKED"){
      var _ws = ws;
      var _id = _objReceived.id
      
      var _tmpCurAction = game.curAction;
      console.log('turn '+ _tmpCurAction);
      if (_tmpCurAction == "move1"){
        node_1.x = _objReceived.body.x;
        node_1.y = _objReceived.body.y;
        if (checkMove1Valid(node_1)){
          var _obj = {
            "id": _objReceived.id,
            "msg": "VALID_START_NODE",
            "body": {
                "newLine": null,
                "heading": "Player "+game.curPlayer,
                "message": "Select a second node to complete the line."
            }
          }
          game.curAction = "move2";
        } else {
          var _obj = {
            "id": _objReceived.id,
            "msg": "INVALID_START_NODE",
            "body": {
                "newLine": null,
                "heading": "Player "+game.curPlayer,
                "message": invalidNode1Msg
            }
          };
          game.curAction = "move1";
        }
      } else if (_tmpCurAction == "move2"){
        var _tmpNode = {
          x : _objReceived.body.x,
          y : _objReceived.body.y
        };
        if (checkMove2Valid(_tmpNode)){
          if (game.curPlayer == 1) game.curPlayer = 2;
          else game.curPlayer = 1;
          node_2 = _tmpNode;
          var _obj = {
            "id": _objReceived.id,
            "msg": "VALID_END_NODE",
            "body": {
                "newLine": {
                  "start": {
                      "x": node_1.x,
                      "y": node_1.y
                  },
                  "end": {
                      "x": node_2.x,
                      "y": node_2.y
                  }
                },
                "heading": "Player "+game.curPlayer,
                "message": "Awaiting "+game.curPlayer+"'s Move"
            }
          };
          game_over_obj = _obj.body.newLine;
          game.curAction = "move1";
        } else {
          var _obj = {
              "id": _objReceived.id,
              "msg": "INVALID_END_NODE",
              "body": {
                  "newLine": null,
                  "heading": "Player "+game.curPlayer,
                  "message": "Invalid move!"
              }
          };
          game.curAction = "move1";
        }
      }
      if (game.curAction != "gameover"){
        var _strSend = JSON.stringify(_obj);
        ws.send(_strSend);
        if (game.curAction == "end") {
          game.curAction = "gameover";
        }
      }
      setTimeout(function(){
        checkEndGame(_ws,_id);
      },500);
       
    }
  })
})

function checkMove1Valid(node){
  //first move must be end of path (start or end)
  if (arrayPath.length > 0){
    console.log("path : "+arrayPath.length);
    const endPath = arrayPath[arrayPath.length - 1];//to get the cordinates of the last node
    const StartPath = arrayPath[0];//coordinates of first node
    console.log(JSON.stringify(endPath));
    if ((node.x == endPath.x) && (node.y == endPath.y)){
      return true;
    }
    if ((node.x == StartPath.x) && (node.y == StartPath.y)){
      arrayPath.reverse();
      return true;
    }
  }
  //for first move
  else if (arrayPath.length == 0){
    if((node.x != -1) && (node.y != -1));
    arrayPath.push({x : node.x,y : node.y});
    return true;
  }
  //Deny all other cases
  return false;
}

function checkMove2Valid(node){
  //Can't be node_1
  const _pathed = arrayPath;
  console.log("Pathed : "+arrayPath.length);
  if ((node_1.x == node.x) && (node_1.y == node.y)){
    return false;
  }
  //Create Path
  var arrInPath = [];
  //Check ROW
  if (node_1.x == node.x){
    var min = node_1.y,max = node.y;
    if (node.y < node_1.y){min = node.y; max = node_1.y;} 
    for (var i = min;i<=max;i++){
      var _node = {x : node.x, y : i};
      arrInPath.push(_node);
    }
    if(node.y < node_1.y) arrInPath.reverse();
    arrInPath.splice(0,1);
  } else if (node_1.y == node.y){
  //Check Column
      var min = node_1.x,max = node.x;
      if (node.x < node_1.x){min = node.x; max = node_1.x;} 
      for (var i = min;i<=max;i++){
        var _node = {x : i, y : node.y};
        arrInPath.push(_node);
      }
      if(node.x < node_1.x) arrInPath.reverse();
      arrInPath.splice(0,1);
  } else if (Math.abs(node_1.x - node.x) == Math.abs(node_1.y - node.y)) {
  //Check Cross
    console.log("## check cross");
    var step = (node.y - node_1.y), minNode = node_1;
    if (node.y < node_1.y){step = (node_1.y - node.y) ;minNode=node}
    for (var i = 0;i<=step;i++){
      if ((node_1.x > node.x) && (node_1.y < node.y)){
          minNode = node_1;
          var _node = {x : (minNode.x - i), y : (minNode.y + i)};
      } else if ((node_1.x < node.x) && (node_1.y > node.y)){
          minNode = node_1;
          var _node = {x : (minNode.x + i), y : (minNode.y - i)};
      } else 
          var _node = {x : (minNode.x + i), y : (minNode.y + i)};
      arrInPath.push(_node);
    }
    if((node_1.x > node.x) && (node_1.y > node.y)) arrInPath.reverse();
    if (!isValidCross(node_1,arrInPath)) {
      return false; //
    }
  }
  if (arrInPath.length > 0) {
    for (var i in _pathed){
      for (var j in arrInPath){
        if (i != (_pathed.length - 1)){
          if ((arrInPath[j].x == _pathed[i].x) &&
            (arrInPath[j].y == _pathed[i].y)){
            return false;
          }
        }
      }
    }
    arrayPath =  _pathed.concat(arrInPath);
    return true;
  } else {
    return false;
  }
}


function checkEndGame(_ws,_id){
  console.log("End game checker");
  if (arrayPath.length < 2) return false;
  console.log(JSON.stringify(arrayPath[arrayPath.length - 1]));
  console.log(JSON.stringify(arrayPath[0]));
  if ((check9Nodes(arrayPath[arrayPath.length - 1]))&&
      (check9Nodes(arrayPath[0]))){
    var _obj = {
      "id": _id,
      "msg": "GAME_OVER",
      "body": {
          "newLine": null,
          "heading": "GAME OVER",
          "message": "Player "+game.curPlayer+" Win !"
      }
    }
    game.curAction = "end";
    if (game.curAction != "gameover"){
      var _strSend = JSON.stringify(_obj);
      _ws.send(_strSend);
      if (game.curAction == "end") game.curAction = "gameover";
    }
  }
}

function check9Nodes(node){
  var tmpArr = [];
  var left = {x : node.x - 1,y : node.y};
  if (validNode(left)) tmpArr.push(left);
  //console.log("L : "+JSON.stringify(left));
  var right = {x : node.x + 1,y : node.y};
  if (validNode(right)) tmpArr.push(right);
  //console.log("R : "+JSON.stringify(right));
  var up = {x : node.x,y : node.y - 1};
  if (validNode(up)) tmpArr.push(up);
  //console.log("U : "+JSON.stringify(up));
  var down = {x : node.x,y : node.y + 1};
  if (validNode(down)) tmpArr.push(down);
  //console.log("D : "+JSON.stringify(down));
  var leftUp = {x : node.x - 1,y : node.y - 1};
  if (validNode(leftUp)) tmpArr.push(leftUp);
  //console.log("LU : "+JSON.stringify(leftUp));
  var leftDown = {x : node.x - 1,y : node.y + 1};
  if (validNode(leftDown)) tmpArr.push(leftDown);
  //console.log("LD : "+JSON.stringify(leftDown));
  var RightUp = {x : node.x + 1,y : node.y - 1};
  if (validNode(RightUp)) tmpArr.push(RightUp);
  //console.log("RU : "+JSON.stringify(RightUp));
  var RightDown = {x : node.x + 1,y : node.y + 1};
  if (validNode(RightDown)) tmpArr.push(RightDown);
  //console.log("RD : "+JSON.stringify(RightDown));
  console.log("##8Points : " + tmpArr.length + " nodes near");
  var _newArr = [];
  const _pathed = arrayPath;
  for (var i in tmpArr){
    for (var j in _pathed){
      if ((tmpArr[i].x == _pathed[j].x) &&
          (tmpArr[i].y == _pathed[j].y))
          tmpArr[i].x = -1; // assign it to invalid node to remove
    } 
  }
  for (var k in tmpArr){
    if (validNode(tmpArr[k])) _newArr.push(tmpArr[k]);
  }
  console.log(_newArr);
  if (_newArr.length < 1) {
    return true;
  } else {
    for(var i in _newArr){
        if (Math.abs(_newArr[i].x - node.x) == Math.abs(_newArr[i].y - node.y)){
            console.log( JSON.stringify(_newArr[i]));
            console.log(isValidCross(node,[_newArr[i]]));
            if (!isValidCross(node,[_newArr[i]])){
                _newArr[i].x = -1;
            }
        }
    }
    var _newArr2 = [];
    for (var i in _newArr){
        if (validNode(_newArr[i]))
        _newArr2.push(_newArr[i]);
    }
    if (_newArr2.length < 1) return true;
    return false;
  }
}

function validNode(node){
  if ((node.x > -1) && 
      (node.y > -1) && 
      (node.x < 4) && 
      (node.y < 4))
  return true;
  else return false;
}
var invalidNode1Msg = "You must start on either end of the path!",
    invalidMsg = "",
    validNode1Msg = "VALID_START_NODE",
    validNode2Msg = "VALID_END_NODE",
    invalidNode2Msg = "invalid move. Try again.";

function isValidCross(_node,_arrInPath){
  var _endPoint = _arrInPath[_arrInPath.length-1];
  var _posX = (_endPoint.x < _node.x) ? 1 : -1;
  var _posY = (_endPoint.y < _node.y) ? 1 : -1;
  for (var i in _arrInPath){
      var _sideX = {
        x : _arrInPath[i].x + _posX,
        y : _arrInPath[i].y
      };
      var _sideY = {
        x : _arrInPath[i].x,
        y : _arrInPath[i].y + _posY
      }
      const _pathed = arrayPath;
      var _index1 = isInArray(_sideX,_pathed);
      var _index2 = isInArray(_sideY,_pathed);
      if ((_index1 > -1 )&&(_index2 > -1)&&((Math.abs(_index1 - _index2)) < 3)){
        return false;
      }
      
  }
  return true;
}

function isInArray(_node,_arr){
  for (var i in _arr){
    if ((_node.x == _arr[i].x) && (_node.y == _arr[i].y))
    return i;
  }
  return -1;
}