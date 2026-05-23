# 移植ガイド

このプロジェクトは、将来 iOS / Android のアプリシェルへ移植しやすいように、
タスクの純ロジックとプラットフォーム依存処理を分けておく。

## 境界

- `src/core` はタスクの純ロジックとデータ型だけを置く。ここから `chrome.*`、
  DOM API、通信 API、各プラットフォームの保存 API を呼ばない。
- `src/storage/todoStorage.ts` は保存アダプタの契約と保存値の形を定義する。
  既存キーと値形式は互換性を保つ:
  `tasks`, `last_date`, `trial_start_ts`, `is_premium`, `history`, `theme`。
- プラットフォーム別の保存実装は契約と同じ階層に置く。Chrome 拡張向けは
  `src/storage/chromeTodoStorage.ts`。iOS / Android 向けも core を変更せず、
  同じ `TodoStorage` interface を実装する。
- UI は storage 契約と core 関数に依存させる。`chrome.i18n` や
  `chrome.storage` のようなブラウザ拡張 API は、別シェルで差し替えやすいよう
  プラットフォーム端に寄せる。

## storage アダプタ追加時のチェックリスト

1. `TodoStorage` の `get`, `set`, `subscribe` を実装する。
2. 保存キーと JSON 互換の値形式を維持する。
3. オフライン前提を変える別判断がない限り、保存は端末ローカルに閉じる。
4. Chrome 版に remote code、外部 CDN / 外部フォント、`eval`、新しい権限を
   追加しない。

## Chrome 拡張版の注意

Chrome 拡張版は Manifest V3 で、permission は `storage` のみ。
`chrome.storage` を呼ぶ storage モジュールは Chrome 用アダプタだけにする。
