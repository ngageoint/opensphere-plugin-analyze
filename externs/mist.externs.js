/**
 * @type {Object}
 */
var mistx;


/**
 * Namespace.
 * @type {Object}
 */
mistx.gfb;


/**
 * Namespace.
 * @type {Object}
 */
mistx.gfb.stream;



/**
 * @constructor
 */
mistx.gfb.stream.Geometry = function() {};


/**
 * @type {string}
 */
mistx.gfb.stream.Geometry.prototype.type;



/**
 * @constructor
 */
mistx.gfb.stream.Coordinate = function() {};


/**
 * @type {number}
 */
mistx.gfb.stream.Coordinate.prototype.x;


/**
 * @type {number}
 */
mistx.gfb.stream.Coordinate.prototype.y;



/**
 * @extends {mistx.gfb.stream.Geometry}
 * @constructor
 */
mistx.gfb.stream.PointGeometry = function() {};


/**
 * @type {mistx.gfb.stream.Coordinate}
 */
mistx.gfb.stream.PointGeometry.prototype.point;



/**
 * @extends {mistx.gfb.stream.Geometry}
 * @constructor
 */
mistx.gfb.stream.MultiPointGeometry = function() {};


/**
 * @type {Array<!mistx.gfb.stream.PointGeometry>}
 */
mistx.gfb.stream.MultiPointGeometry.prototype.points;



/**
 * @extends {mistx.gfb.stream.Geometry}
 * @constructor
 */
mistx.gfb.stream.LineGeometry = function() {};


/**
 * @type {Array<!mistx.gfb.stream.Coordinate>}
 */
mistx.gfb.stream.LineGeometry.prototype.points;



/**
 * @extends {mistx.gfb.stream.Geometry}
 * @constructor
 */
mistx.gfb.stream.MultiLineGeometry = function() {};


/**
 * @type {Array<!mistx.gfb.stream.LineGeometry>}
 */
mistx.gfb.stream.MultiLineGeometry.prototype.lines;



/**
 * @extends {mistx.gfb.stream.Geometry}
 * @constructor
 */
mistx.gfb.stream.PolygonGeometry = function() {};


/**
 * @type {Array<!mistx.gfb.stream.Coordinate>}
 */
mistx.gfb.stream.PolygonGeometry.prototype.points;



/**
 * @extends {mistx.gfb.stream.Geometry}
 * @constructor
 */
mistx.gfb.stream.MultiPolygonGeometry = function() {};


/**
 * @type {Array<!mistx.gfb.stream.PolygonGeometry>}
 */
mistx.gfb.stream.MultiPolygonGeometry.prototype.polygons;


/**
 * @extends {mistx.gfb.stream.Geometry}
 * @constructor
 */
mistx.gfb.stream.GeometryCollection = function() {};


/**
 * @type {Array<!mistx.gfb.stream.Geometry>}
 */
mistx.gfb.stream.GeometryCollection.prototype.geometries;


/**
 * Namespace.
 * @type {Object}
 */
mistx.video;


/**
 * @typedef {{
 *  videoTag: HTMLVideoElement,
 *  startTime: number
 * }}
 */
mistx.video.Video;


/**
 * @typedef {{
 *   absoluteTime: (number|undefined),
 *   format: string,
 *   height: (number|undefined),
 *   id: string,
 *   external: (boolean|undefined),
 *   play: (boolean|undefined),
 *   sync: (boolean|undefined),
 *   title: (string|undefined),
 *   url: string,
 *   width: (number|undefined)
 * }}
 */
mistx.video.VideoOptions;


/**
 * Namespace.
 * @type {Object}
 */
mistx.track;


/**
 * @typedef {{
 *   filter: string,
 *   mappings: !Array<!Object>,
 *   startColumn: string,
 *   endColumn: string,
 *   queried: boolean,
 *   loading: boolean,
 *   uri: string
 * }}
 */
mistx.track.QueryOptions;
