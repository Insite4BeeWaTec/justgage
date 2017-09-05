JustGage = function(config) {

    // Create pointer to myself
    var obj = this;

    // Check if config object exists
    if (config === null || config === undefined) return undefined;

    // Get the parent node (by ID or as DOM-Object)
    var node;
    if (config.id !== null && config.id !== undefined) {
        node = document.getElementById(config.id);
        if (!node) {
            console.log('* justgage: No element with id : %s found', config.id);
            return undefined;
        }
    } else if (config.parentNode !== null && config.parentNode !== undefined) {
        node = config.parentNode;
    } else {
        console.log('* justgage: Make sure to pass the existing element id or parentNode to the constructor.');
        return undefined;
    }

    var dataset = {};

    // check for defaults
    var defaults = (config.defaults !== null && config.defaults !== undefined) ? config.defaults : false;
    if (defaults !== false) {
        config = extend({}, config, defaults);
        delete config.defaults;
    }

    // configurable parameters
    obj.config = {
        id: config.id,
        defaults: loadConfiguration('defaults', config, 0),
        parentNode: loadConfiguration('parentNode', config, null),
        width: loadConfiguration('width', config, null),
        height: loadConfiguration('height', config, null),
        reverse: loadConfiguration('reverse', config, false),
        gaugeWidthScale: loadConfiguration('gaugeWidthScale', config, 1.0),
        shadowOpacity: loadConfiguration('shadowOpacity', config, 0.2),
        shadowSize: loadConfiguration('shadowSize', config, 5),
        shadowVerticalOffset: loadConfiguration('shadowVerticalOffset', config, 3),
        donutStartAngle: loadConfiguration('donutStartAngle', config, 90),
        hideInnerShadow: loadConfiguration('hideInnerShadow', config, false),
        donut: loadConfiguration('donut', config, false),
        relativeGaugeSize: loadConfiguration('relativeGaugeSize', config, false),
        counter: loadConfiguration('counter', config, false),
        decimals: loadConfiguration('decimals', config, 0),
        customSectors: loadConfiguration('customSectors', config, []),
        pointer: loadConfiguration('pointer', config, false),
        pointerOptions: loadConfiguration('pointerOptions', config, []),
        backgroundForegroundSwapped: loadConfiguration('backgroundForegroundSwapped', config, false),

        // Animation (Type: https://dmitrybaranovskiy.github.io/raphael/reference.html#Raphael.easing_formulas)
        animationTime: loadConfiguration('animationTime', config, 500),
        animationType: loadConfiguration('animationType', config, 'linear'),

        // Gauge colors
        noGradient: loadConfiguration('noGradient', config, false),
        gaugeColor: loadConfiguration('gaugeColor', config, "#FFFFFF"),
        levelColors: loadConfiguration('levelColors', config, ["#a9d70b", "#f9c802", "#ff0000"], 'array', ','),
        gaugeBorderColor: loadConfiguration('gaugeBorderColor', config, "#404040"),
        levelBorderColor: loadConfiguration('levelBorderColor', config, "#404040"),
        gaugeBorderWidth: loadConfiguration('gaugeBorderWidth', config, 1),
        levelBorderWidth: loadConfiguration('levelBorderWidth', config, 1),

        // Values / Label-Texts
        unit: loadConfiguration('unit', config, ''),
        min: loadConfiguration('min', config, 0, 'float'),
        max: loadConfiguration('max', config, 100, 'float'),
        value: loadConfiguration('value', config, 0, 'float'),

        // Label-Visibility
        hideValue: loadConfiguration('hideValue', config, false),
        hideMin: loadConfiguration('hideMin', config, false),
        hideMax: loadConfiguration('hideMax', config, false),

        // Label-Settings
        labelFontColor: loadConfiguration('labelFontColor', config, "#b3b3b3"),

        valueFontColor: loadConfiguration('valueFontColor', config, "#010101"),
        valueFontSize: loadConfiguration('valueFontSize', config, 16),
        valueFontFamily: loadConfiguration('valueFontFamily', config, "Arial"),
        valueSuffix: loadConfiguration('valueSuffix', config, ''),

        title: loadConfiguration('title', config, ""),
        titleFontColor: loadConfiguration('titleFontColor', config, "#999999"),
        titleFontFamily: loadConfiguration('titleFontFamily', config, "sans-serif"),
        titlePosition: loadConfiguration('titlePosition', config, "above"),

        titleMinFontSize: loadConfiguration('titleMinFontSize', config, 10),
        unitLabelMinFontSize: loadConfiguration('unitLabelMinFontSize', config, 10),
        minLabelMinFontSize: loadConfiguration('minLabelMinFontSize', config, 10),
        maxLabelMinFontSize: loadConfiguration('maxLabelMinFontSize', config, 10),
    };

    // variables
    var
        canvasW,
        canvasH,
        widgetW,
        widgetH,
        aspect,
        dx,
        dy,
        titleFontSize,
        titleX,
        titleY,
        valueFontSize,
        valueX,
        valueY,
        unitFontSize,
        unitX,
        unitY,
        minFontSize,
        minX,
        minY,
        maxFontSize,
        maxX,
        maxY;

    // create canvas
    if (obj.config.id !== null && (document.getElementById(obj.config.id)) !== null) {
        obj.paper = Raphael(obj.config.id, "100%", "100%");
    } else if (obj.config.parentNode !== null) {
        obj.paper = Raphael(obj.config.parentNode, "100%", "100%");
    }

    if (obj.config.relativeGaugeSize === true) {
        obj.paper.setViewBox(0, 0, 200, 150, true);
    }

    // canvas dimensions
    if (obj.config.relativeGaugeSize === true) {
        canvasW = 200;
        canvasH = 150;
    } else if (obj.config.width !== null && obj.config.height !== null) {
        canvasW = obj.config.width;
        canvasH = obj.config.height;
    } else if (obj.config.parentNode !== null) {
        canvasW = obj.config.parentNode.offsetWidth;
        canvasH = obj.config.parentNode.offsetHeight;
        obj.paper.setViewBox(0, 0, canvasW, canvasH, true);
    } else {
        canvasW = getStyle(document.getElementById(obj.config.id), "width").slice(0, -2) * 1;
        canvasH = getStyle(document.getElementById(obj.config.id), "height").slice(0, -2) * 1;
    }

    // widget dimensions
    if (obj.config.donut === true) {

        // width more than height
        if (canvasW > canvasH) {
            widgetH = canvasH;
            widgetW = widgetH;
            // width less than height
        } else if (canvasW < canvasH) {
            widgetW = canvasW;
            widgetH = widgetW;
            // if height don't fit, rescale both
            if (widgetH > canvasH) {
                aspect = widgetH / canvasH;
                widgetH = widgetH / aspect;
                widgetW = widgetH / aspect;
            }
            // equal
        } else {
            widgetW = canvasW;
            widgetH = widgetW;
        }

        // delta
        dx = (canvasW - widgetW) / 2;
        dy = (canvasH - widgetH) / 2;

        // title
        titleFontSize = ((widgetH / 8) > 10) ? (widgetH / 10) : 10;
        titleX = dx + widgetW / 2;
        titleY = dy + widgetH / 11;

        // value
        valueFontSize = ((widgetH / 6.4) > 16) ? (widgetH / 5.4) : 18;
        valueX = dx + widgetW / 2;
        if (obj.config.label !== '') {
            valueY = dy + widgetH / 1.85;
        } else {
            valueY = dy + widgetH / 1.7;
        }

        // label
        unitFontSize = ((widgetH / 16) > 10) ? (widgetH / 16) : 10;
        unitX = dx + widgetW / 2;
        unitY = valueY + unitFontSize;

        // min
        minFontSize = ((widgetH / 16) > 10) ? (widgetH / 16) : 10;
        minX = dx + (widgetW / 10) + (widgetW / 6.666666666666667 * obj.config.gaugeWidthScale) / 2;
        minY = unitY;

        // max
        maxFontSize = ((widgetH / 16) > 10) ? (widgetH / 16) : 10;
        maxX = dx + widgetW - (widgetW / 10) - (widgetW / 6.666666666666667 * obj.config.gaugeWidthScale) / 2;
        maxY = unitY;

    } else {
        // width more than height
        if (canvasW > canvasH) {
            widgetH = canvasH;
            widgetW = widgetH * 1.25;
            //if width doesn't fit, rescale both
            if (widgetW > canvasW) {
                aspect = widgetW / canvasW;
                widgetW = widgetW / aspect;
                widgetH = widgetH / aspect;
            }
            // width less than height
        } else if (canvasW < canvasH) {
            widgetW = canvasW;
            widgetH = widgetW / 1.25;
            // if height don't fit, rescale both
            if (widgetH > canvasH) {
                aspect = widgetH / canvasH;
                widgetH = widgetH / aspect;
                widgetW = widgetH / aspect;
            }
            // equal
        }

        // delta
        dx = (canvasW - widgetW) / 2;
        dy = (canvasH - widgetH) / 2;
        if (obj.config.titlePosition === 'below') {
            // shift whole thing down
            dy -= (widgetH / 6.4);
        }

        // title
        titleFontSize = ((widgetH / 8) > obj.config.titleMinFontSize) ? (widgetH / 10) : obj.config.titleMinFontSize;
        titleX = dx + widgetW / 2;
        titleY = dy + (obj.config.titlePosition === 'below' ? (widgetH * 1.07) : (widgetH / 6.4));

        // value
        valueFontSize = ((widgetH / 6.5) > obj.config.valueFontSize) ? (widgetH / 6.5) : obj.config.valueFontSize;
        valueX = dx + widgetW / 2;
        valueY = dy + widgetH / 1.275;

        // label
        unitFontSize = ((widgetH / 16) > obj.config.unitLabelMinFontSize) ? (widgetH / 16) : obj.config.unitLabelMinFontSize;
        unitX = dx + widgetW / 2;
        unitY = valueY + valueFontSize / 2 + 5;

        // min
        minFontSize = ((widgetH / 16) > obj.config.minLabelMinFontSize) ? (widgetH / 16) : obj.config.minLabelMinFontSize;
        minX = dx + (widgetW / 10) + (widgetW / 6.666666666666667 * obj.config.gaugeWidthScale) / 2;
        minY = unitY;

        // max
        maxFontSize = ((widgetH / 16) > obj.config.maxLabelMinFontSize) ? (widgetH / 16) : obj.config.maxLabelMinFontSize;
        maxX = dx + widgetW - (widgetW / 10) - (widgetW / 6.666666666666667 * obj.config.gaugeWidthScale) / 2;
        maxY = unitY;
    }

    // parameters
    obj.params = {
        canvasW: canvasW,
        canvasH: canvasH,
        widgetW: widgetW,
        widgetH: widgetH,
        dx: dx,
        dy: dy,
        titleFontSize: titleFontSize,
        titleX: titleX,
        titleY: titleY,
        valueFontSize: valueFontSize,
        valueX: valueX,
        valueY: valueY,
        unitFontSize: unitFontSize,
        unitX: unitX,
        unitY: unitY,
        minFontSize: minFontSize,
        minX: minX,
        minY: minY,
        maxFontSize: maxFontSize,
        maxX: maxX,
        maxY: maxY
    };

    // pki - custom attribute for generating gauge paths
    obj.paper.customAttributes.pki = function(value, min, max, w, h, dx, dy, gws, donut, reverse) {

        var alpha, Ro, Ri, Cx, Cy, Xo, Yo, Xi, Yi, path;

        if (donut) {
            alpha = (1 - 2 * (value - min) / (max - min)) * Math.PI;
            Ro = w / 2 - w / 7;
            Ri = Ro - w / 6.666666666666667 * gws;

            Cx = w / 2 + dx;
            Cy = h / 1.95 + dy;

            Xo = w / 2 + dx + Ro * Math.cos(alpha);
            Yo = h - (h - Cy) - Ro * Math.sin(alpha);
            Xi = w / 2 + dx + Ri * Math.cos(alpha);
            Yi = h - (h - Cy) - Ri * Math.sin(alpha);

            path = "M" + (Cx - Ri) + "," + Cy + " ";
            path += "L" + (Cx - Ro) + "," + Cy + " ";
            if (value > ((max - min) / 2)) {
                path += "A" + Ro + "," + Ro + " 0 0 1 " + (Cx + Ro) + "," + Cy + " ";
            }
            path += "A" + Ro + "," + Ro + " 0 0 1 " + Xo + "," + Yo + " ";
            path += "L" + Xi + "," + Yi + " ";
            if (value > ((max - min) / 2)) {
                path += "A" + Ri + "," + Ri + " 0 0 0 " + (Cx + Ri) + "," + Cy + " ";
            }
            path += "A" + Ri + "," + Ri + " 0 0 0 " + (Cx - Ri) + "," + Cy + " ";
            path += "Z ";

            return {
                path: path
            };

        } else {
            alpha = (1 - (value - min) / (max - min)) * Math.PI;
            Ro = w / 2 - w / 10;
            Ri = Ro - w / 6.666666666666667 * gws;

            Cx = w / 2 + dx;
            Cy = h / 1.25 + dy;

            Xo = w / 2 + dx + Ro * Math.cos(alpha);
            Yo = h - (h - Cy) - Ro * Math.sin(alpha);
            Xi = w / 2 + dx + Ri * Math.cos(alpha);
            Yi = h - (h - Cy) - Ri * Math.sin(alpha);

            path = "M" + (Cx - Ri) + "," + Cy + " ";
            path += "L" + (Cx - Ro) + "," + Cy + " ";
            path += "A" + Ro + "," + Ro + " 0 0 1 " + Xo + "," + Yo + " ";
            path += "L" + Xi + "," + Yi + " ";
            path += "A" + Ri + "," + Ri + " 0 0 0 " + (Cx - Ri) + "," + Cy + " ";
            path += "Z ";

            return {
                path: path
            };
        }
    };

    // Gauge background
    obj.gaugeBackground = obj.paper.path().attr({
        "fill": this.config.gaugeColor,
        "stroke-width": 0,
        pki: [
            obj.config.max,
            obj.config.min,
            obj.config.max,
            obj.params.widgetW,
            obj.params.widgetH,
            obj.params.dx,
            obj.params.dy,
            obj.config.gaugeWidthScale,
            obj.config.donut,
            obj.config.reverse
        ]
    });

    // Gauge Level
    obj.level = obj.paper.path().attr({
        "stroke": this.config.levelBorderColor,
        "stroke-width": this.config.levelBorderWidth,
        pki: [
            0,
            0,
            1,
            obj.params.widgetW,
            obj.params.widgetH,
            obj.params.dx,
            obj.params.dy,
            obj.config.gaugeWidthScale,
            obj.config.donut,
            obj.config.reverse
        ]
    })

    // Gauge border
    obj.gaugeBorder = obj.paper.path().attr({
        "stroke": this.config.gaugeBorderColor,
        "stroke-width": this.config.gaugeBorderWidth,
        "fill": "transparent",
        pki: [
            1,
            0,
            1,
            obj.params.widgetW,
            obj.params.widgetH,
            obj.params.dx,
            obj.params.dy,
            obj.config.gaugeWidthScale,
            obj.config.donut,
            obj.config.reverse
        ]
    });

    if (obj.config.donut) {
        obj.level.transform("r" + obj.config.donutStartAngle + ", " + (obj.params.widgetW / 2 + obj.params.dx) + ", " + (obj.params.widgetH / 1.95 + obj.params.dy));
        obj.gaugeBackground.transform("r" + obj.config.donutStartAngle + ", " + (obj.params.widgetW / 2 + obj.params.dx) + ", " + (obj.params.widgetH / 1.95 + obj.params.dy));
        obj.gaugeBorder.transform("r" + obj.config.donutStartAngle + ", " + (obj.params.widgetW / 2 + obj.params.dx) + ", " + (obj.params.widgetH / 1.95 + obj.params.dy));
    }

    // Title
    obj.titleLabelObject = obj.paper.text(obj.params.titleX, obj.params.titleY, obj.config.title);
    obj.titleLabelObject.attr({
        "font-size": obj.params.titleFontSize,
        "font-weight": "bold",
        "font-family": obj.config.titleFontFamily,
        "fill": obj.config.titleFontColor,
        "fill-opacity": "1"
    });
    setDy(obj.titleLabelObject, obj.params.titleFontSize, obj.params.titleY);

    // Value
    obj.valueLabelObject = obj.paper.text(obj.params.valueX, obj.params.valueY, this.config.value.toString());
    obj.valueLabelObject.attr({
        "font-size": obj.params.valueFontSize,
        "font-weight": "bold",
        "font-family": obj.config.valueFontFamily,
        "fill": obj.config.valueFontColor,
        "fill-opacity": "0"
    });
    setDy(obj.valueLabelObject, obj.params.valueFontSize, obj.params.valueY);

    // Unit label
    obj.unitLabelObject = obj.paper.text(obj.params.unitX, obj.params.unitY, obj.config.unit);
    obj.unitLabelObject.attr({
        "font-size": obj.params.unitFontSize,
        "font-weight": "normal",
        "font-family": "Arial",
        "fill": obj.config.labelFontColor,
        "fill-opacity": "0"
    });
    setDy(this.unitLabelObject, this.params.unitFontSize, this.params.unitY);

    // Min label
    obj.minLabelObject = obj.paper.text(obj.params.minX, obj.params.minY, this.config.min.toString());
    obj.minLabelObject.attr({
        "font-size": obj.params.minFontSize,
        "font-weight": "normal",
        "font-family": "Arial",
        "fill": obj.config.labelFontColor,
        "fill-opacity": (obj.config.hideMin || obj.config.donut) ? "0" : "1",
    });
    setDy(this.minLabelObject, this.params.minFontSize, this.params.minY);

    // Max label
    obj.maxLabelObject = obj.paper.text(obj.params.maxX, obj.params.maxY, this.config.max.toString());
    obj.maxLabelObject.attr({
        "font-size": obj.params.maxFontSize,
        "font-weight": "normal",
        "font-family": "Arial",
        "fill": obj.config.labelFontColor,
        "fill-opacity": (obj.config.hideMax || obj.config.donut) ? "0" : "1"
    });
    setDy(this.maxLabelObject, this.params.maxFontSize, this.params.maxY);

    var defs = obj.paper.canvas.childNodes[1];
    var svg = "http://www.w3.org/2000/svg";

    if (ie !== 'undefined' && ie < 9) {
        // VML mode - no SVG & SVG filter support
    } else if (ie !== 'undefined') {
        onCreateElementNsReady(function() {
            obj.generateShadow(svg, defs);
        });
    } else {
        obj.generateShadow(svg, defs);
    }

    obj.valueLabelObject.animate({
        "fill-opacity": (obj.config.hideValue) ? "0" : "1"
    }, obj.config.startAnimationTime, obj.config.startAnimationType);
    obj.unitLabelObject.animate({
        "fill-opacity": "1"
    }, obj.config.startAnimationTime, obj.config.startAnimationType);

    // Initial refresh
    this.refresh()
};

