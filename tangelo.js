/*jslint browser: true */

// Export a global module.
var tangelo = {};

(function () {
    "use strict";

    // Tangelo version number.
    tangelo.version = function () {
        return "0.4.0";
    };

    tangelo.fatalError = function (module, msg) {
        if (msg === undefined) {
            msg = module;
            throw new Error(msg);
        }

        throw new Error("[" + module + "] " + msg);
    };

    // A function that generates an error-generating function, to be used for
    // missing dependencies (Google Maps API, JQuery UI, etc.).
    tangelo.unavailable = function (cfg) {
        var plugin = cfg.plugin,
            required = cfg.required,
            i,
            t;

        if (tangelo.isArray(required)) {
            if (required.length === 1) {
                required = required[0];
            } else if (required.length === 2) {
                required = required[0] + " and " + required[1];
            } else {
                t = "";
                for (i = 0; i < required.length - 1; i += 1) {
                    t += required[i] + ", ";
                }
                t += "and " + required[required.length - 1];

                required = t;
            }
        }

        return function () {
            tangelo.fatalError("JavaScript include error: " + plugin + " requires " + required);
        };
    };

    tangelo.identity = function (d) { return d; };

    tangelo.isNumber = function (value) {
        return typeof value === 'number';
    };

    tangelo.isBoolean = function (value) {
        return typeof value === 'boolean';
    };

    tangelo.isArray = function (value) {
        return Object.prototype.toString.call(value) === '[object Array]';
    };

    tangelo.isObject = function (value) {
        return Object.prototype.toString.call(value) === '[object Object]';
    };

    tangelo.isString = function (value) {
        return Object.prototype.toString.call(value) === '[object String]';
    };

    tangelo.isFunction = function (value) {
        return Object.prototype.toString.call(value) === '[object Function]';
    };

    tangelo.absoluteUrl = function (path) {
        var trailing_slash = window.location.pathname[window.location.pathname.length - 1] === "/";

        if (path.length > 0) {
            if (path[0] !== "/" && path[0] !== "~") {
                path = window.location.pathname + (trailing_slash ? "" : "/") + path;
            }
        }

        return path;
    };

    tangelo.accessor = function (spec, defaultValue) {
        var parts,
            func,
            key;

        // Need a way to "clone" a function, so we can put properties on the
        // clone without affecting the original.  Code adapted from
        // http://stackoverflow.com/a/11230005/1886928).
        Function.prototype.clone = function () {
            var cloneObj = this,
                temp;

            if (this.__isClone) {
                cloneObj = this.__clonedFrom;
            }

            temp = function () {
                return cloneObj.apply(this, arguments);
            };

            for (key in this) {
                temp[key] = this[key];
            }

            temp.__isClone = true;
            temp.__clonedFrom = cloneObj;

            return temp;
        };

        if (spec === undefined || spec === {}) {
            func = function () {
                tangelo.fatalError("tangelo.accessor()", "I am an undefined accessor - you shouldn't be calling me!");
            };
            func.undefined = true;
        } else if (tangelo.isFunction(spec)) {
            func = spec.clone();
        } else if (!spec) {
            func = function () { return defaultValue; };
        } else if (spec.hasOwnProperty("value")) {
            func = function () { return spec.value; };
        } else if (spec.hasOwnProperty("index")) {
            func = function (d, i) { return i; };
        } else if (spec.hasOwnProperty("field")) {
            if (spec.field === ".") {
                func = function (d) { return d; };
                //return tangelo.identity;
            } else {
                parts = spec.field.split(".");
                func = function (d) {
                    var i;
                    for (i = 0; i < parts.length; i += 1) {
                        d = d[parts[i]];
                        if (d === undefined) {
                            return defaultValue;
                        }
                    }
                    return d;
                };
            }
        } else {
            tangelo.fatalError("tangelo.accessor()", "unknown accessor spec " + spec);
        }

        func.accessor = true;
        return func;
    };

    tangelo.appendFunction = function (f1, f2) {
        var that = this;
        if (!f1) {
            return f2;
        }
        if (!f2) {
            return f1;
        }
        return function () {
            f1.apply(that, arguments);
            f2.apply(that, arguments);
        };
    };

    // Check for the required version number.
    tangelo.requireCompatibleVersion = function (reqvstr) {
        var i,
            tanv,
            reqv,
            compatible,
            hasNaN = function (values) {
                var i;

                for (i = 0; i < values.length; i += 1) {
                    if (isNaN(values[i])) {
                        return true;
                    }
                }

                return false;
            };

        // Split the argument out into major, minor, and patch version numbers.
        reqv = reqvstr.split(".").map(function (x) { return +x; });

        // Check for: blank argument, too long argument, non-version-number
        // argument.
        if (reqv.length === 0 || reqv.length > 3 || hasNaN(reqv)) {
            tangelo.fatalError("tangelo.requireCompatibleVersion()", "illegal argument '" + reqvstr +  "'");
        }

        // Fill in any missing trailing values (i.e., "1.0" -> "1.0.0").
        for (i = reqv.length; i < 3; i += 1) {
            reqv[i] = 0;
        }

        // Split the Tangelo version number into major, minor, and patch level
        // as well.
        tanv = tangelo.version().split(".").map(function (x) { return +x; });

        // In order to be compatible above major version 0: (1) the major
        // versions MUST MATCH; (2) the required minor version MUST BE AT MOST
        // the Tangelo minor version number; and (3) the required patch level
        // MUST BE AT MOST the Tangelo patch level.
        //
        // For major version 0, in order to be compatible: (1) the major
        // versions MUST BOTH BE 0; (2) the minor versions MUST MATCH; (3) the
        // required patch level MUST BE AT MOST the Tangelo patch level.
        if (reqv[0] === 0) {
            compatible = tanv[0] === 0 && reqv[1] === tanv[1] && reqv[2] <= tanv[2];
        } else {
            compatible = reqv[0] === tanv[0] && reqv[1] <= tanv[1] && reqv[2] <= tanv[2];
        }

        return compatible;
    };

}(window.$));
/*jslint browser: true */

(function (tangelo, $) {
    "use strict";

    // Returns true if all arguments are defined; false otherwise.
    tangelo.allDefined = function () {
        var i;

        for (i = 0; i < arguments.length; i += 1) {
            if (arguments[i] === undefined) {
                return false;
            }
        }

        return true;
    };

    // Returns a key-value store containing the configuration options encoded in
    // the inputfile.
    if (!$) {
        tangelo.defaults = tangelo.unavailable({
            plugin: "tangelo.defaults",
            required: "JQuery"
        });
    }

    tangelo.defaults = function (inputfile, callback) {
        if (inputfile.length > 0) {
            if (inputfile[0] !== "/" && inputfile[0] !== "~") {
                inputfile = window.location.pathname + "/" + inputfile;
            }
        }

        $.ajax({
            url: "/service/defaults",
            data: {
                path: inputfile
            },
            dataType: "json",
            error: function (jqxhr) {
                // If the ajax call fails, pass the request object to the
                // function so the client can examine it.
                callback(undefined, undefined, jqxhr);
            },
            success: function (data) {
                // If successful, check for errors in the execution of the
                // service itself, passing that error to the callback if
                // necessary.  Otherwise, pass the status and data along to the
                // callback.
                if (data.error) {
                    callback(undefined, undefined, data.error);
                } else {
                    callback(data.result, data.status);
                }
            }
        });
    };

    // Returns a unique ID for use as, e.g., ids for dynamically generated html
    // elements, etc.
    tangelo.uniqueID = (function () {
        var ids = {"": true},
            letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

        return function (n) {
            var id = "",
                i;

            n = n || 6;

            //while (id in ids) {
            while (ids.hasOwnProperty(id)) {
                id = "";
                for (i = 0; i < n; i += 1) {
                    id += letters[Math.floor(Math.random() * 52)];
                }
            }

            ids[id] = true;

            return id;
        };
    }());

    // Returns an object representing the query arguments (code taken from
    // https://developer.mozilla.org/en-US/docs/Web/API/window.location).
    tangelo.queryArguments = function () {
        var oGetVars = {},
            aItKey,
            nKeyId,
            aCouples;

        if (window.location.search.length > 1) {
            for (nKeyId = 0, aCouples = window.location.search.substr(1).split("&"); nKeyId < aCouples.length; nKeyId += 1) {
                aItKey = aCouples[nKeyId].split("=");
                oGetVars[decodeURI(aItKey[0])] = aItKey.length > 1 ? decodeURI(aItKey[1]) : "";
            }
        }

        return oGetVars;
    };
}(window.tangelo, window.jQuery));
/*jslint browser: true, nomen: true */

