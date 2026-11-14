<!--
  OAuth 授權畫面（見 OAuth Server 規格書第 10 節）。

  第三方網站把使用者導到 /authorize?...，這個畫面由 AccessGate 把關
  （需要憑證時由 AccessGate 顯示輸入畫面），通過後立刻呼叫授權端點：
    200 → 導回第三方網站（回呼網址帶 code）
    400 → 在這個畫面顯示錯誤，不導回第三方網站
    其他 → 顯示通用錯誤，不導回第三方網站
-->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { readAuthorizeParams, requestAuthorization } from '../services/oauth'
import type { AuthorizeResult } from '../services/oauth'

type ViewStatus = 'submitting' | 'error' | 'redirecting'

const DEFAULT_ERROR_MESSAGE = '授權請求無法完成'

const ERROR_MESSAGES: Record<string, string> = {
  invalid_request: '授權請求的參數不完整或不正確',
  invalid_client: '找不到這個應用程式的註冊資料',
  unsupported_response_type: '不支援這種授權回應類型',
  invalid_target: '授權請求指定的資源不是本站的 MCP 伺服器',
}

const params = readAuthorizeParams(window.location.search)

const status = ref<ViewStatus>('submitting')
const errorMessage = ref('')

function applyResult(result: AuthorizeResult) {
  if (result.kind === 'redirect') {
    status.value = 'redirecting'
    window.location.assign(result.url)
  } else {
    errorMessage.value =
      result.kind === 'rejected'
        ? (ERROR_MESSAGES[result.error] ?? DEFAULT_ERROR_MESSAGE)
        : DEFAULT_ERROR_MESSAGE
    status.value = 'error'
  }
}

onMounted(async () => {
  applyResult(await requestAuthorization(params))
})
</script>

<template>
  <div class="authorize">
    <div class="authorize-box">
      <p v-if="status === 'submitting'" class="authorize-text">處理授權中…</p>

      <p v-else-if="status === 'redirecting'" class="authorize-text">授權完成，正在返回原網站…</p>

      <template v-else>
        <h1 class="authorize-title">無法完成授權</h1>
        <p class="authorize-text">{{ errorMessage }}</p>
        <p class="authorize-text">這次沒有導回原網站，請回到原網站重新發起授權。</p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.authorize {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-5);
}

.authorize-box {
  width: 100%;
  max-width: 340px;
  background: var(--card);
  border-radius: var(--radius-lg);
  padding: 28px 24px;
  box-shadow: var(--shadow-raised);
}

.authorize-title {
  font-family: var(--font-heading);
  font-size: 1.15rem;
  margin: 0 0 var(--space-4);
  line-height: 1.4;
}

.authorize-text {
  font-size: 0.88rem;
  color: var(--ink-soft);
  margin: 0 0 var(--space-3);
  line-height: 1.6;
}
</style>
