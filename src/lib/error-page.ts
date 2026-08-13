export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 "Plus Jakarta Sans", system-ui, sans-serif; background: #08080a; color: #fafafa; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; background: #121216; border: 1px solid #22222a; border-radius: 1.5rem; box-shadow: 0 24px 60px rgba(107, 33, 168, 0.18); }
      h1 { font-family: Outfit, system-ui, sans-serif; font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #a1a1aa; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #6b21a8; color: #fafafa; }
      .secondary { background: #121216; color: #fafafa; border-color: #22222a; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end. You can try refreshing or head back home.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
    </div>
  </body>
</html>`;
}
