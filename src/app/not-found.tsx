import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-4 text-center">
      <p className="text-neon-green font-mono text-sm tracking-widest uppercase mb-4">
        404
      </p>
      <h1 className="text-4xl font-bold text-text-primary mb-3">
        Page not found
      </h1>
      <p className="text-text-muted max-w-sm mb-8">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 bg-neon-green text-bg-primary font-semibold px-6 py-3 rounded-lg hover:bg-neon-green/90 transition-colors"
      >
        Back to home
      </Link>
    </div>
  );
}
