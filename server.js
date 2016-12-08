/*
 * Project Name: $ cat my.moment
 * 
 * --[------->++<]>.----.+[->+++<]>.--.--[--->+<]>-.[---->+<]>+++.
 * 
 * Project Description: A social platform for users to post their moments in microblog-style.
 * Team member: Martin Cheng 442872
 *              Michael Windlinger 441613
 *              
 * +[------->++<]>-.--[--->+<]>.-----[++>---<]>.--[-->+++++<]>-.++.--.--------.+++++++++.++++++.
 * 
 * Please see buttom of the page for citation.
 * 
 * Thank you
 * 
 * P.S. Notice that Api key is omitted
 */

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
var urlencodedParser = bodyParser.urlencoded({ extended: false });
var multer = require('multer');
var socketio = require("socket.io");
var mongo = require('mongodb');
var MongoClient = require('mongodb').MongoClient;
var crypto = require('crypto');
var escapeHtml = require('escape-html');
var request = require('ajax-request');
var http = require("http");
var querystring = require("querystring");
var ignoreSafety = false;
const util = require('util');
const apikey = "***************************";            // API KEY IS OMITTED
//util.inspect(result, false, null);

//Parameters
var dbUrl = 'mongodb://localhost:27017/creativeproject';
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, '../Client/uploads');
    },
    filename: function (req, file, cb) {
        var datetimestamp = Date.now();
        var randomFilename = randomAsciiString(9);
        cb(null, randomFilename + '_' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length -1]);
    }
});
var upload = multer({storage: storage}).single('file');

//Transiant parameters
var onlineUsers = [];

//Server settings
app.use(function(req, res, next) {      
        res.setHeader("Access-Control-Allow-Methods", "POST, PUT, OPTIONS, DELETE, GET");
        res.header("Access-Control-Allow-Origin", "http://localhost");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });
app.use(express.static('../Client'));   //Default load index.html in ../Client directory

//Backend settings
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

//Start listening
var server = app.listen(4567,function(){
        console.log("Serving on port 4567");
    });
var io = socketio.listen(server);

//Database functions
var searchMoments = function(db, queries, callback) {       //queries = [string]
  var collection = db.collection('moments');
  var results = [];
  var search = [];
  var keyword = {};
  var regex = null;
  var shallowResultId = [];
  
  for (var i = queries.length - 1; i >= 0; i--) {
    keyword = {};
    keyword.tags = queries[i];
    search.push(keyword);
  }
  
  collection.find({ $or:search }).toArray(function(err, docs) {
    if (!err) {
        for (var j = docs.length - 1; j >= 0; j--) {
            results.push(docs[j]);
            shallowResultId.push(docs[j]._id);
        }
    }
    else{
        console.log("search error:"+err);
    }
    search = [];
    for (var i = queries.length - 1; i >= 0; i--) {
        regex = new RegExp(".*" + queries[i] + ".*");
        keyword = {};
        keyword.description = regex;
        search.push(keyword);
      }
    collection.find({ $or:search }).toArray(function(err2, docs2) {
        if (!err2) {
            var doPush = true;
            for (var k = docs2.length - 1; k >= 0; k--) {
                for (var l = 0;l<shallowResultId.length;l++) {
                    if (String(docs2[k]._id) === String(shallowResultId[l])) {
                        doPush = false;
                    }
                }
                if (doPush) {
                    results.push(docs2[k]);
                }
            }
            callback(results,true);
        }
        else{
            console.log("regex search error:"+err2);
            callback(results,false);
        }
    });
  });      
};

var editMoment = function(db, editPack, callback) {         //editPack = {.momentId, .author, }
    var collection = db.collection('moments');
    
    
    var objId = new mongo.ObjectID(editPack.searchForId);
    
    
    collection.find({ _id:objId }).toArray(function(err, docs) {
      if (!err && docs.length===1) {
          var originalAuthor = docs[0].author;
          if (originalAuthor === editPack.author || ignoreSafety) {
              collection.updateOne({
                  _id : objId
                  }, {
                      $set: {
                              description:editPack.description,
                              emotion:editPack.emotion,
                              time:editPack.time,
                              orderTime:editPack.orderTime
                  }}, function(err, result) {
                  //assert.equal(err, null);
                  //assert.equal(1, result.result.n);
                  if (!err && result.result.n===1) {
                      callback(true, result.result.n, '',err);            //callback(opOK, card(OKop), errMsg, err)
                  }
                  else {
                      console.log(err);
                      callback(false, result.result.n?result.result.n:0, 'No moment of that id is updated', err);
                  }
                });  
          }
          else {
              console.log('Unauthorized edit');
              callback(false, 0, 'Unauthorized edit', err);
          }
      }
      else{
          console.log("search error:"+err+';found:'+docs.length?docs.length:0);
          callback(false, docs.length?docs.length:0, 'Cannot find moment of that id', err);
      }
    });      
};

