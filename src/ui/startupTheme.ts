export type StartupVariant = "anderson-systems" | "aa-os";
export type StartupPreference = StartupVariant | "random";

const STORAGE_KEY = "portfolio-startup-style";

export function getStartupPreference(): StartupPreference {
    try {
        const value = localStorage.getItem(STORAGE_KEY);

        if (
            value == "anderson-systems" ||
            value == "aa-os"
        ) {
            return value;
        }
    } catch {
        return "random";
    }

    return "random";
}

export function saveStartupPreference(preference: StartupPreference): void {
    try {
        localStorage.setItem(STORAGE_KEY, preference);
    } catch {
        return;
    }
}

export function chooseStartupVariant(): StartupVariant {
    const forced = new URLSearchParams(window.location.search).get("startup");

    if (
        forced === "anderson-systems" ||
        forced === "aa-os"
    ) {
        return forced;
    }

    const preference = getStartupPreference();

    if (preference !== "random") {
        return preference;
    }

    return Math.random() < 0.5 ? "anderson-systems" : "aa-os";
}