// We are renderer process!


//storage.setDataPath("./userdata"); // yodo


if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.getElementById("treetheme").setAttribute("href", "./assets/themes/default-dark/style.css");
    //console.log("Dark theme loaded (startup)");
    /* Testing out JSTree to see if its a good way to present the left sidebar/treeview
    $(function () {

        $('#tree').jstree({
            'core' : {
                "themes": {
                   "name": "default-dark",
                   "dots": true,
                   "stripes" : true,
                   "icons": true
               }
            }
        });
    
    });
    */
} else {
    document.getElementById("treetheme").setAttribute("href", "./assets/themes/default/style.css");
    //console.log("Light theme loaded (startup)");
    /* Testing out JSTree to see if its a good way to present the left sidebar/treeview
    $(function () {

        $('#tree').jstree({
            'core' : {
                "themes": {
                   "name": "default",
                   "dots": true,
                   "stripes" : true,
                   "icons": true
               }
            }
        });
    
    });
    */
}

var check = document.querySelector('#check')

document.getElementById("check").addEventListener('change', async () => {

    //console.log("Toggle theme");

    //   conditions to apply when checkbox is checked
    const isDarkMode = await window.darkMode.toggle()
    //document.getElementById('theme-source').innerHTML = isDarkMode ? 'Dark' : 'Light'

    if(this.checked == true){

    }

    if(this.checked == false){

    }  

    if ( isDarkMode ) {
        document.getElementById("treetheme").setAttribute("href", "./assets/themes/default-dark/style.css");
        //console.log("Dark theme loaded (toggle)");
    } else {
        document.getElementById("treetheme").setAttribute("href", "./assets/themes/default/style.css");
        //console.log("Light theme loaded (toggle)");
    }
    


})

$(function () {
    $("#username").html(window.userInfo.username);
    //setInterval(() => $("#cpu").html( window.usage.cpu ), 800);
    $.ajax({url: "https://api.buffer.dk/myip", success: function(result){
        $("#myip").html(result.ip);
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
    /* Testing out JSTree to see if its a good way to present the left sidebar/treeview
    $('#tree').on("changed.jstree", function (e, data) {
        console.log(data.selected);
    });
    */
});

function reloadStylesheets() {
    var queryString = '?reload=' + new Date().getTime();
    $('link[rel="stylesheet"]').each(function () {
        this.href = this.href.replace(/\?.*|$/, queryString);
    });
}

//console.log("Renderer loaded");
