"use strict";
process.title = 'fuzzy-pancake-server';

const WEB_SOCKET_SERVER_PORT = 1099;
var webSocketServer = require('websocket').server;
var http = require('http');

// ==============================
// CREATION DU SERVEUR WEB SOCKET
// ==============================

/**
 * HTTP et Web Socket server
 */
var server = http.createServer(function (request, response) {
    // Not important for us. We're writing WebSocket server, not HTTP server
});
server.listen(WEB_SOCKET_SERVER_PORT, function () {
    console.log((new Date()) + " Server is listening on port " + WEB_SOCKET_SERVER_PORT);
});
var wsServer = new webSocketServer({
    // WebSocket server is tied to a HTTP server. WebSocket request is just
    // an enhanced HTTP request. For more info http://tools.ietf.org/html/rfc6455#page-6
    httpServer : server
});

/**
 * Joueurs connectés au serveur. Correspond au nombre de connections Web Sockets ouvertes.
 */
var players = [];

// =============================
// CONSTANTES / VARIABLES DE JEU
// =============================

const DEFAULT_PSEUDO = "inconnu";
const ANGLE_STEP = 10;
const DEBUG = true;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 800;
const CAR_WIDTH = 60;
const CAR_HEIGHT = 30;

// FLAGS
// -----
var flag_finish = false;
var flag_started = false;
var flag_down = false;
var flag_up = false;
var flag_left = false;
var flag_right = false;

// =============
// CARS CREATION
// =============

var car1 = {
    imageID : 0,
    x : 100, // Placement horizontal
    y : 100, // Placement vertical
    orientation : 0,
    speed : 1
};
var car2 = {
    imageID : 1,
    x : 400,
    y : 200,
    orientation : 30,
    speed : 1
};
var car3 = {
    imageID : 2,
    x : 150,
    y : 600,
    orientation : 90,
    speed : 1
};
var car4 = {
    imageID : 3,
    x : 700,
    y : 700,
    orientation : 180,
    speed : 1
};
var car5 = {
    imageID : 4,
    x : 300,
    y : 500,
    orientation : 45,
    speed : 1
};
var car6 = {
    imageID : 5,
    x : 400,
    y : 400,
    orientation : 66,
    speed : 1
};

var cars = [];
cars.push(car1);
cars.push(car2);
cars.push(car3);
cars.push(car4);
cars.push(car5);
cars.push(car6);

// ==========
// GAME LOGIC
// ==========

/**
 * Retourne 'true' si la car entre en collide avec un des 4 bords du canvas, 'false' sinon.
 * Si les coordonnées x et y de la car dépasse du canvas, elles sont bornées.
 */
function collideEdges(car) {
    if ( car.x + CAR_WIDTH / 2 > CANVAS_WIDTH ) { // bord droit
        car.x = CANVAS_WIDTH - CAR_WIDTH / 2;
        return true;
    }
    if ( car.x - CAR_WIDTH / 2 < 0 ) { // bord gauche
        car.x = CAR_WIDTH / 2;
        return true;
    }
    if ( car.y - CAR_HEIGHT / 2 < 0 ) { // haut
        car.y = CAR_HEIGHT / 2;
        return true;
    }
    if ( car.y + CAR_HEIGHT / 2 > CANVAS_HEIGHT ) { // bas
        car.y = CANVAS_HEIGHT - CAR_HEIGHT / 2;
        return true;
    }
    return false;
}

/**
 * Retourne 'true' si les voitures A et B entrent en collide, 'false' sinon
 * @param A premier objet
 * @param B second objet
 */
function collide(A, B) {
    if ( A.x < B.x + CAR_WIDTH && A.x + CAR_WIDTH > B.x &&
        A.y < B.y + CAR_HEIGHT && A.y + CAR_HEIGHT > B.y ) {
        if ( DEBUG ) {
            console.log("Colision entre deux véhicules");
        }
        return true;
    }
    return false;
}

/**
 * Mise à jour de l'état de la car en fonction de l'action reçue.
 * La speed minimale est de '1' et la speed maximale est de '5'.
 */
function update(car) {
    if ( flag_up ) {
        car.speed++;
        if ( car.speed > 5 ) {
            car.speed = 5;
        }
        flag_up = false;
    }
    if ( flag_down ) {
        car.speed--;
        if ( car.speed < 1 ) {
            car.speed = 1;
        }
        flag_down = false;
    }
    if ( flag_right ) {
        car.orientation = car.orientation + ANGLE_STEP;
        flag_right = false;
    }
    if ( flag_left ) {
        car.orientation = car.orientation - ANGLE_STEP;
        flag_left = false;
    }
}

/**
 * Met à jour les coordonées des voitures en fonction de leur speed et de leur orientation.
 */
