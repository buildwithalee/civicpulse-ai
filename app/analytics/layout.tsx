import AuthorityGuard from "@/components/AuthorityGuard";

export default function AnalyticsLayout({
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