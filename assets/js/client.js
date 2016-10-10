$(function () {
    "use strict";
    
    const DEBUG = true;
    
    // ===============
    // INITIALISATIONS
    // ===============
    
    // ----------------------- WEB SOCKETS
    window.WebSocket = window.WebSocket || window.MozWebSocket;
    if ( !window.WebSocket ) {
        $("#webSocketPrompt").text("Votre navigateur web ne supporte pas les Web Sockets :(");
        return;
    }
    
    var connection = new WebSocket('ws://localhost:1099');
    connection.onerror = function (error) {
        $("#webSocketPrompt").text("Impossible d'établir une connection Web Socket :(");
    };
    
    // ----------------------- CONTRÔLE DE L'AFFICHAGE
    var canvas = document.getElementById("canvas");
    var gamepad_connecte = false;
    
    // ----------------------- CONTRÔLE DU JEU
    var flag_ralentir = false;
    var flag_accelerer = false;
    var flag_gauche = false;
    var flag_droite = false;
    
    // Chargement des images par le client une fois pour toute par le client
    var images = [
        new Image(),
        new Image()
    ];
    images[ 0 ].src = "assets/images/police.png";
    images[ 1 ].src = "assets/images/lambo.png";
    
    // ==============
    // GESTION DU JEU
    // ==============
    
    function update() {
        verifierGamepad();
        
        // Envoi d'un message au serveur si et seulement si il y a eu une intéraction du joueur
        if ( flag_accelerer ) {
            connection.send(JSON.stringify({ type : 'action', data : 'accelerer' }));
            flag_accelerer = false;
        }
        if ( flag_ralentir ) {
            connection.send(JSON.stringify({ type : 'action', data : 'ralentir' }));
            flag_ralentir = false;
        }
        if ( flag_droite ) {
            connection.send(JSON.stringify({ type : 'action', data : 'droite' }));
            flag_droite = false;
        }
        if ( flag_gauche ) {
            connection.send(JSON.stringify({ type : 'action', data : 'gauche' }));
            flag_gauche = false;
        }
    }
    
    /**
     * Affiche les éléments du jeu en fonction de leurs coordonées
     */
    function draw(car) {
        let context = canvas.getContext("2d");
        
        context.save();
        context.translate(car.x, car.y);
        context.rotate(Math.PI / 180 * car.orientation);
        console.log("car image id = " + car.imageID);
        console.log("car image = " + images[ car.imageID ]);
        context.drawImage(images[ car.imageID ], -(images[ car.imageID ].width / 2), -(images[ car.imageID ].height / 2));
        context.restore();
    }
    
    // ==================
    // GESTION DU CLAVIER
    // ==================
    
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
        update();
    }
    
    // ===================
    // GESTIION DU GAMEPAD
    // ===================
    
    /**
     * Taite les actions sur les boutons '1', '2', '3' et '4' du gamepad.
     * Il faut appeler cette fonction dans la boucle de jeu car il n'y a pas d'event handler associé au gamepad.
     * FIXME: Après recherches, les actions sur les flèches ne sont pas des 'buttons' mais des 'axes'
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
    
    // ========================================
    // RECEPTION DES MESSAGES DEPUIS LE SERVEUR
    // ========================================
    
    connection.onmessage = function (message) {
        // Vérifions que le message reçu est un JSON correctement formé
        try {
            var json = JSON.parse(message.data);
            console.log("Receveid from server : " + json.data);
        } catch ( e ) {
            console.log('JSON reçu invalide : ', message.data);
            return;
        }
        
        if ( json.type === 'voitures' ) {
            // Efface les anciens affichages
            let context = canvas.getContext("2d");
            context.clearRect(0, 0, canvas.width, canvas.height);
            
            var cars = json.data;
            for ( let i = 0 ; i < cars.length ; i++ ) {
                draw(cars[ i ]);
            }
        }
        // TODO: Gérer les différents messages reçus
    };
    
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
    });
});