import streamDeck from "@elgato/streamdeck";

import { MetricAction } from "./actions/metric";

streamDeck.actions.registerAction(new MetricAction());

streamDeck.connect();
