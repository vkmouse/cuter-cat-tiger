# cuter-cat-tiger-storybook

獨立的 Storybook 專案，用來展示 `cuter-cat-tiger` 的 Vue 元件。

## 設計原則

- Storybook 相關套件與設定只存在本資料夾。
- 原本的 `cuter-cat-tiger` 不加入 Storybook dependency，也不需要 `.storybook` 設定。
- Storybook 可以直接引用原專案既有元件，因此元件本身不需要複製一份。

## 第一個元件

目前選擇最簡單的 `DateNav.vue` 作為第一個 Storybook 元件：

- `Record/DateNav/Today`
- `Record/DateNav/SpecificDate`

## 啟動

```bash
cd cuter-cat-tiger-storybook
npm install
npm run storybook
```
