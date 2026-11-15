# jvpangilinan.github.io

My portfolio: https://jvpangilinan.github.io

Visitors start on a login screen and pick a profile:

- **Professional** ([/pro/](https://jvpangilinan.github.io/pro/)): for recruiters and clients. Projects, education, certifications and skills, laid out around the usual interview questions. It prints as a two-page résumé (the Résumé button, or Ctrl+P).
- **Casual** ([/casual/](https://jvpangilinan.github.io/casual/)): for everyone else. My videos, games and mods, plus Doubling Pong, a browser version of my GPU stress test.

The site remembers the last profile, and each side can switch to the other. Linking straight to `/pro/` or `/casual/` skips the login screen. Old links like `/#projects` still land on the right section.

Plain HTML, CSS and JavaScript with no build step, hosted on GitHub Pages.

| Path | What it is |
| --- | --- |
| `index.html`, `login.css`, `login.js` | The login screen |
| `pro/` | The professional side |
| `casual/` | The casual side (`pong.js` is the game) |
| `404.html` | Page not found |
| `img/` | Images. The `.webp` files are smaller copies of the PNG photos, and they're what the pages load |

To run it locally: `py -3.12 -m http.server 8000` in this folder, then open http://localhost:8000.
