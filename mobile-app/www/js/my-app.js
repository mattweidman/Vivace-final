// Initialize app
var myApp = new Framework7();

// If we need to use custom DOM library, let's save it to $$ variable:
var $$ = Dom7;

var hostname = "http://vivace3.azurewebsites.net";

var deviceId = "FAILED_ID"; // instance ID for Firebase

var current = {
                "user" : {},
                "band" : {},
                "event" : {},
                "song" : {},
                "part" : {}
};

var cachedSongs = {};
var cachedEvents = {};
var cachedBands = {};
var cachedParts = {};
var trackingLoop = -1;
var cachedXMLs = new lruCache();

const messaging = firebase.messaging();
messaging.usePublicVapidKey("BGbIy9Skogp0IcYuoKn9psWmKSX3BXJJEXCM24lznZopTVooOsn3NiVRYhF88tVo4Cl8FyWf7gxRC7mxXeSQ7qo");
messaging.requestPermission().then(function() {
    console.log("Notification permission granted");
}).catch(function(err){
    console.log("Unable to get permission to notify.", err);
});

messaging.onMessage(function(payload){
    console.log("Message received: " + payload);
});

messaging.getToken().then(function(currentToken){
    if(currentToken){
        deviceId = currentToken;
        console.log(deviceId);
    }
    else{
        console.log("No Instance ID token available. Request permission to generate one.");
    }
}).catch(function(err){
    console.log("Token error: ", err);
});

// Add view
var mainView = myApp.addView('.view-main', {
    // Because we want to use dynamic navbar, we need to enable it for this view:
    dynamicNavbar: true
});

// Handle Cordova Device Ready Event
$$(document).on('deviceready', function() {
    console.log("Device is ready!");

    console.log("beginning init");
    push = PushNotification.init({
      "android": {
        "senderID": "280477887962"
      },
      "browser": {},
      "ios": {
        "sound": true,
        "vibration": true,
        "badge": true
      },
      "windows": {}
    });
    console.log("push init");

    push.on('registration', function(data) {
         console.log('registration event: ' + data.registrationId);
         deviceId = data.registrationId;

         console.log("Sender ID: ", push.options.android.senderID);

         var oldRegId = localStorage.getItem('registrationId');
         if (oldRegId !== data.registrationId) {
             // Save new registration ID
             localStorage.setItem('registrationId', data.registrationId);
             // Post registrationId to your app server as the value has changed
         }
     });

     push.on('error', function(e) {
         console.log("push error = " + e.message);
     });

     push.on('notification', function(data) {
         console.log('notification event');
         navigator.notification.alert(
             data.message,         // message
             null,                 // callback
             data.title,           // title
             'Ok'                  // buttonName
         );
    });

    push.subscribe("/topics/topic", function(data){
        console.log("Successfully subscribed!");
    }, function(error){
        console.log("failure: " , error);
    });


    console.log(window.localStorage.getItem("currentUser"));
    if(window.localStorage.getItem("currentUser") == null){
        mainView.router.loadPage("login.html")
    }

    else {
        try{
            current["user"] = JSON.parse(window.localStorage.getItem("currentUser"));
            console.log("Logged in already");
            mainView.router.loadPage("user.html");
        } catch(err){
            window.localStorage.removeItem("currentUser");
            mainView.router.loadPage("login.html");
        }
        
        
    }

});


document.addEventListener('backbutton', () => {
    if(mainView.url != "login.html"){
        mainView.router.back();
    }
    clearInterval(trackingLoop);
});

/**
 * puts the escape slashes before characters that would normally need them
 * this is necessary because js sucks
 * this also only covers spaces and ' so its also unfinished lul
 * @param {string} name is the string to be cleaned up
 * @return {string} cleaned up string woo
 */
function sanitizeName(name) {
    name = name.split(" ").join("\\ ");
    name = name.split("'").join("\\'");
    return name;
}

/**
 * adds or removes a song from a band or event
 *
 * @param {boolean} isAdding is true if we are adding the song, else false
 * @param {boolean} isBand is true if operation is on a band, else false
 */
function modifySong(isAdding, isBand) {
    var new_song = prompt("Enter the song id you would like to " +
        (isAdding ? "add" : "remove"));
    var url = hostname +
        (isBand ? ("/api/bands/" + current["band"].id) : ("/api/events/" + current["event"].id)) +
        (isAdding ? "/addsong/" : "/deletesong/") + new_song;
    // TODO illegal inputs
    if (new_song) {
        $$.ajax({
            headers: {
                'Content-Type' : 'application/json'
            },
            method : "PUT",
            url: url,
            processData: false,
            success: function(response) {
                console.log(response);

                if (isBand) {
                    recacheResponse(response, "band", cachedBands);
                    refreshBandPage();
                }

                else {
                    recacheResponse(response, "event", cachedEvents);
                    refreshEventPage();
                }

                alertUser("Song successfully " +
                    (isAdding ? "added" : "removed") + "!");
            },
            dataType : "json",
            statusCode : {
                400 : function(xhr){
                    alertUser("Error modifying song");
                }
            }
        });
    }
}

function recacheResponse(response, target, cache) {
    console.log("Caching");
    console.log(response);
    console.log(cache);
    current[target] = response;
    cache[response.id] = response;
}

