import Image from "next/image";
import AccountButton from "../AccountButton";
import { useRouter as useNavigationRouter } from "next/navigation";
import Link from "next/link";

export default function AppHeader() {
  const navigationRouter = useNavigationRouter();

  return (
    <section className="w-full px-6 pt-4 mb-4 border-b-2 h-fit shadow-[0_0_10px_hsl(var(--foreground))]">
      <div className="flex items-center justify-between w-full px-2 mb-4 gap-3 h-20">
        {/* Logo and Home Navigation */}
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
          <div className="flex flex-col h-full justify-around">
            <h1 className="text-6xl font-accent gradient-primary-light font-bold">
              CreAItors
            </h1>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="flex items-center gap-6">
          <Link href="/marketplace">
            <span className="text-lg font-medium transition-all cursor-pointer hover:text-primary">
              Marketplace
            </span>
          </Link>
          <AccountButton />
        </div>
      </div>
    </section>
  );
}
