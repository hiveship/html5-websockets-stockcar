"use strict";
process.title = 'fuzzy-pancake-server';

const WEB_SOCKET_SERVER_PORT = 1099;
var webSocketServer = require('websocket').server;
var http = require('http');

// ==============================
// CREATION DU SERVEUR WEB SOCKET
// ==============================

/**
 * HTTP server
 */
var server = http.createServer(function (request, response) {
    // Not important for us. We're writing WebSocket server, not HTTP server
});

server.listen(WEB_SOCKET_SERVER_PORT, function () {
    console.log((new Date()) + " Server is listening on port " + WEB_SOCKET_SERVER_PORT);
});

/**
 * WebSocket server
 */
var wsServer = new webSocketServer({
    // WebSocket server is tied to a HTTP server. WebSocket request is just
    // an enhanced HTTP request. For more info http://tools.ietf.org/html/rfc6455#page-6
    httpServer : server
});

/**
 * Joueurs connectés au serveur
 */
var joueurs = [];

// =============================
// CONSTANTES / VARIABLES DE JEU
// =============================
const PAS_ANGLE = 10;
const DEBUG = true;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 800;
const CAR_WIDTH = 60;
const CAR_HEIGHT = 30;

// ==================
// FLAGS D'EVENEMENTS
// ==================
var flag_finish = false;
var flag_ralentir = false;
var flag_accelerer = false;
var flag_gauche = false;
var flag_droite = false;

// ==============
// LOGIQUE DU JEU
// ==============

/**
 * Retourne 'true' si la voiture entre en colision avec un des 4 bords du canvas, 'false' sinon.
 * Si les coordonnées x et y de la voiture dépasse du canvas, elles sont bornées.
 */
function colissionBords(car) {
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
 * Retourne 'true' si les objets A et B entrent en colision, 'false' sinon
 * @param A premier objet
 * @param B second objet
 */
function colision(A, B) {
    if ( A.x < B.x + CAR_WIDTH && A.x + CAR_WIDTH > B.x &&
        A.y < B.y + CAR_HEIGHT && A.y + CAR_HEIGHT > B.y ) {
        if ( DEBUG ) {
            console.log("Colision entre deux véhicules");
        }
        return true;
    }
    return false;
}

function update(car) {
    if ( flag_accelerer ) {
        car.vitesse++;
        if ( car.vitesse > 5 ) {
            car.vitesse = 5;
        }
        flag_accelerer = false;
    }
    if ( flag_ralentir ) {
        car.vitesse--;
        if ( car.vitesse < 1 ) {
            car.vitesse = 1;
        }
        flag_ralentir = false;
    }
    if ( flag_droite ) {
        car.orientation = car.orientation + PAS_ANGLE;
        flag_droite = false;
    }
    if ( flag_gauche ) {
        car.orientation = car.orientation - PAS_ANGLE;
        flag_gauche = false;
    }
    
    for ( let i = 0 ; i < cars.length ; i++ ) {
        if ( colissionBords(car) || colision(car, cars[ i ]) ) {
            flag_finish = true;
        }
    }
}

function updateDeplacements() {
    for ( let i = 0 ; i < cars.length ; i++ ) {
        let car = cars[ i ];
        // Calcul de la nouvelle position
        car.x += car.vitesse * Math.cos(Math.PI / 180 * car.orientation);
        car.y += car.vitesse * Math.sin(Math.PI / 180 * car.orientation);
    }
}

// ======================
// CREATION DES VEHICULES
// ======================
var cars = [];
var imagesID = [ 0, 1 ];

var car1 = {
    imageID : imagesID.shift(), // TODO: Rendre de nouveau dispo à la fin de la session
    x : 100, // Placement horizontal
    y : 100, // Placement vertical
    orientation : 0,
    vitesse : 1
};
var car2 = {
    imageID : imagesID.shift(),
    x : 400,
    y : 200,
    orientation : 0,
    vitesse : 1
};
cars.push(car1);
cars.push(car2);

// TODO: tableau de voitures utilisées

// =============
// BOUCLE DE JEU
// =============

setInterval(function () {
    if ( joueurs.length >= 1 ) {
        updateDeplacements();
        envoyerVoitures();
    }
}, 50);

// =====================
// RECEPTION DE REQUÊTES
// =====================

function envoyerVoitures() { // TODO: Renoyer uniquement les voitures qui sont allouées à un joueur dans le jeu
    // Il faut envoyer la nouvelle position de toutes les voitures à tous les joueurs
    //TODO: On ne veux pas envoyer toutes les données, juste x,y,orientation
    let json = JSON.stringify({ type : 'voitures', data : cars });
    console.log("SENDING JSON : " + json);
    for ( let i = 0 ; i < joueurs.length ; i++ ) {
        joueurs[ i ].sendUTF(json); // broadcast à tous les joueurs connectés
    }
}

// This callback function is called every time someone
// tries to connect to the WebSocket server
wsServer.on('request', function (request) {
    if ( DEBUG ) {
        console.log((new Date()) + ' Connection depuis ' + request.origin + '.');
    }
    let connection = request.accept(null, request.origin);
    let joueur = joueurs.push(connection) - 1;
    let userCar = false;
    
    // user sent some message
    connection.on('message', function (message) {
        if ( userCar === false ) { // C'est la première requête //FIXME: Ce n'est pas à faire 'onmessage' mais directement lors de la connection
            userCar = cars[ Math.floor(Math.random() * cars.length) ]; // Sélection aléatoire //FIXME: Il faut faire un splice pour ne pas allouer 2 fois la même voiture
            //cars.splice(userCar, 1);
            //    connection.sendUTF(JSON.stringify(userCar)); TODO: Prévenir l'utilisateur de quelle est sa voiture
            //  envoyerVoitures();
        } else {
            try {
                let json = JSON.parse(message.utf8Data); // Obligation de mettre utf8Data !
                if ( json.type === 'action' ) {
                    console.log("ACTION RECEIVED " + json.data);
                    switch ( json.data ) {
                        case 'gauche':
                            flag_gauche = true;
                            break;
                        case 'droite':
                            flag_droite = true;
                            break;
                        case 'accelerer':
                            flag_accelerer = true;
                            break;
                        case 'ralentir':
                            flag_ralentir = true;
                            break;
                    }
                    update(userCar);
                    console.log("Message received from client : " + json);
                }
            } catch ( e ) {
                console.log('JSON reçu invalide : ', message.data);
            }
        }
        // TODO: Envoyer un message si flag_finish = true;
    });
    
    // user disconnected
    connection.on('close', function (connection) { //FIXME: La connection semble se fermer toute seule pour rien...
        console.log((new Date()) + " Peer " + connection.remoteAddress + " disconnected.");
        joueurs.splice(joueur, 1);
        //cars.splice(userCar, 1);
        //cars.push(userCar); // Rends la voiture de nouveau disponible TODO: pas prévu encore
    });
});