var tryLogin = function(db, loginPack, callback) {         //loginPack = {.username, .password }
    var collection = db.collection('users');
    collection.find({ username:loginPack.username }).toArray(function(err, docs) {
      if (!err && docs.length===1) {
          var originalPwd = docs[0].password;
          if (originalPwd === loginPack.password) {
              callback(true, '');
          }
          else {
              console.log('Login denied for unmatch pwd');
              callback(false, 'Username and password do not match our record.');        //callback(loginOK, errMsg);
          }
      }
      else{
          console.log('Login denied for nonexisting username');
          callback(false, 'Username and password do not match our record.');
      }
    });      
};

var trySignup = function(db, signupPack, callback) {         //signupPack = {.username, .password }
    var collection = db.collection('users');
    collection.find({ username:signupPack.username }).toArray(function(err, docs) {
        if (!err && docs.length===0) {
            collection.insertOne({username: signupPack.username, password: signupPack.password }, function(err, result) {
                //assert.equal(err, null);
                //assert.equal(1, result.result.n);
                if (!err && result.result.n===1) {
                    callback(true, '');            
                }
                else {
                    console.log("signup error:"+err);
                    callback(false, 'Sign up failed. We are experiencing technical difficulties.');
                }
              });  
        }
        else{
          console.log("signup error:"+err+';found user with that username:'+docs.length?docs.length:0);
          callback(false, 'User already exists.');
        }
    });      
};

var fetchNewMoments = function(db, callback) {       //queries = [string]
  var collection = db.collection('moments');
  var results = [];
  
  collection.find().sort( { orderTime: 1 } ).limit(30).toArray(function(err, docs) {
    if (!err) {
        for (var j = docs.length - 1; j >= 0; j--) {
            results.push(docs[j]);
        }
        callback(results, true);
    }
    else{
        console.log("search error:"+err);
        callback(results, false);
    }
  });      
};

var fetchUserMoment = function(db, searchForUser, callback) {         //loginPack = {.username, .password }
    var collection = db.collection('moments');
    var results = [];
    collection.find({ author:searchForUser }).toArray(function(err, docs) {
        if (!err) {
            for (var j = docs.length - 1; j >= 0; j--) {
                results.push(docs[j]);
            }
            callback(results, true);
        }
        else{
            console.log("search user moment error:"+err);
            callback(results, false);
        }
    });      
};

var fetchTheMoment = function(db, searchForId, callback) {         //loginPack = {.username, .password }
    var collection = db.collection('moments');
    var results = [];
    var objId = new mongo.ObjectID(searchForId);
    collection.find({ _id:objId }).toArray(function(err, docs) {
        if (!err) {
            
            if (docs.length>0) {
                results.push(docs[0]);
                callback(results, true);
            }
            else {
                console.log("moment of this id not found:"+searchForId);
                callback(results, false);
            }
            
        }
        else{
            console.log("search moment id error:"+err);
            callback(results, false);
        }
    });      
};

//Update moment where _id===searchForId, push (text, author, time, orderTime) into comments
var addComment = function(db, commentPack, callback) {         //editPack = {.momentId, .author, }
    var collection = db.collection('moments');
    var objId = new mongo.ObjectID(commentPack.searchForId);
    collection.find({ _id: objId }).toArray(function(err, docs) {
      if (!err && docs.length===1) {
        collection.updateOne({
            _id : objId
            }, {
                "$push" : {
                  "comments" : {
                        text:commentPack.text,
                        author:commentPack.author,
                        time:commentPack.time,
                        orderTime:commentPack.orderTime
                  }
                }
            }, function(err, result) {
            if (!err && result.result.n===1) {
                callback(true, result.result.n, '',err);            //callback(opOK, card(OKop), errMsg, err)
            }
            else {
                console.log(err);
                callback(false, result.result.n?result.result.n:0, 'Update:push comment failure', err);
            }
          });  
      }
      else{
          console.log("search error:"+err+';found:'+docs.length?docs.length:0);
          callback(false, docs.length?docs.length:0, 'Cannot find moment of that id', err);
      }
    });      
};