(function (tangelo, $) {
    "use strict";

    if (!($ && $.widget)) {
        $.fn.widget = tangelo.unavailable({
            plugin: "tangelo.widget",
            required: ["JQuery", "JQuery UI"]
        });
        return;
    }

    $.widget("tangelo.widget", {
        _setOption: function (key, value) {
            if (this._defaults[key] && this._defaults[key].accessor) {
                this._super(key, tangelo.accessor(value));
            } else {
                this._super(key, value);
            }
        },

        _setOptions: function (options) {
            var that = this;

            $.each(options, function (key, value) {
                that._setOption(key, value);
            });

            this._update();
        },

        _update: function () {
            // This function intentionally does nothing.  It is here as a
            // placeholder to avoid an error in case a child widget does not
            // supply an _update() method for some reason.
        }
    });

    tangelo.widget = function (name, spec) {
        var key,
            ptype = {
                _defaults: spec.options || {},

                _create: function () {
                    this.options = $.extend({}, this._defaults, this.options);

                    if (spec._create) {
                        spec._create.apply(this, arguments);
                    }

                    // TODO: reduce _defaults down to a map to bool, then rename it
                    // to _accessor.

                    this._setOptions(this.options);
                }
            };

        for (key in spec) {
            if (spec.hasOwnProperty(key)) {
                if (key === "_defaults") {
                    tangelo.fatalError("tangelo.widget(\"" + name + "\")", "You cannot use '_defaults' as a field name in your Tangelo widget");
                } else if (key !== "_create") {
                    ptype[key] = spec[key];
                }
            }
        }

        $.widget(name, $.tangelo.widget, ptype);
    };

}(window.tangelo, window.jQuery));
/*jslint browser: true */

window.tangelo.vegaspec = {};
tangelo.vegaspec.geovis = function (worldGeometryFile) {
    var spec = {
        "width": 800,
        "height": 800,
        "data": [
          {
            "name": "countries",
            "url": null,
            "format": {"type": "topojson", "feature": "countries"}
          },
          {
            "name": "links",
            "transform": [
              {"type": "copy", "from": "data", "fields": ["source", "target"]}
            ]
          },
          {
            "name": "filter"
          },
          {
            "name": "table",
            "transform": [
              {
                "type": "force",
                "links": "links",
                "iterations": 0
              },
              {
                "type": "geo",
                "lat": "data.latitude",
                "lon": "data.longitude",
                "projection": "azimuthalEqualArea",
                "clipAngle": 179.99,
                "scale": 200,
                "translate": [400, 400],
                "precision": 0.1
              }
            ]
          }
        ],
        "scales": [
          {
            "name": "color",
            "type": "ordinal",
            "range": "category10"
          },
          {
            "name": "size",
            "type": "linear",
            "range": [100, 400],
            "zero": false,
            "domain": {"data": "table", "field": "data.size"}
          }
        ],
        "legends": [
           {
            "fill": "color",
            "orient": "left",
            "properties": {
              "labels": {
                "fontSize": {"value": 18}
              },
              "symbols": {
                "size": {"value": 100},
                "stroke": {"value": "#fff"}
              }
            }
          }
        ],
        "marks": [
          {
            "type": "path",
            "from": {
              "data": "countries",
              "transform": [{
                "type": "geopath",
                "value": "data",
                "projection": "azimuthalEqualArea",
                "clipAngle": 179.99,
                "scale": 200,
                "translate": [400, 400],
                "precision": 0.1
              }]
            },
            "properties": {
              "enter": {
                "stroke": {"value": "#fff"},
                "path": {"field": "path"}
              },
              "update": {"fill": {"value": "#ccc"}}
            }
          },
          {
            "type": "path",
            "from": {
              "data": "links",
              "transform": [
                {"type": "link", "shape": "curve"}
              ]
            },
            "properties": {
              "update": {
                "path": {"field": "path"},
                "stroke": {"value": "black"},
                "strokeOpacity": {"value": 1},
                "strokeWidth": {"value": 1}
              }
            }
          },
          {
            "type": "symbol",
            "from": {
              "data": "table"
            },
            "properties": {
              "enter": {
                "x": {"field" : "x"},
                "y": {"field" : "y"}
              },
              "update": {
                "stroke": {"value": "#fff"},
                "fill": {"scale": "color", "field": "data.color"},
                "size": {"scale": "size", "field": "data.size"}
              }
            }
          }
        ]
    };

    spec.data[0].url = worldGeometryFile;
    return spec;
};
/*jslint browser: true */

window.tangelo.vtkweb = {};
/*jslint browser: true */

(function (tangelo, $, vtkWeb) {
    "use strict";

    tangelo.vtkweb.processes = function (callback) {
        $.ajax({
            url: "/vtkweb",
            dataType: "json",
            error: function (jqxhr) {
                callback(undefined, jqxhr);
            },
            success: function (keys) {
                // If there was an error, bail out.
                if (keys.error) {
                    tangelo.fatalError("tangelo.vtkweb.processes()", keys.error);
                }

                // Otherwise, pass the list of keys to the callback.
                callback(keys);
            }
        });
    };

    tangelo.vtkweb.info = function (key, callback) {
        $.ajax({
            url: "/vtkweb/" + key,
            dataType: "json",
            error: function (jqxhr) {
                callback(undefined, jqxhr);
            },
            success: function (report) {
                callback(report);
            }
        });
    };

    (function () {
        var table = {};

        tangelo.vtkweb.launch = function (cfg) {
            var data,
                url = tangelo.absoluteUrl(cfg.url),
                callback = cfg.callback,
                argstring = cfg.argstring,
                timeout = cfg.timeout,
                viewport = cfg.viewport;

            if (timeout !== undefined) {
                console.warn("[tangelo.vtkweb.launch] warning: timeout argument has no effect");
            }

            // Look for required arguments.
            if (url === undefined) {
                tangelo.fatalError("tangelo.vtkweb.launch()", "argument 'url' required");
            }

            if (viewport === undefined) {
                tangelo.fatalError("tangelo.vtkweb.launch()", "argument 'viewport' required");
            }

            // Construct data object for POST request.
            data = {
                program: url
            };
            if (argstring) {
                data.args = argstring
            }

            // Fire off POST request to vtkweb service.
            $.ajax({
                url: "/vtkweb",
                type: "POST",
                data: data,
                dataType: "json",
                error: function (jqxhr) {
                    callback(undefined, jqxhr);
                },
                success: function (report) {
                    var connection,
                        vp;

                    if (report.status === "failed" || report.status === "incomplete") {
                        callback(undefined, report.reason);
                    } else if (report.status === "complete") {

                        connection = {
                            sessionURL: report.url
                        };

                        vtkWeb.connect(connection, function (connection) {
                            // Create a viewport and bind it to the specified
                            // element/selector.
                            vp = vtkWeb.createViewport({session: connection.session});
                            vp.bind(viewport);

                            // Force refresh on resize.
                            $(window).resize(function () {
                                if (vp) {
                                    vp.render();
                                }
                            });

                            // An initial render.
                            vp.render();

                            // Save the element and viewport for use in the
                            // terminate() function.
                            table[report.key] = {
                                element: $(viewport).get(0),
                                viewport: vp
                            };
                        }, function (code, reason) {
                            tangelo.fatalError("could not connect to VTKWeb server [code " + code + "]: " + reason);
                        });

                        callback(report.key);
                    } else {
                        tangelo.fatalError("tangelo.vtkweb.launch()", "unexpected report status '" + report.status + "'");
                    }
                }
            });
        };

        tangelo.vtkweb.terminate = function (key, callback) {
            $.ajax({
                url: "/vtkweb/" + key,
                type: "DELETE",
                dataType: "json",
                error: function (jqxhr) {
                    if (callback) {
                        callback(undefined, undefined, jqxhr);
                    }
                },
                success: function (response) {
                    var element;

                    if (!response.reason) {
                        table[key].viewport.unbind();
                        element = table[key].element;

                        delete table[key];
                    }

                    // The default action is to empty the target element after
                    // shutting down the vtkweb process - the user can override
                    // this by passing in a callback (e.g., if they wish to
                    // capture the last image, or notify some other ongoing
                    // process, or something like that).
                    if (callback) {
                        // The second argument will be undefined if there was no
                        // error; the other arguments are always passed.
                        callback(key, element, response.reason);
                    } else if (element) {
                        $(element).empty();
                    }
                }
            });
        };
    }());
}(window.tangelo, window.jQuery, window.vtkWeb));
/*jslint browser: true */

