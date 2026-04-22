from manimlib import *


class AgentSandboxDemo(Scene):
    def construct(self):
        title = Text("Agent sandbox render")
        title.to_edge(UP)

        subtitle = Text("Docker + ManimGL + XeLaTeX", font_size=36)
        subtitle.set_color(GREY_A)
        subtitle.next_to(title, DOWN, buff=0.25)

        formula = Tex(R"e^{i\pi} + 1 = 0")
        formula.set_color_by_tex(R"\pi", BLUE)
        formula.next_to(subtitle, DOWN, buff=0.6)

        circle = Circle(radius=0.9, color=BLUE)
        circle.set_fill(BLUE_E, opacity=0.35)

        square = Square(side_length=1.4, color=GREEN)
        square.set_fill(GREEN_E, opacity=0.3)

        triangle = Triangle(color=YELLOW)
        triangle.set_fill(YELLOW_E, opacity=0.3)

        shapes = VGroup(square, circle, triangle)
        shapes.arrange(RIGHT, buff=1.0)
        shapes.shift(DOWN * 1.3)

        self.play(Write(title), FadeIn(subtitle, shift=0.2 * DOWN))
        self.play(Write(formula))
        self.play(LaggedStart(*[ShowCreation(shape) for shape in shapes], lag_ratio=0.2))
        self.play(
            square.animate.rotate(PI / 4),
            circle.animate.scale(1.2),
            triangle.animate.shift(UP * 0.35),
            run_time=1.8,
        )
        self.wait(1)


class AgentSandboxStill(Scene):
    def construct(self):
        badge = RoundedRectangle(width=6.4, height=2.4, corner_radius=0.25)
        badge.set_stroke(BLUE_B, width=2)
        badge.set_fill(BLACK, opacity=0.9)

        label = VGroup(
            Text("Sandbox ready", font_size=44),
            Tex(R"\text{Output: } /workspace/videos/*.mp4"),
        )
        label.arrange(DOWN, buff=0.35)

        self.play(FadeIn(badge), Write(label[0]), FadeIn(label[1], shift=0.2 * DOWN))
        self.wait(1)