//Update moment where _id===searchForId, change vote to value
var changeVote = function(db, votePack, callback) {         //editPack = {.momentId, .author, }
    var collection = db.collection('moments');
    var objId = new mongo.ObjectID(votePack.searchForId);
    collection.find({ _id:objId }).toArray(function(err, docs) {
      if (!err && docs.length===1) {
        collection.updateOne({
            _id : objId
            }, {
                "$set" : {
                  vote : votePack.value
                }
            }, function(err, result) {
            if (!err && result.result.n===1) {
                callback(true, result.result.n, '',err);            //callback(opOK, card(OKop), errMsg, err)
            }
            else {
                console.log(err);
                callback(false, result.result.n?result.result.n:0, 'Update:change vote failure', err);
            }
          });  
      }
      else{
          console.log("search error:"+err+';found:'+docs.length?docs.length:0);
          callback(false, docs.length?docs.length:0, 'Cannot find moment of that id', err);
      }
    });        
};

//Check author with ignoreSafety flag
//Delete moment where _id===searchForId
var delMoment = function(db, delPack, callback) {         //editPack = {.momentId, .author, }
    var collection = db.collection('moments');
    var objId = new mongo.ObjectID(delPack.searchForId);
    collection.find({ _id:objId }).toArray(function(err, docs) {
      if (!err && docs.length===1) {
          var originalAuthor = docs[0].author;
          if (originalAuthor === delPack.author || ignoreSafety) {
              collection.deleteOne({ _id : objId }, function(err, result) {
                  if (!err && result.result.n===1) {
                      callback(true, result.result.n, '',err);            //callback(opOK, card(OKop), errMsg, err)
                  }
                  else {
                      console.log(err);
                      callback(false, result.result.n?result.result.n:0, 'No moment of that id is removed', err);
                  }
                });  
          }
          else {
              console.log('Unauthorized edit');
              callback(false, 0, 'Unauthorized edit', err);
          }
      }
      else{
          console.log("search error:"+err+';found:'+docs.length?docs.length:0);
          callback(false, docs.length?docs.length:0, 'Cannot find moment of that id', err);
      }
    });      
};

var addMoment = function(db, m0m3n72in53r7, callback) {         //signupPack = {.username, .password }
    var collection = db.collection('users');
    var momentCollection = db.collection('moments');
    collection.find({ username:m0m3n72in53r7.author }).toArray(function(err, docs) {
        if ((!err && docs.length===1)||ignoreSafety) {
            momentCollection.insertOne(m0m3n72in53r7, function(err, result) {
                if (!err && result.result.n===1) {
                    callback(true, '');            //callback(opOK, card(OKop), errMsg, err)
                }
                else {
                    console.log("signup error:"+err);
                    callback(false, 'Posting failed. We are experiencing technical difficulties.');
                }
              });  
        }
        else{
          console.log("signup error:"+err+';user of that name:'+docs.length?docs.length:0);
          callback(false, 'User does not 3xi5t5.');
        }
    });      
};





/*
    MongoClient.connect(dbUrl, function(err, db) {
            console.log("Connected successfully to server");
            
            tryLogin(db, loginPack, function(){});//callback(opOK, card(OKop), errMsg, err)
            
            findDocuments(db, ready2Insert[0],function(result) {
                
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(whatObj));
                db.close();
              });
        
          });
*/


//0010 111 010   0100 111 110 00 10   1010 111 10 1 010 111 0100 0100 0 0100
app.post('/handlelogin', urlencodedParser, function (req, res) {
    console.log("Handling Login");
    if (!req.body) return res.sendStatus(400);
    var data2send = {};         //data2send.search:[{},{}]
    if (req.body.username && req.body.password) {
        var username = req.body.username;
        var password = req.body.password;
        if (!ignoreSafety) {
            username = escapeMongo(String(username));
            password = String(password);
        }
        var shed = crypto.pbkdf2Sync(password, reverseString(password), 1000, 512, 'sha512').toString('hex');
        var loginPack = {
            username:username,
            password:shed
            };
        //Check user exist
        //Check password
        MongoClient.connect(dbUrl, function(err, db) {
            console.log("Connected successfully to server");
            
            tryLogin(db, loginPack, function(loginOK, errMsg){  //callback(loginOK, errMsg);
                data2send.loginOK = 'NO';
                data2send.username = loginPack.username;
                data2send.error = '';
                console.log(loginOK);
                if (loginOK) {
                    data2send.loginOK = 'YES';
                }
                else {
                    data2send.error = errMsg;
                }
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(data2send));
                db.close();
                });
            });
    }
    else {
        data2send.loginOK = 'NO';
        data2send.username = '';
        data2send.error = 'Invalid username or password';
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(data2send));
    }
    
});

