import Image from "next/image";
import AccountButton from "../AccountButton";
import { useRouter as useNavigationRouter, usePathname } from "next/navigation";
import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { Menu, X } from "lucide-react";
import useBreakpoints from "@/hooks/breakpoints/useBreakpoints";
import { NavigationLink } from "./styles";

export default function AppHeader() {
	const navigationRouter = useNavigationRouter();
	const pathname = usePathname();
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const { isDesktop } = useBreakpoints();

	const mobileDropdownMenuRef = useRef<HTMLDivElement>(null);

	const isActive = useCallback((path: string) => pathname === path, [pathname]);

	const navigationLinks = useMemo(() => {
		return [
			{ name: "Home", path: "/" },
			{ name: "Marketplace", path: "/marketplace/" },
		];
	}, []);

	// Close the menu when switching to desktop
	useEffect(() => {
		if (isDesktop) setIsMenuOpen(false);
	}, [isDesktop]);

	// Close menu when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (!mobileDropdownMenuRef.current) return;
			if (mobileDropdownMenuRef.current.contains(event.target as Node)) return;

			setIsMenuOpen(false);
		};

		if (isMenuOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isMenuOpen]);

	return (
		<section className="z-30 bg-background fixed w-full min-h-[var(--header-height)] flex items-center px-6 border-b-2 shadow-[0_0_10px_hsl(var(--foreground))]">
			{isDesktop ? (
				<div className="flex items-center justify-between w-full px-2 gap-3 h-[var(--header-height-desktop)]">
					<div className="flex items-center gap-4 cursor-pointer" onClick={() => navigationRouter.push("/")}>
						<Image src="/logo.webp" alt="Logo" width={0} height={0} className="h-20 w-auto" />
						<h1 className="text-6xl font-accent gradient-primary-light font-bold">CreAItors</h1>
					</div>
					<div className="flex items-center gap-6">
						{/* Navigation Links */}
						<div className="flex items-center gap-6">
							{navigationLinks.map(({ name, path }) => (
								<NavigationLink key={path} $isActive={isActive(path)} href={path}>
									{name}
								</NavigationLink>
							))}
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
							<Image src="/logo.webp" alt="Logo" width={0} height={0} className="h-14 w-auto" />
						</div>

						<AccountButton withName={false} />
					</div>
					{isMenuOpen && (
						<div
							ref={mobileDropdownMenuRef} // Attach ref to menu container
							className="absolute top-full bg-background left-0 w-full shadow-md border-t-2"
						>
							<nav className="flex flex-col p-4 space-y-4">
								{navigationLinks.map(({ name, path }) => (
									<NavigationLink
										key={path}
										$isActive={isActive(path)}
										href={path}
										onClick={() => setIsMenuOpen(false)}
									>
										{name}
									</NavigationLink>
								))}
							</nav>
						</div>
					)}
				</>
			)}
		</section>
	);
}
