import { useState } from "react";
import { useRouter } from "next/router";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import type { GetStaticProps } from "next";

export default function SignInPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setLoading(true);

    const res = await signIn("credentials", {
      redirect: true,
      email: form.email,
      password: form.password,
      callbackUrl: "/",
    });
    setLoading(false);

    if (res?.error) {
      setError("Invalid email or password");
    } else {
      router.replace((res?.url as string) || "/");
    }
  };

  return (
    <div className="relative min-h-screen flex items-start justify-center bg-white pt-40">
      {/* dRAGon brand sign */}
      <div className="absolute top-4 left-4 text-2xl font-bold">
        dRAGon
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md dark:bg-[#343541] p-6 border-none rounded-lg shadow-none"
      >
        <h2 className="text-2xl font-bold text-center mb-6">
          Sign In
        </h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        <div className="mb-4">
          <label
            htmlFor="email"
            className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring focus:border-blue-400 dark:bg-[#40414F] dark:text-white"
            placeholder="you@example.com"
          />
        </div>

        <div className="mb-6">
          <label
            htmlFor="password"
            className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring focus:border-blue-400 dark:bg-[#40414F] dark:text-white"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-[#10a37f] hover:bg-[#117f67] text-white font-semibold rounded disabled:opacity-50 shadow hover:shadow-lg transition-shadow duration-200"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <p className="text-sm text-center mt-4 text-gray-600 dark:text-gray-400">
          Don’t have an account?{" "}
          <Link href="/signup" className="text-[#139373] hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? "en", ["common"])),
  },
});