app.post('/handlesignup', urlencodedParser, function (req, res) {
    console.log("Handling Signup");
    if (!req.body) return res.sendStatus(400);
    var data2send = {};         //data2send.search:[{},{}]
    if (req.body.username && req.body.password) {
        var username = req.body.username;
        var password = req.body.password;
        if (!ignoreSafety) {
            username = escapeMongo(String(username));
            password = String(password);
        }
        var shed = crypto.pbkdf2Sync(password, reverseString(password), 1000, 512, 'sha512').toString('hex');
        //Check user exist
        //Register user
        var signupPack = {
            username: username,
            password: shed
            };
        MongoClient.connect(dbUrl, function(err, db) {
            console.log("Connected successfully to server");
            
            trySignup(db, signupPack, function(signupOK, errMsg){  //callback(loginOK, errMsg);
                data2send.loginOK = 'NO';
                data2send.username = signupPack.username;
                data2send.error = '';
                if (signupOK) {
                    data2send.loginOK = 'YES';
                }
                else {
                    data2send.error = errMsg;
                }
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(data2send));
                db.close();
            });
        });
    }
    else {
        data2send.loginOK = 'NO';
        data2send.username = '';
        data2send.error = 'Invalid username or password';
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(data2send));
    }
});


//For grandCtrl controller
io.sockets.on("connection", function(socket){
    console.log("A client has connected to the socket channel.");
    
    //Add loggin user
    socket.on("login", function(data){
        onlineUsers.push(data.username);
        console.log("A client has declared login. Current online headcount: "+onlineUsers.length);
    });
    
    //Remove logged out user
    socket.on("logout", function(data){
        if (onlineUsers.length > 0) {
            for (var i = 0; i < onlineUsers.length; i++) {
                if(onlineUsers[i] === data.username){
                    onlineUsers.splice(i,1);
                }
            }
            console.log("A client has declared logout. Current online headcount: "+onlineUsers.length);
        }
    });
});

app.post('/handleupdate', urlencodedParser, function (req, res) {
    console.log("Handling Update");
    if (!req.body) return res.sendStatus(400);
    if (req.body.update === 'update' || ignoreSafety) {
        var data2send = {};         //data2send.moments:[{},{}]
        data2send.moments = [];
        //Pull latest 30 moments ordered by orderTime
        //Fill in id prop
        MongoClient.connect(dbUrl, function(err, db) {
            console.log("Connected successfully to server");
            
            fetchNewMoments(db, function(results, fetchOK){  //callback(loginOK, errMsg);
                if(fetchOK) {
                    var fixId = {};
                    for (var i = 0; i < results.length; i++) {
                        fixId = {};
                        fixId = results[i];
                        fixId.id = fixId._id;
                        if(!ignoreSafety) {
                            fixId.description = escapeHtml(fixId.description);
                        }
                        data2send.moments.push(fixId);
                    }
                }
                else{
                    //In error
                }
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(data2send));
                db.close();
            });
        });
    }
    else {
        return res.sendStatus(400);
    }
});

app.post('/handlemymoments', urlencodedParser, function (req, res) {
    console.log("Handling Mymoments");
    if (!req.body) return res.sendStatus(400);
    if (req.body.mymoments === 'mymoments' || ignoreSafety) {
        var data2send = {};         //data2send.mymoments:[{},{}]
        data2send.mymoments = [];
        if (req.body.username) {
            var searchForUser = req.body.username;
            if (!ignoreSafety) {
                searchForUser = escapeMongo(String(req.body.username));
            }
            //Pull moments where author===searchForUser
            //Fill in id prop
            MongoClient.connect(dbUrl, function(err, db) {
            console.log("Connected successfully to server");
            
                fetchUserMoment(db, searchForUser, function(results, fetchOK){  //callback(loginOK, errMsg);
                    if(fetchOK) {
                        var fixId = {};
                        for (var i = 0; i < results.length; i++) {
                            fixId = {};
                            fixId = results[i];
                            fixId.id = fixId._id;
                            if(!ignoreSafety) {
                                fixId.description = escapeHtml(fixId.description);
                            }
                            data2send.mymoments.push(fixId);
                        }
                    }
                    else{
                        //In error
                    }
                    res.setHeader('Content-Type', 'application/json');
                    res.send(JSON.stringify(data2send));
                    db.close();
                });
            });
        }
        else {
            return res.sendStatus(400);
        }
    }else {return res.sendStatus(400);}
});

