# FROOMO — landing

Статичний лендинг платформи естетичної медицини FROOMO (десктоп + мобільна адаптація). Без збірки й залежностей: чистий HTML, CSS і JS.

## Структура

```
index.html            розмітка
assets/css/styles.css стилі (токени — у :root)
assets/js/main.js     інтерактив (hero, дошка сегментів, валідація, дивайдери)
assets/favicon.svg
.github/workflows/pages.yml  автодеплой на GitHub Pages
```

## Запуск локально

```bash
python3 -m http.server 8000
# відкрити http://localhost:8000
```

## Публікація на GitHub Pages

1. Створіть репозиторій і завантажте всі файли в гілку `main`.
2. Settings → Pages → Source: **GitHub Actions** (workflow вже у `.github/workflows/pages.yml`).
3. Після пуша сайт з’явиться на `https://<user>.github.io/<repo>/`.

Альтернатива без Actions: Settings → Pages → Deploy from a branch → `main` / `(root)`.

## Стиль

Шрифти — Geologica (основний) та Alumni Sans (акценти), підключені з Google Fonts. Палітра: чорний фон, синій `#3AA0F0`, світло-синій `#90CEFF`, navy `#031C29`.

## Примітки

- Тексти пар, вигод, цифри, відгуки та логотипи у стрічці — чернеткові плейсхолдери.
- Форма заявки не підключена: кнопка фінального CTA показує повідомлення «Це макет».
