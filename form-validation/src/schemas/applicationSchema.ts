import { z } from "zod";
import { isEmailTaken } from "../api/mockApi";

const phoneRegex = /^[+\d][\d\s\-()]{6,}$/;

export const personalInfoSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(80, "Full name is too long"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .superRefine(async (email, ctx) => {
      if (!email || !z.string().email().safeParse(email).success) return;
      const taken = await isEmailTaken(email);
      if (taken) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "This email is already registered",
        });
      }
    }),
  phone: z
    .string()
    .min(1, "Phone is required")
    .regex(phoneRegex, "Enter a valid phone number"),
  location: z.string().min(2, "Location is required"),
});

const dateString = z
  .string()
  .min(1, "Date is required")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date");

export const jobSchema = z
  .object({
    company: z.string().min(1, "Company is required"),
    role: z.string().min(1, "Role is required"),
    startDate: dateString,
    endDate: dateString,
    description: z
      .string()
      .min(10, "Describe the role in at least 10 characters")
      .max(500, "Keep it under 500 characters"),
  })
  .refine((data) => Date.parse(data.endDate) > Date.parse(data.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  });

export const experienceSchema = z.object({
  jobs: z
    .array(jobSchema)
    .min(1, "Add at least one previous job")
    .max(10, "Maximum 10 jobs"),
});

export const reviewSchema = z.object({
  consent: z.literal(true, {
    errorMap: () => ({ message: "You must confirm the information is accurate" }),
  }),
});

export const applicationSchema = z.object({
  fullName: personalInfoSchema.shape.fullName,
  email: personalInfoSchema.shape.email,
  phone: personalInfoSchema.shape.phone,
  location: personalInfoSchema.shape.location,
  jobs: experienceSchema.shape.jobs,
  consent: reviewSchema.shape.consent,
});

export type ApplicationValues = z.infer<typeof applicationSchema>;
export type JobValues = z.infer<typeof jobSchema>;

export const emptyJob: JobValues = {
  company: "",
  role: "",
  startDate: "",
  endDate: "",
  description: "",
};

export const defaultValues: ApplicationValues = {
  fullName: "",
  email: "",
  phone: "",
  location: "",
  jobs: [emptyJob],
  consent: false as unknown as true,
};

export const stepFields: Record<0 | 1 | 2, (keyof ApplicationValues)[]> = {
  0: ["fullName", "email", "phone", "location"],
  1: ["jobs"],
  2: ["consent"],
};