app.post('/handledetail', urlencodedParser, function (req, res) {
    console.log("Handling Detail");
    
    
    
    if (!req.body) return res.sendStatus(400);
    if (req.body.detail === 'detail' || ignoreSafety) {
        var data2send = {};         //data2send.themoment:{}
        data2send.themoment = {};
        if (req.body.id) {
            var searchForId = req.body.id;
            if (!ignoreSafety) {
                searchForId = escapeMongo(String(searchForId));
            }
            
            console.log("serachForId="+searchForId);
            
            MongoClient.connect(dbUrl, function(err, db) {
                console.log("Connected successfully to server");
            
                fetchTheMoment(db, searchForId, function(results, fetchOK){  //callback(loginOK, errMsg);
                    if(fetchOK) {
                        var fixId = {};
                        for (var i = 0; i < results.length; i++) {
                            fixId = {};
                            fixId = results[i];
                            fixId.id = fixId._id;
                            if(!ignoreSafety) {
                                fixId.description = escapeHtml(fixId.description);
                            }
                            data2send.themoment = fixId;
                        }
                    }
                    else{
                        //In error
                    }
                    res.setHeader('Content-Type', 'application/json');
                    res.send(JSON.stringify(data2send));
                    db.close();
                });
            });
        }
        else {
            return res.sendStatus(400);
        }
    }else {return res.sendStatus(400);}
});

app.post('/handlesearch', urlencodedParser, function (req, res) {
    console.log("Handling Search");
    if (!req.body) return res.sendStatus(400);
    if (req.body.search === 'search' || ignoreSafety) {
        var data2send = {};         //data2send.search:[{},{}]
        data2send.search = [];
        if (req.body.query) {
            var query = req.body.query;
            if (!ignoreSafety) {
                query = escapeMongo(String(query));
            }
            var queries = query.split(" ");
            //Pull moments where description or tags contain query
            //Fill in id prop
            MongoClient.connect(dbUrl, function(err, db) {
                console.log("Connected successfully to server");
            
                searchMoments(db, queries, function(results, fetchOK){  //callback(loginOK, errMsg);
                    if(fetchOK) {
                        var fixId = {};
                        for (var i = 0; i < results.length; i++) {
                            fixId = {};
                            fixId = results[i];
                            fixId.id = fixId._id;
                            if(!ignoreSafety) {
                                fixId.description = escapeHtml(fixId.description);
                            }
                            data2send.search.push(fixId);
                        }
                    }
                    else{
                        //In error
                    }
                    res.setHeader('Content-Type', 'application/json');
                    res.send(JSON.stringify(data2send));
                    db.close();
                });
            });
        }
        else {
            return res.sendStatus(400);
        }
    }
    else {return res.sendStatus(400);}
});

app.post('/handlecomment', urlencodedParser, function (req, res) {
    console.log("Handling Comment");
    if (!req.body) return res.sendStatus(400);
    if (req.body.addcomment === 'addcomment' || ignoreSafety) {
        var data2send = {};         
        if (req.body.momentId) {
            var datetime = new Date();
            var time = String(datetime.getHours())+':'+String(datetime.getMinutes())+' '+String(datetime.getMonth() + 1)+'/'+String(datetime.getDate())+'/'+String(datetime.getFullYear());
            var orderTime = Math.round(datetime.getTime() / 1000);
            var searchForId = req.body.momentId;
            var text = req.body.comment;
            var author = req.body.author;
            if (!ignoreSafety) {
                searchForId = escapeMongo(String(searchForId));
                text = escapeMongo(String(text));
                author = escapeMongo(String(author));
                time = escapeMongo(String(time));
                orderTime = Number(orderTime);
            }
            var commentPack = {
                searchForId:searchForId,
                text:text,
                author:author,
                time:time,
                orderTime:orderTime
                };
            
            //Update moment where _id===searchForId, push (text, author, time, orderTime) into comments
            MongoClient.connect(dbUrl, function(err, db) {
                console.log("Connected successfully to server");
                data2send.commentOK = 'NO';
                data2send.error = '';
                addComment(db, commentPack, function(opStat, opCard, errMsg, error){  //opOK, card(OKop), errMsg, err
                    if(opStat) {
                        data2send.commentOK = 'YES';
                    }
                    else{
                        //In error
                        data2send.error = errMsg;
                    }
                    res.setHeader('Content-Type', 'application/json');
                    res.send(JSON.stringify(data2send));
                    db.close();
                });
            });
        }
        else {
            return res.sendStatus(400);
        }
    }else {return res.sendStatus(400);}
});

