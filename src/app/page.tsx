import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Ops Hub</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
        Run every client, project and workflow from one place.
      </h1>
      <p className="mt-4 text-lg text-slate-600">
        A multi-tenant operations dashboard. Each organization&apos;s data is isolated at the query
        level, and simple automations fire when projects change.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/register" className="rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700">
          Create an organization
        </Link>
        <Link href="/login" className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-medium hover:bg-slate-100">
          Sign in
        </Link>
      </div>
    </main>
  );
}
