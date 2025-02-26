import Image from "next/image";
import AccountButton from "../AccountButton";
import { useRouter as useNavigationRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import useBreakpoints from "@/hooks/breakpoints/useBreakpoints";

export default function AppHeader() {
  const navigationRouter = useNavigationRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isDesktop } = useBreakpoints();

  return (
    <section className="z-30 bg-background fixed w-full min-h-[var(--header-height)] flex items-center px-6 border-b-2 shadow-[0_0_10px_hsl(var(--foreground))]">
      {isDesktop ? (
        <div className="flex items-center justify-between w-full px-2gap-3 h-[var(--header-height-desktop)]">
          <div
            className="flex items-center gap-4 cursor-pointer"
            onClick={() => navigationRouter.push("/")}
          >
            <Image
              src="/logo.webp"
              alt="Logo"
              width={0}
              height={0}
              className="h-20 w-auto"
            />
            <h1 className="text-6xl font-accent gradient-primary-light font-bold">
              CreAItors
            </h1>
          </div>
          <div className="flex items-center gap-6">
            {/* Navigation Links */}
            <div className="flex items-center gap-6">
              <Link href="/marketplace">
                <span className="text-lg font-medium transition-all cursor-pointer hover:text-primary">
                  Marketplace
                </span>
              </Link>
            </div>

            <AccountButton />
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between w-full px-2 gap-3">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>

            <div
              className="absolute left-1/2 transform -translate-x-1/2 cursor-pointer"
              onClick={() => navigationRouter.push("/")}
            >
              <Image
                src="/logo.webp"
                alt="Logo"
                width={0}
                height={0}
                className="h-14 w-auto"
              />
            </div>

            <AccountButton withName={false} />
          </div>
          {isMenuOpen && (
            <div className="absolute top-full bg-background left-0 w-full bg-red shadow-md border-t-2">
              <nav className="flex flex-col p-4 space-y-3">
                <Link
                  href="/marketplace"
                  className="text-lg font-medium transition-all cursor-pointer hover:text-primary"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Marketplace
                </Link>
              </nav>
            </div>
          )}
        </>
      )}
    </section>
  );
}
