# Changelog

## 0.7.0-alpha7.6
- Messenger Experience chat polish with date separators and progressive history rendering.
- Multi-file encrypted attachments (up to 6 per message), desktop drag & drop, and decrypted image/video/PDF preview.
- Voice-message waveform UI and 1× / 1.5× / 2× playback speed.
- Realtime “typing” and “recording voice” activity for direct chats.
- Search expanded to decrypted text, attachment names, group sender names and message dates.
- Service Worker and application version updated to Alpha 7.6.

## 0.7.0-alpha7.5
- Smart QR Invitations и очередь административного одобрения.
- Автоподстановка инвайта после сканирования QR.
- Мастер первого запуска для браузера, Web Push и микрофона.
- Платформенные инструкции Android/iOS.

# Changelog

## 0.7.0-alpha7.1
- Аудиозвонки 1:1 через WebRTC и SSE-сигналинг.
- Входящий/исходящий вызов, принять, отклонить, завершить, mute.
- Исправлена раскладка действий сообщений: кнопки больше не перекрывают текст.


## 0.7.0-alpha2

- Added encrypted voice-message recording, preview, sending and playback.
- Added replies with quoted previews and jump-to-original navigation.
- Rebuilt the mobile composer for safe-area and virtual-keyboard compatibility.
- Improved touch targets, attachment cards and narrow-screen layout.


## 0.7.0-alpha1

- Добавлена инфраструктура E2E-зашифрованных файловых вложений.
- Добавлены защищённые API загрузки и скачивания.
- Добавлена PostgreSQL-миграция 006 и JSON fallback для метаданных.
- Обновлён протокол до 1.2.

## 0.6.0

See `RELEASE_NOTES_0.6.0.md`.


## 0.5.1 — Private Contacts & Fibro ID

- Удалён глобальный каталог пользователей из обычного интерфейса и API контактов.
- Каждому аккаунту назначается постоянный уникальный Fibro ID вида `FIBRO-XXXX-XXXX-XXXX`.
- Добавление контакта выполняется только по полному точному Fibro ID.
- Обычный пользователь видит пригласившего, ручные контакты и собеседников.
- Администратор видит суперадминистратора, приглашённых им пользователей, ручные контакты и собеседников.
- Суперадминистратор видит администраторов, собственных приглашённых, ручные контакты и собеседников.
- Добавлена таблица `contacts` и миграция `003_private_contacts_fibro_id.sql`.
- API сообщений запрещает обращение к пользователям вне разрешённого списка контактов.
- Паспорт проекта обновлён под модель приватных контактов.

## 0.5.0 — Persistent Session & Application Shell

- Разделён интерфейс: «Чаты», «Уведомления», «Настройки», «Администрирование».
- Административная навигация показывается только администраторам и суперадминистратору.
- Сохранено восстановление серверной сессии после F5.
- Локальные ключи текущей вкладки переживают обновление страницы через sessionStorage.
- Добавлен управляемый шестизначный PIN: установка, смена, отключение и ручная блокировка.
- Обновлён Service Worker и исключён показ старого интерфейса из прежнего кэша.
- Добавлен клиентский модуль `ui-shell.js`, не меняющий существующие API.
- Обновлён паспорт проекта и инструкции выпуска/отката.

## v0.4.7 — Docker-only deployment

- Prepared a clean repository Dockerfile for Coolify.
- Uses Node.js 20 and `npm install --omit=dev`; Nixpacks is no longer required.
- Updated client, server, Service Worker cache, and package versions to v0.4.7.
- Added exact Coolify Dockerfile settings and deployment verification notes.
- Tightened `.dockerignore` so local secrets, archives, caches, and JSON data are not copied into the image.


## 0.4.0 — PostgreSQL Core

- PostgreSQL became the primary persistent store.
- Added automatic SQL migrations.
- Added one-superadministrator database constraint.
- Administrators retain permission to issue invitations.
- Added password change inside the account; other sessions are revoked.
- Added server-side QR device approval challenge API.
- Added cluster node registry and multi-node cache refresh groundwork.
- Replaced the monolithic entry point with a small launcher plus configuration and storage modules.
- Removed production JSON data from version control.

## v0.4.5

- Added a production Dockerfile based on Node.js 20.
- Added `.dockerignore`.
- Replaced Nixpacks dependency installation with a deterministic Docker build.
- Preserved PostgreSQL, PWA, Web Push, PIN, and session fixes from v0.4.4.

## v0.4.4
- Fixed 6-digit PIN setup: no longer attempts to export non-extractable CryptoKey objects.
- Keeps the decrypted identity bundle in sessionStorage so a normal page refresh no longer logs the user out.
- PIN vault now stores the original JWK identity bundle and restores it after browser restart.
- Updated package-lock.json and verified `npm ci` plus syntax checks.

## 0.5.2 — Profile & Privacy

- Добавлена полноценная страница профиля.
- Добавлены аватар, отображаемое имя и описание.
- Добавлены QR-код Fibro ID и ссылка-приглашение.
- Добавлены четыре настройки приватности.
- Добавлены удаление, блокировка и разблокировка контактов.
- Добавлен список заблокированных пользователей.
- Добавлены серверные проверки приватности и взаимной блокировки.
- Добавлена миграция `004_profile_privacy.sql`.

## 0.7.0-alpha5
- Добавлены редактирование и удаление собственных сообщений.
- Добавлен локальный поиск по расшифрованному диалогу.
- Добавлены realtime-события обновления и удаления сообщений.
- Обновлены интерфейс, версия клиента и cache key Service Worker.

## 0.7.0-alpha6
- Добавлены защищённые групповые чаты с клиентским encrypted fan-out.
- Добавлены группы, участники и роли owner/admin/member.
- Добавлены события реального времени и push-уведомления групп.
- Добавлена PostgreSQL-миграция 007_groups.sql.

## 0.7.0-alpha6.1
- Completed group-management UI and related server endpoints.
- Added edited-message marker and SVG encryption indicator.
- Synchronized visible and runtime versions.
- Rotated service-worker cache and added regression assertions.

## 0.7.0-alpha7.2
- Исправлена потеря ранних ICE-кандидатов во время WebRTC-сигналинга.
- Добавлены гудки исходящего вызова и рингтон входящего вызова.
- Добавлены тайм-ауты, сетевые статусы и диагностика WebRTC.
- Добавлена настраиваемая TURN-конфигурация через окружение.

## 0.7.0-alpha7.4.1

- Bottom navigation restored for desktop and mobile.
- Full-viewport application shell without unused outer space.
- Added reserved safe space so pages cannot overlap navigation controls.
- Improved responsive profile, events, settings and chats layouts.
- Added reduced-motion aware page transition and route scroll reset.
