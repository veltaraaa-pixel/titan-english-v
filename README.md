# Titan Capital

A turn-based economic simulator. You start at 18 with $5,000, and the goal is to become the most influential human on the planet before you turn 70.

The game is plain HTML, CSS and JavaScript with no dependencies, no server and no build step: `index.html` loads `css/style.css` and the scripts in `js/` in order. `node build.js` bundles everything into `dist/titan-capital-single.html` (one self-contained file, same game).

## How it plays

Pick a goal (most influential human, a $100B fortune, a dynasty, ruling an industry, employing a million, or a beloved titan), pick a path (Corporate, Entrepreneur, Investor, Real Estate or Finance — each with its own advantages, drawbacks, events and a five-level ladder; paths mix as you progress), and play month by month. Debt leaves consequences that come back months or years later; distressed companies can be rescued, restructured or let go; personal insolvency is a setback, not the end. Lifestyle purchases teach opportunity cost and the difference between wealth and cash. The goal strip under the top bar turns green, amber or red depending on whether you are on pace for your age. Milestones on the Titan Path mark your progress; every new finance concept is introduced once, with your own numbers.

## Play

- **Online:** enable GitHub Pages (below) and open the URL GitHub gives you.
- **On your computer:** download `index.html` and double-click it in Chrome, Firefox or Edge.

Progress is saved automatically in the browser (localStorage). You can also export and import saves as JSON from the ☰ menu.

## Publish with GitHub Pages

1. Upload `index.html` (and the other files) to the root of the repository, on the `main` branch.
2. In the repository go to **Settings → Pages**.
3. Under **Build and deployment → Source** choose **Deploy from a branch**.
4. Select the `main` branch and the `/ (root)` folder. Save.
5. After a minute or two the game is live at `https://YOUR-USER.github.io/REPO-NAME/`.

## Shortcuts

- `Space` or `Enter`: end month
- `Esc`: close dialog
- `Ctrl+Shift+D`: debug panel
