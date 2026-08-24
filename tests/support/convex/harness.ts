import { convexTest } from "convex-test";

import schema from "@/convex/schema";

export const OWNER = "user-owner";
export const STRANGER = "user-stranger";

/** `requireUser` kimliğin `subject` alanını userId olarak kullanır. */
export function identity(subject: string) {
  return { subject, issuer: "https://test.local" };
}

/** Oturum açmış sahibi ve anonim ziyaretçiyi birlikte veren test kurulumu. */
export function setup() {
  const t = convexTest(schema);
  return {
    t,
    owner: t.withIdentity(identity(OWNER)),
    stranger: t.withIdentity(identity(STRANGER)),
    anonymous: t,
  };
}

export type Harness = ReturnType<typeof setup>;
