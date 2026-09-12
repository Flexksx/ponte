<script lang="ts">
import { goto } from "$app/navigation";
import { authClient } from "$lib/auth-client";

let email = $state("");
let password = $state("");
let error = $state("");

const handleLogin = async () => {
  error = "";
  const result = await authClient.signIn.email({ email, password });
  if (result.error) {
    error = result.error.message ?? "Login failed";
    return;
  }
  goto("/");
};
</script>

<h1>Sign in</h1>

{#if error}
  <p class="error">{error}</p>
{/if}

<form onsubmit={handleLogin}>
  <label>
    Email
    <input type="email" bind:value={email} required />
  </label>
  <label>
    Password
    <input type="password" bind:value={password} required />
  </label>
  <button type="submit">Sign in</button>
</form>

<p>No account? <a href="/signup">Sign up</a></p>

<style>
  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 24rem;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-weight: 500;
  }

  input {
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
  }

  button {
    padding: 0.5rem 1rem;
    background: #111;
    color: white;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
  }

  .error {
    color: #dc2626;
  }
</style>
