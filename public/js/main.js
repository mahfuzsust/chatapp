$(() => {
    var socket = io()
    socket.on("chat", addChat);
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
            name: $("#txtName").val(), chat: $("#txtMessage").val()
        }
        postChat(chatMessage)
    });
    
    function postChat(chat) {
        $.post("/chats", chat)
    }
    function getChats() {
        $.get("/chats", (chats) => {
            chats.forEach((chat) => {
                addChat(chat);
            });
        })
    }
    function addChat(chatObj){
        $("#messages").append(`<h5>${chatObj.name} </h5><p>${chatObj.chat}</p>`);
    }
    getChats();

    var addConnection = function(obj) {
        var item = $(`<h5 id=${obj.id} class="connection">${obj.name} </h5>`);
        item.click(function(e){
            console.log(e.target.id);
        });
        $("#connectedUsers").append(item);
    };

    var getConnections = function() {
        $.get("/connections", (connections) => {
            connections.data.forEach((connection) => {
                addConnection(connection);
            });
        })
    };

    getConnections();
})