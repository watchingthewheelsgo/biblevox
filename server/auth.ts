import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { Resend } from "resend";
import { db, schema } from "./db";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_BASE_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, token }) => {
      const email = user.email;
      if (!email) return;
      const frontendBase =
        process.env.FRONTEND_URL?.replace(/\/$/, "") || "http://localhost:5173";
      const link = `${frontendBase}/auth?resetToken=${token}`;
      const resendApiKey = process.env.RESEND_API_KEY;
      const from = process.env.RESEND_FROM || "onboarding@resend.dev";
      if (!resendApiKey) return;
      const resend = new Resend(resendApiKey);
      await resend.emails.send({
        from,
        to: email,
        subject: "Reset your BibleVox password",
        html: `<p>Click to reset password:</p><a href="${link}">${link}</a>`,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, token }) => {
      if (!user.email) return;
      const frontendBase =
        process.env.FRONTEND_URL?.replace(/\/$/, "") || "http://localhost:5173";
      const link = `${frontendBase}/auth?verifyToken=${token}`;
      const resendApiKey = process.env.RESEND_API_KEY;
      const from = process.env.RESEND_FROM || "onboarding@resend.dev";
      if (!resendApiKey) return;
      const resend = new Resend(resendApiKey);
      await resend.emails.send({
        from,
        to: user.email,
        subject: "Verify your BibleVox email",
        html: `<p>Click to verify email:</p><a href="${link}">${link}</a>`,
      });
    },
  },
  user: {
    additionalFields: {
      unlockedAll: {
        type: "boolean",
        defaultValue: false,
      },
    },
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
});
