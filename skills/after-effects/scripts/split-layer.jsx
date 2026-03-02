// split-layer.jsx — Split selected layers at CTI or specified time
// Args: {
//   "time": null    — split time in seconds (default: comp.time / CTI)
// }
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    app.beginUndoGroup("AE Assistant: Split Layer");
    try {
        var args = readArgs();
        var comp = getActiveComp();
        if (!comp) return;

        var layers = comp.selectedLayers;
        if (layers.length === 0) {
            writeResult({ error: "Select at least one layer to split" });
            return;
        }

        var splitTime = (args.time !== undefined && args.time !== null) ? args.time : comp.time;

        // Collect targets first — indices shift during duplication
        var targets = [];
        for (var i = 0; i < layers.length; i++) {
            targets.push(layers[i]);
        }

        var split = [];

        for (var t = 0; t < targets.length; t++) {
            var layer = targets[t];

            // Validate split time is within layer range
            if (splitTime <= layer.inPoint || splitTime >= layer.outPoint) {
                continue; // Skip layers where split time is outside their range
            }

            var isLocked = layer.locked;
            layer.locked = false;

            // Duplicate the layer (creates the "after" portion)
            var dup = layer.duplicate();

            // Original: trim outPoint to split time
            layer.outPoint = splitTime;

            // Duplicate: trim inPoint to split time
            dup.inPoint = splitTime;

            layer.locked = isLocked;
            dup.locked = isLocked;

            split.push({
                original: layer.name,
                duplicate: dup.name,
                splitAt: Math.round(splitTime * 1000) / 1000
            });
        }

        if (split.length === 0) {
            writeResult({ error: "No layers could be split at time " + splitTime + "s — CTI must be within each layer's in/out range" });
            return;
        }

        writeResult({
            success: true,
            message: "Split " + split.length + " layer(s) at " + (Math.round(splitTime * 1000) / 1000) + "s",
            count: split.length,
            layers: split
        });
    } catch (e) {
        try { writeResult({ error: e.toString(), line: e.line, fileName: e.fileName }); }
        catch (e2) { writeError(e.toString(), "line:" + e.line); }
    } finally {
        app.endUndoGroup();
    }
})();
