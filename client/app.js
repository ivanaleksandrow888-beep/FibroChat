"use strict";

const CLIENT_VERSION = "0.7.0-alpha7.6";
const CLIENT_PROTOCOL = "1.2";

const state = {
  mode: "register",
  token: localStorage.getItem("fibrochat_token") || "",
  refreshToken: localStorage.getItem("fibrochat_refresh_token") || "",
  user: null,
  identity: null,
  contacts: [],
  activeContact: null,
  groups: [],
  activeGroup: null,
  groupDirectory: [],
  pollingTimer: null,
  eventController: null,
  realtimeReconnectTimer: null,
  realtimeConnected: false,
  supportTickets: [],
  devices: [],
  currentDevice: null,
  bootstrapRequired: false,
  pinUnlocked: false,
  pendingRestoreUser: null,
  identityBundle: null,
  profileData: null,
  pendingAvatarDataUrl: undefined,
  pendingAttachment: null,
  pendingAttachments: [],
  pendingReply: null,
  editingMessage: null,
  messageCache: [],
  messageSearch: "",
  pendingVoice: null,
  mediaRecorder: null,
  recordingStartedAt: 0,
  recordingTimer: null,
  call: null,
  pendingIncomingCall: null,
  messageRenderLimit: 150,
  typingTimer: null,
  typingRemoteTimer: null,
  attachmentPreviewUrls: new Set()
};
const $ = (selector) => document.querySelector(selector);
const el = {
  authView: $("#auth-view"), appView: $("#app-view"), registerTab: $("#register-tab"), loginTab: $("#login-tab"),
  inviteField: $("#invite-field"), invite: $("#invite"), nickname: $("#nickname"), password: $("#password"), passwordConfirmField: $("#password-confirm-field"), passwordConfirm: $("#password-confirm"), deviceName: $("#device-name"),
  authForm: $("#auth-form"), submit: $("#submit-button"), authMessage: $("#auth-message"), nodeDot: $("#node-dot"), nodeText: $("#node-text"),
  profileNickname: $("#profile-nickname"), profileFibroId: $("#profile-fibro-id"), copyFibroId: $("#copy-fibro-id"), profileStatus: $("#profile-status"), profileSubscription: $("#profile-subscription"), currentRole: $("#current-role"),
  logout: $("#logout-button"), contactsList: $("#contacts-list"), refreshContacts: $("#refresh-contacts"), contactFibroId: $("#contact-fibro-id"), addContact: $("#add-contact"), contactAddMessage: $("#contact-add-message"), groupsList: $("#groups-list"), createGroupButton: $("#create-group-button"), groupModal: $("#group-modal"), groupModalClose: $("#group-modal-close"), groupForm: $("#group-form"), groupName: $("#group-name"), groupDescription: $("#group-description"), groupMemberPicker: $("#group-member-picker"), groupFormMessage: $("#group-form-message"), groupSettingsButton: $("#group-settings-button"), groupSettingsModal: $("#group-settings-modal"), groupSettingsClose: $("#group-settings-close"), groupSettingsForm: $("#group-settings-form"), groupSettingsName: $("#group-settings-name"), groupSettingsDescription: $("#group-settings-description"), groupMembersList: $("#group-members-list"), groupAddMember: $("#group-add-member"), groupSettingsMessage: $("#group-settings-message"), groupLeaveButton: $("#group-leave-button"), groupDeleteButton: $("#group-delete-button"),
  emptyChat: $("#empty-chat"), chatView: $("#chat-view"), chatName: $("#chat-name"), chatPresence: $("#chat-presence"),
  messagesList: $("#messages-list"), messageForm: $("#message-form"), messageInput: $("#message-input"), sendButton: $("#send-button"), charCounter: $("#char-counter"), backToContacts: $("#back-to-contacts"), chatError: $("#chat-error"), attachmentInput: $("#attachment-input"), attachmentButton: $("#attachment-button"), attachmentPreview: $("#attachment-preview"), replyPreview: $("#reply-preview"), editPreview: $("#edit-preview"), voicePreview: $("#voice-preview"), voiceButton: $("#voice-button"), chatSearch: $("#chat-search"), chatSearchInput: $("#chat-search-input"), chatSearchCount: $("#chat-search-count"), chatSearchToggle: $("#chat-search-toggle"), chatSearchClose: $("#chat-search-close"), callButton: $("#call-button"), callModal: $("#call-modal"), callAvatar: $("#call-avatar"), callKicker: $("#call-kicker"), callTitle: $("#call-title"), callStatus: $("#call-status"), callMute: $("#call-mute"), callDecline: $("#call-decline"), callAccept: $("#call-accept"), remoteCallAudio: $("#remote-call-audio"), callDuration: $("#call-duration"), callRoute: $("#call-route"), callQuality: $("#call-quality"), attachmentViewer: $("#attachment-viewer"), attachmentViewerBody: $("#attachment-viewer-body"), attachmentViewerTitle: $("#attachment-viewer-title"), attachmentViewerClose: $("#attachment-viewer-close"),
  adminPanel: $("#admin-panel"), createInvite: $("#create-invite"), inviteOutput: $("#invite-output"), usersList: $("#users-list"), dashboardSummary: $("#dashboard-summary"), networkStatus: $("#network-status"), auditList: $("#audit-list"), securityActivityList: $("#security-activity-list"), invitesList: $("#invites-list"), inviteRequestsList: $("#invite-requests-list"), inviteRole: $("#invite-role"), inviteDays: $("#invite-days"), adminUserSearch: $("#admin-user-search"), adminUserStatus: $("#admin-user-status"), adminUserRole: $("#admin-user-role"), adminUserRefresh: $("#admin-user-refresh"),
  subscriptionMeterBar: $("#subscription-meter-bar"), notificationCount: $("#notification-count"), notificationsList: $("#notifications-list"), refreshNotifications: $("#refresh-notifications"),
  supportForm: $("#support-form"), supportSubject: $("#support-subject"), supportText: $("#support-text"), supportMessage: $("#support-message"), supportList: $("#support-list"),
  deviceSummary: $("#device-summary"), devicesList: $("#devices-list"), refreshDevices: $("#refresh-devices"),
  vaultPassword: $("#vault-password"), exportVault: $("#export-vault"), vaultMessage: $("#vault-message"), vaultImportFile: $("#vault-import-file"), vaultImportMessage: $("#vault-import-message"), logoutAll: $("#logout-all-button"),
  currentPassword: $("#current-password"), newPassword: $("#new-password"), newPasswordConfirm: $("#new-password-confirm"), changePassword: $("#change-password"), passwordMessage: $("#password-message"),
  profileAvatarPreview: $("#profile-avatar-preview"), profileAvatarFile: $("#profile-avatar-file"), profileAvatarRemove: $("#profile-avatar-remove"), profileEditorName: $("#profile-editor-name"), profileCreatedAt: $("#profile-created-at"), profileDisplayName: $("#profile-display-name"), profileBio: $("#profile-bio"), profilePageFibroId: $("#profile-page-fibro-id"), profilePageCopyId: $("#profile-page-copy-id"), profileQr: $("#profile-qr"), profileShareLink: $("#profile-share-link"), privacyProfile: $("#privacy-profile"), privacyFirstMessage: $("#privacy-first-message"), privacyDiscovery: $("#privacy-discovery"), privacyInvites: $("#privacy-invites"), saveProfile: $("#save-profile"), profileMessage: $("#profile-message"), blockedList: $("#blocked-list"),
  networkProfileFile: $("#network-profile-file"), networkProfileResult: $("#network-profile-result"), profileNetworkName: $("#profile-network-name"), profileNetworkId: $("#profile-network-id"), openProfileNetwork: $("#open-profile-network"), networkProfileMessage: $("#network-profile-message"),
  networkNameInput: $("#network-name-input"), networkUrlInput: $("#network-url-input"), saveNetworkSettings: $("#save-network-settings"), downloadNetworkProfile: $("#download-network-profile"), networkSettingsMessage: $("#network-settings-message"), networkBackupPassword: $("#network-backup-password"), downloadNetworkBackup: $("#download-network-backup"), networkBackupMessage: $("#network-backup-message")
};
const encoder = new TextEncoder();
const decoder = new TextDecoder();


const PIN_VAULT_PREFIX = "fibrochat_pin_vault_";
const SESSION_IDENTITY_PREFIX = "fibrochat_session_identity_";
const PIN_PBKDF2_ITERATIONS = 310000;

function pinVaultKey(userId){return `${PIN_VAULT_PREFIX}${userId}`;}
function sessionIdentityKey(userId){return `${SESSION_IDENTITY_PREFIX}${userId}`;}
function saveSessionIdentity(userId,bundle){
  if(!userId||!bundle)return;
  sessionStorage.setItem(sessionIdentityKey(userId),JSON.stringify(bundle));
}
function loadSessionIdentity(userId){
  if(!userId)return null;
  try{return JSON.parse(sessionStorage.getItem(sessionIdentityKey(userId))||"null");}catch{return null;}
}
function clearSessionIdentity(userId){
  if(userId)sessionStorage.removeItem(sessionIdentityKey(userId));
}
function validPin(pin){return /^\d{6}$/.test(String(pin||""));}
function hasPinVault(userId){return Boolean(userId&&localStorage.getItem(pinVaultKey(userId)));}

async function derivePinKey(pin,salt){
  const material=await crypto.subtle.importKey("raw",encoder.encode(pin),"PBKDF2",false,["deriveKey"]);
  return crypto.subtle.deriveKey({name:"PBKDF2",hash:"SHA-256",salt,iterations:PIN_PBKDF2_ITERATIONS},material,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
}
async function savePinVault(userId,pin,bundle){
  if(!validPin(pin))throw new Error("PIN должен состоять ровно из 6 цифр");
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await derivePinKey(pin,salt);
  const ciphertext=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,encoder.encode(JSON.stringify(bundle)));
  localStorage.setItem(pinVaultKey(userId),JSON.stringify({version:1,salt:bytesToBase64(salt),iv:bytesToBase64(iv),ciphertext:bytesToBase64(ciphertext),createdAt:new Date().toISOString()}));
}
async function loadPinVault(userId,pin){
  if(!validPin(pin))throw new Error("Введите 6 цифр");
  const raw=localStorage.getItem(pinVaultKey(userId));
  if(!raw)throw new Error("PIN на этом устройстве не настроен");
  try{
    const stored=JSON.parse(raw);
    const key=await derivePinKey(pin,base64ToBytes(stored.salt));
    const clear=await crypto.subtle.decrypt({name:"AES-GCM",iv:base64ToBytes(stored.iv)},key,base64ToBytes(stored.ciphertext));
    return JSON.parse(decoder.decode(clear));
  }catch{throw new Error("Неверный PIN");}
}

function ensureLocalSecurityUi(){
  if(document.getElementById("fibro-pin-modal"))return;
  const style=document.createElement("style");
  style.textContent=`
    .fibro-pin-modal{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(3,8,22,.88);backdrop-filter:blur(12px);padding:20px}
    .fibro-pin-modal.hidden{display:none}.fibro-pin-card{width:min(420px,100%);background:#10182c;border:1px solid #304067;border-radius:24px;padding:24px;box-shadow:0 24px 80px rgba(0,0,0,.45);color:#fff}
    .fibro-pin-card h2{margin:0 0 8px}.fibro-pin-card p{color:#aab5d2;line-height:1.45}.fibro-pin-input{width:100%;box-sizing:border-box;font-size:28px;letter-spacing:12px;text-align:center;padding:14px;border-radius:14px;border:1px solid #40517d;background:#080f21;color:#fff;margin:12px 0}
    .fibro-pin-actions{display:flex;gap:10px;flex-wrap:wrap}.fibro-pin-actions button{flex:1;min-width:120px;padding:12px;border-radius:12px;border:0;font-weight:700;cursor:pointer}.fibro-pin-primary{background:linear-gradient(90deg,#715cff,#26bde8);color:#fff}.fibro-pin-secondary{background:#28385f;color:#fff}.fibro-pin-message{min-height:22px;color:#ffaaaa;margin-top:10px}
    .fibro-security-tools{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.fibro-security-tools button{padding:9px 12px;border-radius:10px;border:1px solid #40517d;background:#202e50;color:#fff;cursor:pointer}
  `;
  document.head.appendChild(style);
  const modal=document.createElement("div");
  modal.id="fibro-pin-modal";modal.className="fibro-pin-modal hidden";
  modal.innerHTML=`<div class="fibro-pin-card"><h2 id="fibro-pin-title">Код быстрого доступа</h2><p id="fibro-pin-description"></p><input id="fibro-pin-input" class="fibro-pin-input" type="password" inputmode="numeric" maxlength="6" autocomplete="one-time-code" pattern="[0-9]*" placeholder="••••••"><div class="fibro-pin-actions"><button id="fibro-pin-confirm" class="fibro-pin-primary" type="button">Продолжить</button><button id="fibro-pin-cancel" class="fibro-pin-secondary" type="button">Позже</button></div><div id="fibro-pin-message" class="fibro-pin-message"></div></div>`;
  document.body.appendChild(modal);
}
function openPinModal({mode="unlock",canCancel=false,onSuccess}={}){
  ensureLocalSecurityUi();
  const modal=document.getElementById("fibro-pin-modal");
  const title=document.getElementById("fibro-pin-title");
  const description=document.getElementById("fibro-pin-description");
  const input=document.getElementById("fibro-pin-input");
  const confirmButton=document.getElementById("fibro-pin-confirm");
  const cancelButton=document.getElementById("fibro-pin-cancel");
  const message=document.getElementById("fibro-pin-message");
  title.textContent=mode==="setup"?"Установите 6-значный PIN":"Введите PIN";
  description.textContent=mode==="setup"?"Этот код будет разблокировать FibroChat на данном устройстве после обновления страницы. Он не заменяет пароль аккаунта.":"Сессия сохранена. Введите локальный 6-значный код, чтобы открыть ключи и продолжить.";
  confirmButton.textContent=mode==="setup"?"Установить PIN":"Разблокировать";
  cancelButton.textContent=mode==="setup"?"Позже":"Войти паролем";
  cancelButton.classList.toggle("hidden",!canCancel);
  input.value="";message.textContent="";modal.classList.remove("hidden");setTimeout(()=>input.focus(),50);
  const close=()=>{modal.classList.add("hidden");confirmButton.onclick=null;cancelButton.onclick=null;input.onkeydown=null;};
  const submit=async()=>{
    try{
      const pin=input.value.trim();if(!validPin(pin))throw new Error("Введите ровно 6 цифр");
      confirmButton.disabled=true;
      let result;
      if(mode==="setup"){
        if(!state.user||!state.identity)throw new Error("Сначала войдите в аккаунт");
        const bundle=state.identityBundle||loadSessionIdentity(state.user.id);
        if(!bundle)throw new Error("Ключи текущей сессии недоступны. Выйдите и войдите паролем ещё раз, затем установите PIN.");
        await savePinVault(state.user.id,pin,bundle);result=bundle;
      }
      else result=await loadPinVault(state.pendingRestoreUser?.id||state.user?.id,pin);
      close();await onSuccess?.(result);
    }catch(error){message.textContent=error.message;}finally{confirmButton.disabled=false;}
  };
  confirmButton.onclick=submit;input.onkeydown=e=>{if(e.key==="Enter")submit();};cancelButton.onclick=()=>{close();if(mode==="unlock"){state.pendingRestoreUser=null;showAuth(false);setMode("login");setAuthMessage("Сессия сохранена. Введите пароль аккаунта, чтобы открыть ключи.");}};
}

