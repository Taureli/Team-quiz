$(function() {

    //-----------REJESTRACJA--------------

    $("#reg").on('submit', function(e) {
        e.preventDefault();

        //Sprawdzam czy hasła się zgadzają
        if ($("#regPassword").val() !== $("#regPassword2").val()) {
            $("#regPassword2").css("border", "solid red");
        } else {
            var username = $("#regName").val();
            var password = $("#regPassword").val();

            //wysyłam 'prośbę' o rejestrację
            $.ajax({
                url: '/register',
                method: 'post',
                data: {
                    username: username,
                    password: password
                },
                success: function(data) {
                    $("#info").html("<div class='alert alert-warning alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button>" + data + "</div>");
                    $("#regPassword2").css("border", "");
                },
                error: function(data) {
                    $("#info").html("<div class='alert alert-danger alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button>" + data + "</div>");
                    $("#regPassword2").css("border", "");
                }
            });
        }
    });

    //------------------------------------

});
