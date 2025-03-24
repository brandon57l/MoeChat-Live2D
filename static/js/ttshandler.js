export function fetchTTS(text, model) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: "/synthesize", // Ton URL API de synthèse vocale
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify({ text: text, voice: "zf_xiaobei" }), // Ton texte à convertir en audio
            xhrFields: {
                responseType: "blob", // S'assurer que la réponse est de type blob
            },
            success: function (response) {
                if (!response || response.size === 0) {
                    console.error("Réponse vide de l'API TTS.");
                    reject(new Error("Réponse vide de l'API TTS"));
                    return;
                }

                // Crée un lien blob pour l'audio
                const blobUrl = URL.createObjectURL(response);
                console.log("Lien blob généré :", blobUrl);

                // Sélectionne toujours le dernier élément avec la classe 'audioIconContainer'
                const lastAudioIconContainer = $(".audioIconContainer").last();

                // Stocke le lien blob dans le dernier élément sélectionné
                lastAudioIconContainer.data("audio-url", blobUrl);

                // Gère l'événement de clic pour jouer l'audio
                lastAudioIconContainer.off("click").on("click", function () {
                    var audioUrl = $(this).data("audio-url");
                    if (audioUrl) {
                        model.startLive2DSpeech(audioUrl);
                    } else {
                        console.error("Aucun audio n'est associé à cet élément.");
                    }
                });

                // Résout la promesse avec le blob URL
                resolve(blobUrl);
            },
            error: function (xhr, status, error) {
                console.error("Erreur lors de la synthèse vocale :", error);
                reject(new Error("Erreur lors de la synthèse vocale"));
            }
        });
    });
}
