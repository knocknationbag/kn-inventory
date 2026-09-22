import Header from "@/components/layout/Header";
import MobileNav from "@/components/layout/MobileNav";
import Sidebar from "@/components/layout/Sidebar";
import SignOutButton from "@/components/layout/SignOutButton";

export default function AppShell({ children }) {
  return (
    <div className="md:flex print:block">
      <Sidebar footer={<SignOutButton variant="sidebar" />} />
      <div className="min-w-0 flex-1">
        <Header />
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-7xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 outline-none sm:px-6 md:pb-10 lg:px-8 2xl:max-w-[1600px] print:max-w-none print:p-0">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
