process.stdout.write('\033c');
console.log("\n**************\n*  NodeQuiz  *\n**************\n")
// Initialize variables and requires
var twig = require('twig'),
	express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	fs = require('fs'),
	crypto = require('crypto'),
	async = require('async'),
	session = require("express-session")({secret: "N0d3Qu1z",resave: true,saveUninitialized: true}),
	sharedsession = require("express-socket.io-session");

// Socket clients counter
var clients = 0;
var fn = {"quizzes_dir":'./quizzes/',"quiz_config":'config.json',"quiz_content":'quiz.json',"quiz_users":'users.json'};
var quiz_config, quiz_content;
var quiz_users = [];
var quiz_questions = [];
var admin_socket = 'undefined';
var screen_socket = 'undefined';
var backup_path = require('path').resolve(__dirname, 'backup.json');
var root_url = 'http://127.0.0.1';
var server_id = 'http://127.0.0.1';
// var server_id = 'http://quiz.lesscouts.be';
// var root_url = 'http://quiz.lesscouts.be';
var userslist_root_url = 'http://quiz.lesscouts.be';

var current_step = 'start';
var current_quiz = 0;
var last_quiz = 0;
var last_data;
var current_bonus = {"delay":[], "double":[]};
var current_question_key = 0;
var done_questionnaires = {};

var convert_answer2key = {"A":0, "B":1, "C":2, "D":3};

var answers_saver = {};

var points_values = {'standard':3,'contrelamontre':5};
var answers_resultatsToAdd = {};

Object.prototype.getKeyByValue = function( value ) {
    for( var prop in this ) {
        if( this.hasOwnProperty( prop ) ) {
             if( this[ prop ] === value )
                 return prop;
        }
    }
}

function hasBonus(user, btype){
	var result = false;
	async.forEach(current_bonus[btype], function(item, callback){
		if(item == user){
			result = true;
		}
		callback();
	},function(err){
	});
	return result;
}

function usedBonusQuestionnaire(key){
	var result = {};
	var temp = [0];
	async.forEach(temp, function(item){
		if(item == 0){
			quiz_questions['q'+key].questions.forEach(function(el, q_nb, arr){
				quiz_users.forEach(function(element, index, array){
					if(typeof answers_saver['q'+key]['q'+q_nb]['u-'+element.hash] == 'undefined')
						return;
					var t = answers_saver['q'+key]['q'+q_nb]['u-'+element.hash]; 
					if(typeof result['u-'+element.hash] == 'undefined')
						result['u-'+element.hash] = {hash:element.hash, delay:false, double:false};
					if(t.bonus.double==true){
						result['u-'+element.hash].double = true;
					}
					if(t.bonus.delay==true){
						result['u-'+element.hash].delay = true;
					}
				});
			});
		}
	},function(err){
	});
	return result;
}

var computeAndAddPoints = function(quiz_key, callback){
	var temp = [0, 1, 2];
	var time_order = [];
	async.forEach(temp, function(item){
		if(item == 0){
			quiz_questions['q'+quiz_key].questions.forEach(function(el, q_nb, arr){
				time_order['q'+q_nb] = [];
				quiz_users.forEach(function(element, index, array){
					if(typeof answers_saver['q'+quiz_key]['q'+q_nb]['u-'+element.hash] == 'undefined')
						return;
					var temp = answers_saver['q'+quiz_key]['q'+q_nb]['u-'+element.hash];
					if(temp.type == 'Contre la montre' && temp.correct == true)
						time_order['q'+q_nb].push(temp.time);
				});
			});
		}
		if(item == 1){
			console.log(time_order);
			quiz_questions['q'+quiz_key].questions.forEach(function(el, q_nb, arr){
				time_order['q'+q_nb].sort();
				quiz_users.forEach(function(element, index, array){
					if(typeof answers_saver['q'+quiz_key]['q'+q_nb]['u-'+element.hash] == 'undefined')
						return;
					var temp = answers_saver['q'+quiz_key]['q'+q_nb]['u-'+element.hash];
					var points = 0;

					if(temp.type=='Standard' || temp.type=='Audio'){
						if(temp.correct == true)
							points = points_values.standard;
					}else if(temp.type == 'Contre la montre'){
						if(temp.correct == true){
							points = 5-time_order['q'+q_nb].getKeyByValue(temp.time);
							if(points < 1) points = 1;
						}
					}else if(temp.type == 'Pour du beurre'){
						// On ne gagne pas de points !
						points = 0;
					}

					if(temp.bonus.double==true){
						points = points*2;
					}
					element.total_points += points;

					// Update bonus-available state of user
					if(temp.bonus.double == true){
						element.available_bonus.double = false;
					}
					if(temp.bonus.delay == true){
						element.available_bonus.delay = false;
					}
					// console.log('Q'+q_nb+' : "'+element.name+'" wins '+points+'pts. Tot='+element.total_points+'pts.');
				});
			});
		}else{
			callback();
		}
	});
}

