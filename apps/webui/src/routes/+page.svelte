<script lang="ts">
import { authClient } from "$lib/auth-client";

const session = authClient.useSession();
</script>

{#if $session.data}
  <h1>Welcome, {$session.data.user.name}</h1>
  <p>Manage your organizations and AI capabilities.</p>
  <a href="/orgs">Organizations</a>
{:else}
  <h1>Ponte</h1>
  <p>Manage AI capabilities across your teams.</p>
  <a href="/login">Sign in</a>
{/if}
