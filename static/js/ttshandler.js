// ttshandler.js

export function fetchTTS(text,model) {
    $.ajax({
        url: "/synthesize",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({ text: text ,voice: "zf_xiaobei" }),
        xhrFields: {
            responseType: "blob",
        },
        success: function (response) {
            if (!response || response.size === 0) {
                console.error("Réponse vide de l'API TTS.");
                return;
            }
            const wavUrl = URL.createObjectURL(response);
            
            
            if (model) {
                model.startLive2DSpeech(wavUrl);
            } else {
                console.error("Aucun modèle Live2D n'a été chargé !");
            }
        },
        error: function (xhr, status, error) {
            console.error("Erreur lors de la synthèse vocale:", error);
        }
    });
}
