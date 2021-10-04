goog.declareModuleId('coreui.chart.vega.SeriesLike');


const {Series} = goog.requireType('coreui.chart.vega.data.Series');
const {default: SourceHistogram} = goog.requireType('os.data.histo.SourceHistogram');


/**
 * @typedef {Series|SourceHistogram}
 */
export let SeriesLike;
