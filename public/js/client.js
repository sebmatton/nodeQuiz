// Variables
var current_active_bonus = {delay:false,double:false};
var counter = 8;
var counter_max = 8;
var counter_max_bonus_delay = 12;
var counter_max_current = 8;
var counter_run = false;
var start_time = 'undefined';
var timer;

// START - FULL SCREEN 
$('a.fullscreen').click(function () {
	screenfull.request();
	$('a.fullscreen').hide();
});

if (screenfull.enabled) {
    document.addEventListener(screenfull.raw.fullscreenchange, function () {
    	if(screenfull.isFullscreen)
    		$('a.fullscreen').hide();
    	else
    		$('a.fullscreen').show();
    	updateSize();
    });
}
// END - FULL SCREEN 

// START - functions
var homepage_ratio = 0;

function updateCounterDisplay(){
	$('.chart').data('easyPieChart').update(counter/counter_max_current*100);
   	$('.chart .value').text(counter.toFixed(1));
}

function activateBonus(btype){
	$('#questionnaire-home .questionnaire-bonus ul.bonus li.'+btype+' img').removeClass("disabled");
	$('#questionnaire-home .questionnaire-bonus ul.bonus li.'+btype+' img').addClass("active");
	$('#questionnaire-home .questionnaire-bonus ul.bonus li.'+btype+' img').attr('data-available','false');
	current_active_bonus[btype] = true;
}

function getBonusText(btype){
	var type_txt ="unknown";
	if(btype=="delay") type_txt = '"Délai allongé"';
	else if(btype=="double") type_txt = '"Points doublés"';
	return type_txt;
}

function updateSize(){
	if($('#homepage').is(':visible')){
		$('#homepage .quiz-logo img').height($('#homepage .quiz-logo img').height()+$(window).height()-$('#homepage').height()-90);
		$('#homepage .quiz-logo img').width($('#homepage .quiz-logo img').height()/homepage_ratio);
		if($('#homepage .quiz-logo img').width()>$(window).width()-40){
			$('#homepage .quiz-logo img').width($(window).width()-40);
			$('#homepage .quiz-logo img').height($('#homepage .quiz-logo img').width()*homepage_ratio);
		}
	}
	if($('#loader').is(':visible')){
		$('#loader .container').css('margin-top',($(window).height()-90-$('#loader .container').height())/2);
	}
	if($('#questionnaire-home').is(':visible')){
		$('#questionnaire-home .questionnaire-description').css('margin-top',($(window).height()-90-$('#questionnaire-home').height())/4);
		$('#questionnaire-home .questionnaire-description').css('margin-bottom',($(window).height()-90-$('#questionnaire-home').height())/4);
	}
	if($('#question').is(':visible')){
		// var half = ($(window).height()/5-$('#question .question .box').height()) / 2;
		var reph = ($(window).height()/8-$('#question ul.reponses li a span.letter').height())/2.5;

		$('#question ul.reponses li a').css('padding-top', reph);
		$('#question ul.reponses li a').css('padding-bottom', reph);
	}
	if($('#announce').is(':visible')){
		$('#announce .box').css('margin-top', ($(window).height()-90-$('#announce .box').height())/3);
	}
	if($('#waiting').is(':visible')){
		$('#waiting').css('margin-top', ($(window).height()-90-$('#waiting').height())/3);
	}
}
$(window).resize(function(){
	updateSize();
});

// END - functions

