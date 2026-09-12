<script lang="ts">
import { onMount } from "svelte";
import { api } from "$lib/api";

type Org = { id: string; name: string; slug: string; role: string };

let orgs = $state<Org[]>([]);
let newName = $state("");
let newSlug = $state("");

onMount(async () => {
  orgs = await api.get<Org[]>("/orgs");
});

const createOrg = async () => {
  const org = await api.post<Org>("/orgs", {
    name: newName,
    slug: newSlug,
  });
  orgs = [...orgs, { ...org, role: "owner" }];
  newName = "";
  newSlug = "";
};
</script>

<h1>Organizations</h1>

<ul>
  {#each orgs as org}
    <li>
      <a href="/orgs/{org.id}">{org.name}</a>
      <span class="role">({org.role})</span>
    </li>
  {/each}
</ul>

<h2>Create organization</h2>
<form onsubmit={createOrg}>
  <label>
    Name
    <input type="text" bind:value={newName} required />
  </label>
  <label>
    Slug
    <input type="text" bind:value={newSlug} required pattern="[a-z0-9-]+" />
  </label>
  <button type="submit">Create</button>
</form>

<style>
  ul {
    list-style: none;
    padding: 0;
  }

  li {
    padding: 0.5rem 0;
  }

  .role {
    color: #6b7280;
    font-size: 0.875rem;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 24rem;
    margin-top: 1rem;
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
    width: fit-content;
  }
</style>
