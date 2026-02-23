import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full">{children}</main>
      <Footer />
    </div>
  );
}
