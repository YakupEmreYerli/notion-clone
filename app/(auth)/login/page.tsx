import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth, hasAnyUser } from "@/lib/auth";

import { AuthHeader } from "../_components/AuthHeader";
import { LoginForm } from "../_components/LoginForm";

export default async function LoginPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/documents");

  // Henüz hiç hesap yoksa giriş yapılacak bir şey de yok — kurulum ekranı.
  if (!(await hasAnyUser())) redirect("/register");

  return (
    <>
      <AuthHeader
        title="Log in to Zotion"
        description="Enter your email and password to continue"
      />
      <LoginForm />
    </>
  );
}
