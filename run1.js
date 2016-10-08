"use strict";
// =============================
// CONSTANTES / VARIABLES DE JEU
// =============================

const PAS_ANGLE = 15;
const DEBUG = true;

// ----------------------- CONTRÔLE DU L'AFFICHAGE
var canvas = document.getElementById("canvas");
var context = canvas.getContext("2d");
var animation;

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
car.image.src = "police.png";
car.x = car.image.width;
car.y = car.image.height;

var car2 = {
    image : new Image(),
    x : 0,
    y : 0,
    angle : 0,
    vitesse : 1
};
car2.image.src = "lambo.png";
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
        animation = requestAnimationFrame(mainLoop);
    } else {
        cancelAnimationFrame(animation);
        if (DEBUG) {
            console.log("Fin de requestAnimationFrame");
        }
    }
}

/**
 * Met à jour la voiture.
 * La vitesse peut varier entre '2' et '10', '10' étant le plus rapide.
 * A chaque demande, la voiture fera une rotation de 'PAS_ANGLE' degrés.
 * La nouvelle position de la voiture est fonction de son orientation et de sa vitesse.
 */
function update() {
    if (flag_accelerer) {
        car.vitesse++;
        if (car.vitesse > 10) {
            car.vitesse = 10;
        }
        flag_accelerer = false;
    }
    if (flag_ralentir) {
        car.vitesse--;
        if (car.vitesse < 2) {
            car.vitesse = 2;
        }
        flag_ralentir = false;
    }
    if (flag_droite) {
        car.orientation = car.orientation + PAS_ANGLE;
        flag_droite = false;
    }
    if (flag_gauche){
        car.orientation = car.orientation - PAS_ANGLE;
        flag_gauche = false;
    }

    // Calcul de la nouvelle position
    car.x += car.vitesse * Math.cos(Math.PI / 180 * car.orientation);
    car.y += car.vitesse * Math.sin(Math.PI / 180 * car.orientation);

    if ( colissionBords() || colision(car,car2) ) {
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
    if ( colision && DEBUG ) {
        console.log("Colision avec un bord du canvas");
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
        if (DEBUG) {
            console.log("Colision entre deux véhicules");
        }
        return true;
    }
    return false;
}

function draw() { // Gère l'affichage de la voiture en fonction de sa position
    context = canvas.getContext("2d");
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
 * @param event
 */
function keypress_handler(event) {
    if (DEBUG) {
        console.log("Touche appuyée : " + event.keyCode);
    }
    switch ( event.keyCode ) {
        case 37: // Flèche gauche
            flag_gauche = true;
            break;
        case 39: // Flèche droite
            flag_droite = true;
            break;
        case 38: // haut
            flag_accelerer = true;
            break;
        case 40: // bas
            flag_ralentir = true;
            break;
    } //TODO: Ajouter les cas pour le gamepad
}

window.addEventListener("keydown", keypress_handler, false);
// Premier lancement
animation = requestAnimationFrame(mainLoop);