JustGage.prototype.setNewUnit = function(unit) {

    // Check if value is valid and different
    if (unit !== null && this.config.unit !== unit && typeof unit == 'string') {
        this.config.unit = unit;

        this.unitLabelObject.attr({ "text": unit });
        setDy(this.unitLabelObject, this.params.unitFontSize, this.params.unitY);
    }
}

JustGage.prototype.setNewMin = function(min) {

    // Check if value is valid and different
    if (typeof min !== 'undefined' && this.config.min !== min && !isNaN(parseFloat(min))) {
        this.config.min = min;

        var newText;
        newText = this.config.min.toString();
        this.minLabelObject.attr({ "text": newText });
        setDy(this.minLabelObject, this.params.minFontSize, this.params.minY);

        this.refresh();
    }
}

JustGage.prototype.setNewMax = function(max) {

    // Check if value is valid and different
    if (max !== null && this.config.max !== max && !isNaN(parseFloat(max))) {
        this.config.max = max;

        var newText;
        newText = this.config.max.toString();
        this.maxLabelObject.attr({ "text": newText });
        setDy(this.maxLabelObject, this.params.maxFontSize, this.params.maxY);

        this.refresh();
    }
}

JustGage.prototype.setNewValue = function(value) {

    // Check if value is valid and different
    if (value !== null && this.config.value !== value && !isNaN(parseFloat(value))) {
        this.config.value = value;

        var newText;
        newText = this.config.value.toString() + this.config.valueSuffix;
        this.valueLabelObject.attr({ "text": newText });
        setDy(this.valueLabelObject, this.params.valueFontSize, this.params.valueY);

        this.refresh();
    }
}

