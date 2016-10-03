// Variables
var current_active_bonus = {delay:false,double:false};
var counter = 8;
var counter_max = 8;
var counter_max_bonus_delay = 12;
var counter_max_current = 8;
var counter_run = false;
var start_time = 'undefined';
var timer;

var correction_questions;
var correction_users;
var correction_answers;
var correction_key;
var convert_answer2key = {"A":0, "B":1, "C":2, "D":3};
var convert_key2answer = {0:'a', 1:'b', 2:'c', 3:'d'};

var resultats_users;

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
	if($('#loader').is(':visible')){
		$('#loader .container').css('margin-top',($(window).height()-90-$('#loader .container').height())/2);
	}
	if($('#questionnaire-home').is(':visible')){
		$('#questionnaire-home .questionnaire-description').css('margin-top',($(window).height()-90-$('#questionnaire-home').height())/4);
	}
	if($('#question').is(':visible')){
		// var reph = ($(window).height()/8-$('#question ul.reponses li a span.letter').height())/2.5;

		// $('#question ul.reponses li a').css('padding-top', reph);
		// $('#question ul.reponses li a').css('padding-bottom', reph);
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
	$('#resultats').hide();

	updateSize();

    $('.chart').easyPieChart({
        animate: 200,
        trackColor: "rgba(0,0,0,0.2)",
        lineWidth: 3,
        barColor: "#fff",
        size: 80,
        scaleColor: false
    });

    $('ul.users-list').mixItUp({
		animation: {
			enable: false,
			effects: 'fade scale stagger'
		},
		selectors: {
			target: 'li'
		},
		layout: {
			display:'block'
		}
	}).mixItUp('sort','user-points:desc');

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
		$('#homepage .quiz-description h2').text(data.quiz_name);
		$('#homepage .quiz-logo img').attr('src',data.quiz_image.url);
		homepage_ratio = data.quiz_image.ratio;

		// Show homepage
		$('#homepage').hide();
		$('#questionnaire-home').hide();
		$('#question').hide();
		$('#modal-notif').hide();
		$('#announce').hide();
		$('#waiting').hide();
		$('#resultats').hide();
		
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
		$('#questionnaire-home .questionnaire-description .title').text('Prochain quiz :');
		$('#questionnaire-home .questionnaire-description h2').text(data.title);
		$('#questionnaire-home .questionnaire-details .nombre-content').text(data.nb);
		$('#question .number .cont-tot').text(data.nb);
		$('#question .number').removeClass('centered');
		$('#questionnaire-home .questionnaire-details .type-content').text(data.type);
		$('#questionnaire-home .questionnaire-details').show();
		$('#questionnaire-home .questionnaire-bonus').show();
		$('#question ul.reponses a.poss .align-right').text('');
		$('#question .timer').show();

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
		$('#resultats').hide();
		
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

		$('#resultats').hide();
		$('#homepage').hide();
		$('#modal-notif').hide();
		$('#announce').hide();
		$('#loader').hide();
		$('#waiting').hide();
		
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

	// Reveal possibilities for current question
	socket.on('show-possibilities', function(data){
		$('#question ul.reponses a.poss .poss-cont').css('opacity', '0');
		var i = 0;
		$('#question ul.reponses a.poss-'+convert_key2answer[i]+' .poss-cont').text(data.responses[i].value);
		$('#question ul.reponses a.poss-'+convert_key2answer[i]).removeClass('disabled');
		$('#question ul.reponses a.poss-'+convert_key2answer[i]+' .poss-cont').css('opacity', '1');
		i++;
		var f = setInterval(function(){
			$('#question ul.reponses a.poss-'+convert_key2answer[i]+' .poss-cont').text(data.responses[i].value);
			$('#question ul.reponses a.poss-'+convert_key2answer[i]).removeClass('disabled');
			$('#question ul.reponses a.poss-'+convert_key2answer[i]+' .poss-cont').css('opacity', '1');
			i++;
			if(i > 3){
				clearInterval(f);
			}
		}, 1500);
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
		$('#resultats').hide();

		$('#waiting .questionnaire-description h2').text(data.title);
		$('#question').fadeOut(300);
		$('#waiting').show();
		updateSize();
		$('#waiting').hide();
		$('#waiting').fadeIn(300);
	});

	// Show resultats of questionnaire
	socket.on('resultats-questionnaire', function(data){
		var resultats_users = data.users;
		var resultats_points = data.points;
		console.log(data.bonus);
		$('#resultats h2').text(data.title);
		resultats_users.forEach(function(element, index, array){
			if(typeof resultats_points['u-'+element.hash] == 'undefined'){
				// console.log(element.name + ' wins 0 points !');
				$('#resultats ul.users-list li.h_'+element.hash+' .badge').text('+ 0 pts.');
				$('#resultats ul.users-list li.h_'+element.hash).attr('data-user-points',0);
			}else {
				// console.log(element.name + ' wins ' + resultats_points['u-'+element.hash] + ' points (tot=' + element.total_points+')');
				$('#resultats ul.users-list li.h_'+element.hash+' .badge').text('+ '+resultats_points['u-'+element.hash]+' pts.');
				$('#resultats ul.users-list li.h_'+element.hash).attr('data-user-points',resultats_points['u-'+element.hash]);
			}
			// $('#resultats ul.users-list img.bonus').addClass('hide');
			if(typeof data.bonus['u-'+element.hash] != 'undefined'){
				if(data.bonus['u-'+element.hash]['delay']==true){
					$('#resultats ul.users-list li.h_'+element.hash+' img.bonus.bonus-delay').removeClass('hide').removeClass('disabled');
				}else{
					$('#resultats ul.users-list li.h_'+element.hash+' img.bonus.bonus-delay').addClass('hide');
				}
				if(data.bonus['u-'+element.hash]['double']==true){
					$('#resultats ul.users-list li.h_'+element.hash+' img.bonus.bonus-double').removeClass('hide').removeClass('disabled');
				}else{
					$('#resultats ul.users-list li.h_'+element.hash+' img.bonus.bonus-double').addClass('hide');
				}
			}else{
				$('#resultats ul.users-list li.h_'+element.hash+' img.bonus').addClass('hide');
			}
		});
		$('#resultats ul.users-list li .badge').addClass('new');
		$('ul.users-list').mixItUp('setOptions',{animation: {enable: false}}).mixItUp('sort','user-points:desc');

		if($('#waiting').is(':visible')){
			$('#loader').hide();
			$('#questionnaire-home').hide();
			$('#question').hide();
			$('#modal-notif').hide();
			$('#announce').hide();
			$('#resultats').hide();
			$('#homepage').hide();

			$('#waiting').fadeOut(300, function(){
				$('#resultats').fadeIn(300);
			});
		}else if($('#homepage').is(':visible')){
			$('#loader').hide();
			$('#questionnaire-home').hide();
			$('#question').hide();
			$('#modal-notif').hide();
			$('#announce').hide();
			$('#waiting').hide();
			$('#resultats').hide();

			$('#homepage').fadeOut(300, function(){
				$('#resultats').fadeIn(300);
			});
		}else{
			$('#loader').hide();
			$('#questionnaire-home').hide();
			$('#question').hide();
			$('#modal-notif').hide();
			$('#announce').hide();
			$('#waiting').hide();
			$('#homepage').hide();
			$('#resultats').fadeIn(300);
		}
	});

	// Show resultats general after questionnaire
	socket.on('resultats-general-questionnaire', function(data){

		var resultats_users = data.users;
		var resultats_points = data.points;
		
		if($('#resultats').is(':visible')){
			$('#resultats').fadeOut(300);
		}

		$('#resultats h2').text('Classement Général');
		$('#resultats ul.users-list img.bonus').removeClass('disabled');
		setTimeout(function(){
			resultats_users.forEach(function(element, index, array){
				if(typeof resultats_points['u-'+element.hash] == 'undefined'){
					// console.log(element.name + ' wins 0 points !');
					$('#resultats ul.users-list li.h_'+element.hash+' .badge').text(element.total_points+' pts.');
					$('#resultats ul.users-list li.h_'+element.hash).attr('data-user-points',element.total_points);
				}else {
					// console.log(element.name + ' wins ' + resultats_points['u-'+element.hash] + ' points (tot=' + element.total_points+')');
					$('#resultats ul.users-list li.h_'+element.hash+' .badge').text((element.total_points - resultats_points['u-'+element.hash])+' pts.');
					$('#resultats ul.users-list li.h_'+element.hash).attr('data-user-points',(element.total_points - resultats_points['u-'+element.hash]));
				}
				$('#resultats ul.users-list img.bonus').removeClass('hide');
				if(element.available_bonus.delay == false) $('#resultats ul.users-list li.h_'+element.hash+' img.bonus.bonus-delay').addClass('disabled');
				if(element.available_bonus.double == false) $('#resultats ul.users-list li.h_'+element.hash+' img.bonus.bonus-double').addClass('disabled');
			});
			$('#resultats ul.users-list li .badge').removeClass('new');
			setTimeout(function(){
				$('ul.users-list').mixItUp('setOptions',{animation: {enable: false}}).mixItUp('sort','user-points:desc');
				if($('#waiting').is(':visible')){
					$('#waiting').fadeOut(300, function(){
						$('#resultats').fadeIn(300);
					});
				}else if($('#homepage').is(':visible')){
					$('#homepage').fadeOut(300, function(){
						$('#resultats').fadeIn(300);
					});
				}else{
					$('#loader').hide();
					$('#questionnaire-home').hide();
					$('#question').hide();
					$('#modal-notif').hide();
					$('#announce').hide();
					$('#waiting').hide();
					$('#homepage').hide();
					$('#resultats').fadeIn(300);
				}

				setTimeout(function(){
					resultats_users.forEach(function(element, index, array){
						$('#resultats ul.users-list li.h_'+element.hash+' .badge').text(element.total_points+' pts.');
						$('#resultats ul.users-list li.h_'+element.hash).attr('data-user-points',element.total_points);
					});
					$('ul.users-list').mixItUp('setOptions',{animation: {enable: true}}).mixItUp('sort','user-points:desc');
					$('#resultats ul.users-list li .badge').addClass('new');

				}, 4000);
			}, 200);
		},300);
		


	});

	function sortUsersTimeFunction(a, b) {
		if(typeof a.time == 'undefined') a.time = 999999;
		if(typeof b.time == 'undefined') b.time = 999999;
    	if (a.time === b.time) {
	        return 0;
	    }
	    else {
	    	// console.log(a.time + ' > ? '+b.time);
	        return (a.time < b.time) ? -1 : 1;
	    }
	}

	function updateCorrectionQuestion(){
		$('#question .question h2').text(correction_questions[correction_key].question);
		$('#question ul.reponses .poss-cont').text('');
		$('#question ul.reponses li a.poss').removeClass('disabled').removeClass('active').removeClass('false').removeClass('correct');


		$('#homepage').hide();
		$('#modal-notif').hide();
		$('#announce').hide();

		$('#question .number .cont-n').text(correction_key+1);

		$('#question ul.reponses a.poss-a .poss-cont').text(correction_questions[correction_key].responses[0].value);
		$('#question ul.reponses a.poss-b .poss-cont').text(correction_questions[correction_key].responses[1].value);
		$('#question ul.reponses a.poss-c .poss-cont').text(correction_questions[correction_key].responses[2].value);
		$('#question ul.reponses a.poss-d .poss-cont').text(correction_questions[correction_key].responses[3].value);
		$('#question ul.reponses a.poss .align-right').text('');
		// for(var i = 0; i<4; i++){
		// 	if(questions[correction_key].responses[i].correct == true)
		// 		$('#question ul.responses a.poss-'+convert_key2answer[i]).addClass('')
		// }

		// // Sort answers by time
		// correction_answers['q'+correction_key] = $.map(correction_answers['q'+correction_key], function(el, index) { return [[index],el]});
		// (correction_answers['q'+correction_key]).sort(sortUsersTimeFunction);
		// console.log(correction_answers['q'+correction_key]);

		var ordered = [];
		correction_users.forEach(function(element, index, array){
			if(typeof correction_answers['q'+correction_key]['u-'+element.hash] != 'undefined'){
				var u = correction_answers['q'+correction_key]['u-'+element.hash];
				console.log(u);
				var b = (u.bonus.delay || u.bonus.double)?' bonus':'';
				var t = u.time;
				ordered.push({
					user:element.hash,
					value:u.value.toLowerCase(),
					bonus:b,
					avatar:element.avatar,
					time:t
				});
			}
		});
		ordered.sort(sortUsersTimeFunction);
		// console.log(ordered);

		ordered.forEach(function(element, index, array){
			$('#question ul.reponses a.poss-'+element.value+' .align-right').append('<div class="thumbnail user'+element.bonus+'"><img src="'+element.avatar+'" alt="" class="user" ></div>');
		});
		
		// correction_users.forEach(function(element, index, array){

		// 	if(typeof correction_answers['q'+correction_key]['u-'+element.hash] != 'undefined'){
		// 		var u = correction_answers['q'+correction_key]['u-'+element.hash];
		// 		var b = (element.bonus_used)?' bonus':'';
		// 		var t = u.time;
		// 		$('#question ul.reponses a.poss-'+u.value.toLowerCase()+' .align-right').append('<div class="thumbnail user'+b+'"><img src="'+element.avatar+'" alt="" class="user" ></div>');
		// 	}
		// });





		$('#question ul.reponses a.poss').removeClass('disabled');
	}

	// Start correction of questionnaire
	socket.on('correct-questionnaire', function(data){
		// console.log(data.questions.questions);

		correction_questions = data.questions.questions;
		correction_answers = data.answers;
		correction_users = data.users;
		correction_key = 0;

		$('#questionnaire-home .questionnaire-description .title').html('<br />Correction du quiz :');
		$('#questionnaire-home .questionnaire-description h2').text(data.title);
		$('#questionnaire-home .questionnaire-details').hide();
		$('#questionnaire-home .questionnaire-bonus').hide();
		$('#question .top-text-bonus').hide();
		$('#question .timer').hide();
		$('#question .number').addClass('centered');
		$('#question .number .cont-tot').text(correction_questions.length);

		// Show
		$('#loader').hide();
		$('#questionnaire-home').hide();
		$('#question').hide();
		$('#modal-notif').hide();
		$('#announce').hide();
		$('#waiting').hide();
		$('#homepage').hide();
		$('#resultats').hide();

		$('#questionnaire-home').show();
		updateSize();
		$('#questionnaire-home').hide();
		
		$('#questionnaire-home').fadeIn(300, function(){
			setTimeout(function(){ 
				// After showing the title, show first question
				updateCorrectionQuestion();
				$('#question ul.reponses li a.poss').removeClass('disabled');

				if(correction_key==0){
					$('#questionnaire-home').hide();
					$('#question').show();
					updateSize();
					$('#questionnaire-home').show();
					$('#question').hide();
					$('#questionnaire-home').fadeOut(300, function(){
						$('#question').fadeIn(300);
					});
				}
			}, 3000);
		});
	});

	// Reveal correct answer
	socket.on('reveal-answer', function(data){
		for(var i = 0; i<4; i++){
			if(correction_questions[correction_key].responses[i].correct == true){
				$('#question ul.reponses a.poss-'+convert_key2answer[i]).addClass('correct');
			}
		}
	});

	// Next correction question
	socket.on('next-correcting-question', function(data){
		$('#loader').hide();
		$('#modal-notif').hide();
		$('#announce').hide();
		$('#resultats').hide();
		$('#homepage').hide();

		if($('#questionnaire-home').is(':visible')){
			$('#questionnaire-home').fadeOut(300);
		}
		correction_key = data.key;
		$('#question').fadeOut(300, function(){
			updateCorrectionQuestion();
			$('#question').fadeIn(300);
		});
	});

	// Show homepage again
	socket.on('show-homepage', function(){
		// Show homepage
		$('#homepage').hide();
		$('#questionnaire-home').hide();
		$('#question').hide();
		$('#modal-notif').hide();
		$('#announce').hide();
		$('#loader').hide();
		$('#waiting').hide();
		$('#resultats').hide();
		
		$('#homepage').show();
		updateSize();
		$('#homepage').hide();
		$('#homepage').fadeIn(300);
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
