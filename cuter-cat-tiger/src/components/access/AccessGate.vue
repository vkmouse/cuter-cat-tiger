<!--
  存取權輸入畫面（Cloudflare Access Service Auth）。

  對應 01 UI 規格書第 2 節的四種畫面狀態與轉換規則：
    掛載 → 驗證中 → 依「有無記住憑證」與驗證結果 → 已驗證 / 未驗證 / 錯誤

  這個系統沒有使用者概念，通過驗證後一視同仁，因此這裡不處理任何身份
  資訊，只單純負責「擋下未驗證的存取、放行已驗證的內容」。

  刻意不引入應用程式共用樣式（../../styles/variables.css、base.css），
  所有樣式都寫在這個檔案的 <style scoped> 裡，方便未來其他系統需要同樣
  的驗證流程時可以直接複製這個檔案（連同 ../../services/auth.ts）。
-->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  getStoredCredentials,
  storeCredentials,
  clearCredentials,
  login,
} from '../../services/auth'

type GateStatus = 'checking' | 'unauthenticated' | 'error' | 'authenticated'

const status = ref<GateStatus>('checking')
const clientIdInput = ref('')
const clientSecretInput = ref('')
const submitting = ref(false)
const errorMessage = ref('')

const canSubmit = computed(
  () => clientIdInput.value.trim() !== '' && clientSecretInput.value.trim() !== '',
)

async function check() {
  const stored = getStoredCredentials()
  if (!stored) {
    status.value = 'unauthenticated'
    return
  }

  const result = await login()
  if (result === 'valid') {
    status.value = 'authenticated'
  } else if (result === 'invalid') {
    // 已記住的憑證確定無效，需清除，避免下次仍嘗試使用一組已知無效的憑證。
    clearCredentials()
    status.value = 'unauthenticated'
  } else {
    // 非憑證因素的錯誤，不清除已記住的憑證——問題可能出在別處。
    status.value = 'error'
  }
}

async function handleSubmit() {
  if (submitting.value || !canSubmit.value) {
    return
  }

  const clientId = clientIdInput.value.trim()
  const clientSecret = clientSecretInput.value.trim()

  submitting.value = true
  errorMessage.value = ''

  // 先不寫入 localStorage，直接拿使用者剛輸入的值去試；確認有效才真的
  // 記住，避免把還沒驗證過、可能打錯的憑證提早留在瀏覽器裡。
  const credentials = { clientId, clientSecret }
  const result = await login(credentials)

  if (result === 'valid') {
    storeCredentials(credentials)
    status.value = 'authenticated'
  } else if (result === 'invalid') {
    errorMessage.value = '憑證無效，請確認 Client ID / Client Secret 是否正確'
  } else {
    status.value = 'error'
  }

  submitting.value = false
}

onMounted(() => {
  check()
})
</script>

<template>
  <slot v-if="status === 'authenticated'" />

  <div v-else class="access-gate">
    <div class="access-gate__box">
      <template v-if="status === 'checking'">
        <p class="access-gate__text">驗證中…</p>
      </template>

      <template v-else-if="status === 'error'">
        <h1 class="access-gate__title">目前無法驗證</h1>
        <p class="access-gate__text">
          發生非憑證因素的問題，不是輸入內容的錯，請聯絡系統管理者。
        </p>
      </template>

      <template v-else>
        <h1 class="access-gate__title">需要輸入憑證才能繼續</h1>

        <label class="access-gate__field">
          <span>Client ID</span>
          <input
            v-model="clientIdInput"
            type="text"
            autocomplete="off"
            spellcheck="false"
            :disabled="submitting"
            @keyup.enter="handleSubmit"
          />
        </label>

        <label class="access-gate__field">
          <span>Client Secret</span>
          <input
            v-model="clientSecretInput"
            type="password"
            autocomplete="off"
            spellcheck="false"
            :disabled="submitting"
            @keyup.enter="handleSubmit"
          />
        </label>

        <p v-if="errorMessage" class="access-gate__error">{{ errorMessage }}</p>

        <button
          class="access-gate__button"
          type="button"
          :disabled="submitting || !canSubmit"
          @click="handleSubmit"
        >
          {{ submitting ? '驗證中…' : '送出' }}
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.access-gate {
  min-height: 100vh;
  min-height: 100dvh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e7ebdf;
  background-image: radial-gradient(circle at 1px 1px, rgba(38, 48, 42, 0.06) 1px, transparent 0);
  background-size: 16px 16px;
  color: #26302a;
  font-family: 'Noto Sans TC', system-ui, -apple-system, sans-serif;
  box-sizing: border-box;
  padding: 24px;
  padding-left: max(24px, env(safe-area-inset-left));
  padding-right: max(24px, env(safe-area-inset-right));
}

.access-gate__box {
  width: 100%;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: #fbfbf5;
  border-radius: 20px;
  padding: 28px 24px;
  box-shadow:
    0 1px 2px rgba(38, 48, 42, 0.07),
    0 1px 1px rgba(38, 48, 42, 0.04);
}

.access-gate__title {
  font-family: 'Fraunces', serif;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  line-height: 1.4;
}

.access-gate__text {
  font-size: 14px;
  color: #6b7568;
  margin: 0;
  line-height: 1.6;
}

.access-gate__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: #6b7568;
}

.access-gate__field input {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #c7cebb;
  background: #ffffff;
  color: #26302a;
  font-size: 15px;
  font-family: inherit;
  box-sizing: border-box;
  width: 100%;
}

.access-gate__field input:focus {
  outline: none;
  border-color: #2f6f6b;
}

.access-gate__field input:disabled {
  opacity: 0.6;
}

.access-gate__error {
  margin: 0;
  font-size: 13px;
  color: #b5482f;
}

.access-gate__button {
  margin-top: 4px;
  padding: 12px;
  border-radius: 999px;
  border: none;
  background: #2f6f6b;
  color: #fbfbf5;
  font-size: 15px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}

.access-gate__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 360px) {
  .access-gate__box {
    padding: 22px 18px;
  }
}
</style>
