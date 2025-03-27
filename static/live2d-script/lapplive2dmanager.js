import { CubismMatrix44 } from './framework/src/math/cubismmatrix44.js';
import { csmVector } from './framework/src/type/csmvector.js';
import * as LAppDefine from './lappdefine.js';
import { LAppModel } from './lappmodel.js';
import { LAppPal } from './lapppal.js';


import { fetchTTS } from "../js/ttshandler.js";
import { fetchLLM } from "../js/llmhandler.js";

export class LAppLive2DManager {
    static instance = null;
    

    static getInstance() {
        if (!LAppLive2DManager.instance) {
            LAppLive2DManager.instance = new LAppLive2DManager();
        }
        return LAppLive2DManager.instance;
    }
    
    // Retourne l'instance du modèle Live2D
    getModel() {
        return this._models.at(0) || null;
    }

    releaseAllModel() {
        this._models.clear();
    }
    onDrag(x, y) {
        const model = this.getModel();
        if (model) {
            model.setDragging(x, y);
        }
    }
    onTap(x, y) {
        // if (LAppDefine.DebugLogEnable) {
        //     LAppPal.printMessage(`[APP]tap point: {x: ${x.toFixed(2)} y: ${y.toFixed(2)}}`);
        // }
        // const model = this.getModel();
        // if (model.hitTest(LAppDefine.HitAreaNameHead, x, y)) {
        //     if (LAppDefine.DebugLogEnable) {
        //         LAppPal.printMessage(`[APP]hit area: [${LAppDefine.HitAreaNameHead}]`);
        //     }
        //     model.setRandomExpression();
        // }
        // else if (model.hitTest(LAppDefine.HitAreaNameBody, x, y)) {
        //     if (LAppDefine.DebugLogEnable) {
        //         LAppPal.printMessage(`[APP]hit area: [${LAppDefine.HitAreaNameBody}]`);
        //     }
        //     model.startRandomMotion(
        //         LAppDefine.MotionGroupTapBody,
        //         LAppDefine.PriorityNormal,
        //         this.finishedMotion,
        //         this.beganMotion
        //     );
        // }
    }
    onUpdate() {
        const { width, height } = this._subdelegate.getCanvas();
        const projection = new CubismMatrix44();
        const model = this.getModel();
        if (model.getModel()) {
            if (model.getModel().getCanvasWidth() > 1.0 && width < height) {
                model.getModelMatrix().setWidth(2.0);
                projection.scale(1.0, width / height);
            }
            else {
                projection.scale(height / width, 1.0);
            }
            if (this._viewMatrix != null) {
                projection.multiplyByMatrix(this._viewMatrix);
            }
        }
        model.update();
        model.draw(projection);
    }
    nextScene() {
        const no = (this._sceneIndex + 1) % LAppDefine.ModelDirSize;
        this.changeScene(no);
    }
    changeScene(index) {
        this._sceneIndex = index;
        if (LAppDefine.DebugLogEnable) {
            LAppPal.printMessage(`[APP]model index: ${this._sceneIndex}`);
        }
        const model = LAppDefine.ModelDir[index];
        const modelPath = LAppDefine.ResourcesPath + model + '/';
        let modelJsonName = LAppDefine.ModelDir[index] + '.model3.json';
        this.releaseAllModel();
        const instance = new LAppModel();
        instance.setSubdelegate(this._subdelegate);
        instance.loadAssets(modelPath, modelJsonName);
        this._models.pushBack(instance);
    }
    setViewMatrix(m) {
        for (let i = 0; i < 16; i++) {
            this._viewMatrix.getArray()[i] = m.getArray()[i];
        }
    }
    addModel(sceneIndex = 0) {
        this._sceneIndex = sceneIndex;
        this.changeScene(this._sceneIndex);
    }

    constructor() {
        this.beganMotion = (self) => {
            LAppPal.printMessage('Motion Began:');
            console.log(self);
        };
        this.finishedMotion = (self) => {
            LAppPal.printMessage('Motion Finished:');
            console.log(self);
        };
        this._subdelegate = null;
        this._viewMatrix = new CubismMatrix44();
        this._models = new csmVector();
        this._sceneIndex = 0;
    }
    
    release() { }
    initialize(subdelegate) {
        this._subdelegate = subdelegate;
        this.changeScene(this._sceneIndex);
    
        // Conserver la référence à l'instance courante
        const manager = this;

        $(".item-color").on("click", function (event) {
            const model = manager.getModel();
            if (!model) {
                console.error("Aucun modèle Live2D n'a été chargé !");
                return;
            }
        
            const type = $(this).data("type");
            const option = $(this).data("color");
            
            if (!option) {
                console.warn("Aucune couleur sélectionnée !");
                return;
            }
        
            // Appliquer la texture correspondante
            model.setTextureVariant(type, option);
        });

        const clipMode = $("#clip")
        if (clipMode) {
            clipMode.on("click", async (event) => {
                try {
                    // Récupérer les paramètres de l'URL
                    const urlParams = new URLSearchParams(window.location.search);
                    const cn = urlParams.get("cn");
                    const anim = urlParams.get("anim");
    
                    if (!cn || !anim) {
                        console.error("Paramètres cn ou anim manquants dans l'URL !");
                        return;
                    }
    
                    // Récupère l'instance du modèle via le manager
                    const model = manager.getModel();
    
                    if (!model) {
                        console.error("Aucun modèle Live2D n'a été chargé !");
                        return;
                    }
    
                    // Appel de la synthèse vocale avec le paramètre cn
                    const audioURL = await fetchTTS(cn, model);
    
                    // Démarre l'animation avec le numéro récupéré depuis l'URL
                    model.startLive2DSpeech(audioURL, anim);
    
                } catch (error) {
                    console.error("Erreur lors de l'appel à fetchTTS() :", error);
                }
            });
        }
        
        
        $("#orange").on("click", function () {
            const model = manager.getModel();
            if (!model) {
                console.error("Aucun modèle Live2D n'a été chargé !");
                return;
            }
            model.setTextureVariant("carrot_orange");
        });
        

        $("#message-form").submit(async (event) => {
            event.preventDefault(); // Empêche la soumission classique du formulaire
            
            try {
                const llmResponse = await fetchLLM();
                
                if (!llmResponse || typeof llmResponse !== "object") {
                    console.error("fetchLLM() n'a pas renvoyé un texte valide.");
                    return;
                }
    
                // Récupère l'instance du modèle via le manager
                const model = manager.getModel();
                if (!model) {
                    console.error("Aucun modèle Live2D n'a été chargé !");
                    return;
                }
                
                // Appel de la synthèse vocale
                const audioURL = await fetchTTS(llmResponse.cn, model);
                
                model.startLive2DSpeech(audioURL,llmResponse.anim)
                
            } catch (error) {
                console.error("Erreur lors de l'appel à fetchLLM() :", error);
            }
        });
    }
    
}
//# sourceMappingURL=lapplive2dmanager.js.map


