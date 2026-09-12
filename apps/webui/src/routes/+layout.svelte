<script>
let { children } = $props();
</script>

<svelte:head>
  <title>Ponte</title>
</svelte:head>

<div class="app">
  <nav>
    <a href="/">Ponte</a>
  </nav>
  <main>
    {@render children()}
  </main>
</div>

<style>
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  nav {
    padding: 1rem 2rem;
    border-bottom: 1px solid #e5e7eb;
  }

  nav a {
    font-weight: 700;
    font-size: 1.25rem;
    text-decoration: none;
    color: #111;
  }

  main {
    flex: 1;
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
  }
</style>
