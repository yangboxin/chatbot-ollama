import { useState } from "react";
import { useRouter } from "next/router";
import { signIn } from "next-auth/react";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) return setError("Passwords do not match");
    setError(undefined);
    setLoading(true);
    
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.message || "Signup failed");
    await signIn("credentials", {
      redirect: false,
      email: form.email,
      password: form.password,
    });
    router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white dark:bg-[#343541] p-6 rounded-lg shadow"
      >
        <h2 className="text-2xl font-bold text-center text-green-600 mb-4">Sign Up</h2>
        {error && <p className="text-red-500 text-center mb-3">{error}</p>}
        {["name","email","password","confirmPassword"].map(field => (
          <div key={field} className="mb-4">
            <label htmlFor={field} className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">
              {field === "confirmPassword" ? "Confirm Password" : field.charAt(0).toUpperCase() + field.slice(1)}
            </label>
            <input
              id={field}
              name={field}
              type={field.includes("password")?"password":field==="email"?"email":"text"}
              value={form[field as keyof typeof form]}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring focus:border-blue-400 dark:bg-[#40414F] dark:text-white"
              placeholder={`Enter your ${field==="confirmPassword"?"password again":field}`}
            />
          </div>
        ))}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>
        <p className="text-sm text-center mt-4 text-gray-600 dark:text-gray-400">
          Already have an account?{" "}
          <a href="/signin" className="text-green-600 hover:underline">Log in here</a>
        </p>
      </form>
    </div>
  );
}