import { LAppDelegate } from '../live2d-script/lappdelegate.js';
import * as LAppDefine from '../live2d-script/lappdefine.js';
import { LAppModel } from '../live2d-script/lappmodel.js';

/**
 * ブラウザロード後の処理
 */
window.addEventListener(
  'load',
   () => {
    // Initialize WebGL and create the application instance
    if (!LAppDelegate.getInstance().initialize()) {
      return;
    }

    LAppDelegate.getInstance().run();

  },
  { passive: true }
);

/**
 * 終了時の処理
 */
window.addEventListener(
  'beforeunload',
  () => LAppDelegate.releaseInstance(),
  { passive: true }
);