app.post('/handlevote', urlencodedParser, function (req, res) {
    console.log("Handling Vote");
    if (!req.body) return res.sendStatus(400);
    if (req.body.chgvote === 'chgvote' || ignoreSafety) {
        var data2send = {};        
        if (req.body.momentId) {
            var searchForId = req.body.momentId;
            var value = req.body.value;
            if (!ignoreSafety) {
                searchForId = escapeMongo(String(searchForId));
                value = Number(value)?Number(value):0;
            }
            var votePack = {
                searchForId:searchForId,
                value:value
            };
            //Update moment where _id===searchForId, change vote to value
            MongoClient.connect(dbUrl, function(err, db) {
                console.log("Connected successfully to server");
                data2send.voteOK = 'NO';
                data2send.error = '';
                changeVote(db, votePack, function(opStat, opCard, errMsg, error){  //opOK, card(OKop), errMsg, err
                    if(opStat) {
                        data2send.voteOK = 'YES';
                    }
                    else{
                        //In error
                        data2send.error = errMsg;
                    }
                    res.setHeader('Content-Type', 'application/json');
                    res.send(JSON.stringify(data2send));
                    db.close();
                });
            });
        }
        else {
            return res.sendStatus(400);
        }
    }else {return res.sendStatus(400);}
});

app.post('/handleedit', urlencodedParser, function (req, res) {
    console.log("Handling Edit");
    if (!req.body) return res.sendStatus(400);
    if (req.body.edit === 'edit' || ignoreSafety) {
        var data2send = {};         
        if (req.body.momentId) {
            var datetime = new Date();
            var time = String(datetime.getHours())+':'+String(datetime.getMinutes())+' '+String(datetime.getMonth() + 1)+'/'+String(datetime.getDate())+'/'+String(datetime.getFullYear());
            var orderTime = Math.round(datetime.getTime() / 1000);
            var searchForId = req.body.momentId;
            var description = req.body.description;
            var emotion = req.body.emotion;
            var author = req.body.author;
            if (!ignoreSafety) {
                searchForId = escapeMongo(String(searchForId));
                description = escapeMongo(String(description));
                author = escapeMongo(String(author));
                emotion = escapeMongo(String(emotion));
                time = escapeMongo(String(time));
                orderTime = Number(orderTime);
            }
            var editPack = {};
            editPack.searchForId = searchForId;
            editPack.description = description;
            editPack.author = author;
            editPack.emotion = emotion;
            editPack.time = time;
            editPack.orderTime = orderTime;
            //Check author with ignoreSafety flag
            //Update moment where _id===searchForId, change description, emotion, time, orderTime fields
            MongoClient.connect(dbUrl, function(err, db) {
                console.log("Connected successfully to server");
                data2send.editOK = 'NO';
                data2send.error = '';
                editMoment(db, editPack, function(opStat, opCard, errMsg, error){  //opOK, card(OKop), errMsg, err
                    if(opStat) {
                        data2send.editOK = 'YES';
                    }
                    else{
                        //In error
                        data2send.error = errMsg;
                    }
                    res.setHeader('Content-Type', 'application/json');
                    res.send(JSON.stringify(data2send));
                    db.close();
                });
            });
            
        }
        else {
            return res.sendStatus(400);
        }
    }else {return res.sendStatus(400);}
});

app.post('/handledel', urlencodedParser, function (req, res) {
    console.log("Handling Delete");
    if (!req.body) return res.sendStatus(400);
    if (req.body.del === 'del' || ignoreSafety) {
        var data2send = {};         
        if (req.body.momentId) {
            var searchForId = req.body.momentId;
            var author = req.body.author;
            if (!ignoreSafety) {
                searchForId = escapeMongo(String(searchForId));
                author = String(author);
            }
            var delPack = {
                searchForId:searchForId,
                author:author
            };
            //Check author with ignoreSafety flag
            //Delete moment where _id===searchForId
            MongoClient.connect(dbUrl, function(err, db) {
                console.log("Connected successfully to server");
                data2send.delOK = 'NO';
                data2send.error = '';
                delMoment(db, delPack, function(opStat, opCard, errMsg, error){  //opOK, card(OKop), errMsg, err
                    if(opStat) {
                        data2send.delOK = 'YES';
                    }
                    else{
                        //In error
                        data2send.error = errMsg;
                    }
                    res.setHeader('Content-Type', 'application/json');
                    res.send(JSON.stringify(data2send));
                    db.close();
                });
            });
        }
        else {
            return res.sendStatus(400);
        }
    }else {return res.sendStatus(400);}
});

