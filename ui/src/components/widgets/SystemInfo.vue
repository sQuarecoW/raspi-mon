<template>
    <widget title="System info">
        <div class="flex justify-between">
            <p class="text-l">OS</p>
            <p class="font-bold">
                {{ system.osInfo.codename }}
                <span class="font-light">({{ system.osInfo.release }})</span>
            </p>
        </div>
        <div class="flex justify-between">
            <p class="text-l">System time</p>
            <p class="font-bold">
                {{ time.current }}
                <span class="font-light">({{ time.timezone }})</span>
            </p>
        </div>
        <div class="flex justify-between">
            <p class="text-l">System uptime</p>
            <p class="font-bold">{{ time.uptime }}</p>
        </div>
        <div class="flex justify-between">
            <p class="text-l">Hostname</p>
            <p class="font-bold">{{ system.osInfo.hostname }}</p>
        </div>
        <div class="flex justify-between">
            <p class="text-l">IP-address</p>
            <p class="font-bold">
                {{ system.networkInterfaces.ip4 }}
                <span class="font-light"
                    >({{ system.networkInterfaces.iface }})</span
                >
            </p>
        </div>
    </widget>
</template>

<script>
import Widget from "@/components/widgets/Widget.vue"

import dateAndTime from "date-and-time";
import humanizeDuration from "humanize-duration";

export default {
    name: "SystemInfoWidget",

    components: {
        Widget
    },

    data: () => ({
        loading: true,

        system: {
            osInfo: {
                codename: String,
                distro: String,
                hostname: String,
                release: String,
            },
            system: {
                model: String,
                manufacturer: String,
            },
            networkInterfaces: {
                iface: String,
                ip4: String,
            },
        },
        time: {
            current: String,
            uptime: String,
            timezone: String,
            timezoneName: String,
        },
    }),

    async mounted() {
        this.$socket.client.on("systemInfo", this.systemInfo);
        this.$socket.client.emit("getSystemInfo");

        this.$socket.client.on("systemTime", this.systemTime);

        this.loading = false;
    },

    beforeUnmount() {
        this.$socket.client.off("systemInfo", this.systemInfo);
        this.$socket.client.off("systemTime", this.systemTime);
    },

    methods: {
        systemInfo(data) {
            this.system = data

            // set the hostname
            document.title = data.osInfo.hostname + " | raspi-mon"
        },

        systemTime(data) {
            const systemTime = new Date(data.current);

            this.time = {
                current: dateAndTime.format(systemTime, "HH:mm:ss"),
                uptime: humanizeDuration(data.uptime * 1000, {
                    round: true,
                    largest: 2,
                    units: ["d", "h"],
                }),
                timezone: data.timezone,
                timezoneName: data.timezoneName,
            };
        },
    },
};
</script>

<style scoped></style>
