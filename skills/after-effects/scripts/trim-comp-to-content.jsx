// trim-comp-to-content.jsx — Trim/extend comp duration to fit layer content
// Args: {
//   "padding": 0,         — seconds of padding added to both ends (default 0)
//   "recursive": false     — also trim nested precomps (default false)
// }
// Output: /tmp/ae-assistant-result.json

#include "lib/json2.jsx"
#include "lib/utils.jsx"

(function() {
    app.beginUndoGroup("AE Assistant: Trim Comp to Content");
    try {
        var args = readArgs();
        var comp = getActiveComp();
        if (!comp) return;

        var padding = args.padding || 0;
        var recursive = args.recursive === true;
        var trimmed = [];

        function trimComp(c) {
            if (c.numLayers === 0) return;

            var minIn = Infinity;
            var maxOut = -Infinity;
            for (var i = 1; i <= c.numLayers; i++) {
                var layer = c.layer(i);
                if (layer.inPoint < minIn) minIn = layer.inPoint;
                if (layer.outPoint > maxOut) maxOut = layer.outPoint;
            }

            if (minIn === Infinity || maxOut === -Infinity) return;

            var newStart = Math.max(0, minIn - padding);
            var newDuration = (maxOut + padding) - newStart;
            if (newDuration <= 0) return;

            c.workAreaStart = newStart;
            c.workAreaDuration = newDuration;
            c.duration = newStart + newDuration;

            trimmed.push({
                name: c.name,
                duration: Math.round(newDuration * 1000) / 1000,
                contentRange: [Math.round(minIn * 1000) / 1000, Math.round(maxOut * 1000) / 1000]
            });

            if (recursive) {
                for (var j = 1; j <= c.numLayers; j++) {
                    var lyr = c.layer(j);
                    try {
                        if (lyr.source instanceof CompItem) {
                            trimComp(lyr.source);
                        }
                    } catch (e) {}
                }
            }
        }

        trimComp(comp);

        writeResult({
            success: true,
            message: "Trimmed " + trimmed.length + " comp(s) to content" +
                     (padding > 0 ? " with " + padding + "s padding" : ""),
            comps: trimmed
        });
    } catch (e) {
        try { writeResult({ error: e.toString(), line: e.line, fileName: e.fileName }); }
        catch (e2) { writeError(e.toString(), "line:" + e.line); }
    } finally {
        app.endUndoGroup();
    }
})();
