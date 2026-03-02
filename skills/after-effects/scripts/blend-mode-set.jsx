// blend-mode-set.jsx — Set blending mode on selected layers
// Args: {
//   "mode": "SCREEN"    — BlendingMode enum key: SCREEN, MULTIPLY, ADD, OVERLAY, etc.
// }
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    app.beginUndoGroup("AE Assistant: Set Blend Mode");
    try {
        var args = readArgs();
        var comp = getActiveComp();
        if (!comp) return;

        var layers = comp.selectedLayers;
        if (layers.length === 0) {
            writeResult({ error: "Select at least one layer" });
            return;
        }

        var modeName = args.mode;
        if (!modeName) {
            writeResult({ error: "Provide a blend mode name (e.g. SCREEN, MULTIPLY, ADD, OVERLAY)" });
            return;
        }

        // Resolve the BlendingMode enum value
        var blendMode = BlendingMode[modeName];
        if (blendMode === undefined) {
            // List valid modes for the error message
            var valid = [];
            for (var key in BlendingMode) {
                valid.push(key);
            }
            writeResult({ error: "Unknown blend mode: " + modeName + ". Valid: " + valid.join(", ") });
            return;
        }

        var changed = [];
        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            var isLocked = layer.locked;
            layer.locked = false;
            layer.blendingMode = blendMode;
            layer.locked = isLocked;
            changed.push({ name: layer.name, index: layer.index });
        }

        writeResult({
            success: true,
            message: "Set blend mode to " + modeName + " on " + changed.length + " layer(s)",
            mode: modeName,
            count: changed.length,
            layers: changed
        });
    } catch (e) {
        try { writeResult({ error: e.toString(), line: e.line, fileName: e.fileName }); }
        catch (e2) { writeError(e.toString(), "line:" + e.line); }
    } finally {
        app.endUndoGroup();
    }
})();
