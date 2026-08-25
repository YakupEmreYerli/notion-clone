"use client";

import { AuthShell } from "@/app/(auth)/_components/AuthShell";
import { AuthHeader } from "@/app/(auth)/_components/AuthHeader";
import { RegisterForm } from "@/app/(auth)/_components/RegisterForm";

/**
 * `/register` yalnızca hiç hesabı olmayan bir kurulumda açılır — bu yüzden
 * gerçek route'u testte render edemiyoruz. Fixture aynı kabuk + başlık + formu
 * kullanır, böylece ilk kurulum ekranı veritabanı durumundan bağımsız
 * doğrulanabilir.
 */
export function RegisterFixture() {
  return (
    <div data-register-fixture>
      <AuthShell>
        <AuthHeader
          title="Set up Zotion"
          description="Create the owner account for this server"
        />
        <RegisterForm />
      </AuthShell>
    </div>
  );
}
