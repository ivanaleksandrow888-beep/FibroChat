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
  const profilePanel=oldSidebar.querySelector("#profile-panel");
  const devicePanel=oldSidebar.querySelector(".device-panel");
  const notificationPanel=[...oldSidebar.querySelectorAll(".service-panel")].find(x=>x.querySelector("#notifications-list"));
  const supportPanel=[...oldSidebar.querySelectorAll(".service-panel")].find(x=>x.querySelector("#support-list"));
  const adminPanel=oldSidebar.querySelector("#admin-panel");

  const icon=(paths)=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths}</svg>`;
  const icons={
    chats:icon('<path d="M7.5 18.5 3.5 21v-5.2A8.5 8.5 0 1 1 7.5 18.5Z"/><path d="M8 10h8M8 14h5"/>'),
    profile:icon('<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>'),
    notifications:icon('<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8Z"/><path d="M10 21h4"/>'),
    settings:icon('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.86 2.86-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21H9.5v-.1A1.7 1.7 0 0 0 8 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.86-2.86.06-.06A1.7 1.7 0 0 0 3.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2V9.5h.1A1.7 1.7 0 0 0 3.6 8a1.7 1.7 0 0 0-.34-1.88l-.06-.06L6.06 3.2l.06.06A1.7 1.7 0 0 0 8 3.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V2h4.1v.1A1.7 1.7 0 0 0 15 3.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.86 2.86-.06.06A1.7 1.7 0 0 0 19.4 8c.16.38.37.73.66 1 .3.28.69.45 1.1.5h.1v4.1h-.1A1.7 1.7 0 0 0 19.4 15Z"/>'),
    shield:icon('<path d="M12 3 5 6v5c0 4.6 2.9 8.4 7 10 4.1-1.6 7-5.4 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>')
  };

  const rail=document.createElement("aside");
  rail.className="app-rail card fibro-rail";
  topbar.classList.add("fibro-topbar");
  profile.classList.add("fibro-identity-card");
  rail.append(topbar,profile);

  const nav=document.createElement("nav");
  nav.className="app-navigation fibro-navigation";
  nav.setAttribute("aria-label","Основная навигация");
  nav.innerHTML=`
    <button type="button" data-page="chats" class="app-nav-button active"><span class="nav-glyph">${icons.chats}</span><span class="nav-copy"><b>Диалоги</b><small>Сообщения и контакты</small></span></button>
    <button type="button" data-page="profile" class="app-nav-button"><span class="nav-glyph">${icons.profile}</span><span class="nav-copy"><b>Профиль</b><small>Личность и приватность</small></span></button>
    <button type="button" data-page="notifications" class="app-nav-button"><span class="nav-glyph">${icons.notifications}</span><span class="nav-copy"><b>События</b><small>Уведомления сети</small></span><em id="nav-notification-count"></em></button>
    <button type="button" data-page="settings" class="app-nav-button"><span class="nav-glyph">${icons.settings}</span><span class="nav-copy"><b>Настройки</b><small>Защита и управление</small></span></button>`;
  rail.append(nav);

  const railFooter=document.createElement("div");
  railFooter.className="fibro-rail-footer";
  railFooter.innerHTML='<span></span><div><b>Защищённый контур</b><small>Сквозное шифрование активно</small></div>';
  rail.append(railFooter);

  const main=document.createElement("section");
  main.className="app-main";
  const chatsPage=document.createElement("section");
  chatsPage.className="app-page active";chatsPage.dataset.page="chats";
  const chatsLayout=document.createElement("div");chatsLayout.className="chats-layout";
  const listPanel=document.createElement("aside");listPanel.className="conversation-panel card";
  const chatsIntro=document.createElement("div");
  chatsIntro.className="fibro-page-intro";
  chatsIntro.innerHTML='<div><span class="eyebrow">FIBRO SPACE</span><h2>Ваши диалоги</h2><p>Личное пространство для защищённого общения.</p></div><span class="signal-orb" aria-hidden="true"></span>';
  listPanel.append(chatsIntro);
  if(contactsHead)listPanel.append(contactsHead);
  if(contactAdd)listPanel.append(contactAdd);
  if(contacts)listPanel.append(contacts);
  chat.classList.add("chat-panel");
  chatsLayout.append(listPanel,chat);chatsPage.append(chatsLayout);

  const profilePage=document.createElement("section");profilePage.className="app-page";profilePage.dataset.page="profile";
  profilePage.innerHTML='<header class="page-heading fibro-heading"><span class="eyebrow">ВАША ИДЕНТИЧНОСТЬ</span><div><h2>Профиль</h2><p>Личные данные, QR-код и границы приватности.</p></div></header>';
  if(profilePanel)profilePage.append(profilePanel);

  const notificationsPage=document.createElement("section");notificationsPage.className="app-page";notificationsPage.dataset.page="notifications";
  notificationsPage.innerHTML='<header class="page-heading fibro-heading"><span class="eyebrow">ПУЛЬС СЕТИ</span><div><h2>События</h2><p>Входы, уведомления и важные изменения.</p></div></header>';
  if(notificationPanel)notificationsPage.append(notificationPanel);

  const settingsPage=document.createElement("section");settingsPage.className="app-page";settingsPage.dataset.page="settings";
  settingsPage.innerHTML='<header class="page-heading fibro-heading"><span class="eyebrow">ЛИЧНЫЙ КОНТУР</span><div><h2>Настройки</h2><p>Устройства, ключи, безопасность и управление сетью.</p></div></header>';
  const settingsGrid=document.createElement("div");settingsGrid.className="settings-grid";
  if(devicePanel)settingsGrid.append(devicePanel);
  if(supportPanel)settingsGrid.append(supportPanel);
  settingsPage.append(settingsGrid);

  if(adminPanel){
    const adminHub=document.createElement("section");
    adminHub.id="admin-settings-hub";
    adminHub.className="admin-settings-hub hidden";
    adminHub.innerHTML=`<button class="admin-hub-trigger" type="button" aria-expanded="false">
      <span class="nav-glyph">${icons.shield}</span><span><b>Администрирование</b><small>Пользователи, инвайты и состояние сети</small></span><i>›</i>
    </button><div class="admin-hub-content hidden"><header><span class="eyebrow">УПРАВЛЕНИЕ СЕТЬЮ</span><h3>Панель администратора</h3></header></div>`;
    adminHub.querySelector(".admin-hub-content").append(adminPanel);
    settingsPage.append(adminHub);
    const trigger=adminHub.querySelector(".admin-hub-trigger");
    const content=adminHub.querySelector(".admin-hub-content");
    trigger.addEventListener("click",()=>{
      const opened=trigger.getAttribute("aria-expanded")==="true";
      trigger.setAttribute("aria-expanded",String(!opened));
      content.classList.toggle("hidden",opened);
      adminHub.classList.toggle("open",!opened);
    });
    const syncAdmin=()=>{
      const allowed=!adminPanel.classList.contains("hidden");
      adminHub.classList.toggle("hidden",!allowed);
      if(!allowed){content.classList.add("hidden");trigger.setAttribute("aria-expanded","false");adminHub.classList.remove("open");}
    };
    new MutationObserver(syncAdmin).observe(adminPanel,{attributes:true,attributeFilter:["class"]});syncAdmin();
  }

  main.append(chatsPage,profilePage,notificationsPage,settingsPage);
  appView.replaceChildren(rail,main);
  appView.classList.add("workspace-v050","workspace-alpha3","workspace-alpha74");

  const buttons=[...nav.querySelectorAll("[data-page]")];
  const pages=[...main.querySelectorAll(".app-page")];
  function openPage(name,{writeHash=true}={}){
    if(!pages.some(page=>page.dataset.page===name))name="chats";
    buttons.forEach(b=>b.classList.toggle("active",b.dataset.page===name));
    pages.forEach(p=>p.classList.toggle("active",p.dataset.page===name));
    document.body.dataset.appPage=name;
    const activePage=pages.find(page=>page.dataset.page===name);
    if(activePage)activePage.scrollTop=0;
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
})();
