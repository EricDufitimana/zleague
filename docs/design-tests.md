# ZLeague design study

The approved Studio design is now applied to the public routes. Open `/tests`
to continue reviewing the experimental versions and their alternate palettes.
This study uses Host Grotesk for the interface and Archivo for the
wordmark, following the type pairing observed on https://orvena.framer.website/.
The reference also informs the warm cream, deep navy, lavender, yellow and orange
palette; no reference images or site content are used in the product.

Scores come first: there is no hero, and fixtures appear as a responsive grid of
match cards. The top bar switches between Studio, Electric and Courtside colors.
The selected palette is remembered locally. The shared test layout keeps the
palette, sport and preview toggle consistent while navigating between test sections.
The fonts are bundled locally with their SIL Open Font Licenses in
`public/fonts/design-lab/`, so these pages do not download fonts at build time.

| Test route | Section |
| --- | --- |
| `/tests` | Matchday cards, scores and match details |
| `/tests/bracket` | Boys’ group standings and knockout rounds; girls’ knockout rounds |
| `/tests/leaders` | Player rankings and individual statistics |
| `/tests/predictors` | Test prediction picks and fan rankings |

All public section links in the test navigation stay under `/tests`. The
explicit **Current website** link is the way back to the existing site. Nothing
in the test controls changes production data. The public layout fixes the Studio
palette, uses real data, and hides all sample-data and palette controls.

**Preview scores** is on by default for design review. It uses the actual family
names and fixtures, with sample scores generated only in browser memory. Each
sample card is marked PREVIEW. Turn the switch off to see real results. Preview
mode never writes scores to the database or mixes real player statistics with
the sample results.

Football, basketball and volleyball each have suitable preview scores. Football
includes a penalty shootout example. Search, gender filters, match status tabs,
match detail dialogs and mobile navigation are interactive.

**Groups & Bracket** previews two boys’ groups of three using current active
family names. Each team plays two group games. Football displays MP, W, L, GD,
Pts and Last 3; basketball and volleyball display MP, W, L and Last 3. The table
uses the same standings calculation as the live group implementation. Penalty
results carry a P marker with a result dialog. The knockout preview follows the
top two from each group into semifinals and a final; the girls’ preview shows
knockout rounds. Real mode reads the existing groups and fixtures only.

**Leaders** previews totals using real roster identities where available and
clearly named preview identities elsewhere. Football supports goals, assists,
shots on target and saves. Basketball supports points, rebounds and assists;
there are no three-point statistics. Ranking tabs, gender filters, player/family
search and player breakdowns are interactive. Volleyball links to team results
because individual volleyball statistics are not recorded. Real mode reads the
existing leaders API.

**Predictions** offers team selections on fixture cards, a review dialog and
fan rankings. Test picks are stored in `zleague-design-picks` in localStorage;
they can be edited or cleared. Both preview and real-fixture modes save test
picks only in this browser. They never POST predictions to the league. Sample
fan identities and statistics are labeled; real mode reads settled predictions
from the existing API for the rankings.

The public `/predictors` page is a separate production component. It submits
authenticated, final picks to the league; local test picks are never imported.
The production API derives the player account from the signed-in session and
checks the fixture, opponents, start time and prior prediction before saving.

Browser checks cover preview/real switching, penalty labels, sport and gender
filters, ranking/search controls, local test-pick persistence and clearing,
navigation, no API writes, and viewport overflow at 320, 390, 768, 1024 and 1440 pixels.
Review screenshots are in `artifacts/design-tests/`.
