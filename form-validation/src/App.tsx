import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  applicationSchema,
  defaultValues,
  stepFields,
  type ApplicationValues,
} from "./schemas/applicationSchema";
import { PersonalInfoStep } from "./steps/PersonalInfoStep";
import { ExperienceStep } from "./steps/ExperienceStep";
import { ReviewStep } from "./steps/ReviewStep";
import { ToastProvider, useToast } from "./components/Toast";
import { submitApplication } from "./api/mockApi";

const STEP_LABELS = ["Personal info", "Experience", "Review & submit"] as const;

function focusFirstError(form: HTMLFormElement | null) {
  if (!form) return;
  const el = form.querySelector<HTMLElement>('[aria-invalid="true"]');
  el?.focus();
}

function ApplicationForm() {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [submitted, setSubmitted] = useState<{ id: string } | null>(null);
  const toast = useToast();

  const methods = useForm<ApplicationValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues,
    mode: "onBlur",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });

  const {
    handleSubmit,
    trigger,
    formState: { isSubmitting, isValidating },
  } = methods;

  async function next(form: HTMLFormElement | null) {
    const fields = stepFields[step];
    const ok = await trigger(fields, { shouldFocus: true });
    if (!ok) {
      // Fallback in case shouldFocus didn't catch it (e.g. nested rows).
      requestAnimationFrame(() => focusFirstError(form));
      return;
    }
    setStep((s) => Math.min(2, s + 1) as 0 | 1 | 2);
  }

  function back() {
    setStep((s) => Math.max(0, s - 1) as 0 | 1 | 2);
  }

  const onValid = async (values: ApplicationValues) => {
    const result = await submitApplication(values);
    if (result.ok) {
      setSubmitted({ id: result.applicationId });
      toast.push("success", `Application submitted (${result.applicationId})`);
    } else {
      toast.push("error", result.error);
    }
  };

  const onInvalid = () => {
    toast.push("error", "Please fix the highlighted fields before submitting.");
  };

  if (submitted) {
    return (
      <main className="app">
        <div className="card">
          <h1>Thanks for applying!</h1>
          <p>
            Your reference number is <strong>{submitted.id}</strong>. We'll be in
            touch soon.
          </p>
        </div>
      </main>
    );
  }

  const busy = isSubmitting || isValidating;

  return (
    <main className="app">
      <div className="card">
        <header className="card__header">
          <h1>Job application</h1>
          <ol className="stepper" aria-label="Progress">
            {STEP_LABELS.map((label, i) => (
              <li
                key={label}
                className={`stepper__item ${i === step ? "is-active" : ""} ${
                  i < step ? "is-done" : ""
                }`}
                aria-current={i === step ? "step" : undefined}
              >
                <span className="stepper__num">{i + 1}</span>
                <span className="stepper__label">{label}</span>
              </li>
            ))}
          </ol>
        </header>

        <FormProvider {...methods}>
          <form
            noValidate
            onSubmit={handleSubmit(onValid, onInvalid)}
            aria-busy={busy}
          >
            {step === 0 && <PersonalInfoStep />}
            {step === 1 && <ExperienceStep />}
            {step === 2 && <ReviewStep />}

            <div className="form-actions">
              {step > 0 && (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={back}
                  disabled={busy}
                >
                  Back
                </button>
              )}

              {step < 2 && (
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={(e) => next(e.currentTarget.form)}
                  disabled={busy}
                >
                  {isValidating ? "Checking…" : "Next"}
                </button>
              )}

              {step === 2 && (
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={busy}
                >
                  {isSubmitting ? "Submitting…" : "Submit application"}
                </button>
              )}
            </div>
          </form>
        </FormProvider>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <ApplicationForm />
    </ToastProvider>
  );
}
