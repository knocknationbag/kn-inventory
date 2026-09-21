import Logo from "@/components/ui/Logo";
import ThemeSwitcher from "@/components/ui/ThemeSwitcher";
import FullscreenButton from "@/components/ui/FullscreenButton";

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 pt-[env(safe-area-inset-top)] backdrop-blur print:hidden">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 2xl:max-w-[1600px]">
        <div className="md:hidden">
          <Logo className="h-7 w-auto" />
        </div>
        <div className="ml-auto flex items-center gap-1">
          <FullscreenButton />
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