async function requestBrowserNotifications(){
  if(!("Notification" in window))return "unsupported";
  if(Notification.permission==="granted")return "granted";
  if(Notification.permission==="denied")return "denied";
  try{return await Notification.requestPermission();}catch{return "unsupported";}
}
function base64UrlToUint8Array(value){const padding="=".repeat((4-value.length%4)%4);const base64=(value+padding).replace(/-/g,"+").replace(/_/g,"/");const raw=atob(base64);return Uint8Array.from([...raw].map(ch=>ch.charCodeAt(0)));}
async function registerFibroServiceWorker(){if(!("serviceWorker" in navigator))return null;try{return await navigator.serviceWorker.register("/sw.js",{scope:"/"});}catch(error){console.warn("Service worker registration failed",error);return null;}}
async function enableWebPush(){
  if(!window.isSecureContext)throw new Error("Push-уведомления требуют HTTPS");
  if(!("serviceWorker" in navigator)||!("PushManager" in window)||!("Notification" in window))throw new Error("Этот браузер не поддерживает Web Push");
  const permission=await requestBrowserNotifications();
  if(permission!=="granted")throw new Error(permission==="denied"?"Уведомления запрещены в настройках браузера":"Разрешение на уведомления не выдано");
  const registration=await registerFibroServiceWorker();if(!registration)throw new Error("Не удалось запустить Service Worker");
  const keyData=await api("/api/push/public-key",{method:"GET"});if(!keyData.publicKey)throw new Error("Серверный ключ Web Push не настроен");
  let subscription=await registration.pushManager.getSubscription();
  if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:base64UrlToUint8Array(keyData.publicKey)});
  await api("/api/push/subscribe",{method:"POST",body:JSON.stringify({subscription:subscription.toJSON()})});
  return "granted";
}
function isIos(){return /iphone|ipad|ipod/i.test(navigator.userAgent);}
function isStandalonePwa(){return window.matchMedia?.("(display-mode: standalone)").matches||navigator.standalone===true;}
function offerPushSetup(){
  if(!state.user||("Notification" in window&&Notification.permission==="granted")||localStorage.getItem("fibrochat_push_offer_dismissed")==="1")return;
  if(document.getElementById("fibro-push-offer"))return;
  const box=document.createElement("div");box.id="fibro-push-offer";box.style.cssText="position:fixed;left:16px;right:16px;bottom:16px;z-index:99998;max-width:520px;margin:auto;padding:16px;border:1px solid #40517d;border-radius:16px;background:#10182c;color:white;box-shadow:0 20px 60px rgba(0,0,0,.45)";
  const iosNote=isIos()&&!isStandalonePwa()?" На iPhone/iPad сначала добавьте FibroChat на экран Домой, затем откройте его с иконки.":"";
  box.innerHTML=`<strong>Включить уведомления?</strong><p style="color:#aab5d2">FibroChat сможет сообщать о новых сообщениях, даже когда вкладка закрыта.${iosNote}</p><div style="display:flex;gap:8px"><button id="fibro-push-yes" style="flex:1;padding:10px;border:0;border-radius:10px;background:#5267ff;color:#fff;font-weight:700">Включить</button><button id="fibro-push-no" style="padding:10px;border:0;border-radius:10px;background:#28385f;color:#fff">Позже</button></div>`;document.body.appendChild(box);
  box.querySelector("#fibro-push-yes").onclick=async()=>{try{await enableWebPush();box.remove();alert("Push-уведомления включены.");}catch(error){alert(error.message);}};
  box.querySelector("#fibro-push-no").onclick=()=>{localStorage.setItem("fibrochat_push_offer_dismissed","1");box.remove();};
}
function showBrowserNotification(title,options={}){
  if(!("Notification" in window)||Notification.permission!=="granted")return;
  try{const n=new Notification(title,{icon:"/icons/icon-192.png",badge:"/icons/icon-192.png",tag:options.tag||undefined,renotify:Boolean(options.tag),body:options.body||"",silent:false});n.onclick=()=>{window.focus();n.close();};}catch{}
}
function installSecurityControls(){
  ensureLocalSecurityUi();
  if(document.getElementById("fibro-security-tools"))return;
  const host=el.logoutAll?.parentElement||el.currentRole?.parentElement||el.appView;
  if(!host)return;
  const box=document.createElement("div");box.id="fibro-security-tools";box.className="fibro-security-tools";
  box.innerHTML=`<button id="fibro-enable-notifications" type="button">Включить уведомления</button><button id="fibro-set-pin" type="button">Установить/сменить PIN</button><button id="fibro-remove-pin" type="button">Отключить PIN</button><button id="fibro-lock-now" type="button">Заблокировать</button>`;
  host.appendChild(box);
  box.querySelector("#fibro-enable-notifications").onclick=async()=>{try{await enableWebPush();alert("Push-уведомления включены.");}catch(error){alert(error.message);}};
  box.querySelector("#fibro-set-pin").onclick=()=>openPinModal({mode:"setup",canCancel:true,onSuccess:()=>alert("PIN сохранён на этом устройстве.")});
  box.querySelector("#fibro-remove-pin").onclick=()=>{if(!state.user||!hasPinVault(state.user.id)){alert("PIN на этом устройстве не настроен.");return;}if(confirm("Отключить быстрый вход по PIN на этом устройстве?")){localStorage.removeItem(pinVaultKey(state.user.id));alert("PIN отключён. Пароль аккаунта остаётся действующим.");}};
  box.querySelector("#fibro-lock-now").onclick=()=>{state.pendingRestoreUser=state.user;state.identity=null;el.appView.classList.add("hidden");openPinModal({mode:"unlock",canCancel:true,onSuccess:async bundle=>{state.identityBundle=bundle;saveSessionIdentity(state.pendingRestoreUser.id,bundle);state.identity=await importIdentity(bundle);state.pinUnlocked=true;showApp(state.pendingRestoreUser);state.pendingRestoreUser=null;}});};
}

function saveSession(data){state.token=data.token||"";state.refreshToken=data.refreshToken||state.refreshToken||"";if(state.token)localStorage.setItem("fibrochat_token",state.token);else localStorage.removeItem("fibrochat_token");if(state.refreshToken)localStorage.setItem("fibrochat_refresh_token",state.refreshToken);else localStorage.removeItem("fibrochat_refresh_token");}
function clearSession(){state.token="";state.refreshToken="";localStorage.removeItem("fibrochat_token");localStorage.removeItem("fibrochat_refresh_token");}
async function refreshSession(){if(!state.refreshToken)return false;const response=await fetch("/api/session/refresh",{method:"POST",headers:{"Content-Type":"application/json","X-Fibro-Protocol":CLIENT_PROTOCOL,"X-Fibro-Client-Version":CLIENT_VERSION},body:JSON.stringify({refreshToken:state.refreshToken,deviceId:deviceId()}),cache:"no-store"});const data=await response.json().catch(()=>({ok:false}));if(!response.ok){clearSession();return false;}saveSession(data);return true;}
async function api(path, options = {}, allowRefresh = true) {
  const headers = { "Content-Type": "application/json", "X-Fibro-Protocol": CLIENT_PROTOCOL, "X-Fibro-Client-Version": CLIENT_VERSION, ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(path, { ...options, headers, cache: "no-store" });
  if(response.status===401&&allowRefresh&&path!=="/api/session/refresh"&&await refreshSession())return api(path,options,false);
  const data = await response.json().catch(() => ({ ok: false, error: "Некорректный ответ сервера" }));
  if (!response.ok) { const error = new Error(data.error || "Ошибка запроса"); error.code = data.code || ""; throw error; }
  return data;
}


function downloadBlob(blob,fileName){const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=fileName;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function fileNameFromDisposition(value,fallback){const match=String(value||"").match(/filename="?([^";]+)"?/i);return match?.[1]||fallback;}
async function authenticatedDownload(path,options={},fallbackName="download.json"){
  const headers={"Content-Type":"application/json","X-Fibro-Protocol":CLIENT_PROTOCOL,"X-Fibro-Client-Version":CLIENT_VERSION,...(options.headers||{})};if(state.token)headers.Authorization=`Bearer ${state.token}`;
  let response=await fetch(path,{...options,headers,cache:"no-store"});
  if(response.status===401&&await refreshSession()){headers.Authorization=`Bearer ${state.token}`;response=await fetch(path,{...options,headers,cache:"no-store"});}
  if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||"Не удалось скачать файл");}
  downloadBlob(await response.blob(),fileNameFromDisposition(response.headers.get("content-disposition"),fallbackName));
}
function canonicalNetworkProfile(profile){return JSON.stringify({format:profile.format,version:profile.version,network:{networkId:profile.network.networkId,networkName:profile.network.networkName,nodeId:profile.network.nodeId,protocolVersion:profile.network.protocolVersion,baseUrl:profile.network.baseUrl,createdAt:profile.network.createdAt,activatedAt:profile.network.activatedAt,headNickname:profile.network.headNickname,signingPublicKey:profile.network.signingPublicKey}});}
async function importNetworkProfileFile(file){
  el.networkProfileResult.classList.add("hidden");el.networkProfileMessage.textContent="Проверка профиля…";
  try{
    if(!file)throw new Error("Файл не выбран");const profile=JSON.parse(await file.text());
    if(profile.format!=="fibrochat-network-profile"||profile.version!==1||!profile.network?.signingPublicKey||!profile.signature)throw new Error("Это не профиль сети FibroChat");
    const key=await crypto.subtle.importKey("jwk",profile.network.signingPublicKey,{name:"ECDSA",namedCurve:"P-256"},false,["verify"]);
    const valid=await crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},key,base64ToBytes(profile.signature),encoder.encode(canonicalNetworkProfile(profile)));
    if(!valid)throw new Error("Подпись профиля недействительна");
    const target=new URL(profile.network.baseUrl);if(!["http:","https:"].includes(target.protocol))throw new Error("В профиле указан недопустимый адрес");
    el.profileNetworkName.textContent=profile.network.networkName;el.profileNetworkId.textContent=`${profile.network.networkId} · протокол ${profile.network.protocolVersion}`;el.openProfileNetwork.href=target.href;el.networkProfileResult.classList.remove("hidden");el.networkProfileMessage.textContent="Профиль проверен. Адрес подписан головным узлом этой сети.";el.networkProfileMessage.className="message success";
  }catch(error){el.networkProfileMessage.textContent=error.message;el.networkProfileMessage.className="message";}
}

function stopRealtime(){
  if(state.eventController)state.eventController.abort();
  state.eventController=null;
  clearTimeout(state.realtimeReconnectTimer);
  state.realtimeReconnectTimer=null;
  state.realtimeConnected=false;
}
async function handleRealtimeEvent(type,payload){
  if(payload&&payload.protocol&&payload.payload!==undefined){type=payload.type||type;payload=payload.payload;}
  if(type==="connected"){state.realtimeConnected=true;el.nodeText.textContent=`Головной узел онлайн · v${CLIENT_VERSION} · протокол ${CLIENT_PROTOCOL} · связь в реальном времени`;return;}
  if(type==="call:signal"){await handleCallSignal(payload);return;}
  if(type==="chat:activity"){if(payload?.active)showRemoteActivity(payload.kind,payload.fromUserId);else if(state.activeContact?.id===payload?.fromUserId)updateChatHeader();return;}
  if(["message:new","message:status","message:read","message:updated","message:deleted"].includes(type)){
    if(type==="message:new")showBrowserNotification("Новое сообщение в FibroChat",{body:"Получено новое зашифрованное сообщение.",tag:`message-${payload?.messageId||Date.now()}`});
    await loadContacts(false).catch(()=>null);
    if(state.activeContact)await loadMessages(false).catch(()=>null);
    return;
  }
  if(["group:updated","group:removed","group:message"].includes(type)){await loadGroups().catch(()=>null);if(type==="group:message")showBrowserNotification("Новое сообщение в группе",{body:"Получено защищённое групповое сообщение.",tag:`group-${payload?.messageId||Date.now()}`});if(state.activeGroup&&(!payload?.groupId||payload.groupId===state.activeGroup.id))await loadMessages(false).catch(()=>null);return;}
  if(type==="notification"){showBrowserNotification(payload?.title||"FibroChat",{body:payload?.text||"Новое уведомление",tag:`notification-${payload?.id||Date.now()}`});await loadNotifications(false).catch(()=>null);}
  if(type==="support:update")await loadSupport().catch(()=>null);
  if(type==="device:update")await loadDevices().catch(()=>null);
}
async function connectRealtime(){
  stopRealtime();
  if(!state.token||!state.user)return;
  const controller=new AbortController();
  state.eventController=controller;
  try{
    let response=await fetch("/api/events",{headers:{Authorization:`Bearer ${state.token}`,"X-Fibro-Protocol":CLIENT_PROTOCOL,"X-Fibro-Client-Version":CLIENT_VERSION},cache:"no-store",signal:controller.signal});
    if(response.status===401&&await refreshSession())response=await fetch("/api/events",{headers:{Authorization:`Bearer ${state.token}`,"X-Fibro-Protocol":CLIENT_PROTOCOL,"X-Fibro-Client-Version":CLIENT_VERSION},cache:"no-store",signal:controller.signal});
    if(!response.ok||!response.body)throw new Error("REALTIME_UNAVAILABLE");
    const reader=response.body.getReader();
    const textDecoder=new TextDecoder();
    let buffer="";
    while(true){
      const {value,done}=await reader.read();
      if(done)break;
      buffer+=textDecoder.decode(value,{stream:true});
      let split;
      while((split=buffer.indexOf("\n\n"))>=0){
        const block=buffer.slice(0,split);buffer=buffer.slice(split+2);
        if(!block||block.startsWith(":"))continue;
        let type="message",data="{}";
        for(const line of block.split("\n")){if(line.startsWith("event:"))type=line.slice(6).trim();else if(line.startsWith("data:"))data=line.slice(5).trim();}
        let payload={};try{payload=JSON.parse(data);}catch{}
        await handleRealtimeEvent(type,payload);
      }
    }
    throw new Error("REALTIME_CLOSED");
  }catch(error){
    if(controller.signal.aborted)return;
    state.realtimeConnected=false;
    el.nodeText.textContent="Головной узел онлайн · резервное обновление";
    state.realtimeReconnectTimer=setTimeout(()=>connectRealtime(),3000);
  }
}

function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
function roleName(role) { return ({ super_admin: "Супер-администратор", admin: "Администратор", user: "Пользователь" })[role] || role; }
function statusName(status) { return ({ active: "Активен", pending: "Ожидает подтверждения", suspended: "Приостановлен" })[status] || status; }
function subscriptionName(status) { return ({active:"Активна",expiring:"Скоро истекает",expired:"Истекла",pending:"Не активирована",suspended:"Приостановлена"})[status]||status; }
function ticketStatusName(status){return ({open:"Открыто",answered:"Есть ответ",closed:"Закрыто"})[status]||status;}
function dateText(value) { return value ? new Date(value).toLocaleDateString("ru-RU") : "Не активирована"; }
function timeText(value) { return new Date(value).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }); }
function setAuthMessage(text, type = "") { el.authMessage.textContent = text; el.authMessage.className = `message ${type}`; }
function setChatError(text = "") { el.chatError.textContent = text; }
function bytesToBase64(bytes) { let binary = ""; for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte); return btoa(binary); }
function base64ToBytes(value) { const binary = atob(value); const bytes = new Uint8Array(binary.length); for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i); return bytes; }
function canonicalEnvelope(e) { return JSON.stringify({ version:e.version,messageId:e.messageId,senderId:e.senderId,recipientId:e.recipientId,createdAt:e.createdAt,algorithm:e.algorithm,ephemeralPublicKey:e.ephemeralPublicKey,ciphertext:e.ciphertext,contentIv:e.contentIv,keyBoxes:e.keyBoxes }); }
function identityStorageKey(userId) { return `fibrochat_identity_${userId}`; }
function uuidV4(){
  if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID();
  const bytes=new Uint8Array(16);globalThis.crypto.getRandomValues(bytes);bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  const hex=[...bytes].map(x=>x.toString(16).padStart(2,"0"));
  return `${hex.slice(0,4).join("")}-${hex.slice(4,6).join("")}-${hex.slice(6,8).join("")}-${hex.slice(8,10).join("")}-${hex.slice(10).join("")}`;
}
function deviceId(){let id=localStorage.getItem("fibrochat_device_id");if(!id){id=uuidV4();localStorage.setItem("fibrochat_device_id",id);}return id;}
function guessedDeviceName(){const platform=navigator.userAgentData?.platform||navigator.platform||"Устройство";const ua=navigator.userAgent;const browser=ua.includes("Edg/")?"Edge":ua.includes("Chrome/")?"Chrome":ua.includes("Firefox/")?"Firefox":ua.includes("Safari/")?"Safari":"Браузер";return `${platform} · ${browser}`.slice(0,80);}
function deviceStatusName(status){return ({trusted:"Доверенное",pending:"Ожидает подтверждения",revoked:"Доступ отозван"})[status]||status;}

