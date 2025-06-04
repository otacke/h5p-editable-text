import Util from '@services/util';
import { getAccessibleContrastColor, roundColorString } from '@services/utils-color.js';
import './text-input.scss';

/** @constant {object} DEFAULT_CKE_CONFIG Config mirroring html widget in semantics.json */
const DEFAULT_CKE_CONFIG = {
  removePlugins: ['MathType'],
  updateSourceElementOnDestroy: true,
  startupFocus: false,
  toolbar: [
    'bold', 'italic', 'underline', 'strikeThrough', 'Subscript', 'Superscript', '|',
    'RemoveFormat', '|',
    'alignment', 'bulletedList', 'numberedList', '|',
    'link', '|',
    'horizontalLine', 'heading', 'fontSize', 'fontColor'
  ],
  link: {
    defaultProtocol: 'https://',
  },
  heading: {
    options: [
      { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
      { model: 'formatted', view: 'pre', title: 'Formatted' },
      { model: 'address', view: 'address', title: 'Address' },
      { model: 'normal', view: 'div', title: 'Normal (DIV)' }
    ]
  },
  alignment: {
    options: ['left', 'center', 'right']
  }
};

export default class TextInput {
  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      userCanEdit: true,
      language: 'en',
    }, params);

    this.callbacks = Util.extend({
      onResized: () => {}
    }, callbacks);

    this.canBeHidden = true;

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-editable-text-container');

    this.setBackgroundColor(this.params.backgroundColor);

    this.textarea = document.createElement('div');
    this.textarea.classList.add('h5p-editable-text-textarea');
    this.textarea.setAttribute('tabindex', 0);
    this.textarea.setAttribute('placeholder', this.params.placeholder);
    if (this.params.text) {
      this.textarea.innerHTML = this.params.text;
    }

    if (this.params.userCanEdit) {
      this.textarea.addEventListener('focus', (event) => {
        // Prevent outside click listener from firing when click caused focus
        this.canBeHidden = false;
        window.requestAnimationFrame(() => {
          this.canBeHidden = true;
        });

        this.initCKEditor( { text: this.textarea.innerHTML } );
        this.showCKEditor();
      });

      this.textarea.addEventListener('click', (event) => {
        this.initCKEditor( { text: this.textarea.innerHTML } );
        this.showCKEditor();
      });

      if (this.params.ckeditorIsOpenPermanently) {
        this.initCKEditor({ text: this.textarea.innerHTML, startupFocus: false });
        this.showCKEditor();
        this.textarea.classList.add('opacity-zero');
      }
      else {
        document.addEventListener('click', (event) => {
          if (!this.canBeHidden) {
            return;
          }

          const wasClickedOutside = event.target.closest('.h5p-editable-text') === null;
          if (!wasClickedOutside) {
            return;
          }

          this.hideCKEditor();
        });
      }
    }

    this.textarea.id = this.params.id;

    this.dom.append(this.textarea);
  }

  getDOM() {
    return this.dom;
  }

  /**
   * Initialize CKEditor.
   * @param {object} [config] Configuration.
   */
  initCKEditor(config = {}) {
    if (this.ckeditor) {
      return;
    }

    /*
     * Workaround for H5PCLI that for some reason adds the patch version to the path
     * @see https://h5ptechnology.atlassian.net/browse/HFP-4240
     */
    for (let uberName in H5PIntegration.libraryDirectories) {
      const path = H5PIntegration.libraryDirectories[uberName];
      let [ main, version ] = path.split('-');
      version = version.split('.').slice(0, 2).join('.');
      H5PIntegration.libraryDirectories[uberName] = `${main}-${version}`;
    }

    this.ckeditor = this.buildCKEditor(config);
    this.updateTextAreaFromCKEditor();
  }

  showCKEditor() {
    if (this.isShowingCKEditor) {
      return;
    }

    const config = Util.extend(
      DEFAULT_CKE_CONFIG,
      { title: this.params.a11y.textInputTitle, text: this.textarea.innerHTML }
    );

    if (!this.ckeditor) {
      this.initCKEditor(config);
    }

    // Workaround, or else CKEditor will not be initialized properly on concecutive uses
    if (window.ClassicEditor) {
      window.ClassicEditor
        .create(this.textarea, config)
        .then((editor) => {
          editor.ui.element.classList.add('h5p-ckeditor');
          editor.ui.element.style.height = '100%';
          editor.ui.element.style.width = '100%';

          editor.editing.view.focus();

          this.ckeditor = editor;
          this.ckeditor.setData(config.text ?? this.params.text ?? '');
        })
        .catch((error) => {
          throw new Error(`Error loading CKEditor of target ${error}`);
        });
    }
    else {
      this.ckeditor.create();
    }

    this.isShowingCKEditor = true;

    this.callOnceCKEditorVisible(this.dom, () => {
      this.textarea.classList.remove('opacity-zero');

      const ckeditorContentDOM = this.dom.querySelector('.h5p-ckeditor .ck-content');
      ckeditorContentDOM?.addEventListener('keydown', () => {
        this.updateTextAreaFromCKEditor();
        this.callbacks.onResized();
      });

      ckeditorContentDOM.addEventListener('focus', () => {
        // Prevent outside click listener from firing when focus was just given
        this.canBeHidden = false;
        window.requestAnimationFrame(() => {
          this.canBeHidden = true;
        });
      });

      const toolbar = this.dom.querySelector('.h5p-ckeditor .ck-toolbar');
      toolbar?.addEventListener('click', () => {
        this.updateTextAreaFromCKEditor();
        this.callbacks.onResized();
      });

      this.callbacks.onResized();
    });
  }

  hideCKEditor() {
    if (!this.ckeditor) {
      return;
    }

    this.updateTextAreaFromCKEditor();

    this.ckeditor.destroy();
    delete this.ckeditor;
    this.isShowingCKEditor = false;
  }

  /**
   * Build H5P.CKEditor instance (!== CKEditor instance).
   * @param {object} [config] Configuration.
   * @returns {H5P.CKEditor} H5P.CKEditor instance.
   */
  buildCKEditor(config = {}) {
    const editor = new H5P.CKEditor(
      this.params.id,
      this.params.language,
      H5P.jQuery(this.dom),
      config.text ?? this.params.text ?? '',
      Util.extend(DEFAULT_CKE_CONFIG, config)
    );

    return editor;
  }

  /**
   * Get HTML.
   * @returns {string} HTML.
   */
  getHTML() {
    return this.ckeditor?.getData() ?? this.textarea.innerHTML ?? '';
  }

  /**
   * Set HTML.
   * @param {string} html HTML to set.
   */
  setHTML(html) {
    if (typeof html !== 'string') {
      return;
    }

    this.params.text = html;
    this.textarea.innerHTML = html;
  }

  /**
   * Set placeholder text.
   * @param {string} placeholder Placeholder text.
   */
  setPlaceholder(placeholder) {
    if (typeof placeholder !== 'string') {
      return;
    }

    this.params.placeholder = placeholder;
    this.textarea.setAttribute('placeholder', placeholder);
  }

  /**
   * Set background color.
   * @param {string} color Background color.
   */
  setBackgroundColor(color) {
    if (typeof color !== 'string' || !color) {
      return;
    }

    this.params.backgroundColor = color;
    this.dom.style.setProperty('--h5p-editable-text-background-color', color);
    const contrastColor = getAccessibleContrastColor(roundColorString(color));
    this.dom.style.setProperty('--h5p-editable-text-placeholder-color', contrastColor);
  }

  /**
   * Get background color.
   * @returns {string} Background color.
   */
  getBackgroundColor() {
    return this.params.backgroundColor;
  }

  /**
   * Get plain text.
   * @returns {string} Plain text.
   */
  getText() {
    return Util.stripHTML(this.getHTML()) ?? this.textarea.innerText ?? '';
  }

  /**
   * Reset.
   */
  reset() {
    this.params.text = '';
    this.hideCKEditor();

    this.textarea.innerHTML = '';
  }

  /**
   * Call callback function once CKEditor is visible.
   * @param {HTMLElement} dom DOM element to wait on.
   * @param {function} callback Function to call once CKEditor is visible.
   */
  callOnceCKEditorVisible(dom, callback) {
    if (typeof dom !== 'object' || typeof callback !== 'function') {
      return; // Invalid arguments
    }

    const observer = new MutationObserver(() => {
      const ckeditorDOM = dom.querySelector('.h5p-ckeditor');

      if (!ckeditorDOM) {
        return;
      }

      observer.disconnect();

      callback();
    });

    observer.observe(dom, { attributes: true, childList: true, subtree: true });
  }

  /**
   * Update textarea with content from CKEditor.
   */
  updateTextAreaFromCKEditor() {
    const editorContent = this.getHTML();

    if (window.ClassicEditor) {
      window.requestAnimationFrame(() => {
        this.textarea.innerHTML = editorContent;
      });
    }
    else {
      this.textarea.innerHTML = editorContent;
    }
  }
}
