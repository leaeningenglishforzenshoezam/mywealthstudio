"use strict";

/* ------------------------------
   Supabase cloud sync
------------------------------ */

const MWS_SUPABASE_URL =
  "https://noibejvmloiphkogocfg.supabase.co";

const MWS_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_NfG8LYn8wJ661ZBvDpxaEQ_-yqDg4nH";

const MWS_CLOUD_TABLE =
  "wealth_data";

const MWS_CLOUD_META_KEY =
  "myWealthStudioCloudMeta";

let mwsSupabaseClient = null;
let mwsCloudUser = null;
let mwsCloudSaveTimer = null;
let mwsCloudIsApplyingData = false;
let mwsCloudHasConflict = false;
let mwsOriginalSaveData = null;

/* ------------------------------
   Start
------------------------------ */

document.addEventListener(
  "DOMContentLoaded",
  initializeCloudSync
);

async function initializeCloudSync() {
  createCloudSyncInterface();

  setCloudSyncStatus(
    "connecting",
    "クラウド接続を確認中"
  );

  try {
    const module =
      await import(
        "https://cdn.jsdelivr.net/npm/" +
        "@supabase/supabase-js@2.57.4/+esm"
      );

    mwsSupabaseClient =
      module.createClient(
        MWS_SUPABASE_URL,
        MWS_SUPABASE_PUBLISHABLE_KEY,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        }
      );

    wrapLocalSaveFunction();
    registerCloudSyncListeners();

    const {
      data,
      error
    } =
      await mwsSupabaseClient
        .auth
        .getSession();

    if (error) {
      throw error;
    }

    await handleCloudSession(
      data.session,
      {
        autoLoad: true
      }
    );

    mwsSupabaseClient
      .auth
      .onAuthStateChange(
        async (
          event,
          session
        ) => {
          if (
            event ===
              "INITIAL_SESSION" ||
            event ===
              "TOKEN_REFRESHED"
          ) {
            return;
          }

          await handleCloudSession(
            session,
            {
              autoLoad:
                event ===
                "SIGNED_IN"
            }
          );
        }
      );

  } catch (error) {
    console.error(
      "Supabaseの初期化に失敗しました。",
      error
    );

    setCloudSyncStatus(
      "error",
      "クラウド接続エラー"
    );

    setCloudMessage(
      "クラウド接続を開始できませんでした。" +
      "インターネット接続と設定を確認してください。",
      "error"
    );
  }
}

/* ------------------------------
   Interface
------------------------------ */

function createCloudSyncInterface() {
  if (
    document.getElementById(
      "cloudSyncButton"
    )
  ) {
    return;
  }

  const button =
    document.createElement(
      "button"
    );

  button.type = "button";
  button.id = "cloudSyncButton";
  button.className =
    "cloud-sync-button";

  button.innerHTML = `
    <span
      class="cloud-sync-dot"
      id="cloudSyncDot"
      aria-hidden="true"
    ></span>

    <span>
      <strong>
        クラウド同期
      </strong>

      <small id="cloudSyncStatusText">
        接続を確認中
      </small>
    </span>
  `;

  const sidebarFooter =
    document.querySelector(
      ".sidebar-footer"
    );

  if (sidebarFooter) {
    sidebarFooter.prepend(button);
  } else {
    document.body.appendChild(
      button
    );
  }

  const overlay =
    document.createElement("div");

  overlay.id = "cloudSyncOverlay";
  overlay.className =
    "cloud-sync-overlay hidden";

  overlay.innerHTML = `
    <section
      class="cloud-sync-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cloudSyncTitle"
    >
      <div class="cloud-sync-header">
        <div>
          <p class="eyebrow">
            CLOUD SYNC
          </p>

          <h2 id="cloudSyncTitle">
            クラウド保存
          </h2>

          <p>
            同じアカウントでログインすると、
            パソコンやスマートフォンで
            同じ家計データを利用できます。
          </p>
        </div>

        <button
          type="button"
          class="cloud-sync-close"
          id="cloudSyncCloseButton"
          aria-label="閉じる"
        >
          ×
        </button>
      </div>

      <div
        class="cloud-sync-message hidden"
        id="cloudSyncMessage"
        aria-live="polite"
      ></div>

      <div id="cloudSignedOutPanel">
        <div class="cloud-auth-tabs">
          <button
            type="button"
            class="cloud-auth-tab active"
            id="cloudLoginTab"
          >
            ログイン
          </button>

          <button
            type="button"
            class="cloud-auth-tab"
            id="cloudSignupTab"
          >
            新規登録
          </button>
        </div>

        <form
          class="cloud-auth-form"
          id="cloudAuthForm"
        >
          <label>
            <span>メールアドレス</span>

            <input
              type="email"
              id="cloudEmailInput"
              autocomplete="email"
              required
            >
          </label>

          <label>
            <span>パスワード</span>

            <input
              type="password"
              id="cloudPasswordInput"
              autocomplete="current-password"
              minlength="6"
              required
            >
          </label>

          <button
            type="submit"
            class="primary-button"
            id="cloudAuthSubmitButton"
          >
            ログイン
          </button>
        </form>

        <p class="cloud-auth-note">
          パスワードはSupabaseの認証機能で管理され、
          このアプリの家計データ内には保存されません。
        </p>
      </div>

      <div
        class="hidden"
        id="cloudSignedInPanel"
      >
        <div class="cloud-account-card">
          <span>ログイン中</span>

          <strong id="cloudAccountEmail">
            -
          </strong>

          <small id="cloudLastSyncText">
            まだ同期していません
          </small>
        </div>

        <div class="cloud-sync-actions">
          <button
            type="button"
            class="primary-button"
            id="cloudSaveNowButton"
          >
            この端末のデータを保存
          </button>

          <button
            type="button"
            class="secondary-button"
            id="cloudLoadNowButton"
          >
            クラウドから読み込む
          </button>

          <button
            type="button"
            class="danger-outline-button"
            id="cloudLogoutButton"
          >
            ログアウト
          </button>
        </div>

        <div class="cloud-sync-help">
          <strong>
            通常は自動保存されます
          </strong>

          <p>
            Monthly、Timeline、住宅プラン、Settingsなどを
            保存すると、少し後にクラウドへ同期します。
          </p>
        </div>
      </div>
    </section>
  `;

  document.body.appendChild(
    overlay
  );
}

