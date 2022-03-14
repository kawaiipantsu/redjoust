var targetHistory = window.actionHandler.targethistoryarray()

$(function () {
	$(".autocompleteNavigate").on("keydown", function(e) {
		if (e.key == "ArrowDown") {
			if( $('#autocompleteResult').is(":visible") ) {
				e.preventDefault();
				autocompleteNavigation("down");
			}
		}
		if (e.key == "ArrowUp") {
			if ( $('#autocompleteResult').is(":visible") ) {
				e.preventDefault();
				autocompleteNavigation("up");
			}
		}
		
	});
	$('#autocompleteResult').on('mouseOver',function(e){
		autocompleteNavigation("focus");
	});
	$('#autocompleteResult').on('mouseOut',function(e){
		autocompleteNavigation("unfocus");
	});
});

function autocompleteMatch( input ) {
	if (input == '') return [];
	var reg = new RegExp(input)
	return targetHistory.filter(function(term) {
		if (term.match(reg)) return term;
	});
  }
   
  function targetAutocomplete( val ) {
	$("#autocompleteResult").hide();
	var res = document.getElementById("autocompleteResult");
	res.innerHTML = '';
	let list = '';
	let terms = autocompleteMatch(val);
	if ( terms.length == 1 && terms[0] == val ) {
		// Seems like we are in an agreement, only 1 target left in history
		// Lets not show that since its already choosen ...
	} else {
		for (i=0; i<terms.length; i++) {
			if ( i < 1) list += '<li class="autocompleteClickTarget">' + terms[i] + '</li>';
			else list += '<li class="autocompleteClickTarget">' + terms[i] + '</li>';
		}
		res.innerHTML = '<ul>' + list + '</ul>';
		if ( list < 1 ) $("#autocompleteResult").hide();
		else $("#autocompleteResult").show();
		
		$('.autocompleteClickTarget').on('click',function(e){
			var autocompleteTargetClicked = $(this).text();
			autocompleteNavigation("click",autocompleteTargetClicked);
		});
		
	}
  }

  function autocompleteNavigation( action, clickValue=false ) {
	switch (action) {
		case "up":
			if( $("#autocompleteResult li.autocompletedSelected").index() === 0) {
				$("#autocompleteResult li").eq(0).first().addClass("autocompletedSelected")
			} else {
				$(".autocompletedSelected").removeClass("autocompletedSelected").prev("li").addClass("autocompletedSelected");
				$(".autocompletedSelected")[0].scrollIntoView({
					behavior: "smooth", // or "auto" or "instant"
					block: "start" // or "end"
				});
			}
			break;
		case "down":
			if( $("#autocompleteResult li.autocompletedSelected").index() === -1) {
				$("#autocompleteResult li").eq(0).first().addClass("autocompletedSelected")
			} else if ( $("#autocompleteResult li.autocompletedSelected").index() === $("#autocompleteResult li").length-1) {

			} else {
				$(".autocompletedSelected").removeClass("autocompletedSelected").next("li").addClass("autocompletedSelected");
				$(".autocompletedSelected")[0].scrollIntoView({
					behavior: "smooth", // or "auto" or "instant"
					block: "start" // or "end"
				});
			}
			break;
		case "click":
			if ( clickValue ) {
				$("#inputTarget").val(clickValue);
				$('.autocompleteClickTarget').removeClass("autocompletedSelected");
				$("#autocompleteResult").hide();
				$("#inputTarget").trigger('focus');
			}
			break;
		case "focus":
			//$(".autocompleteClickTarget").removeClass("selected");
			break;
		case "unfocus":
			break;
	}
  }