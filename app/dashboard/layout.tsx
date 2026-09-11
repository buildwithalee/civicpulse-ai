import AuthorityGuard from "@/components/AuthorityGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthorityGuard>
      {children}
    </AuthorityGuard>
  );
}