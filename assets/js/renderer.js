// We are renderer process!

if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.getElementById("treetheme").setAttribute("href", "./assets/themes/default-dark/style.css");
} else {
    document.getElementById("treetheme").setAttribute("href", "./assets/themes/default/style.css");
}

var check = document.querySelector('#check')

document.getElementById("check").addEventListener('change', async () => {
    const isDarkMode = await window.darkMode.toggle()
    if ( isDarkMode ) {
        document.getElementById("treetheme").setAttribute("href", "./assets/themes/default-dark/style.css");
    } else {
        document.getElementById("treetheme").setAttribute("href", "./assets/themes/default/style.css");
    }
})


$(function () {
    $("#username").html(window.userInfo.username);
    $.ajax({url: "https://api.buffer.dk/myip", success: function(result){
        $("#myip").html(result.ip);
        //$("#myip").html("100.100.100.100"); // For screenshot :)
      }});
    $("#tree").overlayScrollbars({
        className       : "os-theme-dark",
        resize          : "none",
        sizeAutoCapable : true,
        paddingAbsolute : true,
        scrollbars : {
            visibility       : "visible",
            autoHide         : "never",
            dragScrolling    : true,
            touchSupport     : true
        }
    });

    $(".pages").overlayScrollbars({
        className       : "os-theme-dark",
        resize          : "none",
        sizeAutoCapable : true,
        paddingAbsolute : true,
        scrollbars : {
            visibility       : "visible",
            autoHide         : "never",
            dragScrolling    : true,
            touchSupport     : true
        }
    });
    $( ".setmode" ).on( "click", function() {
        let mode = $( this ).val()
        window.setMode.activate(mode)
    });
    $( ".prefbuttons" ).on( "click", function() {
        let action = $( this ).val()
        if ( action == "close" ) {
            $("#pagepreferences").hide()
        }
    });
    $( ".item--click" ).on( "click", function() {
        // First find out what mode item we are
        var myID = $(this).attr('id');
        var ourMode = "misconfigured";
        if ( $(this).hasClass( "item--passive" ) ) ourMode = "passive";
        if ( $(this).hasClass( "item--active" ) ) ourMode = "active";
        if ( $(this).hasClass( "item--redteam" ) ) ourMode = "redteam";
        var ourStatus = "unknown";
        if ( $(this).hasClass( "status--disabled" ) ) ourStatus = "disabled";
        if ( $(this).hasClass( "status--ready" ) ) ourStatus = "ready";
        if ( $(this).hasClass( "status--working" ) ) ourStatus = "working";
        if ( $(this).hasClass( "status--done" ) ) ourStatus = "done";

        window.itemAPI.clickItem(myID,ourMode,ourStatus)
    });
});
