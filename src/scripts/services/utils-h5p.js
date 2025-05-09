import Util from '@services/util.js';
import semantics from '@root/semantics.json';
import libraryJson from '@root/library.json';

/** Class for h5p related utility functions */
export default class H5PUtil {
  /**
   * Get semantics.
   * @returns {object} Semantics.
   */
  static getSemantics() {
    return semantics;
  }

  /**
   * Find a semantics field by name in a semantics structure. Beware of duplicate field names!
   * @param {string} fieldName Name of the field to find.
   * @param {object|Array} semanticsStructure Semantics structure to search in.
   * @returns {object|null} The first semantics field that fits, null otherwise.
   */
  static findSemanticsField(fieldName, semanticsStructure = semantics) {
    if (!semanticsStructure) {
      return null;
    }

    if (Array.isArray(semanticsStructure)) {
      return semanticsStructure
        .map((semanticsChunk) => H5PUtil.findSemanticsField(fieldName, semanticsChunk))
        .find((result) => result !== null) || null;
    }

    if (semanticsStructure.name === fieldName) {
      return semanticsStructure;
    }

    if (semanticsStructure.field) {
      const result = H5PUtil.findSemanticsField(fieldName, semanticsStructure.field);
      if (result !== null) {
        return result;
      }
    }

    if (semanticsStructure.fields) {
      const result = H5PUtil.findSemanticsField(fieldName, semanticsStructure.fields);
      if (result !== null) {
        return result;
      }
    }

    return null;
  }

  /**
   * Get a translated version of semantics if available.
   * @param {string} languageCode Language code.
   * @returns {object} Translated semantics structure.
   */
  static async getTranslatedSemantics(languageCode) {
    if (!languageCode || languageCode === 'en') {
      return semantics;
    }

    const translation = await H5PUtil.getTranslation(languageCode);

    if (!translation?.semantics) {
      return semantics;
    }

    return Util.mergeDeep(semantics, translation.semantics);
  }

  /**
   * Get loaded library version for an H5P machine name.
   * @param {string} machineName Machine name of the library.
   * @returns {string} Version of the library as major.minor or empty string if not found.
   */
  static getLibraryVersion(machineName) {
    if (!machineName) {
      return '';
    }

    const dirs = H5PIntegration?.libraryDirectories ?? {};
    const matchedKey = Object.keys(dirs).find((key) => key.startsWith(machineName));

    return matchedKey ? matchedKey.split('-').pop() : '';
  }

  /**
   * Get the Uber name of the library.
   * @returns {string} Uber name of the content type.
   */
  static getUberName() {
    return `${libraryJson.machineName}-${libraryJson.majorVersion}.${libraryJson.minorVersion}`;
  }

  /**
   * Get translation file contents for a given language code.
   * @param {string} [languageCode] Language code.
   * @returns {Promise<object>} Translation object or undefined if not found.
   */
  static async getTranslation(languageCode = 'en') {
    const libraryPath = H5P.getLibraryPath(H5PUtil.getUberName());
    const languagePath = `${libraryPath}/language/${languageCode}.json`;

    try {
      const response = await fetch(languagePath);
      if (!response.ok) {
        return;
      }

      const translation = await response.json();
      return translation;
    }
    catch (error) {
      return;
    }
  }
}
