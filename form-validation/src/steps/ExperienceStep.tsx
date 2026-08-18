import { useFieldArray, useFormContext, useFormState } from "react-hook-form";
import { TextField, TextareaField } from "../components/Field";
import { emptyJob, type ApplicationValues } from "../schemas/applicationSchema";

export function ExperienceStep() {
  const { control } = useFormContext<ApplicationValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "jobs" });
  const { errors } = useFormState<ApplicationValues>({ control });

  const jobsRootError =
    typeof errors.jobs?.message === "string" ? errors.jobs.message : undefined;

  return (
    <fieldset className="step">
      <legend className="step__legend">Work experience</legend>

      {jobsRootError && (
        <p className="field__error" role="alert">
          {jobsRootError}
        </p>
      )}

      <ul className="job-list">
        {fields.map((field, index) => {
          const jobErrors = errors.jobs?.[index];
          return (
            <li key={field.id} className="job-card">
              <div className="job-card__header">
                <h3 className="job-card__title">Position {index + 1}</h3>
                {fields.length > 1 && (
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => remove(index)}
                    aria-label={`Remove position ${index + 1}`}
                  >
                    Remove
                  </button>
                )}
              </div>

              <TextField
                name={`jobs.${index}.company`}
                label="Company"
                error={jobErrors?.company?.message as string | undefined}
              />

              <TextField
                name={`jobs.${index}.role`}
                label="Role"
                error={jobErrors?.role?.message as string | undefined}
              />

              <div className="grid-2">
                <TextField
                  name={`jobs.${index}.startDate`}
                  type="date"
                  label="Start date"
                  error={jobErrors?.startDate?.message as string | undefined}
                />
                <TextField
                  name={`jobs.${index}.endDate`}
                  type="date"
                  label="End date"
                  error={jobErrors?.endDate?.message as string | undefined}
                />
              </div>

              <TextareaField
                name={`jobs.${index}.description`}
                label="What did you do?"
                hint="Up to 500 characters"
                error={jobErrors?.description?.message as string | undefined}
              />
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        className="btn btn--secondary"
        onClick={() => append(emptyJob)}
      >
        + Add another position
      </button>
    </fieldset>
  );
}
