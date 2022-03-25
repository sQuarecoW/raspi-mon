<template>
    <widget title="Processes">
        <div class="">
            <div class="flex flex-row border-b">
                <div class="flex-auto text"><strong>process</strong>
                </div>
                <div  class="flex-initial shrink-0 w-1/6 text-right"><strong>%cpu</strong>
                </div>
                <div  class="flex-initial shrink-0 w-1/6 text-right"><strong>%mem</strong>
                </div>
            </div>
            <div v-for="process in processes" :key="process.pid" class="flex flex-row process">
                <div class="flex-auto pl-1 truncate" :title=process.path>{{ process.name }}
                </div>
                <div  class="flex-initial shrink-0 w-1/6 pr-1 text-right">{{ process.cpu }}
                </div>
                <div  class="flex-initial shrink-0 w-1/6 pr-1 text-right">{{ process.memory }}
                </div>
            </div>
        </div>
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

      processes: [],
      count: 1
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
          if (this.count == 1) {
        this.processes = processList
        // this.count++

          }
      }
    },
};
</script>
<style scoped>
</style>