app.post('/handleupload', function(req, response2client) {
    /*      id
     *      photoSrc
     *      description
     *      emotion
     *      vote
     *      author
     *      time
     *      orderTime
     *      tags[]
     *      comments[0]
     *          text
     *          author
     *          time
     *          orderTime
     */
    console.log("Handling Upload");
    upload(req,response2client,function(err){
        if(err){
            response2client.setHeader('Content-Type', 'application/json');
            response2client.send(JSON.stringify({error_code:1,err_desc:err}));
             
             console.log(err);
             console.log("error occured");
             return;
        }
        if (req.body.author) {
            var datetime = new Date();
            var time = String(datetime.getHours())+':'+String(datetime.getMinutes())+' '+String(datetime.getMonth() + 1)+'/'+String(datetime.getDate())+'/'+String(datetime.getFullYear());
            var orderTime = Math.round(datetime.getTime() / 1000);
            var photoAddress = '';
            var needCaptionFlag = false;
            var data2insert = {};
            data2insert.id = '';
            data2insert.photoSrc = '';
            data2insert.description = '';
            data2insert.emotion = '';
            data2insert.vote = 0;
            data2insert.author = '';
            data2insert.time = '';
            data2insert.orderTime = 0;
            data2insert.tags = [];
            data2insert.comments = [];
            
            if (!req.body.description) {
                needCaptionFlag = true;
            }
            data2insert.description = req.body.description;
            data2insert.author = req.body.author;
            data2insert.time = time;
            data2insert.orderTime = orderTime;
            data2insert.emotion='default';
            if (!ignoreSafety) {
                data2insert.description = escapeMongo(String(req.body.description));        //empty->'null'
                data2insert.author = escapeMongo(String(req.body.author));
            }
            
            if (req.file) {
                console.log("The req is" + req);
                data2insert.photoSrc = 'uploads/'+req.file.filename;
                console.log(data2insert);
                photoAddress = 'http://54.164.126.240:4567/'+data2insert.photoSrc;           //Remove key before publish !!!
                request({
                        url: 'https://api.projectoxford.ai/vision/v1.0/analyze?visualFeatures=Tags,Description,Faces&language=en',
                        method: 'POST',
                        headers: {
                         "Content-Type":"application/json",
                          "Ocp-Apim-Subscription-Key": "3a18a9465ded493d8646373bf83ee409"
                        },
                        data: {
                          "url": photoAddress
                        }
                    }, function(err, res, body) {
                        photoParseData = JSON.parse(body);
                        
                        if (!photoParseData.statusCode) {
                            //
                            
                            for (var i = 0; i < ( photoParseData.tags.length > 5 ? 5 : photoParseData.tags.length ); i++) {
                                data2insert.tags.push(photoParseData.tags[i].name);
                            }
                            if (needCaptionFlag) {
                                if(photoParseData.description.captions[0].text) {
                                    data2insert.description = photoParseData.description.captions[0].text;
                                }
                                else {
                                    data2insert.description = 'There are no words to describe this moment!';
                                }
                            }
                            if (photoParseData.faces.length > 0) {
                                var urlData2Send = {url:photoAddress};
                                var query2Send = querystring.stringify(urlData2Send);
                                var query2SendSize = query2Send.length;
                                var query2SendOption = {
                                    hostname: "ec2-52-89-223-118.us-west-2.compute.amazonaws.com",
                                    port: 80,
                                    path: "/~bg2crx/emotionportal.php",
                                    method: 'POST',
                                    headers:{
                                        'Content-Type': 'application/x-www-form-urlencoded',
                                        'Content-Length': query2SendSize
                                    }
                                };
                                var dataContainer = "";
                                var parseEmotionReq = http.request(query2SendOption, function(parseEmotionResp) {
                                    parseEmotionResp.on('data', function (parseEmotionChunk) {
                                        dataContainer+=parseEmotionChunk;
                                    });
                                    parseEmotionResp.on('end', function() {
                                        var parseResult = JSON.parse(dataContainer);
                                        
                                        console.log(parseResult);
                                        
                                        if (!parseResult.statusCode) {
                                            if (parseResult.length > 0) {
                                                var maxEmo = '';
                                                var maxEmoScr = 0;
                                                var dalian = parseResult[0].scores;
                                                
                                                
                                                
                                                for (var key in dalian) {
                                                  if(dalian[key] > maxEmoScr){
                                                        maxEmoScr = dalian[key];
                                                        maxEmo = key;
                                                    }
                                                }
                                                data2insert.emotion = maxEmo;
                                            }
                                            else {
                                                //No face >> data2insert.emotion='defualt' 
                                            }
                                        }
                                        else {
                                            console.log("Face reading failure:"+parseResult);
                                            //In error >> data2insert.emotion='defualt'
                                        }
                                        //Go database
                                        //Send update wire
                                        MongoClient.connect(dbUrl, function(err, db) {
                                            console.log("Connected successfully to server");
                                        
                                            addMoment(db, data2insert, function(addOK, error){  //callback(loginOK, errMsg);
                                                if(addOK) {
                                                    response2client.setHeader('Content-Type', 'application/json');
                                                    response2client.send(JSON.stringify({error_code:0,err_desc:''}));
                                                    io.sockets.emit('update', {update: 'update', online: onlineUsers });
                                                }
                                                else{
                                                    //In error
                                                    response2client.setHeader('Content-Type', 'application/json');
                                                    response2client.send(JSON.stringify({error_code:1,err_desc:err}));
                                                }
                                                db.close();
                                            });
                                        });
                                    });
                                });
                                parseEmotionReq.write(query2Send);
                                parseEmotionReq.end();
                            }
                            else {
                                /* -[--->+<]>-------.-[--->+<]>.[--->+<]>-----.++[->+++<]>.-----.++.++. */
                                //Go database
                                //Send update wire
                                MongoClient.connect(dbUrl, function(err, db) {
                                    console.log("Connected successfully to server");
                                
                                    addMoment(db, data2insert, function(addOK, error){  //callback(loginOK, errMsg);
                                        if(addOK) {
                                            response2client.setHeader('Content-Type', 'application/json');
                                            response2client.send(JSON.stringify({error_code:0,err_desc:''}));
                                            io.sockets.emit('update', {update: 'update', online: onlineUsers });
                                        }
                                        else{
                                            //In error
                                            response2client.setHeader('Content-Type', 'application/json');
                                            response2client.send(JSON.stringify({error_code:1,err_desc:err}));
                                        }
                                        db.close();
                                    });
                                });
                            }
                        }
                        else {
                            //In error
                            if (needCaptionFlag) {
                                data2insert.description = 'There are no words to describe this moment!';
                            }
                            console.log("Analysis failure:"+photoParseData);
                            //Go database
                            //Send update wire
                            MongoClient.connect(dbUrl, function(err, db) {
                                console.log("Connected successfully to server");
                            
                                addMoment(db, data2insert, function(addOK, error){  //callback(loginOK, errMsg);
                                    if(addOK) {
                                        response2client.setHeader('Content-Type', 'application/json');
                                        response2client.send(JSON.stringify({error_code:0,err_desc:''}));
                                        io.sockets.emit('update', {update: 'update', online: onlineUsers });
                                    }
                                    else{
                                        //In error
                                        response2client.setHeader('Content-Type', 'application/json');
                                        response2client.send(JSON.stringify({error_code:1,err_desc:err}));
                                    }
                                    db.close();
                                });
                            });
                        }
                });
            }
            else {
                data2insert.photoSrc = 'public/assets/defaultPhoto.png';            //Default photo !!!
                data2insert.tags.push('blank');
                if (needCaptionFlag) {
                    data2insert.description = 'There are no words to describe this moment!';
                }
                //Go database
                //Send update wire
                MongoClient.connect(dbUrl, function(err, db) {
                    console.log("Connected successfully to server");
                
                    addMoment(db, data2insert, function(addOK, error){  //callback(loginOK, errMsg);
                        if(addOK) {
                            response2client.setHeader('Content-Type', 'application/json');
                            response2client.send(JSON.stringify({error_code:0,err_desc:''}));
                            io.sockets.emit('update', {update: 'update', online: onlineUsers });
                        }
                        else{
                            //In error
                            response2client.setHeader('Content-Type', 'application/json');
                            response2client.send(JSON.stringify({error_code:1,err_desc:err}));
                        }
                        db.close();
                    });
                });
            }
        }
    });

});