(function (tangelo, $, d3) {
    "use strict";

    if (!($ && d3)) {
        tangelo.unavailable({
            plugin: "controlPanel",
            required: ["JQuery", "d3"]
        });
        return;
    }

    function drawerToggle(divsel, buttonsel) {
        var div,
            button,
            state,
            divheight,
            iconheight;

        // Use the selectors to grab the DOM elements.
        div = d3.select(divsel);
        button = d3.select(buttonsel);

        // Initially, the panel is open.
        state = 'uncollapsed';

        // The glyphicon halfings are around 20 pixels tall.
        iconheight = "20px";

        // Save the original height of the panel.
        // This requires a DOM update to do this correctly, so we wait a second.
        // I have found that waiting less than 200ms can cause undefined behavior,
        // since there may be other callback that need to populate the panel.
        function updateHeight() {
            divheight = $(div.node()).height() + "px";
        }
        window.setTimeout(updateHeight, 1000);

        // This function, when called, will toggle the state of the panel.
        return function () {
            if (state === 'uncollapsed') {
                div.transition()
                    .duration(500)
                    .style("height", iconheight);

                button.classed("glyphicon-chevron-down", false)
                    .classed("glyphicon-chevron-up", true);

                state = 'collapsed';
            } else if (state === 'collapsed') {
                div.transition()
                    .duration(500)
                    .style("height", divheight);

                button.classed("glyphicon-chevron-down", true)
                    .classed("glyphicon-chevron-up", false);

                state = 'uncollapsed';
            } else {
                tangelo.fatalError("drawerToggle()", "illegal state: " + state);
            }
        };
    }

    $.fn.controlPanel = function () {
        var toggle,
            s,
            id,
            tag;

        // Make a d3 selection out of the target element.
        s = d3.select(this[0]);

        // Bail out silently if the selection is empty.
        if (s.empty()) {
            return;
        }

        // Create a unique identifier to use with the various control panel
        // components.
        tag = tangelo.uniqueID();
        id = s.attr("id");
        if (!id) {
            id = "tangelo-control-panel-" + tag;
            s.attr("id", id);
        }

        // Style the control panel div appropriately, then add a div as the
        // first child to act as the drawer handle (and place an appropriate
        // icon in the mtagdle of it).
        s.style("position", "fixed")
            .style("bottom", "0px")
            .style("width", "100%")
            .insert("div", ":first-child")
            .attr("id", "tangelo-drawer-handle-" + tag)
            .style("text-align", "center")
            .style("cursor", "pointer")
            .on("mouseenter", function () {
                d3.select(this)
                    .style("background", "gray");
            })
            .on("mouseleave", function () {
                d3.select(this)
                    .style("background", null);
            })
            .append("span")
            .attr("id", "tangelo-drawer-icon-" + tag)
            .classed("glyphicon", true)
            .classed("glyphicon-chevron-down", true);

        toggle = drawerToggle("#" + id, "#tangelo-drawer-icon-" + tag);
        d3.select("#tangelo-drawer-handle-" + tag)
            .on("click", toggle);
    };
}(window.tangelo, window.jQuery, window.d3));
/*jslint browser: true */

(function (tangelo, $, google, d3) {
    "use strict";

    if (!($ && google && d3)) {
        tangelo.GoogleMapSVG = tangelo.unavailable({
            plugin: "GoogleMapSVG",
            required: ["JQuery", "Google Maps API", "d3"]
        });
        return;
    }

    tangelo.GoogleMapSVG = function (elem, mapoptions, cfg, cont) {
        var that,
            idle,
            sel;

        // Obtain a unique id for this class.
        this.id = "gmsvg-" + tangelo.uniqueID();

        // Create a div element to put in the container element.
        this.mapdiv = d3.select(elem)
            .append("div")
            .attr("id", this.id)
            .style("width", $(elem).width() + "px")
            .style("height", $(elem).height() + "px")
            .node();

        // Create the map and place it in the "map div".
        this.map = new google.maps.Map(this.mapdiv, mapoptions);
        this.setMap(this.map);

        // Compute the size of the map div.
        this.size = {
            width: $(this.mapdiv).width(),
            height: $(this.mapdiv).height()
        };

        // When the map is dragged, resized, or zoomed, emit the appropriate
        // events and/or redraw the SVG layer.
        that = this;
        $(this.mapdiv).resize(function () {
            google.maps.event.trigger(this.map, "resize");
        });

        // Store the config for later use.
        this.cfg = cfg || {};

        // If a continuation function was passed, call it with the new object as
        // soon as the map is actually ready.
        //
        // TODO(choudhury): eliminate the cont argument and instead attach a
        // one-time idle listener to the newly created map (in the client code).
        if (cont) {
            google.maps.event.addListenerOnce(this.map, "idle", function () {
                cont(that);
            });
        }
    };

    // Enable the class to use Google Map overlays.
    tangelo.GoogleMapSVG.prototype = new google.maps.OverlayView();

    // Function to return the SVG DOM node, for generic manipulation.
    tangelo.GoogleMapSVG.prototype.getSVG = function () {
        return this.svg.node();
    };

    tangelo.GoogleMapSVG.prototype.getMap = function () {
        return this.map;
    };

    tangelo.GoogleMapSVG.prototype.computeCBArgs = function () {
        var mattrans;

        // Grab the matrix transform from the map div.
        mattrans = d3.select("#" + this.id + " [style*='webkit-transform: matrix']")
            .style("-webkit-transform")
            .split(" ")
            .map(function (v, i) {
                var retval;

                if (i === 0) {
                    retval = v.slice("matrix(".length, -1);
                } else {
                    retval = v.slice(0, -1);
                }

                return retval;
            });

        // Construct the parameters object and return it.
        return {
            // The top-level SVG node.
            svg: this.svg.node(),

            // The Google Map projection object.
            projection: this.getProjection(),

            // The map zoom level.
            zoom: this.map.getZoom(),

            // The map translation vector (extracted for convenience from the
            // transform matrix).
            translation: {
                x: mattrans[4],
                y: mattrans[5]
            },

            // The transform matrix itself.
            transform: mattrans,

            // A boolean indicating whether the map is in the middle of a
            // zooming action.
            zooming: mattrans[0] !== "1" || mattrans[3] !== "1"
        };
    };

    // Attach event listeners to the map.
    tangelo.GoogleMapSVG.prototype.attachListener = function (eventType, callback, how) {
        var that = this,
            attacher;

        if (Object.prototype.toString.call(eventType) === "[object Array]") {
            $.each(eventType, function (i, v) {
                that.attachListener(v, callback, how);
            });
            return;
        }

        if (how === "once") {
            attacher = google.maps.event.addListenerOnce;
        } else if (how === "always") {
            attacher = google.maps.event.addListener;
        } else {
            tangelo.fatalError("GoogleMapSVG.attachListener()", "illegal value for argument 'how'");
        }

        attacher(this.map, eventType, function () {
            var args = that.computeCBArgs();

            // Some special behavior for the draw callback.
            if (eventType === "draw") {
                // If the map is in the middle of a zoom operation, delay the
                // draw call until a bit later (to give the zoom a chance to
                // finish).
                if (args.zooming) {
                    // TOOD(choudhury): figure out why a "drag" event is
                    // triggered for the delay case.
                    //window.setTimeout(google.maps.event.trigger, 100, that.map, "drag");
                    window.setTimeout(google.maps.event.trigger, 100, that.map, "draw");
                }
            }

            // Call the user's specified function with the collected data.
            callback.call(that, args);
        });
    };

    tangelo.GoogleMapSVG.prototype.on = function (eventType, callback) {
        this.attachListener(eventType, callback, "always");
    };

    tangelo.GoogleMapSVG.prototype.onceOn = function (eventType, callback) {
        this.attachListener(eventType, callback, "once");
    };

    tangelo.GoogleMapSVG.prototype.trigger = function (eventType) {
        google.maps.event.trigger(this.map, eventType);
    };

    tangelo.GoogleMapSVG.prototype.shift = function (what, x, y) {
        d3.select(what)
            .style("-webkit-transform", "translate(" + x + "px, " + y + "px)");
    };

    // This function is part of the overlay interface - it will be called when a
    // new map element is added to the overlay (as in the constructor function
    // above).
    tangelo.GoogleMapSVG.prototype.onAdd = function () {
        // Put an SVG element in the mouse target overlay.
        this.svg = d3.select(this.getPanes().overlayMouseTarget)
            .append("svg")
            .attr("width", this.size.width)
            .attr("height", this.size.height);

        // If the user supplied an initialization function, call it now.
        if (this.cfg.initialize) {
            this.cfg.initialize.call(this, this.svg.node(), this.getProjection(), this.map.getZoom());
        }
    };

    // This function has to be defined, but we wish to defer the actual draw
    // action to the user, vis the on() and onceOn() methods.
    tangelo.GoogleMapSVG.prototype.draw = function () {};
}(window.tangelo, window.jQuery, window.google, window.d3));
/*jslint browser: true */

