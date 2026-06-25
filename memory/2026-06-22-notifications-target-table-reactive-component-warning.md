# DEBUG REPORT: Notifications TargetTable Reactive Component Warning

- **Symptom:** Vue warned that `target-table` was made a reactive object when rendering the notifications drawer form.
- **Root cause:** The Vben form schema is held in reactive state, and the custom SFC component object was assigned directly to the `component` field. Vue proxied that component object and emitted the performance warning.
- **Fix:** Wrapped `TargetTable` with `markRaw()` in `apps/web-ele/src/views/system/notifications/data.ts`.
- **Evidence:** The code path renders schema components through `form-field.vue` with `<component :is="FieldComponent">`; the project already uses `markRaw(SliderCaptcha)` for the same pattern in a form schema.
- **Regression test:** No dedicated browser regression test was added for this warning; `web-ele` type-check was run after the fix.
- **Status:** DONE_WITH_CONCERNS
