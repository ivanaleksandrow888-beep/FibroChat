"use strict";

(function buildFibroShell(){
  const appView=document.getElementById("app-view");
  const oldSidebar=appView?.querySelector(".sidebar");
  const chat=appView?.querySelector(".chat");
  if(!appView||!oldSidebar||!chat)return;

  const topbar=oldSidebar.querySelector(".topbar");
  const profile=oldSidebar.querySelector(".me-card");
  const contactsHead=[...oldSidebar.querySelectorAll(".section-head")].find(x=>x.querySelector("#refresh-contacts"));
  const contacts=oldSidebar.querySelector("#contacts-list");
  const contactAdd=oldSidebar.querySelector(".contact-add-box");
  const devicePanel=oldSidebar.querySelector(".device-panel");
  const notificationPanel=[...oldSidebar.querySelectorAll(".service-panel")].find(x=>x.querySelector("#notifications-list"));
  const supportPanel=[...oldSidebar.querySelectorAll(".service-panel")].find(x=>x.querySelector("#support-list"));
  const adminPanel=oldSidebar.querySelector("#admin-panel");

  const rail=document.createElement("aside");
  rail.className="app-rail card";
  rail.append(topbar,profile);
  const nav=document.createElement("nav");
  nav.className="app-navigation";
  nav.innerHTML=`
    <button type="button" data-page="chats" class="app-nav-button active"><span>💬</span><b>Чаты</b></button>
    <button type="button" data-page="notifications" class="app-nav-button"><span>🔔</span><b>Уведомления</b><em id="nav-notification-count"></em></button>
    <button type="button" data-page="settings" class="app-nav-button"><span>⚙️</span><b>Настройки</b></button>
    <button type="button" data-page="admin" id="admin-nav-button" class="app-nav-button hidden"><span>🛡️</span><b>Администрирование</b></button>`;
  rail.append(nav);

  const main=document.createElement("section");
  main.className="app-main";
  const chatsPage=document.createElement("section");
  chatsPage.className="app-page active";chatsPage.dataset.page="chats";
  const chatsLayout=document.createElement("div");chatsLayout.className="chats-layout";
  const listPanel=document.createElement("aside");listPanel.className="conversation-panel card";
  if(contactsHead)listPanel.append(contactsHead);
  if(contactAdd)listPanel.append(contactAdd);
  if(contacts)listPanel.append(contacts);
  chat.classList.add("chat-panel");
  chatsLayout.append(listPanel,chat);chatsPage.append(chatsLayout);

  const notificationsPage=document.createElement("section");notificationsPage.className="app-page";notificationsPage.dataset.page="notifications";
  notificationsPage.innerHTML='<header class="page-heading"><div><h2>Уведомления</h2><p>Системные события, входы и сообщения сети.</p></div></header>';
  if(notificationPanel)notificationsPage.append(notificationPanel);

  const settingsPage=document.createElement("section");settingsPage.className="app-page";settingsPage.dataset.page="settings";
  settingsPage.innerHTML='<header class="page-heading"><div><h2>Настройки</h2><p>Безопасность, устройства, пароль, ключи и поддержка.</p></div></header>';
  const settingsGrid=document.createElement("div");settingsGrid.className="settings-grid";
  if(devicePanel)settingsGrid.append(devicePanel);
  if(supportPanel)settingsGrid.append(supportPanel);
  settingsPage.append(settingsGrid);

  const adminPage=document.createElement("section");adminPage.className="app-page";adminPage.dataset.page="admin";
  adminPage.innerHTML='<header class="page-heading"><div><h2>Панель администратора</h2><p>Инвайты, пользователи, роли и состояние сети.</p></div></header>';
  if(adminPanel)adminPage.append(adminPanel);

  main.append(chatsPage,notificationsPage,settingsPage,adminPage);
  appView.replaceChildren(rail,main);
  appView.classList.add("workspace-v050");

  const buttons=[...nav.querySelectorAll("[data-page]")];
  const pages=[...main.querySelectorAll(".app-page")];
  function openPage(name,{writeHash=true}={}){
    if(name==="admin"&&document.getElementById("admin-nav-button")?.classList.contains("hidden"))name="chats";
    buttons.forEach(b=>b.classList.toggle("active",b.dataset.page===name));
    pages.forEach(p=>p.classList.toggle("active",p.dataset.page===name));
    document.body.dataset.appPage=name;
    if(writeHash&&location.hash!==`#/${name}`)history.replaceState(null,"",`#/${name}`);
    if(name!=="chats")document.body.classList.remove("chat-open");
  }
  buttons.forEach(button=>button.addEventListener("click",()=>openPage(button.dataset.page)));
  window.addEventListener("hashchange",()=>openPage(location.hash.replace(/^#\//,"")||"chats",{writeHash:false}));
  window.FibroRouter={open:openPage,current:()=>document.body.dataset.appPage||"chats"};
  openPage(location.hash.replace(/^#\//,"")||"chats",{writeHash:false});

  const badge=document.getElementById("nav-notification-count");
  const source=document.getElementById("notification-count");
  if(source&&badge){
    const sync=()=>{const m=source.textContent.match(/\d+/);badge.textContent=m?m[0]:"";badge.classList.toggle("visible",Boolean(m));};
    new MutationObserver(sync).observe(source,{childList:true,subtree:true,characterData:true});sync();
  }
  if(adminPanel){
    const adminButton=document.getElementById("admin-nav-button");
    const syncAdmin=()=>{const allowed=!adminPanel.classList.contains("hidden");adminButton.classList.toggle("hidden",!allowed);if(!allowed&&window.FibroRouter.current()==="admin")openPage("chats");};
    new MutationObserver(syncAdmin).observe(adminPanel,{attributes:true,attributeFilter:["class"]});syncAdmin();
  }
})();
