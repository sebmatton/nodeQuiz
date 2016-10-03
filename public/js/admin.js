Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

var current_questions;
var current_index = 1;
var active_questionnaire = -1;
var counter = 8;
var counter_max = 8;
var counter_max_bonus_delay = 12;
var counter_max_current = 8;
var counter_run = false;
var timer;
var isCorrecting = false;
var users_answers;
var users;
var convert_answer2key = {"A":0, "B":1, "C":2, "D":3};

var start_time = 'undefined';


function updateCounterDisplay(){
	$('.countdown .chart').data('easyPieChart').update(counter/counter_max_current*100);
   	$('.countdown .chart .value').text(counter.toFixed(1));	
}

function updateQuestResp(){
	$('.panel-current-q .box-quest_no_btn').text(current_questions[current_index].question);
	$('.panel-current-q .rep-a-content').text(current_questions[current_index].responses[0].value);
	$('.panel-current-q .rep-b-content').text(current_questions[current_index].responses[1].value);
	$('.panel-current-q .rep-c-content').text(current_questions[current_index].responses[2].value);
	$('.panel-current-q .rep-d-content').text(current_questions[current_index].responses[3].value);
	$('.panel-current-q .box-poss .pull-right').text('');
	$('.panel-current-q .box-poss').removeClass('correct');

	for(var i = 0; i<4; i++){
		if(current_questions[current_index].responses[i].correct == true)
			$('.panel-current-q .box-poss-'+i).addClass('correct');
	}

	if(active_questionnaire_type == 'Audio'){
		$('.panel-current-q .btn-play-question').show();
		document.getElementById('question_audio').pause();
		if(!isCorrecting){
			document.getElementById('question_audio_source').src = server_id + '/sounds/'+current_questions[current_index].audio_question;
		}else{
			document.getElementById('question_audio_source').src = server_id + '/sounds/'+current_questions[current_index].audio_correct;
		}
		document.getElementById('question_audio').load();
		document.getElementById('question_audio').pause();
	}else{
		$('.panel-current-q .btn-play-question').hide();
	}

	// Only if not correcting
	if(!isCorrecting){
		updateCounterDisplay();
   		$('.action-start-countdown').removeAttr('disabled');
   		if(active_questionnaire_type == 'Contre la montre'){
   			$('.panel-current-q .action-show-possibilities').attr('disabled','disabled');
   		}else{
   			$('.panel-current-q .action-show-possibilities').removeAttr('disabled');
   		}
	}
	// Only if correcting
	else {
		users.forEach(function(element, index, array){
			if(typeof users_answers['q'+current_index]['u-'+element.hash] != 'undefined'){
				var u = users_answers['q'+current_index]['u-'+element.hash];
				$('.panel-current-q .box-poss-'+convert_answer2key[u.value]+' .pull-right').append('<div class="thumbnail user" data-toggle="tooltip" data-placement="top" title="'+element.name+' en '+u.time+' sec."><img src="'+element.avatar+'" alt="" class="user" ></div>');
			}
		});
		$('[data-toggle="tooltip"]').tooltip();
	}
}

