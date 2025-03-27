export function applyHairTextureOverlay(option, modelSetting, modelHomeDir, textureManager, renderer, onComplete) {
    const usePremultiply = true;
    const textureCount = modelSetting.getTextureCount();
    let loadedCount = 0; // compteur de textures chargées

    // Fonction utilitaire pour formater l'indice en 2 chiffres (ex: 0 -> "00")
    const pad = (index) => index.toString().padStart(2, '0');

    for (let i = 0; i < textureCount; i++) {
        const baseTextureFile = modelSetting.getTextureFileName(i);

        if (!baseTextureFile) {
            console.log('getTextureFileName null pour le slot ' + i);
            continue;
        }
        
        // Construction des chemins de texture
        const baseTexturePath = modelHomeDir + baseTextureFile;
        const overlayDir = baseTexturePath.split("/").slice(0, -1).join("/");
        const overlayTexturePath = overlayDir + "/hairs/" + option + "_" + pad(i) + ".png";
        
        // console.log('Base texture path :', baseTexturePath);
        // console.log('Overlay texture path :', overlayTexturePath);
        
        // Fusion des deux images via mergeImages (doit retourner une Promise résolvant en dataURL)
        textureManager.mergeImages(baseTexturePath, overlayTexturePath)
            .then((mergedDataUrl) => {
                // Callback lorsque l'image fusionnée est chargée dans le renderer
                const onLoad = (textureInfo) => {
                    renderer.bindTexture(i, textureInfo.id);
                    loadedCount++;
                    if (loadedCount >= textureCount && typeof onComplete === 'function') {
                        onComplete();
                    }
                };

                // Charge l'image fusionnée (dataURL) comme texture
                textureManager.createTextureFromPngFile(mergedDataUrl, usePremultiply, onLoad);
                renderer.setIsPremultipliedAlpha(usePremultiply);
            })
            .catch((err) => {
                console.error('Erreur lors de la fusion des textures pour le slot ' + i, err);
            });
    }
}
