<template>
  <div class="md:container md:mx-auto p-3 md:p-0 text-stone-800 dark:text-stone-100">
    <div class="flex content-center items-baseline space-x-4 pb-3">
      <h1>{{ title }}</h1>
      <a :href=url class="text-lime-600 font-medium">{{ link }}</a>
    </div>
    <div class="dashboard grid lg:grid-cols-3 gap-4">
      <!-- <SpeedtestWidget></SpeedtestWidget> -->
      <MemoryWidget></MemoryWidget>
      <CpuWidget></CpuWidget>
      <CpuTempWidget></CpuTempWidget>
      <SystemInfoWidget></SystemInfoWidget>
      <ProcessListWidget></ProcessListWidget>
    </div>
  </div>
</template>

<script>
import SystemInfoWidget from './components/widgets/SystemInfo.vue'
// import SpeedtestWidget from './components/widgets/Speedtest.vue'
import MemoryWidget from './components/widgets/Memory.vue'
import CpuWidget from './components/widgets/Cpu.vue'
import CpuTempWidget from './components/widgets/CpuTemp.vue'
import ProcessListWidget from './components/widgets/ProcessList.vue'

export default {
  name: 'App',
  components: {
    SystemInfoWidget,
    // SpeedtestWidget,
    MemoryWidget,
    CpuWidget,
    CpuTempWidget,
    ProcessListWidget
  },

  data: () => ({
      loading: true,
      title: 'raspi-mon',
      url: '',
      link: ''
  }),

  async mounted() {
      this.$socket.client.on("systemInfo", this.systemInfo);
      this.$socket.client.emit("getSystemInfo");

      this.loading = false;

      this.url = location.href
      this.link = location.host
  },

  beforeUnmount() {
      this.$socket.client.off("systemInfo", this.systemInfo);
  },
  methods: {
    systemInfo(data) {
        this.system = data

        // set the hostname
        this.title = `${data.osInfo.hostname} | raspi-mon`
    },
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  margin-top: 60px;
}
</style>