JustGage.prototype.setBackgroundForegroundSwapped = function(value) {

    // Check if value is valid and different
    if (value !== null && this.config.backgroundForegroundSwapped !== value) {
        this.config.backgroundForegroundSwapped = value;

        this.refresh();
    }
}

JustGage.prototype.refresh = function() {

    var obj = this;
    var min = this.config.min
    var max = this.config.max
    var value = this.config.value

    // Let gauge starts with 0 -> Add offset to values
    value += (min * (-1))
    max += (min * (-1))
    min += (min * (-1))

    if (max < 0) {
        value *= (-1)
        max *= (-1)
        min *= (-1)
    }

    // Cap value to min and max
    if (value > max) value = max
    if (value < min) value = min

    var rvl = value;
    if (obj.config.reverse) {
        rvl = (max * 1) + (min * 1) - (value * 1);
    }
    obj.level.animate({
        pki: [
            rvl,
            min,
            max,
            obj.params.widgetW,
            obj.params.widgetH,
            obj.params.dx,
            obj.params.dy,
            obj.config.gaugeWidthScale,
            obj.config.donut,
            obj.config.reverse
        ],
    }, obj.config.animationTime, obj.config.animationType);

    // Set colors
    levelColor = getColor(value, (value - min) / (max - min), obj.config.levelColors, obj.config.noGradient, obj.config.customSectors);
    gaugeColor = obj.config.gaugeColor
    if (obj.config.backgroundForegroundSwapped) {
        obj.level.animate({ "fill": gaugeColor }, obj.config.animationTime, obj.config.animationType);
        obj.gaugeBackground.animate({ "fill": levelColor }, obj.config.animationTime, obj.config.animationType);
    } else {
        obj.level.animate({ "fill": levelColor }, obj.config.animationTime, obj.config.animationType);
        obj.gaugeBackground.animate({ "fill": gaugeColor }, obj.config.animationTime, obj.config.animationType);
    }
};

