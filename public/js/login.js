$(() => {
    $("#login").click(() => {
        var loginInfo = {
            username: $("#username").val(), password: $("#password").val()
        }
        login(loginInfo)
    });
    function login(loginInfo) {
        console.log(loginInfo);
        
        $.post("http://localhost:3000/login", loginInfo, function( data, status ) {
            if(status == "success") {
                location.href = "/";
            } else {
                $("#error").text(data.message);
            }
        });
    }
})