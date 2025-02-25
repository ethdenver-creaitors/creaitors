// import Image from "next/image";

import ConnectWalletButton from "../ConnectWalletButton";
import { useRouter as useNavigationRouter } from "next/navigation";

export default function AppHeader() {
  const navigationRouter = useNavigationRouter();

  return (
    <section className="w-full px-6 pt-4 mb-4 border-b-2 h-fit">
      <div
        className="flex items-center justify-between w-full px-2 mb-4 gap-3 h-20 cursor-pointer"
        onClick={() => navigationRouter.push("/")}
      >
        {/* <Image
          src="/logo.svg"
          alt="Logo"
          width={0}
          height={0}
          className="h-full w-auto"
        /> */}
        <div className="flex flex-col h-full justify-around">
          <h1 className="text-6xl text-primary font-accent">CreAItors</h1>
          <h2 className="text-base">Autonomous AI Agents</h2>
        </div>
        <ConnectWalletButton />
      </div>
    </section>
  );
}
