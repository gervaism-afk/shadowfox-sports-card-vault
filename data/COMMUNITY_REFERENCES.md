# Saved public checklist references

The community checklist data contains attributed, dated card numbers, names, and teams from Trading Card Database public checklist pages. Publisher sources remain preferred. These references keep released sets usable when a source is temporarily unavailable; they are not product images or a promise that every release or parallel is covered.

Run `npx tsx scripts/refresh-community-references.ts --history` to update selected mainstream NHL and MLB releases from 2015 to the current year. Every paginated checklist must load completely before replacing its saved reference. Unavailable sources retain their last verified copy.

The weekly GitHub workflow refreshes the current year, previous year, and one rotating older year. This bounds requests while revisiting every older year over time. Requests use a descriptive user agent and a delay; no access-control bypass is used. Source URLs and verification dates accompany every release.
