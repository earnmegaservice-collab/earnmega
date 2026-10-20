"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
          <h2 className="text-xl font-bold mb-4">Something went wrong!</h2>
          <div className="text-red-500 font-mono text-sm p-4 overflow-auto bg-black/50 border border-red-500/30 rounded-lg w-full max-w-2xl">
            <p>ERROR MESSAGE: {error?.message || "Unknown Error"}</p>
            <p>DIGEST: {error?.digest}</p>
          </div>
          <button
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => reset()}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
