<template>
    <widget title="Speedtest" @refresh="refresh" v-bind:can-reload="true">
        <div class="flex justify-between">
            <p class="text-l">Download</p>
            <p class="font-bold">{{ speedtest.download }} Mbps
            </p>
        </div>
		<div class="flex justify-between">
			<p class="text-l">Upload</p>
			<p class="font-bold">{{ speedtest.upload }} Mbps
			</p>
		</div>
		<div class="flex justify-between">
			<p class="text-l">Ping</p>
			<p class="font-bold">{{ speedtest.latency }}
			</p>
		</div>
		<div class="flex justify-between">
			<p class="text-l">Time</p>
			<p class="font-bold">{{ speedtest.time }}
			</p>
		</div>
    </widget>
</template>

<script>
import Widget from '@/components/widgets/Widget.vue';

import dateAndTime from "date-and-time";

export default {
    name: "SpeedtestWidget",

    components: {
        Widget
    },

    data: () => ({
        speedtest: {
            ping: 0,
            download: 0,
            latency: 0,
            time: String,
			userIP: String
        },
    }),

    async mounted() {
        this.$socket.client.on("speedtest", this.update);
        this.$socket.client.emit("getSpeedtest");

        this.loading = false;
    },

    beforeUnmount() {
        this.$socket.client.off("speedtest", this.update);
    },

    methods: {
        refresh() {
            this.$emit("loading")
        },

        update(data) {
			console.log(data);
			const time = new Date(data.time)

            this.speedtest = data
			this.speedtest.time = dateAndTime.format(time, "HH:mm:ss")
        },
    },
};
</script>

<style scoped></style>
