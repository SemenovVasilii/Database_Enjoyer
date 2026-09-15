# Светлая и тёмная темы

Основаны на анализе Dify commit `6afe07f9447528f8ca2d1339b2eb148e39c4038d`:
[light tokens](https://github.com/langgenius/dify/blob/6afe07f9447528f8ca2d1339b2eb148e39c4038d/packages/dify-ui/src/themes/light.css),
[dark tokens](https://github.com/langgenius/dify/blob/6afe07f9447528f8ca2d1339b2eb148e39c4038d/packages/dify-ui/src/themes/dark.css),
[buttons](https://github.com/langgenius/dify/blob/6afe07f9447528f8ca2d1339b2eb148e39c4038d/packages/dify-ui/src/button/index.tsx).
Компоненты и логотип DatabaseEnjoyer собственные.

| Назначение | Светлая | Тёмная |
| --- | --- | --- |
| Canvas | #F2F4F7 | #1D1D20 |
| Surface | #FFFFFF | #222225 |
| Elevated | #F9FAFB | #27272B |
| Основной текст | #101828 | #FBFBFC |
| Вторичный текст | #354052 | #D9D9DE |
| Акцент текста/выделения | #0033FF | #6694FF |
| Основная кнопка | #0033FF | #085AFC |

Кнопки высотой минимум 36 px, скругления 8–12 px, нейтральные поля, тонкие разделители,
лёгкие тени. Шрифт — системный стек, как в Dify. Зеленый используется для успешных состояний.

CSS-токены — web/src/app/styles/index.css. Tailwind @theme inline ссылается на runtime
--theme-*; html[data-theme=dark] меняет значения сразу для всех компонентов.
Primary и accent разделены: светлый текстовый акцент не является фоном синей кнопки.

Выбор в верхней панели: светлая, тёмная, системная. Режим сохраняется в localStorage под
ключом database-enjoyer-theme. System реагирует на prefers-color-scheme; стартовый скрипт
в index.html применяет тему до монтирования React. Ошибки доступа к localStorage не ломают UI.
Meta theme-color и color-scheme обновляются вместе с темой. Focus-visible, disabled,
hover, таблицы и native dialogs используют общие токены.
