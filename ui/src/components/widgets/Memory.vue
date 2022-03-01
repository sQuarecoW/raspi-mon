<template>
    <widget title="Memory">
        <div class="flex absolute w-full h-full items-center justify-center font-bold text-xl z-10">{{ used }} / {{ total }}</div>
        <LineChart ref="doughnutRef" :chartData="dataSet" :options="options" class="" style="height: 150px;"></LineChart>
    </widget>
</template>

<script>
import Widget from "@/components/widgets/Widget.vue"
import { LineChart } from 'vue-chart-3'
import { Chart, registerables } from "chart.js"

import dateAndTime from "date-and-time";
import prettyBytes from 'pretty-bytes'
import darkMode from '@/utilities/darkmode'

Chart.register(...registerables);

export default {
    name: "SystemInfoWidget",

    components: {
        Widget,
        LineChart
    },

    data: () => ({
      loading: true,

      used: 0,
      total: 0,

      dataSet: {
        labels: [],
        datasets: [
          {
              data: [],
              tension: 0.4,
              cubicInterpolationMode: 'monotone',
              fill: true,
              backgroundColor: darkMode.isDark ? '#333' : '#DDD',
              borderColor: darkMode.isDark ? '#111' : '#C0C0C0',
          },
        ],
      },
      options: {
        responsive: true,
        elements: {
          point: {
            radius: 0,
          },
          line: {
            borderWidth: 1
          }
        },
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: false,
          }
        },
        scales: {
          y: {
            ticks: {
              display: false,
            },
            grid: {
              display: false
            },
            min: 0,
            max: 100,
            display: false,
            stacked: true
          },
          x: {
            ticks: {
              display: false
            },
            grid: {
              display: false
            }
          }
        },
        animations: {
          tension: {
            duration: 1000,
            easing: 'linear',
            from: 1,
            to: 0,
            loop: true
          }
        }
      }
    }),

    async mounted() {
        this.$socket.client.on("memory", this.memory);
        // this.$socket.client.emit("getSystemInfo");
        this.loading = false;
    },

    beforeUnmount() {
        this.$socket.client.off("memory", this.memory);
    },

    methods: {
      memory(data) {
        // scale goes in percentage
        const memoryData = data.map((item) => {
          return (item.active / item.total) * 100
        })
        this.dataSet.datasets[0].data = memoryData
        this.dataSet.labels = data.map((el) => dateAndTime.format(new Date(el.time), "HH:mm:ss"))

        // currently used
        this.used = prettyBytes(data[data.length - 1].active)
        this.total = prettyBytes(data[data.length - 1].total)
      }
    },
};
</script>
<style scoped></style>
