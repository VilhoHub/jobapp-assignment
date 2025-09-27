# Hotel Rate Lookup

A small full-stack demo built for a technical assignment.
PHP backend + JS frontend.

## What it does?

* Lets a user pick a **unit**, set **arrival/departure** dates, and add guests.
* Converts input into the format the external API expects.
* Fetches **rates & availability** and shows a summary.

## Quick start

* Codespaces: open and run the “Serve PHP (public/)” task.

## Structure

```
public/            # Frontend
  index.html
  assets/css/styles.css
  assets/js/config.js
  assets/js/app.js
src/
  api/rates.php    # REST endpoint
  api/helpers.php
  config/config.php
  config/units.php
```

## Notes

* Guests are added dynamically with **Add/Remove Guest** buttons.
* Input is validated on both client and server!!
* Configuration (like API URL, age threshold, etc.) lives in `src/config/config.php`.

That’s it—simple to run, easy to read, and ready for review. Thanks for the assignment!
