goog.declareModuleId('mist.ui.widget');


/**
 * Widget types.
 * @enum {string}
 */
export const Type = {
  COUNT_BY: 'widget-countby',
  LIST: 'widget-list',
  CHART: 'widget-chart',
  VEGA: 'widget-vega'
};

/**
 * Default configuration for the Count By widget.
 * @type {!GoldenLayout.Component}
 */
export const COUNT_BY = {
  id: Type.COUNT_BY,
  type: 'component',
  componentName: 'angular',
  componentState: {
    'type': Type.COUNT_BY,
    'template': '<countbycontainer container="container" source="source"></countbycontainer>'
  },
  icon: '<i class="fa fa-fw fa-filter"></i>',
  title: 'Count By',
  description: 'Group loaded data by similar metadata fields.'
};

/**
 * Default configuration for the List widget.
 * @type {!GoldenLayout.Component}
 */
export const LIST = {
  id: Type.LIST,
  type: 'component',
  componentName: 'angular',
  componentState: {
    'type': Type.LIST,
    'template': '<listtool container="container" source="source"></listtool>'
  },
  icon: '<i class="fa fa-fw fa-list-alt"></i>',
  title: 'List',
  description: 'View loaded data in tabular format.'
};

/**
 * Default configuration for the Chart widget.
 * @type {!GoldenLayout.Component}
 * @deprecated Please use {@link mist.ui.widget.VEGA}
 */
export const CHART = {
  id: Type.CHART,
  type: 'component',
  componentName: 'angular',
  componentState: {
    'type': Type.CHART,
    'template': '<charttool container="container" source="source"></charttool>'
  },
  icon: '<i class="fa fa-fw fa-pie-chart"></i>',
  title: 'Chart',
  description: 'Display loaded data in a chart.'
};

/**
 * Default configuration for the Vega widget.
 * @type {!GoldenLayout.Component}
 */
export const VEGA = {
  id: Type.VEGA,
  type: 'component',
  componentName: 'angular',
  componentState: {
    'type': Type.VEGA,
    'template': '<vegachart container="container" source="source"></vegachart>'
  },
  icon: '<i class="fa fa-fw fa-bar-chart"></i>',
  description: 'Display loaded data in a chart.',
  title: 'Chart'
};
