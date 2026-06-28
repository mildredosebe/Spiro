import { Link } from "react-router";
import { SpiroLogo } from "./SpiroLogo";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-white">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-8 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <SpiroLogo size="xs" />
            <p className="text-sm text-muted-foreground mt-2">
              Energy on the Move
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs font-semibold text-muted-foreground">
            <Link to="/terms" className="hover:text-primary transition-colors">
              Terms &amp; Conditions
            </Link>
            <span className="text-border">·</span>
            <Link to="/privacy" className="hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <span className="text-border">·</span>
            <a href="mailto:support@spironet.com" className="hover:text-primary transition-colors">
              support@spironet.com
            </a>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 text-sm text-muted-foreground flex justify-between items-center">
          <p>Copyright {year} Spiro. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
