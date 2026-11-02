# English UX writing rules

Sources: Apple Human Interface Guidelines "Writing" (updated 2025), Material Design 3 UX writing best practices, buttons and dialogs guidance, GOV.UK Design System error message and validation guidance, NN/g Rachel Krause "10 Design Guidelines for Reporting Errors in Forms" (2019). Summarized in our own words; no example sentences were copied. A brand voice guide, when one exists, overrides these defaults.

## 1. Defaults

- Use sentence case for UI text, or one consistent capitalization style per element type.
- Address the user as "you". Avoid "we" and do not mix "my" and "your" on one screen.
- Prefer plain words over jargon and Latin abbreviations (e.g. → for example).
- Keep one message per string. Cut words that do not change the meaning.
- Use the right verb for the device: "tap" on touch screens, "click" with a pointer, or a neutral verb ("select") when both apply.

## 2. Surface rules

| Surface            | Rule                                                                                                                                                                                      | Example                                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Error              | Say what went wrong and how to fix it, next to the problem, without blame                                                                                                                 | "Enter a card number with 16 digits"                                                                        |
| Empty field        | An instruction                                                                                                                                                                            | "Enter your name"                                                                                           |
| Other field errors | A description of the condition                                                                                                                                                            | "Name must be 35 characters or fewer"                                                                       |
| Button             | A verb that names the result, 1–3 words, never truncated or wrapped                                                                                                                       | "Pay now" · "Cancel plan" · "Continue"                                                                      |
| Flow buttons       | Get started → Continue / Next → Done                                                                                                                                                      |                                                                                                             |
| Dialog             | The headline asks about the action, not "Are you sure?". The body states the consequence and whether it can be undone. At most two actions; the confirm action is a specific verb, not OK | Headline "Cancel your plan?" · body "You can keep using it until November 30" · "Keep plan" / "Cancel plan" |
| Toast or snackbar  | A short result; a snackbar may add one action such as "Undo"                                                                                                                              | "Note deleted" · "Undo"                                                                                     |
| Empty state        | The next step, with a button or link                                                                                                                                                      | "Write your first note"                                                                                     |
| Permission request | Why it is needed now and what it is used for                                                                                                                                              |                                                                                                             |
| Progress           | What is happening, not "Processing…"                                                                                                                                                      | "Requesting approval from your bank"                                                                        |

## 3. Do not use

| Avoid                                                       | Why                            | Instead                           |
| ----------------------------------------------------------- | ------------------------------ | --------------------------------- |
| "An error occurred" alone                                   | No cause, no next step         | What went wrong and how to fix it |
| "Invalid", "valid", "not valid"                             | Does not say what is wrong     | State the condition               |
| "This field is required"                                    | No instruction                 | "Enter …"                         |
| "Oops", "Whoops", "Sorry"                                   | Adds tone, removes information | Remove; give the fix              |
| "Please" in errors                                          | Padding                        | Remove                            |
| "You forgot to …"                                           | Blame                          | State the instruction             |
| "Click here", "Learn more" alone                            | Meaningless out of context     | Name the destination              |
| OK / Yes on consequential actions                           | Does not name the result       | Specific verb                     |
| Guilt in decline options ("No, I don't want to save money") | Pressure                       | Neutral decline ("Not now")       |

## 4. Localization

- Never build sentences by concatenating fragments. Keep whole strings with variables (`{date}`, `{count}`).
- Leave room for longer translations; do not rely on fixed-width labels.
- Handle plurals with the platform's plural rules, not "item(s)".
- Format dates, numbers and currency with the user's locale.
