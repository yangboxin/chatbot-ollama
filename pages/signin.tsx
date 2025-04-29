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
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white dark:bg-[#343541] p-6 rounded-lg shadow"
      >
        <h2 className="text-2xl font-bold text-center text-green-600 mb-6">
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
          className="w-full py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <p className="text-sm text-center mt-4 text-gray-600 dark:text-gray-400">
          Don’t have an account?{" "}
          <Link href="/signup" className="text-green-600 hover:underline">
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