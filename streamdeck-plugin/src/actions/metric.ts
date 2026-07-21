import streamDeck, { action, SingletonAction, type WillAppearEvent, type WillDisappearEvent, type DidReceiveSettingsEvent, type KeyDownEvent } from "@elgato/streamdeck";

import { getConnection } from "../pi-connection";
import { render, type Metric } from "../render";

type MetricSettings = {
	host?: string;
	port?: number | string;
	metric?: Metric;
};

const DEFAULT_HOST = "raspberrypi.local";
const DEFAULT_PORT = 1608;

function urlFrom(settings: MetricSettings): string {
	const host = (settings.host ?? "").trim() || DEFAULT_HOST;
	const port = Number(settings.port) || DEFAULT_PORT;
	return `http://${host}:${port}`;
}

/**
 * A single configurable button: pick a raspi-mon host and which metric to show.
 * Subscribes to the shared connection for that host and repaints on every update.
 */
@action({ UUID: "com.squarecow.raspi-mon.metric" })
export class MetricAction extends SingletonAction<MetricSettings> {
	/** action instance id -> unsubscribe */
	private readonly bindings = new Map<string, () => void>();

	override onWillAppear(ev: WillAppearEvent<MetricSettings>): void {
		this.bind(ev.action, ev.payload.settings);
	}

	override onWillDisappear(ev: WillDisappearEvent<MetricSettings>): void {
		this.unbind(ev.action.id);
	}

	override onDidReceiveSettings(ev: DidReceiveSettingsEvent<MetricSettings>): void {
		// Host or metric may have changed in the Property Inspector: rebind.
		this.unbind(ev.action.id);
		this.bind(ev.action, ev.payload.settings);
	}

	override async onKeyDown(ev: KeyDownEvent<MetricSettings>): Promise<void> {
		// Handy shortcut: pressing the key opens the full dashboard in a browser.
		await streamDeck.system.openUrl(urlFrom(ev.payload.settings) + "/");
	}

	private bind(action: WillAppearEvent<MetricSettings>["action"], settings: MetricSettings): void {
		const metric: Metric = settings.metric ?? "cpu";
		const host = (settings.host ?? "").trim() || DEFAULT_HOST;
		const connection = getConnection(urlFrom(settings));

		const unsubscribe = connection.subscribe((data) => {
			const { image, title } = render(metric, data, host);
			if ("setImage" in action) {
				void action.setImage(image);
				void action.setTitle(title);
			}
		});

		this.bindings.set(action.id, unsubscribe);
	}

	private unbind(id: string): void {
		const unsubscribe = this.bindings.get(id);
		if (unsubscribe) {
			unsubscribe();
			this.bindings.delete(id);
		}
	}
}
