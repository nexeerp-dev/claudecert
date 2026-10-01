# Head Start Claude – learn Claude and prep for certification

A static website. No install, no build, no server needed.

## Open it
Double-click `index.html`, or from a terminal:

    xdg-open index.html            # Linux
    python3 -m http.server 8000    # optional, then visit http://localhost:8000

Use Chrome, Edge or Safari. Read-aloud uses your browser's built-in voices (works offline).

## What is inside
- Beginner track: 10 lessons (what AI is, LLMs, tokens, Claude, prompts, context, mistakes, tools/agents, safety, projects)
- Certification lessons: 12 modules (Messages API, structured output, tool use, agents, caching/cost, RAG, MCP, evals/safety, Claude Code, Agent SDK, CI/CD, case studies)
- Exam Plans (`#/certs`): per-certification syllabus with domain weights, 59 tickable topics, lesson links, domain-only practice, a timed 60-question mock exam, and a day-by-day study-plan builder
- ~100 lesson quizzes + 10 scenario questions → Practice Exam (10 / 25 / all questions, with review)
- Practice (`#/practice`): 55 hands-on exercises (write a prompt, code it, design it, find the bug, quick answer), each with progressive hints, a saved answer box, a model solution, an explanation and a self-check list
- Mobile friendly: hamburger menu, compact listen bar, large tap targets, no horizontal scrolling (tested at 320 to 768 px)
- Q&A + Glossary page with search
- Progress and XP are saved in your browser (localStorage)

## Edit the content
All lessons are plain JavaScript data:
- `js/content_beginner.js`, `js/content_cert.js` – lessons; `js/deep_*.js` – deep dives; `js/content_practice.js` – practice exercises
- Add an exercise: `X('id', 'prompt', 2, 'Title', 'Task text', {hints:[...], sol:'...', explain:'...', check:[...]})`
- `js/content_common.js` – block helpers (S, P, Q, EX, MATCH ...) and the glossary
- `js/app.js` – the engine; `css/style.css` – the look

Add a quiz: `Q('Question?', ['A', 'B', 'C', 'D'], indexOfCorrect, 'Why it is right')`.
Options are shuffled when shown, so the order you write does not matter.

## Add another certification
Push another object into `COURSE.certs` in `js/content_certs.js` (name, facts, domains with weight, topics, lesson ids). The hub, checklist, practice and plan builder pick it up automatically.
