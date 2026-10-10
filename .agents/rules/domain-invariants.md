# SLATE Domain Invariants Specification

These 12 business invariants are codified in `scripts/verify-domain-rules.ts` (35 assertions) and enforced in `src/lib/ai-scheduler.ts` and `src/lib/storage.ts`:

## 1. Cadre Roster Size
- The active teaching cadre consists of exactly 9 instructors:
  - Yasith (Demonstrator)
  - Dr. Thisara (Executive)
  - Chamath, Supun, Dilsara, Sandun, Sasindu, Tharindu, Kithnuka (Technical Instructors & Assistants)

## 2. Double-Booking Collision Guard
- No instructor can be scheduled for overlapping duty slots on the same calendar date.
- `validationEngine.checkCollisions()` must block overlapping assignments before persistence.

## 3. Leave Precedence Rule
- An approved leave (`LeaveStatus.APPROVED`) strictly vetoes any teaching duty or night shift allocation.
- In both deterministic CSP scheduling and manual demonstrator planning, duty assignment on an approved leave date MUST fail with an explicit validation error.

## 4. Night Duty Caretaker Invariant
- Exactly one designated caretaker officer is assigned per calendar date (`shiftDate`).
- Instructors on leave cannot be assigned to night duty.
- The night shift assignment table (`NightShift`) links uniquely by `(rosterWeekId, shiftDate)`.

## 5. Lexicographical Date Standard
- All dates (`startDate`, `endDate`, `dutyDate`, `shiftDate`) MUST strictly be plain ISO date strings (`"YYYY-MM-DD"`).
- Never use JavaScript `Date` objects or ISO timestamp strings with times in storage models, as timezone conversions between UTC and Sri Lanka Standard Time (UTC+5:30) produce one-day off-by-one errors.

## 6. Unified Full-Day Session Model
- When an instructor teaches the same batch and module in both Morning (`09:00 - 12:00`) and Afternoon (`13:00 - 16:00`) on the same date:
  - `mergeDutyAssignments()` merges them into a single `Full Day (09:00 - 16:00)` session.
  - Notes from both morning theory and afternoon practical are concatenated with ` • `.

## 7. Mathematical Idle Standby Pool
- For any given time slot:
  `Total Cadre (9) = On Duty (Teaching) + On Leave + Free Standby (Idle Pool)`
- Free standby candidates are instructors who are neither teaching nor on approved leave, available for student marking or emergency substitutions.

## 8. Sunday Evening CCS Batch Slot
- Sunday contains a dedicated academic batch slot (`16:30 - 17:30`) for the CCS Certificate programme.
- It is dynamically included whenever Sunday falls within the 7-day planning range.

## 9. AI Health Radar & CSP Heuristics
- The AI Health Radar in `src/lib/ai-scheduler.ts` continuously scans the timetable for:
  - Scheduling conflicts (double bookings, leave violations)
  - Unassigned required slots
  - Workload imbalances across the 9 cadre members
- The Substitute Finder heuristic scores available standby candidates based on historical workload and current day activity.
