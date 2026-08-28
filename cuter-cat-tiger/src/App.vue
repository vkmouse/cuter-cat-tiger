<script setup lang="ts">
import { RouterView } from 'vue-router'
import AccessGate from './components/access/AccessGate.vue'
</script>

<template>
  <AccessGate>
    <RouterView />
  </AccessGate>
</template>