function sameJwk(a, b) {
  if (!a || !b) return false;
  return a.kty === b.kty && a.crv === b.crv && a.x === b.x && a.y === b.y;
}
function validStoredIdentity(stored) {
  return Boolean(stored && stored.version === 1 && typeof stored.salt === "string" && typeof stored.iv === "string" && typeof stored.ciphertext === "string");
}
function downloadJson(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
async function exportKeyVault() {
  el.vaultMessage.textContent = "Проверка пароля…";
  el.vaultMessage.className = "message";
  try {
    const password = el.vaultPassword.value;
    if (!password) throw new Error("Введите пароль аккаунта");
    const raw = localStorage.getItem(identityStorageKey(state.user.id));
    if (!raw) throw new Error("На этом устройстве нет приватных ключей");
    const stored = JSON.parse(raw);
    if (!validStoredIdentity(stored)) throw new Error("Локальное хранилище ключей повреждено");
    const bundle = await loadIdentity(state.user.id, password);
    if (!sameJwk(bundle.encryptionPublicKey, state.user.encryptionPublicKey) || !sameJwk(bundle.signingPublicKey, state.user.signingPublicKey)) {
      throw new Error("Ключи не соответствуют аккаунту");
    }
    const vault = {
      format: "FibroChat-KeyVault",
      version: 1,
      appVersion: "0.1.3",
      userId: state.user.id,
      nickname: state.user.nickname,
      createdAt: new Date().toISOString(),
      sourceDeviceId: deviceId(),
      encryptionPublicKey: state.user.encryptionPublicKey,
      signingPublicKey: state.user.signingPublicKey,
      encryptedIdentity: stored
    };
    const safeName = state.user.nickname.replace(/[^a-zа-я0-9_-]+/gi, "_");
    downloadJson(`FibroChat_KeyVault_${safeName}_${new Date().toISOString().slice(0,10)}.json`, vault);
    el.vaultPassword.value = "";
    el.vaultMessage.textContent = "Key Vault скачан. Сохраните его в безопасном месте.";
    el.vaultMessage.className = "message success";
  } catch (error) {
    el.vaultMessage.textContent = error.message === "The operation failed for an operation-specific reason" ? "Неверный пароль" : error.message;
  }
}
async function importKeyVaultFile(file) {
  el.vaultImportMessage.textContent = "Проверка файла…";
  el.vaultImportMessage.className = "message";
  try {
    if (!file) return;
    if (file.size > 200000) throw new Error("Файл слишком большой для Key Vault");
    const vault = JSON.parse(await file.text());
    if (vault?.format !== "FibroChat-KeyVault" || vault?.version !== 1) throw new Error("Это не файл FibroChat Key Vault");
    if (typeof vault.userId !== "string" || !validStoredIdentity(vault.encryptedIdentity)) throw new Error("Файл Key Vault повреждён");
    if (!vault.encryptionPublicKey || !vault.signingPublicKey) throw new Error("В файле отсутствуют публичные ключи");
    localStorage.setItem(identityStorageKey(vault.userId), JSON.stringify(vault.encryptedIdentity));
    localStorage.setItem("fibrochat_imported_vault_user", vault.userId);
    el.nickname.value = String(vault.nickname || "");
    setMode("login");
    el.vaultImportMessage.textContent = `Key Vault для «${vault.nickname || "аккаунта"}» импортирован. Теперь введите пароль и войдите.`;
    el.vaultImportMessage.className = "message success";
  } catch (error) {
    el.vaultImportMessage.textContent = error.message;
  } finally {
    el.vaultImportFile.value = "";
  }
}

async function derivePasswordKey(password, salt, iterations = 210000) {
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function createIdentityBundle() {
  const encryption = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey", "deriveBits"]);
  const signing = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  return {
    encryptionPublicKey: await crypto.subtle.exportKey("jwk", encryption.publicKey),
    encryptionPrivateKey: await crypto.subtle.exportKey("jwk", encryption.privateKey),
    signingPublicKey: await crypto.subtle.exportKey("jwk", signing.publicKey),
    signingPrivateKey: await crypto.subtle.exportKey("jwk", signing.privateKey)
  };
}
async function saveIdentity(userId, password, bundle) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await derivePasswordKey(password, salt);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(JSON.stringify(bundle)));
  localStorage.setItem(identityStorageKey(userId), JSON.stringify({ version: 1, salt: bytesToBase64(salt), iv: bytesToBase64(iv), ciphertext: bytesToBase64(encrypted) }));
}
async function loadIdentity(userId, password) {
  const raw = localStorage.getItem(identityStorageKey(userId));
  if (!raw) return null;
  const stored = JSON.parse(raw);
  const key = await derivePasswordKey(password, base64ToBytes(stored.salt));
  const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(stored.iv) }, key, base64ToBytes(stored.ciphertext));
  return JSON.parse(decoder.decode(clear));
}
async function importIdentity(bundle) {
  return {
    encryptionPublicKey: bundle.encryptionPublicKey,
    signingPublicKey: bundle.signingPublicKey,
    encryptionPrivate: await crypto.subtle.importKey("jwk", bundle.encryptionPrivateKey, { name: "ECDH", namedCurve: "P-256" }, false, ["deriveKey", "deriveBits"]),
    signingPrivate: await crypto.subtle.importKey("jwk", bundle.signingPrivateKey, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"])
  };
}
async function deriveWrapKey(privateKey, publicJwk, messageId, userId) {
  const publicKey = await crypto.subtle.importKey("jwk", publicJwk, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = await crypto.subtle.deriveBits({ name: "ECDH", public: publicKey }, privateKey, 256);
  const hkdf = await crypto.subtle.importKey("raw", shared, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt: encoder.encode(messageId), info: encoder.encode(`FibroChat-wrap:${userId}`) }, hkdf, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function createEnvelope(text, recipient, options = {}) {
  if (!state.identity) throw new Error("Приватные ключи этого устройства не загружены");
  const messageId = options.messageId || uuidV4();
  const createdAt = options.createdAt || new Date().toISOString();
  const contentKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const rawContentKey = await crypto.subtle.exportKey("raw", contentKey);
  const contentIv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: contentIv }, contentKey, encoder.encode(text));
  const ephemeral = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey", "deriveBits"]);
  const ephemeralPublicKey = await crypto.subtle.exportKey("jwk", ephemeral.publicKey);
  const keyBoxes = {};
  const parties = [
    { id: state.user.id, publicKey: state.identity.encryptionPublicKey },
    { id: recipient.id, publicKey: recipient.encryptionPublicKey }
  ];
  for (const party of parties) {
    const wrapKey = await deriveWrapKey(ephemeral.privateKey, party.publicKey, messageId, party.id);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const wrappedKey = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, wrapKey, rawContentKey);
    keyBoxes[party.id] = { iv: bytesToBase64(iv), wrappedKey: bytesToBase64(wrappedKey) };
  }
  const envelope = { version: 1, messageId, senderId: state.user.id, recipientId: recipient.id, createdAt, algorithm: "ECDH-P256/HKDF-SHA256/AES-256-GCM", ephemeralPublicKey, ciphertext: bytesToBase64(ciphertext), contentIv: bytesToBase64(contentIv), keyBoxes };
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, state.identity.signingPrivate, encoder.encode(canonicalEnvelope(envelope)));
  return { envelope, signature: bytesToBase64(signature) };
}
async function verifyMessage(message) {
  const sender = message.senderId === state.user.id ? state.user : (state.contacts.find((c) => c.id === message.senderId) || state.groupDirectory.find((c) => c.id === message.senderId));
  if (!sender?.signingPublicKey) return false;
  const key = await crypto.subtle.importKey("jwk", sender.signingPublicKey, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  return crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, base64ToBytes(message.signature), encoder.encode(canonicalEnvelope(message.envelope)));
}
async function decryptMessage(message) {
  if (!state.identity) throw new Error("Нет приватного ключа");
  if (!(await verifyMessage(message))) throw new Error("Подпись не подтверждена");
  const box = message.envelope.keyBoxes[state.user.id];
  if (!box) throw new Error("Нет ключа для этого устройства");
  const wrapKey = await deriveWrapKey(state.identity.encryptionPrivate, message.envelope.ephemeralPublicKey, message.id, state.user.id);
  const rawContentKey = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(box.iv) }, wrapKey, base64ToBytes(box.wrappedKey));
  const contentKey = await crypto.subtle.importKey("raw", rawContentKey, { name: "AES-GCM" }, false, ["decrypt"]);
  const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(message.envelope.contentIv) }, contentKey, base64ToBytes(message.envelope.ciphertext));
  return decoder.decode(clear);
}

