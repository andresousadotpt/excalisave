import { Navbar } from "@/components/Navbar";
import { UnlockModal } from "@/components/UnlockModal";
import { Footer } from "@/components/Footer";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <Navbar />
      <UnlockModal />
      <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full">{children}</main>
      <Footer />
    </div>
  );
}
