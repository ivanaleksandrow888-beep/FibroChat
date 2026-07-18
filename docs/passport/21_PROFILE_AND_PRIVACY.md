# 21. Profile and Privacy — v0.5.2

Профиль хранится в документе пользователя: `displayName`, `bio`, `avatarDataUrl`, `privacy`, `blockedUserIds`.

`fibroId` остаётся неизменяемым. QR-код генерируется сервером из Fibro ID. Ссылка приглашения открывает приложение с параметром `#add=<Fibro ID>`.

Настройки приватности:

- `profileVisibility`: `everyone | contacts | nobody`;
- `firstMessage`: `everyone | contacts | nobody`;
- `fibroIdDiscovery`: `everyone | contacts | nobody`;
- `contactInvites`: `everyone | contacts | nobody`.

Блокировка взаимно запрещает показ контакта, добавление и обмен сообщениями. Удаление контакта удаляет обе направленные записи связи, но не историю зашифрованных сообщений.
