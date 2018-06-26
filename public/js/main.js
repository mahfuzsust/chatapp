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
            alert('You selected: ' + suggestion.value + ', ' + suggestion.data);
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
})