# My Development Process — Score Duel

## Starting Idea

I wanted to make a short guessing game for people who enjoy video games. My starting idea was to compare two games using Metacritic scores. I refined the interaction so that the left game's score was visible and the right game's score was hidden. After a guess, both scores would be revealed. The right game would then move to the left for the next round, and five mistakes would end the run.

I chose this loop because each answer gives the player information they can use in the next round. The player clicks a cover, receives a clear result and decides when to continue.

## Design and Code Changes

I investigated Metacritic data sources and briefly considered IGDB. I eventually chose Steam positive review percentages so that the project could use real player review statistics without requiring the player to configure API credentials. I calculate approval as positive reviews divided by total reviews, rounded to one decimal place.

I initially accepted games with more than 100 reviews, then increased the requirement to more than 500 reviews to reduce the number of obscure games. I also added Chinese and English controls that preserve the current game and score when the language changes.

During my own local testing, I noticed that games appeared repeatedly. With Codex's help, I found that online batches contained only a few games, earlier draws were not remembered, and restarting reused the latest small batch. I changed the design to accumulate games and retain draw history across rounds and replays until the page is reloaded. The server also excludes collected game IDs from new samples. If no unseen games can be obtained, the available pool is reshuffled and the data dialog explains this limitation.

I also reported that double-clicking the Windows launcher appeared to do nothing. The server was already running, and the duplicate launcher closed quickly. I had Codex revise it to keep the status and local address visible and improve browser-opening feedback.

## User Trial and My Response

I asked another person to try the game. After playing, they told me that many of the games were very obscure. This feedback suggested that the selection needed to include more games that players might recognise.

In response, I added a minimum review-count requirement. I first required more than 100 reviews, then raised the threshold to more than 500 reviews. The filter now accepts only games with at least 501 matching Steam reviews, and it applies to online results, cached data and the bundled snapshot.

I chose review count as a practical way to reduce the chance of selecting very obscure games. It does not guarantee that every game will be familiar, but it gives the selection a clearer audience focus. I have not recorded a follow-up trial, so I cannot yet claim that the participant found the revised selection more familiar.

The separate repetition problem described above came from my own testing rather than this participant's feedback.

## AI Tools and My Decisions

I used **OpenAI Codex** to help implement the HTML, CSS and JavaScript interface, Node.js server, Steam data requests, caching, language switching, automated tests and Windows launcher. I also used it to investigate data-source options, check the interface through browser automation, debug problems and draft documentation, including this process record.

I supplied the game idea and requested the changes to the data source, review threshold, language options and repeat-game behaviour. A substantial part of the implementation was generated or revised with AI assistance.

One suggestion I kept was to count either choice as correct when the displayed percentages are equal. This gives a clear, fair result at the precision shown to the player.

One approach I changed was the small-batch selection system. I did not keep its original behaviour after I noticed frequent repeats; I asked for a cumulative pool and draw history. I also decided against continuing the proposed IGDB setup and chose Steam approval percentages instead.

## Technical Checks and Development History

With Codex's assistance, I used Node's built-in test runner and browser checks during development. The latest recorded run passed 19 tests, covering scoring, repeated clicks, ties, the fifth mistake, round carry-over, review thresholds, data fallback, draw history and bilingual messages. Browser checks also confirmed that new rounds carry the right game to the left and that replay resets the score.

I have retained the Git history rather than replacing it with a single final version. Existing commits show the change to Steam data and the successive review thresholds, including:

- `26e3792` — Switch to live Steam approval with cached fallback and Chinese-English UI.
- `41c772a` — Require more than 100 matching Steam reviews for every game.
- `8505a23` — Raise Steam review eligibility threshold to more than 500.

These commits show how I revised the selection criteria during development, including the review-count filter discussed in the user trial above.

## Credits

### Review Data and Game Information

I use data supplied by **Valve / Steam**:

- **Review statistics:** the official [Steam IUserReviewsService documentation](https://partner.steamgames.com/doc/webapi/IUserReviewsService) describes the `GetAppReviews/v1/` endpoint used by the project. I calculate the displayed percentages from its positive and total review counts, using all languages, Steam purchases and off-topic filtering. Only games with at least 501 matching reviews are accepted.
- **Game discovery and metadata:** the public [Steam store search endpoint](https://store.steampowered.com/search/results/) supplies candidate game IDs, names, release information and cover links. This storefront endpoint has no guarantee of stable developer API compatibility; my sampling does not cover the entire Steam library uniformly.
- **Saved fallback data:** `dist/data/games.json` contains review statistics for 50 real Steam games retrieved on 26 October 2026. Each record includes the original counts, retrieval time and Steam source link. These are saved Steam statistics, not invented scores. Local cached statistics also come from the same Steam review service.

### Images and Fonts

Game covers are loaded remotely from Steam's CDN, including `cdn.akamai.steamstatic.com` and Steam store asset hosts. The game artwork, names and trademarks belong to their respective rights holders. I did not create the cover artwork or include the original image files in the repository.

The interface uses [DM Sans](https://fonts.google.com/specimen/DM+Sans) and [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk), provided through Google Fonts under the SIL Open Font License. System fonts are used when these fonts cannot load.

### Code and Tools

The project code was generated and revised with OpenAI Codex as described above. No course-example code or code from the investigated Metacritic repositories was incorporated into this implementation. The screenshots in this repository show the project interface captured during development.

This is a student project and is not affiliated with or endorsed by Valve or the game publishers.
