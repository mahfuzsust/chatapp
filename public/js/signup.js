$(() => {
    $("#signup").click(() => {
        var usernameValue = $("#username").val();
        var rePasswordValue = $("#repassword").val();
        var passwordValue  = $("#password").val();
        if(passwordValue !== rePasswordValue) {
            $("#error").text("Password didn't match");
            return;
        }
        var info = {
            username: usernameValue, password: passwordValue
        }
        signup(info)
    });
    function signup(info) {
        $.post("http://localhost:3000/signup", info, function( data, status ) {
            if(status == "success") {
                location.href = "/login";
            } else {
                $("#error").text("Error occurred");
            }
        });
    }
})