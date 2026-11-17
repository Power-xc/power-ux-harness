import { A11Y_RULES } from "./a11y.mjs";
import { COLOR_RULES } from "./color.mjs";
import { COPY_RULES } from "./copy.mjs";
import { LAYOUT_RULES } from "./layout.mjs";
import { TYPE_RULES } from "./type.mjs";
import { UI_RULES } from "./ui.mjs";

export const RULES = [...TYPE_RULES, ...COLOR_RULES, ...LAYOUT_RULES, ...UI_RULES, ...A11Y_RULES, ...COPY_RULES];