(function (tangelo, $, d3) {
    "use strict";

    if (!($ && d3)) {
        $.fn.svgColorLegend = tangelo.unavailable({
            plugin: "svgColorLegend",
            required: ["JQuery", "d3"]
        });
        return;
    }

    $.fn.svgColorLegend = function (cfg) {
        var bbox,
            bg,
            bottom,
            height,
            heightfunc,
            left,
            maxheight,
            maxwidth,
            right,
            text,
            top,
            totalheight,
            totalwidth,
            width,
            legend,
            cmap_func,
            xoffset,
            yoffset,
            categories,
            height_padding,
            width_padding,
            text_spacing,
            legend_margins,
            clear;

        // Extract arguments from the config argument.
        cmap_func = cfg.cmap_func;
        xoffset = cfg.xoffset;
        yoffset = cfg.yoffset;
        categories = cfg.categories;
        height_padding = cfg.height_padding;
        width_padding = cfg.width_padding;
        text_spacing = cfg.text_spacing;
        legend_margins = cfg.legend_margins;
        clear = cfg.clear;

        // Create a d3 selection from the selection.
        legend = d3.select(this[0]);

        // Clear the svg element, if requested.
        clear = clear || false;
        if (clear) {
            legend.selectAll("*").remove();
        }

        maxwidth = 0;
        maxheight = 0;

        // Place a rect that will serve as a container/background for the legend
        // list items.  Leave its dimensions undefined for now (they will be
        // computed from the size of all the elements later).
        bg = legend.append("rect")
            //.style("fill", "gray");
            .style("fill", "white")
            .style("opacity", 0.7);

        $.each(categories, function (i, d) {
            legend.append("rect")
                .classed("colorbox", true)
                .attr("x", xoffset)
                // "y", "width", and "height" intentionally left unset
                .style("fill", cmap_func(d));

            text = legend.append("text")
                .classed("legendtext", true)
                // "x" and "y" intentionally left unset
                .text(d);

            // Compute the max height and width out of all the text bgs.
            bbox = text[0][0].getBBox();

            if (bbox.width > maxwidth) {
                maxwidth = bbox.width;
            }

            if (bbox.height > maxheight) {
                maxheight = bbox.height;
            }
        });

        // Compute the height and width of each color swatch.
        height = maxheight + height_padding;
        width = height;

        // Compute the total height and width of all the legend items together.
        totalheight = height * categories.length;
        totalwidth = width + width_padding + maxwidth;

        // Get the user-supplied margin values.
        left = legend_margins.left || 0;
        top = legend_margins.top || 0;
        right = legend_margins.right || 0;
        bottom = legend_margins.bottom || 0;

        // Set the dimensions of the container rect, based on the height/width of
        // all the items, plus the user supplied margins.
        bg.attr("x", xoffset - left || 0)
            .attr("y", yoffset - top || 0)
            .attr("width", left + totalwidth + right)
            .attr("height", top + totalheight + bottom);

        heightfunc = function (d, i) {
            return yoffset + i * height;
        };

        legend.selectAll(".colorbox")
            .attr("width", height)
            .attr("height", height)
            .attr("y", heightfunc);

        legend.selectAll(".legendtext")
            .attr("x", xoffset + width + width_padding)
            .attr("y", function (d, i) {
                //return 19 + heightfunc(d, i);
                return text_spacing + heightfunc(d, i);
            });
    };
}(window.tangelo, window.jQuery, window.d3));
/*jslint browser: true, unparam: true, nomen: true */

