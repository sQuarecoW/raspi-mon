<template>
    <widget title="CPU">
        <div class="flex absolute w-full h-full items-center justify-center font-bold text-xl z-10">{{ load }}% </div>
        <LineChart ref="doughnutRef" :chartData="dataSet" :options="options" class="" style="height: 150px;"></LineChart>
    </widget>
</template>

<script>
import Widget from "@/components/widgets/Widget.vue"
import { LineChart } from 'vue-chart-3'
import { Chart, registerables } from "chart.js"

import dateAndTime from "date-and-time"
import darkMode from '@/utilities/darkmode'
// import prettyBytes from 'pretty-bytes'

Chart.register(...registerables);

export default {
    name: "CpuUsageWidget",

    components: {
        Widget,
        LineChart
    },

    data: () => ({
      loading: true,

      load: "0",

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
          x: {
            duration: 5000,
            easing: 'easeOutQuart',
          }
        }
      }
    }),

    async mounted() {
        this.$socket.client.on("cpu", this.cpu);
        // this.$socket.client.emit("getSystemInfo");
        this.loading = false;
    },

    beforeUnmount() {
        this.$socket.client.off("cpu", this.cpu);
    },

    methods: {
      cpu(data) {
        this.dataSet.datasets[0].data = data.map((el) => el.currentLoad)
        this.dataSet.labels = data.map((el) => dateAndTime.format(new Date(el.time), "HH:mm:ss"))

        // currently used
        this.load = data[data.length - 1].currentLoad.toFixed(2)
      }
    },
};
</script>
<style scoped></style>
