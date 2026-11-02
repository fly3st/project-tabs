# Project Tabs

A Chrome side panel that treats your tab groups as projects.

## Install
1. Unzip this folder somewhere permanent (Chrome loads it from disk).
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick the `project-tabs` folder.
4. Pin the extension, then click its icon (or press **Alt+Shift+P**) to open the panel.

To change the shortcut: `chrome://extensions/shortcuts`.

## What it does
Project Tabs keeps its own permanent library of every tab group it has seen (name, color and tabs), so it can be your group manager instead of Chrome's saved groups.

- **Open projects** – every group across all windows, with tab counts. Click to expand, double-click a name to rename.
- **Saved projects** – every group that isn't open right now, newest first. **Open** reopens it as the same named, colored group in this window (or jumps to it if it's already open). The trash icon removes it from Project Tabs for good.
- **Close** (×) – unloads the group's tabs and keeps it under Saved projects. Groups closed any other way (Chrome's tab strip, closing the window, quitting Chrome) also stay saved, with the tabs they had last.
- **Focus** (target icon) – jump to a project and collapse all the others in that window.
- **Search** – press `/`, type, and it filters open and saved projects and their tabs by title or URL. **Enter** jumps to the first open match.
- **Collapse others** – tidy the tab strip down to the project you're in.
- **Collapsed = unloaded** – when a group is collapsed (from Chrome's tab strip, Focus or Collapse others), its tabs are discarded to free memory. They stay in the group and reload when you open them. The active tab and tabs playing audio are left alone.
- **Other devices** – windows and tabs from your other signed-in computers and phone (needs Chrome Sync with "Open tabs" on). **Open** brings a window over here; the box icon saves it to Saved projects.
- **⋯ → Export / Import backup** – a JSON file of every project. Older backups (with archives) import too.

### Bringing in groups saved in Chrome
Chrome doesn't let extensions read its saved groups (the ones on the bookmarks bar) while they're closed. To move them into Project Tabs, click each one on the bookmarks bar once to open it. Project Tabs records it, and you can close it from the panel. From then on it lives under Saved projects.

Closing from the panel ungroups the tabs before closing them, so Chrome doesn't keep a second saved copy in the bookmarks bar. Groups you close from Chrome's own tab strip keep Chrome's copy as well.

### Other limits
- **Incognito windows** only show up if you turn on *Allow in Incognito* on the extension's details page in `chrome://extensions`.
- When you open a saved project, Chrome creates a new group for it. If Chrome also has its own saved copy of that group, you may see both on the bookmarks bar; delete Chrome's copy there.

The library is stored locally in the browser (`chrome.storage.local`); export a backup now and then.

## Files
- `manifest.json` – MV3 manifest
- `background.js` – opens the panel, keeps the project library in sync with open groups, opens/closes projects, unloads collapsed groups
- `sidepanel.html/.css/.js` – the UI
