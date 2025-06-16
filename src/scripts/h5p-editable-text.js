import Util from '@services/util.js';
import H5PUtil from '@services/utils-h5p.js';
import Dictionary from '@services/dictionary.js';
import Main from '@components/main.js';
import QuestionTypeContract from '@mixins/question-type-contract.js';
import XAPI from '@mixins/xapi.js';
import { decode } from 'he';
import '@styles/h5p-editable-text.scss';

/** @constant {string} DEFAULT_LANGUAGE_TAG Default language tag used if not specified in metadata. */
const DEFAULT_LANGUAGE_TAG = 'en';

export default class EditableText extends H5P.EventDispatcher {
  /**
   * @class
   * @param {object} params Parameters passed by the editor.
   * @param {number} contentId Content's id.
   * @param {object} [extras] Saved state, metadata, etc.
   */
  constructor(params, contentId, extras = {}) {
    super();

    Util.addMixins(EditableText, [QuestionTypeContract, XAPI]);

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

    this.wasAnswerGiven = false;

    // Fill dictionary
    this.dictionary = new Dictionary();
    this.dictionary.fill({ l10n: this.params.l10n, a11y: this.params.a11y });

    this.previousState = extras?.previousState || {};
    this.language = extras?.metadata?.language || extras?.metadata?.defaultLanguage || DEFAULT_LANGUAGE_TAG;
    this.languageTag = Util.formatLanguageCode(this.language);

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
          this.wasAnswerGiven = true;
          this.trigger('changed', { text: text });
        },
        onEdited: () => {
          this.trigger('edited', { subContentId: this.subContentId, machineName: this.libraryInfo.machineName });
        }
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
   * Set scaled font size.
   * @param {number} sizePx Font size in pixels.
   */
  setFontSize(sizePx) {
    this.dom.style.setProperty('--scaled-font-size', `${sizePx}px`);
  }

  /**
   * Get a summary of the component.
   * @returns {string} Summary of component.
   */
  getSummary() {
    return `${this.dictionary.get('a11y.text')}: ${this.main.getResponse()}`;
  }

  /**
   * Set the callback for passing editor dialog.
   * @param {function} callback The callback function for editor dialog.
   */
  setPassEditorDialogCallback(callback) {
    this.callbacks.passEditorDialog = callback;
  }

  /**
   * Open the editor dialog.
   * @param {object} [params] Parameters for opening the editor dialog.
   * @param {HTMLElement} [params.activeElement] Element to focus after dialog closes.
   */
  async openEditorDialog(params = {}) {
    if ( typeof this.callbacks.passEditorDialog !== 'function') {
      return;
    }

    this.translatedSemantics = this.translatedSemantics ?? await H5PUtil.getTranslatedSemantics(this.language);

    const userParams = this.getCurrentState()?.main || {};
    const mergedParams = { ...this.params, ...userParams };

    this.callbacks.passEditorDialog(
      {
        versionedName: this.libraryInfo.versionedName,
        params: mergedParams,
        title: this.getTitle(),
        fields: this.translatedSemantics.filter((field) => field.name === 'text' || field.name === 'backgroundColor'),
        values: this.main.getCurrentState(),
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

  /**
   * Update component parameters and refresh the view.
   * @param {object[]} params Parameter objects to update.
   * @param {string} params[].name Name of the parameter to update.
   * @param {*} params[].value New value for the parameter.
   */
  updateParams(params) {
    params.forEach((param) => {
      this.params[param.name] = param.value;
    });

    this.main.updateParams(this.params);
  }
}