(function (tangelo, $, d3) {
    "use strict";

    if (!($ && $.widget && d3)) {
        $.fn.dendrogram = tangelo.unavailable({
            plugin: "dendrogram",
            required: ["JQuery", "JQuery UI", "d3"]
        });
        return;
    }

    tangelo.widget("tangelo.dendrogram", {
        options: {
            label: tangelo.accessor({value: ""}),
            distance: tangelo.accessor({value: 1}),
            id: tangelo.accessor({value: 0}),
            margin: {
                top: 20,
                right: 120,
                bottom: 20,
                left: 120
            },
            nodeLimit: null,
            duration: 750,
            root: null,
            source: null,
            data: null,
            mode: "hide",
            nodesize: 7.5,
            textsize: 10,
            orientation: "horizontal",
            lineStyle: "curved",
            nodeColor: tangelo.accessor({value: "lightsteelblue"}),
            nodeOpacity: tangelo.accessor({value: 1}),
            hoverNodeColor: tangelo.accessor({value: "green"}),
            hoverNodeOpacity: tangelo.accessor({value: 1}),
            selectedNodeColor: tangelo.accessor({value: "firebrick"}),
            selectedNodeOpacity: tangelo.accessor({value: 1}),
            collapsedNodeColor: tangelo.accessor({value: "blue"}),
            collapsedNodeOpacity: tangelo.accessor({value: 1}),
            onNodeCreate: null,
            onNodeDestroy: null
        },

        _actions: {
            collapse: null
        },

        action: function (which) {
            return this._actions[which];
        },

        orientation: {
            abscissa: "y",
            ordinate: "x",
            heightvar: "height",
            widthvar: "width",
            xfunc: function (_, v) {
                return v;
            }
        },

        _lineStyle: function (s, t) {
            return this.line({
                source: s,
                target: t
            });
        },

        _create: function () {
            var that = this;

            this._actions.collapse = function (d) {
                if (that.options.mode === "hide") {
                    if (d.children) {
                        d._children = d.children;
                        d.children = null;
                        d.collapsed = true;
                        d3.select(this)
                            .select("circle")
                            .style("fill", that.options.collapsedNodeColor)
                            .style("opacity", that.options.collapsedNodeOpacity)
                            .classed("children-hidden", true);
                    } else {
                        d.children = d._children;
                        d._children = null;
                        d.collapsed = false;
                        d3.select(this)
                            .select("circle")
                            .style("fill", that.options.nodeColor)
                            .style("opacity", that.options.nodeOpacity)
                            .classed("children-hidden", false);
                    }
                } else if (that.options.mode === "focus") {
                    that.options.root = d;
                } else if (that.options.mode === "label") {
                    d.showLabel = d.showLabel ? false : true;
                }
                //that._update({source: d});
                that._setOptions({source: d});
            };

            if (this.options.orientation === "vertical") {
                this.orientation = {
                    abscissa: "x",
                    ordinate: "y",
                    heightvar: "width",
                    widthvar: "height",
                    xfunc: function (that, v) {
                        // This function flips a vertical tree about its
                        // midline.
                        var center = (that.xminmax[0] + that.xminmax[1]) / 2;
                        return 2 * center - v;
                    }
                };
            } else if (this.options.orientation !== "horizontal") {
                tangelo.fatalError("$.dendrogram()", "illegal option for 'orientation': " + this.options.orientation);
            }

            this.tree = d3.layout.partition()
                .value(function () { return 1; })
                .sort(d3.ascending);

            // Create a d3 line drawer, including an abstracted method that can
            // call the specific line function the right way.
            this.line = null;
            if (this.options.lineStyle === "curved") {
                this.line = d3.svg.diagonal()
                    .projection(function (d) {
                        return [that.orientation.xfunc(that, d[that.orientation.abscissa]), d[that.orientation.ordinate]];
                    });
            } else if (this.options.lineStyle === "axisAligned") {
                this.line = d3.svg.line()
                    .interpolate("step-before")
                    .x(function (d) {
                        return that.orientation.xfunc(that, d[that.orientation.abscissa]);
                    })
                    .y(function (d) {
                        return d[that.orientation.ordinate];
                    });

                this._lineStyle = function (s, t) {
                    return that.line([s, t]);
                };
            } else {
                tangelo.fatalError("$.dendrogram()", "illegal option for 'lineStyle': " + this.options.lineStyle);
            }

            this.svg = d3.select(this.element.get(0))
                .append("svg")
                .append("g");
        },

        _update: function () {
            this.width = 1200 - this.options.margin.right - this.options.margin.left;
            this.height = 800 - this.options.margin.top - this.options.margin.bottom;

            if (!this.options.root) {
                this.options.root = this.options.data;
            }

            if (!this.options.mode) {
                this.options.mode = "hide";
            }

            this.tree.size([this.height, this.width]);

            d3.select(this.element.get(0))
                .select("svg")
                .attr("width", this[this.orientation.widthvar] + this.options.margin.right + this.options.margin.left)
                .attr("height", this[this.orientation.heightvar] + this.options.margin.top + this.options.margin.bottom)
                .select("g")
                .attr("transform", "translate(" + this.options.margin.left + "," + this.options.margin.top + ")");

            //this.options.root.x0 = this.height / 2;
            this.options.root.x0 = this[this.orientation.heightvar] / 2;
            this.options.root.y0 = 0;

            // Compute the new tree layout.
            var nodes = this.tree.nodes(this.options.root).reverse(),
                links = this.tree.links(nodes),
                source = this.options.source || this.options.root,
                node,
                nodeEnter,
                nodeUpdate,
                nodeExit,
                link,
                maxY,
                visibleLeaves,
                filteredNodes,
                filteredLinks,
                evttype,
                that = this;

            visibleLeaves = 0;
            function setPosition(node, pos) {
                var xSum = 0;
                node.y = pos;
                node.x = node.x + node.dx / 2;
                if (!node.parent) {
                    node.parent = node;
                }
                if (node.children) {
                    node.children.forEach(function (d) {
                        d.parent = node;
                        setPosition(d, pos + 10 * that.options.distance(d));
                        xSum += d.x;
                    });
                    node.x = xSum / node.children.length;
                } else {
                    visibleLeaves += 1;
                }
            }
            setPosition(this.options.root, 0);

            // Compute the leftmost and rightmost positions in the tree.
            function minmax(node) {
                var leftmost,
                    rightmost,
                    p;

                leftmost = node;
                while (leftmost.children && leftmost.children[0]) {
                    leftmost = leftmost.children[0];
                }

                rightmost = node;
                while (rightmost.children && rightmost.children[1]) {
                    rightmost = rightmost.children[1];
                }

                return [leftmost.x, rightmost.x];
            }
            this.xminmax = minmax(this.options.root);

            // Normalize Y to fill space
            maxY = d3.extent(nodes, function (d) {
                return d.y;
            })[1];
            nodes.forEach(function (d) {
                d.y = d.y / maxY * (that.width - 150);
            });

            if (this.options.nodeLimit && nodes.length > this.options.nodeLimit) {
                // Filter out everything beyond parent y-position to keep things interactive
                nodes.sort(function (a, b) {
                    return d3.ascending(a.parent.y, b.parent.y);
                });
                nodes.forEach(function (d, i) {
                    d.index = i;
                });
                filteredNodes = nodes.slice(0, this.options.nodeLimit);
                maxY = filteredNodes[filteredNodes.length - 1].parent.y;
                filteredNodes.forEach(function (d) {
                    d.y = d.y > maxY ? maxY : d.y;
                });

                // Filter the links based on visible nodes
                filteredLinks = [];
                links.forEach(function (d) {
                    if (d.source.index < this.options.nodeLimit && d.target.index < this.options.nodeLimit) {
                        filteredLinks.push(d);
                    }
                });
                nodes = filteredNodes;
                links = filteredLinks;
            }

            function firstChild(d) {
                if (d.children) {
                    return firstChild(d.children[0]);
                }
                if (d._children) {
                    return firstChild(d._children[0]);
                }
                return d;
            }

            function lastChild(d) {
                if (d.children) {
                    return lastChild(d.children[d.children.length - 1]);
                }
                if (d._children) {
                    return lastChild(d._children[d._children.length - 1]);
                }
                return d;
            }

            function leafCount(d) {
                var children = d.children,
                    sum = 0;
                if (!children) {
                    children = d._children;
                }

                // I am an internal node, so total the leaves of the children
                if (children) {
                    children.forEach(function (child) {
                        sum += leafCount(child);
                    });
                    return sum;
                }

                // I am a leaf
                return 1;
            }

            // Update the nodes…
            node = this.svg.selectAll("g.node")
                .data(nodes, function (d) {
                    return that.options.id(d);
                });

            // Enter any new nodes at the parent's previous position.
            nodeEnter = node.enter()
                .append("g")
                .classed("node", true)
                .attr("transform", function () {
                    return "translate(" + that.orientation.xfunc(that, source[that.orientation.abscissa + "0"]) + "," + source[that.orientation.ordinate + "0"] + ")";
                });

            nodeEnter.append("circle")
                .attr("r", 1e-6)
                .classed("node", true)
                .style("fill", this.options.nodeColor)
                .style("opacity", this.options.nodeOpacity)
                .style("stroke", "black")
                .style("stroke-width", "1px")
                .on("mouseenter.tangelo", function () {
                    d3.select(this)
                        .style("fill", that.options.hoverNodeColor)
                        .style("opacity", that.options.hoverNodeOpacity);
                })
                .on("mouseleave.tangelo", function (d) {
                    d3.select(this)
                        .style("fill", d.collapsed ? that.options.collapsedNodeColor : that.options.nodeColor)
                        .style("opacity", d.collapsed ? that.options.collapsedNodeOpacity : that.options.nodeOpacity);
                });

            nodeEnter.append("text")
                .attr("x", 10)
                .attr("dy", ".35em")
                .attr("text-anchor", "start")
                .style("font-size", this.options.textsize + "px")
                .text(this.options.label)
                .style("fill-opacity", 1e-6);

            // Transition nodes to their new position.
            nodeUpdate = node.transition()
                .duration(this.options.duration)
                .attr("transform", function (d) {
                    return "translate(" + that.orientation.xfunc(that, d[that.orientation.abscissa]) + "," + d[that.orientation.ordinate] + ")";
                });

            nodeUpdate.select("circle")
                .attr("r", this.options.nodesize);

            nodeUpdate.select("text")
                .text(function (d) {
                    var label = that.options.label(d);
                    if (visibleLeaves < that.height / (0.8 * that.options.textsize)) {
                        return label;
                    }
                    return "";
                })
                .style("fill-opacity", 1);

            // Transition exiting nodes to the parent's new position.
            nodeExit = node
                .exit()
                .transition()
                .duration(this.options.duration)
                .attr("transform", function () {
                    return "translate(" + that.orientation.xfunc(that, source[that.orientation.abscissa]) + "," + source[that.orientation.ordinate] + ")";
                })
                .remove();

            nodeExit.select("circle")
                .attr("r", 1e-6);

            nodeExit.select("text")
                .style("fill-opacity", 1e-6);

            // Update the links…
            link = this.svg.selectAll("path.link")
                .data(links, function (d) {
                    return that.options.id(d.target);
                });

            // Enter any new links at the parent's previous position.
            link.enter()
                .insert("path", "g")
                .classed("link", true)
                .style("stroke", "black")
                .style("stroke-width", "1px")
                .style("fill", "none")
                .attr("d", function () {
                    var o = {x: source.x0, y: source.y0};
                    return that._lineStyle(o, o);
                });

            // Transition links to their new position.
            link.transition()
                .duration(this.options.duration)
                .attr("d", function (d) {
                    return that._lineStyle(d.source, d.target);
                });

            // Transition exiting nodes to the parent's new position.
            link.exit()
                .transition()
                .duration(this.options.duration)
                .attr("d", function () {
                    var o = {x: source.x, y: source.y};
                    return that._lineStyle(o, o);
                })
                .remove();

            // Stash the old positions for transition.
            nodes.forEach(function (d) {
                d.x0 = d.x;
                d.y0 = d.y;
            });

            if (this.options.onNodeDestroy) {
                nodeExit.each(this.options.onNodeDestroy);
            }

            if (this.options.onNodeCreate) {
                nodeEnter.each(this.options.onNodeCreate);
            }

            // If there are event handlers installed, replicate them onto the
            // new nodes.
            for (evttype in this._eventHandlers) {
                if (this._eventHandlers.hasOwnProperty(evttype)) {
                    this.on(evttype, this._eventHandlers[evttype]);
                }
            }
        },

        on: function (evttype, callback) {
            var that = this;

            // Install/remove a handler.
            that.svg.selectAll("g.node")
                .selectAll("circle")
                .on(evttype, callback ? function (d, i) {
                    // Call the callback with the dendrogram as the "this"
                    // context, passing in the datum and index, but also the
                    // current DOM element expclitly as well.
                    callback.call(that, d, i, this);
                } : null);

            // Record/erase a record about this event type.
            if (callback !== null) {
                this._eventHandlers[evttype] = callback;
            } else {
                delete this._eventHandlers[evttype];
            }
        },

        _eventHandlers: {},

        download: function (format) {
            var node,
                s,
                d,
                str;

            if (format === "pdf") {
                node = this.svg
                    .selectAll("g.node")
                    .select("circle")
                    .attr("r", function (d) {
                        return d._children ? this.options.nodesize : 0;
                    });
                s = new window.XMLSerializer();
                d = d3.select("svg").node();
                str = s.serializeToString(d);

                // Change back to normal
                node.attr("r", this.options.nodesize);

                d3.json("/service/svg2pdf")
                    .send("POST", str, function (error, data) {
                        window.location = "/service/svg2pdf?id=" + data.result;
                    });
            } else {
                window.alert("Unsupported export format type: " + format);
            }
        },

        reset: function () {
            function unhideAll(d) {
                if (!d.children) {
                    d.children = d._children;
                    d._children = null;
                }
                if (d.children) {
                    d.children.forEach(unhideAll);
                }
            }
            unhideAll(this.options.data);
            this._setOptions({
                root: this.options.data
            });
        }
    });
}(window.tangelo, window.jQuery, window.d3));
/*jslint browser: true, unparam: true, nomen: true */

