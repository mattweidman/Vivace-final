var hostname = "http://vivace3.azurewebsites.net";
var songId;
var partId;

// Check for the various File API support.
if (window.File && window.FileReader && window.FileList && window.Blob) {
  // Great success! All the File APIs are supported.
} else {
  alert('The File APIs are not fully supported in this browser.');
}

function createSong() {
    console.log("Attempting shit");
    var song = document.getElementsByName("songname")[0].value;
    var data = "{\n\t\"name\" : \"" + song + "\"\n}";
    $.ajax({
        headers: {
            'Content-Type' : 'application/json'
        },
        method : "POST",
        url : hostname + "/api/songs/",
        processData: false,
        data: data,
        dataType: "json",
        success: function(json){
            console.log(json);
            songId = json["id"];
            console.log(songId);
        },
    });
}

function createPart() {
    console.log("Attempting to create part");
    var instrument = document.getElementsByName("instrument")[0].value;
    var data = "{\n\t\"instrument\" : \"" + instrument + "\",\n\t\"song\" : \"" + songId + "\"\n}";
    $.ajax({
        headers: {
            'Content-Type' : 'application/json'
        },
        method : "POST",
        url : hostname + "/api/parts/",
        processData: false,
        data: data,
        dataType: "json",
        success: function(json){
            partId = json["id"];
            console.log(partId)
        },
    });
}

function deletePart() {
    console.log("Attempting to delete part");
    var song = document.getElementsByName("songid")[0].value;
    var part = document.getElementsByName("partid")[0].value;

    $.ajax({
        headers: {
            'Content-Type' : 'application/json'
        },
        method: "PUT",
        url: hostname + "/api/songs/" + song + "/deletepart/" + part,
        processData: false,
        success: function(json) {
            console.log('Delete successful');
        },
    });
}

function uploadPart(f) {
    console.log("Attempting to upload path");
    console.log(hostname + "/api/parts/"+partId+"/upload/")

    $.ajax({
        headers: {
            'Content-Type' : 'application/json'
        },
        method : "POST",
        url : hostname + "/api/parts/"+partId+"/upload/",
        processData: false,
        data: f.target.result,
        dataType: "text",
        success: function(json){
            console.log("woo");
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.log(textStatus, errorThrown);
        }
    });
}
