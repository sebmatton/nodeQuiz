INSTALLATION & CONFIGURATION
****************************
- Installer node.js (dernière version, https://nodejs.org/en/)
- cd [quizz directory] et taper "npm install" puis "npm update"
- configurer un access point wifi
	* serveur dhcp actif, range 10.0.0.x / 255.255.255.0 (attribution d'ip entre 100 et 254)
	* serveur dns à utiliser par les clients : 10.0.0.10
- configurer le pc connecté à l'access point en ip statique 10.0.0.10 / 255.255.255.0

Configuration DNS :
-------------------
- Dans le dossier "maradns", ouvrir mararc et remplacer le nom de domaine "lesscouts.be." par le nom de domaine à utiliser pour le quiz, lier au fichier de configuration ("brevets.txt" ou en créer un nouveau sur base de "brevets.txt")

Configuration de l'application :
--------------------------------
- Editer le fichier "server.js" :
	* modifier les variables "root_url" et "server_id" par le nom de domaine de l'application
- Editer le fichier "./quizzes/users.json"
	* ajouter/supprimer les utilisateurs souhaités
	* adapter le lien de l'avatar à utiliser
	* définir le role de chaque utilisateur ("guest"=joueur ; "admin"=administrateur ; "screen"=affichage projecteur/écran)
- Editer le fichier "./quizzes/config.json"
	* "quiz" = le sous-dossier correspondant au quiz (questionnaires) à utiliser
	* "theme" = le thème à utiliser (= suffixe de la feuille de style css se trouvant dans ./public/css/style_[THEME].css et ./public/css/style_[THEME]_screen.css pour l'écran/projecteur)
- Chaque dossier de quiz se trouve dans le dossier "./quizzes/[QUIZ]"
	* Fichier "quiz.json" définit le contenu du quiz
		# configuration commune au quiz (titre, lien vers l'image du quiz,...)
		# liste des questionnaires
			- name = nom du questionnaire
			- path = fichier du questionnaire
			- type = type de questionnaire :
				* "Pour du beurre" = pas de points remportés en fin de questionnaire
				* "Standard" = 3 points par bonne réponse dans le délai imparti
				* "Contre la montre" = le plus rapide à bien répondre gagne 5 points, puis 4, 3, 2, et 1 pt pour tous les autres qui ont bien répondu mais plus lentement. 
				* "Audio" = idem standard mais des sons peuvent être joués (son lors du questionnaire + son lors de la correction)
		# contenu d'un questionnaire
			- définir la question + les 4 (TOUJOURS 4!!) réponses possibles, en décrivant la réponse correcte


UTILISATION
***********

Lancement du jeu
----------------
- Démarrer maradns en lancant "./maradns/run_maradns.bat" (= le serveur dns)
- Démarrer une console dans le dossier racine "./" et lancer la commande "node server"

Attention : le serveur dns DOIT tourner pour que l'application soit utilisable
(Alternative, définir "root_url" et "server_id" avec l'ip du pc serveur et utiliser cette ip comme domaine pour les joueurs)

Règles
------
Chaque joueur se connecte à l'application par smartphone/tablette via le point d'accès wifi, en tapant l'url lui correspondant (du type "http://sous.domaine.com/u/[hash]"). Une seule personne à la fois a le droit de se connecter à l'interface d'un joueur.

L'admin se connecte et lance les différents questionnaires. Une fois que le compte à rebours démarre, les joueurs peuvent cliquer sur une des réponses pour la valider (pas de changement possible une fois une réponse choisie), jusqu'au terme du compte à rebours. Il n'est ensuite plus possible de répondre.

Les joueurs remportent 3 points pour chaque bonne réponse, SAUF pour les questionnaires "contre la montre". Dans ce cas, le joueur le plus rapide remporte 5 points, puis le second plus rapide 4, 3, 2 et enfin 1 point pour toutes les autres bonnes réponses. Le questionnaire "pour du beurre" ne fait remporter aucun point et a juste pour but de se familiariser avec l'interface.

Chaque joueur dispose de deux bonus :
- Doubler les points
- Augmenter le délais pour répondre (temps normal = 8 secondes, temps rallongé = 12 secondes)
Le joueur peut choisir d'activer le bonus au lancement du questionnaire mais AVANT la première question.
Une fois un bonus activé, il n'est plus utilisable pour la suite du jeu.

Admin
-----
Pour se connecter à l'interface d'aministration, il faut d'abord se connecter à l'interface joueur de l'administrateur, en utilisant l'url correspondant ("http://sous.domaine.com/u/[HASH]"), de manière à ce que la session soit ouverte en admin. Le hash de l'administrateur s'affiche dans la console de lancement du programme (Info "Admin:    [ADMIN_NAME]=>[HASH]). Une fois la page correctement chargée, ouvrir l'interface d'administration via l'url "http://sous.domaine.com/admin/".

Une fois dans l'interface d'administration, il est possible de lancer les différents questionnaires, de les corriger, d'afficher les résultats du questionnaire ou le classement général.

ATTENTION : si la page d'un joueur est ouverte, il faudra recharger celle de l'administrateur pour avoir accès à la page d'administration. Si une page de joueur est ouverte sur le pc admin, il ne sera pas possible pour le joueur de se connecter car l'utilisateur sera déjà connecté.

Toutes les informations de la page admin sont actualisées en temps réel (utilisateur connecté = points en vert, sinon rouge ; points mis à jour en fin de questionnaire ; réponses validées par les utilisateurs affichées directement sur l'interface admin lorsqu'elles sont cliquées,...)

URL joueurs
-----------
Dans l'interface d'administration, l'avatar de chaque utilisateur sur la partie droite de l'écran renvoie vers l'url de chaque joueur. Il est possible de générer une liste imprimable avec qr code (avec une connexion internet) via l'url "http://sous.domaine.com/userslist/" une fois que l'application tourne.