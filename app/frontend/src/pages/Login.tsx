import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { LoginContext } from "../loginContext";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      setError("Login failed");
      return;
    }
    const { access_token } = await res.json();
    localStorage.setItem("access_token", access_token);
    navigate("/");       // redirect to chat page
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Login</h2>
      <input placeholder="username" value={username} onChange={e => setUsername(e.target.value)} />
      <input type="password" placeholder="password" value={password} onChange={e => setPassword(e.target.value)} />
      {error && <p style={{color:"red"}}>{error}</p>}
      <button type="submit">Login</button>
    </form>
  );
}
