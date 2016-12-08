/*
 * Project Name: $ cat my.moment
 * Project Description: A social platform for users to post their moments in microblog-style.
 * Team member: Martin Cheng 442872
 *              Michael Windlinger 441613
 * 
 * Please see buttom of the page for citation.
 * 
 * Thank you
 */

angular.module('grandModule',['ngRoute','btford.socket-io','ngFileUpload','ngAnimate', 'ngSanitize', 'ui.bootstrap'])
.factory('publicSocket', function (socketFactory) {
  return socketFactory();
})
.config(['$locationProvider', '$routeProvider', function($locationProvider, $routeProvider) {
  $locationProvider.hashPrefix('!');
    $routeProvider
    .when('/', {
        templateUrl: 'views/home.html',
        controller: 'grandCtrl',
        resolve:{
        "check":function($rootScope, $location){
            if(!$rootScope.loginOK){
                $location.path('/login');
            }
          }
        }
      })
    .when('/login', {
        templateUrl: 'views/login.html',
        controller: 'loginCtrl',
        resolve:{
        "check":function($rootScope, $location){
            if($rootScope.loginOK){
                $location.path('/home');
                alert("You have already logged in.");
            }
          }
        }
      })
    .when('/signup', {
        templateUrl: 'views/signup.html',
        controller: 'signupCtrl',
        resolve:{
        "check":function($rootScope, $location){
            if($rootScope.loginOK){
                $location.path('/home');
                alert("You have already logged in.");
            }
          }
        }
      })
    .when('/home', {
        templateUrl: 'views/home.html',
        controller: 'grandCtrl',
        resolve:{
        "check":function($rootScope, $location){
            if(!$rootScope.loginOK){
                $location.path('/login');
                alert("Please login or sign up first.");
            }
          }
        }
      })
    .when('/moment/:momentId', {
        templateUrl: 'views/momentdetail.html',
        controller: 'grandCtrl',
        resolve:{
        "check":function($rootScope, $location){
            if(!$rootScope.loginOK){
                $location.path('/login');
                alert("Please login or sign up first.");
            }
          }
        }
      })
    .when('/user/:myUsername', {
        templateUrl: 'views/mymoments.html',
        controller: 'grandCtrl',
        resolve:{
        "check":function($rootScope, $location){
            if(!$rootScope.loginOK){
                $location.path('/login');
                alert("Please login or sign up first.");
            }
          }
        }
      })
    .when('/search', {
        templateUrl: 'views/search.html',
        controller: 'grandCtrl',
        resolve:{
        "check":function($rootScope, $location){
            if(!$rootScope.loginOK){
                $location.path('/login');
                alert("Please login or sign up first.");
            }
          }
        }
      })
    .otherwise({
        redirectTo: '/'
      });
}])
.controller('grandCtrl', ['$scope', '$rootScope', '$http', '$location', '$routeParams', 'publicSocket', 'Upload','$window', function ( $scope, $rootScope, $http, $location, $routeParams, publicSocket, Upload, $window ) {
    /*
     * On frontend
     * update()
     * moments[0]
     *      id
     *      photoSrc <- BACKEND: If empty, return default src !!!
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
     * commentBoxes[comBox0]
     * sendComment()
     * sendVote()
     * query
     * 
    */
    
    
    
    $scope.moments = [];
    $scope.myMoments = [];
    $scope.searchMoments = [];      
    $scope.momentId = '';
    $scope.myUsername = '';         //For myMoments Only
    $scope.theMoment = {};
    $scope.commentBoxes = {};       //Need to empty upon update
    $scope.hideVoter = {};          //Need to empty upon update
    $scope.warningMsg = '';
    $scope.query = '';
    $scope.editBoxes = {};
    $scope.emotionBoxes = {};
    $scope.dohideVoter = false;
    $scope.detailAddComment = '';
    $scope.showEditor = {};
    $scope.hideUpdateMsg = true;
    $scope.hideWarningMsg = true;
    //
    $scope.update = function() {
        $scope.commentBoxes = {};
        $scope.hideVoter = {};
        $http({
                url: "/handleupdate",
                method: "POST",
                data: $.param({update:'update'}),
                headers: {'Content-Type': 'application/x-www-form-urlencoded'}
            }).then(function(response) {
            if (response.data.moments) {
                if(response.data.moments.length > 0) {
                    $scope.moments = response.data.moments;
                }
            }
        });
    };
    
    $scope.getMyMoments = function() {
        $scope.commentBoxes = {};
        $scope.hideVoter = {};
        if ($rootScope.username) {
            $http({
                    url: "/handlemymoments",
                    method: "POST",
                    data: $.param({mymoments:'mymoments',username:$rootScope.username}),
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
                }).then(function(response) {
                if (response.data.mymoments) {
                    if(response.data.mymoments.length > 0) {
                        $scope.myMoments = response.data.mymoments;
                    }
                }
            });
        }
    };
    
    $scope.getDetail = function() {
        $scope.commentBoxes = {};
        $scope.hideVoter = {};
        
        console.log("gettingDetail...$scope.momentId="+$scope.momentId);
        
        if ($scope.momentId) {
            $http({
                    url: "/handledetail",
                    method: "POST",
                    data: $.param({
                            detail:'detail',
                            id:$scope.momentId
                        }),
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
                }).then(function(response) {
                console.log("got backend resp...data=");
                console.log(response.data);
                if (response.data.themoment) {
                    $scope.theMoment = response.data.themoment;
                }
                else {
                    $location.path('/home');
                }
            });
        }
        else {
            $location.path('/home');
        }
    };
    
    $scope.getSearchResult = function() {
        $scope.commentBoxes = {};
        $scope.hideVoter = {};
        if ($scope.query) {
            $http({
                    url: "/handlesearch",
                    method: "POST",
                    data: $.param({search:'search',query:$scope.query}),
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
                }).then(function(response) {
                if (response.data.search) {
                    if(response.data.search.length > 0) {
                        $scope.searchMoments = response.data.search;
                    }
                }
            });
        }
    };

    $scope.sendComment = function (whatIndex) {     //Do not call update()
        /*
         * On backend
         * receive:
         *  momentId
         *  comment
         *  author
         * reply:
         *  commentOK = 'YES'
         *  error
        */
        var datetime = new Date();
        var comment2add = {};
        var commentContent = '';
        if ($scope.commentBoxes['comBox'+whatIndex]) {
            commentContent = $scope.commentBoxes['comBox'+whatIndex];
            comment2add.text = commentContent;
            comment2add.author = $rootScope.username;
            comment2add.time = String(datetime.getHours())+':'+String(datetime.getMinutes())+' '+String(datetime.getMonth() + 1)+'/'+String(datetime.getDate())+'/'+String(datetime.getFullYear());
            var senddata = $.param({
                    addcomment: 'addcomment',
                    momentId: $scope.moments[whatIndex].id,
                    comment: comment2add.text,
                    author: comment2add.author
                });
            $http({
                url: "/handlecomment",
                method: "POST",
                data: senddata,
                headers: {'Content-Type': 'application/x-www-form-urlencoded'}
            }).then(function(response) {
                if (response.data.commentOK !== 'YES'){
                    alert("Error occured: "+response.data.error);
                }
                else {
                    $scope.commentBoxes['comBox'+whatIndex]='';
                    $scope.moments[whatIndex].comments.push(comment2add);
                }
            });
        }
        else {
            $scope.warningMsg = 'Say something in the comment...';
            $scope.hideWarningMsg = false;
        }
    };
    
    $scope.sendVote = function (whatIndex, votage) {        //Do not call update()
        /*
         * On frontend
         * sendVote($index, 1)
         * On backend
         * receive:
         *  momentId
         *  value
         * reply:
         *  voteOK = 'YES'
         *  error
        */
        var chg2value = {};
        var votevalue = Number(votage)>0?1:-1;
        
        chg2value = $scope.moments[whatIndex].vote + votevalue;
        var senddata = $.param({
                chgvote: 'chgvote',
                momentId: $scope.moments[whatIndex].id,
                value: chg2value
            });
        $http({
            url: "/handlevote",
            method: "POST",
            data: senddata,
            headers: {'Content-Type': 'application/x-www-form-urlencoded'}
        }).then(function(response) {
            if (response.data.voteOK !== 'YES'){
                alert("Error occured: "+response.data.error);
                $scope.hideVoter['voter_'+whatIndex]=false;
            }
            else {
                $scope.moments[whatIndex].vote = chg2value;
            }
        });
    };

    $scope.detailSendComment = function () {     //Do not call update()
        /*
         * On backend
         * receive:
         *  momentId
         *  comment
         *  author
         * reply:
         *  commentOK = 'YES'
         *  error
        */
        var whatIndex = -1;
        for (var i = 0; i < $scope.moments.length; i++) {
            if ($scope.moments[i].id === $scope.momentId) {
                whatIndex = i;
            }
        }
        
        var datetime = new Date();
        var comment2add = {};
        var commentContent = '';
        if (whatIndex >= 0){
            if ($scope.detailAddComment) {
                commentContent = $scope.detailAddComment;
                comment2add.text = commentContent;
                comment2add.author = $rootScope.username;
                comment2add.time = String(datetime.getHours())+':'+String(datetime.getMinutes())+' '+String(datetime.getMonth() + 1)+'/'+String(datetime.getDate())+'/'+String(datetime.getFullYear());
                var senddata = $.param({
                        addcomment: 'addcomment',
                        momentId: $scope.moments[whatIndex].id,
                        comment: comment2add.text,
                        author: comment2add.author
                    });
                $http({
                    url: "/handlecomment",
                    method: "POST",
                    data: senddata,
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
                }).then(function(response) {
                    if (response.data.commentOK !== 'YES'){
                        alert("Error occured: "+response.data.error);
                    }
                    else {
                        $scope.detailAddComment='';
                        $scope.theMoment.comments.push(comment2add);
                    }
                });
            }
            else {
                $scope.warningMsg = 'Say something in the comment...';
                $scope.hideWarningMsg = false;
            }
        }
        else {
            $scope.warningMsg = 'No such moment found.';
            $scope.hideWarningMsg = false;
        }
    };
    
    $scope.detailSendVote = function (votage) {        //Do not call update()
        /*
         * On frontend
         * detailSendVote(1)
         * On backend
         * receive:
         *  momentId
         *  value
         * reply:
         *  voteOK = 'YES'
         *  error
        */
        var whatIndex = -1;
        for (var i = 0; i < $scope.moments.length; i++) {
            if ($scope.moments[i].id === $scope.momentId) {
                whatIndex = i;
            }
        }

        var chg2value = {};
        var votevalue = Number(votage)>0?1:-1;
        if (whatIndex >= 0 ) {
            chg2value = $scope.moments[whatIndex].vote + votevalue;
            var senddata = $.param({
                    chgvote: 'chgvote',
                    momentId: $scope.moments[whatIndex].id,
                    value: chg2value
                });
            $http({
                url: "/handlevote",
                method: "POST",
                data: senddata,
                headers: {'Content-Type': 'application/x-www-form-urlencoded'}
            }).then(function(response) {
                if (response.data.voteOK !== 'YES'){
                    alert("Error occured: "+response.data.error);
                    $scope.dohideVoter=false;
                }
                else {
                    $scope.theMoment.vote = chg2value;
                }
            });
        }
        else {
            $scope.warningMsg = 'No such moment found.';
            $scope.hideWarningMsg = false;
        }
    };

    // $scope.showEdit = function(whatIndex) {
    //     //Show editor !!!
        
    // };
    
    $scope.editMoment = function(whatIndex) {
        /* 
         * On backend
         * 
         * receive:
         *  momentId
         *  description
         *  emotion: 'default'
         *  author
         * reply:
         *  editOK = 'YES'
         *  error
        */
        
        var edit2send = {};
        if ($scope.editBoxes['edit'+whatIndex] || $scope.emotionBoxes['emo'+whatIndex]) {
            if ($scope.emotionBoxes['emo'+whatIndex]) {
                edit2send.emotion = $scope.emotionBoxes['emo'+whatIndex];
            }
            else {
                edit2send.emotion = $scope.myMoments[whatIndex].emotion;
            }
            if ($scope.editBoxes['edit'+whatIndex]) {
                edit2send.description = $scope.editBoxes['edit'+whatIndex];
            }
            else {
                edit2send.description = $scope.myMoments[whatIndex].description;
            }
            edit2send.momentId = $scope.myMoments[whatIndex].id;
            edit2send.author = $rootScope.username;
            
            var senddata = $.param({
                    edit:'edit',
                    momentId: edit2send.momentId,
                    description: edit2send.description,
                    emotion: edit2send.emotion,
                    author: edit2send.author
                });
            $http({
                url: "/handleedit",
                method: "POST",
                data: senddata,
                headers: {'Content-Type': 'application/x-www-form-urlencoded'}
            }).then(function(response) {
                if (response.data.editOK !== 'YES'){
                    $scope.showEditor['editor_'+whatIndex] = true;
                    alert("Error occured: "+response.data.error);
                }
                else {
                    $scope.showEditor['editor_'+whatIndex] = false;
                    $scope.editBoxes['edit'+whatIndex] = '';
                    $scope.emotionBoxes['emo'+whatIndex] = '';
                    $scope.getMyMoments();
                }
            });
        }
        else {
            $scope.warningMsg = 'Make some changes...';
            $scope.hideWarningMsg = false;
        }
    };
    
    $scope.deleteMoment = function (whatIndex) {
        /* 
         * On backend
         * 
         * receive:
         *  momentId
         *  author
         * reply:
         *  delOK = 'YES'
         *  error
        */
        
        var del2send = {};
        if ($scope.myMoments[whatIndex]) {
            
            del2send.momentId = $scope.myMoments[whatIndex].id;
            del2send.author = $rootScope.username;
            
            var senddata = $.param({
                    del:'del',
                    momentId: del2send.momentId,
                    author: del2send.author
                });
            $http({
                url: "/handledel",
                method: "POST",
                data: senddata,
                headers: {'Content-Type': 'application/x-www-form-urlencoded'}
            }).then(function(response) {
                if (response.data.delOK !== 'YES'){
                    alert("Error occured: "+response.data.error);
                }
                else {
                    $scope.getMyMoments();
                }
            });
        }
        else {
            $scope.warningMsg = 'No moments found...';
            $scope.hideWarningMsg = false;
        }
    };
    
    
    
    
    
    
    console.log("$routeParams.momentId="+$routeParams.momentId);
    console.log("$routeParams.myUsername="+$routeParams.myUsername);
    if ($routeParams.momentId) {    //Try fetching momentId
        $scope.momentId = $routeParams.momentId;
    }
    else if ($routeParams.myUsername) {    //Try fetching myUsername
        $scope.myUsername = $routeParams.myUsername;
        if ($scope.myUsername !== $rootScope.username) {       //Go to own private moments
            $scope.myUsername = $rootScope.username;
            $scope.warningMsg = 'Visiting self.moments page...';
            $scope.hideWarningMsg = false;
        }
    }
    
    if ((!$scope.momentId) && (!$scope.myUsername)) {         //Home page
        console.log("Going to update()");
        $scope.update();
    }
    else if($scope.momentId) {                          //Detail page
        console.log("Going to getDetail()");
        $scope.getDetail();
        $scope.update();
    }
    else if($scope.myUsername){
        console.log("Going to getMyMoments()");
        $scope.getMyMoments();
        
    }
    
    publicSocket.on('update', function(data) {
        //Remind user to update !!!
        //$scope.update();
        $scope.hideUpdateMsg = false;
        
        
    });
    
    $scope.logout = function() {
        //Send logout message with username=<username>
        publicSocket.emit("logout", {username: $rootScope.username});
        $rootScope.username = '';
        $rootScope.loginOK = false;
        $location.path('/login');       //Could be #!/login !!!
        return ('Loging off...');
    };

   $window.onbeforeunload =  $scope.logout;
}])
.controller('uploadCtrl',['$scope', '$rootScope', 'Upload', '$window', function($scope, $rootScope, Upload, $window){
    /*
     * moment
     *      .file
     *      .description
     *      .author
     */
    var thisCtrl = this;
    thisCtrl.momentSubmit = function(){
        if (thisCtrl.upload_form.file.$valid && (thisCtrl.description || thisCtrl.file)){
            thisCtrl.upload(thisCtrl.file, thisCtrl.description, $rootScope.username);
        }
        else {
            $scope.warningMsg = 'At least say something...';        //$scope inherited from super
            $scope.hideWarningMsg = false;
        }
    };
    
    thisCtrl.upload = function (file, description, author) {
        Upload.upload({
            url: '/handleupload',
            data:{file:file, description:description, author:author}
        }).then(function (resp) {
            
            thisCtrl.progress = 0;
            if(resp.data.error_code === 0){
                // Clear editor
                thisCtrl.progress = 0;
                thisCtrl.description = '';
                thisCtrl.file = null;
                
                $scope.update();
                
                // $window.alert('Success ' + resp.config.data.file.name + 'uploaded. Response: ');
            } else {
                $window.alert('An error occured');
            }
        }, function (resp) {
            console.log('Error status: ' + resp.status);
            $window.alert('Error status: ' + resp.status);
        }, function (evt) {
            if (evt.config.data.file) {
                var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
                thisCtrl.progress = Number(progressPercentage);
                //console.log('progress: ' + progressPercentage + '% ' + evt.config.data.file.name);
            }
        });
    };
}])
.controller('loginCtrl', ['$scope', '$rootScope', '$http', '$location', '$routeParams', 'publicSocket', function ( $scope, $rootScope, $http, $location, $routeParams, publicSocket) {
    $rootScope.loginOK = false;
    $rootScope.username = '';
    $scope.login = {};
    $scope.login.username = '';
    $scope.login.password = '';
    $scope.warningMsg = '';
    
    $scope.tryLogin = function(){
        var usernameInput = $scope.login.username;
        var passwordInput = $scope.login.password;
        
        if (usernameInput && passwordInput) {
            var data2tx = $.param({
                    username:usernameInput,
                    password:passwordInput
                });
            $http({
                url: "/handlelogin",
                method: "POST",
                data: data2tx,
                headers: {'Content-Type': 'application/x-www-form-urlencoded'}
            }).then(function(response) {
                if (response.data.loginOK === 'YES') {       //Backend return string YES/NO on all true/false tests
                    $rootScope.username = response.data.username;
                    $rootScope.loginOK = true;
                    publicSocket.emit("login", {username: response.data.username});
                    $location.path('/home');
                    $scope.warningMsg = '';
                }
                else {
                    $rootScope.loginOK = false;
                    $scope.login.password = '';     //Clear the two ng-model
                    $scope.warningMsg = response.data.error;
                    $scope.hideWarningMsg = false;
                }
            });
        }
        else {
            $scope.warningMsg = 'Please fill in the empty field.';
            $scope.hideWarningMsg = false;
        }
    };
    /*
     * On frontend ng-model:
     * login
     *      username
     *      password
     * warningMsg
     * tryLogin()
     * 
     * On backend response:
     * username
     * loginok
     * error
    */
    
    
}])
.controller('signupCtrl', ['$scope', '$rootScope', '$http', '$location', '$routeParams', 'publicSocket', function ( $scope, $rootScope, $http, $location, $routeParams, publicSocket) {
    $rootScope.loginOK = false;
    $rootScope.username = '';
    $scope.login = {};
    $scope.login.username = '';
    $scope.login.password = '';
    $scope.login.passwordAgain = '';
    $scope.warningMsg = '';
    
    $scope.trySignUp = function(){
        var usernameInput = $scope.login.username;
        var passwordInput = $scope.login.password;
        var passwordAgainInput = $scope.login.passwordAgain;
        
        if (usernameInput && passwordInput) {
            if (passwordInput === passwordAgainInput) {
                if(usernameInput.length > 5 && passwordInput.length > 5 && (/^[a-zA-Z0-9]+$/.test(usernameInput))) {
                    var data2tx = $.param({
                            username:usernameInput,
                            password:passwordInput
                        });
                    $http({
                        url: "/handlesignup",
                        method: "POST",
                        data: data2tx,
                        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
                    }).then(function(response) {
                        if (response.data.loginOK === 'YES') {       //Backend return string YES/NO on all true/false tests
                            $rootScope.username = response.data.username;
                            $rootScope.loginOK = true;
                            publicSocket.emit("login", {username: response.data.username});
                            $scope.warningMsg = '';
                            $location.path('/home');
                        }
                        else {
                            $rootScope.loginOK = false;
                            $scope.login.username = '';
                            $scope.login.password = '';
                            $scope.login.passwordAgain = '';
                            $scope.warningMsg = response.data.error;
                            $scope.hideWarningMsg = false;
                        }
                    });
                }
                else {
                    $scope.warningMsg = 'Valid username and password should be longer than 5, username must be alphanumeric.';
                    $scope.hideWarningMsg = false;
                }
            }
            else {
                $scope.warningMsg = 'Passwords do not match.';
                $scope.hideWarningMsg = false;
            }
        }
        else {
            $scope.warningMsg = 'Please fill in the empty field.';
            $scope.hideWarningMsg = false;
        }
    };
    /*
     * On frontend ng-model:
     * login
     *      username
     *      password
     *      passwordAgain
     * warningMsg
     * trySignUp()
     * 
     * On backend response:
     * username
     * loginok
     * error
    */
    
    
}]);

//Citation
/*
Upload
    https://code.ciphertrick.com/2015/12/07/file-upload-with-angularjs-and-nodejs/
Random string generator
    http://stackoverflow.com/questions/8855687/secure-random-token-in-node-js/25690754#25690754
*/