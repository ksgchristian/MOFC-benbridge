# Panel demo (Claude artifact)

`benbridge-demo.html` is a single-page version of the app, published as a Claude artifact for demos:
https://claude.ai/artifact/S621dBPAQY9QSB3nJxoytm (private; share from the page's Share menu)

- Translation runs on the viewer's own Claude account (artifact `sample` capability), so no API key is needed.
- Preset phrases have reviewed translations and work even without Claude.
- Text only: artifacts can't use the microphone.
- It is a separate copy of the form, glossary and prompt. Changes to `lib/` don't flow into it automatically.

To update the published demo, edit this file and ask Claude Code to republish it to the URL above.
