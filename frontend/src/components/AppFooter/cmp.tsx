import Link from "next/link";
import { Github } from "lucide-react";

export default function AppFooter() {
  return (
    <section>
      <footer className="border-t">
        <div className="container mx-auto px-6 py-12">
          <div className="flex flex-col items-center">
            <div className="text-center">
              <h3 className="text-2xl font-semibold bg-gradient-to-r from-primary to-background bg-clip-text text-transparent">
                CreAItors
              </h3>
              <p className="text-sm mt-2 text-muted-foreground">
                Creating AI living beings
              </p>
            </div>
            <div className="mt-6 flex space-x-6">
              {[
                { icon: Github, url: "https://github.com/ethdenver-creaitors" },
              ].map(({ icon: Icon, url }, index) => (
                <Link
                  key={index}
                  href={url}
                  target="_blank"
                  className="text-muted-foreground transition-colors duration-300 hover:text-primary"
                >
                  <Icon className="h-6 w-6" />
                </Link>
              ))}
            </div>
            <div className="mt-8 text-center">
              <p className="text-xs text-muted-foreground">
                &copy; 2025 CreAItors. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </section>
  );
}
