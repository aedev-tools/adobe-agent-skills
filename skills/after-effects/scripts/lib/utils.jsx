// utils.jsx — Shared helpers for AE Assistant query scripts
// All query scripts #include this file

// Write JSON result to temp output file
function writeResult(obj) {
    var jsonStr = JSON.stringify(obj);
    var outFile = new File("/tmp/ae-assistant-result.json");
    outFile.encoding = "UTF-8";
    outFile.open("w");
    outFile.write(jsonStr);
    outFile.close();
}

// Write error even if JSON.stringify fails — last-resort error capture
function writeError(message, detail) {
    var errStr = '{"error":' + '"' + String(message).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
    if (detail) {
        errStr += ',"detail":"' + String(detail).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
    }
    errStr += '}';
    var outFile = new File("/tmp/ae-assistant-result.json");
    outFile.encoding = "UTF-8";
    outFile.open("w");
    outFile.write(errStr);
    outFile.close();
}

// Append to persistent log file
function appendLog(message) {
    var logFile = new File("~/.ae-assistant-extendscript.log");
    logFile.encoding = "UTF-8";
    logFile.open("a");
    logFile.writeln("[" + new Date().toString() + "] " + message);
    logFile.close();
}

// Read arguments from temp input file
function readArgs() {
    var argFile = new File("/tmp/ae-assistant-args.json");
    if (!argFile.exists) return {};
    argFile.encoding = "UTF-8";
    argFile.open("r");
    var content = argFile.read();
    argFile.close();
    if (!content || content.length === 0) return {};
    return JSON.parse(content);
}

// Detect layer type string
function getLayerType(layer) {
    switch (layer.matchName) {
        case "ADBE Vector Layer": return "shape";
        case "ADBE Text Layer": return "text";
        case "ADBE Camera Layer": return "camera";
        case "ADBE Light Layer": return "light";
        case "ADBE AV Layer":
            if (layer.nullLayer) return "null";
            if (layer.adjustmentLayer) return "adjustment";
            if (layer.guideLayer) return "guide";
            try {
                if (layer.source instanceof CompItem) return "precomp";
                if (layer.source.mainSource instanceof SolidSource) return "solid";
                if (layer.source.mainSource instanceof PlaceholderSource) return "placeholder";
                if (layer.source.mainSource instanceof FileSource) {
                    if (layer.source.footageMissing) return "missing";
                    if (!layer.source.hasVideo && layer.source.hasAudio) return "audio";
                    return "footage";
                }
            } catch(e) {}
            return "av";
        default: return "unknown";
    }
}

// Get blend mode display name
function getBlendModeName(mode) {
    for (var key in BlendingMode) {
        if (BlendingMode[key] === mode) return key;
    }
    return "unknown";
}

// Get active comp or write error and return null
function getActiveComp() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        writeResult({ error: "No active composition" });
        return null;
    }
    return comp;
}

// Get selected layers, or all layers if none selected
function getSelectedOrAllLayers(comp) {
    var layers = comp.selectedLayers;
    if (layers.length > 0) return layers;
    var all = [];
    for (var i = 1; i <= comp.numLayers; i++) {
        all.push(comp.layer(i));
    }
    return all;
}

// Convert hex color string to [r, g, b] array (0-1 range)
function hexToRGB(hex) {
    hex = hex.replace(/^#/, "");
    if (hex.length === 3) {
        hex = hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2);
    }
    var r = parseInt(hex.substring(0, 2), 16) / 255;
    var g = parseInt(hex.substring(2, 4), 16) / 255;
    var b = parseInt(hex.substring(4, 6), 16) / 255;
    return [r, g, b];
}

// Find comp in project by name
function getCompByName(name) {
    for (var i = 1; i <= app.project.numItems; i++) {
        var item = app.project.item(i);
        if (item instanceof CompItem && item.name === name) return item;
    }
    return null;
}

// Recursive property tree walker — calls leafFn(prop, path) on each leaf property
function walkProperties(group, leafFn, path) {
    if (path === undefined) path = "";
    for (var i = 1; i <= group.numProperties; i++) {
        var prop = group.property(i);
        var propPath = path ? (path + " > " + prop.name) : prop.name;
        if (prop.propertyType === PropertyType.PROPERTY) {
            leafFn(prop, propPath);
        } else if (prop.propertyType === PropertyType.INDEXED_GROUP ||
                   prop.propertyType === PropertyType.NAMED_GROUP) {
            walkProperties(prop, leafFn, propPath);
        }
    }
}

// ES3-compatible bubble sort (in-place)
function bubbleSort(arr, compareFn) {
    for (var i = 0; i < arr.length - 1; i++) {
        for (var j = i + 1; j < arr.length; j++) {
            if (compareFn(arr[j], arr[i]) < 0) {
                var tmp = arr[i];
                arr[i] = arr[j];
                arr[j] = tmp;
            }
        }
    }
    return arr;
}

// Convert frame count to seconds using comp's frame duration
function framesToSeconds(frames, comp) {
    return frames * comp.frameDuration;
}