function move() {
    for ( let i = 0 ; i < players.length ; i++ ) {
        let car = players[ i ].car;
        
        if ( players[ i ].active === true ) {
            // Calcul de la nouvelle position
            car.x += car.speed * Math.cos(Math.PI / 180 * car.orientation);
            car.y += car.speed * Math.sin(Math.PI / 180 * car.orientation);
        }
        
        if ( collideEdges(car) ) {
            players[ i ].active = false;
            players[ i ].victory = false;
        }
        for ( let j = 0 ; j < players.length ; j++ ) {
            if ( players[ i ].car != players[ j ].car ) { // Ne pas tester la collide avec soit même
                if ( collide(players[ i ].car, players[ j ].car) ) {
                    if ( players[ i ].active === false ) {
                        players[ j ].victory = true;
                    } else {
                        players[ j ].active = false;
                        players[ i ].victory = true;
                    }
                    players[ j ].active = false;
                    flag_finish = true;
                }
            }
        }
    }
}

function checkAllCollideEdge() {
    for ( let i = 0 ; i < players.length ; i++ ) {
        if ( players[ i ].active === true ) {
            return;
        }
    }
    flag_finish = true;
}

// =========
// GAME LOOP
// =========

setInterval(function () { // Never stopped
    if ( flag_started && !flag_finish ) {
        move();
        sendCarsToClients();
        checkAllCollideEdge();
    } else if ( flag_finish ) {
        sendResultsToClients();
        cars = shuffle(cars); // 'Randomiser' l'ordre d'attribution des voitures
        flag_finish = false;
        flag_started = false;
    }
}, 30); // Délai de rafraichissement en ms

// =========
// UTILITIES
// =========

/**
 *  Fisher-Yates Shuffle
 */
function shuffle(array) {
    let currentIndex = array.length, temporaryValue, randomIndex;
    
    // While there remain elements to shuffle...
    while ( 0 !== currentIndex ) {
        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        
        // And swap it with the current element.
        temporaryValue = array[ currentIndex ];
        array[ currentIndex ] = array[ randomIndex ];
        array[ randomIndex ] = temporaryValue;
    }
    return array;
}

// ========
// EMISSION
// ========

function sendCarsToClients() {
    // Il faut envoyer la nouvelle position de toutes les voitures à tous les players
    let data = [];
    for ( let i = 0 ; i < players.length ; i++ ) {
        data.push(players[ i ].car);
    }

    let json = JSON.stringify({ type : 'cars', data : data });
    if ( DEBUG ) {
        console.log("Sending to clients : " + json);
    }
    for ( let i = 0 ; i < players.length ; i++ ) {
        players[ i ].connection.sendUTF(json); // broadcast à tous les players connectés
    }
}

function sendResultsToClients() {
    for ( let i = 0 ; i < players.length ; i++ ) {
        let json = {
            type : 'end',
            data : players[ i ].victory
        };
        players[ i ].connection.sendUTF(JSON.stringify(json)); // broadcast à tous les players connectés
    }
}

// =========
// RECEPTION
// =========

// Dépendant d'un client.
wsServer.on('request', function (request) {
    if ( DEBUG ) {
        console.log((new Date()) + ' Connection from ' + request.origin + '.');
    }
    
    // Création d'un profil pour le joueur
    var profil = {
        pseudo : DEFAULT_PSEUDO,
        car : cars.shift(),
        active : true,
        victory : false,
        connection : request.accept(null, request.origin)
    };
    let joueurIndex;
    
    // Réception d'un message
    profil.connection.on('message', function (message) {
        if ( profil.active === false ) {
            return; // Le joueur a perdu, on ignore juste son message
        }
        try {
            let json = JSON.parse(message.utf8Data); // Obligation de mettre utf8Data !
            if ( DEBUG ) {
                console.log("Received JSON : " + json);
            }
            if ( json.type === 'connect' && profil.pseudo === DEFAULT_PSEUDO ) { // Première requête
                profil.pseudo = json.data;
                let profilToSend = { // On ne veux pas envoyer toute les infos (ici, surtout l'objet 'connection') au client
                    type : 'init',
                    data : {
                        pseudo : profil.pseudo,
                        car : profil.car
                    }
                };
                joueurIndex = players.push(profil) - 1;
                profil.connection.sendUTF(JSON.stringify(profilToSend));
                flag_started = true;
            } else if ( flag_started && json.type === 'action' ) { // Le joueur a fait une action sur le jeu
                switch ( json.data ) {
                    case 'left':
                        flag_left = true;
                        break;
                    case 'right':
                        flag_right = true;
                        break;
                    case 'up':
                        flag_up = true;
                        break;
                    case 'down':
                        flag_down = true;
                        break;
                }
                update(profil.car);
            } else { // Message invalide reçu
                //TODO: Envoyer un message pour prévenir le client ? Equivalent d'une HTTP 400
            }
        } catch ( e ) {
            console.log('Invalid JSON received : ', message.data);
        }
    });
    
    // Déconnection du joueur / fermeture Web Socket
    profil.connection.on('close', function (connection) { // La connection sera fermée lors du fermement/rechargement d'onglet ou sur demande
        console.log((new Date()) + " Peer " + connection.remoteAddress + " disconnected.");
        players.splice(joueurIndex, 1);
        cars.push(profil.car); // Rends la car de nouveau disponible
    });
});