$(function () {
    $('.countdown .chart').easyPieChart({
        animate: 200,
        trackColor: "#ddd",
        lineWidth: 3,
        barColor: "#888",
        size: 50,
        scaleColor: false
    });
    $('.countdown').hide();

	// Realtime app
	var socket = io(server_id);

	$('ul.list-questionnaires li button.action-start').removeAttr('disabled');
	$('ul.list-questionnaires li button.action-correct').attr("disabled", "disabled");
	$('ul.list-questionnaires li button.action-results').attr("disabled", "disabled");
	$('ul.list-questionnaires li button.action-results-general').attr("disabled", "disabled");
	$('ul.list-questionnaires li.disabled button').attr("disabled", "disabled");

	$('ul.list-questionnaires li.qdone button.action-start').attr('disabled', 'disabled');
	$('ul.list-questionnaires li.qdone button.action-correct').removeAttr('disabled');
	$('ul.list-questionnaires li.qdone button.action-results').removeAttr('disabled');
	$('ul.list-questionnaires li.qdone button.action-results-general').removeAttr('disabled');

	// Youpie, i'am conneted
	socket.on('connect', function(){
		// update gui with online icon
		$('.navbar .onoffline').html('En ligne <span class="badge badge-success"><span class="glyphicon glyphicon-ok"></span></span>');
		socket.emit('iamadmin');
	});

	// A user connected
	socket.on('user-connected', function(data){
		$('ul.users-list li.h_'+data.hash+' span.badge').removeClass('badge-danger').addClass('badge-success');
	});

	// A user disconnected
	socket.on('user-disconnected', function(data){
		$('ul.users-list li.h_'+data.hash+' span.badge').removeClass('badge-success').addClass('badge-danger');
	});

	// Server is disconnected
	socket.on('disconnect', function(){
		// update gui with online icon
		$('.navbar .onoffline').html('Hors ligne <span class="badge badge-danger"><span class="glyphicon glyphicon-remove"></span></span>');
		alert("Déconnecté du serveur !");
	});

	// If an other admin is already connected
	socket.on('second-admin', function(){
		alert('An admin page is already opened !');
		$('#admin').fadeOut(300);
	});

	// Youpie, i'am the admin for this quiz !
	socket.on('youreadmin', function(){
		socket.emit('current-state', {'state':'homepage'});
	});

	// Questionnaire can be started
	socket.on('start-questionnaire', function(data){
		isCorrecting = false;
		current_questions = data.questions.questions;
		current_index = 0;
		active_questionnaire = data.key;
		active_questionnaire_type = data.type;
		counter_max_current = counter_max;

		$('ul.list-questionnaires li[data-questionnaire='+data.key+'] button.action-start').attr("disabled", "disabled");
		$('ul.list-questionnaires li[data-questionnaire='+data.key+'] button.action-stop').show().removeAttr('disabled');
		$('ul.list-questionnaires li').removeClass('qactive');
		$('ul.list-questionnaires li[data-questionnaire='+data.key+']').addClass('qactive');
		if($('.panel-current-q').is(':visible')){
			$('.panel-current-q').hide();
		}

		$('ul.bonus span.users-double').text('Personne n\'a activé ce bonus').addClass('nobody');
		$('ul.bonus span.users-delay').text('Personne n\'a activé ce bonus').addClass('nobody');

		$('.panel-current-q .questionnaire-title').text(data.title);
		$('.panel-current-q .nb').text(current_index+1);
		$('.panel-current-q .tot').text(Object.size(current_questions));
		$('.quiz-show-question').hide();
		$('.panel-current-q .start-quiz').show();
		$('.panel-current-q .action-reveal-correct').hide();
		$('.panel-current-q .action-start-countdown').show();
		$('.panel-current-q .quiz-show-question').hide();
		$('.countdown').hide();
		$('.panel-current-q').show(500);
	});

	// A user activated a bonus
	socket.on('activate-bonus', function(data){
		console.log('bonus');
		document.getElementById('sound').pause();
		document.getElementById('sound_source').src = server_id + '/sounds/jingle-bonus.mp3';
		document.getElementById('sound').load();
		document.getElementById('sound').play();

		if($('ul.bonus span.users-'+data.btype).hasClass('nobody')){

			$('ul.bonus span.users-'+data.btype).removeClass('nobody');
			$('ul.bonus span.users-'+data.btype).html('<span class="label label-primary">'+data.name+'</span>');
			if(data.btype == 'delay'){
				counter = counter_max_bonus_delay;
				counter_max_current = counter_max_bonus_delay;
				updateCounterDisplay();
			}
		}else{
			$('ul.bonus span.users-'+data.btype).append('<span class="label label-primary">'+data.name+'</span>');
		}
	});

	// Countdown has started
	socket.on('start-countdown', function(data){
		start_time = new Date().getTime();
		counter_run = true;
		
		document.getElementById('countdown_sound').pause();
		document.getElementById('countdown_sound_source').src = server_id + '/sounds/jingle-countdown.mp3?rand';
		document.getElementById('countdown_sound').load();
		document.getElementById('countdown_sound').play();

		timer = setInterval(function(){
			counter = counter_max_current-((new Date().getTime() - start_time)/1000).toFixed(1);
    		updateCounterDisplay();

	    	if(counter<3) $('.countdown .chart').addClass('red');
	    	if(counter<0){
	    		counter = 0;
	    		updateCounterDisplay();
	    		counter_run = false;

	    		clearInterval(timer);
	    	}
    	}, 100);
	});

	// User has sent his answer
	socket.on('user-response', function(data){
		$('.panel-current-q .box-poss-'+data.answer+' .pull-right').append('<div class="thumbnail user" data-toggle="tooltip" data-placement="top" title="'+data.name+' en '+data.time+' sec."><img src="'+data.avatar+'" alt="" class="user" ></div>');
		$('[data-toggle="tooltip"]').tooltip();
	});

	// Backup restoration proceded by server
	socket.on('restore-backup', function(data){
		if(data.result){
			// alert('Restauration réussie !');
		}else{
			alert('Restauration échouée !');
		}
		location.reload();
	});

	// Receive new updated points
	socket.on('update-user-points', function(data){
		data.forEach(function(element, index, array){
			// console.log(element.available_bonus);
			if(element.available_bonus.delay)
				$('ul.users-list li.h_'+element.hash+' img.bonus-delay').removeClass('disabled');
			else
				$('ul.users-list li.h_'+element.hash+' img.bonus-delay').addClass('disabled');
			if(element.available_bonus.double)
				$('ul.users-list li.h_'+element.hash+' img.bonus-double').removeClass('disabled');
			else
				$('ul.users-list li.h_'+element.hash+' img.bonus-double').addClass('disabled');

			if(element.total_points>=0){
				$('ul.users-list li.h_'+element.hash+' span.badge').text(element.total_points+' pts.');
				$('ul.users-list li.h_'+element.hash).attr('data-user-points',element.total_points);
			}else{
				$('ul.users-list li.h_'+element.hash+' span.badge').text('-');
			}
			$('ul.users-list').mixItUp('sort', 'user-points:desc');
		});
	});

	// Start correction of questionnaire
	socket.on('correct-questionnaire', function(data){
		isCorrecting = true;
		current_questions = data.questions.questions;
		users_answers = data.answers;
		current_index = 0;
		active_questionnaire = data.key;
		active_questionnaire_type = data.type;
		users = data.users;

		if($('.panel-current-q').is(':visible')){
			$('.panel-current-q').hide();
		}
		
		$('ul.bonus span.users-double').text('Personne n\'a activé ce bonus').addClass('nobody');
		$('ul.bonus span.users-delay').text('Personne n\'a activé ce bonus').addClass('nobody');

		$('.panel-current-q .questionnaire-title').text(data.title);
		$('.panel-current-q .nb').text(current_index+1);
		$('.panel-current-q .tot').text(Object.size(current_questions));
		$('.quiz-show-question').show();
		$('.panel-current-q .start-quiz').hide();
		// $('.panel-current-q .action-start-countdown').attr('disabled','disabled');
		$('.panel-current-q .action-reveal-correct').show();
		$('.panel-current-q .action-start-countdown').hide();
		$('.panel-current-q .quiz-show-question').show();
		$('.countdown').hide();
		$('.action-last-question').hide();
		$('.action-next-question').show();
		updateQuestResp();
		socket.emit('correct-next-question', {key:current_index});

		// update active bonus list
		users.forEach(function(element, index, array){
			element.bonus_used = [];
			element.bonus_used['double'] = false;
			element.bonus_used['delay'] = false;

			if(element.bonus_used == 'yes')
				return
			for(var i = 0; i < Object.size(users_answers); i++){
			// users_answers.forEach(function(el2, in2, ar2){
				var el2 = users_answers['q'+i];
				// console.log(el2);
				if(typeof el2['u-'+element.hash] == 'undefined' || element.bonus_used['double'] == true || element.bonus_used['delay'] == true)
					return
				if(el2['u-'+element.hash].bonus.double == true){
					if($('ul.bonus span.users-double').hasClass('nobody')){
						$('ul.bonus span.users-double').removeClass('nobody');
						$('ul.bonus span.users-double').html('<span class="label label-primary">'+element.name+'</span>');
					}else{
						$('ul.bonus span.users-double').append('<span class="label label-primary">'+element.name+'</span>');
					}
					element.bonus_used['double'] = true;
				}
				if(el2['u-'+element.hash].bonus.delay == true){
					if($('ul.bonus span.users-delay').hasClass('nobody')){
						$('ul.bonus span.users-delay').removeClass('nobody');
						$('ul.bonus span.users-delay').html('<span class="label label-primary">'+element.name+'</span>');
					}else{
						$('ul.bonus span.users-delay').append('<span class="label label-primary">'+element.name+'</span>');
					}
					element.bonus_used['delay'] = true;
				}
			}
		});


		$('.panel-current-q').show(500);
	});

	$('[data-toggle="tooltip"]').tooltip();

	$('ul.users-list').mixItUp({
		selectors: {
			target: 'li'
		},
		layout: {
			display:'block'
		},
		animation: {
			effects: 'fade scale stagger'
		}
	}).mixItUp('sort','user-points:desc');

	// Click on load questionnaire
	$('ul.list-questionnaires button.action-start').click(function(){
		var key = $(this).closest('li').attr('data-questionnaire');
		if(active_questionnaire > -1){
			// if(!confirm("Un questionnaire est déjà en cours ! Voulez-vous continuer ?")){
				alert('Un questionnaire est déjà en cours !');
				return;
			// }
		}
		socket.emit('start-questionnaire', {key:key});
	});

	// Click on start questionnaire (show 1st question)
	$('.panel-current-q .action-start-q').click(function(){
		socket.emit('next-question', {key:current_index});
		counter = counter_max_current;
		updateQuestResp();
		$('.countdown .chart').removeClass('red');
		$('.action-last-question').hide();
		$('.action-next-question').show();
		$('.panel-current-q .start-quiz').hide(300);
		$('.panel-current-q .quiz-show-question').show(300);
		$('.countdown').fadeIn(300);
	});

	// Reveal possible answers
	$('.panel-current-q .action-show-possibilities').click(function(){
		$('.panel-current-q .action-show-possibilities').attr('disabled','disabled');
		socket.emit('show-possibilities', {key:current_index});
	});

	// Start countdown -> User will answer the question
	$('.panel-current-q .action-start-countdown').click(function(){
		$('.panel-current-q .action-start-countdown').attr('disabled','disabled');
		socket.emit('start-countdown', {key:current_index});
	});

	// Next question
	$('.panel-current-q .action-next-question').click(function(){
		current_index = current_index + 1;
		$('.panel-current-q .nb').text(current_index+1);
		if(current_index + 1 >= Object.size(current_questions)){
			$('.action-last-question').show();
			$('.action-next-question').hide();
		}

		// Only if not correcting
		if(!isCorrecting){
			clearInterval(timer);
			socket.emit('next-question', {key:current_index});
			// counter_max_current = counter_max;
			counter = counter_max_current;
			updateQuestResp();
			updateCounterDisplay();
			$('.countdown .chart').removeClass('red');
		}
		// Only if correcting
		else{
			socket.emit('next-correcting-question', {key:current_index});
			updateQuestResp();
		}
	});

	// Reveal correct answer
	$('.panel-current-q .action-reveal-correct').click(function(){
		socket.emit('reveal-answer', {key:current_index});
	});

	// Backup restoration
	$('.restore-backup').click(function(){
		if(confirm('Voulez-vous restaurer la dernière sauvegarde ? Le questionnaire en cours sera écrasé ! (Irréversible)')){
			$('#wrapper').hide(500, function(){
				$('#wrapper').html('<div class="row"><div class="col-md-12"><div class="panel panel-default"><div class="panel-heading"><span class="glyphicon glyphicon-warning-sign"></span> Restauration de sauvegarde</div><div class="panel-content"><h3>Restauration de la dernière sauvegarde en cours...</h3></div></div></div></div>')
				$('#wrapper').show(500);
			});
			socket.emit('restore-backup',{});
		}
	});

	// Finish questionnaire
	$('.panel-current-q .action-last-question').click(function(){
		if(current_index + 1 >= Object.size(current_questions)){
			// Only if not correcting
			if(!isCorrecting){
				socket.emit('questionnaire-termine', {key:active_questionnaire});
				$('ul.list-questionnaires li').removeClass('qactive');
				$('ul.list-questionnaires li[data-questionnaire='+active_questionnaire+']').addClass('qdone');
				$('ul.list-questionnaires li[data-questionnaire='+active_questionnaire+'] .action-start').attr('disabled','disabled');
				$('ul.list-questionnaires li[data-questionnaire='+active_questionnaire+'] .action-correct').removeAttr('disabled');
				$('ul.list-questionnaires li[data-questionnaire='+active_questionnaire+'] .action-results').removeAttr('disabled');
				$('ul.list-questionnaires li[data-questionnaire='+active_questionnaire+'] .action-results-general').removeAttr('disabled');
			}else{
				socket.emit('correction-terminee', {key:active_questionnaire});
			}
			$('.panel-current-q').hide(500);
			active_questionnaire = -1;
		}else{
			alert('Erreur : questionnaire non terminé !');
		}
	});

	// Start correction of questionnaire
	$('ul.list-questionnaires button.action-correct').click(function(){
		var key = $(this).closest('li').attr('data-questionnaire');
		if(active_questionnaire > -1){
			// if(!confirm("Un questionnaire est déjà en cours ! Voulez-vous continuer ?")){
				alert('Un questionnaire est déjà en cours !');
				return;
			// }
		}
		socket.emit('correct-questionnaire', {key:key});
	});

	// Show resultats of questionnaire
	$('ul.list-questionnaires button.action-results').click(function(){
		var key = $(this).closest('li').attr('data-questionnaire');
		socket.emit('resultats-questionnaire', {key:key});
	});

	// Show resultats general after questionnaire
	$('ul.list-questionnaires button.action-results-general').click(function(){
		var key = $(this).closest('li').attr('data-questionnaire');
		socket.emit('resultats-general-questionnaire', {key:key});
	});

	// Show homepage
	$('.show-homepage').click(function(){
		socket.emit('show-homepage');
	});

	$('.panel-current-q .btn-play-question a').click(function(){
		document.getElementById('question_audio').play();
	});



})