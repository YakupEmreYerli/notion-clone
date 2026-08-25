import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth, hasAnyUser } from "@/lib/auth";

import { AuthHeader } from "../_components/AuthHeader";
import { RegisterForm } from "../_components/RegisterForm";

export default async function RegisterPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/documents");

  // Zotion tek kurulum sahibi modelinde: ilk hesap sunucuyu kurar, sonrası
  // kapalıdır. Buradaki yönlendirme kolaylık; asıl zorlama lib/auth.ts'teki
  // user.create.before hook'unda.
  if (await hasAnyUser()) redirect("/login");

  return (
    <>
      <AuthHeader
        title="Set up Zotion"
        description="Create the owner account for this server"
      />
      <RegisterForm />
    </>
  );
}
