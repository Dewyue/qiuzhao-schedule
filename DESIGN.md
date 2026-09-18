# Design

Surface: Operate — see which hours are free vs taken, then log a new 测评/笔试/面试 in seconds.

World:

- Material: Apple product page / personal site — white and `#f5f5f7` tiles, not paper, ink, or timetable grid paper
- Type: Inter + Noto Sans SC (same pairing as the personal site)
- Color: surface white, ink `#1d1d1f`, muted `#6e6e73`, accent `#0a4fd8`, danger only for overlaps (`#ff3b30`)
- Shape: large-radius tiles (20–28px). Hairline `#e8e8ed` or muted fill — never both a border and a diffuse shadow
- Motion: 250ms `cubic-bezier(0.25, 0.1, 0.25, 1)` on color, opacity, transform

Banned: scratch-paper beige, exam serif, course-grid as the main metaphor, purple dashboards, glassmorphism.

Display law: empty time is a first-class object (labeled, clickable). Events do not own the column.