function registerCloudSyncListeners() {
  getCloudElement(
    "cloudSyncButton"
  ).addEventListener(
    "click",
    openCloudSyncDialog
  );

  getCloudElement(
    "cloudSyncCloseButton"
  ).addEventListener(
    "click",
    closeCloudSyncDialog
  );

  getCloudElement(
    "cloudSyncOverlay"
  ).addEventListener(
    "click",
    event => {
      if (
        event.target.id ===
        "cloudSyncOverlay"
      ) {
        closeCloudSyncDialog();
      }
    }
  );

  getCloudElement(
    "cloudLoginTab"
  ).addEventListener(
    "click",
    () =>
      setCloudAuthMode(
        "login"
      )
  );

  getCloudElement(
    "cloudSignupTab"
  ).addEventListener(
    "click",
    () =>
      setCloudAuthMode(
        "signup"
      )
  );

  getCloudElement(
    "cloudAuthForm"
  ).addEventListener(
    "submit",
    submitCloudAuthentication
  );

  getCloudElement(
    "cloudSaveNowButton"
  ).addEventListener(
    "click",
    () =>
      saveDataToCloud({
        force: true,
        showSuccess: true
      })
  );

  getCloudElement(
    "cloudLoadNowButton"
  ).addEventListener(
    "click",
    confirmAndLoadCloudData
  );

  getCloudElement(
    "cloudLogoutButton"
  ).addEventListener(
    "click",
    logoutFromCloud
  );
}

function getCloudElement(id) {
  const element =
    document.getElementById(id);

  if (!element) {
    throw new Error(
      `Cloud element not found: ${id}`
    );
  }

  return element;
}

function openCloudSyncDialog() {
  getCloudElement(
    "cloudSyncOverlay"
  ).classList.remove(
    "hidden"
  );

  document.body.classList.add(
    "cloud-dialog-open"
  );
}

function closeCloudSyncDialog() {
  getCloudElement(
    "cloudSyncOverlay"
  ).classList.add(
    "hidden"
  );

  document.body.classList.remove(
    "cloud-dialog-open"
  );
}

function setCloudAuthMode(mode) {
  const isLogin =
    mode === "login";

  getCloudElement(
    "cloudLoginTab"
  ).classList.toggle(
    "active",
    isLogin
  );

  getCloudElement(
    "cloudSignupTab"
  ).classList.toggle(
    "active",
    !isLogin
  );

  getCloudElement(
    "cloudAuthSubmitButton"
  ).textContent =
    isLogin
      ? "ログイン"
      : "アカウントを作成";

  getCloudElement(
    "cloudPasswordInput"
  ).autocomplete =
    isLogin
      ? "current-password"
      : "new-password";

  getCloudElement(
    "cloudAuthForm"
  ).dataset.mode =
    mode;

  clearCloudMessage();
}

