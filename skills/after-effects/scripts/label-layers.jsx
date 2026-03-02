// label-layers.jsx — Batch-set label colors on layers
// Args: {
//   "label": 3,              — label color index 0-16 (0 = none)
//   "target": "selected",    — "selected", "all", or type: "text", "shape", "solid", etc.
//   "nameContains": ""       — optional filter by layer name
// }
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    app.beginUndoGroup("AE Assistant: Label Layers");
    try {
        var args = readArgs();
        var comp = getActiveComp();
        if (!comp) return;

        var label = args.label;
        if (label === undefined || label < 0 || label > 16) {
            writeResult({ error: "Provide a label color index 0-16" });
            return;
        }

        var target = args.target || "selected";
        var nameContains = args.nameContains ? args.nameContains.toLowerCase() : null;
        var labeled = [];

        var typeTargets = ["text", "shape", "solid", "null", "adjustment", "camera",
                          "light", "precomp", "footage", "audio", "guide"];
        var isTypeTarget = false;
        for (var t = 0; t < typeTargets.length; t++) {
            if (target === typeTargets[t]) { isTypeTarget = true; break; }
        }

        for (var i = 1; i <= comp.numLayers; i++) {
            var layer = comp.layer(i);
            var include = false;

            if (target === "selected") {
                include = layer.selected;
            } else if (target === "all") {
                include = true;
            } else if (isTypeTarget) {
                include = (getLayerType(layer) === target);
            }

            // Apply name filter if set
            if (include && nameContains) {
                if (layer.name.toLowerCase().indexOf(nameContains) === -1) {
                    include = false;
                }
            }

            if (include) {
                layer.label = label;
                labeled.push({ name: layer.name, index: layer.index });
            }
        }

        writeResult({
            success: true,
            message: "Set label " + label + " on " + labeled.length + " layer(s)",
            label: label,
            count: labeled.length,
            layers: labeled
        });
    } catch (e) {
        try { writeResult({ error: e.toString(), line: e.line, fileName: e.fileName }); }
        catch (e2) { writeError(e.toString(), "line:" + e.line); }
    } finally {
        app.endUndoGroup();
    }
})();