function setMode(mode) {
  state.mode = state.bootstrapRequired ? "register" : mode;
  const registering = state.mode === "register";
  el.registerTab.classList.toggle("active", registering);
  el.loginTab.classList.toggle("active", !registering);
  el.registerTab.parentElement.classList.toggle("hidden", state.bootstrapRequired);
  el.inviteField.classList.toggle("hidden", !registering || state.bootstrapRequired);
  el.passwordConfirmField.classList.toggle("hidden", !registering);
  el.submit.textContent = state.bootstrapRequired ? "Создать главного администратора" : registering ? "Создать аккаунт и ключи" : "Войти";
  setAuthMessage(state.bootstrapRequired ? "Первый запуск: создайте единственный аккаунт суперадминистратора." : "", state.bootstrapRequired ? "success" : "");
}
async function checkHealth() {
  try {
    const data = await api("/api/health", { method: "GET" });
    state.bootstrapRequired = Boolean(data.bootstrapRequired);
    el.nodeDot.classList.add("online");
    el.nodeText.textContent = state.bootstrapRequired ? `Сеть готова к первичной настройке · v${data.version}` : `${data.networkName} · ${data.networkId || "сеть"} · v${data.version}`;
    setMode(state.bootstrapRequired ? "register" : state.mode);
  } catch {
    el.nodeDot.classList.remove("online"); el.nodeText.textContent = "Головной узел недоступен";
  }
}
function showAuth(clearTokens = true) { clearInterval(state.pollingTimer); stopRealtime(); endCall(false,"Сессия завершена"); const previousUserId=state.user?.id||state.pendingRestoreUser?.id; if(clearTokens){clearSession();clearSessionIdentity(previousUserId);} state.user = null; state.identity = null; state.identityBundle = null; state.activeContact = null; el.appView.classList.add("hidden"); el.authView.classList.remove("hidden"); }
function showApp(user) {
  state.user = user; localStorage.setItem("fibrochat_last_user_id",user.id); el.authView.classList.add("hidden"); el.appView.classList.remove("hidden");
  el.profileNickname.textContent = user.displayName || user.nickname; if(el.profileFibroId)el.profileFibroId.textContent=user.fibroId||"—"; el.profileStatus.textContent = `${statusName(user.status)} · ключи ${user.keysConfigured ? "настроены" : "не настроены"}`;
  const days = Number(user.subscriptionDaysRemaining || 0);
  el.profileSubscription.textContent = user.subscriptionState === "expired" ? "Подписка истекла — чат заблокирован" : `Подписка до ${dateText(user.subscriptionEndsAt)} · осталось ${days} дн.`;
  el.subscriptionMeterBar.style.width = `${Math.max(0, Math.min(100, (days / 30) * 100))}%`;
  el.subscriptionMeterBar.className = user.subscriptionState === "expired" ? "expired" : user.subscriptionState === "expiring" ? "expiring" : "";
  el.currentRole.textContent = roleName(user.role);
  const isAdmin = ["admin", "super_admin"].includes(user.role); el.adminPanel.classList.toggle("hidden", !isAdmin);
  if (user.status === "active" && user.subscriptionState !== "expired") { loadContacts(); loadGroups(); } else el.contactsList.innerHTML = `<p class="muted">${user.subscriptionState === "expired" ? "Подписка истекла. Переписка временно недоступна, но поддержка работает." : "Аккаунт ожидает подтверждения администратора."}</p>`;
  loadNotifications(); loadSupport(); loadDevices(); loadProfile(); loadCallRtcConfig(); installSecurityControls(); setTimeout(offerPushSetup,700); if(("Notification" in window&&Notification.permission==="granted"))enableWebPush().catch(()=>null);
  if (isAdmin) loadAdmin(); clearInterval(state.pollingTimer);
  connectRealtime();
  const sharedFibroId=new URLSearchParams(location.search).get("add");
  if(sharedFibroId&&el.contactFibroId){el.contactFibroId.value=sharedFibroId;window.FibroRouter?.open("chats",{writeHash:false});history.replaceState(null,"",location.pathname+location.hash);}
  else window.FibroRouter?.open(window.FibroRouter.current()||"chats",{writeHash:false});
  state.pollingTimer = setInterval(async () => { try { await api("/api/presence", { method: "POST" }); if (!state.realtimeConnected && state.user?.status === "active" && state.user?.subscriptionState !== "expired") { await loadContacts(false); if (state.activeContact||state.activeGroup) await loadMessages(false); } await loadNotifications(false); } catch {} }, 15000);
}
async function restoreSession() {
  if (!state.token) return;
  try {
    const data = await api("/api/me", { method: "GET" });
    state.pendingRestoreUser=data.user;
    state.currentDevice=data.device||null;
    el.nickname.value=data.user.nickname;
    const sessionBundle=loadSessionIdentity(data.user.id);
    if(sessionBundle&&sameJwk(sessionBundle.encryptionPublicKey,data.user.encryptionPublicKey)&&sameJwk(sessionBundle.signingPublicKey,data.user.signingPublicKey)){
      state.identityBundle=sessionBundle;
      state.identity=await importIdentity(sessionBundle);
      showApp(data.user);
      state.pendingRestoreUser=null;
      return;
    }
    if(hasPinVault(data.user.id)){
      el.authView.classList.add("hidden");
      openPinModal({mode:"unlock",canCancel:true,onSuccess:async bundle=>{if(!sameJwk(bundle.encryptionPublicKey,data.user.encryptionPublicKey)||!sameJwk(bundle.signingPublicKey,data.user.signingPublicKey))throw new Error("PIN-хранилище не соответствует аккаунту");state.identityBundle=bundle;saveSessionIdentity(data.user.id,bundle);state.identity=await importIdentity(bundle);state.pinUnlocked=true;showApp(data.user);state.pendingRestoreUser=null;await requestBrowserNotifications();}});
      return;
    }
    showAuth(false);setMode("login");setAuthMessage("Сессия на сервере сохранена. Введите пароль один раз, чтобы открыть локальные ключи, затем настройте шестизначный PIN.");
  } catch { showAuth(); }
}
async function handleAuth(event) {
  event.preventDefault(); setAuthMessage("Подготовка криптографических ключей…");
  const password = el.password.value;
  if(state.mode === "register" && password !== el.passwordConfirm.value){setAuthMessage("Пароли не совпадают");return;}
  try {
    let generated = null;
    const payload = { nickname: el.nickname.value.trim(), password, deviceId: deviceId(), deviceName: el.deviceName.value.trim() || guessedDeviceName() };
    if (state.mode === "register") {
      generated = await createIdentityBundle();
      payload.invite = state.bootstrapRequired ? "FIBRO-OWNER-2026" : el.invite.value.trim();
      payload.encryptionPublicKey = generated.encryptionPublicKey;
      payload.signingPublicKey = generated.signingPublicKey;
    }
    const data = await api(state.mode === "register" ? "/api/register" : "/api/login", { method: "POST", body: JSON.stringify(payload) });
    saveSession(data);
    let bundle = generated || await loadIdentity(data.user.id, password);
    if (!bundle && !data.user.keysConfigured) {
      bundle = await createIdentityBundle();
      const migrated = await api("/api/keys", { method: "POST", body: JSON.stringify({ encryptionPublicKey: bundle.encryptionPublicKey, signingPublicKey: bundle.signingPublicKey }) });
      data.user = migrated.user;
    } else if (!bundle && data.user.keysConfigured) {
      clearSession();
      throw new Error("На этом устройстве нет приватных ключей аккаунта. Старые сообщения расшифровать невозможно. Импортируйте Key Vault этого аккаунта и повторите вход.");
    }
    if (data.user.keysConfigured && (!sameJwk(bundle.encryptionPublicKey, data.user.encryptionPublicKey) || !sameJwk(bundle.signingPublicKey, data.user.signingPublicKey))) {
      clearSession();
      throw new Error("Импортированные ключи принадлежат другому аккаунту");
    }
    if (generated || !localStorage.getItem(identityStorageKey(data.user.id))) await saveIdentity(data.user.id, password, bundle);
    localStorage.removeItem("fibrochat_imported_vault_user");
    state.identityBundle = bundle;
    saveSessionIdentity(data.user.id,bundle);
    state.identity = await importIdentity(bundle);
    state.currentDevice = data.device || null; state.bootstrapRequired=false; setAuthMessage("Ключи загружены. Готово.", "success"); showApp(data.user);
    await requestBrowserNotifications();
    if(!hasPinVault(data.user.id))setTimeout(()=>openPinModal({mode:"setup",canCancel:true,onSuccess:()=>{}}),350);
  } catch (error) { setAuthMessage(error.message); }
}
function avatarMarkup(user,size="") { const name=escapeHtml((user.displayName||user.nickname||"?").slice(0,1).toUpperCase()); return user.avatarDataUrl?`<img class="avatar-image ${size}" src="${user.avatarDataUrl}" alt="">`:`<span class="avatar ${size}">${name}</span>`; }
async function loadProfile(){
  if(!state.user)return;
  try{const data=await api("/api/profile",{method:"GET"});state.profileData=data;const p=data.profile;state.user={...state.user,...p};el.profileDisplayName.value=p.displayName||p.nickname;el.profileBio.value=p.bio||"";el.profileEditorName.textContent=p.displayName||p.nickname;el.profileCreatedAt.textContent=`Зарегистрирован: ${dateText(p.createdAt)} · ${roleName(p.role)}`;el.profilePageFibroId.textContent=p.fibroId;el.profileQr.src=data.qrDataUrl;el.profileAvatarPreview.src=p.avatarDataUrl||"data:image/svg+xml;charset=utf-8,"+encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><rect width='100%' height='100%' fill='%232c3344'/><text x='50%' y='55%' text-anchor='middle' font-size='72' fill='white'>${(p.displayName||p.nickname||'?').slice(0,1).toUpperCase()}</text></svg>`);el.privacyProfile.value=p.privacy.profileVisibility;el.privacyFirstMessage.value=p.privacy.firstMessage;el.privacyDiscovery.value=p.privacy.fibroIdDiscovery;el.privacyInvites.value=p.privacy.contactInvites;renderBlocked();}catch(error){if(el.profileMessage)el.profileMessage.textContent=error.message;}
}
async function renderBlocked(){if(!el.blockedList)return;try{const data=await api("/api/blocked",{method:"GET"});el.blockedList.innerHTML=data.blocked.map(user=>`<div class="blocked-row"><span>${avatarMarkup(user,"small")}<strong>${escapeHtml(user.displayName||user.nickname||"Пользователь")}</strong></span><button class="mini-button" data-unblock-id="${user.id}" type="button">Разблокировать</button></div>`).join("")||'<p class="muted">Список пуст.</p>';}catch(error){el.blockedList.innerHTML=`<p class="message">${escapeHtml(error.message)}</p>`;}}
async function saveProfile(){el.profileMessage.textContent="Сохранение…";try{const body={displayName:el.profileDisplayName.value,bio:el.profileBio.value,privacy:{profileVisibility:el.privacyProfile.value,firstMessage:el.privacyFirstMessage.value,fibroIdDiscovery:el.privacyDiscovery.value,contactInvites:el.privacyInvites.value}};if(state.pendingAvatarDataUrl!==undefined)body.avatarDataUrl=state.pendingAvatarDataUrl;const data=await api("/api/profile",{method:"PUT",body:JSON.stringify(body)});state.pendingAvatarDataUrl=undefined;state.user={...state.user,...data.user};el.profileNickname.textContent=data.user.displayName||data.user.nickname;el.profileMessage.textContent="Профиль сохранён.";el.profileMessage.className="message success";await loadProfile();await loadContacts();}catch(error){el.profileMessage.textContent=error.message;el.profileMessage.className="message";}}
async function contactAction(id,action){const labels={delete:"Удалить контакт?",block:"Заблокировать пользователя и удалить контакт?"};if(labels[action]&&!confirm(labels[action]))return;await api(`/api/contacts/${id}/${action}`,{method:"POST"});if(state.activeContact?.id===id){state.activeContact=null;el.chatView.classList.add("hidden");el.emptyChat.classList.remove("hidden");}await loadContacts();await renderBlocked();}

async function loadGroups(){
  if(!el.groupsList)return;
  try{const data=await api("/api/groups",{method:"GET"});state.groups=data.groups||[];if(state.activeGroup){state.activeGroup=state.groups.find(g=>g.id===state.activeGroup.id)||null;}renderGroups();}
  catch(error){el.groupsList.innerHTML=`<p class="message">${escapeHtml(error.message)}</p>`;}
}
function renderGroups(){
  if(!el.groupsList)return;
  el.groupsList.innerHTML=state.groups.map(group=>{const active=state.activeGroup?.id===group.id;const initial=escapeHtml((group.name||"Г").slice(0,1).toUpperCase());return `<button class="contact group-contact ${active?"active":""}" data-group-id="${group.id}" type="button"><span class="contact-main"><span class="group-avatar">${initial}</span><span class="contact-copy"><span class="contact-title"><strong>${escapeHtml(group.name)}</strong><time>${group.memberCount}</time></span><small><span>${group.memberCount} участников</span><span class="contact-secure">E2EE fan-out</span></small></span></span><span class="contact-chevron">›</span></button>`;}).join("")||'<div class="conversation-empty"><span>◎</span><strong>Групп пока нет</strong><p>Создайте защищённую группу из своих контактов.</p></div>';
}
function openGroupModal(){
  if(!el.groupModal)return;el.groupFormMessage.textContent="";el.groupName.value="";el.groupDescription.value="";
  el.groupMemberPicker.innerHTML=state.contacts.map(c=>`<label class="group-member-option"><input type="checkbox" value="${c.id}">${avatarMarkup(c,"small")}<span><strong>${escapeHtml(c.displayName||c.nickname)}</strong><small>${escapeHtml(c.fibroId||"")}</small></span></label>`).join("")||'<p class="muted">Сначала добавьте контакты.</p>';
  el.groupModal.classList.remove("hidden");el.groupName.focus();
}
function closeGroupModal(){el.groupModal?.classList.add("hidden");}
async function createGroup(event){
  event.preventDefault();const memberIds=[...el.groupMemberPicker.querySelectorAll('input:checked')].map(x=>x.value);el.groupFormMessage.textContent="Создание…";
  try{const data=await api("/api/groups",{method:"POST",body:JSON.stringify({name:el.groupName.value,description:el.groupDescription.value,memberIds})});closeGroupModal();await loadGroups();await openGroup(data.group.id);}
  catch(error){el.groupFormMessage.textContent=error.message;}
}
async function openGroup(groupId){if(el.callButton)el.callButton.classList.add("hidden");
  state.activeGroup=state.groups.find(g=>g.id===groupId)||null;if(!state.activeGroup)return;state.activeContact=null;state.editingMessage=null;state.pendingReply=null;state.messageSearch="";renderContacts();renderGroups();
  el.chatName.textContent=state.activeGroup.name;el.chatPresence.textContent=`${state.activeGroup.memberCount} участников`;if(el.groupSettingsButton)el.groupSettingsButton.classList.remove("hidden");el.emptyChat.classList.add("hidden");el.chatView.classList.remove("hidden");document.body.classList.add("chat-open");
  if(el.attachmentButton)el.attachmentButton.classList.add("hidden");if(el.voiceButton)el.voiceButton.classList.add("hidden");await loadMessages(true);el.messageInput.focus();
}

async function openGroupSettings(){
  if(!state.activeGroup||!el.groupSettingsModal)return;
  el.groupSettingsMessage.textContent="Загрузка…";el.groupSettingsModal.classList.remove("hidden");
  try{const data=await api(`/api/groups/${state.activeGroup.id}`,{method:"GET"});const group=data.group;state.activeGroup={...state.activeGroup,...group,memberCount:group.members.length};state.groupDirectory=group.members.map(m=>m.user);const me=group.members.find(m=>m.userId===state.user.id);const canEdit=["owner","admin"].includes(me?.role);
    el.groupSettingsName.value=group.name||"";el.groupSettingsDescription.value=group.description||"";el.groupSettingsName.disabled=!canEdit;el.groupSettingsDescription.disabled=!canEdit;
    const memberIds=new Set(group.members.map(m=>m.userId));const candidates=state.contacts.filter(c=>!memberIds.has(c.id));el.groupAddMember.innerHTML=canEdit?`<option value="">Добавить участника…</option>${candidates.map(c=>`<option value="${c.id}">${escapeHtml(c.displayName||c.nickname)}</option>`).join("")}`:'<option value="">Нет прав на добавление</option>';el.groupAddMember.disabled=!canEdit||!candidates.length;
    el.groupMembersList.innerHTML=group.members.map(m=>{const mine=m.userId===state.user.id;const canRole=me?.role==="owner"&&m.role!=="owner";const canRemove=!mine&&["owner","admin"].includes(me?.role)&&m.role!=="owner";return `<div class="group-member-row"><span>${avatarMarkup(m.user,"small")}<span><strong>${escapeHtml(m.user.displayName||m.user.nickname)}</strong><small>${m.role==="owner"?"Владелец":m.role==="admin"?"Администратор":"Участник"}</small></span></span><span class="group-member-actions">${canRole?`<select data-group-role="${m.userId}"><option value="member" ${m.role==="member"?"selected":""}>Участник</option><option value="admin" ${m.role==="admin"?"selected":""}>Администратор</option></select>`:""}${canRemove?`<button type="button" class="danger-button" data-group-remove="${m.userId}">Удалить</button>`:""}</span></div>`}).join("");
    el.groupDeleteButton.classList.toggle("hidden",me?.role!=="owner");el.groupLeaveButton.classList.toggle("hidden",me?.role==="owner");el.groupSettingsMessage.textContent=group.description||"";
  }catch(error){el.groupSettingsMessage.textContent=error.message;}
}
function closeGroupSettings(){el.groupSettingsModal?.classList.add("hidden");}
async function saveGroupSettings(event){event.preventDefault();try{await api(`/api/groups/${state.activeGroup.id}`,{method:"PATCH",body:JSON.stringify({name:el.groupSettingsName.value,description:el.groupSettingsDescription.value})});el.groupSettingsMessage.textContent="Сохранено.";await loadGroups();await openGroup(state.activeGroup.id);}catch(error){el.groupSettingsMessage.textContent=error.message;}}

async function groupMemberDirectory(){const data=await api(`/api/groups/${state.activeGroup.id}`,{method:"GET"});state.groupDirectory=data.group.members.map(m=>m.user);return state.groupDirectory;}
async function loadContacts(render = true) { try { const data = await api("/api/contacts", { method: "GET" }); state.contacts = data.contacts; if (state.activeContact) { state.activeContact = state.contacts.find((c) => c.id === state.activeContact.id) || null; if (state.activeContact) updateChatHeader(); } if (!render) return renderContacts(); renderContacts(); } catch (error) { el.contactsList.innerHTML = `<p class="message">${escapeHtml(error.message)}</p>`; } }
function renderContacts() {
  el.contactsList.innerHTML = state.contacts.map((contact) => {
    const active = state.activeContact?.id === contact.id;
    const name = contact.displayName || contact.nickname;
    const activity = contact.lastMessageAt ? timeText(contact.lastMessageAt) : "Новый диалог";
    return `<div class="contact-wrap"><button class="contact ${active ? "active" : ""}" data-contact-id="${contact.id}" type="button" aria-current="${active ? "page" : "false"}"><span class="contact-main">${avatarMarkup(contact)}<span class="contact-copy"><span class="contact-title"><strong>${escapeHtml(name)}</strong><time>${escapeHtml(activity)}</time></span><small><span class="contact-state ${contact.online ? "online" : ""}">${contact.online ? "В сети" : "Не в сети"}</span><span class="contact-secure" title="Защищённый диалог">Защищено</span></small></span></span><span class="contact-tail">${contact.unreadCount ? `<span class="unread-badge">${contact.unreadCount > 99 ? "99+" : contact.unreadCount}</span>` : ""}<span class="contact-chevron" aria-hidden="true">›</span></span></button><div class="contact-actions"><button type="button" data-contact-action="delete" data-contact-target="${contact.id}">Удалить</button><button type="button" data-contact-action="block" data-contact-target="${contact.id}">Блокировать</button></div></div>`;
  }).join("") || '<div class="conversation-empty"><span>✦</span><strong>Здесь появятся диалоги</strong><p>Добавьте человека по полному Fibro ID, чтобы начать защищённое общение.</p></div>';
}
function updateChatHeader() { if (!state.activeContact) return; el.chatName.textContent = state.activeContact.displayName || state.activeContact.nickname; el.chatPresence.textContent = state.activeContact.online ? "В сети" : "Не в сети"; }
async function openChat(contactId) { state.activeGroup=null;if(el.callButton)el.callButton.classList.remove("hidden");if(el.groupSettingsButton)el.groupSettingsButton.classList.add("hidden");if(el.attachmentButton)el.attachmentButton.classList.remove("hidden");if(el.voiceButton)el.voiceButton.classList.remove("hidden"); state.activeContact = state.contacts.find((contact) => contact.id === contactId) || null; if (!state.activeContact) return; state.editingMessage=null;state.messageSearch="";state.messageRenderLimit=150;if(el.chatSearchInput)el.chatSearchInput.value="";renderEditPreview();renderContacts(); updateChatHeader(); el.emptyChat.classList.add("hidden"); el.chatView.classList.remove("hidden"); document.body.classList.add("chat-open"); await loadMessages(true); await loadContacts(false); el.messageInput.focus(); }
function formatBytes(value){const bytes=Number(value)||0;if(bytes<1024)return `${bytes} Б`;if(bytes<1024*1024)return `${(bytes/1024).toFixed(1)} КБ`;return `${(bytes/1024/1024).toFixed(1)} МБ`;}
function parseMessageContent(text){
  try{const value=JSON.parse(text);if(value&&Number(value.version)>=1&&["attachment","attachments","voice","text"].includes(value.type))return value;}catch{}
  return{version:2,type:"text",text};
}
function messageExcerpt(content){if(content.type==="voice")return "🎙️ Голосовое сообщение";if(content.type==="attachment")return `📎 ${content.attachment?.name||"Файл"}`;if(content.type==="attachments")return `📎 ${content.attachments?.length||0} файлов`;return String(content.text||"").trim().slice(0,100)||"Сообщение";}
function renderEditPreview(){if(!el.editPreview)return;const edit=state.editingMessage;if(!edit){el.editPreview.classList.add("hidden");el.editPreview.innerHTML="";return;}el.editPreview.innerHTML=`<span><strong>Редактирование</strong> · ${escapeHtml(edit.excerpt)}</span><button type="button" data-cancel-edit aria-label="Отменить редактирование">×</button>`;el.editPreview.classList.remove("hidden");}
function renderReplyPreview(){if(!el.replyPreview)return;const reply=state.pendingReply;if(!reply){el.replyPreview.classList.add("hidden");el.replyPreview.innerHTML="";return;}el.replyPreview.innerHTML=`<span><strong>Ответ</strong> · ${escapeHtml(reply.excerpt)}</span><button type="button" data-cancel-reply aria-label="Отменить ответ">×</button>`;el.replyPreview.classList.remove("hidden");}
function renderPendingAttachment(){if(!el.attachmentPreview)return;const files=state.pendingAttachments?.length?state.pendingAttachments:(state.pendingAttachment?[state.pendingAttachment]:[]);if(!files.length){el.attachmentPreview.classList.add("hidden");el.attachmentPreview.innerHTML="";return;}el.attachmentPreview.innerHTML=`<div class="pending-files">${files.map((file,index)=>`<span class="pending-file"><span>📎 ${escapeHtml(file.name)} · ${formatBytes(file.size)}</span><button type="button" data-remove-attachment="${index}" aria-label="Убрать вложение">×</button></span>`).join("")}</div>`;el.attachmentPreview.classList.remove("hidden");}
function formatDuration(seconds){const value=Math.max(0,Math.round(Number(seconds)||0));return `${Math.floor(value/60)}:${String(value%60).padStart(2,"0")}`;}
function renderVoicePreview(){if(!el.voicePreview)return;const voice=state.pendingVoice;if(!voice){el.voicePreview.classList.add("hidden");el.voicePreview.innerHTML="";return;}const url=voice.url||URL.createObjectURL(voice.blob);voice.url=url;el.voicePreview.innerHTML=`<audio controls preload="metadata" src="${url}"></audio><span>🎙️ ${formatDuration(voice.duration)}</span><button type="button" data-remove-voice aria-label="Удалить запись">×</button>`;el.voicePreview.classList.remove("hidden");}
async function encryptAndUploadAttachment(file,recipient){if(!file)throw new Error("Файл не выбран");const maxBytes=10*1024*1024;if(file.size>maxBytes)throw new Error("Максимальный размер вложения — 10 МБ");const key=await crypto.subtle.generateKey({name:"AES-GCM",length:256},true,["encrypt","decrypt"]);const iv=crypto.getRandomValues(new Uint8Array(12));const clear=await file.arrayBuffer();const encrypted=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,clear);const rawKey=await crypto.subtle.exportKey("raw",key);let response=await fetch(`/api/attachments?recipientId=${encodeURIComponent(recipient.id)}`,{method:"POST",headers:{Authorization:`Bearer ${state.token}`,"X-Fibro-Protocol":CLIENT_PROTOCOL,"Content-Type":"application/octet-stream","X-File-Name":encodeURIComponent(file.name),"X-Original-Size":String(file.size)},body:encrypted});if(response.status===401&&await refreshSession())response=await fetch(`/api/attachments?recipientId=${encodeURIComponent(recipient.id)}`,{method:"POST",headers:{Authorization:`Bearer ${state.token}`,"X-Fibro-Protocol":CLIENT_PROTOCOL,"Content-Type":"application/octet-stream","X-File-Name":encodeURIComponent(file.name),"X-Original-Size":String(file.size)},body:encrypted});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"Не удалось загрузить вложение");return{id:data.attachment.id,name:file.name,mimeType:file.type||"application/octet-stream",size:file.size,iv:bytesToBase64(iv),key:bytesToBase64(rawKey),algorithm:"AES-256-GCM"};}
async function fetchDecryptedAttachment(attachment){let response=await fetch(`/api/attachments/${encodeURIComponent(attachment.id)}`,{headers:{Authorization:`Bearer ${state.token}`,"X-Fibro-Protocol":CLIENT_PROTOCOL},cache:"no-store"});if(response.status===401&&await refreshSession())response=await fetch(`/api/attachments/${encodeURIComponent(attachment.id)}`,{headers:{Authorization:`Bearer ${state.token}`,"X-Fibro-Protocol":CLIENT_PROTOCOL},cache:"no-store"});if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||"Не удалось скачать файл");}const encrypted=await response.arrayBuffer();const key=await crypto.subtle.importKey("raw",base64ToBytes(attachment.key),{name:"AES-GCM"},false,["decrypt"]);const clear=await crypto.subtle.decrypt({name:"AES-GCM",iv:base64ToBytes(attachment.iv)},key,encrypted);return new Blob([clear],{type:attachment.mimeType||"application/octet-stream"});}
async function downloadAttachment(button,attachment){button.disabled=true;const original=button.textContent;button.textContent="Загрузка…";try{const blob=await fetchDecryptedAttachment(attachment);const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=attachment.name||"attachment";document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}catch(error){setChatError(error.message);}finally{button.disabled=false;button.textContent=original;}}
async function previewAttachment(button,attachment){button.disabled=true;const original=button.textContent;button.textContent="Открываю…";try{const blob=await fetchDecryptedAttachment(attachment);const url=URL.createObjectURL(blob);state.attachmentPreviewUrls.add(url);const mime=attachment.mimeType||blob.type||"";el.attachmentViewerTitle.textContent=attachment.name||"Вложение";let markup="";if(mime.startsWith("image/"))markup=`<img class="attachment-media" src="${url}" alt="${escapeHtml(attachment.name||"Изображение")}">`;else if(mime.startsWith("video/"))markup=`<video class="attachment-media" src="${url}" controls autoplay playsinline></video>`;else if(mime==="application/pdf")markup=`<iframe class="attachment-pdf" src="${url}" title="${escapeHtml(attachment.name||"PDF")}"></iframe>`;else markup=`<div class="attachment-unsupported"><strong>Предпросмотр недоступен</strong><p>${escapeHtml(attachment.name||"Файл")}</p></div>`;el.attachmentViewerBody.innerHTML=markup;el.attachmentViewer.classList.remove("hidden");}catch(error){setChatError(error.message);}finally{button.disabled=false;button.textContent=original;}}
function closeAttachmentViewer(){el.attachmentViewer?.classList.add("hidden");el.attachmentViewerBody.innerHTML="";for(const url of state.attachmentPreviewUrls)URL.revokeObjectURL(url);state.attachmentPreviewUrls.clear();}
function attachmentCardMarkup(attachment){const data=escapeHtml(JSON.stringify(attachment));const mime=String(attachment.mimeType||"");const previewable=mime.startsWith("image/")||mime.startsWith("video/")||mime==="application/pdf";return `<div class="attachment-card"><span class="attachment-kind">${mime.startsWith("image/")?"Фото":mime.startsWith("video/")?"Видео":mime==="application/pdf"?"PDF":"Файл"}</span><strong>${escapeHtml(attachment.name||"Файл")}</strong><small>${escapeHtml(mime||"application/octet-stream")} · ${formatBytes(attachment.size)}</small><div class="attachment-actions">${previewable?`<button class="attachment-download" type="button" data-preview-attachment='${data}'>Открыть</button>`:""}<button class="attachment-download" type="button" data-attachment='${data}'>Скачать</button></div></div>`;}
async function playVoice(button,attachment){try{let audio=button._fibroAudio;if(!audio){button.disabled=true;button.textContent="…";const blob=await fetchDecryptedAttachment(attachment);const url=URL.createObjectURL(blob);button.dataset.audioUrl=url;audio=new Audio(url);button._fibroAudio=audio;audio.playbackRate=Number(button.closest(".voice-card")?.querySelector("[data-voice-speed]")?.dataset.rate||1);audio.addEventListener("ended",()=>{button.textContent="▶";});audio.addEventListener("pause",()=>{if(!audio.ended)button.textContent="▶";});}if(audio.paused){button.textContent="❚❚";await audio.play();}else{audio.pause();button.textContent="▶";}}catch(error){setChatError(error.message);button.textContent="▶";}finally{button.disabled=false;}}
function voiceWaveformMarkup(duration){const count=28;const seed=Math.max(1,Math.round(Number(duration||1)*17));return `<span class="voice-wave" aria-hidden="true">${Array.from({length:count},(_,i)=>`<i style="--h:${18+((seed*(i+3)*13)%70)}%"></i>`).join("")}</span>`;}
function replyMarkup(reply){if(!reply)return"";return `<button class="reply-quote" type="button" data-scroll-message="${escapeHtml(reply.messageId||"")}"><strong>${escapeHtml(reply.author||"Сообщение")}</strong><small>${escapeHtml(reply.excerpt||"Исходное сообщение")}</small></button>`;}
function contentMarkup(content){const quote=replyMarkup(content.reply);if(content.type==="attachment")return `${quote}${content.text?`<p>${escapeHtml(content.text)}</p>`:""}${attachmentCardMarkup(content.attachment)}`;if(content.type==="attachments")return `${quote}${content.text?`<p>${escapeHtml(content.text)}</p>`:""}<div class="attachment-grid">${(content.attachments||[]).map(attachmentCardMarkup).join("")}</div>`;if(content.type==="voice")return `${quote}${content.text?`<p>${escapeHtml(content.text)}</p>`:""}<div class="voice-card"><button class="voice-play" type="button" data-voice='${escapeHtml(JSON.stringify(content.attachment))}'>▶</button><div class="voice-track"><strong>Голосовое сообщение</strong>${voiceWaveformMarkup(content.duration)}<small>${formatDuration(content.duration)}</small></div><button class="voice-speed" type="button" data-voice-speed data-rate="1">1×</button></div>`;return `${quote}<p>${escapeHtml(content.text||"")}</p>`;}
function dateLabel(iso){const date=new Date(iso);const today=new Date();const yesterday=new Date(Date.now()-86400000);const key=d=>`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;if(key(date)===key(today))return "Сегодня";if(key(date)===key(yesterday))return "Вчера";return date.toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:date.getFullYear()!==today.getFullYear()?"numeric":undefined});}
async function loadMessages(scroll = false) {
  const isGroup=Boolean(state.activeGroup);if(!state.activeContact&&!isGroup)return;setChatError("");
  try{
    const data=await api(isGroup?`/api/groups/${state.activeGroup.id}/messages`:`/api/messages?with=${encodeURIComponent(state.activeContact.id)}`,{method:"GET"});
    let groupUsers=[];if(isGroup)groupUsers=await groupMemberDirectory();
    const decrypted=await Promise.all(data.messages.map(async message=>{
      const mine=message.senderId===state.user.id;if(message.deletedAt)return{message,mine,deleted:true,content:null,excerpt:"Сообщение удалено",searchText:""};
      try{const clear=await decryptMessage(message);const content=parseMessageContent(clear);const sender=isGroup?groupUsers.find(u=>u.id===message.senderId):null;const fileNames=content.type==="attachment"?content.attachment?.name||"":content.type==="attachments"?(content.attachments||[]).map(a=>a.name||"").join(" "):content.type==="voice"?content.attachment?.name||"":"";const dateText=new Date(message.createdAt).toLocaleString("ru-RU");return{message,mine,deleted:false,content,excerpt:messageExcerpt(content),searchText:`${content.text||""} ${fileNames} ${sender?.displayName||sender?.nickname||""} ${dateText}`.toLocaleLowerCase("ru-RU")};}
      catch(error){return{message,mine,error,deleted:false,content:null,excerpt:"Недоступное сообщение",searchText:""};}
    }));
    state.messageCache=decrypted;const query=state.messageSearch.trim().toLocaleLowerCase("ru-RU");let visible=query?decrypted.filter(item=>item.searchText.includes(query)):decrypted;if(!query&&visible.length>state.messageRenderLimit)visible=visible.slice(-state.messageRenderLimit);if(el.chatSearchCount)el.chatSearchCount.textContent=query?String(visible.length):String(decrypted.length);
    let markup="";if(!query&&decrypted.length>visible.length)markup+=`<button class="load-older-messages" type="button" data-load-older>Показать ещё ${Math.min(150,decrypted.length-visible.length)} сообщений</button>`;
    let previousDate="";
    for(const {message,mine,deleted,content,error} of visible){
      const day=dateLabel(message.createdAt);if(day!==previousDate){markup+=`<div class="date-separator"><span>${escapeHtml(day)}</span></div>`;previousDate=day;}
      if(deleted){markup+=`<article class="bubble ${mine?"mine":""} deleted-message"><p>Сообщение удалено</p></article>`;continue;}
      if(error){markup+=`<article class="bubble error"><p>[Не удалось расшифровать сообщение]</p></article>`;continue;}
      const sender=isGroup?groupUsers.find(u=>u.id===message.senderId):null;const author=isGroup&&!mine?`<span class="group-message-author">${escapeHtml(sender?.displayName||sender?.nickname||"Участник")}</span>`:"";
      const actions=!isGroup?`<div class="message-actions"><button class="reply-button" type="button" data-reply-message="${escapeHtml(message.id)}">Ответить</button>${mine&&content.type==="text"?`<button class="reply-button" type="button" data-edit-message="${escapeHtml(message.id)}">Изменить</button>`:""}${mine?`<button class="reply-button danger-text" type="button" data-delete-message="${escapeHtml(message.id)}">Удалить</button>`:""}</div>`:"";
      markup+=`<article class="bubble ${mine?"mine":""}" id="message-${escapeHtml(message.id)}" data-message-id="${escapeHtml(message.id)}" data-message-excerpt="${escapeHtml(messageExcerpt(content))}" data-message-author="${escapeHtml(mine?"Вы":sender?.displayName||sender?.nickname||state.activeContact?.displayName||state.activeContact?.nickname||"Собеседник")}">${author}${contentMarkup(content)}${actions}<div class="meta"><span class="lock-meta" title="Сквозное шифрование"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V8a5 5 0 0 1 10 0v2"/><rect x="5" y="10" width="14" height="10" rx="3"/></svg></span>${message.editedAt?`<span class="edited-meta">изменено</span>`:""}<time>${timeText(message.createdAt)}</time></div></article>`;
    }
    el.messagesList.innerHTML=markup||(query?'<p class="muted">Ничего не найдено.</p>':'<p class="muted">Сообщений пока нет.</p>');
    if(!isGroup){const unreadIncoming=data.messages.filter(message=>message.recipientId===state.user.id&&!message.readAt);await Promise.all(unreadIncoming.map(message=>api(`/api/messages/${message.id}/read`,{method:"POST"}).catch(()=>null)));}
    if(scroll)el.messagesList.scrollTop=el.messagesList.scrollHeight;
  }catch(error){setChatError(error.message);}
}
async function sendMessage(event){
  event.preventDefault();const isGroup=Boolean(state.activeGroup);if(!state.activeContact&&!isGroup)return;const text=el.messageInput.value.trim();const files=state.pendingAttachments?.length?state.pendingAttachments:(state.pendingAttachment?[state.pendingAttachment]:[]);const file=files[0]||null;const voice=state.pendingVoice;if(!text&&!files.length&&!voice)return;
  el.messageInput.disabled=true;el.sendButton.disabled=true;setChatError("");
  try{
    if(isGroup){
      if(files.length||voice)throw new Error("Групповые чаты пока поддерживают текстовые сообщения");
      const members=await groupMemberDirectory();const messageId=uuidV4();const createdAt=new Date().toISOString();const payload=JSON.stringify({version:2,type:"text",text});const deliveries=[];
      for(const member of members){const encrypted=await createEnvelope(payload,member,{messageId,createdAt});deliveries.push({recipientId:member.id,...encrypted});}
      await api(`/api/groups/${state.activeGroup.id}/messages`,{method:"POST",body:JSON.stringify({deliveries})});
    }else if(state.editingMessage){
      if(files.length||voice)throw new Error("При редактировании можно изменить только текст");const payload={version:2,type:"text",text};const encrypted=await createEnvelope(JSON.stringify(payload),state.activeContact,{messageId:state.editingMessage.messageId,createdAt:state.editingMessage.createdAt});await api(`/api/messages/${state.editingMessage.messageId}`,{method:"PUT",body:JSON.stringify(encrypted)});state.editingMessage=null;renderEditPreview();
    }else{
      let payload={version:2,type:"text",text};if(files.length){const attachments=[];for(const selectedFile of files)attachments.push(await encryptAndUploadAttachment(selectedFile,state.activeContact));payload=attachments.length===1?{version:2,type:"attachment",text,attachment:attachments[0]}:{version:2,type:"attachments",text,attachments};}else if(voice){const extension=voice.blob.type.includes("ogg")?"ogg":voice.blob.type.includes("mp4")?"m4a":"webm";const voiceFile=new File([voice.blob],`voice-${Date.now()}.${extension}`,{type:voice.blob.type||"audio/webm"});const attachment=await encryptAndUploadAttachment(voiceFile,state.activeContact);payload={version:2,type:"voice",text,attachment,duration:voice.duration};}if(state.pendingReply)payload.reply=state.pendingReply;const encrypted=await createEnvelope(JSON.stringify(payload),state.activeContact);await api("/api/messages",{method:"POST",body:JSON.stringify({recipientId:state.activeContact.id,...encrypted})});
    }
    el.messageInput.value="";state.pendingAttachment=null;state.pendingAttachments=[];state.pendingReply=null;if(state.pendingVoice?.url)URL.revokeObjectURL(state.pendingVoice.url);state.pendingVoice=null;if(el.attachmentInput)el.attachmentInput.value="";renderPendingAttachment();renderReplyPreview();renderVoicePreview();updateComposer();await loadMessages(true);if(!isGroup)await loadContacts(false);
  }catch(error){setChatError(error.message);}finally{el.messageInput.disabled=false;updateComposer();el.messageInput.focus();}
}
function updateComposer(){const length=el.messageInput.value.length;el.charCounter.textContent=`${length}/4000`;el.sendButton.disabled=el.messageInput.disabled||(!length&&!(state.pendingAttachments?.length||state.pendingAttachment)&&!state.pendingVoice)||(!state.activeContact&&!state.activeGroup);el.messageInput.style.height="auto";el.messageInput.style.height=`${Math.min(el.messageInput.scrollHeight,132)}px`;}
let typingLastSent=0;
async function sendTypingState(kind="typing",active=true){if(!state.activeContact||state.activeGroup)return;const now=Date.now();if(active&&now-typingLastSent<900)return;typingLastSent=now;await api("/api/typing",{method:"POST",body:JSON.stringify({recipientId:state.activeContact.id,kind,active})}).catch(()=>null);}
function showRemoteActivity(kind,fromUserId){if(!state.activeContact||state.activeContact.id!==fromUserId)return;clearTimeout(state.typingRemoteTimer);el.chatPresence.textContent=kind==="recording"?"Записывает голосовое…":"Печатает…";state.typingRemoteTimer=setTimeout(()=>updateChatHeader(),2600);}
function closeMobileChat() { document.body.classList.remove("chat-open"); }
async function toggleVoiceRecording(){
  if(state.mediaRecorder&&state.mediaRecorder.state==="recording"){state.mediaRecorder.stop();return;}
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){setChatError("Запись голоса не поддерживается этим браузером.");return;}
  try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});const chunks=[];const options=MediaRecorder.isTypeSupported("audio/webm;codecs=opus")?{mimeType:"audio/webm;codecs=opus"}:undefined;const recorder=new MediaRecorder(stream,options);state.mediaRecorder=recorder;state.recordingStartedAt=Date.now();void sendTypingState("recording",true);el.voiceButton.classList.add("recording");el.voiceButton.textContent="■";el.voiceButton.setAttribute("aria-label","Остановить запись");state.recordingTimer=setInterval(()=>{el.voiceButton.title=`Запись ${formatDuration((Date.now()-state.recordingStartedAt)/1000)}`;},500);recorder.addEventListener("dataavailable",e=>{if(e.data.size)chunks.push(e.data);});recorder.addEventListener("stop",()=>{clearInterval(state.recordingTimer);stream.getTracks().forEach(track=>track.stop());const duration=(Date.now()-state.recordingStartedAt)/1000;const blob=new Blob(chunks,{type:recorder.mimeType||"audio/webm"});state.mediaRecorder=null;void sendTypingState("recording",false);el.voiceButton.classList.remove("recording");el.voiceButton.textContent="🎙️";el.voiceButton.title="Записать голосовое сообщение";el.voiceButton.setAttribute("aria-label","Записать голосовое сообщение");if(blob.size&&duration>=.4){if(state.pendingVoice?.url)URL.revokeObjectURL(state.pendingVoice.url);state.pendingVoice={blob,duration,url:URL.createObjectURL(blob)};state.pendingAttachment=null;state.pendingAttachments=[];if(el.attachmentInput)el.attachmentInput.value="";renderPendingAttachment();renderVoicePreview();updateComposer();}});recorder.start(250);}catch(error){setChatError(error.name==="NotAllowedError"?"Разрешите доступ к микрофону в настройках браузера.":error.message);}
}

