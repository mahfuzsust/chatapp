$(() => {
    var connectionId;
    var roomUsers = {};

    var setRoomUsers = function(data) {
        data.forEach((connection) => {
            roomUsers[connection.roomId] = connection
        });
    };


    var socket = io();
    
    $('#autocomplete').autocomplete({
        serviceUrl: '/users',
        paramName: 'searchString',
        transformResult: function(response) {
            var responseData = $.parseJSON(response);
            return {
                suggestions: $.map(responseData.data, function(dataItem) {
                    return { value: dataItem.username, data: dataItem._id };
                })
            };
        },
        onSelect: function (suggestion) {
            $.post("/connect", {connectionId: suggestion.data});
            //alert('You selected: ' + suggestion.value + ', ' + suggestion.data);
        }
    });
    $("#logout").click(() => {
        localStorage['userId'] = null;
        localStorage['token'] = null;

        $.get("/logout");
    });
    $("#send").click(() => {
        var chatMessage = {
            name: $("#txtName").val(), chat: $("#txtMessage").val(), connection: connectionId
        }
        postChat(chatMessage)
    });

    $("#accept_chat").click(() => {
        $("#not_accepted").hide();
        $("#commenting").show();
        $("#messages").show();
        $("#messages").empty();
        $.get("/accept/" + connectionId);
        roomUsers[connectionId].isAccepted = true;
    });

    $("#reject_chat").click(() => {
        $.get("/reject/" + connectionId);
        $("#" + connectionId).remove();
    });
    
    function postChat(chat) {
        $.post("/chats", chat)
    }

    function addChat(chatObj){
        if(chatObj.user == localStorage['userId']){
            $("#messages").append(`<div class="right"><p>${chatObj.chat}</p></div>`);
        } else {
            $("#messages").append(`<div class="left"><p>${chatObj.chat}</p></div>`);
        }
    }

    function getMessages(roomId) {
        $.get("/messages/" + roomId, (chats) => {
            if(chats.length > 0) {
                $("#empty_chat").hide();
                $("#messages").empty();
                chats.forEach((chat) => {
                    addChat(chat);
                });
            } else {
                $("#empty_chat").show();
            }
        })
    }

    var clickConnection = function(e) {
        var roomId = e.target.id;
        var connection = roomUsers[roomId];
        connectionId = roomId;
        if(!connection.isAccepted) {
            $("#empty_chat").hide();
            $("#not_accepted").show();
        } else {
            socket.on("chat:" + roomId, addChat);
            $("#commenting").show();
            $("#messages").show();
            getMessages(connectionId);
        }
    };

    var addConnection = function(obj) {
        var item = $(`<h5 id=${obj.roomId} class="connection">${obj.name} </h5>`);
        item.click(clickConnection);
        $("#connectedUsers").append(item);
    };

    var getConnections = function() {
        $.get("/connections", (connections) => {
            setRoomUsers(connections.data);
            connections.data.forEach((connection) => {
                addConnection(connection);
            });
        })
    };

    getConnections();
})