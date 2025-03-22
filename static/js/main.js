import { LAppDelegate } from '../live2d-script/lappdelegate.js';
import * as LAppDefine from '../live2d-script/lappdefine.js';
import { LAppModel } from '../live2d-script/lappmodel.js';

window.addEventListener(
  'load',
  () => {
    // Créer et afficher le loader
    const loader = document.querySelector("#loading");

    // Assigner un ID au canvas généré automatiquement
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.id = 'live2dCanvas';
    } else {
      console.error("Aucun canvas trouvé !");
    }

    // Initialiser l'application Live2D
    if (!LAppDelegate.getInstance().initialize()) {
      return;
    }
    LAppDelegate.getInstance().run();

    // Masquer le loader après 2 secondes (adapter si besoin)
    setTimeout(() => {
      loader.style.display = 'none';
    }, 2000);
  },
  { passive: true }
);

window.addEventListener(
  'beforeunload',
  () => LAppDelegate.releaseInstance(),
  { passive: true }
);