$(document).ready(function() {
	setInterval(function(){ updateSize(); }, 2000);

	$('#loader').show();
	$('#homepage').hide();
	$('#questionnaire-home').hide();
	$('#question').hide();
	$('#modal-notif').hide();
	$('#announce').hide();
	$('#waiting').hide();

	updateSize();

    $('.chart').easyPieChart({
        animate: 200,
        trackColor: "rgba(0,0,0,0.2)",
        lineWidth: 3,
        barColor: "#fff",
        size: 40,
        scaleColor: false
    });

 //    setInterval(function(){
 //    	if(counter_run){
	//     	$('.chart').data('easyPieChart').update(counter/counter_max*100);
	//     	$('.chart .value').text(counter.toFixed(1));
	//     	counter=counter-0.1;
	//     	if(counter<8) $('.chart').addClass('red');
	//     	if(counter<0){
	//     		counter = counter_max;
	//     		$('.chart').removeClass('red');
	//     	}
 //    	}
 //    }, 100);


	// Realtime app
	var socket = io(server_id);
	var user_valid = false;
	var user_name = "";

	socket.on('connect', function(){
		// update gui with online icon
		$('.header-participant .cust-right .onoffline').html('<span class="badge badge-success"><span class="glyphicon glyphicon-ok"></span></span>');
		// Notify server of new user by sending hash
		socket.emit('new_user', {uid:user_id});
	});

	// Notification for valid user
	socket.on('user_ok',function(data){
		$('.header-participant img.user').attr('src',data.avatar);
		$('.header-participant .username').text(data.name);
		$('#homepage .quiz-description h2').text(data.quiz_name);
		$('#homepage .quiz-logo img').attr('src',data.quiz_image.url);
		$('#homepage .score .points').text(data.total_points);
		homepage_ratio = data.quiz_image.ratio;

		if(data.available_bonus.double)	$('#homepage .quiz-bonus ul.bonus li.double img').removeClass("disabled");
		else 							$('#homepage .quiz-bonus ul.bonus li.double img').addClass("disabled");

		if(data.available_bonus.delay)	$('#homepage .quiz-bonus ul.bonus li.delay img').removeClass("disabled");
		else 							$('#homepage .quiz-bonus ul.bonus li.delay img').addClass("disabled");

		// Show homepage
		$('#homepage').hide();
		$('#questionnaire-home').hide();
		$('#question').hide();
		$('#modal-notif').hide();
		$('#announce').hide();
		
		$('#loader').fadeOut(300, function(){
			$('#homepage').show();
			updateSize();
			$('#homepage').hide();
			$('#homepage').fadeIn(300, function(){
				socket.emit('current-state', {'state':'homepage'});
			});
		});
	});

	// Unkown user
	socket.on('user_unknown', function(){
		$('.header-participant .username').text('Inconnu');
		$('#announce .box').html('<strong>Utilisateur inconnu !</strong><br /> Veuillez vérifier l\'url de la page.');

		// Show announce
		$('#homepage').hide();
		$('#questionnaire-home').hide();
		$('#question').hide();
		$('#modal-notif').hide();
		$('#announce').hide();

		$('#loader').fadeOut(300, function(){
			$('#announce').show();
			updateSize();
			$('#announce').hide();
			$('#announce').fadeIn(300);
		});
	});

	// User already connected
	socket.on('user_exist', function(data){
		$('.header-participant img.user').attr('src',data.avatar);
		$('.header-participant .username').text(data.name);
		$('#announce .box').html('<strong>Un autre utilisateur est déjà connecté avec le compte "'+data.name+'" !</strong><br />Seul un joueur est autorisé par compte.');
		
		$('#homepage').hide();
		$('#questionnaire-home').hide();
		$('#question').hide();
		$('#modal-notif').hide();
		$('#announce').hide();
		$('#loader').fadeOut(300, function(){
			$('#announce').show();
			updateSize();
			$('#announce').hide();
			$('#announce').fadeIn(300);
		});
	});

	// Start of the questionnaire
	socket.on('start-questionnaire', function(data){
		current_active_bonus.delay = false;
		current_active_bonus.double = false;

		$('#questionnaire-home .questionnaire-description h2').text(data.title);
		$('#questionnaire-home .questionnaire-details .nombre-content').text(data.nb);
		$('#question .number .cont-tot').text(data.nb);
		$('#questionnaire-home .questionnaire-details .type-content').text(data.type);

		$.each(data.restr_users, function(i, item){
			if(item.hash==user_id){
				$('#questionnaire-home .questionnaire-bonus ul.bonus li.double img').removeClass("active");
				if(item.available_bonus.double){
					$('#questionnaire-home .questionnaire-bonus ul.bonus li.double img').removeClass("disabled");
					$('#questionnaire-home .questionnaire-bonus ul.bonus li.double img').attr('data-available','true');
				}else{
					$('#questionnaire-home .questionnaire-bonus ul.bonus li.double img').addClass("disabled");
					$('#questionnaire-home .questionnaire-bonus ul.bonus li.double img').attr('data-available','false');
				}

				$('#questionnaire-home .questionnaire-bonus ul.bonus li.delay img').removeClass("active");
				if(item.available_bonus.delay){
					$('#questionnaire-home .questionnaire-bonus ul.bonus li.delay img').removeClass("disabled");
					$('#questionnaire-home .questionnaire-bonus ul.bonus li.delay img').attr('data-available','true');
				}else{
					$('#questionnaire-home .questionnaire-bonus ul.bonus li.delay img').addClass("disabled");
					$('#questionnaire-home .questionnaire-bonus ul.bonus li.delay img').attr('data-available','false');
				}
			}
		});
		
		socket.emit('restore-active-bonus',{});

		$('#loader').hide();
		$('#questionnaire-home').hide();
		$('#question').hide();
		$('#modal-notif').hide();
		$('#announce').hide();
		$('#waiting').hide();
		
		$('#homepage').fadeOut(300, function(){
			$('#questionnaire-home').fadeIn(300);
		});
	});
	
	// Get back active bonus for this questionnaire
	socket.on('restore-active-bonus',function(data){
		if(data.delay==true)
			activateBonus('delay');
		if(data.double==true)
			activateBonus('double');
	});

	// Bonus is available and can be used
	socket.on('activate-bonus', function(data){
		var type_txt =getBonusText(data.btype);
		if(type_txt=="unknown"){
			alert('Échec d\'activation de bonus : bonus inconnu ('+data.btype+')');
		}else{
			activateBonus(data.btype);
		}
	});

	// Bonus was not available
	socket.on('bonus-refused', function(data){
		var type_txt =getBonusText(data.btype);
		alert('Bonus '+type_txt+' non disponible !');
		$('#questionnaire-home .questionnaire-bonus ul.bonus li.'+data.btype+' img').removeClass("active");
		$('#questionnaire-home .questionnaire-bonus ul.bonus li.'+data.btype+' img').addClass("disabled");
		$('#questionnaire-home .questionnaire-bonus ul.bonus li.'+data.btype+' img').attr('data-available','false');
	});

	// Show question
	socket.on('show-question', function(data){
		clearInterval(timer);
		// Update counter
		counter_max_current = counter_max;

		// Update if bonus activated
		if(current_active_bonus.delay || current_active_bonus.double){
			$('#question .top-text-bonus').show();
			if(current_active_bonus.delay){
				$('.chart').addClass('bonus');
				counter_max_current = counter_max_bonus_delay;
			}else{
				$('.chart').removeClass('bonus');
			}
		}else{
			$('#question .top-text-bonus').hide();
			$('.chart').removeClass('bonus');
		}

		// Finish update counter
		counter = counter_max_current;
		$('.chart').removeClass('red');

		updateCounterDisplay();

		$('#question .question h2').text(data.question);
		$('#question ul.reponses .poss-cont').text('');
		$('#question ul.reponses a.poss').addClass('disabled').removeClass('active').removeClass('false').removeClass('correct');


		$('#homepage').hide();
		$('#modal-notif').hide();
		$('#announce').hide();

		$('#question .number .cont-n').text(data.key+1);

		if(data.key==0){
			$('#questionnaire-home').hide();
			$('#question').show();
			updateSize();
			$('#questionnaire-home').show();
			$('#question').hide();
			$('#questionnaire-home').fadeOut(300, function(){
				$('#question').fadeIn(300);
			});
		}
	});

	// Start countdown timer for the user to answer
	socket.on('start-countdown', function(data){
		$('#question ul.reponses a.poss-a .poss-cont').text(data.responses[0].value);
		$('#question ul.reponses a.poss-b .poss-cont').text(data.responses[1].value);
		$('#question ul.reponses a.poss-c .poss-cont').text(data.responses[2].value);
		$('#question ul.reponses a.poss-d .poss-cont').text(data.responses[3].value);

		$('#question ul.reponses a.poss').removeClass('disabled');

		start_time = new Date().getTime();
		counter_run = true;
		timer = setInterval(function(){
	    	counter = counter_max_current-((new Date().getTime() - start_time)/1000).toFixed(1);
	    	updateCounterDisplay();
	    	// counter=counter-0.1;
	    	if(counter<3) $('.chart').addClass('red');
	    	if(counter<0){
	    		counter = 0;
	    		updateCounterDisplay();
	    		counter_run = false;
	    		$('#question ul.reponses a.poss').addClass('disabled');
	    		clearInterval(timer);
	    	}
    	}, 100);
	});

	// End of questionnaire
	socket.on('questionnaire-termine', function(data){
		$('#loader').hide();
		$('#questionnaire-home').hide();
		$('#question').hide();
		$('#modal-notif').hide();
		$('#announce').hide();
		$('#waiting').hide();
		$('#homepage').hide();

		$('#waiting .questionnaire-description h2').text(data.title);
		$('#question').fadeOut(300);
		$('#waiting').show();
		updateSize();
		$('#waiting').hide();
		$('#waiting').fadeIn(300);
	});

	// Show homepage again
	socket.on('homepage', function(data){
		// Show homepage
		$('#homepage').hide();
		$('#questionnaire-home').hide();
		$('#question').hide();
		$('#modal-notif').hide();
		$('#announce').hide();
		$('#loader').hide();
		$('#waiting').hide();
		$.each(data.users, function(i, item){
			if(item.hash == user_id){
				$('#homepage .score .points').text(item.total_points);

				if(item.available_bonus.double){
					$('#homepage .quiz-bonus ul.bonus li.double img').removeClass("disabled");
				}
				else{
				 	$('#homepage .quiz-bonus ul.bonus li.double img').addClass("disabled");
				}

				if(item.available_bonus.delay){
					$('#homepage .quiz-bonus ul.bonus li.delay img').removeClass("disabled");
				}
				else {
					$('#homepage .quiz-bonus ul.bonus li.delay img').addClass("disabled");
				}
			}
		});
		
		$('#loader').fadeOut(300, function(){
			$('#homepage').show();
			updateSize();
			$('#homepage').hide();
			$('#homepage').fadeIn(300, function(){
				socket.emit('current-state', {'state':'homepage'});
			});
		});
	});

	// Server disconnected
	socket.on('disconnect', function(){
		// update gui with online icon
		$('.header-participant .cust-right .onoffline').html('<span class="badge badge-danger"><span class="glyphicon glyphicon-remove"></span></span>');
		alert("Déconnecté du serveur !");
	});

	// Activate bonus clicked
	$('#questionnaire-home .questionnaire-bonus ul.bonus li img').click(function(){
		if($(this).attr('data-available')=="true"){
			var type = $(this).closest('li').attr('data-bonus');

			var type_txt = getBonusText(type);

			if(type_txt=="unknown"){
				alert('Erreur : Bonus inconnu !')
			}else{
				if(confirm("Activer le bonus "+type_txt+" ?")){
					socket.emit('activate-bonus',{type:type});
				}
			}
		}
	});

	// Response clicked
	$('#question ul.reponses a.poss').click(function(){
		if(counter_run){
			var exec_time = ((new Date().getTime() - start_time)/1000).toFixed(2);
			var response  = $(this).attr('data-rep');
			$(this).addClass('active');
			counter_run = false;
			$('#question ul.reponses a.poss').addClass('disabled');
			clearInterval(timer);
			socket.emit('user-response',{"value":response,"time":exec_time});
			// alert('Reply response '+$(this).attr('data-rep')+' in '+exec_time+'seconds');
		}
	});
});
