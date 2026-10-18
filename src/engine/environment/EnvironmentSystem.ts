import type { GameMap } from "../map";
import type { Player } from "../player";

import type {
	EnvironmentState,
	EnvironmentZone,
	ShelterSource,
} from "./types";

export class EnvironmentSystem {
	private state: EnvironmentState = {
		zoneId: "outside",
		zoneName: "Outside",

		kind: "outdoor",
		indoors: false,

		sheltered: false,
		exposedToRain: true,
		shelterSource: "none",
	};

	public get current(): Readonly<EnvironmentState> {
		return this.state;
	}

	public update(player: Player, map: GameMap): void {
		const zone = this.findZone(player, map.environmentZones);

		const kind = zone?.kind ?? "outdoor";

		let sheltered = zone?.sheltered ?? false;

		let shelterSource: ShelterSource = sheltered
			? "zone"
			: "none";

		// Outdoor areas can still be sheltered by overhead geometry.
		if (!sheltered && this.hasOverheadPlatform(player, map)) {
			sheltered = true;
			shelterSource = "suspended-platform";
		}

		this.state = {
			zoneId: zone?.id ?? "outside",
			zoneName: zone?.name ?? "Outside",

			kind,
			indoors: kind === "indoor",

			sheltered,
			exposedToRain: !sheltered,
			shelterSource,
		};
	}

	private findZone(
		player: Player,
		zones: EnvironmentZone[]
	): EnvironmentZone | null {
		let selected: EnvironmentZone | null = null;

		for (const zone of zones) {
			const inside =
				player.x >= zone.x &&
				player.x < zone.x + zone.width &&
				player.y >= zone.y &&
				player.y < zone.y + zone.depth &&
				player.elevation >= zone.minElevation &&
				player.elevation < zone.maxElevation;

			if (!inside) {
				continue;
			}

			// For equal priorities, the first matching zone wins.
			if (!selected || zone.priority > selected.priority) {
				selected = zone;
			}
		}

		return selected;
	}

	private hasOverheadPlatform(
		player: Player,
		map: GameMap
	): boolean {
		const headHeight =
			player.elevation + player.bodyHeight;

		const tolerance = 0.01;

		for (
			const platform of
			map.getSuspendedPlatformsAt(player.x, player.y)
		) {
			if (
				platform.bottomHeight >=
				headHeight - tolerance
			) {
				return true;
			}
		}

		return false;
	}
}