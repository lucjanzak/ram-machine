import en from "../../lang/en.json" with { type: "json" };
import pl from "../../lang/pl.json" with { type: "json" };
export type Translation = typeof en;
const translations1 = {en, pl};
export const translations: {[key in keyof typeof translations1]: Translation} = translations1;
export const currentTranslationKey = window.currentLanguage;

// Current translation:
export const t = translations[currentTranslationKey];