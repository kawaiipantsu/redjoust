// We are renderer process!

var check = document.querySelector('#check')

document.getElementById("check").addEventListener('change', async () => {
    const isDarkMode = await window.darkMode.toggle()
})

$(function () {
    // Not used anymore, but we can see the OS username of the logged in user
    // $("#username").html(window.userInfo.username);
    
    // Quick check the toolbox for internal vs external (urls) and change the
    // icon so it looks cooler and more informative! If this fails there is always
    // shown a default icon.
    var pattern = /^((http|https|ftp):\/\/)/i;
    $(".item--external").each(function() {
        var toolPage = $(this).data("page");
        if (pattern.test(toolPage)) {
            // We external link!
            $(this).css('background-image','url("icons/menu/set1/openlink.png")');
        } else {
            // We normal internal tool!
            $(this).css('background-image','url("icons/menu/set1/app.png")');
        }
    });
    

    // Enable the "Fancy" scroll bars aka styled scrollbars for our menu!
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

    // Enable the "Fancy" scroll bars aka styled scrollbars for our page container!
    $(".toolcontainter").overlayScrollbars({
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
    $(".itemcontainter").overlayScrollbars({
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
    $(".terminal").overlayScrollbars({
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
    
    // Do some prettifying (textareas mainly, that might have been filled and are not at the top)
    //$( ".terminal" ).on( "click", function() {
    //    $(this).scrollTop();
    //});

    $( ".setmode" ).on( "click", function() {
        let mode = $( this ).val()
        window.setMode.activate(mode)
    });
    $(window).on( "keypress", function(event) {
        // ENTER KEY HANDLER!!
        if (event.key == "Enter") {
            // Enter key handler for Set target page !
            if ( $('#inputTarget').is(":visible") ) {
                var target = $("#inputTarget").val();
                if ( target && target.length > 0 ) {
                    window.actionHandler.updateTarget(target);
                    // Also update autocomplete
                    $("#inputTarget").autocomplete("option", { source: window.actionHandler.targethistoryarray() });
                    // We still continue !
                    window.actionHandler.goto('inputTarget')
                } else {
                    alert("Please set something as target!");
                    $("#inputTarget").trigger('focus');
                }
            }
        }
    });
    $( ".goto" ).on( "click", function() {
        let goto = $( this ).attr("id") // Our name reflects where we are located
        let action = $( this ).val() // Set if we need to trigger something!
        if ( action ) {
            if ( action == "updatetarget") {
                var target = $("#inputTarget").val();
                if ( target && target.length > 0 ) {
                    window.actionHandler.updateTarget(target);
                    // Also update autocomplete
                    $("#inputTarget").autocomplete("option", { source: window.actionHandler.targethistoryarray() });
                    // We still continue !
                    window.actionHandler.goto(goto)
                } else {
                    alert("Please set something as target!");
                    $("#inputTarget").trigger('focus');
                }
            }
        } else {
            // Just continue!
            window.actionHandler.goto(goto)
        }
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

    $( ".tool--click" ).on( "click", function() {
        // Who are we ?
        var myID = $(this).attr('id');
        var myPage = $(this).data("page");
        window.toolAPI.clickItem(myID,myPage);
    });

    $( ".base64--click" ).on( "click", function() {
        var dataAction = $(this).data('action');
        var dataInput = $(this).data("input");
        var dataOutput = $(this).data("output");
        var dataValue = $("#"+dataInput).val();
        var result = "";
        switch (dataAction) {
            case "b64encode":
                if ( dataValue ) {
                    result = window.toolAPI.base64Encode(dataValue);
                    $("#"+dataOutput).val(result);
                }
                break;
            case "b64decode":
                if ( dataValue ) {
                    result = window.toolAPI.base64Decode(dataValue);
                    $("#"+dataOutput).val(result);
                }
                break;
            case "b64clear":
                $("#b64--ascii").val("");
                $("#b64--base64").val("");
                break;
        }
    });

    $('#hashinput').on('click focusin', function() {
        this.value = '';
    });
    $('#hashinput').on('input', function() {
        var value = $(this).val();
        window.toolAPI.doHashing(value);
    });
    $('.hashresult').on('click', function() {
        $(this).trigger("select");
        document.execCommand("copy");
        window.toolAPI.statusbarNotify('Hash copied to clipboard!');
    });
});