async function loadDevices(){
  try{
    const data=await api("/api/devices",{method:"GET"});state.devices=data.devices;state.currentDevice=state.devices.find(d=>d.current)||state.currentDevice;
    const trusted=state.devices.filter(d=>d.status==="trusted").length;const pending=state.devices.filter(d=>d.status==="pending").length;el.deviceSummary.textContent=`Доверенных: ${trusted}${pending?` · ожидают: ${pending}`:""}`;
    el.devicesList.innerHTML=state.devices.map(device=>{const actions=[];if(device.status==="pending")actions.push(`<button class="approve" data-device-action="approve" data-device-id="${device.id}" type="button">Подтвердить</button>`);if(device.status!=="revoked"&&!device.current)actions.push(`<button class="danger-button" data-device-action="revoke" data-device-id="${device.id}" type="button">Отозвать</button>`);return `<article class="device-row ${device.current?"current":""}"><div><strong>${escapeHtml(device.name)}${device.current?" · Это устройство":""}</strong><small>${escapeHtml(deviceStatusName(device.status))}</small><small>Последняя активность: ${device.lastSeenAt?new Date(device.lastSeenAt).toLocaleString("ru-RU"):"—"}</small></div><div class="user-actions">${actions.join("")}</div></article>`;}).join("")||'<p class="muted">Устройств пока нет.</p>';
  }catch(error){el.devicesList.innerHTML=`<p class="message">${escapeHtml(error.message)}</p>`;}
}

async function loadNotifications(render = true) {
  try {
    const data = await api("/api/notifications", { method: "GET" });
    el.notificationCount.textContent = data.unread ? `${data.unread} новых` : "Нет новых";
    if (!render) return;
    el.notificationsList.innerHTML = data.notifications.slice(0, 8).map((item) => `<button class="notification-item ${item.readAt ? "" : "unread"}" data-notification-id="${item.id}" type="button"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.text)}</span><small>${new Date(item.createdAt).toLocaleString("ru-RU")}</small></button>`).join("") || '<p class="muted">Уведомлений пока нет.</p>';
  } catch (error) { el.notificationsList.innerHTML = `<p class="message">${escapeHtml(error.message)}</p>`; }
}
async function loadSupport() {
  try {
    const data = await api("/api/support", { method: "GET" });
    state.supportTickets = data.tickets;
    const isAdmin = ["admin", "super_admin"].includes(state.user?.role);
    el.supportList.innerHTML = data.tickets.map((ticket) => {
      const messages = ticket.messages.map((m) => `<div class="support-message ${m.authorId === state.user.id ? "mine" : ""}"><p>${escapeHtml(m.text)}</p><small>${new Date(m.createdAt).toLocaleString("ru-RU")}</small></div>`).join("");
      const reply = ticket.status !== "closed" ? `<form class="support-reply" data-ticket-id="${ticket.id}"><input maxlength="4000" placeholder="Ответить…"><button class="mini-button" type="submit">Ответить</button>${isAdmin ? `<button class="danger-button" data-close-ticket="${ticket.id}" type="button">Закрыть</button>` : ""}</form>` : "";
      return `<article class="support-ticket"><header><strong>${escapeHtml(ticket.subject)}</strong><span>${escapeHtml(ticketStatusName(ticket.status))}</span></header>${isAdmin ? `<small>Пользователь: ${escapeHtml(ticket.userNickname)}</small>` : ""}<div class="support-thread">${messages}</div>${reply}</article>`;
    }).join("") || '<p class="muted">Обращений пока нет.</p>';
  } catch (error) { el.supportList.innerHTML = `<p class="message">${escapeHtml(error.message)}</p>`; }
}

