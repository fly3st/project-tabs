# Project Tabs

A Chrome side panel that treats your tab groups as projects.

## Install
1. Unzip this folder somewhere permanent (Chrome loads it from disk).
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick the `project-tabs` folder.
4. Pin the extension, then click its icon (or press **Alt+Shift+P**) to open the panel.

To change the shortcut: `chrome://extensions/shortcuts`.

## What it does
- **Open projects** – every group across all windows, with tab counts. Click to expand, double-click a name to rename.
- **Focus** (target icon) – jump to a project and collapse all the others in that window.
- **Archive** (box icon) – saves the project and closes its tabs. **Restore** reopens it as the same named, colored group.
- **Close** (×) – closes the group; it lands in **Recently closed** so nothing is lost by accident. Groups also land there if a window is closed.
- **Search** – press `/`, type, and it filters projects, tabs and archives by title or URL. **Enter** jumps to the first open match.
- **Collapse others** – tidy the tab strip down to the project you're in.
- **Collapsed = unloaded** – when a group is collapsed (from Chrome's tab strip, Focus or Collapse others), its tabs are discarded to free memory. They stay in the group and reload when you open them. The active tab and tabs playing audio are left alone.
- **Other devices** – windows and tabs from your other signed-in computers and phone (needs Chrome Sync with "Open tabs" on). **Open** brings a window over here; the box icon saves it to **Archived** so you can restore it as a project.
- **⋯ → Export / Import backup** – a JSON file of open, archived and recently closed projects.

### What Chrome doesn't let extensions see
- **Saved groups that are closed** (the ones on the bookmarks bar). There's no extension API for them; open one and it appears under Open projects. Archive is this panel's equivalent of a saved group.
- **Incognito windows**, unless you turn on *Allow in Incognito* on the extension's details page in `chrome://extensions`.

Archives are stored locally in the browser (`chrome.storage.local`); export a backup now and then.

## Files
- `manifest.json` – MV3 manifest
- `background.js` – opens the panel, tracks groups so closed ones can be recovered
- `sidepanel.html/.css/.js` – the UI
