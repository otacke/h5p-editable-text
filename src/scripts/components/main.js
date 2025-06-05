import Util from '@services/util.js';
import TextInput from '@components/elements/text-input.js';
import './main.scss';

/**
 * Main DOM component incl. main controller.
 */
export default class Main {
  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   * @param {object} [callbacks.onXAPI] Callback when user progressed.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);

    this.callbacks = Util.extend({
      onXAPI: () => {},
      onResized: () => {},
      onChanged: () => {}
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-editable-text-main');

    this.dom.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.textInput.hideCKEditor();
      }
    });

    this.initTextInput();

    // Resize content type
    this.callbacks.onResized();
  }

  /**
   * Initialize text input field.
   */
  initTextInput() {
    this.textInput = new TextInput(
      {
        id: `h5p-html-text-input-area-${H5P.createUUID()}`,
        userCanEdit: this.params.userCanEdit,
        language: this.params.language,
        text: this.params.text,
        placeholder: this.params.placeholder,
        ckeditorIsOpenPermanently: this.params.ckeditorIsOpenPermanently,
        backgroundColor: this.params.backgroundColor,
        isRoot: this.params.isRoot,
        a11y: {
          textInputTitle: this.params.a11y.textInputTitle
        }
      },
      {
        onResized: () => {
          this.callbacks.onResized();
        },
        onChanged: (text) => {
          this.callbacks.onChanged(text);
        }
      }
    );
    this.dom.append(this.textInput.getDOM());
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} Content DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Get user response.
   * @returns {string} HTML response of user.
   */
  getResponse() {
    return this.textInput.getHTML();
  }

  /**
   * Get user response in plain text.
   * @returns {object} Current state of the text input.
   */
  getCurrentState() {
    return {
      text: this.textInput.getHTML(),
      backgroundColor: this.textInput.getBackgroundColor()
    };
  }

  /**
   * Reset the field to its initial state.
   */
  reset() {
    this.textInput.reset();
  }

  updateParams(params = {}) {
    this.textInput.setHTML(params.text);
    this.textInput.setPlaceholder(params.placeholder);
    this.textInput.setBackgroundColor(params.backgroundColor);
  }
}
