import { useState } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const API_URL = `${API_BASE_URL}/api/auth`;

function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function handleChange(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const isRegistering = mode === "register";
    const endpoint = isRegistering ? "register" : "login";

    const requestBody = isRegistering
      ? form
      : {
          email: form.email,
          password: form.password,
        };

    try {
      const response = await fetch(`${API_URL}/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.message || "Something went wrong.");
      }

      if (isRegistering) {
        setMessage("Account created. Please sign in.");
        setMode("login");
        setForm({
          name: "",
          email: form.email,
          password: "",
        });
        return;
      }

      onLogin({
  id: data.id,
  name: data.name,
  email: form.email,
});
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-brand">
        <span className="auth-kicker">SMARTER MONEY, CALMER LIFE</span>
        <h1>SmartSpend</h1>
        <p>Know where your money goes.</p>
      </div>

      <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>

      <form className="auth-form" onSubmit={handleSubmit}>
        {mode === "register" && (
          <input
            name="name"
            placeholder="Your name"
            value={form.name}
            onChange={handleChange}
            required
          />
        )}

        <input
          name="email"
          type="email"
          placeholder="Email address"
          value={form.email}
          onChange={handleChange}
          required
        />

        <input
          name="password"
          type="password"
          minLength="6"
          placeholder="Password (at least 6 characters)"
          value={form.password}
          onChange={handleChange}
          required
        />

        <button type="submit">
          {mode === "login" ? "Login to SmartSpend" : "Create Account"}
        </button>
      </form>

      {message && <p className="auth-message success-message">{message}</p>}
      {error && <p className="auth-message error-message">{error}</p>}

      <div className="auth-switch">
        <span>
          {mode === "login" ? "New to SmartSpend?" : "Already have an account?"}
        </span>

        <button
          type="button"
          className="auth-toggle"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
            setMessage("");
          }}
        >
          {mode === "login" ? "Create an account" : "Login instead"}
        </button>
      </div>
    </main>
  );
}

export default AuthPage;