// Sample data for screenshots. Everything here is made up.
(function () {
  const now = Date.now();
  const min = 60e3, hour = 60 * min, day = 24 * hour;
  const t = (title, url) => ({ title, url });

  const groups = [
    { id: 1, windowId: 1, title: 'Q4 Launch', color: 'blue', collapsed: false, tabs: [
      t('Launch plan – Q4', 'https://docs.example.com/launch-plan'),
      t('Roadmap · Sprint 42', 'https://tracker.example.com/roadmap'),
      t('Pricing page – Design', 'https://design.example.com/pricing'),
      t('Release checklist #482', 'https://code.example.com/acme/app/pull/482'),
      t('Launch metrics', 'https://analytics.example.com/launch'),
    ] },
    { id: 2, windowId: 1, title: 'Apartment hunt', color: 'green', collapsed: true, tabs: [
      t('2BR near the park – Listings', 'https://homes.example.com/listing/2br-park'),
      t('Mortgage calculator', 'https://bank.example.com/mortgage'),
      t('Commute map', 'https://maps.example.com/commute'),
      t('Moving checklist', 'https://notes.example.com/moving'),
    ] },
    { id: 3, windowId: 1, title: 'Thesis research', color: 'purple', collapsed: true, tabs: [
      t('Attention is all you need – arXiv', 'https://arxiv.example.org/abs/1706'),
      t('Literature review draft', 'https://docs.example.com/lit-review'),
      t('Citation manager', 'https://cite.example.com/library'),
      t('Dataset card – Wiki', 'https://wiki.example.org/dataset'),
      t('Advisor meeting notes', 'https://notes.example.com/advisor'),
      t('Statistics lecture 7', 'https://video.example.com/stats-7'),
    ] },
    { id: 4, windowId: 1, title: 'Design system', color: 'pink', collapsed: true, tabs: [
      t('Tokens – Design', 'https://design.example.com/tokens'),
      t('Button component docs', 'https://code.example.com/acme/ui/button'),
      t('Color contrast checker', 'https://contrast.example.com'),
    ] },
    { id: 5, windowId: 2, title: 'Japan trip', color: 'orange', collapsed: false, tabs: [
      t('Flights to Tokyo – compare', 'https://flights.example.com/tokyo'),
      t('Kyoto ryokan – Hotels', 'https://hotels.example.com/kyoto-ryokan'),
      t('JR Pass – what to know', 'https://travel.example.com/jr-pass'),
      t('Itinerary · 12 days', 'https://docs.example.com/japan-itinerary'),
      t('Osaka street food guide', 'https://blog.example.com/osaka-food'),
      t('Return flight options', 'https://flights.example.com/return'),
      t('Yen exchange rates', 'https://bank.example.com/fx/jpy'),
    ] },
  ];
  const ungrouped = [
    { windowId: 1, ...t('Inbox (3)', 'https://mail.example.com/inbox') },
    { windowId: 1, ...t('Weather – this week', 'https://weather.example.com') },
    { windowId: 2, ...t('Lo-fi beats to focus to', 'https://music.example.com/focus') },
  ];

  const library = [
    { id: 'a', title: 'Tax return 2025', color: 'yellow', lastSeen: now - 2 * day, tabs: [
      t('Tax portal – sign in', 'https://tax.example.gov/portal'),
      t('Receipts folder', 'https://drive.example.com/receipts'),
      t('Deductions explained', 'https://blog.example.com/deductions'),
      t('Spreadsheet – 2025 expenses', 'https://sheets.example.com/expenses'),
    ] },
    { id: 'b', title: 'Kitchen renovation', color: 'cyan', lastSeen: now - 5 * day, tabs: [
      t('Cabinet ideas – Pinboard', 'https://pins.example.com/kitchen'),
      t('Quote from contractor', 'https://mail.example.com/quote'),
      t('Tile samples', 'https://shop.example.com/tiles'),
      t('Appliance comparison', 'https://reviews.example.com/ovens'),
      t('Budget', 'https://sheets.example.com/reno-budget'),
      t('Floor plan', 'https://design.example.com/floor-plan'),
    ] },
    { id: 'c', title: 'Conference talk', color: 'red', lastSeen: now - 9 * day, tabs: [
      t('Talk slides – Draft', 'https://slides.example.com/talk'),
      t('CFP submission', 'https://conf.example.com/cfp'),
      t('Speaker notes', 'https://notes.example.com/speaker'),
    ] },
    { id: 'd', title: 'Learn Rust', color: 'grey', lastSeen: now - 18 * day, tabs: [
      t('The Book – Ownership', 'https://learn.example.org/rust/ownership'),
      t('Rustlings exercises', 'https://code.example.com/rustlings'),
      t('Async in depth', 'https://learn.example.org/rust/async'),
      t('Crate docs', 'https://docs.example.rs/serde'),
      t('Playground', 'https://play.example.org/rust'),
    ] },
    { id: 'e', title: 'Flights & points', color: 'blue', lastSeen: now - 26 * day, tabs: [
      t('Points calculator – flights', 'https://points.example.com/calc'),
      t('Lounge access guide', 'https://travel.example.com/lounges'),
    ] },
  ];

  const devices = [
    { deviceName: 'Pixel phone', sessions: [{ lastModified: (now - 12 * min) / 1000, window: { sessionId: 'p1', tabs: [
      t('Recipe – Miso ramen', 'https://food.example.com/ramen'),
      t('Train times', 'https://transit.example.com/times'),
      t('Running playlist', 'https://music.example.com/run'),
      t('News – Morning brief', 'https://news.example.com/brief'),
    ] } }] },
    { deviceName: 'Work laptop', sessions: [{ lastModified: (now - 3 * hour) / 1000, window: { sessionId: 'w1', tabs: [
      t('Team standup notes', 'https://notes.example.com/standup'),
      t('On-call dashboard', 'https://status.example.com'),
      t('PR review queue', 'https://code.example.com/pulls'),
      t('OKR doc', 'https://docs.example.com/okrs'),
      t('Calendar', 'https://calendar.example.com'),
      t('Expense report', 'https://expense.example.com'),
    ] } }] },
  ];

  window.__SAMPLE = { groups, ungrouped, library, devices, activeUrl: 'https://docs.example.com/launch-plan' };
})();