/** Generate shadow */
JustGage.prototype.generateShadow = function(svg, defs) {

    var obj = this;
    var sid = "inner-shadow-" + obj.config.id;
    var gaussFilter, feOffset, feGaussianBlur, feComposite1, feFlood, feComposite2, feComposite3;

    // FILTER
    gaussFilter = document.createElementNS(svg, "filter");
    gaussFilter.setAttribute("id", sid);
    defs.appendChild(gaussFilter);

    // offset
    feOffset = document.createElementNS(svg, "feOffset");
    feOffset.setAttribute("dx", 0);
    feOffset.setAttribute("dy", obj.config.shadowVerticalOffset);
    gaussFilter.appendChild(feOffset);

    // blur
    feGaussianBlur = document.createElementNS(svg, "feGaussianBlur");
    feGaussianBlur.setAttribute("result", "offset-blur");
    feGaussianBlur.setAttribute("stdDeviation", obj.config.shadowSize);
    gaussFilter.appendChild(feGaussianBlur);

    // composite 1
    feComposite1 = document.createElementNS(svg, "feComposite");
    feComposite1.setAttribute("operator", "out");
    feComposite1.setAttribute("in", "SourceGraphic");
    feComposite1.setAttribute("in2", "offset-blur");
    feComposite1.setAttribute("result", "inverse");
    gaussFilter.appendChild(feComposite1);

    // flood
    feFlood = document.createElementNS(svg, "feFlood");
    feFlood.setAttribute("flood-color", "black");
    feFlood.setAttribute("flood-opacity", obj.config.shadowOpacity);
    feFlood.setAttribute("result", "color");
    gaussFilter.appendChild(feFlood);

    // composite 2
    feComposite2 = document.createElementNS(svg, "feComposite");
    feComposite2.setAttribute("operator", "in");
    feComposite2.setAttribute("in", "color");
    feComposite2.setAttribute("in2", "inverse");
    feComposite2.setAttribute("result", "shadow");
    gaussFilter.appendChild(feComposite2);

    // composite 3
    feComposite3 = document.createElementNS(svg, "feComposite");
    feComposite3.setAttribute("operator", "over");
    feComposite3.setAttribute("in", "shadow");
    feComposite3.setAttribute("in2", "SourceGraphic");
    gaussFilter.appendChild(feComposite3);

    // set shadow
    if (!obj.config.hideInnerShadow) {
        obj.paper.canvas.childNodes[2].setAttribute("filter", "url(#" + sid + ")");
        obj.paper.canvas.childNodes[3].setAttribute("filter", "url(#" + sid + ")");
    }
};

