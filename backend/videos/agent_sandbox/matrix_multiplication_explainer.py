import numpy as np

from manimlib import *


class MatrixMultiplicationExplainer(Scene):
    left_values = [[1, 2], [3, 4]]
    right_values = [[5, 1], [7, 2]]

    row_color = BLUE_B
    col_color = YELLOW_B
    result_color = GREEN_B

    def construct(self):
        left = IntegerMatrix(self.left_values, h_buff=1.2, v_buff=0.85)
        right = IntegerMatrix(self.right_values, h_buff=1.2, v_buff=0.85)
        result = IntegerMatrix(np.dot(self.left_values, self.right_values), h_buff=1.2, v_buff=0.85)
        for entry in self.flat_entries(result):
            entry.set_opacity(0)

        times = Tex(R"\times")
        equals = Tex("=")
        matrix_group = VGroup(left, times, right, equals, result)
        matrix_group.arrange(RIGHT, buff=0.6)
        matrix_group.set_width(FRAME_WIDTH - 1.6)
        matrix_group.shift(UP * 0.35)

        labels = self.get_matrix_labels(left, right, result)
        title = Text("How matrix multiplication works")
        title.to_edge(UP, buff=0.35)

        caption = Text("Each output cell comes from one row and one column", font_size=34)
        caption.next_to(title, DOWN, buff=0.22)
        caption.set_color(GREY_A)

        summary = Text("Every entry is a row-column dot product.", font_size=38)
        summary.to_edge(DOWN, buff=0.45)

        formula_anchor = DOWN * 2.45

        self.play(Write(title), FadeIn(caption, shift=0.2 * DOWN))
        self.play(LaggedStart(*[FadeIn(mob, shift=0.15 * UP) for mob in matrix_group], lag_ratio=0.15))
        self.play(LaggedStart(*[FadeIn(mob, shift=0.15 * DOWN) for mob in labels], lag_ratio=0.15))
        self.wait(0.5)

        step_caption = Text("Top row meets left column", font_size=34)
        step_caption.next_to(title, DOWN, buff=0.22)
        step_caption.set_color(GREY_A)
        self.play(ReplacementTransform(caption, step_caption))

        self.explain_entry(left, right, result, 0, 0, formula_anchor, slow=True)

        repeat_caption = Text("Repeat the same move for every output cell", font_size=34)
        repeat_caption.next_to(title, DOWN, buff=0.22)
        repeat_caption.set_color(GREY_A)
        self.play(ReplacementTransform(step_caption, repeat_caption))

        for row, col in [(0, 1), (1, 0), (1, 1)]:
            self.explain_entry(left, right, result, row, col, formula_anchor, slow=False)

        result_entries = self.mob_matrix(result)
        final_boxes = VGroup(*[
            SurroundingRectangle(entry, buff=0.18).set_stroke(self.result_color, 2)
            for entry in self.flat_entries(result)
        ])
        self.play(ShowCreation(final_boxes), FadeIn(summary, shift=0.2 * UP), run_time=1.5)
        self.wait(1.5)

    def get_matrix_labels(self, left, right, result):
        labels = VGroup(
            Text("A", font_size=34).set_color(self.row_color),
            Text("B", font_size=34).set_color(self.col_color),
            Text("AB", font_size=34).set_color(self.result_color),
        )
        for label, matrix in zip(labels, [left, right, result]):
            label.next_to(matrix, UP, buff=0.2)
        return labels

    def explain_entry(self, left, right, result, row_index, col_index, formula_anchor, slow):
        left_entries = self.mob_matrix(left)
        right_entries = self.mob_matrix(right)
        result_entries = self.mob_matrix(result)

        row_group = Group(*left_entries[row_index])
        col_group = Group(*[row[col_index] for row in right_entries])
        target_entry = result_entries[row_index][col_index]

        row_box = SurroundingRectangle(row_group, buff=0.18).set_stroke(self.row_color, 3)
        col_box = SurroundingRectangle(col_group, buff=0.18).set_stroke(self.col_color, 3)
        cell_box = SurroundingRectangle(target_entry, buff=0.18).set_stroke(self.result_color, 3)

        formula, copy_targets, symbol_mobs, value_mob = self.get_formula(row_group, col_group, target_entry)
        formula.move_to(formula_anchor)
        formula_panel = SurroundingRectangle(formula, buff=0.25)
        formula_panel.set_stroke(GREY_B, 1)
        formula_panel.set_fill(BLACK, opacity=0.65)

        highlight_run_time = 1.1 if slow else 0.6
        formula_run_time = 2.0 if slow else 1.2
        reveal_run_time = 1.0 if slow else 0.7

        self.play(ShowCreation(row_box), ShowCreation(col_box), run_time=highlight_run_time)
        self.play(
            FadeIn(formula_panel),
            *[TransformFromCopy(source, target) for source, target in copy_targets],
            *[Write(mob) for mob in symbol_mobs],
            run_time=formula_run_time,
        )
        self.play(ShowCreation(cell_box), run_time=0.4)
        self.play(TransformFromCopy(value_mob, target_entry.copy().set_opacity(1)), run_time=reveal_run_time)
        target_entry.set_opacity(1)
        self.wait(0.2 if slow else 0.1)
        self.play(
            FadeOut(formula),
            FadeOut(formula_panel),
            FadeOut(row_box),
            FadeOut(col_box),
            FadeOut(cell_box),
            run_time=0.6,
        )

    def get_formula(self, row_group, col_group, target_entry):
        row_entries = list(row_group.submobjects)
        col_entries = list(col_group.submobjects)

        elements = []
        copy_targets = []
        symbol_mobs = []
        count = len(row_entries)

        for index, (row_entry, col_entry) in enumerate(zip(row_entries, col_entries)):
            row_copy = row_entry.copy().set_color(self.row_color)
            dot = Tex(R"\cdot").scale(0.8)
            col_copy = col_entry.copy().set_color(self.col_color)

            elements.extend([row_copy, dot, col_copy])
            copy_targets.extend([(row_entry, row_copy), (col_entry, col_copy)])
            symbol_mobs.append(dot)

            if index < count - 1:
                plus = Tex("+")
                elements.append(plus)
                symbol_mobs.append(plus)

        equals = Tex("=")
        value_mob = target_entry.copy().set_opacity(1).set_color(self.result_color)
        elements.extend([equals, value_mob])
        symbol_mobs.extend([equals, value_mob])

        formula = Group(*elements)
        formula.arrange(RIGHT, buff=0.15)
        return formula, copy_targets, symbol_mobs, value_mob

    def mob_matrix(self, matrix):
        return matrix.get_mob_matrix()

    def flat_entries(self, matrix):
        return [entry for row in self.mob_matrix(matrix) for entry in row]
