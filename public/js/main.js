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
    })
    $("#send").click(() => {
        var chatMessage = {
            name: $("#txtName").val(), chat: $("#txtMessage").val(), connection: connectionId
        }
        postChat(chatMessage)
    });
    
    function postChat(chat) {
        $.post("/chats", chat)
    }

    function addChat(chatObj){
        $("#messages").append(`<h5>${chatObj.name} </h5><p>${chatObj.chat}</p>`);
    }

    function getMessages(roomId) {
        $.get("/messages/" + roomId, (chats) => {
            if(chats.length > 0) {
                $("#empty_chat").hide();
                
                chats.forEach((chat) => {
                    addChat(chat);
                });
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