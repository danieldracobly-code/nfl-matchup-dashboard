# NFL matchup dashboard

Pick any two NFL teams and compare them: offense against the defense it will face, situational and
efficiency stats with league ranks, results, and the remaining schedule. A button at the top builds a
two-page matchup report you can print or save as a PDF.

It is a plain static site (HTML, CSS and JavaScript, no build step), so it runs by opening
`index.html` and can be hosted free on GitHub Pages.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | Page markup |
| `css/styles.css` | Screen styles, plus the print layout for the PDF report |
| `js/app.js` | All dashboard and report logic |
| `js/data.js` | The data snapshot. Generated; do not edit by hand |
| `scripts/build_data.py` | Downloads the latest games and regenerates `js/data.js` |
| `.github/workflows/update-data.yml` | Optional: refreshes the data on GitHub twice a week |

## Open it in VS Code

1. Unzip the folder and open it with **File > Open Folder**.
2. Open `index.html` in a browser. Double-clicking the file works, or install the
   **Live Server** extension, right-click `index.html`, and choose **Open with Live Server** to get
   automatic reload while you edit.

## Put it on GitHub

In the VS Code terminal, from this folder:

```bash
git init
git add .
git commit -m "NFL matchup dashboard"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/nfl-matchup-dashboard.git
git push -u origin main
```

Create the empty repository on github.com first (no README), and replace `YOUR-USERNAME`.
VS Code's **Source Control** panel has a **Publish to GitHub** button that does the same thing.

To host it: on GitHub, go to **Settings > Pages**, set the source to **Deploy from a branch**, pick
`main` and `/ (root)`, and save. The site appears at
`https://YOUR-USERNAME.github.io/nfl-matchup-dashboard/` after a minute or two.

## The PDF report

**Print or save PDF report** opens the browser's print dialog with a report for the two selected
teams. Choose **Save as PDF** as the destination to get a file, or pick a printer. The report covers:

- records, scoring, point margin, Simple Rating, turnover margin and penalties
- the biggest edges for each team
- each offense against the defense it faces
- key offensive and defensive numbers with league rank
- results so far and the next three games

To change what goes in it, edit `buildReport()` and the `REPORT_STATS` list in `js/app.js`; the paper
layout is the `@media print` block at the end of `css/styles.css`.

## Refreshing the data

```bash
pip install -r scripts/requirements.txt
python scripts/build_data.py          # current season
python scripts/build_data.py 2026     # or name a season
```

Then commit the updated `js/data.js`.

Once the repository is on GitHub, the included workflow does this for you on Tuesday and Friday
mornings and commits the result. You can also run it by hand from the **Actions** tab. Delete
`.github/workflows/update-data.yml` if you do not want automatic commits.

## Where the numbers come from

Team statistics are calculated from the open [nflverse](https://github.com/nflverse) play-by-play
data. Pro Football Reference's team tables cannot be read automatically, so they are not the source,
but the first snapshot (through Week 4 of 2026) was checked against Pro Football Reference: points
for and against matched for all 32 teams, and yardage, attempts and turnovers matched its team
defense table for the teams spot-checked.

- Passing yards are net of sack yards, as in a box score.
- Drive and red-zone figures use nflverse drive definitions and can differ from other sites by a
  drive or two.
- Simple Rating is calculated here (average point margin adjusted for opponents). It follows the
  idea behind Pro Football Reference's SRS and can differ from their published figure by up to
  about a point.
- EPA is nflverse's expected points model.

Check the nflverse project for the terms that apply to its data before using this commercially.