(function (tangelo, $, vg) {
    "use strict";

    if (!($ && $.widget && vg)) {
        $.fn.geodots = tangelo.unavailable({
            plugin: "geodots",
            required: ["JQuery", "JQuery UI", "Vega"]
        });
        return;
    }

    tangelo.widget("tangelo.geodots", {
        options: {
            latitude: tangelo.accessor({value: 0}),
            longitude: tangelo.accessor({value: 0}),
            size: tangelo.accessor({value: 20}),
            color: tangelo.accessor({value: 0}),
            worldGeometry: null,
            data: null
        },

        _create: function () {
            var that = this,
                vegaspec = tangelo.vegaspec.geovis(that.options.worldGeometry);

            this.options = $.extend(true, {}, this._defaults, this.options);

            vg.parse.spec(vegaspec, function (chart) {
                that.vis = chart;

                that._update();
            });
        },

        _update: function () {
            var that = this;

            if (this.options.data) {
                this.options.data.forEach(function (d) {
                    d.latitude = that.options.latitude(d);
                    d.longitude = that.options.longitude(d);
                    d.size = that.options.size(d);
                    d.color = that.options.color(d);
                });

                if (this.vis) {
                    this.vis({
                        el: that.element.get(0),
                        data: {
                            table: that.options.data,
                            links: []
                        }
                    }).update();
                }
            }
        }
    });
}(window.tangelo, window.jQuery, window.vg));
/*jslint browser: true, unparam: true, nomen: true */

(function (tangelo, $, vg) {
    "use strict";

    if (!($ && $.widget && vg)) {
        $.fn.geonodelink = tangelo.unavailable({
            plugin: "geonodelink",
            required: ["JQuery", "JQuery UI", "Vega"]
        });
        return;
    }

    tangelo.widget("tangelo.geonodelink", {
        options: {
            nodeLatitude: tangelo.accessor({value: 0}),
            nodeLongitude: tangelo.accessor({value: 0}),
            nodeSize: tangelo.accessor({value: 20}),
            nodeColor: tangelo.accessor({value: 0}),
            linkColor: tangelo.accessor({value: 0}),
            linkSource: tangelo.accessor({value: 0}),
            linkTarget: tangelo.accessor({value: 0}),
            data: null
        },

        _create: function () {
            var that = this,
                vegaspec = tangelo.vegaspec.geovis(that.options.worldGeometry);

            vg.parse.spec(vegaspec, function (chart) {
                that.vis = chart;

                that._update();
            });
        },

        _update: function () {
            var that = this;

            $.each(this.options.data.nodes, function (i, v) {
                var d = that.options.data.nodes[i];

                d.latitude = that.options.nodeLatitude(d);
                d.longitude = that.options.nodeLongitude(d);
                d.size = that.options.nodeSize(d);
                d.color = that.options.nodeColor(d);
            });

            $.each(this.options.data.links, function (i, v) {
                var d = that.options.data.links[i];

                d.color = that.options.linkColor(d);
                d.source = that.options.linkSource(d);
                d.target = that.options.linkTarget(d);
            });

            if (that.vis) {
                that.vis({
                    el: this.element.get(0),
                    data: {
                        table: that.options.data.nodes,
                        links: that.options.data.links
                    }
                }).update();
            }
        }
    });
}(window.tangelo, window.jQuery, window.vg));
/*jslint browser: true, unparam: true, nomen: true */

