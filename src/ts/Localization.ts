import en from "../../lang/en.json" with { type: "json" };
import pl from "../../lang/pl.json" with { type: "json" };
export type Translation = typeof en;
const translations1 = {en, pl};
export const translations: {[key in keyof typeof translations1]: Translation} = translations1;
export const currentTranslationKey = window.currentLanguage;

// Current translation:
export const t = translations[currentTranslationKey];

export function formatString(fmt: string, ...args: string[]) {
  args.forEach((value, index) => {
    fmt = fmt.replaceAll(`%${index}`, value);
  })
  fmt = fmt.replaceAll("%%", "%");
  return fmt;
}

export type PluralVariants = {zero: string, one: string, multiple1: string, multiple2: string};

export function plural(n: number, plural: PluralVariants) {
  const i = Math.floor(Math.abs(n));
  const mod100 = i % 100;
  const ten = Math.floor(mod100 / 10);
  const mod10 = i % 10;
  if (i === 0) {
    return formatString(plural.zero, `${n}`);
  } else if (i === 1) {
    return formatString(plural.zero, `${n}`);
  } else if (ten === 1) {
    return formatString(plural.multiple2, `${n}`);
  } else if (mod10 >= 2 && mod10 <= 4) {
    return formatString(plural.multiple1, `${n}`);
  } else {
    return formatString(plural.multiple2, `${n}`);
  }

}