function loadConfiguration(searchKey, config, defaultValue, datatype) {

    // Define default value
    var val = defaultValue;

    // Check if search key is valid
    if (!(searchKey === null || searchKey === undefined)) {

        // Check if config map contains the searchKey
        if (config !== null && config !== undefined && typeof config === "object" && searchKey in config) {

            // Use value from config
            val = config[searchKey];
        }

        // Try to parse value to special datatype
        if (typeof datatype == 'string') {
            switch (datatype) {
                case 'int':
                    val = parseInt(val, 10);
                    break;
                case 'float':
                    val = parseFloat(val);
                    break;
            }
        }
    }

    // Return value
    return val;
};

/** Get color for value */
function getColor(val, pct, col, noGradient, custSec) {

    var no, inc, colors, percentage, rval, gval, bval, lower, upper, range, rangePct, pctLower, pctUpper, color;
    var noGradient = noGradient || custSec.length > 0;

    if (custSec.length > 0) {
        for (var i = 0; i < custSec.length; i++) {
            if (val > custSec[i].lo && val <= custSec[i].hi) {
                return custSec[i].color;
            }
        }
    }

    no = col.length;
    if (no === 1) return col[0];
    inc = (noGradient) ? (1 / no) : (1 / (no - 1));
    colors = [];
    for (i = 0; i < col.length; i++) {
        percentage = (noGradient) ? (inc * (i + 1)) : (inc * i);
        rval = parseInt((cutHex(col[i])).substring(0, 2), 16);
        gval = parseInt((cutHex(col[i])).substring(2, 4), 16);
        bval = parseInt((cutHex(col[i])).substring(4, 6), 16);
        colors[i] = {
            pct: percentage,
            color: {
                r: rval,
                g: gval,
                b: bval
            }
        };
    }

    if (pct === 0) {
        return 'rgb(' + [colors[0].color.r, colors[0].color.g, colors[0].color.b].join(',') + ')';
    }

    for (var j = 0; j < colors.length; j++) {
        if (pct <= colors[j].pct) {
            if (noGradient) {
                return 'rgb(' + [colors[j].color.r, colors[j].color.g, colors[j].color.b].join(',') + ')';
            } else {
                lower = colors[j - 1];
                upper = colors[j];
                range = upper.pct - lower.pct;
                rangePct = (pct - lower.pct) / range;
                pctLower = 1 - rangePct;
                pctUpper = rangePct;
                color = {
                    r: Math.floor(lower.color.r * pctLower + upper.color.r * pctUpper),
                    g: Math.floor(lower.color.g * pctLower + upper.color.g * pctUpper),
                    b: Math.floor(lower.color.b * pctLower + upper.color.b * pctUpper)
                };
                return 'rgb(' + [color.r, color.g, color.b].join(',') + ')';
            }
        }
    }

}

