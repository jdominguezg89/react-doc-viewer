import mustache from "mustache";
import { useCallback, useContext } from "react";
import { defaultLanguage, locales } from "../i18n";
import { DocViewerContext } from "../store/DocViewerProvider";

// Translations are rendered as React text, never as HTML, so mustache's
// HTML escaping would only produce visible entities ("&#x2F;").
const render = (
  template: string,
  variables?: Record<string, string | number>,
) =>
  mustache.render(
    template,
    variables,
    {},
    { escape: (value) => String(value) },
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
