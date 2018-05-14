
function writeToSongList(item, target, fn, args) {
    var name = sanitizeName(item.name);

    $$(target).append("<li class=\"item-content\" id=\"" + item.name + "\">" +
                                "<div class=\"item-inner\"><div class=\"item-title\">" + item.name + "</div></div></li>");

    $$("#" + name).on('click', function(){
        fn.apply(this, args);
        console.log(args)
    });
}

/**
 * rewrites list of songs on the songnotify page
 */
function refreshSongNotifyPage(query) {
    var list;
    var cache;
    var fn;
    var args;
    var acc = [];

    if (query == "notify") {
        list = current["event"].songs;
        cache = cachedSongs;
        fn = sendNotifications;
        args = [current["event"].id];
    }
    else {
        list = cachedBands[current["event"].band].songs;
        cache = cachedSongs;
        fn = addSong;
        args = [];
    }

    var requestsRemaining = list.length;

    if (list.length == 0) {
        $$("#songlist-list").html("");
        $$("#songlist-list").append("<li class=\"item-content\"" +
        "<div class=\"item-inner\"><div class=\"item-title\">No songs found</div></div></li>");
    }

    else{
        $$("#songlist-list").html("")

        list.forEach(function(songID) {
            if (query == "notify") {
                args = [current["event"].id];
            }
            else {
                args = [];
            }

            if (songID in cache) {
                song = cache[songID];
                args.push(songID);
                requestsRemaining--;
                acc.push({"song": song, "args": args});

                sortAndShitSongList(requestsRemaining, acc, fn)
            }
            else {
                $$.getJSON(hostname + "/api/songs/" + songID, {}, function(song){
                    args.push(songID)
                    requestsRemaining--;
                    acc.push({"song": song, "args": args});

                    sortAndShitSongList(requestsRemaining, acc, fn)
                });
            }
        });
    }
}

function sortAndShitSongList(requestsRemaining, acc, fn) {
    if (requestsRemaining == 0) {
        acc.sort(function (a, b) {
            return a.song.name.localeCompare(b.song.name);
        });

        $$("#songlist-list").html("");
        console.log(acc)

        acc.forEach(function(d) {
            writeToSongList(d.song, "#songlist-list", fn, d.args);
        })
        acc = [];
    }
}

function addSong(songID) {
    var url = hostname + "/api/events/" + current["event"].id + "/addsong/" + songID;
    console.log(url)

    $$.ajax({
        headers: {
            'Content-Type' : 'application/json'
        },
        method : "PUT",
        url: url,
        processData: false,
        success: function(response) {
            console.log(response);
            recacheResponse(response, "event", cachedEvents);

            alertUser("Song successfully added!")
            mainView.router.back();
        },
        dataType : "json",
        statusCode : {
            400 : function(xhr){
                alertUser("Error adding song");
            }
        }
    });
}

/** Notify all players in an event about the next song. */
function sendNotifications(eventId, songId) {
    console.log("sending notification: ", eventId, songId);

    $$.ajax({
        method : "PUT",
        url : hostname + "/api/events/" + eventId + "/notifysong",
        data: "{ \"currentsong\": \"" + songId + "\"}",
        processData: false,
        dataType : "json",
        headers: {
            "Content-Type": "application/json"
        },
        success: function(xml){
            mainView.router.back();
        },
        error: function(msg, statusCode) {
            console.log("notification error: ", statusCode);
        },
        statusCode : {
            400 : function(xhr){
                alertUser("Failed to send notification.");
            },
            404 : function() {
                alertUser("Song or event not found.");
            }
        }
    });
}

myApp.onPageBeforeAnimation('songlist-info', function(page) {
    console.log(page.query)
    refreshSongNotifyPage(page.query["action"]);
});