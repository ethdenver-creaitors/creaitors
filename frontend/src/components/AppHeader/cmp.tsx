import ConnectWalletButton from "../ConnectWalletButton";
import { useRouter as useNavigationRouter } from "next/navigation";

export default function AppHeader() {
  const navigationRouter = useNavigationRouter();

  return (
    <section className="w-full px-6 pt-4 mb-4 border-b-2 h-fit">
      <div className="flex items-center justify-between w-full px-2 mb-4 gap-3 h-20">
        <div
          className="flex flex-col h-full justify-around cursor-pointer"
          onClick={() => navigationRouter.push("/")}
        >
          <h1 className="text-6xl font-accent gradient-primary-light">
            CreAItors
          </h1>
          <h2 className="text-base">Autonomous AI Agents</h2>
        </div>
        <ConnectWalletButton />
      </div>
    </section>
  );
}
