// Shared helpers used to write lesson content in a short way.
window.COURSE = { beginner: [], cert: [], exam: [], glossary: [] };

// ---- block builders ----
const S   = (who, text) => ({ t: 'say', who, text });                       // speech bubble: clo | owl | you
const H   = (text) => ({ t: 'h', text });                                   // heading
const P   = (text) => ({ t: 'p', text });                                   // paragraph
const BR  = (text) => ({ t: 'brain', text });                               // Brain Power
const FAQ = (q, a) => ({ t: 'faq', q, a });                                 // There are no dumb questions
const PTS = (title, items) => ({ t: 'pts', title, items });                // Bullet points
const EX  = (title, a, b, why, la, lb) => ({ t: 'ex', title, a, b, why, la, lb }); // before / after
const CODE = (text) => ({ t: 'code', text });
const Q   = (q, opts, ans, why) => ({ t: 'quiz', q, opts, ans, why });      // multiple choice
const PEN = (q, answers, show, why) => ({ t: 'pen', q, answers, show, why }); // Sharpen your pencil (type answer)
const MATCH = (title, pairs) => ({ t: 'match', title, pairs });
const ORDER = (title, items) => ({ t: 'order', title, items });             // click in the right order
const FLASH = (title, cards) => ({ t: 'flash', title, cards });
const FLOW = (title, steps) => ({ t: 'flow', title, steps });               // steps: [icon, title, caption]
const SORT = (title, cats, items) => ({ t: 'sort', title, cats, items });   // items: [text, catIndex]
const TOY = (name) => ({ t: 'toy', name });                                 // tokenizer | temp | ctx
const IMG = (name, cap) => ({ t: 'img', name, cap });

const SCN = (title, sit, ans) => ({ t: 'scn', title, sit, ans });           // scenario: think first, then reveal the answer
const TABLE = (title, head, rows) => ({ t: 'table', title, head, rows });   // comparison table

// Extra "deep dive" blocks per lesson id. They are inserted right after the opening chat bubbles.
window.COURSE.deep = {};
const deepen = (id, blocks) => { window.COURSE.deep[id] = (window.COURSE.deep[id] || []).concat(blocks); };

const add = (track, lesson) => window.COURSE[track].push(lesson);

// ---- glossary ----
window.COURSE.glossary = [
  ['AI', 'Computer programs that do tasks that normally need human intelligence.'],
  ['Machine learning', 'A way to build AI by letting programs learn patterns from examples instead of hand-written rules.'],
  ['Generative AI', 'AI that creates new content: text, images, code, audio.'],
  ['LLM', 'Large Language Model. An AI trained on huge amounts of text to predict and produce language. Claude is one.'],
  ['Anthropic', 'The AI safety company that builds Claude.'],
  ['Claude', 'The family of AI assistants made by Anthropic.'],
  ['Token', 'A small piece of text (a word, part of a word, or punctuation) that the model reads and writes. Roughly 3/4 of an English word.'],
  ['Prompt', 'The instructions and information you give the model.'],
  ['System prompt', 'Standing instructions that set the model\'s role and rules for a whole conversation.'],
  ['Context window', 'The maximum amount of text (in tokens) the model can look at in one go: your prompt, history, and its answer.'],
  ['Hallucination', 'When a model states something false in a confident way.'],
  ['Knowledge cutoff', 'The date after which the model has no training data.'],
  ['Temperature', 'A dial for randomness. Low = predictable. High = more varied and creative.'],
  ['max_tokens', 'API setting that caps how long the answer can be.'],
  ['Few-shot prompting', 'Giving a few examples in the prompt so the model copies the pattern.'],
  ['Chain of thought', 'Asking the model to reason step by step before answering.'],
  ['XML tags', 'Labels like <document>...</document> used to separate parts of a prompt clearly.'],
  ['API', 'A way for programs to talk to each other. The Claude API lets your code talk to Claude.'],
  ['Messages API', 'The main Claude API: you send a list of messages and get a reply.'],
  ['Stateless', 'The server does not remember previous calls; you resend the history each time.'],
  ['Tool use', 'Claude asks your code to run a function (search, calculator, database) and uses the result.'],
  ['tool_use / tool_result', 'The two message pieces in the tool loop: Claude asks (tool_use), you answer (tool_result).'],
  ['Structured output', 'Getting answers in a strict shape, like JSON that follows a schema.'],
  ['JSON schema', 'A description of the exact fields and types a JSON answer must have.'],
  ['Agent', 'A system where the model decides the next steps itself, using tools in a loop until the job is done.'],
  ['Workflow', 'A fixed path of steps, written in code, that uses the model at some steps.'],
  ['Sub-agent', 'A helper agent with its own fresh context, used for a focused part of a task.'],
  ['Orchestrator', 'The lead agent that splits a task and hands pieces to workers.'],
  ['RAG', 'Retrieval-Augmented Generation. Look up relevant documents first, then let the model answer using them.'],
  ['Embedding', 'A list of numbers that captures the meaning of text so similar meanings sit close together.'],
  ['Chunking', 'Cutting long documents into smaller pieces for search.'],
  ['Prompt caching', 'Reusing an unchanged beginning of a prompt so repeated calls are cheaper and faster.'],
  ['Batch API', 'Send many requests at once to be done later at a lower price.'],
  ['Streaming', 'Receiving the answer a few words at a time as it is written.'],
  ['MCP', 'Model Context Protocol. A standard way to plug tools and data into AI apps.'],
  ['Prompt injection', 'A trick where hidden text in content tries to give the model new, harmful instructions.'],
  ['Eval', 'A test set that measures how well your AI system works.'],
  ['LLM-as-judge', 'Using a model with a rubric to grade another model\'s output.'],
  ['Guardrail', 'A safety check or limit placed around an AI system.'],
  ['Human in the loop', 'A person approves risky actions before they happen.'],
  ['CLAUDE.md', 'A file in your project with instructions Claude Code reads at the start of each session.'],
  ['Hook', 'A command the Claude Code harness runs automatically on an event, like after a file edit.'],
  ['Skill', 'A reusable folder of instructions Claude loads when relevant.'],
  ['Claude Code', 'Anthropic\'s coding assistant that works in your terminal and editor.'],
];
