"use strict";
// =============================
// CONSTANTES / VARIABLES DE JEU
// =============================

const PAS_ANGLE = 5;
const DEBUG = true;

// ----------------------- CONTRÔLE DU L'AFFICHAGE
var canvas = document.getElementById("canvas");
var gamepad_connecte;

// ----------------------- CONTRÔLE DU JEU
var flag_finish = false;
var flag_ralentir = false;
var flag_accelerer = false;
var flag_gauche = false;
var flag_droite = false;

// ==============
// INITIALISATION
// ==============

var car = {
    image : new Image(),
    x : 0, // Placement horizontal
    y : 0, // Placement vertical
    orientation : 0,
    vitesse : 1
};
car.image.src = "assets/images/police.png";
car.x = car.image.width;
car.y = car.image.height;

var car2 = {
    image : new Image(),
    x : 0,
    y : 0,
    angle : 0,
    vitesse : 1
};
car2.image.src = "assets/images/lambo.png";
car2.x = canvas.height / 2;
car2.y = canvas.width / 2;

// =============
// BOUCLE DE JEU
// =============

/**
 * Boucle de jeu. Met à jour les variables de jeu en fonction des actions du joueur et adapte l'affichage en conséquence.
 */
function mainLoop() {
    update();
    draw();
    if ( !flag_finish ) {
        requestAnimationFrame(mainLoop);
    }
}

/**
 * Met à jour la voiture.
 * La vitesse peut varier entre '1' et '5', '5' étant le plus rapide.
 * A chaque demande, la voiture fera une rotation de 'PAS_ANGLE' degrés.
 * La nouvelle position de la voiture est fonction de son orientation et de sa vitesse.
 */
function update() {
    verifierGamepad();

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

    // Calcul de la nouvelle position
    car.x += car.vitesse * Math.cos(Math.PI / 180 * car.orientation);
    car.y += car.vitesse * Math.sin(Math.PI / 180 * car.orientation);

    if ( colissionBords() || colision(car, car2) ) {
        flag_finish = true;
    }
}

// =====================
// GESTION DES COLISIONS
// =====================

/**
 * Retourne 'true' si la voiture entre en colision avec un des 4 bords du canvas, 'false' sinon.
 * Si les coordonnées x et y de la voiture dépasse du canvas, elles sont bornées.
 */
function colissionBords() {
    if ( car.x + car.image.width / 2 > canvas.width ) { // bord droit
        car.x = canvas.width - car.image.width / 2;
        return true;
    }
    if ( car.x - car.image.width / 2 < 0 ) { // bord gauche
        car.x = car.image.width / 2;
        return true;
    }
    if ( car.y - car.image.height / 2 < 0 ) { // haut
        car.y = car.image.height / 2;
        return true;
    }
    if ( car.y + car.image.height / 2 > canvas.height ) { // bas
        car.y = canvas.height - car.image.height / 2;
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
    if ( A.x < B.x + B.image.width && A.x + A.image.width > B.x &&
        A.y < B.y + B.image.height && A.y + A.image.height > B.y ) {
        if ( DEBUG ) {
            console.log("Colision entre deux véhicules");
        }
        return true;
    }
    return false;
}

/**
 * Affiche les éléments du jeu en fonction de leurs coordonées
 */
function draw() {
    let context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height); // Efface les affichages précédents

    context.save();
    context.translate(car.x, car.y);
    context.rotate(Math.PI / 180 * car.orientation);
    context.drawImage(car.image, -(car.image.width / 2), -(car.image.height / 2));
    context.restore();

    // TEST PURPOSE ONLY
    context.save();
    context.translate(car2.x, car2.y);
    context.rotate(Math.PI / 180 * car2.orientation);
    context.drawImage(car2.image, -(car2.image.width / 2), -(car2.image.height / 2));
    context.restore();
}

// ==============
// EVENT HANDLERS
// ==============

/**
 * Action déclanchée lors d'une intéraction avec un utilisateur de type : touche/bouton appuyé.
 * Ne prends pas en compte les actions sur le gamepad, ce dernier n'envoyant pas d'event.
 * @param event
 */
function keypress_handler(event) {
    if ( DEBUG ) {
        console.log("Touche appuyée : " + event.keyCode);
    }
    switch ( event.keyCode ) {
        case 37: // Flèche gauche
            flag_gauche = true;
            break;
        case 39: // Flèche droite
            flag_droite = true;
            break;
        case 38: // Flèche haute
            flag_accelerer = true;
            break;
        case 40: // Flèche basse
            flag_ralentir = true;
            break;
    }
}

// ===================
// GESTIION DU GAMEPAD
// ===================

/**
 * Taite les actions sur les boutons '1', '2', '3' et '4' du gamepad.
 * Il faut appeler cette fonction dans la boucle de jeu car il n'y a pas d'event handler associé au gamepad.
 * FIXME: Sur mon poste, les actions sur les flèches du gamepad ne sont pas détectées.
 */
function verifierGamepad() {
    if ( gamepad_connecte ) {
        let gamepad = navigator.getGamepads()[ 0 ]; // On suppose que le navigateur est assez récent...
        if ( gamepad.buttons[ 0 ].pressed ) {
            flag_accelerer = true;
        }
        if ( gamepad.buttons[ 2 ].pressed ) {
            flag_ralentir = 1;
        }
        if ( gamepad.buttons[ 3 ].pressed ) {
            flag_gauche = true;
        }
        if ( gamepad.buttons[ 1 ].pressed ) {
            flag_droite = true;
        }
    }
}

// ====
// MAIN
// ====

$(document).ready(function () {
    $(window).on("gamepadconnected", function () {
        gamepad_connecte = true;
        $("#gamepadPrompt").text("Gamepad connecté ! Appuuyer sur une touche '1', '2', '3' ou '4' pour commencer !");
        if ( DEBUG ) {
            console.log("Gamepad connecté");
        }
    });

    $(window).on("gamepaddisconnected", function () {//récupération de l'événement (cf plus bas)
        gamepad_connecte = false;
        $("#gamepadPrompt").text("Gamepad connecté ! Appuuyer sur une touche '1', '2', '3' ou '4' pour commencer !");
        if ( DEBUG ) {
            console.log("Gamepad connecté");
        }
    });

    // Autorise le contrôle via clavier uniquement en développement/debug
    if ( DEBUG ) {
        window.addEventListener("keydown", keypress_handler, false);
    }

    if ( navigator.getGamepads()[ 0 ] ) { // Regarde si un gamepad est déjà branché avant l'éxécution du JavaScript
        gamepad_connecte = true;
    }
    requestAnimationFrame(mainLoop);
});
