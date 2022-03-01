<template>
    <widget title="Temperature">
        <div class="flex absolute w-full h-full items-center justify-center font-bold text-xl z-10">{{ temp }} ° </div>
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
    name: "CpuTempWidget",

    components: {
        Widget,
        LineChart
    },

    data: () => ({
      loading: true,

      temp: "0",

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
            display: false
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
      }
    }),

    async mounted() {
        this.$socket.client.on("temp", this.updateTemp);
        // this.$socket.client.emit("getSystemInfo");
        this.loading = false;
    },

    beforeUnmount() {
        this.$socket.client.off("temp", this.updateTemp);
    },

    methods: {
      updateTemp(data) {
        this.dataSet.datasets[0].data = data.map((el) => el.main)
        this.dataSet.labels = data.map((el) => dateAndTime.format(new Date(el.time), "HH:mm:ss"))

        // currently used
        this.temp = data[data.length - 1].main.toFixed(2)
      }
    },
};
</script>
<style scoped></style>