/** Fix Raphael display:none tspan dy attribute bug */
function setDy(elem, fontSize, txtYpos) {
    if ((!ie || ie > 9) && elem.node.firstChild.attributes.dy) {
        elem.node.firstChild.attributes.dy.value = 0;
    }
}

/** Random integer  */
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**  Cut hex  */
function cutHex(str) {
    return (str.charAt(0) == "#") ? str.substring(1, 7) : str;
}

/**  Get style  */
function getStyle(oElm, strCssRule) {
    var strValue = "";
    if (document.defaultView && document.defaultView.getComputedStyle) {
        strValue = document.defaultView.getComputedStyle(oElm, "").getPropertyValue(strCssRule);
    } else if (oElm.currentStyle) {
        strCssRule = strCssRule.replace(/\-(\w)/g, function(strMatch, p1) {
            return p1.toUpperCase();
        });
        strValue = oElm.currentStyle[strCssRule];
    }
    return strValue;
}

/**  Create Element NS Ready  */
function onCreateElementNsReady(func) {
    if (document.createElementNS !== undefined) {
        func();
    } else {
        setTimeout(function() {
            onCreateElemenntNsReady(func);
        }, 100);
        npm
    }
}

/**  Get IE version  */
// ----------------------------------------------------------
// A short snippet for detecting versions of IE in JavaScript
// without resorting to user-agent sniffing
// ----------------------------------------------------------
// If you're not in IE (or IE version is less than 5) then:
// ie === undefined
// If you're in IE (>=5) then you can determine which version:
// ie === 7; // IE7
// Thus, to detect IE:
// if (ie) {}
// And to detect the version:
// ie === 6 // IE6
// ie > 7 // IE8, IE9 ...
// ie < 9 // Anything less than IE9
// ----------------------------------------------------------
// UPDATE: Now using Live NodeList idea from @jdalton
var ie = (function() {

    var undef,
        v = 3,
        div = document.createElement('div'),
        all = div.getElementsByTagName('i');

    while (
        div.innerHTML = '<!--[if gt IE ' + (++v) + ']><i></i><![endif]-->',
        all[0]
    );
    return v > 4 ? v : undef;
}());

// extend target object with second object
function extend(out) {
    out = out || {};

    for (var i = 1; i < arguments.length; i++) {
        if (!arguments[i])
            continue;

        for (var key in arguments[i]) {
            if (arguments[i].hasOwnProperty(key))
                out[key] = arguments[i][key];
        }
    }

    return out;
};