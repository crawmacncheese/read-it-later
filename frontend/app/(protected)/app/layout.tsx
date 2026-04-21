import { ProtectedLayout } from "@/components/protected-layout";

export default function AppSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
