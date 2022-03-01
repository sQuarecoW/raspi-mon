<template>
  <div>
    <LineChart ref="doughnutRef" :chartData="testData" :options="options" />
<!--     <button @click="shuffleData">Shuffle</button> -->
  </div>
</template>

<script>
import { computed, defineComponent, ref, onMounted } from 'vue';
import { LineChart } from 'vue-chart-3';
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

export default defineComponent({
  name: 'Home',
  components: { LineChart },
  setup() {
    const data = ref([30, 40, 60, 70, 5]);
    const doughnutRef = ref();

    const options = ref({
      responsive: true,
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: false,
          text: 'Chart.js Doughnut Chart',
        }
      },
    })

    const testData = computed(() => ({
      labels: ['Paris', 'Nîmes', 'Toulon', 'Perpignan', 'Autre'],
      datasets: [
        {
			data: data.value,
			tension: 0.4,
			cubicInterpolationMode: 'monotone',
			fill: true
        },
      ],
    }))

	onMounted(() => {
		setTimeout( () => {
			console.log(10)
			updateData(10)
		}, 2000)
	})

	const updateData = (() => {
		data.value = [10, 20, 30, 40, 40]
	})

    return { testData, doughnutRef, options, onMounted, updateData };
  },
});
</script>