(function (tangelo, google, d3, $) {
    "use strict";

    if (!(google && $ && $.widget && d3)) {
        $.fn.mapdots = tangelo.unavailable({
            plugin: "mapdots",
            required: ["Google Maps API", "JQuery", "JQuery UI", "d3"]
        });
        return;
    }

    tangelo.widget("tangelo.mapdots", {
        options: {
            hoverContent: tangelo.accessor({value: ""}),
            size: tangelo.accessor({value: 1}),
            color: tangelo.accessor({value: ""}),
            latitude: tangelo.accessor({value: 0}),
            longitude: tangelo.accessor({value: 0}),
            opacity: tangelo.accessor({value: 1}),
            data: null
        },

        _create: function () {
            var el = this.element.get(0),
                that = this,
                overlay,
                options;

            this.map = new google.maps.Map(el, {
                zoom: 2,
                center: new google.maps.LatLng(0, 0),
                mapTypeId: google.maps.MapTypeId.TERRAIN
            });

            d3.select(el)
                //.classed("gmap", true)
                .style("width", "100%")
                .style("height", "100%");

            $(el).resize(function () {
                google.maps.event.trigger(that.map, "resize");
            });

            this.overlay = new google.maps.OverlayView();

            // Add the container when the overlay is added to the map.
            this.overlay.onAdd = function () {
                var sizeScale;

                that.layer = d3.select(this.getPanes().overlayMouseTarget)
                    .append("div")
                    .style("position", "absolute");
                that.colorScale = d3.scale.category10();

                // Draw each marker as a separate SVG element.  We could use a
                // single SVG, but what size would it have?
                this.draw = function () {
                    var marker,
                        ptransform = that.transform(this.getProjection());

                    marker = that.layer.selectAll("svg")
                        .data(that.options.data)
                        .each(ptransform); // update existing markers

                    marker.enter()
                        .append("svg")
                        .each(ptransform)
                        .attr("class", "marker")
                        .style("cursor", "crosshair")
                        .style("position", "absolute")
                        .append("circle");

                    d3.selectAll("svg > circle")
                        .data(that.options.data)
                        .attr("r", function (d) { return that.sizeScale(that.options.size(d)); })
                        .attr("cx", function (d) { return that.sizeScale(that.options.size(d)) + 2; })
                        .attr("cy", function (d) { return that.sizeScale(that.options.size(d)) + 2; })
                        .style("fill", function (d) { return that.colorScale(that.options.color(d)); })
                        .style("opacity", function (d) { return that.options.opacity(d); })
                        .each(function (d) {
                            var cfg, content = that.options.hoverContent(d);
                            if (!content) {
                                return;
                            }
                            cfg = {
                                html: true,
                                container: "body",
                                placement: "top",
                                trigger: "hover",
                                content: that.options.hoverContent(d),
                                delay: {
                                    show: 0,
                                    hide: 0
                                }
                            };
                            $(this).popover(cfg);
                        });

                    marker.exit()
                        .remove();
                };

                this.onRemove = function () {};
            };

            this.overlay.setMap(this.map);
        },

        _update: function () {
            var that = this;

            this.sizeScale = d3.scale.sqrt()
                .domain(d3.extent(this.options.data, this.options.size))
                .range([5, 15]);

            this.transform = function (projection) {
                return function (d) {
                    var s = that.sizeScale(that.options.size(d));
                    d = new google.maps.LatLng(that.options.latitude(d), that.options.longitude(d));
                    d = projection.fromLatLngToDivPixel(d);
                    return d3.select(this)
                        .style("left", (d.x - s - 2) + "px")
                        .style("top", (d.y - s - 2) + "px")
                        .style("width", (2 * s + 4) + "px")
                        .style("height", (2 * s + 4) + "px");
                };
            };

            // Redraw the map.
            if (this.overlay.draw) {
                this.overlay.draw();
            }
        }
    });
}(window.tangelo, window.google, window.d3, window.jQuery));
/*jslint browser: true, nomen: true */

(function (tangelo, $, d3) {
    "use strict";

    if (!($ && $.widget && d3)) {
        $.fn.nodelink = tangelo.unavailable({
            plugin: "nodelink",
            required: ["JQuery", "JQuery UI", "d3"]
        });
        return;
    }

    tangelo.widget("tangelo.nodelink", {
        options: {
            nodeCharge:     tangelo.accessor({value: -130}),
            nodeColor:      tangelo.accessor({value: "steelblue"}),
            nodeSize:       tangelo.accessor({value: 10}),
            nodeLabel:      tangelo.accessor({value: ""}),
            nodeOpacity:    tangelo.accessor({value: 1}),
            nodeId:         tangelo.accessor({index: true}),
            linkSource:     tangelo.accessor({field: "source"}),
            linkTarget:     tangelo.accessor({field: "target"}),
            linkDistance:   tangelo.accessor({value: 30}),
            linkOpacity:    tangelo.accessor({value: 0.2}),
            nodeX:          tangelo.accessor(),
            nodeY:          tangelo.accessor(),
            width:          1000,
            height:         1000,
            dynamicLabels:  false,
            data:           null
        },

        _create: function () {
            this.colorScale = d3.scale.category10();

            this.force = d3.layout.force();

            this.svg = d3.select(this.element.get(0))
                .append("svg");
        },

        _update: function () {
            var that = this,
                nodeIdMap = {};

            if (this.options.nodeX && !this.options.nodeX.undefined) {
                this.xScale = d3.scale.linear()
                    .domain(d3.extent(this.options.data.nodes, this.options.nodeX))
                    .range([50, this.options.width - 100]);
            }

            if (this.options.nodeY && !this.options.nodeY.undefined) {
                this.yScale = d3.scale.linear()
                    .domain(d3.extent(this.options.data.nodes, this.options.nodeY))
                    .range([this.options.height - 100, 50]);
            }

            this.force.linkDistance(this.options.linkDistance)
                .charge(this.options.nodeCharge)
                .size([this.options.width, this.options.height]);

            this.options.data.nodes.forEach(function (d, i) {
                nodeIdMap[that.options.nodeId(d, i)] = d;
                d.degree = 0;
                d.outgoing = [];
                d.incoming = [];
            });

            this.options.data.links.forEach(function (d, i) {
                d.source = nodeIdMap[that.options.linkSource(d, i)];
                d.target = nodeIdMap[that.options.linkTarget(d, i)];
                d.source.degree += 1;
                d.target.degree += 1;
                d.source.outgoing.push(d.target);
                d.target.incoming.push(d.source);
            });

            this.options.data.nodes.sort(function (a, b) {
                return d3.descending(a.degree, b.degree);
            });

            this.sizeScale = d3.scale.sqrt()
                .domain(d3.extent(this.options.data.nodes, that.options.nodeSize))
                .range([5, 15]);

            this.force.size([this.options.width, this.options.height])
                .nodes(this.options.data.nodes)
                .links(this.options.data.links)
                .start();

            this.link = this.svg.selectAll(".link")
                .data(this.options.data.links);

            this.link.enter()
                .append("line")
                .classed("link", true)
                .style("opacity", this.options.linkOpacity)
                .style("stroke", "black")
                .style("stroke-width", 1);

            this.node = this.svg.selectAll(".node")
                .data(this.options.data.nodes);

            this.node.enter()
                .append("circle")
                .classed("node", true)
                .call(this.force.drag)
                .append("title");

            this.node
                .attr("r", function (d, i) {
                    return that.sizeScale(that.options.nodeSize(d, i));
                })
                .style("fill", function (d, i) {
                    return that.colorScale(that.options.nodeColor(d, i));
                })
                .style("opacity", this.options.nodeOpacity);

            this.node.selectAll("title")
                .text(this.options.nodeLabel);

            if (!that.options.dynamicLabels) {
                this.label = this.svg.selectAll("text")
                    .data(this.options.data.nodes);

                this.label.enter().append("text")
                    .text(this.options.nodeLabel);
            }

            this.force.on("tick", function () { that._tick.call(that); });

            this.force.resume();
        },

        _tick: function() {
            var that = this,
                nodeLabels;

            if (this.options.nodeX && !that.options.nodeX.undefined) {
                that.options.data.nodes.forEach(function (d, i) {
                    d.x = that.xScale(that.options.nodeX(d, i));
                });
            }

            if (this.options.nodeY && !that.options.nodeY.undefined) {
                that.options.data.nodes.forEach(function (d, i) {
                    d.y = that.yScale(that.options.nodeY(d, i));
                });
            }

            if (that.options.dynamicLabels) {
                nodeLabels = that._nodeLabels();

                that.svg.selectAll("text").remove();
                that.svg.selectAll("text")
                    .data(nodeLabels)
                    .enter().append("text")
                    .attr("x", function (d) { return d.x; })
                    .attr("y", function (d) { return d.y; })
                    .style("font-size", function (d) { return d.count + 8; })
                    .text(function (d) { return d.label; });
            } else {
                that.label.attr("x", function (d) { return d.x; })
                    .attr("y", function (d) { return d.y; });
            }

            that.link.attr("x1", function (d) { return d.source.x; })
                .attr("y1", function (d) { return d.source.y; })
                .attr("x2", function (d) { return d.target.x; })
                .attr("y2", function (d) { return d.target.y; });

            that.node.attr("cx", function (d) { return d.x; })
                .attr("cy", function (d) { return d.y; });
        },

        // Compute a list of objects of the form:
        // {
        //   count: 5    /* The number of nodes represented */
        //   label: "hi" /* A reduced label representing all nodes */
        //   x: 10
        //   y: 20       /* The x,y location to draw the label */
        // }
        // This will be a reduced set of the original node data.
        _nodeLabels: function() {
            var that = this,
                nodeLabels = [];

            that.options.data.nodes.forEach(function (d) {
                d.visited = false;
            });

            // Walk the graph, collecting connected nodes
            // close to the starting node to collapse into
            // a single label.
            that.options.data.nodes.forEach(function (d, i) {
                var count = 0,
                    labels = [],
                    label;

                function visit(dd) {
                    if (dd.visited) {
                        return;
                    }

                    if (Math.abs(dd.x - d.x) < 50 &&
                            Math.abs(dd.y - d.y) < 50) {
                        count += 1;
                        labels.push(that.options.nodeLabel(dd, i));
                        dd.visited = true;
                        dd.incoming.forEach(visit);
                        dd.outgoing.forEach(visit);
                    }
                }
                visit(d);

                if (count > 1) {
                    label = that._reduceLabels(labels);
                    nodeLabels.push({count: count, label: label, x: d.x, y: d.y});
                }
            });
            return nodeLabels;
        },

        // Reduce a collection of labels into a single label
        // using a frequent sequence of starting words.
        _reduceLabels: function(labels) {
            var label = "",
                prefixTree = {},
                word,
                maxCount,
                maxWord;

            // Build prefix tree
            labels.forEach(function (d) {
                var words, subtree = prefixTree;
                words = d.split(" ");
                while (words.length > 0) {
                    if (!subtree[words[0]]) {
                        subtree[words[0]] = {count: 0, next: {}};
                    }
                    subtree[words[0]].count += 1;
                    subtree = subtree[words[0]].next;
                    words = words.slice(1);
                }
            });

            // Traverse prefix tree for most common prefix
            while (true) {
                maxCount = 0;
                maxWord = 0;
                for (word in prefixTree) {
                    if (prefixTree.hasOwnProperty(word)) {
                        if (prefixTree[word].count > maxCount) {
                            maxCount = prefixTree[word].count;
                            maxWord = word;
                        }
                    }
                }
                if (maxCount < 2) {
                    break;
                }
                label += " " + maxWord;
                prefixTree = prefixTree[maxWord].next;
            }

            return label;
        }
    });

}(window.tangelo, window.jQuery, window.d3));
/*jslint browser: true */

