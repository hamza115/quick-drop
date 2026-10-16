import { z } from "zod";

// Shared by the login form and any server handler that accepts these fields.
// Length rules for new passwords are enforced by Better Auth, not here.
export const loginSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email address.")),
  password: z.string().min(1, "Enter your password."),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Must match the server rules in src/lib/auth/index.ts (minPasswordLength / maxPasswordLength).
export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80, "Keep your name under 80 characters."),
  email: z.string().trim().pipe(z.email("Enter a valid email address.")),
  password: z
    .string()
    .min(12, "Use at least 12 characters.")
    .max(128, "Use no more than 128 characters."),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email address.")),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// Same rule as the server (minPasswordLength in src/lib/auth/index.ts).
export const resetPasswordSchema = z
  .object({
    password: z.string().min(12, "Use at least 12 characters.").max(128, "Use no more than 128 characters."),
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    message: "Passwords don't match.",
    path: ["confirm"],
  });
