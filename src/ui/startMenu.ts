import "./ui.css";

export function createStartMenu(): HTMLElement {
	const menu = document.createElement("section");

	menu.id = "start-menu";
	menu.className = "start-menu";

	menu.setAttribute(
		"aria-labelledby",
		"start-menu-title"
	);

	menu.innerHTML = `
		<div class="start-menu__panel">
			<header class="start-menu__header">
				<p class="start-menu__eyebrow">
					An interactive portfolio
				</p>

				<span
					class="start-menu__ornament"
					aria-hidden="true"
				>
					✦
				</span>

				<h1
					id="start-menu-title"
					class="start-menu__title"
				>
					Angus Anderson
				</h1>

				<p class="start-menu__description">
					A collection of work, waiting beyond the storm.
				</p>
			</header>

			<div
				class="start-menu__actions"
				role="group"
				aria-label="Start menu"
			>
				<button
					id="enter-castle-button"
					class="start-menu__button start-menu__button--primary"
					type="button"
					data-menu-action="enter"
				>
					<span>Enter the Castle</span>

					<span
						class="start-menu__arrow"
						aria-hidden="true"
					>
						→
					</span>
				</button>

				<div class="start-menu__secondary-actions">
					<button
						class="start-menu__button start-menu__button--secondary"
						type="button"
						data-menu-action="settings"
					>
						Settings
					</button>

					<button
						class="start-menu__button start-menu__button--secondary"
						type="button"
						data-menu-action="controls"
					>
						Controls
					</button>
				</div>
			</div>

			<footer class="start-menu__footer">
				<p class="start-menu__note">
					Explore at your own pace. Sound is optional.
				</p>

				<button
					class="start-menu__text-button"
					type="button"
					data-menu-action="projects"
				>
					View projects without exploring
					<span aria-hidden="true">↗</span>
				</button>
			</footer>
		</div>
	`;

	return menu;
}