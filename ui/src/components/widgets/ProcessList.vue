<template>
    <widget title="Processes">
        <table class="w-full">
            <tr>
                <td class="w-full"><strong>process</strong>
                </td>
                <td><strong>%cpu</strong>
                </td>
                <td><strong>%mem</strong>
                </td>
            </tr>
            <tr v-for="process in processes" :key="process.pid">
                <td class="w-full">{{ process.name }}
                </td>
                <td>{{ process.cpu }}
                </td>
                <td>{{ process.memory }}
                </td>
            </tr>
        </table>
    </widget>
</template>

<script>
import Widget from "@/components/widgets/Widget.vue"

export default {
    name: "CpuTempWidget",

    components: {
        Widget
    },

    data: () => ({
      loading: true,

      processes: []
    }),

    async mounted() {
        this.$socket.client.on("processList", this.updateList);
        // this.$socket.client.emit("getSystemInfo");
        this.loading = false;
    },

    beforeUnmount() {
        this.$socket.client.off("processList", this.updateList);
    },

    methods: {
      updateList(processList) {
        this.processes = processList
      }
    },
};
</script>
<style scoped>
    td {
        padding-left: 3px;
        padding-right: 3px;
    }
</style>
