import Atspi from "gi://Atspi";
import Gdk from "gi://Gdk";

import {
  Extension,
  InjectionManager,
} from "resource:///org/gnome/shell/extensions/extension.js";
import * as AltTab from "resource:///org/gnome/shell/ui/altTab.js";

const allSiblings = [
  { apps: ["crx_cifhbcnohmdccbgoicgdjpfamggdegmo"], mode: "vertical" },
  { apps: ["whatsapp-for-linux", "slack"], mode: "vertical" },
  { apps: ["crx_faolnafnngnfdaknnbpnkhgohbobgegn"], mode: "horizontal" },
];

export default class ExampleExtension extends Extension {
  enable() {
    this._injectionManager = new InjectionManager();

    var _getWindowList = AltTab.WindowSwitcherPopup.prototype._getWindowList;

    this._injectionManager.overrideMethod(
      AltTab.WindowSwitcherPopup.prototype,
      "_getWindowList",
      () => {
        return function () {
          const returnedStuff = _getWindowList.apply(this);
          const filteredApps = returnedStuff.reduce((acc, element) => {
            const identifier = element.get_wm_class_instance();
            const siblings = allSiblings.find((s) =>
              s.apps.includes(identifier)
            );
            if (siblings !== undefined) {
              const allSiblingsApps = returnedStuff.filter((app) =>
                siblings.apps.includes(app.get_wm_class_instance())
              );
              const countOfSiblingsInRunningApps = allSiblingsApps.length;

              if (countOfSiblingsInRunningApps === 2) {
                if (siblings.apps.length === 1) {
                  const lowestStableSequenceOfSiblingApps = allSiblingsApps
                    .map((x) => x.get_stable_sequence())
                    .reduce((x, y) => (x < y ? x : y));
                  if (
                    element.get_stable_sequence() ===
                    lowestStableSequenceOfSiblingApps
                  ) {
                    return [...acc, element];
                  } else {
                    return acc;
                  }
                } else {
                  if (element.get_wm_class_instance() === siblings.apps[0]) {
                    return [...acc, element];
                  } else {
                    return acc;
                  }
                }
              } else {
                return [...acc, element];
              }
            } else {
              return [...acc, element];
            }
          }, []);
          return filteredApps;
        };
      }
    );

    let current_siblings = [];

    function deactivate() {
      const focused_w = global.display.get_focus_window();
      const currentFocus = focused_w.get_wm_class_instance();

      if (current_siblings.includes(currentFocus)) {
        return;
      }

      const siblings = allSiblings.find((s) => s.apps.includes(currentFocus));
      current_siblings = siblings?.apps ?? [];

      if (siblings !== undefined) {
        const allWindows = global.display.list_all_windows();
        allWindows
          .filter(
            (w) =>
              siblings.apps.includes(w.get_wm_class_instance()) &&
              w.get_id() !== focused_w.get_id()
          )
          .forEach((w) => {
            const [first_w, second_w] =
              siblings.apps.indexOf(focused_w.get_wm_class_instance()) ===
              siblings.apps.indexOf(w.get_wm_class_instance())
                ? focused_w.get_stable_sequence() < w.get_stable_sequence()
                  ? [focused_w, w]
                  : [w, focused_w]
                : siblings.apps.indexOf(focused_w.get_wm_class_instance()) <
                  siblings.apps.indexOf(w.get_wm_class_instance())
                ? [focused_w, w]
                : [w, focused_w];
            w.activate(0);

            const [width, height] = global.display.get_size();
            const TOP_BAR_HEIGHT = 64;

            const isVerticalSplit = siblings.mode === "vertical";

            const appWidth = isVerticalSplit ? width / 2 : width;
            const appHeight = isVerticalSplit
              ? height - TOP_BAR_HEIGHT
              : (height - TOP_BAR_HEIGHT) / 2;

            first_w.move_resize_frame(
              false,
              0,
              TOP_BAR_HEIGHT,
              appWidth,
              appHeight
            );
            second_w.move_resize_frame(
              false,
              isVerticalSplit ? width / 2 : 0,
              isVerticalSplit ? TOP_BAR_HEIGHT : TOP_BAR_HEIGHT + height / 2,
              appWidth,
              appHeight
            );
          });
      }
    }

    Atspi.init();
    Atspi.EventListener.register_from_callback(deactivate, "window:deactivate");
  }

  disable() {}
}
