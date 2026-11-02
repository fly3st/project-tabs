# Chrome Web Store listing

Everything to paste into the Chrome Web Store Developer Dashboard, field by field. See [SUBMISSION.md](SUBMISSION.md) for the steps.

---

## Store listing tab

**Name** (comes from manifest.json)
```
Project Tabs
```

**Summary** (comes from the manifest description, max 132 characters)
```
Manage Chrome tab groups as projects: search, focus, close and reopen them, and see tabs from your other devices.
```

**Description**
```
Project Tabs turns your Chrome tab groups into projects, all in one side panel.

Tab groups are a great way to keep work together, but in the tab strip they're just small chips, and closed groups are easy to lose. Project Tabs gives every group a proper home: see every project across all your windows, find any tab in a keystroke, and close projects without losing them.

★ OPEN PROJECTS
Every tab group in every window, with its color, name and number of tabs. Click to expand, click a tab to jump to it, double-click a name to rename it.

★ INSTANT SEARCH
Press / and type. Open projects, saved projects and their tabs filter as you go, matching titles and web addresses. Enter jumps straight to the first match.

★ FOCUS
One click switches to a project and collapses every other group in the window. "Collapse others" tidies the tab strip down to the project you're in.

★ COLLAPSED MEANS UNLOADED
When a group is collapsed, its tabs are unloaded from memory. They stay in the group and reload when you open them. The tab you're on and tabs playing audio are left alone.

★ SAVED PROJECTS
Project Tabs remembers every group it has seen. Close a project and it waits under Saved projects, newest first. Open brings it back as the same named, colored group. Groups closed from Chrome's tab strip, or when a window closes, are kept too.

★ OTHER DEVICES
See the tabs open on your other computers and phone (with Chrome Sync turned on). Open a window here, or save it as a project for later.

★ BACKUP AND RESTORE
Export all your projects to a JSON file and import them again on any computer.

★ ALSO
• Light and dark theme, following your system
• Keyboard shortcut Alt+Shift+P to open the panel
• Works across multiple windows

PRIVATE BY DESIGN
No account, no servers, no analytics, no tracking. Your projects are stored in your own browser and never leave it. Project Tabs never reads the content of the pages you visit.

GOOD TO KNOW
Chrome doesn't let extensions see the groups saved on your bookmarks bar until they're opened. Click each saved group once and Project Tabs records it; from then on it lives in Saved projects.
```

**Category**
```
Productivity → Workflow & Planning
```
(If the dashboard still shows the older category list, choose **Productivity**.)

**Language**
```
English
```

**Graphic assets**

| Field | File | Size |
| --- | --- | --- |
| Store icon | `icons/128.png` | 128×128 |
| Screenshots (upload in this order) | `store/screenshots/1-overview.png` … `5-focus.png` | 1280×800 |
| Small promo tile | `store/promo/small-tile-440x280.png` | 440×280 |
| Marquee promo tile (optional) | `store/promo/marquee-1400x560.png` | 1400×560 |

**Official URL**: leave as *None*. **Homepage URL** and **Support URL**: optional. If you leave them empty, people can still reach you through the Support tab on the listing.

---

## Privacy tab

**Single purpose**
```
Project Tabs shows the user's Chrome tab groups as projects in a side panel, so they can see, search, focus, close and reopen them.
```

**Permission justifications**

`tabs`
```
Needed to read the titles and URLs of open tabs so the side panel can list each project's tabs, search them, and save a project's tabs when it is closed. Also used to switch to, open, close and unload (discard) tabs at the user's request.
```

`tabGroups`
```
Needed to list the user's tab groups and their names and colors, and to rename, collapse, expand and create groups when the user opens, focuses or reopens a project.
```

`storage`
```
Needed to keep the user's library of saved projects (name, color, tab titles and URLs) in chrome.storage.local, so closed projects can be reopened later. Nothing is sent off the device.
```

`sidePanel`
```
The extension's whole interface is a side panel; this permission is needed to show it and open it from the toolbar button and keyboard shortcut.
```

`favicon`
```
Needed to show each tab's website icon in the panel, read from Chrome's own favicon cache, so no network requests are made for icons.
```

`sessions`
```
Needed to show the windows and tabs open on the user's other signed-in devices (chrome.sessions.getDevices) in the "Other devices" section, so they can open them here or save them as a project.
```

**Host permissions**: none requested.

**Are you using remote code?**
```
No, I am not using remote code.
```

**Data usage**

Google asks extensions to disclose user data they handle even when it never leaves the device. Project Tabs stores the titles and addresses of tabs in your projects, which is the **Web history** category, so tick:

- [x] **Web history**

Leave every other category unchecked (no personal info, health, financial, authentication, personal communications, location, user activity or website content).

Tick all three certifications:
- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL**: the public link to `PRIVACY.md` (see SUBMISSION.md, step 4).

---

## Distribution tab

- **Payments**: Free of charge
- **Visibility**: Public (or Unlisted if you want to try it with a link first)
- **Distribution**: All regions
