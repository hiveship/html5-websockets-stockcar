$(function () {
    "use strict";
    
    const DEBUG = true;
    
    // ===============
    // ELEMENTS DU DOM
    // ===============
    
    var input = $('#input'); // Champ de saisie du mot du login
    var video = document.querySelector('video');
    navigator.getMedia = ( navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
    
    // ===============
    // INITIALISATIONS
    // ===============
    
    // ----------------------- WEB SOCKETS
    window.WebSocket = window.WebSocket || window.MozWebSocket;
    if ( !window.WebSocket ) {
        $("#webSocketPrompt").text("Your browser do not support Web Sockets :(");
        document.getElementById('input').style.display = "none";
        return;
    }
    
    var connection = new WebSocket('ws://localhost:1099');
    connection.onerror = function (error) {
        if ( DEBUG ) {
            console.log(error);
        }
        $("#webSocketPrompt").text("Can not establish Web Socket connection:(");
        document.getElementById('input').style.display = "none";
    };
    
    // Pour du debug, on peut apprécier voir le code de fermeture de la connection
    // Voir : https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent
    connection.onclose = function (closeEvent) {
        console.log("Close connection with code : " + closeEvent.code);
    };
    
    // ----------------------- CONTRÔLE DE L'AFFICHAGE
    var canvas = document.getElementById("canvasGame");
    var gamepad_connected = false;
    
    // ----------------------- CONTRÔLE DU JEU
    var flag_down = false;
    var flag_up = false;
    var flag_left = false;
    var flag_right = false;
    
    // Chargement des images une fois pour toute par le client
    var images = [
        new Image(),
        new Image(),
        new Image(),
        new Image(),
        new Image(),
        new Image()
    ];
    images[ 0 ].src = "assets/images/police.png";
    images[ 1 ].src = "assets/images/lambo.png";
    images[ 2 ].src = "assets/images/Audi.png";
    images[ 3 ].src = "assets/images/Ambulance.png";
    images[ 4 ].src = "assets/images/truck.png";
    images[ 5 ].src = "assets/images/tank.png";
    
    // ==============
    // GESTION DU JEU
    // ==============
    
    // Obligé de faire une boucle de jeu pour scruter le gamepad
    setInterval(function () { // Never stopped
        update();
    }, 50); // Délai de rafraichissement en ms
    
    /**
     * Notifie le serveur lorsque une action a été effectuée par le joueur
     */
    function update() {
        checkGamepad();
        
        // Envoi d'un message au serveur si et seulement si il y a eu une intéraction du joueur
        if ( flag_up ) {
            connection.send(JSON.stringify({ type : 'action', data : 'up' }));
            flag_up = false;
        }
        if ( flag_down ) {
            connection.send(JSON.stringify({ type : 'action', data : 'down' }));
            flag_down = false;
        }
        if ( flag_right ) {
            connection.send(JSON.stringify({ type : 'action', data : 'right' }));
            flag_right = false;
        }
        if ( flag_left ) {
            connection.send(JSON.stringify({ type : 'action', data : 'left' }));
            flag_left = false;
        }
    }
    
    /**
     * Affiche une car à ses coordonées dans le canvas
     */
    function draw(car) {
        let context = canvas.getContext("2d");
        context.save();
        context.translate(car.x, car.y);
        context.rotate(Math.PI / 180 * car.orientation);
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
            console.log("Key pressed : " + event.keyCode);
        }
        switch ( event.keyCode ) {
            case 37: // Flèche gauche
                flag_left = true;
                break;
            case 39: // Flèche droite
                flag_right = true;
                break;
            case 38: // Flèche haute
                flag_up = true;
                break;
            case 40: // Flèche basse
                flag_down = true;
                break;
        }
    }
    
    // ===================
    // GESTIION DU GAMEPAD
    // ===================
    
    /**
     * Taite les actions sur les boutons '1', '2', '3' et '4' du gamepad.
     * Il faut appeler cette fonction dans la boucle de jeu car il n'y a pas d'event handler associé au gamepad.
     */
    function checkGamepad() {
        if ( gamepad_connected ) {
            let gamepad = navigator.getGamepads()[ 0 ]; // On suppose que le navigateur est assez récent...
            if ( gamepad.buttons[ 0 ].pressed ) {
                flag_up = true;
            }
            if ( gamepad.buttons[ 2 ].pressed ) {
                flag_down = 1;
            }
            if ( gamepad.buttons[ 3 ].pressed ) {
                flag_left = true;
            }
            if ( gamepad.buttons[ 1 ].pressed ) {
                flag_right = true;
            }
        }
    }
    
    // =====================
    // GESTION DE LA WEB CAM
    // =====================
    
    function takeAndSendPicture() {
        // Take the picture and set it to the canvas
        let canvasVideo = document.getElementById('canvasVideo');
        canvasVideo.getContext('2d').drawImage(video, 0, 0, 100, 100); // Capture du flux vidéo pour en faire une image
        //FIXME: Il y a une erreur 1009 FRAME TO BIG lorsque on envoie des images plus grande (par exemple 150*150). Pourquoi ??
        // Send the picture to the server
        let json = {
            type : 'photo',
            data : canvasVideo.toDataURL('image/png')
        };
        connection.send(JSON.stringify(json));
    }
    
    // ========================================
    // RECEPTION DES MESSAGES DEPUIS LE SERVEUR
    // ========================================
    
    /**
     * Lors de la réception d'un message depuis le serveur
     */
    connection.onmessage = function (message) {
        // Vérifions que le message reçu est un JSON correctement formé
        try {
            if ( DEBUG ) {
                console.log("Receveid from server : " + message.data);
            }
            let json = JSON.parse(message.data);
            
            if ( json.type === 'init' ) { // Le serveur nous informe de la car qui nous a été affectée
                document.getElementById('gameInfo').innerHTML += "Hi, " + json.data.pseudo + " ! Here is your car: ";
                document.getElementById('gameInfo').innerHTML += images[ json.data.car.imageID ].outerHTML;
            } else if ( json.type === 'cars' ) { // Position des voitures envoyées par le serveur
                // Efface les anciens affichages
                let context = canvas.getContext("2d");
                context.clearRect(0, 0, canvas.width, canvas.height);
                
                var cars = json.data;
                for ( let i = 0 ; i < cars.length ; i++ ) {
                    draw(cars[ i ]);
                }
            } else if ( json.type === 'end' ) {
                if ( json.data === true ) {
                    document.getElementById('gameInfo').innerHTML += "The game is finish ! You won :) <br />";
                } else {
                    takeAndSendPicture();
                    document.getElementById('gameInfo').innerHTML += "The game is finish ! You loose :( <br />";
                }
            } else if ( json.type === 'photo' ) {
                // Afficher l'image reçue
                let img = document.createElement("img");
                if ( json.data === null ) {
                    img.src = "http://www.squishable.com/mm5/graphics/00000001/comfortfood_pancakes.jpg";
                } else {
                    img.src = "data:" + json.data;
                }
                document.getElementById("resultat").innerHTML += "<p>Here is the last looser: <br/></p>";
                document.getElementById("resultat").appendChild(img);
            }
        } catch ( e ) {
            console.log("Error occured : " + e);
        }
    };
    
    // ====
    // MAIN
    // ====
    
    $(document).ready(function () {
        $(window).on("gamepadconnected", function () {
            gamepad_connected = true;
            $("#gamepadPrompt").text("Gamepad connected ! Press '1', '2', '3' ou '4' to start !");
            if ( DEBUG ) {
                console.log("Gamepad connected");
            }
        });
        
        $(window).on("gamepaddisconnected", function () {//récupération de l'événement (cf plus bas)
            gamepad_connected = false;
            $("#gamepadPrompt").text("Gamepad disconnected ! Can not start the game :( ");
            if ( DEBUG ) {
                console.log("Gamepad disconnected");
            }
        });
        
        // Autorise le contrôle via clavier uniquement en développement/debug
        if ( DEBUG ) {
            window.addEventListener("keydown", keypress_handler, false);
        }
        
        input.keydown(function (e) {
            if ( e.keyCode === 13 ) { // Touche entrée
                // Vérifier que le joueur a renseigné un pseudo et l'envoyer au serveur
                let pseudo = document.getElementById('input').value;
                if ( pseudo ) {
                    let json = {
                        type : 'connect',
                        data : pseudo
                    };
                    connection.send(JSON.stringify(json));
                    document.getElementById('input').style.display = "none";
                }
            }
        });
        
        if ( navigator.getGamepads()[ 0 ] ) { // Regarde si un gamepad est déjà branché avant l'éxécution du JavaScript
            gamepad_connected = true;
        }
        
        // Start the webcam video
        navigator.getMedia(
            {
                video : true,
                audio : false
            },
            function (stream) {
                if ( navigator.mozGetUserMedia ) {
                    video.mozSrcObject = stream;
                } else {
                    let vendorURL = window.URL || window.webkitURL;
                    video.src = vendorURL.createObjectURL(stream);
                }
                video.play();
            },
            function (err) {
                console.log("An error occured! " + err);
            }
        );
        
    });
});