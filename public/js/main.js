$(() => {
    var socket = io()
    socket.on("chat", addChat)
    $("#send").click(() => {
        var chatMessage = {
            name: $("#txtName").val(), chat: $("#txtMessage").val()
        }
        postChat(chatMessage)
    });
    
    function postChat(chat) {
        $.post("http://localhost:3000/chats", chat)
    }
    function getChats() {
        $.get("/chats", (chats) => {
            chats.forEach((chat) => {
                addChat(chat);
            });
        })
    }
    function addChat(chatObj){
        console.log(chatObj);
        $("#messages").append(`<h5>${chatObj.name} </h5><p>${chatObj.chat}</p>`);
    }
    getChats();
})