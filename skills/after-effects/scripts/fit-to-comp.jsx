// fit-to-comp.jsx — Scale selected layers to fit/fill comp dimensions
// Args: {
//   "mode": "fit"    — "fit" (letterbox), "fill" (crop), "stretch" (non-uniform)
// }
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    app.beginUndoGroup("AE Assistant: Fit to Comp");
    try {
        var args = readArgs();
        var comp = getActiveComp();
        if (!comp) return;

        var layers = comp.selectedLayers;
        if (layers.length === 0) {
            writeResult({ error: "Select at least one layer" });
            return;
        }

        var mode = args.mode || "fit";
        var fitted = [];

        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            var isLocked = layer.locked;
            layer.locked = false;

            // Get source dimensions via sourceRectAtTime
            var rect = layer.sourceRectAtTime(comp.time, false);
            var srcW = rect.width;
            var srcH = rect.height;

            if (srcW <= 0 || srcH <= 0) {
                layer.locked = isLocked;
                continue;
            }

            var scaleProp = layer.property("ADBE Transform Group").property("ADBE Scale");
            var currentScale = scaleProp.value;

            // Calculate actual pixel size at current scale
            var actualW = srcW * (currentScale[0] / 100);
            var actualH = srcH * (currentScale[1] / 100);

            var newScaleX, newScaleY, ratio;

            if (mode === "fit") {
                ratio = Math.min(comp.width / actualW, comp.height / actualH);
                newScaleX = currentScale[0] * ratio;
                newScaleY = currentScale[1] * ratio;
            } else if (mode === "fill") {
                ratio = Math.max(comp.width / actualW, comp.height / actualH);
                newScaleX = currentScale[0] * ratio;
                newScaleY = currentScale[1] * ratio;
            } else if (mode === "stretch") {
                newScaleX = currentScale[0] * (comp.width / actualW);
                newScaleY = currentScale[1] * (comp.height / actualH);
            } else {
                writeResult({ error: "Unknown mode: " + mode + ". Use: fit, fill, stretch" });
                return;
            }

            scaleProp.setValue([newScaleX, newScaleY]);

            // Center the layer in comp
            var posProp = layer.property("ADBE Transform Group").property("ADBE Position");
            posProp.setValue([comp.width / 2, comp.height / 2]);

            // Compensate for anchor point offset
            var anchorProp = layer.property("ADBE Transform Group").property("ADBE Anchor Point");
            var anchor = anchorProp.value;
            var rectCenter = [rect.left + rect.width / 2, rect.top + rect.height / 2];
            var offsetX = (rectCenter[0] - anchor[0]) * (newScaleX / 100);
            var offsetY = (rectCenter[1] - anchor[1]) * (newScaleY / 100);
            posProp.setValue([comp.width / 2 + offsetX, comp.height / 2 + offsetY]);

            layer.locked = isLocked;
            fitted.push({
                name: layer.name,
                scale: [Math.round(newScaleX * 10) / 10, Math.round(newScaleY * 10) / 10]
            });
        }

        writeResult({
            success: true,
            message: mode.charAt(0).toUpperCase() + mode.substring(1) + " " + fitted.length + " layer(s) to comp",
            mode: mode,
            layers: fitted
        });
    } catch (e) {
        try { writeResult({ error: e.toString(), line: e.line, fileName: e.fileName }); }
        catch (e2) { writeError(e.toString(), "line:" + e.line); }
    } finally {
        app.endUndoGroup();
    }
})();
