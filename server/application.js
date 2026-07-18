"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const webpush = require("web-push");
const { URL } = require("url");
const config = require("./config");
const store = require("./storage/store");

const PORT = config.PORT;
const ROOT_DIR = path.resolve(__dirname, "..");
const CLIENT_DIR = path.join(ROOT_DIR, "client");
const DATA_DIR = path.join(ROOT_DIR, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const INVITES_FILE = path.join(DATA_DIR, "invites.json");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");
const AUDIT_FILE = path.join(DATA_DIR, "audit.json");
const NETWORK_FILE = path.join(DATA_DIR, "network.json");
const NOTIFICATIONS_FILE = path.join(DATA_DIR, "notifications.json");
const SUPPORT_FILE = path.join(DATA_DIR, "support.json");
const DEVICES_FILE = path.join(DATA_DIR, "devices.json");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");
const DEVICE_APPROVALS_FILE = path.join(DATA_DIR, "device-approvals.json");
const PUSH_SUBSCRIPTIONS_FILE = path.join(DATA_DIR, "push-subscriptions.json");
const CONTACTS_FILE = path.join(DATA_DIR, "contacts.json");
const OWNER_INVITE = "FIBRO-OWNER-2026";
const ACCESS_TTL_MS = 15 * 60 * 1000;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_BLOCK_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 5;
const SUBSCRIPTION_DAYS = 30;
const ONLINE_TTL_MS = 15_000;
const DELIVERY_SCAN_MS = 5_000;
const DELIVERY_MAX_BACKOFF_MS = 5 * 60 * 1000;
const DEVICE_APPROVAL_TTL_MS = 5 * 60 * 1000;
const APP_VERSION = config.APP_VERSION;
const PROTOCOL_VERSION = config.PROTOCOL_VERSION;
const MIN_CLIENT_PROTOCOL = "1.1";
const PROTOCOL_CAPABILITIES = ["auth.session.v1","identity.keys.v1","messages.secure-envelope.v1","messages.delivery-queue.v1","events.sse-envelope.v1","subscriptions.v1","devices.trust.v1","network.profile.v1","contacts.private.v1","identity.fibro-id.v1"];

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".ico": "image/x-icon"
};
const accessTokens = new Map();
const loginAttempts = new Map();
const presence = new Map();
const eventClients = new Map();

async function ensureDataStore() {
  await store.initialize();
  let network = readObject(NETWORK_FILE, {});
  let networkChanged = false;
  if (!network.nodeId) { network.nodeId = config.NODE_ID || crypto.randomUUID(); networkChanged = true; }
  if (!network.networkId) { network.networkId = `fibro-${crypto.randomBytes(4).toString("hex")}`; networkChanged = true; }
  if (network.protocolVersion !== PROTOCOL_VERSION) { network.protocolVersion = PROTOCOL_VERSION; networkChanged = true; }
  if (typeof network.publicBaseUrl !== "string") { network.publicBaseUrl = ""; networkChanged = true; }
  if (!network.signingPrivateKey || !network.signingPublicKey) {
    const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    network.signingPrivateKey = privateKey.export({ format: "jwk" });
    network.signingPublicKey = publicKey.export({ format: "jwk" });
    networkChanged = true;
  }
  if (!network.createdAt) { network.createdAt = new Date().toISOString(); networkChanged = true; }
  if (!network.networkName) { network.networkName = "FibroChat Network"; networkChanged = true; }
  if (!network.webPushVapid || !network.webPushVapid.publicKey || !network.webPushVapid.privateKey) {
    network.webPushVapid = webpush.generateVAPIDKeys();
    networkChanged = true;
  }
  webpush.setVapidDetails("mailto:admin@fibrochat.local", network.webPushVapid.publicKey, network.webPushVapid.privateKey);
  if (!network.headUserId) {
    const head = readJson(USERS_FILE).find((user) => user.role === "super_admin");
    if (head) { network.headUserId = head.id; network.headNickname = head.nickname; network.activatedAt ||= head.approvedAt || head.createdAt; networkChanged = true; }
  }
  const users=readJson(USERS_FILE);let usersChanged=false;const usedFibroIds=new Set();
  for(const user of users){
    let fibroId=normalizeFibroId(user.fibroId);
    if(!/^FIBRO-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(fibroId)||usedFibroIds.has(fibroId))fibroId=createFibroId(users);
    if(user.fibroId!==fibroId){user.fibroId=fibroId;usersChanged=true;}usedFibroIds.add(fibroId);
  }
  const invites=readJson(INVITES_FILE);
  for(const invite of invites){
    if(!invite.usedByUserId&&invite.usedByNickname){const matched=users.find(user=>user.nickname===invite.usedByNickname);if(matched){invite.usedByUserId=matched.id;}}
    const invited=users.find(user=>user.id===invite.usedByUserId||(!invite.usedByUserId&&user.nickname===invite.usedByNickname));
    if(invited&&!invited.invitedBy&&invite.createdBy){invited.invitedBy=invite.createdBy;usersChanged=true;}
  }
  if(usersChanged)writeJson(USERS_FILE,users);
  writeJson(INVITES_FILE,invites);
  if (networkChanged) writeObject(NETWORK_FILE, network);
  await store.flush();
}

