import { createMenuDialog } from "./menuDialog";

export function createControlsPanel(): HTMLDialogElement {
    const { dialog, content } = createMenuDialog(
        "controls-panel",
        "Controls",
        "Find your way through the castle."
    );

    content.innerHTML = `
        <dl class="controls-list">
            <div class="controls-list__row">
                <dt>Move forwards</dt>
                <dd>
                    <kbd>W</kbd>
                    <span>or</span>
                    <kbd>↑</kbd>
                </dd>
            </div>

            <div class="controls-list__row">
                <dt>Move backwards</dt>
                <dd>
                    <kbd>S</kbd>
                    <span>or</span>
                    <kbd>↓</kbd>
                </dd>
            </div>

            <div class="controls-list__row">
                <dt>Strafe left</dt>
                <dd>
                    <kbd>A</kbd>
                    <span>or</span>
                    <kbd>←</kbd>
                </dd>
            </div>

            <div class="controls-list__row">
                <dt>Strafe right</dt>
                <dd>
                    <kbd>D</kbd>
                    <span>or</span>
                    <kbd>→</kbd>
                </dd>
            </div>

            <div class="controls-list__row">
                <dt>Look around</dt>
                <dd>Move the mouse</dd>
            </div>

            <div class="controls-list__row">
                <dt>Jump</dt>
                <dd><kbd>Space</kbd></dd>
            </div>

            <div class="controls-list__row">
                <dt>Pause / release mouse</dt>
                <dd><kbd>Esc</kbd></dd>
            </div>
        </dl>

        <p class="ui-dialog__note">
            Jumping is available while grounded.
            Left and right movement keys strafe;
            use the mouse to turn.
        </p>
    `;

    return dialog;
}