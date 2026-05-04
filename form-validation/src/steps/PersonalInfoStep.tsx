import { useFormContext, useFormState } from "react-hook-form";
import { TextField } from "../components/Field";
import type { ApplicationValues } from "../schemas/applicationSchema";

export function PersonalInfoStep() {
  const { control } = useFormContext<ApplicationValues>();
  const { errors, validatingFields } = useFormState<ApplicationValues>({ control });

  const emailValidating = !!(
    validatingFields as Record<string, boolean> | undefined
  )?.email;

  return (
    <fieldset className="step">
      <legend className="step__legend">Personal information</legend>

      <TextField
        name="fullName"
        label="Full name"
        autoComplete="name"
        error={errors.fullName?.message as string | undefined}
      />

      <TextField
        name="email"
        type="email"
        label="Email address"
        autoComplete="email"
        hint="We'll use this to contact you"
        isValidating={emailValidating}
        error={errors.email?.message as string | undefined}
      />

      <TextField
        name="phone"
        type="tel"
        label="Phone number"
        autoComplete="tel"
        error={errors.phone?.message as string | undefined}
      />

      <TextField
        name="location"
        label="Location"
        autoComplete="address-level2"
        hint="City, country"
        error={errors.location?.message as string | undefined}
      />
    </fieldset>
  );
}