const collectionByFile = new Map([
  [USERS_FILE,"users"],[INVITES_FILE,"invites"],[MESSAGES_FILE,"messages"],[AUDIT_FILE,"audit"],
  [NOTIFICATIONS_FILE,"notifications"],[SUPPORT_FILE,"support"],[DEVICES_FILE,"devices"],
  [SESSIONS_FILE,"sessions"],[DEVICE_APPROVALS_FILE,"deviceApprovals"],[PUSH_SUBSCRIPTIONS_FILE,"pushSubscriptions"],[CONTACTS_FILE,"contacts"]
]);
function readJson(filePath) { return store.collection(collectionByFile.get(filePath)); }
function readObject(filePath, fallback = {}) { return filePath === NETWORK_FILE ? store.singleton("network", fallback) : fallback; }
function writeObject(filePath, value) { if(filePath===NETWORK_FILE)store.setSingleton("network",value); }
function writeJson(filePath, value) { const name=collectionByFile.get(filePath); if(!name)throw new Error(`Unknown collection path: ${filePath}`); store.setCollection(name,value); }
function protocolMeta(traceId=crypto.randomUUID()){return{version:PROTOCOL_VERSION,serverVersion:APP_VERSION,traceId,time:new Date().toISOString()};}
function protocolEnvelope(type,payload={},traceId=crypto.randomUUID()){return{protocol:PROTOCOL_VERSION,type,traceId,timestamp:new Date().toISOString(),payload};}
function sendJson(res,statusCode,payload,traceId=crypto.randomUUID()){const value=(payload&&typeof payload==="object"&&!Array.isArray(payload))?{...payload,_protocol:protocolMeta(traceId)}:payload;const body=JSON.stringify(value);res.writeHead(statusCode,{"Content-Type":"application/json; charset=utf-8","Content-Length":Buffer.byteLength(body),"Cache-Control":"no-store","X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY","Referrer-Policy":"no-referrer","X-Fibro-Protocol":PROTOCOL_VERSION,"X-Fibro-Server-Version":APP_VERSION,"X-Trace-Id":traceId});res.end(body);}
function protocolCompatible(req,res){const client=String(req.headers["x-fibro-protocol"]||"").trim();if(!client)return true;const major=(v)=>String(v).split(".")[0];if(major(client)!==major(PROTOCOL_VERSION)){sendJson(res,426,{ok:false,code:"PROTO_INCOMPATIBLE",error:`Клиент использует несовместимый протокол ${client}. Требуется ${MIN_CLIENT_PROTOCOL}.`,requiredProtocol:MIN_CLIENT_PROTOCOL,serverProtocol:PROTOCOL_VERSION});return false;}return true;}
function readBody(req){return new Promise((resolve,reject)=>{let body="";req.on("data",c=>{body+=c;if(body.length>500000){reject(new Error("BODY_TOO_LARGE"));req.destroy();}});req.on("end",()=>{if(!body)return resolve({});try{resolve(JSON.parse(body));}catch{reject(new Error("INVALID_JSON"));}});req.on("error",reject);});}
function hashPassword(password,salt=crypto.randomBytes(16).toString("hex")){return{salt,hash:crypto.scryptSync(password,salt,64).toString("hex")};}
function verifyPassword(password,salt,expectedHash){const actual=Buffer.from(hashPassword(password,salt).hash,"hex");const expected=Buffer.from(expectedHash,"hex");return actual.length===expected.length&&crypto.timingSafeEqual(actual,expected);}
function subscriptionState(user){ if(user.status==="suspended") return "suspended"; if(user.status!=="active") return "pending"; if(!user.subscriptionEndsAt) return "expired"; const left=new Date(user.subscriptionEndsAt).getTime()-Date.now(); if(left<=0) return "expired"; if(left<=7*86400000) return "expiring"; return "active"; }
function subscriptionDaysRemaining(user){ if(!user.subscriptionEndsAt) return 0; return Math.max(0, Math.ceil((new Date(user.subscriptionEndsAt).getTime()-Date.now())/86400000)); }
async function sendWebPush(userId,payload={}){
  const subscriptions=readJson(PUSH_SUBSCRIPTIONS_FILE);
  const targets=subscriptions.filter(item=>item.userId===userId&&item.subscription?.endpoint);
  if(!targets.length)return;
  const expired=new Set();
  await Promise.all(targets.map(async item=>{
    try{
      await webpush.sendNotification(item.subscription,JSON.stringify({title:payload.title||"FibroChat",body:payload.body||"Новое событие",tag:payload.tag||"fibrochat",url:payload.url||"/"}),{TTL:60});
    }catch(error){
      if(error?.statusCode===404||error?.statusCode===410)expired.add(item.id);
      else console.error("Web Push failed:",error?.statusCode||error?.message||error);
    }
  }));
  if(expired.size)writeJson(PUSH_SUBSCRIPTIONS_FILE,subscriptions.filter(item=>!expired.has(item.id)));
}
function notify(userId,type,title,text,details={}){const list=readJson(NOTIFICATIONS_FILE);const item={id:crypto.randomUUID(),userId,type,title,text,details,createdAt:new Date().toISOString(),readAt:null};list.push(item);if(list.length>10000)list.splice(0,list.length-10000);writeJson(NOTIFICATIONS_FILE,list);sendEvent(userId,"notification",publicNotification(item));void sendWebPush(userId,{title,body:text,tag:`notification-${item.id}`,url:"/"});return item;}
function ensureSubscriptionNotifications(user){const list=readJson(NOTIFICATIONS_FILE);const state=subscriptionState(user);const days=subscriptionDaysRemaining(user);let changed=false;const addOnce=(type,title,text)=>{if(!list.some(n=>n.userId===user.id&&n.type===type)){list.push({id:crypto.randomUUID(),userId:user.id,type,title,text,details:{subscriptionEndsAt:user.subscriptionEndsAt||null},createdAt:new Date().toISOString(),readAt:null});changed=true;}};if(state==="expired")addOnce(`SUB_EXPIRED_${user.subscriptionEndsAt||"none"}`,"Подписка истекла","Сетевые функции отключены. Откройте поддержку, чтобы получить инструкции по продлению.");else if(state==="expiring"){for(const threshold of [7,3,1])if(days<=threshold)addOnce(`SUB_EXPIRING_${threshold}_${user.subscriptionEndsAt}`,"Подписка скоро истечёт",`До окончания доступа осталось ${days} дн.`);}if(changed)writeJson(NOTIFICATIONS_FILE,list);}
function publicNotification(n){return{id:n.id,type:n.type,title:n.title,text:n.text,details:n.details||{},createdAt:n.createdAt,readAt:n.readAt||null};}
function publicTicket(t){return{id:t.id,userId:t.userId,userNickname:t.userNickname,status:t.status,subject:t.subject,messages:t.messages||[],createdAt:t.createdAt,updatedAt:t.updatedAt};}
function cleanDeviceName(value){const name=String(value||"").trim().replace(/[<>]/g,"");return (name||"Неизвестное устройство").slice(0,80);}
function validDeviceId(value){return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value||""));}
function publicDevice(device,currentId=null){return{id:device.id,userId:device.userId,name:device.name,status:device.status,createdAt:device.createdAt,approvedAt:device.approvedAt||null,approvedBy:device.approvedBy||null,lastSeenAt:device.lastSeenAt||null,revokedAt:device.revokedAt||null,current:device.id===currentId};}
function createTrustedDevice(userId,deviceId,name,approvedBy="self"){const list=readJson(DEVICES_FILE);const now=new Date().toISOString();const device={id:deviceId,userId,name:cleanDeviceName(name),status:"trusted",createdAt:now,approvedAt:now,approvedBy,lastSeenAt:now,revokedAt:null};list.push(device);writeJson(DEVICES_FILE,list);return device;}
function publicUser(user){return{id:user.id,fibroId:user.fibroId||null,nickname:user.nickname,role:user.role,status:user.status,createdAt:user.createdAt,approvedAt:user.approvedAt||null,approvedBy:user.approvedBy||null,subscriptionEndsAt:user.subscriptionEndsAt||null,subscriptionState:subscriptionState(user),subscriptionDaysRemaining:subscriptionDaysRemaining(user),keysConfigured:Boolean(user.encryptionPublicKey&&user.signingPublicKey),encryptionPublicKey:user.encryptionPublicKey||null,signingPublicKey:user.signingPublicKey||null};}
function audit(type, actorId, targetId=null, details={}) { const events=readJson(AUDIT_FILE); events.push({id:crypto.randomUUID(),type,actorId:actorId||null,targetId,details,createdAt:new Date().toISOString()}); if(events.length>5000) events.splice(0,events.length-5000); writeJson(AUDIT_FILE,events); }
function publicMessage(message){return{id:message.id,senderId:message.senderId,recipientId:message.recipientId,envelope:message.envelope,signature:message.signature,createdAt:message.createdAt,deliveredAt:message.deliveredAt||null,readAt:message.readAt||null,deliveryAttempts:Number(message.deliveryAttempts)||0,lastAttemptAt:message.lastAttemptAt||null,nextAttemptAt:message.nextAttemptAt||null};}
function deliveryDelay(attempt){return Math.min(DELIVERY_MAX_BACKOFF_MS,Math.max(5_000,5_000*(2**Math.min(Math.max(attempt-1,0),6))));}
function processDeliveryQueue(){
  const messages=readJson(MESSAGES_FILE);
  const now=Date.now();
  let changed=false;
  for(const message of messages){
    if(message.deliveredAt||message.readAt)continue;
    message.deliveryAttempts=Number(message.deliveryAttempts)||0;
    const due=!message.nextAttemptAt||new Date(message.nextAttemptAt).getTime()<=now;
    if(!due)continue;
    message.deliveryAttempts+=1;
    message.lastAttemptAt=new Date(now).toISOString();
    message.nextAttemptAt=new Date(now+deliveryDelay(message.deliveryAttempts)).toISOString();
    changed=true;
    if(isOnline(message.recipientId)){
      sendEvent(message.recipientId,"message:new",{messageId:message.id,senderId:message.senderId,retry:true,attempt:message.deliveryAttempts});
    }
    sendEvent(message.senderId,"message:status",{messageId:message.id,deliveryAttempts:message.deliveryAttempts,lastAttemptAt:message.lastAttemptAt,nextAttemptAt:message.nextAttemptAt});
  }
  if(changed)writeJson(MESSAGES_FILE,messages);
}
setInterval(processDeliveryQueue,DELIVERY_SCAN_MS).unref();

function sendEvent(userId,type,payload={}){
  const clients=eventClients.get(userId);
  if(!clients||clients.size===0)return;
  const packet=`event: ${type}\ndata: ${JSON.stringify(protocolEnvelope(type,payload))}\n\n`;
  for(const res of [...clients]){try{res.write(packet);}catch{clients.delete(res);}}
  if(clients.size===0)eventClients.delete(userId);
}
function openEventStream(req,res,auth){
  res.writeHead(200,{
    "Content-Type":"text/event-stream; charset=utf-8",
    "Cache-Control":"no-cache, no-transform",
    "Connection":"keep-alive",
    "X-Accel-Buffering":"no",
    "X-Content-Type-Options":"nosniff",
    "X-Frame-Options":"DENY",
    "Referrer-Policy":"no-referrer"
  });
  res.write(`event: connected\ndata: ${JSON.stringify(protocolEnvelope("connected",{ok:true,userId:auth.user.id,capabilities:PROTOCOL_CAPABILITIES}))}\n\n`);
  let clients=eventClients.get(auth.user.id);
  if(!clients){clients=new Set();eventClients.set(auth.user.id,clients);}
  clients.add(res);
  presence.set(auth.user.id,Date.now());
  const cleanup=()=>{clients.delete(res);if(clients.size===0)eventClients.delete(auth.user.id);};
  req.on("close",cleanup);
  req.on("error",cleanup);
}
setInterval(()=>{for(const [userId,clients] of eventClients.entries()){for(const res of [...clients]){try{res.write(`: heartbeat ${Date.now()}\n\n`);}catch{clients.delete(res);}}if(clients.size===0)eventClients.delete(userId);}},20000).unref();

