var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');


var gameStarted = false;
var random = Math.random() > 0.5;
var players = [];

//les tableaux de valeurs d'init des nouvelles voitures
var colors = ['red', 'green', 'blue', 'pink', 'yellow'];
colors.sort(function(a, b)
{
	return random;
});
var xVoiture = [150, 290, 340, 180, 250];
xVoiture.sort(function(a, b)
{
	return random;
});
var yVoiture = [180, 290, 250, 320, 190];
yVoiture.sort(function(a, b)
{
	return random;
});
var angleVoiture = [315, 175, 225, 145, 270];
angleVoiture.sort(function(a, b)
{
	return random;
});


app.use(express.static(path.join(__dirname, 'libjs')));
console.log('dir:'+__dirname);

app.get('/', function(req, res)
{
	res.sendfile('client.html'); //sendfile dans les salles linux (sans majusucles)
});

io.on('connection', function(socket)
{
	//console.log('New client connected : ' + socket.id + ' - number of clients : '+numberClient);
	
	//on associe une nouvelle voiture au nouveau joueur
	var newPlayer = {
		x: xVoiture.shift(),
		width: 40,
		height: 26,
		y: yVoiture.shift(),
		acceleration: 1,
		orientation: angleVoiture.shift(),
		color: colors.shift(),
		pseudo: "spectator",
		socketid: socket.id,
		active: false
	};

	players.push(newPlayer);

	console.log('Number players: ' + players.length);

	//un client nous envoie "playerJoin" avec son pseudo, il devient joueur actif
	socket.on('playerJoin', function(pseudoJoueur)
	{
		//console.log('PlayerJoin: ' + pseudoJoueur+ " id: " + socket.id);
		addPseudoTo(socket.id, pseudoJoueur);

		startIfEnoughPlayers();
	});

	//debug purposes only
	socket.on('message', function(msg)
	{
		console.log('Message de ' + socket.id +' : ' + msg);
	});

	//on reçoit une commande d'un joueur, on modifie alors la position de sa voiture
	socket.on('controller', function(msg)
	{
		for (var i = 0; i < players.length; i++)
		{
			if (players[i].socketid == socket.id)
			{
				if (msg != 'down' && msg != 'up') //si l'utilisateur relache le bouton frein/accel
				{
					players[i].acceleration = 1;
				}
				if (msg == 'left')
				{
					players[i].orientation -= 8;
				}
				if (msg == 'right')
				{
					players[i].orientation += 8;
				}
				if (msg == 'down')
				{
					players[i].acceleration = 0.5;
				}
				if (msg == 'up')
				{
					players[i].acceleration = 2;
				}
			}
		}
	});

	socket.on('disconnect', function()
	{
		//console.log('Client disconnected :  ' + socket.id + ' - number of clients : '+numberClient);
		//checkActivePlayers();
		removeCar(socket.id);
		startIfEnoughPlayers();
		console.log('Number players: ' + players.length);
	});
});

http.listen(3000, function()
{
	console.log('listening on *:3000');
});

//boucle de jeu
//modifie les positions de chaque voiture à chaque tour de boucle
//et teste les collisions
setInterval(function()
{
	if (gameStarted === true)
	{
		for (var i = 0; i < players.length; i++)
		{
			//vérifie si le joueur est actif, et met à jour sa position
			if(players[i].active === true)
			{
				vitesse = 5;

				var xB = players[i].x ;
				var yB = players[i].y ;

				var xA = 325 ; //centre du canvas/cercle
				var yA = 325;
				var distance = Math.sqrt((xB - xA)*(xB - xA) + (yB - yA)*(yB - yA));

				//si on ne colisionne pas, on affiche
				if( distance <= 305) //canvassize/2
				{
					angle = players[i].orientation;
					players[i].x += (vitesse * players[i].acceleration) * Math.cos(Math.PI / 180 * angle);
					players[i].y += (vitesse * players[i].acceleration) * Math.sin(Math.PI / 180 * angle);
				}
				else
				{
					playerLost(i);
					
				}
			}
		}
	}

	//on envoie notre tableau qui contient tous les joueurs et spectateurs aux clients
	io.emit('players', players);
}, 50);

//recherche la voiture correspondant au joueur à distantSocketId
//puis l'enleve du tableau
function removeCar(distantSocketId)
{
	for (var i = 0; i < players.length; i++)
	{
		if (players[i].socketid == distantSocketId)
		{
			//remet des valeurs de début de jeu pour les prochains
			xVoiture.push(100 + (Math.random() * 300));
			yVoiture.push(100 + (Math.random() * 300));
			//réutilise les valeurs du joueur sortant
			angleVoiture.push(players[i].orientation);
			colors.push(players[i].color);

			//supprime la voiture du tableau
			players.splice(i, 1);
		}
	}
}

//recherche la voiture correspondant à l'id de la socket
//puis attribue le pseudo envoyer par le client
//puis passe en status actif
function addPseudoTo(distantSocketId, pseudo)
{
	for (var i = 0; i < players.length; i++)
	{
		if (players[i].socketid == distantSocketId)
		{
			players[i].pseudo = pseudo;
			players[i].active = true;
		}
	}
}

function getNumActivePlayers()
{
	var nbActivePlayer = 0;

	for (var i = 0; i < players.length; i++)
	{
		if (players[i].active === true)
			nbActivePlayer ++;
	}


	return nbActivePlayer;
}

//si il y a plus de 1 joueur, on lance "gameStarted" aux joueurs pret
//sinon on lance un message de wait
function startIfEnoughPlayers() 
{
	var nbActivePlayer = getNumActivePlayers();
	

	//game Start pour tous les joueurs actifs
	for (var i = 0; i < players.length; i++)
	{
		if (players[i].active === true)
		{
			var client_socket = players[i].socketid;
			if (nbActivePlayer > 1)
			{
				io.sockets.connected[client_socket].emit("gameStart", 0);
				gameStarted = true;
			}
			else
			{
				//io.sockets.socket(client_socket).emit("waitOpponents", 0); //syntax v2
				io.sockets.connected[client_socket].emit("waitOpponents", 0);
				gameStarted = false;
			}
		}
	}
	
}


function playerLost(indexLost) 
{
	var nbActivePlayer = getNumActivePlayers();
	

	players[indexLost].active = false;

	var distantSocket = players[indexLost].socketid;
	io.sockets.connected[distantSocket].emit("perdu", "Dommage "+players[indexLost].pseudo + ", vous avez perdu. :-( <br/><a href=''>Rejouer ?</a>");

	//victory pour tous les joueurs actifs
	for (var i = 0; i < players.length; i++)
	{
		if (players[i].active === true)
		{
			var client_socket = players[i].socketid;
			if (nbActivePlayer > 1)
			{
				io.sockets.connected[client_socket].emit("victory", "Bravo "+players[i].pseudo+", vous avez vaincu <span style=\"font-weight: bold; color: "+players[indexLost].color+"\">"+ players[indexLost].pseudo+"</span> !<br/><a href=''>Rejouer ?</a>");
				//io.sockets.connected[client_socket].emit("waitOpponents", 0);
				gameStarted = false;
			}
		}
	}
	
}

	