var computePointsQuest = function(quiz_key, callback){
	var temp = [0, 1, 2];
	var time_order = [];
	answers_resultatsToAdd = {};
	async.forEach(temp, function(item){
		if(item == 0){
			quiz_questions['q'+quiz_key].questions.forEach(function(el, q_nb, arr){
				time_order['q'+q_nb] = [];
				quiz_users.forEach(function(element, index, array){
					if(typeof answers_saver['q'+quiz_key]['q'+q_nb]['u-'+element.hash] == 'undefined')
						return;
					var temp = answers_saver['q'+quiz_key]['q'+q_nb]['u-'+element.hash];
					if(temp.type == 'Contre la montre' && temp.correct == true)
						time_order['q'+q_nb].push(temp.time);
				});
			});
		}else if(item == 1){
			quiz_questions['q'+quiz_key].questions.forEach(function(el, q_nb, arr){
				time_order['q'+q_nb].sort();
				quiz_users.forEach(function(element, index, array){
					if(typeof answers_saver['q'+quiz_key]['q'+q_nb]['u-'+element.hash] == 'undefined')
						return;
					var temp = answers_saver['q'+quiz_key]['q'+q_nb]['u-'+element.hash];
					var points = 0;

					if(temp.type=='Standard' || temp.type=='Audio'){
						if(temp.correct == true)
							points = points_values.standard;
					}else if(temp.type == 'Contre la montre'){
						if(temp.correct == true){
							points = 5-time_order['q'+q_nb].getKeyByValue(temp.time);
							if(points < 1) points = 1;
						}
					}else if(temp.type == 'Pour du beurre'){
						// On ne gagne pas de points !
						points = 0;
					}

					if(temp.bonus.double==true){
						points = points*2;
					}
					if(typeof answers_resultatsToAdd['u-'+element.hash] == 'undefined')
						answers_resultatsToAdd['u-'+element.hash] = 0;
					
					answers_resultatsToAdd['u-'+element.hash] += points;
				});
			});
		}else{
			// console.log(answers_resultatsToAdd);
			callback();
		}
	});
}

var backup2File= function(callback){
	fs.writeFile(backup_path, JSON.stringify(answers_saver), function (err) {
	  if (err) throw err;
	  console.log('\n*** Backup saved !***');
	  callback();
	});
}

// Read and load quizz and questions
fs.access(fn.quizzes_dir+fn.quiz_config, fs.R_OK, function (err) {
	if(err){
		console.error('No access to file "'+fn.quizzes_dir+fn.quiz_config+'"');
  		process.exit(1);
	}else{
		quiz_config = require(fn.quizzes_dir+fn.quiz_config);
		if(typeof quiz_config.quiz == 'undefined' || typeof quiz_config.theme == 'undefined'){
			console.error("Fichier de configuration incomplet !");
			process.exit(1);
		}
		console.log('Dossier quiz actif :\t"'+quiz_config.quiz+'"');
		console.log('Theme du quiz :\t\t"'+quiz_config.theme+'"');

		fs.access(fn.quizzes_dir+quiz_config.quiz+'/'+fn.quiz_content, fs.R_OK, function (err) {
			if(err){
				console.error('No access to file "'+fn.quizzes_dir+quiz_config.quiz+'/'+fn.quiz_content+'"');
		  		process.exit(1);
			}else{
				quiz_content = require(fn.quizzes_dir+quiz_config.quiz+'/'+fn.quiz_content);
				if(typeof quiz_content.name == 'undefined'){
					console.error("Fichier de configuration du quizz incomplet !");
					process.exit(1);
				}
				console.log('Quiz actif :\t\t"'+quiz_content.name+'"');
				console.log('Auteur :\t\t"'+quiz_content.author+'"');

				console.log('\nQuestionaires :')
				quiz_content.quizzes.forEach(function(element, index, array){
					fs.access(fn.quizzes_dir+quiz_config.quiz+'/'+quiz_content.quizzes[index].path, fs.R_OK, function (err) {
						if(err){
							console.log((index+1)+'. '+element.name+' (Inaccessible !)');
						}else{
							quiz_questions['q'+index] = require(fn.quizzes_dir+quiz_config.quiz+'/'+element.path);
							console.log((index+1)+'. '+element.name+((element.active)?' ('+quiz_questions['q'+index].questions.length+' questions)':' (Désactivé !)'));
							answers_saver['q'+index] = {};
						}
					});
				});
			}
		});
	}
});

