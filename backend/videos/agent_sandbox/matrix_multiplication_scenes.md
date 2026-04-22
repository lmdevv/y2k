# How Matrix Multiplication Works

## Overview
- **Topic**: Visual intuition for multiplying two small matrices
- **Hook**: The output matrix looks mysterious until you realize each cell is built from one row and one column
- **Target Audience**: Beginner, comfortable with arithmetic and basic matrix notation
- **Estimated Length**: 60-90 seconds
- **Key Insight**: Matrix multiplication is a grid of row-column dot products

## Narrative Arc
Start with two concrete 2x2 matrices and an empty output matrix. Slow down for one entry so the viewer sees exactly where the numbers come from, then speed up and repeat the same visual rhythm for the remaining entries until the pattern becomes obvious.

---

## Scene 1: Opening Rule
**Duration**: ~10 seconds
**Purpose**: Set the goal and reduce the intimidation factor

### Visual Elements
- Title and subtitle
- Left matrix, right matrix, output matrix
- Labels `A`, `B`, and `AB`

### Content
Show the full multiplication layout immediately, but keep the result entries hidden. Tell the viewer the whole game: each output cell comes from one row of the left matrix and one column of the right matrix.

### Narration Notes
Keep the tone calm and direct. This scene should feel like a promise that the process is simpler than it looks.

### Technical Notes
- `IntegerMatrix` for the matrices
- `Text` for labels and subtitle

---

## Scene 2: Build One Entry Slowly
**Duration**: ~20 seconds
**Purpose**: Make the row-column rule concrete

### Visual Elements
- Blue rectangle around one row of `A`
- Yellow rectangle around one column of `B`
- Formula panel near the bottom
- Green highlight on the target result cell

### Content
Take the top row from `A` and the first column from `B`. Copy their entries into a formula, multiply matching pairs, add them, and place the result into the top-left cell.

### Narration Notes
This is the key teaching beat. Pause long enough for the viewer to see that the numbers are copied from the highlighted row and column.

### Technical Notes
- `SurroundingRectangle` for highlights
- `TransformFromCopy` from matrix entries into the formula

---

## Scene 3: Repeat the Pattern
**Duration**: ~25 seconds
**Purpose**: Turn the one-off example into a reliable procedure

### Visual Elements
- Same highlight rhythm for the remaining three cells
- Formula panel updates in place

### Content
Repeat the exact same move for the other three entries, slightly faster now that the viewer knows the pattern.

### Narration Notes
Use repetition as a teaching tool. The sameness of the animation is the point.

### Technical Notes
- Reuse the same helper for each cell
- Shorter run times after the first pass

---

## Scene 4: Summary
**Duration**: ~10 seconds
**Purpose**: Leave the viewer with the rule in plain language

### Visual Elements
- Finished output matrix
- Short summary sentence
- Optional subtle highlight sweep across all four result entries

### Content
State the rule clearly: every entry in the output matrix is a row from the left matrix dotted with a column from the right matrix.

### Narration Notes
End with the simplest possible sentence so the viewer remembers the algorithm.

### Technical Notes
- Keep the end state uncluttered

---

## Transitions & Flow
The same blue-yellow-green color logic should stay consistent throughout: blue for the chosen row, yellow for the chosen column, green for the output cell.

## Color Palette
- Primary: Blue - left-matrix row
- Secondary: Yellow - right-matrix column
- Accent: Green - output cell and final answer
- Background: Deep navy

## Mathematical Content
- `A = \begin{bmatrix}1 & 2 \\ 3 & 4\end{bmatrix}`
- `B = \begin{bmatrix}5 & 1 \\ 7 & 2\end{bmatrix}`
- `AB = \begin{bmatrix}19 & 5 \\ 43 & 11\end{bmatrix}`

## Implementation Order
1. Lay out title, matrices, and labels
2. Implement the single-entry explanation helper
3. Reuse it for the remaining entries with faster timing
4. Add the closing summary
