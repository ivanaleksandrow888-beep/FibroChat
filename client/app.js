"use strict";

const CLIENT_VERSION = "0.5.1";
const CLIENT_PROTOCOL = "1.1";

const state = {
  mode: "register",
  token: localStorage.getItem("fibrochat_token") || "",
  refreshToken: localStorage.getItem("fibrochat_refresh_token") || "",
  user: null,
  identity: null,
  contacts: [],
  activeContact: null,
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
  identityBundle: null
};
const $ = (selector) => document.querySelector(selector);
const el = {
  authView: $("#auth-view"), appView: $("#app-view"), registerTab: $("#register-tab"), loginTab: $("#login-tab"),
  inviteField: $("#invite-field"), invite: $("#invite"), nickname: $("#nickname"), password: $("#password"), passwordConfirmField: $("#password-confirm-field"), passwordConfirm: $("#password-confirm"), deviceName: $("#device-name"),
  authForm: $("#auth-form"), submit: $("#submit-button"), authMessage: $("#auth-message"), nodeDot: $("#node-dot"), nodeText: $("#node-text"),
  profileNickname: $("#profile-nickname"), profileFibroId: $("#profile-fibro-id"), copyFibroId: $("#copy-fibro-id"), profileStatus: $("#profile-status"), profileSubscription: $("#profile-subscription"), currentRole: $("#current-role"),
  logout: $("#logout-button"), contactsList: $("#contacts-list"), refreshContacts: $("#refresh-contacts"), contactFibroId: $("#contact-fibro-id"), addContact: $("#add-contact"), contactAddMessage: $("#contact-add-message"),
  emptyChat: $("#empty-chat"), chatView: $("#chat-view"), chatName: $("#chat-name"), chatPresence: $("#chat-presence"),
  messagesList: $("#messages-list"), messageForm: $("#message-form"), messageInput: $("#message-input"), sendButton: $("#send-button"), charCounter: $("#char-counter"), backToContacts: $("#back-to-contacts"), chatError: $("#chat-error"),
  adminPanel: $("#admin-panel"), createInvite: $("#create-invite"), inviteOutput: $("#invite-output"), usersList: $("#users-list"), dashboardSummary: $("#dashboard-summary"), networkStatus: $("#network-status"), auditList: $("#audit-list"),
  subscriptionMeterBar: $("#subscription-meter-bar"), notificationCount: $("#notification-count"), notificationsList: $("#notifications-list"), refreshNotifications: $("#refresh-notifications"),
  supportForm: $("#support-form"), supportSubject: $("#support-subject"), supportText: $("#support-text"), supportMessage: $("#support-message"), supportList: $("#support-list"),
  deviceSummary: $("#device-summary"), devicesList: $("#devices-list"), refreshDevices: $("#refresh-devices"),
  vaultPassword: $("#vault-password"), exportVault: $("#export-vault"), vaultMessage: $("#vault-message"), vaultImportFile: $("#vault-import-file"), vaultImportMessage: $("#vault-import-message"), logoutAll: $("#logout-all-button"),
  currentPassword: $("#current-password"), newPassword: $("#new-password"), newPasswordConfirm: $("#new-password-confirm"), changePassword: $("#change-password"), passwordMessage: $("#password-message"),
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
  if(["message:new","message:status","message:read"].includes(type)){
    if(type==="message:new")showBrowserNotification("Новое сообщение в FibroChat",{body:"Получено новое зашифрованное сообщение.",tag:`message-${payload?.messageId||Date.now()}`});
    await loadContacts(false).catch(()=>null);
    if(state.activeContact)await loadMessages(false).catch(()=>null);
    return;
  }
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
async function createEnvelope(text, recipient) {
  if (!state.identity) throw new Error("Приватные ключи этого устройства не загружены");
  const messageId = uuidV4();
  const createdAt = new Date().toISOString();
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
  const sender = message.senderId === state.user.id ? state.user : state.contacts.find((c) => c.id === message.senderId);
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
function showAuth(clearTokens = true) { clearInterval(state.pollingTimer); stopRealtime(); const previousUserId=state.user?.id||state.pendingRestoreUser?.id; if(clearTokens){clearSession();clearSessionIdentity(previousUserId);} state.user = null; state.identity = null; state.identityBundle = null; state.activeContact = null; el.appView.classList.add("hidden"); el.authView.classList.remove("hidden"); }
function showApp(user) {
  state.user = user; localStorage.setItem("fibrochat_last_user_id",user.id); el.authView.classList.add("hidden"); el.appView.classList.remove("hidden");
  el.profileNickname.textContent = user.nickname; if(el.profileFibroId)el.profileFibroId.textContent=user.fibroId||"—"; el.profileStatus.textContent = `${statusName(user.status)} · ключи ${user.keysConfigured ? "настроены" : "не настроены"}`;
  const days = Number(user.subscriptionDaysRemaining || 0);
  el.profileSubscription.textContent = user.subscriptionState === "expired" ? "Подписка истекла — чат заблокирован" : `Подписка до ${dateText(user.subscriptionEndsAt)} · осталось ${days} дн.`;
  el.subscriptionMeterBar.style.width = `${Math.max(0, Math.min(100, (days / 30) * 100))}%`;
  el.subscriptionMeterBar.className = user.subscriptionState === "expired" ? "expired" : user.subscriptionState === "expiring" ? "expiring" : "";
  el.currentRole.textContent = roleName(user.role);
  const isAdmin = ["admin", "super_admin"].includes(user.role); el.adminPanel.classList.toggle("hidden", !isAdmin);
  if (user.status === "active" && user.subscriptionState !== "expired") loadContacts(); else el.contactsList.innerHTML = `<p class="muted">${user.subscriptionState === "expired" ? "Подписка истекла. Переписка временно недоступна, но поддержка работает." : "Аккаунт ожидает подтверждения администратора."}</p>`;
  loadNotifications(); loadSupport(); loadDevices(); installSecurityControls(); setTimeout(offerPushSetup,700); if(("Notification" in window&&Notification.permission==="granted"))enableWebPush().catch(()=>null);
  if (isAdmin) loadAdmin(); clearInterval(state.pollingTimer);
  connectRealtime();
  window.FibroRouter?.open(window.FibroRouter.current()||"chats",{writeHash:false});
  state.pollingTimer = setInterval(async () => { try { await api("/api/presence", { method: "POST" }); if (!state.realtimeConnected && state.user?.status === "active" && state.user?.subscriptionState !== "expired") { await loadContacts(false); if (state.activeContact) await loadMessages(false); } await loadNotifications(false); } catch {} }, 15000);
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
async function loadContacts(render = true) { try { const data = await api("/api/contacts", { method: "GET" }); state.contacts = data.contacts; if (state.activeContact) { state.activeContact = state.contacts.find((c) => c.id === state.activeContact.id) || null; if (state.activeContact) updateChatHeader(); } if (!render) return renderContacts(); renderContacts(); } catch (error) { el.contactsList.innerHTML = `<p class="message">${escapeHtml(error.message)}</p>`; } }
function renderContacts() { el.contactsList.innerHTML = state.contacts.map((contact) => `<button class="contact ${state.activeContact?.id === contact.id ? "active" : ""}" data-contact-id="${contact.id}" type="button"><span class="contact-main"><span class="avatar">${escapeHtml(contact.nickname.slice(0,1).toUpperCase())}</span><span><strong>${escapeHtml(contact.nickname)}</strong><small>${contact.online ? "В сети" : "Не в сети"} · 🔒${contact.lastMessageAt ? ` · ${timeText(contact.lastMessageAt)}` : ""}</small></span></span><span class="contact-tail">${contact.unreadCount ? `<span class="unread-badge">${contact.unreadCount > 99 ? "99+" : contact.unreadCount}</span>` : ""}<span class="presence ${contact.online ? "online" : ""}"></span></span></button>`).join("") || '<p class="muted">Контактов пока нет. Добавьте человека по его полному Fibro ID.</p>'; }
function updateChatHeader() { if (!state.activeContact) return; el.chatName.textContent = state.activeContact.nickname; el.chatPresence.textContent = state.activeContact.online ? "В сети" : "Не в сети"; }
async function openChat(contactId) { state.activeContact = state.contacts.find((contact) => contact.id === contactId) || null; if (!state.activeContact) return; renderContacts(); updateChatHeader(); el.emptyChat.classList.add("hidden"); el.chatView.classList.remove("hidden"); document.body.classList.add("chat-open"); await loadMessages(true); await loadContacts(false); el.messageInput.focus(); }
async function loadMessages(scroll = false) {
  if (!state.activeContact) return;
  try {
    const data = await api(`/api/messages?with=${encodeURIComponent(state.activeContact.id)}`, { method: "GET" });
    const rendered = await Promise.all(data.messages.map(async (message) => {
      const mine = message.senderId === state.user.id;
      const attempts = Number(message.deliveryAttempts) || 0;
      const status = mine ? (message.readAt ? "Прочитано" : message.deliveredAt ? "Доставлено" : attempts > 1 ? `Повторная доставка · попытка ${attempts}` : "В очереди") : "";
      try {
        const text = await decryptMessage(message);
        return `<article class="bubble ${mine ? "mine" : ""}"><p>${escapeHtml(text)}</p><div class="meta"><span class="lock-meta">🔒 Подпись проверена</span><span>${timeText(message.createdAt)}</span>${status ? `<span>${status}</span>` : ""}</div></article>`;
      } catch (error) {
        return `<article class="bubble error"><p>[Не удалось расшифровать сообщение]</p><div class="meta"><span>${escapeHtml(error.message)}</span></div></article>`;
      }
    }));
    el.messagesList.innerHTML = rendered.join("") || '<p class="muted">Сообщений пока нет. Начни защищённый разговор первым.</p>';
    const unreadIncoming = data.messages.filter((message) => message.recipientId === state.user.id && !message.readAt);
    await Promise.all(unreadIncoming.map((message) => api(`/api/messages/${message.id}/read`, { method: "POST" }).catch(() => null)));
    if (scroll || unreadIncoming.length) el.messagesList.scrollTop = el.messagesList.scrollHeight;
  } catch (error) { setChatError(error.message); }
}
async function sendMessage(event) {
  event.preventDefault(); if (!state.activeContact) return; const text = el.messageInput.value.trim(); if (!text) return;
  el.messageInput.disabled = true; el.sendButton.disabled = true; setChatError("");
  try { const encrypted = await createEnvelope(text, state.activeContact); await api("/api/messages", { method: "POST", body: JSON.stringify({ recipientId: state.activeContact.id, ...encrypted }) }); el.messageInput.value = ""; updateComposer(); await loadMessages(true); await loadContacts(false); }
  catch (error) { setChatError(error.message); }
  finally { el.messageInput.disabled = false; updateComposer(); el.messageInput.focus(); }
}
function updateComposer() {
  const length = el.messageInput.value.length;
  el.charCounter.textContent = `${length}/4000`;
  el.sendButton.disabled = el.messageInput.disabled || length === 0 || !state.activeContact;
  el.messageInput.style.height = "auto";
  el.messageInput.style.height = `${Math.min(el.messageInput.scrollHeight, 140)}px`;
}
function closeMobileChat() { document.body.classList.remove("chat-open"); }


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

async function loadAdmin() { await Promise.all([loadDashboard(), loadUsers(), loadAudit()]); }
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
      ["Истекают", s.expiringUsers], ["Истекли", s.expiredUsers], ["Инвайты", s.activeInvites]
    ].map(([label,value]) => `<div class="stat-card"><strong>${value}</strong><span>${label}</span></div>`).join("");
  } catch (error) { el.networkStatus.textContent = error.message; }
}
async function loadUsers() {
  try {
    const data = await api("/api/admin/users", { method: "GET" });
    const isHead = state.user?.role === "super_admin";
    el.usersList.innerHTML = data.users.map((user) => {
      const self = user.id === state.user.id;
      const actions = [];
      if (user.status === "pending" && isHead) actions.push(`<button class="approve" data-action="approve" data-user-id="${user.id}" type="button">Подтвердить 30 дней</button>`);
      if (user.status === "active" && isHead && !self) actions.push(`<button class="mini-button" data-action="extend" data-days="30" data-user-id="${user.id}" type="button">+30</button><button class="mini-button" data-action="extend" data-days="90" data-user-id="${user.id}" type="button">+90</button><button class="mini-button" data-action="extend" data-days="365" data-user-id="${user.id}" type="button">+365</button>`);
      if (user.status === "active" && !self && user.role !== "super_admin") actions.push(`<button class="danger-button" data-action="suspend" data-user-id="${user.id}" type="button">Приостановить</button>`);
      if (user.status === "suspended" && isHead) actions.push(`<button class="mini-button" data-action="restore" data-user-id="${user.id}" type="button">Восстановить</button>`);
      if (isHead && !self && user.status !== "pending" && user.role !== "super_admin") actions.push(`<button class="mini-button" data-action="role" data-role="${user.role === "admin" ? "user" : "admin"}" data-user-id="${user.id}" type="button">${user.role === "admin" ? "Снять админа" : "Сделать админом"}</button>`);
      return `<div class="user-row user-control"><div><strong>${escapeHtml(user.nickname)}${self ? " · Вы" : ""}</strong><small>${escapeHtml(roleName(user.role))} · ${escapeHtml(statusName(user.status))}</small><small>Подписка: ${escapeHtml(subscriptionName(user.subscriptionState))} · до ${dateText(user.subscriptionEndsAt)}</small></div><div class="user-actions">${actions.join("")}</div></div>`;
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

el.registerTab.addEventListener("click", () => setMode("register"));
el.loginTab.addEventListener("click", () => setMode("login"));
el.authForm.addEventListener("submit", handleAuth);
el.logout.addEventListener("click", async () => { try { await api("/api/logout", { method: "POST" }); } catch {} showAuth(); });
el.logoutAll.addEventListener("click", async()=>{if(!confirm("Завершить все активные сессии аккаунта на всех устройствах?"))return;try{await api("/api/logout-all",{method:"POST"});alert("Все сессии завершены.");}catch(error){alert(error.message);}showAuth();});
el.refreshContacts.addEventListener("click", () => loadContacts(true));
el.contactsList.addEventListener("click", (event) => { const button = event.target.closest("[data-contact-id]"); if (button) openChat(button.dataset.contactId); });
el.messageForm.addEventListener("submit", sendMessage);
el.messageInput.addEventListener("input", updateComposer);
el.messageInput.addEventListener("keydown", (event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (!el.sendButton.disabled) el.messageForm.requestSubmit(); } });
el.backToContacts.addEventListener("click", closeMobileChat);


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

el.createInvite.addEventListener("click", async () => { try { const data = await api("/api/admin/invites", { method: "POST", body: JSON.stringify({ validDays: 7 }) }); el.inviteOutput.textContent = data.invite.code; await loadAdmin(); } catch (error) { el.inviteOutput.textContent = error.message; } });
el.usersList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-user-id][data-action]"); if (!button) return;
  const id = button.dataset.userId; const action = button.dataset.action; button.disabled = true;
  try {
    if (action === "approve") await api(`/api/admin/users/${id}/approve`, { method: "POST" });
    if (action === "extend") await api(`/api/admin/users/${id}/extend`, { method: "POST", body: JSON.stringify({ days: Number(button.dataset.days || 30) }) });
    if (action === "suspend" && confirm("Приостановить доступ пользователя?")) await api(`/api/admin/users/${id}/suspend`, { method: "POST" });
    if (action === "restore") await api(`/api/admin/users/${id}/restore`, { method: "POST" });
    if (action === "role") await api(`/api/admin/users/${id}/role`, { method: "POST", body: JSON.stringify({ role: button.dataset.role }) });
    await loadAdmin(); await loadContacts();
  } catch (error) { alert(error.message); button.disabled = false; }
});

el.deviceName.value = localStorage.getItem("fibrochat_device_name") || guessedDeviceName();
el.deviceName.addEventListener("change",()=>localStorage.setItem("fibrochat_device_name",el.deviceName.value.trim()));
registerFibroServiceWorker();
setMode("register"); updateComposer(); checkHealth(); restoreSession();
