goog.declareModuleId('coreui.chart.stats');

/**
 * Statistic types.
 * @enum {string}
 */
export const StatType = {
  MEAN: 'mean',
  MEDIAN: 'median',
  STDDEV: 'stddev',
  STDDEV2: 'stddev2',
  STDDEV3: 'stddev3'
};

/**
 * User-facing title for each stat type.
 * @type {!Object<string, string>}
 */
export const StatTitle = {
  [StatType.MEAN]: 'Mean',
  [StatType.MEDIAN]: 'Median',
  [StatType.STDDEV]: '1 Standard Deviation',
  [StatType.STDDEV2]: '2 Standard Deviations',
  [StatType.STDDEV3]: '3 Standard Deviations'
};


/**
 * Compute the median from a set of values.
 * @param {Array<number>} values The values.
 * @return {number} The median.
 */
const getMedian = (values) => {
  if (!values || !values.length) {
    return NaN;
  }

  const middle = Math.floor(values.length / 2);
  return values.length % 2 == 1 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
};


/**
 * Compute the mean from a set of values.
 * @param {Array<number>} values The values.
 * @return {number} The mean.
 */
const getMean = (values) => {
  if (!values || !values.length) {
    return NaN;
  }

  return getSum(values) / values.length;
};


/**
 * Compute the sum from a set of values.
 * @param {Array<number>} values The values.
 * @return {number} The sum.
 */
const getSum = (values) => {
  if (!values || !values.length) {
    return NaN;
  }

  return values.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
};


/**
 * Compute the standard deviation from a set of values.
 * @param {Array<number>} values The values.
 * @param {number=} opt_mean The mean. Mean will be computed unless provided.
 * @return {number} The standard deviation.
 */
const getStandardDeviation = (values, opt_mean) => {
  if (!values || values.length < 2) {
    return NaN;
  }

  const mean = opt_mean != null ? opt_mean : getMean(values);
  return Math.sqrt(getVariance(values, mean));
};


/**
 * Compute the variance from a set of values.
 * @param {Array<number>} values The values.
 * @param {number=} opt_mean The mean.
 * @return {number} The variance.
 */
const getVariance = (values, opt_mean) => {
  if (!values || values.length < 2) {
    return NaN;
  }

  const mean = opt_mean != null ? opt_mean : getMean(values);
  return getSum(values.map((val) => Math.pow(val - mean, 2))) / values.length;
};


/**
 * Get a default chart stats object.
 * @return {!bitsx.chart.ChartStats}
 */
export const getDefaultStats = () => ({
  min: NaN,
  max: NaN,
  mean: NaN,
  median: NaN,
  stddev: NaN
});

/**
 * Get stats from a set of objects, using a specific field on the objects.
 * @param {Array<*>} items The items.
 * @param {string} field The value field on the feature.
 * @return {!bitsx.chart.ChartStats}
 * @suppress {accessControls}
 */
export const getDataStats = (items, field) => {
  if (!items || !items.length || !field || typeof field != 'string' || field.toLowerCase().indexOf('time') > -1) {
    return getDefaultStats();
  }

  const values = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item) {
      // don't factor NaN values into calculation for mixed data
      const value = item[field] != null ? parseFloat(item[field]) : NaN;
      if (!isNaN(value)) {
        values.push(value);
      }
    }
  }

  return getValueStats(values);
};

/**
 * Get stats from a set of features, using a specific field on the features.
 * @param {Array<ol.Feature>} features The features.
 * @param {string} field The value field.
 * @return {!bitsx.chart.ChartStats}
 * @suppress {accessControls} To allow direct access to feature metadata.
 */
export const getFeatureStats = (features, field) => {
  if (!features || !features.length || !field || typeof field != 'string' || field.toLowerCase()
      .indexOf('time') > -1) {
    return getDefaultStats();
  }

  const values = [];
  for (let i = 0; i < features.length; i++) {
    const feature = features[i];
    if (feature) {
      // don't factor NaN values into calculation for mixed data
      const value = feature.values_[field] != null ? parseFloat(feature.values_[field]) : NaN;
      if (!isNaN(value)) {
        values.push(value);
      }
    }
  }

  return getValueStats(values);
};

/**
 * Get stats for a set of numeric values.
 * @param {Array<number>} values
 * @return {!bitsx.chart.ChartStats}
 */
export const getValueStats = (values) => {
  if (!values || !values.length) {
    return getDefaultStats();
  }

  // ascending numerical sort
  values.sort((a, b) => a - b);

  const mean = getMean(values);
  const median = getMedian(values);
  const stdDev = getStandardDeviation(values, mean);

  // if any of the included stats are NaN, assume stats cannot be computed accurately
  if (!isNaN(mean) && !isNaN(median) && !isNaN(stdDev)) {
    return {
      min: values[0],
      max: values[values.length - 1],
      mean: mean,
      median: median,
      stddev: stdDev
    };
  }

  return getDefaultStats();
};