function isValid(str){
    return !/[~`#$!.,%\^&*+=\-\[\]\\;/{}|\\"<>\?]/g.test(str) && str.trim() != "";
}

/**
 * renames a band, event, or song
 *
 * @param {string} name is the current name of the object to be renamed
 * @param {string} api_path is the part of the url that changes based on type
 * @param {function} fn is the function to be called after the rename
 */
function rename(name, api_path, fn) {
    var new_name = prompt("What would you like to rename " + name + " to?");
    var url = hostname + api_path + "/rename/";
    var isPart = (fn == refreshSongPage);
    var data = (isPart ? "{\n\t\"instrument\" : \"" : "{\n\t\"name\" : \"") +
        new_name + "\"\n}"

    // TODO illegal inputs
    if (new_name) {
        $$.ajax({
            headers: {
                'Content-Type' : 'application/json'
            },
            method : "PUT",
            url: url,
            processData: false,
            data: data,
            success: function(response) {
                console.log(response);

                if (fn == refreshBandPage) {
                    recacheResponse(response, "band", cachedBands);
                    refreshBandPage();
                    //TODO this is bad
                    refreshUserPage();
                    $$("#band-title").text(current["band"].name);
                }

                else if (fn == refreshEventPage) {
                    recacheResponse(response, "event", cachedEvents);
                    refreshEventPage();
                    //TODO this is bad
                    refreshUserPage();
                    $$("#event-title").text(current["event"].name);
                }

                else {
                    recacheResponse(response, "part", cachedParts);
                    refreshSongPage();
                    $$("#song-part-title").text(current.song.name
                        + " - " + current["part"].instrument);
                }

                myApp.sizeNavbars();

                alertUser("Successfully renamed!");
            },
            dataType : "json",
            statusCode : {
                400 : function(xhr){
                    alertUser("Error renaming band");
                }
            }
        });
    }
}

/**
 * writes item to html li at target and appends a click listener to route to
 * targetURL and to update current[update] to item
 * i promise this is helpful
 * @param {json} item - the item (song, event, band, etc) we're displaying
 * @param {string} target - html dom object reference to write to
 * @param {string} targetURL - page to load on click
 * @param {string} update - field in current to update
 */
function writeToList(item, target, targetURL, update) {
    var unsanitized_name = (update == "part" ? item.instrument : item.name)
    var name = sanitizeName(unsanitized_name);
    console.log(unsanitized_name);

    $$(target).append("<li class=\"item-content\" id=\"" + unsanitized_name + "\">" +
                                "<div class=\"item-inner\"><div class=\"item-title\">"
                                + unsanitized_name + "</div></div></li>");

    $$("#" + name).on('click', function(){
        current[update] = item;
        mainView.router.loadPage(targetURL);
    });
}

/**
 * attempt to find items to display in html li at target
 * either uses cache or performs GET and then saves results to cache
 * @param {list} list - list of object ids to display
 * @param {string} target - html dom object reference to write to
 * @param {string} targetURL - page to load on click
 * @param {string} type - (song, part, event, band, user?)
 * @param {dict} cache - cache to update
 * @param {string} apiURL - bit of the url that depends on what we're updating
 */
function refreshItemDisplay(list, target, targetURL, type, cache, apiURL) {
    if (list.length == 0) {
        $$(target).html("");
        $$(target).append("<li class=\"item-content\"" +
        "<div class=\"item-inner\"><div class=\"item-title\">No " +
            type + " found</div></div></li>");
    }

    else {
        var acc = [];
        var requestsRemaining = list.length;

        list.forEach(function(id) {
            if (id in cache) {
                console.log("Using " + type + " cache");
                requestsRemaining--;
                acc.push(cache[id]);
                sortAndShit(requestsRemaining, acc, target, targetURL, type);
            }
            else {
                $$.getJSON(hostname + apiURL + id, {}, function(item) {
                    console.log(type + " not cached");
                    cache[id] = item;
                    requestsRemaining--;
                    acc.push(item);
                    sortAndShit(requestsRemaining, acc, target, targetURL, type);
                });
            }
        });
    }
}

function sortAndShit(requestsRemaining, acc, target, targetURL, type) {
    console.log(acc);
    if (requestsRemaining == 0) {
        acc.sort(function (a, b) {
            if (type == "part") {
                return a.instrument.localeCompare(b.instrument);
            }
            else{
                return a.name.localeCompare(b.name);
            }
        });

        $$(target).html("");

        acc.forEach(function(item) {
            writeToList(item, target, targetURL, type);
        })
        acc = [];
    }
}

function alertUser(message, callback){
    var title = "Vivace";
    if(typeof callback === "undefined"){
        myApp.alert(message,title);
    }
    else{
        myApp.alert(message, title, callback);
    }
}

myApp.onPageInit('create_user', function(page){
    console.log("loading create user page");

    $$("#create_user").on('click', function(){
        var formData = myApp.formToJSON("#create-user-form");
        var user = formData["username"];

        if (!isValid(user)) {
            alertUser("Username contains illegal characters or is empty");
        }

        else {
            console.log("Creating account for user " + user);

            $$.ajax({
                headers: {
                    'Content-Type' : 'application/json'
                },
                method : "POST",
                url: hostname + "/api/players/",
                processData: false,
                data: "{\n\t\"username\" : \"" + user + "\"\n}",
                success: function(response) {
                    console.log(response);
                    current["user"] = response;
                    mainView.router.loadPage("user.html");
                },
                dataType : "json",
                statusCode : {
                    400 : function(xhr){
                        alertUser("Username already exists");
                    }
                }
            });

        }
    })
})
