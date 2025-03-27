import { showNotification } from '../js/notificationhandler.js';
                


// Variable globale pour stocker l'historique de la conversation
var conversationHistory = [];

export async function fetchLLM() {
    // Récupère et vérifie le message
    var messageText = $("#message-input").val().trim();
    if (messageText === "") return;

    // Ajoute le message de l'utilisateur à l'historique
    conversationHistory.push({ text: "User : "+messageText, sender: "user" });

    // Affichage immédiat du message envoyé
    var sentMessageHtml = `
    <div class="d-flex flex-column align-items-end">
        <div class="message sent shadow-box">
            <div class="mb-0">${messageText}</div>
        </div>
    </div>`;
    $("#chat-box").append(sentMessageHtml);
    $("#chat-box").animate({ scrollTop: $("#chat-box")[0].scrollHeight }, 500);
    $("#message-input").val(""); // Efface le champ de saisie
    
    // Prépare l'historique à envoyer
    var historyToSend = JSON.stringify(
        conversationHistory.map(function (msg) {
            return { text: msg.text };
        })
    );

    // Effectue la requête AJAX de manière asynchrone
    try {
        let data = await $.ajax({
            url: "send_message", // Assurez-vous que l'URL est correcte
            type: "POST",
            data: { message: messageText, history: historyToSend },
        });

        if(data.warning){
            showNotification("Warning",data.warning,10000, "warning")
            return;
        }
        
        if(data.error){
            showNotification("Error",data.error,10000, "error")
            return;
        }
        
        if (data.gemini_response) {
            var geminiResponseText = data.gemini_response.parts[0].text;


            
            // Enlève les balises ```json et ``` si elles sont présentes
            geminiResponseText = geminiResponseText.replace("```json", "").replace("```", "").trim();

            // Tente de parser la réponse JSON
            try {
                const jsonResponse = JSON.parse(geminiResponseText);

                // Partie du code dans le try qui traite la réponse JSON
                if (jsonResponse.hasOwnProperty('cn') && jsonResponse.hasOwnProperty('en') && jsonResponse.hasOwnProperty('fr')) {
                    const cnText = jsonResponse.cn; // Récupère le texte chinois
                    const enText = jsonResponse.en; // Récupère le texte anglais
                    const frText = jsonResponse.fr; // Récupère le texte français
                
                    // Affichage du message avec animation améliorée
                    var receivedMessageHtml = `
                        <div class="d-flex flex-row align-items-center">
                            <div class="message received shadow-box" style="cursor: pointer;">
                                <div class="mb-0">
                                    <div class="cn-text" style="display:block">${cnText}</div>
                                    <div class="translations" style="color:#dce1de">
                                        <!--🇬🇧 : ${enText}
                                        <br>-->
                                        🇫🇷 : ${frText}
                                    </div>
                                </div>
                            </div>
                            <div class="d-flex flex-column align-items-center;" style="z-index:1">
                                <div class="no-close-keyboard audioIconContainer" onclick="">
                                    <svg class="svgAudiIconBtn" width="13" height="13"></svg>
                                </div>
                            </div>
                        </div>`;
                
                    // Ajout du message au chat
                    $("#chat-box").append(receivedMessageHtml);
                
                    // Animation du scroll améliorée
                    $("#chat-box").animate({ scrollTop: $("#chat-box")[0].scrollHeight }, { duration: 300, queue: false });
                
                    // Variables pour la détection de l'appui long
                    var longPressTimer;
                    var longPressThreshold = 600; // durée en ms
                
                    // Gestion de l'appui long et du clic sur le dernier message ajouté
                    $("#chat-box .message.received").last()
                        // Début de l'appui
                        .on("mousedown touchstart", function(e) {
                            var $thisMessage = $(this);
                            // Démarre le timer pour l'appui long
                            longPressTimer = setTimeout(function() {
                                // Appui long détecté : copie le texte chinois
                                var textToCopy = $thisMessage.find(".cn-text").text();
                                if (navigator.clipboard && navigator.clipboard.writeText) {
                                    navigator.clipboard.writeText(textToCopy).then(function() {
                                        console.log("Texte chinois copié :", textToCopy);
                                    }).catch(function(err) {
                                        console.error("Erreur lors de la copie :", err);
                                    });
                                } else {
                                    // Fallback pour d'anciens navigateurs
                                    var $tempInput = $("<input>");
                                    $("body").append($tempInput);
                                    $tempInput.val(textToCopy).select();
                                    document.execCommand("copy");
                                    $tempInput.remove();
                                }
                                // Optionnel : afficher un feedback visuel (ex. un toast) ici
                            }, longPressThreshold);
                        })
                        // Fin de l'appui long ou annulation si le mouvement sort de l'élément
                        .on("mouseup mouseleave touchend", function(e) {
                            clearTimeout(longPressTimer);
                        })
                        // Gestion du clic simple pour afficher/masquer la traduction
                        .on("click", function(e) {
                            // Si l'événement long press a été déclenché, on empêche l'action click
                            if (e.handled === true) {
                                return;
                            }
                            var translations = $(this).find(".translations");
                        
                            if (translations.hasClass("show")) {
                                // Masquage de l'élément : on fixe la hauteur, puis on la ramène à 0
                                translations.css("max-height", translations[0].scrollHeight + "px"); // Fixe la hauteur actuelle
                                setTimeout(() => {
                                    translations.css({ "max-height": "0", "opacity": "0" });
                                }, 10);
                            
                                // Après la fin de la transition, on cache complètement l'élément
                                setTimeout(() => {
                                    translations.css("display", "none");
                                    translations.removeClass("show");
                                }, 300); // Durée de la transition (doit correspondre à celle du CSS)
                            } else {
                                // Affichage de l'élément : on démarre avec display block mais avec max-height et opacité à 0
                                translations.css({ "display": "block", "max-height": "0", "opacity": "0" });
                                
                                // Forcer une reflow pour que le navigateur prenne bien en compte l'état initial
                                translations[0].offsetHeight;
                            
                                // Ensuite, on déclenche la transition pour que l'élément se déploie et s'affiche en fondu
                                setTimeout(() => {
                                    translations.css({ "max-height": translations[0].scrollHeight + "px", "opacity": "1" });
                                }, 10);
                                translations.addClass("show");
                            }
                        });

                    // Met à jour l'historique avec la réponse de Gemini (JSON entière)
                    conversationHistory.push({ text: "Haru : "+cnText+". Animation "+jsonResponse.anim, sender: "gemini" });  // Stocke le JSON

                    console.log("Réponse JSON de Gemini:", jsonResponse);

                    data.tokens = Math.round(data.tokens / 1000);
                    $(".tokens-container").contents().first().replaceWith(data.tokens);

                    return jsonResponse;
                }
                else {
                    console.error("Réponse JSON incomplète. Clés 'cn', 'en', ou 'fr' manquantes.");
                    // Gérer le cas où le JSON est incomplet (afficher un message d'erreur, utiliser une valeur par défaut, etc.)
                    var receivedMessageHtml = `
                        <div class="d-flex flex-column align-items-start">
                            <div class="message received">
                                <div class="mb-0">Erreur: Réponse incomplète du chatbot.</div>
                            </div>
                        </div>`;
                    $("#chat-box").append(receivedMessageHtml);
                    $("#chat-box").animate({ scrollTop: $("#chat-box")[0].scrollHeight }, 500);
                    conversationHistory.push({ text: "Réponse JSON incomplète du chatbot.", sender: "gemini" });

                    showNotification("Warning","Réponse incomplète du chatbot.",5000, "warning")

                    return null;
                }

            } catch (error) {
                console.error("Erreur lors de l'analyse de la réponse JSON:", error);

                // Afficher l'erreur à l'utilisateur
                var receivedMessageHtml = `
                    <div class="d-flex flex-column align-items-start">
                        <div class="message received">
                            <div class="mb-0">Erreur: Impossible de comprendre la réponse du chatbot.  Réponse brute: ${geminiResponseText}</div>
                        </div>
                    </div>`;
                $("#chat-box").append(receivedMessageHtml);
                $("#chat-box").animate({ scrollTop: $("#chat-box")[0].scrollHeight }, 500);
                conversationHistory.push({ text: "Erreur lors de l'analyse de la réponse JSON. Réponse brute:" + geminiResponseText, sender: "gemini" }); // Stocke la reponse brute
                
                showNotification("Warning","Réponse incomplète du chatbot.",5, "warning")
                return null;
            }
        }
    } catch (error) {
        console.log("Une erreur est survenue lors de l'envoi du message.", error);
        showNotification("Error","Une erreur est survenue lors de l'envoi du message.",5000, "error")
        return null;
    }
}