// Read users list and generate hash
fs.access(fn.quizzes_dir+fn.quiz_users, fs.R_OK, function (err) {
	if(err){
		console.error('No access to file "'+fn.quizzes_dir+fn.quiz_users+'"');
		process.exit(1);
	}else{
		var u = require(fn.quizzes_dir+fn.quiz_users);
		u = u.users;
		u.forEach(function(element, index, array){
			var shasum = crypto.createHash('sha1');
			shasum.update(element.name);
			var data = shasum.digest('hex');
			var tot_pts = 0;
			if(element.role!='guest') tot_pts = -1;
			quiz_users.push({
				'name':element.name,
				'avatar':element.avatar,
				'hash':data.substring(0,3),
				'role':element.role,
				'disabled':(element.disabled==true),
				'connected':false, 
				'available_bonus':{'double':true,'delay':true},
				'total_points':tot_pts
			});
			if(element.role == 'admin'){
				console.log('Admin : \t\t"'+element.name+'" => '+data.substring(0,3));
			}
			//console.log(quiz_users);
		});
	}
});

// Connection event
io.use(sharedsession(session, {autoSave:true}));
io.on('connection', function (socket) {
	var sess = socket.handshake.session;
	sess.user = {};
	sess.user.valid = false;
	sess.user.name = "";
	sess.user.avatar = "";
	sess.user.hash = "";
	sess.user.role = "";
	sess.user.index = -1;

	// Logging the connection
    console.log('\nA new client connected ! Total = ' + (++clients) + ' clients');

    // When the client disconnects we notify it
	socket.on("disconnect", function() {
		console.log('\nA client disconnected ! Total = ' + (--clients) + ' clients');
		if(sess.user.valid == true){
			quiz_users[sess.user.index].connected = false;
		}
		if(socket.id == admin_socket.id){
			admin_socket = 'undefined';
		}else if(socket.id == screen_socket.id){
			screen_socket = 'undefined';
		}else{
			if(admin_socket != 'undefined')
				admin_socket.emit('user-disconnected',{hash:sess.user.hash});
		}
		// sess.destroy(function(err){
		// 	console.log('Unable to destroy session !');
		// })
	});

	socket.on('iamadmin', function(){
		if(admin_socket == 'undefined'){
			admin_socket = socket;
			console.log('\nYEAH ! We got an admin !');
			socket.emit('youreadmin',{});
		}else{
			socket.emit('second-admin',{});
			console.log('\n !! A second user tried to be admin !');
			socket.disconnect();
		}
	})

	// New user
	socket.on("new_user", function(data){
		async.forEach(quiz_users, function(item, callback){
			if(item.hash == data.uid){
				// If login not used yet OR if i'am the user using the login
				if(item.connected == false || sess.user.valid == true){
					sess.user.valid = true;
					sess.user.name = item.name;
					sess.user.hash = data.uid;
					sess.user.avatar = item.avatar;
					sess.user.role = item.role;
					item.connected = true;
					sess.user.index = quiz_users.indexOf(item);
					console.log('User = ' + item.name);
					socket.emit('user_ok',{name:item.name, avatar:item.avatar, quiz_name:quiz_content.name, quiz_image:quiz_content.image, available_bonus:item.available_bonus, total_points:item.total_points});
					if(admin_socket != 'undefined')
						admin_socket.emit('user-connected',{hash:sess.user.hash});
					if(sess.user.role == 'screen'){
						screen_socket = socket;
					}
				}else{
					sess.user.valid = false;
					sess.user.name = item.name;
					sess.user.hash = data.uid;
					sess.user.avatar = item.avatar;
					sess.user.role = item.role;
					console.log('User "'+item.name+'" tried to open a second session');
					socket.emit('user_exist',{name:item.name, avatar:item.avatar});
					socket.disconnect();
				}
			}
			callback();
		},function(err){
			if(sess.user.valid == false && sess.user.name == ""){
				console.log('Unknown user trying to connect with id "'+data.uid+'"');
				socket.emit('user_unknown');
				socket.disconnect();
			}
		});
	});

	// Client/admin send us its current state to be updated if needed
	socket.on('current-state', function(data){
		// FOR ADMIN
		if(socket.id == admin_socket.id){
			if(current_step=='start-questionnaire'){
				socket.emit("start-questionnaire", {questions:quiz_questions['q'+current_quiz],title:quiz_content.quizzes[current_quiz].name,type:quiz_content.quizzes[current_quiz].type,key:current_quiz});
				current_bonus.delay.forEach(function(element, index, array){
					quiz_users.forEach(function(element2, index2, array2){
						if(element2.hash == element){
							socket.emit("activate-bonus", {name:element2.name, hash:element,btype:'delay'});
						}
					});
				});
				current_bonus.double.forEach(function(element, index, array){
					quiz_users.forEach(function(element2, index2, array2){
						if(element2.hash == element){
							socket.emit("activate-bonus", {name:element2.name, hash:element,btype:'double'});
						}
					});
				});
			}
		}
		// FOR GUESTS
		else{
			if(data.state != current_step){
				if(current_step=='start-questionnaire'){
					socket.emit('start-questionnaire', last_data);
				}else if(current_step=='start'){
					// nothing to do
				}else if(current_step=='idle'){
					socket.emit('questionnaire-termine', {title:quiz_content.quizzes[last_quiz].name, key:last_quiz});
				}else{
					console.log('Unknown current state : '+current_step);
				}
			}
		}
	});

	// User asks to restore current questionnaire bonus
	socket.on('restore-active-bonus', function(){
		var result = {'delay':false, 'double':false};
		current_bonus.delay.forEach(function(element, index, array){
			if(element ==  sess.user.hash)
				result.delay=true;
		});
		current_bonus.double.forEach(function(element, index, array){
			if(element ==  sess.user.hash)
				result.double=true;
		});
		socket.emit('restore-active-bonus',result);
	});
	
	// Start questionnaire
	socket.on("start-questionnaire", function(data){
		console.log('\nLaunching questionnaire "'+quiz_content.quizzes[data.key].name+'"');
		current_quiz = data.key
		current_bonus = {"delay":[], "double":[]};

		socket.emit("start-questionnaire", {questions:quiz_questions['q'+data.key],title:quiz_content.quizzes[data.key].name,type:quiz_content.quizzes[current_quiz].type,key:data.key});

		var restr_users = [];
		quiz_users.forEach(function(element, index, array){
			restr_users.push({
				'hash':element.hash,
				'available_bonus':element.available_bonus
			});
		});

		var data = {
			title:quiz_content.quizzes[data.key].name,
			type:quiz_content.quizzes[data.key].type,
			nb:quiz_questions['q'+data.key].questions.length,
			restr_users:restr_users
		};
		socket.broadcast.emit('start-questionnaire',data);

		current_step = 'start-questionnaire';
		last_data = data;
	});

	// Start correction of questionnaire
	socket.on("correct-questionnaire", function(data){
		var restr_users = [];
		quiz_users.forEach(function(element, index, array){
			restr_users.push({
				'hash':element.hash,
				'name':element.name,
				'avatar':element.avatar,
				'bonus_used':'unknown'
			});
		});
		console.log('\nLaunching correction of questionnaire"'+quiz_content.quizzes[data.key].name+'"');
		socket.emit("correct-questionnaire", {
			questions:quiz_questions['q'+data.key],
			title:quiz_content.quizzes[data.key].name,
			type:quiz_content.quizzes[data.key].type,
			key:data.key,
			answers:answers_saver['q'+data.key],
			users:restr_users
		});
		if(screen_socket != 'undefined'){
			screen_socket.emit("correct-questionnaire", {
				questions:quiz_questions['q'+data.key],
				title:quiz_content.quizzes[data.key].name,
				key:data.key,
				answers:answers_saver['q'+data.key], 
				users:restr_users
			});
		}else{
			console.log('screen_socket undefined !');
		}
	});

	// Show next question of questionnaire
	socket.on('next-question', function(data){
		current_question_key = data.key;
		answers_saver['q'+current_quiz]['q'+current_question_key] = {};
		console.log('\n -> Show question [key='+data.key+'] : "'+quiz_questions['q'+current_quiz].questions[data.key].question+'"');

		var question_data = {question:quiz_questions['q'+current_quiz].questions[data.key].question, key:data.key};
		socket.broadcast.emit('show-question', question_data);
	});

	// Show next correcting question
	socket.on('next-correcting-question', function(data){
		if(screen_socket != 'undefined'){
			screen_socket.emit('next-correcting-question', {key:data.key});
		}
	})

	// Reveal correct answer
	socket.on('reveal-answer', function(data){
		if(screen_socket != 'undefined'){
			screen_socket.emit('reveal-answer', {key:data.key});
		}
	});

	// Show possibilities for current question
	socket.on('show-possibilities', function(data){
		var responses_data = {responses:quiz_questions['q'+current_quiz].questions[data.key].responses};
		if(screen_socket != 'undefined'){
			screen_socket.emit('show-possibilities', responses_data);
		}
	});

	// Start countdown for current question
	socket.on('start-countdown', function(data){
		console.log(' => Start countdown');

		var responses_data = {responses:quiz_questions['q'+current_quiz].questions[data.key].responses};
		socket.broadcast.emit('start-countdown', responses_data);
		socket.emit('start-countdown',{});
	});

	// User activates bonus
	socket.on("activate-bonus", function(data){
		var btype = data.type;
		quiz_users.forEach(function(element, index, array){
			if(element.hash==sess.user.hash){
				// console.log(quiz_users[index].available_bonus);
				if(quiz_users[index].available_bonus[btype] == true){
					console.log('\n"'+sess.user.name + '"" activated a bonus : ' + data.type);
					quiz_users[index].available_bonus[btype] = false;
					current_bonus[btype].push(sess.user.hash);
					socket.emit('activate-bonus', {btype:btype});
					admin_socket.emit('activate-bonus', {name:sess.user.name, hash:sess.user.hash,btype:btype});
				}else{
					socket.emit('bonus-refused', btype);
					console.log('\n"'+sess.user.name + '"" tried to activate an used bonus : ' + data.type);
				}
			}
		});
	});

	// User has sent his answer
	socket.on("user-response", function(data){
		if(admin_socket != 'undefined')
			admin_socket.emit('user-response',{
				hash:sess.user.hash, 
				avatar:sess.user.avatar, 
				name:sess.user.name, 
				answer:convert_answer2key[data.value], 
				time:data.time
			});
		console.log('* User "'+sess.user.name+'" answered "'+data.value+'" ('+convert_answer2key[data.value]+') in '+data.time+'sec');
		answers_saver['q'+current_quiz]['q'+current_question_key]['u-'+sess.user.hash] = {
			value:data.value,
			correct:(quiz_questions['q'+current_quiz].questions[current_question_key].responses[convert_answer2key[data.value]].correct==true),
			time:data.time,
			bonus:{double:hasBonus(sess.user.hash, 'double'),delay:hasBonus(sess.user.hash, 'delay')},
			type:quiz_content.quizzes[current_quiz].type
		};
	});

	// Questionnaire finished
	socket.on('questionnaire-termine', function(data){
		current_step = 'idle';
		last_quiz = data.key;
		current_quiz = 0;
		current_bonus = {"delay":[], "double":[]};
		socket.broadcast.emit('questionnaire-termine', {title:quiz_content.quizzes[last_quiz].name, key:last_quiz});

		// Save done questionnaire
		done_questionnaires[data.key] = true;

		// Compute the points
		computeAndAddPoints(last_quiz, function(){
			// Backup quiz state
			backup2File(function(){
				var restr_users = [];
				quiz_users.forEach(function(element, index, array){
					restr_users.push({
						'hash':element.hash,
						'total_points':element.total_points,
						'available_bonus':element.available_bonus
					});
				});
				socket.emit('update-user-points', restr_users);
			});
		});
	});

	// Correction terminee
	socket.on('correction-terminee', function(data){
		var restr_users = [];
		quiz_users.forEach(function(element, index, array){
			restr_users.push({
				'hash':element.hash,
				'total_points':element.total_points,
				'available_bonus':element.available_bonus
			});
		});
		current_step = 'start';
		current_quiz = 0;
		current_bonus = {"delay":[], "double":[]};
		socket.broadcast.emit('homepage', {users:restr_users});
	});

	// Restore backup
	socket.on('restore-backup', function(){
		console.log('\n*** BACKUP RESTORATION REQUESTED ***');
		fs.access(backup_path, fs.W_OK, function (err) {
			if(err){
				console.error('No access to file "'+backup_path+'"');
				socket.emit('restore-backup',{result:false});
			}else{
				answers_saver = require(backup_path);
				quiz_users.forEach(function(element, index, array){
					element.total_points = 0;
				});
				quiz_content.quizzes.forEach(function(element, index, array){
					if(Object.keys(answers_saver['q'+index]).length>0){
						done_questionnaires[index] = true;
						computeAndAddPoints(index, function(){});
					}
				});
				console.log('*** BACKUP RESTORED ***');
				socket.emit('restore-backup',{result:true});
			}
		});
	});

	// Show resultats of questionnaire
	socket.on('resultats-questionnaire', function(data){
		console.log('resultats-questionnaire');
		if(screen_socket != 'undefined'){
			var restr_users = [];
			quiz_users.forEach(function(element, index, array){
				restr_users.push({
					'hash':element.hash,
					'name':element.name,
					'avatar':element.avatar,
					'total_points':element.total_points
				});
			});
			var bonus = usedBonusQuestionnaire(data.key);
			computePointsQuest(data.key, function(){
				screen_socket.emit('resultats-questionnaire', {
					title:quiz_content.quizzes[data.key].name,
					users:restr_users, 
					points:answers_resultatsToAdd,
					bonus:bonus
				});
			});
		}
	});

	// Show resultats of questionnaire
	socket.on('resultats-general-questionnaire', function(data){
		console.log('resultats-general-questionnaire');
		if(screen_socket != 'undefined'){
			var restr_users = [];
			quiz_users.forEach(function(element, index, array){
				restr_users.push({
					'hash':element.hash,
					'name':element.name,
					'avatar':element.avatar,
					'total_points':element.total_points,
					'available_bonus':element.available_bonus
				});
			});
			computePointsQuest(data.key, function(){
				screen_socket.emit('resultats-general-questionnaire', {
					title:quiz_content.quizzes[data.key].name,
					users:restr_users, 
					points:answers_resultatsToAdd});
			});
		}
	});

	socket.on('show-homepage', function(){
		if(screen_socket != 'undefined'){
			screen_socket.emit('show-homepage', {});
		}
	});
});


