# Paper Path

## Scope

A Somaiya Vidyavihar branded question-paper workflow app with three role-based dashboards. No real auth — a login screen lets you pick one of three demo accounts and enter (no password check).

## Demo logins

- `designer@somaiya.edu` → Designer dashboard
- `dqc@somaiya.edu` → DQC dashboard
- `examcoord@somaiya.edu` → Exam Coordinator dashboard

Role is stored in localStorage; a "Switch role" menu is available for quick testing.

## Roles & flow

```text
Designer ──generate 3 sets──▶ pick 1 ──add diagrams──▶ send to DQC
                                                        │
                                              approve ──┴──▶ Exam Coord (view/print/download)
                                              reject  ─────▶ Designer (Not Approved inbox with DQC note)
```

## Designer dashboard

- Left rail: Papers list (Draft, Sent to DQC, Approved, Not Approved).
- Right side: **Generate New Question Paper** form:
  - Date, Course Name, Course Code, Year, Academic Year, Semester
  - Marks dropdown: **20** or **30**
  - Upload Syllabus PDF and Question Bank (PDF/DOCX/TXT)
- On Generate: call Lovable AI Gateway (`openai/gpt-5.5`) with syllabus + question bank text. AI returns 3 sets (Easy / Medium / Hard) each strictly using Remember, Understand, Apply Bloom levels, and distributes questions per module by weightage inferred from syllabus hours. Follows a fixed paper-pattern layout (see below).
- Each generated question renders with a subtle "Attach diagram here if needed" line beneath it.
- **Add Diagram** button → modal: select question from dropdown, upload image from PC → image renders directly below that question; the "attach diagram here" hint disappears for that question.
- **Finalize this set** button under each of the 3 sets → moves it to "Selected set".
- **Send to DQC** button (enabled only after finalization; diagrams optional) → status becomes `sent_to_dqc`.
- **Download PDF / Download Word** buttons on the selected set.
- "Not Approved" tab shows papers DQC rejected with the DQC note; opens back into the editor.

## Paper pattern (fallback since none was attached)

Standard Somaiya-style layout with header block (logo, university, institute, course details), instructions, and the question grid. Since no pattern file was attached, I'll use this default:

- **20-mark paper**: Q1 (5×2 = 10 marks, Remember/Understand), Q2 (2×5 = 10 marks, Apply). "Attempt any …" wording per section.
- **30-mark paper**: Q1 (5×2 = 10, Remember), Q2 (2×5 = 10, Understand), Q3 (1×10 = 10, Apply).

The pattern is fixed in code; AI only fills question text. Swappable later once you send the real pattern.

## DQC dashboard

- Inbox of papers with status `sent_to_dqc`.
- **View Paper** renders the exact paper (with diagrams).
- Below it: **Bloom Analysis** (bar of Remember / Understand / Apply counts), **CO Mapping** (question → CO tag inferred by AI), **Unit Coverage** (module → question count vs syllabus weightage).
- **Add Signature** → upload PNG → renders just below "DQC Verified" line on the paper.
- **Approved** → status → `approved`, forwards to Exam Coord.
- **Not Approved** → prompts for a note → status → `not_approved`, notifies designer.

## Exam Coordinator dashboard

- Inbox of `approved` papers.
- **View Paper**, **Print** (window.print with print stylesheet), **Download PDF**, **Download Word**.

## Technical details

- **Stack**: TanStack Start (existing), Lovable Cloud (Supabase) for persistence + storage, Lovable AI Gateway for question generation.
- **Tables** (all with GRANTs, RLS permissive since auth is bypassed for demo):
  - `papers` (id, status, meta json, sets json, selected_set_index, dqc_note, dqc_signature_url, created_by role, timestamps)
  - `diagrams` (id, paper_id, set_index, question_key, image_url)
  - Storage buckets: `uploads` (syllabus/question-bank), `diagrams`, `signatures` — all public for demo simplicity.
- **AI**: server function `generatePaper` — reads syllabus + question bank text (PDFs parsed via `pdf-parse`-equivalent OR text upload for demo), sends structured-output prompt to `openai/gpt-5.5` with schema `{ sets: [{ difficulty, sections: [{ instruction, marksPerQ, bloom, questions: [{ text, module, co, needsDiagram }] }] }] }`.
- **PDF/Word export**: `jspdf` + `html-to-docx` (or `docx` package) on the client, using a shared `PaperRenderer` component so PDF/Word match the on-screen preview including diagrams and signature.
- **Notifications**: simple `notifications` table + a bell icon in Designer header showing unread rejections.

## Route map

```text
/                         → Login (pick demo email)
/designer                 → dashboard
/designer/new             → generate form
/designer/paper/$id       → 3-set editor + diagram tool + finalize + send
/dqc                      → inbox
/dqc/paper/$id            → review + analysis + approve/reject + signature
/coord                    → inbox
/coord/paper/$id          → view/print/download
```

Header on all dashboards shows current demo user + role switcher.

## Out of scope for v1

- Real authentication / password / RBAC enforcement (explicitly requested to skip)
- Emailing reviewers — "notification" is in-app only
- AI diagram generation — we only insert a "[Diagram required]" placeholder; designer uploads image manually (as requested)
- Editing question text after generation (can add later)

## Delivery order

1. Enable Lovable Cloud + AI key, create tables + buckets.
2. Login + role switcher + protected routing.
3. Designer generate flow (form → AI → 3 sets preview).
4. Diagram uploader + finalize + send-to-DQC.
5. PDF / Word export.
6. DQC dashboard (view, analysis, signature, approve/reject).
7. Exam Coord dashboard (view/print/download).
8. Rejection notifications back to Designer.
   QUESTION PAPER SHOULD HAVE QUESTIONS DERIVED ONLY FROM THE QUESTIN BANK UPLOADED BY THE DESIGNER. FOLLOW THE PROPER FORMAT LAYOUT ATTACHED ABOVE.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://kjsit-qpd-gen.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/90abed60-7bfa-40cb-9454-13173d6386a1).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
