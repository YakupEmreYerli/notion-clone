import { AuthShell } from "./_components/AuthShell";

const AuthLayout = ({ children }: { children: React.ReactNode }) => (
  <AuthShell>{children}</AuthShell>
);

export default AuthLayout;
