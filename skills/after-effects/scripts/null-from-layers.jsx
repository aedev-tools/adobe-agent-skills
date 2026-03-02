// null-from-layers.jsx — Create null at each selected layer's position and auto-parent
// Args: {
//   "naming": "layer-name",       — "layer-name" (appends " Ctrl"), "custom" (uses prefix), "numbered"
//   "prefix": "Ctrl",             — custom prefix when naming is "custom"
//   "position": "layer-center"    — "layer-center", "layer-anchor", "comp-center"
// }
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    app.beginUndoGroup("AE Assistant: Null from Layers");
    try {
        var args = readArgs();
        var comp = getActiveComp();
        if (!comp) return;

        var layers = comp.selectedLayers;
        if (layers.length === 0) {
            writeResult({ error: "Select at least one layer" });
            return;
        }

        var naming = args.naming || "layer-name";
        var prefix = args.prefix || "Ctrl";
        var posMode = args.position || "layer-center";
        var created = [];

        // Collect layer references first (indices shift as we add nulls)
        var targets = [];
        for (var i = 0; i < layers.length; i++) {
            targets.push(layers[i]);
        }

        for (var t = 0; t < targets.length; t++) {
            var layer = targets[t];
            var isLocked = layer.locked;
            layer.locked = false;

            // Create null
            var nl = comp.layers.addNull();

            // Name it
            if (naming === "layer-name") {
                nl.name = layer.name + " Ctrl";
            } else if (naming === "custom") {
                nl.name = prefix + " " + layer.name;
            } else if (naming === "numbered") {
                nl.name = "Null " + (t + 1);
            }

            // Position the null
            var posProp = nl.property("ADBE Transform Group").property("ADBE Position");

            if (posMode === "layer-center") {
                var rect = layer.sourceRectAtTime(comp.time, false);
                var anchorProp = layer.property("ADBE Transform Group").property("ADBE Anchor Point");
                var layerPos = layer.property("ADBE Transform Group").property("ADBE Position").value;
                var anchor = anchorProp.value;
                var centerX = rect.left + rect.width / 2;
                var centerY = rect.top + rect.height / 2;
                var scaleProp = layer.property("ADBE Transform Group").property("ADBE Scale").value;
                var sx = scaleProp[0] / 100;
                var sy = scaleProp[1] / 100;
                var dx = (centerX - anchor[0]) * sx;
                var dy = (centerY - anchor[1]) * sy;
                posProp.setValue([layerPos[0] + dx, layerPos[1] + dy]);
            } else if (posMode === "layer-anchor") {
                var lPos = layer.property("ADBE Transform Group").property("ADBE Position").value;
                posProp.setValue([lPos[0], lPos[1]]);
            } else if (posMode === "comp-center") {
                posProp.setValue([comp.width / 2, comp.height / 2]);
            }

            // Parent layer to null
            layer.parent = nl;
            layer.locked = isLocked;

            created.push({ nullName: nl.name, layerName: layer.name });
        }

        writeResult({
            success: true,
            message: "Created " + created.length + " null(s) and parented layers",
            nulls: created
        });
    } catch (e) {
        try { writeResult({ error: e.toString(), line: e.line, fileName: e.fileName }); }
        catch (e2) { writeError(e.toString(), "line:" + e.line); }
    } finally {
        app.endUndoGroup();
    }
})();