// HTTP server configuration
app.use(express.static(__dirname + '/public'))  // /public directory contains static files (images, css, js,...)
.use(session)
// Routes
.get('/', function(req, res) {
    res.render('index.twig');
})
.get("/u/:id", function(req, res) {
	res.render('participant.twig',{
    	theme:quiz_config.theme,
    	user_id:req.params.id,
    	server_id:server_id
    });
})
.get("/s/:id", function(req, res) {
	res.render('screen.twig',{
    	theme:quiz_config.theme,
    	user_id:req.params.id,
    	users:quiz_users,
    	server_id:server_id
    });
})
.get('/admin/', function(req, res) {
	try {
		if(req.session.user){
			var u = req.session.user;
			if(u.role == "admin" && u.valid == true){
				res.render('admin.twig',{
					theme:quiz_config.theme,
			    	users:quiz_users,
			    	quiz_content:quiz_content,
			    	quiz_questions:quiz_questions,
			    	done_questionnaires:done_questionnaires,
			    	root:root_url,
			    	server_id:server_id
			    });
			}else{
				//res.redirect('/');
				res.status(401).send('Unauthorized')
			}
		}
	}catch(err){
		console.log(err);
		//res.redirect('/');
		res.status(401).send('Unauthorized (after error)')
	}
})
.get('/userslist/', function(req, res) {
	res.render('userslist.twig',{
		users:quiz_users,
		quiz_content:quiz_content,
		root:userslist_root_url
	});
})

// Routing error => 404
.use(function(req, res, next){
	res.redirect('/');
});

// Starting the http server
server.listen(80);