/* ------------------------------
   Authentication
------------------------------ */

async function submitCloudAuthentication(
  event
) {
  event.preventDefault();

  if (!mwsSupabaseClient) {
    setCloudMessage(
      "クラウド接続の準備ができていません。",
      "error"
    );

    return;
  }

  const email =
    getCloudElement(
      "cloudEmailInput"
    ).value.trim();

  const password =
    getCloudElement(
      "cloudPasswordInput"
    ).value;

  const mode =
    getCloudElement(
      "cloudAuthForm"
    ).dataset.mode ||
    "login";

  setCloudAuthBusy(true);
  clearCloudMessage();

  try {
    if (mode === "signup") {
      const {
        data,
        error
      } =
        await mwsSupabaseClient
          .auth
          .signUp({
            email,
            password
          });

      if (error) {
        throw error;
      }

      if (!data.session) {
        setCloudMessage(
          "確認メールを送信しました。" +
          "メール内のリンクを開いてからログインしてください。",
          "success"
        );

        setCloudAuthMode(
          "login"
        );

        return;
      }

      setCloudMessage(
        "アカウントを作成しました。",
        "success"
      );

    } else {
      const {
        error
      } =
        await mwsSupabaseClient
          .auth
          .signInWithPassword({
            email,
            password
          });

      if (error) {
        throw error;
      }

      setCloudMessage(
        "ログインしました。",
        "success"
      );
    }

  } catch (error) {
    console.error(
      "認証に失敗しました。",
      error
    );

    setCloudMessage(
      translateCloudError(error),
      "error"
    );

  } finally {
    setCloudAuthBusy(false);
  }
}

async function logoutFromCloud() {
  if (!mwsSupabaseClient) {
    return;
  }

  const {
    error
  } =
    await mwsSupabaseClient
      .auth
      .signOut();

  if (error) {
    setCloudMessage(
      translateCloudError(error),
      "error"
    );

    return;
  }

  mwsCloudUser = null;
  mwsCloudHasConflict = false;

  localStorage.removeItem(
    MWS_CLOUD_META_KEY
  );

  updateCloudAuthInterface();
  setCloudSyncStatus(
    "signed-out",
    "ログインしていません"
  );

  setCloudMessage(
    "ログアウトしました。" +
    "端末内のデータはそのまま残っています。",
    "success"
  );
}

async function handleCloudSession(
  session,
  {
    autoLoad = false
  } = {}
) {
  mwsCloudUser =
    session?.user || null;

  updateCloudAuthInterface();

  if (!mwsCloudUser) {
    setCloudSyncStatus(
      "signed-out",
      "ログインしていません"
    );

    return;
  }

  setCloudSyncStatus(
    "connecting",
    "クラウドを確認中"
  );

  if (autoLoad) {
    await initializeUserCloudData();
  } else {
    setCloudSyncStatus(
      "synced",
      "ログイン済み"
    );
  }
}

function updateCloudAuthInterface() {
  const signedIn =
    Boolean(mwsCloudUser);

  getCloudElement(
    "cloudSignedOutPanel"
  ).classList.toggle(
    "hidden",
    signedIn
  );

  getCloudElement(
    "cloudSignedInPanel"
  ).classList.toggle(
    "hidden",
    !signedIn
  );

  getCloudElement(
    "cloudAccountEmail"
  ).textContent =
    mwsCloudUser?.email || "-";

  updateCloudLastSyncText();
}

function setCloudAuthBusy(isBusy) {
  const button =
    getCloudElement(
      "cloudAuthSubmitButton"
    );

  button.disabled = isBusy;

  button.textContent =
    isBusy
      ? "処理中..."
      : (
          getCloudElement(
            "cloudAuthForm"
          ).dataset.mode ===
          "signup"
            ? "アカウントを作成"
            : "ログイン"
        );
}

/* ------------------------------
   Cloud data
------------------------------ */