async function loadAdmin() { await Promise.all([loadDashboard(), loadUsers(), loadAudit(), loadSecurityActivity(), loadInvites(), loadInviteRequests()]); }
async function loadDashboard() {
  try {
    const data = await api("/api/admin/dashboard", { method: "GET" });
    const s = data.summary;
    el.networkStatus.textContent = `${data.network.networkName || "FibroChat Network"} · ${data.network.networkId || "—"} · узел ${String(data.network.nodeId || "—").slice(0, 8)} · протокол ${data.network.protocolVersion || "1.0"}`;
    if(el.networkNameInput)el.networkNameInput.value=data.network.networkName||"";
    if(el.networkUrlInput)el.networkUrlInput.value=data.network.baseUrl||"";
    const headOnly=data.network.isHead;
    for(const control of [el.networkNameInput,el.networkUrlInput,el.saveNetworkSettings,el.downloadNetworkProfile,el.downloadNetworkBackup,el.networkBackupPassword])if(control)control.disabled=!headOnly;
    el.dashboardSummary.innerHTML = [
      ["Всего", s.totalUsers], ["Активны", s.activeUsers], ["Ожидают", s.pendingUsers],
      ["Истекают", s.expiringUsers], ["Истекли", s.expiredUsers], ["Приостановлены", s.suspendedUsers], ["Сессии", s.activeSessions], ["Ошибки входа 24ч", s.failedLogins24h], ["Инвайты", s.activeInvites]
    ].map(([label,value]) => `<div class="stat-card"><strong>${value}</strong><span>${label}</span></div>`).join("");
  } catch (error) { el.networkStatus.textContent = error.message; }
}
async function loadUsers() {
  try {
    const params=new URLSearchParams();if(el.adminUserSearch?.value.trim())params.set("q",el.adminUserSearch.value.trim());if(el.adminUserStatus?.value)params.set("status",el.adminUserStatus.value);if(el.adminUserRole?.value)params.set("role",el.adminUserRole.value);const data = await api(`/api/admin/users${params.toString()?`?${params}`:""}`, { method: "GET" });
    const isHead = state.user?.role === "super_admin";
    el.usersList.innerHTML = data.users.map((user) => {
      const self = user.id === state.user.id;
      const actions = [];
      if (user.status === "pending" && isHead) actions.push(`<button class="approve" data-action="approve" data-user-id="${user.id}" type="button">Подтвердить 30 дней</button>`);
      if (user.status === "active" && isHead && !self) actions.push(`<button class="mini-button" data-action="extend" data-days="30" data-user-id="${user.id}" type="button">+30</button><button class="mini-button" data-action="extend" data-days="90" data-user-id="${user.id}" type="button">+90</button><button class="mini-button" data-action="extend" data-days="365" data-user-id="${user.id}" type="button">+365</button>`);
      if (user.status === "active" && !self && user.role !== "super_admin") actions.push(`<button class="danger-button" data-action="suspend" data-user-id="${user.id}" type="button">Приостановить</button><button class="mini-button" data-action="temp-suspend" data-user-id="${user.id}" type="button">На время</button>`);
      if (user.status === "suspended" && isHead) actions.push(`<button class="mini-button" data-action="restore" data-user-id="${user.id}" type="button">Восстановить</button>`);
      if (!self && user.role !== "super_admin") actions.push(`<button class="mini-button" data-action="sessions" data-user-id="${user.id}" type="button">Завершить сессии</button>`);
      if (isHead && !self && user.status !== "pending" && user.role !== "super_admin") actions.push(`<button class="mini-button" data-action="role" data-role="${user.role === "admin" ? "user" : "admin"}" data-user-id="${user.id}" type="button">${user.role === "admin" ? "Снять админа" : "Сделать админом"}</button>`);
      return `<div class="user-row user-control"><div><strong>${escapeHtml(user.displayName||user.nickname)}${self ? " · Вы" : ""}</strong><small>@${escapeHtml(user.nickname)} · ${escapeHtml(user.fibroId||"—")}</small><small>${escapeHtml(roleName(user.role))} · ${escapeHtml(statusName(user.status))}${user.suspendedUntil?` до ${dateText(user.suspendedUntil)}`:""}</small><small>Регистрация: ${dateText(user.createdAt)} · Подписка до ${dateText(user.subscriptionEndsAt)}</small></div><div class="user-actions">${actions.join("")}</div></div>`;
    }).join("");
  } catch (error) { el.usersList.textContent = error.message; }
}
async function loadAudit() {
  try {
    const data = await api("/api/admin/audit", { method: "GET" });
    const names = Object.fromEntries((await api("/api/admin/users", { method: "GET" })).users.map(u => [u.id, u.nickname]));
    el.auditList.innerHTML = data.events.map(event => `<div class="audit-row"><strong>${escapeHtml(event.type)}</strong><span>${new Date(event.createdAt).toLocaleString("ru-RU")}</span><small>${escapeHtml(names[event.actorId] || "Система")} → ${escapeHtml(names[event.targetId] || event.targetId || "—")}</small></div>`).join("") || '<p class="muted">Журнал пока пуст.</p>';
  } catch (error) { el.auditList.innerHTML = `<p class="message">${escapeHtml(error.message)}</p>`; }
}

async function loadSecurityActivity(){try{const data=await api("/api/admin/security/activity",{method:"GET"});el.securityActivityList.innerHTML=data.events.map(event=>`<div class="audit-row security-${event.type.includes("FAILED")||event.type.includes("BLOCKED")?"danger":"normal"}"><strong>${escapeHtml(event.type)}</strong><span>${new Date(event.createdAt).toLocaleString("ru-RU")}</span><small>${escapeHtml(JSON.stringify(event.details||{}))}</small></div>`).join("")||'<p class="muted">Событий пока нет.</p>';}catch(error){el.securityActivityList.innerHTML=`<p class="message">${escapeHtml(error.message)}</p>`;}}

async function loadInviteRequests(){if(!el.inviteRequestsList)return;try{const data=await api("/api/admin/invite-requests",{method:"GET"});el.inviteRequestsList.innerHTML=data.requests.map(r=>`<div class="invite-row"><div><strong>${escapeHtml(r.requesterNickname||"Новый участник")}</strong><small>Пригласил: ${escapeHtml(r.requestedByNickname||"пользователь")} · ${r.status==="pending"?"ожидает решения":r.status==="approved"?"одобрен":"отклонён"}</small>${r.inviteCode?`<code>${escapeHtml(r.inviteCode)}</code>`:""}</div>${r.status==="pending"?`<div class="inline-actions"><button class="mini-button" data-request-approve="${r.id}" type="button">Одобрить</button><button class="danger-button" data-request-reject="${r.id}" type="button">Отклонить</button></div>`:""}</div>`).join("")||'<p class="muted">Новых запросов нет.</p>';}catch(error){el.inviteRequestsList.innerHTML=`<p class="message">${escapeHtml(error.message)}</p>`;}}
async function loadInvites(){try{const data=await api("/api/admin/invites",{method:"GET"});el.invitesList.innerHTML=data.invites.map(i=>`<div class="invite-row"><div><code>${escapeHtml(i.code)}</code><small>${escapeHtml(roleName(i.role||"user"))} · до ${dateText(i.expiresAt)} · ${i.usedAt?"использован":i.revokedAt?"отозван":"активен"}</small></div>${!i.usedAt&&!i.revokedAt?`<button class="danger-button" data-invite-revoke="${i.id}" type="button">Отозвать</button>`:""}</div>`).join("")||'<p class="muted">Инвайтов нет.</p>';}catch(error){el.invitesList.innerHTML=`<p class="message">${escapeHtml(error.message)}</p>`;}}


const DEFAULT_CALL_RTC_CONFIG={iceServers:[{urls:["stun:stun.l.google.com:19302","stun:stun1.l.google.com:19302"]}],iceCandidatePoolSize:4};
let callRtcConfig=DEFAULT_CALL_RTC_CONFIG;
let callTurnConfigured=false;
const callAudio={context:null,master:null,timers:[],mode:null};
function callPeerName(user){return user?.displayName||user?.nickname||"Контакт";}
function clearCallTimers(){for(const timer of callAudio.timers)clearTimeout(timer);callAudio.timers=[];}
function stopCallTone(){clearCallTimers();callAudio.mode=null;if(callAudio.master){try{callAudio.master.gain.cancelScheduledValues(0);callAudio.master.gain.setValueAtTime(0,callAudio.context.currentTime);}catch{}}}
async function ensureCallAudio(){const AudioContextClass=window.AudioContext||window.webkitAudioContext;if(!AudioContextClass)return null;if(!callAudio.context){callAudio.context=new AudioContextClass();callAudio.master=callAudio.context.createGain();callAudio.master.gain.value=0;callAudio.master.connect(callAudio.context.destination);}if(callAudio.context.state==="suspended")await callAudio.context.resume().catch(()=>null);return callAudio.context;}
function playToneBurst(frequencies,duration=.35,volume=.055){if(!callAudio.context||!callAudio.master)return;const now=callAudio.context.currentTime;callAudio.master.gain.cancelScheduledValues(now);callAudio.master.gain.setValueAtTime(volume,now);callAudio.master.gain.exponentialRampToValueAtTime(.0001,now+duration);for(const frequency of frequencies){const oscillator=callAudio.context.createOscillator();oscillator.type="sine";oscillator.frequency.value=frequency;oscillator.connect(callAudio.master);oscillator.start(now);oscillator.stop(now+duration+.03);}}
async function startCallTone(mode){stopCallTone();await ensureCallAudio();callAudio.mode=mode;const schedule=()=>{if(callAudio.mode!==mode)return;if(mode==="ringback"){playToneBurst([425],1,.045);callAudio.timers.push(setTimeout(schedule,4000));}else{playToneBurst([440,480],.8,.06);callAudio.timers.push(setTimeout(()=>{if(callAudio.mode===mode)playToneBurst([440,480],.8,.06);},1000));callAudio.timers.push(setTimeout(schedule,5000));}};schedule();}
async function loadCallRtcConfig(){try{const data=await api("/api/calls/config",{method:"GET"});if(Array.isArray(data.iceServers)&&data.iceServers.length)callRtcConfig={iceServers:data.iceServers,iceCandidatePoolSize:8};callTurnConfigured=Boolean(data.turnConfigured);}catch(error){console.warn("Call ICE config fallback",error);}}
function setCallUi({name,status,incoming=false,active=false}={}){
  if(!el.callModal)return;
  el.callTitle.textContent=name||"Аудиозвонок";el.callStatus.textContent=status||"Подготовка…";
  el.callAvatar.textContent=(name||"F").trim().slice(0,1).toUpperCase();
  el.callKicker.textContent=incoming?"Входящий аудиозвонок":"Аудиозвонок";if(el.callRoute&&!active)el.callRoute.textContent=`Маршрут: ${callTurnConfigured?"автовыбор":"STUN"}`;if(el.callQuality&&!active)el.callQuality.textContent="Качество: —";if(el.callDuration&&!active)el.callDuration.textContent="00:00";
  el.callAccept.classList.toggle("hidden",!incoming);el.callMute.classList.toggle("hidden",!active);
  el.callModal.classList.remove("hidden");
}
function stopCallStats(call){clearInterval(call?.durationTimer);clearInterval(call?.statsTimer);clearTimeout(call?.disconnectTimer);}
function formatCallDuration(ms){const total=Math.max(0,Math.floor(ms/1000));return `${String(Math.floor(total/60)).padStart(2,"0")}:${String(total%60).padStart(2,"0")}`;}
function startCallStats(call){stopCallStats(call);if(el.callDuration)el.callDuration.textContent="00:00";call.durationTimer=setInterval(()=>{if(call.connectedAt&&el.callDuration)el.callDuration.textContent=formatCallDuration(Date.now()-call.connectedAt);},1000);call.statsTimer=setInterval(()=>updateCallStats(call).catch(()=>null),3000);}
async function updateCallStats(call){if(!call?.pc||call.pc.connectionState!=="connected")return;const stats=await call.pc.getStats();let pair=null,local=null,remote=null,inbound=null;stats.forEach(r=>{if(r.type==="candidate-pair"&&r.state==="succeeded"&&r.nominated)pair=r;if(r.type==="inbound-rtp"&&r.kind==="audio"&&!r.isRemote)inbound=r;});if(pair){local=stats.get(pair.localCandidateId);remote=stats.get(pair.remoteCandidateId);const relay=local?.candidateType==="relay"||remote?.candidateType==="relay";if(el.callRoute)el.callRoute.textContent=`Маршрут: ${relay?"TURN":"прямой"}`;}if(inbound&&el.callQuality){const lost=Number(inbound.packetsLost||0),received=Number(inbound.packetsReceived||0),ratio=received+lost?lost/(received+lost):0;const jitter=Number(inbound.jitter||0);const quality=ratio>.08||jitter>.08?"плохое":ratio>.03||jitter>.04?"среднее":"хорошее";el.callQuality.textContent=`Качество: ${quality}`;}}
function closeCallUi(){stopCallTone();el.callModal?.classList.add("hidden");el.callAccept?.classList.add("hidden");el.callMute?.classList.add("hidden");el.callMute?.classList.remove("muted");if(el.remoteCallAudio){el.remoteCallAudio.pause?.();el.remoteCallAudio.srcObject=null;}}
async function sendCallSignal(targetUserId,kind,data={}){return api("/api/calls/signal",{method:"POST",body:JSON.stringify({targetUserId,kind,callId:data.callId||state.call?.callId||state.pendingIncomingCall?.callId,description:data.description||null,candidate:data.candidate||null})});}
function armCallTimeout(call,status="Не удалось установить соединение",ms=35000){clearTimeout(call.connectionTimeout);call.connectionTimeout=setTimeout(()=>{if(state.call?.callId===call.callId&&state.call.pc.connectionState!=="connected")endCall(true,status);},ms);}
async function flushQueuedCandidates(call){if(!call?.pc?.remoteDescription)return;const queued=call.queuedCandidates.splice(0);for(const candidate of queued){try{await call.pc.addIceCandidate(candidate);}catch(error){console.warn("ICE candidate rejected",error);}}}
function createPeerConnection(targetUserId,callId){
  const pc=new RTCPeerConnection(callRtcConfig);
  pc.onicecandidate=event=>{if(event.candidate)sendCallSignal(targetUserId,"ice",{callId,candidate:event.candidate.toJSON()}).catch(error=>console.warn("ICE signal failed",error));};
  pc.ontrack=async event=>{if(!el.remoteCallAudio)return;el.remoteCallAudio.srcObject=event.streams[0]||new MediaStream([event.track]);el.remoteCallAudio.muted=false;el.remoteCallAudio.volume=1;await el.remoteCallAudio.play().catch(()=>null);};
  pc.onconnectionstatechange=()=>{const st=pc.connectionState;console.info("FibroCall connection",callId,st);if(st==="connected"){stopCallTone();const current=state.call;if(current){clearTimeout(current.connectionTimeout);clearTimeout(current.disconnectTimer);if(!current.connectedAt){current.connectedAt=Date.now();startCallStats(current);}}setCallUi({name:callPeerName(state.call?.peer),status:"Соединение установлено",active:true});updateCallStats(current).catch(()=>null);}if(st==="disconnected"&&state.call?.callId===callId){el.callStatus.textContent="Связь прервана, восстанавливаем…";const current=state.call;clearTimeout(current.disconnectTimer);current.disconnectTimer=setTimeout(()=>{if(state.call?.callId===callId&&pc.connectionState!=="connected")endCall(false,"Связь потеряна");},10000);}if(st==="failed"&&state.call?.callId===callId)endCall(false,"Не удалось установить соединение");if(st==="closed"&&state.call?.callId===callId)endCall(false,"Звонок завершён");};
  pc.oniceconnectionstatechange=()=>{const st=pc.iceConnectionState;console.info("FibroCall ICE",callId,st);if(st==="checking"&&el.callStatus)el.callStatus.textContent="Проверяем сетевое соединение…";if(st==="failed"&&state.call?.callId===callId)endCall(false,"Сетевое соединение не установлено. Нужен TURN-сервер.");};
  return pc;
}
async function startAudioCall(){
  if(!state.activeContact||state.call||state.pendingIncomingCall)return;
  if(!navigator.mediaDevices?.getUserMedia||!window.RTCPeerConnection){setChatError("Этот браузер не поддерживает аудиозвонки WebRTC.");return;}
  const peer=state.activeContact;const callId=crypto.randomUUID();
  try{
    await ensureCallAudio();setCallUi({name:callPeerName(peer),status:"Доступ к микрофону…"});
    const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});const pc=createPeerConnection(peer.id,callId);stream.getTracks().forEach(track=>pc.addTrack(track,stream));
    state.call={callId,peer,pc,stream,direction:"outgoing",muted:false,queuedCandidates:[],connectionTimeout:null,durationTimer:null,statsTimer:null,disconnectTimer:null,connectedAt:null};
    armCallTimeout(state.call,"Собеседник не ответил или соединение недоступно",45000);
    const offer=await pc.createOffer({offerToReceiveAudio:true});await pc.setLocalDescription(offer);await sendCallSignal(peer.id,"offer",{callId,description:pc.localDescription});
    setCallUi({name:callPeerName(peer),status:"Идёт вызов…",active:true});await startCallTone("ringback");
  }catch(error){await endCall(false,error.name==="NotAllowedError"?"Доступ к микрофону запрещён":error.message);setChatError(error.name==="NotAllowedError"?"Разрешите доступ к микрофону для звонков.":error.message);}
}
async function acceptIncomingCall(){
  const incoming=state.pendingIncomingCall;if(!incoming)return;
  try{
    stopCallTone();await ensureCallAudio();setCallUi({name:callPeerName(incoming.fromUser),status:"Подключение…"});
    const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});const pc=createPeerConnection(incoming.fromUserId,incoming.callId);stream.getTracks().forEach(track=>pc.addTrack(track,stream));
    state.call={callId:incoming.callId,peer:incoming.fromUser,pc,stream,direction:"incoming",muted:false,queuedCandidates:[...(incoming.queuedCandidates||[])],connectionTimeout:null,durationTimer:null,statsTimer:null,disconnectTimer:null,connectedAt:null};state.pendingIncomingCall=null;
    armCallTimeout(state.call);
    await pc.setRemoteDescription(incoming.description);await flushQueuedCandidates(state.call);const answer=await pc.createAnswer();await pc.setLocalDescription(answer);await sendCallSignal(state.call.peer.id,"answer",{callId:state.call.callId,description:pc.localDescription});
    setCallUi({name:callPeerName(state.call.peer),status:"Соединение…",active:true});
  }catch(error){await sendCallSignal(incoming.fromUserId,"reject",{callId:incoming.callId}).catch(()=>null);await endCall(false,error.name==="NotAllowedError"?"Доступ к микрофону запрещён":error.message);}
}
async function endCall(notifyPeer=true,status="Звонок завершён"){
  stopCallTone();const current=state.call;const incoming=state.pendingIncomingCall;
  if(notifyPeer){if(current)await sendCallSignal(current.peer.id,"hangup",{callId:current.callId}).catch(()=>null);else if(incoming)await sendCallSignal(incoming.fromUserId,"reject",{callId:incoming.callId}).catch(()=>null);}
  clearTimeout(current?.connectionTimeout);stopCallStats(current);if(current?.stream)current.stream.getTracks().forEach(track=>track.stop());if(current?.pc&&current.pc.signalingState!=="closed")current.pc.close();state.call=null;state.pendingIncomingCall=null;
  if(el.callStatus&&!el.callModal?.classList.contains("hidden")){el.callStatus.textContent=status;setTimeout(()=>{if(!state.call&&!state.pendingIncomingCall)closeCallUi();},1100);}else closeCallUi();
}
function toggleCallMute(){const current=state.call;if(!current)return;current.muted=!current.muted;current.stream.getAudioTracks().forEach(track=>track.enabled=!current.muted);el.callMute.classList.toggle("muted",current.muted);el.callStatus.textContent=current.muted?"Микрофон выключен":current.pc.connectionState==="connected"?"Соединение установлено":"Соединение…";}
async function handleCallSignal(signal){
  if(!signal?.kind||!signal.callId)return;
  if(signal.kind==="offer"){
    if(state.call||state.pendingIncomingCall){await sendCallSignal(signal.fromUserId,"busy",{callId:signal.callId}).catch(()=>null);return;}
    state.pendingIncomingCall={...signal,queuedCandidates:[]};setCallUi({name:callPeerName(signal.fromUser),status:"Входящий вызов",incoming:true});await startCallTone("incoming");showBrowserNotification("Входящий звонок",{body:`${callPeerName(signal.fromUser)} звонит вам`,tag:`call-${signal.callId}`});return;
  }
  if(signal.kind==="answer"&&state.call?.callId===signal.callId){stopCallTone();await state.call.pc.setRemoteDescription(signal.description);await flushQueuedCandidates(state.call);el.callStatus.textContent="Соединение…";return;}
  if(signal.kind==="ice"&&signal.candidate){
    if(state.call?.callId===signal.callId){if(state.call.pc.remoteDescription)await state.call.pc.addIceCandidate(signal.candidate).catch(error=>console.warn("ICE candidate rejected",error));else state.call.queuedCandidates.push(signal.candidate);}
    else if(state.pendingIncomingCall?.callId===signal.callId)state.pendingIncomingCall.queuedCandidates.push(signal.candidate);return;
  }
  if(["reject","hangup","busy"].includes(signal.kind)&&((state.call?.callId===signal.callId)||(state.pendingIncomingCall?.callId===signal.callId))){const text=signal.kind==="busy"?"Контакт занят":signal.kind==="reject"?"Вызов отклонён":"Собеседник завершил звонок";await endCall(false,text);}
}