//Helper functions
function randomString(length, chars) {
  if (!chars) {
    return 'DefaultFileName';
  }
  var charsLength = chars.length;
  if (charsLength > 256) {
    return 'DefaultFileName';
  }
  var randomBytes = crypto.randomBytes(length);
  var result = new Array(length);
  var cursor = 0;
  for (var i = 0; i < length; i++) {
    cursor += randomBytes[i];
    result[i] = chars[cursor % charsLength];
  }
  return result.join('');
}

function randomAsciiString(length) {
  return randomString(length,
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
}

function escapeMongo(whatString) {
    return whatString.replace(/\$/g, '_S_');
}

function reverseString(whatString) {
    return whatString.split("").reverse().join("");
}


//Citation
/*
Upload
    https://code.ciphertrick.com/2015/12/07/file-upload-with-angularjs-and-nodejs/
Random string generator
    http://stackoverflow.com/questions/8855687/secure-random-token-in-node-js/25690754#25690754
Ajax request
    http://stackoverflow.com/questions/21441786/post-to-php-from-node-js
    https://dev.projectoxford.ai/docs/services/56f91f2d778daf23d8ec6739/operations/56f91f2e778daf14a499e1fa
    https://dev.projectoxford.ai/docs/services/5639d931ca73072154c1ce89/operations/563b31ea778daf121cc3a5fa
*/