async function initializeUserCloudData() {
  try {
    const cloudRecord =
      await fetchCloudRecord();

    if (!cloudRecord) {
      await saveDataToCloud({
        force: true,
        showSuccess: false
      });

      setCloudMessage(
        "この端末のデータを初回データとして" +
        "クラウドへ保存しました。",
        "success"
      );

      return;
    }

    const localMeta =
      readCloudMeta();

    if (
      localMeta.userId ===
        mwsCloudUser.id &&
      localMeta.updatedAt ===
        cloudRecord.updated_at
    ) {
      setCloudSyncStatus(
        "synced",
        "同期済み"
      );

      updateCloudLastSyncText();

      return;
    }

    await applyCloudData(
      cloudRecord,
      {
        reload: true
      }
    );

  } catch (error) {
    console.error(
      "クラウドデータの初期化に失敗しました。",
      error
    );

    setCloudSyncStatus(
      "error",
      "同期エラー"
    );

    setCloudMessage(
      translateCloudError(error),
      "error"
    );
  }
}

async function fetchCloudRecord() {
  const {
    data,
    error
  } =
    await mwsSupabaseClient
      .from(MWS_CLOUD_TABLE)
      .select(
        "data, data_version, updated_at"
      )
      .eq(
        "user_id",
        mwsCloudUser.id
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

async function saveDataToCloud({
  force = false,
  showSuccess = false
} = {}) {
  if (
    !mwsSupabaseClient ||
    !mwsCloudUser ||
    mwsCloudIsApplyingData
  ) {
    return;
  }

  setCloudSyncStatus(
    "saving",
    "保存中"
  );

  try {
    if (!force) {
      const canSave =
        await verifyCloudVersion();

      if (!canSave) {
        return;
      }
    }

    const {
      data,
      error
    } =
      await mwsSupabaseClient
        .from(MWS_CLOUD_TABLE)
        .upsert(
          {
            user_id:
              mwsCloudUser.id,

            data:
              JSON.parse(
                JSON.stringify(
                  appData
                )
              ),

            data_version:
              Number(
                appData.version || 2
              )
          },
          {
            onConflict:
              "user_id"
          }
        )
        .select(
          "updated_at"
        )
        .single();

    if (error) {
      throw error;
    }

    mwsCloudHasConflict = false;

    writeCloudMeta({
      userId:
        mwsCloudUser.id,

      updatedAt:
        data.updated_at
    });

    setCloudSyncStatus(
      "synced",
      "同期済み"
    );

    updateCloudLastSyncText();

    if (showSuccess) {
      setCloudMessage(
        "現在の端末データをクラウドへ保存しました。",
        "success"
      );
    }

  } catch (error) {
    console.error(
      "クラウド保存に失敗しました。",
      error
    );

    setCloudSyncStatus(
      "error",
      "保存エラー"
    );

    setCloudMessage(
      translateCloudError(error),
      "error"
    );
  }
}

async function verifyCloudVersion() {
  const cloudRecord =
    await fetchCloudRecord();

  if (!cloudRecord) {
    return true;
  }

  const localMeta =
    readCloudMeta();

  const sameUser =
    localMeta.userId ===
    mwsCloudUser.id;

  const cloudChanged =
    !sameUser ||
    (
      localMeta.updatedAt &&
      localMeta.updatedAt !==
        cloudRecord.updated_at
    );

  if (!cloudChanged) {
    return true;
  }

  mwsCloudHasConflict = true;

  setCloudSyncStatus(
    "conflict",
    "別端末で更新あり"
  );

  setCloudMessage(
    "別の端末でデータが更新されています。" +
    "自動保存を停止しました。" +
    "「クラウドから読み込む」で最新データを確認してください。",
    "warning"
  );

  return false;
}

async function confirmAndLoadCloudData() {
  if (
    !mwsSupabaseClient ||
    !mwsCloudUser
  ) {
    return;
  }

  const cloudRecord =
    await fetchCloudRecord();

  if (!cloudRecord) {
    setCloudMessage(
      "クラウドに保存済みデータがありません。",
      "warning"
    );

    return;
  }

  const confirmed =
    window.confirm(
      "クラウドのデータを読み込みます。\n\n" +
      "この端末でまだクラウドへ保存していない変更は" +
      "上書きされます。続けますか？"
    );

  if (!confirmed) {
    return;
  }

  await applyCloudData(
    cloudRecord,
    {
      reload: true
    }
  );
}

async function applyCloudData(
  cloudRecord,
  {
    reload = false
  } = {}
) {
  if (
    !cloudRecord ||
    !cloudRecord.data
  ) {
    throw new Error(
      "クラウドデータの形式が正しくありません。"
    );
  }

  mwsCloudIsApplyingData = true;

  try {
    const normalized =
      typeof normalizeData ===
        "function"
        ? normalizeData(
            cloudRecord.data
          )
        : cloudRecord.data;

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        normalized
      )
    );

    writeCloudMeta({
      userId:
        mwsCloudUser.id,

      updatedAt:
        cloudRecord.updated_at
    });

    mwsCloudHasConflict = false;

    setCloudSyncStatus(
      "synced",
      "最新データを取得"
    );

    if (reload) {
      window.location.reload();
      return;
    }

    appData = normalized;

  } finally {
    mwsCloudIsApplyingData = false;
  }
}

