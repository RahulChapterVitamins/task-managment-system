import { AppShellClient } from "@/components/layout/app-shell-client";

type AppShellProps = {
  userEmail?: string | null;
  children: React.ReactNode;
  modal: React.ReactNode;
};

export function AppShell({ userEmail, children, modal }: AppShellProps) {
  return (
    <AppShellClient userEmail={userEmail} modal={modal}>
      {children}
    </AppShellClient>
  );
}
