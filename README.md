# Mysuru Dasara: Traffic and Emissions

An interactive dashboard comparing normal and Dasara sightseeing traffic in Mysuru, India. Built with HTML, CSS and JavaScript; no dependency installation or build is needed.

## Features

- CO₂, CO, NOₓ and exhaust PM travel emissions.
- Stacked emissions charts for two-wheelers, three-wheelers, cars and buses.
- Idling fuel consumption, reported separately from emissions.
- Editable daily traffic profile and line chart.
- CSV export and browser-local saved settings.

Main inputs update results after **Apply changes**. The daily profile has its own apply button. Pollutant buttons change only the daily chart.

## Run locally

From this project folder:

```sh
python -m http.server 8000 --directory docs
```

Open http://localhost:8000/ in a browser. Use a web server because the app imports JavaScript modules.

## Upload to GitHub

1. Create a repository named `mysuru-traffic-emissions`, or another name you prefer.
2. Extract the ZIP on your computer.
3. In the repository, select **Add file → Upload files**.
4. Drag the contents of this project folder into the upload area: the `docs` folder, README and both check scripts. Preserve the `docs` folder. Do not upload the ZIP itself or add an extra outer project folder.
5. Enter a commit message and commit the upload.

## Publish with GitHub Pages (optional)

1. Open the repository's **Settings → Pages**.
2. Select **Deploy from a branch**.
3. Select branch `main` and folder `/docs`, then **Save**.
4. GitHub displays the website link after deployment.

This does not change the existing ChatGPT Sites dashboard. Future changes made there will need to be copied to this repository; there is no automatic synchronisation.

GitHub documentation:
- https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Calculations and units

For each pollutant:

`Travel emissions (kg) = Σ [vehicle round trips × distance (km) × emission factor (g/km)] ÷ 1,000`

`Idling fuel (L) = Σ [vehicle round trips × idling time (min) ÷ 60 × fuel consumption rate (L/h)]`

One round trip includes home-to-area travel, sightseeing and the return home. Counts cover the full comparison period, rather than unique vehicles or daily counts.

Defaults are 42.5 km (10 km outward + 22.5 km sightseeing + 10 km home), 15% registered-fleet participation, 40% additional Dasara round trips and an 11-day comparison period. Participation, routes, waiting times and daily changes are assumptions.

Daily profile edits redistribute existing period counts and preserve totals. Additional idling fuel holds Dasara trip counts fixed and isolates the longer waiting time. No separate idling emission mass is added.

## Sources and limitations

- Travel emission factors: Venkataramana, Fauzie & Naveen (2018), Table 1, citing ARAI (2008): https://www.discoveryjournals.org/climate_change/current_issue/v4/n16/A6.pdf
- Idling fuel: Kumar et al. (2015), Table 8: https://www.researchgate.net/publication/318788877_Evaluation_of_Idling_Fuel_Consumption_of_Vehicles_Across_Different_Cities
- March 2025 registrations reported in March 2026: https://auto.economictimes.indiatimes.com/news/industry/mysuru-adds-1-7-lakh-vehicles-in-2-years-traffic-woes-deepen/129453073
- Historical normal traffic context: https://www.ijera.com/papers/vol10no6/Series-1/B1006011222.pdf
- ARAI regulation definitions: https://www.araiindia.com/pdf/Indian_Emission_Regulation_Booklet.pdf

This is a scenario calculator, not a calibrated present-day citywide inventory. Historical emission factors are not weighted for the current fleet's age, fuel or emission standard. The two-wheeler CO factor is 2.822 g/km, compared with 1.601 g/km for cars. These factors and the assumed trip mix explain the large two-wheeler CO contribution. Additional congestion emissions remain unquantified. Detailed source notes are available inside the dashboard.

## Files

| File | Purpose |
| --- | --- |
| `docs/index.html` | Dashboard structure and source notes |
| `docs/style.css` | Responsive styling |
| `docs/app.mjs` | Input handling and results |
| `docs/model.mjs` | Calculations and default data |
| `docs/daily-chart.mjs` | Daily emissions line chart |
| `docs/vehicle-chart.mjs` | Stacked emissions charts |
| `docs/export.mjs` | CSV export |
| `check-model.mjs` | Calculation and allocation checks |
| `check-interactions.mjs` | Interaction checks with a lightweight DOM stub |

## Checks

With a recent Node.js version supporting ES modules and `structuredClone`:

```sh
node check-model.mjs
node check-interactions.mjs
```

These interaction checks do not replace testing the rendered site in a browser.

## Dashboard image

The user-supplied Dasara procession photograph is bundled at `docs/assets/dasara-procession.jpg` and shown beside the introduction. The full image is preserved. The displayed tagline is **Festivals, Traffic & Emissions**.