/* ------------------------------
   Local save integration
------------------------------ */

function wrapLocalSaveFunction() {
  if (
    mwsOriginalSaveData ||
    typeof saveData !==
      "function"
  ) {
    return;
  }

  mwsOriginalSaveData =
    saveData;

  saveData =
    function cloudAwareSaveData() {
      mwsOriginalSaveData();

      scheduleCloudSave();
    };
}

function scheduleCloudSave() {
  if (
    !mwsCloudUser ||
    mwsCloudIsApplyingData ||
    mwsCloudHasConflict
  ) {
    return;
  }

  window.clearTimeout(
    mwsCloudSaveTimer
  );

  setCloudSyncStatus(
    "pending",
    "同期待ち"
  );

  mwsCloudSaveTimer =
    window.setTimeout(
      () => {
        saveDataToCloud({
          force: false,
          showSuccess: false
        });
      },
      1200
    );
}

/* ------------------------------
   Status and metadata
------------------------------ */

function setCloudSyncStatus(
  status,
  text
) {
  const button =
    document.getElementById(
      "cloudSyncButton"
    );

  const dot =
    document.getElementById(
      "cloudSyncDot"
    );

  const statusText =
    document.getElementById(
      "cloudSyncStatusText"
    );

  if (
    !button ||
    !dot ||
    !statusText
  ) {
    return;
  }

  button.dataset.status =
    status;

  dot.className =
    `cloud-sync-dot status-${status}`;

  statusText.textContent =
    text;
}

function setCloudMessage(
  message,
  type = "info"
) {
  const element =
    getCloudElement(
      "cloudSyncMessage"
    );

  element.textContent =
    message;

  element.className =
    `cloud-sync-message ` +
    `message-${type}`;
}

function clearCloudMessage() {
  const element =
    getCloudElement(
      "cloudSyncMessage"
    );

  element.textContent = "";

  element.className =
    "cloud-sync-message hidden";
}

function readCloudMeta() {
  try {
    return JSON.parse(
      localStorage.getItem(
        MWS_CLOUD_META_KEY
      ) || "{}"
    );
  } catch {
    return {};
  }
}

function writeCloudMeta(meta) {
  localStorage.setItem(
    MWS_CLOUD_META_KEY,
    JSON.stringify(meta)
  );
}

function updateCloudLastSyncText() {
  const element =
    document.getElementById(
      "cloudLastSyncText"
    );

  if (!element) {
    return;
  }

  const meta =
    readCloudMeta();

  if (!meta.updatedAt) {
    element.textContent =
      "まだ同期していません";

    return;
  }

  const date =
    new Date(meta.updatedAt);

  element.textContent =
    `最終同期：${date.toLocaleString(
      "ja-JP"
    )}`;
}

function translateCloudError(error) {
  const message =
    String(
      error?.message || error || ""
    );

  if (
    message.includes(
      "Invalid login credentials"
    )
  ) {
    return (
      "メールアドレスまたはパスワードが正しくありません。"
    );
  }

  if (
    message.includes(
      "Email not confirmed"
    )
  ) {
    return (
      "メール確認が完了していません。" +
      "受信した確認メールを開いてください。"
    );
  }

  if (
    message.includes(
      "User already registered"
    )
  ) {
    return (
      "このメールアドレスはすでに登録されています。"
    );
  }

  if (
    message.includes(
      "Password should be"
    )
  ) {
    return (
      "パスワードは6文字以上で設定してください。"
    );
  }

  if (
    message.includes(
      "Failed to fetch"
    )
  ) {
    return (
      "Supabaseへ接続できませんでした。" +
      "インターネット接続を確認してください。"
    );
  }

  if (
    message.includes(
      "wealth_data"
    )
  ) {
    return (
      "保存テーブルへアクセスできません。" +
      "wealth_dataとRLS設定を確認してください。"
    );
  }

  return (
    message ||
    "クラウド処理中にエラーが発生しました。"
  );
}