el.registerTab.addEventListener("click", () => setMode("register"));
el.loginTab.addEventListener("click", () => setMode("login"));
el.authForm.addEventListener("submit", handleAuth);
el.callButton?.addEventListener("click",startAudioCall);
el.callAccept?.addEventListener("click",acceptIncomingCall);
el.callDecline?.addEventListener("click",()=>endCall(true));
el.callMute?.addEventListener("click",toggleCallMute);
el.logout.addEventListener("click", async () => { try { await api("/api/logout", { method: "POST" }); } catch {} showAuth(); });
el.logoutAll.addEventListener("click", async()=>{if(!confirm("Завершить все активные сессии аккаунта на всех устройствах?"))return;try{await api("/api/logout-all",{method:"POST"});alert("Все сессии завершены.");}catch(error){alert(error.message);}showAuth();});
el.refreshContacts.addEventListener("click", () => loadContacts(true));
el.contactsList.addEventListener("click", async (event) => { const action=event.target.closest("[data-contact-action]");if(action){event.stopPropagation();try{await contactAction(action.dataset.contactTarget,action.dataset.contactAction);}catch(error){alert(error.message);}return;} const button = event.target.closest("[data-contact-id]"); if (button) openChat(button.dataset.contactId); });
el.messageForm.addEventListener("submit", sendMessage);
if(el.attachmentButton)el.attachmentButton.addEventListener("click",()=>el.attachmentInput?.click());
function acceptAttachmentFiles(fileList){const files=[...(fileList||[])].slice(0,6);const tooLarge=files.find(file=>file.size>10*1024*1024);if(tooLarge){setChatError(`Файл «${tooLarge.name}» больше 10 МБ`);return;}state.pendingAttachments=files;state.pendingAttachment=files[0]||null;state.pendingVoice=null;setChatError(files.length<fileList.length?"Можно отправить до 6 файлов за раз.":"");renderPendingAttachment();renderVoicePreview();updateComposer();}
if(el.attachmentInput)el.attachmentInput.addEventListener("change",()=>acceptAttachmentFiles(el.attachmentInput.files));
if(el.attachmentPreview)el.attachmentPreview.addEventListener("click",event=>{const remove=event.target.closest("[data-remove-attachment]");if(remove){const index=Number(remove.dataset.removeAttachment);state.pendingAttachments.splice(index,1);state.pendingAttachment=state.pendingAttachments[0]||null;if(!state.pendingAttachments.length)el.attachmentInput.value="";renderPendingAttachment();updateComposer();}});
if(el.replyPreview)el.replyPreview.addEventListener("click",event=>{if(event.target.closest("[data-cancel-reply]")){state.pendingReply=null;renderReplyPreview();updateComposer();}});if(el.editPreview)el.editPreview.addEventListener("click",event=>{if(event.target.closest("[data-cancel-edit]")){state.editingMessage=null;el.messageInput.value="";renderEditPreview();updateComposer();}});
if(el.voicePreview)el.voicePreview.addEventListener("click",event=>{if(event.target.closest("[data-remove-voice]")){if(state.pendingVoice?.url)URL.revokeObjectURL(state.pendingVoice.url);state.pendingVoice=null;renderVoicePreview();updateComposer();}});
if(el.voiceButton)el.voiceButton.addEventListener("click",toggleVoiceRecording);
if(el.messagesList)el.messagesList.addEventListener("click",async event=>{const older=event.target.closest("[data-load-older]");if(older){const before=el.messagesList.scrollHeight;state.messageRenderLimit+=150;await loadMessages(false);el.messagesList.scrollTop=el.messagesList.scrollHeight-before;return;}const previewButton=event.target.closest("[data-preview-attachment]");if(previewButton){try{previewAttachment(previewButton,JSON.parse(previewButton.dataset.previewAttachment));}catch{setChatError("Некорректные данные вложения");}return;}const speedButton=event.target.closest("[data-voice-speed]");if(speedButton){const rates=[1,1.5,2];const next=rates[(rates.indexOf(Number(speedButton.dataset.rate||1))+1)%rates.length];speedButton.dataset.rate=String(next);speedButton.textContent=`${next}×`;const audio=speedButton.closest(".voice-card")?.querySelector("[data-voice]")?._fibroAudio;if(audio)audio.playbackRate=next;return;}const attachmentButton=event.target.closest("[data-attachment]");if(attachmentButton){try{downloadAttachment(attachmentButton,JSON.parse(attachmentButton.dataset.attachment));}catch{setChatError("Некорректные данные вложения");}return;}const voiceButton=event.target.closest("[data-voice]");if(voiceButton){try{playVoice(voiceButton,JSON.parse(voiceButton.dataset.voice));}catch{setChatError("Некорректное голосовое сообщение");}return;}const replyButton=event.target.closest("[data-reply-message]");if(replyButton){const bubble=replyButton.closest("[data-message-id]");state.pendingReply={messageId:bubble.dataset.messageId,excerpt:bubble.dataset.messageExcerpt,author:bubble.dataset.messageAuthor};state.editingMessage=null;renderEditPreview();renderReplyPreview();el.messageInput.focus();return;}const editButton=event.target.closest("[data-edit-message]");if(editButton){const item=state.messageCache.find(x=>x.message.id===editButton.dataset.editMessage);if(item?.content?.type==="text"){state.editingMessage={messageId:item.message.id,createdAt:item.message.createdAt,excerpt:item.excerpt};state.pendingReply=null;renderReplyPreview();renderEditPreview();el.messageInput.value=item.content.text||"";updateComposer();el.messageInput.focus();}return;}const deleteButton=event.target.closest("[data-delete-message]");if(deleteButton){if(!confirm("Удалить сообщение у всех участников диалога?"))return;try{await api(`/api/messages/${deleteButton.dataset.deleteMessage}`,{method:"DELETE"});if(state.editingMessage?.messageId===deleteButton.dataset.deleteMessage){state.editingMessage=null;renderEditPreview();el.messageInput.value="";}await loadMessages(false);await loadContacts(false);}catch(error){setChatError(error.message);}return;}const quote=event.target.closest("[data-scroll-message]");if(quote){const target=document.getElementById(`message-${CSS.escape(quote.dataset.scrollMessage)}`);if(target){target.scrollIntoView({behavior:"smooth",block:"center"});target.classList.remove("message-highlight");requestAnimationFrame(()=>target.classList.add("message-highlight"));}else setChatError("Исходное сообщение недоступно.");}});
el.messageInput.addEventListener("input",()=>{updateComposer();clearTimeout(state.typingTimer);void sendTypingState("typing",true);state.typingTimer=setTimeout(()=>sendTypingState("typing",false),1800);});
el.messageInput.addEventListener("keydown", (event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (!el.sendButton.disabled) el.messageForm.requestSubmit(); } });
el.backToContacts.addEventListener("click", closeMobileChat);
el.attachmentViewerClose?.addEventListener("click",closeAttachmentViewer);
el.attachmentViewer?.addEventListener("click",event=>{if(event.target===el.attachmentViewer)closeAttachmentViewer();});
if(el.chatView){["dragenter","dragover"].forEach(type=>el.chatView.addEventListener(type,event=>{event.preventDefault();if(state.activeContact&&!state.activeGroup)el.chatView.classList.add("drag-active");}));["dragleave","drop"].forEach(type=>el.chatView.addEventListener(type,event=>{event.preventDefault();el.chatView.classList.remove("drag-active");if(type==="drop"&&event.dataTransfer?.files?.length&&state.activeContact&&!state.activeGroup)acceptAttachmentFiles(event.dataTransfer.files);}));}


el.changePassword.addEventListener("click",async()=>{
  const currentPassword=el.currentPassword.value;const newPassword=el.newPassword.value;const confirmPassword=el.newPasswordConfirm.value;
  el.passwordMessage.className="message";
  if(newPassword.length<10){el.passwordMessage.textContent="Новый пароль должен содержать минимум 10 символов.";return;}
  if(newPassword!==confirmPassword){el.passwordMessage.textContent="Новые пароли не совпадают.";return;}
  el.changePassword.disabled=true;el.passwordMessage.textContent="Изменение пароля…";
  try{let bundle=null;try{bundle=await loadIdentity(state.user.id,currentPassword);}catch{}await api("/api/account/password",{method:"POST",body:JSON.stringify({currentPassword,newPassword})});if(bundle)await saveIdentity(state.user.id,newPassword,bundle);el.currentPassword.value="";el.newPassword.value="";el.newPasswordConfirm.value="";el.passwordMessage.textContent="Пароль изменён. Локальные ключи обновлены, остальные сессии завершены.";el.passwordMessage.className="message success";}catch(error){el.passwordMessage.textContent=error.message;}finally{el.changePassword.disabled=false;}
});

el.refreshDevices.addEventListener("click",()=>loadDevices());
el.exportVault.addEventListener("click", exportKeyVault);
el.vaultImportFile.addEventListener("change", () => importKeyVaultFile(el.vaultImportFile.files?.[0]));
el.devicesList.addEventListener("click",async(event)=>{const button=event.target.closest("[data-device-action]");if(!button)return;button.disabled=true;try{const action=button.dataset.deviceAction;const id=button.dataset.deviceId;if(action==="approve")await api(`/api/devices/${id}/approve`,{method:"POST"});if(action==="revoke"&&confirm("Отозвать доступ этого устройства?"))await api(`/api/devices/${id}/revoke`,{method:"POST"});await loadDevices();await loadNotifications();}catch(error){alert(error.message);button.disabled=false;}});

el.refreshNotifications.addEventListener("click", () => loadNotifications());
el.notificationsList.addEventListener("click", async (event) => { const button = event.target.closest("[data-notification-id]"); if (!button) return; await api(`/api/notifications/${button.dataset.notificationId}/read`, { method: "POST" }); await loadNotifications(); });
el.supportForm.addEventListener("submit", async (event) => { event.preventDefault(); el.supportMessage.textContent = "Отправка…"; try { await api("/api/support", { method: "POST", body: JSON.stringify({ subject: el.supportSubject.value, text: el.supportText.value }) }); el.supportText.value = ""; el.supportMessage.textContent = "Обращение отправлено на головной узел."; el.supportMessage.className = "message success"; await loadSupport(); if (["admin","super_admin"].includes(state.user?.role)) await loadAdmin(); } catch(error) { el.supportMessage.textContent = error.message; el.supportMessage.className = "message"; } });
el.supportList.addEventListener("submit", async (event) => { const form = event.target.closest(".support-reply"); if (!form) return; event.preventDefault(); const input = form.querySelector("input"); if (!input.value.trim()) return; await api(`/api/support/${form.dataset.ticketId}/reply`, { method: "POST", body: JSON.stringify({ text: input.value.trim() }) }); input.value = ""; await loadSupport(); await loadNotifications(); });
el.supportList.addEventListener("click", async (event) => { const button = event.target.closest("[data-close-ticket]"); if (!button) return; await api(`/api/support/${button.dataset.closeTicket}/close`, { method: "POST" }); await loadSupport(); });


el.networkProfileFile?.addEventListener("change",()=>importNetworkProfileFile(el.networkProfileFile.files?.[0]));
el.saveNetworkSettings?.addEventListener("click",async()=>{el.networkSettingsMessage.textContent="Сохранение…";try{await api("/api/admin/network/settings",{method:"POST",body:JSON.stringify({networkName:el.networkNameInput.value,publicBaseUrl:el.networkUrlInput.value})});el.networkSettingsMessage.textContent="Настройки сети сохранены.";el.networkSettingsMessage.className="message success";await loadDashboard();await checkHealth();}catch(error){el.networkSettingsMessage.textContent=error.message;el.networkSettingsMessage.className="message";}});
el.downloadNetworkProfile?.addEventListener("click",async()=>{el.networkSettingsMessage.textContent="Подготовка профиля…";try{await authenticatedDownload("/api/admin/network/profile",{method:"GET"},"fibrochat-network.fibronet.json");el.networkSettingsMessage.textContent="Профиль сети скачан.";el.networkSettingsMessage.className="message success";}catch(error){el.networkSettingsMessage.textContent=error.message;el.networkSettingsMessage.className="message";}});
el.downloadNetworkBackup?.addEventListener("click",async()=>{const password=el.networkBackupPassword.value;if(password.length<12){el.networkBackupMessage.textContent="Введите пароль длиной минимум 12 символов.";return;}el.networkBackupMessage.textContent="Шифрование резервной копии…";try{await authenticatedDownload("/api/admin/network/backup",{method:"POST",body:JSON.stringify({password})},"fibrochat-network-backup.json");el.networkBackupPassword.value="";el.networkBackupMessage.textContent="Зашифрованная копия сети скачана.";el.networkBackupMessage.className="message success";}catch(error){el.networkBackupMessage.textContent=error.message;el.networkBackupMessage.className="message";}});


