import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useFormContext } from "react-hook-form";

type FieldShellProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  isValidating?: boolean;
  children: React.ReactNode;
};

export function FieldShell({
  id,
  label,
  error,
  hint,
  isValidating,
  children,
}: FieldShellProps) {
  const errId = `${id}-err`;
  const hintId = `${id}-hint`;
  return (
    <div className={`field ${error ? "field--error" : ""}`}>
      <label htmlFor={id} className="field__label">
        {label}
      </label>
      {children}
      {isValidating && (
        <p className="field__hint" id={hintId}>
          Checking…
        </p>
      )}
      {!isValidating && hint && !error && (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field__error" id={errId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

type TextFieldProps = {
  name: string;
  label: string;
  hint?: string;
  isValidating?: boolean;
  error?: string;
} & InputHTMLAttributes<HTMLInputElement>;

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField(
    { name, label, hint, isValidating, error, id, ...rest },
    ref
  ) {
    const { register } = useFormContext();
    const inputId = id ?? name;
    const errId = `${inputId}-err`;
    const hintId = `${inputId}-hint`;
    const describedBy =
      [error ? errId : null, hint || isValidating ? hintId : null]
        .filter(Boolean)
        .join(" ") || undefined;

    const { ref: rhfRef, ...registerRest } = register(name);

    return (
      <FieldShell
        id={inputId}
        label={label}
        error={error}
        hint={hint}
        isValidating={isValidating}
      >
        <input
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className="field__input"
          {...registerRest}
          {...rest}
          ref={(el) => {
            rhfRef(el);
            if (typeof ref === "function") ref(el);
            else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
          }}
        />
      </FieldShell>
    );
  }
);

type TextareaFieldProps = {
  name: string;
  label: string;
  hint?: string;
  error?: string;
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextareaField({
  name,
  label,
  hint,
  error,
  id,
  ...rest
}: TextareaFieldProps) {
  const { register } = useFormContext();
  const inputId = id ?? name;
  const errId = `${inputId}-err`;
  const hintId = `${inputId}-hint`;
  const describedBy =
    [error ? errId : null, hint ? hintId : null].filter(Boolean).join(" ") ||
    undefined;
  return (
    <FieldShell id={inputId} label={label} error={error} hint={hint}>
      <textarea
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className="field__input field__input--textarea"
        rows={3}
        {...register(name)}
        {...rest}
      />
    </FieldShell>
  );
}

type CheckboxFieldProps = {
  name: string;
  label: string;
  error?: string;
};

export function CheckboxField({ name, label, error }: CheckboxFieldProps) {
  const { register } = useFormContext();
  const id = name;
  const errId = `${id}-err`;
  return (
    <div className={`field field--checkbox ${error ? "field--error" : ""}`}>
      <label className="field__checkbox-label" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          aria-invalid={!!error}
          aria-describedby={error ? errId : undefined}
          {...register(name)}
        />
        <span>{label}</span>
      </label>
      {error && (
        <p className="field__error" id={errId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
