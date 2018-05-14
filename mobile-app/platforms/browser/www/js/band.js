
/**
 * rewrites list of songs and events on the bands page
 */
function refreshBandPage() {
    refreshItemDisplay(current["band"].songs, "#band-songs", "song.html", "song", cachedSongs, "/api/songs/");
    refreshItemDisplay(current["band"].events, "#band-events", "event.html", "event", cachedEvents, "/api/events/");
}

/**
 * create new event and add it to currentBand's list of events
 */
function addBandEvent() {
    var event_name = prompt("What would you like to call this event?");

    if (event_name && isValid(event_name)) {
        var data = "{\n\t\"name\" : \"" + event_name + "\",\n\t\"band\" : \"" + current["band"].id + "\"\n}"
        $$.ajax({
            headers: {
                'Content-Type' : 'application/json'
            },
            method : "POST",
            url: hostname + "/api/events/",
            processData: false,
            data: data,
            success: function(response) {
                console.log(response);
                $$.getJSON(hostname + "/api/bands/" + response.band, {}, function(band) {
                    recacheResponse(band, "band", cachedBands);
                    console.log(band)
                    refreshBandPage();
                })
                alertUser("Event successfully added!");
            },
            dataType : "json",
            statusCode : {
                400 : function(xhr){
                    alertUser("Error adding event");
                }
            }
        });
    }

    else {
        alertUser("Event name contains illegal characters or is empty")
    }
}

myApp.onPageInit('create_band', function(){
    console.log("loading create band page");

    $$("#create_band").on('click', function(){
        var formData = myApp.formToJSON("#create-band-form");
        var band = formData["bandname"];
        console.log("Creating band:" + band);

        if (!isValid(band)) {
            alertUser("Band name contains illegal characters or is empty");
        }

        else {
            $$.ajax({
                headers: {
                    'Content-Type' : 'application/json'
                },
                method : "POST",
                url: hostname + "/api/bands/",
                processData: false,
                data: "{\n\t\"name\" : \"" + band + "\"\n}",
                success: function(response) {
                    console.log(response);
                    cachedBands[response.id] = response;

                    $$.ajax({
                        headers: {
                            'Content-Type' : 'application/json'
                        },
                        method : "PUT",
                        url: hostname + "/api/players/" + current["user"].id + "/addband/" + response.id,
                        processData: false,
                        success: function(response) {
                            console.log(response);
                            current["user"] = response;
                            window.localStorage.setItem("currentUser", JSON.stringify(current.user));
                            refreshUserPage();
                        },
                        dataType : "json",
                        statusCode : {
                            400 : function(xhr){
                                alertUser("Band already exists");
                            }
                        }
                    });

                    alertUser("Band successfully created!");
                    mainView.router.back();
                },
                dataType : "json",
                statusCode : {
                    400 : function(xhr){
                        alertUser("Band already exists");
                    }
                }
            });
        }
    })
})

myApp.onPageInit('join_band', function(){
    console.log("loading join band page");

    $$("#join_band").on('click', function(){
        var formData = myApp.formToJSON("#join-band-form");
        var band = formData["bandname"];
        console.log("Joining band:" + band);

        $$.ajax({
            headers: {
                'Content-Type' : 'application/json'
            },
            method : "PUT",
            url: hostname + "/api/players/" + current["user"].id + "/addband/" + band,
            processData: false,
            success: function(response) {
                console.log(response);
                current["user"] = response;
                alertUser("Band successfully joined!");
                window.localStorage.setItem("currentUser", JSON.stringify(current.user));
                refreshUserPage();
            },
            error: function(xhr) {
                alertUser("No such band exists!");
            },
            dataType : "json",
            statusCode : {
                400 : function(xhr){
                    alertUser("Band already exists");
                }
            }
        });
    });
})

myApp.onPageInit("band-info", function() {
    console.log(current["band"]);
    $$("#band-title").text(current["band"].name);
    $$("#band-id").text("ID: " + current["band"].id);
    myApp.sizeNavbars();

    $$("#band-refresh").on('refresh', function(e){
        console.log("Refreshing Band Page");
        setTimeout(function(){
            cachedSongs = {};
            cachedEvents = {};
            pullToRefresh("/api/bands/", current.band.id, "band", refreshBandPage); 
        }, 2000);
    });

    $$("#rename-band").on('click', function() {
        rename(current["band"].name, "/api/bands/" + current["band"].id, refreshBandPage);
    });

    $$("#leave-band").on('click', function() {
        myApp.confirm("Are you sure you want to leave?", "Vivace", function(){
            $$.ajax({
                headers: {
                    'Content-Type' : 'application/json'
                },
                method : "PUT",
                url: hostname + "/api/players/" + current["user"].id + "/leaveband/" + current["band"].id,
                processData: false,
                success: function(response) {
                    console.log(response);
                    current["user"] = response;
                    alertUser("Band successfully left!");
                    window.localStorage.setItem("currentUser", current.user);
                    refreshUserPage();
                    mainView.router.loadPage("user.html");
                },
                dataType : "json",
                statusCode : {
                    400 : function(xhr){
                        alertUser("Band already exists");
                    }
                }
            });
        });
    })

    $$("#left-button-band").on('click', function() {
        if ($$("#left-button-band")[0].text == "Add Song") {
            modifySong(true, true);
        }

        else {
            addBandEvent();
        }
    });

    $$("#right-button-band").on('click', function() {
        if ($$("#right-button-band")[0].text == "Remove Song") {
            modifySong(false, true);
        }
    });

    $$("#band-events-button").on('click', function() {
        $$("#left-button-band").text("Add Event");
        $$("#right-button-band").text("");
    });

    $$("#band-songs-button").on('click', function() {
        $$("#left-button-band").text("Add Song");
        $$("#right-button-band").text("Remove Song");
    });

    $$("#band-settings-button").on('click', function() {
        $$("#left-button-band").text("");
        $$("#right-button-band").text("");
    });
});

myApp.onPageBeforeAnimation("band-info", function(page) {
    refreshBandPage();
})
