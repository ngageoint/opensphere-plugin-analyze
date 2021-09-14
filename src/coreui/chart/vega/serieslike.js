goog.declareModuleId('coreui.chart.vega.SeriesLike');


const {Series} = goog.requireType('coreui.chart.vega.data.Series');
const SourceHistogram = goog.requireType('os.data.histo.SourceHistogram');


/**
 * @typedef {Series|SourceHistogram}
 */
export let SeriesLike;
