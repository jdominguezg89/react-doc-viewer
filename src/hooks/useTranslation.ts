import { useCallback, useContext } from "react";
import { defaultLanguage, locales } from "../i18n";
import { DocViewerContext } from "../store/DocViewerProvider";

/**
 * Fills `{{ name }}` placeholders. The locale files are internal and only
 * use plain placeholders, and the result is rendered as React text, so no
 * template engine or HTML escaping is needed.
 */
const render = (
  template: string,
  variables?: Record<string, string | number>,
): string =>
  template.replace(/\{\{\{?\s*(\w+)\s*\}?\}\}/g, (_match, name: string) =>
    String(variables?.[name] ?? ""),
  );

export const useTranslation = () => {
  const {
    state: { language },
  } = useContext(DocViewerContext);

  const defaultTranslations = locales[defaultLanguage];

  const t = useCallback(
    (
      key: keyof typeof defaultTranslations,
      variables?: Record<string, string | number>,
    ) => {
      const translations = locales[language];

      if (translations[key]) {
        return render(translations[key], variables);
      }

      if (defaultTranslations[key]) {
        return render(defaultTranslations[key], variables);
      }

      return key;
    },
    [language, defaultTranslations],
  );

  return {
    t,
  };
};