function tokenHash(value){return crypto.createHash("sha256").update(String(value||"")).digest("hex");}
function clientIp(req){const forwarded=String(req.headers["x-forwarded-for"]||"").split(",")[0].trim();return forwarded||req.socket.remoteAddress||"unknown";}
function cleanupSessions(){const now=Date.now();const stored=readJson(SESSIONS_FILE);let changed=false;for(const item of stored){if(!item.revokedAt&&new Date(item.expiresAt).getTime()<=now){item.revokedAt=new Date().toISOString();item.revokeReason="expired";changed=true;}}if(changed)writeJson(SESSIONS_FILE,stored);for(const [token,item] of accessTokens.entries())if(item.expiresAt<=now)accessTokens.delete(token);}
function issueAccessToken(session){const token=crypto.randomBytes(32).toString("base64url");const expiresAt=Date.now()+ACCESS_TTL_MS;accessTokens.set(token,{sessionId:session.id,userId:session.userId,deviceId:session.deviceId,expiresAt});presence.set(session.userId,Date.now());return{token,expiresIn:Math.floor(ACCESS_TTL_MS/1000)};}
function createSession(userId,deviceId){cleanupSessions();const refreshToken=crypto.randomBytes(48).toString("base64url");const now=new Date();const session={id:crypto.randomUUID(),userId,deviceId,refreshHash:tokenHash(refreshToken),createdAt:now.toISOString(),lastUsedAt:now.toISOString(),expiresAt:new Date(now.getTime()+REFRESH_TTL_MS).toISOString(),revokedAt:null,revokeReason:null};const list=readJson(SESSIONS_FILE);list.push(session);if(list.length>10000)list.splice(0,list.length-10000);writeJson(SESSIONS_FILE,list);return{...issueAccessToken(session),refreshToken,sessionId:session.id};}
function revokeSession(sessionId,reason="logout"){const list=readJson(SESSIONS_FILE);const item=list.find(x=>x.id===sessionId);if(item&&!item.revokedAt){item.revokedAt=new Date().toISOString();item.revokeReason=reason;writeJson(SESSIONS_FILE,list);}for(const [token,value] of accessTokens.entries())if(value.sessionId===sessionId)accessTokens.delete(token);}
function revokeUserSessions(userId,reason="logout_all"){const list=readJson(SESSIONS_FILE);let changed=false;for(const item of list)if(item.userId===userId&&!item.revokedAt){item.revokedAt=new Date().toISOString();item.revokeReason=reason;changed=true;}if(changed)writeJson(SESSIONS_FILE,list);for(const [token,value] of accessTokens.entries())if(value.userId===userId)accessTokens.delete(token);}
function revokeDeviceSessions(userId,deviceId,reason="device_revoked"){const list=readJson(SESSIONS_FILE);let changed=false;for(const item of list)if(item.userId===userId&&item.deviceId===deviceId&&!item.revokedAt){item.revokedAt=new Date().toISOString();item.revokeReason=reason;changed=true;}if(changed)writeJson(SESSIONS_FILE,list);for(const [token,value] of accessTokens.entries())if(value.userId===userId&&value.deviceId===deviceId)accessTokens.delete(token);}
function getSessionUser(req){cleanupSessions();const a=req.headers.authorization||"";const token=a.startsWith("Bearer ")?a.slice(7):"";if(!token)return null;const access=accessTokens.get(token);if(!access||access.expiresAt<Date.now()){accessTokens.delete(token);return null;}const session=readJson(SESSIONS_FILE).find(x=>x.id===access.sessionId&&!x.revokedAt&&new Date(x.expiresAt).getTime()>Date.now());if(!session){accessTokens.delete(token);return null;}const user=readJson(USERS_FILE).find(x=>x.id===access.userId);if(!user)return null;const device=readJson(DEVICES_FILE).find(d=>d.id===access.deviceId&&d.userId===user.id&&d.status==="trusted");if(!device){revokeSession(session.id,"device_untrusted");return null;}presence.set(user.id,Date.now());return{token,session,user,device};}
function loginKey(req,nickname){return `${clientIp(req)}|${String(nickname||"").toLowerCase()}`;}
function loginBlocked(req,nickname){const key=loginKey(req,nickname);const item=loginAttempts.get(key);if(!item)return 0;if(item.blockedUntil>Date.now())return item.blockedUntil-Date.now();if(Date.now()-item.windowStart>LOGIN_WINDOW_MS)loginAttempts.delete(key);return 0;}
function registerLoginFailure(req,nickname){const key=loginKey(req,nickname);const now=Date.now();let item=loginAttempts.get(key);if(!item||now-item.windowStart>LOGIN_WINDOW_MS)item={count:0,windowStart:now,blockedUntil:0};item.count+=1;if(item.count>=LOGIN_MAX_FAILURES)item.blockedUntil=now+LOGIN_BLOCK_MS;loginAttempts.set(key,item);return item;}
function clearLoginFailures(req,nickname){loginAttempts.delete(loginKey(req,nickname));}

function createFibroId(existingUsers=[]){
  const used=new Set(existingUsers.map(user=>String(user.fibroId||"").toUpperCase()));
  for(let attempt=0;attempt<1000;attempt++){
    const hex=crypto.randomBytes(6).toString("hex").toUpperCase();
    const value=`FIBRO-${hex.slice(0,4)}-${hex.slice(4,8)}-${hex.slice(8,12)}`;
    if(!used.has(value))return value;
  }
  throw new Error("Не удалось создать уникальный Fibro ID");
}
function normalizeFibroId(value){return String(value||"").trim().toUpperCase();}
function contactKey(userId,contactUserId){return `${userId}:${contactUserId}`;}
function ensureContactPair(userA,userB,source="fibro_id"){
  if(!userA||!userB||userA===userB)return false;
  const list=readJson(CONTACTS_FILE);let changed=false;const now=new Date().toISOString();
  for(const [userId,contactUserId] of [[userA,userB],[userB,userA]]){
    if(!list.some(item=>item.userId===userId&&item.contactUserId===contactUserId)){
      list.push({id:crypto.randomUUID(),userId,contactUserId,source,createdAt:now});changed=true;
    }
  }
  if(changed)writeJson(CONTACTS_FILE,list);
  return changed;
}
function visibleContactIds(user,users,messages,contacts,network){
  const ids=new Set();
  for(const item of contacts)if(item.userId===user.id)ids.add(item.contactUserId);
  for(const message of messages){
    if(message.senderId===user.id)ids.add(message.recipientId);
    if(message.recipientId===user.id)ids.add(message.senderId);
  }
  if(user.invitedBy)ids.add(user.invitedBy);
  if(user.role==="admin"){
    if(network.headUserId)ids.add(network.headUserId);
    for(const candidate of users)if(candidate.invitedBy===user.id)ids.add(candidate.id);
  }else if(user.role==="super_admin"){
    for(const candidate of users)if(candidate.role==="admin"||candidate.invitedBy===user.id)ids.add(candidate.id);
  }
  ids.delete(user.id);return ids;
}
function canContact(user,recipientId){
  const users=readJson(USERS_FILE);const network=readObject(NETWORK_FILE,{});
  return visibleContactIds(user,users,readJson(MESSAGES_FILE),readJson(CONTACTS_FILE),network).has(recipientId);
}
function requireAuth(req,res){const auth=getSessionUser(req);if(!auth){sendJson(res,401,{ok:false,error:"Требуется вход"});return null;}return auth;}
function requireActive(req,res){const auth=requireAuth(req,res);if(!auth)return null;const expired=auth.user.subscriptionEndsAt&&new Date(auth.user.subscriptionEndsAt).getTime()<=Date.now();if(auth.user.status!=="active"||expired){sendJson(res,403,{ok:false,error:expired?"Срок подписки истёк":"Аккаунт ещё не подтверждён"});return null;}return auth;}
function requireAdmin(req,res){const auth=requireAuth(req,res);if(!auth)return null;if(!["admin","super_admin"].includes(auth.user.role)){sendJson(res,403,{ok:false,error:"Недостаточно прав"});return null;}return auth;}
function requireHead(req,res){const auth=requireAuth(req,res);if(!auth)return null;if(auth.user.role!=="super_admin"){sendJson(res,403,{ok:false,error:"Это действие может выполнить только головное устройство"});return null;}const network=readObject(NETWORK_FILE,{});if(network.headUserId&&network.headUserId!==auth.user.id){sendJson(res,403,{ok:false,error:"Аккаунт не является владельцем головного узла"});return null;}return auth;}
function resolveClientFile(pathname){const requested=pathname==="/"?"/index.html":pathname;const normalized=path.normalize(decodeURIComponent(requested)).replace(/^([/\\])+/,'');const absolute=path.resolve(CLIENT_DIR,normalized);return absolute.startsWith(CLIENT_DIR+path.sep)||absolute===CLIENT_DIR?absolute:null;}
function serveStatic(res,pathname){const filePath=resolveClientFile(pathname);if(!filePath){res.writeHead(403,{"Content-Type":"text/plain; charset=utf-8"});return res.end("Доступ запрещён");}fs.stat(filePath,(error,stats)=>{if(error||!stats.isFile()){res.writeHead(404,{"Content-Type":"text/plain; charset=utf-8"});return res.end("Файл не найден");}const ext=path.extname(filePath).toLowerCase();res.writeHead(200,{"Content-Type":MIME_TYPES[ext]||"application/octet-stream","Cache-Control":ext===".html"?"no-store":"public, max-age=60","X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY","Referrer-Policy":"no-referrer"});fs.createReadStream(filePath).pipe(res);});}
function isOnline(userId){return Date.now()-(presence.get(userId)||0)<ONLINE_TTL_MS;}
function validPublicJwk(jwk, expectedUse) {
  if (!jwk || typeof jwk !== "object") return false;
  if (jwk.kty !== "EC" || jwk.crv !== "P-256") return false;
  if (typeof jwk.x !== "string" || typeof jwk.y !== "string") return false;
  if (jwk.d !== undefined) return false; // Сервер принимает только публичную часть.

  // Web Crypto экспортирует публичный ECDH-ключ с key_ops: [].
  // Это корректно: deriveKey выполняется приватным ключом, а публичный
  // передаётся как параметр алгоритма. Для ECDSA ожидаем verify.
  if (expectedUse === "verify" && Array.isArray(jwk.key_ops) && !jwk.key_ops.includes("verify")) {
    return false;
  }

  return true;
}
function canonicalEnvelope(e){return JSON.stringify({version:e.version,messageId:e.messageId,senderId:e.senderId,recipientId:e.recipientId,createdAt:e.createdAt,algorithm:e.algorithm,ephemeralPublicKey:e.ephemeralPublicKey,ciphertext:e.ciphertext,contentIv:e.contentIv,keyBoxes:e.keyBoxes});}
async function verifyEnvelopeSignature(envelope,signature,publicJwk){try{const key=await crypto.webcrypto.subtle.importKey("jwk",publicJwk,{name:"ECDSA",namedCurve:"P-256"},false,["verify"]);return crypto.webcrypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},key,Buffer.from(signature,"base64"),Buffer.from(canonicalEnvelope(envelope),"utf8"));}catch{return false;}}
function validEnvelope(e,senderId,recipientId){if(!e||e.version!==1||e.senderId!==senderId||e.recipientId!==recipientId)return false;if(typeof e.messageId!=="string"||typeof e.createdAt!=="string"||e.algorithm!=="ECDH-P256/HKDF-SHA256/AES-256-GCM")return false;if(!validPublicJwk(e.ephemeralPublicKey,"deriveKey")&&!(e.ephemeralPublicKey&&e.ephemeralPublicKey.kty==="EC"&&e.ephemeralPublicKey.crv==="P-256"))return false;if(typeof e.ciphertext!=="string"||typeof e.contentIv!=="string"||!e.keyBoxes||typeof e.keyBoxes!=="object")return false;for(const id of [senderId,recipientId]){const b=e.keyBoxes[id];if(!b||typeof b.iv!=="string"||typeof b.wrappedKey!=="string")return false;}return true;}


