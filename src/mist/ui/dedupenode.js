goog.declareModuleId('mist.ui.DedupeNode');

import {getNodeUi} from './dedupenodeui.js';

const SlickTreeNode = goog.require('os.ui.slick.SlickTreeNode');
const ISearchable = goog.requireType('os.data.ISearchable');


/**
 * Tree nodes for dedupes
 * @implements {ISearchable}
 */
export class DedupeNode extends SlickTreeNode {
  /**
   * Constructor.
   * @param {Object} entry
   */
  constructor(entry) {
    super();

    /**
     * @type {Object}
     * @protected
     */
    this.item = entry;

    this.id = goog.string.getRandomString();

    this.setCheckboxVisible(false);
    this.setNodetoggleVisible(false);
    if (this.item.title) {
      this.setLabel(this.item.title);
    }
    this.bold = false;
    this.nodeUI = getNodeUi();
  }

  /**
   * Get the item.
   * @return {Object} The item.
   */
  getItem() {
    return this.item;
  }

  /**
   * Set the item.
   * @param {Object} value The new item.
   */
  setItem(value) {
    this.item = value;
    if (this.item.title) {
      this.setLabel(this.item.title);
    }
  }

  /**
   * @inheritDoc
   */
  formatIcons() {
    if (this.item && this.item.invalid) {
      return DedupeNode.INVALID_ICON;
    }

    return super.formatIcons();
  }

  /**
   * @inheritDoc
   */
  getLabel() {
    if (this.item && this.item.title) {
      return this.item.title;
    }

    return super.getLabel();
  }

  /**
   * @inheritDoc
   */
  getSearchText() {
    return '';
  }

  /**
   * @inheritDoc
   */
  getTags() {
    return null;
  }
}

/**
 * Icon to display to when a node is invalid.
 * @type {string}
 * @const
 */
DedupeNode.INVALID_ICON = `<i class="fa fa-fw fa-warning text-warning" title="One or more columns are
    missing on the layer, so the configuration cannot be applied."></i>`;
