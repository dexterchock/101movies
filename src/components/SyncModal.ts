import { isZh, t } from "../i18n";
import { icons } from "../icons";
import {
  REUSABLE_SYNC_CODE_MIN_TTL_MS,
  checkPendingGroupPaired,
  clearCachedActiveSyncCode,
  disconnectSync,
  getCachedActiveSyncCode,
  isDeviceSynced,
  pairWithSyncCode,
  requestSyncCode,
} from "../sync";

export interface SyncModalController {
  destroy: () => void;
}

function formatCountdown(expiresAt: number): string {
  const remainingSec = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export function openSyncModal(onClose: () => void): SyncModalController {
  const ac = new AbortController();
  const { signal } = ac;

  let synced = isDeviceSynced();
  let code = "";
  let pendingGroupId = "";
  let expiresAt = 0;
  let loadingCode = true;
  let codeError = "";
  let pairing = false;
  let pairError = "";
  let confirmingStop = false;
  let codeFetchAc: AbortController | null = null;

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";

  const panel = document.createElement("div");
  panel.className = "modal-panel sync-modal-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", t("sync.title"));
  backdrop.appendChild(panel);
  document.body.appendChild(backdrop);

  // Header
  const header = document.createElement("div");
  header.className = "sync-modal-header";

  const titleWrap = document.createElement("div");
  titleWrap.className = "sync-modal-title-wrap";

  const h3 = document.createElement("h3");
  h3.className = "sync-modal-heading";
  h3.innerHTML = `${icons.refreshCw("sync-modal-heading-icon", 17)}`;
  const h3Title = document.createElement("span");
  h3Title.textContent = t("sync.title");
  h3.append(h3Title);

  const subtitle = document.createElement("p");
  subtitle.className = "sync-modal-subheading";
  titleWrap.append(h3, subtitle);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "sync-modal-close";
  closeBtn.setAttribute("aria-label", t("sync.closeAria"));
  closeBtn.tabIndex = 0;
  closeBtn.innerHTML = icons.x("sync-modal-close-icon", 18);

  header.append(titleWrap, closeBtn);

  const body = document.createElement("div");
  body.className = "sync-modal-body no-scrollbar";
  panel.append(header, body);

  // Persistent DOM sections updated without blowing away input focus
  const statusBanner = document.createElement("div");
  statusBanner.className = "sync-status-banner";
  statusBanner.innerHTML = `<span class="sync-status-dot" aria-hidden="true"></span>`;
  const statusBannerText = document.createElement("span");
  statusBannerText.textContent = t("sync.bannerSynced");
  statusBanner.append(statusBannerText);

  const codeSection = document.createElement("div");
  codeSection.className = "sync-section";

  const codeTopRow = document.createElement("div");
  codeTopRow.className = "sync-section-row";
  const codeLabel = document.createElement("span");
  codeLabel.className = "sync-section-label";
  const countdownEl = document.createElement("span");
  countdownEl.className = "sync-expiry tabular-nums";
  codeTopRow.append(codeLabel, countdownEl);

  const codeBox = document.createElement("div");
  codeBox.className = "sync-code-display tabular-nums";
  codeBox.setAttribute("aria-live", "polite");

  const codeHint = document.createElement("p");
  codeHint.className = "sync-hint";
  codeSection.append(codeTopRow, codeBox, codeHint);

  const divider = document.createElement("div");
  divider.className = "sync-divider";

  const pairSection = document.createElement("div");
  pairSection.className = "sync-section";

  const pairLabel = document.createElement("label");
  pairLabel.className = "sync-section-label";
  pairLabel.textContent = t("sync.pairLabel");

  const inputId = `sync-code-input-${Date.now()}`;
  pairLabel.htmlFor = inputId;

  const codeInput = document.createElement("input");
  codeInput.id = inputId;
  codeInput.type = "text";
  codeInput.inputMode = "numeric";
  codeInput.pattern = "[0-9]*";
  codeInput.maxLength = 4;
  codeInput.autocomplete = "one-time-code";
  codeInput.placeholder = "0000";
  codeInput.className = "sync-code-input tabular-nums";
  codeInput.setAttribute("aria-label", t("sync.pairAria"));

  const pairFeedback = document.createElement("p");
  pairFeedback.className = "sync-feedback";
  pairFeedback.setAttribute("role", "alert");

  pairSection.append(pairLabel, codeInput, pairFeedback);

  const disconnectSection = document.createElement("div");
  disconnectSection.className = "sync-disconnect-section";

  const stopBtn = document.createElement("button");
  stopBtn.type = "button";
  stopBtn.className = "sync-stop-btn";
  const stopBtnLabel = document.createElement("span");
  stopBtnLabel.className = "sync-action-btn-inner";
  stopBtnLabel.textContent = t("sync.stop");
  stopBtn.append(stopBtnLabel);

  const choicesRow = document.createElement("div");
  choicesRow.className = "sync-choices-row";

  const keepBtn = document.createElement("button");
  keepBtn.type = "button";
  keepBtn.className = "sync-choice-btn";
  const keepBtnLabel = document.createElement("span");
  keepBtnLabel.className = "sync-action-btn-inner";
  keepBtnLabel.textContent = t("sync.keep");
  keepBtn.append(keepBtnLabel);

  const clearDisconnectBtn = document.createElement("button");
  clearDisconnectBtn.type = "button";
  clearDisconnectBtn.className = "sync-choice-btn sync-choice-btn--danger";
  const clearBtnLabel = document.createElement("span");
  clearBtnLabel.className = "sync-action-btn-inner";
  clearBtnLabel.textContent = t("sync.clearDisconnect");
  clearDisconnectBtn.append(clearBtnLabel);

  choicesRow.append(keepBtn, clearDisconnectBtn);
  disconnectSection.append(stopBtn, choicesRow);

  body.append(statusBanner, codeSection, divider, pairSection, disconnectSection);

  const destroy = () => {
    ac.abort();
    codeFetchAc?.abort();
    codeFetchAc = null;
    window.clearInterval(countdownTimer);
    window.clearInterval(pollTimer);
    backdrop.remove();
  };

  const handleClose = () => {
    destroy();
    onClose();
  };

  backdrop.addEventListener("click", handleClose, { signal });
  panel.addEventListener("click", (e) => e.stopPropagation(), { signal });
  closeBtn.addEventListener("click", handleClose, { signal });

  window.addEventListener(
    "keydown",
    (e: KeyboardEvent) => {
      if (
        e.key === "Escape" ||
        e.keyCode === 10009 ||
        e.key === "XF86Back"
      ) {
        e.preventDefault();
        handleClose();
      }
    },
    { signal }
  );

  function updateCountdownAndCode() {
    if (signal.aborted) return;
    if (loadingCode) {
      countdownEl.textContent = t("sync.generating");
      codeBox.textContent = "----";
      codeBox.classList.add("is-loading");
      codeHint.textContent = "";
      codeHint.classList.remove("is-error");
      return;
    }

    codeBox.classList.remove("is-loading");
    if (codeError) {
      countdownEl.textContent = "";
      codeBox.textContent = "----";
      codeHint.textContent = codeError;
      codeHint.classList.add("is-error");
      return;
    }

    codeBox.textContent = code;
    countdownEl.textContent = t("sync.expiresIn", {
      time: formatCountdown(expiresAt),
    });
    codeHint.classList.remove("is-error");
    codeHint.textContent = synced ? t("sync.hintSynced") : t("sync.hintUnpaired");
  }

  function renderMode() {
    if (signal.aborted) return;
    synced = isDeviceSynced();

    subtitle.textContent = synced
      ? t("sync.subtitleSynced")
      : t("sync.subtitleUnpaired");

    statusBanner.hidden = !synced;
    divider.hidden = synced;
    pairSection.hidden = synced;
    disconnectSection.hidden = !synced;

    codeLabel.textContent = synced
      ? t("sync.labelAddDevice")
      : t("sync.labelThisDevice");

    stopBtn.hidden = confirmingStop;
    choicesRow.hidden = !confirmingStop;

    codeInput.disabled = pairing;
    codeInput.classList.toggle("is-pairing", pairing);
    if (pairing) {
      pairFeedback.textContent = t("sync.pairing");
      pairFeedback.className = "sync-feedback is-pending";
    } else if (pairError) {
      pairFeedback.textContent = pairError;
      pairFeedback.className = "sync-feedback is-error";
    } else {
      pairFeedback.textContent = t("sync.pairAutoHint");
      pairFeedback.className = "sync-feedback";
    }

    updateCountdownAndCode();
  }

  async function fetchFreshCode(forceFresh = false) {
    if (signal.aborted) return;
    if (forceFresh) {
      clearCachedActiveSyncCode();
    }
    codeFetchAc?.abort();
    const reqAc = new AbortController();
    codeFetchAc = reqAc;

    loadingCode = true;
    codeError = "";
    updateCountdownAndCode();

    try {
      const res = await requestSyncCode(reqAc.signal, { forceFresh });
      if (signal.aborted || reqAc.signal.aborted) return;
      code = res.code;
      pendingGroupId = res.groupId;
      expiresAt = res.expiresAt;
      loadingCode = false;
      codeError = "";
      renderMode();
    } catch (err: any) {
      if (
        signal.aborted ||
        reqAc.signal.aborted ||
        err?.name === "AbortError"
      ) {
        return;
      }
      loadingCode = false;
      const rawMsg = typeof err?.message === "string" ? err.message.trim() : "";
      if (isZh() && (!rawMsg || /^(failed to fetch|load failed|network)/i.test(rawMsg))) {
        codeError = t("sync.errFetch");
      } else {
        codeError = rawMsg || t("sync.errFetch");
      }
      updateCountdownAndCode();
    } finally {
      if (codeFetchAc === reqAc) {
        codeFetchAc = null;
      }
    }
  }

  async function submitPairingCode(digits: string) {
    if (pairing || signal.aborted) return;
    pairing = true;
    pairError = "";
    renderMode();

    const result = await pairWithSyncCode(digits, signal);
    if (signal.aborted) return;

    pairing = false;
    if (!result.ok) {
      pairError = result.error || t("sync.errInvalidCode");
      codeInput.value = "";
      renderMode();
      codeInput.focus({ preventScroll: true });
      return;
    }

    const alreadyTransitioned = synced;
    confirmingStop = false;
    synced = true;
    codeInput.value = "";
    renderMode();
    if (!alreadyTransitioned) {
      // Generate a fresh 4-digit code tied to the newly joined group so user can add another device
      void fetchFreshCode(true);
    }
  }

  codeInput.addEventListener(
    "input",
    () => {
      const digits = codeInput.value.replace(/\D/g, "").slice(0, 4);
      if (codeInput.value !== digits) {
        codeInput.value = digits;
      }
      if (pairError) {
        pairError = "";
        pairFeedback.textContent = t("sync.pairAutoHint");
        pairFeedback.className = "sync-feedback";
      }
      if (digits.length === 4) {
        void submitPairingCode(digits);
      }
    },
    { signal }
  );

  stopBtn.addEventListener(
    "click",
    () => {
      confirmingStop = true;
      renderMode();
      keepBtn.focus({ preventScroll: true });
    },
    { signal }
  );

  keepBtn.addEventListener(
    "click",
    () => {
      disconnectSync("keep");
      handleClose();
    },
    { signal }
  );

  clearDisconnectBtn.addEventListener(
    "click",
    () => {
      disconnectSync("clear");
      handleClose();
    },
    { signal }
  );

  window.addEventListener(
    "sync-state-updated",
    () => {
      if (signal.aborted) return;
      const nowSynced = isDeviceSynced();
      if (nowSynced !== synced) {
        synced = nowSynced;
        pairing = false;
        confirmingStop = false;
        pairError = "";
        codeInput.value = "";
        renderMode();
        if (synced) {
          void fetchFreshCode(true);
        }
      }
    },
    { signal }
  );

  const countdownTimer = window.setInterval(() => {
    if (signal.aborted || loadingCode || codeError || !expiresAt) return;
    if (Date.now() >= expiresAt) {
      clearCachedActiveSyncCode();
      void fetchFreshCode(true);
      return;
    }
    countdownEl.textContent = t("sync.expiresIn", {
      time: formatCountdown(expiresAt),
    });
  }, 1000);

  const pollTimer = window.setInterval(() => {
    if (
      signal.aborted ||
      synced ||
      !pendingGroupId ||
      pairing ||
      document.visibilityState === "hidden"
    ) {
      return;
    }
    void checkPendingGroupPaired(pendingGroupId, signal).then((becamePaired) => {
      if (becamePaired && !signal.aborted && !synced) {
        synced = true;
        confirmingStop = false;
        renderMode();
        void fetchFreshCode(true);
      }
    });
  }, 3800);

  const cachedCode = getCachedActiveSyncCode(REUSABLE_SYNC_CODE_MIN_TTL_MS);
  if (cachedCode) {
    code = cachedCode.code;
    pendingGroupId = cachedCode.groupId;
    expiresAt = cachedCode.expiresAt;
    loadingCode = false;
    renderMode();
    if (!synced && pendingGroupId) {
      void checkPendingGroupPaired(pendingGroupId, signal);
    }
  } else {
    renderMode();
    void fetchFreshCode();
  }

  return { destroy };
}
