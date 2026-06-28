import { useRouteError, isRouteErrorResponse, Link } from "react-router";
import { AlertTriangle, Home, RefreshCcw } from "lucide-react";
import { Button } from "@/app/components/ui/button";

export function GlobalErrorBoundary() {
  const error = useRouteError();
  
  let errorMessage = "An unexpected error occurred.";
  if (isRouteErrorResponse(error)) {
    errorMessage = error.data?.message || error.statusText;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="w-20 h-20 bg-rose-100 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-rose-500" />
        </div>
        
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-3">
          Oops!
        </h1>

        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-8 text-left overflow-x-auto">
          <p className="text-sm font-mono text-rose-500">
            {errorMessage}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={() => window.location.reload()} 
            className="flex-1 h-12 rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            Try Again
          </Button>
          
          <Button 
            asChild
            variant="outline" 
            className="flex-1 h-12 rounded-xl font-bold border-slate-200 text-slate-600 flex items-center justify-center gap-2"
          >
            <Link to="/">
              <Home className="w-4 h-4" />
              Go Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
