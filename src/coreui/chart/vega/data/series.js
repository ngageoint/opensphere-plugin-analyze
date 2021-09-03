goog.declareModuleId('coreui.chart.vega.data.Series');

import * as osFeature from 'opensphere/src/os/feature/feature.js';

const EventTarget = goog.require('goog.events.EventTarget');
const osFields = goog.require('os.Fields');
const ColorBin = goog.require('os.data.histo.ColorBin');
const DateBinMethod = goog.require('os.histo.DateBinMethod');
const DateRangeBinType = goog.require('os.histo.DateRangeBinType');
const NumericBinMethod = goog.require('os.histo.NumericBinMethod');
const UniqueBinMethod = goog.require('os.histo.UniqueBinMethod');
const DataType = goog.require('os.xsd.DataType');

const DataModel = goog.requireType('os.data.xf.DataModel');
const IGroupable = goog.requireType('os.data.xf.IGroupable');
const DateBinType = goog.requireType('os.histo.DateBinType');
const IBinMethod = goog.requireType('os.histo.IBinMethod');


/**
 * Series for vega chart, backed by DataModel
 * Manages the data.bins and serves them to the chart
 * @implements {IGroupable<T>}
 * @template T
 * @unrestricted
 */
class Series extends EventTarget {
  /**
   * Constructor.
   * @param {string} id the field on the item
   * @param {DataModel} xf
   * @param {string} type string, decimal, dateTime
   * @param {string} color the fallback color for this series
   * @param {string=} opt_binType e.g. os.histo.DateBinType
   * @param {number=} opt_width
   * @param {number=} opt_offset
   * @param {boolean=} opt_showEmpty
   */
  constructor(id, xf, type, color, opt_binType, opt_width, opt_offset, opt_showEmpty) {
    super();
    /**
     * The field name; functions as label
     * @type {string}
     */
    this.id = id;

    /**
     * The user-facing name for the series.
     * @type {?string}
     * @protected
     */
    this.name = null;

    /**
     * The data model in question
     * @type {DataModel}
     */
    this.xf = xf;

    /**
     * string, dateTime, decimal (used to setup the scales and choose a bin method)
     * @type {string}
     */
    this.type = type;

    /**
     * base color for this series
     * @type {string}
     */
    this.color = color;

    /**
     * The type of bin for the series for non numeric data e.g. os.histo.DateRangeBinType
     * @type {string|undefined}
     */
    this.binType = opt_binType;

    /**
     * The width of bins that this series should be divided into if the type is numeric
     * @type {number|undefined}
     */
    this.binWidth = opt_width;

    /**
     * The offset of bins if the type is numeric
     * @type {number|undefined}
     */
    this.binOffset = opt_offset;

    /**
     * The flag to show/hide empty bins for numeric and date bins
     * @type {boolean|undefined}
     */
    this.binShowEmpty = opt_showEmpty;

    /**
     * The domain of values
     * @type {Array<number|string>}
     */
    this.domain = [];

    /**
     * Setup the bin method
     * @type {IBinMethod}
     */
    this.binMethod = this.initBinMethod();

    this.initDataModel();
  }

  /**
   * @inheritDoc
   */
  disposeInternal() {
    super.disposeInternal();

    this.domain = null;
    this.accessor = null;
  }

  /**
   * @inheritDoc
   */
  getName() {
    return this.name;
  }

  /**
   * @inheritDoc
   */
  setName(value) {
    this.name = value;
  }

  /**
   * @inheritDoc
   */
  getBinMethod() {
    return this.binMethod;
  }

  /**
   * @inheritDoc
   * @export Prevent the compiler from moving the function off the prototype.
   */
  setBinMethod(method) {
    this.binMethod = method;

    this.initDataModel();
  }

  /**
   * Prepare the adjustment
   */
  initDataModel() {
    this.xf.addDimension(this.id, this.binMethod.getValue.bind(this.binMethod),
        this.binMethod.getArrayKeys());
  }

  /**
   * Prepare the adjustment
   * @return {IBinMethod}
   */
  initBinMethod() {
    this.binMethod = null;
    if (this.id == osFields.TIME) {
      this.type = Series.DATE_TIME;
    }
    switch (this.type) {
      case Series.DATE_TIME:
        this.binMethod = new DateBinMethod();
        if (this.binType != null) {
          this.binMethod.setDateBinType(/** @type {DateBinType} */ (this.binType));
          this.binMethod.setShowEmptyBins(this.binShowEmpty == true); // loose truthy
          if (DateRangeBinType[this.binType]) {
            this.binMethod.setArrayKeys(true);
          }
        }
        break;
      case DataType.DECIMAL:
      case DataType.INTEGER:
      case DataType.FLOAT:
        this.binMethod = new NumericBinMethod();
        this.binMethod.setShowEmptyBins(this.binShowEmpty == true); // loose truthy
        if (this.binWidth != null) {
          this.binMethod.setWidth(this.binWidth);
        }
        if (this.binOffset != null) {
          this.binMethod.setOffset(this.binOffset);
        }
        break;
      default: // string/unique
        this.binMethod = new UniqueBinMethod();
        this.binMethod.setField(this.id);
        break;
    }

    this.binMethod.setValueFunction(osFeature.getField);

    return this.binMethod;
  }

  /**
   * @return {string}
   */
  getId() {
    return this.id;
  }

  /**
   * @inheritDoc
   */
  reduceAdd(bin, item) {
    bin.addItem(item);
    return bin;
  }

  /**
   * @inheritDoc
   */
  reduceRemove(bin, item) {
    bin.removeItem(item);
    return bin;
  }

  /**
   * @inheritDoc
   */
  reduceInit() {
    const bin = new ColorBin(this.color);
    bin.setColorFunction(function(item) {
      return /** @type {string|undefined} */ (item['color']);
    });
    return bin;
  }
}


/**
 * @type {string}
 * @const
 */
Series.DATE_TIME = 'dateTime';


export default Series;