el.copyFibroId?.addEventListener("click",async()=>{if(!state.user?.fibroId)return;try{await navigator.clipboard.writeText(state.user.fibroId);el.copyFibroId.textContent="Скопировано";setTimeout(()=>el.copyFibroId.textContent="Копировать",1200);}catch{prompt("Скопируйте Fibro ID",state.user.fibroId);}});
el.addContact?.addEventListener("click",async()=>{const fibroId=String(el.contactFibroId?.value||"").trim();el.contactAddMessage.textContent="Добавление…";try{const data=await api("/api/contacts/add",{method:"POST",body:JSON.stringify({fibroId})});el.contactFibroId.value="";el.contactAddMessage.textContent=`${data.contact.nickname} добавлен в контакты.`;el.contactAddMessage.className="message success";await loadContacts();}catch(error){el.contactAddMessage.textContent=error.message;el.contactAddMessage.className="message";}});
el.contactFibroId?.addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();el.addContact?.click();}});


el.profileAvatarFile?.addEventListener("change",async()=>{const file=el.profileAvatarFile.files?.[0];if(!file)return;if(file.size>250000){el.profileMessage.textContent="Файл больше 250 КБ.";return;}const reader=new FileReader();reader.onload=()=>{state.pendingAvatarDataUrl=String(reader.result);el.profileAvatarPreview.src=state.pendingAvatarDataUrl;};reader.readAsDataURL(file);});
el.profileAvatarRemove?.addEventListener("click",()=>{state.pendingAvatarDataUrl="";el.profileAvatarPreview.removeAttribute("src");});
el.saveProfile?.addEventListener("click",saveProfile);
el.profilePageCopyId?.addEventListener("click",()=>el.copyFibroId?.click());
el.profileShareLink?.addEventListener("click",async()=>{const url=state.profileData?.inviteUrl;if(!url)return;try{if(navigator.share)await navigator.share({title:"FibroChat",text:`Добавьте меня в FibroChat: ${state.user.fibroId}`,url});else{await navigator.clipboard.writeText(url);el.profileMessage.textContent="Ссылка приглашения скопирована.";}}catch{}});
el.blockedList?.addEventListener("click",async event=>{const button=event.target.closest("[data-unblock-id]");if(!button)return;try{await contactAction(button.dataset.unblockId,"unblock");}catch(error){alert(error.message);}});

el.adminUserRefresh?.addEventListener("click",()=>loadUsers());el.adminUserSearch?.addEventListener("input",()=>{clearTimeout(state.adminSearchTimer);state.adminSearchTimer=setTimeout(loadUsers,250);});el.adminUserStatus?.addEventListener("change",loadUsers);el.adminUserRole?.addEventListener("change",loadUsers);el.invitesList?.addEventListener("click",async event=>{const button=event.target.closest("[data-invite-revoke]");if(!button)return;if(!confirm("Отозвать этот инвайт?"))return;await api(`/api/admin/invites/${button.dataset.inviteRevoke}/revoke`,{method:"POST"});await loadInvites();await loadDashboard();});


el.inviteRequestsList?.addEventListener("click",async event=>{const approve=event.target.closest("[data-request-approve]");const reject=event.target.closest("[data-request-reject]");const button=approve||reject;if(!button)return;const action=approve?"approve":"reject";try{await api(`/api/admin/invite-requests/${button.dataset.requestApprove||button.dataset.requestReject}/${action}`,{method:"POST"});await loadInviteRequests();await loadInvites();}catch(error){alert(error.message);}});
el.createInvite.addEventListener("click", async () => { try { const data = await api("/api/admin/invites", { method: "POST", body: JSON.stringify({ validDays: Number(el.inviteDays?.value||7), role: el.inviteRole?.value||"user" }) }); el.inviteOutput.textContent = data.invite.code; await loadAdmin(); } catch (error) { el.inviteOutput.textContent = error.message; } });
el.usersList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-user-id][data-action]"); if (!button) return;
  const id = button.dataset.userId; const action = button.dataset.action; button.disabled = true;
  try {
    if (action === "approve") await api(`/api/admin/users/${id}/approve`, { method: "POST" });
    if (action === "extend") await api(`/api/admin/users/${id}/extend`, { method: "POST", body: JSON.stringify({ days: Number(button.dataset.days || 30) }) });
    if (action === "suspend" && confirm("Приостановить доступ пользователя?")) await api(`/api/admin/users/${id}/suspend`, { method: "POST" });
    if (action === "restore") await api(`/api/admin/users/${id}/restore`, { method: "POST" });
    if (action === "role") await api(`/api/admin/users/${id}/role`, { method: "POST", body: JSON.stringify({ role: button.dataset.role }) });
    if (action === "sessions" && confirm("Завершить все активные сессии пользователя?")) await api(`/api/admin/users/${id}/sessions/revoke`, { method: "POST" });
    if (action === "temp-suspend") { const minutes=Number(prompt("На сколько минут приостановить доступ?", "60")); if(minutes>0) await api(`/api/admin/users/${id}/suspend-temporary`, { method: "POST", body: JSON.stringify({ minutes, reason: "Временная блокировка администратором" }) }); }
    await loadAdmin(); await loadContacts();
  } catch (error) { alert(error.message); button.disabled = false; }
});


if(el.groupsList)el.groupsList.addEventListener("click",event=>{const button=event.target.closest("[data-group-id]");if(button)openGroup(button.dataset.groupId);});
if(el.createGroupButton)el.createGroupButton.addEventListener("click",openGroupModal);
if(el.groupModalClose)el.groupModalClose.addEventListener("click",closeGroupModal);
if(el.groupForm)el.groupForm.addEventListener("submit",createGroup);
if(el.groupModal)el.groupModal.addEventListener("click",event=>{if(event.target===el.groupModal)closeGroupModal();});
if(el.groupSettingsButton)el.groupSettingsButton.addEventListener("click",openGroupSettings);
if(el.groupSettingsClose)el.groupSettingsClose.addEventListener("click",closeGroupSettings);
if(el.groupSettingsModal)el.groupSettingsModal.addEventListener("click",event=>{if(event.target===el.groupSettingsModal)closeGroupSettings();});
if(el.groupSettingsForm)el.groupSettingsForm.addEventListener("submit",saveGroupSettings);
if(el.groupAddMember)el.groupAddMember.addEventListener("change",async()=>{const userId=el.groupAddMember.value;if(!userId)return;try{await api(`/api/groups/${state.activeGroup.id}/members`,{method:"POST",body:JSON.stringify({userId})});await loadGroups();await openGroupSettings();}catch(error){el.groupSettingsMessage.textContent=error.message;}});
if(el.groupMembersList)el.groupMembersList.addEventListener("change",async event=>{const select=event.target.closest("[data-group-role]");if(!select)return;try{await api(`/api/groups/${state.activeGroup.id}/members/${select.dataset.groupRole}`,{method:"PATCH",body:JSON.stringify({role:select.value})});await openGroupSettings();}catch(error){el.groupSettingsMessage.textContent=error.message;}});
if(el.groupMembersList)el.groupMembersList.addEventListener("click",async event=>{const button=event.target.closest("[data-group-remove]");if(!button||!confirm("Удалить участника из группы?"))return;try{await api(`/api/groups/${state.activeGroup.id}/members/${button.dataset.groupRemove}`,{method:"DELETE"});await loadGroups();await openGroupSettings();}catch(error){el.groupSettingsMessage.textContent=error.message;}});
if(el.groupLeaveButton)el.groupLeaveButton.addEventListener("click",async()=>{if(!confirm("Покинуть группу?"))return;await api(`/api/groups/${state.activeGroup.id}/members/${state.user.id}`,{method:"DELETE"});closeGroupSettings();state.activeGroup=null;el.chatView.classList.add("hidden");el.emptyChat.classList.remove("hidden");await loadGroups();});
if(el.groupDeleteButton)el.groupDeleteButton.addEventListener("click",async()=>{if(!confirm("Удалить группу и всю историю сообщений? Это действие необратимо."))return;await api(`/api/groups/${state.activeGroup.id}`,{method:"DELETE"});closeGroupSettings();state.activeGroup=null;el.chatView.classList.add("hidden");el.emptyChat.classList.remove("hidden");await loadGroups();});


function detectPlatform(){const ua=navigator.userAgent||"";const ios=/iPhone|iPad|iPod/i.test(ua)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);const android=/Android/i.test(ua);const chrome=android&&/Chrome\//i.test(ua)&&!/EdgA|OPR|SamsungBrowser/i.test(ua);const safari=ios&&/Safari/i.test(ua)&&!/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);return{ios,android,chrome,safari,recommended:android?"Google Chrome":ios?"Safari":"современный браузер"};}
function notificationHelp(platform){if(platform.android)return"1. Откройте Настройки телефона. 2. Приложения → Chrome → Уведомления. 3. Включите «Разрешить уведомления». 4. Вернитесь в FibroChat и нажмите «Проверить снова».";if(platform.ios)return"1. Откройте Настройки iPhone. 2. Уведомления → Safari (или FibroChat, если установлен на экран Домой). 3. Включите уведомления. 4. Вернитесь сюда и нажмите «Проверить снова». На iPhone Web Push работает для приложения, добавленного на экран Домой.";return"Откройте настройки сайта в адресной строке браузера, разрешите уведомления и вернитесь в FibroChat.";}
function createOnboarding(){if(document.getElementById("fibro-onboarding"))return;const platform=detectPlatform();const browserOk=(!platform.android&&!platform.ios)||platform.chrome||platform.safari;const wrap=document.createElement("div");wrap.id="fibro-onboarding";wrap.className="fibro-onboarding hidden";wrap.innerHTML=`<section class="onboarding-card" role="dialog" aria-modal="true" aria-labelledby="onboarding-title"><div class="onboarding-progress"><span></span></div><div class="onboarding-step"></div><div class="onboarding-actions"><button class="ghost" data-onboarding-back type="button">Назад</button><button class="primary" data-onboarding-next type="button">Продолжить</button></div></section>`;document.body.appendChild(wrap);let step=0;const steps=[{icon:"👋",title:"Добро пожаловать в FibroChat",text:"Этот короткий мастер проверит браузер, уведомления и микрофон. Каждый шаг можно повторить позже в настройках."},{icon:browserOk?"✅":"🌐",title:browserOk?"Браузер подходит":`Рекомендуется ${platform.recommended}`,text:browserOk?`Вы уже открыли FibroChat через ${platform.recommended}. Ничего менять не нужно.`:`Для надёжных звонков и уведомлений откройте эту ссылку в ${platform.recommended}. Скопируйте адрес страницы, откройте ${platform.recommended} и вставьте его в адресную строку. Система не позволяет сайту принудительно переключить браузер.`},{icon:"🔔",title:"Уведомления о звонках и сообщениях",text:'Нажмите «Разрешить уведомления». Системное окно появится только после вашего нажатия.',action:"notifications"},{icon:"🎙️",title:"Проверка микрофона",text:"Нажмите кнопку проверки и разрешите доступ. FibroChat сразу остановит тестовый поток — запись не сохраняется.",action:"microphone"},{icon:"✅",title:"FibroChat готов",text:"Основная настройка завершена. Пропущенные разрешения можно включить позже в настройках браузера."}];const content=wrap.querySelector(".onboarding-step"),next=wrap.querySelector("[data-onboarding-next]"),back=wrap.querySelector("[data-onboarding-back]");function render(){const s=steps[step];wrap.querySelector(".onboarding-progress span").style.width=`${((step+1)/steps.length)*100}%`;content.innerHTML=`<div class="onboarding-icon">${s.icon}</div><h2 id="onboarding-title">${s.title}</h2><p>${s.text}</p><div class="onboarding-extra"></div>`;const extra=content.querySelector(".onboarding-extra");if(s.action==="notifications"){const permission=("Notification" in window)?Notification.permission:"unsupported";extra.innerHTML=`<p class="status-chip">Статус: ${permission==="granted"?"разрешено":permission==="denied"?"запрещено в настройках":"ещё не настроено"}</p><button class="mini-button" data-enable-notifications type="button">${permission==="denied"?"Показать инструкцию":"Разрешить уведомления"}</button><pre class="onboarding-instruction hidden"></pre>`;extra.querySelector("button").addEventListener("click",async()=>{if(permission==="denied"){const pre=extra.querySelector("pre");pre.textContent=notificationHelp(platform);pre.classList.remove("hidden");return;}try{const result=await enableWebPush();extra.innerHTML='<p class="success-note">Уведомления включены.</p>';}catch(error){extra.innerHTML=`<p class="message">${escapeHtml(error.message)}</p><pre class="onboarding-instruction">${escapeHtml(notificationHelp(platform))}</pre>`;}});}if(s.action==="microphone"){extra.innerHTML='<button class="mini-button" data-test-mic type="button">Проверить микрофон</button><p class="message"></p>';extra.querySelector("button").addEventListener("click",async()=>{const msg=extra.querySelector("p");try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});stream.getTracks().forEach(t=>t.stop());msg.textContent="Микрофон работает и доступ разрешён.";}catch{msg.textContent="Доступ не получен. Откройте настройки сайта в браузере, разрешите микрофон и повторите проверку.";}});}back.style.visibility=step?"visible":"hidden";next.textContent=step===steps.length-1?"Готово":"Продолжить";}back.addEventListener("click",()=>{if(step>0){step--;render();}});next.addEventListener("click",()=>{if(step<steps.length-1){step++;render();}else{localStorage.setItem("fibrochat_onboarding_75_done","1");wrap.classList.add("hidden");}});render();window.openFibroOnboarding=()=>{step=0;render();wrap.classList.remove("hidden");};}
async function handleSmartInviteLink(){const params=new URLSearchParams(location.search);const invite=params.get("invite");const request=params.get("request");if(invite){setMode("register");el.invite.value=invite;el.authMessage.textContent="Код приглашения получен из QR-кода и уже заполнен. Придумайте никнейм и пароль.";el.nickname.focus();return;}if(request){setMode("register");el.inviteField.classList.add("hidden");el.authMessage.textContent="QR-код распознан. Отправляем запрос администратору сети…";try{const data=await api("/api/invite-requests",{method:"POST",body:JSON.stringify({token:request})});const token=data.request.token;el.authMessage.textContent="Запрос отправлен головному устройству. Оставьте эту страницу открытой — код подставится автоматически после одобрения.";const poll=setInterval(async()=>{try{const status=await api(`/api/invite-requests/${token}`,{method:"GET"});if(status.request.status==="approved"&&status.request.inviteCode){clearInterval(poll);el.inviteField.classList.remove("hidden");el.invite.value=status.request.inviteCode;el.authMessage.textContent="Администратор одобрил подключение. Код уже заполнен — завершите регистрацию.";history.replaceState({},"",`/?invite=${encodeURIComponent(status.request.inviteCode)}`);}else if(status.request.status==="rejected"){clearInterval(poll);el.authMessage.textContent="Администратор отклонил запрос на подключение.";}}catch{}},4000);}catch(error){el.authMessage.textContent=error.message;}}}

el.deviceName.value = localStorage.getItem("fibrochat_device_name") || guessedDeviceName();
el.deviceName.addEventListener("change",()=>localStorage.setItem("fibrochat_device_name",el.deviceName.value.trim()));
registerFibroServiceWorker();
createOnboarding();
setMode("register"); updateComposer(); checkHealth(); handleSmartInviteLink(); restoreSession();
if(localStorage.getItem("fibrochat_onboarding_75_done")!=="1")setTimeout(()=>window.openFibroOnboarding?.(),500);


function syncVisualViewport(){
  const viewport=window.visualViewport;
  const height=viewport?viewport.height:window.innerHeight;
  document.documentElement.style.setProperty("--app-height",`${Math.round(height)}px`);
  if(viewport)document.documentElement.style.setProperty("--viewport-offset-top",`${Math.round(viewport.offsetTop)}px`);
  if(innerWidth<=760&&document.body.classList.contains("chat-open")&&document.activeElement===el.messageInput){
    requestAnimationFrame(()=>{
      const distanceFromBottom=el.messagesList.scrollHeight-el.messagesList.scrollTop-el.messagesList.clientHeight;
      if(distanceFromBottom<160)el.messagesList.scrollTop=el.messagesList.scrollHeight;
    });
  }
}
window.addEventListener("resize",syncVisualViewport,{passive:true});
window.addEventListener("orientationchange",()=>setTimeout(syncVisualViewport,120),{passive:true});
if(window.visualViewport){
  window.visualViewport.addEventListener("resize",syncVisualViewport,{passive:true});
  window.visualViewport.addEventListener("scroll",syncVisualViewport,{passive:true});
}
syncVisualViewport();

if(el.chatSearchToggle)el.chatSearchToggle.addEventListener("click",()=>{el.chatSearch.classList.toggle("hidden");if(!el.chatSearch.classList.contains("hidden"))el.chatSearchInput.focus();});
if(el.chatSearchClose)el.chatSearchClose.addEventListener("click",()=>{state.messageSearch="";el.chatSearchInput.value="";el.chatSearch.classList.add("hidden");loadMessages(false);});
if(el.chatSearchInput)el.chatSearchInput.addEventListener("input",()=>{state.messageSearch=el.chatSearchInput.value;loadMessages(false);});
