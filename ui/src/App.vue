<template>
  <div class="md:container md:mx-auto p-3 md:p-0">
    <h1>Raspi-mon</h1>
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
