# Job Application Form

A multi-step job application built for the FE8 "Forms & Validation" hands-on task. React + TypeScript + React Hook Form + zod.

Three steps:
1. **Personal info** — name, email, phone, location.
2. **Experience** — one or more previous jobs (`useFieldArray`).
3. **Review & submit** — read-only summary plus a confirmation checkbox.

## Tech used

- **React 18** + **TypeScript** (strict)
- **Vite 5** (dev server + build)
- **React Hook Form 7** with `FormProvider`, `useFieldArray`, `useFormState`
- **zod 3** + `@hookform/resolvers/zod` — schema is the single source of truth for shape, types, and validation
- Plain CSS, no UI library — keeps a11y wiring explicit

## Project layout

```
src/
├── App.tsx                       # form root, step navigation, submit
├── main.tsx                      # ReactDOM entry
├── styles.css                    # all styles
├── api/mockApi.ts                # mock email-uniqueness + submit
├── components/
│   ├── Field.tsx                 # accessible input primitives
│   └── Toast.tsx                 # toast provider + hook
├── schemas/applicationSchema.ts  # zod schemas, defaults, per-step field maps
└── steps/
    ├── PersonalInfoStep.tsx
    ├── ExperienceStep.tsx
    └── ReviewStep.tsx
```

## Commands

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # tsc + vite build
npm run preview   # serve the production build
npm run lint      # tsc --noEmit
```


## Test
- Use `taken@example.com` to see the **async uniqueness** error after a 500ms "Checking…" state.
- Set an end date *before* the start date to see the cross-field error.
- Submit a few times — the mock server **rejects ~40% of the time** and shows a toast.

## What's implemented  

| Requirement                                      | Status |
| ------------------------------------------------ | ------ |
| 3 steps: Personal → Experience → Review          | ✅ |
| `useFieldArray` for previous jobs (add/remove)   | ✅ |
| zod schema, incl. `endDate > startDate` + email  | ✅ |
| Async email uniqueness check (mock, 500ms)       | ✅ |
| Validate on blur, re-validate on change once dirty | ✅ |
| A11y: labels, `aria-invalid`, `aria-describedby`, focus first error | ✅ |
| Disable Next/Submit while validating or submitting | ✅ |
| Mock server rejects randomly + error toast       | ✅ |



## Decisions & trade-offs 
- **Schema-first.** All shape, types, and rules live in `applicationSchema.ts`. UI binds to the inferred type.
- **`mode: "onBlur"` + `reValidateMode: "onChange"`.** Matches the recommendation from the session: respect users while typing, help them the moment they make a mistake.
- **Per-step gating via `trigger(stepFields[step])`.** No second schema per step — just a list of field names per step.
- **Async email check via zod `superRefine`.** Keeps validation in one place; RHF awaits the resolver, which is why `Next` can disable cleanly.
- **Toasts only for submission failures:** Field errors stay inline

 