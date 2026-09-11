import AuthorityGuard from "@/components/AuthorityGuard";

export default function MapLayout({
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