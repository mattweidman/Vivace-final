
/**
 * rewrites list of songs on the events page
 */
function refreshEventPage() {
    refreshItemDisplay(current["event"].songs, "#event-songs", "song.html", "song", cachedSongs, "/api/songs/");
}

/**
 * joins or leaves a band for current user
 * @param {boolean} isJoining is whether user is subscribing or unsubscribing
 */
function modifySubscription(isJoining) {
    var url = hostname + "/api/players/" + current["user"].id +
        (isJoining? "/addevent/" : "/leaveevent/") + current["event"].id;
    $$.ajax({
        headers: {
            'Content-Type' : 'application/json'
        },
        method : "PUT",
        url: url,
        processData: false,
        success: function(response) {
            console.log(response);
            current["user"] = response;
            window.localStorage.setItem("currentUser", JSON.stringify(current.user));
            // TODO update currentEvent?
            alertUser("Successfully " +
                (isJoining ? "subscribed!" : "unsubscribed!"), function(){
                    refreshUserPage();
                    $$("#subscription-type").text(isJoining ? "Unsubscribe" : "Subscribe");
                });
        },
        dataType : "json",
        statusCode : {
            400 : function(xhr){
                alertUser("Error modifying subscription to event");
            }
        }
    });
}

/**
 * create new event and add it to currentBand's list of events
 */
function deleteEvent() {
    console.log("here")
    $$.ajax({
        headers: {
            'Content-Type' : 'application/json'
        },
        method : "PUT",
        url: hostname + "/api/bands/" + current["event"].band + "/removeevent/" + current["event"].id,
        processData: false,
        success: function(response) {
            console.log(response);
            recacheResponse(response, "band", cachedBands);
            mainView.router.loadPage("user.html")
            alertUser("Event successfully deleted!");
            // TODO update user and check back history?
        },
        dataType : "json",
        statusCode : {
            400 : function(xhr){
                alertUser("Error adding event");
            }
        }
    });
}

myApp.onPageInit('event-info', function() {
    console.log(current["event"]);

    var isSubscribed = current.user.events.includes(current.event.id);
    var subscriptionType = (isSubscribed) ? "Unsubscribe" : "Subscribe";

    $$("#event-title").text(current["event"].name);
    $$("#event-id").text("ID: " + current["event"].id);
    $$("#subscription-type").text(subscriptionType);
    

    myApp.sizeNavbars();

    $$("#event-refresh").on('refresh', function(e){
        console.log("Refreshing Event Page");
        setTimeout(function(){
            cachedSongs = {};
            pullToRefresh("/api/events/", current.event.id, "event", refreshEventPage); 
        }, 2000);
    });

    $$("#rename-event").on('click', function() {
        rename(current["event"].name, "/api/events/" + current["event"].id, refreshEventPage);
        delete cachedBands[current["band"].id];
    });

    $$("#subscribe").on('click', function() {
        isSubscribed = current.user.events.includes(current.event.id);
        modifySubscription(!isSubscribed);
    });

    $$("#delete-event").on('click', function() {
        console.log("here")
        deleteEvent();
    });

    $$("#left-button-event").on('click', function() {
        mainView.router.load({"url": "songlist.html", "query": {"action": "add"}});
    });

    $$("#right-button-event").on('click', function() {
        modifySong(false, false);
    });

    $$("#event-songs-button").on('click', function() {
        $$("#left-button-event").text("Add Song");
        $$("#right-button-event").text("Remove Song");
    });

    $$("#event-settings-button").on('click', function() {
        $$("#left-button-event").text("");
        $$("#right-button-event").text("");
    });

    $$("#notify-event").on('click', function () {
        mainView.router.load({"url": "songlist.html", "query": {"action": "notify"}});
    });
});

myApp.onPageBeforeAnimation("event-info", function() {
    refreshEventPage();
})
