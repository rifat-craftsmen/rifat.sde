import { useFormContext, useFormState } from "react-hook-form";
import { CheckboxField } from "../components/Field";
import type { ApplicationValues } from "../schemas/applicationSchema";

export function ReviewStep() {
  const { getValues, control } = useFormContext<ApplicationValues>();
  const { errors } = useFormState<ApplicationValues>({ control });
  const values = getValues();

  return (
    <fieldset className="step">
      <legend className="step__legend">Review your application</legend>

      <section className="review">
        <h3 className="review__heading">Personal info</h3>
        <dl className="review__list">
          <dt>Full name</dt>
          <dd>{values.fullName}</dd>
          <dt>Email</dt>
          <dd>{values.email}</dd>
          <dt>Phone</dt>
          <dd>{values.phone}</dd>
          <dt>Location</dt>
          <dd>{values.location}</dd>
        </dl>
      </section>

      <section className="review">
        <h3 className="review__heading">Experience</h3>
        <ul className="review__jobs">
          {values.jobs.map((job, i) => (
            <li key={i}>
              <strong>{job.role}</strong> at {job.company} ({job.startDate} → {job.endDate})
              <p className="review__desc">{job.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <CheckboxField
        name="consent"
        label="I confirm the information above is accurate and complete."
        error={errors.consent?.message as string | undefined}
      />
    </fieldset>
  );
}
