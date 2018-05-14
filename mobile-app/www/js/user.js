
// send device ID to Azure
function sendDeviceId(userId) {
    console.log("sending to " + userId);

    // PUT user device ID
    $$.ajax({
        method: "PUT",
        url: hostname + "/api/players/" + userId + "/changedeviceid",
        headers: {
            "Content-Type": "application/json"
        },
        data: "{ deviceid: \"" + deviceId + "\"}",
        processData: false,
        dataType: "json",
        success: function() {
            console.log("successfully uploaded device ID");
        },
        error: function(xhr, status, error) {
            console.log(xhr);
            console.log(status);
            console.log(error);
        }
    });
}

function writeToBandList(band) {
    var band_name = sanitizeName(band.name);

    console.log(band.name);
    $$("#user-bands").append("<li class=\"item-content\" id=\"" + band.name + "\">" +
                                "<div class=\"item-inner\"><div class=\"item-title\">" + band.name + "</div></div></li>");

    $$("#" + band_name).on('click', function(){
        current["band"] = band;
        mainView.router.loadPage("band.html");
    });
}

function tempWriteToEventList(event) {
    console.log(event.name);
    var event_name = sanitizeName(event.name);
    $$("#user-events").append("<li class=\"item-content\" id=\"" + event.name +"\">" +
                                "<div class=\"item-inner\"><div class=\"item-title\">" + event.name + "</div></div></li>");


    $$("#" + event_name).on('click', function(){
        console.log("clicked on the thingy");
        current["event"] = event;
        mainView.router.loadPage("event.html");
    });
}

/**
 * rewrites list of bands and events on the users page
 */
function refreshUserPage() {
    refreshItemDisplay(current["user"].bands, "#user-bands", "band.html", "band", cachedBands, "/api/bands/");
    refreshItemDisplay(current["user"].events, "#user-events", "event.html", "event", cachedEvents, "/api/events/");
}

$$('#login').on('click', function(){
    var formData = myApp.formToJSON('#login-form');
    var user = formData["username"];
    console.log("Fetching data for user " + user);

    // GET user
    $$.ajax({
        method: "GET",
        url: hostname + "/api/players/username/" + user,
        data: {},
        processData: false,
        dataType: "json",
        success: function(json){
            console.log(json);
            current["user"] = json;
            if (deviceId != "FAILED_ID" && deviceId != current["user"].deviceId) {
                sendDeviceId(current["user"].id);
            }
            window.localStorage.setItem("currentUser", JSON.stringify(current["user"]));
            mainView.router.loadPage("user.html");
        },
        statusCode : {
            404: function(xhr){
                alertUser("Username " + user + " not found!");
            }
        }
    });
});

myApp.onPageInit('login-page', function() {
    $$('#login').on('click', function() {
        var formData = myApp.formToJSON('#login-form2');
        var user = formData["username"];
        console.log("Fetching data for user " + user);

        // GET user
        $$.ajax({
            method: "GET",
            url: hostname + "/api/players/username/" + user,
            data: {},
            processData: false,
            dataType: "json",
            success: function(json){
                console.log(json);
                console.log("Device ID: ", deviceId);
                current["user"] = json;
                if (deviceId != "FAILED_ID" && deviceId != current["user"].deviceId) {
                    sendDeviceId(current["user"].id);
                }
                window.localStorage.setItem("currentUser", JSON.stringify(current["user"]));

                mainView.router.loadPage("user.html");
            },
            statusCode : {
                404: function(xhr){
                    alertUser("Username " + user + " not found!");
                }
            }
        });
    });
});

function logout(){
    current = {
            "user" : {},
            "band" : {},
            "event" : {},
            "song" : {},
            "part" : {}
    };
    console.log("Logout button clicked");
    window.localStorage.removeItem("currentUser");
    mainView.router.loadPage("login.html");
}

/**
 * Refreshes the page and updates the necessary information
 * @param {string} api The API we are getting from
 * @param {string} id The ID we're using to get information
 * @param {string} type  The name of the item we are querying
 * @param {function} refreshFunction The function that re-orders the page 
 */
function pullToRefresh(api, id, type, refreshFunction){
    $$.getJSON(hostname + api + id, {}, function(json) {
        console.log("Updating " + type + " Info");
        current[type] = json;
        if(type == "user"){
            window.localStorage.setItem("currentUser", JSON.stringify(json));
        }
        refreshFunction();
        myApp.pullToRefreshDone();
    }, function(err){
        console.log("Error:", err);
        myApp.pullToRefreshDone();
    });
}

myApp.onPageInit('user-info', function() {
    if (deviceId != "FAILED_ID" && deviceId != current["user"].deviceId) {
        sendDeviceId(current["user"].id);
    }

    $$("#user-refresh").on('refresh', function(e){
        console.log("Refreshing User Page");
        setTimeout(function(){
            cachedBands = {};
            cachedEvents = {};
            pullToRefresh("/api/players/", current.user.id, "user", refreshUserPage); 
        }, 2000);
    });

    
    console.log("initializing the user info page");
    $$("#user-title").text("Welcome, " + current["user"].username);
    myApp.sizeNavbars();
    $$("#log-out-button").on('click', function() {
        logout();
    });

    $$("#user-bands-button").on('click', function() {
        $$("#left-button-user").text("Join Band");
        $$("#right-button-user").text("Create Band");
    });

    $$("#user-events-button").on('click', function() {
        $$("#left-button-user").text("");
        $$("#right-button-user").text("");
    });
});

myApp.onPageBeforeAnimation("user-info", function() {
    refreshUserPage();
});

myApp.onPageBack("user-info", function(){
    logout();
});
