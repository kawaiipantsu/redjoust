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

function testMe1() {
    // no content
}

$(function () {
    $("#username").html(window.userInfo.username);
    
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

    // For future use (autocomplete etc)
    $( "#inputTarget" ).autocomplete({
        source: window.actionHandler.targethistoryarray()
    });

    /* My first blab attempt to play with something ...
    $('#inputTarget').on('input',function(e){
        curValue = $(this).val();
        curLen = curValue.length;
        if ( curLen > 2) {
            // We have 2+ chars to match on ...
            // Lets play, this is not a full fledge autocomplete,
            // just me playing around .... (it's all handled in preload, away from user)
            var result = window.actionHandler.targethistory(curValue);
            console.log(result);
        }
    });
    */

    $( ".setmode" ).on( "click", function() {
        let mode = $( this ).val()
        window.setMode.activate(mode)
    });
    $( ".goto" ).on( "click", function() {
        let goto = $( this ).attr("id")
        window.actionHandler.goto(goto)
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
        if ( $(this).hasClass( "item--external" ) ) ourMode = "external";
        if ( $(this).hasClass( "item--passive" ) ) ourMode = "passive";
        if ( $(this).hasClass( "item--active" ) ) ourMode = "active";
        if ( $(this).hasClass( "item--redteam" ) ) ourMode = "redteam";
        var ourStatus = "unknown";
        if ( $(this).hasClass( "status--disabled" ) ) ourStatus = "disabled";
        if ( $(this).hasClass( "status--info" ) ) ourStatus = "info";
        if ( $(this).hasClass( "status--ready" ) ) ourStatus = "ready";
        if ( $(this).hasClass( "status--working" ) ) ourStatus = "working";
        if ( $(this).hasClass( "status--done" ) ) ourStatus = "done";

        window.itemAPI.clickItem(myID,ourMode,ourStatus)
    });
});
