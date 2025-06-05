import Util from '@services/util.js';
import H5PUtil from '@services/utils-h5p.js';
import Dictionary from '@services/dictionary.js';
import Main from '@components/main.js';
import { decode } from 'he';
import '@styles/h5p-editable-text.scss';

/** @constant {string} Default description */
const DEFAULT_DESCRIPTION = 'HTML Text Input Field';

export default class EditableText extends H5P.EventDispatcher {
  /**
   * @class
   * @param {object} params Parameters passed by the editor.
   * @param {number} contentId Content's id.
   * @param {object} [extras] Saved state, metadata, etc.
   */
  constructor(params, contentId, extras = {}) {
    super();

    // Sanitize parameters
    this.params = Util.extend({
      text: '',
      placeholder: '',
      behaviour: {
        userCanEdit: true,
        ckeditorIsOpenPermanently: false
      },
      l10n: {},
      a11y: {},
    }, params);

    this.callbacks = {};

    this.contentId = contentId;
    this.extras = extras;

    // Fill dictionary
    this.dictionary = new Dictionary();
    this.dictionary.fill({ l10n: this.params.l10n, a11y: this.params.a11y });

    this.previousState = extras?.previousState || {};
    this.language = extras?.metadata?.language || extras?.metadata?.defaultLanguage || 'en';

    // Initialize main component
    this.main = new Main(
      {
        language: this.language,
        text: this.previousState.main?.text || this.params.text,
        placeholder: Util.stripHTML(decode(this.params.placeholder)),
        userCanEdit: this.params.behaviour.userCanEdit,
        ckeditorIsOpenPermanently: this.params.behaviour.ckeditorIsOpenPermanently,
        backgroundColor: this.previousState.main?.backgroundColor || this.params.backgroundColor,
        isRoot: this.isRoot(),
        l10n: this.params.l10n,
        a11y: this.params.a11y,
      },
      {
        onResized: () => {
          this.trigger('resize');
        },
        onChanged: (text) => {
          this.trigger('changed', { text: text });
        },
      }
    );
  }

  /**
   * Attach library to wrapper.
   * @param {H5P.jQuery} $wrapper Content's container.
   */
  attach($wrapper) {
    this.dom = $wrapper.get(0);
    this.dom.classList.add('h5p-editable-text');
    this.dom.append(this.main.getDOM());
  }

  /**
   * Get task title.
   * @returns {string} Title.
   */
  getTitle() {
    // H5P Core function: createTitle
    return H5P.createTitle(
      this.extras?.metadata?.title || DEFAULT_DESCRIPTION
    );
  }

  /**
   * Get description.
   * @returns {string} Description.
   */
  getDescription() {
    return DEFAULT_DESCRIPTION;
  }

  /**
   * Get current state.
   * @returns {object} Current state to be retrieved later.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-7}
   */
  getCurrentState() {
    return {
      main: this.main.getCurrentState()
    };
  }

  /**
   * Set scaled font size.
   * @param {number} sizePx Font size in pixels.
   */
  setFontSize(sizePx) {
    this.dom.style.setProperty('--scaled-font-size', `${sizePx}px`);
  }

  getSummary() {
    return `${this.dictionary.get('a11y.text')}: ${this.main.getResponse()}`;
  }

  setPassEditorDialogCallback(callback) {
    this.callbacks.passEditorDialog = callback;
  }

  async openEditorDialog(params = {}) {
    if ( typeof this.callbacks.passEditorDialog !== 'function') {
      return;
    }

    this.translatedSemantics = this.translatedSemantics ?? await H5PUtil.getTranslatedSemantics(this.language);

    const userParams = this.getCurrentState().main;
    const mergedParams = { ...this.params, ...userParams };

    this.callbacks.passEditorDialog(
      {
        versionedName: this.libraryInfo.versionedName,
        params: mergedParams,
        title: this.getTitle(),
        fields: this.translatedSemantics.filter((field) => field.name === 'text' || field.name === 'backgroundColor'),
        values: this.getCurrentState().main,
      },
      {
        setValues: (newParams, isEditor) => {
          this.updateParams(newParams, isEditor);
          if (params.activeElement) {
            params.activeElement.focus();
          }
        }
      }
    );
  }

  updateParams(params) {
    params.forEach((param) => {
      this.params[param.name] = param.value;
    });

    this.main.updateParams(this.params);
  }
}