window.tangelo.stream = {};
/*jslint browser: true */

(function (tangelo, $) {
    "use strict";

    tangelo.stream.streams = function (callback) {
        $.ajax({
            url: "/stream",
            dataType: "json",
            error: function (jqxhr) {
                callback(undefined, jqxhr);
            },
            success: function (data) {
                callback(data);
            }
        });
    };

    tangelo.stream.start = function (url, callback) {
        // Form an absolute url from the input.
        url = tangelo.absoluteUrl(url);

        // Send an ajax request to get the stream started.
        $.ajax({
            url: url,
            dataType: "json",
            error: function (jqxhr) {
                callback(undefined, jqxhr);
            },
            success: function (data) {
                callback(data.stream_key);
            }
        });
    };

    tangelo.stream.query = function (key, callback) {
        $.ajax({
            url: "/stream/" + key,
            dataType: "json",
            error: function (jqxhr) {
                callback(undefined, jqxhr);
            },
            success: function (data) {
                if (data.error) {
                    console.warn("[tangelo.stream.query()] error: " + data.error);
                    return;
                }

                callback(data);
            }
        });
    };

    tangelo.stream.run = function (key, callback, delay) {
        // NOTE: we can't "shortcut" this (e.g. "delay = delay || 100") because
        // this will prevent the user from passing "0" in as the delay argument.
        if (delay === undefined) {
            delay = 100;
        }

        // Make an ajax call, and in the error and success callbacks, use
        // setTimeout to fire this function again, etc.
        $.ajax({
            url: "/stream/" + key,
            dataType: "json",
            error: function (jqxhr) {
                console.warn("[tangelo.stream.run()] error: ajax call failed; aborting stream run");
                callback(undefined, jqxhr);
            },
            success: function (data) {
                var result,
                    keepgoing = true;

                if (data.error) {
                    console.warn("[tangelo.stream.run()] error: " + data.error + "; aborting stream run");
                    return;
                }

                // Invoke the callback, and if it returns a value, inspect
                // it to possibly affect how to continue.
                result = callback(data);
                if (result !== undefined) {
                    if (tangelo.isFunction(result)) {
                        // If the callback returns a new function, use that
                        // function for the next invocation of the stream.
                        callback = result;
                    } else if (tangelo.isBoolean(result)) {
                        // If the callback returns a boolean value, use that
                        // as a cue about whether to continue running the
                        // stream or not.
                        keepgoing = result;
                    } else if (tangelo.isNumber(result)) {
                        // If it returns a numerical value, use that as the
                        // new delay time.
                        delay = result;
                    }
                }

                // If we are meant to keep going, schedule this function to
                // run again after the specified delay.
                if (keepgoing) {
                    window.setTimeout(tangelo.stream.run, delay, key, callback, delay);
                }
            }
        });
    };

    tangelo.stream.delete = function (key, callback) {
        $.ajax({
            url: "/stream/" + key,
            dataType: "json",
            type: "DELETE",
            error: function (jqxhr) {
                if (callback) {
                    callback(undefined, jqxhr);
                }
            },
            success: function (data) {
                if (callback) {
                    callback(data);
                }
            }
        });
    };

}(window.tangelo, window.$));
/*jslint browser: true */
window.tangelo.data = {};
/*jslint browser: true */

(function (tangelo) {
    "use strict";

    tangelo.data.tree = function(spec) {
        var id = tangelo.accessor(spec.id, ""),
            idChild = tangelo.accessor(spec.idChild, ""),
            children = tangelo.accessor(spec.children),
            data = spec.data,
            nodeMap = {},
            root;

        data.forEach(function (d) {
            nodeMap[id(d)] = d;
        });

        data.forEach(function (d) {
            if (children(d)) {
                d.children = [];
                children(d).forEach(function (c) {
                    var child = nodeMap[idChild(c)];
                    child.hasParent = true;
                    d.children.push(child);
                });
            }
        });

        data.forEach(function (d) {
            if (!d.hasParent) {
                root = d;
            }
            delete d.hasParent;
        });

        return root;
    };

}(window.tangelo));
