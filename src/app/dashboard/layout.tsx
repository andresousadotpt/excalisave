import { Navbar } from "@/components/Navbar";
import { UnlockModal } from "@/components/UnlockModal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <UnlockModal />
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