function cleanNetworkName(value){return String(value||"").trim().replace(/[<>]/g,"").slice(0,80)||"FibroChat Network";}
function normalizeBaseUrl(value){const text=String(value||"").trim().replace(/\/+$/,"");if(!text)return "";try{const u=new URL(text);if(!["http:","https:"].includes(u.protocol))return "";return u.origin+u.pathname.replace(/\/$/,"");}catch{return "";}}
function requestBaseUrl(req,network){const configured=normalizeBaseUrl(network.publicBaseUrl);if(configured)return configured;const proto=String(req.headers["x-forwarded-proto"]||"http").split(",")[0].trim();return `${proto}://${req.headers.host||`localhost:${PORT}`}`;}
function publicNetwork(network,req=null){return{networkId:network.networkId,networkName:network.networkName,nodeId:network.nodeId,protocolVersion:network.protocolVersion||"1.0",baseUrl:req?requestBaseUrl(req,network):(network.publicBaseUrl||""),createdAt:network.createdAt,activatedAt:network.activatedAt||null,headNickname:network.headNickname||null,signingPublicKey:network.signingPublicKey};}
function canonicalNetworkProfile(profile){return JSON.stringify({format:profile.format,version:profile.version,network:{networkId:profile.network.networkId,networkName:profile.network.networkName,nodeId:profile.network.nodeId,protocolVersion:profile.network.protocolVersion,baseUrl:profile.network.baseUrl,createdAt:profile.network.createdAt,activatedAt:profile.network.activatedAt,headNickname:profile.network.headNickname,signingPublicKey:profile.network.signingPublicKey}});}
function createNetworkProfile(req){const network=readObject(NETWORK_FILE,{});const profile={format:"fibrochat-network-profile",version:1,network:publicNetwork(network,req)};const privateKey=crypto.createPrivateKey({key:network.signingPrivateKey,format:"jwk"});profile.signature=crypto.sign("sha256",Buffer.from(canonicalNetworkProfile(profile),"utf8"),{key:privateKey,dsaEncoding:"ieee-p1363"}).toString("base64");return profile;}
function sendDownloadJson(res,fileName,payload){const body=JSON.stringify(payload,null,2)+"\n";res.writeHead(200,{"Content-Type":"application/json; charset=utf-8","Content-Length":Buffer.byteLength(body),"Content-Disposition":`attachment; filename="${fileName}"`,"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});res.end(body);}
function createEncryptedNetworkBackup(password){const files={users:readJson(USERS_FILE),invites:readJson(INVITES_FILE),messages:readJson(MESSAGES_FILE),audit:readJson(AUDIT_FILE),notifications:readJson(NOTIFICATIONS_FILE),support:readJson(SUPPORT_FILE),devices:readJson(DEVICES_FILE),sessions:readJson(SESSIONS_FILE),contacts:readJson(CONTACTS_FILE)};const snapshot={format:"fibrochat-network-snapshot",version:1,exportedAt:new Date().toISOString(),network:readObject(NETWORK_FILE,{}),data:files};const salt=crypto.randomBytes(16);const iv=crypto.randomBytes(12);const key=crypto.scryptSync(password,salt,32,{N:16384,r:8,p:1});const cipher=crypto.createCipheriv("aes-256-gcm",key,iv);const plaintext=Buffer.from(JSON.stringify(snapshot),"utf8");const ciphertext=Buffer.concat([cipher.update(plaintext),cipher.final()]);return{format:"fibrochat-encrypted-network-backup",version:1,createdAt:new Date().toISOString(),encryption:{algorithm:"AES-256-GCM",kdf:"scrypt",N:16384,r:8,p:1,salt:salt.toString("base64"),iv:iv.toString("base64"),tag:cipher.getAuthTag().toString("base64")},ciphertext:ciphertext.toString("base64")};}


function revokeOtherUserSessions(userId,currentSessionId,reason="password_changed"){
  const list=readJson(SESSIONS_FILE);let changed=false;
  for(const item of list)if(item.userId===userId&&item.id!==currentSessionId&&!item.revokedAt){item.revokedAt=new Date().toISOString();item.revokeReason=reason;changed=true;}
  if(changed)writeJson(SESSIONS_FILE,list);
  for(const [token,value] of accessTokens.entries())if(value.userId===userId&&value.sessionId!==currentSessionId)accessTokens.delete(token);
}
function createDeviceApproval(userId,deviceId){
  const token=crypto.randomBytes(32).toString("base64url");const now=Date.now();
  const list=readJson(DEVICE_APPROVALS_FILE).filter(x=>new Date(x.expiresAt).getTime()>now&&x.status==="pending");
  const item={id:crypto.randomUUID(),userId,deviceId,tokenHash:tokenHash(token),status:"pending",createdAt:new Date(now).toISOString(),expiresAt:new Date(now+DEVICE_APPROVAL_TTL_MS).toISOString(),approvedAt:null,approvedBy:null};
  list.push(item);writeJson(DEVICE_APPROVALS_FILE,list);
  return{item,token,qrPayload:`fibrochat://device-approve?token=${encodeURIComponent(token)}`};
}

async function handleApi(req,res,pathname,searchParams){
  if(!protocolCompatible(req,res))return true;
  if(pathname==="/api/health"&&req.method==="GET"){const network=readObject(NETWORK_FILE,{});const users=readJson(USERS_FILE);sendJson(res,200,{ok:true,service:"FibroChat Head Node",version:APP_VERSION,nodeId:network.nodeId,networkId:network.networkId,networkName:network.networkName,bootstrapRequired:!users.some(x=>x.role==="super_admin"),protocolVersion:PROTOCOL_VERSION,minClientProtocol:MIN_CLIENT_PROTOCOL,capabilities:PROTOCOL_CAPABILITIES,encryption:"client-side",realtime:"sse-fetch-stream",deliveryQueue:"persistent-retry",database:store.mode,clusterReady:true,time:new Date().toISOString()});return true;}
  if(pathname==="/api/push/public-key"&&req.method==="GET"){const auth=requireAuth(req,res);if(!auth)return true;const network=readObject(NETWORK_FILE,{});sendJson(res,200,{ok:true,publicKey:network.webPushVapid?.publicKey||""});return true;}
  if(pathname==="/api/push/subscribe"&&req.method==="POST"){const auth=requireAuth(req,res);if(!auth)return true;const body=await readBody(req);const subscription=body.subscription;if(!subscription?.endpoint||!subscription?.keys?.p256dh||!subscription?.keys?.auth)return sendJson(res,400,{ok:false,error:"Некорректная push-подписка"}),true;const list=readJson(PUSH_SUBSCRIPTIONS_FILE);const now=new Date().toISOString();let item=list.find(x=>x.subscription?.endpoint===subscription.endpoint);if(item){item.userId=auth.user.id;item.deviceId=auth.device.id;item.subscription=subscription;item.updatedAt=now;}else{item={id:crypto.randomUUID(),userId:auth.user.id,deviceId:auth.device.id,subscription,createdAt:now,updatedAt:now};list.push(item);}writeJson(PUSH_SUBSCRIPTIONS_FILE,list);sendJson(res,200,{ok:true});return true;}
  if(pathname==="/api/push/subscribe"&&req.method==="DELETE"){const auth=requireAuth(req,res);if(!auth)return true;const body=await readBody(req);const endpoint=String(body.endpoint||"");const list=readJson(PUSH_SUBSCRIPTIONS_FILE);writeJson(PUSH_SUBSCRIPTIONS_FILE,list.filter(x=>!(x.userId===auth.user.id&&x.subscription?.endpoint===endpoint)));sendJson(res,200,{ok:true});return true;}

  if(pathname==="/api/protocol"&&req.method==="GET"){sendJson(res,200,{ok:true,protocol:{name:"Fibro Protocol",version:PROTOCOL_VERSION,minClientProtocol:MIN_CLIENT_PROTOCOL,serverVersion:APP_VERSION,transport:["HTTP/JSON","SSE"],capabilities:PROTOCOL_CAPABILITIES,errorFormat:{code:"STRING",error:"Human readable text",traceId:"UUID in _protocol"},eventEnvelope:{protocol:"STRING",type:"STRING",traceId:"UUID",timestamp:"ISO-8601",payload:"OBJECT"}}});return true;}
  if(pathname==="/api/network/public"&&req.method==="GET"){const network=readObject(NETWORK_FILE,{});sendJson(res,200,{ok:true,network:publicNetwork(network,req)});return true;}
  if(pathname==="/api/network/profile"&&req.method==="GET"){sendDownloadJson(res,`${readObject(NETWORK_FILE,{}).networkId||"fibrochat"}.fibronet.json`,createNetworkProfile(req));return true;}
  if(pathname==="/api/events"&&req.method==="GET"){const auth=requireAuth(req,res);if(!auth)return true;openEventStream(req,res,auth);return true;}
  if(pathname==="/api/register"&&req.method==="POST"){
    const body=await readBody(req);const inviteCode=String(body.invite||"").trim();const nickname=String(body.nickname||"").trim();const password=String(body.password||"");const deviceId=String(body.deviceId||"");const deviceName=cleanDeviceName(body.deviceName);
    if(nickname.length<2||nickname.length>32)return sendJson(res,400,{ok:false,error:"Никнейм: от 2 до 32 символов"}),true;
    if(password.length<8)return sendJson(res,400,{ok:false,error:"Пароль должен содержать минимум 8 символов"}),true;
    if(!validDeviceId(deviceId))return sendJson(res,400,{ok:false,error:"Некорректный идентификатор устройства"}),true;
    if(!validPublicJwk(body.encryptionPublicKey,"deriveKey")||!validPublicJwk(body.signingPublicKey,"verify"))return sendJson(res,400,{ok:false,error:"Некорректные публичные ключи устройства"}),true;
    const users=readJson(USERS_FILE);if(users.some(x=>x.nickname.toLowerCase()===nickname.toLowerCase()))return sendJson(res,409,{ok:false,error:"Такой никнейм уже занят"}),true;
    let role="user",status="pending",invitedBy=null,usedInvite=null;if(inviteCode===OWNER_INVITE&&!users.some(x=>x.role==="super_admin")){role="super_admin";status="active";}else{const invites=readJson(INVITES_FILE);const invite=invites.find(x=>x.code===inviteCode&&!x.usedAt&&new Date(x.expiresAt).getTime()>Date.now());if(!invite)return sendJson(res,400,{ok:false,error:"Инвайт недействителен или уже использован"}),true;role=invite.role||"user";invitedBy=invite.createdBy||null;usedInvite=invite;invite.usedAt=new Date().toISOString();invite.usedByNickname=nickname;writeJson(INVITES_FILE,invites);}
    const credentials=hashPassword(password);const now=new Date();const user={id:crypto.randomUUID(),fibroId:createFibroId(users),nickname,passwordSalt:credentials.salt,passwordHash:credentials.hash,role,status,invitedBy,createdAt:now.toISOString(),approvedAt:status==="active"?now.toISOString():null,approvedBy:status==="active"?"self-bootstrap":null,subscriptionEndsAt:status==="active"?new Date(now.getTime()+SUBSCRIPTION_DAYS*86400000).toISOString():null,encryptionPublicKey:body.encryptionPublicKey,signingPublicKey:body.signingPublicKey,keyCreatedAt:now.toISOString()};users.push(user);if(usedInvite){usedInvite.usedByUserId=user.id;writeJson(INVITES_FILE,readJson(INVITES_FILE).map(item=>item.id===usedInvite.id?usedInvite:item));}writeJson(USERS_FILE,users);if(role==="super_admin"){const network=readObject(NETWORK_FILE,{});network.headUserId=user.id;network.headNickname=user.nickname;network.activatedAt=now.toISOString();writeObject(NETWORK_FILE,network);}const device=createTrustedDevice(user.id,deviceId,deviceName,"registration");audit("USER_REGISTERED",user.id,user.id,{role,status});audit("DEVICE_TRUSTED",user.id,device.id,{name:device.name,source:"registration"});const session=createSession(user.id,device.id);sendJson(res,201,{ok:true,...session,user:publicUser(user),device:publicDevice(device,device.id)});return true;
  }
  if(pathname==="/api/login"&&req.method==="POST"){
    const body=await readBody(req);const nickname=String(body.nickname||"").trim();const password=String(body.password||"");const deviceId=String(body.deviceId||"");const deviceName=cleanDeviceName(body.deviceName);
    const blockedMs=loginBlocked(req,nickname);if(blockedMs>0){audit("LOGIN_RATE_LIMITED",null,null,{nickname,ip:clientIp(req),retryAfterSeconds:Math.ceil(blockedMs/1000)});res.setHeader("Retry-After",String(Math.ceil(blockedMs/1000)));return sendJson(res,429,{ok:false,code:"LOGIN_RATE_LIMITED",error:`Слишком много попыток входа. Повторите через ${Math.ceil(blockedMs/60000)} мин.`}),true;}
    if(!validDeviceId(deviceId))return sendJson(res,400,{ok:false,error:"Некорректный идентификатор устройства"}),true;
    const user=readJson(USERS_FILE).find(x=>x.nickname.toLowerCase()===nickname.toLowerCase());if(!user||!verifyPassword(password,user.passwordSalt,user.passwordHash)){const attempt=registerLoginFailure(req,nickname);audit(attempt.blockedUntil>Date.now()?"LOGIN_BLOCKED":"LOGIN_FAILED",user?.id||null,user?.id||null,{nickname,ip:clientIp(req),attempts:attempt.count});return sendJson(res,401,{ok:false,error:"Неверный никнейм или пароль"}),true;}clearLoginFailures(req,nickname);
    const devices=readJson(DEVICES_FILE);let device=devices.find(d=>d.id===deviceId&&d.userId===user.id);const userDevices=devices.filter(d=>d.userId===user.id);
    if(!device&&userDevices.length===0){device=createTrustedDevice(user.id,deviceId,deviceName,"legacy-migration");audit("DEVICE_TRUSTED",user.id,device.id,{name:device.name,source:"legacy-migration"});}
    else if(!device){const now=new Date().toISOString();device={id:deviceId,userId:user.id,name:deviceName,status:"pending",createdAt:now,approvedAt:null,approvedBy:null,lastSeenAt:now,revokedAt:null};devices.push(device);writeJson(DEVICES_FILE,devices);notify(user.id,"DEVICE_APPROVAL_REQUIRED","Новое устройство ожидает подтверждения",`Попытка входа с устройства «${device.name}». Подтвердите его на уже доверенном устройстве.`,{deviceId:device.id});const approval=createDeviceApproval(user.id,device.id);audit("DEVICE_PENDING",user.id,device.id,{name:device.name,approvalId:approval.item.id});return sendJson(res,403,{ok:false,code:"DEVICE_APPROVAL_REQUIRED",error:"Новое устройство ожидает подтверждения. Откройте FibroChat на уже доверенном устройстве и подтвердите вход.",approvalId:approval.item.id,qrPayload:approval.qrPayload,expiresAt:approval.item.expiresAt}),true;}
    if(device.status==="revoked")return sendJson(res,403,{ok:false,code:"DEVICE_REVOKED",error:"Доступ этого устройства отозван"}),true;
    if(device.status!=="trusted")return sendJson(res,403,{ok:false,code:"DEVICE_APPROVAL_REQUIRED",error:"Устройство ещё не подтверждено"}),true;
    const all=readJson(DEVICES_FILE);const stored=all.find(d=>d.id===device.id);if(stored){stored.lastSeenAt=new Date().toISOString();stored.name=deviceName||stored.name;writeJson(DEVICES_FILE,all);device=stored;}
    const session=createSession(user.id,device.id);audit("LOGIN_SUCCESS",user.id,user.id,{deviceId:device.id,sessionId:session.sessionId});sendJson(res,200,{ok:true,...session,user:publicUser(user),device:publicDevice(device,device.id)});return true;
  }
  if(pathname==="/api/session/refresh"&&req.method==="POST"){const body=await readBody(req);const refreshToken=String(body.refreshToken||"");const deviceId=String(body.deviceId||"");if(!refreshToken||!validDeviceId(deviceId))return sendJson(res,401,{ok:false,code:"REFRESH_INVALID",error:"Сессия недействительна"}),true;cleanupSessions();const list=readJson(SESSIONS_FILE);const hash=tokenHash(refreshToken);const session=list.find(x=>x.refreshHash===hash&&x.deviceId===deviceId&&!x.revokedAt&&new Date(x.expiresAt).getTime()>Date.now());if(!session){audit("REFRESH_REJECTED",null,null,{deviceId,ip:clientIp(req)});return sendJson(res,401,{ok:false,code:"REFRESH_INVALID",error:"Сессия истекла. Войдите снова."}),true;}const device=readJson(DEVICES_FILE).find(d=>d.id===deviceId&&d.userId===session.userId&&d.status==="trusted");if(!device){revokeSession(session.id,"device_untrusted");return sendJson(res,401,{ok:false,code:"DEVICE_REVOKED",error:"Доступ устройства отозван"}),true;}const nextRefresh=crypto.randomBytes(48).toString("base64url");session.refreshHash=tokenHash(nextRefresh);session.lastUsedAt=new Date().toISOString();writeJson(SESSIONS_FILE,list);const access=issueAccessToken(session);sendJson(res,200,{ok:true,...access,refreshToken:nextRefresh,sessionId:session.id});return true;}
  if(pathname==="/api/keys"&&req.method==="POST"){const auth=requireAuth(req,res);if(!auth)return true;if(auth.user.encryptionPublicKey||auth.user.signingPublicKey)return sendJson(res,409,{ok:false,error:"Ключи этого аккаунта уже зарегистрированы"}),true;const body=await readBody(req);if(!validPublicJwk(body.encryptionPublicKey,"deriveKey")||!validPublicJwk(body.signingPublicKey,"verify"))return sendJson(res,400,{ok:false,error:"Некорректные публичные ключи"}),true;const users=readJson(USERS_FILE);const user=users.find(x=>x.id===auth.user.id);user.encryptionPublicKey=body.encryptionPublicKey;user.signingPublicKey=body.signingPublicKey;user.keyCreatedAt=new Date().toISOString();writeJson(USERS_FILE,users);sendJson(res,200,{ok:true,user:publicUser(user)});return true;}
  if(pathname==="/api/logout"&&req.method==="POST"){const auth=requireAuth(req,res);if(!auth)return true;revokeSession(auth.session.id,"logout");presence.delete(auth.user.id);audit("SESSION_LOGOUT",auth.user.id,auth.session.id,{deviceId:auth.device.id});sendJson(res,200,{ok:true});return true;}
  if(pathname==="/api/logout-all"&&req.method==="POST"){const auth=requireAuth(req,res);if(!auth)return true;revokeUserSessions(auth.user.id,"logout_all");presence.delete(auth.user.id);audit("ALL_SESSIONS_REVOKED",auth.user.id,auth.user.id,{deviceId:auth.device.id});sendJson(res,200,{ok:true});return true;}
  if(pathname==="/api/me"&&req.method==="GET"){const auth=requireAuth(req,res);if(!auth)return true;sendJson(res,200,{ok:true,user:publicUser(auth.user),device:publicDevice(auth.device,auth.device.id)});return true;}
  if(pathname==="/api/account/password"&&req.method==="POST"){
    const auth=requireAuth(req,res);if(!auth)return true;const body=await readBody(req);
    const currentPassword=String(body.currentPassword||"");const newPassword=String(body.newPassword||"");
    if(newPassword.length<10)return sendJson(res,400,{ok:false,error:"Новый пароль должен содержать минимум 10 символов"}),true;
    if(currentPassword===newPassword)return sendJson(res,400,{ok:false,error:"Новый пароль должен отличаться от текущего"}),true;
    if(!verifyPassword(currentPassword,auth.user.passwordSalt,auth.user.passwordHash))return sendJson(res,401,{ok:false,error:"Текущий пароль указан неверно"}),true;
    const users=readJson(USERS_FILE);const user=users.find(x=>x.id===auth.user.id);const credentials=hashPassword(newPassword);
    user.passwordSalt=credentials.salt;user.passwordHash=credentials.hash;user.passwordChangedAt=new Date().toISOString();writeJson(USERS_FILE,users);
    revokeOtherUserSessions(user.id,auth.session.id,"password_changed");audit("PASSWORD_CHANGED",user.id,user.id,{deviceId:auth.device.id});
    notify(user.id,"PASSWORD_CHANGED","Пароль изменён","Пароль аккаунта успешно изменён. Остальные сессии завершены.",{});
    await store.flush();sendJson(res,200,{ok:true});return true;
  }
  if(pathname==="/api/device-approvals/status"&&req.method==="GET"){
    const token=String(searchParams.get("token")||"");const item=readJson(DEVICE_APPROVALS_FILE).find(x=>x.tokenHash===tokenHash(token));
    if(!item||new Date(item.expiresAt).getTime()<=Date.now())return sendJson(res,404,{ok:false,code:"APPROVAL_EXPIRED",error:"Запрос подтверждения не найден или истёк"}),true;
    sendJson(res,200,{ok:true,status:item.status,deviceId:item.deviceId,expiresAt:item.expiresAt});return true;
  }
  if(pathname==="/api/device-approvals/confirm"&&req.method==="POST"){
    const auth=requireAuth(req,res);if(!auth)return true;const body=await readBody(req);const token=String(body.token||"");
    const approvals=readJson(DEVICE_APPROVALS_FILE);const item=approvals.find(x=>x.tokenHash===tokenHash(token)&&x.userId===auth.user.id&&x.status==="pending");
    if(!item||new Date(item.expiresAt).getTime()<=Date.now())return sendJson(res,404,{ok:false,error:"QR-запрос не найден или истёк"}),true;
    const devices=readJson(DEVICES_FILE);const device=devices.find(d=>d.id===item.deviceId&&d.userId===auth.user.id);
    if(!device)return sendJson(res,404,{ok:false,error:"Устройство не найдено"}),true;
    device.status="trusted";device.approvedAt=new Date().toISOString();device.approvedBy=auth.device.id;item.status="approved";item.approvedAt=device.approvedAt;item.approvedBy=auth.device.id;
    writeJson(DEVICES_FILE,devices);writeJson(DEVICE_APPROVALS_FILE,approvals);audit("DEVICE_APPROVED_QR",auth.user.id,device.id,{approvedFrom:auth.device.id});
    sendEvent(auth.user.id,"device:update",{deviceId:device.id,status:"trusted"});sendJson(res,200,{ok:true,device:publicDevice(device,auth.device.id)});return true;
  }
  if(pathname==="/api/presence"&&req.method==="POST"){const auth=requireAuth(req,res);if(!auth)return true;presence.set(auth.user.id,Date.now());sendJson(res,200,{ok:true});return true;}
  if(pathname==="/api/devices"&&req.method==="GET"){const auth=requireAuth(req,res);if(!auth)return true;const devices=readJson(DEVICES_FILE).filter(d=>d.userId===auth.user.id).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(d=>publicDevice(d,auth.device.id));sendJson(res,200,{ok:true,devices,currentDeviceId:auth.device.id});return true;}
  const deviceApproveMatch=pathname.match(/^\/api\/devices\/([0-9a-f-]+)\/approve$/i);if(deviceApproveMatch&&req.method==="POST"){const auth=requireAuth(req,res);if(!auth)return true;const devices=readJson(DEVICES_FILE);const device=devices.find(d=>d.id===deviceApproveMatch[1]&&d.userId===auth.user.id);if(!device)return sendJson(res,404,{ok:false,error:"Устройство не найдено"}),true;if(device.status==="revoked")return sendJson(res,409,{ok:false,error:"Отозванное устройство нужно добавить заново"}),true;device.status="trusted";device.approvedAt=new Date().toISOString();device.approvedBy=auth.device.id;writeJson(DEVICES_FILE,devices);sendEvent(auth.user.id,"device:update",{deviceId:device.id,status:"trusted"});notify(auth.user.id,"DEVICE_APPROVED","Устройство подтверждено",`Устройство «${device.name}» теперь доверенное.`,{deviceId:device.id});audit("DEVICE_APPROVED",auth.user.id,device.id,{approvedFrom:auth.device.id});sendJson(res,200,{ok:true,device:publicDevice(device,auth.device.id)});return true;}
  const deviceRevokeMatch=pathname.match(/^\/api\/devices\/([0-9a-f-]+)\/revoke$/i);if(deviceRevokeMatch&&req.method==="POST"){const auth=requireAuth(req,res);if(!auth)return true;if(deviceRevokeMatch[1]===auth.device.id)return sendJson(res,400,{ok:false,error:"Нельзя отозвать текущее устройство. Сначала войдите с другого доверенного устройства."}),true;const devices=readJson(DEVICES_FILE);const device=devices.find(d=>d.id===deviceRevokeMatch[1]&&d.userId===auth.user.id);if(!device)return sendJson(res,404,{ok:false,error:"Устройство не найдено"}),true;device.status="revoked";device.revokedAt=new Date().toISOString();writeJson(DEVICES_FILE,devices);revokeDeviceSessions(auth.user.id,device.id,"device_revoked");sendEvent(auth.user.id,"device:update",{deviceId:device.id,status:"revoked"});audit("DEVICE_REVOKED",auth.user.id,device.id,{name:device.name});sendJson(res,200,{ok:true});return true;}
  if(pathname==="/api/devices/current/name"&&req.method==="POST"){const auth=requireAuth(req,res);if(!auth)return true;const body=await readBody(req);const devices=readJson(DEVICES_FILE);const device=devices.find(d=>d.id===auth.device.id&&d.userId===auth.user.id);device.name=cleanDeviceName(body.name);writeJson(DEVICES_FILE,devices);audit("DEVICE_RENAMED",auth.user.id,device.id,{name:device.name});sendJson(res,200,{ok:true,device:publicDevice(device,device.id)});return true;}

  if(pathname==="/api/notifications"&&req.method==="GET"){const auth=requireAuth(req,res);if(!auth)return true;ensureSubscriptionNotifications(auth.user);const items=readJson(NOTIFICATIONS_FILE).filter(n=>n.userId===auth.user.id).slice(-100).reverse().map(publicNotification);sendJson(res,200,{ok:true,notifications:items,unread:items.filter(n=>!n.readAt).length});return true;}
  const notificationReadMatch=pathname.match(/^\/api\/notifications\/([0-9a-f-]+)\/read$/i);if(notificationReadMatch&&req.method==="POST"){const auth=requireAuth(req,res);if(!auth)return true;const list=readJson(NOTIFICATIONS_FILE);const item=list.find(n=>n.id===notificationReadMatch[1]&&n.userId===auth.user.id);if(!item)return sendJson(res,404,{ok:false,error:"Уведомление не найдено"}),true;item.readAt||=new Date().toISOString();writeJson(NOTIFICATIONS_FILE,list);sendJson(res,200,{ok:true});return true;}
  if(pathname==="/api/support"&&req.method==="GET"){const auth=requireAuth(req,res);if(!auth)return true;const isAdmin=["admin","super_admin"].includes(auth.user.role);const tickets=readJson(SUPPORT_FILE).filter(t=>isAdmin||t.userId===auth.user.id).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt)).map(publicTicket);sendJson(res,200,{ok:true,tickets});return true;}
  if(pathname==="/api/support"&&req.method==="POST"){const auth=requireAuth(req,res);if(!auth)return true;const body=await readBody(req);const text=String(body.text||"").trim();const subject=String(body.subject||"Продление подписки").trim().slice(0,100);if(text.length<2||text.length>4000)return sendJson(res,400,{ok:false,error:"Сообщение поддержки: от 2 до 4000 символов"}),true;const list=readJson(SUPPORT_FILE);const now=new Date().toISOString();const ticket={id:crypto.randomUUID(),userId:auth.user.id,userNickname:auth.user.nickname,status:"open",subject,messages:[{id:crypto.randomUUID(),authorId:auth.user.id,authorRole:auth.user.role,text,createdAt:now}],createdAt:now,updatedAt:now};list.push(ticket);writeJson(SUPPORT_FILE,list);for(const user of readJson(USERS_FILE).filter(u=>["admin","super_admin"].includes(u.role)))sendEvent(user.id,"support:update",{ticketId:ticket.id});audit("SUPPORT_TICKET_CREATED",auth.user.id,ticket.id,{subject});sendJson(res,201,{ok:true,ticket:publicTicket(ticket)});return true;}
  const supportReplyMatch=pathname.match(/^\/api\/support\/([0-9a-f-]+)\/reply$/i);if(supportReplyMatch&&req.method==="POST"){const auth=requireAuth(req,res);if(!auth)return true;const body=await readBody(req);const text=String(body.text||"").trim();if(text.length<1||text.length>4000)return sendJson(res,400,{ok:false,error:"Ответ: от 1 до 4000 символов"}),true;const list=readJson(SUPPORT_FILE);const ticket=list.find(t=>t.id===supportReplyMatch[1]);if(!ticket)return sendJson(res,404,{ok:false,error:"Обращение не найдено"}),true;const isAdmin=["admin","super_admin"].includes(auth.user.role);if(!isAdmin&&ticket.userId!==auth.user.id)return sendJson(res,403,{ok:false,error:"Недостаточно прав"}),true;const now=new Date().toISOString();ticket.messages.push({id:crypto.randomUUID(),authorId:auth.user.id,authorRole:auth.user.role,text,createdAt:now});ticket.updatedAt=now;if(isAdmin){ticket.status=String(body.status||"answered");notify(ticket.userId,"SUPPORT_REPLY","Ответ поддержки",text.slice(0,200),{ticketId:ticket.id});audit("SUPPORT_REPLIED",auth.user.id,ticket.userId,{ticketId:ticket.id});}else{ticket.status="open";}writeJson(SUPPORT_FILE,list);sendEvent(ticket.userId,"support:update",{ticketId:ticket.id,status:ticket.status});for(const user of readJson(USERS_FILE).filter(u=>["admin","super_admin"].includes(u.role)))sendEvent(user.id,"support:update",{ticketId:ticket.id,status:ticket.status});sendJson(res,200,{ok:true,ticket:publicTicket(ticket)});return true;}
  const supportCloseMatch=pathname.match(/^\/api\/support\/([0-9a-f-]+)\/close$/i);if(supportCloseMatch&&req.method==="POST"){const auth=requireAdmin(req,res);if(!auth)return true;const list=readJson(SUPPORT_FILE);const ticket=list.find(t=>t.id===supportCloseMatch[1]);if(!ticket)return sendJson(res,404,{ok:false,error:"Обращение не найдено"}),true;ticket.status="closed";ticket.updatedAt=new Date().toISOString();writeJson(SUPPORT_FILE,list);notify(ticket.userId,"SUPPORT_CLOSED","Обращение закрыто",`Обращение «${ticket.subject}» закрыто.`,{ticketId:ticket.id});audit("SUPPORT_CLOSED",auth.user.id,ticket.userId,{ticketId:ticket.id});sendJson(res,200,{ok:true});return true;}
  if(pathname==="/api/contacts"&&req.method==="GET"){
    const auth=requireActive(req,res);if(!auth)return true;
    const users=readJson(USERS_FILE),messages=readJson(MESSAGES_FILE),network=readObject(NETWORK_FILE,{}),saved=readJson(CONTACTS_FILE);
    const visible=visibleContactIds(auth.user,users,messages,saved,network);
    const contacts=users.filter(u=>visible.has(u.id)&&u.status==="active"&&u.encryptionPublicKey&&u.signingPublicKey).map(u=>{
      const related=messages.filter(m=>(m.senderId===auth.user.id&&m.recipientId===u.id)||(m.senderId===u.id&&m.recipientId===auth.user.id));
      const last=related.reduce((latest,m)=>!latest||new Date(m.createdAt)>new Date(latest.createdAt)?m:latest,null);
      const unreadCount=related.filter(m=>m.senderId===u.id&&m.recipientId===auth.user.id&&!m.readAt).length;
      return {...publicUser(u),online:isOnline(u.id),unreadCount,lastMessageAt:last?.createdAt||null};
    }).sort((a,b)=>{if(a.unreadCount!==b.unreadCount)return b.unreadCount-a.unreadCount;if(a.lastMessageAt&&b.lastMessageAt)return new Date(b.lastMessageAt)-new Date(a.lastMessageAt);if(a.lastMessageAt)return -1;if(b.lastMessageAt)return 1;return a.nickname.localeCompare(b.nickname,"ru");});
    sendJson(res,200,{ok:true,contacts});return true;
  }
  if(pathname==="/api/contacts/add"&&req.method==="POST"){
    const auth=requireActive(req,res);if(!auth)return true;const body=await readBody(req);const fibroId=normalizeFibroId(body.fibroId);
    if(!/^FIBRO-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(fibroId))return sendJson(res,400,{ok:false,error:"Введите полный Fibro ID в формате FIBRO-XXXX-XXXX-XXXX"}),true;
    const target=readJson(USERS_FILE).find(user=>normalizeFibroId(user.fibroId)===fibroId&&user.status==="active");
    if(!target||target.id===auth.user.id)return sendJson(res,404,{ok:false,error:"Пользователь с таким Fibro ID не найден"}),true;
    if(!target.encryptionPublicKey||!target.signingPublicKey)return sendJson(res,409,{ok:false,error:"Пользователь ещё не настроил ключи"}),true;
    ensureContactPair(auth.user.id,target.id,"fibro_id");audit("CONTACT_ADDED_BY_FIBRO_ID",auth.user.id,target.id,{});
    notify(target.id,"CONTACT_ADDED","Новый контакт",`${auth.user.nickname} добавил вас по Fibro ID.`,{userId:auth.user.id});
    sendJson(res,201,{ok:true,contact:{...publicUser(target),online:isOnline(target.id),unreadCount:0,lastMessageAt:null}});return true;
  }
  if(pathname==="/api/messages"&&req.method==="GET"){const auth=requireActive(req,res);if(!auth)return true;const withUserId=String(searchParams.get("with")||"");if(!withUserId)return sendJson(res,400,{ok:false,error:"Не выбран собеседник"}),true;if(!canContact(auth.user,withUserId))return sendJson(res,403,{ok:false,error:"Пользователь не входит в ваши контакты"}),true;const messages=readJson(MESSAGES_FILE);let changed=false;const now=new Date().toISOString();for(const m of messages){if(m.recipientId===auth.user.id&&m.senderId===withUserId&&!m.deliveredAt){m.deliveredAt=now;m.nextAttemptAt=null;changed=true;sendEvent(m.senderId,"message:status",{messageId:m.id,deliveredAt:m.deliveredAt,deliveryAttempts:Number(m.deliveryAttempts)||0});}}if(changed)writeJson(MESSAGES_FILE,messages);const conversation=messages.filter(m=>(m.senderId===auth.user.id&&m.recipientId===withUserId)||(m.senderId===withUserId&&m.recipientId===auth.user.id)).map(publicMessage);sendJson(res,200,{ok:true,messages:conversation});return true;}
  if(pathname==="/api/messages"&&req.method==="POST"){const auth=requireActive(req,res);if(!auth)return true;const body=await readBody(req);const recipientId=String(body.recipientId||"");if(!canContact(auth.user,recipientId))return sendJson(res,403,{ok:false,error:"Получатель не входит в ваши контакты"}),true;const recipient=readJson(USERS_FILE).find(u=>u.id===recipientId&&u.status==="active"&&u.encryptionPublicKey&&u.signingPublicKey);if(!recipient)return sendJson(res,404,{ok:false,error:"Получатель недоступен или не настроил ключи"}),true;if(!validEnvelope(body.envelope,auth.user.id,recipientId)||typeof body.signature!=="string")return sendJson(res,400,{ok:false,error:"Некорректный зашифрованный пакет"}),true;const verified=await verifyEnvelopeSignature(body.envelope,body.signature,auth.user.signingPublicKey);if(!verified)return sendJson(res,400,{ok:false,error:"Цифровая подпись сообщения не прошла проверку"}),true;const messages=readJson(MESSAGES_FILE);if(messages.some(m=>m.id===body.envelope.messageId))return sendJson(res,409,{ok:false,error:"Дубликат сообщения"}),true;const now=new Date();const message={id:body.envelope.messageId,senderId:auth.user.id,recipientId,envelope:body.envelope,signature:body.signature,createdAt:body.envelope.createdAt,deliveredAt:null,readAt:null,deliveryAttempts:1,lastAttemptAt:now.toISOString(),nextAttemptAt:new Date(now.getTime()+deliveryDelay(1)).toISOString()};messages.push(message);writeJson(MESSAGES_FILE,messages);ensureContactPair(auth.user.id,recipientId,"conversation");sendEvent(recipientId,"message:new",{messageId:message.id,senderId:auth.user.id,retry:false,attempt:1});void sendWebPush(recipientId,{title:`Сообщение от ${auth.user.nickname}`,body:"Новое защищённое сообщение",tag:`message-${message.id}`,url:"/"});sendEvent(auth.user.id,"message:status",{messageId:message.id,deliveryAttempts:1,lastAttemptAt:message.lastAttemptAt,nextAttemptAt:message.nextAttemptAt});sendJson(res,201,{ok:true,message:publicMessage(message)});return true;}
  const readMatch=pathname.match(/^\/api\/messages\/([0-9a-f-]+)\/read$/i);if(readMatch&&req.method==="POST"){const auth=requireActive(req,res);if(!auth)return true;const messages=readJson(MESSAGES_FILE);const m=messages.find(x=>x.id===readMatch[1]&&x.recipientId===auth.user.id);if(!m)return sendJson(res,404,{ok:false,error:"Сообщение не найдено"}),true;m.deliveredAt||=new Date().toISOString();m.readAt||=new Date().toISOString();writeJson(MESSAGES_FILE,messages);sendEvent(m.senderId,"message:read",{messageId:m.id,readAt:m.readAt,recipientId:auth.user.id});sendEvent(auth.user.id,"message:status",{messageId:m.id,readAt:m.readAt});sendJson(res,200,{ok:true});return true;}
  if(pathname==="/api/admin/network/settings"&&req.method==="POST"){const auth=requireHead(req,res);if(!auth)return true;const body=await readBody(req);const network=readObject(NETWORK_FILE,{});const old={networkName:network.networkName,publicBaseUrl:network.publicBaseUrl||""};network.networkName=cleanNetworkName(body.networkName);const requestedUrl=String(body.publicBaseUrl||"").trim();const normalized=normalizeBaseUrl(requestedUrl);if(requestedUrl&&!normalized)return sendJson(res,400,{ok:false,error:"Некорректный публичный адрес сети"}),true;network.publicBaseUrl=normalized;writeObject(NETWORK_FILE,network);audit("NETWORK_SETTINGS_UPDATED",auth.user.id,network.networkId,{old,new:{networkName:network.networkName,publicBaseUrl:network.publicBaseUrl}});sendJson(res,200,{ok:true,network:{...publicNetwork(network,req),isHead:true}});return true;}
  if(pathname==="/api/admin/network/profile"&&req.method==="GET"){const auth=requireHead(req,res);if(!auth)return true;const profile=createNetworkProfile(req);audit("NETWORK_PROFILE_EXPORTED",auth.user.id,profile.network.networkId,{baseUrl:profile.network.baseUrl});sendDownloadJson(res,`${profile.network.networkId}.fibronet.json`,profile);return true;}
  if(pathname==="/api/admin/network/backup"&&req.method==="POST"){const auth=requireHead(req,res);if(!auth)return true;const body=await readBody(req);const password=String(body.password||"");if(password.length<12)return sendJson(res,400,{ok:false,error:"Пароль резервной копии должен содержать минимум 12 символов"}),true;const network=readObject(NETWORK_FILE,{});const backup=createEncryptedNetworkBackup(password);audit("NETWORK_BACKUP_EXPORTED",auth.user.id,network.networkId,{format:backup.format});sendDownloadJson(res,`${network.networkId}-backup-${new Date().toISOString().slice(0,10)}.json`,backup);return true;}
  if(pathname==="/api/admin/dashboard"&&req.method==="GET"){
    const auth=requireAdmin(req,res);if(!auth)return true;
    const users=readJson(USERS_FILE);const invites=readJson(INVITES_FILE);const network=readObject(NETWORK_FILE,{});
    const summary={totalUsers:users.length,activeUsers:users.filter(u=>subscriptionState(u)==="active").length,pendingUsers:users.filter(u=>u.status==="pending").length,expiringUsers:users.filter(u=>subscriptionState(u)==="expiring").length,expiredUsers:users.filter(u=>subscriptionState(u)==="expired").length,activeInvites:invites.filter(i=>!i.usedAt&&new Date(i.expiresAt).getTime()>Date.now()).length};
    sendJson(res,200,{ok:true,summary,network:{...publicNetwork(network,req),isHead:auth.user.role==="super_admin"&&network.headUserId===auth.user.id}});return true;
  }
  if(pathname==="/api/admin/users"&&req.method==="GET"){if(!requireAdmin(req,res))return true;sendJson(res,200,{ok:true,users:readJson(USERS_FILE).map(publicUser)});return true;}
  if(pathname==="/api/admin/audit"&&req.method==="GET"){if(!requireAdmin(req,res))return true;const events=readJson(AUDIT_FILE).slice(-100).reverse();sendJson(res,200,{ok:true,events});return true;}
  if(pathname==="/api/admin/invites"&&req.method==="POST"){
    const auth=requireAdmin(req,res);if(!auth)return true;const body=await readBody(req);const validDays=Math.max(1,Math.min(30,Number(body.validDays)||7));
    const invite={id:crypto.randomUUID(),code:`FIBRO-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,role:"user",createdBy:auth.user.id,createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+validDays*86400000).toISOString(),usedAt:null};
    const invites=readJson(INVITES_FILE);invites.push(invite);writeJson(INVITES_FILE,invites);audit("INVITE_CREATED",auth.user.id,invite.id,{validDays});sendJson(res,201,{ok:true,invite});return true;
  }
  const approveMatch=pathname.match(/^\/api\/admin\/users\/([0-9a-f-]+)\/approve$/i);
  if(approveMatch&&req.method==="POST"){
    const auth=requireHead(req,res);if(!auth)return true;const users=readJson(USERS_FILE);const user=users.find(x=>x.id===approveMatch[1]);if(!user)return sendJson(res,404,{ok:false,error:"Пользователь не найден"}),true;
    const now=new Date();user.status="active";user.approvedAt=now.toISOString();user.approvedBy=auth.user.id;user.subscriptionEndsAt=new Date(now.getTime()+SUBSCRIPTION_DAYS*86400000).toISOString();writeJson(USERS_FILE,users);notify(user.id,"SUBSCRIPTION_ACTIVATED","Доступ активирован",`Подписка активирована на ${SUBSCRIPTION_DAYS} дней.`,{subscriptionEndsAt:user.subscriptionEndsAt});audit("USER_APPROVED",auth.user.id,user.id,{subscriptionDays:SUBSCRIPTION_DAYS});sendJson(res,200,{ok:true,user:publicUser(user)});return true;
  }
  const extendMatch=pathname.match(/^\/api\/admin\/users\/([0-9a-f-]+)\/extend$/i);
  if(extendMatch&&req.method==="POST"){
    const auth=requireHead(req,res);if(!auth)return true;const body=await readBody(req);const days=Math.max(1,Math.min(365,Number(body.days)||30));const users=readJson(USERS_FILE);const user=users.find(x=>x.id===extendMatch[1]);if(!user)return sendJson(res,404,{ok:false,error:"Пользователь не найден"}),true;
    const current=Math.max(Date.now(),new Date(user.subscriptionEndsAt||0).getTime()||0);user.subscriptionEndsAt=new Date(current+days*86400000).toISOString();if(user.status!=="active")user.status="active";writeJson(USERS_FILE,users);notify(user.id,"SUBSCRIPTION_EXTENDED","Подписка продлена",`Доступ продлён на ${days} дней.`,{days,subscriptionEndsAt:user.subscriptionEndsAt});audit("SUBSCRIPTION_EXTENDED",auth.user.id,user.id,{days,newEnd:user.subscriptionEndsAt});sendJson(res,200,{ok:true,user:publicUser(user)});return true;
  }
  const suspendMatch=pathname.match(/^\/api\/admin\/users\/([0-9a-f-]+)\/suspend$/i);
  if(suspendMatch&&req.method==="POST"){
    const auth=requireAdmin(req,res);if(!auth)return true;const users=readJson(USERS_FILE);const user=users.find(x=>x.id===suspendMatch[1]);if(!user)return sendJson(res,404,{ok:false,error:"Пользователь не найден"}),true;if(user.role==="super_admin")return sendJson(res,403,{ok:false,error:"Головной аккаунт нельзя приостановить"}),true;
    user.status="suspended";writeJson(USERS_FILE,users);notify(user.id,"ACCESS_SUSPENDED","Доступ приостановлен","Администратор приостановил сетевой доступ.",{});audit("USER_SUSPENDED",auth.user.id,user.id,{});sendJson(res,200,{ok:true,user:publicUser(user)});return true;
  }
  const restoreMatch=pathname.match(/^\/api\/admin\/users\/([0-9a-f-]+)\/restore$/i);
  if(restoreMatch&&req.method==="POST"){
    const auth=requireHead(req,res);if(!auth)return true;const users=readJson(USERS_FILE);const user=users.find(x=>x.id===restoreMatch[1]);if(!user)return sendJson(res,404,{ok:false,error:"Пользователь не найден"}),true;
    user.status="active";if(!user.subscriptionEndsAt||new Date(user.subscriptionEndsAt).getTime()<=Date.now())user.subscriptionEndsAt=new Date(Date.now()+SUBSCRIPTION_DAYS*86400000).toISOString();writeJson(USERS_FILE,users);notify(user.id,"ACCESS_RESTORED","Доступ восстановлен","Сетевой доступ восстановлен.",{subscriptionEndsAt:user.subscriptionEndsAt});audit("USER_RESTORED",auth.user.id,user.id,{});sendJson(res,200,{ok:true,user:publicUser(user)});return true;
  }
  const roleMatch=pathname.match(/^\/api\/admin\/users\/([0-9a-f-]+)\/role$/i);
  if(roleMatch&&req.method==="POST"){
    const auth=requireHead(req,res);if(!auth)return true;const body=await readBody(req);const role=String(body.role||"");if(!["admin","user"].includes(role))return sendJson(res,400,{ok:false,error:"Допустимы роли admin или user"}),true;const users=readJson(USERS_FILE);const user=users.find(x=>x.id===roleMatch[1]);if(!user)return sendJson(res,404,{ok:false,error:"Пользователь не найден"}),true;if(user.role==="super_admin")return sendJson(res,403,{ok:false,error:"Нельзя изменить роль головного аккаунта"}),true;const oldRole=user.role;user.role=role;writeJson(USERS_FILE,users);audit("ROLE_CHANGED",auth.user.id,user.id,{oldRole,newRole:role});sendJson(res,200,{ok:true,user:publicUser(user)});return true;
  }
  return false;
}
function createServer(){return http.createServer(async(req,res)=>{try{const url=new URL(req.url,`http://${req.headers.host||"localhost"}`);if(url.pathname.startsWith("/api/")){const handled=await handleApi(req,res,url.pathname,url.searchParams);if(!handled)sendJson(res,404,{ok:false,error:"API-метод не найден"});return;}serveStatic(res,url.pathname);}catch(error){console.error(error);if(!res.headersSent)sendJson(res,500,{ok:false,error:"Внутренняя ошибка сервера"});else res.end();}});}
async function startServer(){await ensureDataStore();const server=createServer();return new Promise((resolve)=>server.listen(PORT,"0.0.0.0",()=>{console.log(`FibroChat v${APP_VERSION} PostgreSQL Core: http://localhost:${PORT}`);resolve(server);}));}
module.exports={startServer,createServer};
